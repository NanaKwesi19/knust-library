import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonCard } from '../../ui/Skeleton';
import { useToast } from '../../../hooks/useToast';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import {
  Settings,
  BookOpen,
  Clock,
  Mail,
  Bell,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Globe,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  ChevronRight,
  ChevronDown,
  Server,
  HardDrive,
  Wifi,
} from 'lucide-react';

interface LibrarySettings {
  id: number;
  libraryName: string;
  institution: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  openingHours: Record<string, { open: string; close: string; closed: boolean }>;
  maxBooksPerStudent: number;
  maxBooksPerStaff: number;
  loanDurationDays: number;
  renewalLimit: number;
  fineRatePerDay: number;
  maxFineAmount: number;
  lostBookDaysThreshold: number;
  lostBookFee: number;
  gracePeriodDays: number;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
}

interface BackupConfig {
  id: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string;
  retentionDays: number;
  lastBackup: string | null;
  nextBackup: string | null;
  autoBackup: boolean;
  includeFiles: boolean;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SystemConfig() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<'general' | 'loans' | 'notifications' | 'backup'>('general');

  // --- QUERIES ---

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['librarySettings'],
    queryFn: async () => {
      const res = await API.get('/config/settings');
      return res.data;
    },
  });

  const { data: backupData, isLoading: backupLoading } = useQuery({
    queryKey: ['backupConfig'],
    queryFn: async () => {
      const res = await API.get('/config/backup');
      return res.data;
    },
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => {
      const res = await API.get('/config/email-templates');
      return res.data;
    },
  });

  // --- MUTATIONS ---

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<LibrarySettings>) => {
      const res = await API.patch('/config/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarySettings'] });
      addToast('Library configuration has been updated.');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not save settings.');
    },
  });

  const updateBackupMutation = useMutation({
    mutationFn: async (data: Partial<BackupConfig>) => {
      const res = await API.patch('/config/backup', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] });
      addToast('Backup schedule has been updated.');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not save backup config.');
    },
  });

  const triggerBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await API.post('/config/backup/trigger');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupConfig'] });
      addToast('Manual backup has been initiated.');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not start backup.');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EmailTemplate> }) => {
      const res = await API.patch(`/config/email-templates/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      addToast('Email template has been updated.');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.error || 'Could not save template.');
    },
  });

  const settings: LibrarySettings | null = settingsData?.data;
  const backup: BackupConfig | null = backupData?.data;
  const templates: EmailTemplate[] = templatesData?.data || [];

  const isLoading = settingsLoading || backupLoading || templatesLoading;

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";
  const numberClass = "w-20 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 text-center focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

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
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600" />
            System Configuration
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Manage library settings, policies, and system behavior
          </p>
        </div>
        {settings?.maintenanceMode && (
          <Badge variant="warning" size="sm" dot>
            Maintenance Mode Active
          </Badge>
        )}
      </motion.div>

      {/* Section Navigation */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { key: 'general' as const, label: 'General', icon: Globe },
          { key: 'loans' as const, label: 'Loan Rules', icon: BookOpen },
          { key: 'notifications' as const, label: 'Notifications', icon: Mail },
          { key: 'backup' as const, label: 'Backup', icon: Database },
        ].map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
              activeSection === section.key
                ? 'bg-[#7A1C2C] text-white border-[#7A1C2C]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#7A1C2C]'
            }`}
          >
            <section.icon className="w-3.5 h-3.5" />
            {section.label}
          </button>
        ))}
      </motion.div>

      {/* General Settings */}
      {activeSection === 'general' && settings && (
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Library Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Library Name</label>
                <input
                  type="text"
                  defaultValue={settings.libraryName}
                  onBlur={e => updateSettingsMutation.mutate({ libraryName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Institution</label>
                <input
                  type="text"
                  defaultValue={settings.institution}
                  onBlur={e => updateSettingsMutation.mutate({ institution: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    defaultValue={settings.email}
                    onBlur={e => updateSettingsMutation.mutate({ email: e.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    defaultValue={settings.phone}
                    onBlur={e => updateSettingsMutation.mutate({ phone: e.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    defaultValue={settings.address}
                    onBlur={e => updateSettingsMutation.mutate({ address: e.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    defaultValue={settings.website}
                    onBlur={e => updateSettingsMutation.mutate({ website: e.target.value })}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Opening Hours
            </h3>
            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const dayConfig = settings.openingHours[day] || { open: '08:00', close: '17:00', closed: false };
                return (
                  <div key={day} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-24 shrink-0">
                      <span className="text-xs font-bold text-slate-700">{day}</span>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!dayConfig.closed}
                        onChange={e => {
                          const newHours = {
                            ...settings.openingHours,
                            [day]: { ...dayConfig, closed: !e.target.checked }
                          };
                          updateSettingsMutation.mutate({ openingHours: newHours });
                        }}
                        className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
                      />
                      <span className="text-[11px] text-slate-500">Open</span>
                    </label>
                    {!dayConfig.closed && (
                      <div className="flex items-center gap-2 ml-4">
                        <input
                          type="time"
                          value={dayConfig.open}
                          onChange={e => {
                            const newHours = {
                              ...settings.openingHours,
                              [day]: { ...dayConfig, open: e.target.value }
                            };
                            updateSettingsMutation.mutate({ openingHours: newHours });
                          }}
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="time"
                          value={dayConfig.close}
                          onChange={e => {
                            const newHours = {
                              ...settings.openingHours,
                              [day]: { ...dayConfig, close: e.target.value }
                            };
                            updateSettingsMutation.mutate({ openingHours: newHours });
                          }}
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7A1C2C]" />
              System Status
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-700">Maintenance Mode</div>
                <div className="text-[11px] text-slate-400">Temporarily disable public access</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={e => updateSettingsMutation.mutate({ maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#7A1C2C]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7A1C2C]" />
              </label>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              Last updated: {formatDateTime(settings.updatedAt)}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Loan Rules */}
      {activeSection === 'loans' && settings && (
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Borrowing Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Max Books (Student)</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{settings.maxBooksPerStudent}</div>
                  </div>
                  <input
                    type="number"
                    defaultValue={settings.maxBooksPerStudent}
                    onBlur={e => updateSettingsMutation.mutate({ maxBooksPerStudent: Number(e.target.value) })}
                    min={1}
                    max={20}
                    className={numberClass}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Max Books (Staff)</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{settings.maxBooksPerStaff}</div>
                  </div>
                  <input
                    type="number"
                    defaultValue={settings.maxBooksPerStaff}
                    onBlur={e => updateSettingsMutation.mutate({ maxBooksPerStaff: Number(e.target.value) })}
                    min={1}
                    max={50}
                    className={numberClass}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Loan Duration & Renewals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Loan Duration (days)</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{settings.loanDurationDays}</div>
                  </div>
                  <input
                    type="number"
                    defaultValue={settings.loanDurationDays}
                    onBlur={e => updateSettingsMutation.mutate({ loanDurationDays: Number(e.target.value) })}
                    min={1}
                    max={90}
                    className={numberClass}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Renewal Limit</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{settings.renewalLimit}</div>
                  </div>
                  <input
                    type="number"
                    defaultValue={settings.renewalLimit}
                    onBlur={e => updateSettingsMutation.mutate({ renewalLimit: Number(e.target.value) })}
                    min={0}
                    max={5}
                    className={numberClass}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Grace Period (days)</div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{settings.gracePeriodDays}</div>
                  </div>
                  <input
                    type="number"
                    defaultValue={settings.gracePeriodDays}
                    onBlur={e => updateSettingsMutation.mutate({ gracePeriodDays: Number(e.target.value) })}
                    min={0}
                    max={7}
                    className={numberClass}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Fine Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rose-400 font-bold uppercase">Fine Rate (per day)</div>
                    <div className="text-2xl font-black text-rose-600 mt-1">GH₵{settings.fineRatePerDay.toFixed(2)}</div>
                  </div>
                  <input
                    type="number"
                    step="0.50"
                    defaultValue={settings.fineRatePerDay}
                    onBlur={e => updateSettingsMutation.mutate({ fineRatePerDay: Number(e.target.value) })}
                    min={0}
                    max={50}
                    className={`${numberClass} border-rose-200`}
                  />
                </div>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rose-400 font-bold uppercase">Max Fine Amount</div>
                    <div className="text-2xl font-black text-rose-600 mt-1">GH₵{settings.maxFineAmount.toFixed(2)}</div>
                  </div>
                  <input
                    type="number"
                    step="1"
                    defaultValue={settings.maxFineAmount}
                    onBlur={e => updateSettingsMutation.mutate({ maxFineAmount: Number(e.target.value) })}
                    min={0}
                    max={500}
                    className={`${numberClass} border-rose-200`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Notifications */}
      {activeSection === 'notifications' && settings && (
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Notification Channels
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">Email Notifications</div>
                    <div className="text-[11px] text-slate-400">Send alerts via email</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailNotifications}
                    onChange={e => updateSettingsMutation.mutate({ enableEmailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">SMS Notifications</div>
                    <div className="text-[11px] text-slate-400">Send alerts via SMS</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableSmsNotifications}
                    onChange={e => updateSettingsMutation.mutate({ enableSmsNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Email Templates
            </h3>
            {templates.length === 0 ? (
              <EmptyState
                title="No templates"
                description="Email templates will appear here once configured."
                icon="inbox"
              />
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <EmailTemplateEditor
                    key={template.id}
                    template={template}
                    onSave={(data) => updateTemplateMutation.mutate({ id: template.id, data })}
                    isLoading={updateTemplateMutation.isPending}
                  />
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Backup */}
      {activeSection === 'backup' && backup && (
        <motion.div variants={itemVariants} className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Backup Schedule
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">Automatic Backups</div>
                    <div className="text-[11px] text-slate-400">Schedule regular data backups</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backup.autoBackup}
                    onChange={e => updateBackupMutation.mutate({ autoBackup: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Frequency</label>
                  <select
                    value={backup.frequency}
                    onChange={e => updateBackupMutation.mutate({ frequency: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Time</label>
                  <input
                    type="time"
                    value={backup.time}
                    onChange={e => updateBackupMutation.mutate({ time: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Retention (days)</label>
                  <input
                    type="number"
                    value={backup.retentionDays}
                    onChange={e => updateBackupMutation.mutate({ retentionDays: Number(e.target.value) })}
                    min={1}
                    max={365}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                    <HardDrive className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700">Include File Uploads</div>
                    <div className="text-[11px] text-slate-400">Backup attached documents and images</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backup.includeFiles}
                    onChange={e => updateBackupMutation.mutate({ includeFiles: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500" />
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-[#7A1C2C]" />
              Backup Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Last Backup</div>
                <div className="text-sm font-bold text-slate-700 mt-1">
                  {backup.lastBackup ? formatDateTime(backup.lastBackup) : 'Never'}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Next Backup</div>
                <div className="text-sm font-bold text-slate-700 mt-1">
                  {backup.nextBackup ? formatDateTime(backup.nextBackup) : 'Not scheduled'}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full mt-4"
              leftIcon={<Database className="w-3.5 h-3.5" />}
              onClick={() => triggerBackupMutation.mutate()}
              isLoading={triggerBackupMutation.isPending}
            >
              Trigger Manual Backup
            </Button>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// --- SUB-COMPONENT ---

function EmailTemplateEditor({
  template,
  onSave,
  isLoading,
}: {
  template: EmailTemplate;
  onSave: (data: Partial<EmailTemplate>) => void;
  isLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.enabled);

  const handleSave = () => {
    onSave({ subject, body, enabled });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-slate-400" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-700">{template.name}</div>
            <div className="text-[10px] text-slate-400">{template.subject}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={enabled ? 'success' : 'neutral'} size="sm">
            {enabled ? 'Active' : 'Disabled'}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 font-mono focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all"
            />
            <p className="text-[9px] text-slate-400 mt-1">
              Available variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#7A1C2C] focus:ring-[#7A1C2C]"
              />
              <span className="text-xs text-slate-600 font-medium">Enable this template</span>
            </label>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isLoading}>
              Save Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}