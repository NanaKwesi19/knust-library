import { Router } from 'express';
import { getStudentDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

// GET /api/v1/dashboard/stats/:userId
router.get('/stats/:userId', getStudentDashboardStats);

export default router;