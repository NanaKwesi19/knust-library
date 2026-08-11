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
import { Modal } from '../../ui/Modal';
import { SlideOver } from '../../ui/SlideOver';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonTable } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useExport } from '../../../hooks/useExport';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate, formatDateTime, formatRelative } from '../../../utils/formatters';
import type { ReservationRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  Calendar,
  BookOpen,
  DoorOpen,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
} from 'lucide-react';

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'BOOK_HOLD', label: 'Book Hold' },
  { value: 'STUDY_SPACE', label: 'Study Space' },
  { value: 'DISCUSSION_ROOM', label: 'Discussion Room' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ReservationManagement() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFulfillConfirm, setShowFulfillConfirm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationRecord | null>(null);
  const [viewingReservation, setViewingReservation] = useState<ReservationRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // --- QUERIES ---

  const { data: reservationsData, isLoading } = useQuery<ApiResponse<PaginatedResponse<ReservationRecord>>>({
    queryKey: ['reservations', debouncedSearch, statusFilter, typeFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/rooms/reservations?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // --- MUTATIONS ---

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      const res = await API.patch(`/rooms/reservations/${reservationId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      addToast('Reservation Cancelled');
      setShowCancelConfirm(false);
      setSelectedReservation(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not cancel reservation.');
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      const res = await API.patch(`/rooms/reservations/${reservationId}/fulfill`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      addToast('Reservation Fulfilled');
      setShowFulfillConfirm(false);
      setSelectedReservation(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not fulfill reservation.');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { studentId: string; type: string; targetId: string; scheduledFor: string; notes?: string }) => {
      const res = await API.post('/rooms/reservations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      addToast('Reservation Created');
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not create reservation.');
    },
  });

  // --- HANDLERS ---

  const handleExport = useCallback(() => {
    if (!reservationsData?.data?.data || reservationsData.data.data.length === 0) {
      addToast('No reservations to export.');
      return;
    }
    exportToCSV({
      filename: `reservations-export-${new Date().toISOString().split('T')[0]}`,
      data: reservationsData.data.data.map(r => ({
        ID: r.id,
        Type: r.type.replace('_', ' '),
        'Target ID': r.targetId,
        Status: r.status,
        'Scheduled For': r.scheduledFor ? formatDateTime(r.scheduledFor) : '-',
        'User': r.user.fullName,
        'Student ID': r.user.studentId || '-',
        'Email': r.user.email,
        Notes: r.notes || '-',
        'Created At': formatDate(r.createdAt),
      })),
    });
  }, [reservationsData, exportToCSV, addToast]);

  const reservations = reservationsData?.data?.data || [];
  const total = reservationsData?.data?.total || 0;
  const totalPages = reservationsData?.data?.totalPages || 1;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOK_HOLD': return <BookOpen className="w-4 h-4" />;
      case 'STUDY_SPACE': return <DoorOpen className="w-4 h-4" />;
      case 'DISCUSSION_ROOM': return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BOOK_HOLD': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'STUDY_SPACE': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'DISCUSSION_ROOM': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const columns = [
    {
      key: 'type',
      header: 'Type',
      align: 'center' as const,
      cell: (row: ReservationRecord) => (
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getTypeColor(row.type)}`}>
          {getTypeIcon(row.type)}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'User',
      cell: (row: ReservationRecord) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900 text-xs truncate">{row.user.fullName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.user.studentId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      cell: (row: ReservationRecord) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-700 text-xs truncate">{row.targetId}</div>
          <div className="text-[10px] text-slate-400">{row.type.replace('_', ' ')}</div>
        </div>
      ),
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      align: 'center' as const,
      cell: (row: ReservationRecord) => (
        <div className="text-center">
          {row.scheduledFor ? (
            <div>
              <div className="text-xs font-bold text-slate-700">{formatDate(row.scheduledFor)}</div>
              <div className="text-[9px] text-slate-400">{formatRelative(row.scheduledFor)}</div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Not scheduled</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: ReservationRecord) => (
        <Badge
          variant={
            row.status === 'FULFILLED' ? 'success' :
            row.status === 'PENDING' ? 'warning' :
            row.status === 'CANCELLED' ? 'neutral' :
            'danger'
          }
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: ReservationRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingReservation(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {row.status === 'PENDING' && (
            <>
              <button
                onClick={() => {
                  setSelectedReservation(row);
                  setShowFulfillConfirm(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                title="Fulfill"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedReservation(row);
                  setShowCancelConfirm(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                title="Cancel"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
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
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reservations</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} total reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Reservation
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by user, target, or ID..."
          className="flex-1"
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
          placeholder="Type"
          className="w-full sm:w-44"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="Status"
          className="w-full sm:w-44"
        />
      </motion.div>

      {/* Reservations Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : reservations.length === 0 ? (
            <EmptyState
              title="No reservations found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No reservations have been made yet.'}
              icon={debouncedSearch ? 'search' : 'inbox'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); } } : { label: 'Create First Reservation', onClick: () => setShowCreateModal(true) }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={reservations}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {reservations.length} of {total} reservations
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

      {/* Reservation Detail SlideOver */}
      <SlideOver
        isOpen={!!viewingReservation}
        onClose={() => setViewingReservation(null)}
        title="Reservation Details"
        description={`ID: ${viewingReservation?.id}`}
      >
        {viewingReservation && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${getTypeColor(viewingReservation.type)}`}>
                {getTypeIcon(viewingReservation.type)}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingReservation.type.replace('_', ' ')}</div>
                <div className="text-xs text-slate-500">{viewingReservation.targetId}</div>
                <Badge
                  variant={
                    viewingReservation.status === 'FULFILLED' ? 'success' :
                    viewingReservation.status === 'PENDING' ? 'warning' :
                    viewingReservation.status === 'CANCELLED' ? 'neutral' :
                    'danger'
                  }
                  size="sm"
                  className="mt-1"
                >
                  {viewingReservation.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">User</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingReservation.user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{viewingReservation.user.studentId || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Email</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingReservation.user.email}</div>
                </div>
              </div>

              {viewingReservation.scheduledFor && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Scheduled For</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{formatDateTime(viewingReservation.scheduledFor)}</div>
                  <div className="text-[10px] text-slate-400">{formatRelative(viewingReservation.scheduledFor)}</div>
                </div>
              )}

              {viewingReservation.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Notes</div>
                  <div className="text-xs text-slate-600 mt-0.5">{viewingReservation.notes}</div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Created: {formatDate(viewingReservation.createdAt)}
                </div>
                {viewingReservation.updatedAt && (
                  <div className="text-[10px] text-slate-400">
                    Updated: {formatDate(viewingReservation.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Create Reservation Modal */}
      <CreateReservationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Fulfill Confirmation */}
      <ConfirmDialog
        isOpen={showFulfillConfirm}
        onClose={() => { setShowFulfillConfirm(false); setSelectedReservation(null); }}
        onConfirm={() => selectedReservation && fulfillMutation.mutate(selectedReservation.id)}
        title="Fulfill Reservation"
        description={`Confirm fulfillment of ${selectedReservation?.type.replace('_', ' ')} for ${selectedReservation?.user.fullName}?`}
        confirmText="Confirm Fulfill"
        variant="warning"
        isLoading={fulfillMutation.isPending}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => { setShowCancelConfirm(false); setSelectedReservation(null); }}
        onConfirm={() => selectedReservation && cancelMutation.mutate(selectedReservation.id)}
        title="Cancel Reservation"
        description={`Are you sure you want to cancel this ${selectedReservation?.type.replace('_', ' ')} reservation for ${selectedReservation?.user.fullName}?`}
        confirmText="Cancel Reservation"
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </motion.div>
  );
}

// --- SUB-COMPONENT ---

function CreateReservationModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { studentId: string; type: string; targetId: string; scheduledFor: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('BOOK_HOLD');
  const [targetId, setTargetId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ studentId, type, targetId, scheduledFor, notes: notes || undefined });
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Reservation"
      description="Create a book hold or room booking for a student."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Student ID *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="20234567"
              pattern="\d{8}"
              maxLength={8}
              title="8-digit student ID"
              className={`${inputClass} pl-10`}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reservation Type *</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className={inputClass}
            required
          >
            <option value="BOOK_HOLD">Book Hold</option>
            <option value="STUDY_SPACE">Study Space</option>
            <option value="DISCUSSION_ROOM">Discussion Room</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Target ID *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              placeholder={type === 'BOOK_HOLD' ? 'Book ISBN or barcode' : 'Room number (e.g., 302)'}
              className={`${inputClass} pl-10`}
              required
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">
            {type === 'BOOK_HOLD' ? 'Enter book ISBN or barcode' : 'Enter room number'}
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Scheduled For</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special requirements..."
            className={inputClass}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            Create Reservation
          </Button>
        </div>
      </form>
    </Modal>
  );
}