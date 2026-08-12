import React, { useMemo, useState } from 'react';
import { CopyPlus, Hash, MapPin, X } from 'lucide-react';

export interface PhysicalCopyDraft {
  barcode: string;
  location?: string;
  condition?: string;
}

interface AddPhysicalCopiesProps {
  bookTitle?: string;
  defaultPrefix?: string;
  defaultLocation?: string;
  startNumber?: number;
  onCancel: () => void;
  onConfirm: (copies: PhysicalCopyDraft[]) => void;
  isSubmitting?: boolean;
}

export default function AddPhysicalCopies({
  bookTitle,
  defaultPrefix = 'COPY',
  defaultLocation = '',
  startNumber = 1,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: AddPhysicalCopiesProps) {
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState(defaultPrefix);
  const [location, setLocation] = useState(defaultLocation);
  const [condition, setCondition] = useState('GOOD');

  const copies = useMemo<PhysicalCopyDraft[]>(() => {
    const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), 500);
    const safePrefix = (prefix || '').trim() || 'COPY';
    const safeStart = Math.max(1, Number(startNumber) || 1);
    return Array.from({ length: safeQuantity }, (_, index) => ({
      barcode: `${safePrefix}-${String(safeStart + index).padStart(3, '0')}`,
      location: (location || '').trim() || undefined,
      condition,
    }));
  }, [quantity, prefix, location, condition, startNumber]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(copies);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <CopyPlus className="w-4 h-4 text-[#800020]" />
            <h3 className="text-sm font-black text-slate-800">Add Physical Copies</h3>
          </div>
          {bookTitle && <p className="mt-1 text-xs text-slate-500">{bookTitle}</p>}
        </div>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={submit} className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2"><Hash className="w-3 h-3" /> Number of copies</span>
            <input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Math.min(500, Math.max(1, Number(e.target.value) || 1)))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#800020]" />
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 block">Barcode prefix</span>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold uppercase outline-none focus:border-[#800020]" placeholder="MED-2026" />
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2"><MapPin className="w-3 h-3" /> Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#800020]" placeholder="Main Library" />
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 block">Condition</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold bg-white outline-none focus:border-[#800020]">
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-black text-slate-700">Inventory preview</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{copies.length} copy{copies.length === 1 ? '' : 'ies'} will be prepared.</p>
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">AVAILABLE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-auto">
            {copies.map((copy) => (
              <div key={copy.barcode} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <div className="text-[10px] font-black text-slate-700 truncate">{copy.barcode}</div>
                <div className="text-[9px] text-slate-400">{copy.condition?.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSubmitting || copies.length === 0} className="px-5 py-2.5 rounded-xl bg-[#800020] text-white text-xs font-black hover:bg-[#66001a] disabled:opacity-50">
            {isSubmitting ? 'Adding...' : `Add ${copies.length} ${copies.length === 1 ? 'Copy' : 'Copies'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
