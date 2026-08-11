import { Request, Response } from 'express';
import {prisma} from '../lib/prisma.js';

interface StudyRoomPayload {
  roomNumber: string;
  capacity: number;
  location?: string;
  description?: string;
}

interface RoomBookingPayload {
  roomUuid: string;
  bookingDate: string; // ISO format string: YYYY-MM-DD
  startTime: string;   // ISO Datetime string
  endTime: string;     // ISO Datetime string
}

// 1. Provision New Physical Workspace (Admin Privilege)
export const createStudyRoom = async (req: Request, res: Response): Promise<void> => {
  const { roomNumber, capacity, location, description } = req.body as StudyRoomPayload;

  if (!roomNumber || !capacity) {
    res.status(400).json({ success: false, error: 'Missing core infrastructure specifications: roomNumber and capacity.' });
    return;
  }

  try {
    const existingRoom = await prisma.studyRoom.findUnique({ where: { roomNumber } });
    if (existingRoom) {
      res.status(409).json({ success: false, error: `Study workspace room ${roomNumber} is already mapped in the database.` });
      return;
    }

    const newRoom = await prisma.studyRoom.create({
      data: { roomNumber, capacity, location, description },
      select: { roomUuid: true, roomNumber: true, capacity: true }
    });

    res.status(201).json({ success: true, message: 'Physical room entity successfully provisioned.', data: newRoom });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server failure during hardware location mapping.' });
  }
};

// 2. High-Integrity Collision-Free Room Booking Engine
export const bookStudyRoom = async (req: Request, res: Response): Promise<void> => {
  const { roomUuid, bookingDate, startTime, endTime } = req.body as RoomBookingPayload;
  const userContext = req.user;

  if (!userContext) {
    res.status(500).json({ success: false, error: 'Security context configuration error.' });
    return;
  }

  if (!roomUuid || !bookingDate || !startTime || !endTime) {
    res.status(400).json({ success: false, error: 'Missing scheduling boundary arrays: roomUuid, bookingDate, startTime, and endTime.' });
    return;
  }

  const requestedDate = new Date(bookingDate);
  const startRange = new Date(startTime);
  const endRange = new Date(endTime);

  if (startRange >= endRange) {
    res.status(400).json({ success: false, error: 'Chronological timeline mismatch: startTime must precede endTime.' });
    return;
  }

  try {
    const targetRoom = await prisma.studyRoom.findUnique({ where: { roomUuid } });
    if (!targetRoom) {
      res.status(404).json({ success: false, error: 'Target workspace entity was not found.' });
      return;
    }

    if (!targetRoom.isAvailable) {
      res.status(403).json({ success: false, error: 'The requested room is currently flagged out-of-service for maintenance.' });
      return;
    }

    // Wrap scheduling verification and insertion inside an isolated transaction lock
    const bookingConfirmation = await prisma.$transaction(async (tx) => {
      
      // Calculate overlap: (StartA < EndB) AND (EndA > StartB)
      const overlappingBooking = await tx.roomBooking.findFirst({
        where: {
          roomId: targetRoom.id,
          bookingDate: requestedDate,
          status: 'CONFIRMED',
          AND: [
            { startTime: { lt: endRange } },
            { endTime: { gt: startRange } }
          ]
        }
      });

      if (overlappingBooking) {
        throw new Error('Scheduling Conflict: The selected room is already booked during this timeframe.');
      }

      // Commit the booking slot
      const reservation = await tx.roomBooking.create({
        data: {
          userId: (userContext as any).id,
          roomId: targetRoom.id,
          bookingDate: requestedDate,
          startTime: startRange,
          endTime: endRange,
          status: 'CONFIRMED'
        },
        select: { id: true, bookingUuid: true, bookingDate: true }
      });

      // Log system intervention metrics
      await tx.auditLog.create({
        data: {
          userId: (userContext as any).id,
          action: 'WORKSPACE_RESERVATION',
          entityType: 'RoomBooking',
          description: `Booked Room ${targetRoom.roomNumber}`,
          entityId: String(reservation.id),
          ipAddress: req.ip || '0.0.0.0',
          details: { roomNumber: targetRoom.roomNumber, bookingDate }
        }
      });

      return reservation;
    });

    res.status(201).json({
      success: true,
      message: `Reservation confirmed for Room ${targetRoom.roomNumber}. Your time block is locked.`,
      data: bookingConfirmation
    });

  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Booking process execution failure.' });
  }
};