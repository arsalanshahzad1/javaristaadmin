import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Image, Link, Calendar, Tag, Lock, FileText, Video, AlertCircle, ChevronLeft } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import { TagInput } from '../../components/ui/TagInput';

type ContentType =
  | 'article' | 'video' | 'event' | 'sourcing_story'
  | 'financial_report' | 'construction_update' | 'ceo_update'
  | 'governance_update' | 'dividend_update' | 'expansion_update';

type AccessLevel = 'community' | 'shareholder' | 'major_investor' | 'board' | 'admin';

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
  accessLevel: AccessLevel;
  isPinned: boolean;
  featuredImage?: string;
  featuredImagePublicId?: string;
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
  accessLevel: AccessLevel;
  isPinned: boolean;
};

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: string }[] = [
  { value: 'article', label: 'Article', icon: '📄' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'event', label: 'Event', icon: '📅' },
  { value: 'sourcing_story', label: 'Sourcing Story', icon: '🔍' },
  { value: 'financial_report', label: 'Financial Report', icon: '📊' },
  { value: 'construction_update', label: 'Construction Update', icon: '🏗️' },
  { value: 'ceo_update', label: 'CEO Update', icon: '👔' },
  { value: 'governance_update', label: 'Governance Update', icon: '⚖️' },
  { value: 'dividend_update', label: 'Dividend Update', icon: '💰' },
  { value: 'expansion_update', label: 'Expansion Update', icon: '🚀' },
];

const ACCESS_LEVEL_OPTIONS: { value: AccessLevel; label: string; color: string }[] = [
  { value: 'community', label: 'Community', color: 'text-green-400' },
  { value: 'shareholder', label: 'Shareholder', color: 'text-blue-400' },
  { value: 'major_investor', label: 'Major Investor', color: 'text-purple-400' },
  { value: 'board', label: 'Board', color: 'text-amber-400' },
  { value: 'admin', label: 'Admin Only', color: 'text-red-400' },
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
  accessLevel: 'shareholder',
  isPinned: false,
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
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
  const r = await adminApiClient.get<ApiEnvelope<ExclusiveContent>>(`/investor/content/${slug}`);
  return r.data.data;
}

async function saveContent(payload: {
  originalSlug?: string;
  values: FormValues;
  featuredImage?: string | null;
  featuredImagePublicId?: string | null;
}) {
  const { values, originalSlug, featuredImage, featuredImagePublicId } = payload;
  const body = {
    title: values.title,
    slug: values.slug,
    contentType: values.contentType,
    tags: values.tags,
    publishedAt: values.publishedAt || undefined,
    videoUrl: values.videoUrl || undefined,
    mediaUrls: values.mediaUrls.map((i) => i.value.trim()).filter(Boolean),
    body: values.body,
    isActive: values.isActive,
    accessLevel: values.accessLevel,
    isPinned: values.isPinned,
    featuredImage: featuredImage || undefined,
    featuredImagePublicId: featuredImagePublicId || undefined,
  };
  const r = originalSlug
    ? await adminApiClient.put<ApiEnvelope<ExclusiveContent>>(`/investor/content/${originalSlug}`, body)
    : await adminApiClient.post<ApiEnvelope<ExclusiveContent>>('/investor/content', body);
  return r.data;
}

async function uploadFeaturedImage(file: File) {
  const fd = new FormData();
  fd.append('photo', file);
  const r = await adminApiClient.post<{
    success: boolean;
    data: { url: string; publicId: string };
  }>('/upload/recipe-photo', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data.data;
}

function fieldClass(error?: boolean) {
  return `w-full rounded-lg border ${error ? 'border-red-500/50 bg-red-500/5' : 'border-[#333] bg-[#111]'} px-3 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30 hover:border-[#444]`;
}

export function InvestorContentFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugEdited, setSlugEdited] = useState(Boolean(slug));
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [featuredImagePublicId, setFeaturedImagePublicId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const contentQuery = useQuery({
    queryKey: ['investor-content-item', slug],
    queryFn: () => fetchContent(slug!),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, reset, setValue, formState: { errors, isDirty } } =
    useForm<FormValues>({ defaultValues: emptyForm });

  const mediaFields = useFieldArray({ control, name: 'mediaUrls' });
  const body = useWatch({ control, name: 'body' });
  const tags = useWatch({ control, name: 'tags' });
  const contentType = useWatch({ control, name: 'contentType' });
  const accessLevel = useWatch({ control, name: 'accessLevel' });
  const isActive = useWatch({ control, name: 'isActive' });

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
        accessLevel: data.accessLevel ?? 'shareholder',
        isPinned: data.isPinned ?? false,
      });
      if (data.featuredImage) setFeaturedImage(data.featuredImage);
      if (data.featuredImagePublicId) setFeaturedImagePublicId(data.featuredImagePublicId);
    }
  }, [contentQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: saveContent,
    onSuccess: (r) => {
      toast.success(r.message || 'Content saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['investor-content'] });
      navigate('/investor-content');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!slugEdited) setValue('slug', toSlug(event.target.value));
  }

  async function handleFeaturedImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await uploadFeaturedImage(file);
      setFeaturedImage(result.url);
      setFeaturedImagePublicId(result.publicId);
      toast.success('Featured image uploaded successfully!');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  function onSubmit(values: FormValues) {
    saveMutation.mutate({
      originalSlug: slug,
      values,
      featuredImage,
      featuredImagePublicId,
    });
  }

  const getAccessLevelColor = (level: AccessLevel) => {
    return ACCESS_LEVEL_OPTIONS.find(opt => opt.value === level)?.color || 'text-gray-400';
  };

  if (contentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#242424]" />
        <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/investor-content')}
            className="mb-2 flex items-center gap-2 text-sm text-[#777] transition-colors hover:text-white"
          >
            <ChevronLeft size={16} />
            Back to Content
          </button>
          <h1 className="text-3xl font-bold text-white">
            {isEdit ? 'Edit Content' : 'Create New Content'}
          </h1>
          <p className="mt-1 text-sm text-[#777]">
            {isEdit ? 'Update your existing investor content.' : 'Create and publish exclusive content for investors.'}
          </p>
        </div>
        {isEdit && contentQuery.data && (
          <div className="flex items-center gap-2 rounded-lg bg-[#242424] px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${contentQuery.data.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span className="text-xs text-[#999]">
              {contentQuery.data.isActive ? 'Published' : 'Draft'}
            </span>
          </div>
        )}
      </div>

      {contentQuery.isError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-300">{getErrorMessage(contentQuery.error)}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Form Card */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="space-y-6">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('title', { required: 'Title is required', onChange: handleTitleChange })}
                  placeholder="Enter content title..."
                  className={fieldClass(!!errors.title)}
                />
                {errors.title && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle size={12} />
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
                  Slug <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">
                    /investor/
                  </span>
                  <input
                    {...register('slug', { required: 'Slug is required', onChange: () => setSlugEdited(true) })}
                    placeholder="content-slug"
                    className={`${fieldClass(!!errors.slug)} pl-20`}
                  />
                </div>
                {errors.slug && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle size={12} />
                    {errors.slug.message}
                  </p>
                )}
              </div>
            </div>

            {/* Content Type & Access Level */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
                  Content Type <span className="text-red-400">*</span>
                </label>
                <select {...register('contentType')} className={fieldClass()}>
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
                  Access Level <span className="text-red-400">*</span>
                </label>
                <select {...register('accessLevel')} className={fieldClass()}>
                  {ACCESS_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className={`mt-1.5 text-xs ${getAccessLevelColor(accessLevel)}`}>
                  <Lock size={12} className="inline mr-1" />
                  Content visible to: {ACCESS_LEVEL_OPTIONS.find(opt => opt.value === accessLevel)?.label}
                </p>
              </div>
            </div>

            {/* Published At & Status */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
                  <Calendar size={14} className="inline mr-1.5" />
                  Publish Date
                </label>
                <input type="datetime-local" {...register('publishedAt')} className={fieldClass()} />
              </div>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#ccc] transition-colors hover:text-white">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    className="h-4 w-4 rounded border-[#333] bg-[#111] text-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30 focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
                  />
                  <span className={`flex items-center gap-1.5 ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                    {isActive ? 'Published' : 'Draft'}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#ccc] transition-colors hover:text-white">
                  <input
                    type="checkbox"
                    {...register('isPinned')}
                    className="h-4 w-4 rounded border-[#333] bg-[#111] text-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30 focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
                  />
                  Pin to Top
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Video URL */}
        {(contentType === 'video' || contentType === 'ceo_update') && (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
              <Video size={14} className="inline mr-1.5" />
              Video URL
            </label>
            <input
              {...register('videoUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
              className={fieldClass()}
            />
          </div>
        )}

     {/* Featured Image */}
<div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
  <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
    <Image size={14} className="inline mr-1.5" />
    Featured Image
  </label>
  <div className="space-y-3">
    {featuredImage ? (
      <div className="relative inline-block">
        <img
          src={featuredImage}
          alt="Featured"
          className="h-40 w-60 rounded-lg object-cover border border-[#2A2A2A]"
        />
        <button
          type="button"
          onClick={() => { setFeaturedImage(null); setFeaturedImagePublicId(null); }}
          className="absolute -right-2 -top-2 rounded-full bg-[#D62B2B] p-1 text-white shadow-lg transition-transform hover:scale-110"
        >
          <X size={14} />
        </button>
      </div>
    ) : (
      <>
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${isDragging ? 'border-[#D62B2B] bg-[#D62B2B]/5' : 'border-[#333]'} p-8 transition-all hover:border-[#444] hover:bg-[#242424]`}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              const input = document.getElementById('featured-image-input') as HTMLInputElement;
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
          onClick={() => {
            const input = document.getElementById('featured-image-input') as HTMLInputElement;
            if (input) input.click();
          }}
        >
          <Image size={32} className="mb-2 text-[#555]" />
          <p className="text-sm text-[#777]">Drop an image here or click to browse</p>
          <p className="text-xs text-[#555]">PNG, JPG, WebP up to 5MB</p>
        </div>
        <input
          id="featured-image-input"
          type="file"
          accept="image/*"
          onChange={handleFeaturedImageChange}
          disabled={uploadingImage}
          className="hidden"
        />
      </>
    )}
    {uploadingImage && (
      <div className="flex items-center gap-2 text-xs text-[#777]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D62B2B] border-t-transparent" />
        Uploading image...
      </div>
    )}
  </div>
</div>

        {/* Tags */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
            <Tag size={14} className="inline mr-1.5" />
            Tags
          </label>
          <TagInput
            value={tags ?? []}
            onChange={(t) => setValue('tags', t, { shouldDirty: true })}
            placeholder="Add tags..."
          />
          <p className="mt-1.5 text-xs text-[#555]">Press Enter to add a tag</p>
        </div>

        {/* Media URLs */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
            <Link size={14} className="inline mr-1.5" />
            Media URLs
          </label>
          <div className="space-y-3">
            {mediaFields.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  {...register(`mediaUrls.${index}.value`)}
                  placeholder="https://example.com/media.jpg"
                  className={fieldClass()}
                />
                {mediaFields.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => mediaFields.remove(index)}
                    className="rounded-lg border border-[#333] px-3 text-[#ddd] transition-colors hover:border-red-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => mediaFields.append({ value: '' })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] transition-colors hover:border-[#444] hover:bg-[#242424]"
            >
              <Plus size={14} /> Add Media URL
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <label className="mb-1.5 block text-sm font-medium text-[#ccc]">
            <FileText size={14} className="inline mr-1.5" />
            Content Body
          </label>
          <MarkdownEditor
            value={body ?? ''}
            onChange={(v) => setValue('body', v, { shouldDirty: true })}
            rows={18}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/investor-content')}
            className="order-2 rounded-lg border border-[#333] px-6 py-2.5 text-sm text-[#ddd] transition-all hover:border-[#444] hover:bg-[#242424] sm:order-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending || uploadingImage || !isDirty}
            className="order-1 rounded-lg bg-[#D62B2B] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#B92323] hover:shadow-lg hover:shadow-[#D62B2B]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none sm:order-2"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              'Save Content'
            )}
          </button>
        </div>
      </form>
    </div>

  );
}
