import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AccountStatus, Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.get('/pending', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { status: AccountStatus.PENDING_CLEARANCE, role: { in: [Role.STAFF, Role.LIBRARIAN] } },
      select: { id: true, fullName: true, email: true, role: true, department: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load pending staff applications.' });
  }
});

router.patch('/:id/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { approved, role } = req.body;
    if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: 'Invalid staff account.' }); return; }
    const staff = await prisma.user.findUnique({ where: { id } });
    if (!staff || !(['STAFF', 'LIBRARIAN'] as const).includes(staff.role as 'STAFF' | 'LIBRARIAN')) {
      res.status(404).json({ success: false, error: 'Pending staff account not found.' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id },
      data: approved === false
        ? { status: AccountStatus.SUSPENDED }
        : { status: AccountStatus.ACTIVE, role: role === 'LIBRARIAN' ? Role.LIBRARIAN : Role.STAFF }
    });
    await prisma.auditLog.create({
      data: { action: approved === false ? 'REJECT_STAFF' : 'VERIFY_STAFF', description: `${approved === false ? 'Rejected' : 'Verified'} staff account ${staff.fullName} (${staff.email})`, userId: req.user!.id }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to verify staff account.' });
  }
});

export default router;
