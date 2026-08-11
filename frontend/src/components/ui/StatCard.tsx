import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { SkeletonCard } from './Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-slate-50',
  iconColor = 'text-slate-600',
  trend,
  trendValue,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return <SkeletonCard className={className} />;
  }

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    neutral: 'text-slate-400',
  };

  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm',
        'flex items-center justify-between group',
        className
      )}
    >
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          {title}
        </span>
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {value}
        </h4>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 pt-0.5">
            {trend && TrendIcon && (
              <span className={cn('flex items-center gap-1 text-[10px] font-bold', trendColors[trend])}>
                <TrendIcon className="w-3 h-3" />
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-slate-400 font-medium">{subtitle}</span>
            )}
          </div>
        )}
      </div>
      <div className={cn(
        'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
        'border transition-transform duration-200 group-hover:scale-105',
        iconBg,
        iconColor
      )}>
        {icon}
      </div>
    </motion.div>
  );
};