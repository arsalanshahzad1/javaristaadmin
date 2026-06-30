import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Plus, Trash2, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { saveLesson } from '../../api/services/academyService';
import type { LessonFormValues, LessonRecord } from '../../api/services/academyService';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { QuizQuestion } from '../../types';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type CourseCategory = 'coffee_foundations' | 'certification' | 'mandatory' | 'recommended' | 'leadership' | 'corporate';

type CourseFormValues = {
  title: string;
  slug: string;
  description: string;
  category: CourseCategory;
  level: number | null;
  order: number;
  thumbnail: string;
  requiredRole: 'community' | 'investor' | 'employee';
  isActive: boolean;
  assignedRoles: string[];
  prerequisites: string[];
  minReadingMinutes: number;
  requiresVideoCompletion: boolean;
  minQuizScore: number;
  requiresPractical: boolean;
};
type Course = Omit<CourseFormValues, 'assignedRoles' | 'prerequisites'> & {
  _id: string;
  lessons?: LessonRecord[];
  assignedRoles?: string[];
  prerequisites?: string[];
  completionRequirements?: {
    minReadingMinutes?: number;
    requiresVideoCompletion?: boolean;
    minQuizScore?: number;
    requiresPractical?: boolean;
  };
};

const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

const emptyCourse: CourseFormValues = {
  title: '',
  slug: '',
  description: '',
  category: 'coffee_foundations',
  level: 1,
  order: 0,
  thumbnail: '',
  requiredRole: 'community',
  isActive: true,
  assignedRoles: [],
  prerequisites: [],
  minReadingMinutes: 0,
  requiresVideoCompletion: false,
  minQuizScore: 0,
  requiresPractical: false,
};

const emptyLesson: LessonFormValues = {
  title: '',
  order: 0,
  contentType: 'text',
  videoUrl: '',
  body: '',
  durationSeconds: 0,
};

const emptyQuestion = (): QuizQuestion => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
});

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

async function getCourse(id: string) {
  const response = await adminApiClient.get<ApiEnvelope<Course>>(`/academy/courses/${id}`);
  return response.data.data;
}

async function saveCourse(payload: { id?: string; values: CourseFormValues }) {
  const { assignedRoles, prerequisites, minReadingMinutes, requiresVideoCompletion, minQuizScore, requiresPractical, ...rest } = payload.values;
  const body = {
    ...rest,
    level: payload.values.category === 'certification' ? Number(payload.values.level) : null,
    assignedRoles,
    prerequisites,
    completionRequirements: {
      minReadingMinutes: minReadingMinutes || undefined,
      requiresVideoCompletion,
      minQuizScore: minQuizScore || undefined,
      requiresPractical,
    },
  };
  const response = payload.id
    ? await adminApiClient.put<ApiEnvelope<Course>>(`/academy/courses/${payload.id}`, body)
    : await adminApiClient.post<ApiEnvelope<Course>>('/academy/courses', body);
  return response.data;
}

async function deleteLesson(id: string) {
  const response = await adminApiClient.delete<ApiEnvelope<unknown>>(`/academy/lessons/${id}`);
  return response.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

export function CourseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [savedCourseId, setSavedCourseId] = useState(id ?? '');
  const [isSlugEdited, setSlugEdited] = useState(Boolean(id));
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonRecord | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const courseQuery = useQuery({
    queryKey: ['academy-course', id],
    queryFn: () => getCourse(id ?? ''),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<CourseFormValues>({
    defaultValues: emptyCourse,
  });
  const lessonForm = useForm<LessonFormValues>({ defaultValues: emptyLesson });
  const category = useWatch({ control, name: 'category' });
  const lessonContentType = useWatch({ control: lessonForm.control, name: 'contentType' });

  useEffect(() => {
    if (courseQuery.data) {
      reset({
        title: courseQuery.data.title,
        slug: courseQuery.data.slug,
        description: courseQuery.data.description ?? '',
        category: courseQuery.data.category,
        level: courseQuery.data.level ?? 1,
        order: courseQuery.data.order ?? 0,
        thumbnail: courseQuery.data.thumbnail ?? '',
        requiredRole: courseQuery.data.requiredRole,
        isActive: courseQuery.data.isActive,
        assignedRoles: courseQuery.data.assignedRoles ?? [],
        prerequisites: courseQuery.data.prerequisites ?? [],
        minReadingMinutes: courseQuery.data.completionRequirements?.minReadingMinutes ?? 0,
        requiresVideoCompletion: courseQuery.data.completionRequirements?.requiresVideoCompletion ?? false,
        minQuizScore: courseQuery.data.completionRequirements?.minQuizScore ?? 0,
        requiresPractical: courseQuery.data.completionRequirements?.requiresPractical ?? false,
      });
    }
  }, [courseQuery.data, reset]);

  const lessons = useMemo(
    () => [...(courseQuery.data?.lessons ?? [])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [courseQuery.data?.lessons],
  );

  const courseMutation = useMutation({
    mutationFn: saveCourse,
    onSuccess: (response) => {
      toast.success(response.message || 'Course saved');
      setSavedCourseId(response.data._id);
      queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-academy-courses'] });
      queryClient.setQueryData(['academy-course', response.data._id], response.data);
      if (!isEdit) navigate(`/academy/courses/${response.data._id}/edit`, { replace: true });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const lessonMutation = useMutation({
    mutationFn: saveLesson,
    onSuccess: (response) => {
      toast.success(response.message || 'Lesson saved');
      closeLessonForm();
      queryClient.invalidateQueries({ queryKey: ['academy-course', savedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: (response) => {
      toast.success(response.message || 'Lesson deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['academy-course', savedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['academy-courses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function openLessonForm(lesson?: LessonRecord) {
    setEditingLesson(lesson ?? null);
    lessonForm.reset(lesson ? {
      title: lesson.title,
      order: lesson.order ?? 0,
      contentType: lesson.contentType ?? 'text',
      videoUrl: lesson.videoUrl ?? '',
      body: lesson.body ?? '',
      durationSeconds: lesson.durationSeconds ?? 0,
    } : { ...emptyLesson, order: lessons.length + 1 });
    setQuizQuestions(lesson?.questions ?? []);
    setLessonFormOpen(true);
  }

  function closeLessonForm() {
    setLessonFormOpen(false);
    setEditingLesson(null);
    lessonForm.reset(emptyLesson);
    setQuizQuestions([]);
  }

  function markSlugEdited() {
    setSlugEdited(true);
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isSlugEdited) setValue('slug', toSlug(event.target.value));
  }

  // Quiz builder helpers
  function addQuestion() {
    if (quizQuestions.length >= 20) return;
    setQuizQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestionText(index: number, value: string) {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, question: value } : q)),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuizQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const newOptions = [...q.options] as [string, string, string, string];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }),
    );
  }

  function setCorrectIndex(questionIndex: number, optionIndex: 0 | 1 | 2 | 3) {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === questionIndex ? { ...q, correctIndex: optionIndex } : q)),
    );
  }

  if (courseQuery.isLoading) {
    return <div className="h-80 animate-pulse rounded-xl bg-[#242424]" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <button type="button" onClick={() => navigate('/academy')} className="mb-3 inline-flex items-center gap-2 text-sm text-[#999] hover:text-white">
          <ArrowLeft size={16} /> Back to academy
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Course' : 'New Course'}</h1>
      </div>

      {courseQuery.isError ? (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <p className="text-red-300">{getErrorMessage(courseQuery.error)}</p>
          <button type="button" onClick={() => courseQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">Try again</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((values) => courseMutation.mutate({ id: savedCourseId || undefined, values }))} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
              <input {...register('title', { required: 'Title is required', onChange: handleTitleChange })} className={fieldClass()} />
              {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Slug</label>
              <input {...register('slug', { required: 'Slug is required', onChange: markSlugEdited })} className={fieldClass()} />
              {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Description</label>
              <textarea rows={4} {...register('description')} className={`${fieldClass()} resize-none`} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Category</label>
              <select {...register('category')} className={fieldClass()}>
                <option value="coffee_foundations">Coffee Foundations</option>
                <option value="certification">Certification</option>
                <option value="mandatory">Mandatory</option>
                <option value="recommended">Recommended</option>
                <option value="leadership">Leadership</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            {category === 'certification' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Level</label>
                <input type="number" min={1} max={5} {...register('level', { valueAsNumber: true })} className={fieldClass()} />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Order</label>
              <input type="number" {...register('order', { valueAsNumber: true })} className={fieldClass()} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Thumbnail URL</label>
              <input {...register('thumbnail')} className={fieldClass()} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Required Role</label>
              <select {...register('requiredRole')} className={fieldClass()}>
                <option value="community">Community</option>
                <option value="investor">Investor</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
              Active
            </label>

            {/* Assigned Roles */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#ccc]">Assigned Roles</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => {
                  const assignedRoles = (control._formValues as CourseFormValues).assignedRoles ?? [];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        const current = (control._formValues as CourseFormValues).assignedRoles ?? [];
                        setValue('assignedRoles', current.includes(role) ? current.filter((r: string) => r !== role) : [...current, role]);
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${assignedRoles.includes(role) ? 'bg-[#D62B2B]/20 text-[#D62B2B] ring-1 ring-[#D62B2B]/40' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                    >
                      {role.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Completion Requirements */}
          <div className="mt-5 rounded-lg border border-[#2A2A2A] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#ccc]">Completion Requirements</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Min Reading Minutes</label>
                <input type="number" min={0} {...register('minReadingMinutes', { valueAsNumber: true })} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Min Quiz Score (0–100)</label>
                <input type="number" min={0} max={100} {...register('minQuizScore', { valueAsNumber: true })} className={fieldClass()} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
                <input type="checkbox" {...register('requiresVideoCompletion')} className="h-4 w-4 accent-[#D62B2B]" />
                Requires Video Completion
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
                <input type="checkbox" {...register('requiresPractical')} className="h-4 w-4 accent-[#D62B2B]" />
                Requires Practical
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={courseMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">
              {courseMutation.isPending ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        </form>
      )}

      {savedCourseId && (
        <section id="lessons" className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Lessons</h2>
            <button type="button" onClick={() => openLessonForm()} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm font-medium text-[#ddd] hover:bg-[#242424]">
              <Plus size={16} /> Add Lesson
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-3 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Title</th>
                  <th className="px-3 py-3 font-medium">Content type</th>
                  <th className="px-3 py-3 font-medium">Duration</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-[#777]">No lessons yet</td></tr>
                ) : lessons.map((lesson, index) => (
                  <tr key={lesson._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-3 py-3 text-[#bbb]">{lesson.order ?? '-'}</td>
                    <td className="px-3 py-3 font-medium text-white">{lesson.title}</td>
                    <td className="px-3 py-3">
                      <Badge variant="info">{lesson.contentType ?? 'text'}</Badge>
                      {lesson.contentType === 'quiz' && lesson.questions && lesson.questions.length > 0 && (
                        <span className="ml-2 text-xs text-[#666]">{lesson.questions.length}q</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#bbb]">{lesson.durationSeconds ?? 0}s</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openLessonForm(lesson)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Edit size={13} /> Edit</button>
                        <button type="button" onClick={() => setDeleteTarget(lesson)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lessonFormOpen && (
            <form
              onSubmit={lessonForm.handleSubmit((values) =>
                lessonMutation.mutate({
                  courseId: savedCourseId,
                  lessonId: editingLesson?._id,
                  values,
                  questions: quizQuestions,
                })
              )}
              className="mt-5 rounded-lg border border-[#2A2A2A] bg-[#151515] p-4"
            >
              <h3 className="mb-4 text-sm font-semibold text-white">{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
                  <input {...lessonForm.register('title', { required: 'Title is required' })} className={fieldClass()} />
                  {lessonForm.formState.errors.title && <p className="mt-1 text-sm text-red-400">{lessonForm.formState.errors.title.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Order</label>
                  <input type="number" {...lessonForm.register('order', { valueAsNumber: true })} className={fieldClass()} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Content Type</label>
                  <select {...lessonForm.register('contentType')} className={fieldClass()}>
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Duration in seconds</label>
                  <input type="number" {...lessonForm.register('durationSeconds', { valueAsNumber: true })} className={fieldClass()} />
                </div>

                {lessonContentType === 'video' && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[#ccc]">Video URL</label>
                    <input
                      {...lessonForm.register('videoUrl')}
                      placeholder="https://youtube.com/watch?v=... or direct MP4 URL"
                      className={fieldClass()}
                    />
                  </div>
                )}

                {lessonContentType === 'text' && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[#ccc]">Body</label>
                    <textarea rows={6} {...lessonForm.register('body')} placeholder="Markdown supported" className={`${fieldClass()} resize-none`} />
                    <p className="mt-1 text-xs text-[#777]">Markdown supported</p>
                  </div>
                )}

                {lessonContentType === 'quiz' && (
                  <div className="md:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white">Quiz Builder</span>
                        <span className="ml-2 text-xs text-[#666]">{quizQuestions.length} / 20 questions</span>
                      </div>
                      <button
                        type="button"
                        onClick={addQuestion}
                        disabled={quizQuestions.length >= 20}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={12} /> Add Question
                      </button>
                    </div>

                    {quizQuestions.length === 0 && (
                      <p className="rounded-lg border border-dashed border-[#333] py-6 text-center text-sm text-[#666]">
                        No questions yet. Click "Add Question" to get started.
                      </p>
                    )}

                    <div className="space-y-3">
                      {quizQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <span className="text-sm font-bold text-white">Question {qIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(qIdx)}
                              className="text-red-400 hover:text-red-300"
                              aria-label="Remove question"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <input
                            value={q.question}
                            onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                            placeholder="Enter question..."
                            className={`${fieldClass()} mb-3`}
                          />
                          {(['A', 'B', 'C', 'D'] as const).map((label, optIdx) => (
                            <div key={optIdx} className="mb-2 flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctIndex === optIdx}
                                onChange={() => setCorrectIndex(qIdx, optIdx as 0 | 1 | 2 | 3)}
                                className="accent-[#D62B2B]"
                              />
                              <span className="w-4 text-sm text-[#666]">{label}</span>
                              <input
                                value={q.options[optIdx] ?? ''}
                                onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${label}`}
                                className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-1.5 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-1 focus:ring-[#D62B2B]/30"
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={closeLessonForm} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
                <button type="submit" disabled={lessonMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">
                  {lessonMutation.isPending ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete lesson?"
        message={`This will delete "${deleteTarget?.title}".`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
