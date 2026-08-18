import { Router, Request, Response } from 'express';
import { getStudentDashboardStats } from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);

// GET /api/v1/dashboard/stats
// Always the authenticated user's own stats - this used to take an arbitrary
// :userId from the URL with no auth check at all (IDOR), so it's rebound to
// req.user here instead of trusting a client-supplied ID.
router.get('/stats', getStudentDashboardStats);

interface WidgetInput {
  widgetType: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  isVisible?: boolean;
}

const MAX_WIDGETS_PER_LAYOUT = 50;

function scopeOf(req: Request): string {
  const scope = req.query.scope;
  return typeof scope === 'string' && scope.trim() ? scope.trim() : 'default';
}

/**
 * GET /api/v1/dashboard/widgets?scope=admin
 * This user's saved widget layout for the given dashboard (e.g. "admin" or
 * "student"). widgetType is namespaced "scope:widgetKey" in the database so
 * multiple dashboards can share the one DashboardWidget table without their
 * widget keys colliding.
 */
router.get('/widgets', async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = scopeOf(req);
    const widgets = await prisma.dashboardWidget.findMany({
      where: { userId: req.user!.id, widgetType: { startsWith: `${scope}:` } },
      orderBy: { positionX: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: widgets.map((w) => ({
        widgetType: w.widgetType.slice(scope.length + 1),
        positionX: w.positionX,
        positionY: w.positionY,
        width: w.width,
        height: w.height,
        isVisible: w.isVisible
      }))
    });
  } catch (error) {
    console.error('Dashboard widgets fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard layout.' });
  }
});

/**
 * PUT /api/v1/dashboard/widgets?scope=admin
 * Body: { widgets: WidgetInput[] }
 * Replaces this user's entire saved layout for the scope in one call - the
 * frontend keeps the working layout in local state and saves the full list
 * after each show/hide/reorder action.
 */
router.put('/widgets', async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = scopeOf(req);
    const widgets: WidgetInput[] = Array.isArray(req.body.widgets) ? req.body.widgets : [];

    if (widgets.length > MAX_WIDGETS_PER_LAYOUT) {
      res.status(400).json({ success: false, error: 'Too many widgets in one layout.' });
      return;
    }
    if (widgets.some((w) => !w.widgetType || typeof w.widgetType !== 'string')) {
      res.status(400).json({ success: false, error: 'Each widget must have a widgetType.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.dashboardWidget.deleteMany({
        where: { userId: req.user!.id, widgetType: { startsWith: `${scope}:` } }
      });

      if (widgets.length > 0) {
        await tx.dashboardWidget.createMany({
          data: widgets.map((w, index) => ({
            userId: req.user!.id,
            widgetType: `${scope}:${w.widgetType}`,
            positionX: Number.isInteger(w.positionX) ? (w.positionX as number) : index,
            positionY: Number.isInteger(w.positionY) ? (w.positionY as number) : 0,
            width: Math.min(Math.max(Number(w.width) || 1, 1), 4),
            height: Math.min(Math.max(Number(w.height) || 1, 1), 2),
            isVisible: w.isVisible !== false
          }))
        });
      }
    });

    res.status(200).json({ success: true, message: 'Dashboard layout saved.' });
  } catch (error) {
    console.error('Dashboard widgets save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save dashboard layout.' });
  }
});

/**
 * DELETE /api/v1/dashboard/widgets?scope=admin
 * Clears this user's saved layout for the scope, reverting to the frontend's
 * built-in defaults (no rows saved = defaults are used).
 */
router.delete('/widgets', async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = scopeOf(req);
    await prisma.dashboardWidget.deleteMany({
      where: { userId: req.user!.id, widgetType: { startsWith: `${scope}:` } }
    });
    res.status(200).json({ success: true, message: 'Dashboard layout reset to default.' });
  } catch (error) {
    console.error('Dashboard widgets reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset dashboard layout.' });
  }
});

export default router;
