// src/pages/Profile.jsx
import { useState } from 'react';
import { UserCircle, Shield, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // State to toggle password visibility
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match.');
    }

    setLoading(true);
    try {
      await api.patch('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and security settings.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* LEFT COLUMN: Read-only Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <UserCircle className="h-5 w-5 text-[#0088cc]" />
            <h2 className="text-sm font-semibold text-slate-800">Personal Information</h2>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Full Name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Role</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-[#0088cc]">
                <Shield className="h-3 w-3" /> {user?.role?.replace(/_/g, ' ') || '—'}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ERP</dt>
                <dd className="mt-1 font-mono text-sm text-slate-700">{user?.erp || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Roll Number</dt>
                <dd className="mt-1 text-sm text-slate-700">{user?.rollNumber || '—'}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Department</dt>
                <dd className="mt-1 text-sm text-slate-700">{user?.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Year</dt>
                <dd className="mt-1 text-sm text-slate-700">{user?.year || '—'}</dd>
              </div>
            </div>
            {user?.email && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email</dt>
                <dd className="mt-1 text-sm text-slate-700">{user.email}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* RIGHT COLUMN: Change Password Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <KeyRound className="h-5 w-5 text-[#0088cc]" />
            <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}