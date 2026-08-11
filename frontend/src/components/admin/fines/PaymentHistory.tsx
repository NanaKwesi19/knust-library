import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { Receipt, CreditCard, Coins, Smartphone, CheckCircle2 } from 'lucide-react';

interface PaymentRecord {
  id: number;
  reference: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  user: {
    fullName: string;
    studentId: string | null;
  };
  fine: {
    id: number;
    reason: string;
  };
}

export const PaymentHistory: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: async () => {
      const res = await API.get('/loans/fines/payments?limit=20');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const payments: PaymentRecord[] = data?.data || [];

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'MTN_MOBILE_MONEY': return <Smartphone className="w-3.5 h-3.5" />;
      case 'BANK_TRANSFER': return <CreditCard className="w-3.5 h-3.5" />;
      default: return <Coins className="w-3.5 h-3.5" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'MTN_MOBILE_MONEY': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'BANK_TRANSFER': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          Recent Payments
        </CardTitle>
      </CardHeader>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payment records will appear here when fines are paid."
          icon="inbox"
        />
      ) : (
        <div className="space-y-3 px-5 pb-5">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${getMethodColor(payment.method)}`}>
                  {getMethodIcon(payment.method)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">{payment.user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{payment.user.studentId || '-'}</div>
                  <div className="text-[10px] text-slate-400">{payment.fine.reason}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black text-emerald-600">{formatCurrency(payment.amount)}</div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                    {payment.status}
                  </Badge>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">{formatDate(payment.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};