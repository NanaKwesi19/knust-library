import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, CheckCircle2, Clock, Loader2, ShieldCheck, X } from 'lucide-react';
import API from '../../../services/api';

export type LibraryTransactionType = 'BORROW' | 'RESERVE';

type Props = {
  type: LibraryTransactionType;
  bookTitle: string;
  onCancel: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
};

export default function LibraryTransactionRules({
  type,
  bookTitle,
  onCancel,
  onContinue,
  isSubmitting = false,
}: Props) {
  const [accepted, setAccepted] = React.useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['libraryPolicies'],
    queryFn: async () => (await API.get('/library/policies')).data,
    staleTime: 60_000,
  });

  const policy = data?.data;
  const borrowing = policy?.borrowing;
  const fines = policy?.fines;
  const isBorrow = type === 'BORROW';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#800020] mb-1">
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isBorrow ? 'Borrowing Rules' : 'Reservation Rules'}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900">Review before you continue</h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{bookTitle}</p>
          </div>
          <button onClick={onCancel} disabled={isSubmitting} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs font-semibold">Loading current library rules...</span>
            </div>
          ) : isError || !policy ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-800">Rules could not be loaded</p>
                <p className="text-[11px] text-rose-700 mt-1">We won't let you confirm this transaction until the current library policy is available.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isBorrow ? (
                  <>
                    <Rule icon={<Clock />} label="Loan period" value={`${borrowing?.loanDurationDays ?? '—'} days`} />
                    <Rule icon={<BookOpen />} label="Active loan limit" value={`${borrowing?.maxBooksPerStudent ?? '—'} books`} />
                    <Rule icon={<ShieldCheck />} label="Renewal limit" value={`${borrowing?.renewalLimit ?? '—'} renewal${borrowing?.renewalLimit === 1 ? '' : 's'}`} />
                    <Rule icon={<AlertTriangle />} label="Grace period" value={`${borrowing?.gracePeriodDays ?? '—'} day${borrowing?.gracePeriodDays === 1 ? '' : 's'}`} />
                  </>
                ) : (
                  <>
                    <Rule icon={<Clock />} label="Queue" value="First-come, first-served" />
                    <Rule icon={<ShieldCheck />} label="Notification" value="You'll be notified when eligible" />
                    <Rule icon={<BookOpen />} label="Eligibility" value="Subject to current library policy" />
                    <Rule icon={<AlertTriangle />} label="Fines" value={fines ? `GH₵${Number(fines.fineRatePerDay).toFixed(2)}/day overdue` : 'See current policy'} />
                  </>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#800020]" />
                  <span className="text-xs font-black text-slate-800">Current system policy</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  These rules are read directly from the library system settings. The values shown here are the rules that apply when you confirm this request.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 w-4 h-4 accent-[#800020]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  I have read and agree to the current {isBorrow ? 'borrowing' : 'reservation'} rules and understand that the request is subject to library policy.
                </span>
              </label>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onCancel} disabled={isSubmitting} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white border border-slate-200">
            Cancel
          </button>
          <button
            onClick={onContinue}
            disabled={!accepted || isLoading || isError || !policy || isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#800020] hover:bg-[#66001a] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function Rule({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-xs font-black text-slate-700">{value}</div>
    </div>
  );
}
