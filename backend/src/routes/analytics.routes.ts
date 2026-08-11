import { Router, Request, Response } from 'express';
import { Role, LoanStatus, FineStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);
router.use(restrictTo(Role.ADMIN, Role.LIBRARIAN));

// ==========================================
// DASHBOARD SUMMARY
// ==========================================

/**
 * GET: /api/v1/analytics/system-aggregates
 */
router.get('/system-aggregates', async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalBooks, totalUsers, totalLoans, activeLoans, overdueLoans, totalFines] = await Promise.all([
      prisma.book.count(),
      prisma.user.count(),
      prisma.loan.count(),
      prisma.loan.count({ where: { status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] } } }),
      prisma.loan.count({ where: { status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] }, dueDate: { lt: new Date() } } }),
      prisma.fine.aggregate({ where: { status: FineStatus.UNPAID }, _sum: { amount: true } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalUsers,
        totalLoans,
        activeLoans,
        overdueLoans,
        totalFines: totalFines._sum?.amount ?? 0
      }
    });
  } catch (error) {
    console.error('System aggregates error:', error);
    res.status(500).json({ success: false, error: 'Failed to load system aggregates.' });
  }
});

/**
 * GET: /api/v1/analytics/operational-metrics
 */
router.get('/operational-metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [newUsers, newLoans, returnsThisMonth, reservations, digitalDownloads] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.loan.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.loan.count({ where: { returnedAt: { gte: thirtyDaysAgo } } }),
      prisma.reservation.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
         prisma.digitalResource.aggregate({ _sum: { downloadCount: true } })
    ]);

    const avgLoanDuration = await prisma.loan.aggregate({
      where: { returnedAt: { not: null } },
      _avg: {
        // Prisma doesn't support _avg on date diffs directly — calculate manually or use raw query
      }
    });

    res.status(200).json({
      success: true,
      data: {
        newUsers,
        newLoans,
        returnsThisMonth,
        reservations,
           digitalDownloads: digitalDownloads._sum?.downloadCount ?? 0,
        avgLoanDuration: 12 // Placeholder — implement with raw query if needed
      }
    });
  } catch (error) {
    console.error('Operational metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to load operational metrics.' });
  }
});

/**
 * GET: /api/v1/analytics/demand-forecast
 */
router.get('/demand-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const categoryDemand = await prisma.loan.groupBy({
      by: ['copyId'],
      _count: { id: true },
      where: { createdAt: { gte: thirtyDaysAgo } }
    });

    const forecasts = await Promise.all(
      categoryDemand.slice(0, 10).map(async (group) => {
        const copy = await prisma.bookCopy.findUnique({
          where: { id: group.copyId },
          include: { book: true }
        });

        if (!copy) return null;

        return {
          category: copy.book.category,
          currentLoans: group._count.id,
          predictedDemand: Math.ceil(group._count.id * 1.2),
          confidence: Math.min(95, 60 + group._count.id * 3)
        };
      })
    );

    res.status(200).json({ success: true, data: forecasts.filter(Boolean) });
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to load demand forecast.' });
  }
});

// ==========================================
// REPORTS (Frontend expects these)
// ==========================================

/**
 * GET: /api/v1/analytics/circulation-report
 * Book circulation with date range
 */
router.get('/circulation-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, category } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { fullName: true, studentId: true } },
        copy: {
          include: {
            book: { select: { title: true, author: true, category: true, isbn: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by category if provided
    let filtered = loans;
    if (category && category !== 'ALL') {
      filtered = loans.filter((l) => l.copy.book.category === category);
    }

    // Calculate daily stats
    const dailyStats: Record<string, { checkouts: number; returns: number; renewals: number }> = {};
    filtered.forEach((loan) => {
      const date = new Date(loan.createdAt).toLocaleDateString();
      if (!dailyStats[date]) dailyStats[date] = { checkouts: 0, returns: 0, renewals: 0 };
      if (loan.status === 'BORROWED') dailyStats[date].checkouts++;
      if (loan.status === 'RETURNED') dailyStats[date].returns++;
      if (loan.status === 'RENEWED') dailyStats[date].renewals++;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCheckouts: filtered.filter((l) => l.status === 'BORROWED').length,
          totalReturns: filtered.filter((l) => l.status === 'RETURNED').length,
          totalRenewals: filtered.filter((l) => l.status === 'RENEWED').length,
          totalActive: filtered.filter((l) => ['BORROWED', 'RENEWED'].includes(l.status)).length
        },
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats })),
        records: filtered
      }
    });
  } catch (error) {
    console.error('Circulation report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate circulation report.' });
  }
});

/**
 * GET: /api/v1/analytics/user-activity-report
 * Student activity with date range
 */
router.get('/user-activity-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, role } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (role && role !== 'ALL') where.role = role as string;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            loans: true,
            reservations: true,
            readingHistory: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activityLevels = { HIGH: 0, MEDIUM: 0, LOW: 0, INACTIVE: 0 };
    users.forEach((u) => {
      const total = u._count.loans + u._count.reservations + u._count.readingHistory;
      if (total > 20) activityLevels.HIGH++;
      else if (total > 5) activityLevels.MEDIUM++;
      else if (total > 0) activityLevels.LOW++;
      else activityLevels.INACTIVE++;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers: users.length,
          ...activityLevels
        },
        records: users
      }
    });
  } catch (error) {
    console.error('User activity report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate user activity report.' });
  }
});

/**
 * GET: /api/v1/analytics/fine-collection-report
 * Fine collection with date range
 */
/**
 * GET: /api/v1/analytics/fine-collection-report
 * Fine collection with date range
 */
router.get('/fine-collection-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [finesRaw, paymentsRaw] = await Promise.all([
      prisma.fine.findMany({
        where,
        include: {
          loan: {
            include: {
              user: { select: { id: true, fullName: true, studentId: true } },
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
      }),
      prisma.payment.findMany({
        where: startDate || endDate ? {
          createdAt: where.createdAt
        } : {},
        include: {
          fine: {
            include: {
              loan: {
                include: {
                  user: { select: { id: true, fullName: true, studentId: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Map fines with user data from loan.user
    const fines = finesRaw.map(f => ({
      id: f.id,
      amount: f.amount,
      status: f.status,
      reason: f.reason,
      description: f.description,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      loanId: f.loanId,
      user: f.loan.user,
      book: f.loan.copy?.book || null,
      payments: f.payments
    }));

    // Map payments with user data from fine.loan.user
    const payments = paymentsRaw.map(p => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      status: p.status,
      createdAt: p.createdAt,
      fineId: p.fineId,
      user: p.fine.loan.user
    }));

    const totalFines = fines.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fines.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
    const totalWaived = fines.filter((f) => f.status === 'WAIVED').reduce((sum, f) => sum + f.amount, 0);
    const totalUnpaid = fines.filter((f) => f.status === 'UNPAID').reduce((sum, f) => sum + f.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFinesIssued: totalFines,
          totalPaid,
          totalWaived,
          totalUnpaid,
          collectionRate: totalFines > 0 ? parseFloat(((totalPaid / totalFines) * 100).toFixed(1)) : 0
        },
        fines,
        payments
      }
    });
  } catch (error) {
    console.error('Fine collection report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate fine collection report.' });
  }
});
/**
 * GET: /api/v1/analytics/weekly-trends
 */
router.get('/weekly-trends', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const weeks = 12;
    const trends = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const [checkouts, returns, newUsers, newFines] = await Promise.all([
        prisma.loan.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
        prisma.loan.count({ where: { returnedAt: { gte: weekStart, lt: weekEnd } } }),
        prisma.user.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
        prisma.fine.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } })
      ]);

      trends.push({
        week: `W${weeks - i}`,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        checkouts,
        returns,
        newUsers,
        newFines
      });
    }

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error('Weekly trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to load weekly trends.' });
  }
});

/**
 * GET: /api/v1/analytics/user-growth
 */
router.get('/user-growth', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const months = 12;
    const growth = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [newUsers, totalUsers] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
        prisma.user.count({ where: { createdAt: { lt: monthEnd } } })
      ]);

      growth.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        newUsers,
        totalUsers
      });
    }

    res.status(200).json({ success: true, data: growth });
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({ success: false, error: 'Failed to load user growth.' });
  }
});
export default router;