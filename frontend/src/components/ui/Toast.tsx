import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  ArrowRight
} from 'lucide-react';
import type { ToastItem } from '../../context/ToastContext';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColorMap = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export const Toast: React.FC<{
  toast: ToastItem;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];
  const iconColor = iconColorMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto w-full max-w-sm rounded-xl border shadow-lg shadow-black/5 ${colors}`}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
        
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-sm font-bold mb-0.5">{toast.title}</h4>
          )}
          <p className="text-xs font-medium leading-relaxed opacity-90">
            {toast.message}
          </p>
          
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold hover:underline opacity-80 hover:opacity-100 transition-opacity"
            >
              {toast.action.label}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};