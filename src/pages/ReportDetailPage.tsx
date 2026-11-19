import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileImage,
  Loader2,
  MessageSquare,
  Send,
  UserCheck,
  Wrench,
} from 'lucide-react';
import {
  CampusReport,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  IssuePriority,
  IssueStatus,
  MaintenanceDepartment,
  StaffMember,
  UserProfile,
} from '../types/campuscare';
import {
  addStudentAdditionalInfo,
  subscribeReportById,
  updateReportByAdmin,
} from '../services/reportService';
import {
  PriorityLabel,
  StatusLabel,
  formatDateTime,
} from '../components/StatusIndicators';
import { useToast } from '../contexts/ToastContext';

const TIMELINE_STAGES: Array<{
  key: IssueStatus;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'Pending', label: 'Report Submitted', icon: <Clock className="w-4 h-4" /> },
  { key: 'Under Review', label: 'Under Review', icon: <Eye className="w-4 h-4" /> },
  { key: 'In Progress', label: 'In Progress', icon: <Wrench className="w-4 h-4" /> },
  { key: 'Resolved', label: 'Resolved', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export function ReportDetailPage({
  profile,
  departments = [],
  staffList = [],
}: {
  profile: UserProfile;
  departments?: MaintenanceDepartment[];
  staffList?: StaffMember[];
}) {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { showToast, confirmAction } = useToast();

  const [report, setReport] = useState<CampusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Admin edit states
  const [status, setStatus] = useState<IssueStatus>('Pending');
  const [priority, setPriority] = useState<IssuePriority>('Medium');
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Student supplementary note state
  const [studentNote, setStudentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    const unsub = subscribeReportById(reportId, (data) => {
      setReport(data);
      if (data) {
        setStatus(data.status);
        setPriority(data.priority);
        setAssignedDepartment(data.assignedDepartment);
        setAssignedStaff(data.assignedStaff);
        setStudentNote(data.additionalInfo);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [reportId]);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 animate-pulse space-y-4">
        <div className="h-5 w-48 bg-emerald-950/10 rounded" />
        <div className="h-8 w-3/4 bg-emerald-950/10 rounded" />
        <div className="h-32 w-full bg-emerald-950/5 rounded" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center">
        <h2 className="text-lg font-bold text-[#064E3B] font-display">
          Report not found
        </h2>
        <p className="text-sm text-[#52635D] mt-1">
          This report may not exist or you do not have permission to view it.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-5 px-4 py-2 text-sm font-medium text-white bg-[#059669] rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  const activeStageIndex = ISSUE_STATUSES.indexOf(report.status);

  const getStageTimestamp = (stage: IssueStatus): string | null => {
    if (stage === 'Pending' && report.createdAt) {
      return formatDateTime(report.createdAt);
    }
    if (stage === 'Resolved' && report.resolvedAt) {
      return formatDateTime(report.resolvedAt);
    }
    const entry = [...report.statusHistory]
      .reverse()
      .find((item) => item.status === stage);
    if (entry?.timestamp) {
      return formatDateTime(new Date(entry.timestamp));
    }
    return null;
  };

  const handleAdminSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'Resolved' && report.status !== 'Resolved') {
      const ok = await confirmAction({
        title: 'Mark report as Resolved?',
        message: `This will close ${report.reportId}, record the resolution timestamp, and notify ${report.studentName}.`,
        confirmLabel: 'Mark Resolved',
      });
      if (!ok) return;
    }

    setSavingAdmin(true);
    try {
      await updateReportByAdmin({
        report,
        status,
        priority,
        assignedDepartment,
        assignedStaff,
        newComment: adminComment.trim()
          ? { authorName: profile.fullName, message: adminComment }
          : undefined,
      });
      setAdminComment('');
      showToast(
        'Report updated',
        `${report.reportId} updated and student notified.`,
        'success'
      );
    } catch (err) {
      showToast(
        'Update failed',
        err instanceof Error ? err.message : 'Unable to save changes.',
        'error'
      );
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleSaveStudentNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNote(true);
    try {
      await addStudentAdditionalInfo(report.reportId, studentNote);
      showToast('Details updated', 'Additional context saved to report.', 'success');
    } catch (err) {
      showToast(
        'Failed to update',
        err instanceof Error ? err.message : 'Unable to save details.',
        'error'
      );
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            navigate(profile.role === 'admin' ? '/admin/reports' : '/student/reports')
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-[#52635D] hover:text-[#064E3B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>

        <div className="flex items-center gap-3">
          {report.isDemo && (
            <span className="text-xs font-medium text-[#52635D]">
              Sample Demo Record ·
            </span>
          )}
          <PriorityLabel priority={report.priority} />
          <StatusLabel status={report.status} />
        </div>
      </div>

      {/* Main Header + Visual 4-Stage Timeline */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52635D]">
          <span className="font-mono font-semibold text-[#064E3B]">
            {report.reportId}
          </span>
          <span aria-hidden="true">·</span>
          <span>{report.category}</span>
          <span aria-hidden="true">·</span>
          <span>Submitted {formatDateTime(report.createdAt)}</span>
          {profile.role === 'admin' && (
            <>
              <span aria-hidden="true">·</span>
              <span>Reporter: {report.studentName}</span>
            </>
          )}
        </div>

        <h2 className="mt-2 text-xl sm:text-2xl font-bold text-[#064E3B] font-display">
          {report.title}
        </h2>

        {/* Visual Progress Timeline */}
        <div className="mt-6 pt-6 border-t border-emerald-950/10">
          <p className="text-xs font-semibold text-[#064E3B] mb-4">
            Resolution Progress Timeline
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {TIMELINE_STAGES.map((stage, idx) => {
              const completed = idx <= activeStageIndex;
              const current = idx === activeStageIndex;
              const ts = getStageTimestamp(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`p-3.5 rounded-xl transition-colors ${
                    current
                      ? 'bg-emerald-50/90 ring-1 ring-[#059669]'
                      : completed
                      ? 'bg-emerald-50/45'
                      : 'bg-emerald-950/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        current
                          ? 'bg-[#059669] text-white'
                          : completed
                          ? 'bg-[#064E3B] text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {stage.icon}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        completed ? 'text-[#064E3B]' : 'text-[#52635D]'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#52635D] font-mono tabular-nums">
                    {ts || (completed ? 'Completed' : 'Awaiting stage')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Description, Photo, AI Analysis, Comments */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Issue Description
              </h3>
              <p className="mt-2 text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
                {report.description}
              </p>
            </div>

            {report.additionalInfo && (
              <div className="pt-4 border-t border-emerald-950/10">
                <h4 className="text-xs font-semibold text-[#52635D]">
                  Additional Reporter Notes
                </h4>
                <p className="mt-1 text-sm text-[#334155]">{report.additionalInfo}</p>
              </div>
            )}

            <div className="pt-4 border-t border-emerald-950/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#52635D]">Campus Location</p>
                  <p className="font-medium text-[#0F172A] mt-0.5">
                    {report.location}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#52635D]">Assigned Team</p>
                  <p className="font-medium text-[#0F172A] mt-0.5">
                    {report.assignedDepartment || 'Unassigned'}
                    {report.assignedStaff ? ` · ${report.assignedStaff}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Photo */}
          {report.imageUrl && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileImage className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-[#064E3B] font-display">
                  Submitted Evidence Photograph
                </h3>
              </div>
              {!imgError ? (
                <img
                  src={report.imageUrl}
                  alt={`Evidence for ${report.title}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full max-h-96 object-contain rounded-xl border border-emerald-950/10 bg-emerald-950/[0.02]"
                />
              ) : (
                <div className="py-10 bg-emerald-950/[0.03] rounded-xl text-center text-xs text-[#52635D]">
                  Unable to load image preview.
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Card */}
          {report.aiAnalysis && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-950/10">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#059669]" />
                  <h3 className="text-sm font-bold text-[#064E3B] font-display">
                    UniFix AI Assessment
                  </h3>
                </div>
                <span className="text-xs text-[#52635D]">
                  Confidence: {report.aiAnalysis.confidence} · Advisory
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#52635D]">Suggested Category</p>
                  <p className="font-semibold text-[#064E3B] mt-0.5">
                    {report.aiAnalysis.category}
                  </p>
                </div>
                <div>
                  <p className="text-[#52635D]">Advisory Priority</p>
                  <p className="font-semibold text-[#064E3B] mt-0.5">
                    {report.aiAnalysis.priority}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[#52635D]">Priority Rationale</p>
                  <p className="text-[#334155] mt-0.5 leading-relaxed">
                    {report.aiAnalysis.priorityReason}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[#52635D]">Recommended Department & Action</p>
                  <p className="text-[#334155] mt-0.5 leading-relaxed">
                    <span className="font-semibold text-[#064E3B]">
                      {report.aiAnalysis.department}:
                    </span>{' '}
                    {report.aiAnalysis.recommendation}
                  </p>
                </div>
                {report.aiAnalysis.visualFindings && (
                  <div className="sm:col-span-2">
                    <p className="text-[#52635D]">Visual Findings</p>
                    <p className="text-[#334155] mt-0.5 leading-relaxed">
                      {report.aiAnalysis.visualFindings}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Administrative Comments Thread */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#064E3B]" />
              <h3 className="text-sm font-bold text-[#064E3B] font-display">
                Administrative Updates & Comments
              </h3>
            </div>
            {report.adminComments.length === 0 ? (
              <p className="text-xs text-[#52635D]">
                No administrative comments have been posted yet.
              </p>
            ) : (
              <div className="divide-y divide-emerald-950/10">
                {report.adminComments.map((c) => (
                  <div key={c.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#064E3B]">
                        {c.authorName}
                      </span>
                      <span className="text-[#52635D] font-mono text-[11px] tabular-nums">
                        {formatDateTime(new Date(c.createdAt))}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-[#334155] leading-relaxed">
                      {c.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Admin Triage Controls OR Student Context Update */}
        <div className="lg:col-span-5 space-y-6">
          {profile.role === 'admin' ? (
            <form
              onSubmit={handleAdminSave}
              className="glass-panel rounded-2xl p-6 space-y-4 sticky top-24"
            >
              <h3 className="text-base font-bold text-[#064E3B] font-display">
                Administrator Triage & Assignment
              </h3>
              <p className="text-xs text-[#52635D]">
                Updating status, assignment, or comments automatically notifies the
                reporting student.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IssueStatus)}
                    className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                  >
                    {ISSUE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                  >
                    {ISSUE_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                  Maintenance Department
                </label>
                <select
                  value={assignedDepartment}
                  onChange={(e) => setAssignedDepartment(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                >
                  <option value="">Unassigned</option>
                  {departments.map((d) => (
                    <option key={d.departmentId} value={d.departmentName}>
                      {d.departmentName}
                    </option>
                  ))}
                  {assignedDepartment &&
                    !departments.some((d) => d.departmentName === assignedDepartment) && (
                      <option value={assignedDepartment}>{assignedDepartment}</option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                  Assigned Maintenance Staff
                </label>
                <select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((member) => (
                    <option key={member.staffId} value={member.fullName}>
                      {member.fullName} ({member.departmentName || member.availability})
                    </option>
                  ))}
                  {assignedStaff &&
                    !staffList.some((m) => m.fullName === assignedStaff) && (
                      <option value={assignedStaff}>{assignedStaff}</option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
                  Add Administrative Comment
                </label>
                <textarea
                  rows={3}
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Share inspection findings, scheduled repair window, or closure notes..."
                  className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={savingAdmin}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingAdmin && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Triage Update
              </button>
            </form>
          ) : (
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-[#064E3B] font-display">
                  Report Metadata & Updates
                </h3>
              </div>
              <div className="text-xs space-y-2.5 text-[#52635D]">
                <p>
                  Last Updated:{' '}
                  <span className="font-medium text-[#0F172A]">
                    {formatDateTime(report.updatedAt)}
                  </span>
                </p>
                {report.resolvedAt && (
                  <p>
                    Resolved At:{' '}
                    <span className="font-medium text-[#059669]">
                      {formatDateTime(report.resolvedAt)}
                    </span>
                  </p>
                )}
              </div>

              {report.status !== 'Resolved' && (
                <form
                  onSubmit={handleSaveStudentNote}
                  className="pt-4 border-t border-emerald-950/10 space-y-3"
                >
                  <label className="block text-xs font-semibold text-[#064E3B]">
                    Update Additional Location / Access Info
                  </label>
                  <textarea
                    rows={3}
                    value={studentNote}
                    onChange={(e) => setStudentNote(e.target.value)}
                    placeholder="Add extra access details for the maintenance crew..."
                    className="glass-input w-full px-3 py-2 text-sm rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] rounded-xl hover:bg-[#047857] disabled:opacity-60"
                  >
                    {savingNote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Save Supplementary Info
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
