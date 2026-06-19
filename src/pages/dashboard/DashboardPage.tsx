import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  Users, CreditCard, ClipboardList, BookOpen,
  Bean, Zap, Star, PlusCircle, Coffee, ArrowRight,
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics.api';
import { brewLogsApi } from '../../api/brewLogs.api';
import { recipesApi } from '../../api/recipes.api';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AreaChart } from '../../components/charts/AreaChart';
import { BarChart } from '../../components/charts/BarChart';
import { PieChart } from '../../components/charts/PieChart';
import { formatDate, formatRating } from '../../utils/formatters';
import type { BrewLog, BrewMethod, Recipe, User } from '../../types';

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#242424] rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Sk className="h-6 w-40 mb-2" />
        <Sk className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Sk key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Sk key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Sk className="xl:col-span-3 h-80" />
        <Sk className="xl:col-span-2 h-80" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Sk className="xl:col-span-3 h-64" />
        <Sk className="xl:col-span-2 h-64" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Sk className="xl:col-span-3 h-64" />
        <Sk className="xl:col-span-2 h-52" />
      </div>
    </div>
  );
}

// ─── Mock activity data ────────────────────────────────────────────────────────

function generateActivityData(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), days <= 7 ? 'EEE' : 'MMM d'),
    brews: Math.floor(Math.random() * 36) + 5,
  }));
}

const ACTIVITY_TABS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const PLAN_COLORS = ['#555555', '#D62B2B'];

function formatCount(value?: number) {
  return Number(value ?? 0).toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [activityDays, setActivityDays] = useState(30);
  const navigate = useNavigate();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsApi.getDashboardStats(),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-brew-logs'],
    queryFn: () => brewLogsApi.getAllBrewLogs({ page: 1, limit: 5 }),
  });

  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['top-recipes-dashboard'],
    queryFn: () => recipesApi.getRecipes({ page: 1, limit: 20 }),
  });

  const activityData = useMemo(() => generateActivityData(activityDays), [activityDays]);

  if (statsLoading) return <DashboardSkeleton />;

  const stats = statsData?.data?.data;
  const logs = logsData?.data?.data ?? [];

  const topRecipes = [...(recipesData?.data?.data ?? [])]
    .sort((a, b) => b.brewCount - a.brewCount)
    .slice(0, 5);

  const premiumCount = stats?.activeSubscriptions ?? 0;
  const freeCount = Math.max(0, (stats?.totalUsers ?? 0) - premiumCount);
  const totalForPlan = freeCount + premiumCount;

  const planData = [
    { name: 'Free', value: freeCount },
    { name: 'Premium', value: premiumCount },
  ];

  const methodsData = (stats?.popularMethods ?? []).map(m => ({ name: m.name, brews: m.count }));
  const xAxisInterval = activityDays <= 7 ? 0 : activityDays <= 30 ? 3 : 11;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Platform overview" />

      {/* ── Row 1: 4 stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users size={18} />}
          change={`+${stats?.newUsersThisMonth ?? 0} this month`}
          changeType="up"
        />
        <StatCard
          title="Premium Users"
          value={premiumCount}
          icon={<CreditCard size={18} />}
          change={totalForPlan > 0 ? `${Math.round((premiumCount / totalForPlan) * 100)}% of users` : undefined}
          changeType="neutral"
        />
        <StatCard
          title="Total Brew Logs"
          value={stats?.totalBrewLogs ?? 0}
          icon={<ClipboardList size={18} />}
        />
        <StatCard
          title="Total Recipes"
          value={stats?.totalRecipes ?? 0}
          icon={<BookOpen size={18} />}
        />
      </div>

      {/* ── Row 2: 3 stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Beans Tracked"
          value={stats?.totalBeans ?? 0}
          icon={<Bean size={18} />}
        />
        <StatCard
          title="Espresso Shots"
          value={stats?.totalEspressoShots ?? 0}
          icon={<Zap size={18} />}
        />
        <StatCard
          title="Avg App Rating"
          value={stats?.avgRating != null ? `${stats.avgRating.toFixed(1)} / 5` : '— / 5'}
          icon={<Star size={18} />}
          changeType="neutral"
        />
      </div>

      {/* ── Row 3: Brew Activity + Users by Plan ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3" title="Brew Activity">
          <div className="flex gap-1 mb-4">
            {ACTIVITY_TABS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setActivityDays(days)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                  activityDays === days
                    ? 'bg-[#D62B2B]/15 text-[#D62B2B]'
                    : 'text-[#666] hover:text-white hover:bg-[#242424]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <AreaChart
            data={activityData}
            xKey="date"
            yKey="brews"
            height={220}
            xAxisInterval={xAxisInterval}
          />
        </Card>

        <Card className="xl:col-span-2" title="Users by Plan">
          <PieChart
            data={planData}
            height={200}
            colors={PLAN_COLORS}
            showLegend={false}
          />
          <div className="flex flex-col gap-2.5 mt-4">
            {planData.map((entry, i) => {
              const pct = totalForPlan > 0 ? Math.round((entry.value / totalForPlan) * 100) : 0;
              return (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLAN_COLORS[i] }} />
                    <span className="text-[#999]">{entry.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {entry.value.toLocaleString()}{' '}
                    <span className="text-[#555] font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 4: Popular Brew Methods + Recent Brew Logs ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3" title="Popular Brew Methods">
          {methodsData.length > 0 ? (
            <BarChart
              data={methodsData}
              xKey="name"
              yKey="brews"
              horizontal
              height={Math.max(160, methodsData.length * 48 + 24)}
              yAxisWidth={90}
            />
          ) : (
            <p className="text-sm text-[#555] py-10 text-center">No brew data yet</p>
          )}
        </Card>

        <Card
          className="xl:col-span-2"
          title="Recent Brew Logs"
          action={
            <Link to="/brew-logs" className="text-xs text-[#D62B2B] hover:text-[#E84040] transition-colors">
              View all →
            </Link>
          }
        >
          {logsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center gap-3">
                  <div className="space-y-1.5 flex-1">
                    <Sk className="h-3 w-24" />
                    <Sk className="h-3 w-16" />
                  </div>
                  <Sk className="h-3 w-14 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[#555] py-8 text-center">No brew logs yet</p>
          ) : (
            <div className="divide-y divide-[#242424]">
              {logs.map((log: BrewLog) => (
                <div key={log._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {(log.user as User)?.name ?? '—'}
                    </div>
                    <div className="text-xs text-[#666] truncate">
                      {(log.brewMethod as BrewMethod)?.name ?? '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    {log.rating ? (
                      <span className="text-yellow-400 text-xs">{formatRating(log.rating)}</span>
                    ) : (
                      <span className="text-[#555] text-xs">—</span>
                    )}
                    <span className="text-[#555] text-[10px]">{formatDate(log.completedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 5: Most Brewed Recipes + Quick Actions ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card className="xl:col-span-3" title="Most Brewed Recipes">
          {recipesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Sk key={i} className="h-10" />)}
            </div>
          ) : topRecipes.length === 0 ? (
            <p className="text-sm text-[#555] py-8 text-center">No recipes yet</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 pb-2.5 mb-1 text-[10px] text-[#555] uppercase tracking-wider">
                <span>Recipe</span>
                <span>Method</span>
                <span className="text-right">Brews</span>
                <span className="text-right">Likes</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-[#242424]">
                {topRecipes.map((recipe: Recipe) => (
                  <div key={recipe._id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3">
                    <span className="text-sm text-white truncate">{recipe.title}</span>
                    <span className="text-xs text-[#666]">
                      {typeof recipe.brewMethod === 'object'
                        ? (recipe.brewMethod as BrewMethod).name
                        : '—'}
                    </span>
                    <span className="text-xs text-white text-right">
                      {formatCount(recipe.brewCount)}
                    </span>
                    <span className="text-xs text-[#666] text-right">
                      {formatCount(recipe.likeCount ?? (recipe as Recipe & { likesCount?: number }).likesCount)}
                    </span>
                    <Badge variant={recipe.isPublished ? 'success' : 'default'}>
                      {recipe.isPublished ? 'live' : 'draft'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Quick Actions">
          <div className="flex flex-col gap-2">
            {[
              { label: 'Add Recipe', icon: <PlusCircle size={15} />, to: '/recipes/new' },
              { label: 'Add Brew Method', icon: <Coffee size={15} />, to: '/brew-methods/new' },
              { label: 'View Users', icon: <Users size={15} />, to: '/users' },
              { label: 'View Subscriptions', icon: <CreditCard size={15} />, to: '/subscriptions' },
            ].map(({ label, icon, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[#2A2A2A] text-sm text-[#ccc] hover:text-white hover:border-[#3A3A3A] hover:bg-[#242424] transition-colors cursor-pointer w-full text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#D62B2B]">{icon}</span>
                  {label}
                </div>
                <ArrowRight size={13} className="text-[#444]" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
