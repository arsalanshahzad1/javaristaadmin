import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Shield,
  Trophy,
  Trash2,
  Users,
  XCircle,
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

type CommunityBadge = {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: string;
};

type PassportStore = {
  storeId: string;
  storeName: string;
  visitedAt: string;
  checkInCount: number;
};

type ModeratorNote = {
  note: string;
  addedBy: string;
  addedAt: string;
};

type CommunityProfile = {
  _id: string;
  userId: string;
  level: string;
  levelPoints: number;
  totalBrews: number;
  totalLikesReceived: number;
  badges: CommunityBadge[];
  storesVisited: PassportStore[];
  coffeesTriedNames: string[];
  brewMethodsLearned: string[];
  warningCount: number;
  isSuspended: boolean;
  suspendedUntil?: string;
  suspendedReason?: string;
  moderatorNotes: ModeratorNote[];
  user?: { name: string; email: string; avatar?: string };
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
  communityProfile?: {
    level: string;
    levelPoints: number;
    badgesCount: number;
    isSuspended: boolean;
  };
};

type LeaderboardEntry = {
  userId: string;
  name: string;
  avatar?: string;
  level: string;
  levelPoints: number;
  totalBrews: number;
  badgesCount: number;
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

const LEVEL_COLORS: Record<string, string> = {
  explorer: 'text-[#888] bg-[#222] border-[#444]',
  enthusiast: 'text-green-400 bg-green-900/20 border-green-800/50',
  brewer: 'text-blue-400 bg-blue-900/20 border-blue-800/50',
  advanced_brewer: 'text-purple-400 bg-purple-900/20 border-purple-800/50',
  coffee_expert: 'text-orange-400 bg-orange-900/20 border-orange-800/50',
  master_javarista: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
};

const LEVEL_THRESHOLDS: Record<string, number> = {
  explorer: 0,
  enthusiast: 100,
  brewer: 300,
  advanced_brewer: 700,
  coffee_expert: 1500,
  master_javarista: 3000,
};

const LEVEL_ORDER = ['explorer', 'enthusiast', 'brewer', 'advanced_brewer', 'coffee_expert', 'master_javarista'];

function nextLevelThreshold(level: string, points: number): number {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return points;
  return LEVEL_THRESHOLDS[LEVEL_ORDER[idx + 1]] ?? points;
}

function levelProgress(level: string, points: number): number {
  const current = LEVEL_THRESHOLDS[level] ?? 0;
  const next = nextLevelThreshold(level, points);
  if (next <= current) return 1;
  return Math.min(1, (points - current) / (next - current));
}

function formatLevel(level: string) {
  return level.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function LevelBadge({ level }: { level: string }) {
  const cls = LEVEL_COLORS[level] ?? LEVEL_COLORS['explorer'];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {formatLevel(level)}
    </span>
  );
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

async function deleteShareApi(id: string) {
  const response = await adminApiClient.delete<ApiEnvelope<null>>(`/admin/community/shares/${id}`);
  return response.data;
}

async function fetchCommunityUsers() {
  const response = await adminApiClient.get<ApiEnvelope<CommunityUser[]>>('/admin/community/users');
  return response.data.data;
}

async function fetchLeaderboard() {
  const response = await adminApiClient.get<ApiEnvelope<LeaderboardEntry[]>>('/community/leaderboard');
  return response.data.data;
}

async function fetchModerationProfiles() {
  const response = await adminApiClient.get<ApiEnvelope<CommunityProfile[]>>('/community/moderation/profiles');
  return response.data.data;
}

async function fetchUserCommunityProfile(userId: string) {
  const response = await adminApiClient.get<ApiEnvelope<CommunityProfile>>(`/community/profile/${userId}`);
  return response.data.data;
}

async function warnUserApi(userId: string, reason: string) {
  const response = await adminApiClient.post<ApiEnvelope<unknown>>(`/community/moderation/${userId}/warn`, { reason });
  return response.data;
}

async function suspendUserApi(userId: string, reason: string, days: number) {
  const response = await adminApiClient.post<ApiEnvelope<unknown>>(`/community/moderation/${userId}/suspend`, { reason, days });
  return response.data;
}

async function unsuspendUserApi(userId: string) {
  const response = await adminApiClient.post<ApiEnvelope<unknown>>(`/community/moderation/${userId}/unsuspend`, {});
  return response.data;
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D62B2B] text-sm font-semibold text-white">
            {avatarInitial(share.user?.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{share.user?.name ?? 'Unknown'}</p>
            <p className="text-xs text-[#666]">Posted {new Date(share.createdAt).toLocaleString()}</p>
          </div>
        </div>
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
        {share.caption && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#555]">Caption</p>
            <p className="text-sm text-[#ddd] leading-relaxed">{share.caption}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-[#888]">
          <span>♥</span>
          <span>{share.likesCount} like{share.likesCount !== 1 ? 's' : ''}</span>
        </div>
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

// ─── Brewer Detail Modal ──────────────────────────────────────────────────────

function BrewerDetailModal({
  user,
  onClose,
}: {
  user: CommunityUser | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [warnReason, setWarnReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  const profileQuery = useQuery({
    queryKey: ['brewer-profile', user?._id],
    queryFn: () => fetchUserCommunityProfile(user!._id),
    enabled: !!user,
  });

  const warnMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      warnUserApi(userId, reason),
    onSuccess: () => {
      toast.success('Warning issued');
      setWarnReason('');
      queryClient.invalidateQueries({ queryKey: ['brewer-profile', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason, days }: { userId: string; reason: string; days: number }) =>
      suspendUserApi(userId, reason, days),
    onSuccess: () => {
      toast.success('User suspended');
      setSuspendReason('');
      queryClient.invalidateQueries({ queryKey: ['brewer-profile', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => unsuspendUserApi(userId),
    onSuccess: () => {
      toast.success('User unsuspended');
      queryClient.invalidateQueries({ queryKey: ['brewer-profile', user?._id] });
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!user) return null;

  const profile = profileQuery.data;
  const progress = profile ? levelProgress(profile.level, profile.levelPoints) : 0;
  const nextThreshold = profile ? nextLevelThreshold(profile.level, profile.levelPoints) : 0;

  return (
    <Modal isOpen={!!user} onClose={onClose} title={user.name} size="lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#D62B2B] text-xl font-bold text-white">
            {avatarInitial(user.name)}
          </div>
          <div>
            <p className="text-base font-bold text-white">{user.name}</p>
            <p className="text-xs text-[#666]">{user.email}</p>
            {profile && (
              <div className="mt-1 flex items-center gap-2">
                <LevelBadge level={profile.level} />
                <span className="text-xs text-[#777]">{profile.levelPoints} pts</span>
                {profile.isSuspended && (
                  <span className="rounded-full bg-red-900/30 border border-red-700/50 px-2 py-0.5 text-xs text-red-300">
                    Suspended
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {profileQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D62B2B] border-t-transparent" />
          </div>
        )}

        {profile && (
          <>
            {/* Level progress */}
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[#666]">
                <span>{formatLevel(profile.level)}</span>
                <span>{profile.levelPoints} / {nextThreshold} pts</span>
              </div>
              <div className="h-2 rounded-full bg-[#2A2A2A]">
                <div
                  className="h-2 rounded-full bg-[#D62B2B] transition-all"
                  style={{ width: `${(progress * 100).toFixed(1)}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Brews', profile.totalBrews],
                ['Likes Rec.', profile.totalLikesReceived],
                ['Badges', profile.badges.length],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3 text-center">
                  <p className="text-lg font-bold text-white">{val}</p>
                  <p className="text-xs text-[#666]">{label}</p>
                </div>
              ))}
            </div>

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#555]">Badges</p>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((b) => (
                    <div
                      key={b.badgeId}
                      title={b.description}
                      className="flex items-center gap-1 rounded-full border border-[#2A2A2A] bg-[#111] px-3 py-1 text-xs text-[#ccc]"
                    >
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coffee Passport */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#555]">Coffee Passport</p>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#777]">Stores Visited</span>
                  <span className="text-white">{profile.storesVisited.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777]">Coffees Tried</span>
                  <span className="text-white">{profile.coffeesTriedNames.length}</span>
                </div>
                {profile.storesVisited.length > 0 && (
                  <div>
                    <p className="text-xs text-[#555] mb-1">Stores</p>
                    {profile.storesVisited.map((s) => (
                      <p key={s.storeId} className="text-xs text-[#999]">
                        {s.storeName} — {s.checkInCount} check-in{s.checkInCount !== 1 ? 's' : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Moderation */}
            <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#555]">Moderation</p>
              <div className="flex items-center gap-3 text-sm">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-[#ccc]">{profile.warningCount} warning{profile.warningCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Moderator notes */}
              {profile.moderatorNotes.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {[...profile.moderatorNotes].reverse().map((n, i) => (
                    <div key={i} className="rounded border border-[#2A2A2A] bg-[#0A0A0A] p-2 text-xs">
                      <p className="text-[#ccc]">{n.note}</p>
                      <p className="text-[#555] mt-0.5">{new Date(n.addedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Issue Warning */}
              <div className="space-y-2">
                <p className="text-xs text-[#777]">Issue Warning</p>
                <div className="flex gap-2">
                  <input
                    value={warnReason}
                    onChange={(e) => setWarnReason(e.target.value)}
                    placeholder="Reason…"
                    className="flex-1 rounded-lg border border-[#333] bg-[#0A0A0A] px-3 py-1.5 text-xs text-white outline-none focus:border-yellow-600"
                  />
                  <button
                    type="button"
                    disabled={!warnReason.trim() || warnMutation.isPending}
                    onClick={() => warnMutation.mutate({ userId: user._id, reason: warnReason })}
                    className="rounded-lg border border-yellow-800/60 bg-yellow-900/20 px-3 py-1.5 text-xs text-yellow-300 hover:bg-yellow-900/30 disabled:opacity-40"
                  >
                    Warn
                  </button>
                </div>
              </div>

              {/* Suspend / Unsuspend */}
              {profile.isSuspended ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-400">
                    Suspended{profile.suspendedUntil ? ` until ${new Date(profile.suspendedUntil).toDateString()}` : ''}
                  </p>
                  <button
                    type="button"
                    disabled={unsuspendMutation.isPending}
                    onClick={() => unsuspendMutation.mutate(user._id)}
                    className="rounded-lg border border-green-800/60 bg-green-900/20 px-3 py-1.5 text-xs text-green-300 hover:bg-green-900/30 disabled:opacity-40"
                  >
                    {unsuspendMutation.isPending ? 'Lifting…' : 'Unsuspend'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[#777]">Suspend</p>
                  <div className="flex gap-2">
                    <input
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Reason…"
                      className="flex-1 rounded-lg border border-[#333] bg-[#0A0A0A] px-3 py-1.5 text-xs text-white outline-none focus:border-red-700"
                    />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(Number(e.target.value))}
                      className="w-16 rounded-lg border border-[#333] bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-red-700"
                    />
                    <span className="self-center text-xs text-[#666]">days</span>
                    <button
                      type="button"
                      disabled={!suspendReason.trim() || suspendMutation.isPending}
                      onClick={() =>
                        suspendMutation.mutate({ userId: user._id, reason: suspendReason, days: suspendDays })
                      }
                      className="rounded-lg border border-red-900/60 bg-red-900/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/30 disabled:opacity-40"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
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
    mutationFn: deleteShareApi,
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

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {sharesQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(sharesQuery.error)}</p>
              <button type="button" onClick={() => sharesQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
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
                      <td className="px-4 py-3 text-[#bbb]">{share.brewLog?.brewMethod?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-yellow-400">{share.brewLog?.rating ? `${share.brewLog.rating}/5` : '-'}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="block truncate text-[#bbb]">
                          {share.caption ?? <span className="text-[#555] italic">No caption</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#999]">{share.likesCount}</td>
                      <td className="px-4 py-3 text-[#999]">{new Date(share.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setViewShare(share)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]">
                            <Eye size={13} /> View
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(share)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20">
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

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-3">
            <span className="text-xs text-[#666]">
              {pagination.total} total · page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-40">
                <ChevronLeft size={14} /> Prev
              </button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ShareDetailModal
        share={viewShare}
        onClose={() => setViewShare(null)}
        onDelete={(id) => deleteMutation.mutate(id)}
        deleting={deleteMutation.isPending}
      />
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
  const [selectedUser, setSelectedUser] = useState<CommunityUser | null>(null);

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
    <>
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {usersQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(usersQuery.error)}</p>
              <button type="button" onClick={() => usersQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <SortHeader label="Name" col="name" />
                  <th className="px-4 py-3 font-medium">Email</th>
                  <SortHeader label="Role" col="role" />
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Points</th>
                  <th className="px-4 py-3 font-medium">Badges</th>
                  <SortHeader label="Followers" col="followersCount" />
                  <SortHeader label="Shares" col="totalShares" />
                  <SortHeader label="Joined" col="createdAt" />
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <SkeletonRows cols={10} />
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
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
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          {user.communityProfile?.isSuspended && (
                            <span className="rounded-full bg-red-900/30 border border-red-700/50 px-1.5 py-0.5 text-[10px] text-red-300">
                              Susp.
                            </span>
                          )}
                          {user.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#999]">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.communityProfile?.level ? (
                          <LevelBadge level={user.communityProfile.level} />
                        ) : (
                          <span className="text-[#555]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#bbb]">
                        {user.communityProfile?.levelPoints ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#bbb]">
                        {user.communityProfile?.badgesCount ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#bbb]">{user.followersCount}</td>
                      <td className="px-4 py-3 text-[#bbb]">{user.totalShares}</td>
                      <td className="px-4 py-3 text-[#999]">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/performance/user/${user._id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                          >
                            Profile
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
      <BrewerDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────

const RANK_STYLES = [
  'bg-yellow-900/20 border-yellow-700/40',
  'bg-gray-800/50 border-gray-600/40',
  'bg-orange-900/20 border-orange-800/40',
];
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardTab() {
  const query = useQuery({
    queryKey: ['admin-community-leaderboard'],
    queryFn: fetchLeaderboard,
  });

  const entries = query.data ?? [];

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
      {query.isError ? (
        <div className="p-5">
          <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
            <p className="text-red-300">{getErrorMessage(query.error)}</p>
            <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase text-[#666]">
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-4 py-3 font-medium w-12">Rank</th>
                <th className="px-4 py-3 font-medium">Brewer</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Brews</th>
                <th className="px-4 py-3 font-medium">Badges</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <SkeletonRows cols={6} />
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Trophy className="mx-auto mb-3 text-[#555]" size={30} />
                    <p className="text-sm text-[#777]">No leaderboard data yet</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const rowCls = index < 3 ? RANK_STYLES[index] : 'bg-transparent border-transparent';
                  return (
                    <tr key={entry.userId} className={`border-b border-[#242424] ${rowCls ? `border ${rowCls}` : ''}`}>
                      <td className="px-4 py-3 text-center font-bold text-[#ccc]">
                        {index < 3 ? RANK_MEDALS[index] : `#${index + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#D62B2B]/20 text-xs font-semibold text-[#D62B2B]">
                            {avatarInitial(entry.name)}
                          </div>
                          <span className="font-medium text-white">{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><LevelBadge level={entry.level} /></td>
                      <td className="px-4 py-3 font-semibold text-white">{entry.levelPoints}</td>
                      <td className="px-4 py-3 text-[#bbb]">{entry.totalBrews}</td>
                      <td className="px-4 py-3 text-[#bbb]">{entry.badgesCount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Moderation Tab ───────────────────────────────────────────────────────────

type ModerationFilter = 'all' | 'warned' | 'suspended';

function ModerationTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ModerationFilter>('all');
  const [warnTarget, setWarnTarget] = useState<CommunityProfile | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<CommunityProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  const query = useQuery({
    queryKey: ['admin-moderation-profiles'],
    queryFn: fetchModerationProfiles,
  });

  const warnMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      warnUserApi(userId, reason),
    onSuccess: () => {
      toast.success('Warning issued');
      setWarnTarget(null);
      setWarnReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason, days }: { userId: string; reason: string; days: number }) =>
      suspendUserApi(userId, reason, days),
    onSuccess: () => {
      toast.success('User suspended');
      setSuspendTarget(null);
      setSuspendReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => unsuspendUserApi(userId),
    onSuccess: () => {
      toast.success('User unsuspended');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-profiles'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const profiles = useMemo(() => {
    const data = query.data ?? [];
    if (filter === 'warned') return data.filter((p) => p.warningCount > 0 && !p.isSuspended);
    if (filter === 'suspended') return data.filter((p) => p.isSuspended);
    return data;
  }, [query.data, filter]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#141414] p-1 w-fit">
        {(['all', 'warned', 'suspended'] as ModerationFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? 'bg-[#D62B2B] text-white' : 'text-[#777] hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {query.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(query.error)}</p>
              <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20">
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Warnings</th>
                  <th className="px-4 py-3 font-medium">Suspended</th>
                  <th className="px-4 py-3 font-medium">Suspended Until</th>
                  <th className="px-4 py-3 font-medium">Last Note</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <SkeletonRows cols={6} />
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Shield className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No flagged users</p>
                    </td>
                  </tr>
                ) : (
                  profiles.map((p, index) => {
                    const lastNote = p.moderatorNotes[p.moderatorNotes.length - 1];
                    return (
                      <tr
                        key={p._id}
                        className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {p.user?.name ?? String(p.userId)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${p.warningCount > 0 ? 'text-yellow-400' : 'text-[#555]'}`}>
                            {p.warningCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.isSuspended ? (
                            <span className="rounded-full bg-red-900/30 border border-red-700/50 px-2 py-0.5 text-xs text-red-300">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[#555]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#999]">
                          {p.suspendedUntil ? new Date(p.suspendedUntil).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#888] max-w-[200px]">
                          <span className="block truncate text-xs">
                            {lastNote?.note ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setWarnTarget(p); setWarnReason(''); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-yellow-800/60 px-3 py-1.5 text-xs text-yellow-300 hover:bg-yellow-900/20"
                            >
                              <AlertTriangle size={12} /> Warn
                            </button>
                            {p.isSuspended ? (
                              <button
                                type="button"
                                disabled={unsuspendMutation.isPending}
                                onClick={() => unsuspendMutation.mutate(String(p.userId))}
                                className="inline-flex items-center gap-1 rounded-lg border border-green-800/60 px-3 py-1.5 text-xs text-green-300 hover:bg-green-900/20 disabled:opacity-40"
                              >
                                <XCircle size={12} /> Unsuspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setSuspendTarget(p); setSuspendReason(''); setSuspendDays(7); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"
                              >
                                <Shield size={12} /> Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warn modal */}
      <Modal isOpen={!!warnTarget} onClose={() => setWarnTarget(null)} title={`Warn ${warnTarget?.user?.name ?? 'User'}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#999]">Provide a reason for this warning. The user will be notified.</p>
          <textarea
            value={warnReason}
            onChange={(e) => setWarnReason(e.target.value)}
            placeholder="Reason…"
            rows={3}
            className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-yellow-600 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setWarnTarget(null)} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#999] hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              disabled={!warnReason.trim() || warnMutation.isPending}
              onClick={() => warnTarget && warnMutation.mutate({ userId: String(warnTarget.userId), reason: warnReason })}
              className="rounded-lg bg-yellow-700 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-40"
            >
              {warnMutation.isPending ? 'Issuing…' : 'Issue Warning'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Suspend modal */}
      <Modal isOpen={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={`Suspend ${suspendTarget?.user?.name ?? 'User'}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#999]">The user will be notified and cannot post brew shares while suspended.</p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason…"
            rows={3}
            className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-red-700 resize-none"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#999]">Duration:</label>
            <input
              type="number"
              min={1}
              max={365}
              value={suspendDays}
              onChange={(e) => setSuspendDays(Number(e.target.value))}
              className="w-20 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-red-700"
            />
            <span className="text-sm text-[#777]">days</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSuspendTarget(null)} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#999] hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              disabled={!suspendReason.trim() || suspendMutation.isPending}
              onClick={() =>
                suspendTarget &&
                suspendMutation.mutate({ userId: String(suspendTarget.userId), reason: suspendReason, days: suspendDays })
              }
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
            >
              {suspendMutation.isPending ? 'Suspending…' : 'Suspend'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'shares' | 'brewers' | 'leaderboard' | 'moderation';

export function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('shares');

  const tabs: [Tab, string][] = [
    ['shares', 'Shares'],
    ['brewers', 'Brewers'],
    ['leaderboard', 'Leaderboard'],
    ['moderation', 'Moderation'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Community</h1>
        <p className="mt-1 text-sm text-[#777]">Moderate brew shares, review community members, and manage the leaderboard.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-[#2A2A2A] bg-[#141414] p-1 w-fit">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-[#D62B2B] text-white' : 'text-[#777] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'shares' && <SharesTab />}
      {activeTab === 'brewers' && <BrewersTab />}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'moderation' && <ModerationTab />}
    </div>
  );
}
