import { Request, Response } from 'express';
import { ReservationStatus, ReservationType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const reserveBookForStudent = async (req: Request, res: Response): Promise<void> => {
  const bookId = Number(req.params.bookId);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    res.status(400).json({ success: false, error: 'Invalid book ID.' });
    return;
  }

  if (!req.user || req.user.role !== Role.STUDENT) {
    res.status(403).json({ success: false, error: 'Only students can reserve library books.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, author: true, isbn: true }
      });

      if (!book) throw new Error('Book not found.');

      const availableCopy = await tx.bookCopy.findFirst({
        where: { bookId, status: 'AVAILABLE' },
        select: { id: true }
      });

      if (availableCopy) {
        throw new Error('This book is currently available. You can borrow it instead of reserving it.');
      }

      const existing = await tx.reservation.findFirst({
        where: {
          userId: req.user.id,
          targetId: String(bookId),
          type: ReservationType.BOOK_HOLD,
          status: ReservationStatus.PENDING
        },
        select: { id: true, createdAt: true }
      });

      if (existing) {
        throw new Error('You already have an active reservation for this book.');
      }

      const queueAhead = await tx.reservation.count({
        where: {
          targetId: String(bookId),
          type: ReservationType.BOOK_HOLD,
          status: ReservationStatus.PENDING,
          createdAt: { lt: new Date() }
        }
      });

      const reservation = await tx.reservation.create({
        data: {
          type: ReservationType.BOOK_HOLD,
          targetId: String(bookId),
          status: ReservationStatus.PENDING,
          notes: `Book reservation queue position ${queueAhead + 1}`,
          userId: req.user.id
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          notes: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'BOOK_RESERVATION_CREATED',
          entityType: 'Reservation',
          entityId: String(reservation.id),
          description: `Reserved "${book.title}"`,
          ipAddress: req.ip || '0.0.0.0',
          details: { bookId, title: book.title, queuePosition: queueAhead + 1 }
        }
      });

      return { book, reservation, queuePosition: queueAhead + 1 };
    });

    res.status(201).json({
      success: true,
      message: `Reservation placed for "${result.book.title}".`,
      data: {
        reservation: result.reservation,
        book: result.book,
        queuePosition: result.queuePosition
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Unable to reserve this book.' });
  }
};

export const getMyBookReservations = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: req.user.id,
        type: ReservationType.BOOK_HOLD
      },
      orderBy: { createdAt: 'desc' }
    });

    const bookIds = reservations
      .map((reservation) => Number(reservation.targetId))
      .filter((id) => Number.isInteger(id) && id > 0);

    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, author: true, isbn: true, coverImage: true }
    });

    const bookMap = new Map(books.map((book) => [book.id, book]));

    res.status(200).json({
      success: true,
      data: reservations.map((reservation) => ({
        ...reservation,
        book: bookMap.get(Number(reservation.targetId)) || null
      }))
    });
  } catch (error) {
    console.error('Student reservations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve your reservations.' });
  }
};
