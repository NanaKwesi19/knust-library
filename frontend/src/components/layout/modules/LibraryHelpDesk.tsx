import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  AlertCircle, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock,
  CreditCard, FileText, HelpCircle, Library, MessageSquare, Search,
  Sparkles, UserRound, Wrench,
} from 'lucide-react';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

interface RelatedRecord {
  type?: 'LOAN' | 'RESERVATION' | 'BOOK' | string;
  id?: number;
  title?: string;
  status?: string;
  author?: string;
  loanUuid?: string;
  dueDate?: string;
  createdAt?: string;
  isbn?: string | null;
  targetId?: string;
}

interface ExtractedIssue {
  category?: string;
  priority?: string;
  relatedRecord?: RelatedRecord | null;
  [key: string]: unknown;
}

interface AnalysisResult {
  extracted?: ExtractedIssue;
  candidates?: RelatedRecord[];
}

const issueTypes = [
  { title: 'Borrowing & Returns', description: 'Books, returns, renewals or overdue items.', icon: BookOpen },
  { title: 'Reservations', description: 'Reserved books, queues or reservation problems.', icon: CalendarDays },
  { title: 'Fines & Payments', description: 'Fines, payments or payment-related questions.', icon: CreditCard },
  { title: 'Catalog & Books', description: 'Missing books, incorrect details or availability.', icon: Library },
  { title: 'Digital Library', description: 'E-resources, access or digital content.', icon: Search },
  { title: 'Account & Student ID', description: 'Profile, access or library account problems.', icon: UserRound },
];

export default function LibraryHelpDesk() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RelatedRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeSection, setActiveSection] = useState<'help' | 'issues'>('help');

  const { data, isLoading } = useQuery({
    queryKey: ['libraryIssues'],
    queryFn: async () => (await API.get('/library/issues/my')).data,
    refetchInterval: 30000,
  });

  const analyseMutation = useMutation({
    mutationFn: async () => (await API.post('/library/issues/analyse', { description })).data,
    onSuccess: (response) => {
      const result: AnalysisResult = response.data || {};
      setAnalysis(result);
      setSelectedRecord(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => (await API.post('/library/issues/submit', {
      description,
      category: analysis?.extracted?.category || 'GENERAL',
      priority: analysis?.extracted?.priority || 'NORMAL',
      relatedRecord: selectedRecord,
    })).data,
    onSuccess: () => {
      setAnalysis(null);
      setSelectedRecord(null);
      setDescription('');
      setShowForm(false);
      setActiveSection('issues');
      queryClient.invalidateQueries({ queryKey: ['libraryIssues'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const tickets: Ticket[] = data?.data || [];
  const counts = useMemo(() => ({
    all: tickets.length,
    pending: tickets.filter(t => t.status === 'PENDING').length,
    progress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
  }), [tickets]);

  const statusConfig = (status: Ticket['status']) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return { label: 'Resolved', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (status === 'IN_PROGRESS') return { label: 'In Progress', icon: <Clock className="w-3 h-3" />, cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'Pending Review', icon: <AlertCircle className="w-3 h-3" />, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const startIssue = (type?: string) => {
    setShowForm(true);
    setAnalysis(null);
    setSelectedRecord(null);
    setActiveSection('help');
    if (type) setDescription(`I need help with ${type.toLowerCase()}. `);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setSelectedRecord(null);
  };

  const recordLabel = (record: RelatedRecord) => {
    if (record.type === 'LOAN') return 'Borrowed book';
    if (record.type === 'RESERVATION') return 'Reservation';
    if (record.type === 'BOOK') return 'Catalog book';
    return 'Library record';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#7A1C2C] p-7 md:p-9 text-white shadow-sm">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-200"><HelpCircle className="w-3.5 h-3.5" /> Library Support Center</div>
          <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">How can we help?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Tell us what happened in your own words. The library system can identify the likely issue, connect it to a relevant library record and route it for staff attention.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => startIssue()} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-[#5b111f] hover:bg-amber-300 transition-colors"><MessageSquare className="w-4 h-4" /> Report a Library Issue <ChevronRight className="w-3.5 h-3.5" /></button>
            <button onClick={() => setActiveSection('issues')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition-colors"><Wrench className="w-4 h-4" /> My Issues ({counts.all})</button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-1 border-b border-slate-200">
        <button onClick={() => setActiveSection('help')} className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${activeSection === 'help' ? 'border-[#7A1C2C] text-[#7A1C2C]' : 'border-transparent text-slate-400'}`}>Get Help</button>
        <button onClick={() => setActiveSection('issues')} className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${activeSection === 'issues' ? 'border-[#7A1C2C] text-[#7A1C2C]' : 'border-transparent text-slate-400'}`}>My Reported Issues</button>
      </div>

      {activeSection === 'help' ? (
        <div className="space-y-6">
          {!showForm ? (
            <>
              <section>
                <div className="flex items-end justify-between mb-3"><div><h3 className="text-sm font-black text-slate-900">Common library problems</h3><p className="text-xs text-slate-500 mt-1">Choose a starting point or describe anything else below.</p></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {issueTypes.map(({ title, description: text, icon: Icon }) => (
                    <button key={title} onClick={() => startIssue(title)} className="group text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#7A1C2C]/30 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7A1C2C]/10 text-[#7A1C2C]"><Icon className="w-4 h-4" /></span><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#7A1C2C]" /></div>
                      <h4 className="mt-3 text-xs font-black text-slate-800">{title}</h4><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-600" /></div><div><h3 className="text-sm font-black text-slate-900">Smart issue reporting</h3><p className="text-xs text-slate-500 mt-1 leading-5">You do not need to know the technical category. Describe the problem naturally and the system will help identify the relevant details.</p></div></div>
                <button onClick={() => startIssue()} className="mt-5 w-full rounded-xl border border-dashed border-slate-300 py-4 text-xs font-bold text-slate-600 hover:border-[#7A1C2C]/40 hover:text-[#7A1C2C] transition-colors">Tell us what happened <span className="text-slate-400">→</span></button>
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2 text-[#7A1C2C]"><Sparkles className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Smart Issue Intake</span></div><h3 className="mt-2 text-lg font-black text-slate-900">{analysis ? 'Review your issue' : 'Tell us what happened'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{analysis ? 'Check what the system detected before your issue is submitted. Nothing has been submitted yet.' : 'Write naturally. Include the book, reservation or service involved if you know it, but do not worry about filling technical fields.'}</p></div><button type="button" onClick={() => { setShowForm(false); resetAnalysis(); }} className="text-xs font-bold text-slate-400 hover:text-slate-700">Cancel</button></div>

              {!analysis ? (
                <form onSubmit={(e) => { e.preventDefault(); analyseMutation.mutate(); }} className="space-y-4">
                  <div className="relative"><FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} rows={7} placeholder="Example: I returned Introduction to Algorithms yesterday but my account still shows it as borrowed and I'm worried about getting a fine." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 text-sm text-slate-700 resize-none leading-relaxed" /></div>
                  <div className="flex items-center justify-between gap-3"><p className="text-[10px] text-slate-400">Minimum 10 characters. The first step analyses your description only; it does not submit an issue.</p><button type="submit" disabled={analyseMutation.isPending || description.trim().length < 10} className="shrink-0 inline-flex items-center gap-2 bg-[#7A1C2C] hover:bg-[#631422] text-white font-bold px-5 py-3 rounded-xl disabled:opacity-40 transition-colors"><Sparkles className="w-4 h-4 text-amber-300" />{analyseMutation.isPending ? 'Analysing...' : 'Analyse Problem'}</button></div>
                  {analyseMutation.isError && <p className="text-xs text-rose-600">{(analyseMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not analyse the issue.'}</p>}
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your description</div><p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{description}</p></div>
                  <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Detected details</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="rounded-xl bg-white border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Category</span><p className="mt-1 text-xs font-bold text-slate-800">{analysis.extracted?.category || 'Not detected'}</p></div><div className="rounded-xl bg-white border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Priority</span><p className="mt-1 text-xs font-bold text-slate-800">{analysis.extracted?.priority || 'Normal'}</p></div></div></div>

                  <div><div className="flex items-center justify-between gap-3 mb-2"><div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Related library record</div><p className="text-xs text-slate-500 mt-1">This is only a suggestion. Choose it only if it is the record involved.</p></div>{selectedRecord && <button type="button" onClick={() => setSelectedRecord(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">Clear selection</button>}</div>
                    {selectedRecord ? <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Selected · {recordLabel(selectedRecord)}</span><h4 className="mt-1 text-sm font-black text-slate-900">{selectedRecord.title || 'Library record'}</h4><p className="mt-1 text-xs text-slate-500">{selectedRecord.status ? `Status: ${selectedRecord.status}` : ''}{selectedRecord.dueDate ? ` · Due ${new Date(selectedRecord.dueDate).toLocaleDateString()}` : ''}</p></div><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /></div></div> : (analysis.candidates && analysis.candidates.length > 0 ? <div className="space-y-2">{analysis.candidates.map((record, index) => <button type="button" key={`${record.type}-${record.id}-${index}`} onClick={() => setSelectedRecord(record)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#7A1C2C]/40 hover:shadow-sm transition-all"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{recordLabel(record)}</span><h4 className="mt-1 text-sm font-bold text-slate-800">{record.title || 'Library record'}</h4><p className="mt-1 text-[11px] text-slate-500">{record.status ? `Status: ${record.status}` : ''}{record.dueDate ? ` · Due ${new Date(record.dueDate).toLocaleDateString()}` : ''}{record.author ? ` · ${record.author}` : ''}</p></div><ChevronRight className="w-4 h-4 text-slate-300 mt-1" /></div></button>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">No matching record was found. You can submit this issue without linking a record.</div>)}
                    <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedRecord(null)} className={`rounded-xl px-3 py-2 text-[11px] font-bold border ${selectedRecord === null ? 'border-[#7A1C2C] text-[#7A1C2C] bg-[#7A1C2C]/5' : 'border-slate-200 text-slate-500'}`}>None of these</button><button type="button" onClick={resetAnalysis} className="rounded-xl px-3 py-2 text-[11px] font-bold border border-slate-200 text-slate-500 hover:text-slate-800">Edit description</button></div>
                  </div>

                  {submitMutation.isError && <p className="text-xs text-rose-600">{(submitMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not submit the issue.'}</p>}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-[10px] text-slate-400">Nothing is submitted until you confirm below.</p><button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="inline-flex items-center justify-center gap-2 bg-[#7A1C2C] hover:bg-[#631422] text-white font-bold px-5 py-3 rounded-xl disabled:opacity-40 transition-colors"><CheckCircle2 className="w-4 h-4 text-amber-300" />{submitMutation.isPending ? 'Submitting...' : 'Confirm & Submit Issue'}</button></div>
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900">My Reported Issues</h3><p className="text-xs text-slate-500 mt-1">Track the library issues you have submitted.</p></div><button onClick={() => startIssue()} className="text-xs font-bold text-[#7A1C2C] hover:underline">Report another issue</button></div><div className="grid grid-cols-4 gap-2 mt-5"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">All</p><p className="text-lg font-black">{counts.all}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] text-amber-600">Pending</p><p className="text-lg font-black text-amber-800">{counts.pending}</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-[10px] text-blue-600">In progress</p><p className="text-lg font-black text-blue-800">{counts.progress}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] text-emerald-600">Resolved</p><p className="text-lg font-black text-emerald-800">{counts.resolved}</p></div></div></div>
          {isLoading ? <div className="py-14 text-center text-xs text-slate-400">Loading issue history...</div> : tickets.length === 0 ? <div className="py-14 text-center"><ClipboardEmpty /><p className="mt-3 text-sm font-bold text-slate-700">No issues reported yet</p><p className="mt-1 text-xs text-slate-400">If something goes wrong, describe it and we'll help route it.</p><button onClick={() => startIssue()} className="mt-4 rounded-xl bg-[#7A1C2C] px-4 py-2.5 text-xs font-bold text-white">Report a Library Issue</button></div> : <div className="divide-y divide-slate-100">{tickets.map(ticket => { const cfg = statusConfig(ticket.status); return <div key={ticket.id} className="p-5 hover:bg-slate-50/70 transition-colors"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h4 className="text-sm font-bold text-slate-900 truncate">{ticket.title}</h4><p className="text-[10px] text-slate-400 mt-1">Issue #{ticket.id} · {new Date(ticket.createdAt).toLocaleString()}</p></div><span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase ${cfg.cls}`}>{cfg.icon}{cfg.label}</span></div><p className="text-xs text-slate-500 mt-3 leading-5">{ticket.description}</p></div>; })}</div>}
        </section>
      )}
    </div>
  );
}

function ClipboardEmpty() {
  return <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center"><FileText className="w-5 h-5 text-slate-400" /></div>;
}
