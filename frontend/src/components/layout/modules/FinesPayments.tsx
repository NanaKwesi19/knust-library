import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Receipt, AlertCircle, CheckCircle2, Clock, BookOpen, Loader2 } from 'lucide-react';

interface Fine {
  id: number;
  bookTitle: string;
  bookAuthor: string;
  loanUuid: string;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'WAIVED';
  reason: string;
  description?: string;
  createdAt: string;
}

interface FinesSummary {
  fines: Fine[];
  totalUnpaid: number;
}

export default function FinesPayments() {
  const { data, isLoading } = useQuery({
    queryKey: ['studentFines'],
    queryFn: async () => {
      const res = await API.get('/student/fines');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading fines...</p>
      </div>
    );
  }

  const summary: FinesSummary = data?.data || { fines: [], totalUnpaid: 0 };
  const fines: Fine[] = summary.fines || [];
  const totalUnpaid: number = summary.totalUnpaid || 0;

  return (
    <div className="space-y-6">
      {/* Total Fine Card */}
      <div className="bg-gradient-to-r from-[#800020] to-[#66001a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-amber-300 font-medium tracking-wide uppercase">Total Unpaid Fines</p>
            <h2 className="text-3xl font-bold">GH₵{totalUnpaid.toFixed(2)}</h2>
            <p className="text-xs text-white/70">
              {fines.filter((f) => f.status === 'UNPAID').length} outstanding {fines.filter((f) => f.status === 'UNPAID').length === 1 ? 'fine' : 'fines'}
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <Receipt className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Fines List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#800020]" />
            Fine History
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            {fines.length} records
          </span>
        </div>

        {fines.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No fines on your account</p>
            <p className="text-[11px] text-slate-400 mt-1">Keep returning books on time to stay fine-free.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fines.map((fine) => (
              <div key={fine.id} className="border border-slate-200/80 rounded-xl p-4 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{fine.bookTitle}</h3>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        fine.status === 'UNPAID'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : fine.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {fine.status === 'UNPAID' && <AlertCircle className="w-2.5 h-2.5" />}
                        {fine.status === 'PAID' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {fine.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">By {fine.bookAuthor}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Loan: {fine.loanUuid}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(fine.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {fine.description && (
                      <p className="text-[10px] text-slate-500 italic">{fine.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`text-lg font-bold ${fine.status === 'UNPAID' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      GH₵{fine.amount.toFixed(2)}
                    </span>
                    <p className="text-[9px] text-slate-400 font-medium">{fine.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}