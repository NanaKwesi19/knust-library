import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Wrench, FileText, MapPin, AlertCircle, CheckCircle2, Clock, ClipboardList,
} from 'lucide-react';

interface MaintenanceTicket {
  id: number;
  title: string;
  roomNumber: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: { fullName: string } | null;
}

export default function LibraryHelpDesk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['maintenanceHistory'],
    queryFn: async () => {
      const res = await API.get('/maintenance/my-tickets');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s to catch status updates
  });

  const submitIssueMutation = useMutation({
    mutationFn: async (payload: { title: string; roomNumber: string; description: string }) => {
      const res = await API.post('/maintenance', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceHistory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTitle('');
      setLocation('');
      setDescription('');
      alert('Report submitted successfully! You will be notified when the status changes.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to submit help desk report.');
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !description) {
      alert('Please fill out all fields.');
      return;
    }
    submitIssueMutation.mutate({ title, roomNumber: location, description });
  };

  const tickets: MaintenanceTicket[] = historyData?.data || [];
  const count: number = historyData?.count || 0;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: <AlertCircle className="w-3 h-3 text-amber-500" />,
          label: 'Pending Review',
          message: 'Your report has been received and is awaiting review by the library staff.',
        };
      case 'IN_PROGRESS':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Clock className="w-3 h-3 text-blue-500" />,
          label: 'In Progress',
          message: 'A librarian is currently working on your report.',
        };
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
          label: 'Resolved',
          message: 'Your issue has been resolved. Thank you for your patience!',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-800',
          icon: <AlertCircle className="w-3 h-3 text-slate-500" />,
          label: status,
          message: '',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Report a Library Issue */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#800020]" />
          Report a Library Issue
        </h3>

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-600 block">Issue Summary</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g., Kiosk 2 scanner offline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-600 block">Library Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g., First Floor Computer Lab"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-600 block">Details of the Issue</label>
            <textarea
              required
              rows={4}
              placeholder="Describe what is wrong..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] font-medium text-slate-700 resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={submitIssueMutation.isPending}
            className="w-full bg-[#800020] hover:bg-[#66001a] text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-colors disabled:opacity-40 shadow-sm"
          >
            {submitIssueMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* Your Reported Issues */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Your Reported Issues
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono font-bold">
            Tickets: {count}
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs font-medium text-slate-400">Loading support history...</div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            You haven't reported any problems. All systems are running smoothly.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((item) => {
              const config = getStatusConfig(item.status);
              return (
                <div 
                  key={item.id} 
                  className={`border rounded-xl p-4 ${config.bg} ${config.border} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800">{item.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                        ({new Date(item.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium bg-white/60 border border-slate-200/60 px-2 py-0.5 rounded w-fit">
                      Location: {item.roomNumber}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{item.description}</p>
                    
                    {/* Status message */}
                    <div className="flex items-start gap-1.5 mt-1">
                      {config.icon}
                      <span className={`text-[10px] font-medium ${config.text}`}>{config.message}</span>
                    </div>

                    {item.resolvedBy && (
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Resolved by: {item.resolvedBy.fullName}
                        {item.resolvedAt && ` on ${new Date(item.resolvedAt).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <span className={`
                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide border
                      ${config.bg.replace('50', '100')} ${config.border} ${config.text}
                    `}>
                      {config.icon}
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}