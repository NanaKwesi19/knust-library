import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/classNames';
import type { AdminTab } from '../../../types/admin';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const menuItems: Array<{ id: AdminTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'borrowing', label: 'Borrowing' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'fines', label: 'Fines' },
  { id: 'digital', label: 'Digital' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai', label: 'AI Insights' },
  { id: 'audit', label: 'Audit' },
  { id: 'config', label: 'Settings' },
  { id: 'backup', label: 'Maintenance' },
];

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-72 bg-[#800020] z-50 lg:hidden flex flex-col"
          >
            <div className="h-16 flex items-center px-4 border-b border-white/10 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-amber-400 flex items-center justify-center font-black text-lg text-[#800020]">
                K
              </div>
              <div className="ml-3">
                <h1 className="text-xs font-black tracking-wider uppercase text-white">
                  KNUST Library
                </h1>
                <p className="text-[10px] text-amber-300 font-bold tracking-widest uppercase">
                  Admin Portal
                </p>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center px-3 py-3 rounded-xl transition-all text-left gap-3',
                    activeTab === item.id
                      ? 'bg-amber-400 text-[#800020] font-bold shadow-sm'
                      : 'text-slate-200 hover:bg-white/5 font-medium'
                  )}
                >
                  <span className="text-xs">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">System Online</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};