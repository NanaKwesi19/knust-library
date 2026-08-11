import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card } from '../../ui/Card';
import { Scale, Clock, AlertTriangle, BookOpen, ShieldCheck } from 'lucide-react';

export default function LibraryPolicies() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['libraryPolicies'],
    queryFn: async () => (await API.get('/library/policies')).data,
  });

  const policy = data?.data;
  const borrowing = policy?.borrowing;
  const fines = policy?.fines;

  if (isLoading) return <div className="py-16 text-center text-sm text-slate-500">Loading current library policies...</div>;
  if (isError || !policy) return <div className="py-16 text-center text-sm text-rose-600">Unable to load the current library policies.</div>;

  const cards = [
    {
      icon: <Scale className="w-5 h-5" />,
      title: 'Borrowing Rules',
      body: `Students may have up to ${borrowing.maxBooksPerStudent} active books. The standard loan period is ${borrowing.loanDurationDays} days and the current renewal limit is ${borrowing.renewalLimit}.`
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'Fines & Lost Books',
      body: `Overdue fines accrue at GH₵${Number(fines.fineRatePerDay).toFixed(2)} per day, capped at GH₵${Number(fines.maxFineAmount).toFixed(2)}. Lost-book rules apply after ${fines.lostBookDaysThreshold} days.`
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'Renewals & Grace Period',
      body: `You currently have ${borrowing.renewalLimit} renewal${borrowing.renewalLimit === 1 ? '' : 's'} available. The configured grace period is ${borrowing.gracePeriodDays} day${borrowing.gracePeriodDays === 1 ? '' : 's'}.`
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Reservations',
      body: 'A book hold is for an unavailable book. Reservations are queued by request time; when a copy becomes available, the next eligible student is notified.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: 'Source of Truth',
      body: 'These rules are read directly from the library system settings. If a librarian changes a policy, this page updates without requiring a frontend code change.'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Rules & Policies</h2>
        <p className="text-sm text-slate-500 mt-1">{policy.libraryName} • Current system configuration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(card => (
          <Card key={card.title} className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#7A1C2C]">
              {card.icon}
              <h3 className="font-bold">{card.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{card.body}</p>
          </Card>
        ))}
      </div>
      {policy.openingHours && (
        <Card className="p-6">
          <h3 className="font-bold text-slate-900 mb-4">Opening Hours</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(policy.openingHours as Record<string, any>).map(([day, hours]) => (
              <div key={day} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-bold text-slate-700">{day}</p>
                <p className="text-[11px] text-slate-500 mt-1">{hours.closed ? 'Closed' : `${hours.open} – ${hours.close}`}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
