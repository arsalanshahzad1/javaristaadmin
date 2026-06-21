import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Edit, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

type ContentType = 'article' | 'video' | 'event' | 'sourcing_story';

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
  tags: string[];
  publishedAt?: string;
  isActive: boolean;
  createdAt: string;
};

const contentTypeOptions: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'event', label: 'Event' },
  { value: 'sourcing_story', label: 'Sourcing Story' },
];

function contentTypeLabel(value: ContentType) {
  return contentTypeOptions.find((o) => o.value === value)?.label ?? value;
}

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message ?? 'Something went wrong';
}

async function fetchContent(contentType: string) {
  const response = await adminApiClient.get<ApiEnvelope<ExclusiveContent[]>>('/investor/content', {
    params: { includeInactive: 'true', limit: 100, contentType: contentType || undefined },
  });
  return response.data;
}

async function toggleActive(payload: { slug: string; isActive: boolean }) {
  const response = await adminApiClient.put<ApiEnvelope<ExclusiveContent>>(`/investor/content/${payload.slug}`, {
    isActive: payload.isActive,
  });
  return response.data;
}

async function deleteContent(slug: string) {
  const response = await adminApiClient.delete<ApiEnvelope<unknown>>(`/investor/content/${slug}`);
  return response.data;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <tr key={row} className="border-b border-[#242424]">
          {[0, 1, 2, 3, 4, 5].map((cell) => (
            <td key={cell} className="px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-[#242424]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function InvestorContentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<ExclusiveContent | null>(null);

  const contentQuery = useQuery({
    queryKey: ['investor-content', contentType],
    queryFn: () => fetchContent(contentType),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleActive,
    onSuccess: (response) => {
      toast.success(response.message || 'Content updated');
      queryClient.invalidateQueries({ queryKey: ['investor-content'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContent,
    onSuccess: (response) => {
      toast.success(response.message || 'Content deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['investor-content'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const items = contentQuery.data?.data ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = items.filter(
    (item) =>
      item.contentType === 'event' &&
      item.publishedAt &&
      new Date(item.publishedAt) >= today,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Investor Content</h1>
          <p className="mt-1 text-sm text-[#777]">Manage exclusive content for investors.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/investor-content/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D62B2B] px-4 py-2 text-sm font-medium text-white hover:bg-[#B92323]"
        >
          <Plus size={16} />
          New Content
        </button>
      </div>

      {/* Content table */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#2A2A2A] p-4">
          {contentTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setContentType(opt.value as ContentType | '')}
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

        {contentQuery.isError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
              <p className="text-red-300">{getErrorMessage(contentQuery.error)}</p>
              <button
                type="button"
                onClick={() => contentQuery.refetch()}
                className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-[#1A1A1A] text-xs uppercase text-[#666]">
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Content Type</th>
                  <th className="px-4 py-3 font-medium">Published At</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentQuery.isLoading ? (
                  <SkeletonRows />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FileText className="mx-auto mb-3 text-[#555]" size={30} />
                      <p className="text-sm text-[#777]">No content found</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`${index % 2 === 0 ? 'bg-[#171717]' : 'bg-[#1E1E1E]'} border-b border-[#242424]`}
                    >
                      <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                      <td className="px-4 py-3 text-[#bbb]">
                        <Badge variant="info">{contentTypeLabel(item.contentType)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#999]">
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {item.tags.length === 0 ? (
                            <span className="text-[#666]">-</span>
                          ) : (
                            item.tags.map((tag) => (
                              <Badge key={tag} variant="default">
                                {tag}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
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
                            <RefreshCw size={13} /> Toggle Active
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
        )}
      </section>

      {/* Upcoming events section */}
      <section className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-[#D62B2B]" />
          <h2 className="text-base font-semibold text-white">Upcoming Events</h2>
        </div>

        {contentQuery.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[#242424]" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-[#666]">No upcoming events.</p>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {upcomingEvents.map((event) => (
              <li key={event._id} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-white">{event.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#888]">
                    {event.publishedAt ? new Date(event.publishedAt).toLocaleDateString() : '-'}
                  </span>
                  <Badge variant={event.isActive ? 'success' : 'default'}>
                    {event.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
        title="Delete content?"
        message={`This will deactivate "${deleteTarget?.title}". The content will no longer be visible to investors.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
