import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit, Eye, GitBranch, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { LearningPathFormModal, type LearningPath } from './components/LearningPathFormModal';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Course = {
  _id: string;
  title: string;
  slug: string;
  category: 'coffee_foundations' | 'certification';
  level?: number | null;
  order?: number;
  requiredRole: 'community' | 'investor' | 'employee';
  isActive: boolean;
  lessons?: Lesson[];
};

type Lesson = {
  _id: string;
  title: string;
  order?: number;
  contentType?: 'video' | 'text' | 'quiz';
  durationSeconds?: number;
};

type Enrollment = {
  _id: string;
  user?: { name?: string; email?: string };
  course?: { _id?: string; title?: string };
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string | null;
};

type PathCategory = 'mandatory' | 'recommended' | 'leadership' | 'certification' | 'corporate';

const PATH_CATEGORY_COLORS: Record<PathCategory, string> = {
  mandatory: 'bg-red-900/40 text-red-300',
  recommended: 'bg-blue-900/40 text-blue-300',
  leadership: 'bg-purple-900/40 text-purple-300',
  certification: 'bg-amber-900/40 text-amber-300',
  corporate: 'bg-teal-900/40 text-teal-300',
};

async function getPaths() {
  const response = await adminApiClient.get<ApiEnvelope<LearningPath[]>>('/academy/paths');
  return response.data.data;
}

async function updatePath(payload: { id: string; isActive: boolean }) {
  const response = await adminApiClient.put<ApiEnvelope<LearningPath>>(`/academy/paths/${payload.id}`, { isActive: payload.isActive });
  return response.data;
}

async function deletePath(id: string) {
  const response = await adminApiClient.delete<ApiEnvelope<unknown>>(`/academy/paths/${id}`);
  return response.data;
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function formatLabel(value?: string | number | null) {
  if (value == null || value === '') return '-';
  return String(value).split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

async function getCourses() {
  const response = await adminApiClient.get<ApiEnvelope<Course[]>>('/academy/courses');
  return response.data.data;
}

async function getEnrollments(courseId: string) {
  const response = await adminApiClient.get<ApiEnvelope<Enrollment[]>>('/academy/enrollments', {
    params: { courseId: courseId || undefined },
  });
  return response.data.data;
}

async function updateCourseActive(payload: { id: string; isActive: boolean }) {
  const response = await adminApiClient.put<ApiEnvelope<Course>>(`/academy/courses/${payload.id}`, {
    isActive: payload.isActive,
  });
  return response.data;
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {Array.from({ length: columns }).map((_, cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
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

export function AcademyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments' | 'paths'>('courses');
  const [courseFilter, setCourseFilter] = useState('');
  const [pathModal, setPathModal] = useState<LearningPath | null | 'new'>(null);

  const coursesQuery = useQuery({ queryKey: ['academy-courses'], queryFn: getCourses });
  const enrollmentsQuery = useQuery({
    queryKey: ['academy-enrollments', courseFilter],
    queryFn: () => getEnrollments(courseFilter),
    enabled: activeTab === 'enrollments',
  });
  const pathsQuery = useQuery({
    queryKey: ['academy-paths'],
    queryFn: getPaths,
    enabled: activeTab === 'paths',
  });

  const toggleMutation = useMutation({
    mutationFn: updateCourseActive,
    onSuccess: (response) => {
      toast.success(response.message || 'Course updated');
      queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-academy-courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const pathToggleMutation = useMutation({
    mutationFn: updatePath,
    onSuccess: (response) => {
      toast.success(response.message || 'Path updated');
      queryClient.invalidateQueries({ queryKey: ['academy-paths'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const pathDeleteMutation = useMutation({
    mutationFn: deletePath,
    onSuccess: () => {
      toast.success('Learning path deleted');
      queryClient.invalidateQueries({ queryKey: ['academy-paths'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Java Academy</h1>
          <p className="mt-1 text-sm text-[#777]">Manage courses, lessons, and enrollments.</p>
        </div>
        {activeTab === 'paths' ? (
          <button type="button" onClick={() => setPathModal('new')} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
            <Plus size={16} />
            New Path
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/academy/courses/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
            <Plus size={16} />
            New Course
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#2A2A2A]">
        {[
          { id: 'courses', label: 'Courses' },
          { id: 'enrollments', label: 'Enrollments' },
          { id: 'paths', label: 'Learning Paths' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as 'courses' | 'enrollments' | 'paths')}
            className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.id ? 'border-[#D62B2B] text-white' : 'border-transparent text-[#777] hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {activeTab === 'courses' ? (
          coursesQuery.isError ? (
            <div className="p-5"><SectionError message={getErrorMessage(coursesQuery.error)} onRetry={() => coursesQuery.refetch()} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Required Role</th>
                    <th className="px-4 py-3 font-medium">Lesson count</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesQuery.isLoading ? <SkeletonRows columns={7} /> : (coursesQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <BookOpen className="mx-auto mb-3 text-[#555]" size={30} />
                        <p className="text-sm text-[#777]">No courses found</p>
                      </td>
                    </tr>
                  ) : (coursesQuery.data ?? []).map((course, index) => (
                    <tr key={course._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                      <td className="px-4 py-3 font-medium text-white">{course.title}</td>
                      <td className="px-4 py-3 text-[#bbb]">{formatLabel(course.category)}</td>
                      <td className="px-4 py-3 text-[#bbb]">{course.level ?? '-'}</td>
                      <td className="px-4 py-3"><Badge variant="default">{formatLabel(course.requiredRole)}</Badge></td>
                      <td className="px-4 py-3 text-[#bbb]">{course.lessons?.length ?? 0}</td>
                      <td className="px-4 py-3"><Badge variant={course.isActive ? 'success' : 'default'}>{course.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => navigate(`/academy/courses/${course._id}/edit`)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424]">
                            <Edit size={13} /> Edit
                          </button>
                          <button type="button" onClick={() => navigate(`/academy/courses/${course._id}/edit#lessons`)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424]">
                            <Eye size={13} /> View Lessons
                          </button>
                          <button type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: course._id, isActive: !course.isActive })} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424] disabled:opacity-50">
                            <RefreshCw size={13} /> Toggle Active
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'paths' ? (
          pathsQuery.isError ? (
            <div className="p-5"><SectionError message={getErrorMessage(pathsQuery.error)} onRetry={() => pathsQuery.refetch()} /></div>
          ) : (
            <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pathsQuery.isLoading ? (
                [0,1,2].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-[#242424]" />)
              ) : (pathsQuery.data ?? []).length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <GitBranch className="mx-auto mb-3 text-[#555]" size={30} />
                  <p className="text-sm text-[#777]">No learning paths yet</p>
                </div>
              ) : (pathsQuery.data ?? []).map((path) => (
                <div key={path._id} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white leading-snug">{path.title}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PATH_CATEGORY_COLORS[path.category] ?? 'bg-[#222] text-[#888]'}`}>
                      {path.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(path.targetRoles ?? []).slice(0, 4).map((r) => (
                      <span key={r} className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#aaa] border border-[#333]">{r.replace(/_/g, ' ')}</span>
                    ))}
                    {(path.targetRoles ?? []).length > 4 && <span className="text-xs text-[#555]">+{path.targetRoles.length - 4} more</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#666]">
                    <span>{path.courses?.length ?? 0} courses</span>
                    {path.estimatedWeeks && <span>{path.estimatedWeeks}w</span>}
                    <span>{path.enrollmentCount ?? 0} enrolled</span>
                    <span>{path.completionRate ?? 0}% complete</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A]">
                    <Badge variant={path.isActive ? 'success' : 'default'}>{path.isActive ? 'Active' : 'Inactive'}</Badge>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setPathModal(path)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1 text-xs text-[#ddd] hover:bg-[#242424]"><Edit size={11} /> Edit</button>
                      <button type="button" disabled={pathToggleMutation.isPending} onClick={() => pathToggleMutation.mutate({ id: path._id, isActive: !path.isActive })} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"><RefreshCw size={11} /></button>
                      <button type="button" onClick={() => pathDeleteMutation.mutate(path._id)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/20"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            <div className="border-b border-[#2A2A2A] p-4">
              <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
                <option value="">All courses</option>
                {(coursesQuery.data ?? []).map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
              </select>
            </div>
            {enrollmentsQuery.isError ? (
              <div className="p-5"><SectionError message={getErrorMessage(enrollmentsQuery.error)} onRetry={() => enrollmentsQuery.refetch()} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Course</th>
                      <th className="px-4 py-3 font-medium">Progress %</th>
                      <th className="px-4 py-3 font-medium">Enrolled at</th>
                      <th className="px-4 py-3 font-medium">Completed at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentsQuery.isLoading ? <SkeletonRows columns={5} /> : (enrollmentsQuery.data ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#777]">No enrollments found</td></tr>
                    ) : (enrollmentsQuery.data ?? []).map((enrollment, index) => (
                      <tr key={enrollment._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                        <td className="px-4 py-3 text-white">{enrollment.user?.name ?? 'Unknown user'}</td>
                        <td className="px-4 py-3 text-[#bbb]">{enrollment.course?.title ?? 'Unknown course'}</td>
                        <td className="px-4 py-3 text-[#bbb]">{enrollment.progressPercent}%</td>
                        <td className="px-4 py-3 text-[#999]">{enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-[#999]">{enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {pathModal !== null && (
        <LearningPathFormModal
          editing={pathModal === 'new' ? null : pathModal}
          onClose={() => setPathModal(null)}
        />
      )}
    </div>
  );
}
