import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
const router = Router();


// Enforce global authorization protection for all digital resource repository workflows
router.use(protect);

/**
 * GET: /api/v1/digital-resources/catalog
 * Streaming comprehensive electronic journal directory lists for workspace view grids
 */
router.get('/catalog', restrictTo(Role.LIBRARIAN, Role.ADMIN, Role.STUDENT), async (req: Request, res: Response): Promise<void> => {
  try {
    const repositoryCatalog = await prisma.digitalResource.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: repositoryCatalog,
    });
  } catch (error) {
    console.error('Digital resources catalog directory exception:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve online journal database repository records.',
    });
  }
});

/**
 * POST: /api/v1/digital-resources/add
 * Publishes an external electronic portal or database link reference node with audit tracing
 */
router.post('/add', restrictTo(Role.LIBRARIAN, Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, accessUrl, category, requiresAuth } = req.body;

    // Validate structural attribute parameters inputs thoroughly
    if (!title || !description || !accessUrl || !category) {
      res.status(400).json({
        success: false,
        error: 'Missing electronic reference properties. All text fields are mandatory.',
      });
      return;
    }

    const newResourceNode = await prisma.$transaction(async (tx) => {
      // 1. Commit the digital resource metadata parameters safely
      const createdResource = await tx.digitalResource.create({
        data: {
          title,
          description,
          accessUrl,
          category,
          requiresAuth: requiresAuth !== undefined ? Boolean(requiresAuth) : true,
        },
      });

      // 2. Automatically create an entry trace row in the systemic security AuditLog table
      await tx.auditLog.create({
        data: {
          action: 'ADD_DIGITAL_RESOURCE',
          description: `Published online portal link node: "${title}" classified under: ${category}.`,
          userId: (req as any).user?.id || null,
        },
      });

      return createdResource;
    });

    res.status(201).json({
      success: true,
      message: 'Electronic repository portal published and link index mapped successfully.',
      data: newResourceNode,
    });
  } catch (error) {
    console.error('Digital resource node initialization failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete online resource link allocation parameters.',
    });
  }
});

export default router;