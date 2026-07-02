import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { roleManualsApi, type RoleManual } from '../../api/roleManuals.api';
import { Toggle } from '../../components/ui/Toggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RoleManualFormModal } from './components/RoleManualFormModal';

const STORE_STAFF = ['barista', 'trainee', 'shift_supervisor', 'store_manager', 'assistant_manager'];
const MANAGEMENT = ['area_manager', 'regional_manager', 'coo', 'cfo', 'ceo', 'hr_manager', 'marketing_manager'];
const ADMIN_LEVEL = ['owner'];

function roleBadgeStyle(role: string): string {
  if (ADMIN_LEVEL.includes(role)) return 'bg-red-500/15 text-red-400 border border-red-500/25';
  if (MANAGEMENT.includes(role)) return 'bg-purple-500/15 text-purple-400 border border-purple-500/25';
  if (STORE_STAFF.includes(role)) return 'bg-blue-500/15 text-blue-400 border border-blue-500/25';
  if (role === 'investor') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
  return 'bg-[#333] text-[#aaa]';
}

function totalItems(manual: RoleManual): number {
  return manual.sections.reduce((sum, s) => sum + s.items.length, 0);
}

export function RoleManualsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoleManual | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleManual | null>(null);

  const { data: manuals = [], isLoading } = useQuery({
    queryKey: ['role-manuals'],
    queryFn: async () => {
      const res = await roleManualsApi.getAll();
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: roleManualsApi.create,
    onSuccess: (res) => {
      toast.success(res.data.message || 'Manual created');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['role-manuals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create manual');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof roleManualsApi.update>[1] }) =>
      roleManualsApi.update(id, data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Manual updated');
      setEditTarget(null);
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['role-manuals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update manual');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleManualsApi.remove(id),
    onSuccess: () => {
      toast.success('Manual deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['role-manuals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete manual');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      roleManualsApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-manuals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const handleFormSubmit = (data: {
    targetRole: string;
    title: string;
    description: string;
    version: string;
    isActive: boolean;
  }) => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Role Manuals</h1>
          <p className="mt-1 text-sm text-[#777]">Manage role-specific manuals, videos, and assessments</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          <Plus size={16} />
          New Manual
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
              <div className="mb-3 h-5 w-24 animate-pulse rounded bg-[#242424]" />
              <div className="mb-2 h-4 w-48 animate-pulse rounded bg-[#242424]" />
              <div className="h-3 w-32 animate-pulse rounded bg-[#242424]" />
            </div>
          ))}
        </div>
      ) : manuals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D62B2B]/10">
            <BookMarked size={24} className="text-[#D62B2B]" />
          </div>
          <h2 className="mb-1 text-base font-semibold text-white">No manuals yet</h2>
          <p className="text-sm text-[#666]">Create your first role manual to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {manuals.map((manual) => (
            <ManualCard
              key={manual._id}
              manual={manual}
              onEdit={() => { setEditTarget(manual); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(manual)}
              onView={() => navigate(`/role-manuals/${manual._id}`)}
              onToggleActive={(v) => toggleActiveMutation.mutate({ id: manual._id, isActive: v })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <RoleManualFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        isLoading={isMutating}
        initial={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Manual?"
        message={`"${deleteTarget?.title}" will be permanently deleted.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!._id)}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

interface CardProps {
  manual: RoleManual;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onToggleActive: (v: boolean) => void;
}

function ManualCard({ manual, onEdit, onDelete, onView, onToggleActive }: CardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 gap-3">
      {/* Top: role badge + version */}
      <div className="flex items-center justify-between">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeStyle(manual.targetRole)}`}>
          {manual.targetRole.replace(/_/g, ' ')}
        </span>
        <span className="rounded bg-[#242424] px-2 py-0.5 text-xs text-[#777]">v{manual.version}</span>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-sm font-bold text-white leading-snug">{manual.title}</h3>
        {manual.description && (
          <p className="mt-1 text-xs text-[#666] line-clamp-2">{manual.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-[#777]">
        <span>{manual.sections.length} section{manual.sections.length !== 1 ? 's' : ''}</span>
        <span>{totalItems(manual)} item{totalItems(manual) !== 1 ? 's' : ''}</span>
      </div>

      {/* Footer: toggle + actions */}
      <div className="mt-auto flex items-center justify-between border-t border-[#242424] pt-3">
        <div className="flex items-center gap-2">
          <Toggle checked={manual.isActive} onChange={onToggleActive} />
          <span className="text-xs text-[#666]">{manual.isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="rounded p-1.5 text-[#777] hover:bg-[#242424] hover:text-white"
            title="View"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-[#777] hover:bg-[#242424] hover:text-white"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-[#777] hover:bg-[#242424] hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
