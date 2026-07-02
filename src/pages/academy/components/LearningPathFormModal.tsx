import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, GripVertical, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../../api/adminApiClient';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

const PATH_CATEGORIES = ['mandatory', 'recommended', 'leadership', 'certification', 'corporate'] as const;
type PathCategory = typeof PATH_CATEGORIES[number];

const CATEGORY_COLORS: Record<PathCategory, string> = {
  mandatory: 'bg-red-900/40 text-red-300',
  recommended: 'bg-blue-900/40 text-blue-300',
  leadership: 'bg-purple-900/40 text-purple-300',
  certification: 'bg-amber-900/40 text-amber-300',
  corporate: 'bg-teal-900/40 text-teal-300',
};

const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

type Course = { _id: string; title: string; category: string };
type LearningPath = {
  _id: string;
  title: string;
  description?: string;
  category: PathCategory;
  targetRoles: string[];
  targetStores: string[];
  courses: string[];
  prerequisites: string[];
  estimatedWeeks?: number;
  isActive: boolean;
  enrollmentCount: number;
  completionRate: number;
};

type FormState = {
  title: string;
  description: string;
  category: PathCategory;
  targetRoles: string[];
  targetStores: string;
  courses: string[];
  prerequisites: string[];
  estimatedWeeks: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  category: 'mandatory',
  targetRoles: [],
  targetStores: '',
  courses: [],
  prerequisites: [],
  estimatedWeeks: '',
  isActive: true,
};

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

async function getCourses() {
  const res = await adminApiClient.get<ApiEnvelope<Course[]>>('/academy/courses');
  return res.data.data;
}

async function getPaths() {
  const res = await adminApiClient.get<ApiEnvelope<LearningPath[]>>('/academy/paths');
  return res.data.data;
}

interface Props {
  editing?: LearningPath | null;
  onClose: () => void;
}

export function LearningPathFormModal({ editing, onClose }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const coursesQuery = useQuery({ queryKey: ['academy-courses'], queryFn: getCourses });
  const pathsQuery = useQuery({ queryKey: ['academy-paths'], queryFn: getPaths });

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? '',
        category: editing.category,
        targetRoles: editing.targetRoles ?? [],
        targetStores: (editing.targetStores ?? []).join(', '),
        courses: (editing.courses ?? []).map(String),
        prerequisites: (editing.prerequisites ?? []).map(String),
        estimatedWeeks: editing.estimatedWeeks != null ? String(editing.estimatedWeeks) : '',
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormState) => {
      const body = {
        title: values.title,
        description: values.description || undefined,
        category: values.category,
        targetRoles: values.targetRoles,
        targetStores: values.targetStores ? values.targetStores.split(',').map((s) => s.trim()).filter(Boolean) : [],
        courses: values.courses,
        prerequisites: values.prerequisites,
        estimatedWeeks: values.estimatedWeeks ? Number(values.estimatedWeeks) : undefined,
        isActive: values.isActive,
      };
      if (editing) {
        return adminApiClient.put(`/academy/paths/${editing._id}`, body);
      }
      return adminApiClient.post('/academy/paths', body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Learning path updated' : 'Learning path created');
      queryClient.invalidateQueries({ queryKey: ['academy-paths'] });
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const toggleCourse = (id: string) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.includes(id)
        ? prev.courses.filter((c) => c !== id)
        : [...prev.courses, id],
    }));
  };

  const togglePrereq = (id: string) => {
    setForm((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.includes(id)
        ? prev.prerequisites.filter((p) => p !== id)
        : [...prev.prerequisites, id],
    }));
  };

  const moveCourse = (idx: number, direction: -1 | 1) => {
    const newList = [...form.courses];
    const target = idx + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    setForm((prev) => ({ ...prev, courses: newList }));
  };

  const fieldClass = 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
  const labelClass = 'mb-1.5 block text-xs font-medium text-[#aaa]';

  const allCourses = coursesQuery.data ?? [];
  const allPaths = (pathsQuery.data ?? []).filter((p) => !editing || p._id !== editing._id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#141414]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Learning Path' : 'New Learning Path'}</h2>
          <button type="button" onClick={onClose} className="text-[#666] hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={fieldClass} placeholder="e.g. Barista Program" />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className={`${fieldClass} resize-none`} placeholder="Optional description..." />
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Category *</label>
            <div className="flex flex-wrap gap-2">
              {PATH_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, category: cat }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${form.category === cat ? CATEGORY_COLORS[cat] + ' ring-2 ring-white/20' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Target Roles */}
          <div>
            <label className={labelClass}>Target Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${form.targetRoles.includes(role) ? 'bg-[#D62B2B]/20 text-[#D62B2B] ring-1 ring-[#D62B2B]/40' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                >
                  {role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Target Stores */}
          <div>
            <label className={labelClass}>Target Stores (comma separated, optional)</label>
            <input value={form.targetStores} onChange={(e) => setForm((p) => ({ ...p, targetStores: e.target.value }))} className={fieldClass} placeholder="store-001, store-002" />
          </div>

          {/* Courses (ordered) */}
          <div>
            <label className={labelClass}>Courses (ordered)</label>
            <div className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-[#333] bg-[#111] p-2 space-y-1">
              {allCourses.map((course) => (
                <label key={course._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#1A1A1A]">
                  <input type="checkbox" checked={form.courses.includes(course._id)} onChange={() => toggleCourse(course._id)} className="accent-[#D62B2B]" />
                  <span className="text-xs text-[#ddd]">{course.title}</span>
                  <span className="ml-auto text-xs text-[#555]">{course.category}</span>
                </label>
              ))}
              {allCourses.length === 0 && <p className="px-2 py-1 text-xs text-[#555]">No courses available</p>}
            </div>
            {/* Ordered list with reorder */}
            {form.courses.length > 0 && (
              <div className="rounded-lg border border-[#333] bg-[#0E0E0E] p-2 space-y-1">
                <p className="mb-1 text-xs text-[#555]">Drag order (use arrows):</p>
                {form.courses.map((id, idx) => {
                  const course = allCourses.find((c) => c._id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 rounded px-2 py-1 bg-[#1A1A1A]">
                      <GripVertical size={12} className="text-[#555]" />
                      <span className="flex-1 text-xs text-[#ddd]">{course?.title ?? id}</span>
                      <button type="button" onClick={() => moveCourse(idx, -1)} className="text-[#666] hover:text-white text-xs">↑</button>
                      <button type="button" onClick={() => moveCourse(idx, 1)} className="text-[#666] hover:text-white text-xs">↓</button>
                      <button type="button" onClick={() => toggleCourse(id)} className="text-[#666] hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prerequisites (other paths) */}
          <div>
            <label className={labelClass}>Prerequisites (other paths)</label>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-[#333] bg-[#111] p-2 space-y-1">
              {allPaths.map((path) => (
                <label key={path._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#1A1A1A]">
                  <input type="checkbox" checked={form.prerequisites.includes(path._id)} onChange={() => togglePrereq(path._id)} className="accent-[#D62B2B]" />
                  <span className="text-xs text-[#ddd]">{path.title}</span>
                </label>
              ))}
              {allPaths.length === 0 && <p className="px-2 py-1 text-xs text-[#555]">No other paths</p>}
            </div>
          </div>

          {/* Estimated Weeks */}
          <div>
            <label className={labelClass}>Estimated Weeks</label>
            <input type="number" min={1} value={form.estimatedWeeks} onChange={(e) => setForm((p) => ({ ...p, estimatedWeeks: e.target.value }))} className={fieldClass} placeholder="e.g. 4" />
          </div>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative h-5 w-9 rounded-full transition-colors ${form.isActive ? 'bg-[#D62B2B]' : 'bg-[#333]'}`}>
              <input type="checkbox" className="sr-only" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-[#ccc]">Active</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#2A2A2A] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ccc] hover:bg-[#1A1A1A]">Cancel</button>
          <button
            type="button"
            disabled={!form.title || !form.category || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
            className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Path'}
          </button>
        </div>
      </div>
    </div>
  );
}
