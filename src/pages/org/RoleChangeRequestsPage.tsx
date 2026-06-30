import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { orgApi } from '../../api/org.api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Pagination } from '../../components/ui/Pagination';
import type { RoleChangeRequest } from '../../types/org';

type TabKey = 'pending' | 'approved' | 'rejected' | 'all';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-900/30 text-amber-400',
  approved: 'bg-green-900/30 text-green-400',
  rejected: 'bg-red-900/30 text-red-400',
  withdrawn: 'bg-[#2A2A2A] text-[#888]',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? STATUS_BADGE.withdrawn;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#242424] text-[#aaa] text-xs capitalize">
      {role.replace(/_/g, ' ')}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'dd MMM yyyy');
  } catch {
    return iso;
  }
}

/**
 * Admin page for reviewing employee role change requests.
 * Tabs: Pending | Approved | Rejected | All.
 * Approve/Reject via a modal with an optional/required review note.
 */
export function RoleChangeRequestsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('pending');
  const [page, setPage] = useState(1);
  const [reviewModal, setReviewModal] = useState<{
    request: RoleChangeRequest;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const statusParam = tab === 'all' ? undefined : tab;

  const { data, isLoading, error } = useQuery({
    queryKey: ['role-change-requests', tab, page],
    queryFn: () => orgApi.getRoleChangeRequests({ status: statusParam, page, limit: 20 }),
    staleTime: 30_000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'approved' | 'rejected'; note: string }) =>
      orgApi.reviewRoleChangeRequest(id, action, note || undefined),
    onMutate: async ({ id }) => {
      // Optimistically remove the row from the pending list.
      await queryClient.cancelQueries({ queryKey: ['role-change-requests', tab, page] });
      const previous = queryClient.getQueryData(['role-change-requests', tab, page]);
      if (tab === 'pending') {
        queryClient.setQueryData(
          ['role-change-requests', tab, page],
          (old: { data: RoleChangeRequest[]; pagination: unknown } | undefined) =>
            old ? { ...old, data: old.data.filter((r) => r._id !== id) } : old
        );
      }
      return { previous };
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approved' ? 'Request approved.' : 'Request rejected.');
      closeModal();
    },
    onError: (_err, _vars, context) => {
      // Restore the removed row on failure.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['role-change-requests', tab, page], context.previous);
      }
      toast.error('Failed to submit review.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['role-change-requests'] });
    },
  });

  function openReview(request: RoleChangeRequest, action: 'approved' | 'rejected') {
    setReviewModal({ request, action });
    setReviewNote('');
    setNoteError('');
  }

  function closeModal() {
    setReviewModal(null);
    setReviewNote('');
    setNoteError('');
  }

  function submitReview() {
    if (!reviewModal) return;
    if (reviewModal.action === 'rejected' && !reviewNote.trim()) {
      setNoteError('A review note is required when rejecting a request.');
      return;
    }
    reviewMutation.mutate({
      id: reviewModal.request._id,
      action: reviewModal.action,
      note: reviewNote.trim(),
    });
  }

  const requests: RoleChangeRequest[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Role Change Requests</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#2A2A2A] pb-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px
              ${tab === key
                ? 'border-[#D62B2B] text-white'
                : 'border-transparent text-[#555] hover:text-[#aaa]'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Spinner />
        </div>
      )}

      {error && (
        <p className="text-[#D62B2B] text-sm">Failed to load requests.</p>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <div className="flex items-center justify-center h-48 text-[#555] text-sm">
          No {tab === 'all' ? '' : tab} requests found.
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {[
                  'Employee', 'Current Role', 'Requested Role', 'Reason',
                  'Requested At', 'Status', tab === 'pending' ? 'Actions' : 'Reviewer',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#555] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req._id}
                  className="border-b border-[#2A2A2A] last:border-0 hover:bg-[#242424] transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{req.targetUser.name}</p>
                    {req.requestedBy._id !== req.targetUser._id && (
                      <p className="text-xs text-[#555]">by {req.requestedBy.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RoleChip role={req.fromRole} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={12} className="text-[#555]" />
                      <RoleChip role={req.toRole} />
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-[#aaa] text-xs truncate" title={req.reason}>
                      {req.reason}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#555] text-xs whitespace-nowrap">
                    {formatDate(req.requestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openReview(req, 'approved')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-900/30
                            text-green-400 hover:bg-green-900/50 text-xs font-medium cursor-pointer transition-colors"
                        >
                          <CheckCircle size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => openReview(req, 'rejected')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-900/30
                            text-red-400 hover:bg-red-900/50 text-xs font-medium cursor-pointer transition-colors"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div>
                        {req.reviewedBy && (
                          <p className="text-xs text-[#666]">{req.reviewedBy.name}</p>
                        )}
                        {req.reviewNote && (
                          <p className="text-xs text-[#444] mt-0.5 max-w-[160px] truncate" title={req.reviewNote}>
                            {req.reviewNote}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={pagination.pages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Review modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={closeModal}
        title={reviewModal?.action === 'approved' ? 'Approve Request' : 'Reject Request'}
        size="sm"
      >
        {reviewModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#242424] border border-[#2A2A2A]">
              <p className="text-sm text-white font-medium">{reviewModal.request.targetUser.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <RoleChip role={reviewModal.request.fromRole} />
                <ArrowRight size={12} className="text-[#555]" />
                <RoleChip role={reviewModal.request.toRole} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
                Review Note {reviewModal.action === 'rejected' && <span className="text-[#D62B2B]">*</span>}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => { setReviewNote(e.target.value); setNoteError(''); }}
                placeholder={
                  reviewModal.action === 'rejected'
                    ? 'Explain why this request was rejected…'
                    : 'Optional note for the employee…'
                }
                rows={3}
                className="w-full bg-[#242424] border border-[#2A2A2A] rounded-lg px-3 py-2
                  text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#D62B2B] resize-none"
              />
              {noteError && (
                <p className="text-[#D62B2B] text-xs mt-1">{noteError}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={closeModal} disabled={reviewMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant={reviewModal.action === 'rejected' ? 'danger' : 'primary'}
                size="sm"
                onClick={submitReview}
                loading={reviewMutation.isPending}
              >
                {reviewModal.action === 'approved' ? (
                  <><CheckCircle size={14} /> Approve</>
                ) : (
                  <><XCircle size={14} /> Reject</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
