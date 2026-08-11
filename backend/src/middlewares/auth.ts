import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {prisma} from '../lib/prisma.js';
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
        status: true  // <-- Changed from isActive to status
      }
    });

    if (!currentUser) {
      res.status(401).json({ success: false, error: 'The user belonging to this token no longer exists.' });
      return;
    }

    // Check status instead of isActive
    if (currentUser.status === AccountStatus.SUSPENDED) {
      res.status(401).json({ success: false, error: 'Your account has been suspended. Contact administration.' });
      return;
    }

    req.user = {
      id: currentUser.id,
      userUuid: currentUser.userUuid,
      role: currentUser.role,
      email: currentUser.email
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token session.' });
  }
};

export const restrictTo = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(500).json({ success: false, error: 'Security context configuration mismatch.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: `Access Denied. Your role (${req.user.role}) is unauthorized to execute this operation.` 
      });
      return;
    }

    next();
  };
};