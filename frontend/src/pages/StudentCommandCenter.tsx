import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { BookOpen, CalendarClock, CircleHelp, FileText, Library, LogOut, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';

type Tab = 'home' | 'library' | 'policies' | 'issues';
type IssuePreview = { category: string; priority: string; relatedRecord?: { type: string; id: number; title?: string; loanUuid?: string } | null };

export const StudentCommandCenter: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [issueText, setIssueText] = useState('');
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const user = (() => { try { return JSON.parse(localStorage.getItem('knust_lib_user') || '{}'); } catch { return {}; } })();

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([API.get('/library/my-library'), API.get('/library/issues/my')]);
      setData(a.data.data); setIssues(b.data.data || []);
    } catch { setNotice('Could not load all library information.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const analyse = () => {
    const s = issueText.toLowerCase();
    const category = /borrow|loan|due|return|renew|overdue/.test(s) ? 'BORROWING' : /reserv|hold|queue|pickup/.test(s) ? 'RESERVATION' : /login|password|account|email|student id|profile/.test(s) ? 'ACCOUNT' : /database|website|portal|page|error|not working|system/.test(s) ? 'SYSTEM' : /book|copy|barcode|shelf|catalog|catalogue/.test(s) ? 'CATALOGUE' : 'GENERAL';
    const priority = /urgent|emergency|blocked|exam|deadline/.test(s) ? 'HIGH' : /not working|missing|wrong|incorrect|problem|issue/.test(s) ? 'NORMAL' : 'LOW';
    setPreview({ category, priority });
  };

  const submitIssue = async () => {
    if (issueText.trim().length < 10) { setNotice('Please describe the problem in at least 10 characters.'); return; }
    if (!preview) { setNotice('Analyse the problem first so you can review the suggested fields.'); return; }
    try {
      const response = await API.post('/library/issues/intake', { description: issueText });
      setIssueText(''); setPreview(null); setNotice(response.data.message || 'Issue submitted to library staff.'); await load();
    } catch (e: any) { setNotice(e.response?.data?.error || 'Could not submit issue.'); }
  };

  const logout = () => { localStorage.removeItem('knust_lib_token'); localStorage.removeItem('knust_lib_user'); window.location.href = '/login'; };
  const nav: Array<[Tab, string, React.ElementType]> = [['home', 'Overview', BookOpen], ['library', 'My Library', Library], ['policies', 'Policies', ShieldCheck], ['issues', 'Report a Library Issue', CircleHelp]];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4"><div><div className="text-xs font-black uppercase tracking-[.2em] text-[#7A1C2C]">KNUST Library</div><h1 className="text-xl font-black">Student Command Center</h1></div><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><b className="text-sm">{user.fullName || 'Student'}</b><p className="text-xs text-slate-500">{user.studentId || user.email || ''}</p></div><button onClick={logout} className="rounded-xl border p-2"><LogOut className="h-4 w-4" /></button></div></div></header>
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit rounded-2xl border bg-white p-3 shadow-sm"><div className="mb-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Services</div>{nav.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${tab === id ? 'bg-[#7A1C2C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</aside>
      <main>{notice && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{notice}</div>}{loading ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading your library...</div> : <>
        {tab === 'home' && <><Header title={`Welcome back, ${user.fullName?.split(' ')[0] || 'Student'}`} sub="Everything you need to borrow, reserve, understand policies and get library support." /><div className="mb-6 grid gap-4 md:grid-cols-3"><Metric label="Borrowed" value={data?.borrowed?.length || 0} icon={BookOpen} /><Metric label="Reservations" value={data?.reservations?.filter((r: any) => r.status === 'PENDING').length || 0} icon={CalendarClock} /><Metric label="Outstanding fines" value={`GH₵ ${Number((data?.fines || []).filter((f: any) => f.status !== 'PAID').reduce((n: number, f: any) => n + Number(f.amount || 0), 0)).toFixed(2)}`} icon={FileText} /></div><div className="mb-6 rounded-2xl bg-[#7A1C2C] p-6 text-white"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="text-lg font-black">Need help with the library?</div><p className="mt-1 text-sm text-white/75">Describe your problem in your own words. We will classify it and send it to library staff.</p></div><button onClick={() => setTab('issues')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#7A1C2C]"><CircleHelp className="h-4 w-4" />Report a Library Issue <ArrowRight className="h-4 w-4" /></button></div></div><div className="grid gap-5 lg:grid-cols-2"><Panel title="Current loans"><Loans items={data?.borrowed || []} /></Panel><Panel title="Reservations"><Reservations items={data?.reservations || []} /></Panel></div></>}
        {tab === 'library' && <><Header title="My Library" sub="Borrowed books and reservations are deliberately separated." /><Panel title="Borrowed books"><Loans items={data?.borrowed || []} /></Panel><div className="h-5" /><Panel title="Reservations"><Reservations items={data?.reservations || []} /></Panel><div className="mt-5 rounded-2xl border bg-white p-5 text-sm text-slate-600"><b>Borrow vs Reserve:</b> borrowing gives you a copy now; reservation puts you in a queue when no copy is available. A reservation becomes a borrowing transaction only after the book is released to you.</div></>}
        {tab === 'policies' && <><Header title="Library Policies" sub="These values come from the system settings used by the library." /><div className="grid gap-5 md:grid-cols-2"><Panel title="Borrowing"><Policy label="Maximum books" value={data?.policies?.maxBooksPerStudent} /><Policy label="Loan period" value={`${data?.policies?.loanDurationDays} days`} /><Policy label="Renewals" value={data?.policies?.renewalLimit} /><Policy label="Grace period" value={`${data?.policies?.gracePeriodDays} days`} /></Panel><Panel title="Fines"><Policy label="Daily rate" value={`GH₵ ${data?.policies?.fineRatePerDay}`} /><Policy label="Maximum fine" value={`GH₵ ${data?.policies?.maxFineAmount}`} /></Panel></div></>}
        {tab === 'issues' && <><Header title="Report a Library Issue" sub="You do not need to choose a form or category. Explain what happened and review the suggested fields before submitting." /><div className="mb-5 grid gap-3 md:grid-cols-3"><Step n="1" title="Describe" text="Tell us what went wrong in your own words." /><Step n="2" title="Review" text="Analyse the description and review the suggested category and priority." /><Step n="3" title="Submit & track" text="Submit the issue and follow it from My Submitted Issues." /></div><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border bg-white p-6 shadow-sm"><label className="text-sm font-black">What happened?</label><textarea value={issueText} onChange={e => { setIssueText(e.target.value); setPreview(null); }} rows={8} placeholder="Example: I returned a book yesterday but my account still shows it as borrowed..." className="mt-3 w-full rounded-2xl border bg-slate-50 p-4 text-sm outline-none focus:border-[#7A1C2C]" /><div className="mt-4 flex flex-wrap gap-3"><button onClick={analyse} disabled={issueText.trim().length < 10} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40">Analyse Problem</button><button onClick={submitIssue} disabled={!preview || issueText.trim().length < 10} className="rounded-xl bg-[#7A1C2C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Submit Issue</button></div><p className="mt-3 text-xs text-slate-400">The submit button becomes available only after the suggested fields have been reviewed.</p></section><section className="rounded-2xl border bg-white p-6 shadow-sm"><b>Detected fields</b>{preview ? <div className="mt-5 space-y-4"><Policy label="Category" value={preview.category} /><Policy label="Priority" value={preview.priority} />{preview.relatedRecord && <Policy label="Related record" value={preview.relatedRecord.title || `${preview.relatedRecord.type} #${preview.relatedRecord.id}`} />}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Analyse your description to preview the fields before submitting.</p>}</section></div><div className="mt-5"><Panel title="My Submitted Issues">{issues.length ? issues.map(i => <div key={i.id} className="mb-3 rounded-xl border p-4"><div className="flex justify-between gap-3"><b>{i.title}</b><span className="text-xs font-bold uppercase">{i.status}</span></div><p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{i.description}</p></div>) : <p className="text-sm text-slate-500">No issues submitted.</p>}</Panel></div></>}
      </>}</main>
    </div>
  </div>;
};
const Header = ({ title, sub }: { title: string; sub: string }) => <div className="mb-6"><h2 className="text-3xl font-black tracking-tight">{title}</h2><p className="mt-1 text-slate-500">{sub}</p></div>;
const Metric = ({ label, value, icon: Icon }: any) => <div className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-[#7A1C2C]" /><div className="text-3xl font-black">{value}</div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div></div>;
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="mb-4 font-black">{title}</h3>{children}</section>;
const Loans = ({ items }: any) => <div className="space-y-3">{items.length ? items.map((l: any) => <div key={l.loanUuid} className="rounded-xl border p-4"><b>{l.book?.title || 'Book'}</b><p className="mt-1 text-xs text-slate-500">Due {new Date(l.dueDate).toLocaleDateString()} · {l.daysRemaining >= 0 ? `${l.daysRemaining} days remaining` : `${Math.abs(l.daysRemaining)} days overdue`}</p></div>) : <Empty text="No active borrowed books." />}</div>;
const Reservations = ({ items }: any) => <div className="space-y-3">{items.length ? items.slice(0, 5).map((r: any) => <div key={r.id} className="rounded-xl border p-4"><b>{r.book?.title || `Book #${r.targetId}`}</b><p className="mt-1 text-xs text-slate-500">{r.status}{r.queuePosition ? ` · Queue ${r.queuePosition}` : ''}</p></div>) : <Empty text="No reservations." />}</div>;
const Policy = ({ label, value }: any) => <div className="flex justify-between border-b py-3 text-sm last:border-0"><span className="text-slate-500">{label}</span><b>{value ?? '—'}</b></div>;
const Step = ({ n, title, text }: { n: string; title: string; text: string }) => <div className="rounded-xl border bg-white p-4"><div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#7A1C2C] text-xs font-black text-white">{n}</div><b>{title}</b><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
