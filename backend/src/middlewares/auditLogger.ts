import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js'; // Ensure this points to the shared instance

export const auditLogInterceptor = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json;

  res.json = function (body: any) {
    res.json = originalJson;

    if (res.statusCode === 401 || res.statusCode === 403) {
      const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
      
      // Map to exact database fields
      prisma.auditLog.create({
        data: {
          userId: (req as any).user?.id || null, // Ensure user ID is accessible
          action: res.statusCode === 401 ? 'AUTHENTICATION_FAILURE' : 'UNAUTHORIZED_ACCESS_ATTEMPT',
          // 'description' is mandatory in your schema
          description: `Path: ${req.originalUrl} | Method: ${req.method} | Message: ${body?.error || 'None'}`,
          ipAddress: ip,
        },
      }).catch((err) => console.error('Forensic Log Sync Dropped:', err));
    }

    return res.json(body);
  };

  next();
};