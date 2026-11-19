import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BrainCircuit,
  Database,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  CampusReport,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  IntelligenceReport,
  UserProfile,
} from '../../types/campuscare';
import { generateIntelligenceInsights } from '../../services/aiService';
import { clearDemoReports, seedDemoData } from '../../services/reportService';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../../components/StatusIndicators';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  AnalyticsDateRange,
  setAnalyticsCategoryFilter,
  setAnalyticsDateRange,
  setIncludeDemoInAnalytics,
} from '../../store/dashboardSlice';

const GREEN_CHART_PALETTE = [
  '#059669',
  '#10B981',
  '#0D9488',
  '#065F46',
  '#34D399',
  '#14B8A6',
  '#D97706',
  '#E11D48',
  '#64748B',
];

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#64748B',
  Medium: '#10B981',
  High: '#D97706',
  Urgent: '#E11D48',
};

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

export function GlassChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/92 backdrop-blur-xl border border-emerald-950/15 rounded-xl px-3.5 py-2.5 shadow-[0_12px_28px_-10px_rgba(6,78,59,0.22)] text-xs">
      {label && (
        <p className="font-semibold text-[#064E3B] mb-1 font-display">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="text-[#52635D]">{entry.name || 'Count'}</span>
            <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function computeAvgResolutionHours(reports: CampusReport[]): number | null {
  const resolved = reports.filter(
    (r) => r.status === 'Resolved' && r.createdAt && r.resolvedAt
  );
  if (resolved.length === 0) return null;
  const totalMs = resolved.reduce((acc, r) => {
    const diff = r.resolvedAt!.getTime() - r.createdAt!.getTime();
    return acc + Math.max(diff, 0);
  }, 0);
  return Number((totalMs / resolved.length / (1000 * 60 * 60)).toFixed(1));
}

export function AdminAnalyticsPage({ reports }: { reports: CampusReport[] }) {
  const dispatch = useAppDispatch();
  const dateRange = useAppSelector((s) => s.dashboard.analyticsDateRange);
  const categoryFilter = useAppSelector((s) => s.dashboard.analyticsCategoryFilter);
  const includeDemo = useAppSelector((s) => s.dashboard.includeDemoInAnalytics);

  const filtered = useMemo(() => {
    const now = Date.now();
    return reports.filter((r) => {
      if (!includeDemo && r.isDemo) return false;
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
      if (dateRange !== 'all' && r.createdAt) {
        const days = dateRange === '7d' ? 7 : 30;
        if (now - r.createdAt.getTime() > days * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [reports, dateRange, categoryFilter, includeDemo]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.category, (map.get(r.category) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byPriority = useMemo(() => {
    return ISSUE_PRIORITIES.map((p) => ({
      name: p,
      count: filtered.filter((r) => r.priority === p).length,
    }));
  }, [filtered]);

  const pendingVsResolved = useMemo(() => {
    const open = filtered.filter((r) => r.status !== 'Resolved').length;
    const resolved = filtered.filter((r) => r.status === 'Resolved').length;
    return [
      { name: 'Open / Active', value: open },
      { name: 'Resolved', value: resolved },
    ];
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    const ordered = [...filtered]
      .filter((r) => Boolean(r.createdAt))
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    for (const r of ordered) {
      if (!r.createdAt) continue;
      const key = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
      }).format(r.createdAt);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([month, reportsCount]) => ({
      month,
      reports: reportsCount,
    }));
  }, [filtered]);

  const byBuilding = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.building, (map.get(r.building) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([building, count]) => ({
        building: building.length > 22 ? `${building.slice(0, 20)}…` : building,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filtered]);

  const avgHours = useMemo(() => computeAvgResolutionHours(filtered), [filtered]);
  const resolutionRate =
    filtered.length > 0
      ? Math.round(
          (filtered.filter((r) => r.status === 'Resolved').length / filtered.length) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Glass Filters Toolbar */}
      <div className="glass-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#064E3B] font-display">
            Campus Maintenance Analytics
          </h2>
          <p className="text-xs text-[#52635D] mt-0.5 tabular-nums">
            Live analytics across {filtered.length} Firestore report records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F172A] cursor-pointer px-2 py-1.5">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => dispatch(setIncludeDemoInAnalytics(e.target.checked))}
              className="rounded border-emerald-950/20 text-[#059669] focus:ring-[#059669]"
            />
            Include Demo Records
          </label>

          {/* Segmented Date Range Controls */}
          <div className="flex items-center gap-1 p-1 bg-emerald-950/[0.05] rounded-xl border border-emerald-950/10">
            {(
              [
                { value: 'all', label: 'All Time' },
                { value: '30d', label: '30 Days' },
                { value: '7d', label: '7 Days' },
              ] as Array<{ value: AnalyticsDateRange; label: string }>
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => dispatch(setAnalyticsDateRange(opt.value))}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  dateRange === opt.value
                    ? 'bg-white text-[#064E3B] shadow-xs font-semibold'
                    : 'text-[#52635D] hover:text-[#064E3B]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => dispatch(setAnalyticsCategoryFilter(e.target.value))}
            className="glass-input px-3 py-2 text-xs font-medium rounded-xl text-[#0F172A]"
          >
            <option value="All">All Categories</option>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Glass Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel-hover rounded-2xl p-5">
          <p className="text-xs font-medium text-[#52635D]">Filtered Incidents</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#064E3B] font-display tabular-nums">
            {filtered.length}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">Matching current filter scope</p>
        </div>
        <div className="glass-panel-hover rounded-2xl p-5">
          <p className="text-xs font-medium text-[#52635D]">Resolution Rate</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#059669] font-display tabular-nums">
            {resolutionRate}%
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">Completed vs active queue</p>
        </div>
        <div className="glass-panel-hover rounded-2xl p-5">
          <p className="text-xs font-medium text-[#52635D]">Avg Resolution Time</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-teal-700 font-display tabular-nums">
            {avgHours !== null ? `${avgHours} hrs` : 'N/A'}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">Verified Firestore timestamps</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-5 h-5" />}
          title="No analytics data for current filters"
          description="Submit reports or enable demo data seeding in UniFix AI Intelligence to visualize campus trends."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Report Trends (Smooth AreaChart) */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#064E3B] font-display">
                  Monthly Incident Volume
                </h3>
                <p className="text-xs text-[#52635D] mt-0.5">
                  Report intake trajectory over time
                </p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="ufEmeraldArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,78,59,0.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GlassChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="reports"
                    name="Reports"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ufEmeraldArea)"
                    activeDot={{ r: 5, fill: '#064E3B', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reports by Category (Clean Donut Chart) */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Reports by Category
              </h3>
              <p className="text-xs text-[#52635D] mt-0.5">
                Distribution across campus maintenance divisions
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2}
                  >
                    {byCategory.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GREEN_CHART_PALETTE[index % GREEN_CHART_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reports by Priority (Bar Chart) */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Severity & Priority Mix
              </h3>
              <p className="text-xs text-[#52635D] mt-0.5">
                Volume across triage urgency tiers
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,78,59,0.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GlassChartTooltip />} />
                  <Bar dataKey="count" name="Reports" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {byPriority.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PRIORITY_COLORS[entry.name] || '#059669'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pending vs Resolved (Donut Chart) */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Open vs Resolved Balance
              </h3>
              <p className="text-xs text-[#52635D] mt-0.5">
                Current completion ratio ({resolutionRate}% resolved)
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pendingVsResolved}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={4}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2}
                  >
                    <Cell fill="#F59E0B" />
                    <Cell fill="#059669" />
                  </Pie>
                  <Tooltip content={<GlassChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Building-wise Issue Statistics */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Building Hotspot Analysis
              </h3>
              <p className="text-xs text-[#52635D] mt-0.5">
                Top campus facilities by logged incident count
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBuilding}>
                  <defs>
                    <linearGradient id="ufBuildingBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#064E3B" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,78,59,0.08)" vertical={false} />
                  <XAxis
                    dataKey="building"
                    tick={{ fontSize: 11, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#52635D' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GlassChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Issues"
                    fill="url(#ufBuildingBar)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampusCareIntelligencePage({
  reports,
  profile,
}: {
  reports: CampusReport[];
  profile: UserProfile;
}) {
  const { showToast, confirmAction } = useToast();
  const [aiInsights, setAiInsights] = useState<IntelligenceReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const verifiedStats = useMemo(() => {
    const demoReportsCount = reports.filter((r) => r.isDemo).length;
    const verifiedReportsCount = reports.length - demoReportsCount;
    const pendingCount = reports.filter(
      (r) => r.status === 'Pending' || r.status === 'Under Review'
    ).length;
    const inProgressCount = reports.filter((r) => r.status === 'In Progress').length;
    const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;
    const highAndUrgentCount = reports.filter(
      (r) => r.priority === 'High' || r.priority === 'Urgent'
    ).length;
    const avgResolutionHours = computeAvgResolutionHours(reports);

    const catMap = new Map<string, number>();
    const bldMap = new Map<string, number>();
    const priMap = new Map<string, number>();

    for (const r of reports) {
      catMap.set(r.category, (catMap.get(r.category) || 0) + 1);
      bldMap.set(r.building, (bldMap.get(r.building) || 0) + 1);
      priMap.set(r.priority, (priMap.get(r.priority) || 0) + 1);
    }

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const buildingBreakdown = Array.from(bldMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const priorityBreakdown = Array.from(priMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return {
      totalReports: reports.length,
      demoReportsCount,
      verifiedReportsCount,
      pendingCount,
      inProgressCount,
      resolvedCount,
      highAndUrgentCount,
      avgResolutionHours,
      categoryBreakdown,
      buildingBreakdown,
      priorityBreakdown,
    };
  }, [reports]);

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const res = await generateIntelligenceInsights(verifiedStats);
      setAiInsights(res);
      showToast(
        'UniFix AI Intelligence updated',
        'AI observations generated from verified Firestore metrics.',
        'success'
      );
    } catch (err) {
      showToast(
        'Intelligence error',
        err instanceof Error ? err.message : 'Unable to generate AI insights.',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await seedDemoData(profile);
      showToast(
        'Demo records seeded',
        `Added ${res.reportsCreated} clearly labeled demo reports, plus maintenance departments and staff.`,
        'success'
      );
    } catch (err) {
      showToast(
        'Seeding failed',
        err instanceof Error ? err.message : 'Unable to seed demo data.',
        'error'
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemo = async () => {
    const ok = await confirmAction({
      title: 'Remove all demo sample reports?',
      message:
        'This removes only records marked isDemo = true. Real student reports remain untouched.',
      confirmLabel: 'Remove Demo Reports',
      destructive: true,
    });
    if (!ok) return;
    setSeeding(true);
    try {
      const count = await clearDemoReports(reports);
      showToast('Demo data cleared', `Removed ${count} demo sample reports.`, 'info');
    } catch (err) {
      showToast(
        'Clear failed',
        err instanceof Error ? err.message : 'Unable to delete demo records.',
        'error'
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emerald Glass Executive Banner */}
      <div className="glass-hero-emerald text-white rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-emerald-200">
            Executive Operations Intelligence
          </p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold font-display">
            UniFix AI Intelligence
          </h2>
          <p className="mt-1.5 text-sm text-emerald-50/90 max-w-2xl">
            Verified Firestore aggregations separated cleanly from UniFix AI-generated
            operational observations.
          </p>
        </div>

        <button
          type="button"
          disabled={generating}
          onClick={handleGenerateInsights}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#064E3B] bg-white rounded-xl hover:bg-emerald-50 transition-colors shrink-0 disabled:opacity-60 self-start lg:self-auto shadow-sm"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BrainCircuit className="w-4 h-4" />
          )}
          Generate AI Observations
        </button>
      </div>

      {/* Verified Database Facts (Single-Elevation Grid with Hairline Dividers) */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-950/10">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              Verified Firestore Database Facts
            </h3>
          </div>
          <span className="text-xs text-[#52635D] tabular-nums">
            {verifiedStats.verifiedReportsCount} live student reports ·{' '}
            {verifiedStats.demoReportsCount} labeled demo records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-emerald-950/10 text-xs">
          <div className="py-2 md:pr-5">
            <p className="text-[#52635D] font-medium">A. Top Category</p>
            <p className="mt-1.5 text-base font-bold text-[#064E3B] font-display">
              {verifiedStats.categoryBreakdown[0]?.name || 'No data'}
            </p>
            <p className="mt-1 text-[#64748B] tabular-nums">
              {verifiedStats.categoryBreakdown[0]?.count || 0} reports logged
            </p>
          </div>

          <div className="py-2 md:px-5">
            <p className="text-[#52635D] font-medium">B. Building Hotspot</p>
            <p className="mt-1.5 text-base font-bold text-[#064E3B] font-display truncate">
              {verifiedStats.buildingBreakdown[0]?.name || 'No data'}
            </p>
            <p className="mt-1 text-[#64748B] tabular-nums">
              {verifiedStats.buildingBreakdown[0]?.count || 0} incidents recorded
            </p>
          </div>

          <div className="py-2 md:px-5">
            <p className="text-[#52635D] font-medium">C. High & Urgent Queue</p>
            <p className="mt-1.5 text-base font-bold text-rose-700 font-display tabular-nums">
              {verifiedStats.highAndUrgentCount} issues
            </p>
            <p className="mt-1 text-[#64748B] tabular-nums">
              {verifiedStats.pendingCount} pending triage
            </p>
          </div>

          <div className="py-2 md:pl-5">
            <p className="text-[#52635D] font-medium">D. Avg Resolution Time</p>
            <p className="mt-1.5 text-base font-bold text-[#059669] font-display tabular-nums">
              {verifiedStats.avgResolutionHours !== null
                ? `${verifiedStats.avgResolutionHours} hrs`
                : 'Insufficient resolved records'}
            </p>
            <p className="mt-1 text-[#64748B] tabular-nums">
              Across {verifiedStats.resolvedCount} resolved tickets
            </p>
          </div>
        </div>
      </div>

      {/* AI-Generated Insights Section */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-950/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              E. AI-Generated Operational Observations (Advisory)
            </h3>
          </div>
          {aiInsights && (
            <span className="text-xs text-[#52635D]">
              Generated from verified Firestore totals
            </span>
          )}
        </div>

        {!aiInsights ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#52635D] max-w-lg mx-auto">
              Click <strong>Generate AI Observations</strong> above to have UniFix AI
              synthesize patterns across your live category, location, priority, and
              resolution metrics.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-[#0F172A] leading-relaxed bg-emerald-50/70 rounded-xl p-4">
              {aiInsights.executiveSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {aiInsights.observations.map((obs, idx) => (
                <div
                  key={idx}
                  className="pt-3 border-t border-emerald-950/10"
                >
                  <p className="text-xs font-semibold text-[#059669]">{obs.focusArea}</p>
                  <h4 className="mt-1 text-sm font-bold text-[#064E3B] font-display">
                    {obs.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-[#52635D] leading-relaxed">
                    {obs.detail}
                  </p>
                </div>
              ))}
            </div>

            {aiInsights.recommendedActions.length > 0 && (
              <div className="pt-4 border-t border-emerald-950/10">
                <h4 className="text-xs font-bold text-[#064E3B] mb-2">
                  Suggested Next Actions for Facilities Leadership
                </h4>
                <ul className="space-y-1.5 text-xs text-[#334155] list-disc pl-5">
                  {aiInsights.recommendedActions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin-Only Demo Data Seeding Panel */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#064E3B] font-display">
            Competition & Evaluation Demo Data Seeding (Admin Only)
          </h3>
          <p className="text-xs text-[#52635D] mt-1 max-w-2xl leading-relaxed">
            Seed 5 realistic sample incidents (Electrical, Plumbing, Furniture, Wi-Fi,
            Safety) plus campus departments and maintenance staff. Sample records are
            explicitly flagged <code className="font-mono">isDemo: true</code> so they
            are clearly distinguished from live student submissions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedDemo}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] rounded-xl hover:bg-[#047857] transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Seed Demo Data
          </button>
          {verifiedStats.demoReportsCount > 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleClearDemo}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100/70 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Demo ({verifiedStats.demoReportsCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
