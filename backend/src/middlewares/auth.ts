import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { Role, AccountStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env file');
  process.exit(1);
}

interface DecodedToken {
  id: number;
  userUuid: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. Access token missing.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        userUuid: true,
        role: true,
        email: true,
        fullName: true,
        studentId: true,
        status: true
      }
    });

    if (!currentUser) {
      res.status(401).json({ success: false, error: 'The user belonging to this token no longer exists.' });
      return;
    }

    if (currentUser.status === AccountStatus.SUSPENDED) {
      res.status(401).json({ success: false, error: 'Your account has been suspended. Contact administration.' });
      return;
    }

    // Maintenance mode is enforced server-side. Administrators retain access so
    // they can configure the system and turn maintenance mode off.
    if (currentUser.role !== Role.ADMIN) {
      const maintenanceConfig = await prisma.systemConfig.findUnique({
        where: { key: 'maintenance_mode' },
        select: { value: true }
      });

      if (maintenanceConfig?.value === 'true') {
        const [titleConfig, messageConfig, returnConfig, contactConfig] = await Promise.all([
          prisma.systemConfig.findUnique({ where: { key: 'maintenance_title' }, select: { value: true } }),
          prisma.systemConfig.findUnique({ where: { key: 'maintenance_message' }, select: { value: true } }),
          prisma.systemConfig.findUnique({ where: { key: 'maintenance_expected_return' }, select: { value: true } }),
          prisma.systemConfig.findUnique({ where: { key: 'maintenance_contact' }, select: { value: true } })
        ]);

        res.status(503).json({
          success: false,
          maintenanceMode: true,
          error: 'The KNUST Library is temporarily unavailable.',
          maintenance: {
            title: titleConfig?.value || 'KNUST Library is Temporarily Unavailable',
            message: messageConfig?.value || 'We are performing scheduled maintenance to improve your library experience.',
            expectedReturn: returnConfig?.value || '',
            contact: contactConfig?.value || 'Please check back shortly.'
          }
        });
        return;
      }
    }

    req.user = {
      id: currentUser.id,
      userUuid: currentUser.userUuid,
      role: currentUser.role,
      email: currentUser.email,
      fullName: currentUser.fullName,
      studentId: currentUser.studentId
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token session.' });
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
};
