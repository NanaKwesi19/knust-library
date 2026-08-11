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
import { UserForm } from './UserForm';
import type { UserRegistryRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
import {
  Users,
  Plus,
  Download,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  GraduationCap,
  Building,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';

const roleOptions = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'LIBRARIAN', label: 'Librarian' },
  { value: 'ADMIN', label: 'Admin' },
];

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_CLEARANCE', label: 'Pending Clearance' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function UserManagement() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [editingUser, setEditingUser] = useState<UserRegistryRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRegistryRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: usersData, isLoading } = useQuery<ApiResponse<PaginatedResponse<UserRegistryRecord>>>({
    queryKey: ['users', debouncedSearch, roleFilter, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/auth/users?${params.toString()}`);
      return res.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const res = await API.patch(`/auth/users/${userId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User status has been updated.', 'success');
      setEditingUser(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not update status.', 'error');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await API.delete(`/auth/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User has been permanently removed.', 'success');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not delete user.', 'error');
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ ids, action, status }: { ids: number[]; action: string; status?: string }) => {
      const payload: any = { ids, action };
      if (status) payload.status = status;
      const res = await API.post('/auth/users/bulk-action', payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUsers(new Set());
      addToast(`${variables.action} applied to ${variables.ids.length} users.`, 'success');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not apply bulk action.', 'error');
    },
  });

  const handleSelectAll = useCallback(() => {
    if (!usersData?.data?.data) return;
    if (selectedUsers.size === usersData.data.data.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(usersData.data.data.map(u => u.id)));
    }
  }, [selectedUsers, usersData]);

  const handleSelectUser = useCallback((userId: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!usersData?.data?.data || usersData.data.data.length === 0) {
      addToast('No users to export.', 'error');
      return;
    }
    exportToCSV({
      filename: `users-export-${new Date().toISOString().split('T')[0]}`,
      data: usersData.data.data.map(u => ({
        ID: u.id,
        Name: u.fullName,
        Email: u.email,
        'Student ID': u.studentId || '-',
        Role: u.role,
        Status: u.status,
        Programme: u.programme || '-',
        Department: u.department || '-',
        'Year of Study': u.yearOfStudy || '-',
        'Created At': formatDate(u.createdAt),
      })),
    });
    addToast('Users exported successfully.', 'success');
  }, [usersData, exportToCSV, addToast]);

  const handleBulkActivate = () => {
    if (selectedUsers.size === 0) return;
    bulkActionMutation.mutate({ ids: Array.from(selectedUsers), action: 'status', status: 'ACTIVE' });
  };

  const handleBulkSuspend = () => {
    if (selectedUsers.size === 0) return;
    bulkActionMutation.mutate({ ids: Array.from(selectedUsers), action: 'status', status: 'SUSPENDED' });
  };

  const handleBulkDelete = () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Delete ${selectedUsers.size} users permanently? This cannot be undone.`)) return;
    bulkActionMutation.mutate({ ids: Array.from(selectedUsers), action: 'delete' });
  };

  const users = usersData?.data?.data || [];
  const total = usersData?.data?.total || 0;
  const totalPages = usersData?.data?.totalPages || 1;

  const columns = [
    {
      key: 'select',
      header: '',
      width: '40px',
      align: 'center' as const,
      renderHeader: () => (
        <input
          type="checkbox"
          checked={users.length > 0 && selectedUsers.size === users.length}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
        />
      ),
      cell: (row: UserRegistryRecord) => (
        <input
          type="checkbox"
          checked={selectedUsers.has(row.id)}
          onChange={() => handleSelectUser(row.id)}
          className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
        />
      ),
    },
    {
      key: 'user',
      header: 'User',
      cell: (row: UserRegistryRecord) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#7A1C2C] flex items-center justify-center text-white text-[10px] font-black shrink-0">
            {row.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate">{row.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      align: 'center' as const,
      cell: (row: UserRegistryRecord) => (
        <Badge
          variant={
            row.role === 'ADMIN' ? 'danger' :
            row.role === 'LIBRARIAN' ? 'primary' :
            row.role === 'STAFF' ? 'purple' :
            'info'
          }
          size="sm"
        >
          {row.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      cell: (row: UserRegistryRecord) => (
        <Badge
          variant={
            row.status === 'ACTIVE' ? 'success' :
            row.status === 'SUSPENDED' ? 'danger' :
            'warning'
          }
          size="sm"
          dot
        >
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      cell: (row: UserRegistryRecord) => (
        <div className="text-[11px] text-slate-500 space-y-0.5">
          {row.studentId && <div className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{row.studentId}</div>}
          {row.programme && <div className="flex items-center gap-1"><Building className="w-3 h-3" />{row.programme}</div>}
          {row.department && <div>{row.department}</div>}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      align: 'center' as const,
      cell: (row: UserRegistryRecord) => (
        <span className="text-[11px] text-slate-400">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: UserRegistryRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditingUser(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="Edit"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setUserToDelete(row);
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
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">User Management</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} total users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add User
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

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or student ID..."
          className="flex-1"
        />
        <FilterSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={roleOptions}
          placeholder="Role"
          className="w-full sm:w-40"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="Status"
          className="w-full sm:w-48"
        />
      </motion.div>

      {selectedUsers.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-[#7A1C2C] text-white px-4 py-3 rounded-xl"
        >
          <span className="text-xs font-bold">{selectedUsers.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={handleBulkActivate}
              isLoading={bulkActionMutation.isPending}
            >
              Activate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              leftIcon={<UserX className="w-3.5 h-3.5" />}
              onClick={handleBulkSuspend}
              isLoading={bulkActionMutation.isPending}
            >
              Suspend
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleBulkDelete}
              isLoading={bulkActionMutation.isPending}
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
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No users have been registered yet.'}
              icon={debouncedSearch ? 'search' : 'users'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setRoleFilter('ALL'); setStatusFilter('ALL'); } } : undefined}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={users}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {users.length} of {total} users
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
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        description={`Update status and details for ${editingUser?.fullName}`}
      >
        {editingUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="h-12 w-12 rounded-xl bg-[#7A1C2C] flex items-center justify-center text-white text-sm font-black">
                {editingUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{editingUser.fullName}</div>
                <div className="text-xs text-slate-400">{editingUser.email}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Status</label>
                <div className="flex gap-2">
                  {(['ACTIVE', 'SUSPENDED', 'PENDING_CLEARANCE'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatusMutation.mutate({ userId: editingUser.id, status })}
                      disabled={updateStatusMutation.isPending}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        editingUser.status === status
                          ? 'bg-[#7A1C2C] text-white border-[#7A1C2C]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#7A1C2C]'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  {editingUser.email}
                </div>
                {editingUser.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    {editingUser.phone}
                  </div>
                )}
                {editingUser.studentId && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {editingUser.studentId}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Building className="w-3.5 h-3.5" />
                  {editingUser.department || 'No department'} • {editingUser.programme || 'No programme'}
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
        onConfirm={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${userToDelete?.fullName}? This action cannot be undone and all associated records will be affected.`}
        confirmText="Delete Permanently"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        description="Register a new student, staff, or admin account."
        size="lg"
      >
        <UserForm 
          onSuccess={() => setShowCreateModal(false)} 
          onCancel={() => setShowCreateModal(false)} 
        />
      </Modal>
    </motion.div>
  );
}