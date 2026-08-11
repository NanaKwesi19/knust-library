import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, ShieldCheck, BookOpen, ArrowLeftRight, CalendarClock, AlertCircle, Settings, LogOut, RefreshCw, Check, X, ChevronRight } from 'lucide-react';

type Section = 'overview' | 'verification' | 'issues' | 'circulation' | 'catalogue' | 'settings';

export const AdminCommandCenter: React.FC = () => {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [staff, students, issueRes, registry] = await Promise.all([
        API.get('/staff-auth/pending'), API.get('/auth/pending-students'), API.get('/library/issues'), API.get('/users/registry')
      ]);
      setPendingStaff(staff.data.data || []); setPendingStudents(students.data.data || []); setIssues(issueRes.data.data || []); setUsers(registry.data.data || []);
    } catch (e) { setNotice('Some management data could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const verifyStaff = async (id: number, approved: boolean) => {
    try { await API.patch(`/staff-auth/${id}/verify`, { approved }); setNotice(approved ? 'Staff account verified and activated.' : 'Staff application rejected.'); await load(); }
    catch (e: any) { setNotice(e.response?.data?.error || 'Could not update staff application.'); }
  };
  const approveStudent = async (id: number) => {
    try { await API.patch(`/auth/approve/${id}`); setNotice('Student account approved.'); await load(); }
    catch (e: any) { setNotice(e.response?.data?.error || 'Could not approve student.'); }
  };

  const nav: Array<[Section, string, React.ElementType]> = [
    ['overview', 'Overview', LayoutDashboard], ['verification', 'Verification', ShieldCheck], ['issues', 'Library Issues', AlertCircle], ['circulation', 'Circulation', ArrowLeftRight], ['catalogue', 'Catalogue', BookOpen], ['settings', 'Library Settings', Settings]
  ];
  const counts = { pending: pendingStaff.length + pendingStudents.length, staff: pendingStaff.length, issues: issues.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length, users: users.length };

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4"><div><div className="text-xs font-black uppercase tracking-[.2em] text-[#7A1C2C]">KNUST Library Administration</div><h1 className="text-xl font-black">Library Command Center</h1></div><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><b className="text-sm">{user?.fullName || 'Administrator'}</b><p className="text-xs text-slate-500">{user?.email || ''}</p></div><button onClick={logout} className="rounded-xl border p-2"><LogOut className="h-4 w-4" /></button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[250px_1fr]">
      <aside className="h-fit rounded-2xl border bg-white p-3 shadow-sm"><div className="mb-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Operations</div>{nav.map(([id,label,Icon]) => <button key={id} onClick={() => setSection(id)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold ${section===id ? 'bg-[#7A1C2C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-3"><Icon className="h-4 w-4" />{label}</span>{id==='verification' && counts.pending>0 && <span className={`rounded-full px-2 py-0.5 text-[10px] ${section===id?'bg-white/20':'bg-rose-100 text-rose-700'}`}>{counts.pending}</span>}{id==='issues' && counts.issues>0 && <span className={`rounded-full px-2 py-0.5 text-[10px] ${section===id?'bg-white/20':'bg-amber-100 text-amber-700'}`}>{counts.issues}</span>}</button>)}</aside>
      <main>{notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{notice}<button onClick={()=>setNotice('')}><X className="h-4 w-4"/></button></div>}{loading ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin"/>Loading command center...</div> : <>
        {section==='overview' && <><Header title="Good evening, Administrator" sub="A structured view of people, circulation and library support."/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Users" value={counts.users} icon={Users}/><Metric label="Pending Verification" value={counts.pending} icon={ShieldCheck}/><Metric label="Open Library Issues" value={counts.issues} icon={AlertCircle}/><Metric label="Pending Staff" value={counts.staff} icon={Users}/></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><Action title="Verification queue" text={counts.pending ? `${counts.pending} account${counts.pending===1?'':'s'} require administrator attention.` : 'No accounts are waiting for verification.'} button="Open verification" onClick={()=>setSection('verification')}/><Action title="Library support" text={counts.issues ? `${counts.issues} issue${counts.issues===1?'':'s'} need staff attention.` : 'No open library issues.'} button="Open issues" onClick={()=>setSection('issues')}/></div></>}
        {section==='verification' && <><Header title="Account Verification" sub="Approve student registrations and verify staff applications before they can access the system."/><div className="grid gap-6 xl:grid-cols-2"><Queue title="Staff applications" empty="No staff applications pending.">{pendingStaff.map(s=><Person key={s.id} person={s} role="Staff" onApprove={()=>verifyStaff(s.id,true)} onReject={()=>verifyStaff(s.id,false)}/>)}</Queue><Queue title="Student registrations" empty="No student registrations pending.">{pendingStudents.map(s=><Person key={s.id} person={s} role="Student" onApprove={()=>approveStudent(s.id)}/>)}</Queue></div><div className="mt-5 rounded-2xl border bg-white p-5 text-sm text-slate-600"><b>Staff security rule:</b> public staff applications can only request STAFF or LIBRARIAN. ADMIN accounts are never self-created and remain under administrator control.</div></>}
        {section==='issues' && <><Header title="Library Issues" sub="Review problems submitted through the student Report a Library Issue workflow."/><div className="space-y-3">{issues.length ? issues.map(i=><div key={i.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><div className="flex items-center gap-2"><span className="rounded-full bg-[#7A1C2C]/5 px-2.5 py-1 text-[10px] font-black uppercase text-[#7A1C2C]">{i.status}</span><b>{i.title}</b></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{i.description}</p><p className="mt-3 text-xs text-slate-400">Submitted by {i.user?.fullName || 'Unknown'} · {i.user?.studentId || i.user?.email || ''}</p></div><ChevronRight className="hidden h-5 w-5 text-slate-300 md:block"/></div></div>) : <Empty text="No library issues have been submitted."/>}</div></>}
        {section==='circulation' && <><Header title="Circulation" sub="Borrowing, returns and reservations are grouped together for library staff."/><div className="grid gap-4 md:grid-cols-3"><Module icon={ArrowLeftRight} title="Borrowing" text="View and process active loans and returns."/><Module icon={CalendarClock} title="Reservations" text="Manage holds, queues and pickup readiness."/><Module icon={BookOpen} title="Catalogue" text="Manage books, copies and availability."/></div></>}
        {section==='catalogue' && <><Header title="Catalogue" sub="The catalogue workspace is the source for books and physical copies."/><div className="rounded-2xl border bg-white p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-[#7A1C2C]"/><b>Catalogue management</b><p className="mt-1 text-sm text-slate-500">Use the existing inventory workspace for books and copies. This command center keeps the top-level navigation organized.</p></div></>}
        {section==='settings' && <><Header title="Library Settings" sub="Configure the rules used by student borrowing, renewals and policies."/><div className="rounded-2xl border bg-white p-6"><p className="text-sm text-slate-600">Library policy values are read from system settings by the student portal. Keep changes here authoritative so the student-facing rules stay synchronized.</p></div></>}
      </>}</main>
    </div>
  </div>;
};
const Header=({title,sub}:{title:string,sub:string})=><div className="mb-6"><h2 className="text-3xl font-black tracking-tight">{title}</h2><p className="mt-1 text-slate-500">{sub}</p></div>;
const Metric=({label,value,icon:Icon}:any)=><div className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-[#7A1C2C]"/><div className="text-3xl font-black">{value}</div><div className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div></div>;
const Action=({title,text,button,onClick}:any)=><div className="rounded-2xl border bg-white p-6 shadow-sm"><b className="text-lg">{title}</b><p className="mt-2 text-sm text-slate-500">{text}</p><button onClick={onClick} className="mt-5 rounded-xl bg-[#7A1C2C] px-4 py-2.5 text-sm font-bold text-white">{button}</button></div>;
const Queue=({title,empty,children}:any)=><section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="font-black">{title}</h3></div>{children || <Empty text={empty}/>}</section>;
const Person=({person,role,onApprove,onReject}:any)=><div className="mb-3 rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><b>{person.fullName}</b><p className="text-xs text-slate-500">{person.email} · {role}{person.department ? ` · ${person.department}` : ''}</p></div><div className="flex gap-2"><button onClick={onApprove} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5"/>Approve</button>{onReject&&<button onClick={onReject} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><X className="h-3.5 w-3.5"/>Reject</button>}</div></div></div>;
const Module=({icon:Icon,title,text}:any)=><div className="rounded-2xl border bg-white p-6 shadow-sm"><Icon className="mb-4 h-6 w-6 text-[#7A1C2C]"/><b>{title}</b><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
const Empty=({text}:{text:string})=><p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">{text}</p>;
