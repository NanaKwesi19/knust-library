import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../../utils/classNames';
import { formatRelative } from '../../../utils/formatters';

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClear: (id: number) => void;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
};

const colors = {
  info: 'text-blue-600 bg-blue-50',
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-rose-600 bg-rose-50',
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      onMarkAllRead();
                      setIsOpen(false);
                    }}
                    className="text-[10px] font-bold text-[#7A1C2C] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = icons[notification.type];
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors',
                          !notification.read && 'bg-slate-50/50'
                        )}
                      >
                        <div
                          className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                            colors[notification.type]
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={cn(
                                'text-xs font-bold text-slate-800',
                                !notification.read && 'text-slate-900'
                              )}
                            >
                              {notification.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatRelative(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {!notification.read && (
                              <button
                                onClick={() => onMarkRead(notification.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7A1C2C] hover:underline"
                              >
                                <Check className="w-3 h-3" />
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => onClear(notification.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};