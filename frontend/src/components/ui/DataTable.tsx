import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { SkeletonTable } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  cell: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: 'search' | 'file' | 'inbox' | 'book' | 'users' | 'alert';
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  keyExtractor: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  sortField,
  sortDirection,
  onSort,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <SkeletonTable rows={5} cols={columns.length} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return (
    <div className={cn('overflow-x-auto border border-slate-200 rounded-xl', className)}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'p-3.5 select-none',
                  col.sortable && 'cursor-pointer hover:text-slate-600',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right'
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className={cn('flex items-center gap-1', col.align === 'center' && 'justify-center', col.align === 'right' && 'justify-end')}>
                  {col.header}
                  {col.sortable && (
                    <span className="text-slate-300">
                      {sortField === col.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white font-medium">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="hover:bg-slate-50/40 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'p-3.5',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}