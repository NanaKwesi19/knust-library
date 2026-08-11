import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import {
  Search, CheckCircle, XCircle, MapPin, Bookmark, Loader2, BookOpen,
} from 'lucide-react';

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
      const res = await API.post('/student/reserve-book', { bookId: bookId.toString() });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studentReservations'] });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      setReserveMessage({ type: 'success', text: data.message || 'Book reserved successfully!' });
      setTimeout(() => setReserveMessage(null), 3000);
    },
    onError: (error: any) => {
      setReserveMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reserve book.' });
      setTimeout(() => setReserveMessage(null), 3000);
    },
  });

  const books: Book[] = catalogData?.data || [];
  const count: number = catalogData?.count || 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Searching the library catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-medium"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-600"
        >
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
        <div className={`p-3 rounded-xl text-xs font-semibold ${
          reserveMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {reserveMessage.text}
        </div>
      )}

      <div className="text-xs text-slate-500 font-medium">
        {count > 0 && `${count} result${count !== 1 ? 's' : ''} found`}
        {debouncedSearch && count === 0 && 'No results match your search.'}
      </div>

      {/* Book List */}
      <div className="grid grid-cols-1 gap-6">
        {books.map((book) => (
          <div key={book.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex flex-col md:flex-row gap-5 flex-1">
                <div className="shrink-0">
                  {book.coverImage || book.coverUrl ? (
                    <img src={book.coverImage || book.coverUrl} alt={book.title} className="w-24 h-36 object-cover rounded-lg shadow-sm border border-slate-200" />
                  ) : (
                    <div className="w-24 h-36 bg-slate-100 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-200 rounded text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                    {book.category}
                  </span>
                  {book.availableCopies > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                      <CheckCircle className="w-2.5 h-2.5" /> {book.availableCopies} available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                      <XCircle className="w-2.5 h-2.5" /> Unavailable
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{book.title}</h3>
                <p className="text-xs text-slate-500 font-medium">By {book.author} | ISBN: <span className="font-mono">{book.isbn}</span></p>
                {book.description && (
                  <p className="text-xs text-slate-400 pt-1 leading-relaxed max-w-3xl">{book.description}</p>
                )}
                {book.publisher && (
                  <p className="text-[10px] text-slate-400">Publisher: {book.publisher} {book.publishYear && `(${book.publishYear})`}</p>
                )}
              </div>
              </div>
              <div className="text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500 shrink-0 mt-4 md:mt-0">
                Shelf: {book.shelfLocation}
              </div>
            </div>

            {/* Copies & Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Copies ({book.totalCopies} total)
                </h4>
                <button
                  onClick={() => reserveMutation.mutate(book.id)}
                  disabled={reserveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#800020] hover:bg-[#66001a] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {reserveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                  Request to Borrow
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {book.copies?.map((copy) => (
                  <div key={copy.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">{copy.barcode}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          copy.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {copy.status === 'AVAILABLE' ? <CheckCircle className="w-2 h-2" /> : <XCircle className="w-2 h-2" />}
                          {copy.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {book.shelfLocation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && !isLoading && (
        <div className="py-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">No books found</p>
          <p className="text-[11px] text-slate-400 mt-1">Try a different search term or category.</p>
        </div>
      )}
    </div>
  );
}