import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import { TagInput } from '../../components/ui/TagInput';

type Category = 'recipe' | 'procedure' | 'checklist_template' | 'troubleshooting' | 'standard' | 'training';
type Role = 'community' | 'investor' | 'employee';
type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type PlaybookSummary = { _id: string; title: string; slug: string; category: Category; tags?: string[] };
type Playbook = PlaybookSummary & {
  body: string;
  mediaUrls: string[];
  requiredRole: Role;
  isActive: boolean;
  relatedPlaybooks?: PlaybookSummary[];
};
type PlaybookFormValues = {
  title: string;
  slug: string;
  category: Category;
  requiredRole: Role;
  tags: string[];
  mediaUrls: { value: string }[];
  body: string;
  isActive: boolean;
  relatedPlaybooks: string[];
};

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
  mediaUrls: [{ value: '' }],
  body: '',
  isActive: true,
  relatedPlaybooks: [],
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
    mediaUrls: payload.values.mediaUrls.map((item) => item.value.trim()).filter(Boolean),
    body: payload.values.body,
    isActive: payload.values.isActive,
    relatedPlaybooks: payload.values.relatedPlaybooks,
  };
  const response = payload.originalSlug
    ? await adminApiClient.put<ApiEnvelope<Playbook>>(`/playbooks/${payload.originalSlug}`, body)
    : await adminApiClient.post<ApiEnvelope<Playbook>>('/playbooks', body);
  return response.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

export function PlaybookFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSlugEdited, setSlugEdited] = useState(Boolean(slug));
  const [relatedSearch, setRelatedSearch] = useState('');

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
  const mediaFields = useFieldArray({ control, name: 'mediaUrls' });
  const body = useWatch({ control, name: 'body' });
  const tags = useWatch({ control, name: 'tags' });
  const relatedPlaybooks = useWatch({ control, name: 'relatedPlaybooks' });

  useEffect(() => {
    if (playbookQuery.data) {
      reset({
        title: playbookQuery.data.title,
        slug: playbookQuery.data.slug,
        category: playbookQuery.data.category,
        requiredRole: playbookQuery.data.requiredRole,
        tags: playbookQuery.data.tags ?? [],
        mediaUrls: playbookQuery.data.mediaUrls.length > 0 ? playbookQuery.data.mediaUrls.map((value) => ({ value })) : [{ value: '' }],
        body: playbookQuery.data.body ?? '',
        isActive: playbookQuery.data.isActive,
        relatedPlaybooks: playbookQuery.data.relatedPlaybooks?.map((item) => item._id) ?? [],
      });
    }
  }, [playbookQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: savePlaybook,
    onSuccess: (response) => {
      toast.success(response.message || 'Playbook saved');
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      navigate('/playbooks');
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

  if (playbookQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />;
  }

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
            <TagInput
              value={tags ?? []}
              onChange={(nextTags) => setValue('tags', nextTags, { shouldDirty: true })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Media URLs</label>
            <div className="space-y-2">
              {mediaFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input {...register(`mediaUrls.${index}.value`)} className={fieldClass()} />
                  <button type="button" onClick={() => mediaFields.remove(index)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]"><X size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => mediaFields.append({ value: '' })} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]"><Plus size={14} /> Add URL</button>
            </div>
          </div>

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

          <MarkdownEditor
            value={body ?? ''}
            onChange={(v) => setValue('body', v, { shouldDirty: true })}
            label="Body"
            rows={14}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
            Active
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/playbooks')} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">{saveMutation.isPending ? 'Saving...' : 'Save Playbook'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
