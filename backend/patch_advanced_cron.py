import os

path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_jobs = """
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

  console.log('[Cron] Background automation jobs successfully scheduled.');
"""

content = content.replace("  console.log('[Cron] Background automation jobs successfully scheduled.');", new_jobs)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("cron.ts updated with advanced jobs")
