import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { BentoGrid, BentoItem } from '../layout/BentoGrid';
import { StatCard } from '../../ui/StatCard';
import { StatSparkline } from '../../charts/StatSparkline';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { DataTable } from '../../ui/DataTable';
import { EmptyState } from '../../ui/EmptyState';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatCurrency, formatNumber, formatRelative } from '../../../utils/formatters';
import { Modal } from '../../ui/Modal';
import { BookForm } from '../inventory/BookForm';
import { UserForm } from '../users/UserForm';
import type { ApiResponse } from '../../../types/admin';
import {
  ArrowLeftRight,
  Users,
  ShieldCheck,
  BookOpen,
  Coins,
  Clock,
  AlertTriangle,
  Zap,
  ArrowRight,
  Plus,
  CheckCircle2,
  Activity,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  UserPlus,
  Barcode,
  User,
  Calendar,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any } },
};

// --- TYPE INTERFACES FOR BACKEND RESPONSES ---

interface SystemStats {
  activeLoans: number;
  totalUsers: number;
  securityLogsCount: number;
  totalBooks: number;
  totalFines: number;
  overdueLoans: number;
}

interface ActiveLoanRecord {
  id: number;
  loanUuid: string;
  dueDate: string;
  status: string;
  user: { fullName: string; email: string; studentId: string | null };
  copy: { barcode: string; book: { title: string; author: string; isbn: string } };
}

interface AuditLogRecord {
  id: number;
  action: string;
  description: string;
  createdAt: string;
  severity?: string;
  user: { fullName: string } | null;
}

interface WeeklyTrend {
  week: string;
  startDate: string;
  endDate: string;
  checkouts: number;
  returns: number;
  newUsers: number;
  newFines: number;
}

interface OverdueSummary {
  totalOverdue: number;
  overdueBreakdown: {
    lessThan7Days: number;
    days7to14: number;
    days14to30: number;
    moreThan30Days: number;
  };
  topOverdueUsers: Array<{
    id: number;
    loanUuid: string;
    dueDate: string;
    daysOverdue: number;
    user: { fullName: string; email: string; studentId: string | null };
    copy: { book: { title: string } };
  }>;
}

interface SystemHealth {
  databaseStatus: string;
  apiLatencyMs: number;
  uptime: number;
  diskUsagePercent: number;
  totalComplaints: number;
  openComplaints: number;
  resolvedToday: number;
  recentComplaints: any[];
}

interface FineSummary {
  summary: {
    totalFines: number;
    totalPaid: number;
    totalUnpaid: number;
    totalWaived: number;
    totalCount: number;
    collectionRate: number;
  };
  recentFines: any[];
}

interface UserGrowth {
  month: string;
  newUsers: number;
  totalUsers: number;
}

export default function DashboardOverview() {
  const { addToast } = useToast();

  // Quick Action Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // --- REAL BACKEND QUERIES ---

  const { data: statsData, isLoading: statsLoading } = useQuery<ApiResponse<SystemStats>>({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const res = await API.get('/analytics/system-aggregates');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: loansData, isLoading: loansLoading } = useQuery<ApiResponse<{ data: ActiveLoanRecord[]; total: number; page: number; totalPages: number }>>({
    queryKey: ['activeLoans'],
    queryFn: async () => {
      const res = await API.get('/loans/active-ledger');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<ApiResponse<AuditLogRecord[]>>({
    queryKey: ['recentAuditLogs'],
    queryFn: async () => {
      const res = await API.get('/audit-logs/recent?limit=10');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const { data: trendsData } = useQuery<ApiResponse<WeeklyTrend[]>>({
    queryKey: ['weeklyTrends'],
    queryFn: async () => {
      const res = await API.get('/analytics/weekly-trends');
      return res.data;
    },
  });

  const { data: overdueData } = useQuery<ApiResponse<OverdueSummary>>({
    queryKey: ['overdueSummary'],
    queryFn: async () => {
      const res = await API.get('/loans/overdue-summary');
      return res.data;
    },
  });

  const { data: healthData } = useQuery<ApiResponse<SystemHealth>>({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await API.get('/maintenance/system-status');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: finesData } = useQuery<ApiResponse<FineSummary>>({
    queryKey: ['fineSummary'],
    queryFn: async () => {
      const res = await API.get('/loans/fines/summary');
      return res.data;
    },
  });

  const { data: userGrowthData } = useQuery<ApiResponse<UserGrowth[]>>({
    queryKey: ['userGrowth'],
    queryFn: async () => {
      const res = await API.get('/analytics/user-growth');
      return res.data;
    },
  });

  // --- DERIVED DATA ---

  const stats = statsData?.data;
  const loans = loansData?.data?.data || [];
  const auditLogs = auditData?.data || [];
  const trends = trendsData?.data || [];
  const overdue = overdueData?.data;
  const health = healthData?.data;
  const fines = finesData?.data;
  const userGrowth = userGrowthData?.data || [];

  const checkoutSparkline = trends.map(t => t?.checkouts || 0);

  const getAuditColor = (action: string): string => {
    if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('FAIL')) return 'bg-rose-500';
    if (action.includes('REGISTER') || action.includes('PAYMENT') || action.includes('APPROVE')) return 'bg-emerald-500';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-500';
    if (action.includes('WARNING') || action.includes('OVERDUE')) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const safeFormatRelative = (date: string | null | undefined) => {
    if (!date) return 'Just now';
    return formatRelative(date);
  };

  const safeFormatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return formatDate(date);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stat Cards Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Book Loans"
          value={stats?.activeLoans ?? '-'}
          subtitle="Physical volumes out"
          icon={<ArrowLeftRight className="h-5 w-5" />}
          iconBg="bg-blue-50 border-blue-100"
          iconColor="text-blue-600"
          isLoading={statsLoading}
        />
        <StatCard
          title="Registered Users"
          value={formatNumber(stats?.totalUsers)}
          subtitle="Active accounts"
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-purple-50 border-purple-100"
          iconColor="text-purple-600"
          isLoading={statsLoading}
        />
        <StatCard
          title="System Alerts"
          value={stats?.securityLogsCount ?? '-'}
          subtitle="Require attention"
          icon={<ShieldCheck className="h-5 w-5" />}
          iconBg="bg-rose-50 border-rose-100"
          iconColor="text-rose-600"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Books"
          value={formatNumber(stats?.totalBooks)}
          subtitle="In catalog"
          icon={<BookOpen className="h-5 w-5" />}
          iconBg="bg-emerald-50 border-emerald-100"
          iconColor="text-emerald-600"
          isLoading={statsLoading}
        />
      </motion.div>

      {/* Bento Grid Dashboard */}
      <BentoGrid>
        {/* Circulation Trends Chart */}
        <BentoItem colSpan={2} title="Circulation Trends" icon={<Activity className="w-4 h-4" />}>
          {trends.length === 0 ? (
            <EmptyState
              title="No trend data"
              description="Weekly circulation data will appear here once loans are recorded."
              icon="book"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {checkoutSparkline.reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Checkouts this week</div>
                </div>
                <Badge variant="success" dot>Live data</Badge>
              </div>
              {checkoutSparkline.length > 0 && (
                <StatSparkline data={checkoutSparkline} color="#7A1C2C" height={80} />
              )}
              <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#7A1C2C]" />
                  Checkouts
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Returns
                </span>
              </div>
            </div>
          )}
        </BentoItem>

        {/* Quick Actions - Compact Single Column */}
        <BentoItem title="Quick Actions" icon={<Zap className="w-4 h-4 text-amber-500" />}>
          <div className="space-y-2">
            <button
              onClick={() => setActiveModal('checkout')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-[#7A1C2C]/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-[#7A1C2C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-700">New Checkout</div>
                <div className="text-[10px] text-slate-400">Process a loan</div>
              </div>
            </button>
            <button
              onClick={() => setActiveModal('return')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-700">Process Return</div>
                <div className="text-[10px] text-slate-400">Check in books</div>
              </div>
            </button>
            <button
              onClick={() => setActiveModal('addUser')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-700">Add User</div>
                <div className="text-[10px] text-slate-400">New account</div>
              </div>
            </button>
            <button
              onClick={() => setActiveModal('addBook')}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-700">Add Book</div>
                <div className="text-[10px] text-slate-400">New catalog entry</div>
              </div>
            </button>
          </div>
        </BentoItem>

        {/* Overdue Alerts */}
        <BentoItem title="Overdue Alerts" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
          {!overdue ? (
            <EmptyState
              title="Loading..."
              description="Fetching overdue data from server."
              icon="alert"
            />
          ) : overdue.totalOverdue === 0 ? (
            <EmptyState
              title="No overdue books"
              description="All loans are currently on time. Great!"
              icon="book"
            />
          ) : (
            <div className="space-y-3">
              <div className="text-3xl font-black text-rose-600">{overdue.totalOverdue}</div>
              <div className="text-xs text-slate-400 font-medium">Books overdue</div>
              <div className="space-y-2">
                {overdue.topOverdueUsers.slice(0, 3).map((loan, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-700 truncate">{loan.copy?.book?.title || 'Unknown Book'}</div>
                      <div className="text-slate-400">{loan.user?.fullName || 'Unknown User'}</div>
                    </div>
                    <Badge variant="danger" size="sm">{loan.daysOverdue}d</Badge>
                  </div>
                ))}
              </div>
              {overdue.topOverdueUsers.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full text-[#7A1C2C]">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </BentoItem>

        {/* System Status */}
        <BentoItem title="System Health" icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}>
          {!health ? (
            <EmptyState
              title="Loading..."
              description="Fetching system health status."
              icon="alert"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Database</span>
                <Badge
                  variant={health.databaseStatus === 'CONNECTED' ? 'success' : 'danger'}
                  size="sm"
                  dot
                >
                  {health.databaseStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">API Latency</span>
                <span className="text-xs font-bold text-slate-700">{health.apiLatencyMs}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Uptime</span>
                <span className="text-xs font-bold text-slate-700">{health.uptime}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Disk Usage</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${health.diskUsagePercent}%`,
                        backgroundColor: health.diskUsagePercent > 90 ? '#EF4444' : health.diskUsagePercent > 75 ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{health.diskUsagePercent}%</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All systems operational
                </div>
              </div>
            </div>
          )}
        </BentoItem>

        {/* Recent Activity Feed */}
        <BentoItem colSpan={2} title="Recent Activity" icon={<Clock className="w-4 h-4" />}>
          {auditLoading ? (
            <EmptyState
              title="Loading..."
              description="Fetching recent activity from audit logs."
              icon="alert"
            />
          ) : auditLogs.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="System actions will be logged here automatically."
              icon="inbox"
            />
          ) : (
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${getAuditColor(log.action)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700">{log.action}</div>
                    <div className="text-slate-400 truncate">{log.description}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {safeFormatRelative(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BentoItem>

        {/* User Growth */}
        <BentoItem title="User Growth" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}>
          {!userGrowth || userGrowth.length === 0 ? (
            <EmptyState
              title="Loading..."
              description="Fetching user growth data."
              icon="users"
            />
          ) : (
            <div className="space-y-2">
              {(() => {
                const last = userGrowth[userGrowth.length - 1];
                const prev = userGrowth[userGrowth.length - 2];
                const newThisMonth = last?.newUsers || 0;
                const prevNew = prev?.newUsers || 0;
                const change = prevNew > 0 
                  ? Math.round(((newThisMonth - prevNew) / prevNew) * 100) 
                  : 0;
                
                return (
                  <>
                    <div className="text-2xl font-black text-slate-900">
                      {newThisMonth > 0 ? `+${formatNumber(newThisMonth)}` : formatNumber(newThisMonth)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">New users this month</div>
                    {userGrowth.length > 0 && (
                      <StatSparkline data={userGrowth.map(g => g?.newUsers || 0)} color="#10B981" height={60} />
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {change >= 0 ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +{change}%
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {change}%
                        </span>
                      )}
                      <span className="text-slate-400 font-medium">from last month</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </BentoItem>

        {/* Fine Collection */}
        <BentoItem title="Fine Collection" icon={<Coins className="w-4 h-4 text-[#DC9A22]" />}>
          {!fines?.summary ? (
            <EmptyState
              title="Loading..."
              description="Fetching fine collection data."
              icon="alert"
            />
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(fines.summary.totalPaid)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Collected this month</div>
              <StatSparkline 
                data={[
                  fines.summary.totalUnpaid || 0,
                  fines.summary.totalPaid || 0,
                  fines.summary.totalWaived || 0
                ].filter(v => v > 0)} 
                color="#DC9A22" 
                height={60} 
              />
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {fines.summary.collectionRate || 0}%
                </span>
                <span className="text-slate-400 font-medium">collection rate</span>
              </div>
            </div>
          )}
        </BentoItem>
      </BentoGrid>

      {/* Circulation Activity Table */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Circulation Activity
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Latest book loans and returns
              </p>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View All
            </Button>
          </div>

          {loansLoading ? (
            <div className="p-8">
              <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : loans.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Circulation records will appear here when books are checked out or returned."
              icon="book"
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'bookTitle',
                  header: 'Book Title',
                  cell: (row) => (
                    <div className="font-bold text-slate-900 truncate max-w-[200px]">
                      {row.copy?.book?.title || 'Unknown Book'}
                    </div>
                  ),
                },
                {
                  key: 'author',
                  header: 'Author',
                  cell: (row) => (
                    <span className="text-slate-500">{row.copy?.book?.author || 'N/A'}</span>
                  ),
                },
                {
                  key: 'borrowerName',
                  header: 'Borrower',
                  cell: (row) => (
                    <span className="text-slate-600">{row.user?.fullName || 'Unknown'}</span>
                  ),
                },
                {
                  key: 'dueDate',
                  header: 'Due Date',
                  cell: (row) => (
                    <span className="text-slate-500">{safeFormatDate(row.dueDate)}</span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  cell: (row) => (
                    <Badge
                      variant={
                        row.status === 'BORROWED' ? 'primary' :
                        row.status === 'RETURNED' ? 'success' :
                        row.status === 'OVERDUE' ? 'danger' :
                        'warning'
                      }
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  ),
                },
              ]}
              data={loans.slice(0, 5)}
              keyExtractor={(row) => row.loanUuid || row.id}
              emptyTitle="No circulation records"
              emptyDescription="Books checked out will appear here"
              emptyIcon="book"
            />
          )}
        </div>
      </motion.div>

      {/* Quick Action Modals */}
      <Modal
        isOpen={activeModal === 'addBook'}
        onClose={() => setActiveModal(null)}
        title="Add New Book"
        description="Add a new book to the library catalog."
        size="lg"
      >
        <BookForm onSuccess={() => setActiveModal(null)} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal
        isOpen={activeModal === 'addUser'}
        onClose={() => setActiveModal(null)}
        title="Create New User"
        description="Register a new student, staff, or admin account."
        size="lg"
      >
        <UserForm onSuccess={() => setActiveModal(null)} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal
        isOpen={activeModal === 'checkout'}
        onClose={() => setActiveModal(null)}
        title="New Checkout"
        description="Process a new book loan."
      >
        <QuickCheckoutForm onSuccess={() => setActiveModal(null)} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal
        isOpen={activeModal === 'return'}
        onClose={() => setActiveModal(null)}
        title="Process Return"
        description="Return a borrowed book."
      >
        <QuickReturnForm onSuccess={() => setActiveModal(null)} onCancel={() => setActiveModal(null)} />
      </Modal>
    </motion.div>
  );
}

// Quick Checkout Form Component
function QuickCheckoutForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await API.post('/loans/checkout', { studentId, barcode, durationDays });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      addToast({ title: 'Success', message: 'Book checked out successfully.', type: 'success' });
      onSuccess();
    } catch (error: any) {
      addToast({ title: 'Error', message: error?.response?.data?.error || 'Checkout failed.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Student ID *</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="20234567" className={`${inputClass} pl-10`} required />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Book Barcode *</label>
        <div className="relative">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="KNUST-BK-00001" className={`${inputClass} pl-10`} required />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Duration (days)</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="number" value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} min={1} max={90} className={`${inputClass} pl-10`} required />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>Checkout</Button>
      </div>
    </form>
  );
}

// Quick Return Form Component
function QuickReturnForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [loanUuid, setLoanUuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await API.post('/loans/return', { loanUuid });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      addToast({ title: 'Success', message: 'Book returned successfully.', type: 'success' });
      onSuccess();
    } catch (error: any) {
      addToast({ title: 'Error', message: error?.response?.data?.error || 'Return failed.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Loan UUID *</label>
        <div className="relative">
          <RotateCcw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={loanUuid} onChange={e => setLoanUuid(e.target.value)} placeholder="LOAN-ABC123" className={`${inputClass} pl-10`} required />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>Process Return</Button>
      </div>
    </form>
  );
}