import { Request, Response, NextFunction } from 'express';
import {prisma} from '../lib/prisma.js';
interface RateLimitWindow {
  timestamps: number[];
}

const ipRequestMap = new Map<string, RateLimitWindow>();

export const rateLimiter = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const now = Date.now();

    if (!ipRequestMap.has(ip)) {
      ipRequestMap.set(ip, { timestamps: [] });
    }

    const clientWindow = ipRequestMap.get(ip)!;
    
    // Filter out timestamps that have aged past the window timeline threshold
    clientWindow.timestamps = clientWindow.timestamps.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (clientWindow.timestamps.length >= maxRequests) {
      // Log the rate limit breach to the security audit logs database table
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id || null,
          action: 'SECURITY_RATE_LIMIT_BREACH',
          entityType: 'IP_ADDRESS',
          description: 'Rate limit exceeded',
          ipAddress: ip,
          details: {
            path: req.originalUrl,
            method: req.method,
            totalBlockedAttempts: clientWindow.timestamps.length + 1,
          },
        },
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests generated from this IP. Security perimeter lock active. Please try again later.',
      });
      return;
    }

    // Record the current valid request timestamp
    clientWindow.timestamps.push(now);
    next();
  };
};