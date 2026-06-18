import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi } from '../../api/subscriptions.api';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate } from '../../utils/formatters';
import type { Subscription, User } from '../../types';

export function SubscriptionsPage() {
  const { page, limit, goToPage } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', page, limit],
    queryFn: () => subscriptionsApi.getAll({ page, limit }),
  });

  const subs = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const columns = [
    {
      key: 'user', label: 'User',
      render: (s: Subscription) => <span className="text-white text-sm">{(s.user as User)?.name ?? '—'}</span>,
    },
    {
      key: 'plan', label: 'Plan',
      render: (s: Subscription) => <Badge variant="info">{s.plan}</Badge>,
    },
    {
      key: 'status', label: 'Status',
      render: (s: Subscription) => (
        <Badge variant={s.status === 'active' ? 'success' : s.status === 'expired' ? 'danger' : 'warning'}>
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'startDate', label: 'Start',
      render: (s: Subscription) => <span className="text-[#999] text-xs">{formatDate(s.startDate)}</span>,
    },
    {
      key: 'endDate', label: 'End',
      render: (s: Subscription) => <span className="text-[#999] text-xs">{formatDate(s.endDate)}</span>,
    },
    {
      key: 'transactionId', label: 'Tx ID',
      render: (s: Subscription) => <span className="text-[#555] text-xs font-mono">{s.transactionId}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Subscriptions" description={`${pagination?.total ?? 0} subscriptions`} />
      <Card>
        <Table columns={columns} data={subs} keyExtractor={(s) => s._id} loading={isLoading} emptyMessage="No subscriptions found" />
        {pagination && (
          <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={goToPage} />
        )}
      </Card>
    </div>
  );
}
