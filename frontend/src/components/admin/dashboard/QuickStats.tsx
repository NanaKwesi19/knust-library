import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/classNames';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QuickStatProps {
  label: string;
  value: string | number;
  change?: number | null;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'rose' | 'emerald' | 'amber';
  isLoading?: boolean;
}

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', icon: 'text-purple-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', icon: 'text-rose-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', icon: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', icon: 'text-amber-600' },
};

export const QuickStat: React.FC<QuickStatProps> = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  color,
  isLoading = false,
}) => {
  const colors = colorMap[color];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
        <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
        <div className="h-2 bg-slate-200 rounded w-20" />
      </div>
    );
  }

  const TrendIcon = change === undefined || change === null
    ? Minus
    : change >= 0
    ? TrendingUp
    : TrendingDown;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'bg-white rounded-2xl border p-5 flex items-center justify-between',
        colors.border
      )}
    >
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          {label}
        </span>
        <div className="text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </div>
        {change !== undefined && change !== null && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-bold',
            change >= 0 ? 'text-emerald-600' : 'text-rose-600'
          )}>
            <TrendIcon className="w-3 h-3" />
            {change >= 0 ? '+' : ''}{change}%
            {changeLabel && <span className="text-slate-400 font-medium ml-1">{changeLabel}</span>}
          </div>
        )}
      </div>
      <div className={cn(
        'h-11 w-11 rounded-xl flex items-center justify-center',
        colors.bg
      )}>
        <span className={colors.icon}>{icon}</span>
      </div>
    </motion.div>
  );
};