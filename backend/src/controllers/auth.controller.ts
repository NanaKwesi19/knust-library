import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { Role, AccountStatus } from '@prisma/client';

const generateToken = (id: number, userUuid: string, role: Role, email: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const options: jwt.SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any };
  return jwt.sign({ id, userUuid, role, email }, secret, options);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { studentId, fullName, email, password, role, programme, department, yearOfStudy } = req.body;

  if (!fullName || !email || !password || !studentId) {
    res.status(400).json({ 
      success: false, 
      error: 'Full name, email, password, and student ID are all required.' 
    });
    return;
  }

  // Validate KNUST email domain
  const allowedDomains = ['@knust.edu.gh', '@st.knust.edu.gh', '@knust.edu'];
  const hasAllowedDomain = allowedDomains.some(domain => 
    email.toLowerCase().endsWith(domain)
  );
  
  if (!hasAllowedDomain) {
    res.status(400).json({
      success: false,
      error: 'Only KNUST institutional emails are allowed. Use your @knust.edu.gh or @st.knust.edu.gh address.'
    });
    return;
  }

  // Validate student ID format (KNUST-STU-YYYY-XXX or similar)
  const studentIdPattern = /^[A-Z]+-STU-\d{4}-\d{3,}$/i;
  if (!studentIdPattern.test(studentId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid student ID format. Expected format: KNUST-STU-2026-042'
    });
    return;
  }

  try {
    // Check for existing email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    // Check for existing student ID
    const existingStudentId = await prisma.user.findUnique({ where: { studentId } });
    if (existingStudentId) {
      res.status(409).json({ success: false, error: 'This student ID is already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with PENDING_CLEARANCE status
    const newUser = await prisma.user.create({
      data: { 
        studentId, 
        fullName, 
        email, 
        password: passwordHash, 
        role: (role as Role) || 'STUDENT',
        status: AccountStatus.PENDING_CLEARANCE,
        programme: programme || null,
        department: department || null,
        yearOfStudy: yearOfStudy ? parseInt(yearOfStudy) : null
      },
      select: { 
        id: true, 
        userUuid: true, 
        fullName: true, 
        email: true, 
        role: true,
        status: true,
        studentId: true
      }
    });

    // Create notification for admin (optional — can be done via admin dashboard polling)
    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'SYSTEM',
        title: 'Account Pending Approval',
        message: `Your account (${newUser.studentId}) has been submitted for library staff approval. You will be notified once activated.`,
        priority: 'NORMAL'
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully. Your account is pending approval from library staff. You will receive an email once approved.',
      data: {
        userUuid: newUser.userUuid,
        fullName: newUser.fullName,
        email: newUser.email,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error); 
    res.status(500).json({ success: false, error: 'Registration failed. Please try again later.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Provide email and password.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    // Check account status
    if (user.status === AccountStatus.PENDING_CLEARANCE) {
      res.status(403).json({ 
        success: false, 
        error: 'Your account is pending approval from library staff. Please visit the library administration desk or wait for email confirmation.',
        code: 'PENDING_APPROVAL'
      });
      return;
    }

    if (user.status === AccountStatus.SUSPENDED) {
      res.status(403).json({ 
        success: false, 
        error: 'Your account has been suspended. Please contact library administration.',
        code: 'ACCOUNT_SUSPENDED'
      });
      return;
    }

    const token = generateToken(user.id, user.userUuid, user.role, user.email);
    res.status(200).json({ 
      success: true, 
      token, 
      data: { 
        id: user.id,
        userUuid: user.userUuid, 
        fullName: user.fullName, 
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        status: user.status
      } 
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// Admin: Approve pending student account
export const approveStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId as string) },
      select: { id: true, status: true, fullName: true, studentId: true }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Student not found.' });
      return;
    }

    if (user.status !== AccountStatus.PENDING_CLEARANCE) {
      res.status(400).json({ success: false, error: 'This account is not pending approval.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: AccountStatus.ACTIVE },
      select: { id: true, fullName: true, email: true, status: true }
    });

    // Create approval notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Account Approved',
        message: 'Your KNUST Library account has been approved. You can now log in and access all services.',
        priority: 'HIGH'
      }
    });

    res.status(200).json({
      success: true,
      message: `Student ${updatedUser.fullName} has been approved.`,
      data: updatedUser
    });
  } catch (error) {
    console.error("APPROVAL ERROR:", error);
    res.status(500).json({ success: false, error: 'Failed to approve student.' });
  }
};

// Admin: Get all pending students
export const getPendingStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const pendingStudents = await prisma.user.findMany({
      where: { status: AccountStatus.PENDING_CLEARANCE },
      select: {
        id: true,
        userUuid: true,
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

    res.status(200).json({
      success: true,
      count: pendingStudents.length,
      data: pendingStudents
    });
  } catch (error) {
    console.error("FETCH PENDING ERROR:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending students.' });
  }
};