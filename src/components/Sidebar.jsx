// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { CalendarCheck, LogOut, ShieldCheck } from 'lucide-react';
import { navForRole } from '../config/nav';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const ROLE_LABEL = {
  SUPER_DEAN: 'Super Dean',
  FACULTY:    'Faculty',
  CLUB_LEAD:  'Club Lead',
  STUDENT:    'Student',
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const items = navForRole(role);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-sm">
          <CalendarCheck className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-slate-900">NexEvent</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Campus Platform
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} badge={item.showBadge ? unreadCount : 0} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-bold text-white">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user?.name ?? 'Signed in'}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {ROLE_LABEL[role] ?? role ?? 'Member'}
              {user?.department ? ` · ${user.department}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, badge }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
          'transition-all duration-200',
          isActive
            ? 'bg-cyan-50 text-[#0088cc]'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`h-4.5 w-4.5 shrink-0 transition-colors duration-200 ${
              isActive ? 'text-[#0088cc]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0088cc] px-1.5 text-[10px] font-bold text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
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