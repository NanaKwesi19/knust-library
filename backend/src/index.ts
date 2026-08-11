import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { initCronJobs } from './jobs/cron.js';
import authRoutes from './routes/auth.routes.js';
import staffAuthRoutes from './routes/staff-auth.routes.js';
import userRoutes from './routes/user.routes.js';
import loanRoutes from './routes/loan.routes.js';
import bookRoutes from './routes/book.routes.js';
import roomRoutes from './routes/room.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import studentRoutes from './routes/student.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import resourceRoutes from './routes/resources.routes.js';
import aiRoutes from './routes/ai.routes.js';
import auditLogRoutes from './routes/audit-logs.routes.js';
import configRoutes from './routes/config.routes.js';
import fineRoutes from './routes/fine.routes.js';
import libraryWorkflowRoutes from './routes/library-workflow.routes.js';

import { rateLimiter } from './middlewares/rateLimiter.js';
import { auditLogInterceptor } from './middlewares/auditLogger.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.use(auditLogInterceptor);
app.use(rateLimiter(200, 15 * 60 * 1000));

// Public student registration is always STUDENT. Staff applications use /staff-auth/register.
app.use('/api/v1/auth/register', (req, _res, next) => {
  req.body = { ...req.body, role: 'STUDENT' };
  next();
});

app.use('/api/v1/auth', rateLimiter(1000, 15 * 60 * 1000), authRoutes);
app.use('/api/v1/staff-auth', rateLimiter(1000, 15 * 60 * 1000), staffAuthRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/loans', loanRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/fines', fineRoutes);
app.use('/api/v1/library', libraryWorkflowRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

app.get('/', (_req, res) => {
  res.status(200).json({ name: 'KNUST Library API', status: 'online', version: '1.0.0', health: '/health' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Exception:', err.stack);
  res.status(500).json({ success: false, error: 'A server error occurred.' });
});

initCronJobs();
app.listen(PORT, () => console.log(`[SERVER START]: Library backend server live at http://localhost:${PORT}`));
