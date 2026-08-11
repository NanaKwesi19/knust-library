import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AccountStatus, Role } from '@prisma/client';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));
