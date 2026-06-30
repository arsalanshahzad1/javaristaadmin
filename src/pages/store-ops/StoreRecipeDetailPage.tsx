import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Edit } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import {
  getStoreRecipe,
  getRecipePerformance,
  getStoreOpsErrorMessage,
  type StoreRecipe,
  type StoreAverage,
  type QualityPhoto,
  type RecipePerformanceResponse,
} from '../../api/storeOps.api';

function fieldLabel(text: string) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-[#555]">{text}</p>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#777]">{title}</h2>
      {children}
    </section>
  );
}

// ─── Sizes & Build Order Tabs ─────────────────────────────────────────────────

function SizesSection({ recipe }: { recipe: StoreRecipe }) {
  const [activeSize, setActiveSize] = useState(0);

  if (!recipe.sizes.length) {
    return (
      <SectionCard title="Sizes">
        <p className="text-sm text-[#666]">No sizes defined.</p>
      </SectionCard>
    );
  }

  const size = recipe.sizes[activeSize];

  return (
    <SectionCard title="Sizes & Ingredients">
      <div className="flex flex-wrap gap-2">
        {recipe.sizes.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSize(i)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${i === activeSize ? 'bg-[#D62B2B] text-white' : 'bg-[#222] text-[#888] hover:bg-[#2A2A2A]'}`}
          >
            {s.label || `Size ${i + 1}`}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#262626] bg-[#111] p-4">
        {/* Core measurements */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {size.coffeeDose != null && (
            <div>
              {fieldLabel('Coffee Dose')}
              <p className="mt-0.5 text-sm font-semibold text-white">{size.coffeeDose}g</p>
            </div>
          )}
          {size.waterAmount != null && (
            <div>
              {fieldLabel('Water')}
              <p className="mt-0.5 text-sm font-semibold text-white">{size.waterAmount}ml</p>
            </div>
          )}
          {size.milkAmount != null && (
            <div>
              {fieldLabel('Milk')}
              <p className="mt-0.5 text-sm font-semibold text-white">{size.milkAmount}ml</p>
            </div>
          )}
          {size.syrupAmount != null && (
            <div>
              {fieldLabel('Syrup')}
              <p className="mt-0.5 text-sm font-semibold text-white">
                {size.syrupAmount}ml{size.syrupType ? ` ${size.syrupType}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Structured ingredients */}
        {size.ingredients.length > 0 && (
          <div className="mt-3">
            {fieldLabel('Ingredients')}
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#555]">
                  <th className="pb-2 pr-3 font-medium">Name</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 pr-3 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Optional</th>
                </tr>
              </thead>
              <tbody>
                {size.ingredients.map((ing, i) => (
                  <tr key={i} className="border-b border-[#1A1A1A]">
                    <td className="py-2 pr-3 font-semibold text-white">{ing.name}</td>
                    <td className="py-2 pr-3 text-[#aaa]">{ing.amount}</td>
                    <td className="py-2 pr-3 text-[#aaa]">{ing.unit}</td>
                    <td className="py-2">
                      {ing.isOptional ? (
                        <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] text-[#888]">Optional</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legacy additional ingredients */}
        {size.additionalIngredients.length > 0 && (
          <div className="mt-3">
            {fieldLabel('Additional')}
            <div className="mt-1 space-y-1">
              {size.additionalIngredients.map((ing, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#aaa]">{ing.name}</span>
                  <span className="text-white">{ing.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Quality Control Photos ───────────────────────────────────────────────────

function QualityPhotosSection({ photos }: { photos: QualityPhoto[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const correct = photos.filter((p) => p.type === 'correct');
  const incorrect = photos.filter((p) => p.type === 'incorrect');

  if (!photos.length) return null;

  function PhotoGrid({ items, label, color }: { items: QualityPhoto[]; label: string; color: 'green' | 'red' }) {
    if (!items.length) return null;
    const borderClass = color === 'green' ? 'border-green-900/40' : 'border-red-900/40';
    const labelClass = color === 'green' ? 'text-green-400' : 'text-red-400';
    return (
      <div>
        <p className={`mb-2 text-xs font-semibold ${labelClass}`}>{label}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((photo) => (
            <button
              key={photo._id}
              type="button"
              onClick={() => setLightbox(photo.url)}
              className={`group relative rounded-lg border-2 ${borderClass} overflow-hidden`}
            >
              <img
                src={photo.url}
                alt={photo.caption}
                className={`h-32 w-full object-cover transition-opacity group-hover:opacity-90 ${color === 'red' ? 'brightness-90' : ''}`}
              />
              {color === 'red' && <div className="pointer-events-none absolute inset-0 bg-red-900/15" />}
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5">
                <p className="truncate text-left text-[10px] text-white">{photo.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SectionCard title="Quality Control Photos">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PhotoGrid items={correct} label="✓ Correct Examples" color="green" />
        <PhotoGrid items={incorrect} label="✗ Incorrect Examples" color="red" />
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Quality photo" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </SectionCard>
  );
}

// ─── Performance Section ──────────────────────────────────────────────────────

function PerformanceSection({ recipeId, targetPrepTimeSeconds }: { recipeId: string; targetPrepTimeSeconds?: number }) {
  const perfQuery = useQuery({
    queryKey: ['recipe-performance', recipeId],
    queryFn: () => getRecipePerformance(recipeId),
  });

  if (perfQuery.isLoading) {
    return (
      <SectionCard title="Performance">
        <div className="h-32 animate-pulse rounded-lg bg-[#242424]" />
      </SectionCard>
    );
  }

  if (perfQuery.isError || !perfQuery.data) return null;

  const perf = perfQuery.data as RecipePerformanceResponse;
  const target = targetPrepTimeSeconds;

  function timeBadge(avg: number) {
    if (!target) return <span className="text-white">{avg}s</span>;
    const isGood = avg <= target;
    const isWarning = !isGood && avg <= target + 30;
    return (
      <span className={`font-semibold ${isGood ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400'}`}>
        {avg}s {isGood ? '✓' : `+${avg - target}s`}
      </span>
    );
  }

  function StoreTable({ stores, heading }: { stores: StoreAverage[]; heading: string }) {
    if (!stores.length) return null;
    return (
      <div>
        <p className="mb-2 text-xs font-semibold text-[#777]">{heading}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-left text-xs text-[#555]">
              <th className="pb-2 pr-4 font-medium">Store</th>
              <th className="pb-2 pr-4 font-medium">Avg Time</th>
              <th className="pb-2 font-medium">Samples</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.storeId} className="border-b border-[#1A1A1A]">
                <td className="py-2 pr-4 text-[#aaa]">{s.storeId}</td>
                <td className="py-2 pr-4">{timeBadge(s.avgPrepSeconds)}</td>
                <td className="py-2 text-[#666]">{s.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <SectionCard title="Prep Time Performance">
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {target != null && (
          <div>
            {fieldLabel('Target')}
            <p className="mt-0.5 text-sm font-semibold text-white">{target}s</p>
          </div>
        )}
        {perf.performanceData.companyAvgPrepSeconds != null && (
          <div>
            {fieldLabel('Company Avg')}
            <p className="mt-0.5 text-sm font-semibold text-white">{perf.performanceData.companyAvgPrepSeconds}s</p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <StoreTable stores={perf.top5Fastest} heading="5 Fastest Stores" />
        <StoreTable stores={perf.top5Slowest} heading="5 Slowest Stores" />
      </div>
    </SectionCard>
  );
}

// ─── Cost Info ────────────────────────────────────────────────────────────────

function CostSection({ recipe }: { recipe: StoreRecipe }) {
  const c = recipe.costInfo;
  if (!c.ingredientCost && !c.sellingPrice && !c.totalCost) return null;

  function marginBadge(margin: number) {
    const variant = margin >= 60 ? 'success' : margin >= 40 ? 'warning' : 'danger';
    return <Badge variant={variant}>{margin.toFixed(1)}%</Badge>;
  }

  return (
    <SectionCard title="Cost Info">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {c.ingredientCost != null && (
          <div>
            {fieldLabel('Ingredient Cost')}
            <p className="mt-0.5 text-sm font-semibold text-white">${c.ingredientCost.toFixed(2)}</p>
          </div>
        )}
        {c.laborCost != null && (
          <div>
            {fieldLabel('Labor Cost')}
            <p className="mt-0.5 text-sm font-semibold text-white">${c.laborCost.toFixed(2)}</p>
          </div>
        )}
        {c.totalCost != null && (
          <div>
            {fieldLabel('Total Cost')}
            <p className="mt-0.5 text-sm font-semibold text-white">${c.totalCost.toFixed(2)}</p>
          </div>
        )}
        {c.sellingPrice != null && (
          <div>
            {fieldLabel('Selling Price')}
            <p className="mt-0.5 text-sm font-semibold text-green-400">${c.sellingPrice.toFixed(2)}</p>
          </div>
        )}
        {c.margin != null && (
          <div>
            {fieldLabel('Margin')}
            <div className="mt-1">{marginBadge(c.margin)}</div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StoreRecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const recipeQuery = useQuery({
    queryKey: ['store-recipe', slug],
    queryFn: () => getStoreRecipe(slug ?? ''),
    enabled: Boolean(slug),
  });

  if (recipeQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-[#1A1A1A]" />)}
      </div>
    );
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-6 text-center">
        <p className="text-red-300">{getStoreOpsErrorMessage(recipeQuery.error)}</p>
        <button type="button" onClick={() => recipeQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-4 py-2 text-xs text-red-200 hover:bg-red-900/20">Try again</button>
      </div>
    );
  }

  const recipe = recipeQuery.data as StoreRecipe;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/store-ops')}
            className="mb-3 inline-flex items-center gap-1 text-xs text-[#777] hover:text-white"
          >
            <ArrowLeft size={12} /> Back to recipes
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{recipe.category}</Badge>
            {recipe.stationAssignment && <Badge variant="default">{recipe.stationAssignment}</Badge>}
            {recipe.version && <Badge variant="default">v{recipe.version}</Badge>}
            <Badge variant={recipe.isActive ? 'success' : 'default'}>{recipe.isActive ? 'Active' : 'Inactive'}</Badge>
            {recipe.certificationRequired && <Badge variant="warning">Cert Required</Badge>}
            {(recipe.qualityPhotos?.length ?? 0) > 0 && (
              <Badge variant="info">{recipe.qualityPhotos.length} QC photos</Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">{recipe.name}</h1>
          <p className="mt-0.5 text-sm text-[#666]">{recipe.slug}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/store-ops/recipes/${recipe.slug}/edit`)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ddd] hover:bg-[#242424]"
        >
          <Edit size={14} /> Edit
        </button>
      </div>

      {/* Target prep time */}
      {recipe.targetPrepTimeSeconds && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-sm text-white">
          <Clock size={14} className="text-[#D62B2B]" />
          Target prep time: <span className="font-semibold">{recipe.targetPrepTimeSeconds}s</span>
        </div>
      )}

      <SizesSection recipe={recipe} />

      {/* Build Order */}
      {recipe.buildOrder.length > 0 && (
        <SectionCard title="Build Order">
          <ol className="space-y-2">
            {recipe.buildOrder.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D62B2B]/15 text-xs font-bold text-[#D62B2B]">{i + 1}</span>
                <span className="text-sm leading-6 text-[#ddd]">{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      <QualityPhotosSection photos={recipe.qualityPhotos ?? []} />

      <PerformanceSection recipeId={recipe._id} targetPrepTimeSeconds={recipe.targetPrepTimeSeconds} />

      <CostSection recipe={recipe} />

      {/* Certifications */}
      {recipe.certificationRequired && recipe.requiredCertifications.length > 0 && (
        <SectionCard title="Required Certifications">
          <div className="flex flex-wrap gap-2">
            {recipe.requiredCertifications.map((cert) => (
              <span key={cert} className="rounded-full bg-yellow-900/20 px-3 py-1 text-xs font-medium text-yellow-400 ring-1 ring-yellow-700/40">
                {cert.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Quality Standards */}
      {recipe.qualityStandards && (
        <SectionCard title="Quality Standards">
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#ccc]">{recipe.qualityStandards}</p>
        </SectionCard>
      )}

      {/* Common Mistakes */}
      {recipe.commonMistakes.length > 0 && (
        <SectionCard title="Common Mistakes">
          <ul className="space-y-2">
            {recipe.commonMistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                <span className="mt-0.5 text-[#D62B2B]">⚠</span> {m}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Required Equipment */}
      {recipe.requiredEquipment.length > 0 && (
        <SectionCard title="Required Equipment">
          <div className="flex flex-wrap gap-2">
            {recipe.requiredEquipment.map((e) => (
              <span key={e} className="rounded-lg border border-[#2A2A2A] bg-[#222] px-3 py-1 text-xs text-[#ccc]">{e}</span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
