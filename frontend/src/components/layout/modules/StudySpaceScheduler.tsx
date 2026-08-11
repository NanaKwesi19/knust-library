import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Calendar, Clock, MapPin, Users, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Room {
  roomUuid: string;
  roomNumber: string;
  capacity: number;
  location?: string;
  description?: string;
  amenities: string[];
  bookings: Array<{ start: string; end: string }>;
}

interface Booking {
  bookingUuid: string;
  roomNumber: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export default function StudySpaceScheduler() {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedRoomUuid, setSelectedRoomUuid] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['studySpaces', selectedDate],
    queryFn: async () => {
      const res = await API.get(`/student/study-spaces?date=${selectedDate}`);
      return res.data;
    },
  });

  const { data: myBookingsData } = useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const res = await API.get('/student/my-bookings');
      return res.data;
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (payload: { roomUuid: string; bookingDate: string; startTime: string; endTime: string }) => {
      const startIso = `${payload.bookingDate}T${payload.startTime}:00.000Z`;
      const endIso = `${payload.bookingDate}T${payload.endTime}:00.000Z`;

      const res = await API.post('/student/book-study-space', {
        roomUuid: payload.roomUuid,
        bookingDate: payload.bookingDate,
        startTime: startIso,
        endTime: endIso,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studySpaces', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      setBookingMessage({ type: 'success', text: data.message || 'Room booked successfully!' });
      setSelectedRoomUuid('');
    },
    onError: (error: any) => {
      setBookingMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to book room. Please try again.',
      });
    },
  });

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingMessage(null);

    if (!selectedRoomUuid) {
      setBookingMessage({ type: 'error', text: 'Please select a room.' });
      return;
    }

    if (startTime >= endTime) {
      setBookingMessage({ type: 'error', text: 'End time must be after start time.' });
      return;
    }

    createBookingMutation.mutate({
      roomUuid: selectedRoomUuid,
      bookingDate: selectedDate,
      startTime,
      endTime,
    });
  };

  const rooms: Room[] = roomsData?.data || [];
  const myBookings: Booking[] = myBookingsData?.data || [];

  if (roomsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Checking room schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Current Bookings */}
      {myBookings.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100">
            My Upcoming Bookings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myBookings.map((booking) => (
              <div key={booking.bookingUuid} className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Room {booking.roomNumber}</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Confirmed</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {new Date(booking.bookingDate).toLocaleDateString()} • {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {booking.location || 'Library Building'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100">
            Book a Study Space
          </h3>

          {bookingMessage && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              bookingMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {bookingMessage.text}
            </div>
          )}

          <form onSubmit={handleReservationSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600 block">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedRoomUuid('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-600 block">Choose a Room</label>
              <select
                required
                value={selectedRoomUuid}
                onChange={(e) => setSelectedRoomUuid(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-semibold text-slate-700"
              >
                <option value="">-- Select a room --</option>
                {rooms.map((room) => (
                  <option key={room.roomUuid} value={room.roomUuid}>
                    Room {room.roomNumber} ({room.capacity} seats) — {room.location || 'Library'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 block">Start Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 block">End Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={createBookingMutation.isPending || !selectedRoomUuid}
              className="w-full bg-[#800020] hover:bg-[#66001a] text-white font-bold py-3 rounded-xl uppercase tracking-wider transition-colors disabled:opacity-40 shadow-sm"
            >
              {createBookingMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </form>
        </div>

        {/* Room Availability */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Available Spaces — {new Date(selectedDate).toLocaleDateString()}
            </h2>
            <span className="text-[10px] bg-amber-400 text-[#800020] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              {rooms.length} Rooms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const isSelected = selectedRoomUuid === room.roomUuid;
              const hasBookings = room.bookings && room.bookings.length > 0;

              return (
                <div
                  key={room.roomUuid}
                  onClick={() => setSelectedRoomUuid(room.roomUuid)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-[#800020] bg-[#800020]/5 shadow-md'
                      : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-800">Room {room.roomNumber}</h4>
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        <Users className="w-3 h-3" /> {room.capacity} Seats
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> {room.location || 'Library Building'}
                    </p>
                    {room.description && (
                      <p className="text-[11px] text-slate-500 italic">{room.description}</p>
                    )}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {room.amenities.map((amenity) => (
                          <span key={amenity} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-500">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 mt-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Booked Times:</span>
                    {hasBookings ? (
                      <div className="space-y-1">
                        {room.bookings.map((booking, idx) => (
                          <div key={idx} className="text-[10px] text-amber-800 font-medium bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                            {new Date(booking.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Available all day
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}