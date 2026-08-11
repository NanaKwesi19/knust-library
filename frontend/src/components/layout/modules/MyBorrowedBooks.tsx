import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { BookOpen, Clock, AlertCircle, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';

export default function MyBorrowedBooks() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['myLibrary'],
    queryFn: async () => (await API.get('/library/my-library')).data,
  });
  const renew = useMutation({
    mutationFn: async (loanUuid: string) => (await API.post(`/library/loans/${loanUuid}/renew`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#800020] animate-spin" /></div>;
  const loans = data?.data?.borrowed || [];
  const renewalLimit = data?.data?.policies?.renewalLimit ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100"><h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#800020]" /> My Borrowed Books</h2><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold">{loans.length} items</span></div>
        {renew.isError && <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{(renew.error as any)?.response?.data?.error || 'Renewal failed.'}</div>}
        {renew.isSuccess && <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">{renew.data?.message}</div>}
        {loans.length === 0 ? <div className="py-12 text-center"><BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" /><p className="text-xs font-bold text-slate-600">No borrowed books</p><p className="text-[11px] text-slate-400 mt-1">Visit the catalogue to borrow a book.</p></div> : (
          <div className="space-y-3 mt-4">
            {loans.map((loan: any) => {
              const canRenew = loan.status !== 'OVERDUE' && loan.renewalCount < renewalLimit;
              return <div key={loan.loanUuid} className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-bold text-slate-900">{loan.book?.title}</h3><span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{loan.book?.category}</span></div><p className="text-xs text-slate-500 mt-1">By {loan.book?.author}</p><div className="flex flex-wrap gap-4 text-[10px] text-slate-400 mt-2"><span><Clock className="w-3 h-3 inline mr-1" />Borrowed {new Date(loan.borrowedAt).toLocaleDateString()}</span><span><AlertCircle className="w-3 h-3 inline mr-1" />Due {new Date(loan.dueDate).toLocaleDateString()}</span></div></div>
                  <div className="flex items-center gap-3"><span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full border ${loan.daysRemaining <= 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : loan.daysRemaining <= 3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{loan.daysRemaining <= 0 ? <><AlertCircle className="w-2.5 h-2.5" /> Overdue</> : loan.daysRemaining <= 3 ? <><Clock className="w-2.5 h-2.5" /> {loan.daysRemaining} days left</> : <><CheckCircle2 className="w-2.5 h-2.5" /> {loan.daysRemaining} days left</>}</span>{canRenew ? <button onClick={() => renew.mutate(loan.loanUuid)} disabled={renew.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#800020] text-white text-[10px] font-bold rounded-lg disabled:opacity-40"><RotateCcw className="w-3 h-3" /> Renew</button> : <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-1 rounded">{loan.renewalCount >= renewalLimit ? 'Max renewals' : 'Not renewable'}</span>}</div>
                </div>
                {loan.fineAmount > 0 && <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-rose-600 font-semibold">Fine accrued: GH₵{Number(loan.fineAmount).toFixed(2)}</div>}
              </div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
