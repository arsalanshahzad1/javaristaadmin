import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, BookOpen, ShoppingBag, Lock,
  ClipboardList, Award, Users, BarChart2, MessageCircle,
  Clock, LogOut, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react';
import { adminAuthStorage } from '../../api/adminAuthStorage';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { Breadcrumb } from './Breadcrumb';
import { ErrorBoundary } from '../ErrorBoundary';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { to: '/java-academy', icon: GraduationCap, label: 'Java Academy' },
      { to: '/playbooks', icon: BookOpen, label: 'Playbooks' },
      { to: '/store-ops', icon: ShoppingBag, label: 'Store Operations' },
      { to: '/investor-content', icon: Lock, label: 'Investor Content' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/checklists', icon: ClipboardList, label: 'Checklists' },
      { to: '/certifications', icon: Award, label: 'Certifications' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { to: '/users', icon: Users, label: 'Users & Roles' },
      { to: '/team-performance', icon: BarChart2, label: 'Team Performance' },
    ],
  },
  {
    title: 'COMMUNITY',
    items: [
      { to: '/community', icon: MessageCircle, label: 'Community' },
    ],
  },
];

async function performLogout(logout: () => void) {
  try { await authApi.logout(); } catch { /* ignore */ }
  adminAuthStorage.clearSession();
  logout();
  window.location.href = '/login';
}

function NavLink({ to, icon: Icon, label, collapsed, isActive }: {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        collapsed ? 'justify-center' : ''
      } ${
        isActive
          ? 'bg-[#D62B2B]/10 text-[#D62B2B]'
          : 'text-[#666] hover:text-white hover:bg-[#242424]'
      }`}
    >
      <Icon size={16} className="flex-shrink-0" />
      {!collapsed && label}
      {!collapsed && isActive && (
        <span className="absolute right-0 top-1.5 bottom-1.5 w-0.5 bg-[#D62B2B] rounded-l" />
      )}
    </Link>
  );
}

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();
  const user = adminAuthStorage.getUser();

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col z-20 transition-all duration-200 ${
        collapsed ? 'w-[60px]' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`px-3 py-4 border-b border-[#2A2A2A] flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-5'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#D62B2B] flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-white text-sm leading-tight">JavaRista</div>
            <div className="text-[10px] text-[#666] leading-tight mt-0.5">Admin Panel</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] font-semibold text-[#444] tracking-widest">
                {section.title}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map(({ to, icon, label }) => (
                <li key={to}>
                  <NavLink to={to} icon={icon} label={label} collapsed={collapsed} isActive={isActive(to)} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Settings divider */}
        <div className="mt-2 pt-2 border-t border-[#2A2A2A]">
          <NavLink
            to="/settings"
            icon={Settings}
            label="Settings"
            collapsed={collapsed}
            isActive={isActive('/settings')}
          />
        </div>
      </nav>

      {/* User + logout */}
      <div className="px-2 py-3 border-t border-[#2A2A2A] space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[#D62B2B] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white truncate leading-tight">{user?.name ?? 'Admin'}</div>
              <div className="text-[10px] text-[#555] truncate leading-tight mt-0.5">{user?.email ?? ''}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => performLogout(logout)}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#666] hover:text-red-400 hover:bg-red-900/10 w-full transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} />
          {!collapsed && 'Logout'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2A2A2A] border border-[#333] flex items-center justify-center text-[#666] hover:text-white transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

function AdminTopBar() {
  const user = adminAuthStorage.getUser();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-end gap-4 px-6 z-10">
      <span className="text-sm text-[#999]">{user?.name ?? 'Admin'}</span>
      <button
        onClick={() => performLogout(logout)}
        className="flex items-center gap-1.5 text-xs text-[#666] hover:text-red-400 transition-colors cursor-pointer"
      >
        <LogOut size={13} />
        Logout
      </button>
    </header>
  );
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 60 : 240;

  return (
    <div className="min-h-screen bg-[#111111]">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ marginLeft: sidebarWidth }} className="transition-all duration-200">
        <AdminTopBar />
        <main className="min-h-screen p-6">
          <Breadcrumb />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
