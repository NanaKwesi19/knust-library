import React from 'react';
import { cn } from '../../utils/classNames';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Download, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  onExport?: () => void;
  actions?: React.ReactNode;
  isLoading?: boolean;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  className,
  onExport,
  actions,
  isLoading = false,
}) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            {actions}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export
              </Button>
            )}
          </div>
        }
      >
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="h-[250px] bg-slate-50 rounded-xl animate-pulse" />
        ) : (
          children
        )}
      </div>
    </Card>
  );
};