import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatCurrency, formatRelative } from '../../../utils/formatters';
import { AlertTriangle, Mail, BookOpen, User, Clock } from 'lucide-react';

interface OverdueLoan {
  loanUuid: string;
  dueDate: string;
  daysOverdue: number;
  fineAccumulated: number;
  user: {
    fullName: string;
    email: string;
    studentId: string | null;
  };
  copy: {
    barcode: string;
    book: {
      title: string;
      author: string;
    };
  };
}

export const OverdueLoans: React.FC = () => {
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['overdueLoans'],
    queryFn: async () => {
      const res = await API.get('/loans/overdue');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const handleSendReminder = (email: string) => {
    addToast('Reminder Sent to ' + email, 'success');
  };

  const overdueLoans: OverdueLoan[] = data?.data || [];

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <Card>
      <CardHeader
        action={
          <Badge variant="danger" size="sm" dot>
            {overdueLoans.length} overdue
          </Badge>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Overdue Loans
        </CardTitle>
      </CardHeader>

      {overdueLoans.length === 0 ? (
        <EmptyState
          title="No overdue loans"
          description="All books are currently returned on time. Great!"
          icon="book"
        />
      ) : (
        <div className="space-y-3 px-5 pb-5">
          {overdueLoans.map((loan) => (
            <div
              key={loan.loanUuid}
              className="border border-rose-200 bg-rose-50/30 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-8 rounded bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{loan.copy.book.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{loan.copy.book.author}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{loan.copy.barcode}</div>
                  </div>
                </div>
                <Badge variant="danger" size="sm">{loan.daysOverdue}d overdue</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-medium">{loan.user.fullName}</span>
                  <span className="font-mono text-[10px] text-slate-400">{loan.user.studentId || '-'}</span>
                </div>
                <div className="text-xs font-bold text-rose-600">
                  {formatCurrency(loan.fineAccumulated)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-rose-100">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  Due: {formatDate(loan.dueDate)} ({formatRelative(loan.dueDate)})
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Mail className="w-3 h-3" />}
                  onClick={() => handleSendReminder(loan.user.email)}
                >
                  Send Reminder
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};