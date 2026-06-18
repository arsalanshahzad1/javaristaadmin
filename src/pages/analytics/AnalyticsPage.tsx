import { useState } from 'react';
import {
  LineChart as ReLineChart, Line,
  AreaChart as ReAreaChart, Area,
  BarChart as ReBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, Users, Coffee, Zap } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { PieChart } from '../../components/charts/PieChart';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const USER_GROWTH = MONTHS.map((month, i) => ({
  month,
  total: 1200 + i * 340 + Math.floor(Math.random() * 80),
  premium: 180 + i * 68 + Math.floor(Math.random() * 20),
}));

const BREW_SESSIONS_7 = Array.from({ length: 7 }, (_, i) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return { day: days[i], sessions: 40 + Math.floor(Math.random() * 60) };
});

const BREW_SESSIONS_30 = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  sessions: 30 + Math.floor(Math.random() * 90),
}));

const BREW_SESSIONS_90 = Array.from({ length: 90 }, (_, i) => ({
  day: `${i + 1}`,
  sessions: 25 + Math.floor(Math.random() * 100),
}));

const BREW_SESSIONS_YEAR = Array.from({ length: 12 }, (_, i) => ({
  day: MONTHS[i],
  sessions: 900 + i * 120 + Math.floor(Math.random() * 200),
}));

const METHOD_COLORS = ['#D62B2B', '#E84040', '#A01E1E', '#c0392b', '#922b21', '#7B241C', '#641E16'];
const BREW_METHODS = [
  { name: 'Pour Over', value: 1842 },
  { name: 'French Press', value: 1431 },
  { name: 'Espresso', value: 2107 },
  { name: 'AeroPress', value: 983 },
  { name: 'Cold Brew', value: 754 },
  { name: 'Chemex', value: 612 },
  { name: 'Moka Pot', value: 489 },
];

const RATING_DIST = [
  { star: '1★', count: 48 },
  { star: '2★', count: 112 },
  { star: '3★', count: 387 },
  { star: '4★', count: 1243 },
  { star: '5★', count: 896 },
];
const RATING_TOTAL = RATING_DIST.reduce((s, r) => s + r.count, 0);
const AVG_RATING = (
  RATING_DIST.reduce((s, r, i) => s + r.count * (i + 1), 0) / RATING_TOTAL
).toFixed(1);

const TOP_RECIPES = [
  { rank: 1, title: 'Ethiopian Yirgacheffe Pour Over', method: 'Pour Over', brews: 2341, rating: 4.8, likes: 892 },
  { rank: 2, title: 'Classic Italian Espresso', method: 'Espresso', brews: 1987, rating: 4.7, likes: 761 },
  { rank: 3, title: 'Midnight Cold Brew', method: 'Cold Brew', brews: 1654, rating: 4.6, likes: 634 },
  { rank: 4, title: 'French Press Sunday', method: 'French Press', brews: 1432, rating: 4.5, likes: 521 },
  { rank: 5, title: 'AeroPress Inverted', method: 'AeroPress', brews: 1289, rating: 4.4, likes: 483 },
  { rank: 6, title: 'Chemex Morning Ritual', method: 'Chemex', brews: 1102, rating: 4.3, likes: 412 },
  { rank: 7, title: 'Kenyan AA Pourover', method: 'Pour Over', brews: 987, rating: 4.5, likes: 389 },
  { rank: 8, title: 'Moka Pot Express', method: 'Moka Pot', brews: 876, rating: 4.2, likes: 311 },
  { rank: 9, title: 'Colombian Single Origin', method: 'AeroPress', brews: 754, rating: 4.4, likes: 287 },
  { rank: 10, title: 'Vietnamese Iced Coffee', method: 'Espresso', brews: 698, rating: 4.3, likes: 254 },
];

const ESPRESSO_TRENDS = Array.from({ length: 12 }, (_, i) => ({
  week: `Wk ${i + 1}`,
  shots: 120 + i * 18 + Math.floor(Math.random() * 30),
}));

// ─── Date range config ────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: 'Last 7 days', key: '7d' },
  { label: 'Last 30 days', key: '30d' },
  { label: 'Last 90 days', key: '90d' },
  { label: 'This year', key: 'year' },
] as const;

type DateRangeKey = (typeof DATE_RANGES)[number]['key'];

function getBrewData(range: DateRangeKey) {
  if (range === '7d') return BREW_SESSIONS_7;
  if (range === '30d') return BREW_SESSIONS_30;
  if (range === '90d') return BREW_SESSIONS_90;
  return BREW_SESSIONS_YEAR;
}

function getBrewXInterval(range: DateRangeKey) {
  if (range === '7d') return 0;
  if (range === '30d') return 4;
  if (range === '90d') return 14;
  return 0;
}

// ─── Shared chart styles ──────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#999' },
  itemStyle: { color: '#D62B2B' },
};

const AXIS_TICK = { fill: '#666', fontSize: 11 };

// ─── Small helpers ────────────────────────────────────────────────────────────

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-[#555] uppercase tracking-wider">{label}</span>
      <span className="text-lg font-bold text-white leading-none">{value}</span>
      {sub && <span className="text-[11px] text-[#666]">{sub}</span>}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-xs">🥇</span>;
  if (rank === 2) return <span className="text-[#aaa] font-bold text-xs">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-xs">🥉</span>;
  return <span className="text-[#555] text-xs font-medium">{rank}</span>;
}

// ─── Custom bar label ─────────────────────────────────────────────────────────

function RatingLabel({ x, y, width, value }: { x?: number; y?: number; width?: number; value?: number }) {
  if (!value || !x || !y || !width) return null;
  const pct = Math.round((value / RATING_TOTAL) * 100);
  return (
    <text x={x + width / 2} y={y - 6} fill="#999" fontSize={10} textAnchor="middle">
      {pct}%
    </text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('30d');

  const brewData = getBrewData(dateRange);
  const brewXInterval = getBrewXInterval(dateRange);

  const totalBrews = brewData.reduce((s, d) => s + d.sessions, 0);
  const avgBrewsPerDay = Math.round(totalBrews / brewData.length);
  const peakDay = brewData.reduce((max, d) => (d.sessions > max.sessions ? d : max), brewData[0]);

  const totalUsers = USER_GROWTH[USER_GROWTH.length - 1].total;
  const prevTotal = USER_GROWTH[USER_GROWTH.length - 2].total;
  const newThisMonth = totalUsers - prevTotal;
  const premiumUsers = USER_GROWTH[USER_GROWTH.length - 1].premium;
  const premiumConversion = ((premiumUsers / totalUsers) * 100).toFixed(1);

  const totalEspressoShots = ESPRESSO_TRENDS.reduce((s, d) => s + d.shots, 0);

  const methodTotal = BREW_METHODS.reduce((s, m) => s + m.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Detailed insights into JavaRista usage" />

      {/* ── Date range filter ───────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap">
        {DATE_RANGES.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => setDateRange(key)}
            className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer font-medium ${
              dateRange === key
                ? 'bg-[#D62B2B] text-white'
                : 'text-[#666] hover:text-white hover:bg-[#242424] border border-[#2A2A2A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Section 1: User Growth (full width) ────────────────────────────── */}
      <Card title="User Growth">
        <ResponsiveContainer width="100%" height={240}>
          <ReLineChart data={USER_GROWTH} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#999' }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total Users"
              stroke="#D62B2B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="premium"
              name="Premium Users"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ReLineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-5 mb-5 mt-3">
          {[{ label: 'Total Users', color: '#D62B2B' }, { label: 'Premium Users', color: '#F97316' }].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
              <span className="text-[11px] text-[#666]">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-8 pt-4 border-t border-[#2A2A2A]">
          <MiniStat label="Total Users" value={totalUsers.toLocaleString()} />
          <MiniStat label="New This Month" value={`+${newThisMonth.toLocaleString()}`} />
          <MiniStat label="Premium Conversion" value={`${premiumConversion}%`} sub="of total users" />
        </div>
      </Card>

      {/* ── Section 2: Brew Activity + Method Popularity ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Brew Activity */}
        <Card title="Daily Brew Sessions">
          <ResponsiveContainer width="100%" height={220}>
            <ReAreaChart data={brewData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="brewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D62B2B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D62B2B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={brewXInterval} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="#D62B2B"
                strokeWidth={2}
                fill="url(#brewGrad)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ReAreaChart>
          </ResponsiveContainer>

          <div className="flex gap-8 pt-4 mt-4 border-t border-[#2A2A2A]">
            <MiniStat label="Total Brews" value={totalBrews.toLocaleString()} />
            <MiniStat label="Avg Per Day" value={avgBrewsPerDay} />
            <MiniStat label="Peak Day" value={peakDay.sessions} sub={`Day ${peakDay.day}`} />
          </div>
        </Card>

        {/* Brew Method Popularity */}
        <Card title="Brew Method Popularity">
          <PieChart data={BREW_METHODS} height={200} colors={METHOD_COLORS} showLegend={false} />

          <div className="flex flex-col gap-2 mt-3">
            {BREW_METHODS.map((m, i) => {
              const pct = ((m.value / methodTotal) * 100).toFixed(1);
              return (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: METHOD_COLORS[i] }} />
                    <span className="text-[#999]">{m.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {m.value.toLocaleString()}{' '}
                    <span className="text-[#555] font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Section 3: Rating Distribution (full width) ─────────────────────── */}
      <Card title="Rating Distribution">
        <ResponsiveContainer width="100%" height={220}>
          <ReBarChart data={RATING_DIST} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="star" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Ratings" radius={[4, 4, 0, 0]} label={<RatingLabel />}>
              {RATING_DIST.map((_, i) => (
                <Cell key={i} fill="#D62B2B" fillOpacity={0.5 + i * 0.125} />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-6 pt-4 mt-2 border-t border-[#2A2A2A]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-white">{AVG_RATING}</span>
            <span className="text-[#666] text-sm">out of 5</span>
          </div>
          <div className="w-px h-8 bg-[#2A2A2A]" />
          <MiniStat label="Total Ratings" value={RATING_TOTAL.toLocaleString()} />
        </div>
      </Card>

      {/* ── Section 4: Top Recipes + Espresso Trends ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top Recipes */}
        <Card title="Top Recipes">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 gap-y-0 pb-2 mb-1 text-[10px] text-[#555] uppercase tracking-wider">
            <span>#</span>
            <span>Recipe</span>
            <span className="text-right">Brews</span>
            <span className="text-right">Rating</span>
            <span className="text-right">Likes</span>
          </div>
          <div className="divide-y divide-[#242424]">
            {TOP_RECIPES.map((r) => (
              <div key={r.rank} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center py-2.5">
                <div className="w-6 flex justify-center">
                  <RankBadge rank={r.rank} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{r.title}</div>
                  <div className="text-[11px] text-[#555]">{r.method}</div>
                </div>
                <span className="text-xs text-[#999] text-right">{r.brews.toLocaleString()}</span>
                <span className="text-xs text-yellow-400 text-right">{r.rating.toFixed(1)}</span>
                <span className="text-xs text-[#666] text-right">{r.likes.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Espresso Trends */}
        <Card title="Espresso Shot Trends">
          <ResponsiveContainer width="100%" height={220}>
            <ReLineChart data={ESPRESSO_TRENDS} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="shots"
                name="Shots"
                stroke="#D62B2B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ReLineChart>
          </ResponsiveContainer>

          <div className="flex gap-8 pt-4 mt-4 border-t border-[#2A2A2A]">
            <MiniStat label="Total Shots" value={totalEspressoShots.toLocaleString()} />
            <MiniStat label="Avg Rating" value="4.6" sub="out of 5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Most Common Taste</span>
              <span className="text-sm font-bold text-[#D62B2B]">Rich & Chocolatey</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Section 5: User Retention (full width) ──────────────────────────── */}
      <Card title="User Retention">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <TrendingUp size={16} />, label: 'Day 1 Retention', value: '78.4%', sub: 'of new users return' },
            { icon: <Users size={16} />, label: 'Day 7 Retention', value: '54.1%', sub: 'weekly active' },
            { icon: <Coffee size={16} />, label: 'Day 30 Retention', value: '31.8%', sub: 'monthly active' },
            { icon: <Zap size={16} />, label: 'Avg Session', value: '6m 42s', sub: 'per active user' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="bg-[#111] rounded-xl border border-[#2A2A2A] p-4 flex gap-3 items-start">
              <div className="shrink-0 p-2 rounded-lg bg-[#D62B2B]/10 text-[#D62B2B]">
                {icon}
              </div>
              <div>
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-white leading-none">{value}</p>
                <p className="text-[11px] text-[#666] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Free vs Premium stacked bar */}
        <div>
          <div className="flex justify-between text-[11px] text-[#666] mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E2E2E] inline-block" />
              Free — {(totalUsers - premiumUsers).toLocaleString()} users
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D62B2B] inline-block" />
              Premium — {premiumUsers.toLocaleString()} users
            </span>
          </div>
          <div className="h-8 w-full rounded-lg overflow-hidden flex">
            {(() => {
              const freePct = ((totalUsers - premiumUsers) / totalUsers) * 100;
              const premPct = (premiumUsers / totalUsers) * 100;
              return (
                <>
                  <div
                    className="h-full bg-[#2E2E2E] flex items-center justify-center text-[11px] text-[#888] font-medium transition-all"
                    style={{ width: `${freePct}%` }}
                  >
                    {freePct.toFixed(0)}%
                  </div>
                  <div
                    className="h-full bg-[#D62B2B] flex items-center justify-center text-[11px] text-white font-medium transition-all"
                    style={{ width: `${premPct}%` }}
                  >
                    {premPct.toFixed(0)}%
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Card>
    </div>
  );
}
