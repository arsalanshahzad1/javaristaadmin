import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { MarkdownEditor } from '../../components/ui/MarkdownEditor';
import {
  createStoreRecipe,
  getStoreOpsErrorMessage,
  getStoreRecipe,
  updateStoreRecipe,
  type StoreRecipeCategory,
  type StoreRecipePayload,
} from '../../api/storeOps.api';

type TextRow = { value: string };
type SizeFormValue = {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: { name: string; amount: string }[];
};
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
    sellingPrice?: number;
  };
  qualityStandards: string;
  commonMistakes: TextRow[];
  photos: TextRow[];
  videoUrl: string;
};

const categoryOptions: { value: StoreRecipeCategory; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'iced', label: 'Iced' },
  { value: 'blended', label: 'Blended' },
  { value: 'matcha', label: 'Matcha' },
  { value: 'hojicha', label: 'Hojicha' },
  { value: 'food', label: 'Food' },
];

const emptySize: SizeFormValue = {
  label: '',
  coffeeDose: undefined,
  waterAmount: undefined,
  milkAmount: undefined,
  syrupAmount: undefined,
  syrupType: '',
  additionalIngredients: [],
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
  costInfo: { ingredientCost: undefined, sellingPrice: undefined },
  qualityStandards: '',
  commonMistakes: [{ value: '' }],
  photos: [{ value: '' }],
  videoUrl: '',
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
      })),
    buildOrder: cleanTextRows(values.buildOrder),
    costInfo: {
      ingredientCost: cleanNumber(values.costInfo.ingredientCost),
      sellingPrice: cleanNumber(values.costInfo.sellingPrice),
    },
    qualityStandards: values.qualityStandards,
    commonMistakes: cleanTextRows(values.commonMistakes),
    photos: cleanTextRows(values.photos),
    videoUrl: values.videoUrl.trim() || undefined,
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
    formState: { errors },
  } = useForm<StoreRecipeFormValues>({ defaultValues: emptyForm });

  const sizeFields = useFieldArray({ control, name: 'sizes' });
  const stepFields = useFieldArray({ control, name: 'buildOrder' });
  const mistakeFields = useFieldArray({ control, name: 'commonMistakes' });
  const photoFields = useFieldArray({ control, name: 'photos' });
  const equipment = useWatch({ control, name: 'requiredEquipment' });
  const sizes = useWatch({ control, name: 'sizes' });
  const qualityStandards = useWatch({ control, name: 'qualityStandards' });
  const costInfo = useWatch({ control, name: 'costInfo' });
  const margin = useMemo(() => {
    const ingredientCost = Number(costInfo?.ingredientCost);
    const sellingPrice = Number(costInfo?.sellingPrice);
    if (!Number.isFinite(ingredientCost) || !Number.isFinite(sellingPrice) || sellingPrice <= 0) return '-';
    return `${(((sellingPrice - ingredientCost) / sellingPrice) * 100).toFixed(1)}%`;
  }, [costInfo]);

  useEffect(() => {
    if (!recipeQuery.data) return;
    reset({
      name: recipeQuery.data.name,
      slug: recipeQuery.data.slug,
      category: recipeQuery.data.category,
      targetPrepTimeSeconds: recipeQuery.data.targetPrepTimeSeconds,
      requiredEquipment: recipeQuery.data.requiredEquipment ?? [],
      isActive: recipeQuery.data.isActive,
      sizes: recipeQuery.data.sizes ?? [],
      buildOrder: recipeQuery.data.buildOrder?.length ? recipeQuery.data.buildOrder.map((value) => ({ value })) : [{ value: '' }],
      costInfo: {
        ingredientCost: recipeQuery.data.costInfo?.ingredientCost,
        sellingPrice: recipeQuery.data.costInfo?.sellingPrice,
      },
      qualityStandards: recipeQuery.data.qualityStandards ?? '',
      commonMistakes: recipeQuery.data.commonMistakes?.length ? recipeQuery.data.commonMistakes.map((value) => ({ value })) : [{ value: '' }],
      photos: recipeQuery.data.photos?.length ? recipeQuery.data.photos.map((value) => ({ value })) : [{ value: '' }],
      videoUrl: recipeQuery.data.videoUrl ?? '',
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

  function addIngredient(sizeIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = {
      ...selectedSize,
      additionalIngredients: [...selectedSize.additionalIngredients, { name: '', amount: '' }],
    };
    setValue('sizes', nextSizes, { shouldDirty: true });
  }

  function removeIngredient(sizeIndex: number, ingredientIndex: number) {
    const currentSizes = getValues('sizes');
    const selectedSize = currentSizes[sizeIndex];
    if (!selectedSize) return;
    const nextSizes = [...currentSizes];
    nextSizes[sizeIndex] = {
      ...selectedSize,
      additionalIngredients: selectedSize.additionalIngredients.filter((_, index) => index !== ingredientIndex),
    };
    setValue('sizes', nextSizes, { shouldDirty: true });
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
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Target Prep Time in seconds</label>
                <input type="number" min="0" {...register('targetPrepTimeSeconds', numberRegisterOptions())} className={fieldClass()} />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[#ccc]">Required Equipment</label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-[#333] bg-[#111] p-2">
                {(equipment ?? []).map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded bg-[#2E2E2E] px-2 py-1 text-xs text-[#ddd]">
                    {item}
                    <button type="button" onClick={() => setValue('requiredEquipment', (equipment ?? []).filter((value) => value !== item), { shouldDirty: true })}><X size={12} /></button>
                  </span>
                ))}
                <input value={equipmentInput} onChange={(event) => setEquipmentInput(event.target.value)} onKeyDown={handleEquipmentKeyDown} onBlur={addEquipment} placeholder="Type and press Enter" className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm text-white outline-none" />
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
                      <Trash2 size={13} />
                      Delete size
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Size label</label>
                      <input {...register(`sizes.${sizeIndex}.label` as const)} placeholder="Small / Medium / Large" className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Coffee Dose in grams</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.coffeeDose` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Water Amount in ml</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.waterAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Milk Amount in ml</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.milkAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Syrup Amount in ml</label>
                      <input type="number" step="0.1" {...register(`sizes.${sizeIndex}.syrupAmount` as const, numberRegisterOptions())} className={fieldClass()} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#ccc]">Syrup Type</label>
                      <input {...register(`sizes.${sizeIndex}.syrupType` as const)} className={fieldClass()} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-[#ccc]">Additional Ingredients</label>
                      <button type="button" onClick={() => addIngredient(sizeIndex)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]">
                        <Plus size={13} />
                        Add Ingredient
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(sizes?.[sizeIndex]?.additionalIngredients ?? []).map((_, ingredientIndex) => (
                        <div key={ingredientIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input {...register(`sizes.${sizeIndex}.additionalIngredients.${ingredientIndex}.name` as const)} placeholder="Name" className={fieldClass()} />
                          <input {...register(`sizes.${sizeIndex}.additionalIngredients.${ingredientIndex}.amount` as const)} placeholder="Amount" className={fieldClass()} />
                          <button type="button" onClick={() => removeIngredient(sizeIndex, ingredientIndex)} className="rounded-lg border border-[#333] px-3 text-[#ddd] hover:bg-[#242424]">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => sizeFields.append({ ...emptySize, additionalIngredients: [] })} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-sm text-[#ddd] hover:bg-[#242424]">
                <Plus size={14} />
                Add Size
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
                <Plus size={14} />
                Add Step
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
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Selling Price</label>
                <input type="number" step="0.01" {...register('costInfo.sellingPrice', numberRegisterOptions())} className={fieldClass()} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#ccc]">Margin</label>
                <input value={margin} readOnly className={`${fieldClass()} text-[#aaa]`} />
              </div>
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
    </div>
  );
}
