import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { Role, AccountStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// Use JWT_SECRET from .env, or fail fast
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env file');
  process.exit(1);
}

const generateToken = (user: { id: number; userUuid: string; role: Role; email: string }): string => {
  return jwt.sign(
    { 
      id: user.id,
      userUuid: user.userUuid,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * POST: /api/v1/auth/register
 */
/**
 * POST: /api/v1/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, studentId, role = Role.STUDENT, programme, department, yearOfStudy } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({ success: false, error: 'Full name, email, and password are required.' });
      return;
    }

    // Check email exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ success: false, error: 'Email already registered.' });
      return;
    }

    // Normalize studentId: empty/whitespace string becomes null
    const normalizedStudentId = studentId && studentId.trim() ? studentId.trim() : null;

    // Check studentId uniqueness only if provided
    if (normalizedStudentId) {
      const existingStudentId = await prisma.user.findUnique({ 
        where: { studentId: normalizedStudentId } 
      });
      if (existingStudentId) {
        res.status(400).json({ success: false, error: 'Student ID already registered.' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        studentId: normalizedStudentId,
        role: role as Role,
        programme: programme || null,
        department: department || null,
        yearOfStudy: yearOfStudy ? parseInt(yearOfStudy) : null,
        status: AccountStatus.PENDING_CLEARANCE
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Awaiting admin approval.',
      data: { id: user.id, fullName: user.fullName, email: user.email, status: user.status }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Prisma unique constraint errors gracefully
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      const field = Array.isArray(target) ? target[0] : 'field';
      res.status(400).json({ success: false, error: `${field} is already taken.` });
      return;
    }
    
    res.status(500).json({ success: false, error: 'Failed to register.' });
  }
});
/**
 * POST: /api/v1/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    if (user.status === AccountStatus.PENDING_CLEARANCE) {
      res.status(403).json({ success: false, error: 'Account pending approval. Please wait for admin verification.' });
      return;
    }

    if (user.status === AccountStatus.SUSPENDED) {
      res.status(403).json({ success: false, error: 'Account suspended. Contact library administration.' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = generateToken({
      id: user.id,
      userUuid: user.userUuid,
      role: user.role,
      email: user.email
    });
    console.log('[AUTH DEBUG] Generated token for', user.email, ':', token.substring(0, 30) + '...');
    console.log('[AUTH DEBUG] Token payload:', JSON.stringify(jwt.decode(token)));

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          userUuid: user.userUuid,
          fullName: user.fullName,
          email: user.email,
          studentId: user.studentId,
          role: user.role,
          programme: user.programme,
          department: user.department,
          yearOfStudy: user.yearOfStudy
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to login.' });
  }
});

// ==========================================
// PROTECTED ADMIN ROUTES
// ==========================================

router.use(protect);
router.use(restrictTo(Role.ADMIN, Role.LIBRARIAN));

/**
 * POST: /api/v1/auth/users/create
 * Admin/Librarian create user directly (auto-approved)
 */
router.post('/users/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, studentId, role = Role.STUDENT, programme, department, yearOfStudy } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({ success: false, error: 'Full name, email, and password are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Email already registered.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        studentId: studentId || null,
        role: role as Role,
        programme: programme || null,
        department: department || null,
        yearOfStudy: yearOfStudy ? parseInt(yearOfStudy) : null,
        status: AccountStatus.ACTIVE
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        description: `Created ${role.toLowerCase()} ${user.fullName} (${user.email})`,
        userId: req.user!.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { id: user.id, fullName: user.fullName, email: user.email, status: user.status, role: user.role }
    });
  } catch (error) {
    console.error('Admin user creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user.' });
  }
});

/**
 * GET: /api/v1/auth/pending-students
 */
router.get('/pending-students', async (req: Request, res: Response): Promise<void> => {
  try {
    const pending = await prisma.user.findMany({
      where: { status: AccountStatus.PENDING_CLEARANCE, role: Role.STUDENT },
      select: {
        id: true,
        fullName: true,
        email: true,
        studentId: true,
        programme: true,
        department: true,
        yearOfStudy: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: pending.length, data: pending });
  } catch (error) {
    console.error('Pending students error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve pending students.' });
  }
});

/**
 * PATCH: /api/v1/auth/approve/:userId
 */
router.patch('/approve/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: AccountStatus.ACTIVE }
    });

    await prisma.auditLog.create({
      data: {
        action: 'APPROVE_STUDENT',
        description: `Approved student ${user.fullName} (${user.studentId || user.email})`,
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'Student approved.', data: updated });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve student.' });
  }
});

/**
 * GET: /api/v1/auth/users
 * List all users with filters
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { studentId: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (role && role !== 'ALL') where.role = role as Role;
    if (status && status !== 'ALL') where.status = status as string;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          studentId: true,
          role: true,
          status: true,
          programme: true,
          department: true,
          yearOfStudy: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              loans: { where: { status: { in: ['BORROWED', 'RENEWED'] } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: users,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
  }
});

/**
 * PATCH: /api/v1/auth/users/:id/status
 * Toggle user status (ACTIVE / SUSPENDED)
 */
router.patch('/users/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING_CLEARANCE'].includes(status)) {
      res.status(400).json({ success: false, error: 'Valid status required: ACTIVE, SUSPENDED, or PENDING_CLEARANCE.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: status as AccountStatus }
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER_STATUS',
        description: `Changed ${user.fullName}'s status to ${status}`,
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'Status updated.', data: updated });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status.' });
  }
});

/**
 * DELETE: /api/v1/auth/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: { where: { status: { in: ['BORROWED', 'RENEWED'] } } }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (user._count.loans > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete: user has ${user._count.loans} active loan(s).`
      });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        description: `Deleted user ${user.fullName} (${user.email})`,
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
});

/**
 * POST: /api/v1/auth/users/bulk-action
 * Bulk status update or delete
 */
router.post('/users/bulk-action', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, action, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !action) {
      res.status(400).json({ success: false, error: 'IDs array and action required.' });
      return;
    }

    if (action === 'delete') {
      const activeLoans = await prisma.loan.count({
        where: {
          userId: { in: ids },
          status: { in: ['BORROWED', 'RENEWED'] }
        }
      });

      if (activeLoans > 0) {
        res.status(400).json({
          success: false,
          error: `Cannot delete: ${activeLoans} active loan(s) exist for selected users.`
        });
        return;
      }

      await prisma.user.deleteMany({ where: { id: { in: ids } } });

      await prisma.auditLog.create({
        data: {
          action: 'BULK_DELETE_USERS',
          description: `Bulk deleted ${ids.length} users`,
          userId: req.user!.id
        }
      });

      res.status(200).json({ success: true, message: `${ids.length} users deleted.` });
    } else if (action === 'status' && status) {
      await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { status: status as AccountStatus }
      });

      await prisma.auditLog.create({
        data: {
          action: 'BULK_UPDATE_STATUS',
          description: `Bulk updated ${ids.length} users to ${status}`,
          userId: req.user!.id
        }
      });

      res.status(200).json({ success: true, message: `${ids.length} users updated.` });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action. Use "delete" or "status".' });
    }
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ success: false, error: 'Failed to process bulk action.' });
  }
});

export default router;