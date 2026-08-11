import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {prisma} from '../lib/prisma.js';
const router = Router();


// GET: /api/v1/analytics/system-aggregates
router.get('/system-aggregates', async (req: Request, res: Response): Promise<void> => {
  try {
    // Perform parallel lookups to keep execution timing optimal
    const [activeLoans, totalUsers, securityLogsCount] = await Promise.all([
      prisma.loan.count({
        where: { status: 'BORROWED' }
      }),
      prisma.user.count({
        where: { role: 'STUDENT' }
      }),
      prisma.auditLog.count({
        where: { action: { contains: 'EXCEPTION' } }
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeLoans,
        totalUsers,
        securityLogsCount
      }
    });
  } catch (error) {
    console.error('Analytics aggregation database error:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate system statistics.' });
  }
});

// GET: /api/v1/analytics/demand-forecast
router.get('/demand-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subject, borrowMonth } = req.query;

    if (!category || !subject) {
      res.status(400).json({ success: false, error: 'Category and subject fields are required parameters.' });
      return;
    }

    // Standard business logic calculation base layer mirroring historical baseline
    const historicalBaselineCount = await prisma.loan.count({
      where: {
        copy: {
          book: {
            category: String(category),
            title: { contains: String(subject), mode: 'insensitive' }
          }
        }
      }
    });

    // Apply scaling weight multipliers depending on the academic calendar block period
    let calendarMultiplier = 1.0;
    const targetMonth = Number(borrowMonth);

    if (targetMonth === 5) calendarMultiplier = 1.8;      // Exams Block high load peak spikes
    if (targetMonth === 10) calendarMultiplier = 1.4;     // Midterms Block load peak spikes
    if (targetMonth === 1) calendarMultiplier = 1.1;      // New standard intake window

    const predictedDemandValue = Math.max(1, Math.round((historicalBaselineCount + 3) * calendarMultiplier));

    res.status(200).json({
      success: true,
      data: {
        predicted_checkout_demand: predictedDemandValue
      }
    });
  } catch (error) {
    console.error('AI Forecasting core failure:', error);
    res.status(500).json({ success: false, error: 'Predictive analytics weights calculations failed.' });
  }
});

export default router;