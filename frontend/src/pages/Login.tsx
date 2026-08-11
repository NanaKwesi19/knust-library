import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight,
  Cpu,
  Bookmark,
  Sparkles,
  Layers,
  FileCheck,
  Network
} from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState) {
        setIsCapsLockOn(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const validateForm = (): boolean => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid institutional email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await API.post("/auth/login", { email, password });
      const resData = response.data;

      if (!resData.success) {
        setError(resData.error || 'Login failed');
        setIsSubmitting(false);
        return;
      }

      const token = resData.data.token;
      const userData = resData.data.user;

      if (!token || !userData) {
        setError('Invalid server response');
        setIsSubmitting(false);
        return;
      }

      login(token, {
        id: userData.id,
        userUuid: userData.userUuid || userData.id.toString(),
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        studentId: userData.studentId,
        programme: userData.programme,
        department: userData.department,
        yearOfStudy: userData.yearOfStudy,
      });

      if (userData.role === "ADMIN" || userData.role === "LIBRARIAN") {
        navigate("/admin");
      } else {
        navigate("/portal");
      }
    } catch (err: any) {
      const backendError = err.response?.data?.error || "Login failed. Please check your internet connection or try again later.";
      setError(backendError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-900 font-sans selection:bg-[#7A1C2C]/20 selection:text-[#7A1C2C] overflow-hidden antialiased">
      
      {/* Left Panel - Institutional Branding Section */}
      <div className="hidden lg:flex lg:w-7/12 relative bg-gradient-to-br from-[#2D060D] via-[#140205] to-[#050001] flex-col justify-between p-20 overflow-hidden border-r border-white/[0.03]">
        
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01_5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01_5)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_70%_0%,rgba(122,28,44,0.25)_0%,transparent_60%)] pointer-events-none mix-blend-screen" />
        <div className="absolute -left-20 bottom-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_0%_100%,rgba(220,154,34,0.08)_0%,transparent_60%)] pointer-events-none" />

        {/* Brand Header Identity */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center gap-6"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#7A1C2C] to-[#4A0C16] flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.6)] border border-white/10 ring-8 ring-white/[0.02]">
            <BookOpen className="h-6 w-6 text-[#DC9A22]" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.3em] bg-gradient-to-r from-stone-200 via-stone-300 to-stone-400 bg-clip-text text-transparent block leading-none">Kwame Nkrumah University</span>
            <span className="text-stone-500 text-[11px] font-bold tracking-widest uppercase block">Science &amp; Technology • Library Services</span>
          </div>
        </motion.div>

        {/* Centerpiece Text */}
        <div className="relative z-10 my-auto max-w-xl pl-8 border-l border-white/10">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-[#DC9A22]" />
              <span className="text-stone-300 text-[10px] font-bold tracking-widest uppercase">Secure Connection Verified</span>
            </div>
            
            <div className="space-y-5">
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Central Library <br />
                <span className="bg-gradient-to-r from-[#DC9A22] via-amber-300 to-amber-100 bg-clip-text text-transparent">
                  Student Portal
                </span>
              </h1>
              
              <p className="text-sm xl:text-base text-stone-400 leading-relaxed font-medium max-w-md">
                Log in to access your library account, manage your book loans, reserve study rooms, and submit help desk requests.
              </p>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-4 pt-2 max-w-md">
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-2 backdrop-blur-sm">
                <Layers className="w-4 h-4 text-stone-600" />
                <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">Digital Catalog</div>
                <div className="text-xs font-bold text-stone-300">Book Search</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-2 backdrop-blur-sm">
                <FileCheck className="w-4 h-4 text-stone-600" />
                <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">Room Bookings</div>
                <div className="text-xs font-bold text-stone-300">Study Spaces</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-2 backdrop-blur-sm">
                <Network className="w-4 h-4 text-stone-600" />
                <div className="text-[9px] uppercase font-bold text-stone-500 tracking-wider">Help Desk</div>
                <div className="text-xs font-bold text-stone-300">Support Center</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 flex items-center justify-between border-t border-white/[0.04] pt-8 text-[11px] font-bold tracking-wider text-stone-500 uppercase"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/40 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>All Systems Normal</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[10px] tracking-normal text-stone-600">
            <span>Library Services v4.8.2</span>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 sm:p-12 md:p-20 relative bg-white">
        
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#F1F5F9_1px,transparent_1px),linear-gradient(to_bottom,#F1F5F9_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative"
        >
          <div className="absolute inset-0 bg-slate-100/40 border border-slate-200/30 rounded-3xl translate-y-4 scale-[0.95] blur-[1px] pointer-events-none" />
          <div className="absolute inset-0 bg-slate-50/70 border border-slate-200/60 rounded-3xl translate-y-2 scale-[0.975] pointer-events-none" />

          {/* Main Form Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-[0_25px_60px_rgba(15,23,42,0.03)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#7A1C2C] via-[#DC9A22] to-[#7A1C2C]" />

            {/* Header */}
            <div className="mb-10 space-y-2">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold text-[#7A1C2C] uppercase tracking-widest bg-[#7A1C2C]/5 px-2.5 py-1 rounded-md border border-[#7A1C2C]/10">
                <Sparkles className="w-3 h-3 text-[#DC9A22]" />
                <span>Library Login</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Sign In
              </h2>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                Please enter your university credentials to access the library dashboard.
              </p>
            </div>

            {/* Error Notification */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0, x: [0, -4, 4, -4, 4, 0] }}
                  exit={{ opacity: 0 }}
                  className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3.5"
                >
                  <div className="h-6 w-6 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  </div>
                  <div className="text-xs text-rose-800 font-bold leading-relaxed pt-0.5">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              
              {/* Email Input */}
              <div className="space-y-2 relative">
                <label htmlFor="institutional-email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                  Institutional Email Address
                </label>
                <div className="relative group">
                  <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors duration-200 ${focusedField === 'email' ? 'text-[#7A1C2C]' : 'text-slate-400'}`}>
                    <Mail className="h-4 w-4 stroke-[2.5]" />
                  </span>
                  <input
                    id="institutional-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    disabled={isSubmitting}
                    placeholder="username@knust.edu.gh"
                    className="appearance-none block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl placeholder-slate-400 text-slate-800 text-sm font-semibold outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between pl-0.5">
                  <label htmlFor="security-password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-xs font-bold text-[#7A1C2C] hover:text-[#5A0A16] hover:underline underline-offset-4 transition-all">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors duration-200 ${focusedField === 'password' ? 'text-[#7A1C2C]' : 'text-slate-400'}`}>
                    <Lock className="h-4 w-4 stroke-[2.5]" />
                  </span>
                  <input
                    id="security-password"
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={checkCapsLock}
                    disabled={isSubmitting}
                    placeholder="••••••••••••"
                    className="appearance-none block w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl placeholder-slate-400 text-slate-800 text-sm font-semibold outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 outline-none focus:text-[#7A1C2C]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 stroke-[2.5]" /> : <Eye className="h-4 w-4 stroke-[2.5]" />}
                  </button>
                </div>

                {/* Caps Lock Indicator */}
                <AnimatePresence>
                  {isCapsLockOn && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-amber-600 text-xs font-bold pt-1.5 pl-1"
                    >
                      <Cpu className="w-3.5 h-3.5 animate-pulse" />
                      <span>Caps Lock is on</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center pl-0.5 pt-1">
                <label className="relative flex items-center cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 bg-slate-50 border border-slate-200 rounded-xl peer-checked:bg-[#7A1C2C] peer-checked:border-[#7A1C2C] flex items-center justify-center transition-all duration-200 shadow-sm">
                    <svg className={`w-3 h-3 text-white stroke-[3.5] ${rememberMe ? 'block' : 'hidden'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                    Remember this device
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <motion.button
                  whileHover={!isSubmitting ? { scale: 1.01, y: -0.5 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.99, y: 0 } : {}}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-4 px-5 bg-gradient-to-r from-[#7A1C2C] to-[#631422] text-white text-sm font-bold rounded-2xl shadow-xl shadow-[#7A1C2C]/10 border border-[#7A1C2C]/10 focus:outline-none focus:ring-4 focus:ring-[#7A1C2C]/20 transition-all duration-200 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none group"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold text-slate-400 tracking-wide">Logging in...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5 tracking-wide font-extrabold">
                      Log In
                      <ArrowRight className="h-4 w-4 text-[#DC9A22] transition-transform group-hover:translate-x-0.5 stroke-[3]" />
                    </span>
                  )}
                </motion.button>
              </div>

            </form>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-2">
                Secure Session Active
              </span>
              <a href="/support" className="hover:text-slate-600 transition-colors flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-slate-300" />
                Support Desk
              </a>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
};