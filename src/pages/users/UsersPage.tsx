import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users.api';
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
import { formatDate } from '../../utils/formatters';
import type { User } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UserAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[#D62B2B]/20 flex items-center justify-center flex-shrink-0">
      <span className="text-[#D62B2B] text-xs font-semibold">{initials}</span>
    </div>
  );
}

function PlanBadge({ status }: { status: User['subscriptionStatus'] }) {
  if (status === 'active') return <Badge variant="success">Premium</Badge>;
  if (status === 'expired') return <Badge variant="warning">Expired</Badge>;
  if (status === 'cancelled') return <Badge variant="warning">Cancelled</Badge>;
  return <Badge variant="default">Free</Badge>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { page, limit, goToPage, reset } = usePagination();

  const handleSearch = (v: string) => { setSearch(v); reset(); };
  const handleRole = (v: string) => { setRoleFilter(v); reset(); };
  const handlePlan = (v: string) => { setPlanFilter(v); reset(); };

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, limit, search, roleFilter, planFilter],
    queryFn: () =>
      usersApi.getUsers({
        page,
        limit,
        search: search || undefined,
        role: roleFilter ? (roleFilter as 'user' | 'admin') : undefined,
        subscriptionStatus: planFilter
          ? (planFilter as 'none' | 'active' | 'expired' | 'cancelled')
          : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const togglePremiumMutation = useMutation({
    mutationFn: ({ id, isPremium }: { id: string; isPremium: boolean }) =>
      usersApi.updateUser(id, {
        isPremium,
        subscriptionStatus: isPremium ? 'active' : 'none',
      }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Update failed'),
  });

  const handleExportCSV = async () => {
    try {
      const res = await usersApi.exportUsersCSV();
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const users: User[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{u.name}</div>
            <div className="text-xs text-[#666] truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u: User) => (
        <Badge variant={u.role === 'admin' ? 'danger' : 'default'}>{u.role}</Badge>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (u: User) => <PlanBadge status={u.subscriptionStatus} />,
    },
    {
      key: 'brewLogs',
      label: 'Brew Logs',
      render: (u: User) => (
        <span className="text-sm text-[#999]">
          {(u as User & { brewLogCount?: number }).brewLogCount ?? '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (u: User) => (
        <span className="text-xs text-[#666]">{formatDate(u.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (u: User) => (
        <div className="flex items-center gap-2 justify-end">
          <Toggle
            checked={u.isPremium}
            onChange={(v) => togglePremiumMutation.mutate({ id: u._id, isPremium: v })}
            disabled={togglePremiumMutation.isPending}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/users/${u._id}`)}
          >
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => setDeleteTarget(u)}
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
        title="Users"
        description="Manage all JavaRista users"
        action={
          <Button variant="ghost" onClick={handleExportCSV}>
            <Download size={14} />
            Export CSV
          </Button>
        }
      />

      <Card>
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by name or email…"
            className="flex-1 min-w-48 max-w-xs"
          />
          <Select
            value={roleFilter}
            onChange={(e) => handleRole(e.target.value)}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            placeholder="All Roles"
            className="w-36"
          />
          <Select
            value={planFilter}
            onChange={(e) => handlePlan(e.target.value)}
            options={[
              { value: 'none', label: 'Free' },
              { value: 'active', label: 'Premium' },
              { value: 'expired', label: 'Expired' },
            ]}
            placeholder="All Plans"
            className="w-36"
          />
          {pagination && (
            <span className="text-xs text-[#555] ml-auto whitespace-nowrap">
              Showing {users.length} of {pagination.total} users
            </span>
          )}
        </div>

        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u._id}
          loading={isLoading}
          emptyMessage="No users found"
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
        title="Delete user?"
        message={`This will permanently delete "${deleteTarget?.name}" and all their data. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
