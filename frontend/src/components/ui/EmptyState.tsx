import React from 'react';
import { cn } from '../../utils/classNames';
import { Search, FileX, Inbox, BookOpen, Users, AlertCircle, Shield } from 'lucide-react';

const icons = {
  search: Search,
  file: FileX,
  inbox: Inbox,
  book: BookOpen,
  users: Users,
  alert: AlertCircle,
  shield: Shield, 
};

type EmptyIcon = keyof typeof icons;

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: EmptyIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No results found',
  description = 'There are no items to display at the moment.',
  icon = 'inbox',
  action,
  className,
}) => {
  const Icon = icons[icon];

  // Safety check for invalid icon
  if (!Icon) {
    console.warn(`EmptyState: Invalid icon "${icon}", falling back to "inbox"`);
  }
  const SafeIcon = Icon || Inbox;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
        <SafeIcon className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="text-sm font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-xs font-bold text-[#7A1C2C] hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};