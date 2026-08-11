import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
const router = Router();


// Enforce strict access control. Only full system administrators can review global trail logs
router.use(protect);
router.use(restrictTo(Role.ADMIN));

/**
 * GET: /api/v1/audit-logs/stream
 * Streams immutable historical system logs including relational operator details
 */
router.get('/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Immutable audit log stream retrieval exception:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synchronize institutional trail security logs.',
    });
  }
});

export default router;