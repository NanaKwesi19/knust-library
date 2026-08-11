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
import { formatDate, formatCurrency, formatRelative } from '../../../utils/formatters';
import type { FineRegistryRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  Coins,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  User,
  BookOpen,
  Barcode,
  Receipt,
  ShieldCheck,
  RotateCcw,
  Ban,
} from 'lucide-react';

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'WAIVED', label: 'Waived' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function FineManagement() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWaiveConfirm, setShowWaiveConfirm] = useState(false);
  const [selectedFine, setSelectedFine] = useState<FineRegistryRecord | null>(null);
  const [viewingFine, setViewingFine] = useState<FineRegistryRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // --- QUERIES ---

  const { data: finesData, isLoading } = useQuery<ApiResponse<PaginatedResponse<FineRegistryRecord>>>({
    queryKey: ['fines', debouncedSearch, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/loans/fines?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['finesSummary'],
    queryFn: async () => {
      const res = await API.get('/loans/fines/summary');
      return res.data;
    },
  });

  // --- MUTATIONS ---

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ fineId, method, reference }: { fineId: number; method: string; reference: string }) => {
      const res = await API.post('/loans/fines/pay', { fineId, method, reference });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      queryClient.invalidateQueries({ queryKey: ['finesSummary'] });
      addToast('Fine payment has been recorded successfully.');
      setShowPaymentModal(false);
      setSelectedFine(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not record payment.');
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async (fineId: number) => {
      const res = await API.patch(`/loans/fines/${fineId}/waive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      queryClient.invalidateQueries({ queryKey: ['finesSummary'] });
      addToast('The fine has been waived.');
      setShowWaiveConfirm(false);
      setSelectedFine(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not waive fine.');
    },
  });

  // --- HANDLERS ---

  const handleExport = useCallback(() => {
    if (!finesData?.data?.data || finesData.data.data.length === 0) {
      addToast('No fines to export.');
      return;
    }
    exportToCSV({
      filename: `fines-export-${new Date().toISOString().split('T')[0]}`,
      data: finesData.data.data.map(f => ({
        ID: f.id,
        'Book Title': f.loan.copy.book.title,
        'Borrower': f.loan.user.fullName,
        'Student ID': f.loan.user.studentId || '-',
        'Amount': formatCurrency(f.amount),
        'Status': f.status,
        'Reason': f.reason,
        'Description': f.description || '-',
        'Created': formatDate(f.createdAt),
        'Updated': f.updatedAt ? formatDate(f.updatedAt) : '-',
        'Payments': f.payments?.length || 0,
      })),
    });
  }, [finesData, exportToCSV, addToast]);

  const fines = finesData?.data?.data || [];
  const total = finesData?.data?.total || 0;
  const totalPages = finesData?.data?.totalPages || 1;

  const summary = summaryData?.data;

  const columns = [
    {
      key: 'book',
      header: 'Book',
      cell: (row: FineRegistryRecord) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate">{row.loan.copy.book.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.loan.copy.book.author}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'borrower',
      header: 'Borrower',
      cell: (row: FineRegistryRecord) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900 text-xs truncate">{row.loan.user.fullName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.loan.user.studentId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'center' as const,
      cell: (row: FineRegistryRecord) => (
        <span className="text-xs font-bold text-slate-700">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: FineRegistryRecord) => (
        <Badge
          variant={
            row.status === 'PAID' ? 'success' :
            row.status === 'WAIVED' ? 'neutral' :
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
      key: 'reason',
      header: 'Reason',
      align: 'center' as const,
      cell: (row: FineRegistryRecord) => (
        <span className="text-[11px] text-slate-500">{row.reason}</span>
      ),
    },
    {
      key: 'created',
      header: 'Issued',
      align: 'center' as const,
      cell: (row: FineRegistryRecord) => (
        <span className="text-[11px] text-slate-400">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: FineRegistryRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingFine(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {row.status === 'UNPAID' && (
            <>
              <button
                onClick={() => {
                  setSelectedFine(row);
                  setShowPaymentModal(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                title="Record Payment"
              >
                <CreditCard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedFine(row);
                  setShowWaiveConfirm(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                title="Waive Fine"
              >
                <Ban className="w-3.5 h-3.5" />
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
      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Outstanding</div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {summary ? formatCurrency(summary.totalOutstanding) : '-'}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collected This Month</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {summary ? formatCurrency(summary.collectedThisMonth) : '-'}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Fines</div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {summary ? summary.totalCount : '-'}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Coins className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fine Management</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} total fines
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          placeholder="Search by borrower, book, or ID..."
          className="flex-1"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="Status"
          className="w-full sm:w-44"
        />
      </motion.div>

      {/* Fines Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : fines.length === 0 ? (
            <EmptyState
              title="No fines found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No fines have been issued yet.'}
              icon={debouncedSearch ? 'search' : 'inbox'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter('ALL'); } } : undefined}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={fines}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {fines.length} of {total} fines
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

      {/* Fine Detail SlideOver */}
      <SlideOver
        isOpen={!!viewingFine}
        onClose={() => setViewingFine(null)}
        title="Fine Details"
        description={`Fine #${viewingFine?.id}`}
      >
        {viewingFine && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="h-16 w-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingFine.loan.copy.book.title}</div>
                <div className="text-xs text-slate-500">{viewingFine.loan.copy.book.author}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">{viewingFine.loan.copy.barcode}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Borrower</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingFine.loan.user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{viewingFine.loan.user.studentId || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        viewingFine.status === 'PAID' ? 'success' :
                        viewingFine.status === 'WAIVED' ? 'neutral' :
                        'danger'
                      }
                      size="sm"
                    >
                      {viewingFine.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rose-400 font-bold uppercase">Fine Amount</div>
                    <div className="text-2xl font-black text-rose-600">{formatCurrency(viewingFine.amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-rose-400 font-bold uppercase">Reason</div>
                    <div className="text-xs text-rose-700 font-medium">{viewingFine.reason}</div>
                  </div>
                </div>
                {viewingFine.description && (
                  <div className="mt-2 text-[11px] text-rose-600">{viewingFine.description}</div>
                )}
              </div>

              {viewingFine.payments && viewingFine.payments.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Payment History</label>
                  <div className="space-y-2">
                    {viewingFine.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <div>
                            <div className="text-xs font-bold text-emerald-800">{formatCurrency(payment.amount)}</div>
                            <div className="text-[10px] text-emerald-600">{payment.method}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-emerald-600 font-mono">{payment.reference}</div>
                          <div className="text-[9px] text-emerald-500">{formatDate(payment.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Loan UUID: <span className="font-mono text-slate-600">{viewingFine.loan.loanUuid}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Issued: {formatDate(viewingFine.createdAt)}
                </div>
                {viewingFine.updatedAt && (
                  <div className="text-[10px] text-slate-400">
                    Updated: {formatDate(viewingFine.updatedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setSelectedFine(null); }}
        fine={selectedFine}
        onSubmit={(data) => selectedFine && recordPaymentMutation.mutate({ fineId: selectedFine.id, ...data })}
        isLoading={recordPaymentMutation.isPending}
      />

      {/* Waive Confirmation */}
      <ConfirmDialog
        isOpen={showWaiveConfirm}
        onClose={() => { setShowWaiveConfirm(false); setSelectedFine(null); }}
        onConfirm={() => selectedFine && waiveMutation.mutate(selectedFine.id)}
        title="Waive Fine"
        description={`Are you sure you want to waive the ${formatCurrency(selectedFine?.amount || 0)} fine for "${selectedFine?.loan.copy.book.title}"? This action cannot be undone.`}
        confirmText="Waive Fine"
        variant="danger"
        isLoading={waiveMutation.isPending}
      />
    </motion.div>
  );
}

// --- SUB-COMPONENT ---

function PaymentModal({
  isOpen,
  onClose,
  fine,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  fine: FineRegistryRecord | null;
  onSubmit: (data: { method: string; reference: string }) => void;
  isLoading: boolean;
}) {
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [mtnNumber, setMtnNumber] = useState('');
  const [mtnConfirming, setMtnConfirming] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'MTN_MOBILE_MONEY') {
      setMtnConfirming(true);
      // Simulate MTN MoMo confirmation flow
      setTimeout(() => {
        setMtnConfirming(false);
        onSubmit({ method, reference: reference || `MTN-${Date.now()}` });
      }, 2000);
      return;
    }
    onSubmit({ method, reference: reference || `CASH-${Date.now()}` });
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description={fine ? `Recording payment for ${formatCurrency(fine.amount)} fine` : ''}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {fine && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-rose-400 font-bold uppercase">Fine Amount</div>
                <div className="text-2xl font-black text-rose-600">{formatCurrency(fine.amount)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-rose-400 font-bold uppercase">Borrower</div>
                <div className="text-xs text-rose-700 font-medium">{fine.loan.user.fullName}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Payment Method *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'CASH', label: 'Cash', icon: Coins },
              { value: 'MTN_MOBILE_MONEY', label: 'MTN MoMo', icon: Smartphone },
              { value: 'BANK_TRANSFER', label: 'Bank', icon: CreditCard },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMethod(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  method === opt.value
                    ? 'bg-[#7A1C2C] text-white border-[#7A1C2C]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#7A1C2C]'
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {method === 'MTN_MOBILE_MONEY' && (
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">MTN Mobile Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={mtnNumber}
                onChange={e => setMtnNumber(e.target.value)}
                placeholder="233 20 000 0000"
                className={`${inputClass} pl-10`}
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Enter the MTN number to charge</p>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Reference Number</label>
          <div className="relative">
            <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder={method === 'CASH' ? 'Receipt number (optional)' : 'Transaction reference'}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {mtnConfirming && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-amber-700 font-medium">Confirming MTN Mobile Money payment...</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading || mtnConfirming}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}