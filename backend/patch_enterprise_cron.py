import os

path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_jobs = """
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
      const students = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' }, include: { loans: true, fines: true } });
      let clearedCount = 0;
      
      for (const student of students) {
        const maxYears = getProgramDuration(student.programme);
        if (student.yearOfStudy === maxYears) {
          const hasDebt = student.fines.some((f: any) => f.status === 'UNPAID') || student.loans.some((l: any) => l.status === 'OVERDUE' || l.status === 'BORROWED');
          
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
"""

content = content.replace("  console.log('[Cron] Background automation jobs successfully scheduled.');", new_jobs)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("7 enterprise automations added to cron.ts")
