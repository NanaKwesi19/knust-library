import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

/**
 * Resolved maintenance complaints remain visible for 24 hours. After that
 * window, a permanent resolution snapshot is written to ExportLog and the
 * live complaint is removed from the operational queue.
 */
export function initMaintenanceRetentionJob() {
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const complaints = await prisma.maintenanceComplaint.findMany({
        where: {
          status: 'RESOLVED',
          resolvedAt: { not: null, lt: cutoff }
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, studentId: true } },
          resolvedBy: { select: { id: true, fullName: true, email: true } }
        }
      });

      for (const complaint of complaints) {
        await prisma.$transaction(async tx => {
          const reportOwnerId = complaint.resolvedById ?? complaint.userId;

          await tx.exportLog.create({
            data: {
              exportType: 'MAINTENANCE_RESOLUTION_REPORT',
              filtersApplied: {
                complaintId: complaint.id,
                title: complaint.title,
                description: complaint.description,
                roomNumber: complaint.roomNumber,
                submittedBy: complaint.user,
                resolvedBy: complaint.resolvedBy,
                resolvedAt: complaint.resolvedAt,
                generatedAt: new Date().toISOString(),
                retentionPolicy: '24 hours after resolution'
              },
              recordCount: 1,
              status: 'SUCCESS',
              userId: reportOwnerId
            }
          });

          await tx.maintenanceComplaint.delete({ where: { id: complaint.id } });
        });
      }

      if (complaints.length > 0) {
        console.log(`[Cron] Archived ${complaints.length} resolved maintenance report(s) after 24 hours.`);
      }
    } catch (error) {
      console.error('[Cron] Maintenance retention job failed:', error);
    }
  });

  console.log('[Cron] Maintenance resolution retention job initialized (24-hour retention).');
}
