import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  Bell, CheckCircle2, AlertTriangle, Info, Clock, BookOpen, Calendar, Receipt, Loader2,
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  DUE_REMINDER: Clock,
  OVERDUE_ALERT: AlertTriangle,
  BOOKING_CONFIRMED: Calendar,
  BOOKING_CANCELLED: Calendar,
  BOOK_AVAILABLE: BookOpen,
  FINE_ISSUED: Receipt,
  FINE_PAID: CheckCircle2,
  GENERAL: Info,
  SYSTEM: Info,
};

const priorityColors: Record<string, string> = {
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  NORMAL: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function NotificationsPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['studentNotifications'],
    queryFn: async () => {
      const res = await API.get('/notifications');
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await API.patch('/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading notifications...</p>
      </div>
    );
  }

  const notifications: Notification[] = data?.data || [];
  const unreadCount: number = data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#800020]" />
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-amber-400 text-[#800020] px-2 py-0.5 rounded-full font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-[#800020] hover:bg-[#800020]/5 border border-[#800020]/20 rounded-lg transition-colors"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No notifications yet</p>
            <p className="text-[11px] text-slate-400 mt-1">We'll notify you about due dates, bookings, and more.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] || Info;
              const isUnread = !notif.read;

              return (
                <div
                  key={notif.id}
                  onClick={() => isUnread && markReadMutation.mutate(notif.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-150 ${
                    isUnread
                      ? 'bg-amber-50/30 border border-amber-100/60 hover:bg-amber-50/50'
                      : 'bg-slate-50 border border-slate-100 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    notif.priority === 'URGENT' ? 'bg-rose-100 text-rose-600' :
                    notif.priority === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${priorityColors[notif.priority] || priorityColors.NORMAL}`}>
                        {notif.priority}
                      </span>
                      {isUnread && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{notif.message}</p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}