import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
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
import { formatDate } from '../../../utils/formatters';
import type { DigitalResourceRecord as BaseDigitalResourceRecord, ApiResponse, PaginatedResponse } from '../../../types/admin';
type DigitalResourceRecord = BaseDigitalResourceRecord & { clickCount: number; url: string; accessType: string; requiresVpn?: boolean };
import {
  Globe,
  ExternalLink,
  Lock,
  Unlock,
  Wifi,
  Plus,
  Download,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  Cpu,
  FlaskConical,
  Briefcase,
  Palette,
  GraduationCap,
  Landmark,
} from 'lucide-react';

const categoryOptions = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'COMPUTER_SCIENCE', label: 'Computer Science' },
  { value: 'GENERAL', label: 'General' },
];

const accessTypeOptions = [
  { value: 'ALL', label: 'All Access Types' },
  { value: 'FREE', label: 'Free' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'CAMPUS_ONLY', label: 'Campus Only' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const categoryIcons: Record<string, React.ReactNode> = {
  ENGINEERING: <Cpu className="w-4 h-4" />,
  MEDICINE: <FlaskConical className="w-4 h-4" />,
  BUSINESS: <Briefcase className="w-4 h-4" />,
  SCIENCE: <BookOpen className="w-4 h-4" />,
  ARTS: <Palette className="w-4 h-4" />,
  COMPUTER_SCIENCE: <Cpu className="w-4 h-4" />,
  GENERAL: <GraduationCap className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  ENGINEERING: 'bg-blue-50 text-blue-600 border-blue-100',
  MEDICINE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  BUSINESS: 'bg-amber-50 text-amber-600 border-amber-100',
  SCIENCE: 'bg-purple-50 text-purple-600 border-purple-100',
  ARTS: 'bg-pink-50 text-pink-600 border-pink-100',
  COMPUTER_SCIENCE: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  GENERAL: 'bg-slate-50 text-slate-600 border-slate-100',
};

export default function DigitalResources() {
  const { addToast } = useToast();
  const { exportToCSV } = useExport();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [accessTypeFilter, setAccessTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResource, setEditingResource] = useState<DigitalResourceRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<DigitalResourceRecord | null>(null);
  const [viewingResource, setViewingResource] = useState<DigitalResourceRecord | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // --- QUERIES ---

  const { data: resourcesData, isLoading } = useQuery<ApiResponse<PaginatedResponse<DigitalResourceRecord>>>({
    queryKey: ['digitalResources', debouncedSearch, categoryFilter, accessTypeFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (accessTypeFilter !== 'ALL') params.append('accessType', accessTypeFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const res = await API.get(`/resources?${params.toString()}`);
      return res.data;
    },
  });

  // --- MUTATIONS ---

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<DigitalResourceRecord>) => {
      const res = await API.post('/resources', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digitalResources'] });
      addToast('Resource Added: Digital resource has been added to the directory.');
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Add Failed: Could not add resource.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DigitalResourceRecord> }) => {
      const res = await API.patch(`/resources/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digitalResources'] });
      addToast('Resource Updated: Digital resource has been updated.');
      setEditingResource(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Update Failed: Could not update resource.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await API.delete(`/resources/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digitalResources'] });
      addToast('Resource Deleted: Digital resource has been removed.');
      setShowDeleteConfirm(false);
      setResourceToDelete(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Delete Failed: Could not delete resource.');
    },
  });

  const trackClickMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      const res = await API.post(`/resources/${resourceId}/track`);
      return res.data;
    },
  });

  // --- HANDLERS ---

  const handleExport = useCallback(() => {
    if (!resourcesData?.data?.data || resourcesData.data.data.length === 0) {
      addToast('Export Failed: No resources to export.');
      return;
    }
    exportToCSV({
      filename: `digital-resources-export-${new Date().toISOString().split('T')[0]}`,
      data: resourcesData.data.data.map(r => ({
        ID: r.id,
        Title: r.title,
        URL: r.url,
        Category: r.category.replace('_', ' '),
        'Access Type': r.accessType.replace('_', ' '),
        Description: r.description || '-',
        'Requires VPN': (r as any).requiresVpn ? 'Yes' : 'No',
        'Click Count': r.clickCount,
        'Created At': formatDate(r.createdAt),
      })),
    });
  }, [resourcesData, exportToCSV, addToast]);

  const handleOpenLink = (resource: DigitalResourceRecord) => {
    trackClickMutation.mutate(resource.id);
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const resources = resourcesData?.data?.data || [];
  const total = resourcesData?.data?.total || 0;
  const totalPages = resourcesData?.data?.totalPages || 1;

  const getAccessBadge = (accessType: string) => {
    switch (accessType) {
      case 'FREE':
        return <Badge variant="success" size="sm"><Unlock className="w-2.5 h-2.5 mr-0.5" />Free</Badge>;
      case 'SUBSCRIPTION':
        return <Badge variant="warning" size="sm"><Lock className="w-2.5 h-2.5 mr-0.5" />Subscription</Badge>;
      case 'CAMPUS_ONLY':
        return <Badge variant="purple" size="sm"><Wifi className="w-2.5 h-2.5 mr-0.5" />Campus</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{accessType}</Badge>;
    }
  };

  const columns = [
    {
      key: 'resource',
      header: 'Resource',
      cell: (row: DigitalResourceRecord) => (
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${categoryColors[row.category] || categoryColors.GENERAL}`}>
            {categoryIcons[row.category] || categoryIcons.GENERAL}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate">{row.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.url.replace(/^https?:\/\//, '')}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      align: 'center' as const,
      cell: (row: DigitalResourceRecord) => (
        <Badge variant="info" size="sm">{row.category.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'accessType',
      header: 'Access',
      align: 'center' as const,
      cell: (row: DigitalResourceRecord) => getAccessBadge(row.accessType),
    },
    {
      key: 'clicks',
      header: 'Clicks',
      align: 'center' as const,
      cell: (row: DigitalResourceRecord) => (
        <span className="text-xs font-bold text-slate-600">{row.clickCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      cell: (row: DigitalResourceRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenLink(row)}
            className="h-7 w-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
            title="Open Link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewingResource(row)}
            className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7A1C2C] transition-colors"
            title="View Details"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setResourceToDelete(row);
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Digital Resources</h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {total} resources in directory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Resource
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

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title or URL..."
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
          value={accessTypeFilter}
          onChange={setAccessTypeFilter}
          options={accessTypeOptions}
          placeholder="Access Type"
          className="w-full sm:w-44"
        />
      </motion.div>

      {/* Resources Table */}
      <motion.div variants={itemVariants}>
        <Card>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={columns.length} />
            </div>
          ) : resources.length === 0 ? (
            <EmptyState
              title="No resources found"
              description={debouncedSearch ? 'Try adjusting your search or filters.' : 'No digital resources have been added yet.'}
              icon={debouncedSearch ? 'search' : 'book'}
              action={debouncedSearch ? { label: 'Clear Filters', onClick: () => { setSearch(''); setCategoryFilter('ALL'); setAccessTypeFilter('ALL'); } } : { label: 'Add First Resource', onClick: () => setShowCreateModal(true) }}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={resources}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">
                  Showing {resources.length} of {total} resources
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

      {/* Resource Detail SlideOver */}
      <SlideOver
        isOpen={!!viewingResource}
        onClose={() => setViewingResource(null)}
        title="Resource Details"
        description={viewingResource?.title}
      >
        {viewingResource && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center border ${categoryColors[viewingResource.category] || categoryColors.GENERAL}`}>
                {categoryIcons[viewingResource.category] || categoryIcons.GENERAL}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingResource.title}</div>
                <div className="text-xs text-slate-500">{viewingResource.url}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="info" size="sm">{viewingResource.category.replace('_', ' ')}</Badge>
                  {getAccessBadge(viewingResource.accessType)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {viewingResource.description && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Description</label>
                  <p className="text-xs text-slate-600 leading-relaxed">{viewingResource.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Click Count</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{viewingResource.clickCount.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Requires VPN</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{viewingResource.requiresVpn ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400">
                  Created: {formatDate(viewingResource.createdAt)}
                </div>
                {viewingResource.updatedAt && (
                  <div className="text-[10px] text-slate-400">
                    Updated: {formatDate(viewingResource.updatedAt)}
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => handleOpenLink(viewingResource)}
              >
                Open Resource
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Create/Edit Resource Modal */}
      <ResourceFormModal
        isOpen={showCreateModal || !!editingResource}
        onClose={() => { setShowCreateModal(false); setEditingResource(null); }}
        resource={editingResource}
        onSubmit={(data) => {
          if (editingResource) {
            updateMutation.mutate({ id: editingResource.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setResourceToDelete(null); }}
        onConfirm={() => resourceToDelete && deleteMutation.mutate(resourceToDelete.id)}
        title="Delete Resource"
        description={`Are you sure you want to permanently delete "${resourceToDelete?.title}"? This will remove it from the digital resources directory.`}
        confirmText="Delete Permanently"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
  );
}

// --- SUB-COMPONENT ---

type DigitalResourceFormResource = DigitalResourceRecord & {
  accessType?: string;
  requiresVpn?: boolean;
};

function ResourceFormModal({
  isOpen,
  onClose,
  resource,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  resource: DigitalResourceRecord | null;
  onSubmit: (data: Partial<DigitalResourceRecord>) => void;
  isLoading: boolean;
}) {
  const isEditing = !!resource;
  const resourceData = resource as DigitalResourceFormResource | null;

  const [formData, setFormData] = useState({
    title: resourceData?.title || '',
    url: resourceData?.url || '',
    description: resourceData?.description || '',
    category: resourceData?.category || 'GENERAL',
    accessType: resourceData?.accessType || 'FREE',
    requiresVpn: resourceData?.requiresVpn || false,
  });

  // Reset form when resource changes
  React.useEffect(() => {
    if (resourceData) {
      setFormData({
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description || '',
        category: resourceData.category,
        accessType: resourceData.accessType || 'FREE',
        requiresVpn: resourceData.requiresVpn || false,
      });
    } else {
      setFormData({
        title: '',
        url: '',
        description: '',
        category: 'GENERAL',
        accessType: 'FREE',
        requiresVpn: false,
      });
    }
  }, [resourceData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Resource' : 'Add Digital Resource'}
      description={isEditing ? `Update details for ${resource?.title}` : 'Add a new external database or online resource.'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            placeholder="IEEE Xplore Digital Library"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">URL *</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              value={formData.url}
              onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
              placeholder="https://ieeexplore.ieee.org"
              className={`${inputClass} pl-10`}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category *</label>
            <select
              value={formData.category}
              onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
              className={inputClass}
              required
            >
              <option value="GENERAL">General</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="MEDICINE">Medicine</option>
              <option value="BUSINESS">Business</option>
              <option value="SCIENCE">Science</option>
              <option value="ARTS">Arts</option>
              <option value="COMPUTER_SCIENCE">Computer Science</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Access Type *</label>
            <select
              value={formData.accessType}
              onChange={e => setFormData(p => ({ ...p, accessType: e.target.value }))}
              className={inputClass}
              required
            >
              <option value="FREE">Free</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="CAMPUS_ONLY">Campus Only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description of what this resource offers..."
            className={inputClass}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
          <input
            type="checkbox"
            id="requiresVpn"
            checked={formData.requiresVpn}
            onChange={e => setFormData(p => ({ ...p, requiresVpn: e.target.checked }))}
            className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C] h-4 w-4"
          />
          <label htmlFor="requiresVpn" className="text-xs text-slate-700 font-medium cursor-pointer">
            Requires VPN or campus network access
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            {isEditing ? 'Update Resource' : 'Add Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}