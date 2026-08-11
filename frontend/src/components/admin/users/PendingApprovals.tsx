import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { formatDate } from '../../../utils/formatters';
import { Clock, UserCheck, GraduationCap, Building } from 'lucide-react';

interface PendingStudent {
  id: number;
  fullName: string;
  email: string;
  studentId: string | null;
  programme: string | null;
  department: string | null;
  createdAt: string;
}

export const PendingApprovals: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pendingStudents'],
    queryFn: async () => {
      const res = await API.get('/auth/pending-students');
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await API.patch(`/auth/approve/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingStudents'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('Student Approved.The student account will be activated shortly.', 'success');
    },
    onError: (error: any) => {
      addToast('Approval Failed.The student could not be approved.', 'error');
    },
  });

  const students: PendingStudent[] = data?.data || [];

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <Card>
      <CardHeader
        action={
          <Badge variant="warning" size="sm">
            {students.length} pending
          </Badge>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          Pending Approvals
        </CardTitle>
      </CardHeader>

      {students.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All student registrations have been reviewed."
          icon="users"
        />
      ) : (
        <div className="space-y-3 px-5 pb-5">
          {students.map((student) => (
            <div
              key={student.id}
              className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
                <p className="text-xs text-slate-500">{student.email}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {student.studentId && (
                    <span className="font-mono flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {student.studentId}
                    </span>
                  )}
                  {student.programme && <span>• {student.programme}</span>}
                  {student.department && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {student.department}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400">
                  Registered: {formatDate(student.createdAt)}
                </p>
              </div>
              <Button
                onClick={() => approveMutation.mutate(student.id)}
                disabled={approveMutation.isPending}
                variant="primary"
                size="sm"
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                isLoading={approveMutation.isPending && approveMutation.variables === student.id}
              >
                Approve
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};