import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit, Eye, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';

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
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments'>('courses');
  const [courseFilter, setCourseFilter] = useState('');

  const coursesQuery = useQuery({ queryKey: ['academy-courses'], queryFn: getCourses });
  const enrollmentsQuery = useQuery({
    queryKey: ['academy-enrollments', courseFilter],
    queryFn: () => getEnrollments(courseFilter),
    enabled: activeTab === 'enrollments',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Java Academy</h1>
          <p className="mt-1 text-sm text-[#777]">Manage courses, lessons, and enrollments.</p>
        </div>
        <button type="button" onClick={() => navigate('/academy/courses/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
          <Plus size={16} />
          New Course
        </button>
      </div>

      <div className="flex gap-2 border-b border-[#2A2A2A]">
        {[
          { id: 'courses', label: 'Courses' },
          { id: 'enrollments', label: 'Enrollments' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as 'courses' | 'enrollments')}
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
    </div>
  );
}
