import React, { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  MailCheck,
  RefreshCw,
  Search,
  User,
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
  formatDateTime,
} from '../../components/StatusIndicators';
import {
  AppNotification,
  CampusReport,
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  UserProfile,
} from '../../types/campuscare';
import {
  subscribeStudentReports,
  subscribeUserNotifications,
} from '../../services/reportService';
import { isBootstrappedAdminEmail } from '../../firebase/config';
import {
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ReportIssuePage } from './ReportIssuePage';
import { ReportDetailPage } from '../ReportDetailPage';
import { AIAssistantPage } from '../AIAssistantPage';
import {
  NotificationsPage,
  ProfileSettingsPage,
} from '../SharedAccountPages';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
  setStudentCategoryFilter,
  setStudentSearch,
  setStudentStatusFilter,
} from '../../store/dashboardSlice';

function StudentOverview({
  profile,
  reports,
  notifications,
  loading,
}: {
  profile: UserProfile;
  reports: CampusReport[];
  notifications: AppNotification[];
  loading: boolean;
}) {
  const navigate = useNavigate();
  const { firebaseUser, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [sendingVerif, setSendingVerif] = useState(false);
  const [checkingVerif, setCheckingVerif] = useState(false);

  const needsAdminEmailVerification = Boolean(
    firebaseUser &&
      !firebaseUser.emailVerified &&
      isBootstrappedAdminEmail(profile.email)
  );

  const handleSendVerification = async () => {
    setSendingVerif(true);
    try {
      await sendCurrentUserVerificationEmail();
      showToast(
        'Verification email sent',
        `Check ${profile.email} inbox and click the verification link.`,
        'success'
      );
    } catch (err) {
      showToast(
        'Could not send email',
        err instanceof Error ? err.message : 'Try again shortly.',
        'error'
      );
    } finally {
      setSendingVerif(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerif(true);
    try {
      const verified = await reloadCurrentUser();
      if (verified) {
        await refreshProfile();
        showToast('Email verified', 'Admin Console unlocked.', 'success');
        navigate('/admin', { replace: true });
      } else {
        showToast(
          'Not verified yet',
          'Open the Firebase verification link in your email inbox first, or sign in with Google.',
          'info'
        );
      }
    } catch (err) {
      showToast(
        'Check failed',
        err instanceof Error ? err.message : 'Unable to refresh status.',
        'error'
      );
    } finally {
      setCheckingVerif(false);
    }
  };

  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(
      (r) => r.status === 'Pending' || r.status === 'Under Review'
    ).length;
    const inProgress = reports.filter((r) => r.status === 'In Progress').length;
    const resolved = reports.filter((r) => r.status === 'Resolved').length;
    return { total, pending, inProgress, resolved };
  }, [reports]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports) {
      map.set(r.category, (map.get(r.category) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [reports]);

  return (
    <div className="space-y-6">
      {needsAdminEmailVerification && (
        <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-amber-900 font-display">
              Administrator Email Verification Required
            </h3>
            <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
              Your email (<span className="font-semibold">{profile.email}</span>) is
              configured as an administrator, but Firebase Email/Password accounts must
              have a verified email (or be promoted by an active admin) before accessing
              the Admin Console. Verify your email or sign in via Google with this address.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={sendingVerif}
              onClick={handleSendVerification}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#064E3B] rounded-xl hover:bg-[#047857] disabled:opacity-60"
            >
              <MailCheck className="w-3.5 h-3.5" />
              {sendingVerif ? 'Sending...' : 'Send Verification Email'}
            </button>
            <button
              type="button"
              disabled={checkingVerif}
              onClick={handleCheckVerification}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-xl hover:bg-amber-100/50 disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {checkingVerif ? 'Checking...' : 'I Verified — Refresh Access'}
            </button>
          </div>
        </div>
      )}

      {/* Emerald Glass Welcome Banner + Quick Action */}
      <div className="glass-hero-emerald text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-medium text-emerald-200">
            Student Workspace {profile.studentId ? `· ${profile.studentId}` : ''}
          </p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold font-display">
            Welcome back, {profile.fullName}
          </h2>
          <p className="mt-1.5 text-sm text-emerald-50/90 max-w-xl">
            Submit campus maintenance reports with UniFix AI photo diagnostics and follow
            live resolution updates from facilities teams.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/student/report')}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#064E3B] bg-white rounded-xl hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto shadow-sm"
        >
          <FilePlus2 className="w-4 h-4" />
          Report New Issue
        </button>
      </div>

      {/* KPI Glass Cards */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Total Reports</p>
            <p className="mt-2 text-3xl font-bold text-[#064E3B] font-display">
              <AnimatedCounter value={stats.total} />
            </p>
            <p className="mt-1.5 text-xs text-[#64748B]">All submitted tickets</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Pending Reports</p>
            <p className="mt-2 text-3xl font-bold text-amber-700 font-display">
              <AnimatedCounter value={stats.pending} />
            </p>
            <p className="mt-1.5 text-xs text-[#64748B]">Pending & under review</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-teal-700 font-display">
              <AnimatedCounter value={stats.inProgress} />
            </p>
            <p className="mt-1.5 text-xs text-[#64748B]">Active technician work</p>
          </div>
          <div className="glass-panel-hover rounded-2xl p-5">
            <p className="text-xs font-medium text-[#52635D]">Resolved Reports</p>
            <p className="mt-2 text-3xl font-bold text-[#059669] font-display">
              <AnimatedCounter value={stats.resolved} />
            </p>
            <p className="mt-1.5 text-xs text-[#64748B]">Completed & verified</p>
          </div>
        </div>
      )}

      {/* My Category Activity Summary (only when real reports exist) */}
      {!loading && categorySummary.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              My Submitted Categories
            </h3>
            <span className="text-xs text-[#52635D] tabular-nums">
              {reports.length} total reports
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categorySummary.map((cat) => {
              const pct = Math.round((cat.count / reports.length) * 100);
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#0F172A] truncate pr-2">
                      {cat.name}
                    </span>
                    <span className="font-mono text-[#059669] font-semibold tabular-nums">
                      {cat.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-950/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#064E3B] to-[#10B981] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Reports & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#064E3B] font-display">
              Recent Reports
            </h3>
            <button
              type="button"
              onClick={() => navigate('/student/reports')}
              className="text-xs font-semibold text-[#059669] hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={4} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-5 h-5" />}
              title="No reports submitted yet"
              description="Spotted a broken light, plumbing leak, or Wi-Fi outage on campus? Submit your first issue report."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/student/report')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857]"
                >
                  Report New Issue
                </button>
              }
            />
          ) : (
            <div className="glass-panel rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-semibold text-[#52635D]">
                    <th className="py-3 px-4">Report ID</th>
                    <th className="py-3 px-4">Issue Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/5 text-xs">
                  {reports.slice(0, 6).map((report) => (
                    <tr
                      key={report.reportId}
                      onClick={() => navigate(`/student/reports/${report.reportId}`)}
                      className="hover:bg-emerald-50/55 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#064E3B] whitespace-nowrap">
                        {report.reportId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0F172A] max-w-[220px] truncate">
                        {report.title}
                      </td>
                      <td className="py-3.5 px-4 text-[#52635D] whitespace-nowrap">
                        {report.category}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityLabel priority={report.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusLabel status={report.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#52635D] tabular-nums whitespace-nowrap">
                        {formatDateShort(report.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#064E3B] font-display">
              Recent Notifications
            </h3>
            <button
              type="button"
              onClick={() => navigate('/student/notifications')}
              className="text-xs font-semibold text-[#059669] hover:underline"
            >
              See all
            </button>
          </div>

          <div className="glass-panel rounded-2xl divide-y divide-emerald-950/5 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#52635D]">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <button
                  key={n.notificationId}
                  type="button"
                  onClick={() => navigate(`/student/reports/${n.reportId}`)}
                  className={`w-full text-left p-4 hover:bg-emerald-50/60 transition-colors ${
                    !n.isRead ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <p className="text-xs text-[#0F172A] leading-relaxed">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-[#52635D]">
                    {formatDateTime(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentMyReports({
  reports,
  loading,
}: {
  reports: CampusReport[];
  loading: boolean;
}) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const search = useAppSelector((s) => s.dashboard.studentSearch);
  const statusFilter = useAppSelector((s) => s.dashboard.studentStatusFilter);
  const categoryFilter = useAppSelector((s) => s.dashboard.studentCategoryFilter);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.reportId.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesCat = categoryFilter === 'All' || r.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [reports, search, statusFilter, categoryFilter]);

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => dispatch(setStudentSearch(e.target.value))}
            placeholder="Search by Report ID, title, or building..."
            className="glass-input w-full pl-9 pr-3.5 py-2 text-sm rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => dispatch(setStudentStatusFilter(e.target.value))}
            className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
          >
            <option value="All">All Statuses</option>
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => dispatch(setStudentCategoryFilter(e.target.value))}
            className="glass-input px-3 py-2 text-xs font-medium rounded-xl"
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

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-5 h-5" />}
          title="No matching reports found"
          description="Try adjusting your search or filter criteria, or submit a new campus issue report."
          action={
            <button
              type="button"
              onClick={() => navigate('/student/report')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857]"
            >
              Report New Issue
            </button>
          }
        />
      ) : (
        <div className="glass-panel rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-semibold text-[#52635D]">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Issue Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/5 text-xs">
              {filtered.map((r) => (
                <tr
                  key={r.reportId}
                  onClick={() => navigate(`/student/reports/${r.reportId}`)}
                  className="hover:bg-emerald-50/55 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#064E3B] whitespace-nowrap">
                    {r.reportId}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#0F172A] max-w-[240px] truncate">
                    {r.title}
                  </td>
                  <td className="py-3.5 px-4 text-[#52635D] whitespace-nowrap">
                    {r.category}
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
  );
}

export function StudentDashboard({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<CampusReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubReports = subscribeStudentReports(profile.uid, (data) => {
      setReports(data);
      setLoading(false);
    });
    const unsubNotifs = subscribeUserNotifications(profile.uid, (data) => {
      setNotifications(data);
    });
    return () => {
      unsubReports();
      unsubNotifs();
    };
  }, [profile.uid]);

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      to: '/student',
      end: true,
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Report an Issue',
      to: '/student/report',
      icon: <FilePlus2 className="w-4 h-4" />,
    },
    {
      label: 'My Reports',
      to: '/student/reports',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      label: 'Notifications',
      to: '/student/notifications',
      icon: <Bell className="w-4 h-4" />,
    },
    {
      label: 'AI Assistant',
      to: '/student/assistant',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      label: 'Profile',
      to: '/student/profile',
      icon: <User className="w-4 h-4" />,
    },
  ];

  return (
    <DashboardShell
      title="Student Portal"
      breadcrumb="UniFix / Student Workspace"
      navItems={navItems}
      notifications={notifications}
      profile={profile}
      headerAction={
        <button
          type="button"
          onClick={() => navigate('/student/report')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          Report Issue
        </button>
      }
    >
      <Routes>
        <Route
          index
          element={
            <StudentOverview
              profile={profile}
              reports={reports}
              notifications={notifications}
              loading={loading}
            />
          }
        />
        <Route
          path="report"
          element={<ReportIssuePage profile={profile} existingReports={reports} />}
        />
        <Route
          path="reports"
          element={<StudentMyReports reports={reports} loading={loading} />}
        />
        <Route
          path="reports/:reportId"
          element={<ReportDetailPage profile={profile} />}
        />
        <Route
          path="notifications"
          element={<NotificationsPage notifications={notifications} role="student" />}
        />
        <Route path="assistant" element={<AIAssistantPage role="student" />} />
        <Route path="profile" element={<ProfileSettingsPage profile={profile} />} />
      </Routes>
    </DashboardShell>
  );
}
