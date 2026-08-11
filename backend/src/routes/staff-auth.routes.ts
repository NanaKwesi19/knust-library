import { Router, Request, Response } from 'express';
import { AccountStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = Router();

// Public staff application. No applicant can self-assign ADMIN privileges.
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, role = 'STAFF', department, phone } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ success: false, error: 'Full name, email and password are required.' });
      return;
    }
    const requestedRole = role === 'LIBRARIAN' ? Role.LIBRARIAN : Role.STAFF;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Email already registered.' });
      return;
    }
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: await bcrypt.hash(password, 12),
        role: requestedRole,
        status: AccountStatus.PENDING_CLEARANCE,
        department: department || null,
        phone: phone || null,
      },
      select: { id: true, fullName: true, email: true, role: true, status: true }
    });
    res.status(201).json({ success: true, message: 'Staff application submitted. An administrator must verify the account before login.', data: user });
  } catch (error: any) {
    console.error('Staff registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit staff application.' });
  }
});

router.use(protect, restrictTo(Role.ADMIN));

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
    if (!staff || ![Role.STAFF, Role.LIBRARIAN].includes(staff.role)) {
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
    res.json({ success: true, message: approved === false ? 'Staff application rejected.' : 'Staff account verified and activated.', data: { id: updated.id, status: updated.status, role: updated.role } });
  } catch (error) {
    console.error('Staff verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify staff account.' });
  }
});

export default router;
