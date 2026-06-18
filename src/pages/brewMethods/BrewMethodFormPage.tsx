import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { brewMethodsApi } from '../../api/brewMethods.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Method name is required'),
  icon: z.string().optional(),
  description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  ratio: z.string().optional(),
  brewTimeMins: z.coerce.number().min(0).max(99).default(0),
  brewTimeSecs: z.coerce.number().min(0).max(59).default(0),
  grindSize: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

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

export function BrewMethodFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Equipment list managed outside RHF (same pattern as tags in RecipeFormPage)
  const [equipment, setEquipment] = useState<string[]>([]);
  const [equipInput, setEquipInput] = useState('');
  const equipInputRef = useRef<HTMLInputElement>(null);

  // ── Query (edit mode) ─────────────────────────────────────────────────────

  const { data: methodData, isLoading: methodLoading } = useQuery({
    queryKey: ['brew-method', id],
    queryFn: () => brewMethodsApi.getBrewMethodById(id!),
    enabled: isEdit,
  });

  const existingMethod = methodData?.data?.data;

  // ── Form ──────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brewTimeMins: 0,
      brewTimeSecs: 0,
    },
  });

  useEffect(() => {
    if (!existingMethod) return;
    const m = existingMethod;
    reset({
      name: m.name,
      icon: m.icon ?? '',
      description: m.description ?? '',
      difficulty: m.difficulty,
      ratio: m.ratio ?? '',
      brewTimeMins: m.brewTimeMins ?? 0,
      brewTimeSecs: m.brewTimeSecs ?? 0,
      grindSize: m.grindSize ?? '',
    });
    setEquipment(m.equipment ?? []);
  }, [existingMethod, reset]);

  // ── Equipment handlers ────────────────────────────────────────────────────

  const addEquipment = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !equipment.includes(trimmed)) {
      setEquipment((prev) => [...prev, trimmed]);
    }
    setEquipInput('');
    equipInputRef.current?.focus();
  };

  const removeEquipment = (item: string) =>
    setEquipment((prev) => prev.filter((e) => e !== item));

  // ── Mutation ──────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        icon: values.icon || undefined,
        description: values.description || undefined,
        difficulty: values.difficulty,
        ratio: values.ratio || undefined,
        brewTimeMins: values.brewTimeMins,
        brewTimeSecs: values.brewTimeSecs,
        grindSize: values.grindSize || undefined,
        equipment,
      };
      return isEdit
        ? brewMethodsApi.updateBrewMethod(id!, payload)
        : brewMethodsApi.createBrewMethod(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Brew method updated' : 'Brew method created');
      queryClient.invalidateQueries({ queryKey: ['brew-methods'] });
      navigate('/brew-methods');
    },
    onError: () => toast.error(isEdit ? 'Failed to update' : 'Failed to create'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const watchedName = watch('name') ?? '';
  const slugPreview = toSlug(watchedName);

  if (isEdit && methodLoading) return <PageSpinner />;

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title={isEdit ? 'Edit Brew Method' : 'Add Brew Method'}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/brew-methods')}>
            <ArrowLeft size={14} />
            Back
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="max-w-2xl space-y-5"
      >
        {/* ── Basic Info ──────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Basic Info</SectionTitle>
          <div className="space-y-4">
            {/* Name + slug preview */}
            <div className="flex flex-col gap-1.5">
              <Input
                label="Method Name"
                placeholder="e.g. V60 Pour Over"
                error={errors.name?.message}
                {...register('name')}
              />
              {watchedName && (
                <span className="text-xs text-[#555]">
                  slug:{' '}
                  <span className="font-mono text-[#666]">{slugPreview}</span>
                </span>
              )}
            </div>

            <Input
              label="Icon"
              placeholder="Emoji or icon name, e.g. ☕"
              {...register('icon')}
            />

            <Textarea
              label="Description"
              placeholder="Describe this brew method…"
              rows={3}
              {...register('description')}
            />

            <Select
              label="Difficulty"
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              placeholder="Select difficulty"
              error={errors.difficulty?.message}
              {...register('difficulty')}
            />
          </div>
        </Card>

        {/* ── Brew Parameters ─────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Brew Parameters</SectionTitle>
          <div className="space-y-4">
            <Input
              label="Coffee-to-Water Ratio"
              placeholder="e.g. 16:1"
              {...register('ratio')}
            />

            {/* Brew time — side by side */}
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
              </div>
            </div>

            <Input
              label="Recommended Grind Size"
              placeholder="e.g. Medium-coarse"
              {...register('grindSize')}
            />
          </div>
        </Card>

        {/* ── Required Equipment ──────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Required Equipment</SectionTitle>

          {/* Add input */}
          <div className="flex gap-2">
            <input
              ref={equipInputRef}
              value={equipInput}
              onChange={(e) => setEquipInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEquipment(equipInput);
                }
              }}
              placeholder="e.g. V60 dripper"
              className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm
                text-white placeholder-[#555] outline-none focus:border-[#D62B2B] transition-colors"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addEquipment(equipInput)}
              disabled={!equipInput.trim()}
            >
              <Plus size={14} />
              Add
            </Button>
          </div>

          {/* Chips */}
          {equipment.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {equipment.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                    bg-[#242424] border border-[#2A2A2A] text-sm text-[#999]"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeEquipment(item)}
                    className="text-[#555] hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* ── Sticky bottom bar ────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2A2A2A] bg-[#111]/95 backdrop-blur-sm">
          <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/brew-methods')}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Save Method'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
