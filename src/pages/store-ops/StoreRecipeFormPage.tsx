import { useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2, X, CheckSquare, Square } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import { FileUploadButton } from '../../components/ui/FileUploadButton';
import {
  addQualityPhoto,
  deleteQualityPhoto,
  createStoreRecipe,
  getStoreOpsErrorMessage,
  getStoreRecipe,
  updateStoreRecipe,
  INGREDIENT_UNITS,
  type IngredientUnit,
  type QualityPhoto,
  type StoreRecipeCategory,
  type StoreRecipePayload,
} from '../../api/storeOps.api';
import { CERTIFICATION_TYPES } from './certificationTypes';

type TextRow = { value: string };
type IngredientFormValue = {
  name: string;
  amount: number | undefined;
  unit: IngredientUnit;
  isOptional: boolean;
  notes: string;
};
type SizeFormValue = {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: { name: string; amount: string }[];
  ingredients: IngredientFormValue[];
};
const ALL_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

const STATION_OPTIONS = ['Espresso Bar', 'Matcha Station', 'Kitchen', 'Drive-Thru', 'All'];

type StoreRecipeFormValues = {
  name: string;
  slug: string;
  category: StoreRecipeCategory;
  targetPrepTimeSeconds?: number;
  requiredEquipment: string[];
  isActive: boolean;
  sizes: SizeFormValue[];
  buildOrder: TextRow[];
  costInfo: {
    ingredientCost?: number;
    laborCost?: number;
    totalCost?: number;
    sellingPrice?: number;
    margin?: number;
  };
  qualityStandards: string;
  commonMistakes: TextRow[];
  photos: TextRow[];
  videoUrl: string;
  visibilityRoles: string[];
  stationAssignment: string;
  certificationRequired: boolean;
  requiredCertifications: string[];
};

const categoryOptions: { value: StoreRecipeCategory; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'iced', label: 'Iced' },
  { value: 'blended', label: 'Blended' },
  { value: 'matcha', label: 'Matcha' },
  { value: 'hojicha', label: 'Hojicha' },
  { value: 'food', label: 'Food' },
];

const emptyIngredient: IngredientFormValue = {
  name: '',
  amount: undefined,
  unit: 'ml',
  isOptional: false,
  notes: '',
};

const emptySize: SizeFormValue = {
  label: '',
  coffeeDose: undefined,
  waterAmount: undefined,
  milkAmount: undefined,
  syrupAmount: undefined,
  syrupType: '',
  additionalIngredients: [],
  ingredients: [],
};

const emptyForm: StoreRecipeFormValues = {
  name: '',
  slug: '',
  category: 'hot',
  targetPrepTimeSeconds: undefined,
  requiredEquipment: [],
  isActive: true,
  sizes: [],
  buildOrder: [{ value: '' }],
  costInfo: { ingredientCost: undefined, laborCost: undefined, totalCost: undefined, sellingPrice: undefined, margin: undefined },
  qualityStandards: '',
  commonMistakes: [{ value: '' }],
  photos: [{ value: '' }],
  videoUrl: '',
  visibilityRoles: [],
  stationAssignment: '',
  certificationRequired: false,
  requiredCertifications: [],
};

function fieldClass() {
  return 'w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30';
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function cleanNumber(value: number | undefined) {
  return Number.isFinite(value) ? value : undefined;
}

function cleanTextRows(rows: TextRow[]) {
  return rows.map((row) => row.value.trim()).filter(Boolean);
}

function toPayload(values: StoreRecipeFormValues): StoreRecipePayload {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    category: values.category,
    targetPrepTimeSeconds: cleanNumber(values.targetPrepTimeSeconds),
    requiredEquipment: values.requiredEquipment,
    isActive: values.isActive,
    sizes: values.sizes
      .filter((size) => size.label.trim())
      .map((size) => ({
        label: size.label.trim(),
        coffeeDose: cleanNumber(size.coffeeDose),
        waterAmount: cleanNumber(size.waterAmount),
        milkAmount: cleanNumber(size.milkAmount),
        syrupAmount: cleanNumber(size.syrupAmount),
        syrupType: size.syrupType?.trim() || undefined,
        additionalIngredients: size.additionalIngredients
          .filter((item) => item.name.trim() || item.amount.trim())
          .map((item) => ({ name: item.name.trim(), amount: item.amount.trim() })),
        ingredients: size.ingredients
          .filter((ing) => ing.name.trim() && ing.amount !== undefined)
          .map((ing) => ({
            name: ing.name.trim(),
            amount: ing.amount as number,
            unit: ing.unit,
            isOptional: ing.isOptional,
            notes: ing.notes.trim() || undefined,
          })),
      })),
    buildOrder: cleanTextRows(values.buildOrder),
    costInfo: {
      ingredientCost: cleanNumber(values.costInfo.ingredientCost),
      laborCost: cleanNumber(values.costInfo.laborCost),
      totalCost: cleanNumber(values.costInfo.totalCost),
      sellingPrice: cleanNumber(values.costInfo.sellingPrice),
      margin: cleanNumber(values.costInfo.margin),
    },
    qualityStandards: values.qualityStandards,
    commonMistakes: cleanTextRows(values.commonMistakes),
    photos: cleanTextRows(values.photos),
    videoUrl: values.videoUrl.trim() || undefined,
    visibilityRoles: values.visibilityRoles,
    stationAssignment: values.stationAssignment || undefined,
    certificationRequired: values.certificationRequired,
    requiredCertifications: values.requiredCertifications,
  };
}

function numberRegisterOptions() {
  return { valueAsNumber: true };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#777]">{title}</h2>
      {children}
    </section>
  );
}

// Quality photos panel — only rendered when editing an existing recipe
function QualityPhotosSection({ recipeId, initialPhotos }: { recipeId: string; initialPhotos: QualityPhoto[] }) {
  const [photos, setPhotos] = useState<QualityPhoto[]>(initialPhotos);
  const [pendingUpload, setPendingUpload] = useState<{ type: 'correct' | 'incorrect'; url: string; publicId: string } | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  async function handleUploaded(url: string, publicId: string, _file: File, type: 'correct' | 'incorrect') {
    setPendingUpload({ type, url, publicId });
    setPendingCaption('');
  }

  async function submitCaption() {
    if (!pendingUpload || !pendingCaption.trim()) return;
    setSavingCaption(true);
    try {
      const updated = await addQualityPhoto(recipeId, { ...pendingUpload, caption: pendingCaption.trim() });
      setPhotos(updated);
      setPendingUpload(null);
      setPendingCaption('');
      toast.success('Photo added');
    } catch {
      toast.error('Failed to save photo');
    } finally {
      setSavingCaption(false);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      const updated = await deleteQualityPhoto(recipeId, photoId);
      setPhotos(updated);
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to delete photo');
    }
  }

  function PhotoGrid({ type }: { type: 'correct' | 'incorrect' }) {
    const filtered = photos.filter((p) => p.type === type);
    const isCorrect = type === 'correct';
    const color = isCorrect ? 'green' : 'red';

    return (
      <div className={`rounded-lg border ${isCorrect ? 'border-green-900/40' : 'border-red-900/40'} bg-[#111] p-4`}>
        <h3 className={`mb-3 text-sm font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? '✓ Correct Examples' : '✗ Incorrect Examples'}
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((photo) => (
            <div key={photo._id} className="group relative">
              <img
                src={photo.url}
                alt={photo.caption}
                className={`h-32 w-full rounded-lg object-cover ${!isCorrect ? 'brightness-90' : ''}`}
              />
              {!isCorrect && (
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-red-900/20" />
              )}
              <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/70 px-2 py-1.5">
                <p className="truncate text-[10px] text-white">{photo.caption}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(photo._id)}
                className="absolute right-1 top-1 hidden rounded bg-black/60 p-0.5 text-white group-hover:flex"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3">
          {pendingUpload?.type === type ? (
            <div className="rounded-lg border border-[#333] bg-[#1A1A1A] p-3">
              <p className="mb-2 text-xs text-[#aaa]">Add a caption before saving:</p>
              <div className="flex gap-2">
                <input
                  value={pendingCaption}
                  onChange={(e) => setPendingCaption(e.target.value)}
                  placeholder="e.g. Perfect foam ratio"
                  className={`flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-${color}-600`}
                />
                <button
                  type="button"
                  onClick={submitCaption}
                  disabled={!pendingCaption.trim() || savingCaption}
                  className={`rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50 ${isCorrect ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}
                >
                  {savingCaption ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingUpload(null)}
                  className="rounded-lg border border-[#333] px-3 py-2 text-xs text-[#999]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            !pendingUpload && (
              <FileUploadButton
                endpoint="/upload/recipe-photo"
                accept="image/*"
                label={`Upload ${isCorrect ? 'Correct' : 'Incorrect'} Photo`}
                onUploaded={(url, publicId, file) => handleUploaded(url, publicId, file, type)}
              />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <Section title="Quality Control Photos">
      <p className="mb-4 text-sm text-[#666]">Add reference photos showing correct and incorrect preparation.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PhotoGrid type="correct" />
        <PhotoGrid type="incorrect" />
      </div>
    </Section>
  );
}

export function StoreRecipeFormPage() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSlugEdited, setSlugEdited] = useState(Boolean(slug));
  const [equipmentInput, setEquipmentInput] = useState('');

  const recipeQuery = useQuery({
    queryKey: ['store-recipe', slug],
    queryFn: () => getStoreRecipe(slug ?? ''),
    enabled: isEdit,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<StoreRecipeFormValues>({ defaultValues: emptyForm });

  const sizeFields = useFieldArray({ control, name: 'sizes' });
  const stepFields = useFieldArray({ control, name: 'buildOrder' });
  const mistakeFields = useFieldArray({ control, name: 'commonMistakes' });
  const photoFields = useFieldArray({ control, name: 'photos' });
  const equipment = useWatch({ control, name: 'requiredEquipment' });
  const sizes = useWatch({ control, name: 'sizes' });
  const qualityStandards = useWatch({ control, name: 'qualityStandards' });
  const visibilityRoles = useWatch({ control, name: 'visibilityRoles' });
  const certificationRequired = watch('certificationRequired');
  const requiredCertifications = watch('requiredCertifications');

  useEffect(() => {
    if (!recipeQuery.data) return;
    reset({
      name: recipeQuery.data.name,
      slug: recipeQuery.data.slug,
      category: recipeQuery.data.category,
      targetPrepTimeSeconds: recipeQuery.data.targetPrepTimeSeconds,
      requiredEquipment: recipeQuery.data.requiredEquipment ?? [],
      isActive: recipeQuery.data.isActive,
      sizes: recipeQuery.data.sizes?.map((s) => ({
        ...s,
        ingredients: s.ingredients ?? [],
        additionalIngredients: s.additionalIngredients ?? [],
      })) ?? [],
      buildOrder: recipeQuery.data.buildOrder?.length ? recipeQuery.data.buildOrder.map((value) => ({ value })) : [{ value: '' }],
      costInfo: {
        ingredientCost: recipeQuery.data.costInfo?.ingredientCost,
        laborCost: recipeQuery.data.costInfo?.laborCost,
        totalCost: recipeQuery.data.costInfo?.totalCost,
        sellingPrice: recipeQuery.data.costInfo?.sellingPrice,
        margin: recipeQuery.data.costInfo?.margin,
      },
      qualityStandards: recipeQuery.data.qualityStandards ?? '',
      commonMistakes: recipeQuery.data.commonMistakes?.length ? recipeQuery.data.commonMistakes.map((value) => ({ value })) : [{ value: '' }],
      photos: recipeQuery.data.photos?.length ? recipeQuery.data.photos.map((value) => ({ value })) : [{ value: '' }],
      videoUrl: recipeQuery.data.videoUrl ?? '',
      visibilityRoles: recipeQuery.data.visibilityRoles ?? [],
      stationAssignment: recipeQuery.data.stationAssignment ?? '',
      certificationRequired: recipeQuery.data.certificationRequired ?? false,
      requiredCertifications: recipeQuery.data.requiredCertifications ?? [],
    });
  }, [recipeQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: StoreRecipeFormValues) => {
      const payload = toPayload(values);
      return isEdit ? updateStoreRecipe(slug ?? '', payload) : createStoreRecipe(payload);
    },
    onSuccess: (response) => {
      toast.success(response.message || 'Recipe saved');
      queryClient.invalidateQueries({ queryKey: ['store-recipes'] });
      navigate('/store-ops');
    },
    onError: (error) => toast.error(getStoreOpsErrorMessage(error)),
  });

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isSlugEdited) setValue('slug', toSlug(event.target.value), { shouldDirty: true });
  }

  function addEquipment() {
    const next = equipmentInput.trim();
    if (!next) return;
    const current = getValues('requiredEquipment');
    if (!current.includes(next)) setValue('requiredEquipment', [...current, next], { shouldDirty: true });
    setEquipmentInput('');
  }

  function handleEquipmentKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addEquipment();
    }
  }

  // Legacy additionalIngredients helpers
  function addAdditionalIngredient(sizeIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = { ...selectedSize, additionalIngredients: [...selectedSize.additionalIngredients, { name: '', amount: '' }] };
    setValue('sizes', nextSizes, { shouldDirty: true });
  }

  function removeAdditionalIngredient(sizeIndex: number, ingredientIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = {
      ...selectedSize,
      additionalIngredients: selectedSize.additionalIngredients.filter((_, i) => i !== ingredientIndex),
    };
    setValue('sizes', nextSizes, { shouldDirty: true });
  }

  // Structured ingredients helpers
  function addIngredient(sizeIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = { ...selectedSize, ingredients: [...selectedSize.ingredients, { ...emptyIngredient }] };
    setValue('sizes', nextSizes, { shouldDirty: true });
  }

  function removeIngredient(sizeIndex: number, ingIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = { ...selectedSize, ingredients: selectedSize.ingredients.filter((_, i) => i !== ingIndex) };
    setValue('sizes', nextSizes, { shouldDirty: true });
  }

  function toggleCertification(cert: string) {
    const current = requiredCertifications ?? [];
    const next = current.includes(cert) ? current.filter((c) => c !== cert) : [...current, cert];
    setValue('requiredCertifications', next, { shouldDirty: true });
  }

  if (recipeQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-[#242424]" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Store Recipe' : 'New Store Recipe'}</h1>
        <p className="mt-1 text-sm text-[#777]">Create operational recipes for store teams.</p>
      </div>

      {recipeQuery.isError ? (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <p className="text-red-300">{getStoreOpsErrorMessage(recipeQuery.error)}</p>
          <button type="button" onClick={() => recipeQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/20">Try again</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="space-y-5">
          <Section title="Basic Info">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Name</label>
                <input {...register('name', { required: 'Name is required', onChange: handleNameChange })} className={fieldClass()} />
                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Slug</label>
                <input {...register('slug', { required: 'Slug is required', onChange: () => setSlugEdited(true) })} className={fieldClass()} />
                {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Category</label>
                <select {...register('category')} className={fieldClass()}>
                  {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">
                  Target Prep Time (seconds)
                  <span className="ml-1 text-[#555]">— employees will be measured against this target</span>
                </label>
                <input type="number" min="0" {...register('targetPrepTimeSeconds', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Station Assignment</label>
                <select {...register('stationAssignment')} className={fieldClass()}>
                  <option value="">— None —</option>
                  {STATION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Required Equipment</label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-[#333] bg-[#111] p-2">
                {(equipment ?? []).map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded bg-[#2E2E2E] px-2 py-1 text-xs text-[#ddd]">
                    {item}
                    <button type="button" onClick={() => setValue('requiredEquipment', (equipment ?? []).filter((v) => v !== item), { shouldDirty: true })}><X size={12} /></button>
                  </span>
                ))}
                <input value={equipmentInput} onChange={(e) => setEquipmentInput(e.target.value)} onKeyDown={handleEquipmentKeyDown} onBlur={addEquipment} placeholder="Type and press Enter" className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm text-white outline-none" />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[#ccc]">
              <input type="checkbox" {...register('isActive')} className="h-4 w-4 accent-[#D62B2B]" />
              Active
            </label>
          </Section>

          <Section title="Sizes">
            <div className="space-y-4">
              {sizeFields.fields.map((field, sizeIndex) => (
                <div key={field.id} className="rounded-lg border border-[#333] bg-[#151515] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">Size {sizeIndex + 1}</h3>
                    <button type="button" onClick={() => sizeFields.remove(sizeIndex)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20">
                      <Trash2 size={13} /> Delete size
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Size label</label>
                      <input {...register(`sizes.${sizeIndex}.label` as const)} placeholder="Small / Medium / Large" className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Coffee Dose (g)</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.coffeeDose` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Water Amount (ml)</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.waterAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Milk Amount (ml)</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.milkAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Syrup Amount (ml)</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.syrupAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Syrup Type</label>
                      <input {...register(`sizes.${sizeIndex}.syrupType` as const)} className={fieldClass()} />
                    </div>
                  </div>

                  {/* Structured Ingredients */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-[#ccc]">Ingredients</label>
                      <button type="button" onClick={() => addIngredient(sizeIndex)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]">
                        <Plus size={13} /> Add Ingredient
                      </button>
                    </div>
                    {(sizes?.[sizeIndex]?.ingredients ?? []).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#666]">
                              <th className="pb-2 pr-2 font-medium">Name</th>
                              <th className="pb-2 pr-2 font-medium">Amount</th>
                              <th className="pb-2 pr-2 font-medium">Unit</th>
                              <th className="pb-2 pr-2 font-medium">Optional</th>
                              <th className="pb-2 pr-2 font-medium">Notes</th>
                              <th className="pb-2 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody className="space-y-2">
                            {(sizes?.[sizeIndex]?.ingredients ?? []).map((_, ingIndex) => (
                              <tr key={ingIndex} className="border-b border-[#1A1A1A]">
                                <td className="py-1.5 pr-2">
                                  <input {...register(`sizes.${sizeIndex}.ingredients.${ingIndex}.name` as const)} placeholder="Vanilla Syrup" className={fieldClass()} />
                                </td>
                                <td className="py-1.5 pr-2 w-24">
                                  <input type="number" step="0.1" min="0" {...register(`sizes.${sizeIndex}.ingredients.${ingIndex}.amount` as const, numberRegisterOptions())} className={fieldClass()} />
                                </td>
                                <td className="py-1.5 pr-2 w-28">
                                  <select {...register(`sizes.${sizeIndex}.ingredients.${ingIndex}.unit` as const)} className={fieldClass()}>
                                    {INGREDIENT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </td>
                                <td className="py-1.5 pr-2 text-center">
                                  <input type="checkbox" {...register(`sizes.${sizeIndex}.ingredients.${ingIndex}.isOptional` as const)} className="h-4 w-4 accent-[#D62B2B]" />
                                </td>
                                <td className="py-1.5 pr-2">
                                  <input {...register(`sizes.${sizeIndex}.ingredients.${ingIndex}.notes` as const)} placeholder="e.g. to taste" className={fieldClass()} />
                                </td>
                                <td className="py-1.5">
                                  <button type="button" onClick={() => removeIngredient(sizeIndex, ingIndex)} className="rounded-lg border border-[#333] px-2 py-1.5 text-[#ddd] hover:bg-[#242424]">
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Legacy Additional Ingredients */}
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-[#999]">Additional Ingredients (legacy)</label>
                      <button type="button" onClick={() => addAdditionalIngredient(sizeIndex)} className="inline-flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#777] hover:bg-[#1E1E1E]">
                        <Plus size={13} /> Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(sizes?.[sizeIndex]?.additionalIngredients ?? []).map((_, ingredientIndex) => (
                        <div key={ingredientIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input {...register(`sizes.${sizeIndex}.additionalIngredients.${ingredientIndex}.name` as const)} placeholder="Name" className={fieldClass()} />
                          <input {...register(`sizes.${sizeIndex}.additionalIngredients.${ingredientIndex}.amount` as const)} placeholder="Amount" className={fieldClass()} />
                          <button type="button" onClick={() => removeAdditionalIngredient(sizeIndex, ingredientIndex)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => sizeFields.append({ ...emptySize })} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
                <Plus size={14} /> Add Size
              </button>
            </div>
          </Section>

          <Section title="Build Order">
            <div className="space-y-2">
              {stepFields.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-2">
                  <div className="flex h-10 items-center justify-center rounded-lg border border-[#333] bg-[#111] text-sm text-[#777]">{index + 1}</div>
                  <input {...register(`buildOrder.${index}.value` as const)} className={fieldClass()} />
                  <button type="button" disabled={index === 0} onClick={() => stepFields.move(index, index - 1)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424] disabled:opacity-40"><ArrowUp size={16} /></button>
                  <button type="button" disabled={index === stepFields.fields.length - 1} onClick={() => stepFields.move(index, index + 1)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424] disabled:opacity-40"><ArrowDown size={16} /></button>
                  <button type="button" onClick={() => stepFields.remove(index)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]"><X size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => stepFields.append({ value: '' })} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
                <Plus size={14} /> Add Step
              </button>
            </div>
          </Section>

          <Section title="Cost Info">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Ingredient Cost</label>
                <input type="number" step="0.01" {...register('costInfo.ingredientCost', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Labor Cost</label>
                <input type="number" step="0.01" {...register('costInfo.laborCost', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Total Cost</label>
                <input type="number" step="0.01" {...register('costInfo.totalCost', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Selling Price</label>
                <input type="number" step="0.01" {...register('costInfo.sellingPrice', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Margin %</label>
                <input type="number" step="0.01" {...register('costInfo.margin', numberRegisterOptions())} className={fieldClass()} />
              </div>
            </div>
          </Section>

          <Section title="Certification Requirements">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" {...register('certificationRequired')} className="h-4 w-4 accent-[#D62B2B]" />
              <span className="text-sm font-medium text-[#ccc]">Requires Certification to prepare</span>
            </label>
            {certificationRequired && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-[#888]">Select required certification types:</p>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATION_TYPES.map((cert) => {
                    const selected = (requiredCertifications ?? []).includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => toggleCertification(cert)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${selected ? 'bg-[#D62B2B]/20 text-[#D62B2B] ring-1 ring-[#D62B2B]/40' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                      >
                        {selected ? <CheckSquare size={12} /> : <Square size={12} />}
                        {cert.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section title="Visibility Roles">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      const current = visibilityRoles ?? [];
                      setValue('visibilityRoles', current.includes(role) ? current.filter((r) => r !== role) : [...current, role], { shouldDirty: true });
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${(visibilityRoles ?? []).includes(role) ? 'bg-[#D62B2B]/20 text-[#D62B2B] ring-1 ring-[#D62B2B]/40' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
                  >
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#555]">Leave empty to show to all roles.</p>
              {isEdit && recipeQuery.data?.version && (
                <div className="pt-1">
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Version</label>
                  <div className="flex h-9 items-center rounded-lg border border-[#333] bg-[#0D0D0D] px-3 text-sm text-[#666]">v{recipeQuery.data.version}</div>
                </div>
              )}
            </div>
          </Section>

          <Section title="Quality & Media">
            <MarkdownEditor
              value={qualityStandards ?? ''}
              onChange={(v) => setValue('qualityStandards', v, { shouldDirty: true })}
              label="Quality Standards"
              rows={12}
            />

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-[#ccc]">Common Mistakes</label>
                  <button type="button" onClick={() => mistakeFields.append({ value: '' })} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Plus size={13} /> Add</button>
                </div>
                <div className="space-y-2">
                  {mistakeFields.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input {...register(`commonMistakes.${index}.value` as const)} className={fieldClass()} />
                      <button type="button" onClick={() => mistakeFields.remove(index)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-[#ccc]">Photo URLs</label>
                  <button type="button" onClick={() => photoFields.append({ value: '' })} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Plus size={13} /> Add</button>
                </div>
                <div className="space-y-2">
                  {photoFields.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input {...register(`photos.${index}.value` as const)} className={fieldClass()} />
                      <button type="button" onClick={() => photoFields.remove(index)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]"><X size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-[#ccc]">Video URL</label>
                  <input {...register('videoUrl')} className={fieldClass()} />
                </div>
              </div>
            </div>
          </Section>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/store-ops')} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323] disabled:opacity-50">{saveMutation.isPending ? 'Saving...' : 'Save Recipe'}</button>
          </div>
        </form>
      )}

      {/* Quality photos — only after initial save */}
      {isEdit && recipeQuery.data?._id && (
        <QualityPhotosSection
          recipeId={recipeQuery.data._id}
          initialPhotos={recipeQuery.data.qualityPhotos ?? []}
        />
      )}
      {!isEdit && (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#777]">Quality Control Photos</h2>
          <p className="text-sm text-[#555]">Save the recipe first to add quality control photos.</p>
        </div>
      )}
    </div>
  );
}
