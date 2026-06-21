import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Award, CheckCircle, Coffee, Download } from 'lucide-react';
import adminApiClient from '../../api/adminApiClient';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { SearchBar } from '../../components/ui/SearchBar';
import { Button } from '../../components/ui/Button';
import { IssueCertificationModal } from '../../components/certifications/IssueCertificationModal';

type TeamMemberPerformance = {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  currentLevel: number;
  totalBrews: number;
  approvalRate: number;
  completedCourses: number;
  certifications: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

const LEVEL_BADGE = {
  0: { label: 'No Level', bg: 'bg-[#2A2A2A]', text: 'text-[#888]' },
  1: { label: 'Level 1', bg: 'bg-teal-900/40', text: 'text-teal-400' },
  2: { label: 'Level 2', bg: 'bg-blue-900/40', text: 'text-blue-400' },
  3: { label: 'Level 3', bg: 'bg-amber-900/40', text: 'text-amber-400' },
  4: { label: 'Level 4', bg: 'bg-orange-900/40', text: 'text-orange-400' },
  5: { label: 'Level 5', bg: 'bg-purple-900/40', text: 'text-purple-400' },
} as const;

const LEVEL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: '0', label: 'Level 0' },
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'level', label: 'Level' },
  { value: 'approvalRate', label: 'Approval Rate' },
  { value: 'totalBrews', label: 'Total Brews' },
  { value: 'completedCourses', label: 'Courses Completed' },
];

async function fetchTeamPerformance() {
  const res = await adminApiClient.get<ApiEnvelope<TeamMemberPerformance[]>>('/performance/team');
  return res.data.data;
}

function LevelBadge({ level }: { level: number }) {
  const cfg = LEVEL_BADGE[level as keyof typeof LEVEL_BADGE] ?? LEVEL_BADGE[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function ApprovalBar({ rate }: { rate: number }) {
  const fill = rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-xs font-medium w-9 text-right tabular-nums ${textColor}`}>
        {rate.toFixed(0)}%
      </span>
    </div>
  );
}

function exportToCsv(rows: TeamMemberPerformance[]) {
  const headers = ['Name', 'Email', 'Level', 'Courses Completed', 'Certifications', 'Approval Rate (%)', 'Total Brews'];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.user.name, r.user.email, r.currentLevel, r.completedCourses, r.certifications, r.approvalRate.toFixed(1), r.totalBrews]
      .map(escape)
      .join(',')
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `team-performance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TeamPerformancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['team-performance'],
    queryFn: fetchTeamPerformance,
  });

  const filtered = useMemo(() => {
    let result = rawData;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.user.name.toLowerCase().includes(q));
    }

    if (levelFilter !== 'all') {
      const level = parseInt(levelFilter, 10);
      result = result.filter((r) => r.currentLevel === level);
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'level':          return b.currentLevel - a.currentLevel;
        case 'approvalRate':   return b.approvalRate - a.approvalRate;
        case 'totalBrews':     return b.totalBrews - a.totalBrews;
        case 'completedCourses': return b.completedCourses - a.completedCourses;
        default:               return a.user.name.localeCompare(b.user.name);
      }
    });
  }, [rawData, search, levelFilter, sortBy]);

  const stats = useMemo(() => {
    const n = rawData.length;
    return {
      totalEmployees: n,
      avgLevel: n ? rawData.reduce((s, r) => s + r.currentLevel, 0) / n : 0,
      avgApprovalRate: n ? rawData.reduce((s, r) => s + r.approvalRate, 0) / n : 0,
      totalBrews: rawData.reduce((s, r) => s + r.totalBrews, 0),
    };
  }, [rawData]);

  const handleIssue = useCallback((user: TeamMemberPerformance['user']) => {
    setSelectedUser({ id: user._id, name: user.name });
    setIssueModalOpen(true);
  }, []);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r: TeamMemberPerformance) => (
        <div>
          <p className="text-white font-medium text-sm leading-snug">{r.user.name}</p>
          <p className="text-[#666] text-xs">{r.user.email}</p>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (r: TeamMemberPerformance) => <LevelBadge level={r.currentLevel} />,
    },
    {
      key: 'completedCourses',
      label: 'Courses Done',
      render: (r: TeamMemberPerformance) => (
        <span className="text-white text-sm tabular-nums">{r.completedCourses}</span>
      ),
    },
    {
      key: 'certifications',
      label: 'Certs Earned',
      render: (r: TeamMemberPerformance) => (
        <span className="text-white text-sm tabular-nums">{r.certifications}</span>
      ),
    },
    {
      key: 'approvalRate',
      label: 'Approval Rate',
      render: (r: TeamMemberPerformance) => <ApprovalBar rate={r.approvalRate} />,
    },
    {
      key: 'totalBrews',
      label: 'Total Brews',
      render: (r: TeamMemberPerformance) => (
        <span className="text-white text-sm tabular-nums">{r.totalBrews.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: TeamMemberPerformance) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/performance/user/${r.user._id}`)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#333] text-[#ccc] hover:bg-[#242424] transition-colors whitespace-nowrap cursor-pointer"
          >
            View Full Profile
          </button>
          <button
            onClick={() => handleIssue(r.user)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D62B2B]/30 bg-[#D62B2B]/10 text-[#D62B2B] hover:bg-[#D62B2B]/20 transition-colors whitespace-nowrap cursor-pointer"
          >
            Issue Certification
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white mb-1">Team Performance</h1>
          <p className="text-sm text-[#666]">Bird's-eye view of all employee performance metrics.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <Download size={14} />
          Export Team Report
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users size={18} />}
        />
        <StatCard
          title="Avg Certification Level"
          value={stats.avgLevel.toFixed(1)}
          icon={<Award size={18} />}
        />
        <StatCard
          title="Avg Checklist Approval"
          value={`${stats.avgApprovalRate.toFixed(1)}%`}
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          title="Total Brews Logged"
          value={stats.totalBrews.toLocaleString()}
          icon={<Coffee size={18} />}
        />
      </div>

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by employee name..."
            className="sm:w-64"
          />
          <div className="flex flex-wrap gap-3 sm:ml-auto">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] transition-colors cursor-pointer"
            >
              {LEVEL_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#D62B2B] transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card title={`${filtered.length} Employee${filtered.length !== 1 ? 's' : ''}`}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.user._id}
          loading={isLoading}
          emptyMessage="No employees match the current filters"
        />
      </Card>

      <IssueCertificationModal
        isOpen={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setSelectedUser(null);
        }}
        prefilledUserId={selectedUser?.id}
        prefilledUserName={selectedUser?.name}
      />
    </div>
  );
}
