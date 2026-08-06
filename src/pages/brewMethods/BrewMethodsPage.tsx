import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { brewMethodsApi } from '../../api/brewMethods.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { formatDuration } from '../../utils/formatters';
import type { BrewMethod } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyProps(d?: string): {
  variant: 'success' | 'warning' | 'danger' | 'default';
  label: string;
} {
  if (d === 'easy') return { variant: 'success', label: 'Easy' };
  if (d === 'medium') return { variant: 'warning', label: 'Medium' };
  if (d === 'hard') return { variant: 'danger', label: 'Hard' };
  return { variant: 'default', label: '—' };
}

function formatBrewTime(mins?: number, secs?: number): string {
  const totalSecs = (mins ?? 0) * 60 + (secs ?? 0);
  if (totalSecs === 0) return '—';
  return `${formatDuration(totalSecs)} min`;
}

function MethodIcon({ method, size = 'sm' }: { method: BrewMethod; size?: 'sm' | 'md' }) {
  const raw = (method.icon ?? '').trim();
  const isGlyph = raw.length > 0 && !/[A-Za-z0-9]/.test(raw) && [...raw].length <= 4;
  const content = isGlyph ? raw : method.name?.trim()?.[0]?.toUpperCase() || '☕';
  const box = size === 'md' ? 'w-10 h-10 text-xl' : 'w-9 h-9 text-lg';
  return (
    <div
      className={`${box} rounded-lg bg-[#242424] flex items-center justify-center flex-shrink-0 leading-none overflow-hidden font-medium text-white/90`}
      aria-hidden="true"
    >
      {content}
    </div>
  );
}

// ─── Mobile card view ───────────────────────────────────────────────────────────

interface BrewMethodCardProps {
  method: BrewMethod;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (value: boolean) => void;
  toggling: boolean;
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[#555] mb-1">{label}</div>
      <div className="text-sm text-[#999] truncate">{children}</div>
    </div>
  );
}

function BrewMethodCard({ method, onEdit, onDelete, onToggle, toggling }: BrewMethodCardProps) {
  const { variant, label } = difficultyProps(method.difficulty);
  const equipment = method.requiredEquipment ?? [];
  const recipeCount = method.recipeCount ?? 0;

  return (
    <Card className="p-4">
      {/* Header: identity + row actions */}
      <div className="flex items-start gap-3">
        <MethodIcon method={method} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">{method.name}</div>
          <div className="text-[11px] text-[#555] mt-0.5 font-mono truncate">{method.slug}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit method">
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={onDelete}
            aria-label="Delete method"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <MetaCell label="Difficulty">
          <Badge variant={variant}>{label}</Badge>
        </MetaCell>
        <MetaCell label="Ratio">{method.ratio || '—'}</MetaCell>
        <MetaCell label="Brew Time">
          {formatBrewTime(method.brewTimeMins, method.brewTimeSecs)}
        </MetaCell>
        <MetaCell label="Recipes">
          {recipeCount > 0 ? (
            <Link
              to={`/recipes?method=${method._id}`}
              className="text-[#D62B2B] hover:text-[#E84040] transition-colors"
            >
              {recipeCount}
            </Link>
          ) : (
            <span className="text-[#555]">0</span>
          )}
        </MetaCell>
      </div>

      {/* Equipment: full list on mobile — vertical space is cheap here */}
      {equipment.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-[#555] mb-1.5">Equipment</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {equipment.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="px-2 py-0.5 rounded-md bg-[#242424] text-xs text-[#999] border border-[#2A2A2A]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status footer */}
      <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
        <span className="text-sm text-[#999]">Status</span>
        <Toggle checked={method.isActive} onChange={onToggle} disabled={toggling} />
      </div>
    </Card>
  );
}

function BrewMethodCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#242424]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-[#242424]" />
          <div className="h-2 w-1/4 rounded bg-[#1E1E1E]" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-[#1E1E1E]" />
        ))}
      </div>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BrewMethodsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<BrewMethod | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['brew-methods'],
    queryFn: () => brewMethodsApi.getBrewMethods(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      brewMethodsApi.updateBrewMethod(id, { isActive }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['brew-methods'] });
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brewMethodsApi.deleteBrewMethod(id),
    onSuccess: () => {
      toast.success('Brew method deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['brew-methods'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const methods: BrewMethod[] = data?.data?.data ?? [];

  // Only disable the row whose toggle is actually in flight — not the whole list.
  const isToggling = (id: string) =>
    toggleMutation.isPending && toggleMutation.variables?.id === id;

  const columns = [
    {
      key: 'name',
      label: 'Method',
      render: (m: BrewMethod) => (
        <div className="flex items-center gap-3">
          <MethodIcon method={m} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white">{m.name}</div>
            <div className="text-[11px] text-[#555] mt-0.5 font-mono">{m.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      render: (m: BrewMethod) => {
        const { variant, label } = difficultyProps(m.difficulty);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'ratio',
      label: 'Ratio',
      render: (m: BrewMethod) => (
        <span className="text-sm text-[#999]">{m.ratio || '—'}</span>
      ),
    },
    {
      key: 'brewTime',
      label: 'Brew Time',
      render: (m: BrewMethod) => (
        <span className="text-sm text-[#999] whitespace-nowrap">
          {formatBrewTime(m.brewTimeMins, m.brewTimeSecs)}
        </span>
      ),
    },
    {
      key: 'equipment',
      label: 'Equipment',
      render: (m: BrewMethod) => {
        const eq = m.requiredEquipment ?? [];
        if (eq.length === 0) return <span className="text-sm text-[#555]">—</span>;
        const shown = eq.slice(0, 2);
        const extra = eq.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {shown.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="px-2 py-0.5 rounded-md bg-[#242424] text-xs text-[#999] border border-[#2A2A2A]"
              >
                {item}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs text-[#555]">+{extra} more</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (m: BrewMethod) => (
        <Toggle
          checked={m.isActive}
          onChange={(v) => toggleMutation.mutate({ id: m._id, isActive: v })}
          disabled={isToggling(m._id)}
        />
      ),
    },
    {
      key: 'recipes',
      label: 'Recipes',
      render: (m: BrewMethod) => {
        const count = m.recipeCount ?? 0;
        return count > 0 ? (
          <Link
            to={`/recipes?method=${m._id}`}
            className="text-sm text-[#D62B2B] hover:text-[#E84040] transition-colors"
          >
            {count}
          </Link>
        ) : (
          <span className="text-sm text-[#555]">0</span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (m: BrewMethod) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/brew-methods/${m._id}/edit`)}
            aria-label="Edit method"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => setDeleteTarget(m)}
            aria-label="Delete method"
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
        title="Brew Methods"
        description={`${methods.length} method${methods.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => navigate('/brew-methods/new')}>
            Add Method
          </Button>
        }
      />

      {/* Wide screens (lg+): full data table. overflow-x-auto is a safety net
          for the ~1024–1200px band where 8 columns can still get tight. */}
      <Card className="hidden lg:block">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={methods}
            keyExtractor={(m) => m._id}
            loading={isLoading}
            emptyMessage="No brew methods found"
          />
        </div>
      </Card>

      {/* Narrow screens: stacked cards. */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <>
            <BrewMethodCardSkeleton />
            <BrewMethodCardSkeleton />
            <BrewMethodCardSkeleton />
          </>
        ) : methods.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[#555]">
            No brew methods found
          </Card>
        ) : (
          methods.map((m) => (
            <BrewMethodCard
              key={m._id}
              method={m}
              onEdit={() => navigate(`/brew-methods/${m._id}/edit`)}
              onDelete={() => setDeleteTarget(m)}
              onToggle={(v) => toggleMutation.mutate({ id: m._id, isActive: v })}
              toggling={isToggling(m._id)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete brew method?"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}