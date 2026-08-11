import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { BookOpen, CalendarClock, CircleHelp, FileText, Library, LogOut, RefreshCw, Search, ShieldCheck, Ticket, X } from 'lucide-react';

interface LibraryData {
  borrowed: any[];
  reservations: any[];
  fines: any[];
  policies: { maxBooksPerStudent: number; loanDurationDays: number; renewalLimit: number; gracePeriodDays: number; fineRatePerDay: number; maxFineAmount: number };
}

const StudentPortal: React.FC = () => {
  const [active, setActive] = useState<'overview' | 'library' | 'policies' | 'issues'>('overview');
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [issuePreview, setIssuePreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [libraryResponse, issuesResponse] = await Promise.all([
        API.get('/library/my-library'),
        API.get('/library/issues/my'),
      ]);
      setLibrary(libraryResponse.data.data);
      setIssues(issuesResponse.data.data || []);
    } catch (error) {
      console.error('Failed to load library portal', error);
      setMessage('Some library information could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const renew = async (loanUuid: string) => {
    try {
      const response = await API.post(`/library/loans/${loanUuid}/renew`);
      setMessage(response.data.message || 'Book renewed successfully.');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Unable to renew this book.');
    }
  };

  const cancelReservation = async (id: number) => {
    try {
      await API.delete(`/library/reservations/${id}`);
      setMessage('Reservation cancelled.');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Unable to cancel reservation.');
    }
  };

  const analyseIssue = () => {
    const text = description.toLowerCase();
    const category = /borrow|loan|due|return|renew|overdue/.test(text) ? 'BORROWING' : /reserv|hold|queue|pickup/.test(text) ? 'RESERVATION' : /login|password|account|email|student id|profile/.test(text) ? 'ACCOUNT' : /book|copy|barcode|shelf|catalog|catalogue/.test(text) ? 'CATALOGUE' : 'GENERAL';
    const priority = /urgent|emergency|blocked|exam|deadline/.test(text) ? 'HIGH' : /not working|missing|wrong|incorrect|problem|issue/.test(text) ? 'NORMAL' : 'LOW';
    setIssuePreview({ category, priority });
  };

  const submitIssue = async () => {
    if (description.trim().length < 10) { setMessage('Please describe the problem in at least 10 characters.'); return; }
    try {
      const response = await API.post('/library/issues/intake', { description });
      setIssuePreview(response.data.data.extracted);
      setDescription('');
      setMessage('Issue submitted successfully. Library staff can now review it.');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Unable to submit the issue.');
    }
  };

  const logout = () => {
    localStorage.removeItem('knust_lib_token');
    localStorage.removeItem('knust_lib_user');
    window.location.href = '/login';
  };

  const user = (() => { try { return JSON.parse(localStorage.getItem('knust_lib_user') || '{}'); } catch { return {}; } })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1C2C] text-white"><Library className="h-5 w-5" /></div><div><div className="font-black">KNUST Library</div><div className="text-xs text-slate-500">Student Library Portal</div></div></div>
          <div className="flex items-center gap-4"><div className="hidden text-right sm:block"><div className="text-sm font-bold">{user.fullName || 'Student'}</div><div className="text-xs text-slate-500">{user.studentId || user.email || ''}</div></div><button onClick={logout} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Sign out"><LogOut className="h-4 w-4" /></button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">My Library</div>
          {[['overview','Overview',BookOpen],['library','Borrowing & Reservations',Library],['policies','Library Policies',ShieldCheck],['issues','Report a Library Issue',CircleHelp]].map(([key,label,Icon]: any) => <button key={key} onClick={() => setActive(key)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${active === key ? 'bg-[#7A1C2C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}
        </aside>

        <main>
          {message && <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"><span>{message}</span><button onClick={() => setMessage('')}><X className="h-4 w-4" /></button></div>}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading your library...</div> : <>
            {active === 'overview' && <>
              <div className="mb-6"><p className="text-sm font-bold text-[#7A1C2C]">Student Library</p><h1 className="text-3xl font-black tracking-tight">Welcome back, {user.fullName?.split(' ')[0] || 'Student'}.</h1><p className="mt-1 text-slate-500">Everything about your borrowing, reservations and library support in one place.</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><Stat label="Borrowed" value={library?.borrowed.length || 0} icon={BookOpen} /><Stat label="Reservations" value={library?.reservations.filter(r => r.status === 'PENDING').length || 0} icon={CalendarClock} /><Stat label="Outstanding Fines" value={`GH₵ ${Number((library?.fines || []).filter(f => f.status !== 'PAID').reduce((s,f) => s + Number(f.amount || 0), 0)).toFixed(2)}`} icon={FileText} /></div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2"><Panel title="Current loans" action={() => setActive('library')}><LoanList loans={(library?.borrowed || []).slice(0,3)} renew={renew} compact /></Panel><Panel title="Reservations" action={() => setActive('library')}><ReservationList reservations={(library?.reservations || []).slice(0,3)} cancel={cancelReservation} compact /></Panel></div>
            </>}

            {active === 'library' && <><PageTitle title="Borrowing & Reservations" subtitle="A reservation is a queue position — it becomes a loan only after the book is released to you." /><div className="space-y-6"><Panel title={`Borrowed books (${library?.borrowed.length || 0})`}><LoanList loans={library?.borrowed || []} renew={renew} /></Panel><Panel title={`Reservations (${library?.reservations.length || 0})"><ReservationList reservations={library?.reservations || []} cancel={cancelReservation} /></Panel><Panel title="How it works"><div className="grid gap-4 md:grid-cols-3"><Step n="1" title="Find a book" text="Use the catalogue to see whether a copy is available." /><Step n="2" title="Borrow or reserve" text="Available means Borrow. Unavailable means Reserve and join the queue." /><Step n="3" title="Get access" text="When a reservation reaches you, the library notifies you and the copy can be checked out." /></div></Panel></div></>}

            {active === 'policies' && <><PageTitle title="Library Policies" subtitle="These rules are loaded from the library's current system settings." /><div className="grid gap-5 md:grid-cols-2"><Policy title="Borrowing" items={[`Maximum books: ${library?.policies.maxBooksPerStudent}`, `Standard loan period: ${library?.policies.loanDurationDays} days`, `Renewals allowed: ${library?.policies.renewalLimit}`, `Grace period: ${library?.policies.gracePeriodDays} days`]} /><Policy title="Fines" items={[`Daily fine rate: GH₵ ${library?.policies.fineRatePerDay}`, `Maximum fine: GH₵ ${library?.policies.maxFineAmount}`, 'Fines are tied to your loan record', 'Contact library staff if you believe a fine is incorrect']} /><div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900"><strong>Important:</strong> The rules displayed here come from the library configuration. If a policy changes, this page updates with the configured value.</div></div></>}

            {active === 'issues' && <><PageTitle title="Report a Library Issue" subtitle="Describe the problem naturally. The system will suggest the category and priority for you." /><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><label className="mb-2 block text-sm font-black">What happened?</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={7} placeholder="Example: I borrowed a book last week but my account still shows the wrong due date..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5" /><div className="mt-4 flex flex-wrap gap-3"><button onClick={analyseIssue} disabled={description.trim().length < 10} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold disabled:opacity-40">Analyse</button><button onClick={submitIssue} disabled={description.trim().length < 10} className="rounded-xl bg-[#7A1C2C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Submit Issue</button></div></section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-4 font-black">Smart intake</h3>{issuePreview ? <div className="space-y-4"><Badge label="Category" value={issuePreview.category} /><Badge label="Priority" value={issuePreview.priority} /><p className="text-xs leading-relaxed text-slate-500">Review the suggested classification, then submit. Your original description remains attached to the issue.</p></div> : <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Your category and priority suggestions will appear here.</div>}</section></div><Panel title="My submitted issues"><div className="space-y-3">{issues.length ? issues.map(issue => <div key={issue.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="font-bold">{issue.title}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{issue.status}</span></div><p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{issue.description}</p></div>) : <p className="text-sm text-slate-500">No library issues reported yet.</p>}</div></Panel></>}
          </>}
        </main>
      </div>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }: any) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-[#7A1C2C]" /><div className="text-3xl font-black">{value}</div><div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div></div>;
const Panel = ({ title, children, action }: any) => <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">{title}</h2>{action && <button onClick={action} className="text-xs font-bold text-[#7A1C2C]">View all</button>}</div>{children}</section>;
const PageTitle = ({ title, subtitle }: any) => <div className="mb-6"><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="mt-1 text-slate-500">{subtitle}</p></div>;
const Policy = ({ title, items }: any) => <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#7A1C2C]" /><h2 className="font-black">{title}</h2></div><ul className="space-y-3">{items.map((item: string) => <li key={item} className="border-b border-slate-100 pb-3 text-sm text-slate-600 last:border-0">{item}</li>)}</ul></div>;
const Badge = ({ label, value }: any) => <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div><div className="mt-1 inline-flex rounded-full bg-[#7A1C2C]/5 px-3 py-1 text-sm font-black text-[#7A1C2C]">{value}</div></div>;
const LoanList = ({ loans, renew, compact = false }: any) => !loans.length ? <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No active borrowed books.</div> : <div className="space-y-3">{loans.map((loan: any) => <div key={loan.loanUuid} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{loan.book?.title || 'Book'}</div><div className="text-xs text-slate-500">Due {new Date(loan.dueDate).toLocaleDateString()} · {loan.daysRemaining >= 0 ? `${loan.daysRemaining} days remaining` : `${Math.abs(loan.daysRemaining)} days overdue`}</div></div><button onClick={() => renew(loan.loanUuid)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50" disabled={loan.renewalCount >= 99}><RefreshCw className="h-3.5 w-3.5" />Renew</button></div>)}</div>;
const ReservationList = ({ reservations, cancel, compact = false }: any) => !reservations.length ? <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No reservations.</div> : <div className="space-y-3">{reservations.map((reservation: any) => <div key={reservation.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{reservation.book?.title || `Book #${reservation.targetId}`}</div><div className="text-xs text-slate-500">Status: {reservation.status}{reservation.queuePosition ? ` · Queue position ${reservation.queuePosition}` : ''}</div></div>{reservation.status === 'PENDING' && <button onClick={() => cancel(reservation.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Cancel</button>}</div>)}</div>;
const Step = ({ n, title, text }: any) => <div className="rounded-xl bg-slate-50 p-4"><div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#7A1C2C] text-xs font-black text-white">{n}</div><div className="font-bold">{title}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p></div>;

export default StudentPortal;
