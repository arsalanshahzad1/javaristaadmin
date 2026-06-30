import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type AccessLevel = 'community' | 'shareholder' | 'major_investor' | 'board' | 'admin';

type StoryPhoto = { url: string; publicId: string; caption?: string; stage?: string };

type SourcingStory = {
  _id: string;
  coffeeName: string;
  origin: {
    country: string;
    region: string;
    farm?: string;
    cooperative?: string;
    altitude?: string;
    process?: string;
    variety?: string;
  };
  producerName?: string;
  producerStory?: string;
  harvestSeason?: string;
  videoUrl?: string;
  tastingNotes: string[];
  accessLevel: AccessLevel;
  isPublished: boolean;
  photos: StoryPhoto[];
};

type FormValues = {
  coffeeName: string;
  country: string;
  region: string;
  farm: string;
  cooperative: string;
  altitude: string;
  process: string;
  variety: string;
  producerName: string;
  harvestSeason: string;
  videoUrl: string;
  accessLevel: AccessLevel;
  isPublished: boolean;
};

const ACCESS_LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: 'community', label: 'Community' },
  { value: 'shareholder', label: 'Shareholder' },
  { value: 'major_investor', label: 'Major Investor' },
  { value: 'board', label: 'Board' },
  { value: 'admin', label: 'Admin Only' },
];

const PHOTO_STAGES = ['farm', 'processing', 'transport', 'roasting', 'cup'];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

async function fetchStory(id: string) {
  const r = await adminApiClient.get<ApiEnvelope<SourcingStory>>(`/sourcing-stories/${id}`);
  return r.data.data;
}

export function SourcingStoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [producerStory, setProducerStory] = useState('');
  const [tastingNotes, setTastingNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [savedId, setSavedId] = useState<string | null>(id ?? null);
  const [photos, setPhotos] = useState<StoryPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStage, setPhotoStage] = useState('farm');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const storyQuery = useQuery({
    queryKey: ['sourcing-story-item', id],
    queryFn: () => fetchStory(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      coffeeName: '', country: '', region: '', farm: '', cooperative: '',
      altitude: '', process: '', variety: '', producerName: '', harvestSeason: '',
      videoUrl: '', accessLevel: 'shareholder', isPublished: false,
    },
  });

  useEffect(() => {
    if (storyQuery.data) {
      const d = storyQuery.data;
      reset({
        coffeeName: d.coffeeName,
        country: d.origin.country,
        region: d.origin.region,
        farm: d.origin.farm ?? '',
        cooperative: d.origin.cooperative ?? '',
        altitude: d.origin.altitude ?? '',
        process: d.origin.process ?? '',
        variety: d.origin.variety ?? '',
        producerName: d.producerName ?? '',
        harvestSeason: d.harvestSeason ?? '',
        videoUrl: d.videoUrl ?? '',
        accessLevel: d.accessLevel,
        isPublished: d.isPublished,
      });
      setProducerStory(d.producerStory ?? '');
      setTastingNotes(d.tastingNotes ?? []);
      setPhotos(d.photos ?? []);
    }
  }, [storyQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        coffeeName: values.coffeeName,
        origin: {
          country: values.country,
          region: values.region,
          farm: values.farm || undefined,
          cooperative: values.cooperative || undefined,
          altitude: values.altitude || undefined,
          process: values.process || undefined,
          variety: values.variety || undefined,
        },
        producerName: values.producerName || undefined,
        producerStory: producerStory || undefined,
        harvestSeason: values.harvestSeason || undefined,
        videoUrl: values.videoUrl || undefined,
        tastingNotes,
        accessLevel: values.accessLevel,
        isPublished: values.isPublished,
      };
      const r = savedId
        ? await adminApiClient.put<ApiEnvelope<SourcingStory>>(`/sourcing-stories/${savedId}`, body)
        : await adminApiClient.post<ApiEnvelope<SourcingStory>>('/sourcing-stories', body);
      return r.data;
    },
    onSuccess: (r) => {
      toast.success(r.message || 'Saved');
      queryClient.invalidateQueries({ queryKey: ['sourcing-stories'] });
      if (!isEdit && r.data?._id) setSavedId(r.data._id);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function addNote() {
    const trimmed = noteInput.trim();
    if (trimmed && !tastingNotes.includes(trimmed)) {
      setTastingNotes([...tastingNotes, trimmed]);
    }
    setNoteInput('');
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !savedId) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('stage', photoStage);
      const r = await adminApiClient.post<ApiEnvelope<SourcingStory>>(`/sourcing-stories/${savedId}/photos`, fd);
      setPhotos(r.data.data.photos);
      toast.success('Photo added');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  if (storyQuery.isLoading) return <div className="h-96 animate-pulse rounded-xl bg-[#242424]" />;

  const photosByStage = PHOTO_STAGES.map((stage) => ({
    stage,
    photos: photos.filter((p) => p.stage === stage),
  })).filter((g) => g.photos.length > 0);

  const unstaggedPhotos = photos.filter((p) => !p.stage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Sourcing Story' : 'New Sourcing Story'}</h1>
        <p className="mt-1 text-sm text-[#777]">Tell the farm-to-cup story for investors.</p>
      </div>

      <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        {/* Coffee Name + Access Level */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Coffee Name</label>
            <input {...register('coffeeName', { required: 'Required' })} className={fieldClass()} placeholder="Yirgacheffe Natural" />
            {errors.coffeeName && <p className="mt-1 text-xs text-red-400">{errors.coffeeName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Access Level</label>
            <select {...register('accessLevel')} className={fieldClass()}>
              {ACCESS_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Origin */}
        <div>
          <p className="mb-2 text-sm font-semibold text-[#ccc]">Origin</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[
              { name: 'country' as const, label: 'Country', required: true },
              { name: 'region' as const, label: 'Region', required: true },
              { name: 'farm' as const, label: 'Farm', required: false },
              { name: 'cooperative' as const, label: 'Cooperative', required: false },
              { name: 'altitude' as const, label: 'Altitude', required: false, placeholder: '1,800–2,200m' },
              { name: 'process' as const, label: 'Process', required: false, placeholder: 'Natural / Washed' },
              { name: 'variety' as const, label: 'Variety', required: false, placeholder: 'Heirloom' },
            ].map(({ name, label, required, placeholder }) => (
              <div key={name}>
                <label className="mb-1 block text-xs font-medium text-[#999]">{label}</label>
                <input
                  {...register(name, { required: required ? 'Required' : false })}
                  placeholder={placeholder}
                  className={fieldClass()}
                />
                {errors[name] && <p className="mt-0.5 text-xs text-red-400">{errors[name]?.message}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Producer */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Producer Name</label>
            <input {...register('producerName')} className={fieldClass()} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#ccc]">Harvest Season</label>
            <input {...register('harvestSeason')} placeholder="October–December" className={fieldClass()} />
          </div>
        </div>

        {/* Producer story */}
        <MarkdownEditor
          value={producerStory}
          onChange={setProducerStory}
          label="Producer Story (Markdown)"
          rows={8}
        />

        {/* Tasting notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#ccc]">Tasting Notes</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {tastingNotes.map((note) => (
              <span key={note} className="inline-flex items-center gap-1 rounded-full border border-[#333] bg-[#222] px-2.5 py-1 text-xs text-[#ddd]">
                {note}
                <button type="button" onClick={() => setTastingNotes(tastingNotes.filter((n) => n !== note))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
              placeholder="Blueberry, Jasmine…"
              className={fieldClass()}
            />
            <button
              type="button"
              onClick={addNote}
              className="rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Video URL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[#ccc]">Video URL (optional)</label>
          <input {...register('videoUrl')} placeholder="https://..." className={fieldClass()} />
        </div>

        {/* Published */}
        <label className="flex items-center gap-2 text-sm font-medium text-[#ccc]">
          <input type="checkbox" {...register('isPublished')} className="h-4 w-4 accent-[#D62B2B]" />
          Published
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/investor-content')}
            className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
            Cancel
          </button>
          <button type="submit" disabled={saveMutation.isPending}
            className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">
            {saveMutation.isPending ? 'Saving…' : 'Save Story'}
          </button>
        </div>
      </form>

      {/* Photo section */}
      {savedId && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-white">Photos</h2>
            <select
              value={photoStage}
              onChange={(e) => setPhotoStage(e.target.value)}
              className="rounded-lg border border-[#333] bg-[#111] px-2 py-1.5 text-xs text-white"
            >
              {PHOTO_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"
            >
              <Plus size={13} /> {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {photosByStage.map(({ stage, photos: stagePhotos }) => (
            <div key={stage} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777]">
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {stagePhotos.map((photo, idx) => {
                  const globalIdx = photos.indexOf(photo);
                  return (
                    <div key={idx} className="group relative shrink-0">
                      <img src={photo.url} alt={photo.caption} className="h-28 w-44 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={async () => {
                          await adminApiClient.delete(`/sourcing-stories/${savedId}/photos/${globalIdx}`).catch(() => null);
                          setPhotos(photos.filter((_, i) => i !== globalIdx));
                        }}
                        className="absolute right-1 top-1 rounded bg-red-900/80 p-1 text-red-200 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {unstaggedPhotos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777]">Unstaged</p>
              <div className="flex gap-3">
                {unstaggedPhotos.map((photo, idx) => (
                  <img key={idx} src={photo.url} className="h-24 w-36 rounded-lg object-cover" alt="" />
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 && (
            <p className="text-sm text-[#666]">No photos yet. Save the story first, then add photos.</p>
          )}
        </div>
      )}
    </div>
  );
}
