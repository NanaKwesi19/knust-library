import { Router, Request, Response } from 'express';
import { Role, LoanStatus, ReservationStatus, NotificationType, NotificationPriority, BookingStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All student portal routes require authentication
router.use(protect);
router.use(restrictTo(Role.STUDENT, Role.STAFF, Role.LIBRARIAN, Role.ADMIN));

// ==========================================
// DASHBOARD SUMMARY
// ==========================================

/**
 * GET: /api/v1/student/dashboard
 * Complete dashboard overview for the student portal homepage
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [
      borrowedBooks,
      dueSoonCount,
      activeReservations,
      totalFines,
      unreadNotifications,
      activeBookings,
      recentActivity
    ] = await Promise.all([
      // Currently borrowed books
      prisma.loan.count({
        where: { userId, status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] } }
      }),

      // Books due within 3 days
      prisma.loan.count({
        where: {
          userId,
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), gte: new Date() }
        }
      }),

      // Active reservations (book holds)
      prisma.reservation.count({
        where: { userId, status: ReservationStatus.PENDING }
      }),

      // Total unpaid fines
      prisma.fine.aggregate({
        where: { loan: { userId }, status: 'UNPAID' },
        _sum: { amount: true }
      }),

      // Unread notifications
      prisma.notification.count({
        where: { userId, read: false }
      }),

      // Active room bookings
      prisma.roomBooking.count({
        where: {
          userId,
          status: BookingStatus.CONFIRMED,
          endTime: { gte: new Date() }
        }
      }),

      // Recent reading activity (last 5)
      prisma.readingHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        borrowedBooks,
        dueSoon: dueSoonCount,
        reservations: activeReservations,
        fines: totalFines._sum.amount || 0,
        unreadNotifications,
        activeBookings,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Dashboard summary fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data.' });
  }
});

// ==========================================
// MY BORROWED BOOKS
// ==========================================

/**
 * GET: /api/v1/student/borrowed-books
 * All currently borrowed books with full details
 */
router.get('/borrowed-books', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const loans = await prisma.loan.findMany({
      where: {
        userId,
        status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED, LoanStatus.OVERDUE] }
      },
      include: {
        copy: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
                category: true,
                coverImage: true
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const formatted = loans.map(loan => ({
      loanUuid: loan.loanUuid,
      bookTitle: loan.copy.book.title,
      author: loan.copy.book.author,
      category: loan.copy.book.category,
      coverImage: loan.copy.book.coverImage,
      barcode: loan.copy.barcode,
      borrowedAt: loan.createdAt,
      dueDate: loan.dueDate,
      status: loan.status,
      renewalCount: loan.renewalCount,
      fineAmount: loan.fineAmount,
      daysRemaining: Math.ceil((new Date(loan.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Borrowed books fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve borrowed books.' });
  }
});

/**
 * POST: /api/v1/student/renew/:loanUuid
 * Renew a borrowed book (max 2 renewals, 7 days each)
 */
router.post('/renew/:loanUuid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanUuid } = req.params as { loanUuid: string };
    const userId = req.user!.id;

    const loan = await prisma.loan.findFirst({
      where: { loanUuid, userId }
    });

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan record not found.' });
      return;
    }

    if (loan.renewalCount >= 2) {
      res.status(400).json({ success: false, error: 'Maximum renewals reached for this item.' });
      return;
    }

    if (loan.status === LoanStatus.OVERDUE) {
      res.status(400).json({ success: false, error: 'Overdue items cannot be renewed. Please return the book first.' });
      return;
    }

    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 7);

    const updatedLoan = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        dueDate: newDueDate,
        renewalCount: { increment: 1 },
        status: LoanStatus.RENEWED
      }
    });

    // Log the renewal
    await prisma.auditLog.create({
      data: {
        action: 'BOOK_RENEWED',
        description: `Book renewed. New due date: ${newDueDate.toLocaleDateString()}`,
        userId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Book renewed successfully. New due date: ' + newDueDate.toLocaleDateString(),
      data: updatedLoan
    });
  } catch (error) {
    console.error('Book renewal error:', error);
    res.status(500).json({ success: false, error: 'Failed to renew book.' });
  }
});

// ==========================================
// RESERVATIONS
// ==========================================

/**
 * GET: /api/v1/student/reservations
 * All student reservations (books and spaces)
 */
router.get('/reservations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const reservations = await prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: reservations });
  } catch (error) {
    console.error('Reservations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve reservations.' });
  }
});

/**
 * POST: /api/v1/student/reserve-book
 * Reserve a book that's currently unavailable
 */
router.post('/reserve-book', async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId, notes } = req.body;
    const userId = req.user!.id;

    if (!bookId) {
      res.status(400).json({ success: false, error: 'Book ID is required.' });
      return;
    }

    // Check if book exists
    const book = await prisma.book.findUnique({ where: { id: parseInt(bookId) } });
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found in catalogue.' });
      return;
    }

    // Check if user already has a pending reservation for this book
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        userId,
        targetId: bookId.toString(),
        status: ReservationStatus.PENDING,
        type: 'BOOK_HOLD'
      }
    });

    if (existingReservation) {
      res.status(409).json({ success: false, error: 'You already have a pending reservation for this book.' });
      return;
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        type: 'BOOK_HOLD',
        targetId: bookId.toString(),
        notes: notes || null,
        status: ReservationStatus.PENDING
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.BOOK_AVAILABLE,
        title: 'Book Reservation Placed',
        message: `You have reserved "${book.title}". We will notify you when it becomes available.`,
        priority: NotificationPriority.NORMAL
      }
    });

    res.status(201).json({
      success: true,
      message: `Reservation placed for "${book.title}".`,
      data: reservation
    });
  } catch (error) {
    console.error('Book reservation error:', error);
    res.status(500).json({ success: false, error: 'Failed to place reservation.' });
  }
});

/**
 * DELETE: /api/v1/student/reservations/:id/cancel
 * Cancel a reservation
 */
router.delete('/reservations/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const reservationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const userId = req.user!.id;

    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, userId }
    });

    if (!reservation) {
      res.status(404).json({ success: false, error: 'Reservation not found.' });
      return;
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CANCELLED }
    });

    res.status(200).json({ success: true, message: 'Reservation cancelled successfully.' });
  } catch (error) {
    console.error('Reservation cancellation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel reservation.' });
  }
});

// ==========================================
// STUDY SPACE RESERVATIONS
// ==========================================

/**
 * GET: /api/v1/student/study-spaces
 * Available study rooms with current availability
 */
router.get('/study-spaces', async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date as string) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const rooms = await prisma.studyRoom.findMany({
      where: { isAvailable: true },
      include: {
        bookings: {
          where: {
            bookingDate: queryDate,
            status: BookingStatus.CONFIRMED
          },
          select: {
            startTime: true,
            endTime: true
          }
        }
      }
    });

    const formatted = rooms.map(room => ({
      roomUuid: room.roomUuid,
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      location: room.location,
      description: room.description,
      amenities: room.amenities,
      bookings: room.bookings.map(b => ({
        start: b.startTime,
        end: b.endTime
      }))
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Study spaces fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve study spaces.' });
  }
});

/**
 * GET: /api/v1/student/my-bookings
 * Current student's room bookings
 */
router.get('/my-bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const bookings = await prisma.roomBooking.findMany({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        endTime: { gte: new Date() }
      },
      include: {
        room: {
          select: {
            roomNumber: true,
            capacity: true,
            location: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const formatted = bookings.map(b => ({
      bookingUuid: b.bookingUuid,
      roomNumber: b.room.roomNumber,
      capacity: b.room.capacity,
      location: b.room.location,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
  }
});

/**
 * POST: /api/v1/student/book-study-space
 * Book a study room (student-facing wrapper)
 */
router.post('/book-study-space', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomUuid, bookingDate, startTime, endTime } = req.body;
    const userId = req.user!.id;

    if (!roomUuid || !bookingDate || !startTime || !endTime) {
      res.status(400).json({ success: false, error: 'All booking details are required.' });
      return;
    }

    const targetRoom = await prisma.studyRoom.findUnique({ where: { roomUuid } });
    if (!targetRoom) {
      res.status(404).json({ success: false, error: 'Room not found.' });
      return;
    }

    const requestedDate = new Date(bookingDate);
    const startRange = new Date(startTime);
    const endRange = new Date(endTime);

    if (startRange >= endRange) {
      res.status(400).json({ success: false, error: 'End time must be after start time.' });
      return;
    }

    // Check for overlaps
    const overlapping = await prisma.roomBooking.findFirst({
      where: {
        roomId: targetRoom.id,
        bookingDate: requestedDate,
        status: BookingStatus.CONFIRMED,
        AND: [
          { startTime: { lt: endRange } },
          { endTime: { gt: startRange } }
        ]
      }
    });

    if (overlapping) {
      res.status(409).json({ success: false, error: 'This room is already booked for the selected time.' });
      return;
    }

    const booking = await prisma.roomBooking.create({
      data: {
        userId,
        roomId: targetRoom.id,
        bookingDate: requestedDate,
        startTime: startRange,
        endTime: endRange,
        status: BookingStatus.CONFIRMED
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Study Room Confirmed',
        message: `Your booking for Room ${targetRoom.roomNumber} on ${requestedDate.toLocaleDateString()} is confirmed.`,
        priority: NotificationPriority.NORMAL
      }
    });

    res.status(201).json({
      success: true,
      message: `Room ${targetRoom.roomNumber} booked successfully.`,
      data: booking
    });
  } catch (error) {
    console.error('Study space booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to book study space.' });
  }
});

/**
 * DELETE: /api/v1/student/bookings/:bookingUuid/cancel
 * Cancel a room booking
 */
router.delete('/bookings/:bookingUuid/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const bookingUuid = Array.isArray(req.params.bookingUuid)
      ? req.params.bookingUuid[0]
      : req.params.bookingUuid;
    const userId = req.user!.id;

    const booking = await prisma.roomBooking.findFirst({
      where: { bookingUuid, userId }
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    await prisma.roomBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED }
    });

    res.status(200).json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
  }
});

// ==========================================
// FINES & PAYMENTS
// ==========================================

/**
 * GET: /api/v1/student/fines
 * All fines for the current student
 */
router.get('/fines', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const fines = await prisma.fine.findMany({
      where: {
        loan: { userId }
      },
      include: {
        loan: {
          include: {
            copy: {
              include: {
                book: {
                  select: { title: true, author: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = fines.map(fine => ({
      id: fine.id,
      amount: fine.amount,
      status: fine.status,
      reason: fine.reason,
      description: fine.description,
      bookTitle: fine.loan.copy.book.title,
      bookAuthor: fine.loan.copy.book.author,
      loanUuid: fine.loan.loanUuid,
      createdAt: fine.createdAt
    }));

    const totalUnpaid = fines.filter(f => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0);

    res.status(200).json({
      success: true,
      data: { fines: formatted, totalUnpaid }
    });
  } catch (error) {
    console.error('Fines fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve fines.' });
  }
});

// ==========================================
// DIGITAL LIBRARY
// ==========================================

/**
 * GET: /api/v1/student/digital-resources
 * Browse digital library resources
 */
router.get('/digital-resources', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, type, courseCode } = req.query;

    const where: any = {};
    if (category) where.category = { contains: category as string, mode: 'insensitive' };
    if (courseCode) where.courseCode = { contains: courseCode as string, mode: 'insensitive' };
    if (type) where.fileType = { contains: type as string, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const resources = await prisma.digitalResource.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    console.error('Digital resources fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve digital resources.' });
  }
});

/**
 * POST: /api/v1/student/digital-resources/:id/download
 * Track a digital resource download
 */
router.post('/digital-resources/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const resourceId = parseInt(req.params.id as string);
    const userId = req.user!.id;

    const resource = await prisma.digitalResource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      res.status(404).json({ success: false, error: 'Resource not found.' });
      return;
    }

    // Increment download count
    await prisma.digitalResource.update({
      where: { id: resourceId },
      data: { downloadCount: { increment: 1 } }
    });

    // Add to reading history
    await prisma.readingHistory.create({
      data: {
        userId,
        action: 'DOWNLOADED',
        resourceType: resource.category.toUpperCase(),
        resourceId: resourceId.toString(),
        resourceTitle: resource.title,
        resourceAuthor: resource.author
      }
    });

    res.status(200).json({
      success: true,
      message: 'Download tracked successfully.',
      data: { accessUrl: resource.accessUrl }
    });
  } catch (error) {
    console.error('Download tracking error:', error);
    res.status(500).json({ success: false, error: 'Failed to process download.' });
  }
});

// ==========================================
// DIGITAL LIBRARY CARD
// ==========================================

/**
 * GET: /api/v1/student/library-card
 * Generate digital library card data
 */
router.get('/library-card', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        studentId: true,
        email: true,
        programme: true,
        department: true,
        yearOfStudy: true,
        status: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    // Get or create library card
    let card = await prisma.digitalLibraryCard.findUnique({
      where: { studentId: user.studentId || user.email }
    });

    if (!card) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      card = await prisma.digitalLibraryCard.create({
        data: {
          studentId: user.studentId || user.email,
          qrCodeData: JSON.stringify({
            studentId: user.studentId,
            email: user.email,
            name: user.fullName,
            issued: new Date().toISOString()
          }),
          expiryDate
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: user.fullName,
        studentId: user.studentId,
        email: user.email,
        programme: user.programme,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        cardUuid: card.cardUuid,
        qrCodeData: card.qrCodeData,
        issueDate: card.issueDate,
        expiryDate: card.expiryDate,
        status: card.status,
        accountStatus: user.status
      }
    });
  } catch (error) {
    console.error('Library card fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate library card.' });
  }
});

// ==========================================
// READING HISTORY
// ==========================================

/**
 * GET: /api/v1/student/reading-history
 * Student's reading and activity history
 */
router.get('/reading-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { limit } = req.query;

    const history = await prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 20
    });

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Reading history fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve reading history.' });
  }
});

// ==========================================
// PROFILE
// ==========================================

/**
 * GET: /api/v1/student/profile
 * Current student's profile
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userUuid: true,
        fullName: true,
        email: true,
        studentId: true,
        role: true,
        status: true,
        programme: true,
        department: true,
        yearOfStudy: true,
        phone: true,
        profileImage: true,
        createdAt: true
      }
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});

/**
 * PATCH: /api/v1/student/profile
 * Update student profile
 */
router.patch('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { phone, programme, department, yearOfStudy, profileImage } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(phone && { phone }),
        ...(programme && { programme }),
        ...(department && { department }),
        ...(yearOfStudy && { yearOfStudy: parseInt(yearOfStudy) }),
        ...(profileImage && { profileImage })
      },
      select: {
        fullName: true,
        email: true,
        studentId: true,
        programme: true,
        department: true,
        yearOfStudy: true,
        phone: true,
        profileImage: true
      }
    });

    res.status(200).json({ success: true, message: 'Profile updated successfully.', data: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// ==========================================
// CATALOGUE SEARCH
// ==========================================

/**
 * GET: /api/v1/student/catalogue-search
 * Search the library catalogue
 */
router.get('/catalogue-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, author, availableOnly } = req.query;

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { author: { contains: q as string, mode: 'insensitive' } },
        { isbn: { contains: q as string, mode: 'insensitive' } },
        { category: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    if (category) where.category = { contains: category as string, mode: 'insensitive' };
    if (author) where.author = { contains: author as string, mode: 'insensitive' };

    const books = await prisma.book.findMany({
      where,
      include: {
        copies: {
          select: {
            id: true,
            barcode: true,
            status: true
          }
        }
      },
      orderBy: { title: 'asc' },
      take: 50
    });

    let formatted = books.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      shelfLocation: book.shelfLocation,
      coverImage: book.coverImage,
      coverUrl: book.coverUrl,
      description: book.description,
      publisher: book.publisher,
      publishYear: book.publishYear,
      totalCopies: book.copies.length,
      availableCopies: book.copies.filter(c => c.status === 'AVAILABLE').length,
      copies: book.copies
    }));

    if (availableOnly === 'true') {
      formatted = formatted.filter(b => b.availableCopies > 0);
    }

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('Catalogue search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search catalogue.' });
  }
});

// ==========================================
// RECOMMENDATIONS
// ==========================================

/**
 * GET: /api/v1/student/recommendations
 * Personalized book recommendations
 */
router.get('/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get user's borrowing history categories
    const userLoans = await prisma.loan.findMany({
      where: { userId },
      include: {
        copy: {
          include: {
            book: { select: { category: true, title: true } }
          }
        }
      },
      take: 10
    });

    const preferredCategories = [...new Set(userLoans.map(l => l.copy.book.category))];
    const borrowedTitles = userLoans.map(l => l.copy.book.title);

    // Find books in similar categories that haven't been borrowed
    let recommendations = await prisma.book.findMany({
      where: {
        category: { in: preferredCategories },
        title: { notIn: borrowedTitles },
        copies: {
          some: { status: 'AVAILABLE' }
        }
      },
      include: {
        copies: {
          where: { status: 'AVAILABLE' },
          take: 1
        }
      },
      take: 6
    });

    // If no category matches, return popular books
    if (recommendations.length === 0) {
      recommendations = await prisma.book.findMany({
        where: {
          copies: { some: { status: 'AVAILABLE' } }
        },
        include: {
          copies: {
            where: { status: 'AVAILABLE' },
            take: 1
          }
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      });
    }

    const formatted = recommendations.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.description,
      available: (book as any).copies ? (book as any).copies.length > 0 : (book as any).availableCopies > 0
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load recommendations.' });
  }
});

export default router;