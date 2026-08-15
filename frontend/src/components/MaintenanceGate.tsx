import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Wrench, Clock3, Mail } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

interface MaintenanceConfig {
  maintenanceMode: boolean;
  title: string;
  message: string;
  expectedReturn: string;
  contact: string;
}

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { data, isLoading } = useQuery<{ success: boolean; data: MaintenanceConfig }>({
    queryKey: ['publicMaintenance'],
    queryFn: async () => (await API.get('/config/public-maintenance')).data,
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: 1,
  });

  // Keep authentication pages reachable so an administrator can log in and
  // disable maintenance mode. The server still blocks protected non-admin APIs.
  if (location.pathname === '/login' || location.pathname === '/register') {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'ADMIN';
  const maintenance = data?.data;

  if (!isLoading && maintenance?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-4xl rounded-[2rem] bg-white shadow-2xl overflow-hidden">
          <div className="bg-[#7A1C2C] px-8 py-10 sm:px-14 sm:py-14 text-white text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/20">
              <Wrench className="h-10 w-10" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">KNUST Library</p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">{maintenance.title}</h1>
          </div>
          <div className="px-8 py-10 sm:px-14 sm:py-14 text-center">
            <p className="mx-auto max-w-2xl text-base sm:text-lg leading-8 text-slate-600">{maintenance.message}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {maintenance.expectedReturn && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <Clock3 className="mx-auto h-5 w-5 text-[#7A1C2C]" />
                  <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Expected Return</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{maintenance.expectedReturn}</div>
                </div>
              )}
              {maintenance.contact && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <Mail className="mx-auto h-5 w-5 text-[#7A1C2C]" />
                  <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Support</div>
                  <div className="mt-1 text-sm font-bold text-slate-800 break-words">{maintenance.contact}</div>
                </div>
              )}
            </div>
            <p className="mt-8 text-xs text-slate-400">Please check back later. We apologize for the inconvenience.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
