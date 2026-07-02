import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, BookOpen, CalendarDays, Edit, FileText,
  Globe, Layers, Leaf, Plus, RefreshCw, Trash2, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType =
  | 'article' | 'video' | 'event' | 'sourcing_story'
  | 'financial_report' | 'construction_update' | 'ceo_update'
  | 'governance_update' | 'dividend_update' | 'expansion_update';

type AccessLevel = 'community' | 'shareholder' | 'major_investor' | 'board' | 'admin';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

type ExclusiveContent = {
  _id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  accessLevel: AccessLevel;
  isPinned: boolean;
  tags: string[];
  publishedAt?: string;
  isActive: boolean;
  createdAt: string;
  viewCount: number;
};

type Store = { _id: string; name: string; storeNumber: string; status: string };

type ConstructionJournal = {
  _id: string;
  storeId: Store | string;
  title: string;
  milestone?: string;
  progressPercent: number;
  isPublished: boolean;
  publishedAt?: string;
  photos: { url: string; publicId: string; caption?: string }[];
};

type SourcingStory = {
  _id: string;
  coffeeName: string;
  origin: { country: string; region: string; process?: string };
  tastingNotes: string[];
  accessLevel: AccessLevel;
  isPublished: boolean;
  createdAt: string;
};

type TransparencyData = {
  totalStores: number;
  storesByStatus: { open: number; construction: number; planning: number; closed: number };
  totalShareholders: number;
  totalEmployees: number;
  totalCertifications: number;
  recentJournalEntries: Array<{ _id: string; title: string; milestone?: string; progressPercent: number; publishedAt?: string; storeId?: { name: string } }>;
  recentContent: Array<{ _id: string; title: string; contentType: string; publishedAt?: string }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

const ACCESS_LEVEL_BADGE: Record<AccessLevel, { label: string; cls: string }> = {
  community: { label: 'Community', cls: 'bg-gray-700 text-gray-200' },
  shareholder: { label: 'Shareholder', cls: 'bg-blue-900/60 text-blue-200' },
  major_investor: { label: 'Major Investor', cls: 'bg-purple-900/60 text-purple-200' },
  board: { label: 'Board', cls: 'bg-amber-900/60 text-amber-300' },
  admin: { label: 'Admin Only', cls: 'bg-red-900/60 text-red-300' },
};

function AccessBadge({ level }: { level: AccessLevel }) {
  const { label, cls } = ACCESS_LEVEL_BADGE[level] ?? ACCESS_LEVEL_BADGE.shareholder;
  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

const MILESTONE_COLORS: Record<string, string> = {
  Structural: 'bg-slate-700 text-slate-200',
  Interior: 'bg-teal-900/60 text-teal-200',
  Equipment: 'bg-blue-900/60 text-blue-200',
  'Soft Opening': 'bg-amber-900/60 text-amber-300',
  'Grand Opening': 'bg-green-900/60 text-green-300',
  Other: 'bg-zinc-700 text-zinc-200',
};

function MilestoneBadge({ milestone }: { milestone?: string }) {
  if (!milestone) return null;
  const cls = MILESTONE_COLORS[milestone] ?? 'bg-zinc-700 text-zinc-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {milestone}
    </span>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {Array.from({ length: cols }, (_, cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchContent(contentType: string) {
  const r = await adminApiClient.get<ApiEnvelope<ExclusiveContent[]>>('/investor/content', {
    params: { includeInactive: 'true', limit: 100, contentType: contentType || undefined },
  });
  return r.data;
}

async function toggleContentActive(p: { slug: string; isActive: boolean }) {
  const r = await adminApiClient.put<ApiEnvelope<ExclusiveContent>>(`/investor/content/${p.slug}`, { isActive: p.isActive });
  return r.data;
}

async function deleteContentItem(slug: string) {
  const r = await adminApiClient.delete<ApiEnvelope<unknown>>(`/investor/content/${slug}`);
  return r.data;
}

async function fetchStores() {
  const r = await adminApiClient.get<ApiEnvelope<Store[]>>('/stores', { params: { limit: 200 } });
  return r.data.data ?? [];
}

async function fetchJournals(storeId: string) {
  const r = await adminApiClient.get<ApiEnvelope<ConstructionJournal[]>>('/construction-journals', {
    params: { limit: 100, storeId: storeId || undefined },
  });
  return r.data.data ?? [];
}

async function deleteJournal(id: string) {
  const r = await adminApiClient.delete<ApiEnvelope<unknown>>(`/construction-journals/${id}`);
  return r.data;
}

async function fetchStories() {
  const r = await adminApiClient.get<ApiEnvelope<SourcingStory[]>>('/sourcing-stories', { params: { limit: 100 } });
  return r.data.data ?? [];
}

async function deleteStory(id: string) {
  const r = await adminApiClient.delete<ApiEnvelope<unknown>>(`/sourcing-stories/${id}`);
  return r.data;
}

async function fetchTransparency() {
  const r = await adminApiClient.get<ApiEnvelope<TransparencyData>>('/investor/transparency');
  return r.data.data;
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'content' | 'journals' | 'stories' | 'transparency';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Content', icon: <FileText size={15} /> },
  { id: 'journals', label: 'Construction Journals', icon: <BookOpen size={15} /> },
  { id: 'stories', label: 'Sourcing Stories', icon: <Leaf size={15} /> },
  { id: 'transparency', label: 'Transparency', icon: <BarChart2 size={15} /> },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function InvestorContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>('content');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Investor Hub</h1>
          <p className="mt-1 text-sm text-[#777]">Manage all investor-facing content, journals, and sourcing stories.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#D62B2B] text-white'
                : 'text-[#999] hover:bg-[#242424] hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'content' && <ContentTab />}
      {activeTab === 'journals' && <JournalsTab />}
      {activeTab === 'stories' && <StoriesTab />}
      {activeTab === 'transparency' && <TransparencyTab />}
    </div>
  );
}

// ─── Content Tab ──────────────────────────────────────────────────────────────

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'event', label: 'Event' },
  { value: 'sourcing_story', label: 'Sourcing Story' },
  { value: 'financial_report', label: 'Financial Report' },
  { value: 'construction_update', label: 'Construction Update' },
  { value: 'ceo_update', label: 'CEO Update' },
  { value: 'governance_update', label: 'Governance Update' },
  { value: 'dividend_update', label: 'Dividend Update' },
  { value: 'expansion_update', label: 'Expansion Update' },
];

function contentTypeLabel(value: string) {
  return CONTENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function ContentTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ExclusiveContent | null>(null);

  const query = useQuery({ queryKey: ['investor-content', contentType], queryFn: () => fetchContent(contentType) });

  const toggleMutation = useMutation({
    mutationFn: toggleContentActive,
    onSuccess: (r) => { toast.success(r.message); queryClient.invalidateQueries({ queryKey: ['investor-content'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContentItem,
    onSuccess: (r) => { toast.success(r.message ?? 'Deleted'); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['investor-content'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const items = query.data?.data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingEvents = items.filter((i) => i.contentType === 'event' && i.publishedAt && new Date(i.publishedAt) >= today);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/investor-content/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          <Plus size={16} /> New Content
        </button>
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#2A2A2A] p-4">
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContentType(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                contentType === opt.value
                  ? 'border-[#D62B2B] bg-[#D62B2B]/10 text-[#D62B2B]'
                  : 'border-[#333] text-[#999] hover:border-[#555] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="text-xs uppercase text-[#666]">
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Access Level</th>
                <th className="px-4 py-3 font-medium">Published At</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <SkeletonRows cols={7} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-3 text-[#555]" size={30} />
                    <p className="text-sm text-[#777]">No content found</p>
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={item._id} className={`${i % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center gap-2">
                        {item.isPinned && <span className="text-[#D62B2B]" title="Pinned">📌</span>}
                        {item.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{contentTypeLabel(item.contentType)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <AccessBadge level={item.accessLevel ?? 'shareholder'} />
                    </td>
                    <td className="px-4 py-3 text-[#999]">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-[#999]">{item.viewCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.isActive ? 'success' : 'default'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/investor-content/${item.slug}/edit`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ slug: item.slug, isActive: !item.isActive })}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424] disabled:opacity-50"
                        >
                          <RefreshCw size={13} /> Toggle
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
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
      </section>

      {upcomingEvents.length > 0 && (
        <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-[#D62B2B]" />
            <h2 className="text-base font-semibold text-white">Upcoming Events</h2>
          </div>
          <ul className="divide-y divide-[#2A2A2A]">
            {upcomingEvents.map((event) => (
              <li key={event._id} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-white">{event.title}</span>
                <span className="text-xs text-[#888]">
                  {event.publishedAt ? new Date(event.publishedAt).toLocaleDateString() : '-'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
        title="Delete content?"
        message={`Deactivate "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Journals Tab ─────────────────────────────────────────────────────────────

function JournalsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ConstructionJournal | null>(null);

  const storesQuery = useQuery({ queryKey: ['stores-list'], queryFn: fetchStores });
  const journalsQuery = useQuery({ queryKey: ['construction-journals', storeId], queryFn: () => fetchJournals(storeId) });

  const deleteMutation = useMutation({
    mutationFn: deleteJournal,
    onSuccess: () => { toast.success('Journal deleted'); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['construction-journals'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const stores = storesQuery.data ?? [];
  const journals = journalsQuery.data ?? [];

  function storeName(storeId: Store | string) {
    if (typeof storeId === 'object') return `${storeId.name} (#${storeId.storeNumber})`;
    const found = stores.find((s) => s._id === storeId);
    return found ? `${found.name} (#${found.storeNumber})` : storeId;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B]"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s._id} value={s._id}>{s.name} (#{s.storeNumber})</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => navigate('/investor-content/journals/new')}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          <Plus size={16} /> New Journal Entry
        </button>
      </div>

      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-[#666]">
              <tr className="border-b border-[#2A2A2A]">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Milestone</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {journalsQuery.isLoading ? (
                <SkeletonRows cols={7} />
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <BookOpen className="mx-auto mb-3 text-[#555]" size={30} />
                    <p className="text-sm text-[#777]">No journal entries yet</p>
                  </td>
                </tr>
              ) : (
                journals.map((j, i) => (
                  <tr key={j._id} className={`${i % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}>
                    <td className="px-4 py-3 font-medium text-white">{j.title}</td>
                    <td className="px-4 py-3 text-[#bbb]">{storeName(j.storeId)}</td>
                    <td className="px-4 py-3"><MilestoneBadge milestone={j.milestone} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#333]">
                          <div
                            className="h-full rounded-full bg-[#D62B2B]"
                            style={{ width: `${j.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#999]">{j.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#999]">{j.photos.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={j.isPublished ? 'success' : 'default'}>
                        {j.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/investor-content/journals/${j._id}/edit`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(j)}
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
      </section>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete journal entry?"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Sourcing Stories Tab ─────────────────────────────────────────────────────

const PROCESS_BADGE: Record<string, string> = {
  Natural: 'bg-amber-900/50 text-amber-300',
  Washed: 'bg-blue-900/50 text-blue-300',
  'Honey Process': 'bg-yellow-900/50 text-yellow-300',
};

function StoriesTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<SourcingStory | null>(null);

  const query = useQuery({ queryKey: ['sourcing-stories'], queryFn: fetchStories });

  const deleteMutation = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { toast.success('Story deleted'); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ['sourcing-stories'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const stories = query.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/investor-content/stories/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          <Plus size={16} /> New Story
        </button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-[#242424]" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
          <Leaf className="mx-auto mb-3 text-[#555]" size={32} />
          <p className="text-sm text-[#777]">No sourcing stories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => {
            const processCls = PROCESS_BADGE[story.origin.process ?? ''] ?? 'bg-zinc-700 text-zinc-200';
            return (
              <div key={story._id} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#777]">
                      <Globe size={11} className="mr-1 inline" />
                      {story.origin.country} · {story.origin.region}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">{story.coffeeName}</p>
                  </div>
                  <Badge variant={story.isPublished ? 'success' : 'default'}>
                    {story.isPublished ? 'Live' : 'Draft'}
                  </Badge>
                </div>
                {story.origin.process && (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${processCls}`}>
                    {story.origin.process}
                  </span>
                )}
                {story.tastingNotes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {story.tastingNotes.slice(0, 4).map((note) => (
                      <span key={note} className="rounded-full border border-[#333] px-2 py-0.5 text-xs text-[#999]">
                        {note}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/investor-content/stories/${story._id}/edit`)}
                    className="flex-1 rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#ddd] hover:bg-[#242424]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(story)}
                    className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Delete sourcing story?"
        message={`Delete "${deleteTarget?.coffeeName}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Transparency Tab ─────────────────────────────────────────────────────────

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="mb-2 flex items-center gap-2 text-[#777]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#999]">
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className="h-full rounded-full bg-[#D62B2B] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TransparencyTab() {
  const query = useQuery({ queryKey: ['investor-transparency'], queryFn: fetchTransparency });

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[#242424]" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm text-red-300">
        {getErrorMessage(query.error)}
      </div>
    );
  }

  const d = query.data!;
  const totalStores = d.totalStores;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Stores Open" value={d.storesByStatus.open} icon={<TrendingUp size={14} />} />
        <KpiCard label="Under Construction" value={d.storesByStatus.construction} icon={<Layers size={14} />} />
        <KpiCard label="In Planning" value={d.storesByStatus.planning} icon={<FileText size={14} />} />
        <KpiCard label="Shareholders" value={d.totalShareholders} icon={<TrendingUp size={14} />} />
        <KpiCard label="Employees" value={d.totalEmployees} icon={<TrendingUp size={14} />} />
        <KpiCard label="Certifications" value={d.totalCertifications} icon={<TrendingUp size={14} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Store Status breakdown */}
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Store Status Breakdown</h3>
          <div className="space-y-3">
            <StatusBar label="Open" value={d.storesByStatus.open} total={totalStores} />
            <StatusBar label="Construction" value={d.storesByStatus.construction} total={totalStores} />
            <StatusBar label="Planning" value={d.storesByStatus.planning} total={totalStores} />
            <StatusBar label="Closed" value={d.storesByStatus.closed} total={totalStores} />
          </div>
        </div>

        {/* Recent journals */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Recent Journal Entries</h3>
            {d.recentJournalEntries.length === 0 ? (
              <p className="text-xs text-[#666]">None yet</p>
            ) : (
              <ul className="divide-y divide-[#2A2A2A]">
                {d.recentJournalEntries.map((j) => (
                  <li key={j._id} className="py-2">
                    <p className="text-sm font-medium text-white">{j.title}</p>
                    <p className="text-xs text-[#777]">
                      {j.storeId?.name ?? '—'} · {j.milestone ? j.milestone + ' · ' : ''}
                      {j.progressPercent}%
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Recent Content</h3>
            {d.recentContent.length === 0 ? (
              <p className="text-xs text-[#666]">None yet</p>
            ) : (
              <ul className="divide-y divide-[#2A2A2A]">
                {d.recentContent.map((c) => (
                  <li key={c._id} className="py-2">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <p className="text-xs text-[#777]">{contentTypeLabel(c.contentType)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
