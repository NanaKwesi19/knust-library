import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import {
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  UserRound,
  Mail,
  LockKeyhole,
  Building2,
} from 'lucide-react';

interface StaffForm {
  fullName: string;
  email: string;
  password: string;
  department: string;
  phone: string;
  role: 'STAFF' | 'LIBRARIAN';
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<{ className?: string }>;
}

export const StaffRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<StaffForm>({
    fullName: '',
    email: '',
    password: '',
    department: '',
    phone: '',
    role: 'STAFF',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await API.post('/staff-auth/register', form);
      setDone(true);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.error ||
          'Could not submit staff application.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7A1C2C] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#7A1C2C]">
              KNUST Library
            </p>
            <h1 className="text-2xl font-black">Staff Application</h1>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-600" />
            <h2 className="font-black text-emerald-900">
              Application submitted
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              An administrator must verify your staff account before you can
              log in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-5 rounded-xl bg-[#7A1C2C] px-5 py-3 text-sm font-bold text-white"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            <Field
              icon={UserRound}
              name="fullName"
              placeholder="Full name"
              value={form.fullName}
              onChange={update}
            />
            <Field
              icon={Mail}
              name="email"
              type="email"
              placeholder="Institutional email"
              value={form.email}
              onChange={update}
            />
            <Field
              icon={LockKeyhole}
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={update}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                icon={Building2}
                name="department"
                placeholder="Department"
                value={form.department}
                onChange={update}
              />
              <Field
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={update}
              />
            </div>

            <select
              name="role"
              value={form.role}
              onChange={update}
              className="w-full rounded-xl border bg-slate-50 p-3 text-sm font-semibold"
            >
              <option value="STAFF">Library Staff</option>
              <option value="LIBRARIAN">Librarian</option>
            </select>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <ShieldCheck className="mr-1 inline h-4 w-4" />
              Your account remains pending until an administrator verifies your
              staff role.
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#7A1C2C] py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit Staff Application'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2 text-sm font-bold text-slate-500"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<FieldProps> = ({ icon: Icon, className = '', ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    )}
    <input
      {...props}
      className={`w-full rounded-xl border bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-[#7A1C2C] ${
        Icon ? 'pl-10' : ''
      } ${className}`}
    />
  </div>
);
