import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { ErrorBoundary } from '../../ui/ErrorBoundary';

// Lazy load all admin sections for code splitting
const DashboardOverview = lazy(() => import('../dashboard/DashboardOverview'));
const UserManagement = lazy(() => import('../users/UserManagement'));
const BookInventory = lazy(() => import('../inventory/BookInventory'));
const BorrowingManagement = lazy(() => import('../borrowing/BorrowingManagement'));
const ReservationManagement = lazy(() => import('../reservations/ReservationManagement'));
const FineManagement = lazy(() => import('../fines/FineManagement'));
const DigitalResources = lazy(() => import('../resources/DigitalResources'));
const ReportsDashboard = lazy(() => import('../reports/ReportsDashboard'));
const AiInsights = lazy(() => import('../ai/AiInsights'));
const AuditLogs = lazy(() => import('../audit/AuditLogs'));
const SystemConfig = lazy(() => import('../config/SystemConfig'));
const MaintenanceNoticeSettings = lazy(() => import('../config/MaintenanceNoticeSettings'));
const MaintenanceManagement = lazy(() => import('../maintenance/MaintenanceManagement'));
const OpenLibrarySearch = lazy(() => import('../openlibrary/OpenLibrarySearch'));
const FacilityManagement = lazy(() => import('../facilities/FacilityManagement'));

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Checking permissions..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto"><Shield className="w-8 h-8 text-rose-500" /></div>
          <h2 className="text-lg font-black text-slate-900">Access Denied</h2>
          <p className="text-sm text-slate-500">You don't have permission to access this section.</p>
          <button onClick={() => window.history.back()} className="text-sm font-bold text-[#7A1C2C] hover:underline">Go Back</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const pageVariants: any = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? 72 : 256 }}>
        <AdminHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen message="Loading..." />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN', 'STAFF']}><DashboardOverview /></ProtectedRoute></motion.div>} />
                  <Route path="/users" element={<motion.div key="users" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><UserManagement /></ProtectedRoute></motion.div>} />
                  <Route path="/inventory" element={<motion.div key="inventory" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN', 'STAFF']}><BookInventory /></ProtectedRoute></motion.div>} />
                  <Route path="/borrowing" element={<motion.div key="borrowing" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN', 'STAFF']}><BorrowingManagement /></ProtectedRoute></motion.div>} />
                  <Route path="/reservations" element={<motion.div key="reservations" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN', 'STAFF']}><ReservationManagement /></ProtectedRoute></motion.div>} />
                  <Route path="/fines" element={<motion.div key="fines" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><FineManagement /></ProtectedRoute></motion.div>} />
                  <Route path="/resources" element={<motion.div key="resources" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN', 'STAFF']}><DigitalResources /></ProtectedRoute></motion.div>} />
                  <Route path="/reports" element={<motion.div key="reports" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><ReportsDashboard /></ProtectedRoute></motion.div>} />
                  <Route path="/ai" element={<motion.div key="ai" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><AiInsights /></ProtectedRoute></motion.div>} />
                  <Route path="/maintenance" element={<motion.div key="maintenance" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><MaintenanceManagement /></ProtectedRoute></motion.div>} />
                  <Route path="/audit" element={<motion.div key="audit" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN']}><AuditLogs /></ProtectedRoute></motion.div>} />
                  <Route path="/config" element={<motion.div key="config" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN']}><SystemConfig /></ProtectedRoute></motion.div>} />
                  <Route path="/maintenance-settings" element={<motion.div key="maintenance-settings" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN']}><MaintenanceNoticeSettings /></ProtectedRoute></motion.div>} />
                  <Route path="/open-library" element={<motion.div key="openlibrary" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><OpenLibrarySearch /></ProtectedRoute></motion.div>} />
                  <Route path="/facilities" element={<motion.div key="facilities" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProtectedRoute allowedRoles={['ADMIN', 'LIBRARIAN']}><FacilityManagement /></ProtectedRoute></motion.div>} />
                  <Route path="*" element={<motion.div key="404" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-full"><div className="text-center space-y-4"><div className="text-6xl font-black text-slate-200">404</div><h2 className="text-lg font-black text-slate-900">Page Not Found</h2><p className="text-sm text-slate-500">The page you're looking for doesn't exist.</p></div></motion.div>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
