import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useDashboardLayout, type WidgetDefinition } from '../../../hooks/useDashboardLayout';
import { DashboardCustomizeToolbar, WidgetEditControls } from '../../admin/layout/DashboardCustomize';
import { BentoGrid, BentoItem } from '../../admin/layout/BentoGrid';
import {
  BookOpen, Calendar, Clock, CheckCircle2, Bell, Receipt,
  Search, Library, ArrowRight, Loader2,
} from 'lucide-react';

const OVERVIEW_WIDGETS: WidgetDefinition[] = [
  { key: 'quickActions', label: 'Quick Actions', defaultWidth: 2, defaultHeight: 1 },
  { key: 'currentlyBorrowed', label: 'Currently Borrowed', defaultWidth: 1, defaultHeight: 1 },
  { key: 'upcomingReservations', label: 'Upcoming Reservations', defaultWidth: 1, defaultHeight: 1 },
  { key: 'notifications', label: 'Recent Notifications', defaultWidth: 2, defaultHeight: 1 },
];

interface Loan {
  loanUuid: string;
  bookTitle: string;
  dueDate: string;
  daysRemaining: number;
}

interface Booking {
  bookingUuid: string;
  roomNumber: string;
  bookingDate: string;
  startTime: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  read: boolean;
  createdAt: string;
}

interface DashboardStats {
  borrowedBooks: number;
  dueSoon: number;
  reservations: number;
  fines: number;
  unreadNotifications: number;
  activeBookings: number;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    layout: widgetLayout,
    isEditing: isEditingLayout,
    setIsEditing: setIsEditingLayout,
    isSaving: isSavingLayout,
    toggleVisible: toggleWidgetVisible,
    move: moveWidget,
    toggleWidth: toggleWidgetWidth,
    resetLayout: resetWidgetLayout,
  } = useDashboardLayout('student-overview', OVERVIEW_WIDGETS);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const res = await API.get('/student/dashboard');
      return res.data;
    },
  });

  const { data: borrowedData } = useQuery({
    queryKey: ['studentBorrowedBooks'],
    queryFn: async () => {
      const res = await API.get('/student/borrowed-books');
      return res.data;
    },
    enabled: !isLoading,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['studentBookings'],
    queryFn: async () => {
      const res = await API.get('/student/my-bookings');
      return res.data;
    },
    enabled: !isLoading,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['studentNotifications'],
    queryFn: async () => {
      const res = await API.get('/notifications?limit=3');
      return res.data;
    },
    enabled: !isLoading,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading your dashboard...</p>
      </div>
    );
  }

  const stats: DashboardStats = dashboardData?.data || {
    borrowedBooks: 0, dueSoon: 0, reservations: 0,
    fines: 0, unreadNotifications: 0, activeBookings: 0,
  };

  const borrowedBooks: Loan[] = borrowedData?.data || [];
  const activeBookings: Booking[] = bookingsData?.data || [];
  const notifications: Notification[] = notificationsData?.data || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const quickActions = [
    { label: 'Search Catalogue', icon: Search, path: '/portal/catalog' },
    { label: 'Reserve Study Space', icon: Calendar, path: '/portal/workspace' },
    { label: 'View Borrowed Books', icon: BookOpen, path: '/portal/borrowed' },
    { label: 'Access Digital Library', icon: Library, path: '/portal/digital' },
  ];

  // Drives each widget's colSpan/order/visibility/edit-controls from the
  // saved layout, without moving any widget's inner content out of place.
  const getWidgetProps = (key: string) => {
    const index = widgetLayout.findIndex((w) => w.key === key);
    const entry = index >= 0 ? widgetLayout[index] : undefined;
    const hidden = entry ? !entry.isVisible : false;

    return {
      colSpan: (entry?.width ?? 1) as 1 | 2,
      style: { order: index >= 0 ? index : 0, display: hidden && !isEditingLayout ? 'none' : undefined } as React.CSSProperties,
      className: hidden ? 'opacity-40' : undefined,
      action:
        isEditingLayout && entry ? (
          <WidgetEditControls
            isVisible={entry.isVisible}
            canMoveLeft={index > 0}
            canMoveRight={index < widgetLayout.length - 1}
            isWide={entry.width === 2}
            onToggleVisible={() => toggleWidgetVisible(key)}
            onMoveLeft={() => moveWidget(key, -1)}
            onMoveRight={() => moveWidget(key, 1)}
            onToggleWidth={() => toggleWidgetWidth(key)}
          />
        ) : undefined,
    };
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#800020] to-[#66001a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10">
          <p className="text-xs text-amber-300 font-medium tracking-wide uppercase mb-1">KNUST Digital Library Portal</p>
          <h2 className="text-xl font-bold tracking-tight">{greeting}, {user?.fullName?.split(' ')[0] || 'Student'}</h2>
          <p className="text-xs text-white/70 mt-1 max-w-md leading-relaxed">
            Manage your books, reservations, research resources and library activities.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Borrowed', value: stats.borrowedBooks, sub: 'Active loans', icon: BookOpen, color: 'text-[#800020]', bg: 'bg-[#800020]/5', border: 'border-[#800020]/10' },
          { label: 'Due Soon', value: stats.dueSoon, sub: 'Within 3 days', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200/60' },
          { label: 'Reservations', value: stats.reservations, sub: 'Book holds', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200/60' },
          { label: 'Fines', value: `GH₵${stats.fines.toFixed(2)}`, sub: 'Total unpaid', icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200/60' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              <p className="text-[10px] text-slate-400">{stat.sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl border ${stat.bg} ${stat.border} ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Widgets */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dashboard Widgets</h3>
        <DashboardCustomizeToolbar
          isEditing={isEditingLayout}
          onToggleEditing={() => setIsEditingLayout((v) => !v)}
          onReset={resetWidgetLayout}
          isSaving={isSavingLayout}
        />
      </div>
      <BentoGrid>
        {/* Quick Actions */}
        <BentoItem {...getWidgetProps('quickActions')}>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-[#800020] hover:text-white hover:border-[#800020] transition-all duration-150 group text-left"
              >
                <action.icon className="w-4 h-4 text-[#800020] group-hover:text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </BentoItem>

        {/* Currently Borrowed */}
        <BentoItem {...getWidgetProps('currentlyBorrowed')}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#800020]" />
              Currently Borrowed
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
              {borrowedBooks.length} items
            </span>
          </div>

          {borrowedBooks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">No borrowed books right now.</div>
          ) : (
            <div className="space-y-3">
              {borrowedBooks.slice(0, 3).map((loan) => (
                <div key={loan.loanUuid} className="flex items-start justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800">{loan.bookTitle}</h4>
                    <p className="text-[10px] text-slate-400">Due: {new Date(loan.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    loan.daysRemaining <= 3
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {loan.daysRemaining <= 0 ? 'Overdue' : `${loan.daysRemaining} days left`}
                  </span>
                </div>
              ))}
              {borrowedBooks.length > 3 && (
                <button onClick={() => navigate('/portal/borrowed')} className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </BentoItem>

        {/* Upcoming Reservations */}
        <BentoItem {...getWidgetProps('upcomingReservations')}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Upcoming Reservations
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
              {activeBookings.length} bookings
            </span>
          </div>

          {activeBookings.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">No upcoming room bookings.</div>
          ) : (
            <div className="space-y-3">
              {activeBookings.slice(0, 3).map((booking) => (
                <div key={booking.bookingUuid} className="flex items-start justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-800">Room {booking.roomNumber}</h4>
                    <p className="text-[10px] text-slate-400">
                      {new Date(booking.bookingDate).toLocaleDateString()} • {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Confirmed
                  </span>
                </div>
              ))}
              {activeBookings.length > 3 && (
                <button onClick={() => navigate('/portal/workspace')} className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </BentoItem>

        {/* Notifications */}
        <BentoItem {...getWidgetProps('notifications')}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#800020]" />
            Recent Notifications
          </h2>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
            {stats.unreadNotifications} unread
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">No notifications yet.</div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notif) => (
              <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-xl text-xs ${
                notif.read ? 'bg-slate-50 border border-slate-100' : 'bg-amber-50/30 border border-amber-100/60'
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                  notif.priority === 'URGENT' ? 'bg-rose-500' :
                  notif.priority === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold text-slate-800">{notif.title}</p>
                  <p className="text-[10px] text-slate-500">{notif.message}</p>
                </div>
                <span className="text-[9px] text-slate-400 shrink-0">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {notifications.length > 3 && (
              <button onClick={() => navigate('/portal/notifications')} className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-1 mt-2">
                View all notifications <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        </BentoItem>
      </BentoGrid>
    </div>
  );
}