import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, User, Lock, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/users': 'Users',
  '/recipes': 'Recipes',
  '/brew-methods': 'Brew Methods',
  '/brew-logs': 'Brew Logs',
  '/espresso': 'Espresso',
  '/subscriptions': 'Subscriptions',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/users/')) return 'User Detail';
  if (pathname.startsWith('/recipes/new')) return 'New Recipe';
  if (pathname.startsWith('/recipes/')) return 'Edit Recipe';
  if (pathname.startsWith('/brew-methods/new')) return 'New Brew Method';
  if (pathname.startsWith('/brew-methods/')) return 'Edit Brew Method';
  return 'JavaRista Admin';
}

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
  };

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-6 z-10">
      <h2 className="text-sm font-medium text-white">{title}</h2>

      <div className="flex items-center gap-4">
        <button className="text-[#666] hover:text-white transition-colors cursor-pointer">
          <Bell size={18} />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity cursor-pointer outline-none">
              <div className="w-7 h-7 rounded-full bg-[#D62B2B] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <span className="text-sm hidden md:block">{user?.name ?? 'Admin'}</span>
              <ChevronDown size={13} className="text-[#666]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="min-w-[180px] bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl p-1 z-50 animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenu.Item
                onSelect={() => {}}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#ccc] hover:text-white hover:bg-[#242424] rounded-lg cursor-pointer outline-none transition-colors"
              >
                <User size={14} />
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {}}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#ccc] hover:text-white hover:bg-[#242424] rounded-lg cursor-pointer outline-none transition-colors"
              >
                <Lock size={14} />
                Change Password
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[#2A2A2A]" />
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg cursor-pointer outline-none transition-colors"
              >
                <LogOut size={14} />
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
