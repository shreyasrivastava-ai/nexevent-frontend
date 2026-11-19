// src/pages/Notifications.jsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  UserPlus,
  ShieldCheck,
  Loader2,
  Inbox,
  RefreshCw,
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
  co_author_assigned:     { Icon: UserPlus,     tone: 'bg-violet-50 text-violet-600' },
  co_author_revoked:      { Icon: XCircle,      tone: 'bg-slate-100 text-slate-600' },
  role_updated:           { Icon: ShieldCheck,  tone: 'bg-amber-50 text-amber-600' },
  default:                { Icon: Bell,         tone: 'bg-slate-100 text-slate-600' },
};

// FIX: Lowercase the type coming from the backend enum
const iconFor = (type) => TYPE_ICON[type?.toLowerCase()] ?? TYPE_ICON.default;

export default function Notifications() {
  const { items, loading, unreadCount, refresh, markRead, markAllRead } = useNotifications();
  const toast = useToast();
  const [tab, setTab] = useState('ALL');

  const visible = useMemo(
    () => (tab === 'UNREAD' ? items.filter((n) => !n.read) : items),
    [items, tab]
  );

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
            Inbox
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
              : 'You’re all caught up.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-xl',
              'border border-slate-200 bg-white text-slate-500',
              'transition-all duration-200',
              'hover:border-[#0088cc] hover:text-[#0088cc]',
              'disabled:opacity-50',
            ].join(' ')}
            aria-label="Refresh notifications"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
            className={[
              'inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2.5',
              'text-sm font-semibold text-white shadow-sm',
              'transition-all duration-200',
              'hover:bg-[#0077b3]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40',
              'disabled:cursor-not-allowed disabled:opacity-60',
            ].join(' ')}
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        </div>
      </header>

      <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          { key: 'ALL',    label: 'All',    count: items.length },
          { key: 'UNREAD', label: 'Unread', count: unreadCount },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold',
              'transition-all duration-200',
              tab === key
                ? 'bg-cyan-50 text-[#0088cc]'
                : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            {label}
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                tab === key
                  ? 'bg-[#0088cc]/15 text-[#0088cc]'
                  : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <NotificationsSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onRead={handleRead}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NotificationCard({ notification: n, onRead }) {
  const { Icon, tone } = iconFor(n.type);

  const Wrapper = n.link ? Link : 'button';
  const wrapperProps = n.link
    ? { to: n.link, onClick: () => onRead(n) }
    : { type: 'button', onClick: () => onRead(n) };

  return (
    <li>
      <Wrapper
        {...wrapperProps}
        className={[
          'group flex w-full items-start gap-4 px-5 py-4 text-left',
          'transition-all duration-200',
          n.read
            ? 'hover:bg-slate-50/60'
            : 'bg-cyan-50/25 hover:bg-cyan-50/50',
        ].join(' ')}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-sm ${
                n.read
                  ? 'font-medium text-slate-700'
                  : 'font-semibold text-slate-900'
              }`}
            >
              {n.title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {relativeTime(n.createdAt)}
              </span>
              {!n.read && (
                <span
                  className="h-2 w-2 rounded-full bg-[#0088cc]"
                  aria-label="Unread"
                />
              )}
            </div>
          </div>
          {n.message && (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {n.message}
            </p>
          )}
        </div>

        {n.link && (
          <ArrowRight
            className={[
              'mt-2 h-4 w-4 shrink-0 text-slate-300',
              'transition-all duration-200',
              'group-hover:translate-x-0.5 group-hover:text-[#0088cc]',
            ].join(' ')}
            aria-hidden="true"
          />
        )}
      </Wrapper>
    </li>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {tab === 'UNREAD' ? (
          <Inbox className="h-6 w-6" />
        ) : (
          <Bell className="h-6 w-6" />
        )}
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">
        {tab === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
      </p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">
        {tab === 'UNREAD'
          ? 'You’ve read everything. Nice work.'
          : 'Updates about your events, approvals, and promotions will appear here.'}
      </p>
    </div>
  );
}