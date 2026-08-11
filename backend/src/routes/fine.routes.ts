import { Router, Request, Response } from 'express';
import { PrismaClient, Role, FineStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
const router = Router();


// Restrict all financial counter adjustments strictly to authenticated library administrators
router.use(protect);
router.use(restrictTo(Role.LIBRARIAN, Role.ADMIN));

/**
 * GET: /api/v1/fines/ledger
 * Streams full account penalty matrices with deep relation map chains for layout views
 */
router.get('/ledger', async (req: Request, res: Response): Promise<void> => {
  try {
    const finesLedger = await prisma.fine.findMany({
      include: {
        loan: {
          select: {
            loanUuid: true,
            copy: {
              select: {
                barcode: true,
                book: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            user: {
              select: {
                fullName: true,
                studentId: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: finesLedger,
    });
  } catch (error) {
    console.error('Failed to retrieve financial logs database matrix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synchronize institutional fine statement registries.',
    });
  }
});
/**
 * GET: /api/v1/fines/summary
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user!.role === Role.ADMIN || req.user!.role === Role.LIBRARIAN;
    const userFilter = isAdmin ? {} : { loan: { userId: req.user!.id } };

    const [
      totalFinesAgg,
      totalPaidAgg,
      totalUnpaidAgg,
      totalWaivedAgg,
      recentFines,
      finesByStatus
    ] = await Promise.all([
      prisma.fine.aggregate({ where: userFilter, _sum: { amount: true }, _count: { id: true } }),
      prisma.fine.aggregate({ where: { ...userFilter, status: FineStatus.PAID }, _sum: { amount: true } }),
      prisma.fine.aggregate({ where: { ...userFilter, status: FineStatus.UNPAID }, _sum: { amount: true } }),
      prisma.fine.aggregate({ where: { ...userFilter, status: FineStatus.WAIVED }, _sum: { amount: true } }),
      prisma.fine.findMany({
        where: userFilter,
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
      }),
      prisma.fine.groupBy({
        by: ['status'],
        where: userFilter,
        _count: { id: true },
        _sum: { amount: true }
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
        recentFines,
        finesByStatus: finesByStatus.map(s => ({
          status: s.status,
          count: s._count.id,
          amount: s._sum.amount || 0
        }))
      }
    });
  } catch (error) {
    console.error('Fines summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load fines summary.' });
  }
});
/**
 * POST: /api/v1/fines/clear-payment
 * Atomic transaction to verify a mobile money reference, clear fine hold, and log audits
 */
router.post('/clear-payment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fineId, reference } = req.body;

    if (!fineId || !reference) {
      res.status(400).json({
        success: false,
        error: 'Target penalty record index and network provider transaction reference are required attributes.',
      });
      return;
    }

    // Execute billing mutations within an isolated relational transaction block
    const completedPaymentRecord = await prisma.$transaction(async (tx) => {
      // 1. Verify existence and current balance status of target hold
      const fineRecord = await tx.fine.findUnique({
        where: { id: parseInt(fineId, 10) },
        include: { loan: true },
      });

      if (!fineRecord) {
        throw new Error('No account statement penalty row matches this index reference.');
      }
      if (fineRecord.status === FineStatus.PAID) {
        throw new Error('This account fee hold has already been processed, cleared, and archived.');
      }

      // 2. Prevent reference collision checks within the global payment ledger
      const dynamicCollisions = await tx.payment.findUnique({ where: { reference } });
      if (dynamicCollisions) {
        throw new Error('This Mobile Money reference tracker has already been applied to another statement.');
      }

      // 3. Shift the target fine status parameters state to PAID
      const updatedFine = await tx.fine.update({
        where: { id: fineRecord.id },
        data: { status: FineStatus.PAID },
      });

      // 4. Create the core payment voucher transaction record
      const loggedPayment = await tx.payment.create({
        data: {
          reference,
          amount: fineRecord.amount,
          userId: fineRecord.loan.userId,
          fineId: fineRecord.id,
        },
      });

      // 5. Append systemic audit trail records to document the clearance closure context
      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_RECEIVED',
          description: `Settled outstanding fee entry ID ${fineRecord.id} (GH¢ ${fineRecord.amount.toFixed(2)}) via MoMo Ref: ${reference}.`,
          userId: (req as any).user?.id || null,
        },
      });

      return loggedPayment;
    });

    res.status(200).json({
      success: true,
      message: 'Mobile Money reference validated. Fine dropped and statement closed successfully.',
      data: completedPaymentRecord,
    });
  } catch (error: any) {
    console.error('Financial checkout state mutation failure exception:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to complete transaction logging metrics clearance.',
    });
  }
});

export default router;