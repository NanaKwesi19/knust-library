import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { DataTable } from '../../ui/DataTable';
import { SearchInput } from '../../ui/SearchInput';
import { FilterSelect } from '../../ui/FilterSelect';
import { SlideOver } from '../../ui/SlideOver';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonTable } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useExport } from '../../../hooks/useExport';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate, formatDateTime, formatRelative } from '../../../utils/formatters';
import type { AuditLogRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  Shield,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  FileText,
  LogIn,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Key,
  Database,
  Settings,
  Eye,
  Filter,
  RotateCcw,
} from 'lucide-react';

const actionOptions = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'CHECKOUT', label: 'Checkout' },
  { value: 'RETURN', label: 'Return' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'IMPORT', label: 'Import' },
  { value: 'SYSTEM', label: 'System' },
];

const severityOptions = [
  { value: 'ALL', label: 'All Severities' },
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CRITICAL', label: 'Critical' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  CREATE: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  UPDATE: { icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  DELETE: { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  LOGIN: { icon: LogIn, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  LOGOUT: { icon: LogOut, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  APPROVE: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  REJECT: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  CHECKOUT: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  RETURN: { icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  PAYMENT: { icon: Key, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  EXPORT: { icon: Download, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  IMPORT: { icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  SYSTEM: { icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
};

const severityConfig: Record<string, { color: string; dot: string }> = {
  INFO: { color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  WARNING: { color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ERROR: { color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  CRITICAL: { color: 'bg-red-100 text-red-700 animate-pulse', dot: 'bg-red-600' },
};

export default function AuditLogs() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [viewingLog, setViewingLog] = useState<AuditLogRecord | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const debouncedSearch = useDebounce(search, 300);

  // --- QUERIES ---

  const { data: logsData, isLoading } = useQuery<ApiResponse<PaginatedResponse<AuditLogRecord>>>({
    queryKey: ['auditLogs', debouncedSearch, actionFilter, severityFilter, dateRange.startDate, dateRange.endDate, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // --- HANDLERS ---

  const handleExport = useCallback(() => {
    if (!logsData?.data?.data || logsData.data.data.length === 0) {
      addToast('Export Failed: No logs to export.');
      return;
    }
    exportToCSV({
      filename: `audit-logs-export-${new Date().toISOString().split('T')[0]}`,
      data: logsData.data.data.map(l => ({
        ID: l.id,
        Action: l.action,
        Description: l.description,
        Severity: l.severity || 'INFO',
        User: l.user?.fullName || 'System',
        'User Email': l.user?.email || '-',
        'Student ID': l.user?.studentId || '-',
        'IP Address': (l as any).ipAddress || '-',
        'User Agent': (l as any).userAgent || '-',
        Timestamp: formatDateTime(l.createdAt),
      })),
    });
    addToast('Export Complete: Audit logs exported successfully.');
  }, [logsData, exportToCSV, addToast]);

  const logs = logsData?.data?.data || [];
  const total = logsData?.data?.total || 0;
  const totalPages = logsData?.data?.totalPages || 1;

  const getActionDisplay = (action: string) => {
    const config = actionConfig[action] || actionConfig.SYSTEM;
    const Icon = config.icon;
    return (
      <div className={`h-7 w-7 rounded-lg flex items-center justify-center border ${config.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      </div>
    );
  };

  const columns = [
    {
      key: 'action',
      header: 'Action',
      width: '50px',
      align: 'center' as const,
      cell: (row: AuditLogRecord) => getActionDisplay(row.action),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row: AuditLogRecord) => (
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">{row.description}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.action}</div>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      cell: (row: AuditLogRecord) => (
        <div className="min-w-0">
          {row.user ? (
            <>
              <div className="text-xs font-bold text-slate-700 truncate">{row.user.fullName}</div>
              <div className="text-[10px] text-slate-400 font-mono">{row.user.studentId || row.user.email}</div>
            </>
          ) : (
            <span className="text-[11px] text-slate-400 italic">System</span>
          )}
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      align: 'center' as const,
      cell: (row: AuditLogRecord) => {
        const sev = row.severity || 'INFO';
        const config = severityConfig[sev] || severityConfig.INFO;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${config.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {sev}
          </span>
        );
      },
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      align: 'right' as const,
      cell: (row: AuditLogRecord) => (
        <div className="text-right">
          <div className="text-[11px] text-slate-500">{formatDateTime(row.createdAt)}</div>
          <div className="text-[9px] text-slate-400">{formatRelative(row.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '40px',
      align: 'center' as const,
      cell: (row: AuditLogRecord) => (
        <button
          onClick={() => setViewingLog(row)}
          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
          title="View Details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

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
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-600" />
            Audit Logs
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} total log entries
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by description, user, or action..."
          className="flex-1"
        />
        <FilterSelect
          value={actionFilter}
          onChange={setActionFilter}
          options={actionOptions}
          placeholder="Action"
          className="w-full sm:w-40"
        />
        <FilterSelect
          value={severityFilter}
          onChange={setSeverityFilter}
          options={severityOptions}
          placeholder="Severity"
          className="w-full sm:w-36"
        />
        <input
          type="date"
          value={dateRange.startDate}
          onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 w-full sm:w-auto"
          placeholder="From"
        />
        <input
          type="date"
          value={dateRange.endDate}
          onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 w-full sm:w-auto"
          placeholder="To"
        />
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={10} cols={columns.length} />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No logs found"
              description={debouncedSearch || actionFilter !== 'ALL' || severityFilter !== 'ALL' ? 'Try adjusting your filters.' : 'No audit logs have been recorded yet.'}
              icon={debouncedSearch ? 'search' : 'shield'}
              action={debouncedSearch || actionFilter !== 'ALL' || severityFilter !== 'ALL' ? {
                label: 'Clear Filters',
                onClick: () => {
                  setSearch('');
                  setActionFilter('ALL');
                  setSeverityFilter('ALL');
                  setDateRange({ startDate: '', endDate: '' });
                }
              } : undefined}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={logs}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {logs.length} of {total} entries
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Prev
                  </Button>
                  <span className="text-xs font-bold text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* Log Detail SlideOver */}
      <SlideOver
        isOpen={!!viewingLog}
        onClose={() => setViewingLog(null)}
        title="Audit Log Details"
        description={`Log ID: ${viewingLog?.id}`}
      >
        {viewingLog && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              {getActionDisplay(viewingLog.action)}
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingLog.action}</div>
                <div className="text-xs text-slate-500">{viewingLog.description}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  {(() => {
                    const sev = viewingLog.severity || 'INFO';
                    const config = severityConfig[sev] || severityConfig.INFO;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${config.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {sev}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">User Information</label>
                {viewingLog.user ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Name</div>
                      <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingLog.user.fullName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Email</div>
                        <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingLog.user.email}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Role</div>
                        <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingLog.user.role || '-'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-500 italic">System-generated action (no user)</div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Technical Details</label>
                <div className="space-y-2">
                  {(viewingLog as any).ipAddress && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">IP Address</div>
                      <div className="text-xs font-mono text-slate-700 mt-0.5">{(viewingLog as any).ipAddress}</div>
                    </div>
                  )}
                  {(viewingLog as any).userAgent && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">User Agent</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 break-all">{(viewingLog as any).userAgent}</div>
                    </div>
                  )}
                  {(viewingLog as any)?.metadata && Object.keys((viewingLog as any).metadata).length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Metadata</div>
                      <pre className="text-[10px] text-slate-600 font-mono overflow-x-auto">
                        {JSON.stringify((viewingLog as any).metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Log ID: <span className="font-mono text-slate-600">{viewingLog.id}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Timestamp: <span className="font-mono text-slate-600">{formatDateTime(viewingLog.createdAt)}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Relative: {formatRelative(viewingLog.createdAt)}
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </motion.div>
  );
}