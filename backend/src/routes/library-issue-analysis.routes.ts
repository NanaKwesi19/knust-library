import { Router, Request, Response } from 'express';
import { NotificationPriority, NotificationType, Role } from '@prisma/client';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(protect);

const categories = ['BORROWING', 'RESERVATION', 'ACCOUNT', 'SYSTEM', 'CATALOGUE', 'GENERAL'] as const;
const priorities = ['HIGH', 'NORMAL', 'LOW'] as const;

type Category = typeof categories[number];
type Priority = typeof priorities[number];

type ExtractedIssue = {
  category: Category;
  priority: Priority;
  relatedRecord: { type: string; id: number; title: string; loanUuid?: string; targetId?: string } | null;
  suggestedAction: string;
};

type Candidate = {
  type: 'LOAN' | 'RESERVATION' | 'BOOK' | 'FINE';
  id: number;
  title: string;
  loanUuid?: string;
  targetId?: string;
  status: string;
  dueDate?: string;
  returnedAt?: string;
  author?: string;
  isbn?: string;
  amount?: number;
  reason?: string;
};

// Multi-word phrases score higher than single words - a phrase match is a much
// stronger, less ambiguous signal ("still shows borrowed" vs. just "shows").
const CATEGORY_SIGNALS: Record<Exclude<Category, 'GENERAL'>, { phrase: string; weight: number }[]> = {
  BORROWING: [
    { phrase: 'still shows', weight: 2 }, { phrase: 'checked out', weight: 2 }, { phrase: 'check out', weight: 2 },
    { phrase: 'due date', weight: 2 }, { phrase: 'due back', weight: 2 }, { phrase: 'getting a fine', weight: 2 },
    { phrase: 'borrow', weight: 1 }, { phrase: 'borrowed', weight: 1 }, { phrase: 'borrowing', weight: 1 },
    { phrase: 'loan', weight: 1 }, { phrase: 'loaned', weight: 1 }, { phrase: 'due', weight: 1 },
    { phrase: 'overdue', weight: 1 }, { phrase: 'return', weight: 1 }, { phrase: 'returned', weight: 1 },
    { phrase: 'renew', weight: 1 }, { phrase: 'renewal', weight: 1 }, { phrase: 'renewed', weight: 1 },
    { phrase: 'extend', weight: 1 }, { phrase: 'fine', weight: 1 },
    { phrase: 'wrongly charged', weight: 2 }, { phrase: 'charged', weight: 1 }, { phrase: 'charge', weight: 1 },
    { phrase: 'fee', weight: 1 }, { phrase: 'penalty', weight: 1 }
  ],
  RESERVATION: [
    { phrase: 'ready for pickup', weight: 2 }, { phrase: 'pick up', weight: 2 }, { phrase: 'queue position', weight: 2 },
    { phrase: 'waiting list', weight: 2 }, { phrase: 'hold expired', weight: 2 },
    { phrase: 'reserve', weight: 1 }, { phrase: 'reserved', weight: 1 }, { phrase: 'reservation', weight: 1 },
    { phrase: 'hold', weight: 1 }, { phrase: 'queue', weight: 1 }, { phrase: 'pickup', weight: 1 }, { phrase: 'waiting', weight: 1 }
  ],
  ACCOUNT: [
    { phrase: 'log in', weight: 2 }, { phrase: 'sign in', weight: 2 }, { phrase: 'locked out', weight: 2 },
    { phrase: 'student id', weight: 2 }, { phrase: 'can\'t access my account', weight: 2 },
    { phrase: 'login', weight: 1 }, { phrase: 'password', weight: 1 }, { phrase: 'account', weight: 1 },
    { phrase: 'email', weight: 1 }, { phrase: 'profile', weight: 1 }
  ],
  SYSTEM: [
    { phrase: 'not working', weight: 2 }, { phrase: 'won\'t load', weight: 2 }, { phrase: 'wont load', weight: 2 },
    { phrase: 'broken link', weight: 2 }, { phrase: 'keeps crashing', weight: 2 },
    { phrase: 'website', weight: 1 }, { phrase: 'portal', weight: 1 }, { phrase: 'page', weight: 1 },
    { phrase: 'error', weight: 1 }, { phrase: 'system', weight: 1 }, { phrase: 'crash', weight: 1 }, { phrase: 'bug', weight: 1 }
  ],
  CATALOGUE: [
    { phrase: 'missing pages', weight: 2 }, { phrase: 'wrong book', weight: 2 }, { phrase: 'incorrect details', weight: 2 },
    { phrase: 'book', weight: 1 }, { phrase: 'copy', weight: 1 }, { phrase: 'copies', weight: 1 },
    { phrase: 'barcode', weight: 1 }, { phrase: 'shelf', weight: 1 }, { phrase: 'catalog', weight: 1 },
    { phrase: 'catalogue', weight: 1 }, { phrase: 'isbn', weight: 1 }, { phrase: 'damaged', weight: 1 }
  ]
};

const HIGH_PRIORITY_SIGNALS = ['urgent', 'emergency', 'asap', 'right now', 'immediately', 'exam', 'deadline', 'cannot access', 'can\'t access', 'blocked', 'locked out', 'today', 'tomorrow'];
const NORMAL_PRIORITY_SIGNALS = ['not working', 'doesn\'t work', 'missing', 'wrong', 'incorrect', 'broken', 'problem', 'issue', 'error', 'still shows', 'charged'];

function countMatches(lower: string, phrase: string): number {
  return lower.split(phrase).length - 1;
}

/**
 * Scores every category by weighted keyword-phrase hits rather than stopping at
 * the first match - a message that mentions both "reservation" and "renewed"
 * is judged by which signal is actually stronger, not by which regex happens
 * to run first.
 */
function scoreCategories(lower: string): Record<Exclude<Category, 'GENERAL'>, number> {
  const scores = {} as Record<Exclude<Category, 'GENERAL'>, number>;
  for (const category of Object.keys(CATEGORY_SIGNALS) as Exclude<Category, 'GENERAL'>[]) {
    scores[category] = CATEGORY_SIGNALS[category].reduce((sum, { phrase, weight }) => sum + countMatches(lower, phrase) * weight, 0);
  }
  return scores;
}

/** Fixed tie-break order for categories with an equal, non-zero score - most common/actionable first. */
const CATEGORY_TIE_BREAK: Exclude<Category, 'GENERAL'>[] = ['BORROWING', 'RESERVATION', 'CATALOGUE', 'ACCOUNT', 'SYSTEM'];

function pickCategory(scores: Record<Exclude<Category, 'GENERAL'>, number>): Category {
  let best: Category = 'GENERAL';
  let bestScore = 0;
  for (const category of CATEGORY_TIE_BREAK) {
    if (scores[category] > bestScore) { best = category; bestScore = scores[category]; }
  }
  return best;
}

function pickPriority(lower: string): Priority {
  const highScore = HIGH_PRIORITY_SIGNALS.reduce((sum, phrase) => sum + countMatches(lower, phrase) * 3, 0);
  if (highScore > 0) return 'HIGH';
  const normalScore = NORMAL_PRIORITY_SIGNALS.reduce((sum, phrase) => sum + countMatches(lower, phrase), 0);
  return normalScore > 0 ? 'NORMAL' : 'LOW';
}

/** Significant (4+ letter) words shared between the description and a candidate's title. */
function wordOverlap(lower: string, title: string): number {
  const titleWords = title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4);
  return titleWords.filter(word => lower.includes(word)).length;
}

/**
 * Scores each fetched candidate against the description and the chosen
 * category, so the record that actually matches what the student described
 * wins - not just "the first loan on the account". A book whose title is
 * quoted in the description, and that also happens to be the student's
 * current active loan, scores far higher than an unrelated older loan.
 */
function pickRelatedRecord(lower: string, category: Category, candidates: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  let bestScore = 0;
  const mentionsFine = /fine|charge|fee|penalty/.test(lower);
  candidates.forEach((candidate, index) => {
    let score = wordOverlap(lower, candidate.title) * 3;
    if (candidate.type === 'LOAN' && category === 'BORROWING') score += 2;
    if (candidate.type === 'RESERVATION' && category === 'RESERVATION') score += 2;
    if (candidate.type === 'BOOK' && (category === 'CATALOGUE' || category === 'BORROWING' || category === 'RESERVATION')) score += 1;
    // A fine complaint rarely names the book, so match it on fine-specific
    // wording rather than requiring title overlap like the other types.
    if (candidate.type === 'FINE' && category === 'BORROWING' && mentionsFine) score += 3;
    // Slight recency tiebreaker - candidates arrive most-recent-first per type.
    score += Math.max(0, 0.1 * (5 - index));
    if (score > bestScore) { best = candidate; bestScore = score; }
  });
  return bestScore >= 2 ? best : null;
}

function describeRecord(record: Candidate): string {
  if (record.type === 'LOAN') {
    return `loan for "${record.title}" (status ${record.status}${record.dueDate ? `, due ${record.dueDate}` : ''}${record.returnedAt ? `, returned ${record.returnedAt}` : ''})`;
  }
  if (record.type === 'FINE') {
    return `${record.status.toLowerCase()} fine of GH₵${(record.amount ?? 0).toFixed(2)} (${record.reason || 'OVERDUE'}) for "${record.title}"`;
  }
  if (record.type === 'RESERVATION') return `reservation for target ${record.targetId} (status ${record.status})`;
  return `catalogue entry "${record.title}"${record.isbn ? ` (ISBN ${record.isbn})` : ''}`;
}

function suggestedActionFor(category: Category, record: Candidate | null): string {
  if (record) {
    if (category === 'BORROWING' && record.type === 'LOAN') {
      return `Check the student's ${describeRecord(record)} and confirm whether a return, renewal, or fine adjustment is needed.`;
    }
    if (category === 'BORROWING' && record.type === 'FINE') {
      return `Check the student's ${describeRecord(record)} and confirm whether it was applied correctly.`;
    }
    if (category === 'RESERVATION' && record.type === 'RESERVATION') {
      return `Check the student's ${describeRecord(record)} and confirm the queue position or pickup window.`;
    }
    if (record.type === 'BOOK') {
      return `Verify the catalogue record and physical copy for "${record.title}"${record.isbn ? ` (ISBN ${record.isbn})` : ''}.`;
    }
  }
  return category === 'BORROWING'
    ? 'Library staff should locate the relevant loan and verify the return or renewal record.'
    : category === 'RESERVATION'
      ? 'Library staff should locate the relevant reservation and verify its status and queue position.'
      : category === 'CATALOGUE'
        ? 'Library staff should verify the catalogue record and physical copy information.'
        : category === 'ACCOUNT'
          ? 'Library staff should verify the student library account and access permissions.'
          : category === 'SYSTEM'
            ? 'Library staff should reproduce the reported system problem and check the affected service.'
            : 'Library staff should review the description and determine the appropriate resolution.';
}

/** Word-level keyword extraction for the catalogue search. */
function extractKeywords(description: string): string[] {
  return description.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 4).slice(0, 6);
}

function significantWords(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4));
}

/** Shared-word count and how much of the smaller description it covers. */
function wordOverlapStats(a: Set<string>, b: Set<string>): { ratio: number; count: number } {
  if (a.size === 0 || b.size === 0) return { ratio: 0, count: 0 };
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return { ratio: shared / Math.min(a.size, b.size), count: shared };
}

/**
 * Looks for an already-open ticket from this student that reads like the same
 * complaint, so staff don't end up triaging the same issue twice and the
 * student gets pointed at their existing ticket instead of a fresh one.
 * Deliberately conservative (needs both a high overlap ratio and a minimum
 * number of shared distinctive words) to avoid false positives on short,
 * generic descriptions that happen to share a few common words.
 */
async function findPossibleDuplicate(userId: number, description: string): Promise<{ id: number } | null> {
  const openTickets = await prisma.maintenanceComplaint.findMany({
    where: { userId, roomNumber: 'LIBRARY', status: 'PENDING' },
    select: { id: true, description: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  if (!openTickets.length) return null;

  const newWords = significantWords(description);
  for (const ticket of openTickets) {
    const { ratio, count } = wordOverlapStats(newWords, significantWords(ticket.description));
    if (ratio >= 0.5 && count >= 4) return { id: ticket.id };
  }
  return null;
}

/**
 * Gathers everything the student's account actually has on record - loans,
 * fines, reservations, and books matching keywords from their description -
 * so the classifier only ever picks a relatedRecord from real rows instead of
 * guessing blind, and can use those rows as classification signal too.
 */
async function gatherCandidates(userId: number, description: string): Promise<Candidate[]> {
  const keywords = extractKeywords(description);
  const [loans, fines, reservations, books] = await Promise.all([
    prisma.loan.findMany({
      where: { userId },
      include: { copy: { include: { book: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.fine.findMany({
      where: { loan: { userId } },
      include: { loan: { include: { copy: { include: { book: true } } } } },
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
    type: 'LOAN', id: loan.id, title: loan.copy.book.title, loanUuid: loan.loanUuid, status: loan.status,
    dueDate: loan.dueDate.toISOString().slice(0, 10),
    returnedAt: loan.returnedAt ? loan.returnedAt.toISOString().slice(0, 10) : undefined
  }));
  fines.forEach(fine => candidates.push({
    type: 'FINE', id: fine.id, title: fine.loan.copy.book.title, loanUuid: fine.loan.loanUuid,
    status: fine.status, amount: fine.amount, reason: fine.reason
  }));
  reservations.forEach(res => candidates.push({
    type: 'RESERVATION', id: res.id, title: `${res.type} reservation`, targetId: res.targetId, status: res.status
  }));
  books.forEach(book => candidates.push({
    type: 'BOOK', id: book.id, title: book.title, status: 'AVAILABLE', author: book.author, isbn: book.isbn ?? undefined
  }));
  return candidates;
}

function analyseIssue(description: string, candidates: Candidate[]): ExtractedIssue {
  const lower = description.toLowerCase();

  // Score every category from the description text alone first...
  const scores = scoreCategories(lower);

  // ...then let real account data reinforce the strongest match: a book
  // mentioned by name that the student currently has on loan is strong
  // evidence for BORROWING even if they never used the word "loan"; the same
  // book on a pending reservation is evidence for RESERVATION.
  candidates.forEach(candidate => {
    const overlap = wordOverlap(lower, candidate.title);
    if (candidate.type === 'LOAN' && candidate.status !== 'RETURNED' && overlap > 0) scores.BORROWING += overlap * 2;
    if (candidate.type === 'RESERVATION' && candidate.status === 'PENDING' && overlap > 0) scores.RESERVATION += overlap * 2;
    // Fine complaints often never name the book at all ("why was I charged"),
    // so an unpaid fine on the account is itself a signal, not just its title.
    if (candidate.type === 'FINE' && candidate.status === 'UNPAID') scores.BORROWING += overlap > 0 ? overlap * 2 : 1;
  });

  const category = pickCategory(scores);
  const priority = pickPriority(lower);
  const relatedRecord = pickRelatedRecord(lower, category, candidates);
  const relatedRecordOut = relatedRecord
    ? { type: relatedRecord.type, id: relatedRecord.id, title: relatedRecord.title, loanUuid: relatedRecord.loanUuid, targetId: relatedRecord.targetId }
    : null;

  return { category, priority, relatedRecord: relatedRecordOut, suggestedAction: suggestedActionFor(category, relatedRecord) };
}

router.post('/issues/analyse', async (req: Request, res: Response): Promise<void> => {
  try {
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (description.length < 10) { res.status(400).json({ success: false, error: 'Please describe the problem in at least 10 characters.' }); return; }
    const [candidates, duplicate] = await Promise.all([
      gatherCandidates(req.user!.id, description),
      findPossibleDuplicate(req.user!.id, description)
    ]);
    const extracted = analyseIssue(description, candidates);
    if (duplicate) {
      extracted.suggestedAction = `Possible duplicate: this student already has ticket #${duplicate.id} open on what looks like the same issue - check before creating a new one. ${extracted.suggestedAction}`;
    }
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
