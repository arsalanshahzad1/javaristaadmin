import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Edit, Eye, Plus, RefreshCw, Trash2, X } from 'lucide-react';
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
type Severity = 'low' | 'medium' | 'high' | 'critical';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
type ApiEnvelope<T> = { success: boolean; message: string; data: T; pagination?: { page: number; limit: number; total: number; pages: number } };
type TemplateItem = { order: number; label: string; requiresPhoto: boolean; requiresNote: boolean };
type Recurrence = { type: RecurrenceType; dayOfWeek?: number; dayOfMonth?: number; time?: string };
type EscalationStep = {
  delayMinutes: number;
  notifyRoles: string[];
  message?: string;
};
type MissedNotification = {
  enabled: boolean;
  gracePeriodMinutes: number;
  escalationSteps: EscalationStep[];
};
type Template = {
  _id: string;
  title: string;
  category: Category;
  items: TemplateItem[];
  isActive: boolean;
  assignedRoles: string[];
  storeTypes: string[];
  recurrence: Recurrence;
  dueTime?: string;
  isScheduled: boolean;
  severity?: Severity;
  requiresApproval: boolean;
  missedNotification?: MissedNotification;
};
type Submission = {
  _id: string;
  template?: { title?: string; category?: Category; items?: TemplateItem[] };
  submittedBy?: { name?: string; email?: string };
  completedItems: { itemOrder: number; label: string; completed: boolean; photoUrl?: string; note?: string }[];
  status: Status;
  submittedAt?: string;
  managerNote?: string;
};
type ComplianceSummary = {
  overall: { completionRate: number; overdueCount: number; missedCount: number; pendingCount: number };
  byChecklist: { checklistId: string; title: string; completionRate: number; overdueCount: number; totalAssigned: number }[];
  byStore: { storeId: string; storeName: string; completionRate: number }[];
};
type TemplateFormValues = {
  title: string;
  category: Category;
  isActive: boolean;
  items: TemplateItem[];
  assignedRoles: string[];
  storeTypes: string[];
  severity: Severity | '';
  requiresApproval: boolean;
  isScheduled: boolean;
  recurrenceType: RecurrenceType;
  recurrenceDayOfWeek: string;
  recurrenceDayOfMonth: string;
  recurrenceTime: string;
  dueTime: string;
  missedNotificationEnabled: boolean;
  missedGracePeriodMinutes: number;
  escalationSteps: EscalationStep[];
};

const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

const STORE_TYPES: { value: string; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'flagship', label: 'Flagship' },
  { value: 'kiosk', label: 'Kiosk' },
  { value: 'drive-thru', label: 'Drive-Thru' },
];

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
const severityColor: Record<Severity, string> = {
  low: '#888888',
  medium: '#4A9EFF',
  high: '#F59E0B',
  critical: '#D62B2B',
};
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyTemplate: TemplateFormValues = {
  title: '',
  category: 'opening',
  isActive: true,
  items: [],
  assignedRoles: [],
  storeTypes: [],
  severity: 'medium',
  requiresApproval: false,
  isScheduled: false,
  recurrenceType: 'none',
  recurrenceDayOfWeek: '',
  recurrenceDayOfMonth: '',
  recurrenceTime: '',
  dueTime: '',
  missedNotificationEnabled: true,
  missedGracePeriodMinutes: 30,
  escalationSteps: [],
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
  const { values } = payload;
  const body = {
    title: values.title,
    category: values.category,
    isActive: values.isActive,
    items: values.items.map((item, index) => ({ ...item, order: index + 1 })),
    assignedRoles: values.assignedRoles,
    storeTypes: values.storeTypes,
    severity: values.severity || undefined,
    requiresApproval: values.requiresApproval,
    isScheduled: values.isScheduled,
    dueTime: values.dueTime || undefined,
    recurrence: {
      type: values.recurrenceType,
      dayOfWeek: values.recurrenceDayOfWeek !== '' ? Number(values.recurrenceDayOfWeek) : undefined,
      dayOfMonth: values.recurrenceDayOfMonth !== '' ? Number(values.recurrenceDayOfMonth) : undefined,
      time: values.recurrenceTime || undefined,
    },
    missedNotification: {
      enabled: values.missedNotificationEnabled,
      gracePeriodMinutes: values.missedGracePeriodMinutes,
      escalationSteps: values.escalationSteps,
    },
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

async function getComplianceSummary() {
  const response = await adminApiClient.get<ApiEnvelope<ComplianceSummary>>('/checklist-schedules/compliance');
  return response.data.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

function TemplateModal({ isOpen, onClose, template }: { isOpen: boolean; onClose: () => void; template: Template | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<TemplateFormValues>({ defaultValues: emptyTemplate });
  const items = useFieldArray({ control, name: 'items' });
  const escalationSteps = useFieldArray({ control, name: 'escalationSteps' });
  const isScheduled = watch('isScheduled');
  const recurrenceType = watch('recurrenceType');
  const assignedRoles = watch('assignedRoles');
  const storeTypes = watch('storeTypes');
  const missedEnabled = watch('missedNotificationEnabled');

  useEffect(() => {
    if (isOpen) {
      reset(template ? {
        title: template.title,
        category: template.category,
        isActive: template.isActive,
        items: template.items.map((item, index) => ({ ...item, order: index + 1 })),
        assignedRoles: template.assignedRoles ?? [],
        storeTypes: template.storeTypes ?? [],
        severity: template.severity ?? 'medium',
        requiresApproval: template.requiresApproval ?? false,
        isScheduled: template.isScheduled ?? false,
        recurrenceType: template.recurrence?.type ?? 'none',
        recurrenceDayOfWeek: template.recurrence?.dayOfWeek != null ? String(template.recurrence.dayOfWeek) : '',
        recurrenceDayOfMonth: template.recurrence?.dayOfMonth != null ? String(template.recurrence.dayOfMonth) : '',
        recurrenceTime: template.recurrence?.time ?? '',
        dueTime: template.dueTime ?? '',
        missedNotificationEnabled: template.missedNotification?.enabled ?? true,
        missedGracePeriodMinutes: template.missedNotification?.gracePeriodMinutes ?? 30,
        escalationSteps: template.missedNotification?.escalationSteps ?? [],
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

  function toggleRole(role: string) {
    const current = assignedRoles ?? [];
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setValue('assignedRoles', updated);
  }

  function toggleStoreType(value: string) {
    const current = storeTypes ?? [];
    const updated = current.includes(value) ? current.filter((t) => t !== value) : [...current, value];
    setValue('storeTypes', updated);
  }

  function toggleEscalationRole(stepIdx: number, role: string) {
    const current = escalationSteps.fields[stepIdx]?.notifyRoles ?? [];
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setValue(`escalationSteps.${stepIdx}.notifyRoles`, updated);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Template' : 'New Template'} size="xl">
      <form onSubmit={handleSubmit((values) => mutation.mutate({ id: template?._id, values }))} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
            <input {...register('title', { required: 'Title is required' })} className={fieldClass()} />
            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Category</label>
            <select {...register('category')} className={fieldClass()}>{categories.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}</select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Severity</label>
            <select {...register('severity')} className={fieldClass()}>
              <option value="">None</option>
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
                <option key={s} value={s} style={{ color: severityColor[s] }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 pt-6">
            <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('requiresApproval')} className="h-4 w-4 accent-[#D62B2B]" /> Requires Approval
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('isScheduled')} className="h-4 w-4 accent-[#D62B2B]" /> Is Scheduled
            </label>
          </div>
        </div>

        {isScheduled && (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">Scheduling</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#ccc]">Recurrence</label>
                <select {...register('recurrenceType')} className={fieldClass()}>
                  {(['none', 'daily', 'weekly', 'monthly', 'quarterly'] as RecurrenceType[]).map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#ccc]">Due Time</label>
                <input type="time" {...register('dueTime')} className={fieldClass()} />
              </div>
            </div>
            {recurrenceType === 'weekly' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#ccc]">Day of Week</label>
                <select {...register('recurrenceDayOfWeek')} className={fieldClass()}>
                  <option value="">Select day</option>
                  {weekDays.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            {recurrenceType === 'monthly' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#ccc]">Day of Month (1–31)</label>
                <input type="number" min={1} max={31} {...register('recurrenceDayOfMonth')} className={fieldClass()} />
              </div>
            )}
          </div>
        )}

        {/* Section 1 — Applies To Store Types */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Applies To Store Types</h3>
            <p className="text-xs text-[#666] mt-0.5">Leave all unchecked to apply to all store types.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STORE_TYPES.map((st) => {
              const selected = (storeTypes ?? []).includes(st.value);
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => toggleStoreType(st.value)}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${selected ? 'border-[#4A9EFF] bg-[#4A9EFF]/20 text-white' : 'border-[#333] text-[#777] hover:border-[#555]'}`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2 — Missed Checklist Alerts */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#151515] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Missed Checklist Alerts</h3>
            <label className="flex items-center gap-2 text-sm text-[#ccc]">
              <input type="checkbox" {...register('missedNotificationEnabled')} className="h-4 w-4 accent-[#D62B2B]" />
              Enable
            </label>
          </div>

          {missedEnabled && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#ccc]">Grace Period (minutes after due time)</label>
                <input
                  type="number"
                  min={0}
                  {...register('missedGracePeriodMinutes', { valueAsNumber: true })}
                  className={fieldClass()}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#ccc] uppercase tracking-wide">Escalation Steps</p>
                  <button
                    type="button"
                    onClick={() => escalationSteps.append({ delayMinutes: 0, notifyRoles: [], message: '' })}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                  >
                    <Plus size={12} /> Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {escalationSteps.fields.map((step, idx) => (
                    <div key={step.id} className="rounded-lg border border-[#333] bg-[#111] p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#888]">Step {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => escalationSteps.remove(idx)}
                          className="text-[#555] hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-[#666]">Delay (minutes after grace period)</label>
                        <input
                          type="number"
                          min={0}
                          {...register(`escalationSteps.${idx}.delayMinutes`, { valueAsNumber: true })}
                          className={fieldClass()}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-[#666]">Notify Roles</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_ROLES.map((role) => {
                            const sel = (escalationSteps.fields[idx]?.notifyRoles ?? []).includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleEscalationRole(idx, role)}
                                className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${sel ? 'border-[#D62B2B] bg-[#D62B2B]/20 text-white' : 'border-[#333] text-[#666] hover:border-[#555]'}`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-[#666]">Custom Message (optional)</label>
                        <input
                          {...register(`escalationSteps.${idx}.message`)}
                          placeholder="Leave blank for default message"
                          className={fieldClass()}
                        />
                      </div>
                    </div>
                  ))}

                  {escalationSteps.fields.length === 0 && (
                    <p className="text-xs text-[#555] text-center py-2">No escalation steps yet. Click "Add Step" to add one.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#ccc]">Assigned Roles</label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const selected = (assignedRoles ?? []).includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${selected ? 'border-[#D62B2B] bg-[#D62B2B]/20 text-white' : 'border-[#333] text-[#777] hover:border-[#555]'}`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

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
                <label className="flex items-center gap-1 text-xs text-[#ccc]"><input type="checkbox" {...register(`items.${index}.requiresPhoto`)} className="accent-[#D62B2B]" /> Photo</label>
                <label className="flex items-center gap-1 text-xs text-[#ccc]"><input type="checkbox" {...register(`items.${index}.requiresNote`)} className="accent-[#D62B2B]" /> Note</label>
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

function ComplianceTab() {
  const complianceQuery = useQuery({
    queryKey: ['checklist-compliance'],
    queryFn: getComplianceSummary,
  });

  if (complianceQuery.isLoading) {
    return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#242424]" />)}</div>;
  }

  if (complianceQuery.isError) {
    return <p className="text-sm text-red-300">{getErrorMessage(complianceQuery.error)}</p>;
  }

  const data = complianceQuery.data;
  if (!data) return null;

  const storeColor = (rate: number) => rate >= 80 ? '#4ADE80' : rate >= 50 ? '#F59E0B' : '#D62B2B';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Completion Rate', value: `${data.overall.completionRate}%`, color: '#4ADE80' },
          { label: 'Overdue', value: data.overall.overdueCount, color: '#F59E0B' },
          { label: 'Missed', value: data.overall.missedCount, color: '#D62B2B' },
          { label: 'Pending', value: data.overall.pendingCount, color: '#4A9EFF' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <p className="text-xs font-medium uppercase text-[#666]">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="border-b border-[#2A2A2A] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">By Checklist</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-[#666]">
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-4 py-3 font-medium">Checklist</th>
                <th className="px-4 py-3 font-medium">Completion</th>
                <th className="px-4 py-3 font-medium">Overdue</th>
                <th className="px-4 py-3 font-medium">Total Assigned</th>
              </tr>
            </thead>
            <tbody>
              {data.byChecklist.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#777]">No data yet</td></tr>
              ) : data.byChecklist.map((row, index) => (
                <tr key={row.checklistId} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                  <td className="px-4 py-3 font-medium text-white">{row.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-[#333]">
                        <div className="h-full rounded-full bg-[#4ADE80]" style={{ width: `${row.completionRate}%` }} />
                      </div>
                      <span className="text-xs text-[#bbb]">{row.completionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#F59E0B]">{row.overdueCount}</td>
                  <td className="px-4 py-3 text-[#bbb]">{row.totalAssigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.byStore.length > 0 && (
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="border-b border-[#2A2A2A] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">By Store</h2>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            {data.byStore.map((store) => (
              <div key={store.storeId} className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-medium text-white">{store.storeName}</p>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-[#333]">
                    <div className="h-full rounded-full" style={{ width: `${store.completionRate}%`, backgroundColor: storeColor(store.completionRate) }} />
                  </div>
                  <span className="w-10 text-right text-xs font-medium" style={{ color: storeColor(store.completionRate) }}>{store.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
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
  const [tab, setTab] = useState<'templates' | 'submissions' | 'compliance'>('templates');
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
    mutationFn: (template: Template) => saveTemplate({
      id: template._id,
      values: {
        title: template.title, category: template.category, items: template.items,
        isActive: !template.isActive, assignedRoles: template.assignedRoles ?? [],
        storeTypes: template.storeTypes ?? [],
        severity: template.severity ?? 'medium', requiresApproval: template.requiresApproval ?? false,
        isScheduled: template.isScheduled ?? false,
        recurrenceType: template.recurrence?.type ?? 'none',
        recurrenceDayOfWeek: String(template.recurrence?.dayOfWeek ?? ''),
        recurrenceDayOfMonth: String(template.recurrence?.dayOfMonth ?? ''),
        recurrenceTime: template.recurrence?.time ?? '', dueTime: template.dueTime ?? '',
        missedNotificationEnabled: template.missedNotification?.enabled ?? true,
        missedGracePeriodMinutes: template.missedNotification?.gracePeriodMinutes ?? 30,
        escalationSteps: template.missedNotification?.escalationSteps ?? [],
      },
    }),
    onSuccess: (response) => {
      toast.success(response.message || 'Template updated');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const tabs: { key: 'templates' | 'submissions' | 'compliance'; label: string }[] = [
    { key: 'templates', label: 'Templates' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'compliance', label: 'Compliance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Checklists</h1>
          <p className="mt-1 text-sm text-[#777]">Manage operational checklist templates, submissions, and compliance.</p>
        </div>
        {tab === 'templates' && (
          <button type="button" onClick={() => { setEditingTemplate(null); setTemplateModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
            <Plus size={16} /> New Template
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#2A2A2A]">
        {tabs.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === item.key ? 'border-[#D62B2B] text-white' : 'border-transparent text-[#777] hover:text-white'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'compliance' && <ComplianceTab />}

      {tab === 'templates' && (
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templatesQuery.isLoading ? <SkeletonRows columns={7} /> : (templatesQuery.data ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#777]"><ClipboardList className="mx-auto mb-3 text-[#555]" />No templates found</td></tr>
                ) : (templatesQuery.data ?? []).map((template, index) => (
                  <tr key={template._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">{template.title}</td>
                    <td className="px-4 py-3 text-[#bbb]">{labelFor(template.category)}</td>
                    <td className="px-4 py-3">
                      {template.severity ? (
                        <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ color: severityColor[template.severity], backgroundColor: `${severityColor[template.severity]}22` }}>
                          {template.severity}
                        </span>
                      ) : <span className="text-[#555]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#bbb]">{template.items.length}</td>
                    <td className="px-4 py-3"><Badge variant={template.isScheduled ? 'info' : 'default'}>{template.isScheduled ? 'Yes' : 'No'}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={template.isActive ? 'success' : 'default'}>{template.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setEditingTemplate(template); setTemplateModalOpen(true); }} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Edit size={13} /> Edit</button>
                        <button type="button" onClick={() => toggleTemplateMutation.mutate(template)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><RefreshCw size={13} /> Toggle</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'submissions' && (
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
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setReviewSubmissionId(submission._id)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Eye size={13} /> Review</button>
                    </td>
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
