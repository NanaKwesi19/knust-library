import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/classNames';
import { useAuth } from '../../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowLeftRight,
  Calendar,
  Coins,
  Globe,
  BarChart3,
  Brain,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Library,
  HelpCircle,
  Mail,
  Wrench, Building2,
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin', roles: ['ADMIN', 'LIBRARIAN', 'STAFF'] },
  { key: 'users', label: 'Users', icon: Users, path: '/admin/users', roles: ['ADMIN', 'LIBRARIAN'] },
  { key: 'inventory', label: 'Inventory', icon: BookOpen, path: '/admin/inventory', roles: ['ADMIN', 'LIBRARIAN', 'STAFF'] },
  { key: 'borrowing', label: 'Borrowing', icon: ArrowLeftRight, path: '/admin/borrowing', roles: ['ADMIN', 'LIBRARIAN', 'STAFF'] },
  { key: 'reservations', label: 'Reservations', icon: Calendar, path: '/admin/reservations', roles: ['ADMIN', 'LIBRARIAN', 'STAFF'] },
  { key: 'fines', label: 'Fines', icon: Coins, path: '/admin/fines', roles: ['ADMIN', 'LIBRARIAN'] },
  // Maintenance nav item
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/admin/maintenance', roles: ['ADMIN', 'LIBRARIAN'] },
  { key: 'facilities', label: 'Facilities', icon: Building2, path: '/admin/facilities', roles: ['ADMIN', 'LIBRARIAN'] },
  { key: 'resources', label: 'Digital Resources', icon: Globe, path: '/admin/resources', roles: ['ADMIN', 'LIBRARIAN', 'STAFF'] },
  { key: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports', roles: ['ADMIN', 'LIBRARIAN'] },
  { key: 'ai', label: 'AI Insights', icon: Brain, path: '/admin/ai', roles: ['ADMIN', 'LIBRARIAN'] },
  { key: 'audit', label: 'Audit Logs', icon: Shield, path: '/admin/audit', roles: ['ADMIN'] },
  { key: 'config', label: 'Settings', icon: Settings, path: '/admin/config', roles: ['ADMIN'] },
  { key: 'open-library', label: 'Open Library', icon: BookOpen, path: '/admin/open-library', roles: ['ADMIN', 'LIBRARIAN'] },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const userRole = user?.role || 'STAFF';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40"
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#4A0C16] flex items-center justify-center shrink-0">
            <Library className="h-5 w-5 text-[#DC9A22]" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 overflow-hidden"
              >
                <div className="text-[11px] font-black text-slate-900 uppercase tracking-wider whitespace-nowrap">KNUST Library</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Admin Portal</div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={onToggle}
            className="ml-auto h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {filteredNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group',
                  active
                    ? 'bg-[#7A1C2C] text-white shadow-lg shadow-[#7A1C2C]/20'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && !isCollapsed && (
                  <span className="ml-auto bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {active && !isCollapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#DC9A22] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Help & Support - Single Column Nav Item */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <HelpCircle className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Help & Support
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group"
          >
            <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-rose-500" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Help & Support Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm pointer-events-auto overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#7A1C2C]" />
                    <h3 className="text-sm font-bold text-slate-900">Help & Support</h3>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Need help with the library management system? Contact the IT support team for assistance.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-700">Email Support</div>
                        <div className="text-[10px] text-slate-400">support@knust.edu.gh</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-700">Documentation</div>
                        <div className="text-[10px] text-slate-400">docs.knust-library.edu.gh</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="w-full py-2.5 bg-[#7A1C2C] text-white text-xs font-bold rounded-xl hover:bg-[#5a1520] transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};