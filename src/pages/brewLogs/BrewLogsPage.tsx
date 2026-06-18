import { useQuery } from '@tanstack/react-query';
import { brewLogsApi } from '../../api/brewLogs.api';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate, formatRating } from '../../utils/formatters';
import type { BrewLog, BrewMethod, User } from '../../types';

export function BrewLogsPage() {
  const { page, limit, goToPage } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['brew-logs', page, limit],
    queryFn: () => brewLogsApi.getAll({ page, limit }),
  });

  const logs = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const columns = [
    {
      key: 'user', label: 'User',
      render: (l: BrewLog) => <span className="text-white text-sm">{(l.user as User)?.name ?? '—'}</span>,
    },
    {
      key: 'brewMethod', label: 'Method',
      render: (l: BrewLog) => <Badge variant="info">{(l.brewMethod as BrewMethod)?.name ?? '—'}</Badge>,
    },
    {
      key: 'coffeeDose', label: 'Dose',
      render: (l: BrewLog) => <span className="text-[#999]">{l.coffeeDose}g</span>,
    },
    {
      key: 'waterAmount', label: 'Water',
      render: (l: BrewLog) => <span className="text-[#999]">{l.waterAmount}ml</span>,
    },
    {
      key: 'rating', label: 'Rating',
      render: (l: BrewLog) => l.rating
        ? <span className="text-yellow-400 text-xs">{formatRating(l.rating)}</span>
        : <span className="text-[#555]">—</span>,
    },
    {
      key: 'completedAt', label: 'Date',
      render: (l: BrewLog) => <span className="text-[#666] text-xs">{formatDate(l.completedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Brew Logs" description={`${pagination?.total ?? 0} total logs`} />
      <Card>
        <Table columns={columns} data={logs} keyExtractor={(l) => l._id} loading={isLoading} emptyMessage="No brew logs found" />
        {pagination && (
          <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={goToPage} />
        )}
      </Card>
    </div>
  );
}
