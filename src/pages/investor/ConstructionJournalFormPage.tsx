import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type Store = { _id: string; name: string; storeNumber: string };

type Journal = {
  _id: string;
  storeId: string | Store;
  title: string;
  body: string;
  milestone?: string;
  progressPercent: number;
  videoUrl?: string;
  isPublished: boolean;
  photos: { url: string; publicId: string; caption?: string }[];
};

type FormValues = {
  storeId: string;
  title: string;
  milestone: string;
  progressPercent: number;
  videoUrl: string;
  isPublished: boolean;
};

const MILESTONES = ['Structural', 'Interior', 'Equipment', 'Soft Opening', 'Grand Opening', 'Other'];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

async function fetchStores() {
  const r = await adminApiClient.get<ApiEnvelope<Store[]>>('/stores', { params: { limit: 200 } });
  return r.data.data ?? [];
}

async function fetchJournal(id: string) {
  const r = await adminApiClient.get<ApiEnvelope<Journal>>(`/construction-journals/${id}`);
  return r.data.data;
}

async function saveJournal(payload: {
  id?: string;
  storeId: string;
  title: string;
  body: string;
  milestone?: string;
  progressPercent: number;
  videoUrl?: string;
  isPublished: boolean;
}) {
  const { id, ...body } = payload;
  const r = id
    ? await adminApiClient.put<ApiEnvelope<Journal>>(`/construction-journals/${id}`, body)
    : await adminApiClient.post<ApiEnvelope<Journal>>('/construction-journals', body);
  return r.data;
}

export function ConstructionJournalFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [savedId, setSavedId] = useState<string | null>(id ?? null);
  const [photos, setPhotos] = useState<Journal['photos']>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const storesQuery = useQuery({ queryKey: ['stores-list'], queryFn: fetchStores });
  const journalQuery = useQuery({
    queryKey: ['journal-item', id],
    queryFn: () => fetchJournal(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { storeId: '', title: '', milestone: '', progressPercent: 0, videoUrl: '', isPublished: false },
  });

  const progressPercent = useWatch({ control, name: 'progressPercent' });

  useEffect(() => {
    if (journalQuery.data) {
      const d = journalQuery.data;
      reset({
        storeId: typeof d.storeId === 'object' ? (d.storeId as Store)._id : d.storeId,
        title: d.title,
        milestone: d.milestone ?? '',
        progressPercent: d.progressPercent,
        videoUrl: d.videoUrl ?? '',
        isPublished: d.isPublished,
      });
      setBody(d.body);
      setPhotos(d.photos);
    }
  }, [journalQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: saveJournal,
    onSuccess: (r) => {
      toast.success(r.message || 'Saved');
      queryClient.invalidateQueries({ queryKey: ['construction-journals'] });
      if (!isEdit && r.data?._id) setSavedId(r.data._id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !savedId) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const r = await adminApiClient.post<ApiEnvelope<Journal>>(`/construction-journals/${savedId}/photos`, fd);
      setPhotos(r.data.data.photos);
      toast.success('Photo added');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handlePhotoDelete(index: number) {
    if (!savedId) return;
    try {
      const r = await adminApiClient.delete<ApiEnvelope<Journal>>(`/construction-journals/${savedId}/photos/${index}`);
      setPhotos(r.data.data.photos);
      toast.success('Photo removed');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  function onSubmit(values: FormValues) {
    saveMutation.mutate({
      id: savedId ?? undefined,
      storeId: values.storeId,
      title: values.title,
      body,
      milestone: values.milestone || undefined,
      progressPercent: Number(values.progressPercent),
      videoUrl: values.videoUrl || undefined,
      isPublished: values.isPublished,
    });
  }

  if (journalQuery.isLoading) return <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />;

  const stores = storesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Journal Entry' : 'New Journal Entry'}</h1>
        <p className="mt-1 text-sm text-[#777]">Document construction progress for investors.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Store</label>
            <select {...register('storeId', { required: 'Store is required' })} className={fieldClass()}>
              <option value="">Select a store</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>{s.name} (#{s.storeNumber})</option>
              ))}
            </select>
            {errors.storeId && <p className="mt-1 text-xs text-red-400">{errors.storeId.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Title</label>
            <input {...register('title', { required: 'Title is required' })} className={fieldClass()} />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Milestone</label>
            <select {...register('milestone')} className={fieldClass()}>
              <option value="">— None —</option>
              {MILESTONES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">
              Progress: <span className="text-[#D62B2B]">{progressPercent ?? 0}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              {...register('progressPercent')}
              className="w-full accent-[#D62B2B]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#ccc]">Video URL (optional)</label>
          <input {...register('videoUrl')} placeholder="https://..." className={fieldClass()} />
        </div>

        <MarkdownEditor
          value={body}
          onChange={setBody}
          label="Update Body (Markdown)"
          rows={12}
        />

        <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
          <input type="checkbox" {...register('isPublished')} className="h-4 w-4 accent-[#D62B2B]" />
          Published
        </label>

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
            {saveMutation.isPending ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </form>

      {savedId && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Photos</h2>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"
            >
              <Plus size={13} /> {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {photos.length === 0 ? (
            <p className="text-sm text-[#666]">No photos yet. Save the entry first, then add photos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-lg border border-[#2A2A2A]">
                  <img src={photo.url} alt={photo.caption ?? `Photo ${idx + 1}`} className="h-32 w-full object-cover" />
                  {photo.caption && (
                    <p className="bg-black/60 px-2 py-1 text-xs text-[#ddd]">{photo.caption}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePhotoDelete(idx)}
                    className="absolute right-1 top-1 rounded bg-red-900/80 p-1 text-red-200 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
