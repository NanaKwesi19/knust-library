import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { useToast } from '../../../hooks/useToast';
import API from '../../../services/api';

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
  edition_count: number;
}

interface OpenLibraryResult {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export default function OpenLibrarySearch() {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenLibraryDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<OpenLibraryDoc | null>(null);
  const [importing, setImporting] = useState(false);

  const searchOpenLibrary = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,first_publish_year,publisher,isbn,cover_i,subject,edition_count`
      );
      const data: OpenLibraryResult = await res.json();
      setResults(data.docs || []);
    } catch (error) {
      addToast('Failed to search Open Library. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (book: OpenLibraryDoc) => {
    setImporting(true);
    try {
      // Call your backend API to create the book
      const bookData = {
        title: book.title,
        author: book.author_name?.[0] || 'Unknown',
        isbn: book.isbn?.[0] || null,
        publisher: book.publisher?.[0] || null,
        publishedYear: book.first_publish_year || null,
        genre: book.subject?.[0] || null,
        coverUrl: book.cover_i 
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
          : null,
        source: 'OPEN_LIBRARY',
        openLibraryKey: book.key,
      };

      // Replace with your actual API endpoint
      await API.post('/books/import-open-library', bookData);
      
      addToast(`"${book.title}" imported successfully!`, 'success');
      setSelectedBook(null);
    } catch (error) {
      addToast('Failed to import book.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const getCoverUrl = (coverId?: number) => {
    if (!coverId) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#7A1C2C]" />
          Open Library Import
        </h2>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
          Search and import books from the Open Library catalog
        </p>
      </div>

      {/* Search */}
      <Card className="p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchOpenLibrary()}
              placeholder="Search by title, author, ISBN..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all"
            />
          </div>
          <Button
            variant="primary"
            onClick={searchOpenLibrary}
            isLoading={isLoading}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          >
            Search
          </Button>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl mb-3" />
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : results.length === 0 && query ? (
        <EmptyState
          title="No results found"
          description={`No books matching "${query}" were found in Open Library.`}
          icon="search"
        />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {results.map((book) => (
              <motion.div
                key={book.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                {/* Cover */}
                <div className="h-48 bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                  {getCoverUrl(book.cover_i) ? (
                    <img
                      src={getCoverUrl(book.cover_i)!}
                      alt={book.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                {/* Info */}
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1">{book.title}</h3>
                <p className="text-[11px] text-slate-500 mb-1">
                  {book.author_name?.[0] || 'Unknown Author'}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  {book.first_publish_year && (
                    <Badge variant="neutral" size="sm">{book.first_publish_year}</Badge>
                  )}
                  <Badge variant="info" size="sm">{book.edition_count} editions</Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Plus className="w-3 h-3" />}
                    onClick={() => setSelectedBook(book)}
                  >
                    Import
                  </Button>
                  <a
                    href={`https://openlibrary.org${book.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}

      {/* Import Modal */}
      <AnimatePresence>
        {selectedBook && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedBook(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md pointer-events-auto overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Import Book</h3>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {getCoverUrl(selectedBook.cover_i) && (
                    <div className="h-32 bg-slate-50 rounded-xl overflow-hidden">
                      <img
                        src={getCoverUrl(selectedBook.cover_i)!}
                        alt={selectedBook.title}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  
                  <div>
                    <div className="text-xs font-bold text-slate-800">{selectedBook.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {selectedBook.author_name?.[0] || 'Unknown Author'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-400">Year:</span>{' '}
                      <span className="font-medium text-slate-700">{selectedBook.first_publish_year || '—'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-400">Editions:</span>{' '}
                      <span className="font-medium text-slate-700">{selectedBook.edition_count}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg col-span-2">
                      <span className="text-slate-400">ISBN:</span>{' '}
                      <span className="font-medium text-slate-700">{selectedBook.isbn?.[0] || '—'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedBook(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => handleImport(selectedBook)}
                      isLoading={importing}
                    >
                      Import to Catalog
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}