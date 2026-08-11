import { Router, Request, Response } from 'express';
import { NotificationPriority, NotificationType, ReservationStatus, Role, LoanStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(protect);
const activeLoanStatuses = [LoanStatus.BORROWED, LoanStatus.RENEWED];

async function getSettings() {
  return prisma.librarySetting.findFirst() ?? {
    maxBooksPerStudent: 5, maxBooksPerStaff: 10, loanDurationDays: 14, renewalLimit: 1,
    fineRatePerDay: 2, maxFineAmount: 50, lostBookDaysThreshold: 90, lostBookFee: 150,
    gracePeriodDays: 3, libraryName: 'KNUST Library', institution: 'Kwame Nkrumah University of Science and Technology', openingHours: {}
  };
}

router.get('/policies', async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getSettings();
    res.json({ success: true, data: {
      libraryName: settings.libraryName, institution: settings.institution,
      borrowing: { maxBooksPerStudent: settings.maxBooksPerStudent, loanDurationDays: settings.loanDurationDays, renewalLimit: settings.renewalLimit, gracePeriodDays: settings.gracePeriodDays },
      fines: { fineRatePerDay: settings.fineRatePerDay, maxFineAmount: settings.maxFineAmount, lostBookDaysThreshold: settings.lostBookDaysThreshold, lostBookFee: settings.lostBookFee },
      openingHours: settings.openingHours
    }});
  } catch (error) { console.error('Library policies error:', error); res.status(500).json({ success: false, error: 'Failed to load library policies.' }); }
});

router.get('/my-library', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [settings, loans, reservations, fines] = await Promise.all([
      getSettings(),
      prisma.loan.findMany({ where: { userId, status: { in: activeLoanStatuses } }, include: { copy: { include: { book: true } } }, orderBy: { dueDate: 'asc' } }),
      prisma.reservation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.fine.findMany({ where: { loan: { userId } }, include: { loan: { include: { copy: { include: { book: true } } } } }, orderBy: { createdAt: 'desc' } })
    ]);
    const reservationsWithQueue = await Promise.all(reservations.map(async reservation => {
      if (reservation.type !== 'BOOK_HOLD') return { ...reservation, queuePosition: null };
      const queuePosition = await prisma.reservation.count({ where: { type: 'BOOK_HOLD', targetId: reservation.targetId, status: ReservationStatus.PENDING, createdAt: { lte: reservation.createdAt } } });
      const book = await prisma.book.findUnique({ where: { id: Number(reservation.targetId) }, select: { id: true, title: true, author: true, coverImage: true } });
      return { ...reservation, queuePosition, book };
    }));
    res.json({ success: true, data: {
      borrowed: loans.map(loan => ({ loanUuid: loan.loanUuid, book: loan.copy.book, barcode: loan.copy.barcode, borrowedAt: loan.createdAt, dueDate: loan.dueDate, renewalCount: loan.renewalCount, daysRemaining: Math.ceil((loan.dueDate.getTime() - Date.now()) / 86400000), status: loan.status })),
      reservations: reservationsWithQueue, fines,
      policies: { maxBooksPerStudent: settings.maxBooksPerStudent, loanDurationDays: settings.loanDurationDays, renewalLimit: settings.renewalLimit, gracePeriodDays: settings.gracePeriodDays, fineRatePerDay: settings.fineRatePerDay, maxFineAmount: settings.maxFineAmount }
    }});
  } catch (error) { console.error('My library error:', error); res.status(500).json({ success: false, error: 'Failed to load your library account.' }); }
});

router.post('/loans/:loanUuid/renew', async (req: Request, res: Response): Promise<void> => {
  try {
    const loanUuid = Array.isArray(req.params.loanUuid) ? req.params.loanUuid[0] : req.params.loanUuid;
    const settings = await getSettings();
    const loan = await prisma.loan.findFirst({ where: { loanUuid, userId: req.user!.id }, include: { copy: { include: { book: true } } } });
    if (!loan) { res.status(404).json({ success: false, error: 'Loan record not found.' }); return; }
    if (!activeLoanStatuses.includes(loan.status)) { res.status(400).json({ success: false, error: 'Only active loans can be renewed.' }); return; }
    if (loan.renewalCount >= settings.renewalLimit) { res.status(400).json({ success: false, error: `Maximum renewals (${settings.renewalLimit}) reached.` }); return; }
    const pendingHold = await prisma.reservation.findFirst({ where: { type: 'BOOK_HOLD', targetId: String(loan.copy.bookId), status: ReservationStatus.PENDING, userId: { not: req.user!.id } } });
    if (pendingHold) { res.status(409).json({ success: false, error: 'This book has a waiting list, so it cannot be renewed.' }); return; }
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + settings.loanDurationDays);
    const updated = await prisma.$transaction(async tx => {
      const renewed = await tx.loan.update({ where: { id: loan.id }, data: { dueDate: newDueDate, renewalCount: { increment: 1 }, status: LoanStatus.RENEWED } });
      await tx.auditLog.create({ data: { action: 'BOOK_RENEWED', description: `Student renewed "${loan.copy.book.title}". New due date: ${newDueDate.toISOString()}`, userId: req.user!.id } });
      return renewed;
    });
    res.json({ success: true, message: `Book renewed until ${newDueDate.toLocaleDateString()}.`, data: updated });
  } catch (error) { console.error('Student renewal error:', error); res.status(500).json({ success: false, error: 'Failed to renew book.' }); }
});

router.post('/reservations/book', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id; const bookId = Number(req.body.bookId); const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null;
    if (!Number.isInteger(bookId)) { res.status(400).json({ success: false, error: 'A valid book ID is required.' }); return; }
    const [book, existing, activeLoan] = await Promise.all([
      prisma.book.findUnique({ where: { id: bookId }, include: { copies: true } }),
      prisma.reservation.findFirst({ where: { userId, type: 'BOOK_HOLD', targetId: String(bookId), status: ReservationStatus.PENDING } }),
      prisma.loan.findFirst({ where: { userId, copy: { bookId }, status: { in: activeLoanStatuses } } })
    ]);
    if (!book) { res.status(404).json({ success: false, error: 'Book not found.' }); return; }
    if (book.copies.some(copy => copy.status === 'AVAILABLE')) { res.status(409).json({ success: false, error: 'This book currently has an available copy. Borrow it instead of reserving it.' }); return; }
    if (activeLoan) { res.status(409).json({ success: false, error: 'You already have this book on loan.' }); return; }
    if (existing) { res.status(409).json({ success: false, error: 'You already have a pending reservation for this book.' }); return; }
    const reservation = await prisma.reservation.create({ data: { userId, type: 'BOOK_HOLD', targetId: String(bookId), status: ReservationStatus.PENDING, notes } });
    const queuePosition = await prisma.reservation.count({ where: { type: 'BOOK_HOLD', targetId: String(bookId), status: ReservationStatus.PENDING, createdAt: { lte: reservation.createdAt } } });
    await prisma.notification.create({ data: { userId, type: NotificationType.GENERAL, title: 'Reservation placed', message: `Your hold for “${book.title}” is in position ${queuePosition}. You will be notified when it becomes available.`, priority: NotificationPriority.NORMAL } });
    res.status(201).json({ success: true, message: 'Reservation placed successfully.', data: { reservation, queuePosition, book } });
  } catch (error) { console.error('Library reservation error:', error); res.status(500).json({ success: false, error: 'Failed to place reservation.' }); }
});

router.get('/reservations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id); const reservation = await prisma.reservation.findFirst({ where: { id, userId: req.user!.id } });
    if (!reservation) { res.status(404).json({ success: false, error: 'Reservation not found.' }); return; }
    const book = reservation.type === 'BOOK_HOLD' ? await prisma.book.findUnique({ where: { id: Number(reservation.targetId) }, include: { copies: true } }) : null;
    const queuePosition = reservation.type === 'BOOK_HOLD' && reservation.status === ReservationStatus.PENDING ? await prisma.reservation.count({ where: { type: 'BOOK_HOLD', targetId: reservation.targetId, status: ReservationStatus.PENDING, createdAt: { lte: reservation.createdAt } } }) : null;
    res.json({ success: true, data: { reservation, book, queuePosition } });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to load reservation.' }); }
});

router.delete('/reservations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id); const reservation = await prisma.reservation.findFirst({ where: { id, userId: req.user!.id, status: ReservationStatus.PENDING } });
    if (!reservation) { res.status(404).json({ success: false, error: 'Pending reservation not found.' }); return; }
    await prisma.reservation.update({ where: { id }, data: { status: ReservationStatus.CANCELLED } });
    res.json({ success: true, message: 'Reservation cancelled.' });
  } catch (error) { res.status(500).json({ success: false, error: 'Failed to cancel reservation.' }); }
});

router.post('/issues/intake', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id; const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (description.length < 10) { res.status(400).json({ success: false, error: 'Please describe the problem in at least 10 characters.' }); return; }
    const lower = description.toLowerCase();
    const category = lower.match(/borrow|loan|due|return|renew|overdue/) ? 'BORROWING' : lower.match(/reserv|hold|queue|pickup/) ? 'RESERVATION' : lower.match(/login|password|account|email|student id|profile/) ? 'ACCOUNT' : lower.match(/database|website|portal|page|error|not working|system/) ? 'SYSTEM' : lower.match(/book|copy|barcode|shelf|catalog|catalogue/) ? 'CATALOGUE' : 'GENERAL';
    const priority = lower.match(/urgent|emergency|cannot access|blocked|deadline|exam/) ? 'HIGH' : lower.match(/not working|missing|wrong|incorrect|problem|issue/) ? 'NORMAL' : 'LOW';
    const [book, loan, reservation] = await Promise.all([
      prisma.book.findFirst({ where: { OR: [{ title: { contains: description, mode: 'insensitive' } }, { isbn: { contains: description, mode: 'insensitive' } }] } }),
      prisma.loan.findFirst({ where: { userId, status: { in: activeLoanStatuses } }, include: { copy: { include: { book: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.reservation.findFirst({ where: { userId, status: ReservationStatus.PENDING }, orderBy: { createdAt: 'desc' } })
    ]);
    const relatedRecord = book ? { type: 'BOOK', id: book.id, title: book.title } : loan && category === 'BORROWING' ? { type: 'LOAN', id: loan.id, title: loan.copy.book.title, loanUuid: loan.loanUuid } : reservation && category === 'RESERVATION' ? { type: 'RESERVATION', id: reservation.id, targetId: reservation.targetId } : null;
    const title = `${category.charAt(0)}${category.slice(1).toLowerCase()} issue reported`;
    const structuredDescription = [description, '', '--- Smart Intake ---', `Category: ${category}`, `Priority: ${priority}`, `Related record: ${relatedRecord ? JSON.stringify(relatedRecord) : 'None'}`].join('\n');
    const ticket = await prisma.maintenanceComplaint.create({ data: { userId, title, description: structuredDescription, roomNumber: 'LIBRARY', status: 'PENDING' } });
    const staff = await prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.LIBRARIAN] } }, select: { id: true } });
    if (staff.length) await prisma.notification.createMany({ data: staff.map(staffUser => ({ userId: staffUser.id, type: NotificationType.GENERAL, title: `New ${category.toLowerCase()} issue`, message: `${req.user!.fullName} submitted a ${priority.toLowerCase()} priority library issue.`, priority: priority === 'HIGH' ? NotificationPriority.HIGH : NotificationPriority.NORMAL, actionUrl: '/portal/helpdesk' })) });
    res.status(201).json({ success: true, message: 'Issue submitted for library review.', data: { ticket, extracted: { category, priority, relatedRecord } } });
  } catch (error) { console.error('Library issue intake error:', error); res.status(500).json({ success: false, error: 'Failed to submit library issue.' }); }
});

router.get('/issues/my', async (req: Request, res: Response): Promise<void> => {
  try { const tickets = await prisma.maintenanceComplaint.findMany({ where: { userId: req.user!.id, roomNumber: 'LIBRARY' }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data: tickets }); }
  catch (error) { res.status(500).json({ success: false, error: 'Failed to load your library issues.' }); }
});

router.get('/issues', restrictTo(Role.ADMIN, Role.LIBRARIAN), async (_req: Request, res: Response): Promise<void> => {
  try { const tickets = await prisma.maintenanceComplaint.findMany({ where: { roomNumber: 'LIBRARY' }, include: { user: { select: { id: true, fullName: true, email: true, studentId: true } }, resolvedBy: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } }); res.json({ success: true, data: tickets }); }
  catch (error) { res.status(500).json({ success: false, error: 'Failed to load library issues.' }); }
});

export default router;
