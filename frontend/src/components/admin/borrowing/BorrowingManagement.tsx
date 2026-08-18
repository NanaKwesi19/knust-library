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
import { BarcodeScannerModal } from '../../ui/BarcodeScannerModal';
import { SlideOver } from '../../ui/SlideOver';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonTable } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { useExport } from '../../../hooks/useExport';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate, formatCurrency, formatRelative } from '../../../utils/formatters';
import type { ComprehensiveLoanRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  ArrowLeftRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  User,
  Barcode,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Search,
  Calendar,
  XCircle,
} from 'lucide-react';

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'BORROWED', label: 'Borrowed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'RENEWED', label: 'Renewed' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function BorrowingManagement() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ComprehensiveLoanRecord | null>(null);
  const [viewingLoan, setViewingLoan] = useState<ComprehensiveLoanRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // --- QUERIES ---

  const { data: loansData, isLoading } = useQuery<ApiResponse<PaginatedResponse<ComprehensiveLoanRecord>>>({
    queryKey: ['loans', debouncedSearch, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/loans?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // --- MUTATIONS ---

  const checkoutMutation = useMutation({
    mutationFn: async (payload: { studentId: string; barcode: string; durationDays: number }) => {
      const res = await API.post('/loans/checkout', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      addToast('Checkout Complete: Book has been checked out successfully.');
      setShowCheckoutModal(false);
    },
    onError: (error: any) => {
      addToast(`Checkout Failed: ${error?.response?.data?.error || 'Could not checkout book.'}`);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (loanUuid: string) => {
      const res = await API.post('/loans/return', { loanUuid });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      addToast('Return Complete: Book has been returned successfully.');
      setShowReturnModal(false);
      setSelectedLoan(null);
    },
    onError: (error: any) => {
      addToast(`Return Failed: ${error?.response?.data?.error || 'Could not process return.'}`);
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (loanUuid: string) => {
      const res = await API.post('/loans/renew', { loanUuid });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      addToast('Renewal Complete: Loan has been renewed successfully.');
      setShowRenewModal(false);
      setSelectedLoan(null);
    },
    onError: (error: any) => {
      addToast(`Renewal Failed: ${error?.response?.data?.error || 'Could not renew loan.'}`);
    },
  });

  // --- HANDLERS ---

  const handleExport = useCallback(() => {
    if (!loansData?.data?.data || loansData.data.data.length === 0) {
      addToast('Export Failed: No loans to export.');
      return;
    }
    exportToCSV({
      filename: `loans-export-${new Date().toISOString().split('T')[0]}`,
      data: loansData.data.data.map(l => ({
        'Loan UUID': l.loanUuid,
        'Book Title': l.copy.book.title,
        'Author': l.copy.book.author,
        'Category': l.copy.book.category,
        'Barcode': l.copy.barcode,
        'Borrower': l.user.fullName,
        'Student ID': l.user.studentId || '-',
        'Status': l.status,
        'Due Date': formatDate(l.dueDate),
        'Returned At': l.returnedAt ? formatDate(l.returnedAt) : '-',
        'Renewals': l.renewalCount,
        'Fine Amount': l.fineAmount > 0 ? formatCurrency(l.fineAmount) : '-',
        'Fine Paid': l.finePaid ? 'Yes' : 'No',
      })),
    });
  }, [loansData, exportToCSV, addToast]);

  const loans = loansData?.data?.data || [];
  const total = loansData?.data?.total || 0;
  const totalPages = loansData?.data?.totalPages || 1;

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'RETURNED') return false;
    return new Date(dueDate) < new Date();
  };

  const columns = [
    {
      key: 'book',
      header: 'Book',
      cell: (row: ComprehensiveLoanRecord) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate">{row.copy.book.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.copy.book.author}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'borrower',
      header: 'Borrower',
      cell: (row: ComprehensiveLoanRecord) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900 text-xs truncate">{row.user.fullName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.user.studentId || '-'}</div>
        </div>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      align: 'center' as const,
      cell: (row: ComprehensiveLoanRecord) => (
        <span className="text-[11px] font-mono text-slate-500">{row.copy.barcode}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: ComprehensiveLoanRecord) => {
        const overdue = isOverdue(row.dueDate, row.status);
        return (
          <Badge
            variant={
              row.status === 'RETURNED' ? 'success' :
              row.status === 'OVERDUE' || overdue ? 'danger' :
              row.status === 'RENEWED' ? 'primary' :
              'warning'
            }
            size="sm"
            dot
          >
            {overdue && row.status !== 'RETURNED' ? 'OVERDUE' : row.status}
          </Badge>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      align: 'center' as const,
      cell: (row: ComprehensiveLoanRecord) => {
        const overdue = isOverdue(row.dueDate, row.status);
        return (
          <div className="text-center">
            <div className={`text-xs font-bold ${overdue && row.status !== 'RETURNED' ? 'text-rose-600' : 'text-slate-700'}`}>
              {formatDate(row.dueDate)}
            </div>
            {overdue && row.status !== 'RETURNED' && (
              <div className="text-[9px] text-rose-500 font-medium">{formatRelative(row.dueDate)}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'fine',
      header: 'Fine',
      align: 'center' as const,
      cell: (row: ComprehensiveLoanRecord) => (
        <div className="text-center">
          {row.fineAmount > 0 ? (
            <div>
              <div className="text-xs font-bold text-rose-600">{formatCurrency(row.fineAmount)}</div>
              <Badge variant={row.finePaid ? 'success' : 'danger'} size="sm">
                {row.finePaid ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: ComprehensiveLoanRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingLoan(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'RETURNED' && (
            <>
              <button
                onClick={() => {
                  setSelectedLoan(row);
                  setShowReturnModal(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                title="Process Return"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedLoan(row);
                  setShowRenewModal(true);
                }}
                className="h-7 w-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                title="Renew Loan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Borrowing Management</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} total loans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCheckoutModal(true)}
          >
            New Checkout
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
          placeholder="Search by book, borrower, or barcode..."
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

      {/* Loans Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : loans.length === 0 ? (
            <EmptyState
              title="No loans found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No books have been checked out yet.'}
              icon={debouncedSearch ? 'search' : 'book'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter('ALL'); } } : { label: 'Checkout First Book', onClick: () => setShowCheckoutModal(true) }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={loans}
                keyExtractor={(row) => row.loanUuid}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {loans.length} of {total} loans
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

      {/* Loan Detail SlideOver */}
      <SlideOver
        isOpen={!!viewingLoan}
        onClose={() => setViewingLoan(null)}
        title="Loan Details"
        description={viewingLoan?.loanUuid}
      >
        {viewingLoan && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="h-16 w-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingLoan.copy.book.title}</div>
                <div className="text-xs text-slate-500">{viewingLoan.copy.book.author}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="info" size="sm">{viewingLoan.copy.book.category}</Badge>
                  <span className="text-[10px] text-slate-400 font-mono">{viewingLoan.copy.barcode}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Borrower</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingLoan.user.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{viewingLoan.user.studentId || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                  <div className="mt-0.5">
                    <Badge
                      variant={
                        viewingLoan.status === 'RETURNED' ? 'success' :
                        isOverdue(viewingLoan.dueDate, viewingLoan.status) ? 'danger' :
                        viewingLoan.status === 'RENEWED' ? 'primary' :
                        'warning'
                      }
                      size="sm"
                    >
                      {isOverdue(viewingLoan.dueDate, viewingLoan.status) && viewingLoan.status !== 'RETURNED' ? 'OVERDUE' : viewingLoan.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Due Date</div>
                  <div className={`text-xs font-bold mt-0.5 ${isOverdue(viewingLoan.dueDate, viewingLoan.status) && viewingLoan.status !== 'RETURNED' ? 'text-rose-600' : 'text-slate-700'}`}>
                    {formatDate(viewingLoan.dueDate)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Renewals</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{viewingLoan.renewalCount}</div>
                </div>
              </div>

              {viewingLoan.fineAmount > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-rose-400 font-bold uppercase">Fine Amount</div>
                      <div className="text-lg font-black text-rose-600">{formatCurrency(viewingLoan.fineAmount)}</div>
                    </div>
                    <Badge variant={viewingLoan.finePaid ? 'success' : 'danger'} size="sm">
                      {viewingLoan.finePaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                </div>
              )}

              {viewingLoan.returnedAt && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Returned</div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">{formatDate(viewingLoan.returnedAt)}</div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Loan UUID: <span className="font-mono text-slate-600">{viewingLoan.loanUuid}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onSubmit={(data) => checkoutMutation.mutate(data)}
        isLoading={checkoutMutation.isPending}
      />

      {/* Return Confirmation */}
      <ConfirmDialog
        isOpen={showReturnModal}
        onClose={() => { setShowReturnModal(false); setSelectedLoan(null); }}
        onConfirm={() => selectedLoan && returnMutation.mutate(selectedLoan.loanUuid)}
        title="Process Return"
        description={`Confirm return of "${selectedLoan?.copy.book.title}" by ${selectedLoan?.user.fullName}?`}
        confirmText="Confirm Return"
        variant="warning"
        isLoading={returnMutation.isPending}
      />

      {/* Renew Confirmation */}
      <ConfirmDialog
        isOpen={showRenewModal}
        onClose={() => { setShowRenewModal(false); setSelectedLoan(null); }}
        onConfirm={() => selectedLoan && renewMutation.mutate(selectedLoan.loanUuid)}
        title="Renew Loan"
        description={`Renew loan for "${selectedLoan?.copy.book.title}"? Current renewals: ${selectedLoan?.renewalCount}`}
        confirmText="Confirm Renewal"
        variant="warning"
        isLoading={renewMutation.isPending}
      />
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function CheckoutModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { studentId: string; barcode: string; durationDays: number }) => void;
  isLoading: boolean;
}) {
  const [studentId, setStudentId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [scanTarget, setScanTarget] = useState<'studentId' | 'barcode' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ studentId, barcode, durationDays });
  };

  const handleScanDetected = (code: string) => {
    if (scanTarget === 'studentId') {
      // Digital library card QR codes carry a JSON payload; a plain barcode
      // scan (or a physical card printed with just the ID) is used as-is.
      try {
        const parsed = JSON.parse(code);
        setStudentId(parsed.studentId || code);
      } catch {
        setStudentId(code);
      }
    } else if (scanTarget === 'barcode') {
      setBarcode(code);
    }
    setScanTarget(null);
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Checkout"
      description="Scan or enter book barcode and student ID."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Student ID *</label>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
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
            <button
              type="button"
              onClick={() => setScanTarget('studentId')}
              title="Scan student ID card"
              className="shrink-0 h-[38px] w-[38px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#7A1C2C] transition-colors"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Book Barcode *</label>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="KNUST-BK-00001"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setScanTarget('barcode')}
              title="Scan book barcode"
              className="shrink-0 h-[38px] w-[38px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#7A1C2C] transition-colors"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Loan Duration (days)</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="number"
              value={durationDays}
              onChange={e => setDurationDays(Number(e.target.value))}
              min={1}
              max={90}
              className={`${inputClass} pl-10`}
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            Checkout Book
          </Button>
        </div>
      </form>

      <BarcodeScannerModal
        isOpen={scanTarget !== null}
        onClose={() => setScanTarget(null)}
        onDetected={handleScanDetected}
        title={scanTarget === 'studentId' ? 'Scan Student ID' : 'Scan Book Barcode'}
        description={
          scanTarget === 'studentId'
            ? "Point the camera at the student's digital library card QR code."
            : 'Point the camera at the barcode on the book copy.'
        }
      />
    </Modal>
  );
}