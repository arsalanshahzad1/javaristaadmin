import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft, BookOpen, CheckCircle, Download, ExternalLink, FileText, Video } from 'lucide-react';
import type { AxiosError } from 'axios';
import adminApiClient from '../../api/adminApiClient';
import { Badge } from '../../components/ui/Badge';

type Category = 'recipe' | 'procedure' | 'checklist_template' | 'troubleshooting' | 'standard' | 'training';
type PlaybookStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
type AttachmentType = 'image' | 'pdf' | 'video';
type ApiEnvelope<T> = { success: boolean; message: string; data: T };

type PlaybookAttachment = {
  _id: string;
  type: AttachmentType;
  url: string;
  title: string;
  description?: string;
  order: number;
};

type PlaybookSummary = { _id: string; title: string; slug: string; category: Category };

type Playbook = {
  _id: string;
  title: string;
  slug: string;
  category: Category;
  tags: string[];
  body: string;
  attachments: PlaybookAttachment[];
  version?: string;
  status?: PlaybookStatus;
  assignedRoles?: string[];
  relatedPlaybooks?: PlaybookSummary[];
  complianceTracking?: { isRequired: boolean; acknowledgeRequired: boolean; requiredByDate?: string };
  readCount: number;
};

type ComplianceData = {
  totalAssigned: number;
  readCount: number;
  acknowledgedCount: number;
  readPercent: number;
  acknowledgedPercent: number;
  readers: Array<{ userId: string; name: string; readAt: string; acknowledged: boolean; acknowledgedAt?: string }>;
};

const STATUS_COLORS: Record<PlaybookStatus, string> = {
  draft: 'bg-[#2A2A2A] text-[#888]',
  review: 'bg-amber-900/40 text-amber-300',
  approved: 'bg-blue-900/40 text-blue-300',
  published: 'bg-green-900/40 text-green-300',
  archived: 'bg-[#1A1A1A] text-[#555]',
};

const CATEGORY_LABELS: Record<Category, string> = {
  recipe: 'Recipe',
  procedure: 'Procedure',
  checklist_template: 'Checklist Template',
  troubleshooting: 'Troubleshooting',
  standard: 'Standard',
  training: 'Training',
};

function getErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

function isYouTube(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function isVimeo(url: string) {
  return url.includes('vimeo.com');
}

function youtubeEmbedUrl(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function vimeoEmbedUrl(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  if (isYouTube(url)) {
    return (
      <div className="rounded-lg overflow-hidden border border-[#333]">
        <iframe
          src={youtubeEmbedUrl(url)}
          title={title}
          className="w-full aspect-video"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }
  if (isVimeo(url)) {
    return (
      <div className="rounded-lg overflow-hidden border border-[#333]">
        <iframe
          src={vimeoEmbedUrl(url)}
          title={title}
          className="w-full aspect-video"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="rounded-lg overflow-hidden border border-[#333]">
      <video src={url} controls className="w-full" title={title} />
    </div>
  );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-[#222] overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

export function PlaybookDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const playbookQuery = useQuery({
    queryKey: ['playbook-detail', slug],
    queryFn: async () => {
      const response = await adminApiClient.get<ApiEnvelope<Playbook>>(`/playbooks/${slug}`);
      return response.data.data;
    },
    enabled: Boolean(slug),
  });

  const complianceQuery = useQuery({
    queryKey: ['playbook-compliance', playbookQuery.data?._id],
    queryFn: async () => {
      const response = await adminApiClient.get<ApiEnvelope<ComplianceData>>(`/playbooks/${playbookQuery.data!._id}/compliance`);
      return response.data.data;
    },
    enabled: Boolean(playbookQuery.data?._id),
  });

  const bodyHtml = useMemo(() => {
    if (!playbookQuery.data?.body) return '';
    return marked.parse(playbookQuery.data.body, { async: false }) as string;
  }, [playbookQuery.data?.body]);

  if (playbookQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-[#242424]" />
        <div className="h-64 animate-pulse rounded-xl bg-[#242424]" />
      </div>
    );
  }

  if (playbookQuery.isError) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-900/10 p-4 text-sm">
        <p className="text-red-300">{getErrorMessage(playbookQuery.error)}</p>
        <button type="button" onClick={() => playbookQuery.refetch()} className="mt-3 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/20">Try again</button>
      </div>
    );
  }

  const playbook = playbookQuery.data!;
  const images = (playbook.attachments ?? []).filter((a) => a.type === 'image');
  const pdfs = (playbook.attachments ?? []).filter((a) => a.type === 'pdf');
  const videos = (playbook.attachments ?? []).filter((a) => a.type === 'video');

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/playbooks')} className="flex items-center gap-1.5 text-sm text-[#888] hover:text-white">
          <ArrowLeft size={16} />
          Playbooks
        </button>
      </div>

      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">{playbook.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {playbook.version && (
              <span className="rounded bg-[#222] px-2 py-0.5 text-xs text-[#aaa]">v{playbook.version}</span>
            )}
            {playbook.status && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[playbook.status]}`}>
                {playbook.status}
              </span>
            )}
            <span className="rounded-full bg-[#D62B2B]/10 px-2.5 py-0.5 text-xs font-medium text-[#D62B2B] border border-[#D62B2B]/20">
              {CATEGORY_LABELS[playbook.category] ?? playbook.category}
            </span>
          </div>
        </div>

        {/* Assigned roles */}
        {(playbook.assignedRoles ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {playbook.assignedRoles!.map((r) => (
              <Badge key={r} variant="default">{r.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {(playbook.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {playbook.tags.map((t) => (
              <span key={t} className="rounded-md bg-[#222] px-2 py-0.5 text-xs text-[#888]">{t}</span>
            ))}
          </div>
        )}

        {/* Markdown body */}
        <div
          className="prose prose-invert prose-sm max-w-none border-t border-[#2A2A2A] pt-4 text-[#ddd] [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_code]:rounded [&_code]:bg-[#2A2A2A] [&_code]:px-1 [&_code]:text-[#f59e0b] [&_pre]:rounded-lg [&_pre]:bg-[#2A2A2A] [&_blockquote]:border-l-2 [&_blockquote]:border-[#D62B2B] [&_blockquote]:pl-3 [&_a]:text-[#D62B2B]"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {/* Attachments */}
        {(images.length > 0 || pdfs.length > 0 || videos.length > 0) && (
          <div className="border-t border-[#2A2A2A] pt-4 space-y-4">
            <h2 className="text-sm font-semibold text-[#ccc]">Attachments</h2>

            {/* Images grid */}
            {images.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-[#666]">Images</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((att) => (
                    <a key={att._id} href={att.url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg overflow-hidden border border-[#333] hover:border-[#D62B2B]/50">
                      <img src={att.url} alt={att.title} className="h-32 w-full object-cover" />
                      <div className="bg-[#111] px-2 py-1.5">
                        <p className="text-xs text-[#aaa] truncate">{att.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* PDFs */}
            {pdfs.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-[#666]">PDFs</p>
                <div className="space-y-2">
                  {pdfs.map((att) => (
                    <div key={att._id} className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2">
                      <FileText size={16} className="shrink-0 text-[#D62B2B]" />
                      <span className="flex-1 text-sm text-[#ddd] truncate">{att.title}</span>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#D62B2B] hover:text-[#ff4444]">
                        <Download size={12} /> Download
                      </a>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#888] hover:text-white ml-2">
                        <ExternalLink size={12} /> View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-[#666]">Videos</p>
                <div className="space-y-4">
                  {videos.map((att) => (
                    <div key={att._id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Video size={14} className="text-blue-400" />
                        <p className="text-sm font-medium text-[#ddd]">{att.title}</p>
                      </div>
                      <VideoEmbed url={att.url} title={att.title} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Related Playbooks */}
        {(playbook.relatedPlaybooks ?? []).length > 0 && (
          <div className="border-t border-[#2A2A2A] pt-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#ccc]">Related Playbooks</h2>
            <div className="flex flex-wrap gap-2">
              {playbook.relatedPlaybooks!.map((related) => (
                <button
                  key={related._id}
                  type="button"
                  onClick={() => navigate(`/playbooks/${related.slug}/detail`)}
                  className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-left hover:border-[#D62B2B]/40 hover:bg-[#1a1a1a]"
                >
                  <BookOpen size={14} className="shrink-0 text-[#D62B2B]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{related.title}</p>
                    <p className="text-xs text-[#666]">{CATEGORY_LABELS[related.category] ?? related.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compliance Panel */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#ccc]">Compliance</h2>

        {complianceQuery.isLoading && (
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-[#242424]" />
            <div className="h-2 animate-pulse rounded-full bg-[#242424]" />
          </div>
        )}

        {complianceQuery.data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="text-2xl font-bold text-white">{complianceQuery.data.totalAssigned}</p>
                <p className="text-xs text-[#666]">Assigned</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="text-2xl font-bold text-white">{complianceQuery.data.readCount}</p>
                <p className="text-xs text-[#666]">Read</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="text-2xl font-bold text-white">{complianceQuery.data.acknowledgedCount}</p>
                <p className="text-xs text-[#666]">Acknowledged</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <p className="text-2xl font-bold text-white">{playbook.readCount ?? 0}</p>
                <p className="text-xs text-[#666]">Total Reads</p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[#888]">Read</span>
                  <span className="text-[#ccc]">{complianceQuery.data.readPercent}%</span>
                </div>
                <ProgressBar percent={complianceQuery.data.readPercent} color="bg-green-500" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[#888]">Acknowledged</span>
                  <span className="text-[#ccc]">{complianceQuery.data.acknowledgedPercent}%</span>
                </div>
                <ProgressBar percent={complianceQuery.data.acknowledgedPercent} color="bg-blue-500" />
              </div>
            </div>

            {complianceQuery.data.readers.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-[#888]">Readers</h3>
                <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-[#111] text-[#666]">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Read At</th>
                        <th className="px-3 py-2 font-medium">Acknowledged</th>
                        <th className="px-3 py-2 font-medium">Acknowledged At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceQuery.data.readers.map((reader, idx) => (
                        <tr key={idx} className="border-t border-[#2A2A2A]">
                          <td className="px-3 py-2 text-[#ddd]">{reader.name}</td>
                          <td className="px-3 py-2 text-[#999]">{new Date(reader.readAt).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            {reader.acknowledged
                              ? <CheckCircle size={14} className="text-green-400" />
                              : <span className="text-[#555]">—</span>}
                          </td>
                          <td className="px-3 py-2 text-[#999]">
                            {reader.acknowledgedAt ? new Date(reader.acknowledgedAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
