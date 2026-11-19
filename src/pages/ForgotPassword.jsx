// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import api from '../utils/axiosConfig';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { identifier });
      setSuccess(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="p-6 sm:p-8">
          <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </Link>
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Forgot Password?</h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your registered email or roll number, and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
              <Send className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">
                If an account exists, a reset link has been generated.
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                (For this demo, check your backend terminal for the link).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email or Roll Number</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0088cc] focus:ring-2 focus:ring-[#0088cc]/20"
                    placeholder="e.g. 51715 or user@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0077b3] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}