import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Image, Plus, Search, Trash2, Video, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import { TagInput } from '../../components/ui/TagInput';
import { FileUploadButton } from '../../components/ui/FileUploadButton';

type Category = 'recipe' | 'procedure' | 'checklist_template' | 'troubleshooting' | 'standard' | 'training';
type Role = 'community' | 'investor' | 'employee';
type PlaybookStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
type AccessLevel = 'barista' | 'shift_supervisor' | 'store_manager' | 'area_manager' | 'regional_manager' | 'ceo' | 'owner';
type AttachmentType = 'image' | 'pdf' | 'video';
type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type PlaybookAttachment = { _id: string; type: AttachmentType; url: string; title: string; description?: string; order: number };
type PlaybookSummary = { _id: string; title: string; slug: string; category: Category; tags?: string[] };
type Playbook = PlaybookSummary & {
  body: string;
  attachments: PlaybookAttachment[];
  requiredRole: Role;
  isActive: boolean;
  relatedPlaybooks?: PlaybookSummary[];
  version?: string;
  status?: PlaybookStatus;
  assignedRoles?: string[];
  accessLevel?: AccessLevel;
  complianceTracking?: { isRequired: boolean; acknowledgeRequired: boolean; requiredByDate?: string };
  changeLog?: Array<{ version: string; changedBy: { name?: string } | string; changedAt: string; summary: string }>;
};
type PlaybookFormValues = {
  title: string;
  slug: string;
  category: Category;
  requiredRole: Role;
  tags: string[];
  body: string;
  isActive: boolean;
  relatedPlaybooks: string[];
  assignedRoles: string[];
  accessLevel: string;
  complianceIsRequired: boolean;
  complianceAcknowledgeRequired: boolean;
  complianceRequiredByDate: string;
};

const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

const categoryOptions: { value: Category; label: string }[] = [
  { value: 'recipe', label: 'Recipe' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'checklist_template', label: 'Checklist Template' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'standard', label: 'Standard' },
  { value: 'training', label: 'Training' },
];
const emptyForm: PlaybookFormValues = {
  title: '',
  slug: '',
  category: 'procedure',
  requiredRole: 'employee',
  tags: [],
  body: '',
  isActive: true,
  relatedPlaybooks: [],
  assignedRoles: [],
  accessLevel: '',
  complianceIsRequired: false,
  complianceAcknowledgeRequired: false,
  complianceRequiredByDate: '',
};

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

async function getPlaybook(slug: string) {
  const response = await adminApiClient.get<ApiEnvelope<Playbook>>(`/playbooks/${slug}`);
  return response.data.data;
}

async function getPlaybooks(search: string) {
  const response = await adminApiClient.get<ApiEnvelope<PlaybookSummary[]>>('/playbooks', {
    params: { search: search || undefined, includeInactive: 'true', limit: 20 },
  });
  return response.data.data;
}

async function savePlaybook(payload: { originalSlug?: string; values: PlaybookFormValues }) {
  const body = {
    title: payload.values.title,
    slug: payload.values.slug,
    category: payload.values.category,
    requiredRole: payload.values.requiredRole,
    tags: payload.values.tags,
    body: payload.values.body,
    isActive: payload.values.isActive,
    relatedPlaybooks: payload.values.relatedPlaybooks,
    assignedRoles: payload.values.assignedRoles,
    accessLevel: payload.values.accessLevel || undefined,
    complianceTracking: {
      isRequired: payload.values.complianceIsRequired,
      acknowledgeRequired: payload.values.complianceAcknowledgeRequired,
      requiredByDate: payload.values.complianceRequiredByDate || undefined,
    },
  };
  const response = payload.originalSlug
    ? await adminApiClient.put<ApiEnvelope<Playbook>>(`/playbooks/${payload.originalSlug}`, body)
    : await adminApiClient.post<ApiEnvelope<Playbook>>('/playbooks', body);
  return response.data;
}

async function deleteAttachment(playbookId: string, attachmentId: string) {
  const response = await adminApiClient.delete<ApiEnvelope<PlaybookAttachment[]>>(`/playbooks/${playbookId}/attachments/${attachmentId}`);
  return response.data.data;
}

async function addVideoUrl(playbookId: string, payload: { url: string; title: string; description?: string }) {
  const response = await adminApiClient.post<ApiEnvelope<PlaybookAttachment[]>>(`/playbooks/${playbookId}/video`, payload);
  return response.data.data;
}

async function addAttachment(playbookId: string, url: string, publicId: string, type: AttachmentType, title: string) {
  const response = await adminApiClient.post<ApiEnvelope<PlaybookAttachment[]>>(`/playbooks/${playbookId}/attachments`, { url, publicId, type, title });
  return response.data.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

function SectionHeading({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-[#ccc] mb-3">{title}</h3>;
}

export function PlaybookFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSlugEdited, setSlugEdited] = useState(Boolean(slug));
  const [relatedSearch, setRelatedSearch] = useState('');
  const [attachments, setAttachments] = useState<PlaybookAttachment[]>([]);
  const [savedPlaybookId, setSavedPlaybookId] = useState<string | null>(null);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoSubmitting, setVideoSubmitting] = useState(false);

  const playbookQuery = useQuery({
    queryKey: ['playbook', slug],
    queryFn: () => getPlaybook(slug ?? ''),
    enabled: isEdit,
  });
  const relatedQuery = useQuery({
    queryKey: ['playbooks-related', relatedSearch],
    queryFn: () => getPlaybooks(relatedSearch),
  });

  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<PlaybookFormValues>({
    defaultValues: emptyForm,
  });
  const body = useWatch({ control, name: 'body' });
  const tags = useWatch({ control, name: 'tags' });
  const relatedPlaybooks = useWatch({ control, name: 'relatedPlaybooks' });
  const assignedRoles = useWatch({ control, name: 'assignedRoles' });
  const complianceIsRequired = useWatch({ control, name: 'complianceIsRequired' });

  useEffect(() => {
    if (playbookQuery.data) {
      const d = playbookQuery.data;
      reset({
        title: d.title,
        slug: d.slug,
        category: d.category,
        requiredRole: d.requiredRole,
        tags: d.tags ?? [],
        body: d.body ?? '',
        isActive: d.isActive,
        relatedPlaybooks: d.relatedPlaybooks?.map((item) => item._id) ?? [],
        assignedRoles: d.assignedRoles ?? [],
        accessLevel: d.accessLevel ?? '',
        complianceIsRequired: d.complianceTracking?.isRequired ?? false,
        complianceAcknowledgeRequired: d.complianceTracking?.acknowledgeRequired ?? false,
        complianceRequiredByDate: d.complianceTracking?.requiredByDate
          ? new Date(d.complianceTracking.requiredByDate).toISOString().split('T')[0]
          : '',
      });
      setAttachments(d.attachments ?? []);
      setSavedPlaybookId(d._id);
    }
  }, [playbookQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: savePlaybook,
    onSuccess: (response) => {
      toast.success(response.message || 'Playbook saved');
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      if (!isEdit && response.data) {
        navigate(`/playbooks/${response.data.slug}/edit`);
      } else {
        navigate('/playbooks');
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ attachmentId }: { attachmentId: string }) =>
      deleteAttachment(savedPlaybookId!, attachmentId),
    onSuccess: (updated) => {
      setAttachments(updated);
      toast.success('Attachment deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addVideoMutation = useMutation({
    mutationFn: (payload: { url: string; title: string; description?: string }) =>
      addVideoUrl(savedPlaybookId!, payload),
    onSuccess: (updated) => {
      setAttachments(updated);
      setShowVideoForm(false);
      setVideoUrl('');
      setVideoTitle('');
      setVideoDesc('');
      toast.success('Video added');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isSlugEdited) setValue('slug', toSlug(event.target.value));
  }

  function toggleRelated(id: string) {
    const current = getValues('relatedPlaybooks');
    setValue('relatedPlaybooks', current.includes(id) ? current.filter((item) => item !== id) : [...current, id], { shouldDirty: true });
  }

  async function handleFileUploaded(url: string, publicId: string, file: File) {
    if (!savedPlaybookId) return;
    const type: AttachmentType = file.type === 'application/pdf' ? 'pdf' : 'image';
    try {
      const updated = await addAttachment(savedPlaybookId, url, publicId, type, file.name);
      setAttachments(updated);
      toast.success('Attachment added');
    } catch {
      toast.error('Failed to save attachment');
    }
  }

  async function handleVideoSubmit() {
    if (!videoUrl.trim() || !videoTitle.trim()) { toast.error('URL and title are required'); return; }
    setVideoSubmitting(true);
    try {
      await addVideoMutation.mutateAsync({ url: videoUrl.trim(), title: videoTitle.trim(), description: videoDesc.trim() || undefined });
    } finally {
      setVideoSubmitting(false);
    }
  }

  if (playbookQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />;
  }

  const imageAttachments = attachments.filter((a) => a.type === 'image');
  const pdfAttachments = attachments.filter((a) => a.type === 'pdf');
  const videoAttachments = attachments.filter((a) => a.type === 'video');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Playbook' : 'New Playbook'}</h1>
        <p className="mt-1 text-sm text-[#777]">Create reusable markdown playbooks for JavaRista teams.</p>
      </div>

      {playbookQuery.isError ? (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <p className="text-red-300">{getErrorMessage(playbookQuery.error)}</p>
          <button type="button" onClick={() => playbookQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/20">Try again</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((values) => saveMutation.mutate({ originalSlug: slug, values }))} className="space-y-5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          {/* Basic fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
              <input {...register('title', { required: 'Title is required', onChange: handleTitleChange })} className={fieldClass()} />
              {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Slug</label>
              <input {...register('slug', { required: 'Slug is required', onChange: () => setSlugEdited(true) })} className={fieldClass()} />
              {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Category</label>
              <select {...register('category')} className={fieldClass()}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Required Role</label>
              <select {...register('requiredRole')} className={fieldClass()}>
                <option value="community">Community</option>
                <option value="investor">Investor</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Tags</label>
            <TagInput value={tags ?? []} onChange={(nextTags) => setValue('tags', nextTags, { shouldDirty: true })} />
          </div>

          <MarkdownEditor value={body ?? ''} onChange={(v) => setValue('body', v, { shouldDirty: true })} label="Body" rows={14} />

          {/* Attachments & Media */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0E0E0E] p-4 space-y-4">
            <SectionHeading title="Attachments & Media" />

            {!savedPlaybookId && !isEdit && (
              <p className="text-xs text-[#666] italic">Save the playbook first to add attachments.</p>
            )}

            {(savedPlaybookId || isEdit) && (
              <>
                <div>
                  <FileUploadButton
                    endpoint="/upload/playbook-media"
                    accept="image/*,.pdf"
                    label="Upload Image or PDF"
                    disabled={!savedPlaybookId}
                    onUploaded={(url, publicId, file) => handleFileUploaded(url, publicId, file)}
                  />
                </div>

                {/* Image list */}
                {imageAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#888]">Images</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {imageAttachments.map((att) => (
                        <div key={att._id} className="group relative rounded-lg overflow-hidden border border-[#333]">
                          <img src={att.url} alt={att.title} className="h-24 w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-xs text-white truncate">{att.title}</span>
                            <button type="button" onClick={() => deleteAttachmentMutation.mutate({ attachmentId: att._id })} disabled={deleteAttachmentMutation.isPending} className="ml-1 shrink-0 text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF list */}
                {pdfAttachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#888]">PDFs</p>
                    {pdfAttachments.map((att) => (
                      <div key={att._id} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2">
                        <FileText size={16} className="shrink-0 text-[#D62B2B]" />
                        <span className="flex-1 text-sm text-[#ddd] truncate">{att.title}</span>
                        <button type="button" onClick={() => deleteAttachmentMutation.mutate({ attachmentId: att._id })} disabled={deleteAttachmentMutation.isPending} className="text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video list */}
                {videoAttachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#888]">Videos</p>
                    {videoAttachments.map((att) => (
                      <div key={att._id} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#151515] px-3 py-2">
                        <Video size={16} className="shrink-0 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#ddd] truncate">{att.title}</p>
                          <p className="text-xs text-[#555] truncate">{att.url}</p>
                        </div>
                        <button type="button" onClick={() => deleteAttachmentMutation.mutate({ attachmentId: att._id })} disabled={deleteAttachmentMutation.isPending} className="text-red-400 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add video URL */}
                {showVideoForm ? (
                  <div className="rounded-lg border border-[#333] bg-[#111] p-3 space-y-2">
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL (YouTube, Vimeo, or direct link)" className={fieldClass()} />
                    <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Title" className={fieldClass()} />
                    <input value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} placeholder="Description (optional)" className={fieldClass()} />
                    <div className="flex gap-2">
                      <button type="button" disabled={videoSubmitting} onClick={handleVideoSubmit} className="rounded-lg bg-[#D62B2B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B92323] disabled:opacity-50">
                        {videoSubmitting ? 'Adding…' : 'Add Video'}
                      </button>
                      <button type="button" onClick={() => setShowVideoForm(false)} className="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowVideoForm(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
                    <Video size={14} />
                    Add Video URL
                  </button>
                )}
              </>
            )}
          </div>

          {/* Related Playbooks */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Related Playbooks</label>
            <div className="rounded-lg border border-[#333] bg-[#111] p-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={15} />
                <input value={relatedSearch} onChange={(event) => setRelatedSearch(event.target.value)} placeholder="Search existing playbooks" className="w-full rounded-lg border border-[#333] bg-[#151515] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#D62B2B]" />
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {(relatedQuery.data ?? []).filter((item) => item.slug !== slug).map((item) => (
                  <label key={item._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[#ddd] hover:bg-[#242424]">
                    <input type="checkbox" checked={(relatedPlaybooks ?? []).includes(item._id)} onChange={() => toggleRelated(item._id)} className="accent-[#D62B2B]" />
                    <span>{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance Settings */}
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0E0E0E] p-4 space-y-3">
            <SectionHeading title="Compliance Settings" />
            <label className="flex items-center gap-3 text-sm text-[#ccc]">
              <input type="checkbox" {...register('complianceIsRequired')} className="h-4 w-4 accent-[#D62B2B]" />
              Require Reading
            </label>
            <label className="flex items-center gap-3 text-sm text-[#ccc]">
              <input type="checkbox" {...register('complianceAcknowledgeRequired')} className="h-4 w-4 accent-[#D62B2B]" />
              Require Acknowledgement
            </label>
            {complianceIsRequired && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#888]">Required By Date</label>
                <input type="date" {...register('complianceRequiredByDate')} className={fieldClass()} />
              </div>
            )}
          </div>

          {/* Version & Status (read-only) */}
          {isEdit && playbookQuery.data && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Version (read-only)</label>
                <div className="flex h-9 items-center rounded-lg border border-[#333] bg-[#0D0D0D] px-3 text-sm text-[#666]">v{playbookQuery.data.version ?? '1.0'}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Status (read-only)</label>
                <div className="flex h-9 items-center rounded-lg border border-[#333] bg-[#0D0D0D] px-3 text-sm text-[#666] capitalize">{playbookQuery.data.status ?? 'draft'}</div>
              </div>
            </div>
          )}

          {/* Assigned Roles */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#ccc]">Assigned Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    const current = assignedRoles ?? [];
                    setValue('assignedRoles', current.includes(role) ? current.filter((r) => r !== role) : [...current, role], { shouldDirty: true });
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${(assignedRoles ?? []).includes(role) ? 'bg-[#D62B2B]/20 text-[#D62B2B] ring-1 ring-[#D62B2B]/40' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                >
                  {role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Access Level */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Access Level</label>
            <select {...register('accessLevel')} className={fieldClass()}>
              <option value="">— None —</option>
              <option value="barista">Barista</option>
              <option value="shift_supervisor">Shift Supervisor</option>
              <option value="store_manager">Store Manager</option>
              <option value="area_manager">Area Manager</option>
              <option value="regional_manager">Regional Manager</option>
              <option value="ceo">CEO</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
            Active
          </label>

          {/* Change Log */}
          {isEdit && (playbookQuery.data?.changeLog ?? []).length > 0 && (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0E0E0E] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#ccc]">Change Log</h3>
              <div className="space-y-3">
                {(playbookQuery.data?.changeLog ?? []).map((entry, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="shrink-0 rounded bg-[#2A2A2A] px-1.5 py-0.5 text-xs text-[#aaa]">v{entry.version}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#ddd]">{entry.summary}</p>
                      <p className="mt-0.5 text-xs text-[#555]">
                        {typeof entry.changedBy === 'object' && entry.changedBy?.name ? entry.changedBy.name : 'Unknown'} · {new Date(entry.changedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/playbooks')} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">{saveMutation.isPending ? 'Saving...' : 'Save Playbook'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
