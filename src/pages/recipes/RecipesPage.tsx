import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit2, Coffee, BookOpen, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { recipesApi } from '../../api/recipes.api';
import { brewMethodsApi } from '../../api/brewMethods.api';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import type { Recipe, BrewMethod, User } from '../../types';

type ExtRecipe = Recipe & { isPremium?: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyProps(d: string): { variant: 'success' | 'warning' | 'danger'; label: string } {
  if (d === 'beginner') return { variant: 'success', label: 'Easy' };
  if (d === 'intermediate') return { variant: 'warning', label: 'Medium' };
  return { variant: 'danger', label: 'Hard' };
}

function RecipeThumbnail({ src }: { src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#242424]"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-[#242424] flex items-center justify-center flex-shrink-0">
      <Coffee size={16} className="text-[#555]" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  const { page, limit, goToPage, reset } = usePagination();

  const handleSearch = (v: string) => { setSearch(v); reset(); };
  const handleMethod = (v: string) => { setMethodFilter(v); reset(); };
  const handleStatus = (v: string) => { setStatusFilter(v); reset(); };
  const handleType = (v: string) => { setTypeFilter(v); reset(); };

  const { data: methodsData } = useQuery({
    queryKey: ['brew-methods'],
    queryFn: () => brewMethodsApi.getBrewMethods(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-recipes', page, limit, search, methodFilter, statusFilter],
    queryFn: () =>
      recipesApi.getRecipes({
        page,
        limit,
        search: search || undefined,
        brewMethod: methodFilter || undefined,
        isPublished:
          statusFilter === 'published' ? true
          : statusFilter === 'unpublished' ? false
          : undefined,
      }),
  });

  const publishMutation = useMutation({
    mutationFn: ({
      id,
      isPublished,
      isFeatured,
    }: {
      id: string;
      isPublished: boolean;
      isFeatured: boolean;
    }) => recipesApi.publishRecipe(id, isPublished, isFeatured),
    onSuccess: () => {
      toast.success('Recipe updated');
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipesApi.deleteRecipe(id),
    onSuccess: () => {
      toast.success('Recipe deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-recipes'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const allRecipes: ExtRecipe[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;
  const methods: BrewMethod[] = methodsData?.data?.data ?? [];

  const recipes =
    typeFilter === 'premium'
      ? allRecipes.filter((r) => r.isPremium)
      : typeFilter === 'free'
      ? allRecipes.filter((r) => !r.isPremium)
      : allRecipes;

  const columns = [
    {
      key: 'title',
      label: 'Recipe',
      render: (r: ExtRecipe) => (
        <div className="flex items-center gap-3">
          <RecipeThumbnail src={r.image} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate max-w-[200px]">{r.title}</div>
            <div className="text-[11px] text-[#666] mt-0.5">
              {typeof r.brewMethod === 'object' ? (r.brewMethod as BrewMethod).name : '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      render: (r: ExtRecipe) => (
        <span className="text-sm text-[#999]">
          {typeof r.author === 'object' ? (r.author as User).name : '—'}
        </span>
      ),
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (r: ExtRecipe) => (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[#999]">
            <BookOpen size={12} className="text-[#555]" />
            {r.brewCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#999]">
            <Heart size={12} className="text-[#555]" />
            {r.likeCount.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      render: (r: ExtRecipe) => {
        const { variant, label } = difficultyProps(r.difficulty);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (r: ExtRecipe) =>
        r.isPremium ? (
          <Badge variant="warning">Premium</Badge>
        ) : (
          <Badge variant="default">Free</Badge>
        ),
    },
    {
      key: 'isPublished',
      label: 'Published',
      render: (r: ExtRecipe) => (
        <Toggle
          checked={r.isPublished}
          onChange={(v) =>
            publishMutation.mutate({ id: r._id, isPublished: v, isFeatured: r.isFeatured })
          }
          disabled={publishMutation.isPending}
        />
      ),
    },
    {
      key: 'isFeatured',
      label: 'Featured',
      render: (r: ExtRecipe) => (
        <Toggle
          checked={r.isFeatured}
          onChange={(v) =>
            publishMutation.mutate({ id: r._id, isPublished: r.isPublished, isFeatured: v })
          }
          disabled={publishMutation.isPending}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r: ExtRecipe) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/recipes/${r._id}/edit`)}
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recipes"
        description={`${pagination?.total ?? 0} total recipes`}
        action={
          <Button onClick={() => navigate('/recipes/new')}>
            Add Recipe
          </Button>
        }
      />

      <Card>
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by recipe name…"
            className="flex-1 min-w-48 max-w-xs"
          />
          <Select
            value={methodFilter}
            onChange={(e) => handleMethod(e.target.value)}
            options={methods.map((m) => ({ value: m._id, label: m.name }))}
            placeholder="All Methods"
            className="w-44"
          />
          <Select
            value={statusFilter}
            onChange={(e) => handleStatus(e.target.value)}
            options={[
              { value: 'published', label: 'Published' },
              { value: 'unpublished', label: 'Unpublished' },
            ]}
            placeholder="All Status"
            className="w-40"
          />
          <Select
            value={typeFilter}
            onChange={(e) => handleType(e.target.value)}
            options={[
              { value: 'free', label: 'Free' },
              { value: 'premium', label: 'Premium' },
            ]}
            placeholder="All Types"
            className="w-36"
          />
          {pagination && (
            <span className="text-xs text-[#555] ml-auto whitespace-nowrap">
              {recipes.length} of {pagination.total} recipes
            </span>
          )}
        </div>

        <Table
          columns={columns}
          data={recipes}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          emptyMessage="No recipes found"
        />

        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={goToPage}
          />
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete recipe?"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
