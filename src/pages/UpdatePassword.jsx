// src/pages/UpdatePassword.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UpdatePassword() {
  const { user, clearPasswordChangeFlag, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Toggle states for password visibility
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters.');
    }

    setLoading(true);
    try {
      await api.patch('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Password updated successfully!');
      clearPasswordChangeFlag();
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-[#0088cc] p-6 text-center text-white">
          <KeyRound className="mx-auto mb-3 h-10 w-10 opacity-80" />
          <h1 className="text-xl font-bold">Action Required</h1>
          <p className="mt-1 text-sm text-cyan-100">
            You must change your temporary password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                placeholder="Enter temporary password"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                placeholder="Re-type new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077b3] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password & Continue'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
            >
              Log out instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}