import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/classNames';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className }) => {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {children}
    </div>
  );
};

interface BentoItemProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const BentoItem: React.FC<BentoItemProps> = ({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  title,
  icon,
  action,
}) => {
  const colSpanClasses = {
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
  };

  const rowSpanClasses = {
    1: '',
    2: 'row-span-2',
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col',
        'hover:shadow-md hover:border-slate-300 transition-all duration-200',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {icon && <span className="text-slate-400">{icon}</span>}
            {title && (
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {title}
              </h3>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 p-5">{children}</div>
    </motion.div>
  );
};