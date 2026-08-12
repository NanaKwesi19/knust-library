import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import LibraryTransactionRules, { type LibraryTransactionType } from './LibraryTransactionRules';
import { Search, CheckCircle, XCircle, MapPin, Bookmark, Loader2, BookOpen } from 'lucide-react';

interface BookCopy {
  id: number;
  barcode: string;
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'RESERVED' | 'DAMAGED';
}

interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description?: string;
  publisher?: string;
  publishYear?: number;
  shelfLocation: string;
  coverImage?: string;
  coverUrl?: string;
  totalCopies: number;
  availableCopies: number;
  copies: BookCopy[];
}

export default function CatalogExplorer() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reserveMessage, setReserveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rulesBook, setRulesBook] = useState<Book | null>(null);
  const [rulesType, setRulesType] = useState<LibraryTransactionType | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['catalogueSearch', debouncedSearch, selectedCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.q = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;
      const res = await API.get('/student/catalogue-search', { params });
      return res.data;
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async (bookId: number) => {
const res = await API.post(`/student-reservations/books/${bookId}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studentReservations'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['catalogueSearch'] });
      setRulesBook(null);
      setRulesType(null);
      setReserveMessage({ type: 'success', text: data.message || 'Book reserved successfully!' });
      setTimeout(() => setReserveMessage(null), 4000);
    },
    onError: (error: any) => {
      setReserveMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reserve book.' });
      setTimeout(() => setReserveMessage(null), 5000);
    },
  });

  const borrowMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const res = await API.post('/student-loans/borrow', { bookId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalogueSearch'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['studentLoans'] });
      setRulesBook(null);
      setRulesType(null);
      const dueDate = data?.data?.dueDate ? new Date(data.data.dueDate).toLocaleDateString() : null;
      setReserveMessage({
        type: 'success',
        text: dueDate ? `Book borrowed successfully. Due ${dueDate}.` : (data.message || 'Book borrowed successfully!')
      });
      setTimeout(() => setReserveMessage(null), 5000);
    },
    onError: (error: any) => {
      setReserveMessage({ type: 'error', text: error.response?.data?.error || 'Failed to borrow book.' });
      setTimeout(() => setReserveMessage(null), 5000);
    },
  });

  const books: Book[] = catalogData?.data || [];
  const count: number = catalogData?.count || 0;

  const openRules = (book: Book, type: LibraryTransactionType) => {
    setRulesBook(book);
    setRulesType(type);
  };

  const continueTransaction = () => {
    if (!rulesBook || !rulesType) return;

    if (rulesType === 'RESERVE') {
      reserveMutation.mutate(rulesBook.id);
      return;
    }

    borrowMutation.mutate(rulesBook.id);
  };

  const isSubmitting = reserveMutation.isPending || borrowMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by title, author, or ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-medium" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-600">
          <option value="">All Subjects</option>
          <option value="Engineering">Engineering</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Business">Business</option>
          <option value="Medicine">Medicine</option>
          <option value="Science">Science</option>
          <option value="Arts">Arts</option>
        </select>
      </div>

      {reserveMessage && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${reserveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {reserveMessage.text}
        </div>
      )}

      <div className="text-xs text-slate-500 font-medium">
        {count > 0 && `${count} result${count !== 1 ? 's' : ''} found`}
        {debouncedSearch && count === 0 && 'No results match your search.'}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
              <div className="h-48 bg-slate-100 rounded-xl mb-3" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">No books found</p>
          <p className="text-[11px] text-slate-400 mt-1">Try a different search term or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {books.map((book) => (
              <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
                <div className="h-56 bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden shrink-0">
                  {book.coverImage || book.coverUrl ? (
                    <img src={book.coverImage || book.coverUrl} alt={book.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <BookOpen className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold uppercase tracking-wide truncate max-w-[120px]" title={book.category}>{book.category}</span>
                    {book.availableCopies > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0"><CheckCircle className="w-2 h-2" /> In Stock</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded shrink-0"><XCircle className="w-2 h-2" /> Out</span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1" title={book.title}>{book.title}</h3>
                  <p className="text-[11px] text-slate-500 mb-2 truncate" title={book.author}>{book.author}</p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-4"><MapPin className="w-3 h-3 text-slate-400" /> {book.shelfLocation}</div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-auto space-y-2">
                  <button onClick={() => openRules(book, book.availableCopies > 0 ? 'BORROW' : 'RESERVE')} disabled={isSubmitting} title={book.availableCopies > 0 ? 'Review borrowing rules' : 'Review reservation rules'} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm bg-[#800020] hover:bg-[#66001a] text-white disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {book.availableCopies > 0 ? 'Borrow Book' : 'Reserve Book'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {rulesBook && rulesType && (
        <LibraryTransactionRules
          type={rulesType}
          bookTitle={rulesBook.title}
          onCancel={() => { if (!isSubmitting) { setRulesBook(null); setRulesType(null); } }}
          onContinue={continueTransaction}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
