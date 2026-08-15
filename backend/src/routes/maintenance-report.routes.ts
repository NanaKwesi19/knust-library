import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(protect);
router.use(restrictTo(Role.ADMIN, Role.LIBRARIAN));

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await prisma.exportLog.findMany({
      where: { exportType: 'MAINTENANCE_RESOLUTION_REPORT' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    res.status(200).json({ success: true, data: reports, count: reports.length });
  } catch (error) {
    console.error('Maintenance resolution reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to load maintenance resolution reports.' });
  }
});

export default router;
