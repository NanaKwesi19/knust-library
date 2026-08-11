import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/classNames';
import { Search, Command, ArrowRight } from 'lucide-react';
import type { AdminTab } from '../../../types/admin';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
}

const commands: Array<{
  id: AdminTab;
  label: string;
  description: string;
  shortcut?: string;
}> = [
  { id: 'dashboard', label: 'Dashboard Overview', description: 'View system metrics and activity', shortcut: 'G D' },
  { id: 'users', label: 'User Management', description: 'Manage students and staff accounts', shortcut: 'G U' },
  { id: 'inventory', label: 'Book Inventory', description: 'Catalog and copy management', shortcut: 'G I' },
  { id: 'borrowing', label: 'Borrowing', description: 'Checkouts and returns', shortcut: 'G B' },
  { id: 'reservations', label: 'Reservations', description: 'Room and book holds', shortcut: 'G R' },
  { id: 'fines', label: 'Fines & Payments', description: 'Financial management', shortcut: 'G F' },
  { id: 'digital', label: 'Digital Resources', description: 'External repositories', shortcut: 'G D' },
  { id: 'analytics', label: 'Reports & Analytics', description: 'Charts and statistics', shortcut: 'G A' },
  { id: 'ai', label: 'AI Insights', description: 'Demand forecasting', shortcut: 'G I' },
  { id: 'audit', label: 'Audit Logs', description: 'Security trace entries', shortcut: 'G L' },
  { id: 'config', label: 'Settings', description: 'System configuration', shortcut: 'G S' },
  { id: 'backup', label: 'Maintenance', description: 'Backups and health', shortcut: 'G M' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Toggle would be handled by parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl pointer-events-auto overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                  <Command className="w-3 h-3" /> K
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    No commands found for "{query}"
                  </div>
                ) : (
                  filtered.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        onNavigate(cmd.id);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                        index === 0 ? 'bg-slate-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {cmd.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cmd.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cmd.shortcut && (
                          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};