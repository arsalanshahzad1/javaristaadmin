import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart2, Users, BookOpen, Coffee,
  ClipboardList, Zap, CreditCard, Settings, LogOut, Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { to: '/brew-methods', icon: Coffee, label: 'Brew Methods' },
  { to: '/brew-logs', icon: ClipboardList, label: 'Brew Logs' },
  { to: '/espresso', icon: Zap, label: 'Espresso' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
  };

  const isRouteActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col z-20">
      <div className="px-5 py-5 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D62B2B] flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm leading-tight">JavaRista</div>
            <div className="text-[10px] text-[#666] leading-tight mt-0.5">Admin Panel</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isRouteActive(to)
                    ? 'bg-[#D62B2B]/10 text-[#D62B2B]'
                    : 'text-[#666] hover:text-white hover:bg-[#242424]'
                }`}
              >
                <Icon size={16} />
                {label}
                {isRouteActive(to) && (
                  <span className="absolute right-0 top-1.5 bottom-1.5 w-0.5 bg-[#D62B2B] rounded-l" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-[#2A2A2A] space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[#D62B2B] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-white truncate leading-tight">{user?.name ?? 'Admin'}</div>
            <div className="text-[10px] text-[#555] truncate leading-tight mt-0.5">{user?.email ?? ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#666] hover:text-red-400 hover:bg-red-900/10 w-full transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
