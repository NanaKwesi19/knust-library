import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { AlertCircle, CheckCircle2, Clock, ClipboardList, FileText, Sparkles, Wrench } from 'lucide-react';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export default function LibraryHelpDesk() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['libraryIssues'],
    queryFn: async () => (await API.get('/library/issues/my')).data,
    refetchInterval: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => (await API.post('/library/issues/intake', { description })).data,
    onSuccess: (response) => {
      setPreview(response.data.extracted);
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['libraryIssues'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const tickets: Ticket[] = data?.data || [];

  const statusConfig = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return { label: 'Resolved', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (status === 'IN_PROGRESS') return { label: 'In Progress', icon: <Clock className="w-3 h-3" />, cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'Pending Review', icon: <AlertCircle className="w-3 h-3" />, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-[#7A1C2C]/10 flex items-center justify-center"><Wrench className="w-5 h-5 text-[#7A1C2C]" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Report a Library Issue</h2>
            <p className="text-xs text-slate-500 mt-1">Just describe the problem naturally. The system will identify the likely category, priority and related library record for you.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="space-y-4">
          <div className="relative">
            <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={6}
              placeholder="Example: I borrowed Introduction to Algorithms two days ago, but my account still shows the book as available and I am worried the system may charge me incorrectly."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 text-sm text-slate-700 resize-none leading-relaxed"
            />
          </div>
          {submitMutation.isError && <p className="text-xs text-rose-600">{(submitMutation.error as any)?.response?.data?.error || 'Could not submit the issue.'}</p>}
          <button disabled={submitMutation.isPending || description.trim().length < 10} className="w-full flex items-center justify-center gap-2 bg-[#7A1C2C] hover:bg-[#631422] text-white font-bold py-3 rounded-xl disabled:opacity-40 transition-colors">
            <Sparkles className="w-4 h-4 text-[#DC9A22]" />
            {submitMutation.isPending ? 'Analysing & submitting...' : 'Analyse & Submit Issue'}
          </button>
        </form>

        {preview && (
          <div className="mt-5 rounded-2xl border border-[#DC9A22]/30 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3"><Sparkles className="w-4 h-4 text-[#DC9A22]" /> Smart intake result</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div><span className="text-slate-400 block">Category</span><strong>{preview.category}</strong></div>
              <div><span className="text-slate-400 block">Priority</span><strong>{preview.priority}</strong></div>
              <div><span className="text-slate-400 block">Related record</span><strong>{preview.relatedRecord?.title || 'Not automatically matched'}</strong></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-500" /> Your Library Issues</h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono font-bold">{tickets.length} tickets</span>
        </div>
        {isLoading ? <div className="py-12 text-center text-xs text-slate-400">Loading issue history...</div> : tickets.length === 0 ? <div className="py-12 text-center text-xs text-slate-400">No library issues reported.</div> : (
          <div className="space-y-3 mt-4">
            {tickets.map(ticket => { const cfg = statusConfig(ticket.status); return (
              <div key={ticket.id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><h4 className="text-sm font-bold text-slate-900">{ticket.title}</h4><p className="text-[10px] text-slate-400 mt-1">#{ticket.id} • {new Date(ticket.createdAt).toLocaleString()}</p></div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase ${cfg.cls}`}>{cfg.icon}{cfg.label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 whitespace-pre-line">{ticket.description}</p>
              </div>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}
