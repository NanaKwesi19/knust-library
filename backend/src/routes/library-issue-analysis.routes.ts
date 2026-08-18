import { Router, Request, Response } from 'express';
import { NotificationPriority, NotificationType, Role } from '@prisma/client';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { anthropic, anthropicConfigured } from '../lib/anthropic.js';

const router = Router();
router.use(protect);

const categories = ['BORROWING', 'RESERVATION', 'ACCOUNT', 'SYSTEM', 'CATALOGUE', 'GENERAL'] as const;
const priorities = ['HIGH', 'NORMAL', 'LOW'] as const;

type ExtractedIssue = {
  category: typeof categories[number];
  priority: typeof priorities[number];
  relatedRecord: { type: string; id: number; title: string; loanUuid?: string; targetId?: string } | null;
  suggestedAction: string;
};

type Candidate = { type: string; id: number; title: string; loanUuid?: string; targetId?: string; detail: string };

/**
 * Fallback classifier used only when ANTHROPIC_API_KEY isn't configured, or the
 * Claude call itself fails. Deliberately simple - the real intelligence lives in
 * analyseWithClaude below.
 */
function analyseTextHeuristic(description: string): Pick<ExtractedIssue, 'category' | 'priority'> {
  const lower = description.toLowerCase();
  const category = lower.match(/borrow|loan|due|return|renew|overdue/)
    ? 'BORROWING'
    : lower.match(/reserv|hold|queue|pickup/)
      ? 'RESERVATION'
      : lower.match(/login|password|account|email|student id|profile/)
        ? 'ACCOUNT'
        : lower.match(/database|website|portal|page|error|not working|system/)
          ? 'SYSTEM'
          : lower.match(/book|copy|barcode|shelf|catalog|catalogue/)
            ? 'CATALOGUE'
            : 'GENERAL';
  const priority = lower.match(/urgent|emergency|cannot access|blocked|deadline|exam/)
    ? 'HIGH'
    : lower.match(/not working|missing|wrong|incorrect|problem|issue/)
      ? 'NORMAL'
      : 'LOW';
  return { category, priority };
}

function suggestedActionFor(category: ExtractedIssue['category']): string {
  return category === 'BORROWING'
    ? 'Library staff should verify the loan, return or renewal record.'
    : category === 'RESERVATION'
      ? 'Library staff should verify the reservation status and queue position.'
      : category === 'CATALOGUE'
        ? 'Library staff should verify the catalogue record and physical copy information.'
        : category === 'ACCOUNT'
          ? 'Library staff should verify the student library account and access permissions.'
          : category === 'SYSTEM'
            ? 'Library staff should reproduce the reported system problem and check the affected service.'
            : 'Library staff should review the description and determine the appropriate resolution.';
}

/** Word-level keyword extraction for the catalogue search - same heuristic the old classifier used. */
function extractKeywords(description: string): string[] {
  return description.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 4).slice(0, 6);
}

/**
 * Gathers everything the student's account actually has on record - loans,
 * reservations, and books matching keywords from their description - so the
 * classifier (heuristic or Claude) only ever picks a relatedRecord from real
 * rows instead of inventing one.
 */
async function gatherCandidates(userId: number, description: string): Promise<Candidate[]> {
  const keywords = extractKeywords(description);
  const [loans, reservations, books] = await Promise.all([
    prisma.loan.findMany({
      where: { userId },
      include: { copy: { include: { book: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.reservation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    keywords.length
      ? prisma.book.findMany({
          where: { OR: keywords.flatMap(word => [{ title: { contains: word, mode: 'insensitive' as const } }, { isbn: { contains: word, mode: 'insensitive' as const } }]) },
          select: { id: true, title: true, author: true, isbn: true },
          take: 5
        })
      : Promise.resolve([])
  ]);

  const candidates: Candidate[] = [];
  loans.forEach(loan => candidates.push({
    type: 'LOAN', id: loan.id, title: loan.copy.book.title, loanUuid: loan.loanUuid,
    detail: `status ${loan.status}, due ${loan.dueDate.toISOString().slice(0, 10)}${loan.returnedAt ? `, returned ${loan.returnedAt.toISOString().slice(0, 10)}` : ''}`
  }));
  reservations.forEach(res => candidates.push({
    type: 'RESERVATION', id: res.id, title: `${res.type} reservation`, targetId: res.targetId,
    detail: `status ${res.status}, created ${res.createdAt.toISOString().slice(0, 10)}`
  }));
  books.forEach(book => candidates.push({
    type: 'BOOK', id: book.id, title: book.title,
    detail: `by ${book.author}${book.isbn ? `, ISBN ${book.isbn}` : ''}`
  }));
  return candidates;
}

const claudeOutputSchema = {
  type: 'object' as const,
  properties: {
    category: { type: 'string', enum: categories as unknown as string[] },
    priority: { type: 'string', enum: priorities as unknown as string[] },
    candidateIndex: {
      type: ['integer', 'null'],
      description: 'Index into the provided candidates array that this issue is about, or null if none of them apply.'
    },
    suggestedAction: {
      type: 'string',
      description: 'One or two sentences telling library staff specifically what to check or do next, grounded in the description and the chosen candidate (if any). Not a generic template.'
    }
  },
  required: ['category', 'priority', 'candidateIndex', 'suggestedAction'],
  additionalProperties: false
};

async function analyseWithClaude(description: string, candidates: Candidate[]): Promise<ExtractedIssue> {
  const candidateList = candidates.length
    ? candidates.map((c, i) => `[${i}] ${c.type} #${c.id} - "${c.title}" (${c.detail})`).join('\n')
    : '(none found on this student\'s account)';

  const response = await anthropic!.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    system: [
      'You triage help-desk reports for a university library system. A student has described a problem in their own words.',
      'Classify it and, if it clearly concerns one specific record already on their account (a loan, reservation, or catalogue book), pick that record from the candidate list so library staff can jump straight to it - do not invent a record that is not listed.',
      'Write a suggestedAction that is specific to this report, not a generic template: name what staff should look at or verify, using details from the description and the chosen record.',
      'category values: BORROWING (loans, returns, renewals, overdue, fines tied to a loan), RESERVATION (holds, queues, pickup windows), CATALOGUE (a specific book\'s details, availability, or physical copy), ACCOUNT (login, password, profile, student ID access), SYSTEM (the website/portal itself is broken), GENERAL (anything else).',
      'priority: HIGH for anything blocking the student right now or time-sensitive (exam, deadline, cannot access account); NORMAL for a real problem with no urgency; LOW for a minor issue or question.'
    ].join(' '),
    messages: [{
      role: 'user',
      content: `Student's description:\n"""\n${description}\n"""\n\nCandidate records from this student's account:\n${candidateList}`
    }],
    output_config: { format: { type: 'json_schema', schema: claudeOutputSchema } }
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude returned no text output.');
  const parsed = JSON.parse(textBlock.text) as {
    category: ExtractedIssue['category'];
    priority: ExtractedIssue['priority'];
    candidateIndex: number | null;
    suggestedAction: string;
  };

  const chosen = parsed.candidateIndex !== null ? candidates[parsed.candidateIndex] : undefined;
  const relatedRecord = chosen
    ? { type: chosen.type, id: chosen.id, title: chosen.title, loanUuid: chosen.loanUuid, targetId: chosen.targetId }
    : null;

  return {
    category: parsed.category,
    priority: parsed.priority,
    relatedRecord,
    suggestedAction: parsed.suggestedAction
  };
}

async function analyseIssue(userId: number, description: string): Promise<ExtractedIssue> {
  const candidates = await gatherCandidates(userId, description);

  if (anthropicConfigured) {
    try {
      return await analyseWithClaude(description, candidates);
    } catch (error) {
      console.error('Claude issue analysis failed, falling back to heuristic classifier:', error);
    }
  }

  // Fallback: no API key configured, or the Claude call itself failed.
  const { category, priority } = analyseTextHeuristic(description);
  const book = candidates.find(c => c.type === 'BOOK');
  const loan = category === 'BORROWING' ? candidates.find(c => c.type === 'LOAN') : undefined;
  const reservation = category === 'RESERVATION' ? candidates.find(c => c.type === 'RESERVATION') : undefined;
  const chosen = book || loan || reservation;
  const relatedRecord = chosen
    ? { type: chosen.type, id: chosen.id, title: chosen.title, loanUuid: chosen.loanUuid, targetId: chosen.targetId }
    : null;
  return { category, priority, relatedRecord, suggestedAction: suggestedActionFor(category) };
}

router.post('/issues/analyse', async (req: Request, res: Response): Promise<void> => {
  try {
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (description.length < 10) { res.status(400).json({ success: false, error: 'Please describe the problem in at least 10 characters.' }); return; }
    const extracted = await analyseIssue(req.user!.id, description);
    res.json({ success: true, data: { description, extracted } });
  } catch (error) {
    console.error('Library issue analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyse the library issue.' });
  }
});

router.post('/issues/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const extracted = req.body.extracted as ExtractedIssue | undefined;
    if (description.length < 10 || !extracted?.category || !extracted?.priority) { res.status(400).json({ success: false, error: 'A valid issue description and analysed issue details are required.' }); return; }
    const structuredDescription = [
      description,
      '',
      '--- Smart Intake ---',
      `Category: ${extracted.category}`,
      `Priority: ${extracted.priority}`,
      `Related record: ${extracted.relatedRecord ? JSON.stringify(extracted.relatedRecord) : 'None'}`,
      `Suggested action: ${extracted.suggestedAction || 'Library staff should review the issue.'}`,
    ].join('\n');
    const ticket = await prisma.maintenanceComplaint.create({ data: { userId: req.user!.id, title: `${extracted.category.charAt(0)}${extracted.category.slice(1).toLowerCase()} issue reported`, description: structuredDescription, roomNumber: 'LIBRARY', status: 'PENDING' } });
    const staff = await prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.LIBRARIAN] } }, select: { id: true } });
    if (staff.length) {
      await prisma.notification.createMany({ data: staff.map(staffUser => ({ userId: staffUser.id, type: NotificationType.GENERAL, title: `New ${extracted.category.toLowerCase()} issue`, message: `${req.user!.fullName} submitted a ${extracted.priority.toLowerCase()} priority library issue.`, priority: extracted.priority === 'HIGH' ? NotificationPriority.HIGH : NotificationPriority.NORMAL, actionUrl: '/portal/helpdesk' })) });
    }
    res.status(201).json({ success: true, message: 'Issue submitted for library review.', data: { ticket, extracted } });
  } catch (error) {
    console.error('Library issue submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit library issue.' });
  }
});

export default router;
