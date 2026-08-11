import React from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, User, ArrowRight, Loader2 } from 'lucide-react';

interface BookRecommendation {
  id: number;
  title: string;
  author: string;
  category: string;
  description?: string;
  available: boolean;
}

export default function Recommendations() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['studentRecommendations'],
    queryFn: async () => {
      const res = await API.get('/student/recommendations');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Finding recommendations...</p>
      </div>
    );
  }

  const recommendations: BookRecommendation[] = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#800020] to-[#66001a] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-amber-400/20 rounded-xl border border-amber-400/30">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Recommended for You</h2>
            <p className="text-xs text-white/70">Based on your programme and borrowing history</p>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((book) => (
          <div key={book.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-start justify-between">
              <div className="p-2 bg-[#800020]/5 rounded-lg border border-[#800020]/10 text-[#800020]">
                <BookOpen className="w-4 h-4" />
              </div>
              {book.available && (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                  Available
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{book.title}</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <User className="w-3 h-3" />
                {book.author}
              </div>
              <span className="inline-block text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                {book.category}
              </span>
            </div>

            {book.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{book.description}</p>
            )}

            <button
              onClick={() => navigate('/portal/catalog')}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-[#800020] hover:text-white border border-slate-200 hover:border-[#800020] text-slate-600 text-[10px] font-bold rounded-lg transition-all duration-150 group"
            >
              View in Catalogue
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="py-12 text-center">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">No recommendations yet</p>
          <p className="text-[11px] text-slate-400 mt-1">Borrow more books to get personalized suggestions.</p>
        </div>
      )}
    </div>
  );
}