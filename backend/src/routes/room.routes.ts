import { Router, Request, Response } from 'express';
import { Role, ReservationType, ReservationStatus } from '@prisma/client';
import { protect, restrictTo } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(protect);

// ==========================================
// PUBLIC / STUDENT ROUTES
// ==========================================

/**
 * GET: /api/v1/rooms/reservations?page=1&limit=10
 */
router.get('/reservations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, type } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as string;
    if (type && type !== 'ALL') where.type = type as string;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, studentId: true } }
        }
      }),
      prisma.reservation.count({ where })
    ]);

    // Fetch room details separately for room reservation types
    const roomReservationTypes: ReservationType[] = [ReservationType.STUDY_SPACE, ReservationType.DISCUSSION_ROOM];

    const roomTargetIds = reservations
      .filter(r => roomReservationTypes.includes(r.type))
      .map(r => parseInt(r.targetId))
      .filter(id => !isNaN(id));

    const rooms = roomTargetIds.length > 0
      ? await prisma.studyRoom.findMany({
          where: { id: { in: roomTargetIds } },
          select: { id: true, roomNumber: true, location: true, capacity: true }
        })
      : [];

    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const enrichedReservations = reservations.map(r => ({
      ...r,
      room: roomReservationTypes.includes(r.type)
        ? roomMap.get(parseInt(r.targetId)) || null
        : null
    }));

    res.status(200).json({
      success: true,
      data: {
        data: enrichedReservations,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('Reservations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve reservations.' });
  }
});

/**
 * GET: /api/v1/rooms
 * List all study rooms
 */
router.get('/', restrictTo(Role.STUDENT, Role.STAFF, Role.LIBRARIAN, Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.studyRoom.findMany({
      include: {
        _count: { select: { bookings: true } }
      },
      orderBy: { roomNumber: 'asc' }
    });

    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Rooms fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve rooms.' });
  }
});

/**
 * GET: /api/v1/rooms/availability
 * Check room availability for a date
 */
router.get('/availability', restrictTo(Role.STUDENT, Role.STAFF, Role.LIBRARIAN, Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;

    if (!date) {
      res.status(400).json({ success: false, error: 'Date parameter required (YYYY-MM-DD).' });
      return;
    }

    const searchDate = new Date(date as string);
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    const rooms = await prisma.studyRoom.findMany({
      include: {
        bookings: {
          where: {
            bookingDate: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: { not: 'CANCELLED' }
          },
          select: {
            startTime: true,
            endTime: true
          }
        }
      }
    });

    const formatted = rooms.map((room) => ({
      roomUuid: room.id.toString(),
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      location: room.location,
      description: room.description,
      amenities: room.amenities,
      bookings: room.bookings.map((b) => ({
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString()
      }))
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve availability.' });
  }
});

/**
 * GET: /api/v1/rooms/:id/bookings
 * Get bookings for a specific room
 */
router.get('/:id/bookings', restrictTo(Role.LIBRARIAN, Role.ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = parseInt(req.params.id as string);

    const bookings = await prisma.roomBooking.findMany({
      where: { roomId },
      include: {
        user: { select: { fullName: true, studentId: true } }
      },
      orderBy: { bookingDate: 'desc' }
    });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Room bookings error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
  }
});

// ==========================================
// ADMIN / LIBRARIAN ROUTES
// ==========================================

router.use(restrictTo(Role.ADMIN, Role.LIBRARIAN));

/**
 * POST: /api/v1/rooms/create
 * Create a new study room
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomNumber, capacity, location, description, amenities } = req.body;

    if (!roomNumber || !capacity) {
      res.status(400).json({ success: false, error: 'Room number and capacity are required.' });
      return;
    }

    const existing = await prisma.studyRoom.findUnique({ where: { roomNumber } });
    if (existing) {
      res.status(400).json({ success: false, error: 'Room number already exists.' });
      return;
    }

    const room = await prisma.studyRoom.create({
      data: {
        roomNumber,
        capacity: parseInt(capacity),
        location: location || null,
        description: description || null,
        amenities: amenities || []
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_ROOM',
        description: `Created study room ${roomNumber}`,
        userId: req.user!.id
      }
    });

    res.status(201).json({ success: true, message: 'Room created.', data: room });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create room.' });
  }
});

/**
 * PATCH: /api/v1/rooms/:id
 * Update room details
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const { roomNumber, capacity, location, description, amenities } = req.body;

    const updated = await prisma.studyRoom.update({
      where: { id },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(location !== undefined && { location }),
        ...(description !== undefined && { description }),
        ...(amenities && { amenities })
      }
    });

    res.status(200).json({ success: true, message: 'Room updated.', data: updated });
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update room.' });
  }
});

/**
 * DELETE: /api/v1/rooms/:id
 * Delete a room
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);

    const activeBookings = await prisma.roomBooking.count({
      where: { roomId: id, status: { not: 'CANCELLED' } }
    });

    if (activeBookings > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete: ${activeBookings} active booking(s) exist.`
      });
      return;
    }

    await prisma.studyRoom.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_ROOM',
        description: `Deleted study room ID: ${id}`,
        userId: req.user!.id
      }
    });

    res.status(200).json({ success: true, message: 'Room deleted.' });
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete room.' });
  }
});

export default router;