import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { formatDate } from '../../../utils/formatters';
import { DoorOpen, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface StudyRoom {
  id: number;
  roomUuid: string;
  roomNumber: string;
  capacity: number;
  location: string | null;
  description: string | null;
  amenities: string[];
  isAvailable: boolean;
}

interface RoomBooking {
  id: number;
  bookingUuid: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  user: {
    fullName: string;
    studentId: string | null;
  };
}

export const RoomAvailability: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['studyRooms'],
    queryFn: async () => {
      const res = await API.get('/rooms');
      return res.data;
    },
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['roomBookings', selectedRoom],
    queryFn: async () => {
      if (!selectedRoom) return null;
      const res = await API.get(`/rooms/${selectedRoom}/bookings`);
      return res.data;
    },
    enabled: !!selectedRoom,
  });

  const rooms: StudyRoom[] = roomsData?.data || [];
  const bookings: RoomBooking[] = bookingsData?.data || [];

  if (roomsLoading) {
    return <SkeletonCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-purple-600" />
          Room Availability
        </CardTitle>
      </CardHeader>

      {rooms.length === 0 ? (
        <EmptyState
          title="No rooms configured"
          description="Study rooms and discussion rooms will appear here once configured."
          icon="inbox"
        />
      ) : (
        <div className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedRoom === room.id
                    ? 'border-purple-300 bg-purple-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Room {room.roomNumber}</span>
                  <Badge
                    variant={room.isAvailable ? 'success' : 'danger'}
                    size="sm"
                    dot
                  >
                    {room.isAvailable ? 'Available' : 'Occupied'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Users className="w-3 h-3" />
                  Capacity: {room.capacity}
                </div>
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.slice(0, 3).map((amenity, i) => (
                      <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[9px] text-slate-400">+{room.amenities.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedRoom && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-700 mb-3">Today's Bookings</h4>
              {bookings.length === 0 ? (
                <p className="text-[11px] text-slate-400">No bookings for this room today.</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div className="text-xs font-bold text-slate-700">{booking.user.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{booking.user.studentId || '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-600">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <Badge
                          variant={
                            booking.status === 'CONFIRMED' ? 'success' :
                            booking.status === 'CANCELLED' ? 'danger' :
                            'neutral'
                          }
                          size="sm"
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};