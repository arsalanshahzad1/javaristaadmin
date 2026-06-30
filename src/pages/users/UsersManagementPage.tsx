import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Search, ShieldCheck, Trash2, UserCog, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

type Role = 'owner' | 'ceo' | 'coo' | 'cfo' | 'regional_manager' | 'area_manager' | 'store_manager' | 'assistant_manager' | 'shift_supervisor' | 'barista' | 'trainee' | 'investor' | 'hr_manager' | 'marketing_manager';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

type AdminUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  isPremium: boolean;
  isVerified: boolean;
  createdAt: string;
  investorAccessLevel?: string;
};

const roles: Role[] = ['owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager', 'store_manager', 'assistant_manager', 'shift_supervisor', 'barista', 'trainee', 'investor', 'hr_manager', 'marketing_manager'];
const premiumRoles = new Set<Role>(['investor', 'owner', 'ceo', 'coo', 'cfo']);
const roleClasses: Record<Role, string> = {
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  ceo: 'bg-purple-100 text-purple-700 border-purple-200',
  coo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  cfo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  regional_manager: 'bg-teal-100 text-teal-700 border-teal-200',
  area_manager: 'bg-teal-100 text-teal-700 border-teal-200',
  store_manager: 'bg-green-100 text-green-700 border-green-200',
  assistant_manager: 'bg-green-100 text-green-700 border-green-200',
  shift_supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
  barista: 'bg-sky-100 text-sky-700 border-sky-200',
  trainee: 'bg-gray-100 text-gray-700 border-gray-200',
  investor: 'bg-amber-100 text-amber-700 border-amber-200',
  hr_manager: 'bg-pink-100 text-pink-700 border-pink-200',
  marketing_manager: 'bg-orange-100 text-orange-700 border-orange-200',
};

function getUserId(user: AdminUser) {
  return user.id ?? user._id ?? '';
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function formatRole(role: Role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${roleClasses[role]}`}>
      {formatRole(role)}
    </span>
  );
}

async function getUsers(params: { page: number; limit: number; search?: string; role?: Role }) {
  const response = await adminApiClient.get<ApiEnvelope<AdminUser[]>>('/admin/users', { params });
  return response.data;
}

async function updateUserRole(payload: { id: string; role: Role; isPremium: boolean; investorAccessLevel?: string }) {
  const response = await adminApiClient.put<ApiEnvelope<AdminUser>>(`/admin/users/${payload.id}/role`, {
    role: payload.role,
    isPremium: payload.isPremium,
    investorAccessLevel: payload.investorAccessLevel,
  });
  return response.data;
}

async function deactivateUser(id: string) {
  const response = await adminApiClient.delete<ApiEnvelope<unknown>>(`/admin/users/${id}`);
  return response.data;
}

function downloadCsv(users: AdminUser[]) {
  const headers = ['Name', 'Email', 'Role', 'Premium', 'Verified', 'Joined date'];
  const rows = users.map((user) => [
    user.name,
    user.email,
    user.role,
    user.isPremium ? 'Yes' : 'No',
    user.isVerified ? 'Yes' : 'No',
    user.createdAt ? new Date(user.createdAt).toISOString() : '',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `javarista-users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

export function UsersManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingInvestorLevel, setEditingInvestorLevel] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 20;

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, limit, debouncedSearch, role],
    queryFn: () => getUsers({
      page,
      limit,
      search: debouncedSearch || undefined,
      role: role || undefined,
    }),
  });

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;

  const updateRoleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: (response) => {
      toast.success(response.message || 'User updated');
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: (response) => {
      toast.success(response.message || 'User deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const totalLabel = useMemo(() => {
    if (!pagination) return '';
    return `${pagination.total.toLocaleString()} total users`;
  }, [pagination]);

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Users & Roles</h1>
          <p className="mt-1 text-sm text-[#777]">Manage admin access, premium status, and employee performance.</p>
        </div>
        <button type="button" onClick={() => downloadCsv(users)} className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm font-medium text-[#ddd] hover:bg-[#242424]">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2A2A] p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetToFirstPage();
              }}
              placeholder="Search by name or email"
              className="w-full rounded-lg border border-[#333] bg-[#111] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
            />
          </div>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | '');
              resetToFirstPage();
            }}
            className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
          >
            <option value="">All roles</option>
            {roles.map((option) => <option key={option} value={option}>{formatRole(option)}</option>)}
          </select>
          {totalLabel && <span className="ml-auto text-xs text-[#777]">{totalLabel}</span>}
        </div>

        {usersQuery.isError ? (
          <div className="p-6">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(usersQuery.error)}</p>
              <button type="button" onClick={() => usersQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Premium</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Joined date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? <SkeletonRows /> : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <UserCog className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No users found</p>
                    </td>
                  </tr>
                ) : users.map((user, index) => {
                  const id = getUserId(user);
                  return (
                    <tr key={id} className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                      <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-[#bbb]">{user.email}</td>
                      <td className="px-4 py-3">
                        {editingUserId === id ? (
                          <div className="flex flex-col gap-1">
                            <select
                              defaultValue={user.role}
                              disabled={updateRoleMutation.isPending}
                              onChange={(event) => {
                                const newRole = event.target.value as Role;
                                if (newRole !== 'investor') {
                                  updateRoleMutation.mutate({ id, role: newRole, isPremium: premiumRoles.has(newRole) });
                                }
                              }}
                              onBlur={(event) => {
                                if ((event.target.value as Role) !== 'investor') setEditingUserId(null);
                              }}
                              className="rounded-lg border border-[#333] bg-[#111] px-2 py-1 text-xs text-white outline-none focus:border-[#D62B2B]"
                              autoFocus
                            >
                              {roles.map((option) => <option key={option} value={option}>{formatRole(option)}</option>)}
                            </select>
                            {user.role === 'investor' && (
                              <div className="flex gap-1">
                                <select
                                  value={editingInvestorLevel || user.investorAccessLevel || ''}
                                  onChange={(e) => setEditingInvestorLevel(e.target.value)}
                                  className="flex-1 rounded border border-[#333] bg-[#111] px-1 py-0.5 text-xs text-white"
                                >
                                  <option value="">Community</option>
                                  <option value="shareholder">Shareholder</option>
                                  <option value="major_investor">Major Investor</option>
                                  <option value="board">Board</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateRoleMutation.mutate({ id, role: 'investor', isPremium: true, investorAccessLevel: editingInvestorLevel || undefined });
                                    setEditingUserId(null);
                                  }}
                                  className="rounded border border-[#D62B2B] bg-[#D62B2B]/10 px-2 py-0.5 text-xs text-[#D62B2B]"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <RoleBadge role={user.role} />
                            {user.role === 'investor' && user.investorAccessLevel && (
                              <span className="text-xs text-[#777]">{user.investorAccessLevel.replace('_', ' ')}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge variant={user.isPremium ? 'success' : 'default'}>{user.isPremium ? 'Premium' : 'Free'}</Badge></td>
                      <td className="px-4 py-3 text-[#bbb]">{user.isVerified ? <ShieldCheck className="text-green-400" size={18} /> : 'No'}</td>
                      <td className="px-4 py-3 text-[#999]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setEditingUserId(id)} className="rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424]">
                            Change Role
                          </button>
                          {user.role === 'employee' && (
                            <button type="button" onClick={() => navigate(`/performance/user/${id}`)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#ddd] hover:bg-[#242424]">
                              <Activity size={13} />
                              View Performance
                            </button>
                          )}
                          <button type="button" onClick={() => setDeleteTarget(user)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/20">
                            <Trash2 size={13} />
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2A2A] px-4">
            <p className="text-xs text-[#777]">Page {pagination.page} of {pagination.pages} · {pagination.total.toLocaleString()} total</p>
            <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deactivateMutation.mutate(getUserId(deleteTarget))}
        title="Deactivate user?"
        message={`This will deactivate "${deleteTarget?.name}" and remove them from admin user lists.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
