import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  FileText,
  Video,
  CheckSquare,
  ClipboardList,
  Award,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { roleManualsApi, type RoleManualSection, type RoleManualItem, type ManualItemType } from '../../api/roleManuals.api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SectionFormModal } from './components/SectionFormModal';
import { ItemFormModal } from './components/ItemFormModal';

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

const TYPE_ICONS: Record<ManualItemType, React.ReactNode> = {
  document: <FileText size={14} />,
  video: <Video size={14} />,
  checklist: <CheckSquare size={14} />,
  assessment: <ClipboardList size={14} />,
  certification: <Award size={14} />,
  reading: <BookOpen size={14} />,
};

export function RoleManualDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<RoleManualSection | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<RoleManualSection | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalSectionId, setItemModalSectionId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<RoleManualItem | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ item: RoleManualItem; sectionId: string } | null>(null);

  const { data: manual, isLoading } = useQuery({
    queryKey: ['role-manuals', id],
    queryFn: async () => {
      const res = await roleManualsApi.getById(id!);
      return res.data.data;
    },
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['role-manuals', id] });

  const addSectionMutation = useMutation({
    mutationFn: (data: { title: string; order: number }) => roleManualsApi.addSection(id!, data),
    onSuccess: (res) => { toast.success(res.data.message || 'Section added'); setSectionModalOpen(false); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to add section'); },
  });

  const updateSectionMutation = useMutation({
    mutationFn: (data: { sectionId: string; title: string; order: number }) =>
      roleManualsApi.updateSection(id!, data.sectionId, { title: data.title, order: data.order }),
    onSuccess: (res) => { toast.success(res.data.message || 'Section updated'); setEditSection(null); setSectionModalOpen(false); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to update section'); },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => roleManualsApi.deleteSection(id!, sectionId),
    onSuccess: () => { toast.success('Section deleted'); setDeleteSectionTarget(null); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to delete section'); },
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: { sectionId: string; data: Parameters<typeof roleManualsApi.addItem>[2] }) =>
      roleManualsApi.addItem(id!, payload.sectionId, payload.data),
    onSuccess: (res) => { toast.success(res.data.message || 'Item added'); setItemModalOpen(false); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to add item'); },
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: { sectionId: string; itemId: string; data: Parameters<typeof roleManualsApi.updateItem>[3] }) =>
      roleManualsApi.updateItem(id!, payload.sectionId, payload.itemId, payload.data),
    onSuccess: (res) => { toast.success(res.data.message || 'Item updated'); setEditItem(null); setItemModalOpen(false); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to update item'); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (payload: { sectionId: string; itemId: string }) =>
      roleManualsApi.deleteItem(id!, payload.sectionId, payload.itemId),
    onSuccess: () => { toast.success('Item deleted'); setDeleteItemTarget(null); invalidate(); },
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Failed to delete item'); },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleSectionSubmit = (data: { title: string; order: number }) => {
    if (editSection) {
      updateSectionMutation.mutate({ sectionId: editSection._id, ...data });
    } else {
      addSectionMutation.mutate(data);
    }
  };

  const handleItemSubmit = (data: Parameters<typeof roleManualsApi.addItem>[2]) => {
    if (editItem && itemModalSectionId) {
      updateItemMutation.mutate({ sectionId: itemModalSectionId, itemId: editItem._id, data });
    } else if (itemModalSectionId) {
      addItemMutation.mutate({ sectionId: itemModalSectionId, data });
    }
  };

  const isSectionMutating = addSectionMutation.isPending || updateSectionMutation.isPending;
  const isItemMutating = addItemMutation.isPending || updateItemMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-[#242424]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[#242424]" />
        {[0, 1].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-[#1a1a1a]" />
        ))}
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-12 text-center">
        <p className="text-[#666]">Manual not found.</p>
      </div>
    );
  }

  const sorted = [...manual.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/role-manuals')}
        className="inline-flex items-center gap-1.5 text-sm text-[#777] hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Role Manuals
      </button>

      {/* Header */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeStyle(manual.targetRole)}`}>
                {manual.targetRole.replace(/_/g, ' ')}
              </span>
              <span className="rounded bg-[#242424] px-2 py-0.5 text-xs text-[#777]">v{manual.version}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${manual.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#333] text-[#666]'}`}>
                {manual.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{manual.title}</h1>
            {manual.description && <p className="text-sm text-[#777]">{manual.description}</p>}
          </div>
          <button
            onClick={() => { setEditSection(null); setSectionModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#B92323]"
          >
            <Plus size={14} />
            Add Section
          </button>
        </div>
      </div>

      {/* Sections */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-12 text-center">
          <p className="text-sm text-[#666]">No sections yet. Click "+ Add Section" to begin building this manual.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((section) => {
            const isOpen = expandedSections.has(section._id);
            const sortedItems = [...section.items].sort((a, b) => a.order - b.order);
            return (
              <div key={section._id} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <button
                    onClick={() => toggleSection(section._id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-sm font-semibold text-white">{section.title}</span>
                    <span className="text-xs text-[#555]">{section.items.length} item{section.items.length !== 1 ? 's' : ''}</span>
                    <span className="ml-auto text-[#555]">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  <div className="ml-3 flex items-center gap-1">
                    <button
                      onClick={() => {
                        setItemModalSectionId(section._id);
                        setEditItem(null);
                        setItemModalOpen(true);
                      }}
                      className="rounded p-1.5 text-[#555] hover:bg-[#242424] hover:text-white"
                      title="Add item"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => { setEditSection(section); setSectionModalOpen(true); }}
                      className="rounded p-1.5 text-[#555] hover:bg-[#242424] hover:text-white"
                      title="Edit section"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteSectionTarget(section)}
                      className="rounded p-1.5 text-[#555] hover:bg-[#242424] hover:text-red-400"
                      title="Delete section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isOpen && (
                  <div className="border-t border-[#242424]">
                    {sortedItems.length === 0 ? (
                      <p className="px-5 py-4 text-xs text-[#555]">No items. Click + to add one.</p>
                    ) : (
                      <div className="divide-y divide-[#242424]">
                        {sortedItems.map((item) => (
                          <ItemRow
                            key={item._id}
                            item={item}
                            onEdit={() => {
                              setItemModalSectionId(section._id);
                              setEditItem(item);
                              setItemModalOpen(true);
                            }}
                            onDelete={() => setDeleteItemTarget({ item, sectionId: section._id })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SectionFormModal
        isOpen={sectionModalOpen}
        onClose={() => { setSectionModalOpen(false); setEditSection(null); }}
        onSubmit={handleSectionSubmit}
        isLoading={isSectionMutating}
        initial={editSection}
        defaultOrder={manual.sections.length}
      />

      <ItemFormModal
        isOpen={itemModalOpen}
        onClose={() => { setItemModalOpen(false); setEditItem(null); setItemModalSectionId(null); }}
        onSubmit={handleItemSubmit}
        isLoading={isItemMutating}
        initial={editItem}
        defaultOrder={
          itemModalSectionId
            ? (manual.sections.find((s) => s._id === itemModalSectionId)?.items.length ?? 0)
            : 0
        }
      />

      <ConfirmDialog
        isOpen={!!deleteSectionTarget}
        title="Delete Section?"
        message={`Section "${deleteSectionTarget?.title}" and all its items will be removed.`}
        onConfirm={() => deleteSectionMutation.mutate(deleteSectionTarget!._id)}
        onClose={() => setDeleteSectionTarget(null)}
        loading={deleteSectionMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteItemTarget}
        title="Delete Item?"
        message={`"${deleteItemTarget?.item.title}" will be permanently removed.`}
        onConfirm={() =>
          deleteItemMutation.mutate({
            sectionId: deleteItemTarget!.sectionId,
            itemId: deleteItemTarget!.item._id,
          })
        }
        onClose={() => setDeleteItemTarget(null)}
        loading={deleteItemMutation.isPending}
      />
    </div>
  );
}

interface ItemRowProps {
  item: RoleManualItem;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemRow({ item, onEdit, onDelete }: ItemRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-[#1f1f1f]">
      <span className="shrink-0 text-[#555]">{TYPE_ICONS[item.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-white truncate">{item.title}</span>
          {item.isRequired && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
              Required
            </span>
          )}
          {item.estimatedMinutes !== undefined && (
            <span className="text-xs text-[#555]">{item.estimatedMinutes} min</span>
          )}
        </div>
        {item.description && <p className="text-xs text-[#555] truncate">{item.description}</p>}
      </div>
      <span className="shrink-0 rounded bg-[#242424] px-1.5 py-0.5 text-[10px] text-[#666] capitalize">
        {item.type}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded p-1 text-[#555] hover:bg-[#242424] hover:text-white"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-[#555] hover:bg-[#242424] hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
