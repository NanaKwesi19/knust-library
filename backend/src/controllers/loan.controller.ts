import { Request, Response } from 'express';
import {prisma} from '../lib/prisma.js';

// Explicit interfaces to strictly define payload safety
interface CheckoutPayload {
  userUuid: string;
  barcode: string;
}

export const checkoutBookCopy = async (req: Request, res: Response): Promise<void> => {
  const { userUuid, barcode } = req.body as CheckoutPayload;

  if (!userUuid || !barcode) {
    res.status(400).json({ success: false, error: 'Missing userUuid or barcode in request body.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Authenticate user access profile
      const user = await tx.user.findFirst({
        where: { userUuid },
      });
      if (!user || user.status !== 'ACTIVE') throw new Error('Account validation failed or user profile is deactivated.');

      // 2. Isolate physical item and check shelf status
      const bookCopy = await tx.bookCopy.findUnique({
        where: { barcode },
        include: { book: true },
      });
      if (!bookCopy) throw new Error('Scanned physical copy barcode not found in registry.');
      if (bookCopy.status !== 'AVAILABLE') {
        throw new Error(`Item copy is currently unavailable for loan. Current state: ${bookCopy.status}`);
      }

      // 3. Compute static loan window duration (14 days ahead)
      const borrowDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(borrowDate.getDate() + 14);

      // 4. Record transaction history securely using immutable internal IDs
      const newLoan = await tx.loan.create({
        data: {
          userId: user.id,
          copyId: bookCopy.id,
          dueDate,
          status: 'BORROWED',
        },
        select: { loanUuid: true, dueDate: true },
      });

      // 5. Instantly change copy status to block duplicate borrow collisions
      await tx.bookCopy.update({
        where: { id: bookCopy.id },
        data: { status: 'BORROWED' },
      });

      // 6. Write compliance footprint into logging table
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BOOK_CHECKOUT',
          entityType: 'Loan',
          entityId: String(bookCopy.id),
          description: `Checked out ${bookCopy.book.title}`,
          ipAddress: req.ip || '0.0.0.0',
          details: { title: bookCopy.book.title, barcode },
        },
      });

      return { newLoan, bookTitle: bookCopy.book.title };
    });

    res.status(201).json({
      success: true,
      message: `Successfully checked out "${result.bookTitle}"`,
      data: result.newLoan,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Checkout aborted due to a conflict.' });
  }
};

export const returnBookCopy = async (req: Request, res: Response): Promise<void> => {
  const loanUuidParam = req.params.loanUuid;
  const loanUuid = Array.isArray(loanUuidParam) ? loanUuidParam[0] : loanUuidParam;

  if (!loanUuid) {
    res.status(400).json({ success: false, error: 'Missing loanUuid in request parameters.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate the specific active transaction record
      const loan = await tx.loan.findUnique({
        where: { loanUuid },
      });

      if (!loan) throw new Error('Target loan instance record could not be found.');
      if (loan.status === 'RETURNED') throw new Error('This loan has already been settled and processed.');

      const bookCopy = await tx.bookCopy.findUnique({
        where: { id: loan.copyId },
        include: { book: true },
      });
      if (!bookCopy) throw new Error('Linked book copy record could not be resolved.');

      const returnDate = new Date();
      let finalizedStatus: 'RETURNED' | 'OVERDUE' = 'RETURNED';

      if (returnDate > loan.dueDate) {
        finalizedStatus = 'OVERDUE';
      }

      // 2. Complete and close down the active tracking timeline
      await tx.loan.update({
        where: { id: loan.id },
        data: { returnedAt: returnDate, status: finalizedStatus },
      });

      // 3. Mark the physical copy as available on shelves again
      await tx.bookCopy.update({
        where: { id: loan.copyId },
        data: { status: 'AVAILABLE' },
      });

      // 4. Log compliance outcome
      await tx.auditLog.create({
        data: {
          userId: loan.userId,
          action: 'BOOK_RETURN',
          entityType: 'Loan',
          entityId: String(loan.id),
          description: `Returned ${bookCopy.book.title}`,
          ipAddress: req.ip || '0.0.0.0',
          details: { title: bookCopy.book.title, wasOverdue: finalizedStatus === 'OVERDUE' },
        },
      });

      return { title: bookCopy.book.title, finalizedStatus };
    });

    res.status(200).json({
      success: true,
      message: `"${result.title}" return verified. Inventory status: ${result.finalizedStatus}`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Unable to log return statement.' });
  }
};