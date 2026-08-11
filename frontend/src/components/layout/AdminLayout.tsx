import React from 'react';
import { ShieldAlert, BookOpen, BarChart3, Users, LogOut, Bell } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  adminName: string;
  onLogout: () => void;
}

export default function AdminLayout({ children, adminName, onLogout }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Panel */}
      <aside className="bg-[#800020] text-white w-full md:w-64 p-5 flex flex-col justify-between shadow-xl shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-white/10">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-black text-xl text-[#800020]">
              K
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">KNUST Admin</h2>
              <p className="text-[10px] text-amber-300 font-medium tracking-wider uppercase">Library Control</p>
            </div>
          </div>

          <div className="bg-[#66001a] p-3 rounded-xl border border-white/5">
            <h3 className="font-semibold text-xs text-white truncate">{adminName}</h3>
            <span className="inline-block mt-1 text-[9px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase">
              System Administrator
            </span>
          </div>

          <nav className="space-y-1 pt-4">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold bg-amber-400 text-[#800020] rounded-xl shadow-md">
              <BarChart3 className="w-4 h-4 shrink-0" />
              Operational Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-maroon-100 hover:bg-[#990026] hover:text-white rounded-xl transition-all">
              <BookOpen className="w-4 h-4 text-slate-300" />
              Manage Catalog
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-maroon-100 hover:bg-[#990026] hover:text-white rounded-xl transition-all">
              <Users className="w-4 h-4 text-slate-300" />
              User Registrations
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-rose-950/40 hover:text-rose-300 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Log Out Terminal
          </button>
        </div>
      </aside>

      {/* Main Content Arena */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200/80 px-8 py-4 shadow-sm">
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wider">System Control Terminal</h1>
            <p className="text-xs text-slate-400">KNUST Library Management Backend Core</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#800020] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {adminName.charAt(0)}
            </div>
            <span className="text-xs font-semibold text-slate-700">{adminName}</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}