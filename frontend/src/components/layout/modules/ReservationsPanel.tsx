import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { BookMarked, Calendar, Clock, MapPin, XCircle, CheckCircle2, Loader2, Bookmark } from 'lucide-react';

export default function ReservationsPanel() {
  const queryClient = useQueryClient();
  const { data: libraryData, isLoading: libraryLoading } = useQuery({
    queryKey: ['myLibrary'],
    queryFn: async () => (await API.get('/library/my-library')).data,
  });
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['myBookings'],
    queryFn: async () => (await API.get('/student/my-bookings')).data,
  });

  const cancelReservation = useMutation({
    mutationFn: async (id: number) => (await API.delete(`/library/reservations/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    },
  });
  const cancelBooking = useMutation({
    mutationFn: async (uuid: string) => (await API.delete(`/student/bookings/${uuid}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
  });

  if (libraryLoading || bookingsLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#800020] animate-spin" /></div>;

  const reservations = (libraryData?.data?.reservations || []).filter((r: any) => r.type === 'BOOK_HOLD');
  const bookings = bookingsData?.data || [];

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><Bookmark className="w-4 h-4 text-[#800020]" /> Book Holds</h2><p className="text-[11px] text-slate-400 mt-1">A reservation is a queue position, not a loan. You borrow the book after it becomes available.</p></div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold">{reservations.length}</span>
        </div>
        {reservations.length === 0 ? <div className="py-10 text-center"><BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-3" /><p className="text-xs font-bold text-slate-600">No book reservations</p><p className="text-[11px] text-slate-400 mt-1">Unavailable books can be reserved from the catalogue.</p></div> : (
          <div className="space-y-3 mt-4">
            {reservations.map((res: any) => (
              <div key={res.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{res.book?.title || `Book #${res.targetId}`}</h3>
                    {res.book?.author && <p className="text-[11px] text-slate-500">{res.book.author}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {res.status === 'PENDING' && <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">Queue position: {res.queuePosition}</span>}
                      <span className="text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-full">{res.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Reserved {new Date(res.createdAt).toLocaleDateString()}</p>
                  </div>
                  {res.status === 'PENDING' && <button onClick={() => cancelReservation.mutate(res.id)} disabled={cancelReservation.isPending} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"><XCircle className="w-3 h-3" /> Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100"><div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" /> Study Space Reservations</h2></div><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold">{bookings.length}</span></div>
        {bookings.length === 0 ? <div className="py-10 text-center"><Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" /><p className="text-xs font-bold text-slate-600">No room bookings</p></div> : (
          <div className="space-y-3 mt-4">
            {bookings.map((booking: any) => (
              <div key={booking.bookingUuid} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-900">Room {booking.roomNumber}</h3><span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full"><CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />Confirmed</span></div><div className="flex flex-wrap gap-3 text-[10px] text-slate-400 mt-2"><span><Calendar className="w-3 h-3 inline mr-1" />{new Date(booking.bookingDate).toLocaleDateString()}</span><span><Clock className="w-3 h-3 inline mr-1" />{new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span><MapPin className="w-3 h-3 inline mr-1" />{booking.location || 'Library'}</span></div></div>
                <button onClick={() => cancelBooking.mutate(booking.bookingUuid)} disabled={cancelBooking.isPending} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"><XCircle className="w-3 h-3" /> Cancel</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
