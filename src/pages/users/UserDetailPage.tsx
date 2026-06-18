import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Star, Bean, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users.api';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';
import api from '../../api/axios';
import type { BrewLog, BrewMethod, Recipe, Bean as BeanType, EspressoShot, PaginatedResponse, User } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'brews' | 'beans' | 'espresso';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LargeAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-[#D62B2B]/20 flex items-center justify-center flex-shrink-0">
      <span className="text-[#D62B2B] text-xl font-bold">{initials}</span>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#111] rounded-xl border border-[#2A2A2A] p-4 flex items-start gap-3">
      <div className="shrink-0 p-2 rounded-lg bg-[#D62B2B]/10 text-[#D62B2B]">{icon}</div>
      <div>
        <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

function PlanBadge({ status }: { status: User['subscriptionStatus'] }) {
  if (status === 'active') return <Badge variant="success">Premium</Badge>;
  if (status === 'expired') return <Badge variant="warning">Expired</Badge>;
  if (status === 'cancelled') return <Badge variant="warning">Cancelled</Badge>;
  return <Badge variant="default">Free</Badge>;
}

function TasteProfileBadge({ profile }: { profile: EspressoShot['tasteProfile'] }) {
  const map: Record<EspressoShot['tasteProfile'], 'success' | 'warning' | 'info' | 'default'> = {
    balanced: 'success',
    bitter: 'warning',
    sour: 'info',
    other: 'default',
  };
  return <Badge variant={map[profile]}>{profile}</Badge>;
}

function RoastBadge({ level }: { level?: BeanType['roastLevel'] }) {
  if (!level) return <span className="text-[#555] text-xs">—</span>;
  const map: Record<string, 'default' | 'warning' | 'danger'> = {
    light: 'default',
    'medium-light': 'default',
    medium: 'warning',
    'medium-dark': 'warning',
    dark: 'danger',
  };
  return <Badge variant={map[level] ?? 'default'}>{level}</Badge>;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-[#555] text-xs">—</span>;
  return <span className="text-yellow-400 text-xs">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'brews', label: 'Brew Logs' },
    { key: 'beans', label: 'Beans' },
    { key: 'espresso', label: 'Espresso Shots' },
  ];
  return (
    <div className="flex gap-1 border-b border-[#2A2A2A] mb-4">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
            active === key
              ? 'border-[#D62B2B] text-[#D62B2B]'
              : 'border-transparent text-[#666] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('brews');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const brewPage = usePagination({ initialLimit: 10 });
  const beanPage = usePagination({ initialLimit: 10 });
  const espressoPage = usePagination({ initialLimit: 10 });

  // ── User ──────────────────────────────────────────────────────────────────
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUserById(id!),
    enabled: !!id,
  });

  // ── Count queries (always run, limit:1 for totals) ────────────────────────
  const { data: brewCountRes } = useQuery({
    queryKey: ['user-brew-count', id],
    queryFn: () => usersApi.getUserBrewLogs(id!, 1),
    enabled: !!id,
  });

  const { data: beanCountRes } = useQuery({
    queryKey: ['user-bean-count', id],
    queryFn: () =>
      api.get<PaginatedResponse<BeanType>>('/beans', {
        params: { userId: id, page: 1, limit: 1 },
      }),
    enabled: !!id,
  });

  const { data: espressoCountRes } = useQuery({
    queryKey: ['user-espresso-count', id],
    queryFn: () =>
      api.get<PaginatedResponse<EspressoShot>>('/espresso', {
        params: { userId: id, page: 1, limit: 1 },
      }),
    enabled: !!id,
  });

  // ── Paginated tab queries ─────────────────────────────────────────────────
  const { data: brewLogsRes, isLoading: brewsLoading } = useQuery({
    queryKey: ['user-brews', id, brewPage.page],
    queryFn: () => usersApi.getUserBrewLogs(id!, brewPage.page),
    enabled: !!id && activeTab === 'brews',
  });

  const { data: beansRes, isLoading: beansLoading } = useQuery({
    queryKey: ['user-beans', id, beanPage.page],
    queryFn: () =>
      api.get<PaginatedResponse<BeanType>>('/beans', {
        params: { userId: id, page: beanPage.page, limit: beanPage.limit },
      }),
    enabled: !!id && activeTab === 'beans',
  });

  const { data: espressoRes, isLoading: espressoLoading } = useQuery({
    queryKey: ['user-espresso', id, espressoPage.page],
    queryFn: () =>
      api.get<PaginatedResponse<EspressoShot>>('/espresso', {
        params: { userId: id, page: espressoPage.page, limit: espressoPage.limit },
      }),
    enabled: !!id && activeTab === 'espresso',
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof usersApi.updateUser>[1]) =>
      usersApi.updateUser(id!, data),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteUser(id!),
    onSuccess: () => {
      toast.success('User deleted');
      navigate('/users');
    },
    onError: () => toast.error('Delete failed'),
  });

  if (userLoading) return <PageSpinner />;

  const user = userData?.data?.data;
  if (!user) return <div className="text-[#666] text-sm p-8">User not found.</div>;

  const totalBrewLogs = brewCountRes?.data?.pagination.total ?? '—';
  const totalBeans = beanCountRes?.data?.pagination.total ?? '—';
  const totalEspresso = espressoCountRes?.data?.pagination.total ?? '—';

  const brewLogs: BrewLog[] = brewLogsRes?.data?.data ?? [];
  const brewLogsPagination = brewLogsRes?.data?.pagination;

  const avgRating = brewLogs.filter(l => l.rating).length > 0
    ? (brewLogs.filter(l => l.rating).reduce((s, l) => s + (l.rating ?? 0), 0) /
       brewLogs.filter(l => l.rating).length).toFixed(1)
    : '—';

  const beans: BeanType[] = beansRes?.data?.data ?? [];
  const beansPagination = beansRes?.data?.pagination;

  const espressoShots: EspressoShot[] = espressoRes?.data?.data ?? [];
  const espressoPagination = espressoRes?.data?.pagination;

  // ── Table column definitions ──────────────────────────────────────────────
  const brewColumns = [
    {
      key: 'method',
      label: 'Method',
      render: (l: BrewLog) => (
        <span className="text-sm text-white">
          {typeof l.brewMethod === 'object' ? (l.brewMethod as BrewMethod).name : '—'}
        </span>
      ),
    },
    {
      key: 'recipe',
      label: 'Recipe',
      render: (l: BrewLog) => (
        <span className="text-sm text-[#999]">
          {l.recipe && typeof l.recipe === 'object' ? (l.recipe as Recipe).title : '—'}
        </span>
      ),
    },
    {
      key: 'dose',
      label: 'Dose',
      render: (l: BrewLog) => <span className="text-sm text-[#999]">{l.coffeeDose}g</span>,
    },
    {
      key: 'water',
      label: 'Water',
      render: (l: BrewLog) => <span className="text-sm text-[#999]">{l.waterAmount}ml</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (l: BrewLog) => <StarRating rating={l.rating} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (l: BrewLog) => (
        <span className="text-xs text-[#666]">{formatDate(l.completedAt)}</span>
      ),
    },
  ];

  const beanColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (b: BeanType) => <span className="text-sm font-medium text-white">{b.name}</span>,
    },
    {
      key: 'roaster',
      label: 'Roaster',
      render: () => <span className="text-sm text-[#555]">—</span>,
    },
    {
      key: 'origin',
      label: 'Origin',
      render: (b: BeanType) => (
        <span className="text-sm text-[#999]">{b.origin ?? '—'}</span>
      ),
    },
    {
      key: 'roastLevel',
      label: 'Roast Level',
      render: (b: BeanType) => <RoastBadge level={b.roastLevel} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (b: BeanType) => (
        <Badge variant={b.status === 'active' ? 'success' : 'default'}>{b.status}</Badge>
      ),
    },
    {
      key: 'roastDate',
      label: 'Roast Date',
      render: (b: BeanType) => (
        <span className="text-xs text-[#666]">{b.roastDate ? formatDate(b.roastDate) : '—'}</span>
      ),
    },
  ];

  const espressoColumns = [
    {
      key: 'dose',
      label: 'Dose In',
      render: (s: EspressoShot) => <span className="text-sm text-[#999]">{s.dose}g</span>,
    },
    {
      key: 'yield',
      label: 'Yield Out',
      render: (s: EspressoShot) => <span className="text-sm text-[#999]">{s.yield}ml</span>,
    },
    {
      key: 'time',
      label: 'Time',
      render: (s: EspressoShot) => (
        <span className="text-sm text-[#999]">{s.extractionTime}s</span>
      ),
    },
    {
      key: 'taste',
      label: 'Taste Profile',
      render: (s: EspressoShot) => <TasteProfileBadge profile={s.tasteProfile} />,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (s: EspressoShot) => (
        <StarRating rating={(s as EspressoShot & { rating?: number }).rating} />
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (s: EspressoShot) => (
        <span className="text-xs text-[#666]">{formatDate(s.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.name}
        description={user.email}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft size={14} />
            Back
          </Button>
        }
      />

      {/* ── Profile card ────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-5">
          <LargeAvatar name={user.name} />

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{user.name}</h2>
            <p className="text-sm text-[#666] mt-0.5">{user.email}</p>
            <p className="text-xs text-[#555] mt-1">Joined {formatDate(user.createdAt)}</p>
            <div className="flex gap-2 mt-3">
              <Badge variant={user.role === 'admin' ? 'danger' : 'default'}>{user.role}</Badge>
              <PlanBadge status={user.subscriptionStatus} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-start">
            <Button
              variant={user.isPremium ? 'outline' : 'primary'}
              size="sm"
              loading={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  isPremium: !user.isPremium,
                  subscriptionStatus: !user.isPremium ? 'active' : 'none',
                })
              }
            >
              {user.isPremium ? 'Revoke Premium' : 'Grant Premium'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleDialog(true)}
            >
              Change Role
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatItem icon={<ClipboardList size={16} />} label="Total Brew Logs" value={totalBrewLogs} />
        <StatItem icon={<Star size={16} />} label="Avg Rating" value={avgRating} />
        <StatItem icon={<Bean size={16} />} label="Total Beans" value={totalBeans} />
        <StatItem icon={<Zap size={16} />} label="Espresso Shots" value={totalEspresso} />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Card>
        <TabBar
          active={activeTab}
          onChange={(t) => {
            setActiveTab(t);
            if (t === 'brews') brewPage.reset();
            if (t === 'beans') beanPage.reset();
            if (t === 'espresso') espressoPage.reset();
          }}
        />

        {activeTab === 'brews' && (
          <>
            <Table
              columns={brewColumns}
              data={brewLogs}
              keyExtractor={(l) => l._id}
              loading={brewsLoading}
              emptyMessage="No brew logs found"
            />
            {brewLogsPagination && brewLogsPagination.pages > 1 && (
              <Pagination
                currentPage={brewLogsPagination.page}
                totalPages={brewLogsPagination.pages}
                onPageChange={brewPage.goToPage}
              />
            )}
          </>
        )}

        {activeTab === 'beans' && (
          <>
            <Table
              columns={beanColumns}
              data={beans}
              keyExtractor={(b) => b._id}
              loading={beansLoading}
              emptyMessage="No beans found"
            />
            {beansPagination && beansPagination.pages > 1 && (
              <Pagination
                currentPage={beansPagination.page}
                totalPages={beansPagination.pages}
                onPageChange={beanPage.goToPage}
              />
            )}
          </>
        )}

        {activeTab === 'espresso' && (
          <>
            <Table
              columns={espressoColumns}
              data={espressoShots}
              keyExtractor={(s) => s._id}
              loading={espressoLoading}
              emptyMessage="No espresso shots found"
            />
            {espressoPagination && espressoPagination.pages > 1 && (
              <Pagination
                currentPage={espressoPagination.page}
                totalPages={espressoPagination.pages}
                onPageChange={espressoPage.goToPage}
              />
            )}
          </>
        )}
      </Card>

      {/* ── Change role dialog ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showRoleDialog}
        onClose={() => setShowRoleDialog(false)}
        onConfirm={() => {
          updateMutation.mutate(
            { role: user.role === 'admin' ? 'user' : 'admin' },
            { onSuccess: () => setShowRoleDialog(false) }
          );
        }}
        title="Change role?"
        message={
          user.role === 'admin'
            ? `Demote "${user.name}" from admin to regular user?`
            : `Promote "${user.name}" to admin? They will have full platform access.`
        }
        confirmLabel={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
        variant="default"
        loading={updateMutation.isPending}
      />

      {/* ── Delete dialog ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete account?"
        message={`This will permanently delete "${user.name}" and all their data including brew logs, beans, and espresso shots. This cannot be undone.`}
        confirmLabel="Delete Account"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
