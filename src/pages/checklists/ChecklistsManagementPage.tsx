import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';

type Category =
  | 'opening'
  | 'closing'
  | 'cleaning'
  | 'inventory'
  | 'product_quality'
  | 'drive_thru'
  | 'equipment_maintenance'
  | 'food_safety'
  | 'delivery_receiving';
type Status = 'in_progress' | 'submitted' | 'approved' | 'flagged';
type ApiEnvelope<T> = { success: boolean; message: string; data: T; pagination?: { page: number; limit: number; total: number; pages: number } };
type TemplateItem = { order: number; label: string; requiresPhoto: boolean; requiresNote: boolean };
type Template = { _id: string; title: string; category: Category; items: TemplateItem[]; isActive: boolean };
type Submission = {
  _id: string;
  template?: { title?: string; category?: Category; items?: TemplateItem[] };
  submittedBy?: { name?: string; email?: string };
  completedItems: { itemOrder: number; label: string; completed: boolean; photoUrl?: string; note?: string }[];
  status: Status;
  submittedAt?: string;
  managerNote?: string;
};
type TemplateFormValues = { title: string; category: Category; isActive: boolean; items: TemplateItem[] };

const categories: { value: Category; label: string }[] = [
  { value: 'opening', label: 'Opening' },
  { value: 'closing', label: 'Closing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'product_quality', label: 'Product Quality' },
  { value: 'drive_thru', label: 'Drive Thru' },
  { value: 'equipment_maintenance', label: 'Equipment Maintenance' },
  { value: 'food_safety', label: 'Food Safety' },
  { value: 'delivery_receiving', label: 'Delivery Receiving' },
];
const statusOptions: { value: Status; label: string }[] = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'flagged', label: 'Flagged' },
];
const statusVariant: Record<Status, 'warning' | 'info' | 'success' | 'danger'> = {
  in_progress: 'warning',
  submitted: 'info',
  approved: 'success',
  flagged: 'danger',
};
const emptyTemplate: TemplateFormValues = {
  title: '',
  category: 'opening',
  isActive: true,
  items: [],
};

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function labelFor(value?: string) {
  return categories.find((item) => item.value === value)?.label ?? statusOptions.find((item) => item.value === value)?.label ?? '-';
}

async function getTemplates() {
  const response = await adminApiClient.get<ApiEnvelope<Template[]>>('/checklists/templates', { params: { includeInactive: 'true' } });
  return response.data.data;
}

async function saveTemplate(payload: { id?: string; values: TemplateFormValues }) {
  const body = {
    ...payload.values,
    items: payload.values.items.map((item, index) => ({ ...item, order: index + 1 })),
  };
  const response = payload.id
    ? await adminApiClient.put<ApiEnvelope<Template>>(`/checklists/templates/${payload.id}`, body)
    : await adminApiClient.post<ApiEnvelope<Template>>('/checklists/templates', body);
  return response.data;
}

async function getSubmissions(params: { status?: string; category?: string; from?: string; to?: string; employeeSearch?: string }) {
  const response = await adminApiClient.get<ApiEnvelope<Submission[]>>('/checklists/submissions', { params: { ...params, limit: 50 } });
  return response.data.data;
}

async function getSubmission(id: string) {
  const response = await adminApiClient.get<ApiEnvelope<Submission>>(`/checklists/submissions/${id}`);
  return response.data.data;
}

async function approveSubmission(payload: { id: string; status: 'approved' | 'flagged'; managerNote: string }) {
  const response = await adminApiClient.put<ApiEnvelope<Submission>>(`/checklists/submissions/${payload.id}/approve`, {
    status: payload.status,
    managerNote: payload.managerNote,
  });
  return response.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

function TemplateModal({ isOpen, onClose, template }: { isOpen: boolean; onClose: () => void; template: Template | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TemplateFormValues>({ defaultValues: emptyTemplate });
  const items = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (isOpen) {
      reset(template ? {
        title: template.title,
        category: template.category,
        isActive: template.isActive,
        items: template.items.map((item, index) => ({ ...item, order: index + 1 })),
      } : emptyTemplate);
    }
  }, [isOpen, reset, template]);

  const mutation = useMutation({
    mutationFn: saveTemplate,
    onSuccess: (response) => {
      toast.success(response.message || 'Template saved');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Template' : 'New Template'} size="xl">
      <form onSubmit={handleSubmit((values) => mutation.mutate({ id: template?._id, values }))} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
            <input {...register('title', { required: 'Title is required' })} className={fieldClass()} />
            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Category</label>
            <select {...register('category')} className={fieldClass()}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
          Active
        </label>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Items</h3>
            <button type="button" onClick={() => items.append({ order: items.fields.length + 1, label: '', requiresPhoto: false, requiresNote: false })} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {items.fields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#151515] p-2">
                <div className="flex items-center gap-1 text-xs text-[#777]">
                  <button type="button" disabled={index === 0} onClick={() => items.swap(index, index - 1)} className="rounded border border-[#333] px-2 py-1 disabled:opacity-30">Up</button>
                  <button type="button" disabled={index === items.fields.length - 1} onClick={() => items.swap(index, index + 1)} className="rounded border border-[#333] px-2 py-1 disabled:opacity-30">Down</button>
                </div>
                <input {...register(`items.${index}.label`, { required: true })} placeholder="Item label" className={fieldClass()} />
                <label className="flex items-center gap-1 text-xs text-[#ccc]"><input type="checkbox" {...register(`items.${index}.requiresPhoto`)} className="accent-[#D62B2B]" /> Requires Photo</label>
                <label className="flex items-center gap-1 text-xs text-[#ccc]"><input type="checkbox" {...register(`items.${index}.requiresNote`)} className="accent-[#D62B2B]" /> Requires Note</label>
                <button type="button" onClick={() => items.remove(index)} className="rounded-lg border border-red-900/60 p-2 text-red-300 hover:bg-red-900/20"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save Template'}</button>
        </div>
      </form>
    </Modal>
  );
}

function SubmissionReviewModal({ submissionId, onClose }: { submissionId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const noteForm = useForm<{ managerNote: string }>({ defaultValues: { managerNote: '' } });
  const submissionQuery = useQuery({
    queryKey: ['checklist-submission', submissionId],
    queryFn: () => getSubmission(submissionId ?? ''),
    enabled: Boolean(submissionId),
  });
  const mutation = useMutation({
    mutationFn: approveSubmission,
    onSuccess: (response) => {
      toast.success(response.message || 'Submission reviewed');
      queryClient.invalidateQueries({ queryKey: ['checklist-submissions'] });
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const submission = submissionQuery.data;
  const managerNote = useWatch({ control: noteForm.control, name: 'managerNote' }) ?? '';

  useEffect(() => {
    if (submissionId) noteForm.reset({ managerNote: '' });
  }, [noteForm, submissionId]);

  return (
    <Modal isOpen={Boolean(submissionId)} onClose={onClose} title="Review Submission" size="xl">
      {submissionQuery.isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-[#242424]" />
      ) : submissionQuery.isError ? (
        <p className="text-sm text-red-300">{getErrorMessage(submissionQuery.error)}</p>
      ) : submission ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">{submission.template?.title ?? 'Checklist'}</p>
              <p className="text-sm text-[#777]">{submission.submittedBy?.name ?? 'Unknown employee'}</p>
            </div>
            <Badge variant={statusVariant[submission.status]}>{labelFor(submission.status)}</Badge>
          </div>
          <div className="space-y-3">
            {submission.completedItems.map((item) => (
              <div key={`${item.itemOrder}-${item.label}`} className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={item.completed} readOnly className="accent-[#D62B2B]" />
                  <span className="font-medium text-white">{item.label}</span>
                </div>
                {item.note && <p className="mt-2 text-sm text-[#bbb]">{item.note}</p>}
                {item.photoUrl && <img src={item.photoUrl} alt={item.label} className="mt-3 h-28 w-28 rounded-lg object-cover" />}
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Manager Note</label>
            <textarea rows={4} {...noteForm.register('managerNote')} defaultValue={submission.managerNote ?? ''} className={`${fieldClass()} resize-none`} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => mutation.mutate({ id: submission._id, status: 'flagged', managerNote })} disabled={mutation.isPending} className="rounded-lg border border-red-900/60 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 disabled:opacity-50">Flag</button>
            <button type="button" onClick={() => mutation.mutate({ id: submission._id, status: 'approved', managerNote })} disabled={mutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">Approve</button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {Array.from({ length: columns }).map((_, cell) => <td key={cell} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-[#242424]" /></td>)}
        </tr>
      ))}
    </>
  );
}

export function ChecklistsManagementPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'templates' | 'submissions'>('templates');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);

  const templatesQuery = useQuery({ queryKey: ['checklist-templates'], queryFn: getTemplates });
  const submissionsQuery = useQuery({
    queryKey: ['checklist-submissions', status, category, from, to, debouncedEmployeeSearch],
    queryFn: () => getSubmissions({
      status: status || undefined,
      category: category || undefined,
      from: from || undefined,
      to: to || undefined,
      employeeSearch: debouncedEmployeeSearch || undefined,
    }),
    enabled: tab === 'submissions',
  });

  const toggleTemplateMutation = useMutation({
    mutationFn: (template: Template) => saveTemplate({ id: template._id, values: { title: template.title, category: template.category, items: template.items, isActive: !template.isActive } }),
    onSuccess: (response) => {
      toast.success(response.message || 'Template updated');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Checklists</h1>
          <p className="mt-1 text-sm text-[#777]">Manage operational checklist templates and team submissions.</p>
        </div>
        {tab === 'templates' && (
          <button type="button" onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
            <Plus size={16} /> New Template
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#2A2A2A]">
        {['templates', 'submissions'].map((item) => (
          <button key={item} type="button" onClick={() => setTab(item as 'templates' | 'submissions')} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === item ? 'border-[#D62B2B] text-white' : 'border-transparent text-[#777] hover:text-white'}`}>
            {item === 'templates' ? 'Templates' : 'Submissions'}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Item count</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templatesQuery.isLoading ? <SkeletonRows columns={5} /> : (templatesQuery.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#777]"><ClipboardList className="mx-auto mb-3 text-[#555]" />No templates found</td></tr>
                ) : (templatesQuery.data ?? []).map((template, index) => (
                  <tr key={template._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">{template.title}</td>
                    <td className="px-4 py-3 text-[#bbb]">{labelFor(template.category)}</td>
                    <td className="px-4 py-3 text-[#bbb]">{template.items.length}</td>
                    <td className="px-4 py-3"><Badge variant={template.isActive ? 'success' : 'default'}>{template.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditingTemplate(template); setTemplateModalOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Edit size={13} /> Edit</button>
                        <button type="button" onClick={() => toggleTemplateMutation.mutate(template)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><RefreshCw size={13} /> Toggle Active</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex flex-wrap gap-3 border-b border-[#2A2A2A] p-4">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass()}><option value="">All statuses</option>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass()}><option value="">All categories</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass()} />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass()} />
            <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Employee search" className={fieldClass()} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted at</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissionsQuery.isLoading ? <SkeletonRows columns={6} /> : (submissionsQuery.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#777]">No submissions found</td></tr>
                ) : (submissionsQuery.data ?? []).map((submission, index) => (
                  <tr key={submission._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 text-white">{submission.submittedBy?.name ?? 'Unknown employee'}</td>
                    <td className="px-4 py-3 text-[#bbb]">{submission.template?.title ?? 'Checklist'}</td>
                    <td className="px-4 py-3 text-[#bbb]">{labelFor(submission.template?.category)}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[submission.status]}>{labelFor(submission.status)}</Badge></td>
                    <td className="px-4 py-3 text-[#999]">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => setReviewSubmissionId(submission._id)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Eye size={13} /> Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <TemplateModal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} template={editingTemplate} />
      <SubmissionReviewModal submissionId={reviewSubmissionId} onClose={() => setReviewSubmissionId(null)} />
    </div>
  );
}
