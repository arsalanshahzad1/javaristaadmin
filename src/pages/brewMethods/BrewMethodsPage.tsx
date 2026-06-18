import { useState } from 'react';
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

  const columns = [
    {
      key: 'name',
      label: 'Method',
      render: (m: BrewMethod) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#242424] flex items-center justify-center flex-shrink-0 text-lg leading-none">
            {m.icon || '☕'}
          </div>
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
        <span className="text-sm text-[#999]">
          {formatBrewTime(m.brewTimeMins, m.brewTimeSecs)}
        </span>
      ),
    },
    {
      key: 'equipment',
      label: 'Equipment',
      render: (m: BrewMethod) => {
        const eq = m.equipment ?? [];
        if (eq.length === 0) return <span className="text-sm text-[#555]">—</span>;
        const shown = eq.slice(0, 2);
        const extra = eq.length - 2;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {shown.map((item) => (
              <span
                key={item}
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
          disabled={toggleMutation.isPending}
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
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => setDeleteTarget(m)}
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

      <Card>
        <Table
          columns={columns}
          data={methods}
          keyExtractor={(m) => m._id}
          loading={isLoading}
          emptyMessage="No brew methods found"
        />
      </Card>

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
