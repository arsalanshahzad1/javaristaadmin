import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  GripVertical, ImageIcon, X, Clock, Droplets,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { recipesApi } from '../../api/recipes.api';
import { brewMethodsApi } from '../../api/brewMethods.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDuration } from '../../utils/formatters';
import type { BrewMethod } from '../../types';

// ─── Schema ──────────────────────────────────────────────────────────────────

const stepSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  duration: z.coerce.number().min(0).optional(),
});

const schema = z.object({
  title: z.string().min(1, 'Recipe name is required'),
  brewMethod: z.string().min(1, 'Select a brew method'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().optional(),
  coffeeDose: z.coerce.number().min(0).optional(),
  waterAmount: z.coerce.number().min(0).optional(),
  grindSize: z.string().optional(),
  brewTimeMins: z.coerce.number().min(0).max(99).default(0),
  brewTimeSecs: z.coerce.number().min(0).max(59).default(0),
  steps: z.array(stepSchema).min(1, 'Add at least one step'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-white mb-4 pb-3 border-b border-[#2A2A2A]">
      {children}
    </h3>
  );
}

function Textarea({
  label,
  error,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-[#999] font-medium">{label}</label>}
      <textarea
        rows={rows}
        className={`bg-[#1A1A1A] border ${error ? 'border-red-600' : 'border-[#2A2A2A]'}
          rounded-lg px-3 py-2 text-sm text-white placeholder-[#555]
          outline-none focus:border-[#D62B2B] transition-colors w-full resize-none
          disabled:opacity-50`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  // Tags state (managed outside RHF)
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit mode (draft vs publish)
  const submitModeRef = useRef<'draft' | 'publish'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: methodsData } = useQuery({
    queryKey: ['brew-methods'],
    queryFn: () => brewMethodsApi.getBrewMethods(),
  });

  const { data: recipeData, isLoading: recipeLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.getRecipeById(id!),
    enabled: isEdit,
  });

  const methods: BrewMethod[] = methodsData?.data?.data ?? [];
  const existingRecipe = recipeData?.data?.data;

  // ── Form ─────────────────────────────────────────────────────────────────

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      difficulty: 'beginner',
      brewTimeMins: 0,
      brewTimeSecs: 0,
      steps: [{ instruction: '', duration: undefined }],
      isPublished: false,
      isFeatured: false,
      isPremium: false,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'steps',
  });

  // Populate form when recipe loads (edit mode)
  useEffect(() => {
    if (!existingRecipe) return;
    const r = existingRecipe;
    reset({
      title: r.title,
      brewMethod:
        typeof r.brewMethod === 'object'
          ? (r.brewMethod as BrewMethod)._id
          : (r.brewMethod as string),
      difficulty: r.difficulty,
      description: r.description ?? '',
      coffeeDose: (r as unknown as Record<string, unknown>).coffeeDose as number | undefined,
      waterAmount: (r as unknown as Record<string, unknown>).waterAmount as number | undefined,
      grindSize: ((r as unknown as Record<string, unknown>).grindSize as string) ?? '',
      brewTimeMins: Math.floor(r.totalTime / 60),
      brewTimeSecs: r.totalTime % 60,
      steps: r.steps.length > 0
        ? r.steps.map((s) => ({ instruction: s.instruction, duration: s.duration }))
        : [{ instruction: '', duration: undefined }],
      isPublished: r.isPublished,
      isFeatured: r.isFeatured,
      isPremium: (r as unknown as Record<string, unknown>).isPremium as boolean ?? false,
    });
    setTags(r.tags ?? []);
    if (r.image) setImagePreview(r.image);
  }, [existingRecipe, reset]);

  // ── Tag handlers ─────────────────────────────────────────────────────────

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  // ── Image handlers ────────────────────────────────────────────────────────

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile],
  );

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    const forcePublish = submitModeRef.current === 'publish';
    setIsSubmitting(true);
    try {
      const totalTime = (values.brewTimeMins ?? 0) * 60 + (values.brewTimeSecs ?? 0);
      const payload = {
        title: values.title,
        description: values.description,
        brewMethod: values.brewMethod,
        difficulty: values.difficulty,
        totalTime,
        tags,
        image: imagePreview ?? undefined,
        coffeeDose: values.coffeeDose,
        waterAmount: values.waterAmount,
        grindSize: values.grindSize,
        steps: values.steps.map((s, i) => ({
          order: i + 1,
          instruction: s.instruction,
          duration: s.duration,
        })),
      };

      let recipeId = id;

      if (isEdit) {
        await recipesApi.updateRecipe(id!, payload);
      } else {
        const res = await recipesApi.createRecipe(payload);
        recipeId = res.data.data._id;
      }

      // Sync publish settings
      const publishedState = forcePublish ? true : values.isPublished;
      await recipesApi.publishRecipe(recipeId!, publishedState, values.isFeatured);

      toast.success(isEdit ? 'Recipe updated' : 'Recipe created');
      navigate('/recipes');
    } catch {
      toast.error(isEdit ? 'Failed to update recipe' : 'Failed to create recipe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = handleSubmit((values) => {
    submitModeRef.current = 'draft';
    onSubmit(values);
  });

  const handleSavePublish = handleSubmit((values) => {
    submitModeRef.current = 'publish';
    onSubmit(values);
  });

  // ── Derived values ────────────────────────────────────────────────────────

  const watchedDose = watch('coffeeDose');
  const watchedWater = watch('waterAmount');
  const watchedMins = watch('brewTimeMins');
  const watchedSecs = watch('brewTimeSecs');
  const watchedDifficulty = watch('difficulty');
  const watchedSteps = watch('steps');
  const watchedDoseNumber = Number(watchedDose) || 0;
  const watchedWaterNumber = Number(watchedWater) || 0;
  const watchedMinsNumber = Number(watchedMins) || 0;
  const watchedSecsNumber = Number(watchedSecs) || 0;

  const ratio =
    watchedDoseNumber && watchedWaterNumber && watchedDoseNumber > 0
      ? `1:${Math.round(watchedWaterNumber / watchedDoseNumber)}`
      : '—';

  const totalTimeSecs = watchedMinsNumber * 60 + watchedSecsNumber;

  const difficultyLabel =
    watchedDifficulty === 'beginner'
      ? 'Easy'
      : watchedDifficulty === 'intermediate'
      ? 'Medium'
      : 'Hard';

  const difficultyVariant =
    watchedDifficulty === 'beginner'
      ? ('success' as const)
      : watchedDifficulty === 'intermediate'
      ? ('warning' as const)
      : ('danger' as const);

  if (isEdit && recipeLoading) return <PageSpinner />;

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title={isEdit ? `Edit Recipe${existingRecipe ? ` — ${existingRecipe.title}` : ''}` : 'Add New Recipe'}
        description={isEdit ? 'Update recipe details and settings' : 'Create a new recipe for JavaRista users'}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/recipes')}>
            <ArrowLeft size={14} />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ── Left column (main form) ────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Basic Info */}
          <Card>
            <SectionTitle>Basic Info</SectionTitle>
            <div className="space-y-4">
              <Input
                label="Recipe Name"
                placeholder="e.g. Ethiopian Pour Over"
                error={errors.title?.message}
                {...register('title')}
              />

              <Select
                label="Brew Method"
                options={methods.map((m) => ({ value: m._id, label: m.name }))}
                placeholder="Select a brew method"
                error={errors.brewMethod?.message}
                {...register('brewMethod')}
              />

              <Select
                label="Difficulty"
                options={[
                  { value: 'beginner', label: 'Easy (Beginner)' },
                  { value: 'intermediate', label: 'Medium (Intermediate)' },
                  { value: 'advanced', label: 'Hard (Advanced)' },
                ]}
                error={errors.difficulty?.message}
                {...register('difficulty')}
              />

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#999] font-medium">
                  Tags
                  <span className="text-[#555] font-normal ml-1.5">comma separated</span>
                </label>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder="e.g. fruity, light-roast, pour-over…"
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm
                    text-white placeholder-[#555] outline-none focus:border-[#D62B2B]
                    transition-colors w-full"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D62B2B]/15
                          text-[#D62B2B] text-xs font-medium border border-[#D62B2B]/20"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-white transition-colors cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Textarea
                label="Description"
                placeholder="Describe the recipe, flavor notes, and brewing tips…"
                rows={4}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
          </Card>

          {/* Brew Parameters */}
          <Card>
            <SectionTitle>Brew Parameters</SectionTitle>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Coffee Dose (g)"
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="18"
                  error={errors.coffeeDose?.message}
                  {...register('coffeeDose')}
                />
                <Input
                  label="Water Amount (ml)"
                  type="number"
                  min={0}
                  placeholder="300"
                  error={errors.waterAmount?.message}
                  {...register('waterAmount')}
                />
                {/* Auto-calculated ratio */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#999] font-medium">Ratio</label>
                  <div className="bg-[#242424] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#666] select-none">
                    {ratio}
                  </div>
                  <span className="text-xs text-[#555]">auto-calculated</span>
                </div>
              </div>

              <Input
                label="Grind Size"
                placeholder="e.g. Medium-coarse"
                {...register('grindSize')}
              />

              {/* Brew time */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#999] font-medium">Brew Time</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      placeholder="0"
                      error={errors.brewTimeMins?.message}
                      {...register('brewTimeMins')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#555] pointer-events-none">
                      min
                    </span>
                  </div>
                  <span className="text-[#555] text-lg font-light mt-0.5">:</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="0"
                      error={errors.brewTimeSecs?.message}
                      {...register('brewTimeSecs')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#555] pointer-events-none">
                      sec
                    </span>
                  </div>
                  {totalTimeSecs > 0 && (
                    <span className="text-xs text-[#666] whitespace-nowrap flex-shrink-0">
                      = {formatDuration(totalTimeSecs)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Steps */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2A2A2A]">
              <h3 className="text-sm font-semibold text-white">Steps</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ instruction: '', duration: undefined })}
              >
                <Plus size={14} />
                Add Step
              </Button>
            </div>

            {errors.steps?.root && (
              <p className="text-xs text-red-400 mb-3">{errors.steps.root.message}</p>
            )}

            {fields.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#555]">
                No steps yet — click "Add Step" to get started
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 flex gap-3"
                  >
                    {/* Drag handle + order */}
                    <div className="flex flex-col items-center gap-2 pt-1 flex-shrink-0">
                      <GripVertical size={14} className="text-[#3A3A3A] cursor-grab" />
                      <span className="w-6 h-6 rounded-full bg-[#D62B2B]/20 text-[#D62B2B] text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>

                    {/* Step content */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <Textarea
                        placeholder={`Step ${index + 1}: describe what to do…`}
                        rows={2}
                        error={errors.steps?.[index]?.instruction?.message}
                        {...register(`steps.${index}.instruction`)}
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Clock size={13} className="text-[#555] flex-shrink-0" />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Duration (seconds)"
                            {...register(`steps.${index}.duration`)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        className="p-1.5 rounded hover:bg-[#242424] text-[#555] hover:text-white
                          transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                        className="p-1.5 rounded hover:bg-[#242424] text-[#555] hover:text-white
                          transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 rounded hover:bg-red-900/30 text-[#555] hover:text-red-400
                          transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column (sidebar) ─────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Publish Settings */}
          <Card title="Publish Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Published</p>
                  <p className="text-xs text-[#555] mt-0.5">Visible to all users</p>
                </div>
                <Controller
                  control={control}
                  name="isPublished"
                  render={({ field: { value, onChange } }) => (
                    <Toggle checked={Boolean(value)} onChange={onChange} />
                  )}
                />
              </div>
              <div className="h-px bg-[#2A2A2A]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Featured</p>
                  <p className="text-xs text-[#555] mt-0.5">Shown in featured section</p>
                </div>
                <Controller
                  control={control}
                  name="isFeatured"
                  render={({ field: { value, onChange } }) => (
                    <Toggle checked={Boolean(value)} onChange={onChange} />
                  )}
                />
              </div>
              <div className="h-px bg-[#2A2A2A]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Premium Content</p>
                  <p className="text-xs text-[#555] mt-0.5">Requires premium subscription</p>
                </div>
                <Controller
                  control={control}
                  name="isPremium"
                  render={({ field: { value, onChange } }) => (
                    <Toggle checked={Boolean(value)} onChange={onChange} />
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Recipe Image */}
          <Card title="Recipe Image">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#111]">
                  <img
                    src={imagePreview}
                    alt="Recipe preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#D62B2B] hover:text-[#E84040] transition-colors cursor-pointer"
                  >
                    Change image
                  </button>
                  <span className="text-[#3A3A3A]">·</span>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-xs text-[#555] hover:text-[#999] transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed
                  transition-colors cursor-pointer
                  ${isDragging
                    ? 'border-[#D62B2B] bg-[#D62B2B]/5'
                    : 'border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#242424]/50'
                  }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#242424] flex items-center justify-center">
                  <ImageIcon size={18} className="text-[#555]" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#999]">Drop image here or click to upload</p>
                  <p className="text-xs text-[#555] mt-1">PNG, JPG, WebP up to 5MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
            />
          </Card>

          {/* Recipe Preview */}
          <Card title="Recipe Preview">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2 text-[#666]">
                  <Clock size={13} />
                  <span>Brew Time</span>
                </div>
                <span className="text-white font-medium">
                  {totalTimeSecs > 0 ? formatDuration(totalTimeSecs) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2 text-[#666]">
                  <Droplets size={13} />
                  <span>Ratio</span>
                </div>
                <span className="text-white font-medium">{ratio}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                <span className="text-[#666]">Difficulty</span>
                <Badge variant={difficultyVariant}>{difficultyLabel}</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#666]">Steps</span>
                <span className="text-white font-medium">
                  {watchedSteps?.length ?? 0} step{watchedSteps?.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Sticky bottom action bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2A2A2A] bg-[#111]/95 backdrop-blur-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-[#555] hidden sm:block">
            {isEdit ? 'Editing recipe' : 'New recipe'} · {tags.length} tag{tags.length !== 1 ? 's' : ''} · {fields.length} step{fields.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/recipes')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              loading={isSubmitting && submitModeRef.current === 'draft'}
              disabled={isSubmitting}
              onClick={handleSaveDraft}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              loading={isSubmitting && submitModeRef.current === 'publish'}
              disabled={isSubmitting}
              onClick={handleSavePublish}
            >
              Save &amp; Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
