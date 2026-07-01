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
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '../types';
import { ADMIN_ROLES } from '../types';

const management: UserRole[] = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager', 'hr_manager', 'marketing_manager',
];

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
      { to: '/java-academy',     label: 'Java Academy',      icon: GraduationCap, allowedRoles: 'all' },
      { to: '/role-manuals',     label: 'Role Manuals',       icon: BookMarked,    allowedRoles: 'all' },
      { to: '/playbooks',        label: 'Playbooks',          icon: BookOpen,      allowedRoles: 'all' },
      { to: '/store-ops',        label: 'Store Operations',   icon: Package,       allowedRoles: management },
      { to: '/investor-content', label: 'Investor Content',   icon: TrendingUp,    allowedRoles: ['owner', 'ceo', 'coo', 'cfo'] },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/stores',        label: 'Stores',          icon: Building2,    allowedRoles: management },
      { to: '/checklists',    label: 'Checklists',      icon: ClipboardList, allowedRoles: management },
      { to: '/certifications', label: 'Certifications', icon: Award,        allowedRoles: 'all' },
    ],
  },
  {
    title: 'PEOPLE',
    items: [
      { to: '/users',          label: 'Users & Roles',     icon: Users,       allowedRoles: ADMIN_ROLES },
      { to: '/employee-roles', label: 'Employee Roles',    icon: ShieldCheck, allowedRoles: ADMIN_ROLES },
      { to: '/team-performance', label: 'Team Performance', icon: BarChart2,  allowedRoles: management },
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
      { to: '/settings', label: 'Settings', icon: Settings, allowedRoles: ADMIN_ROLES },
    ],
  },
];
