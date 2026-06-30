import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import {
  Building2, Users, Star, CheckSquare, BookOpen, Award,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  getRegions,
  getRegionOverview,
  getRegionStores,
  getRegionTrend,
  getRegionTopPerformers,
  type RegionOverview,
  type StoreBreakdownRow,
  type TrendPoint,
  type TopPerformer,
} from '../../api/region-dashboard.api';

// ── helpers ────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toIso(from), to: toIso(to) };
}

function scoreColor(score: number | null) {
  if (score === null) return '#555';
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function roleInitialColor(role: string) {
  const map: Record<string, string> = {
    barista: '#3B82F6',
    shift_supervisor: '#8B5CF6',
    store_manager: '#EC4899',
    area_manager: '#F59E0B',
    regional_manager: '#10B981',
    ceo: '#D62B2B',
    owner: '#D62B2B',
  };
  return map[role] ?? '#666';
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <div
      className="rounded-xl bg-[#1A1A1A] animate-pulse"
      style={{ height }}
    />
  );
}

// ── Error + retry ──────────────────────────────────────────────────────────

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-red-950/30 border border-red-900/40 p-4 text-sm text-red-400">
      <AlertCircle size={16} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

// ── KPI cards ──────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#242424] flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-[#999]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#666] mb-1">{label}</div>
        <div
          className="text-2xl font-bold leading-tight"
          style={{ color: valueColor ?? '#fff' }}
        >
          {value}
        </div>
        {sub && <div className="text-[11px] text-[#555] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Store highlight tile ────────────────────────────────────────────────────

function StoreHighlight({
  label,
  name,
  score,
  accent,
}: {
  label: string;
  name: string | null;
  score: number | null;
  accent: string;
}) {
  return (
    <div className="flex-1 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
      <div className="text-[11px] text-[#555] mb-2">{label}</div>
      {name ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white truncate">{name}</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${accent}22`, color: accent }}
          >
            {score?.toFixed(1)}
          </span>
        </div>
      ) : (
        <span className="text-sm text-[#555]">N/A</span>
      )}
    </div>
  );
}

// ── Trend chart ────────────────────────────────────────────────────────────

function TrendSection({
  data,
  loading,
  error,
  onRetry,
  rangeLabel,
}: {
  data: TrendPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  rangeLabel: string;
}) {
  if (loading) return <SkeletonCard height={280} />;
  if (error) return <SectionError message={error} onRetry={onRetry} />;

  const ticks = data.length > 14
    ? data.filter((_, i) => i % 7 === 0).map((p) => p.date)
    : undefined;

  return (
    <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-5">
      <div className="text-sm font-semibold text-white mb-4">{rangeLabel} Trend</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tick={{ fill: '#555', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2A2A2A' }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tick={{ fill: '#555', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#555', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8 }}
            labelStyle={{ color: '#999', fontSize: 11 }}
            itemStyle={{ fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#666', paddingTop: 8 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgScore"
            name="Avg Score"
            stroke="#D62B2B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="checklistCompliance"
            name="Checklist %"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="learningCompletions"
            name="Learning Completions"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Store breakdown table ──────────────────────────────────────────────────

type SortKey = 'employeeCount' | 'avgJavaRistaScore' | 'checklistComplianceRate' | 'learningCompletionRate' | 'activeCerts';

function ScoreBadge({ score }: { score: number | null }) {
  const color = scoreColor(score);
  if (score === null) return <span className="text-[#555] text-xs">—</span>;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}
    >
      {score.toFixed(1)}
    </span>
  );
}

function RateBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#ccc] w-8 text-right">{value}%</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(value, 100)}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

function StoreTable({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: StoreBreakdownRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('avgJavaRistaScore');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-[11px] font-semibold text-[#555] tracking-wide cursor-pointer select-none hover:text-[#999] transition-colors"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} height={44} />
        ))}
      </div>
    );
  }

  if (error) return <SectionError message={error} onRetry={onRetry} />;

  return (
    <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[#2A2A2A]">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#555] tracking-wide">Store</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#555] tracking-wide">Type</th>
              <SortHeader k="employeeCount" label="Employees" />
              <SortHeader k="avgJavaRistaScore" label="Avg Score" />
              <SortHeader k="checklistComplianceRate" label="Checklist %" />
              <SortHeader k="learningCompletionRate" label="Learning %" />
              <SortHeader k="activeCerts" label="Certs" />
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#555] tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {sorted.map((row) => (
              <tr key={row.storeId} className="hover:bg-[#242424] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{row.storeName}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[#666] bg-[#242424] px-2 py-0.5 rounded-full">
                    {row.storeType}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#ccc]">{row.employeeCount}</td>
                <td className="px-4 py-3"><ScoreBadge score={row.avgJavaRistaScore} /></td>
                <td className="px-4 py-3 min-w-[120px]"><RateBar value={row.checklistComplianceRate} /></td>
                <td className="px-4 py-3 min-w-[120px]"><RateBar value={row.learningCompletionRate} /></td>
                <td className="px-4 py-3 text-[#ccc]">{row.activeCerts}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/stores/${row.storeId}`)}
                    className="text-xs text-[#D62B2B] hover:text-red-400 transition-colors cursor-pointer"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#555] text-sm">No stores found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Top performers ─────────────────────────────────────────────────────────

function PerformerCard({ p }: { p: TopPerformer }) {
  const color = scoreColor(p.javaRistaScore);
  const initial = p.name?.[0]?.toUpperCase() ?? '?';
  const roleColor = roleInitialColor(p.role);

  return (
    <div className="flex-shrink-0 w-44 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: roleColor }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate leading-tight">{p.name}</div>
          <div className="text-[10px] text-[#555] truncate mt-0.5">{p.role.replace(/_/g, ' ')}</div>
        </div>
      </div>
      <div className="text-[10px] text-[#555] mb-2 truncate">{p.storeName}</div>
      <div
        className="text-xl font-bold mb-2"
        style={{ color }}
      >
        {p.javaRistaScore}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[#666]">
        <span>📚 {p.completedPaths}</span>
        <span>🏆 {p.activeCerts}</span>
      </div>
    </div>
  );
}

function TopPerformersSection({
  performers,
  loading,
  error,
  onRetry,
}: {
  performers: TopPerformer[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-44"><SkeletonCard height={140} /></div>
        ))}
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {performers.map((p) => <PerformerCard key={p.userId} p={p} />)}
      {performers.length === 0 && (
        <p className="text-sm text-[#555]">No performers found</p>
      )}
    </div>
  );
}

// ── Overview KPI section ───────────────────────────────────────────────────

function OverviewSection({
  overview,
  loading,
  error,
  onRetry,
}: {
  overview: RegionOverview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={80} />)}
        </div>
        <div className="flex gap-3">
          <SkeletonCard height={64} />
          <SkeletonCard height={64} />
        </div>
      </div>
    );
  }
  if (error) return <SectionError message={error} onRetry={onRetry} />;
  if (!overview) return null;

  const avgColor = scoreColor(overview.avgJavaRistaScore);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Building2} label="Stores" value={overview.storeCount} />
        <KpiCard icon={Users} label="Employees" value={overview.totalEmployees} />
        <KpiCard
          icon={Star}
          label="Avg Score"
          value={overview.avgJavaRistaScore.toFixed(1)}
          valueColor={avgColor}
        />
        <KpiCard
          icon={CheckSquare}
          label="Checklist %"
          value={`${overview.checklistComplianceRate}%`}
          valueColor={scoreColor(overview.checklistComplianceRate)}
        />
        <KpiCard
          icon={BookOpen}
          label="Learning %"
          value={`${overview.learningPathCompletionRate}%`}
          valueColor={scoreColor(overview.learningPathCompletionRate)}
        />
        <KpiCard icon={Award} label="Active Certs" value={overview.activeCertifications} />
      </div>

      <div className="flex gap-3">
        <StoreHighlight
          label="Top Store"
          name={overview.topStore?.name ?? null}
          score={overview.topStore?.avgScore ?? null}
          accent="#22C55E"
        />
        <StoreHighlight
          label="Bottom Store"
          name={overview.bottomStore?.name ?? null}
          score={overview.bottomStore?.avgScore ?? null}
          accent="#EF4444"
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function RegionDashboardPage() {
  const [regions, setRegions] = useState<string[]>([]);
  const [regionsLoaded, setRegionsLoaded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [appliedFrom, setAppliedFrom] = useState(defaultRange().from);
  const [appliedTo, setAppliedTo] = useState(defaultRange().to);

  const [overview, setOverview] = useState<RegionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [stores, setStores] = useState<StoreBreakdownRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState<string | null>(null);

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  const [performers, setPerformers] = useState<TopPerformer[]>([]);
  const [performersLoading, setPerformersLoading] = useState(false);
  const [performersError, setPerformersError] = useState<string | null>(null);

  // Load region list on mount
  useEffect(() => {
    getRegions()
      .then((list) => {
        setRegions(list);
        if (list.length > 0) setSelectedRegion(list[0]);
      })
      .catch(() => { /* region list failure is non-fatal */ })
      .finally(() => setRegionsLoaded(true));
  }, []);

  const loadOverview = useCallback((region: string, f: string, t: string) => {
    setOverviewLoading(true);
    setOverviewError(null);
    getRegionOverview(region, f, t)
      .then(setOverview)
      .catch((e) => setOverviewError(e?.message ?? 'Failed to load overview'))
      .finally(() => setOverviewLoading(false));
  }, []);

  const loadStores = useCallback((region: string, f: string, t: string) => {
    setStoresLoading(true);
    setStoresError(null);
    getRegionStores(region, f, t)
      .then(setStores)
      .catch((e) => setStoresError(e?.message ?? 'Failed to load store breakdown'))
      .finally(() => setStoresLoading(false));
  }, []);

  const loadTrend = useCallback((region: string, f: string, t: string) => {
    setTrendLoading(true);
    setTrendError(null);
    getRegionTrend(region, f, t)
      .then(setTrend)
      .catch((e) => setTrendError(e?.message ?? 'Failed to load trend'))
      .finally(() => setTrendLoading(false));
  }, []);

  const loadPerformers = useCallback((region: string) => {
    setPerformersLoading(true);
    setPerformersError(null);
    getRegionTopPerformers(region)
      .then(setPerformers)
      .catch((e) => setPerformersError(e?.message ?? 'Failed to load top performers'))
      .finally(() => setPerformersLoading(false));
  }, []);

  const loadAll = useCallback((region: string, f: string, t: string) => {
    loadOverview(region, f, t);
    loadStores(region, f, t);
    loadTrend(region, f, t);
    loadPerformers(region);
  }, [loadOverview, loadStores, loadTrend, loadPerformers]);

  // Reload when region changes or on mount once a region is selected
  useEffect(() => {
    if (!selectedRegion) return;
    loadAll(selectedRegion, appliedFrom, appliedTo);
  }, [selectedRegion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
    if (selectedRegion) loadAll(selectedRegion, from, to);
  };

  const rangeLabel = `${appliedFrom} – ${appliedTo}`;

  // No regions configured — show a friendly empty state and skip all dashboard data.
  if (regionsLoaded && regions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white">Region Dashboard</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-16 text-center">
          <Building2 size={36} className="mb-4 text-[#444]" />
          <p className="text-sm font-medium text-[#888]">No regions configured yet.</p>
          <p className="mt-1 text-xs text-[#555]">
            Assign a region to your stores in Store Management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-white flex-1">Region Dashboard</h1>

        {/* Region selector */}
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
        >
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
          />
          <span className="text-[#555] text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D62B2B]"
          />
          <button
            onClick={handleApply}
            className="bg-[#D62B2B] hover:bg-[#b82323] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Row 1: Overview */}
      <OverviewSection
        overview={overview}
        loading={overviewLoading}
        error={overviewError}
        onRetry={() => selectedRegion && loadOverview(selectedRegion, appliedFrom, appliedTo)}
      />

      {/* Row 2: Trend */}
      <div>
        <TrendSection
          data={trend}
          loading={trendLoading}
          error={trendError}
          onRetry={() => selectedRegion && loadTrend(selectedRegion, appliedFrom, appliedTo)}
          rangeLabel={rangeLabel}
        />
      </div>

      {/* Row 3: Store breakdown */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">Store Breakdown</div>
        <StoreTable
          rows={stores}
          loading={storesLoading}
          error={storesError}
          onRetry={() => selectedRegion && loadStores(selectedRegion, appliedFrom, appliedTo)}
        />
      </div>

      {/* Row 4: Top performers */}
      <div>
        <div className="text-sm font-semibold text-white mb-3">Top Performers</div>
        <TopPerformersSection
          performers={performers}
          loading={performersLoading}
          error={performersError}
          onRetry={() => selectedRegion && loadPerformers(selectedRegion)}
        />
      </div>
    </div>
  );
}
