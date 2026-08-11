import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { BookOpen, Clock, AlertCircle, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';

interface Loan {
  loanUuid: string;
  bookTitle: string;
  author: string;
  category: string;
  borrowedAt: string;
  dueDate: string;
  daysRemaining: number;
  status: 'ACTIVE' | 'OVERDUE' | 'RETURNED';
  renewalCount: number;
  fineAmount: number;
}

export default function MyBorrowedBooks() {
  const queryClient = useQueryClient();
  const [renewMessage, setRenewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['studentBorrowedBooks'],
    queryFn: async () => {
      const res = await API.get('/student/borrowed-books');
      return res.data;
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (loanUuid: string) => {
      const res = await API.post(`/student/renew/${loanUuid}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studentBorrowedBooks'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      setRenewMessage({ type: 'success', text: data.message || 'Book renewed successfully!' });
      setTimeout(() => setRenewMessage(null), 4000);
    },
    onError: (error: any) => {
      setRenewMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to renew book.',
      });
      setTimeout(() => setRenewMessage(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading your borrowed books...</p>
      </div>
    );
  }

  const loans: Loan[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#800020]" />
            My Borrowed Books
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            {loans.length} {loans.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {renewMessage && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            renewMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {renewMessage.text}
          </div>
        )}

        {loans.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No borrowed books</p>
            <p className="text-[11px] text-slate-400 mt-1">Visit the catalogue to borrow your first book.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.loanUuid} className="border border-slate-200/80 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{loan.bookTitle}</h3>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                        {loan.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">By {loan.author}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Borrowed: {new Date(loan.borrowedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3 h-3" />
                        Due: {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full border ${
                      loan.daysRemaining <= 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : loan.daysRemaining <= 3
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {loan.daysRemaining <= 0 ? (
                        <><AlertCircle className="w-2.5 h-2.5" /> Overdue</>
                      ) : loan.daysRemaining <= 3 ? (
                        <><Clock className="w-2.5 h-2.5" /> {loan.daysRemaining} days left</>
                      ) : (
                        <><CheckCircle2 className="w-2.5 h-2.5" /> {loan.daysRemaining} days left</>
                      )}
                    </span>

                    {loan.status !== 'OVERDUE' && loan.renewalCount < 2 && (
                      <button
                        onClick={() => renewMutation.mutate(loan.loanUuid)}
                        disabled={renewMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#800020] hover:bg-[#66001a] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40"
                      >
                        {renewMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Renew
                      </button>
                    )}

                    {loan.renewalCount >= 2 && (
                      <span className="text-[9px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">
                        Max renewals
                      </span>
                    )}
                  </div>
                </div>

                {loan.fineAmount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-rose-600 font-semibold">
                    <AlertCircle className="w-3 h-3" />
                    Fine accrued: GH₵{loan.fineAmount.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}