import React from 'react';
import { BookOpen, Flag, Tag, Link2 } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { parseLibraryIssue, getLibraryIssueStatusLabel } from './libraryIssueUtils';

type Props = {
  description?: string | null;
  status?: string | null;
};

export default function LibraryIssueDetails({ description, status }: Props) {
  const parsed = parseLibraryIssue(description);
  if (!parsed.isLibraryIssue) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#7A1C2C]" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Library Issue</span>
        </div>
        <Badge variant="default" size="sm">{getLibraryIssueStatusLabel(status)}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Tag className="w-3 h-3" /> Category</div>
          <div className="mt-1 text-xs font-bold text-slate-700">{parsed.category || 'Not specified'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Flag className="w-3 h-3" /> Priority</div>
          <div className="mt-1 text-xs font-bold text-slate-700">{parsed.priority || 'Normal'}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Link2 className="w-3 h-3" /> Related record</div>
          <div className="mt-1 text-xs font-bold text-slate-700 break-words">{parsed.relatedRecord || 'None selected'}</div>
        </div>
      </div>
    </div>
  );
}
