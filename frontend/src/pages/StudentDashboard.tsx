import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  BookOpen, 
  Clock, 
  LogOut, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookMarked, 
  Layers, 
  Sparkles, 
  CalendarCheck, 
  Loader2 
} from 'lucide-react';

interface AvailableRoom {
  roomUuid: string;
  roomNumber: string;
  capacity: number;
  location: string;
}

interface StudentSessionData {
  allocatedLoansCount: number;
  activeBookings: Array<{
    bookingUuid: string;
    roomNumber: string;
    bookingDate: string;
    startTime: string;
  }>;
}

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 } 
  }
};

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [sessionData, setSessionData] = useState<StudentSessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states for booking execution
  const [selectedRoomUuid, setSelectedRoomUuid] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [bookingStatus, setBookingStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [roomsResponse, profileResponse] = await Promise.all([
        API.get('/rooms/available-spaces'),
        API.get(`/users/profile-summary/${user?.userUuid}`)
      ]);
      setRooms(roomsResponse.data.data);
      setSessionData(profileResponse.data.data);
    } catch (err) {
      console.error('Error synchronizing student data states.', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.userUuid]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus(null);
    setIsSubmitting(true);

    try {
      const response = await API.post('/rooms/book', {
        roomUuid: selectedRoomUuid,
        bookingDate,
        startTime: `${bookingDate}T${startTime}:00.000Z`,
        endTime: `${bookingDate}T${endTime}:00.000Z`
      });

      if (response.data.success) {
        setBookingStatus({ success: true, message: response.data.message || 'Study space successfully reserved.' });
        // Reset form inputs
        setSelectedRoomUuid('');
        setBookingDate('');
        setStartTime('');
        setEndTime('');
        // Refresh allocation maps instantly on confirmation
        await fetchDashboardData();
      }
    } catch (err: any) {
      setBookingStatus({
        success: false,
        message: err.response?.data?.error || 'Unable to complete reservation. Please verify room availability and time boundaries.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to generate initials from fullName
  const getUserInitials = (name?: string): string => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamic greeting based on current local hour
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased">
        {/* Skeleton Header */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex justify-between items-center animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
            <div className="w-48 h-5 bg-slate-200 rounded" />
          </div>
          <div className="w-24 h-9 bg-slate-200 rounded-lg" />
        </div>

        {/* Skeleton Body */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8 animate-pulse">
          <div className="w-1/3 h-8 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-32 bg-slate-200/70 rounded-2xl border border-slate-200" />
            <div className="h-32 bg-slate-200/70 rounded-2xl border border-slate-200" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="h-64 bg-slate-200/70 rounded-2xl border border-slate-200" />
              <div className="h-64 bg-slate-200/70 rounded-2xl border border-slate-200" />
            </div>
            <div className="lg:col-span-8">
              <div className="h-[450px] bg-slate-200/70 rounded-2xl border border-slate-200" />
            </div>
          </div>
        </div>

        {/* Skeleton Footer */}
        <div className="py-6 text-center text-xs text-slate-400">
          Loading institutional workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-[#7A1C2C]/10 selection:text-[#7A1C2C] antialiased">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#7A1C2C] to-[#4A0C16] flex items-center justify-center shadow-md shadow-[#7A1C2C]/10 border border-[#7A1C2C]/20 ring-4 ring-[#7A1C2C]/5">
              <BookOpen className="h-5 w-5 text-[#DC9A22]" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#7A1C2C] block leading-none">
                KNUST Library System
              </span>
              <span className="text-sm font-bold text-slate-800 tracking-tight mt-1 block">
                Student Academic Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-3 text-right border-r border-slate-200 pr-6">
              <div>
                <div className="text-xs font-bold text-slate-800 leading-none">{user?.fullName}</div>
                <div className="text-[11px] font-medium text-slate-400 mt-1">{user?.email}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-[#7A1C2C] shadow-inner">
                {getUserInitials(user?.fullName)}
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout} 
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200/80 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200/80 transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </motion.button>
          </div>

        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 sm:space-y-10"
        >
          
          {/* Welcome Hero Banner */}
          <motion.section variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#7A1C2C] via-[#5D1321] to-[#3D0B14] p-8 sm:p-10 text-white shadow-xl shadow-[#7A1C2C]/10 border border-[#7A1C2C]/20">
            {/* Background Architectural Grid & Subtle Accents */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-gradient-to-br from-[#DC9A22]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[#DC9A22] text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Academic Session Active</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {getGreeting()}, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#DC9A22]">
                  {user?.fullName}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-stone-300/90 font-normal leading-relaxed max-w-xl">
                Manage your checked-out library resources, monitor active circulation parameters, and reserve collaborative study spaces across campus.
              </p>
            </div>
          </motion.section>

          {/* Analytics & Activity Overview Cards */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            
            {/* Active Loans Card */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_35px_rgba(15,23,42,0.04)] transition-all duration-200 flex items-center justify-between group">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <BookMarked className="w-4 h-4 text-[#7A1C2C]" />
                  <span>Checked-Out Textbooks</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {sessionData?.allocatedLoansCount ?? 0}
                  <span className="text-xs font-bold text-slate-400 ml-1.5 uppercase tracking-normal">Units</span>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Active institutional circulation inventory
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#7A1C2C] group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Layers className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

            {/* Active Bookings Card */}
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.02)] hover:shadow-[0_15px_35px_rgba(15,23,42,0.04)] transition-all duration-200 flex items-center justify-between group">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <CalendarCheck className="w-4 h-4 text-[#DC9A22]" />
                  <span>Confirmed Reservations</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {sessionData?.activeBookings.length ?? 0}
                  <span className="text-xs font-bold text-slate-400 ml-1.5 uppercase tracking-normal">Slots</span>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Scheduled workspace reservations
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#DC9A22] group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
            </div>

          </motion.section>

          {/* Main Workspace Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column - Student Identity & Timeline (4 cols) */}
            <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
              
              {/* Institutional Profile Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.02)] overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#7A1C2C] via-[#DC9A22] to-[#7A1C2C]" />
                <div className="p-6 sm:p-7 space-y-6">
                  
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                      {getUserInitials(user?.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-slate-900 truncate">
                        {user?.fullName}
                      </h2>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {user?.email}
                      </p>
                      <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Verified Student
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 space-y-3.5 text-xs font-medium text-slate-600">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Institutional Clearance:</span>
                      <span className="font-bold text-slate-800 uppercase">Level 1 - Undergraduate</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Borrowing Limit:</span>
                      <span className="font-bold text-slate-800">Standard (5 Texts Max)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Account Status:</span>
                      <span className="font-bold text-emerald-600">Active &amp; Unrestricted</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Locked Workspace Timeline / Current Bookings */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.02)] p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-[#7A1C2C]">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Active Reservations
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {sessionData?.activeBookings.length ?? 0} Total
                  </span>
                </div>

                <div className="space-y-3">
                  {!sessionData?.activeBookings || sessionData.activeBookings.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-600">No study spaces reserved</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                        Use the reservation engine to book collaborative rooms.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {sessionData.activeBookings.map((booking) => (
                        <div 
                          key={booking.bookingUuid} 
                          className="group relative bg-white p-4 rounded-xl border border-slate-200/80 hover:border-[#7A1C2C]/30 shadow-sm hover:shadow transition-all duration-150 flex items-start gap-3.5"
                        >
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 group-hover:bg-rose-50 group-hover:border-rose-100 transition-colors">
                            <MapPin className="w-4 h-4 text-[#7A1C2C] mb-0.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                Room {booking.roomNumber}
                              </span>
                              <span className="text-[10px] font-bold text-[#DC9A22] bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded">
                                Confirmed
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] font-medium text-slate-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{booking.bookingDate}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{booking.startTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>

            {/* Right Column - Room Booking Reservation Engine (8 cols) */}
            <motion.div variants={itemVariants} className="lg:col-span-8">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_15px_40px_rgba(15,23,42,0.03)] p-6 sm:p-10 relative overflow-hidden">
                
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A1C2C]">
                      <Calendar className="w-4 h-4" />
                      <span>Reservation Scheduler</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Reserve Study Space
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Book collaborative workspaces and discussion rooms in real-time.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 shrink-0 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{rooms.length} Spaces Available</span>
                  </div>
                </div>

                {/* Form Status Notification Toast */}
                <AnimatePresence mode="wait">
                  {bookingStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 rounded-2xl text-xs sm:text-sm mb-6 flex items-start gap-3 border ${
                        bookingStatus.success 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80' 
                          : 'bg-rose-50 text-rose-900 border-rose-200/80'
                      }`}
                      role="alert"
                    >
                      {bookingStatus.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 font-semibold leading-relaxed">
                        {bookingStatus.message}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reservation Execution Form */}
                <form onSubmit={handleCreateBooking} className="space-y-6" noValidate>
                  
                  {/* Space Selection Dropdown */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="room-selection" 
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Select Workspace Location <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="room-selection"
                        required
                        value={selectedRoomUuid}
                        onChange={(e) => setSelectedRoomUuid(e.target.value)}
                        disabled={isSubmitting || rooms.length === 0}
                        className="appearance-none block w-full px-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200 cursor-pointer"
                      >
                        <option value="" disabled className="text-slate-400">
                          -- Choose an available collaborative room --
                        </option>
                        {rooms.map((room) => (
                          <option key={room.roomUuid} value={room.roomUuid}>
                            Room {room.roomNumber} • Capacity: {room.capacity} Persons • ({room.location})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Scheduling Grid Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    
                    {/* Target Date */}
                    <div className="space-y-2">
                      <label 
                        htmlFor="booking-date" 
                        className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                      >
                        Target Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="booking-date"
                        type="date"
                        required
                        value={bookingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingDate(e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
                      />
                    </div>

                    {/* Start Time */}
                    <div className="space-y-2">
                      <label 
                        htmlFor="start-time" 
                        className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                      >
                        Start Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="start-time"
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
                      />
                    </div>

                    {/* End Time */}
                    <div className="space-y-2">
                      <label 
                        htmlFor="end-time" 
                        className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                      >
                        End Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="end-time"
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={isSubmitting}
                        className="block w-full px-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#7A1C2C] focus:ring-4 focus:ring-[#7A1C2C]/5 disabled:bg-slate-100 disabled:text-slate-400 transition-all duration-200"
                      />
                    </div>

                  </div>

                  {/* Institutional Booking Policy Note */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-[#DC9A22] mt-1.5 shrink-0" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-700 font-bold">Campus Policy:</strong> Reservations are held for 15 minutes past the start time before being released to the general student queue. Please ensure workspace clean-up prior to departure.
                    </p>
                  </div>

                  {/* Submit Action Trigger */}
                  <div className="pt-2">
                    <motion.button
                      whileHover={!isSubmitting ? { scale: 1.01, y: -1 } : {}}
                      whileTap={!isSubmitting ? { scale: 0.99, y: 0 } : {}}
                      type="submit"
                      disabled={isSubmitting || !selectedRoomUuid || !bookingDate || !startTime || !endTime}
                      className="w-full flex justify-center items-center py-4 px-6 bg-[#7A1C2C] hover:bg-[#631422] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#7A1C2C]/15 border border-[#7A1C2C]/10 focus:outline-none focus:ring-4 focus:ring-[#7A1C2C]/20 transition-all duration-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed group"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="font-bold tracking-wide text-slate-400">Processing Reservation...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 tracking-wide font-extrabold">
                          Confirm Space Reservation
                          <ArrowRight className="h-4 w-4 text-[#DC9A22] transition-transform group-hover:translate-x-1 stroke-[3]" />
                        </span>
                      )}
                    </motion.button>
                  </div>

                </form>

              </div>
            </motion.div>

          </div>

        </motion.div>

      </main>

      {/* System Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>KNUST Library Ecosystem • Secure Node</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Student Terms of Allocation</span>
            <span>Support Desk</span>
          </div>
        </div>
      </footer>

    </div>
  );
};