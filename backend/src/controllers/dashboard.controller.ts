import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getStudentDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // Aggregated database calls
    const [borrowedCount, overdueCount, reservationCount, totalFines] = await Promise.all([
      prisma.loan.count({ where: { userId, status: 'BORROWED' } }),
      prisma.loan.count({ where: { userId, status: 'OVERDUE' } }),
      prisma.reservation.count({ where: { userId, status: 'PENDING' } }),
      prisma.fine.aggregate({ 
        where: { loan: { userId }, status: 'UNPAID' },
        _sum: { amount: true } 
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        borrowedBooks: borrowedCount,
        dueSoon: overdueCount,
        reservations: reservationCount,
        fines: totalFines._sum.amount || 0
      }
    });
  } catch (error) {
    console.error("DASHBOARD STATS ERROR:", error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard data.' });
  }
};