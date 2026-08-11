import { Router, Request, Response } from 'express';
import { PrismaClient, Role, ReservationType, ReservationStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
const router = Router();


// Restrict all reservation administrative workflows to institutional staff members
router.use(protect);
router.use(restrictTo(Role.LIBRARIAN, Role.ADMIN));

/**
 * GET: /api/v1/reservations/ledger
 * Streams full campus space schedules and book holds with user profile mappings
 */
router.get('/ledger', async (req: Request, res: Response): Promise<void> => {
  try {
    const reservationLedger = await prisma.reservation.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            studentId: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: reservationLedger,
    });
  } catch (error) {
    console.error('Failed to stream central reservation ledger matrix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve institutional space reservation records.',
    });
  }
});

/**
 * POST: /api/v1/reservations/create
 * Validates student credentials and creates an atomic hold or space scheduling node
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, type, targetId, scheduledFor } = req.body;

    // Validate parameter inputs thoroughly
    if (!studentId || !type || !targetId || !scheduledFor) {
      res.status(400).json({
        success: false,
        error: 'Missing scheduling criteria. Identification, type, target, and timeline date are mandatory.',
      });
      return;
    }

    // Verify type matches allowed schema enumeration types
    if (!Object.values(ReservationType).includes(type as ReservationType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid reservation assignment classification model.',
      });
      return;
    }

    const createdReservation = await prisma.$transaction(async (tx) => {
      // 1. Verify student borrower profile exists and possesses an active account profile status
      const targetUser = await tx.user.findUnique({ where: { studentId } });
      if (!targetUser) {
        throw new Error('No registered user details match this student identifier index number.');
      }
      if (targetUser.status === 'SUSPENDED') {
        throw new Error('Privileges suspended. Cannot book space allocations or record catalog holdings.');
      }

      // 2. Commit the structural scheduling node entry safely
      const reservation = await tx.reservation.create({
        data: {
          type: type as ReservationType,
          targetId,
          scheduledFor: new Date(scheduledFor),
          status: ReservationStatus.PENDING,
          userId: targetUser.id,
        },
      });

      // 3. Log the contextual action event inside the institutional security schema
      await tx.auditLog.create({
        data: {
          action: 'CREATE_RESERVATION',
          description: `Queued ${type} reservation for target: ${targetId} on behalf of student index ${studentId}.`,
          userId: (req as any).user?.id || null,
        },
      });

      return reservation;
    });

    res.status(201).json({
      success: true,
      message: 'Reservation request logged and timeline schedule queued successfully.',
      data: createdReservation,
    });
  } catch (error: any) {
    console.error('Schedule allocation insertion failure exceptions:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to safely record the reservation constraint parameter layers.',
    });
  }
});

/**
 * PATCH: /api/v1/reservations/:id/status
 * Updates reservation operational status states (FULFILLED, CANCELLED, EXPIRED)
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const reservationId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(reservationId)) {
      res.status(400).json({ success: false, error: 'Invalid scheduling row database identifier reference.' });
      return;
    }

    if (!status || !Object.values(ReservationStatus).includes(status as ReservationStatus)) {
      res.status(400).json({
        success: false,
        error: 'Invalid schedule status assignment type provided.',
      });
      return;
    }

    const updatedReservation = await prisma.$transaction(async (tx) => {
      // 1. Verify existence of target record entry
      const existingReservation = await tx.reservation.findUnique({ where: { id: reservationId } });
      if (!existingReservation) {
        throw new Error('No active reservation entry found matching this database index row.');
      }

      // 2. Commit the adjusted status value parameter
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: status as ReservationStatus },
      });

      // 3. Document the transaction context inside the security audit schema
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_RESERVATION_STATUS',
          description: `Modified reservation ID ${reservationId} status conditions state to ${status}.`,
          userId: (req as any).user?.id || null,
        },
      });

      return updated;
    });

    res.status(200).json({
      success: true,
      message: 'Reservation allocation state records updated successfully.',
      data: updatedReservation,
    });
  } catch (error: any) {
    console.error('Reservation state adjustment crash exceptions:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to modify target scheduling state conditions layers.',
    });
  }
});

export default router;