import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../services/api';
import { UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const PendingApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pendingStudents'],
    queryFn: async () => {
      const res = await API.get('/auth/pending-students');
      return res.data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await API.patch(`/auth/approve/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingStudents'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#800020] border-t-amber-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const students = data?.data || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          Pending Approvals
        </h2>
        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
          {students.length} pending
        </span>
      </div>

      {students.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 font-medium">
          No pending approvals. All caught up.
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student: any) => (
            <div key={student.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
                <p className="text-xs text-slate-500">{student.email}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono">{student.studentId}</span>
                  {student.programme && <span>• {student.programme}</span>}
                  {student.department && <span>• {student.department}</span>}
                </div>
                <p className="text-[9px] text-slate-400">
                  Registered: {new Date(student.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => approveMutation.mutate(student.id)}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};