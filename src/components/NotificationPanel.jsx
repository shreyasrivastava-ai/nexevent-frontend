// src/components/NotificationPanel.jsx
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  UserPlus,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { relativeTime } from '../utils/relativeTime';

const TYPE_ICON = {
  event_approved:         { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  event_rejected:         { Icon: XCircle,      tone: 'bg-red-50 text-red-600' },
  registration_confirmed: { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  coordinator_promoted:   { Icon: ShieldCheck,  tone: 'bg-cyan-50 text-[#0088cc]' },
  new_registration:       { Icon: UserPlus,     tone: 'bg-sky-50 text-sky-600' },
  default:                { Icon: Bell,         tone: 'bg-slate-100 text-slate-600' },
};

const iconFor = (type) => TYPE_ICON[type] ?? TYPE_ICON.default;

export default function NotificationPanel({ open, onClose }) {
  const { items, loading, unreadCount, markRead, markAllRead } = useNotifications();
  const toast = useToast();

  if (!open) return null;

  const preview = items.slice(0, 5);

  const handleRead = async (n) => {
    if (n.read) return;
    try {
      await markRead(n.id);
    } catch {
      toast.error('Could not mark as read.');
    }
  };

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllRead();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Could not mark all as read.');
    }
  };

  return (
    <div
      role="menu"
      aria-label="Notifications"
      className={[
        'absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm origin-top-right',
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10',
        'animate-[nexevent-panel-in_180ms_cubic-bezier(0.16,1,0.3,1)]',
      ].join(' ')}
    >
      <style>{`
        @keyframes nexevent-panel-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="menu"] { animation: none !important; }
        }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#0088cc]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0088cc]">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </header>

      {/* Body */}
      <div className="max-h-[26rem] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : preview.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">You're all caught up</p>
            <p className="mt-1 text-xs text-slate-400">No new notifications right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {preview.map((n) => (
              <NotificationRow key={n.id} notification={n} onRead={handleRead} onClose={onClose} />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50/60">
        <Link
          to="/notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-[#0088cc] transition-colors duration-200 hover:bg-cyan-50/50"
        >
          View all notifications
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}

/* ── Row ───────────────────────────────────────────────────── */
function NotificationRow({ notification: n, onRead, onClose }) {
  const { Icon, tone } = iconFor(n.type);

  const content = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-sm ${
              n.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'
            }`}
          >
            {n.title}
          </p>
          {!n.read && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0088cc]"
              aria-label="Unread"
            />
          )}
        </div>
        {n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
        )}
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {relativeTime(n.created_at)}
        </p>
      </div>
    </div>
  );

  const rowClass = [
    'block w-full text-left transition-colors duration-200',
    n.read ? 'hover:bg-slate-50/60' : 'bg-cyan-50/30 hover:bg-cyan-50/60',
  ].join(' ');

  // Linked notifications navigate; unlinked just mark read.
  if (n.link) {
    return (
      <li>
        <Link to={n.link} onClick={() => { onRead(n); onClose?.(); }} className={rowClass}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={() => onRead(n)} className={rowClass}>
        {content}
      </button>
    </li>
  );
}