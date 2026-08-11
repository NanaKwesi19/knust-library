import React from 'react';
import { cn } from '../../utils/classNames';

interface SkeletonProps {
  className?: string;
  count?: number;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  count = 1,
  width,
  height,
  circle = false,
}) => {
  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(
        'animate-pulse bg-slate-200 rounded-lg',
        circle && 'rounded-full',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  ));

  if (count === 1) return items[0];
  
  return <div className="space-y-2">{items}</div>;
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200 p-5 space-y-4', className)}>
    <div className="flex items-center justify-between">
      <Skeleton width={120} height={16} />
      <Skeleton width={40} height={40} circle />
    </div>
    <Skeleton width="60%" height={32} />
    <Skeleton width="80%" height={12} />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="space-y-3">
    <div className="flex gap-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="flex-1" height={12} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="flex-1" height={40} />
        ))}
      </div>
    ))}
  </div>
);