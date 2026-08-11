import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);
router.use(restrictTo(Role.STUDENT, Role.STAFF, Role.LIBRARIAN, Role.ADMIN));

/**
 * GET: /api/v1/notifications/unread?limit=5
 */
router.get('/unread', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limitQuery = req.query.limit as string | undefined;
    const limit = parseInt(typeof limitQuery === 'string' ? limitQuery : '') || 10;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        read: false
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        read: true,
        createdAt: true,
        actionUrl: true
      }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Notifications unread error:', error);
    res.status(500).json({ success: false, error: 'Failed to load unread notifications.' });
  }
});

/**
 * GET: /api/v1/notifications?unreadOnly=true&limit=50
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { unreadOnly, limit } = req.query;

    const where: any = { userId };
    if (unreadOnly === 'true') where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        priority: true,
        read: true,
        createdAt: true,
        actionUrl: true
      }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
});

/**
 * PATCH: /api/v1/notifications/:id/read
 */
router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = parseInt(idParam);
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    });

    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
});

/**
 * PATCH: /api/v1/notifications/read-all
 */
router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Bulk notification update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notifications.' });
  }
});

/**
 * DELETE: /api/v1/notifications/:id
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notificationId = parseInt(idParam);
    const userId = req.user!.id;

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });

    res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    console.error('Notification deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification.' });
  }
});

export default router;