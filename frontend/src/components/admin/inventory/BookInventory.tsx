import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../ui/Card';
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
import { formatDate, formatNumber } from '../../../utils/formatters';
import { BookForm } from './BookForm';
import type { BookRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  BookOpen,
  Plus,
  Download,
  Upload,
  Trash2,
  Barcode,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil, // ADDED
} from 'lucide-react';

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BORROWED', label: 'Borrowed' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'LOST', label: 'Lost' },
];

const categoryOptions = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Business', label: 'Business' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Science', label: 'Science' },
  { value: 'Law', label: 'Law' },
  { value: 'Agriculture', label: 'Agriculture' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function BookInventory() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [viewingBook, setViewingBook] = useState<BookRecord | null>(null);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null); // ADDED
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data: booksData, isLoading } = useQuery<ApiResponse<PaginatedResponse<BookRecord>>>({
    queryKey: ['books', debouncedSearch, categoryFilter, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/books?${params.toString()}`);
      return res.data;
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const res = await API.delete(`/books/${bookId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      addToast('Book has been removed from inventory.');
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not delete book.');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (bookIds: number[]) => {
      const res = await API.post('/books/bulk-delete', { bookIds });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setSelectedBooks(new Set());
      addToast(`${variables.length} books removed from inventory.`);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not delete books.');
    },
  });

  const importBooksMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await API.post('/books/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowImportModal(false);
      addToast(`${data.importedCount || 'Books'} imported successfully.`);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not import books.');
    },
  });

  const handleSelectAll = useCallback(() => {
    if (!booksData?.data?.data) return;
    if (selectedBooks.size === booksData.data.data.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(booksData.data.data.map(b => b.id)));
    }
  }, [selectedBooks, booksData]);

  const handleSelectBook = useCallback((bookId: number) => {
    setSelectedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!booksData?.data?.data || booksData.data.data.length === 0) {
      addToast('No books to export.');
      return;
    }
    exportToCSV({
      filename: `books-export-${new Date().toISOString().split('T')[0]}`,
      data: booksData.data.data.map(b => ({
        ID: b.id,
        Title: b.title,
        Author: b.author,
        ISBN: b.isbn,
        Category: b.category,
        'Shelf Location': b.shelfLocation,
        Publisher: b.publisher || '-',
        'Publish Year': b.publishYear || '-',
        Edition: b.edition || '-',
        Pages: b.pages || '-',
        Copies: b.copies.length,
        'Available Copies': b.copies.filter(c => c.status === 'AVAILABLE').length,
        Tags: b.tags.join(', '),
        'Created At': formatDate(b.createdAt),
      })),
    });
  }, [booksData, exportToCSV, addToast]);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    importBooksMutation.mutate(formData);
  };

  const books = booksData?.data?.data || [];
  const total = booksData?.data?.total || 0;
  const totalPages = booksData?.data?.totalPages || 1;

  const columns: any = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={books.length > 0 && selectedBooks.size === books.length}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
        />
      ),
      width: '40px',
      align: 'center' as const,
      cell: (row: BookRecord) => (
        <input
          type="checkbox"
          checked={selectedBooks.has(row.id)}
          onChange={() => handleSelectBook(row.id)}
          className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
        />
      ),
    },
    {
      key: 'book',
      header: 'Book',
      cell: (row: BookRecord) => (
        <div className="flex items-center gap-3">
          {row.coverImage || row.coverUrl ? (
            <img src={row.coverImage || row.coverUrl} alt={row.title} className="h-12 w-8 object-cover rounded shadow-sm border border-slate-200 shrink-0" />
          ) : (
            <div className="h-12 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]" title={row.title}>{row.title}</div>
            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{row.author}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'isbn',
      header: 'ISBN',
      align: 'center' as const,
      cell: (row: BookRecord) => (
        <span className="text-[11px] font-mono text-slate-500">{row.isbn}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      align: 'center' as const,
      cell: (row: BookRecord) => (
        <Badge variant="info" size="sm">{row.category}</Badge>
      ),
    },
    {
      key: 'copies',
      header: 'Copies',
      align: 'center' as const,
      cell: (row: BookRecord) => {
        const available = row.copies.filter(c => c.status === 'AVAILABLE').length;
        const total = row.copies.length;
        return (
          <div className="text-center">
            <div className="text-xs font-bold text-slate-700">{available}/{total}</div>
            <div className="text-[9px] text-slate-400">available</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: BookRecord) => {
        const hasAvailable = row.copies.some(c => c.status === 'AVAILABLE');
        return (
          <Badge
            variant={hasAvailable ? 'success' : 'warning'}
            size="sm"
            dot
          >
            {hasAvailable ? 'In Stock' : 'Out of Stock'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: BookRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewingBook(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {/* ADDED: Edit button */}
          <button
            onClick={() => setEditingBook(row)}
            className="h-7 w-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
            title="Edit Book"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setBookToDelete(row);
              setShowDeleteConfirm(true);
            }}
            className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Book Inventory</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} books in catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setShowImportModal(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Book
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title, author, or ISBN..."
          className="flex-1"
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          placeholder="Category"
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

      {selectedBooks.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-[#7A1C2C] text-white px-4 py-3 rounded-xl"
        >
          <span className="text-xs font-bold">{selectedBooks.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => {
                if (!confirm(`Delete ${selectedBooks.size} books?`)) return;
                bulkDeleteMutation.mutate(Array.from(selectedBooks));
              }}
              isLoading={bulkDeleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : books.length === 0 ? (
            <EmptyState
              title="No books found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No books have been added to the catalog yet.'}
              icon={debouncedSearch ? 'search' : 'book'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); } } : { label: 'Add First Book', onClick: () => setShowCreateModal(true) }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={books}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {books.length} of {total} books
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

      <SlideOver
        isOpen={!!viewingBook}
        onClose={() => setViewingBook(null)}
        title="Book Details"
        description={viewingBook?.title}
      >
        {viewingBook && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="h-16 w-12 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingBook.title}</div>
                <div className="text-xs text-slate-500">{viewingBook.author}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="info" size="sm">{viewingBook.category}</Badge>
                  <span className="text-[10px] text-slate-400 font-mono">{viewingBook.isbn}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Description</label>
                <p className="text-xs text-slate-600 leading-relaxed">{viewingBook.description || 'No description available.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Publisher</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingBook.publisher || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Year</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingBook.publishYear || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Edition</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingBook.edition || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Pages</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">{viewingBook.pages || '-'}</div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Copies ({viewingBook.copies.length})</label>
                <div className="space-y-2">
                  {viewingBook.copies.map((copy) => (
                    <div key={copy.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-mono text-slate-600">{copy.barcode}</span>
                      </div>
                      <Badge
                        variant={
                          copy.status === 'AVAILABLE' ? 'success' :
                          copy.status === 'BORROWED' ? 'primary' :
                          copy.status === 'MAINTENANCE' ? 'warning' :
                          copy.status === 'RESERVED' ? 'purple' :
                          'danger'
                        }
                        size="sm"
                      >
                        {copy.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Shelf Location: <span className="font-mono text-slate-600">{viewingBook.shelfLocation}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Added: {formatDate(viewingBook.createdAt)}
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setBookToDelete(null); }}
        onConfirm={() => bookToDelete && deleteBookMutation.mutate(bookToDelete.id)}
        title="Delete Book"
        description={`Are you sure you want to permanently delete "${bookToDelete?.title}"? This will remove all copies and associated loan records.`}
        confirmText="Delete Permanently"
        variant="danger"
        isLoading={deleteBookMutation.isPending}
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Books from CSV"
        description="Upload a CSV file with book data. Required columns: title, author, isbn, category, shelfLocation, barcode."
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#7A1C2C] transition-colors relative">
            <Upload className="w-8 h-8 mx-auto text-slate-300 mb-3" />
            <p className="text-xs text-slate-500 font-medium">Drag and drop your CSV file here, or click to browse</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-lg">
            <p className="font-bold mb-1">CSV Format:</p>
            <code className="font-mono">title,author,isbn,category,shelfLocation,barcode,description,publisher,publishYear,edition,pages</code>
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* ADDED: Edit Modal */}
      <Modal
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        title="Edit Book"
        description={`Update details for "${editingBook?.title}"`}
        size="lg"
      >
        {editingBook && (
          <BookForm 
            book={editingBook} 
            onSuccess={() => setEditingBook(null)} 
            onCancel={() => setEditingBook(null)} 
          />
        )}
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Book"
        description="Add a new book to the library catalog."
        size="lg"
      >
        <BookForm onSuccess={() => setShowCreateModal(false)} onCancel={() => setShowCreateModal(false)} />
      </Modal>
    </motion.div>
  );
}