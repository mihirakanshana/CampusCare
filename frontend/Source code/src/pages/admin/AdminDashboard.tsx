import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
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
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { DashboardShell, NavItem } from '../../components/DashboardShell';
import {
  AnimatedCounter,
  CardSkeleton,
  EmptyState,
  PriorityLabel,
  StatusLabel,
  TableSkeleton,
  formatDateShort,
} from '../../components/StatusIndicators';
import {
  AppNotification,
  CampusReport,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  MaintenanceDepartment,
  StaffMember,
  UserProfile,
} from '../../types/campuscare';
import {
  subscribeAllReports,
  subscribeDepartments,
  subscribeStaff,
  subscribeUserNotifications,
} from '../../services/reportService';
import { ReportDetailPage } from '../ReportDetailPage';
import { NotificationsPage } from '../SharedAccountPages';
import {
  AdminAnalyticsPage,
  CampusCareIntelligencePage,
  GlassChartTooltip,
  computeAvgResolutionHours,
} from './AdminAnalyticsPages';
import {
  AdminSettingsPage,
  DepartmentsPage,
  StaffManagementPage,
} from './AdminManagementPages';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  AdminSortBy,
  setAdminCategoryFilter,
  setAdminPriorityFilter,
  setAdminSearch,
  setAdminSortBy,
  setAdminStatusFilter,
} from '../../store/dashboardSlice';

const STATUS_DONUT_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  'Under Review': '#0D9488',
  'In Progress': '#10B981',
  Resolved: '#064E3B',
};

const PRIORITY_BAR_COLORS: Record<string, string> = {
  Low: '#64748B',
  Medium: '#10B981',
  High: '#D97706',
  Urgent: '#E11D48',
};

function AdminOverview({
  reports,
  loading,
}: {
  reports: CampusReport[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(
      (r) => r.status === 'Pending' || r.status === 'Under Review'
    ).length;
    const highPriority = reports.filter(
      (r) => (r.priority === 'High' || r.priority === 'Urgent') && r.status !== 'Resolved'
    ).length;
    const resolved = reports.filter((r) => r.status === 'Resolved').length;
    const avgHours = computeAvgResolutionHours(reports);
    return { total, pending, highPriority, resolved, avgHours };
  }, [reports]);

  const statusBreakdown = useMemo(() => {
    return ISSUE_STATUSES.map((s) => ({
      name: s,
      value: reports.filter((r) => r.status === s).length,
    })).filter((d) => d.value > 0);
  }, [reports]);

  const priorityBreakdown = useMemo(() => {
    return ISSUE_PRIORITIES.map((p) => ({
      name: p,
      count: reports.filter((r) => r.priority === p).length,
    }));
  }, [reports]);

  const urgentQueue = useMemo(() => {
    return reports
      .filter((r) => r.status !== 'Resolved')
      .sort((a, b) => {
        const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 7);
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* KPI Glass Cards */}
      {loading ? (
        <CardSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Total Reports</p>
            <p className="mt-2 text-2xl font-bold text-[#064E3B] font-display">
              <AnimatedCounter value={stats.total} />
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">Firestore records</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Pending Reports</p>
            <p className="mt-2 text-2xl font-bold text-amber-700 font-display">
              <AnimatedCounter value={stats.pending} />
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">Awaiting triage</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">High / Urgent Open</p>
            <p className="mt-2 text-2xl font-bold text-rose-700 font-display">
              <AnimatedCounter value={stats.highPriority} />
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">Immediate attention</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Resolved Reports</p>
            <p className="mt-2 text-2xl font-bold text-[#059669] font-display">
              <AnimatedCounter value={stats.resolved} />
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">Completed tickets</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Avg Resolution</p>
            <p className="mt-2 text-2xl font-bold text-teal-700 font-display tabular-nums">
              {stats.avgHours !== null ? (
                <AnimatedCounter value={stats.avgHours} suffix="h" decimals={1} />
              ) : (
                'N/A'
              )}
            </p>
            <p className="mt-1 text-[11px] text-[#64748B]">From real timestamps</p>
          </div>
        </div>
      )}

      {/* Live Glass Analytics Overview Row */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#064E3B] font-display">
                  Workflow Status Distribution
                </h2>
                <p className="text-xs text-[#52635D]">
                  Live share across all 4 resolution stages
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/analytics')}
                className="text-xs font-semibold text-[#059669] hover:underline whitespace-nowrap"
              >
                Full Analytics
              </button>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_DONUT_COLORS[entry.name] || '#059669'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#064E3B] font-display">
                  Priority Volume Breakdown
                </h2>
                <p className="text-xs text-[#52635D]">
                  Incident count by urgency tier
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/intelligence')}
                className="text-xs font-semibold text-[#059669] hover:underline whitespace-nowrap"
              >
                AI Insights
              </button>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityBreakdown}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(6,78,59,0.08)"
                    vertical={false}
                  />
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
                  <Bar dataKey="count" name="Reports" radius={[8, 8, 0, 0]} maxBarSize={52}>
                    {priorityBreakdown.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PRIORITY_BAR_COLORS[entry.name] || '#059669'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Priority Triage Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#064E3B] font-display">
              Priority Triage Queue
            </h2>
            <p className="text-xs text-[#52635D]">
              Active open incidents ordered by severity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="text-xs font-semibold text-[#059669] hover:underline"
          >
            Open All Reports
          </button>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : urgentQueue.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-5 h-5" />}
            title="No active campus incidents"
            description="All submitted reports are resolved, or you can seed demo competition records inside AI Insights."
            action={
              <button
                type="button"
                onClick={() => navigate('/admin/intelligence')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition-colors"
              >
                Open UniFix AI Intelligence
              </button>
            }
          />
        ) : (
          <div className="glass-panel rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-semibold text-[#52635D]">
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Issue Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5 text-xs">
                {urgentQueue.map((r) => (
                  <tr
                    key={r.reportId}
                    onClick={() => navigate(`/admin/reports/${r.reportId}`)}
                    className="hover:bg-emerald-50/55 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#064E3B] whitespace-nowrap">
                      {r.reportId}
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A] whitespace-nowrap">
                      {r.studentName}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A] max-w-[240px] truncate">
                      {r.title}
                    </td>
                    <td className="py-3.5 px-4 text-[#52635D] max-w-[200px] truncate">
                      {r.location}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityLabel priority={r.priority} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusLabel status={r.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#52635D] tabular-nums whitespace-nowrap">
                      {formatDateShort(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminReportsTable({
  reports,
  loading,
  fixedStatus,
  heading,
}: {
  reports: CampusReport[];
  loading: boolean;
  fixedStatus?: string;
  heading: string;
}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const search = useAppSelector((s) => s.dashboard.adminSearch);
  const categoryFilter = useAppSelector((s) => s.dashboard.adminCategoryFilter);
  const priorityFilter = useAppSelector((s) => s.dashboard.adminPriorityFilter);
  const storeStatusFilter = useAppSelector((s) => s.dashboard.adminStatusFilter);
  const sortBy = useAppSelector((s) => s.dashboard.adminSortBy);
  const statusFilter = fixedStatus || storeStatusFilter;
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [fixedStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reports.filter((r) => {
      const matchesQ =
        !q ||
        r.reportId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'All' || r.category === categoryFilter;
      const matchesPri = priorityFilter === 'All' || r.priority === priorityFilter;
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'PendingGroup'
          ? r.status === 'Pending' || r.status === 'Under Review'
          : r.status === statusFilter;
      return matchesQ && matchesCat && matchesPri && matchesStatus;
    });

    if (sortBy === 'oldest') {
      return [...list].sort(
        (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
    }
    if (sortBy === 'priority') {
      const order = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return [...list].sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return list;
  }, [reports, search, categoryFilter, priorityFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#064E3B] font-display">
              {heading}
            </h2>
            <p className="text-xs text-[#52635D] tabular-nums">
              Showing {filtered.length} matching records
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                dispatch(setAdminSearch(e.target.value));
                setPage(1);
              }}
              placeholder="Search Report ID, student, title, or building..."
              className="glass-input w-full pl-9 pr-3.5 py-2 text-sm rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={categoryFilter}
              onChange={(e) => {
                dispatch(setAdminCategoryFilter(e.target.value));
                setPage(1);
              }}
              className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
            >
              <option value="All">All Categories</option>
              {ISSUE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                dispatch(setAdminPriorityFilter(e.target.value));
                setPage(1);
              }}
              className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
            >
              <option value="All">All Priorities</option>
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {!fixedStatus && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  dispatch(setAdminStatusFilter(e.target.value));
                  setPage(1);
                }}
                className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
              >
                <option value="All">All Statuses</option>
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) =>
                dispatch(setAdminSortBy(e.target.value as AdminSortBy))
              }
              className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="priority">Sort: Highest Priority</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={7} />
      ) : paged.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-5 h-5" />}
          title="No reports match this view"
          description="Try clearing search filters or check other report status queues."
        />
      ) : (
        <div className="glass-panel rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-semibold text-[#52635D]">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Issue Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/5 text-xs">
              {paged.map((r) => (
                <tr key={r.reportId} className="hover:bg-emerald-50/55 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#064E3B] whitespace-nowrap">
                    {r.reportId}
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A] max-w-[140px] truncate">
                    {r.studentName}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#0F172A] max-w-[200px] truncate">
                    {r.title}
                  </td>
                  <td className="py-3.5 px-4 text-[#52635D] whitespace-nowrap">
                    {r.category}
                  </td>
                  <td className="py-3.5 px-4 text-[#52635D] max-w-[160px] truncate">
                    {r.location}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityLabel priority={r.priority} />
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusLabel status={r.status} />
                  </td>
                  <td className="py-3.5 px-4 text-[#52635D] tabular-nums whitespace-nowrap">
                    {formatDateShort(r.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/reports/${r.reportId}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#064E3B] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100/70 transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-4 py-3 bg-emerald-950/[0.02] border-t border-emerald-950/10 flex items-center justify-between text-xs text-[#52635D]">
              <span className="tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-white border border-emerald-950/10 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-white border border-emerald-950/10 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [departments, setDepartments] = useState<MaintenanceDepartment[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubReports = subscribeAllReports((data) => {
      setReports(data);
      setLoading(false);
    });
    const unsubNotifs = subscribeUserNotifications(profile.uid, setNotifications);
    const unsubDepts = subscribeDepartments(setDepartments);
    const unsubStaff = subscribeStaff(setStaffList);

    return () => {
      unsubReports();
      unsubNotifs();
      unsubDepts();
      unsubStaff();
    };
  }, [profile.uid]);

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      to: '/admin',
      end: true,
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'All Reports',
      to: '/admin/reports',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      label: 'Pending Issues',
      to: '/admin/pending',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      label: 'In Progress',
      to: '/admin/in-progress',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      label: 'Resolved',
      to: '/admin/resolved',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: 'Departments',
      to: '/admin/departments',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      label: 'Staff Management',
      to: '/admin/staff',
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Analytics',
      to: '/admin/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: 'AI Insights',
      to: '/admin/intelligence',
      icon: <BrainCircuit className="w-4 h-4" />,
    },
    {
      label: 'Notifications',
      to: '/admin/notifications',
      icon: <Bell className="w-4 h-4" />,
    },
    {
      label: 'Settings',
      to: '/admin/settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <DashboardShell
      title="Administration Console"
      breadcrumb="UniFix / Campus Operations"
      navItems={navItems}
      notifications={notifications}
      profile={profile}
    >
      <Routes>
        <Route
          index
          element={<AdminOverview reports={reports} loading={loading} />}
        />
        <Route
          path="reports"
          element={
            <AdminReportsTable
              reports={reports}
              loading={loading}
              heading="All Campus Reports"
            />
          }
        />
        <Route
          path="pending"
          element={
            <AdminReportsTable
              reports={reports}
              loading={loading}
              fixedStatus="PendingGroup"
              heading="Pending & Under Review Reports"
            />
          }
        />
        <Route
          path="in-progress"
          element={
            <AdminReportsTable
              reports={reports}
              loading={loading}
              fixedStatus="In Progress"
              heading="In Progress Maintenance"
            />
          }
        />
        <Route
          path="resolved"
          element={
            <AdminReportsTable
              reports={reports}
              loading={loading}
              fixedStatus="Resolved"
              heading="Resolved Incidents"
            />
          }
        />
        <Route
          path="reports/:reportId"
          element={
            <ReportDetailPage
              profile={profile}
              departments={departments}
              staffList={staffList}
            />
          }
        />
        <Route
          path="departments"
          element={<DepartmentsPage departments={departments} />}
        />
        <Route
          path="staff"
          element={
            <StaffManagementPage departments={departments} staffList={staffList} />
          }
        />
        <Route
          path="analytics"
          element={<AdminAnalyticsPage reports={reports} />}
        />
        <Route
          path="intelligence"
          element={
            <CampusCareIntelligencePage reports={reports} profile={profile} />
          }
        />
        <Route
          path="notifications"
          element={<NotificationsPage notifications={notifications} role="admin" />}
        />
        <Route
          path="settings"
          element={<AdminSettingsPage profile={profile} />}
        />
      </Routes>
    </DashboardShell>
  );
}
