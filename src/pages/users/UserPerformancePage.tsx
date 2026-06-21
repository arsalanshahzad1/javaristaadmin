import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, CheckCircle2, ClipboardList, Coffee, Plus } from 'lucide-react';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { IssueCertificationModal } from '../../components/certifications/IssueCertificationModal';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PerformanceProfile = {
  user: { id: string; name: string; email: string; role: string };
  academy: {
    enrolledCourses: number;
    completedCourses: number;
    currentLevel: number;
    coursesInProgress: { courseId: string; title: string; progressPercent: number }[];
  };
  certifications: {
    total: number;
    list: { type: string; issuedAt: string; certificateNumber: string }[];
  };
  checklists: {
    totalSubmitted: number;
    totalApproved: number;
    totalFlagged: number;
    approvalRate: number;
    recentSubmissions: { templateTitle: string; status: string; submittedAt?: string }[];
  };
  brewing: { totalBrews: number; avgRating: number | null; thisMonth: number };
};

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Unable to load performance profile';
}

async function getPerformanceProfile(userId: string) {
  const response = await adminApiClient.get<ApiEnvelope<PerformanceProfile>>(`/performance/user/${userId}`);
  return response.data.data;
}

function formatLabel(value: string) {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function StatTile({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#777]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="rounded-lg bg-[#D62B2B]/10 p-2 text-[#D62B2B]">{icon}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="h-12 animate-pulse rounded-lg bg-[#242424]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#242424]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-[#242424]" />
        <div className="h-64 animate-pulse rounded-xl bg-[#242424]" />
      </div>
    </div>
  );
}

export function UserPerformancePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isIssueModalOpen, setIssueModalOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['user-performance', id],
    queryFn: () => getPerformanceProfile(id ?? ''),
    enabled: Boolean(id),
  });

  if (profileQuery.isLoading) return <SkeletonPage />;

  if (profileQuery.isError) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
        <p className="text-red-300">{getErrorMessage(profileQuery.error)}</p>
        <button type="button" onClick={() => profileQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
          Try again
        </button>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile || !id) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/users')} className="mb-3 inline-flex items-center gap-2 text-sm text-[#999] hover:text-white">
            <ArrowLeft size={16} />
            Back to users
          </button>
          <h1 className="text-2xl font-bold text-white">{profile.user.name}</h1>
          <p className="mt-1 text-sm text-[#777]">{profile.user.email} · {formatLabel(profile.user.role)}</p>
        </div>
        <button type="button" onClick={() => setIssueModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
          <Plus size={16} />
          Issue Certification
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile title="Courses Enrolled" value={profile.academy.enrolledCourses} icon={<BookOpen size={18} />} />
        <StatTile title="Courses Completed" value={profile.academy.completedCourses} icon={<CheckCircle2 size={18} />} />
        <StatTile title="Current Level" value={profile.academy.currentLevel ? `Level ${profile.academy.currentLevel}` : 'Not certified'} icon={<Award size={18} />} />
        <StatTile title="Approval Rate" value={`${profile.checklists.approvalRate}%`} icon={<ClipboardList size={18} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Academy Progress">
          <div className="space-y-4">
            {profile.academy.coursesInProgress.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#777]">No courses currently in progress</p>
            ) : profile.academy.coursesInProgress.map((course) => (
              <div key={course.courseId} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{course.title}</p>
                  <span className="text-sm text-[#999]">{course.progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
                  <div className="h-full rounded-full bg-[#D62B2B]" style={{ width: `${course.progressPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Certifications">
          {profile.certifications.list.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#777]">No certifications issued yet</p>
          ) : (
            <div className="space-y-3">
              {profile.certifications.list.map((cert) => (
                <div key={cert.certificateNumber} className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#151515] p-4">
                  <div>
                    <p className="font-medium text-white">{formatLabel(cert.type)}</p>
                    <p className="mt-1 text-xs text-[#777]">{cert.certificateNumber}</p>
                  </div>
                  <span className="text-sm text-[#999]">{format(new Date(cert.issuedAt), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Checklist Stats">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#151515] p-4 text-center">
              <p className="text-2xl font-bold text-white">{profile.checklists.totalSubmitted}</p>
              <p className="mt-1 text-xs text-[#777]">Submitted</p>
            </div>
            <div className="rounded-lg bg-[#151515] p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{profile.checklists.totalApproved}</p>
              <p className="mt-1 text-xs text-[#777]">Approved</p>
            </div>
            <div className="rounded-lg bg-[#151515] p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{profile.checklists.totalFlagged}</p>
              <p className="mt-1 text-xs text-[#777]">Flagged</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {profile.checklists.recentSubmissions.map((submission, index) => (
              <div key={`${submission.templateTitle}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[#151515] px-3 py-2">
                <span className="text-sm text-[#ddd]">{submission.templateTitle || 'Checklist'}</span>
                <Badge variant={submission.status === 'approved' ? 'success' : submission.status === 'flagged' ? 'danger' : 'info'}>{formatLabel(submission.status)}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Brewing Stats">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile title="Total Brews" value={profile.brewing.totalBrews} icon={<Coffee size={18} />} />
            <StatTile title="Avg Rating" value={profile.brewing.avgRating == null ? 'No ratings' : `${profile.brewing.avgRating.toFixed(1)} / 5`} icon={<Award size={18} />} />
            <StatTile title="This Month" value={profile.brewing.thisMonth} icon={<Coffee size={18} />} />
          </div>
        </SectionCard>
      </div>

      <IssueCertificationModal
        isOpen={isIssueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        prefilledUserId={id}
        prefilledUserName={profile.user.name}
      />
    </div>
  );
}
