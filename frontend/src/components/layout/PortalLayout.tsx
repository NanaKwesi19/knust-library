import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarRange, UserSquare2, Wrench,
  Bell, LogOut, Menu, X, Library, CreditCard, Receipt, History,
  Sparkles, UserCircle, Search, FileText,
} from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  activeStudentName: string;
  studentId: string;
  onLogout: () => void;
}

const menuItems = [
  { id: 'overview', name: 'Dashboard Home', icon: LayoutDashboard, path: '/portal' },
  { id: 'catalog', name: 'Library Catalog', icon: Search, path: '/portal/catalog' },
  { id: 'borrowed', name: 'My Borrowed Books', icon: BookOpen, path: '/portal/borrowed' },
  { id: 'reservations', name: 'Reservations', icon: CalendarRange, path: '/portal/reservations' },
  { id: 'workspace', name: 'Study Spaces', icon: UserSquare2, path: '/portal/workspace' },
  { id: 'digital', name: 'Digital Library', icon: Library, path: '/portal/digital' },
  { id: 'notifications', name: 'Notifications', icon: Bell, path: '/portal/notifications', badge: true },
  { id: 'identity', name: 'Digital ID Card', icon: CreditCard, path: '/portal/identity' },
  { id: 'fines', name: 'Fines & Payments', icon: Receipt, path: '/portal/fines' },
  { id: 'history', name: 'Reading History', icon: History, path: '/portal/history' },
  { id: 'recommendations', name: 'For You', icon: Sparkles, path: '/portal/recommendations' },
  { id: 'profile', name: 'My Profile', icon: UserCircle, path: '/portal/profile' },
  { id: 'helpdesk', name: 'Help & Support', icon: Wrench, path: '/portal/helpdesk' },
  { id: 'policies', name: 'Rules & Policies', icon: FileText, path: '/portal/policies' },
];

export default function PortalLayout({ children, activeStudentName, studentId, onLogout }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = menuItems.find(item => location.pathname === item.path)?.id || 'overview';

  const handleTabClick = (item: typeof menuItems[0]) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-[#800020] text-white p-4 shadow-md z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center font-bold text-[#800020]">K</div>
          <span className="font-bold text-sm tracking-wider">KNUST Portal</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:text-amber-400">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 bg-[#800020] text-white w-64 p-5 flex flex-col justify-between shadow-xl z-40 transition-transform duration-300 md:translate-x-0 md:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          <div className="hidden md:flex items-center gap-3 pb-5 border-b border-white/10">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-black text-xl text-[#800020]">K</div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">KNUST Library</h2>
              <p className="text-[10px] text-amber-300 font-medium tracking-wider uppercase">Student Portal</p>
            </div>
          </div>

          <div className="bg-[#66001a] p-3 rounded-xl border border-white/5 shadow-inner">
            <p className="text-xs text-amber-300 font-medium tracking-wide font-mono">{studentId || 'No ID'}</p>
            <h3 className="font-semibold text-sm text-white truncate">{activeStudentName}</h3>
            <span className="inline-block mt-1 text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">Account Active</span>
          </div>

          <nav className="space-y-0.5 pt-4 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 group relative
                    ${active ? 'bg-amber-400 text-[#800020] shadow-md font-bold' : 'text-white/80 hover:bg-[#990026] hover:text-white'}
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#800020]' : 'text-white/50 group-hover:text-amber-300'}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && <span className="w-2 h-2 bg-amber-400 rounded-full" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-white/60 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200/80 px-8 py-4 shadow-sm">
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {menuItems.find(n => n.id === currentTab)?.name}
            </h1>
            <p className="text-xs text-slate-400">KNUST Smart Library & Facility Services</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTabClick(menuItems.find(n => n.id === 'notifications')!)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#800020] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {activeStudentName.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-slate-700">{activeStudentName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}