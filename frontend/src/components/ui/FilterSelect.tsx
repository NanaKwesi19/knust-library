import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../utils/classNames';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Filter...',
  className,
  icon,
  ...props
}) => {
  return (
    <div className={cn('relative', className)}>
      {icon || (
        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl',
          'text-xs font-semibold text-slate-600 appearance-none cursor-pointer',
          'focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10',
          'transition-all duration-200'
        )}
        {...props}
      >
        <option value="ALL">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};