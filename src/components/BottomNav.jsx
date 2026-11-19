// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { navForRole } from '../config/nav';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function BottomNav() {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();
  const items = navForRole(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className={`grid ${items.length === 4 ? 'grid-cols-4' : `grid-cols-${items.length}`}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const badge = item.showBadge ? unreadCount : 0;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  [
                    'relative flex flex-col items-center justify-center gap-0.5 py-2.5',
                    'text-[11px] font-medium transition-colors duration-200',
                    isActive ? 'text-[#0088cc]' : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Top accent bar */}
                    <span
                      className={`absolute inset-x-6 top-0 h-0.5 rounded-full bg-[#0088cc] transition-transform duration-200 ${
                        isActive ? 'scale-x-100' : 'scale-x-0'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="relative">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {badge > 0 && (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}