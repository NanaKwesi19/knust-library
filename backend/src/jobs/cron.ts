import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { performDatabaseBackup } from '../utils/backup.js';
import { LoanStatus, FineStatus } from '@prisma/client';

export function initCronJobs() {
  console.log('[Cron] Initializing background automation jobs...');

  // 1. Daily Automated Backups (1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('[Cron] Running daily automated backup...');
      await performDatabaseBackup();
      await (prisma as any).backupConfig.updateMany({
        data: { lastBackup: new Date() }
      });
      console.log('[Cron] Daily backup completed successfully.');
    } catch (error) {
      console.error('[Cron] Daily backup failed:', error);
    }
  });

  // 2. Automatic Fine Accrual (12:05 AM)
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('[Cron] Running automatic fine accrual...');
      const now = new Date();
      const settings = await prisma.librarySetting.findFirst() || { fineRatePerDay: 2.0, maxFineAmount: 50.0 };

      const overdueLoans = await prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: now }
        },
        include: { copy: { include: { book: true } } }
      });

      for (const loan of overdueLoans) {
        const daysOverdue = Math.ceil((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const calculatedFine = Math.min(daysOverdue * settings.fineRatePerDay, settings.maxFineAmount);

        // Check if fine already exists for this loan to update or create
        const existingFine = await prisma.fine.findFirst({ where: { loanId: loan.id, status: FineStatus.UNPAID } });

        if (existingFine) {
          if (existingFine.amount < calculatedFine) {
            await prisma.fine.update({
              where: { id: existingFine.id },
              data: { amount: parseFloat(calculatedFine.toFixed(2)), description: `Overdue by ${daysOverdue} days for "${loan.copy.book.title}"` }
            });
          }
        } else {
          await prisma.fine.create({
            data: {
              loanId: loan.id,
              amount: parseFloat(calculatedFine.toFixed(2)),
              status: FineStatus.UNPAID,
              reason: 'OVERDUE',
              description: `Overdue by ${daysOverdue} days for "${loan.copy.book.title}"`
            }
          });
        }
      }
      console.log(`[Cron] Processed fines for ${overdueLoans.length} overdue loans.`);
    } catch (error) {
      console.error('[Cron] Fine accrual failed:', error);
    }
  });

  // 3. Automated Overdue Notifications (8:00 AM)
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[Cron] Running overdue notifications...');
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const upcomingLoans = await prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { gte: now, lt: tomorrow }
        },
        include: { user: true, copy: { include: { book: true } } }
      });

      for (const loan of upcomingLoans) {
        await prisma.notification.create({
          data: {
            userId: loan.userId,
            title: 'Book Due Tomorrow',
            message: `Friendly reminder: "${loan.copy.book.title}" is due tomorrow.`,
            type: 'DUE_REMINDER',
            priority: 'NORMAL'
          }
        });
      }

      const overdueLoans = await prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: now }
        },
        include: { user: true, copy: { include: { book: true } } }
      });

      for (const loan of overdueLoans) {
        await prisma.notification.create({
          data: {
            userId: loan.userId,
            title: 'Book Overdue',
            message: `URGENT: "${loan.copy.book.title}" is overdue. Fines are accruing daily.`,
            type: 'OVERDUE_ALERT',
            priority: 'HIGH'
          }
        });
      }
      console.log(`[Cron] Sent ${upcomingLoans.length} upcoming and ${overdueLoans.length} overdue notifications.`);
    } catch (error) {
      console.error('[Cron] Overdue notifications failed:', error);
    }
  });

  // 4. Silent Auto-Renewals (12:10 AM)
  cron.schedule('10 0 * * *', async () => {
    try {
      console.log('[Cron] Running silent auto-renewals...');
      const now = new Date();
      const settings = await prisma.librarySetting.findFirst() || { loanDurationDays: 14, renewalLimit: 2 };
      
      const dueToday = await prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: new Date(now.getTime() + 24 * 60 * 60 * 1000), gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        },
        include: { copy: { include: { book: true } } }
      });

      let renewedCount = 0;
      for (const loan of dueToday) {
        if (loan.renewalCount >= settings.renewalLimit) continue;
        
        const hasReservation = await prisma.reservation.findFirst({
          where: { targetId: loan.copy.bookId.toString(), type: 'BOOK_HOLD', status: 'PENDING' }
        });

        if (!hasReservation) {
          const newDueDate = new Date(Date.now() + settings.loanDurationDays * 24 * 60 * 60 * 1000);
          await prisma.loan.update({
            where: { id: loan.id },
            data: { dueDate: newDueDate, status: LoanStatus.RENEWED, renewalCount: { increment: 1 } }
          });
          
          await prisma.notification.create({
            data: {
              userId: loan.userId,
              title: 'Book Auto-Renewed',
              message: `"${loan.copy.book.title}" was automatically renewed until ${newDueDate.toLocaleDateString()} because no one is waiting for it.`,
              type: 'SYSTEM',
              priority: 'NORMAL'
            }
          });
          renewedCount++;
        }
      }
      console.log(`[Cron] Auto-renewed ${renewedCount} loans.`);
    } catch (error) {
      console.error('[Cron] Auto-renewal failed:', error);
    }
  });

  // 5. Reservation Expiry Cleanup (Every Hour)
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cron] Running reservation cleanup...');
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: 'PENDING',
          updatedAt: { lt: fortyEightHoursAgo } // Proxy for when they were notified
        }
      });

      for (const res of expiredReservations) {
        await prisma.reservation.update({
          where: { id: res.id },
          data: { status: 'CANCELLED' }
        });
        
        await prisma.notification.create({
          data: {
            userId: res.userId,
            title: 'Reservation Expired',
            message: `Your reservation has been cancelled because you did not pick it up within 48 hours.`,
            type: 'BOOKING_CANCELLED',
            priority: 'NORMAL'
          }
        });
      }
      console.log(`[Cron] Cancelled ${expiredReservations.length} expired reservations.`);
    } catch (error) {
      console.error('[Cron] Reservation cleanup failed:', error);
    }
  });

  // 6. Study Room Booking Cleanup (Every Hour)
  cron.schedule('30 * * * *', async () => {
    try {
      console.log('[Cron] Running study room booking cleanup...');
      const now = new Date();
      
      const expiredBookings = await prisma.roomBooking.findMany({
        where: {
          status: 'CONFIRMED',
          endTime: { lt: now }
        }
      });

      for (const booking of expiredBookings) {
        await prisma.roomBooking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED' }
        });
      }
      console.log(`[Cron] Marked ${expiredBookings.length} room bookings as completed.`);
    } catch (error) {
      console.error('[Cron] Study room cleanup failed:', error);
    }
  });

  console.log('[Cron] Background automation jobs successfully scheduled.');
}
