import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';

type Category = 'recipe' | 'procedure' | 'checklist_template' | 'troubleshooting' | 'standard' | 'training';
type Role = 'community' | 'investor' | 'employee';
type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};
type Playbook = {
  _id: string;
  title: string;
  slug: string;
  category: Category;
  tags: string[];
  requiredRole: Role;
  isActive: boolean;
  createdAt: string;
};

const categoryOptions: { value: Category; label: string }[] = [
  { value: 'recipe', label: 'Recipe' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'checklist_template', label: 'Checklist Template' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'standard', label: 'Standard' },
  { value: 'training', label: 'Training' },
];
const roles: Role[] = ['community', 'investor', 'employee'];

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function labelFor(value: string) {
  return categoryOptions.find((item) => item.value === value)?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}

async function getPlaybooks(params: { search?: string; category?: string; requiredRole?: string; includeInactive?: boolean }) {
  const response = await adminApiClient.get<ApiEnvelope<Playbook[]>>('/playbooks', {
    params: { ...params, includeInactive: params.includeInactive ? 'true' : undefined, limit: 50 },
  });
  return response.data;
}

async function updatePlaybookActive(payload: { slug: string; isActive: boolean }) {
  const response = await adminApiClient.put<ApiEnvelope<Playbook>>(`/playbooks/${payload.slug}`, {
    isActive: payload.isActive,
  });
  return response.data;
}

async function deletePlaybook(slug: string) {
  const response = await adminApiClient.delete<ApiEnvelope<unknown>>(`/playbooks/${slug}`);
  return response.data;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PlaybooksManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [requiredRole, setRequiredRole] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Playbook | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const playbooksQuery = useQuery({
    queryKey: ['playbooks', debouncedSearch, category, requiredRole, showInactive],
    queryFn: () => getPlaybooks({
      search: debouncedSearch || undefined,
      category: category || undefined,
      requiredRole: requiredRole || undefined,
      includeInactive: showInactive,
    }),
  });

  const toggleMutation = useMutation({
    mutationFn: updatePlaybookActive,
    onSuccess: (response) => {
      toast.success(response.message || 'Playbook updated');
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlaybook,
    onSuccess: (response) => {
      toast.success(response.message || 'Playbook deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const playbooks = playbooksQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks</h1>
          <p className="mt-1 text-sm text-[#777]">Manage operational knowledge and training content.</p>
        </div>
        <button type="button" onClick={() => navigate('/playbooks/new')} className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]">
          <Plus size={16} />
          New Playbook
        </button>
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2A2A] p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search playbooks"
              className="w-full rounded-lg border border-[#333] bg-[#111] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
            />
          </div>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            <option value="">All categories</option>
            {categoryOptions.filter((item) => item.value !== 'checklist_template').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={requiredRole} onChange={(event) => setRequiredRole(event.target.value)} className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30">
            <option value="">All roles</option>
            {roles.map((role) => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-[#ccc]">
            <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 accent-[#D62B2B]" />
            Show Inactive
          </label>
        </div>

        {playbooksQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(playbooksQuery.error)}</p>
              <button type="button" onClick={() => playbooksQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">Try again</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Required Role</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Created at</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {playbooksQuery.isLoading ? <SkeletonRows /> : playbooks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <BookOpen className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No playbooks found</p>
                    </td>
                  </tr>
                ) : playbooks.map((playbook, index) => (
                  <tr key={playbook._id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">{playbook.title}</td>
                    <td className="px-4 py-3 text-[#bbb]">{labelFor(playbook.category)}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {playbook.tags.length === 0 ? <span className="text-[#666]">-</span> : playbook.tags.map((tag) => <Badge key={tag} variant="default">{tag}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="info">{playbook.requiredRole}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={playbook.isActive ? 'success' : 'default'}>{playbook.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-[#999]">{playbook.createdAt ? new Date(playbook.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => navigate(`/playbooks/${playbook.slug}/edit`)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"><Edit size={13} /> Edit</button>
                        <button type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ slug: playbook.slug, isActive: !playbook.isActive })} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"><RefreshCw size={13} /> Toggle Active</button>
                        <button type="button" onClick={() => setDeleteTarget(playbook)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"><Trash2 size={13} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
        title="Delete playbook?"
        message={`This will delete "${deleteTarget?.title}".`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
