import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  History, BookOpen, Download, Bookmark, RotateCcw, Eye, Clock, Loader2,
} from 'lucide-react';

interface HistoryItem {
  id: number;
  action: 'BORROWED' | 'RETURNED' | 'DOWNLOADED' | 'VIEWED' | 'RESERVED';
  resourceType: string;
  resourceTitle: string;
  resourceAuthor?: string;
  createdAt: string;
}

const actionConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  BORROWED: { icon: BookOpen, label: 'Borrowed', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  RETURNED: { icon: RotateCcw, label: 'Returned', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  DOWNLOADED: { icon: Download, label: 'Downloaded', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  VIEWED: { icon: Eye, label: 'Viewed', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  RESERVED: { icon: Bookmark, label: 'Reserved', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};

export default function ReadingHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['studentReadingHistory'],
    queryFn: async () => {
      const res = await API.get('/student/reading-history?limit=50');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading your activity...</p>
      </div>
    );
  }

  const history: HistoryItem[] = data?.data || [];

  const grouped: Record<string, HistoryItem[]> = {};
  history.forEach((item) => {
    const date = new Date(item.createdAt).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-[#800020]" />
            Reading Activity
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            {history.length} entries
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">No activity yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Your borrowing, downloading, and viewing history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-white py-1">
                  {date === new Date().toLocaleDateString() ? 'Today' : date}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const config = actionConfig[item.action] || actionConfig.VIEWED;
                    const Icon = config.icon;

                    return (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <div className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {item.resourceType}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-slate-800">{item.resourceTitle}</h4>
                          {item.resourceAuthor && (
                            <p className="text-[10px] text-slate-500">By {item.resourceAuthor}</p>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}