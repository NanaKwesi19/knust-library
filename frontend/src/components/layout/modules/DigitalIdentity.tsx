import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  ShieldCheck, User, BookOpen, Layers, Info, QrCode, Calendar, AlertCircle, Loader2,
} from 'lucide-react';

interface LibraryCard {
  name: string;
  studentId: string;
  email: string;
  programme?: string;
  department?: string;
  yearOfStudy?: number;
  cardUuid: string;
  qrCodeData?: string;
  issueDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  accountStatus: 'ACTIVE' | 'SUSPENDED';
}

export default function DigitalIdentity() {
  const { data: cardData, isLoading } = useQuery({
    queryKey: ['studentLibraryCard'],
    queryFn: async () => {
      const res = await API.get('/student/library-card');
      return res.data;
    },
  });

  const student: LibraryCard = cardData?.data || {
    name: '',
    studentId: '',
    email: '',
    programme: '',
    department: '',
    yearOfStudy: undefined,
    cardUuid: '',
    qrCodeData: '',
    issueDate: new Date().toISOString(),
    expiryDate: new Date().toISOString(),
    status: 'ACTIVE',
    accountStatus: 'ACTIVE',
  };

  const barcodeStripes = useMemo(() => {
    const codeString = student.studentId || '';
    return codeString.split('').map((char, index) => {
      const code = char.charCodeAt(0);
      const width = (code % 3) + 2;
      const margin = (code % 2) + 2;
      return { width, margin, isBlack: index % 2 === 0 };
    });
  }, [student.studentId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading library card...</p>
      </div>
    );
  }

  const isExpired = new Date(student.expiryDate) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Digital Library Card */}
        <div className="md:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-72 select-none">
          <div className="flex justify-between items-start z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#800020] text-amber-400 rounded-xl flex items-center justify-center font-black text-base shadow-sm">
                K
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-none">KNUST DIGITAL LIBRARY CARD</h4>
                <p className="text-[9px] text-amber-600 font-bold tracking-wider uppercase mt-0.5">Student Membership</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
              student.status === 'ACTIVE' && !isExpired
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              {isExpired ? 'Expired' : student.status}
            </span>
          </div>

          <div className="space-y-1.5 z-10 my-4">
            <h2 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
              {student.name || 'Student'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">{student.programme || student.department || 'Undergraduate Student'}</p>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">{student.email}</p>
            {student.yearOfStudy && (
              <p className="text-[10px] text-slate-400">Year {student.yearOfStudy}</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col items-center justify-center bg-white z-10">
            <div className="flex items-stretch h-9 max-w-full overflow-hidden">
              {barcodeStripes.map((stripe, index) => (
                <div
                  key={index}
                  style={{ width: `${stripe.width}px`, marginRight: `${stripe.margin}px` }}
                  className={`h-full ${stripe.isBlack ? 'bg-slate-900' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-600 mt-1.5">
              {student.studentId || 'No ID'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 z-10">
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              Issued: {new Date(student.issueDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              Expires: {new Date(student.expiryDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
              <QrCode className="w-4 h-4 text-[#800020]" />
              Digital QR Pass
            </div>
            <div className="w-32 h-32 mx-auto bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-1">
                <QrCode className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-[9px] text-slate-400 font-mono">QR Code</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Present this card at library entry gates for quick access verification.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-[#800020]" />
              Account Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex gap-3 items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Membership</p>
                  <p className="font-bold text-slate-700 text-[11px]">Student</p>
                </div>
              </div>

              <div className="flex gap-3 items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Card ID</p>
                  <p className="font-mono font-bold text-slate-700 text-[11px]">{student.cardUuid || 'Generating...'}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Account Status</p>
                  <p className={`font-bold text-[11px] ${student.accountStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {student.accountStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isExpired && (
            <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 shadow-sm text-[11px] leading-relaxed font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Card Expired</span>
                Please visit the library administration desk to renew your digital library card.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}