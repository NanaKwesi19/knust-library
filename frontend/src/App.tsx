import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/ui/LoadingScreen';

// Eager load auth pages
import { Login } from './pages/Login';
import { Register } from './pages/RegisterPage';

// Lazy load admin dashboard
const AdminDashboard = lazy(() => import('./components/admin/layout/AdminDashboard'));


// Lazy load student portal
const PortalLayout = lazy(() => import('./components/layout/PortalLayout'));
const DashboardOverview = lazy(() => import('./components/layout/modules/DashboardOverview'));
const CatalogExplorer = lazy(() => import('./components/layout/modules/CatalogExplorer'));
const MyBorrowedBooks = lazy(() => import('./components/layout/modules/MyBorrowedBooks'));
const ReservationsPanel = lazy(() => import('./components/layout/modules/ReservationsPanel'));
const StudySpaceScheduler = lazy(() => import('./components/layout/modules/StudySpaceScheduler'));
const DigitalLibrary = lazy(() => import('./components/layout/modules/DigitalLibrary'));
const NotificationsPanel = lazy(() => import('./components/layout/modules/NotificationsPanel'));
const DigitalIdentity = lazy(() => import('./components/layout/modules/DigitalIdentity'));
const FinesPayments = lazy(() => import('./components/layout/modules/FinesPayments'));
const ReadingHistory = lazy(() => import('./components/layout/modules/ReadingHistory'));
const Recommendations = lazy(() => import('./components/layout/modules/Recommendations'));
const ProfileSettings = lazy(() => import('./components/layout/modules/ProfileSettings'));
const LibraryHelpDesk = lazy(() => import('./components/layout/modules/LibraryHelpDesk'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen message="Verifying..." />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' || user.role === 'LIBRARIAN' ? '/admin' : '/portal'} replace />;
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen message="Loading..." />;
  
  if (token && user) {
    return <Navigate to={user.role === 'ADMIN' || user.role === 'LIBRARIAN' ? '/admin' : '/portal'} replace />;
  }
  
  return <>{children}</>;
}

function StudentPortal() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) logout();
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <PortalLayout
      activeStudentName={user.fullName || 'Student'}
      studentId={user.studentId || ''}
      onLogout={handleLogout}
    >
      <Routes>
        <Route index element={<DashboardOverview />} />
        <Route path="catalog" element={<CatalogExplorer />} />
        <Route path="borrowed" element={<MyBorrowedBooks />} />
        <Route path="reservations" element={<ReservationsPanel />} />
        <Route path="workspace" element={<StudySpaceScheduler />} />
        <Route path="digital" element={<DigitalLibrary userId={user.studentId || (user as any).userId || ''} />} />
        <Route path="notifications" element={<NotificationsPanel />} />
        <Route path="identity" element={<DigitalIdentity />} />
        <Route path="fines" element={<FinesPayments />} />
        <Route path="history" element={<ReadingHistory />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="helpdesk" element={<LibraryHelpDesk />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route
        path="/admin/*"
        element={
          <RequireAuth roles={['ADMIN', 'LIBRARIAN']}>
            <Suspense fallback={<LoadingScreen message="Loading admin..." />}>
              <AdminDashboard />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/portal/*"
        element={
          <RequireAuth roles={['STUDENT', 'STAFF']}>
            <Suspense fallback={<LoadingScreen message="Loading portal..." />}>
              <StudentPortal />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}