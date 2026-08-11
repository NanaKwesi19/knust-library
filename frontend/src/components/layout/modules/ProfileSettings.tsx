import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import {
  UserCircle, Mail, Phone, BookOpen, Building2, GraduationCap, Loader2, Save,
} from 'lucide-react';

interface StudentProfile {
  fullName: string;
  email: string;
  studentId?: string;
  role: string;
  phone?: string;
  programme?: string;
  department?: string;
  yearOfStudy?: number;
}

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    programme: '',
    department: '',
    yearOfStudy: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const res = await API.get('/student/profile');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<StudentProfile>) => {
      const res = await API.patch('/student/profile', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['studentLibraryCard'] });
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (error: any) => {
      setSaveMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile.' });
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  useEffect(() => {
    if (data?.data) {
      const user: StudentProfile = data.data;
      setFormData({
        phone: user.phone || '',
        programme: user.programme || '',
        department: user.department || '',
        yearOfStudy: user.yearOfStudy?.toString() || '',
      });
    }
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      phone: formData.phone || undefined,
      programme: formData.programme || undefined,
      department: formData.department || undefined,
      yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-[#800020] animate-spin" />
        <p className="text-xs font-medium text-slate-500 tracking-wide">Loading profile...</p>
      </div>
    );
  }

  const user: StudentProfile | undefined = data?.data;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-[#800020]" />
            My Profile
          </h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
              isEditing
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-[#800020] text-white hover:bg-[#66001a]'
            }`}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {saveMessage && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {/* Read-only Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCircle className="w-3 h-3" /> Full Name
            </label>
            <p className="text-sm font-bold text-slate-800">{user?.fullName}</p>
          </div>

          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email
            </label>
            <p className="text-sm font-bold text-slate-800">{user?.email}</p>
          </div>

          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Student ID
            </label>
            <p className="text-sm font-bold text-slate-800 font-mono">{user?.studentId || 'Not set'}</p>
          </div>

          <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> Role
            </label>
            <p className="text-sm font-bold text-slate-800">{user?.role}</p>
          </div>
        </div>

        {/* Editable Form */}
        {isEditing && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Programme
                </label>
                <input
                  type="text"
                  value={formData.programme}
                  onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                  placeholder="e.g., BSc Computer Engineering"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Computer Engineering"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3" /> Year of Study
                </label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#800020] text-xs font-semibold text-slate-700"
                >
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#800020] hover:bg-[#66001a] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
          </form>
        )}
      </div>
    </div>
  );
}