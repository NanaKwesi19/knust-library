import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);
router.use(restrictTo(Role.ADMIN, Role.LIBRARIAN));

/**
 * GET: /api/v1/audit-logs/recent?limit=10
 */
router.get('/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Audit logs recent error:', error);
    res.status(500).json({ success: false, error: 'Failed to load recent audit logs.' });
  }
});

/**
 * GET: /api/v1/audit-logs
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      action,
      severity,
      startDate,
      endDate,
      page = '1',
      limit = '20'
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { action: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (action && action !== 'ALL') where.action = action as string;
    if (severity && severity !== 'ALL') where.severity = severity as string;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              studentId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: logs,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
});

/**
 * POST: /api/v1/audit-logs
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, description, severity, details, userId, ipAddress, userAgent } = req.body;

    const log = await prisma.auditLog.create({
      data: {
        action,
        description,
        severity: severity || 'INFO',
        details: details || {},
        userId: userId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error('Audit log creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create audit log.' });
  }
});

export default router;