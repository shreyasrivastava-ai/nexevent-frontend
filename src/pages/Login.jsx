// Frontend: src/pages/Login.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck,
  UserCheck,
  GraduationCap,
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  Hash,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  SUPER_DEAN: '/admin/dashboard',
  FACULTY:    '/events/manage',
  CLUB_LEAD:  '/events/manage',
  STUDENT:    '/events/discover',
  STUDENT_COORDINATOR: '/events/manage',
};

const INPUT_CLASS = [
  'w-full pl-10 pr-10 py-2.5 text-sm rounded-xl',
  'border border-slate-200 bg-slate-50/60',
  'text-slate-800 placeholder:text-slate-400',
  'outline-none transition-all duration-200',
  'focus:border-[#0088cc] focus:bg-white focus:ring-2 focus:ring-[#0088cc]/20',
  'disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

export default function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const redirectTo = location.state?.from?.pathname;

  const [mode, setMode]           = useState(null); // null | 'EMPLOYEE' | 'STUDENT'
  const [form, setForm]           = useState({ email: '', password: '', rollNumber: '' });
  const [error, setError]         = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROLE_HOME[role] ?? '/notifications', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  };

  const resetToGateway = () => {
    setMode(null);
    setError(null);
    setForm({ email: '', password: '', rollNumber: '' });
  };

  const validate = () => {
    if (mode === 'EMPLOYEE') {
      if (!form.email.trim()) return 'Email is required.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Enter a valid email address.';
      if (!form.password) return 'Password is required.';
    }
    if (mode === 'STUDENT') {
      if (!form.rollNumber) return 'Roll number is required.';
      if (!form.password) return 'Password is required.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError({ message: validationError });
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload =
      mode === 'EMPLOYEE'
        ? { email: form.email.trim(), password: form.password }
        : { rollNumber: Number(form.rollNumber), password: form.password };

    console.log("Submitting payload:", payload); // Debug log

    try {
      const user = await login(payload);
      navigate(redirectTo ?? ROLE_HOME[user?.role] ?? '/notifications', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const rawDetail = err?.response?.data?.detail;

      // Safely parse FastAPI's 422 array of objects into a readable string
      const safeDetail = Array.isArray(rawDetail)
        ? rawDetail.map((d) => `${d.loc ? d.loc[d.loc.length - 1] : 'Field'}: ${d.msg}`).join(', ')
        : rawDetail;

      if (status === 401) {
        setError({ message: 'Invalid credentials. Please check and try again.' });
      } else if (status === 403) {
        setError({ message: 'This account is not permitted to access the selected portal.' });
      } else if (status === 429) {
        setError({ message: 'Too many attempts. Please try again later.' });
      } else {
        setError({
          message: safeDetail ?? 'Unable to reach the server. Please check your connection and try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes nexevent-view-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nexevent-view-in { animation: nexevent-view-in 260ms cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) {
          .nexevent-view-in { animation: none; }
        }
      `}</style>

      <div className="rounded-3xl shadow-xl border border-slate-100 bg-white p-8 max-w-md w-full">
        <div key={mode ?? 'gateway'} className="nexevent-view-in">
          {mode === null ? (
            <GatewaySelection onSelect={setMode} />
          ) : (
            <PortalForm
              mode={mode}
              form={form}
              setField={setField}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              onBack={resetToGateway}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GatewaySelection({ onSelect }) {
  return (
    <>
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Secure Access Gateway
        </span>
      </div>

      <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
        Welcome to <span className="text-[#0088cc]">NexEvent</span>
      </h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        Select your portal to continue
      </p>

      <div className="mt-8 space-y-3">
        <GatewayCard
          icon={UserCheck}
          iconClass="text-slate-800"
          title="Employee Login"
          subtitle="Access Super Dean & Faculty portals"
          onClick={() => onSelect('EMPLOYEE')}
        />
        <GatewayCard
          icon={GraduationCap}
          iconClass="text-sky-500"
          title="Student Login"
          subtitle="Continue to Student & Club portal"
          onClick={() => onSelect('STUDENT')}
        />
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Protected by institutional single sign-on policies.
      </p>
    </>
  );
}

function GatewayCard({ icon: Icon, iconClass, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 p-5 text-left transition-all duration-200 hover:border-[#0088cc] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40"
    >
      <span className="flex items-center gap-4">
        <Icon className={`h-7 w-7 shrink-0 ${iconClass}`} aria-hidden="true" />
        <span className="flex flex-col">
          <span className="font-semibold text-slate-800">{title}</span>
          <span className="mt-0.5 text-xs text-slate-500">{subtitle}</span>
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#0088cc]"
        aria-hidden="true"
      />
    </button>
  );
}

function PortalForm({ mode, form, setField, onSubmit, submitting, error, onBack }) {
  const isEmployee = mode === 'EMPLOYEE';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus:outline-none focus-visible:text-slate-800 disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Access Gateway
      </button>

      <div className="mt-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEmployee ? 'Employee Sign In' : 'Student Sign In'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isEmployee
            ? 'Use your institutional email to proceed.'
            : 'Enter your roll number and password.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isEmployee ? (
          <>
            <Field icon={Mail} label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="email"
                placeholder="you@institution.edu"
                className={INPUT_CLASS}
                disabled={submitting}
              />
            </Field>

            <Field icon={Lock} label="Password">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={INPUT_CLASS}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
          </>
        ) : (
          <>
            <Field icon={Hash} label="Roll Number">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.rollNumber}
                onChange={(e) => setField('rollNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 202510101150210"
                className={INPUT_CLASS}
                disabled={submitting}
              />
            </Field>

            <Field icon={Lock} label="Password">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={INPUT_CLASS}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>
          </>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link 
          to="/forgot-password" 
          className="text-xs font-semibold text-[#0088cc] hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0088cc] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0077b3] active:bg-[#006699] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        {children}
      </span>
    </label>
  );
}