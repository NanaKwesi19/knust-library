import { Router, Request, Response } from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

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
        user: { select: { fullName: true, email: true, role: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to load audit logs.' });
  }
});

export default router;