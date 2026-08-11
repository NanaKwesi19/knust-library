import { Router, Request, Response } from 'express';
import { NotificationPriority, NotificationType, ReservationStatus, Role } from '@prisma/client';
import type { LoanStatus } from '@prisma/client';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(protect);

type ActiveLoanStatus = 'BORROWED' | 'RENEWED';
const activeLoanStatuses: ActiveLoanStatus[] = ['BORROWED', 'RENEWED'];

type ExtractedIssue = {
  category: 'BORROWING' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM' | 'CATALOGUE' | 'GENERAL';
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  relatedRecord: { type: string; id: number; title: string; loanUuid?: string; targetId?: string } | null;
  suggestedAction: string;
};

function analyseText(description: string): Pick<ExtractedIssue, 'category' | 'priority'> {
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

async function analyseIssue(userId: number, description: string): Promise<ExtractedIssue> {
  const { category, priority } = analyseText(description);
  const [books, loan, reservation] = await Promise.all([
    prisma.book.findMany({ where: { OR: [{ title: { contains: description, mode: 'insensitive' } }, { isbn: { contains: description, mode: 'insensitive' } }] }, select: { id: true, title: true }, take: 5 }),
    prisma.loan.findFirst({ where: { userId, status: { in: activeLoanStatuses as LoanStatus[] } }, include: { copy: { include: { book: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.reservation.findFirst({ where: { userId, status: ReservationStatus.PENDING }, orderBy: { createdAt: 'desc' } })
  ]);
  const book = books[0];
  const relatedRecord = book
    ? { type: 'BOOK', id: book.id, title: book.title }
    : loan && category === 'BORROWING'
      ? { type: 'LOAN', id: loan.id, title: loan.copy.book.title, loanUuid: loan.loanUuid }
      : reservation && category === 'RESERVATION'
        ? { type: 'RESERVATION', id: reservation.id, title: 'Pending reservation', targetId: reservation.targetId }
        : null;
  const suggestedAction = category === 'BORROWING'
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
  return { category, priority, relatedRecord, suggestedAction };
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
