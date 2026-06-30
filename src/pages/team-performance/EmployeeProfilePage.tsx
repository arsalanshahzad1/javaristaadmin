import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, CheckSquare, TrendingUp } from 'lucide-react';
import adminApiClient from '../../api/adminApiClient';
import { ScorePanel } from '../../components/employee/ScorePanel';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type CertRecord = { certificationId: string; name: string; issuedAt: string; expiresAt?: string };
type PathRecord = { pathId: string; title: string; category: string; completedCourses: number; totalCourses: number };
type ChecklistRecord = { scheduleId: string; title: string; completedAt?: string; dueDate?: string; status: string };

type EmployeeProfile = {
  user: { _id: string; name: string; email: string; role: string };
  complianceScores: { training: number; manual: number; checklist: number };
  promotionReadiness: 'not_evaluated' | 'not_ready' | 'approaching' | 'ready';
  certifications: CertRecord[];
  activePaths: PathRecord[];
  recentChecklists: ChecklistRecord[];
  enrollmentStats: { total: number; completed: number };
};

function getErrorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Something went wrong';
}

async function fetchProfile(userId: string) {
  const response = await adminApiClient.get<ApiEnvelope<EmployeeProfile>>(`/employees/${userId}/profile`);
  return response.data.data;
}

const READINESS_CONFIG = {
  not_evaluated: { label: 'Not Evaluated', color: 'bg-[#2A2A2A] text-[#666]' },
  not_ready: { label: 'Not Ready', color: 'bg-red-900/30 text-red-400' },
  approaching: { label: 'Approaching', color: 'bg-amber-900/30 text-amber-300' },
  ready: { label: 'Ready for Promotion', color: 'bg-green-900/30 text-green-300' },
};

function ComplianceCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const color = value >= 80 ? 'bg-green-900/20 border-green-900/40' : value >= 50 ? 'bg-amber-900/20 border-amber-900/40' : 'bg-[#1E1E1E] border-[#2A2A2A]';
  const textColor = value >= 80 ? 'text-green-300' : value >= 50 ? 'text-amber-300' : 'text-[#D62B2B]';

  return (
    <div className={`flex flex-col items-center rounded-xl border p-4 ${color}`}>
      <div className="mb-2 text-[#777]">{icon}</div>
      <span className={`text-2xl font-bold ${textColor}`}>{value.toFixed(0)}%</span>
      <span className="mt-1 text-xs text-[#777]">{label}</span>
    </div>
  );
}

export function EmployeeProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: ['employee-profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });

  if (profileQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-[#1A1A1A]" />;
  }

  if (profileQuery.isError) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
        <p className="text-red-300">{getErrorMessage(profileQuery.error)}</p>
        <button type="button" onClick={() => profileQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/20">Try again</button>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) return null;

  const { user, complianceScores, promotionReadiness, certifications, activePaths, recentChecklists, enrollmentStats } = profile;
  const readiness = READINESS_CONFIG[promotionReadiness] ?? READINESS_CONFIG.not_evaluated;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-[#333] p-2 text-[#aaa] hover:bg-[#242424]"><ArrowLeft size={16} /></button>
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Profile</h1>
          <p className="mt-0.5 text-sm text-[#777]">JavaRista performance overview</p>
        </div>
      </div>

      {/* Header Card */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D62B2B]/20 text-2xl font-bold text-[#D62B2B]">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-white">{user.name}</h2>
          <p className="text-sm text-[#777]">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#D62B2B]/10 px-2.5 py-0.5 text-xs font-medium text-[#D62B2B]">{user.role.replace(/_/g, ' ')}</span>
            {promotionReadiness !== 'not_evaluated' && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${readiness.color}`}>{readiness.label}</span>
            )}
          </div>
        </div>
      </div>

      {/* Score Panel */}
      <ScorePanel userId={userId!} />

      {/* Compliance Scores */}
      <div className="grid grid-cols-3 gap-4">
        <ComplianceCard label="Training" value={complianceScores.training} icon={<BookOpen size={20} />} />
        <ComplianceCard label="Manual Tasks" value={complianceScores.manual} icon={<CheckSquare size={20} />} />
        <ComplianceCard label="Checklists" value={complianceScores.checklist} icon={<TrendingUp size={20} />} />
      </div>

      {/* Certifications */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Award size={16} className="text-[#D62B2B]" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#777]">Certifications</h2>
        </div>
        {certifications.length === 0 ? (
          <p className="text-sm text-[#555]">No certifications issued yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certifications.map((cert) => (
              <div key={cert.certificationId} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-3">
                <p className="text-sm font-medium text-white">{cert.name}</p>
                <p className="mt-1 text-xs text-[#666]">Issued {new Date(cert.issuedAt).toLocaleDateString()}</p>
                {cert.expiresAt && <p className="text-xs text-[#555]">Expires {new Date(cert.expiresAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Learning Paths */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-[#D62B2B]" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#777]">Learning Paths</h2>
        </div>
        {activePaths.length === 0 ? (
          <p className="text-sm text-[#555]">Not enrolled in any paths.</p>
        ) : (
          <div className="space-y-3">
            {activePaths.map((path) => {
              const pct = path.totalCourses > 0 ? Math.round((path.completedCourses / path.totalCourses) * 100) : 0;
              return (
                <div key={path.pathId} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{path.title}</p>
                    <span className="rounded-full bg-[#222] px-2 py-0.5 text-xs text-[#777]">{path.category}</span>
                  </div>
                  <div className="mb-1 flex items-center justify-between text-xs text-[#777]">
                    <span>{path.completedCourses} of {path.totalCourses} courses</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <div className="h-full rounded-full bg-[#D62B2B] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Training Stats + Recent Checklists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#777]">Training Progress</h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{enrollmentStats.completed}</p>
              <p className="mt-1 text-xs text-[#666]">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{enrollmentStats.total}</p>
              <p className="mt-1 text-xs text-[#666]">Total Enrolled</p>
            </div>
            {enrollmentStats.total > 0 && (
              <div className="flex-1">
                <div className="mb-1 text-right text-xs text-[#777]">{Math.round((enrollmentStats.completed / enrollmentStats.total) * 100)}%</div>
                <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
                  <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${Math.round((enrollmentStats.completed / enrollmentStats.total) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#777]">Recent Checklists</h2>
          {recentChecklists.length === 0 ? (
            <p className="text-sm text-[#555]">No checklist activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recentChecklists.slice(0, 5).map((item) => (
                <div key={item.scheduleId} className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-[#ccc]">{item.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${item.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-300'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
