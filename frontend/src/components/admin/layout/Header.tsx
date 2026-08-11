import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/classNames';
import { useAuth } from '../../../context/AuthContext';
import { Search, Bell, Menu, X, ShieldCheck, LogOut, User, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
  notificationCount?: number;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onMenuToggle,
  notificationCount = 0,
  onSearch,
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchValue);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left: Menu toggle + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center: Search */}
      {onSearch && (
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search across dashboard..."
              className={cn(
                'w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl',
                'text-xs font-medium text-slate-700 placeholder-slate-400',
                'focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10',
                'transition-all duration-200'
              )}
            />
          </div>
        </form>
      )}

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <button className="relative h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-[#7A1C2C] flex items-center justify-center text-white text-xs font-black">
              {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-none">
                {user?.fullName || 'Admin'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {user?.role || 'ADMIN'}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-2"
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-800">
                      {user?.fullName || 'Admin User'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {user?.email || 'admin@knust.edu.gh'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // Profile action
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    Profile Settings
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};