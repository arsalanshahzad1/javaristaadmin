import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Camera, Clock, Edit, Plus, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { useDebounce } from '../../hooks/useDebounce';
import {
  getStoreOpsErrorMessage,
  getStoreRecipes,
  updateStoreRecipe,
  type StoreRecipe,
  type StoreRecipeCategory,
} from '../../api/storeOps.api';

type CategoryFilter = StoreRecipeCategory | '';

const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'hot', label: 'Hot' },
  { value: 'iced', label: 'Iced' },
  { value: 'blended', label: 'Blended' },
  { value: 'matcha', label: 'Matcha' },
  { value: 'hojicha', label: 'Hojicha' },
  { value: 'food', label: 'Food' },
];

function labelFor(category: StoreRecipeCategory) {
  return categoryOptions.find((item) => item.value === category)?.label ?? category;
}

function RecipeSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]" />
      ))}
    </div>
  );
}

function RecipeCard({ recipe, onEdit, onDetail, onToggle, isToggling }: {
  recipe: StoreRecipe;
  onEdit: () => void;
  onDetail: () => void;
  onToggle: () => void;
  isToggling: boolean;
}) {
  const preview = recipe.buildOrder?.[0] || 'No build steps added yet.';
  const qualityPhotoCount = recipe.qualityPhotos?.length ?? 0;

  return (
    <article className="flex min-h-56 flex-col rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onDetail}
            className="truncate text-base font-semibold text-white hover:text-[#D62B2B] text-left"
          >
            {recipe.name}
          </button>
          <p className="mt-1 truncate text-xs text-[#666]">{recipe.slug}</p>
        </div>
        <Badge variant={recipe.isActive ? 'success' : 'default'}>{recipe.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="info">{labelFor(recipe.category)}</Badge>
        <span className="inline-flex items-center gap-1 rounded border border-[#333] px-2 py-0.5 text-xs text-[#aaa]">
          <Clock size={12} />
          {recipe.targetPrepTimeSeconds ? `${recipe.targetPrepTimeSeconds}s` : 'No target'}
        </span>
        {recipe.stationAssignment && (
          <span className="rounded border border-[#2A2A2A] bg-[#222] px-2 py-0.5 text-xs text-[#888]">{recipe.stationAssignment}</span>
        )}
        {recipe.version && (
          <span className="rounded bg-[#1E1E1E] px-1.5 py-0.5 text-xs text-[#555]">v{recipe.version}</span>
        )}
        {qualityPhotoCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-blue-900/40 bg-blue-900/10 px-2 py-0.5 text-xs text-blue-400">
            <Camera size={10} /> {qualityPhotoCount} QC
          </span>
        )}
        {recipe.certificationRequired && (
          <span className="inline-flex items-center gap-1 rounded border border-yellow-900/40 bg-yellow-900/10 px-2 py-0.5 text-xs text-yellow-400">
            <Award size={10} /> Cert Required
          </span>
        )}
      </div>

      <div className="mt-4 flex-1 rounded-lg border border-[#262626] bg-[#111] p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#555]">First Step</p>
        <p className="line-clamp-3 text-sm leading-6 text-[#ddd]">{preview}</p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]">
          <Edit size={13} />
          Edit
        </button>
        <button type="button" disabled={isToggling} onClick={onToggle} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50">
          <RefreshCw size={13} />
          Toggle Active
        </button>
      </div>
    </article>
  );
}

export function StoreOpsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('');
  const debouncedSearch = useDebounce(search, 300);

  const recipesQuery = useQuery({
    queryKey: ['store-recipes', debouncedSearch, category],
    queryFn: () => getStoreRecipes({
      search: debouncedSearch,
      category: category || undefined,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: (recipe: StoreRecipe) => updateStoreRecipe(recipe.slug, { isActive: !recipe.isActive }),
    onSuccess: (response) => {
      toast.success(response.message || 'Recipe updated');
      queryClient.invalidateQueries({ queryKey: ['store-recipes'] });
    },
    onError: (error) => toast.error(getStoreOpsErrorMessage(error)),
  });

  const recipes = recipesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Store Operations</h1>
          <p className="mt-1 text-sm text-[#777]">Manage store recipe specs, build order, cost, and media.</p>
        </div>
        <button type="button" onClick={() => navigate('/store-ops/recipes/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
          <Plus size={16} />
          New Recipe
        </button>
      </div>

      <section className="rounded-lg border border-[#2A2A2A] bg-[#171717] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipes"
              className="w-full rounded-lg border border-[#333] bg-[#111] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
            />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            {categoryOptions.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </section>

      {recipesQuery.isError ? (
        <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
          <p className="text-red-300">{getStoreOpsErrorMessage(recipesQuery.error)}</p>
          <button type="button" onClick={() => recipesQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">Try again</button>
        </div>
      ) : recipesQuery.isLoading ? (
        <RecipeSkeletonGrid />
      ) : recipes.length === 0 ? (
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-14 text-center">
          <p className="text-sm font-medium text-white">No store recipes found</p>
          <p className="mt-1 text-sm text-[#777]">Create a recipe or adjust the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe._id}
              recipe={recipe}
              onDetail={() => navigate(`/store-ops/recipes/${recipe.slug}/detail`)}
              onEdit={() => navigate(`/store-ops/recipes/${recipe.slug}/edit`)}
              onToggle={() => toggleMutation.mutate(recipe)}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
