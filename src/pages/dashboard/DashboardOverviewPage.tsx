import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Award, BookOpen, ClipboardList, Coffee, FileText, GraduationCap, Plus, Star, Users } from 'lucide-react';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { IssueCertificationModal } from '../../components/certifications/IssueCertificationModal';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useAuth } from '../../hooks/useAuth';
import type { StoreReadiness } from '../../api/metrics.api';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

type BrewStats = { totalBrews: number; avgRating: number; thisMonth: number };
type Course = { _id: string; isActive?: boolean };
type TeamPerformance = { certifications?: { total?: number; list?: unknown[] } };
type ChecklistSubmission = {
  _id: string;
  status: string;
  submittedAt?: string;
  createdAt?: string;
  template?: { title?: string };
  submittedBy?: { name?: string };
};
type CommunityShare = {
  _id: string;
  caption?: string;
  createdAt?: string;
  user?: { name?: string };
  brewLog?: { rating?: number; tasteNotes?: string; brewMethod?: { name?: string } };
};

const MANAGEMENT_ROLES = new Set([
  'area_manager',
  'regional_manager',
  'coo',
  'cfo',
  'ceo',
  'owner',
  'hr_manager',
  'marketing_manager',
]);

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  in_progress: 'warning',
  submitted: 'info',
  approved: 'success',
  flagged: 'danger',
};

function unwrap<T>(response: { data: ApiEnvelope<T> }) {
  return response.data;
}

async function getBrewStats() {
  return unwrap(await adminApiClient.get<ApiEnvelope<BrewStats>>('/brew-logs/stats')).data;
}

async function getCourses() {
  return unwrap(await adminApiClient.get<ApiEnvelope<Course[]>>('/academy/courses'));
}

async function getTeamPerformance() {
  return unwrap(await adminApiClient.get<ApiEnvelope<TeamPerformance[] | { users?: TeamPerformance[]; team?: TeamPerformance[] }>>('/performance/team')).data;
}

async function getRecentChecklistSubmissions() {
  return unwrap(await adminApiClient.get<ApiEnvelope<ChecklistSubmission[]>>('/checklists/submissions', { params: { limit: 5 } })).data;
}

async function getRecentCommunityShares() {
  return unwrap(await adminApiClient.get<ApiEnvelope<CommunityShare[]>>('/community/explore', { params: { limit: 5 } })).data;
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function formatCount(value: number | undefined) {
  return Number(value ?? 0).toLocaleString();
}

function formatStatus(status: string) {
  return status.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function complianceColor(percent: number): string {
  if (percent >= 80) return '#22C55E';
  if (percent >= 60) return '#F59E0B';
  return '#EF4444';
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#242424] ${className}`} />;
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
      <p className="text-red-300">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
        Try again
      </button>
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#666]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function getTeamList(teamData: TeamPerformance[] | { users?: TeamPerformance[]; team?: TeamPerformance[] } | undefined) {
  if (Array.isArray(teamData)) return teamData;
  return teamData?.users ?? teamData?.team ?? [];
}

function KpiComplianceCard({
  title,
  percent,
  subtitle,
  isLoading,
}: {
  title: string;
  percent: number;
  subtitle: string;
  isLoading: boolean;
}) {
  const color = complianceColor(percent);

  if (isLoading) return <SkeletonBlock className="h-32" />;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <p className="mb-1 text-xs text-[#666]">{title}</p>
      <p className="text-3xl font-bold leading-none" style={{ color }}>
        {percent}%
      </p>
      <p className="mt-1.5 text-xs text-[#888]">{subtitle}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function KpiScoreCard({
  title,
  score,
  subtitle,
  isLoading,
}: {
  title: string;
  score: number;
  subtitle: string;
  isLoading: boolean;
}) {
  const color = complianceColor(score);
  if (isLoading) return <SkeletonBlock className="h-32" />;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <p className="mb-1 text-xs text-[#666]">{title}</p>
      <p className="text-3xl font-bold leading-none" style={{ color }}>
        {score} <span className="text-base font-normal text-[#555]">/ 100</span>
      </p>
      <p className="mt-1.5 text-xs text-[#888]">{subtitle}</p>
    </div>
  );
}

function KpiEmployeeCard({
  count,
  isLoading,
}: {
  count: number;
  isLoading: boolean;
}) {
  if (isLoading) return <SkeletonBlock className="h-32" />;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <p className="mb-1 text-xs text-[#666]">Total Employees</p>
      <p className="text-3xl font-bold leading-none text-white">{count.toLocaleString()}</p>
      <p className="mt-1.5 text-xs text-[#888]">Active staff</p>
    </div>
  );
}

function StoreReadinessRow({ store }: { store: StoreReadiness }) {
  const color = complianceColor(store.readinessPercent);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-32 shrink-0 truncate text-sm text-[#ccc]">{store.storeName}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-[#2A2A2A]" style={{ height: 6 }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${store.readinessPercent}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold" style={{ color }}>
        {store.readinessPercent}%
      </span>
      <span className="shrink-0 rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#888]">
        {store.employeeCount} staff
      </span>
    </div>
  );
}

export function DashboardOverviewPage() {
  const navigate = useNavigate();
  const [isIssueModalOpen, setIssueModalOpen] = useState(false);
  const { user } = useAuth();

  const isManagement = user?.role != null && MANAGEMENT_ROLES.has(user.role);

  const brewStatsQuery = useQuery({ queryKey: ['dashboard-brew-stats'], queryFn: getBrewStats });
  const coursesQuery = useQuery({ queryKey: ['dashboard-academy-courses'], queryFn: getCourses });
  const teamQuery = useQuery({ queryKey: ['dashboard-team-performance'], queryFn: getTeamPerformance });
  const checklistQuery = useQuery({ queryKey: ['dashboard-recent-checklist-submissions'], queryFn: getRecentChecklistSubmissions });
  const communityQuery = useQuery({ queryKey: ['dashboard-recent-community-shares'], queryFn: getRecentCommunityShares });

  const { metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useDashboardMetrics();

  const teamMembers = useMemo(() => getTeamList(teamQuery.data), [teamQuery.data]);
  const certificationsIssued = teamMembers.reduce((sum, member) => sum + (member.certifications?.total ?? member.certifications?.list?.length ?? 0), 0);
  const activeCourses = coursesQuery.data?.pagination?.total ?? coursesQuery.data?.data.filter((course) => course.isActive !== false).length ?? 0;
  const statsLoading = brewStatsQuery.isLoading || coursesQuery.isLoading || teamQuery.isLoading;
  const statsError = brewStatsQuery.error || coursesQuery.error || teamQuery.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-[#777]">Overview of JavaRista learning, operations, and community activity.</p>
      </div>

      {isManagement && (
        <>
          {metricsError ? (
            <SectionError message={metricsError} onRetry={refetchMetrics} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiComplianceCard
                title="Training Compliance"
                percent={metrics?.trainingCompliance.percent ?? 0}
                subtitle={`${metrics?.trainingCompliance.completed ?? 0} / ${metrics?.trainingCompliance.total ?? 0} employees`}
                isLoading={metricsLoading}
              />
              <KpiComplianceCard
                title="Manual Compliance"
                percent={metrics?.manualCompliance.percent ?? 0}
                subtitle={`${metrics?.manualCompliance.read ?? 0} / ${metrics?.manualCompliance.total ?? 0} manuals read`}
                isLoading={metricsLoading}
              />
              <KpiScoreCard
                title="Avg JavaRista Score"
                score={metrics?.avgJavaRistaScore ?? 0}
                subtitle="Company average"
                isLoading={metricsLoading}
              />
              <KpiEmployeeCard
                count={metrics?.totalEmployees ?? 0}
                isLoading={metricsLoading}
              />
            </div>
          )}
        </>
      )}

      {statsError ? (
        <SectionError message={getErrorMessage(statsError)} onRetry={() => { brewStatsQuery.refetch(); coursesQuery.refetch(); teamQuery.refetch(); }} />
      ) : statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-28" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Brews" value={formatCount(brewStatsQuery.data?.totalBrews)} icon={<Coffee size={18} />} change={`${formatCount(brewStatsQuery.data?.thisMonth)} this month`} />
          <StatCard title="Avg Brew Rating" value={brewStatsQuery.data?.avgRating != null ? `${brewStatsQuery.data.avgRating.toFixed(1)} / 5` : '0.0 / 5'} icon={<Star size={18} />} />
          <StatCard title="Active Courses" value={formatCount(activeCourses)} icon={<BookOpen size={18} />} />
          <StatCard title="Certifications Issued" value={formatCount(certificationsIssued)} icon={<Award size={18} />} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Recent Checklist Submissions">
          {checklistQuery.isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-10" />)}</div>
          ) : checklistQuery.isError ? (
            <SectionError message={getErrorMessage(checklistQuery.error)} onRetry={() => checklistQuery.refetch()} />
          ) : (checklistQuery.data ?? []).length === 0 ? (
            <div className="py-10 text-center"><ClipboardList className="mx-auto mb-3 text-[#555]" size={28} /><p className="text-sm text-[#777]">No checklist submissions yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 text-xs uppercase text-[#666]">
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="pb-3 font-medium">Employee name</th>
                    <th className="pb-3 font-medium">Checklist title</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Submitted at</th>
                  </tr>
                </thead>
                <tbody>
                  {(checklistQuery.data ?? []).map((submission, index) => (
                    <tr key={submission._id} onClick={() => navigate(`/checklists/submissions/${submission._id}`)} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} cursor-pointer border-b border-[#242424] hover:bg-[#242424]`}>
                      <td className="px-3 py-3 text-white">{submission.submittedBy?.name ?? 'Unknown employee'}</td>
                      <td className="px-3 py-3 text-[#ccc]">{submission.template?.title ?? 'Untitled checklist'}</td>
                      <td className="px-3 py-3"><Badge variant={statusVariant[submission.status] ?? 'default'}>{formatStatus(submission.status)}</Badge></td>
                      <td className="px-3 py-3 text-[#999]">{submission.submittedAt || submission.createdAt ? format(new Date(submission.submittedAt ?? submission.createdAt ?? ''), 'MMM d, yyyy h:mm a') : 'Not submitted'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Community Shares">
          {communityQuery.isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-20" />)}</div>
          ) : communityQuery.isError ? (
            <SectionError message={getErrorMessage(communityQuery.error)} onRetry={() => communityQuery.refetch()} />
          ) : (communityQuery.data ?? []).length === 0 ? (
            <div className="py-10 text-center"><Users className="mx-auto mb-3 text-[#555]" size={28} /><p className="text-sm text-[#777]">No community shares yet</p></div>
          ) : (
            <div className="space-y-3">
              {(communityQuery.data ?? []).map((share) => (
                <article key={share._id} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{share.user?.name ?? 'Unknown user'}</p>
                      <p className="mt-0.5 text-xs text-[#777]">{share.brewLog?.brewMethod?.name ?? 'Brew method'} - {share.brewLog?.rating != null ? `${share.brewLog.rating}/5` : 'No rating'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-[#666]">{share.createdAt ? formatDistanceToNow(new Date(share.createdAt), { addSuffix: true }) : 'Recently'}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-[#bbb]">{share.caption || share.brewLog?.tasteNotes || 'No caption provided'}</p>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {isManagement && (
        <SectionCard
          title="Store Readiness"
          subtitle="Operational readiness by location"
        >
          {metricsLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-8" />)}</div>
          ) : metricsError ? (
            <SectionError message={metricsError} onRetry={refetchMetrics} />
          ) : (metrics?.storeReadiness ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-[#666]">
              Store readiness data will appear once employees are assigned to stores.
            </p>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {(metrics?.storeReadiness ?? []).map((store) => (
                <StoreReadinessRow key={store.storeId} store={store} />
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Add Course', icon: GraduationCap, to: '/academy/courses/new' },
            { label: 'Add Playbook', icon: FileText, to: '/playbooks/new' },
            { label: 'Add Store Recipe', icon: Coffee, to: '/store-ops/recipes/new' },
          ].map(({ label, icon: Icon, to }) => (
            <button key={to} type="button" onClick={() => navigate(to)} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#151515] px-4 py-3 text-left text-sm font-medium text-[#ddd] hover:border-[#D62B2B]/60 hover:bg-[#1F1F1F]">
              <span className="flex items-center gap-2"><Icon className="text-[#D62B2B]" size={17} />{label}</span>
              <Plus size={15} className="text-[#777]" />
            </button>
          ))}
          <button type="button" onClick={() => setIssueModalOpen(true)} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#151515] px-4 py-3 text-left text-sm font-medium text-[#ddd] hover:border-[#D62B2B]/60 hover:bg-[#1F1F1F]">
            <span className="flex items-center gap-2"><Award className="text-[#D62B2B]" size={17} />Issue Certification</span>
            <Plus size={15} className="text-[#777]" />
          </button>
        </div>
      </SectionCard>

      <IssueCertificationModal isOpen={isIssueModalOpen} onClose={() => setIssueModalOpen(false)} />
    </div>
  );
}
