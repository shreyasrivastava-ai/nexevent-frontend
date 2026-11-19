// src/context/ToastContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANT = {
  success: { Icon: CheckCircle2,  ring: 'border-emerald-100', bg: 'bg-emerald-50',  text: 'text-emerald-900', icon: 'text-emerald-500' },
  error:   { Icon: XCircle,       ring: 'border-red-100',     bg: 'bg-red-50',      text: 'text-red-900',     icon: 'text-red-500' },
  warning: { Icon: AlertTriangle, ring: 'border-amber-100',   bg: 'bg-amber-50',    text: 'text-amber-900',   icon: 'text-amber-500' },
  info:    { Icon: Info,          ring: 'border-sky-100',     bg: 'bg-sky-50',      text: 'text-sky-900',     icon: 'text-sky-500' },
};

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, message, opts = {}) => {
  const id = ++seq;
  const duration = opts.duration ?? 4200;

  // Coerce whatever we got into something React can safely render.
  const safeMessage =
    typeof message === 'string'
      ? message
      : Array.isArray(message)
        ? message.map((e) => e?.msg ?? JSON.stringify(e)).join(', ')
        : message?.msg ?? JSON.stringify(message ?? 'Something went wrong.');

  setToasts((list) => [...list, { id, variant, message: safeMessage, title: opts.title }]);
  if (duration > 0) setTimeout(() => dismiss(id), duration);
  return id;
}, [dismiss]);

  const toast = useMemo(() => ({
    success: (msg, opts) => push('success', msg, opts),
    error:   (msg, opts) => push('error',   msg, opts),
    warning: (msg, opts) => push('warning', msg, opts),
    info:    (msg, opts) => push('info',    msg, opts),
  }), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const cfg = VARIANT[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border ${cfg.ring} ${cfg.bg} px-4 py-3 shadow-lg shadow-slate-900/5`}
            >
              <cfg.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.icon}`} aria-hidden="true" />
              <div className={`flex-1 text-sm ${cfg.text}`}>
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className={t.title ? 'mt-0.5 text-[13px]' : ''}>{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}