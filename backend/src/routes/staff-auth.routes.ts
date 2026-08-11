import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AccountStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, department, phone, requestedRole } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const role = requestedRole === 'LIBRARIAN' ? Role.LIBRARIAN : Role.STAFF;

    if (!fullName?.trim() || !normalizedEmail || !password || !department?.trim()) {
      res.status(400).json({ success: false, error: 'Full name, institutional email, password, and department are required.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
      return;
    }
    if (!/@(knust\.edu\.gh|st\.knust\.edu\.gh)$/i.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'Use a KNUST institutional email address.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, 12),
        role,
        status: AccountStatus.PENDING_CLEARANCE,
        department: department.trim(),
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null
      },
      select: { id: true, fullName: true, email: true, role: true, status: true, department: true, createdAt: true }
    });

    res.status(201).json({
      success: true,
      message: 'Staff application submitted. An administrator must verify the account before login is allowed.',
      data: user
    });
  } catch (error: any) {
    console.error('Staff registration error:', error);
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to submit staff application.' });
  }
});

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
    console.error('Pending staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to load pending staff applications.' });
  }
});

router.patch('/:id/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { approved, role } = req.body;
    if (!Number.isInteger(id)) { res.status(400).json({ success: false, error: 'Invalid staff account.' }); return; }

    const staff = await prisma.user.findUnique({ where: { id } });
    if (!staff || ![Role.STAFF, Role.LIBRARIAN].includes(staff.role)) {
      res.status(404).json({ success: false, error: 'Staff account not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: approved === false
        ? { status: AccountStatus.SUSPENDED }
        : { status: AccountStatus.ACTIVE, role: role === Role.LIBRARIAN ? Role.LIBRARIAN : Role.STAFF }
    });

    await prisma.auditLog.create({
      data: {
        action: approved === false ? 'REJECT_STAFF' : 'VERIFY_STAFF',
        description: `${approved === false ? 'Rejected' : 'Verified'} staff account ${staff.fullName} (${staff.email})`,
        userId: req.user!.id
      }
    });

    res.json({ success: true, message: approved === false ? 'Staff application rejected.' : 'Staff account verified.', data: updated });
  } catch (error) {
    console.error('Staff verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify staff account.' });
  }
});

export default router;
