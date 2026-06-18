import { useQuery } from '@tanstack/react-query';
import { espressoApi } from '../../api/espresso.api';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { formatDate, formatDuration, truncate } from '../../utils/formatters';
import type { EspressoShot, User } from '../../types';

export function EspressoPage() {
  const { page, limit, goToPage } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['espresso-shots', page, limit],
    queryFn: () => espressoApi.getAll({ page, limit }),
  });

  const shots = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const tasteVariant = (t: string): 'success' | 'warning' | 'danger' | 'default' =>
    t === 'balanced' ? 'success' : t === 'sour' ? 'warning' : t === 'bitter' ? 'danger' : 'default';

  const columns = [
    {
      key: 'user', label: 'User',
      render: (s: EspressoShot) => <span className="text-white text-sm">{(s.user as User)?.name ?? '—'}</span>,
    },
    {
      key: 'dose', label: 'Dose / Yield',
      render: (s: EspressoShot) => <span className="text-[#999]">{s.dose}g → {s.yield}g</span>,
    },
    {
      key: 'extractionTime', label: 'Time',
      render: (s: EspressoShot) => <span className="text-[#999]">{formatDuration(s.extractionTime)}</span>,
    },
    {
      key: 'tasteProfile', label: 'Taste',
      render: (s: EspressoShot) => <Badge variant={tasteVariant(s.tasteProfile)}>{s.tasteProfile}</Badge>,
    },
    {
      key: 'suggestion', label: 'Suggestion',
      render: (s: EspressoShot) => <span className="text-[#666] text-xs">{truncate(s.suggestion, 40)}</span>,
    },
    {
      key: 'createdAt', label: 'Date',
      render: (s: EspressoShot) => <span className="text-[#666] text-xs">{formatDate(s.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Espresso Shots" description={`${pagination?.total ?? 0} total shots`} />
      <Card>
        <Table columns={columns} data={shots} keyExtractor={(s) => s._id} loading={isLoading} emptyMessage="No espresso shots found" />
        {pagination && (
          <Pagination currentPage={pagination.page} totalPages={pagination.pages} onPageChange={goToPage} />
        )}
      </Card>
    </div>
  );
}
