import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import { TagInput } from '../../components/ui/TagInput';

type ContentType = 'article' | 'video' | 'event' | 'sourcing_story';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type ExclusiveContent = {
  _id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  body?: string;
  videoUrl?: string;
  mediaUrls: string[];
  publishedAt?: string;
  tags: string[];
  isActive: boolean;
};

type FormValues = {
  title: string;
  slug: string;
  contentType: ContentType;
  tags: string[];
  publishedAt: string;
  videoUrl: string;
  mediaUrls: { value: string }[];
  body: string;
  isActive: boolean;
};

const contentTypeOptions: { value: ContentType; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'event', label: 'Event' },
  { value: 'sourcing_story', label: 'Sourcing Story' },
];

const emptyForm: FormValues = {
  title: '',
  slug: '',
  contentType: 'article',
  tags: [],
  publishedAt: '',
  videoUrl: '',
  mediaUrls: [{ value: '' }],
  body: '',
  isActive: true,
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function toDatetimeLocal(date?: string) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

async function fetchContent(slug: string) {
  const response = await adminApiClient.get<ApiEnvelope<ExclusiveContent>>(`/investor/content/${slug}`);
  return response.data.data;
}

async function saveContent(payload: { originalSlug?: string; values: FormValues }) {
  const { values, originalSlug } = payload;
  const body = {
    title: values.title,
    slug: values.slug,
    contentType: values.contentType,
    tags: values.tags,
    publishedAt: values.publishedAt || undefined,
    videoUrl: values.videoUrl || undefined,
    mediaUrls: values.mediaUrls.map((item) => item.value.trim()).filter(Boolean),
    body: values.body,
    isActive: values.isActive,
  };
  const response = originalSlug
    ? await adminApiClient.put<ApiEnvelope<ExclusiveContent>>(`/investor/content/${originalSlug}`, body)
    : await adminApiClient.post<ApiEnvelope<ExclusiveContent>>('/investor/content', body);
  return response.data;
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

export function InvestorContentFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugEdited, setSlugEdited] = useState(Boolean(slug));

  const contentQuery = useQuery({
    queryKey: ['investor-content-item', slug],
    queryFn: () => fetchContent(slug!),
    enabled: isEdit,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyForm });

  const mediaFields = useFieldArray({ control, name: 'mediaUrls' });
  const body = useWatch({ control, name: 'body' });
  const tags = useWatch({ control, name: 'tags' });
  const contentType = useWatch({ control, name: 'contentType' });

  useEffect(() => {
    if (contentQuery.data) {
      const data = contentQuery.data;
      reset({
        title: data.title,
        slug: data.slug,
        contentType: data.contentType,
        tags: data.tags ?? [],
        publishedAt: toDatetimeLocal(data.publishedAt),
        videoUrl: data.videoUrl ?? '',
        mediaUrls: data.mediaUrls.length > 0 ? data.mediaUrls.map((v) => ({ value: v })) : [{ value: '' }],
        body: data.body ?? '',
        isActive: data.isActive,
      });
    }
  }, [contentQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: saveContent,
    onSuccess: (response) => {
      toast.success(response.message || 'Content saved');
      queryClient.invalidateQueries({ queryKey: ['investor-content'] });
      navigate('/investor-content');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!slugEdited) setValue('slug', toSlug(event.target.value));
  }

  if (contentQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Content' : 'New Content'}</h1>
        <p className="mt-1 text-sm text-[#777]">Manage exclusive investor content.</p>
      </div>

      {contentQuery.isError ? (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <p className="text-red-300">{getErrorMessage(contentQuery.error)}</p>
          <button
            type="button"
            onClick={() => contentQuery.refetch()}
            className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/20"
          >
            Try again
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate({ originalSlug: slug, values }))}
          className="space-y-5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5"
        >
          {/* Title + Slug */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
              <input
                {...register('title', {
                  required: 'Title is required',
                  onChange: handleTitleChange,
                })}
                className={fieldClass()}
              />
              {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Slug</label>
              <input
                {...register('slug', {
                  required: 'Slug is required',
                  onChange: () => setSlugEdited(true),
                })}
                className={fieldClass()}
              />
              {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug.message}</p>}
            </div>
          </div>

          {/* Content Type + Published At */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Content Type</label>
              <select {...register('contentType')} className={fieldClass()}>
                {contentTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Published At</label>
              <input type="datetime-local" {...register('publishedAt')} className={fieldClass()} />
            </div>
          </div>

          {/* Video URL — only when contentType === 'video' */}
          {contentType === 'video' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Video URL</label>
              <input {...register('videoUrl')} placeholder="https://..." className={fieldClass()} />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Tags</label>
            <TagInput
              value={tags ?? []}
              onChange={(nextTags) => setValue('tags', nextTags, { shouldDirty: true })}
            />
          </div>

          {/* Media URLs */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Media URLs</label>
            <div className="space-y-2">
              {mediaFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input {...register(`mediaUrls.${index}.value`)} placeholder="https://..." className={fieldClass()} />
                  <button
                    type="button"
                    onClick={() => mediaFields.remove(index)}
                    className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => mediaFields.append({ value: '' })}
                className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]"
              >
                <Plus size={14} /> Add URL
              </button>
            </div>
          </div>

          {/* Body + Live Preview */}
          <MarkdownEditor
            value={body ?? ''}
            onChange={(v) => setValue('body', v, { shouldDirty: true })}
            label="Body (Markdown)"
            rows={16}
          />

          {/* Active toggle */}
          <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
            Active
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/investor-content')}
              className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
