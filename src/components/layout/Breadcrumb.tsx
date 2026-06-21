import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  academy: 'Academy',
  'java-academy': 'Java Academy',
  playbooks: 'Playbooks',
  'store-ops': 'Store Operations',
  'investor-content': 'Investor Content',
  'exclusive-content': 'Exclusive Content',
  'store-recipes': 'Recipes',
  checklists: 'Checklists',
  certifications: 'Certifications',
  users: 'Users',
  performance: 'Performance',
  'team-performance': 'Team Performance',
  community: 'Community',
  'brew-shares': 'Brew Shares',
  recipes: 'Recipes',
  'brew-methods': 'Brew Methods',
  'brew-logs': 'Brew Logs',
  espresso: 'Espresso',
  subscriptions: 'Subscriptions',
  analytics: 'Analytics',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  user: 'User',
  courses: 'Courses',
};

function isObjectId(segment: string) {
  return /^[a-f0-9]{24}$/i.test(segment);
}

function segmentToLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (isObjectId(segment)) return 'Detail';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: segmentToLabel(seg),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs mb-5 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-[#333]" />}
          {crumb.isLast ? (
            <span className="text-[#777]">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="text-[#555] hover:text-white transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
