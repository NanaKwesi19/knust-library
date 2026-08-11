import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { DataTable } from '../../ui/DataTable';
import { SearchInput } from '../../ui/SearchInput';
import { FilterSelect } from '../../ui/FilterSelect';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonTable } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatRelative } from '../../../utils/formatters';
import LibraryIssueDetails from './LibraryIssueDetails';
import { isLibraryIssue } from './libraryIssueUtils';
import {
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ComplaintRecord {
  id: number;
  title: string;
  description: string;
  roomNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  user?: {
    id?: number;
    fullName?: string;
    email?: string;
    studentId?: string | null;
  } | null;
  resolvedBy?: {
    fullName?: string;
  } | null;
}

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Safe formatters that never throw
const safeFormatRelative = (date: any) => {
  try {
    if (!date) return '—';
    return formatRelative(date);
  } catch (e) {
    console.warn('formatRelative failed:', e);
    return String(date).slice(0, 10) || '—';
  }
};

const safeFormatDate = (date: any) => {
  try {
    if (!date) return '—';
    return formatDate(date);
  } catch (e) {
    console.warn('formatDate failed:', e);
    return String(date).slice(0, 10) || '—';
  }
};

export default function MaintenanceManagement() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [viewingComplaint, setViewingComplaint] = useState<ComplaintRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data: complaintsData, isLoading, error } = useQuery({
    queryKey: ['maintenanceAll', search, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      const res = await API.get(`/maintenance/all?${params.toString()}`);
      console.log('[MaintenanceManagement] API response:', res.data);
      return res.data;
    },
  });

  if (error) {
    console.error('[MaintenanceManagement] Query error:', error);
  }

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await API.patch(`/maintenance/${id}/status`, { status });
      return res.data;
    },
    onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['maintenanceAll'] });

  await queryClient.refetchQueries({
    queryKey: ['maintenanceAll'],
    type: 'active',
  });

  addToast('Status Updated: Complaint status has been updated and student notified.');
  setUpdatingId(null);
},
    onError: (error: any) => {
      addToast('Error: ' + (error?.response?.data?.error || 'Failed to update status.'));
    },
  });

  const complaints = complaintsData?.data?.data || [];
  const total = complaintsData?.data?.total || 0;
  const totalPages = complaintsData?.data?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === 'PENDING') return <Badge variant="warning" size="sm" dot>Pending</Badge>;
    if (s === 'IN_PROGRESS') return <Badge variant="info" size="sm" dot>In Progress</Badge>;
    if (s === 'RESOLVED') return <Badge variant="success" size="sm" dot>Resolved</Badge>;
    return <Badge variant="default" size="sm">{status}</Badge>;
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      cell: (row: ComplaintRecord) => {
        // EXTREME DEFENSIVE: handle completely missing user
        const user = row.user || {};
        const name = user.fullName || 'Unknown';
        const id = user.studentId || user.email || 'N/A';
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">{name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{id}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Issue',
      cell: (row: ComplaintRecord) => (
        <div className="max-w-[200px]">
          <div className="text-xs font-bold text-slate-700 truncate">{row.title || '—'}</div>
          <div className="text-[10px] text-slate-400 truncate">{row.description || '—'}</div>
        </div>
      ),
    },
    {
  key: 'libraryIssue',
  header: 'Type',
  align: 'center' as const,
  cell: (row: ComplaintRecord) =>
    isLibraryIssue(row.description, row.roomNumber) ? (
      <Badge variant="info" size="sm">Library Issue</Badge>
    ) : (
      <span className="text-[10px] text-slate-400">Maintenance</span>
    ),
},
    {
      key: 'location',
      header: 'Location',
      align: 'center' as const,
      cell: (row: ComplaintRecord) => (
        <span className="text-[11px] text-slate-500 flex items-center gap-1 justify-center">
          <MapPin className="w-3 h-3" />
          {row.roomNumber || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: ComplaintRecord) => getStatusBadge(row.status),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      align: 'center' as const,
      cell: (row: ComplaintRecord) => (
        <span className="text-[10px] text-slate-400">{safeFormatRelative(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: ComplaintRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingComplaint(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          {String(row.status).toUpperCase() !== 'RESOLVED' && (
            <button
              onClick={() => setUpdatingId(row.id)}
              className="h-7 w-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
              title="Update Status"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statusCounts = {
    pending: complaints.filter((c: any) => String(c.status).toUpperCase() === 'PENDING').length,
    inProgress: complaints.filter((c: any) => String(c.status).toUpperCase() === 'IN_PROGRESS').length,
    resolved: complaints.filter((c: any) => String(c.status).toUpperCase() === 'RESOLVED').length,
  };

  console.log('[MaintenanceManagement] About to render. complaints:', complaints.length, 'isLoading:', isLoading);

  // If there's a query error, show it
  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-sm font-bold text-slate-800 mb-2">Failed to load complaints</h2>
        <p className="text-xs text-slate-500">{(error as any)?.message || 'Unknown error'}</p>
      </div>
    );
  }

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
            <Wrench className="w-4 h-4 text-[#7A1C2C]" />
            Maintenance & Support
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Manage student complaints and maintenance reports
          </p>
        </div>
      </motion.div>

      {/* Status Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{statusCounts.pending}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{statusCounts.inProgress}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Progress</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{statusCounts.resolved}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resolved</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by student, issue, or location..."
          className="flex-1"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="All Statuses"
          className="w-full sm:w-44"
        />
      </motion.div>

      {/* Complaints Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No complaints found"
              description={search ? 'Try adjusting your search or filters.' : 'No maintenance reports have been submitted yet.'}
              icon="alert"
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={complaints}
                keyExtractor={(row: ComplaintRecord) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {complaints.length} of {total} complaints
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

      {/* View Complaint Modal */}
      <Modal
        isOpen={!!viewingComplaint}
        onClose={() => setViewingComplaint(null)}
        title="Complaint Details"
        size="lg"
      >
        {viewingComplaint && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-[#7A1C2C]/10 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-[#7A1C2C]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900">{viewingComplaint.title || '—'}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {(viewingComplaint.user || {}).fullName || 'Unknown'} • {(viewingComplaint.user || {}).email || 'N/A'}
                </div>
              </div>
              {getStatusBadge(viewingComplaint.status)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Location</div>
                <div className="text-xs text-slate-700 font-medium mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {viewingComplaint.roomNumber || '—'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Submitted</div>
                <div className="text-xs text-slate-700 font-medium mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {safeFormatDate(viewingComplaint.createdAt)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Description</label>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {viewingComplaint.description || 'No description provided.'}
              </p>
            </div>
            {isLibraryIssue(
  viewingComplaint.description,
  viewingComplaint.roomNumber
) && (
  <LibraryIssueDetails
    description={viewingComplaint.description}
    status={viewingComplaint.status}
  />
)}

            {(viewingComplaint.resolvedBy || {}).fullName && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[10px] text-emerald-600 font-bold uppercase">Resolved By</div>
                <div className="text-xs text-emerald-700 font-medium mt-0.5">{(viewingComplaint.resolvedBy || {}).fullName}</div>
                {viewingComplaint.resolvedAt && (
                  <div className="text-[10px] text-emerald-500 mt-0.5">{safeFormatDate(viewingComplaint.resolvedAt)}</div>
                )}
              </div>
            )}

            {String(viewingComplaint.status).toUpperCase() !== 'RESOLVED' && (
              <div className="flex gap-2 pt-2">
                {String(viewingComplaint.status).toUpperCase() === 'PENDING' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Clock className="w-3.5 h-3.5" />}
                    onClick={() => {
                      updateStatusMutation.mutate({ id: viewingComplaint.id, status: 'IN_PROGRESS' });
                      setViewingComplaint(null);
                    }}
                    isLoading={updateStatusMutation.isPending}
                  >
                    Mark In Progress
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    updateStatusMutation.mutate({ id: viewingComplaint.id, status: 'RESOLVED' });
                    setViewingComplaint(null);
                  }}
                  isLoading={updateStatusMutation.isPending}
                >
                  Mark Resolved
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Quick Status Update Modal */}
      <Modal
        isOpen={!!updatingId}
        onClose={() => setUpdatingId(null)}
        title="Update Status"
        description="Change the status of this complaint. The student will be notified automatically."
      >
        <div className="space-y-3">
          <button
            onClick={() => {
              if (updatingId) updateStatusMutation.mutate({ id: updatingId, status: 'IN_PROGRESS' });
              setUpdatingId(null);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors text-left"
          >
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-xs font-bold text-blue-800">In Progress</div>
              <div className="text-[10px] text-blue-500">A librarian is now working on this</div>
            </div>
          </button>
          <button
            onClick={() => {
              if (updatingId) updateStatusMutation.mutate({ id: updatingId, status: 'RESOLVED' });
              setUpdatingId(null);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors text-left"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs font-bold text-emerald-800">Resolved</div>
              <div className="text-[10px] text-emerald-500">Issue has been fixed</div>
            </div>
          </button>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setUpdatingId(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
