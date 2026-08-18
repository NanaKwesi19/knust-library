import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import API from '../services/api';

type VerifyState = 'checking' | 'success' | 'pending' | 'failed';

/**
 * Landing page after a Paystack checkout redirect. Paystack appends
 * ?reference=... (or ?trxref=...) to the callback_url we gave it. The
 * webhook usually settles the fine before the student even gets here, but
 * we verify explicitly too in case the webhook hasn't landed yet.
 */
export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>('checking');

  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (!reference) {
      setState('failed');
      return;
    }

    let cancelled = false;
    const poll = async (attemptsLeft: number) => {
      try {
        const res = await API.get(`/payments/verify/${reference}`);
        const status = res.data?.data?.status;
        if (cancelled) return;

        if (status === 'COMPLETED') {
          setState('success');
        } else if (attemptsLeft > 0) {
          setTimeout(() => poll(attemptsLeft - 1), 2000);
        } else {
          setState('pending');
        }
      } catch {
        if (!cancelled) setState('failed');
      }
    };

    poll(4);
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
        {state === 'checking' && (
          <>
            <Loader2 className="w-10 h-10 text-[#800020] animate-spin mx-auto" />
            <h1 className="text-sm font-bold text-slate-800">Confirming your payment&hellip;</h1>
            <p className="text-xs text-slate-500">This only takes a moment.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h1 className="text-sm font-bold text-slate-800">Payment received</h1>
            <p className="text-xs text-slate-500">Your fine has been cleared. Thank you.</p>
          </>
        )}
        {state === 'pending' && (
          <>
            <Loader2 className="w-10 h-10 text-amber-500 mx-auto" />
            <h1 className="text-sm font-bold text-slate-800">Still confirming with the provider</h1>
            <p className="text-xs text-slate-500">This can take a minute. Check your fines page shortly - it will update automatically once confirmed.</p>
          </>
        )}
        {state === 'failed' && (
          <>
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h1 className="text-sm font-bold text-slate-800">We couldn't confirm that payment</h1>
            <p className="text-xs text-slate-500">If money left your account, it will still be reconciled automatically. Contact the library desk if it doesn't clear.</p>
          </>
        )}
        <button
          onClick={() => navigate('/')}
          className="mt-2 w-full text-xs font-bold text-white bg-[#800020] hover:bg-[#66001a] rounded-lg py-2.5 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
