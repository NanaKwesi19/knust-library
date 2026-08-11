import { Router, Request, Response } from 'express';
import { Role, CopyStatus, LoanStatus, FineStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);

// ==========================================
// ADMIN/LIBRARIAN ROUTES
// ==========================================
/**
 * GET: /api/v1/loans?page=1&limit=10
 * Paginated list of all loans
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as string;
    
    if (search) {
      where.OR = [
        { user: { fullName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
        { copy: { book: { title: { contains: search as string, mode: 'insensitive' } } } }
      ];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, studentId: true } },
          copy: {
            include: {
              book: { select: { id: true, title: true, author: true, isbn: true } }
            }
          }
        }
      }),
      prisma.loan.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: loans,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Loans fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve loans.' });
  }
});
router.use(restrictTo(Role.LIBRARIAN, Role.ADMIN));

/**
 * GET: /api/v1/loans/comprehensive
 * Full circulation ledger
 */
router.get('/comprehensive', async (req: Request, res: Response): Promise<void> => {
  try {
    const loanLedger = await prisma.loan.findMany({
      include: {
        user: { select: { fullName: true, studentId: true, email: true } },
        copy: {
          select: {
            barcode: true,
            book: { select: { title: true, category: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: loanLedger });
  } catch (error) {
    console.error('Loan ledger fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve loan ledger.' });
  }
});

/**
 * GET: /api/v1/loans/overdue
 * List all overdue loans with fine calculations
 */
router.get('/overdue', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
        dueDate: { lt: now }
      },
      include: {
        user: { select: { fullName: true, studentId: true, email: true, phone: true } },
        copy: {
          select: {
            barcode: true,
            book: { select: { title: true, author: true, isbn: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Calculate days overdue and accrued fine for each
    const enriched = overdueLoans.map((loan) => {
      const daysOverdue = Math.ceil((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const fineRate = 2.0; // GH₵2 per day — should come from LibrarySetting in production
      const fineAmount = Math.min(daysOverdue * fineRate, 50.0);

      return {
        ...loan,
        daysOverdue,
        fineAmount: parseFloat(fineAmount.toFixed(2)),
        fineStatus: fineAmount > 0 ? 'ACCRUING' : 'NONE'
      };
    });

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Overdue loans fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve overdue loans.' });
  }
});
/**
 * GET: /api/v1/loans/active-ledger
 */
router.get('/active-ledger', restrictTo(Role.ADMIN, Role.LIBRARIAN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] }
    };

    if (search) {
      where.OR = [
        { user: { fullName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } },
        { user: { studentId: { contains: search as string, mode: 'insensitive' } } },
        { copy: { book: { title: { contains: search as string, mode: 'insensitive' } } } }
      ];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, studentId: true } },
          copy: {
            include: {
              book: { select: { id: true, title: true, author: true, isbn: true } }
            }
          }
        }
      }),
      prisma.loan.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: loans,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Active ledger error:', error);
    res.status(500).json({ success: false, error: 'Failed to load active ledger.' });
  }
});

/**
 * GET: /api/v1/loans/overdue-summary
 */
router.get('/overdue-summary', restrictTo(Role.ADMIN, Role.LIBRARIAN), async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const [
      totalOverdue,
      topOverdueUsers
    ] = await Promise.all([
      prisma.loan.count({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: now }
        }
      }),
      prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: now }
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: {
          user: { select: { fullName: true, email: true, studentId: true } },
          copy: {
            include: {
              book: { select: { title: true } }
            }
          }
        }
      })
    ]);

    const overdueWithDays = topOverdueUsers.map(loan => ({
      ...loan,
      daysOverdue: Math.ceil((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    }));

    res.status(200).json({
      success: true,
      data: {
        totalOverdue,
        overdueBreakdown: {
          lessThan7Days: overdueWithDays.filter(l => l.daysOverdue <= 7).length,
          days7to14: overdueWithDays.filter(l => l.daysOverdue > 7 && l.daysOverdue <= 14).length,
          days14to30: overdueWithDays.filter(l => l.daysOverdue > 14 && l.daysOverdue <= 30).length,
          moreThan30Days: overdueWithDays.filter(l => l.daysOverdue > 30).length
        },
        topOverdueUsers: overdueWithDays
      }
    });
  } catch (error) {
    console.error('Overdue summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load overdue summary.' });
  }
});


/**
 * POST: /api/v1/loans/checkout
 * Check out a book to a student
 */
router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, barcode, dueDate } = req.body;

    if (!studentId || !barcode) {
      res.status(400).json({ success: false, error: 'Student ID and barcode are required.' });
      return;
    }

    // Find the student
    const student = await prisma.user.findUnique({
      where: { studentId },
      include: { _count: { select: { loans: { where: { status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] } } } } } }
    });

    if (!student || student.role !== Role.STUDENT) {
      res.status(404).json({ success: false, error: 'Student not found.' });
      return;
    }

    // Check loan limit
    if (student._count.loans >= 5) {
      res.status(400).json({ success: false, error: 'Student has reached the maximum loan limit (5 books).' });
      return;
    }

    // Find available copy
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode },
      include: { book: true }
    });

    if (!copy) {
      res.status(404).json({ success: false, error: 'Book copy not found.' });
      return;
    }

    if (copy.status !== CopyStatus.AVAILABLE) {
      res.status(400).json({ success: false, error: `Copy is currently ${copy.status.toLowerCase()}.` });
      return;
    }

    // Calculate due date (14 days from now if not provided)
    const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Create loan
      const loan = await tx.loan.create({
        data: {
          userId: student.id,
          copyId: copy.id,
          dueDate: calculatedDueDate,
          status: LoanStatus.BORROWED,
          renewalCount: 0
        }
      });

      // Update copy status
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.BORROWED }
      });

      // Create reading history entry
      await tx.readingHistory.create({
        data: {
          userId: student.id,
          action: 'BORROWED',
          resourceType: 'BOOK',
          resourceId: copy.barcode,
          resourceTitle: copy.book.title,
          resourceAuthor: copy.book.author
        }
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          action: 'CHECKOUT',
          description: `Checked out "${copy.book.title}" (${barcode}) to ${student.fullName} (${studentId})`,
          userId: req.user!.id
        }
      });

      return loan;
    });

    res.status(201).json({
      success: true,
      message: 'Book checked out successfully.',
      data: result
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: 'Failed to check out book.' });
  }
});

/**
 * POST: /api/v1/loans/return
 * Return a borrowed book
 */
router.post('/return', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanUuid } = req.body;

    if (!loanUuid) {
      res.status(400).json({ success: false, error: 'Loan UUID is required.' });
      return;
    }

    const loan = await prisma.loan.findUnique({
      where: { loanUuid },
      include: {
        user: { select: { fullName: true, studentId: true } },
        copy: { include: { book: true } }
      }
    });

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found.' });
      return;
    }

    if (loan.status === LoanStatus.RETURNED) {
      res.status(400).json({ success: false, error: 'This book has already been returned.' });
      return;
    }

    const now = new Date();
    const isOverdue = loan.dueDate < now;
    let fine = null;

    const result = await prisma.$transaction(async (tx) => {
      // Update loan status
      const updatedLoan = await tx.loan.update({
        where: { loanUuid },
        data: {
          status: LoanStatus.RETURNED,
          returnedAt: now
        }
      });

      // Update copy to available
      await tx.bookCopy.update({
        where: { id: loan.copyId },
        data: { status: CopyStatus.AVAILABLE }
      });

      // Create reading history
      await tx.readingHistory.create({
        data: {
          
          userId: loan.userId,
          action: 'RETURNED',
          resourceType: 'BOOK',
          resourceId: loan.copy.barcode,
          resourceTitle: loan.copy.book.title,
          resourceAuthor: loan.copy.book.author
        }
      });

      // Check for fine if overdue
      if (isOverdue) {
        const daysOverdue = Math.ceil((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const fineAmount = Math.min(daysOverdue * 2.0, 50.0);

        fine = await tx.fine.create({
          data: {
            
            loanId: loan.id,
            amount: parseFloat(fineAmount.toFixed(2)),
            status: FineStatus.UNPAID,
            reason: 'OVERDUE',
            description: `Overdue by ${daysOverdue} days for "${loan.copy.book.title}"`
          }
        });
      }

      // Check if there's a pending reservation for this book
      const pendingReservation = await tx.reservation.findFirst({
        where: {
          targetId: loan.copy.bookId.toString(),
          type: 'BOOK_HOLD',
          status: 'PENDING'
        },
        orderBy: { createdAt: 'asc' }
      });

      if (pendingReservation) {
        // Notify next in line (create notification)
        await tx.notification.create({
          data: {
            userId: pendingReservation.userId,
            title: 'Book Available',
            message: `"${loan.copy.book.title}" is now available for pickup.`,
            type: 'BOOK_AVAILABLE',
            priority: 'HIGH'
          }
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          action: 'RETURN',
          description: `Returned "${loan.copy.book.title}" (${loan.copy.barcode}) from ${loan.user.fullName}`,
          userId: req.user!.id
        }
      });

      return updatedLoan;
    });

    res.status(200).json({
      success: true,
      message: 'Book returned successfully.',
      data: { loan: result, fine }
    });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ success: false, error: 'Failed to return book.' });
  }
});

/**
 * POST: /api/v1/loans/renew
 * Admin/librarian renew a loan for a student
 */
router.post('/renew', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanUuid, newDueDate } = req.body;

    if (!loanUuid) {
      res.status(400).json({ success: false, error: 'Loan UUID is required.' });
      return;
    }

    const loan = await prisma.loan.findUnique({
      where: { loanUuid },
      include: {
        user: { select: { fullName: true, studentId: true } },
        copy: { include: { book: true } }
      }
    });

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found.' });
      return;
    }

    if (loan.status === LoanStatus.RETURNED) {
      res.status(400).json({ success: false, error: 'Cannot renew a returned loan.' });
      return;
    }

    if (loan.renewalCount >= 2) {
      res.status(400).json({ success: false, error: 'Maximum renewals (2) reached for this loan.' });
      return;
    }

    const calculatedDueDate = newDueDate
      ? new Date(newDueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const renewed = await tx.loan.update({
        where: { loanUuid },
        data: {
          dueDate: calculatedDueDate,
          status: LoanStatus.RENEWED,
          renewalCount: { increment: 1 }
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'RENEW',
          description: `Renewed "${loan.copy.book.title}" for ${loan.user.fullName} (${loan.user.studentId}). New due: ${calculatedDueDate.toLocaleDateString()}`,
          userId: req.user!.id
        }
      });

      return renewed;
    });

    res.status(200).json({
      success: true,
      message: 'Loan renewed successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Admin renew error:', error);
    res.status(500).json({ success: false, error: 'Failed to renew loan.' });
  }
});

/**
 * GET: /api/v1/loans/fines
 * List all fines with optional filters
 */
router.get('/fines', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, studentId } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as string;
    if (studentId) {
      const student = await prisma.user.findUnique({ where: { studentId: studentId as string } });
      if (student) where.loan = { userId: student.id };
    }

    const fines = await prisma.fine.findMany({
      where,
      include: {
        loan: {
          include: {
            user: { select: { fullName: true, studentId: true, email: true } },
            copy: {
              include: {
                book: { select: { title: true } }
              }
            }
          }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalUnpaid = await prisma.fine.aggregate({
      where: { status: FineStatus.UNPAID },
      _sum: { amount: true }
    });

    res.status(200).json({
      success: true,
      data: {
        data: fines,
        totalUnpaid: totalUnpaid._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Fines fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve fines.' });
  }
});

/**
 * GET: /api/v1/loans/fines/summary
 */
router.get('/fines/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalFinesAgg,
      totalPaidAgg,
      totalUnpaidAgg,
      totalWaivedAgg,
      recentFines
    ] = await Promise.all([
      prisma.fine.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      prisma.fine.aggregate({ where: { status: FineStatus.PAID }, _sum: { amount: true } }),
      prisma.fine.aggregate({ where: { status: FineStatus.UNPAID }, _sum: { amount: true } }),
      prisma.fine.aggregate({ where: { status: FineStatus.WAIVED }, _sum: { amount: true } }),
      prisma.fine.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          loan: {
            include: {
              user: { select: { fullName: true, studentId: true } },
              copy: {
                include: {
                  book: { select: { title: true } }
                }
              }
            }
          },
          payments: true
        }
      })
    ]);

    const totalFines = totalFinesAgg._sum?.amount || 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFines,
          totalPaid: totalPaidAgg._sum?.amount || 0,
          totalUnpaid: totalUnpaidAgg._sum?.amount || 0,
          totalWaived: totalWaivedAgg._sum?.amount || 0,
          totalCount: totalFinesAgg._count?.id || 0,
          collectionRate: totalFines > 0 
            ? parseFloat((((totalPaidAgg._sum?.amount || 0) / totalFines) * 100).toFixed(1))
            : 0
        },
        recentFines
      }
    });
  } catch (error) {
    console.error('Fines summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load fines summary.' });
  }
});

/**
 * POST: /api/v1/loans/fines/:id/pay
 * Mark a fine as paid
 */
router.post('/fines/:id/pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const fineId = parseInt(req.params.id as string);
    const { paymentMethod = 'CASH', transactionId } = req.body;

    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      select: { id: true, amount: true, status: true, loan: { select: { userId: true } } }
    });

    if (!fine) {
      res.status(404).json({ success: false, error: 'Fine not found.' });
      return;
    }

    if (fine.status === FineStatus.PAID) {
      res.status(400).json({ success: false, error: 'Fine is already paid.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: fine.loan.userId },
      select: { fullName: true, studentId: true }
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedFine = await tx.fine.update({
        where: { id: fineId },
        data: { status: FineStatus.PAID }
      });

      await tx.payment.create({
        data: {
          userId: fine.loan.userId,
          fineId: fineId,
          amount: fine.amount,
          method: paymentMethod,
          status: 'COMPLETED'
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'FINE_PAYMENT',
          description: `Fine of GH₵${fine.amount} paid for ${user!.fullName} (${user!.studentId})`,
          userId: req.user!.id
        }
      });

      return updatedFine;
    });

    res.status(200).json({
      success: true,
      message: 'Fine marked as paid.',
      data: result
    });
  } catch (error) {
    console.error('Fine payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to process fine payment.' });
  }
});

/**
 * POST: /api/v1/loans/fines/:id/waive
 * Waive a fine (admin only)
 */
router.post('/fines/:id/waive', restrictTo(Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const fineId = parseInt(req.params.id as string);
    const { reason } = req.body;

    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      select: { id: true, amount: true, status: true, reason: true, description: true, createdAt: true, updatedAt: true, loanId: true, loan: { select: { userId: true } } }
    });

    if (!fine) {
      res.status(404).json({ success: false, error: 'Fine not found.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: fine.loan.userId },
      select: { fullName: true, studentId: true }
    });

    const updated = await prisma.$transaction(async (tx) => {
      const waived = await tx.fine.update({
        where: { id: fineId },
        data: { status: FineStatus.WAIVED }
      });

      await tx.auditLog.create({
        data: {
          action: 'FINE_WAIVED',
          description: `Fine of GH₵${fine.amount} waived for ${(fine as any).user?.fullName || (fine as any).user?.studentId || 'Unknown user'}. Reason: ${reason || 'No reason provided'}`,
          userId: req.user!.id
        }
      });

      return waived;
    });

    res.status(200).json({
      success: true,
      message: 'Fine waived.',
      data: updated
    });
  } catch (error) {
    console.error('Fine waive error:', error);
    res.status(500).json({ success: false, error: 'Failed to waive fine.' });
  }
});

export default router;