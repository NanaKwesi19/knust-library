import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.get('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await (prisma as any).librarySetting.findFirst();

    if (!settings) {
      settings = await (prisma as any).librarySetting.create({
        data: {
          libraryName: 'KNUST Library',
          institution: 'Kwame Nkrumah University of Science and Technology',
          address: 'Kumasi, Ghana',
          phone: '+233 32 206 0000',
          email: 'library@knust.edu.gh',
          website: 'https://library.knust.edu.gh',
          openingHours: {
            Monday: { open: '08:00', close: '17:00', closed: false },
            Tuesday: { open: '08:00', close: '17:00', closed: false },
            Wednesday: { open: '08:00', close: '17:00', closed: false },
            Thursday: { open: '08:00', close: '17:00', closed: false },
            Friday: { open: '08:00', close: '17:00', closed: false },
            Saturday: { open: '09:00', close: '14:00', closed: false },
            Sunday: { open: '00:00', close: '00:00', closed: true }
          }
        }
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
});

router.patch('/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await (prisma as any).librarySetting.findFirst();

    if (!settings) {
      res.status(404).json({ success: false, error: 'Settings not found.' });
      return;
    }

    const updated = await (prisma as any).librarySetting.update({
      where: { id: settings.id },
      data: req.body
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_LIBRARY_SETTINGS',
        description: 'Library settings updated',
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'Settings saved.', data: updated });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings.' });
  }
});

router.get('/backup', async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await (prisma as any).backupConfig.findFirst();

    if (!config) {
      config = await (prisma as any).backupConfig.create({
        data: {
          frequency: 'DAILY',
          time: '02:00',
          retentionDays: 30,
          autoBackup: true,
          includeFiles: true
        }
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('Backup config fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve backup config.' });
  }
});

router.patch('/backup', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await (prisma as any).backupConfig.findFirst();

    if (!config) {
      res.status(404).json({ success: false, error: 'Backup config not found.' });
      return;
    }

    const updated = await (prisma as any).backupConfig.update({
      where: { id: config.id },
      data: req.body
    });

    res.status(200).json({ success: true, message: 'Backup config saved.', data: updated });
  } catch (error) {
    console.error('Backup config update error:', error);
    res.status(500).json({ success: false, error: 'Failed to save backup config.' });
  }
});

import { performDatabaseBackup } from '../utils/backup.js';

router.post('/backup/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    await (prisma as any).backupConfig.updateMany({
      data: { lastBackup: new Date() }
    });

    // Run the physical backup in the background
    performDatabaseBackup().catch(err => {
      console.error('Background backup failed:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Manual backup initiated.',
      data: { startedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Backup trigger error:', error);
    res.status(500).json({ success: false, error: 'Failed to start backup.' });
  }
});

router.get('/email-templates', async (req: Request, res: Response): Promise<void> => {
  try {
    let templates = await (prisma as any).emailTemplate.findMany();

    if (templates.length === 0) {
      const defaults = [
        {
          name: 'Welcome Email',
          subject: 'Welcome to KNUST Library',
          body: 'Dear {{fullName}}, welcome to the KNUST Digital Library. Your student ID is {{studentId}}.',
          variables: ['fullName', 'studentId'],
          enabled: true
        },
        {
          name: 'Due Date Reminder',
          subject: 'Book Due Soon — {{bookTitle}}',
          body: 'Dear {{fullName}}, your borrowed book "{{bookTitle}}" is due on {{dueDate}}. Please return or renew to avoid fines.',
          variables: ['fullName', 'bookTitle', 'dueDate'],
          enabled: true
        },
        {
          name: 'Overdue Notice',
          subject: 'OVERDUE: {{bookTitle}}',
          body: 'Dear {{fullName}}, your book "{{bookTitle}}" is now overdue. A fine of GH₵{{fineAmount}} has been accrued.',
          variables: ['fullName', 'bookTitle', 'fineAmount'],
          enabled: true
        }
      ];

      for (const tmpl of defaults) {
        await (prisma as any).emailTemplate.create({ data: tmpl });
      }

      templates = await (prisma as any).emailTemplate.findMany();
    }

    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('Email templates fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve email templates.' });
  }
});

router.patch('/email-templates/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const idString = Array.isArray(rawId) ? rawId[0] : rawId;
    const id = parseInt(idString, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid template id.' });
      return;
    }

    const { subject, body, enabled } = req.body;

    const updated = await (prisma as any).emailTemplate.update({
      where: { id },
      data: {
        ...(subject && { subject }),
        ...(body && { body }),
        ...(enabled !== undefined && { enabled })
      }
    });

    res.status(200).json({ success: true, message: 'Template saved.', data: updated });
  } catch (error) {
    console.error('Email template update error:', error);
    res.status(500).json({ success: false, error: 'Failed to save template.' });
  }
});

router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const configurations = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    res.status(200).json({ success: true, data: configurations });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve configurations.' });
  }
});

router.post('/update-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid configuration payload.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const keys = Object.keys(settings);

      for (const key of keys) {
        const value = String(settings[key]);

        await tx.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_SYSTEM_CONFIG',
          description: `Batch update: ${keys.join(', ')}`,
          userId: req.user!.id
        }
      });
    });

    res.status(200).json({ success: true, message: 'Configurations updated.' });
  } catch (error) {
    console.error('Batch update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update configurations.' });
  }
});

export default router;