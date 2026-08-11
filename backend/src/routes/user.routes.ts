import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
const router = Router();


// Enforce global authorization protection for all administrative user directory actions
router.use(protect);
router.use(restrictTo(Role.LIBRARIAN, Role.ADMIN));

/**
 * GET: /api/v1/users/registry
 * Streaming comprehensive database accounts lists for administration audit
 */
router.get('/registry', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        studentId: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('User registry fetching database exception:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve the institutional user registry records.',
    });
  }
});

/**
 * PATCH: /api/v1/users/:id/account-status
 * Modifies account activation state via boolean status
 */
router.patch('/:id/account-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = parseInt(idParam ?? '', 10);
    const { isActive } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ success: false, error: 'Invalid user identifier parameter.' });
      return;
    }

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Invalid account status provided. Must be a boolean value.',
      });
      return;
    }

    // Execute database status shift adjustment safely
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: isActive ? 'ACTIVE' : 'SUSPENDED' },
    });

    // Automatically create an entry trace row in the structural AuditLog table
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_ACCOUNT_STATUS',
        description: `Modified account active state for user ID ${userId} to ${isActive}.`,
        userId: (req as any).user?.id || null, // Captures requesting staff member ID from middleware
      },
    });

    res.status(200).json({
      success: true,
      message: 'Account privileges updated successfully.',
      data: {
        id: updatedUser.id,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error('Account status adjustment failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete account status modification parameters.',
    });
  }
});

export default router;