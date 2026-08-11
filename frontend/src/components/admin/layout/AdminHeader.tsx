import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Badge } from '../../ui/Badge';
import {
  Bell,
  Search,
  Menu,
  Shield,
  User,
  Clock,
} from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/inventory': 'Book Inventory',
  '/admin/borrowing': 'Borrowing Management',
  '/admin/reservations': 'Reservations',
  '/admin/fines': 'Fine Management',
  '/admin/resources': 'Digital Resources',
  '/admin/reports': 'Reports & Analytics',
  '/admin/ai': 'AI Insights',
  '/admin/audit': 'Audit Logs',
  '/admin/config': 'System Configuration',
};

export const AdminHeader: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const { data: notificationsData } = useQuery({
    queryKey: ['headerNotifications'],
    queryFn: async () => {
      const res = await API.get('/notifications/unread?limit=5');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const unreadCount = notificationsData?.data?.unreadCount || 0;
  const notifications = notificationsData?.data?.notifications || [];

  const title = pageTitles[location.pathname] || 'Admin Portal';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search..."
            className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 ml-2 w-48"
          />
        </div>

        {/* Notifications */}
        <button className="relative h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.fullName || 'Admin User'}</div>
            <div className="text-[10px] text-slate-400 font-medium">{user?.role || 'STAFF'}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-[#7A1C2C] flex items-center justify-center text-white text-xs font-black">
            {(user?.fullName || 'A').split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};