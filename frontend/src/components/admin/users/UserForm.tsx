import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { Button } from '../../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, GraduationCap, BookOpen, Building, Hash, AlertTriangle, Check, X, Loader2 } from 'lucide-react';

interface UserFormProps {
  user?: any | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  studentId: string;
  role: 'STUDENT' | 'STAFF' | 'LIBRARIAN' | 'ADMIN';
  programme: string;
  department: string;
  yearOfStudy: string;
}

const initialFormData: UserFormData = {
  fullName: '',
  email: '',
  password: '',
  studentId: '',
  role: 'STUDENT',
  programme: '',
  department: '',
  yearOfStudy: '',
};

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        password: '',
        studentId: user.studentId || '',
        role: user.role || 'STUDENT',
        programme: user.programme || '',
        department: user.department || '',
        yearOfStudy: user.yearOfStudy?.toString() || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Password is required for new users';
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const endpoint = isEditing ? `/auth/users/${user.id}` : '/auth/users/create';
      const method = isEditing ? 'patch' : 'post';
      
      const payload = isEditing 
        ? {
            fullName: data.fullName,
            email: data.email,
            studentId: data.studentId || null,
            role: data.role,
            programme: data.programme || null,
            department: data.department || null,
            yearOfStudy: data.yearOfStudy ? parseInt(data.yearOfStudy) : null,
          }
        : {
            fullName: data.fullName,
            email: data.email,
            password: data.password,
            studentId: data.studentId || null,
            role: data.role,
            programme: data.programme || null,
            department: data.department || null,
            yearOfStudy: data.yearOfStudy ? parseInt(data.yearOfStudy) : null,
          };

      const res = await API[method](endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      addToast(isEditing ? 'User updated successfully.' : 'User created successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.();
    },
    onError: (err: any) => {
      const message = err.response?.data?.error || 'Failed to save user.';
      addToast(message, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createUserMutation.mutate(formData);
  };

  const handleChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const inputBase = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7A1C2C] focus:ring-2 focus:ring-[#7A1C2C]/10 transition-all";
  const labelBase = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const iconWrap = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* ===== ROW 1: Full Name | Email ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className={labelBase}>Full Name</label>
          <div className="relative">
            <User className={`${iconWrap} w-4 h-4`} />
            <input
              type="text"
              value={formData.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              className={inputBase}
              placeholder="Enter full name"
            />
          </div>
          <AnimatePresence>
            {errors.fullName && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors.fullName}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Email */}
        <div>
          <label className={labelBase}>Email Address</label>
          <div className="relative">
            <Mail className={`${iconWrap} w-4 h-4`} />
            <input
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              className={inputBase}
              placeholder="user@knust.edu.gh"
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== ROW 2: Password | Role ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Password */}
        {!isEditing ? (
          <div>
            <label className={labelBase}>Password</label>
            <div className="relative">
              <Lock className={`${iconWrap} w-4 h-4`} />
              <input
                type="password"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                className={inputBase}
                placeholder="Minimum 6 characters"
              />
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div>
            <label className={labelBase}>Password</label>
            <div className="relative">
              <Lock className={`${iconWrap} w-4 h-4`} />
              <input
                type="text"
                disabled
                value="••••••••"
                className={`${inputBase} opacity-50 cursor-not-allowed`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Password cannot be changed here</p>
          </div>
        )}

        {/* Role */}
        <div>
          <label className={labelBase}>Role</label>
          <div className="relative">
            <GraduationCap className={`${iconWrap} w-4 h-4`} />
            <select
              value={formData.role}
              onChange={e => handleChange('role', e.target.value)}
              className={`${inputBase} appearance-none`}
            >
              <option value="STUDENT">Student</option>
              <option value="STAFF">Staff</option>
              <option value="LIBRARIAN">Librarian</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== ROW 3: Student ID | Year of Study ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Student ID */}
        <div>
          <label className={labelBase}>Student ID</label>
          <div className="relative">
            <Hash className={`${iconWrap} w-4 h-4`} />
            <input
              type="text"
              value={formData.studentId}
              onChange={e => handleChange('studentId', e.target.value)}
              className={inputBase}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Year of Study */}
        <div>
          <label className={labelBase}>Year of Study</label>
          <div className="relative">
            <GraduationCap className={`${iconWrap} w-4 h-4`} />
            <select
              value={formData.yearOfStudy}
              onChange={e => handleChange('yearOfStudy', e.target.value)}
              className={`${inputBase} appearance-none`}
            >
              <option value="">Select Year</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
              <option value="6">Year 6</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== ROW 4: Programme | Department ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* Programme */}
        <div>
          <label className={labelBase}>Programme</label>
          <div className="relative">
            <BookOpen className={`${iconWrap} w-4 h-4`} />
            <input
              type="text"
              value={formData.programme}
              onChange={e => handleChange('programme', e.target.value)}
              className={inputBase}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label className={labelBase}>Department</label>
          <div className="relative">
            <Building className={`${iconWrap} w-4 h-4`} />
            <input
              type="text"
              value={formData.department}
              onChange={e => handleChange('department', e.target.value)}
              className={inputBase}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* ===== ACTIONS ===== */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} leftIcon={<X className="w-3.5 h-3.5" />}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={createUserMutation.isPending}
          leftIcon={createUserMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        >
          {isEditing ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}