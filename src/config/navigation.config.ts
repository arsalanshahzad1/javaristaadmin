import {
  Award,
  BarChart2,
  BookMarked,
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '../types';

// Mirror the Flutter RoleGuard group constants exactly
const storeStaff: UserRole[] = [
  'barista', 'cashier', 'kitchen', 'shift_leader', 'store_leader',
  'employee', // kept for backward compatibility
];
const management: UserRole[] = [
  'area_manager', 'operations_manager', 'operations_director', 'corporate',
];
const adminLevel: UserRole[] = ['admin', 'super_admin'];

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: UserRole[] | 'all';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function canSeeItem(item: NavItem, userRole: UserRole | undefined): boolean {
  if (item.allowedRoles === 'all') return true;
  if (!userRole) return false;
  return (item.allowedRoles as UserRole[]).includes(userRole);
}

export const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: 'all' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { to: '/java-academy', label: 'Java Academy', icon: GraduationCap, allowedRoles: 'all' },
      { to: '/role-manuals', label: 'Role Manuals', icon: BookMarked, allowedRoles: 'all' },
      { to: '/playbooks', label: 'Playbooks', icon: BookOpen, allowedRoles: 'all' },
      {
        to: '/store-ops',
        label: 'Store Operations',
        icon: Package,
        allowedRoles: [...storeStaff, ...management, ...adminLevel],
      },
      {
        to: '/investor-content',
        label: 'Investor Content',
        icon: TrendingUp,
        allowedRoles: ['investor', ...adminLevel],
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        to: '/stores',
        label: 'Stores',
        icon: Building2,
        allowedRoles: [...management, ...adminLevel],
      },
      {
        to: '/checklists',
        label: 'Checklists',
        icon: ClipboardList,
        allowedRoles: [...storeStaff, ...management, ...adminLevel],
      },
      { to: '/certifications', label: 'Certifications', icon: Award, allowedRoles: 'all' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      {
        to: '/users',
        label: 'Users & Roles',
        icon: Users,
        // Explicit subset of management: only director/corporate + admins
        allowedRoles: [...adminLevel, 'operations_director', 'corporate'],
      },
      {
        to: '/team-performance',
        label: 'Team Performance',
        icon: BarChart2,
        allowedRoles: [...management, ...adminLevel],
      },
    ],
  },
  {
    title: 'COMMUNITY',
    items: [
      { to: '/community', label: 'Community', icon: MessageSquare, allowedRoles: 'all' },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings, allowedRoles: adminLevel },
    ],
  },
];
