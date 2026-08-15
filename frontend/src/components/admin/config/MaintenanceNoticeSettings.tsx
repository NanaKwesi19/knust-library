import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save, Wrench } from 'lucide-react';
import API from '../../../services/api';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';

interface MaintenanceConfig {
  maintenanceMode: boolean;
  title: string;
  message: string;
  expectedReturn: string;
  contact: string;
}

export default function MaintenanceNoticeSettings() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ success: boolean; data: MaintenanceConfig }>({
    queryKey: ['maintenanceNotice'],
    queryFn: async () => (await API.get('/config/maintenance-notice')).data,
  });

  const [draft, setDraft] = React.useState<MaintenanceConfig | null>(null);
  React.useEffect(() => {
    if (data?.data) setDraft(data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: MaintenanceConfig) => (await API.patch('/config/maintenance-notice', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceNotice'] });
      queryClient.invalidateQueries({ queryKey: ['publicMaintenance'] });
      queryClient.invalidateQueries({ queryKey: ['librarySettings'] });
      addToast('Maintenance configuration saved successfully.', 'success');
    },
    onError: (error: any) => addToast(error?.response?.data?.error || 'Could not save maintenance configuration.', 'error'),
  });

  if (isLoading || !draft) {
    return <div className="p-8 text-sm text-slate-400">Loading maintenance configuration...</div>;
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-[#7A1C2C]" /> Maintenance Mode
        </h2>
        <p className="mt-1 text-xs text-slate-400">Temporarily disable public access and control exactly what visitors see.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-sm font-black text-slate-800">Public access</div>
              <div className="text-xs text-slate-500">Administrators remain able to access the system.</div>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={draft.maintenanceMode}
              onChange={e => setDraft({ ...draft, maintenanceMode: e.target.checked })}
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all peer-checked:bg-[#7A1C2C] peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Notice title</label>
            <input className={inputClass} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Notice message</label>
            <textarea rows={5} className={inputClass} value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Expected return</label>
              <input className={inputClass} placeholder="e.g. Today at 6:00 PM" value={draft.expectedReturn} onChange={e => setDraft({ ...draft, expectedReturn: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Contact / support</label>
              <input className={inputClass} placeholder="library@knust.edu.gh" value={draft.contact} onChange={e => setDraft({ ...draft, contact: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="h-3.5 w-3.5" />}
            onClick={() => saveMutation.mutate(draft)}
            isLoading={saveMutation.isPending}
          >
            Save Maintenance Configuration
          </Button>
        </div>
      </Card>
    </div>
  );
}
