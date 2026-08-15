import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Public endpoint used by the frontend before authentication. It exposes only
// maintenance-display information and no administrative settings.
router.get('/public-maintenance', async (_req: Request, res: Response): Promise<void> => {
  try {
    const entries = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['maintenance_mode', 'maintenance_title', 'maintenance_message', 'maintenance_expected_return', 'maintenance_contact']
        }
      }
    });

    const config = Object.fromEntries(entries.map(entry => [entry.key, entry.value]));

    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: config.maintenance_mode === 'true',
        title: config.maintenance_title || 'KNUST Library is Temporarily Unavailable',
        message: config.maintenance_message || 'We are performing scheduled maintenance to improve your library experience.',
        expectedReturn: config.maintenance_expected_return || '',
        contact: config.maintenance_contact || 'Please check back shortly.'
      }
    });
  } catch (error) {
    console.error('Public maintenance status error:', error);
    // Fail open on configuration failure so a settings outage cannot lock out users.
    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: false,
        title: 'KNUST Library is Temporarily Unavailable',
        message: 'We are performing scheduled maintenance to improve your library experience.',
        expectedReturn: '',
        contact: 'Please check back shortly.'
      }
    });
  }
});

router.use(protect);
router.use(restrictTo(Role.ADMIN));

router.get('/settings', async (_req: Request, res: Response): Promise<void> => {
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

    if (req.body.maintenanceMode !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'maintenance_mode' },
        update: { value: String(Boolean(req.body.maintenanceMode)) },
        create: { key: 'maintenance_mode', value: String(Boolean(req.body.maintenanceMode)), description: 'Global public-access maintenance mode' }
      });
    }

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

router.get('/maintenance-notice', async (_req: Request, res: Response): Promise<void> => {
  try {
    const keys = ['maintenance_mode', 'maintenance_title', 'maintenance_message', 'maintenance_expected_return', 'maintenance_contact'];
    const entries = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
    const values = Object.fromEntries(entries.map(entry => [entry.key, entry.value]));

    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: values.maintenance_mode === 'true',
        title: values.maintenance_title || 'KNUST Library is Temporarily Unavailable',
        message: values.maintenance_message || 'We are performing scheduled maintenance to improve your library experience.',
        expectedReturn: values.maintenance_expected_return || '',
        contact: values.maintenance_contact || 'Please check back shortly.'
      }
    });
  } catch (error) {
    console.error('Maintenance notice fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve maintenance notice.' });
  }
});

router.patch('/maintenance-notice', async (req: Request, res: Response): Promise<void> => {
  try {
    const { maintenanceMode, title, message, expectedReturn, contact } = req.body;
    const values: Record<string, string> = {
      maintenance_mode: String(Boolean(maintenanceMode)),
      maintenance_title: String(title || '').trim(),
      maintenance_message: String(message || '').trim(),
      maintenance_expected_return: String(expectedReturn || '').trim(),
      maintenance_contact: String(contact || '').trim()
    };

    if (!values.maintenance_title || !values.maintenance_message) {
      res.status(400).json({ success: false, error: 'Maintenance title and message are required.' });
      return;
    }

    await prisma.$transaction(async tx => {
      for (const [key, value] of Object.entries(values)) {
        await tx.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value, description: `Maintenance mode setting: ${key}` }
        });
      }

      const settings = await tx.librarySetting.findFirst();
      if (settings) {
        await tx.librarySetting.update({
          where: { id: settings.id },
          data: { maintenanceMode: Boolean(maintenanceMode) }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_MAINTENANCE_MODE',
          description: `Maintenance mode ${Boolean(maintenanceMode) ? 'enabled' : 'disabled'} and public notice updated`,
          userId: req.user!.id
        }
      });
    });

    res.status(200).json({ success: true, message: 'Maintenance configuration saved.' });
  } catch (error) {
    console.error('Maintenance notice update error:', error);
    res.status(500).json({ success: false, error: 'Failed to save maintenance configuration.' });
  }
});

router.get('/backup', async (_req: Request, res: Response): Promise<void> => {
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

router.post('/backup/trigger', async (_req: Request, res: Response): Promise<void> => {
  try {
    await (prisma as any).backupConfig.updateMany({
      data: { lastBackup: new Date() }
    });

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

router.get('/email-templates', async (_req: Request, res: Response): Promise<void> => {
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

router.get('/all', async (_req: Request, res: Response): Promise<void> => {
  try {
    const configurations = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
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

    await prisma.$transaction(async tx => {
      const keys = Object.keys(settings);
      for (const key of keys) {
        const value = String(settings[key]);
        await tx.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
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
