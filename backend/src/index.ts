import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Route Handlers
import authRoutes from './routes/auth.routes.js';
import loanRoutes from './routes/loan.routes.js';
import bookRoutes from './routes/book.routes.js';
import roomRoutes from './routes/room.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import studentRoutes from './routes/student.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import resourceRoutes from './routes/resources.routes.js';
import aiRoutes from './routes/ai.routes.js';
import auditLogRoutes from './routes/audit-logs.routes.js';
import configRoutes from './routes/config.routes.js';
import fineRoutes from './routes/fine.routes.js';

// Security Middlewares
import { rateLimiter } from './middlewares/rateLimiter.js';
import { auditLogInterceptor } from './middlewares/auditLogger.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json());
app.use(morgan('dev'));
app.use(auditLogInterceptor);

// Global Rate Limiting
app.use(rateLimiter(200, 15 * 60 * 1000));

// API Routes
app.use('/api/v1/auth', rateLimiter(1000, 15 * 60 * 1000), authRoutes);
app.use('/api/v1/loans', loanRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/fines', fineRoutes);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Exception:', err.stack);
  res.status(500).json({ success: false, error: 'A server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`[SERVER START]: Library backend server live at http://localhost:${PORT}`);
});