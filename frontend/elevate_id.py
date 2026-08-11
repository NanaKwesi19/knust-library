import os

id_path = "C:/Users/hp/knust-library/frontend/src/components/layout/modules/DigitalIdentity.tsx"
with open(id_path, "r", encoding="utf-8") as f:
    original = f.read()

new_content = """import React, { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

  // Framer Motion 3D Tilt Logic
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  
  // Holographic shimmer effect based on mouse position
  const shineX = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "0%"]);
  const shineY = useTransform(mouseYSpring, [-0.5, 0.5], ["100%", "0%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Generating secure identity...</p>
      </div>
    );
  }

  const isExpired = new Date(student.expiryDate) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start perspective-1000">
        
        {/* Digital Library Card with 3D Tilt */}
        <div className="md:col-span-3 flex justify-center perspective-[1200px]">
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-[#800020] via-[#5a0016] to-[#3a000e] border border-[#a0304a] flex flex-col justify-between h-[22rem] select-none"
          >
            {/* Holographic Glossy Shimmer Overlay */}
            <motion.div
              style={{
                background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)`
              }}
              className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay"
            />
            
            {/* Background Texture Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 20 20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\' fill-rule=\\'evenodd\\'%3E%3Ccircle cx=\\'3\\' cy=\\'3\\' r=\\'1\\'/%3E%3Ccircle cx=\\'13\\' cy=\\'13\\' r=\\'1\\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

            <div className="relative z-10 p-6 flex flex-col h-full justify-between transform-gpu" style={{ transform: "translateZ(30px)" }}>
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-inner">
                    <span className="font-black text-xl text-[#DC9A22]">K</span>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white tracking-widest leading-none opacity-90">KNUST LIBRARY</h4>
                    <p className="text-[9px] text-[#DC9A22] font-black tracking-[0.2em] uppercase mt-1">Digital Pass</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border shadow-sm ${
                  student.status === 'ACTIVE' && !isExpired
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {isExpired ? 'Expired' : student.status}
                </span>
              </div>

              {/* Student Details */}
              <div className="space-y-1 my-6" style={{ transform: "translateZ(40px)" }}>
                <h2 className="text-2xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                  {student.name || 'Student Name'}
                </h2>
                <p className="text-xs text-slate-300 font-medium tracking-wide">{student.programme || student.department || 'Undergraduate Student'}</p>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-[10px] text-white/60 font-mono tracking-tight bg-black/20 px-2 py-1 rounded-md">{student.email}</p>
                  {student.yearOfStudy && (
                    <p className="text-[10px] text-white/60 font-bold bg-black/20 px-2 py-1 rounded-md">Year {student.yearOfStudy}</p>
                  )}
                </div>
              </div>

              {/* Barcode & Dates */}
              <div className="bg-white rounded-xl p-3 shadow-inner transform-gpu" style={{ transform: "translateZ(20px)" }}>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-stretch h-10 max-w-full overflow-hidden w-full px-2 justify-center">
                    {barcodeStripes.map((stripe, index) => (
                      <div
                        key={index}
                        style={{ width: `${stripe.width}px`, marginRight: `${stripe.margin}px` }}
                        className={`h-full ${stripe.isBlack ? 'bg-slate-900' : 'bg-transparent'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono font-black tracking-[0.25em] text-slate-800 mt-2">
                    {student.studentId || 'NO-ID-FOUND'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest pt-3 mt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    Iss: {new Date(student.issueDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    Exp: {new Date(student.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: QR and Details */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-[#800020]" />
              Quick Scan Entry
            </div>
            <div className="relative w-40 h-40 mx-auto bg-slate-50 border-2 border-dashed border-[#800020]/30 rounded-2xl flex items-center justify-center group overflow-hidden">
              {/* Animated scanning line */}
              <motion.div 
                animate={{ y: ["0%", "100%", "0%"] }} 
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 right-0 h-0.5 bg-[#DC9A22] shadow-[0_0_8px_2px_rgba(220,154,34,0.5)] z-10 opacity-70" 
              />
              <div className="text-center space-y-2 group-hover:scale-105 transition-transform duration-300">
                <QrCode className="w-12 h-12 text-[#800020] mx-auto" />
                <p className="text-[10px] text-slate-400 font-mono font-bold tracking-widest">TAP TO ENLARGE</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Present this code at any smart gate for instant library access.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info className="w-4 h-4 text-[#800020]" />
              Registry Data
            </h3>

            <div className="space-y-1 text-xs">
              <div className="flex gap-3 items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Privilege Level</p>
                  <p className="font-bold text-slate-700 text-xs">Standard Student</p>
                </div>
              </div>

              <div className="flex gap-3 items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Digital UID</p>
                  <p className="font-mono font-bold text-slate-700 text-[10px]">{student.cardUuid || 'Processing...'}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Status</p>
                  <p className={`font-black text-[11px] uppercase tracking-wider ${student.accountStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {student.accountStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isExpired && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-r from-rose-50 to-white text-rose-800 rounded-3xl border border-rose-200 shadow-sm text-xs leading-relaxed font-medium flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <span className="font-black text-rose-900 block mb-1 tracking-wide uppercase text-[10px]">Credential Expired</span>
                Your digital pass has expired. Visit the administration desk to renew your access immediately.
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
"""

with open(id_path, "w", encoding="utf-8") as f:
    f.write(new_content)
    
print("Digital Identity successfully elevated.")
