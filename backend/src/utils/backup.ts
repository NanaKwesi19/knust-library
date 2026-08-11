import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { prisma } from '../lib/prisma.js';

const gzip = promisify(zlib.gzip);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export async function performDatabaseBackup(): Promise<string> {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true });
    }

    console.log('[Backup] Initiating full database extraction...');

    const [
      users,
      books,
      bookCopies,
      loans,
      fines,
      payments,
      reservations,
      studyRooms,
      roomBookings,
      notifications,
      auditLogs,
      maintenanceComplaints,
      systemConfigs,
      emailTemplates,
      backupConfigs
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.book.findMany(),
      prisma.bookCopy.findMany(),
      prisma.loan.findMany(),
      prisma.fine.findMany(),
      prisma.payment.findMany(),
      prisma.reservation.findMany(),
      prisma.studyRoom.findMany(),
      prisma.roomBooking.findMany(),
      prisma.notification.findMany(),
      prisma.auditLog.findMany(),
      prisma.maintenanceComplaint.findMany(),
      prisma.systemConfig.findMany(),
      (prisma as any).emailTemplate.findMany(),
      (prisma as any).backupConfig.findMany()
    ]);

    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: {
          users: users.length,
          books: books.length,
          bookCopies: bookCopies.length,
          loans: loans.length,
          fines: fines.length,
          payments: payments.length,
          reservations: reservations.length,
          studyRooms: studyRooms.length,
          roomBookings: roomBookings.length,
          notifications: notifications.length,
          auditLogs: auditLogs.length,
          maintenanceComplaints: maintenanceComplaints.length,
          systemConfigs: systemConfigs.length,
          emailTemplates: emailTemplates.length,
          backupConfigs: backupConfigs.length
        }
      },
      data: {
        users,
        books,
        bookCopies,
        loans,
        fines,
        payments,
        reservations,
        studyRooms,
        roomBookings,
        notifications,
        auditLogs,
        maintenanceComplaints,
        systemConfigs,
        emailTemplates,
        backupConfigs
      }
    };

    console.log('[Backup] Data extracted. Compressing to GZIP...');
    
    const jsonString = JSON.stringify(backupData);
    const compressedBuffer = await gzip(jsonString);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db_backup_${timestamp}.json.gz`;
    const filepath = path.join(backupDir, filename);

    await writeFile(filepath, compressedBuffer);

    console.log(`[Backup] Successfully saved to ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error('[Backup] Failed to perform database backup:', error);
    throw error;
  }
}
