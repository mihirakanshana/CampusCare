import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, KeyRound, Loader2, Shield, UserCheck } from 'lucide-react';
import { AppNotification, UserProfile } from '../types/campuscare';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/reportService';
import {
  requestPasswordReset,
  updateOwnStudentProfile,
} from '../services/authService';
import { EmptyState, formatDateTime } from '../components/StatusIndicators';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function NotificationsPage({
  notifications,
  role,
}: {
  notifications: AppNotification[];
  role: 'student' | 'admin';
}) {
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpen = async (item: AppNotification) => {
    if (!item.isRead) {
      await markNotificationRead(item.notificationId);
    }
    navigate(
      role === 'admin'
        ? `/admin/reports/${item.reportId}`
        : `/student/reports/${item.reportId}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="glass-panel rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#064E3B] font-display">
            Notifications Center
          </h2>
          <p className="text-xs text-[#52635D] mt-0.5 tabular-nums">
            {unreadCount} unread · {notifications.length} total notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllNotificationsRead(notifications)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/70"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5" />}
          title="No notifications yet"
          description="When reports are submitted, assigned, commented on, or resolved, updates will appear here in real time."
        />
      ) : (
        <div className="glass-panel rounded-2xl divide-y divide-emerald-950/5 overflow-hidden">
          {notifications.map((n) => (
            <button
              key={n.notificationId}
              type="button"
              onClick={() => handleOpen(n)}
              className={`w-full text-left px-5 py-4 hover:bg-emerald-50/55 transition-colors flex items-start justify-between gap-4 ${
                !n.isRead ? 'bg-emerald-50/45' : ''
              }`}
            >
              <div>
                <p
                  className={`text-sm ${
                    n.isRead ? 'text-[#52635D]' : 'font-semibold text-[#0F172A]'
                  }`}
                >
                  {n.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
                  <span className="font-mono text-[#059669]">{n.reportId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(n.createdAt)}</span>
                </div>
              </div>
              {!n.isRead && (
                <span className="text-[11px] font-semibold text-[#059669] shrink-0">
                  Unread
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileSettingsPage({ profile }: { profile: UserProfile }) {
  const { refreshProfile, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile.fullName);
  const [studentId, setStudentId] = useState(profile.studentId);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await updateOwnStudentProfile(profile.uid, { fullName, studentId });
      await refreshProfile();
      showToast('Profile saved', 'Your account details have been updated.', 'success');
    } catch (err) {
      showToast(
        'Save failed',
        err instanceof Error ? err.message : 'Unable to save profile.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile.email) return;
    setSendingReset(true);
    try {
      await requestPasswordReset(profile.email);
      showToast(
        'Password reset email sent',
        `Check ${profile.email} for reset instructions.`,
        'success'
      );
    } catch (err) {
      showToast(
        'Reset failed',
        err instanceof Error ? err.message : 'Could not send reset email.',
        'error'
      );
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass-panel rounded-2xl p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#064E3B] to-[#059669] text-white font-display font-bold text-lg flex items-center justify-center uppercase shadow-xs">
          {profile.fullName.slice(0, 2)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#064E3B] font-display">
            {profile.fullName}
          </h2>
          <p className="text-xs text-[#52635D] mt-0.5">
            {profile.email} ·{' '}
            <span className="capitalize font-medium text-[#059669]">
              {profile.role} Account
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="glass-panel rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#059669]" />
          <h3 className="text-sm font-bold text-[#064E3B] font-display">
            Account Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
              University Email (Read-only)
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2 text-sm bg-emerald-950/[0.04] border border-emerald-950/10 rounded-xl text-[#52635D]"
            />
          </div>
        </div>

        {profile.role === 'student' && (
          <div>
            <label className="block text-xs font-medium text-[#064E3B] mb-1.5">
              Student ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="STU-2026-XXXX"
              className="glass-input w-full px-3.5 py-2 text-sm rounded-xl"
            />
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-4">
          <p className="text-xs text-[#52635D]">
            Role: <span className="font-semibold capitalize">{profile.role}</span> ·
            Joined {formatDateTime(profile.createdAt)}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] flex items-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>

      <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-[#064E3B] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              Password & Security
            </h3>
            <p className="text-xs text-[#52635D] mt-0.5">
              Send a Firebase password reset link to {profile.email}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={sendingReset}
            onClick={handlePasswordReset}
            className="px-4 py-2 text-xs font-semibold text-[#064E3B] bg-white border border-emerald-950/10 rounded-xl hover:bg-emerald-50/60 flex items-center gap-2"
          >
            {sendingReset && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Reset Password
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100/70"
          >
            Sign Out
          </button>
        </div>
      </div>

      {profile.role === 'admin' && (
        <div className="glass-panel rounded-2xl p-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              Administrator Privileges Active
            </h3>
            <p className="text-xs text-[#52635D] mt-1 leading-relaxed">
              Your account is authorized in Firestore security rules to triage campus
              reports, manage departments and staff rosters, and run UniFix AI
              Intelligence analytics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
