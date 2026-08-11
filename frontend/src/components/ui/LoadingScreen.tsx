import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
      <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
      <p className="text-xs font-medium text-slate-500 tracking-wide">{message}</p>
    </div>
  );
}