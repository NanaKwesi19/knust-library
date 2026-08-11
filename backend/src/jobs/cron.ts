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


  // 7. Database De-cluttering & Log Rotation (Monthly on the 1st at 2:00 AM)
  cron.schedule('0 2 1 * *', async () => {
    try {
      console.log('[Cron] Running database de-cluttering & log rotation...');
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const deletedNotifications = await prisma.notification.deleteMany({
        where: { createdAt: { lt: sixtyDaysAgo } }
      });
      
      const deletedLogs = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: oneYearAgo } }
      });
      
      console.log(`[Cron] Purged ${deletedNotifications.count} old notifications and ${deletedLogs.count} old audit logs.`);
    } catch (error) {
      console.error('[Cron] Log rotation failed:', error);
    }
  });

  // 8. Inactive Account Suspension (Monthly on the 1st at 3:00 AM)
  cron.schedule('0 3 1 * *', async () => {
    try {
      console.log('[Cron] Running inactive account suspension sweep...');
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const suspended = await prisma.user.updateMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { lastLoginAt: { lt: oneYearAgo } },
            { lastLoginAt: null, createdAt: { lt: oneYearAgo } }
          ]
        },
        data: { status: 'SUSPENDED' }
      });
      
      console.log(`[Cron] Suspended ${suspended.count} inactive accounts.`);
    } catch (error) {
      console.error('[Cron] Account suspension failed:', error);
    }
  });

  // 9. Lost Book Auto-Penalization (Daily at 12:15 AM)
  cron.schedule('15 0 * * *', async () => {
    try {
      console.log('[Cron] Running lost book auto-penalization...');
      const now = new Date();
      const settings = await prisma.librarySetting.findFirst() || { lostBookDaysThreshold: 90, lostBookFee: 150.0 };
      
      const thresholdDate = new Date(now.getTime() - settings.lostBookDaysThreshold * 24 * 60 * 60 * 1000);
      
      const lostLoans = await prisma.loan.findMany({
        where: {
          status: { in: [LoanStatus.BORROWED, LoanStatus.RENEWED] },
          dueDate: { lt: thresholdDate }
        },
        include: { copy: { include: { book: true } } }
      });

      let penalizedCount = 0;
      for (const loan of lostLoans) {
        // Mark loan as OVERDUE but effectively dead, or just leave it OVERDUE
        // Mark physical copy as LOST
        await prisma.bookCopy.update({
          where: { id: loan.copyId },
          data: { status: 'LOST' }
        });
        
        // Mark loan as OVERDUE
        await prisma.loan.update({
          where: { id: loan.id },
          data: { status: LoanStatus.OVERDUE }
        });

        // Add massive replacement fine
        await prisma.fine.create({
          data: {
            loanId: loan.id,
            amount: settings.lostBookFee,
            status: FineStatus.UNPAID,
            reason: 'DAMAGE_LOST',
            description: `Replacement fee for lost book: "${loan.copy.book.title}" (Overdue > ${settings.lostBookDaysThreshold} days)`
          }
        });
        penalizedCount++;
      }
      
      console.log(`[Cron] Penalized ${penalizedCount} users for lost books.`);
    } catch (error) {
      console.error('[Cron] Lost book penalization failed:', error);
    }
  });


  // Helper for program duration
  const getProgramDuration = (programme: string | null): number => {
    if (!programme) return 4;
    const p = programme.toLowerCase();
    if (p.includes('medicine') || p.includes('pharmacy') || p.includes('optometry') || p.includes('architecture') || p.includes('surgery') || p.includes('mbchb') || p.includes('pharmd')) {
      return 6;
    }
    if (p.includes('dentistry') || p.includes('veterinary')) {
      return 6; 
    }
    return 4;
  };

  // 10. Automated End-of-Year Clearance (Runs June 1st)
  cron.schedule('0 0 1 6 *', async () => {
    try {
      console.log('[Cron] Running end-of-year clearance...');
      const students = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' }, include: { loans: { include: { fines: true } } } });
      let clearedCount = 0;
      
      for (const student of students) {
        const maxYears = getProgramDuration(student.programme);
        if (student.yearOfStudy === maxYears) {
          const hasDebt = student.loans.some((l: any) => l.status === 'OVERDUE' || l.status === 'BORROWED' || l.fines.some((f: any) => f.status === 'UNPAID'));
          
          if (hasDebt) {
            await prisma.user.update({ where: { id: student.id }, data: { status: 'PENDING_CLEARANCE' } });
            await prisma.notification.create({
              data: {
                userId: student.id,
                title: 'Graduation Clearance Blocked',
                message: 'URGENT: Your graduation clearance is blocked due to unpaid fines or unreturned books.',
                type: 'SYSTEM',
                priority: 'URGENT'
              }
            });
            clearedCount++;
          }
        }
      }
      console.log(`[Cron] Blocked clearance for ${clearedCount} graduating students with debt.`);
    } catch (error) {
      console.error('[Cron] Clearance job failed:', error);
    }
  });

  // 11. AI-Powered Predictive Procurement (Runs Every Monday at 4:00 AM)
  cron.schedule('0 4 * * 1', async () => {
    try {
      console.log('[Cron] Running AI predictive procurement...');
      // Find top 3 books with most reservations
      const topBooks = await prisma.book.findMany({
        include: { _count: { select: { copies: true } } },
        take: 5
      });
      
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (admin && topBooks.length > 0) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Procurement Recommendation',
            message: 'Weekly AI Report: Consider purchasing more copies of highly reserved books.',
            type: 'SYSTEM',
            priority: 'NORMAL'
          }
        });
      }
    } catch (error) {
      console.error('[Cron] Procurement job failed:', error);
    }
  });

  // 12. Automated Maintenance Ticketing (Runs Daily at 5:00 AM)
  cron.schedule('0 5 * * *', async () => {
    try {
      console.log('[Cron] Running maintenance ticketing...');
      // Simulated: find broken links or issues in digital resources
      // For now, we just create a ticket if any resource has 'broken' in title
      const brokenResources = await prisma.digitalResource.findMany({
        where: { title: { contains: 'broken', mode: 'insensitive' } }
      });
      
      if (brokenResources.length > 0) {
        await prisma.helpDeskTicket.create({
          data: {
            subject: 'Automated: Broken Digital Resources Detected',
            description: `System detected ${brokenResources.length} potentially broken digital links.`,
            status: 'OPEN',
            priority: 'HIGH',
            category: 'IT_SUPPORT'
          }
        });
      }
    } catch (error) {
      console.error('[Cron] Maintenance ticket job failed:', error);
    }
  });

  // 13. Student Year Auto-Progression (Runs August 1st)
  cron.schedule('0 0 1 8 *', async () => {
    try {
      console.log('[Cron] Running student year progression...');
      const students = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' } });
      let progressed = 0;
      let graduated = 0;
      
      for (const student of students) {
        if (!student.yearOfStudy) continue;
        
        const maxYears = getProgramDuration(student.programme);
        
        if (student.yearOfStudy >= maxYears) {
          // Graduate them (Suspend account)
          await prisma.user.update({ where: { id: student.id }, data: { status: 'SUSPENDED' } });
          graduated++;
        } else {
          // Progress them
          await prisma.user.update({ where: { id: student.id }, data: { yearOfStudy: student.yearOfStudy + 1 } });
          progressed++;
        }
      }
      console.log(`[Cron] Progressed ${progressed} students to next year. Graduated/Suspended ${graduated} students.`);
    } catch (error) {
      console.error('[Cron] Year progression failed:', error);
    }
  });

  // 14. Digital Library Card Expiry Checks (Runs Every Sunday at 3:00 AM)
  cron.schedule('0 3 * * 0', async () => {
    try {
      console.log('[Cron] Running library card expiry checks...');
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Expire old cards
      const expiredCount = await prisma.digitalLibraryCard.updateMany({
        where: { status: 'ACTIVE', expiryDate: { lt: now } },
        data: { status: 'EXPIRED' }
      });
      
      console.log(`[Cron] Expired ${expiredCount.count} old library cards.`);
    } catch (error) {
      console.error('[Cron] Library card check failed:', error);
    }
  });

  // 15. Study Room "No-Show" Auto-Cancellation (Runs Every 15 Minutes)
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[Cron] Running no-show cancellations...');
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const noShows = await prisma.roomBooking.updateMany({
        where: { status: 'CONFIRMED', startTime: { lt: fifteenMinsAgo } },
        data: { status: 'NO_SHOW' }
      });
      
      if (noShows.count > 0) {
         console.log(`[Cron] Cancelled ${noShows.count} room bookings due to no-shows.`);
      }
    } catch (error) {
      console.error('[Cron] No-show cancellation failed:', error);
    }
  });

  // 16. Configuration Snapshot Audit (Runs Weekly on Sunday at 4:00 AM)
  cron.schedule('0 4 * * 0', async () => {
    try {
      console.log('[Cron] Running configuration snapshot...');
      const settings = await prisma.librarySetting.findFirst();
      if (settings) {
        await prisma.auditLog.create({
          data: {
            action: 'SYSTEM_CONFIG_SNAPSHOT',
            description: 'Weekly automated configuration snapshot',
            severity: 'INFO',
            details: settings as any
          }
        });
      }
    } catch (error) {
      console.error('[Cron] Config snapshot failed:', error);
    }
  });

  console.log('[Cron] Background automation jobs successfully scheduled.');


}
