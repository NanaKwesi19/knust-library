import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  BookMarked, Calendar, Clock, MapPin, XCircle, CheckCircle2,
  AlertCircle, Loader2, Bookmark,
} from 'lucide-react';

interface BookReservation {
  id: number;
  targetId: number;
  type: 'BOOK_HOLD';
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  notes?: string;
}

interface RoomBooking {
  bookingUuid: string;
  roomNumber: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export default function ReservationsPanel() {
  const queryClient = useQueryClient();
  const [cancelMessage, setCancelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: reservationsData, isLoading: reservationsLoading } = useQuery({
    queryKey: ['studentReservations'],
    queryFn: async () => {
      const res = await API.get('/student/reservations');
      return res.data;
    },
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => {
      const res = await API.get('/student/my-bookings');
      return res.data;
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/student/reservations/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentReservations'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      setCancelMessage({ type: 'success', text: 'Reservation cancelled.' });
      setTimeout(() => setCancelMessage(null), 3000);
    },
    onError: (error: any) => {
      setCancelMessage({ type: 'error', text: error.response?.data?.error || 'Failed to cancel.' });
      setTimeout(() => setCancelMessage(null), 3000);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingUuid: string) => {
      const res = await API.delete(`/student/bookings/${bookingUuid}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      setCancelMessage({ type: 'success', text: 'Booking cancelled.' });
      setTimeout(() => setCancelMessage(null), 3000);
    },
    onError: (error: any) => {
      setCancelMessage({ type: 'error', text: error.response?.data?.error || 'Failed to cancel.' });
      setTimeout(() => setCancelMessage(null), 3000);
    },
  });

  if (reservationsLoading || bookingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading reservations...</p>
      </div>
    );
  }

  const bookReservations: BookReservation[] = (reservationsData?.data || []).filter(
    (r: BookReservation) => r.type === 'BOOK_HOLD'
  );
  const roomBookings: RoomBooking[] = bookingsData?.data || [];

  return (
    <div className="space-y-8">
      {cancelMessage && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${
          cancelMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {cancelMessage.text}
        </div>
      )}

      {/* Book Reservations */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#800020]" />
            Book Reservations
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            {bookReservations.length} holds
          </span>
        </div>

        {bookReservations.length === 0 ? (
          <div className="py-8 text-center">
            <BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No book reservations</p>
            <p className="text-[11px] text-slate-400 mt-1">Reserve unavailable books from the catalogue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookReservations.map((res) => (
              <div key={res.id} className="border border-slate-200/80 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Book ID: {res.targetId}</h3>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        res.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        res.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {res.status === 'PENDING' && <Clock className="w-2.5 h-2.5" />}
                        {res.status === 'FULFILLED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {res.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Reserved on {new Date(res.createdAt).toLocaleDateString()}
                    </p>
                    {res.notes && <p className="text-[10px] text-slate-500 italic">{res.notes}</p>}
                  </div>
                  {res.status === 'PENDING' && (
                    <button
                      onClick={() => cancelReservationMutation.mutate(res.id)}
                      disabled={cancelReservationMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Space Reservations */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            Study Space Reservations
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            {roomBookings.length} bookings
          </span>
        </div>

        {roomBookings.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No room bookings</p>
            <p className="text-[11px] text-slate-400 mt-1">Book a study space from the Study Spaces tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roomBookings.map((booking) => (
              <div key={booking.bookingUuid} className="border border-slate-200/80 rounded-xl p-4 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Room {booking.roomNumber}</h3>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.bookingDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.location || 'Library'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelBookingMutation.mutate(booking.bookingUuid)}
                    disabled={cancelBookingMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors shrink-0"
                  >
                    {cancelBookingMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}