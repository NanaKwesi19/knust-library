import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Sidebar } from '../../components/admin/layout/Sidebar';
import { Header } from '../../components/admin/layout/Header';
import { MobileNav } from '../../components/admin/layout/MobileNav';
import { CommandPalette } from '../../components/admin/layout/CommandPalette';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { AdminTab } from '../../types/admin';

// Lazy load all tab components for code splitting
const DashboardOverview = lazy(() => import('../../components/admin/dashboard/DashboardOverview'));
const UserManagement = lazy(() => import('../../components/admin/users/UserManagement'));
const BookInventory = lazy(() => import('../../components/admin/inventory/BookInventory'));
const BorrowingManagement = lazy(() => import('../../components/admin/borrowing/BorrowingManagement'));
const ReservationManagement = lazy(() => import('../../components/admin/reservations/ReservationManagement'));
const FineManagement = lazy(() => import('../../components/admin/fines/FineManagement'));
const DigitalResources = lazy(() => import('../../components/admin/digital/DigitalResources'));
const ReportsAnalytics = lazy(() => import('../../components/admin/analytics/ReportsAnalytics'));
const AIInsights = lazy(() => import('../../components/admin/ai/AIInsights'));
const AuditLogs = lazy(() => import('../../components/admin/audit/AuditLogs'));
const SystemConfig = lazy(() => import('../../components/admin/config/SystemConfig'));
const BackupMaintenance = lazy(() => import('../../components/admin/backup/BackupMaintenance'));

const tabComponents: Record<AdminTab, React.ComponentType> = {
  dashboard: DashboardOverview,
  users: UserManagement,
  inventory: BookInventory,
  borrowing: BorrowingManagement,
  reservations: ReservationManagement,
  fines: FineManagement,
  digital: DigitalResources,
  analytics: ReportsAnalytics,
  ai: AIInsights,
  audit: AuditLogs,
  config: SystemConfig,
  backup: BackupMaintenance,
};

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'System metrics and activity summary' },
  users: { title: 'User Management', subtitle: 'Manage students, staff, and permissions' },
  inventory: { title: 'Book Inventory', subtitle: 'Catalog management and copy tracking' },
  borrowing: { title: 'Borrowing Management', subtitle: 'Checkouts, returns, and loan tracking' },
  reservations: { title: 'Reservations', subtitle: 'Space bookings and hold queues' },
  fines: { title: 'Fines & Payments', subtitle: 'Financial accounts and payment verification' },
  digital: { title: 'Digital Resources', subtitle: 'External repositories and access links' },
  analytics: { title: 'Reports & Analytics', subtitle: 'Charts, trends, and data exports' },
  ai: { title: 'AI Insights', subtitle: 'Demand forecasting and predictions' },
  audit: { title: 'Audit Logs', subtitle: 'Security trace and action history' },
  config: { title: 'System Configuration', subtitle: 'Global settings and thresholds' },
  backup: { title: 'Maintenance', subtitle: 'Backups, health checks, and recovery' },
};

const LoadingFallback: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="h-64 bg-slate-100 rounded-2xl" />
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    addToast({
      title: 'Tab Changed',
      message: `Navigated to ${tabTitles[tab].title}`,
      type: 'info',
      duration: 1500,
    });
  }, [addToast]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    addToast({
      title: 'Search',
      message: `Searching for: ${query}`,
      type: 'info',
      duration: 2000,
    });
  }, [addToast]);

  const ActiveComponent = tabComponents[activeTab];
  const { title, subtitle } = tabTitles[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setMobileNavOpen(true)}
          onSearch={handleSearch}
          notificationCount={3} // TODO: Connect to real notification count
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1500px] mx-auto">
            <Suspense fallback={<LoadingFallback />}>
              <ActiveComponent />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleTabChange}
      />
    </div>
  );
};