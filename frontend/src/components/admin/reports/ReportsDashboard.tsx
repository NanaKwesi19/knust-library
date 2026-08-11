import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useExport } from '../../../hooks/useExport';
import { formatDate, formatCurrency, formatNumber } from '../../../utils/formatters';
import { BarChart } from '../../charts/BarChart';
import { LineChart } from '../../charts/LineChart';
import { AreaChart } from '../../charts/AreaChart';
import { StatSparkline } from '../../charts/StatSparkline';
import { ChartCard } from '../../charts/ChartCard';
import {
  BookOpen,
  Users,
  Download,
  Clock,
  Activity,
  Coins,
  TrendingUp,
  CreditCard,
  Wallet,
  Percent,
} from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface CirculationReport {
  totalCheckouts: number;
  totalReturns: number;
  totalRenewals: number;
  totalActive: number;
  dailyStats: Array<{
    date: string;
    checkouts: number;
    returns: number;
    renewals: number;
  }>;
  records: any[];
}

interface UserActivityReport {
  summary: {
    totalUsers: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INACTIVE: number;
  };
  records: any[];
}

interface FineCollectionReport {
  summary: {
    totalFinesIssued: number;
    totalPaid: number;
    totalWaived: number;
    totalUnpaid: number;
    collectionRate: number;
  };
  fines: any[];
  payments: any[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ReportsDashboard() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [activeTab, setActiveTab] = useState<'circulation' | 'users' | 'fines'>('circulation');

  const { data: circulationData, isLoading: circulationLoading } = useQuery({
    queryKey: ['circulationReport', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      const res = await API.get(`/analytics/circulation-report?${params.toString()}`);
      return res.data;
    },
  });

  const { data: userActivityData, isLoading: userActivityLoading } = useQuery({
    queryKey: ['userActivityReport', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      const res = await API.get(`/analytics/user-activity-report?${params.toString()}`);
      return res.data;
    },
  });

  const { data: fineCollectionData, isLoading: fineCollectionLoading } = useQuery({
    queryKey: ['fineCollectionReport', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      const res = await API.get(`/analytics/fine-collection-report?${params.toString()}`);
      return res.data;
    },
  });

  const circulation: CirculationReport | null = circulationData?.data;
  const userActivity: UserActivityReport | null = userActivityData?.data;
  const fineCollection: FineCollectionReport | null = fineCollectionData?.data;

  const handleExport = (type: 'circulation' | 'users' | 'fines') => {
    let data: Record<string, any>[] = [];
    let filename = '';

    if (type === 'circulation' && circulation) {
      filename = `circulation-report-${dateRange.startDate}-to-${dateRange.endDate}`;
      data = circulation.dailyStats.map(d => ({
        Date: d.date,
        Checkouts: d.checkouts,
        Returns: d.returns,
        Renewals: d.renewals,
      }));
    } else if (type === 'users' && userActivity) {
      filename = `user-activity-report-${dateRange.startDate}-to-${dateRange.endDate}`;
      data = userActivity.records.map((u: any) => ({
        Name: u.fullName,
        Email: u.email,
        Role: u.role,
        Status: u.status,
        Loans: u._count?.loans || 0,
        Reservations: u._count?.reservations || 0,
        'Reading History': u._count?.readingHistory || 0,
      }));
    } else if (type === 'fines' && fineCollection) {
      filename = `fine-collection-report-${dateRange.startDate}-to-${dateRange.endDate}`;
      data = fineCollection.fines.map((f: any) => ({
        'User': f.user?.fullName || '-',
        'Student ID': f.user?.studentId || '-',
        'Amount': f.amount,
        'Status': f.status,
        'Reason': f.reason,
        'Created': formatDate(f.createdAt),
      }));
    }

    if (data.length === 0) {
      addToast('No data to export.', 'info');
      return;
    }

    exportToCSV({ filename, data });
    addToast('Report exported successfully.', 'success');
  };

  const isLoading = circulationLoading || userActivityLoading || fineCollectionLoading;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reports & Analytics</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Comprehensive library activity reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10"
          />
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'circulation' as const, label: 'Circulation', icon: BookOpen },
          { key: 'users' as const, label: 'User Activity', icon: Users },
          { key: 'fines' as const, label: 'Fine Collection', icon: Coins },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-[#7A1C2C] text-[#7A1C2C]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {activeTab === 'circulation' && circulation && (
            <CirculationTab data={circulation} onExport={() => handleExport('circulation')} />
          )}
          {activeTab === 'users' && userActivity && (
            <UserActivityTab data={userActivity} onExport={() => handleExport('users')} />
          )}
          {activeTab === 'fines' && fineCollection && (
            <FineCollectionTab data={fineCollection} onExport={() => handleExport('fines')} />
          )}
        </>
      )}
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function CirculationTab({ data, onExport }: { data: CirculationReport; onExport: () => void }) {
  const dailyLabels = data.dailyStats.map(d => d.date);
  const checkoutData = data.dailyStats.map(d => d.checkouts);
  const returnData = data.dailyStats.map(d => d.returns);
  const renewalData = data.dailyStats.map(d => d.renewals);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ChartCard
          title="Checkouts"
          {...({ value: formatNumber(data.totalCheckouts) } as any)}
          icon={<BookOpen className="w-4 h-4 text-blue-600" />}
          trend="+12%"
          trendUp={true}
        />
        <ChartCard
          title="Returns"
          {...({ value: formatNumber(data.totalReturns) } as any)}
          icon={<Clock className="w-4 h-4 text-emerald-600" />}
          trend="+8%"
          trendUp={true}
        />
        <ChartCard
          title="Renewals"
          {...({ value: formatNumber(data.totalRenewals) } as any)}
          icon={<Activity className="w-4 h-4 text-purple-600" />}
          trend="-3%"
          trendUp={false}
        />
        <ChartCard
          title="Active Loans"
          {...({ value: formatNumber(data.totalActive) } as any)}
          icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
          trend="+5%"
          trendUp={true}
        />
      </div>

      {/* Daily Activity Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-slate-800">Daily Circulation Activity</div>
            <div className="text-[10px] text-slate-400">Checkouts vs Returns over time</div>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={onExport}>
            Export
          </Button>
        </div>
        <BarChart
          data={[
            { label: 'Checkouts', data: checkoutData as any, color: '#3B82F6' },
            { label: 'Returns', data: returnData as any, color: '#10B981' },
            { label: 'Renewals', data: renewalData as any, color: '#8B5CF6' },
          ]}
          
          bars={[
            { dataKey: 'Checkouts', color: '#3B82F6' },
            { dataKey: 'Returns', color: '#10B981' },
            { dataKey: 'Renewals', color: '#8B5CF6' },
          ]}
          xAxisKey="label"
          height={240}
        />
      </Card>

      {/* Sparkline Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Checkout Trend</div>
          <StatSparkline data={checkoutData} color="#3B82F6" height={60} />
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Return Trend</div>
          <StatSparkline data={returnData} color="#10B981" height={60} />
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Renewal Trend</div>
          <StatSparkline data={renewalData} color="#8B5CF6" height={60} />
        </Card>
      </div>
    </div>
  );
}

function UserActivityTab({ data, onExport }: { data: UserActivityReport; onExport: () => void }) {
  const activityData = [
    { label: 'High', value: data.summary.HIGH, color: '#10B981' },
    { label: 'Medium', value: data.summary.MEDIUM, color: '#3B82F6' },
    { label: 'Low', value: data.summary.LOW, color: '#F59E0B' },
    { label: 'Inactive', value: data.summary.INACTIVE, color: '#94A3B8' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* @ts-ignore */}
        <ChartCard
          title="Total Users"
          {...({ value: formatNumber(data.summary.totalUsers) } as any)}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          trend="+15%"
          trendUp={true}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="High Activity"
          {...({ value: formatNumber(data.summary.HIGH) } as any)}
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          trend="+22%"
          trendUp={true}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="Medium Activity"
          {...({ value: formatNumber(data.summary.MEDIUM) } as any)}
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          trend="+8%"
          trendUp={true}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="Inactive"
          {...({ value: formatNumber(data.summary.INACTIVE) } as any)}
          icon={<Clock className="w-4 h-4 text-slate-400" />}
          trend="-5%"
          trendUp={false}
        />
      </div>

      {/* Activity Breakdown */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-slate-800">User Activity Distribution</div>
            <div className="text-[10px] text-slate-400">Breakdown by engagement level</div>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={onExport}>
            Export
          </Button>
        </div>
        <div className="space-y-3">
          {activityData.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-20 text-xs font-bold text-slate-600">{item.label}</div>
              <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.summary.totalUsers > 0 ? (item.value / data.summary.totalUsers) * 100 : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="w-12 text-xs font-bold text-slate-900 text-right">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* User List */}
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-800 mb-4">Recent Users</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.records.slice(0, 20).map((user: any) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#7A1C2C] flex items-center justify-center text-white text-[10px] font-black">
                  {user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.fullName}</div>
                  <div className="text-[10px] text-slate-400">{user.email} • {user.role}</div>
                </div>
              </div>
              <Badge
                variant={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'danger' : 'warning'}
                size="sm"
              >
                {user.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FineCollectionTab({ data, onExport }: { data: FineCollectionReport; onExport: () => void }) {
  const dailyLabels = data.payments.map((p: any) => formatDate(p.createdAt)).slice(-30);
  const paymentData = data.payments.map((p: any) => p.amount).slice(-30);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* @ts-ignore */}
        <ChartCard
          title="Total Issued"
          {...({ value: formatCurrency(data.summary.totalFinesIssued) } as any)}
          icon={<Wallet className="w-4 h-4 text-rose-600" />}
          trend="+18%"
          trendUp={true}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="Collected"
          {...({ value: formatCurrency(data.summary.totalPaid) } as any)}
          icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
          trend="+24%"
          trendUp={true}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="Waived"
          {...({ value: formatCurrency(data.summary.totalWaived) } as any)}
          icon={<Percent className="w-4 h-4 text-amber-600" />}
          trend="-12%"
          trendUp={false}
        />
        {/* @ts-ignore */}
        <ChartCard
          title="Collection Rate"
          {...({ value: `${data.summary.collectionRate.toFixed(1)}%` } as any)}
          icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
          trend="+5%"
          trendUp={true}
        />
      </div>

      {/* Collection Trend */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-slate-800">Fine Collection Trend</div>
            <div className="text-[10px] text-slate-400">Payment amounts over time</div>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={onExport}>
            Export
          </Button>
        </div>
        <AreaChart
          data={dailyLabels.map((label, index) => ({ date: label, Payments: paymentData[index] }))}
          areas={[{ dataKey: 'Payments', color: '#10B981', fillOpacity: 0.3 }]}
          xAxisKey="date"
          height={240}
        />
      </Card>

      {/* Recent Fines */}
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-800 mb-4">Recent Fines</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.fines.slice(0, 20).map((fine: any) => (
            <div key={fine.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 text-[10px] font-black">
                  GH₵
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{fine.user?.fullName || 'Unknown'}</div>
                  <div className="text-[10px] text-slate-400">{fine.reason} • {formatDate(fine.createdAt)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">GH₵{fine.amount.toFixed(2)}</div>
                <Badge
                  variant={fine.status === 'PAID' ? 'success' : fine.status === 'WAIVED' ? 'warning' : 'danger'}
                  size="sm"
                >
                  {fine.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}