import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { 
  Library, 
  Search, 
  FileText, 
  Download, 
  BookOpen, 
  ScrollText, 
  GraduationCap,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface DigitalLibraryProps {
  userId: number;
}

const categories = [
  { id: '', name: 'All Resources', icon: Library },
  { id: 'E-book', name: 'E-books', icon: BookOpen },
  { id: 'Journal', name: 'Journals', icon: ScrollText },
  { id: 'Research Paper', name: 'Research Papers', icon: FileText },
  { id: 'Past Question', name: 'Past Questions', icon: GraduationCap },
];

export default function DigitalLibrary({ userId }: DigitalLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['digitalResources', search, selectedCategory],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      const res = await API.get('/student/digital-resources', { params });
      return res.data;
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      const res = await API.post(`/student/digital-resources/${resourceId}/download`);
      return res.data;
    },
    onSuccess: (data) => {
      setDownloadMessage('Download started. Check your browser downloads.');
      setTimeout(() => setDownloadMessage(null), 3000);
      // Open the file in new tab
      if (data.data?.accessUrl) {
        window.open(data.data.accessUrl, '_blank');
      }
    },
    onError: () => {
      setDownloadMessage('Failed to download. Please try again.');
      setTimeout(() => setDownloadMessage(null), 3000);
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-[#800020] border-t-amber-400 rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading digital resources...</p>
      </div>
    );
  }

  const resources = data?.data || [];

  return (
    <div className="space-y-6">
      
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive 
                  ? 'bg-[#800020] text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-[#800020] hover:text-[#800020]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, course code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-medium"
          />
        </div>
      </div>

      {downloadMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
          {downloadMessage}
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource: any) => (
          <div key={resource.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
            
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${
                resource.category === 'E-book' ? 'bg-blue-50 text-blue-600' :
                resource.category === 'Journal' ? 'bg-purple-50 text-purple-600' :
                resource.category === 'Research Paper' ? 'bg-emerald-50 text-emerald-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {resource.category === 'E-book' && <BookOpen className="w-4 h-4" />}
                {resource.category === 'Journal' && <ScrollText className="w-4 h-4" />}
                {resource.category === 'Research Paper' && <FileText className="w-4 h-4" />}
                {resource.category === 'Past Question' && <GraduationCap className="w-4 h-4" />}
              </div>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                {resource.fileType}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{resource.title}</h3>
              {resource.author && <p className="text-[10px] text-slate-500">By {resource.author}</p>}
              {resource.courseCode && (
                <span className="inline-block text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                  {resource.courseCode}
                </span>
              )}
            </div>

            {resource.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{resource.description}</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{resource.downloadCount || 0} downloads</span>
                {resource.fileSize && <span>• {resource.fileSize}</span>}
              </div>
              <button
                onClick={() => downloadMutation.mutate(resource.id)}
                disabled={downloadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#800020] hover:bg-[#66001a] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Download
              </button>
            </div>

          </div>
        ))}
      </div>

      {resources.length === 0 && (
        <div className="py-12 text-center">
          <Library className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">No resources found</p>
          <p className="text-[11px] text-slate-400 mt-1">Try a different search or category.</p>
        </div>
      )}

    </div>
  );
}