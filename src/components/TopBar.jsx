// src/components/TopBar.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, CalendarCheck, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';

const ROLE_LABEL = {
  SUPER_DEAN: 'Super Dean',
  FACULTY:    'Faculty',
  CLUB_LEAD:  'Club Lead',
  STUDENT:    'Student',
};

export default function TopBar({ onOpenMenu }) {
  const { user, role } = useAuth();
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel on route change
  useEffect(() => { setPanelOpen(false); }, [pathname]);

  // Click-outside + Escape dismissal.
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

        {/* Left: brand (mobile) / greeting (desktop) */}
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Mobile Menu Trigger */}
          <button 
            type="button"
            onClick={onOpenMenu}
            className="flex items-center gap-2.5 lg:hidden focus:outline-none"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-sm">
              <CalendarCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">
              NexEvent
            </p>
          </button>

          <div className="hidden min-w-0 lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0088cc]">
              {ROLE_LABEL[role] ?? 'Workspace'}
            </p>
            <p className="truncate text-sm font-semibold text-slate-800">
              {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
            </p>
          </div>
        </div>

        {/* Right: user chip (desktop) + bell */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Desktop user chip */}
          <div className="hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:flex">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="max-w-[10rem] truncate text-xs font-semibold text-slate-800">
                {user?.name ?? 'Signed in'}
              </p>
              <p className="max-w-[10rem] truncate text-[10px] text-slate-500">
                {user?.department ?? '—'}
                {user?.year ? ` · Year ${user.year}` : ''}
              </p>
            </div>
          </div>

          {/* Bell + panel */}
          <div ref={panelRef} className="relative">
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={panelOpen}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              className={[
                'relative inline-flex h-10 w-10 items-center justify-center rounded-xl',
                'border border-slate-200 bg-white text-slate-600',
                'transition-all duration-200',
                'hover:border-[#0088cc] hover:text-[#0088cc]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc]/40',
                panelOpen ? 'border-[#0088cc] text-[#0088cc]' : '',
              ].join(' ')}
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(name) {
  return String(name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}