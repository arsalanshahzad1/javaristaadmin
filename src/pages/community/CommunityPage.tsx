import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

type Share = {
  _id: string;
  caption?: string;
  likesCount: number;
  createdAt: string;
  user: { _id: string; name: string; avatar?: string };
  brewLog: {
    _id: string;
    rating?: number;
    tasteNotes?: string[];
    comments?: string;
    brewMethod?: { name: string };
  };
};

type CommunityUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  followersCount: number;
  followingCount: number;
  totalShares: number;
  createdAt: string;
};

type SortKey = keyof Pick<CommunityUser, 'name' | 'role' | 'followersCount' | 'followingCount' | 'totalShares' | 'createdAt'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

function avatarInitial(name?: string) {
  return (name?.[0] ?? '?').toUpperCase();
}

function ratingStars(rating?: number) {
  if (!rating) return '-';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function fetchShares(params: {
  page: number;
  search: string;
  startDate: string;
  endDate: string;
}) {
  const response = await adminApiClient.get<ApiEnvelope<Share[]>>('/admin/community/shares', {
    params: {
      page: params.page,
      limit: 20,
      search: params.search || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    },
  });
  return response.data;
}

async function deleteShare(id: string) {
  const response = await adminApiClient.delete<ApiEnvelope<null>>(`/admin/community/shares/${id}`);
  return response.data;
}

async function fetchCommunityUsers() {
  const response = await adminApiClient.get<ApiEnvelope<CommunityUser[]>>('/admin/community/users');
  return response.data.data;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {Array.from({ length: cols }).map((_, cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── ShareDetailModal ─────────────────────────────────────────────────────────

function ShareDetailModal({
  share,
  onClose,
  onDelete,
  deleting,
}: {
  share: Share | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  if (!share) return null;
  return (
    <Modal isOpen={!!share} onClose={onClose} title="Share Details" size="md">
      <div className="space-y-4">
        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D62B2B] text-sm font-semibold text-white">
            {avatarInitial(share.user?.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{share.user?.name ?? 'Unknown'}</p>
            <p className="text-xs text-[#666]">Posted {new Date(share.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Brew log details */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#555]">Brew Method</span>
            <span className="text-sm text-[#ddd]">{share.brewLog?.brewMethod?.name ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#555]">Rating</span>
            <span className="text-sm text-yellow-400">{ratingStars(share.brewLog?.rating)}</span>
          </div>
          {share.brewLog?.tasteNotes && share.brewLog.tasteNotes.length > 0 && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-[#555]">Taste Notes</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {share.brewLog.tasteNotes.map((note) => (
                  <Badge key={note} variant="default">{note}</Badge>
                ))}
              </div>
            </div>
          )}
          {share.brewLog?.comments && (
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-[#555]">Comments</span>
              <p className="mt-1 text-sm text-[#ccc]">{share.brewLog.comments}</p>
            </div>
          )}
        </div>

        {/* Caption */}
        {share.caption && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#555]">Caption</p>
            <p className="text-sm text-[#ddd] leading-relaxed">{share.caption}</p>
          </div>
        )}

        {/* Likes */}
        <div className="flex items-center gap-2 text-sm text-[#888]">
          <span>♥</span>
          <span>{share.likesCount} like{share.likesCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Delete button */}
        <div className="flex justify-end pt-2 border-t border-[#2A2A2A]">
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(share._id)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-900/20 border border-red-900/60 px-4 py-2 text-sm text-red-300 hover:bg-red-900/30 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete Share'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Shares Tab ──────────────────────────────────────────────────────────────

function SharesTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [liveSearch, setLiveSearch] = useState('');
  const [viewShare, setViewShare] = useState<Share | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Share | null>(null);

  const sharesQuery = useQuery({
    queryKey: ['admin-community-shares', page, search, startDate, endDate],
    queryFn: () => fetchShares({ page, search, startDate, endDate }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShare,
    onSuccess: (response) => {
      toast.success(response.message || 'Share deleted');
      setDeleteTarget(null);
      setViewShare(null);
      queryClient.invalidateQueries({ queryKey: ['admin-community-shares'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function applySearch() {
    setSearch(liveSearch);
    setPage(1);
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') applySearch();
  }

  function clearFilters() {
    setSearch('');
    setLiveSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  const shares = sharesQuery.data?.data ?? [];
  const pagination = sharesQuery.data?.pagination;
  const totalPages = pagination?.pages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <div className="flex-1 min-w-48">
          <label className="mb-1 block text-xs font-medium text-[#888]">Search</label>
          <input
            value={liveSearch}
            onChange={(e) => setLiveSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="User name or caption…"
            className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#888]">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#888]">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] focus:ring-2 focus:ring-[#D62B2B]/30"
          />
        </div>
        <button
          type="button"
          onClick={applySearch}
          className="rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          Search
        </button>
        {(search || startDate || endDate) && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#999] hover:text-white hover:bg-[#242424]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {sharesQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(sharesQuery.error)}</p>
              <button
                type="button"
                onClick={() => sharesQuery.refetch()}
                className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Brew Method</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Caption</th>
                  <th className="px-4 py-3 font-medium">Likes</th>
                  <th className="px-4 py-3 font-medium">Posted At</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sharesQuery.isLoading ? (
                  <SkeletonRows cols={7} />
                ) : shares.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <MessageCircle className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No shares found</p>
                    </td>
                  </tr>
                ) : (
                  shares.map((share, index) => (
                    <tr
                      key={share._id}
                      className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D62B2B]/20 text-xs font-semibold text-[#D62B2B]">
                            {avatarInitial(share.user?.name)}
                          </div>
                          <span className="text-white">{share.user?.name ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#bbb]">
                        {share.brewLog?.brewMethod?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-yellow-400">
                        {share.brewLog?.rating ? `${share.brewLog.rating}/5` : '-'}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="block truncate text-[#bbb]">
                          {share.caption ?? <span className="text-[#555] italic">No caption</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#999]">{share.likesCount}</td>
                      <td className="px-4 py-3 text-[#999]">
                        {new Date(share.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewShare(share)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(share)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-3">
            <span className="text-xs text-[#666]">
              {pagination.total} total · page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share detail modal */}
      <ShareDetailModal
        share={viewShare}
        onClose={() => setViewShare(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
        deleting={deleteMutation.isPending}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete share?"
        message={`Remove this share from ${deleteTarget?.user?.name ?? 'user'}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Brewers Tab ─────────────────────────────────────────────────────────────

function BrewersTab() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('totalShares');
  const [sortAsc, setSortAsc] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['admin-community-users'],
    queryFn: fetchCommunityUsers,
  });

  const sorted = useMemo(() => {
    const data = [...(usersQuery.data ?? [])];
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return data;
  }, [usersQuery.data, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => handleSort(col)}
          className={`inline-flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-[#D62B2B]' : ''}`}
        >
          {label}
          <ArrowUpDown size={12} className={active ? 'text-[#D62B2B]' : 'text-[#444]'} />
        </button>
      </th>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
      {usersQuery.isError ? (
        <div className="p-5">
          <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
            <p className="text-red-300">{getErrorMessage(usersQuery.error)}</p>
            <button
              type="button"
              onClick={() => usersQuery.refetch()}
              className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-[#666]">
              <tr className="border-b border-[#2A2A2A]">
                <SortHeader label="Name" col="name" />
                <th className="px-4 py-3 font-medium">Email</th>
                <SortHeader label="Role" col="role" />
                <SortHeader label="Followers" col="followersCount" />
                <SortHeader label="Following" col="followingCount" />
                <SortHeader label="Total Shares" col="totalShares" />
                <SortHeader label="Joined" col="createdAt" />
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                <SkeletonRows cols={8} />
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Users className="mx-auto mb-3 text-[#555]" size={30} />
                    <p className="text-sm text-[#777]">No community members found</p>
                  </td>
                </tr>
              ) : (
                sorted.map((user, index) => (
                  <tr
                    key={user._id}
                    className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}
                  >
                    <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                    <td className="px-4 py-3 text-[#999]">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#bbb]">{user.followersCount}</td>
                    <td className="px-4 py-3 text-[#bbb]">{user.followingCount}</td>
                    <td className="px-4 py-3 text-[#bbb]">{user.totalShares}</td>
                    <td className="px-4 py-3 text-[#999]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/performance/user/${user._id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                        >
                          <Eye size={13} /> View Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'shares' | 'brewers';

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('shares');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Community</h1>
        <p className="mt-1 text-sm text-[#777]">Moderate brew shares and review community members.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#141414] p-1 w-fit">
        {([['shares', 'Shares'], ['brewers', 'Brewers']] as [Tab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#D62B2B] text-white'
                : 'text-[#777] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'shares' ? <SharesTab /> : <BrewersTab />}
    </div>
  );
}
