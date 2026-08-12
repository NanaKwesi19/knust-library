import { Router, Request, Response } from 'express';
import { CopyStatus, LoanStatus, Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect, restrictTo(Role.STUDENT));

const getSettings = async () => {
  const settings = await prisma.librarySetting.findFirst();
  return settings ?? {
    loanDurationDays: 14,
    maxBooksPerStudent: 5,
    renewalLimit: 2,
  };
};

/**
 * POST /api/v1/student-loans/borrow
 * Student borrows the next available physical copy for a book.
 * The authenticated user is always used; studentId/userId cannot be supplied by the client.
 */
router.post('/borrow', async (req: Request, res: Response): Promise<void> => {
  const bookId = Number(req.body?.bookId);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    res.status(400).json({ success: false, error: 'A valid bookId is required.' });
    return;
  }

  try {
    const settings = await getSettings();

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, author: true, isbn: true }
      });

      if (!book) {
        throw Object.assign(new Error('Book not found.'), { statusCode: 404 });
      }

      const activeLoans = await tx.loan.count({
        where: {
          userId: req.user!.id,
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] }
        }
      });

      if (activeLoans >= settings.maxBooksPerStudent) {
        throw Object.assign(
          new Error(`You have reached the maximum of ${settings.maxBooksPerStudent} active borrowed books.`),
          { statusCode: 409 }
        );
      }

      const existingLoan = await tx.loan.findFirst({
        where: {
          userId: req.user!.id,
          copy: { bookId },
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] }
        }
      });

      if (existingLoan) {
        throw Object.assign(new Error('You already have an active loan for this book.'), { statusCode: 409 });
      }

      const copy = await tx.bookCopy.findFirst({
        where: { bookId, status: CopyStatus.AVAILABLE },
        orderBy: { id: 'asc' }
      });

      if (!copy) {
        throw Object.assign(new Error('No physical copy is currently available. Please reserve this book instead.'), { statusCode: 409 });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + settings.loanDurationDays);

      const loan = await tx.loan.create({
        data: {
          userId: req.user!.id,
          copyId: copy.id,
          dueDate,
          status: LoanStatus.BORROWED,
        },
        include: {
          copy: {
            include: { book: { select: { id: true, title: true, author: true, isbn: true } } }
          }
        }
      });

      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.BORROWED }
      });

      await tx.readingHistory.create({
        data: {
          userId: req.user!.id,
          action: 'BORROWED',
          resourceType: 'BOOK',
          resourceId: String(book.id),
          resourceTitle: book.title,
          resourceAuthor: book.author,
        }
      });

      return loan;
    });

    res.status(201).json({
      success: true,
      message: 'Book borrowed successfully.',
      data: {
        loan: result,
        dueDate: result.dueDate,
        loanDurationDays: settings.loanDurationDays,
      }
    });
  } catch (error: any) {
    const status = error?.statusCode ?? 500;
    if (status === 500) console.error('Student borrow error:', error);
    res.status(status).json({ success: false, error: error?.message ?? 'Unable to borrow this book.' });
  }
});

router.get('/my', async (req: Request, res: Response): Promise<void> => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        copy: {
          include: {
            book: { select: { id: true, title: true, author: true, isbn: true, coverImage: true, coverUrl: true } }
          }
        }
      }
    });

    res.status(200).json({ success: true, data: loans });
  } catch (error) {
    console.error('Student loans fetch error:', error);
    res.status(500).json({ success: false, error: 'Unable to retrieve your loans.' });
  }
});

export default router;
