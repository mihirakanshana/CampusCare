import React, { useEffect, useState } from 'react';
import {
  Building2,
  Loader2,
  Plus,
  ShieldPlus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  MaintenanceDepartment,
  STAFF_AVAILABILITIES,
  StaffAvailability,
  StaffMember,
  UserProfile,
} from '../../types/campuscare';
import {
  createDepartment,
  createStaffMember,
  deleteDepartment,
  deleteStaffMember,
  fetchAllUsersForAdmin,
  grantAdminAccess,
  updateStaffAvailability,
} from '../../services/reportService';
import { EmptyState } from '../../components/StatusIndicators';
import { ProfileSettingsPage } from '../SharedAccountPages';
import { useToast } from '../../contexts/ToastContext';
import {
  createAdminAccountByAdmin,
  mapAuthError,
} from '../../services/authService';

export function DepartmentsPage({
  departments,
}: {
  departments: MaintenanceDepartment[];
}) {
  const { showToast, confirmAction } = useToast();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createDepartment(name, desc);
      setName('');
      setDesc('');
      showToast('Department added', `${name} saved to Firestore.`, 'success');
    } catch (err) {
      showToast(
        'Failed to add department',
        err instanceof Error ? err.message : 'Unable to save department.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: MaintenanceDepartment) => {
    const ok = await confirmAction({
      title: `Remove ${dept.departmentName}?`,
      message: 'Existing reports referencing this department name will retain their text label.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await deleteDepartment(dept.departmentId);
    showToast('Department removed', dept.departmentName, 'info');
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="glass-panel rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-[#064E3B] font-display">
          Add Maintenance Department
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department Name (e.g., HVAC & Climate)"
            className="glass-input px-3.5 py-2 text-sm rounded-xl"
          />
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Responsibilities & scope"
            className="md:col-span-2 glass-input px-3.5 py-2 text-sm rounded-xl"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create Department
        </button>
      </form>

      {departments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="No maintenance departments configured"
          description="Create departments above or seed the starter maintenance departments in AI Insights."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div
              key={d.departmentId}
              className="glass-panel-hover rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#064E3B] font-display">
                    {d.departmentName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    aria-label={`Delete ${d.departmentName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#52635D] leading-relaxed">
                  {d.description || 'Campus facilities division.'}
                </p>
              </div>
              <p className="mt-4 pt-3 border-t border-emerald-950/10 font-mono text-[11px] text-[#64748B]">
                {d.departmentId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffManagementPage({
  departments,
  staffList,
}: {
  departments: MaintenanceDepartment[];
  staffList: StaffMember[];
}) {
  const { showToast, confirmAction } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState(
    departments[0]?.departmentId || ''
  );
  const [availability, setAvailability] = useState<StaffAvailability>('Available');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!departmentId && departments[0]) {
      setDepartmentId(departments[0].departmentId);
    }
  }, [departments, departmentId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find((d) => d.departmentId === departmentId);
    if (!dept) {
      showToast(
        'Department required',
        'Create a maintenance department first before adding staff.',
        'error'
      );
      return;
    }
    setSaving(true);
    try {
      await createStaffMember({
        fullName,
        email,
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        availability,
      });
      setFullName('');
      setEmail('');
      showToast('Staff member added', `${fullName} added to roster.`, 'success');
    } catch (err) {
      showToast(
        'Failed to add staff',
        err instanceof Error ? err.message : 'Unable to save staff member.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    const ok = await confirmAction({
      title: `Remove ${member.fullName}?`,
      message: 'This technician will be removed from the assignment roster.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await deleteStaffMember(member.staffId);
    showToast('Staff removed', member.fullName, 'info');
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="glass-panel rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-[#064E3B] font-display">
          Add Maintenance Staff Member
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Technician Full Name"
            className="glass-input px-3.5 py-2 text-sm rounded-xl"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@unifix.edu"
            className="glass-input px-3.5 py-2 text-sm rounded-xl"
          />
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="glass-input px-3.5 py-2 text-sm rounded-xl"
          >
            {departments.length === 0 ? (
              <option value="">No departments yet</option>
            ) : (
              departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>
                  {d.departmentName}
                </option>
              ))
            )}
          </select>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as StaffAvailability)}
            className="glass-input px-3.5 py-2 text-sm rounded-xl"
          >
            {STAFF_AVAILABILITIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving || departments.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-xl hover:bg-[#047857] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Technician
        </button>
      </form>

      {staffList.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No maintenance staff added yet"
          description="Add technicians above to assign them directly to incoming student reports."
        />
      ) : (
        <div className="glass-panel rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-semibold text-[#52635D]">
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/5 text-xs">
              {staffList.map((member) => (
                <tr key={member.staffId} className="hover:bg-emerald-50/55 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                    {member.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-[#52635D]">{member.email}</td>
                  <td className="py-3.5 px-4 text-[#0F172A]">
                    {member.departmentName || member.departmentId}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={member.availability}
                      onChange={(e) =>
                        updateStaffAvailability(
                          member.staffId,
                          e.target.value as StaffAvailability
                        )
                      }
                      className="glass-input px-2.5 py-1 text-xs font-medium rounded-lg"
                    >
                      {STAFF_AVAILABILITIES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      aria-label={`Remove ${member.fullName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export function AdminSettingsPage({ profile }: { profile: UserProfile }) {
  const { showToast, confirmAction } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const list = await fetchAllUsersForAdmin();
      setUsers(list);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminError('');
    if (newAdminPassword.length < 6) {
      setCreateAdminError('Password must be at least 6 characters.');
      return;
    }

    setCreatingAdmin(true);
    try {
      const created = await createAdminAccountByAdmin({
        fullName: newAdminName.trim() || newAdminEmail.split('@')[0],
        email: newAdminEmail,
        password: newAdminPassword,
      });
      showToast(
        created.promotedExisting
          ? 'Existing account promoted to Admin'
          : 'Administrator created',
        `${created.email} can now sign in to the Admin Console.`,
        'success'
      );
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      await loadUsers();
    } catch (err) {
      const msg = mapAuthError(err);
      setCreateAdminError(msg);
      showToast('Admin creation failed', msg, 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handlePromote = async (target: UserProfile) => {
    const ok = await confirmAction({
      title: `Grant Admin Access to ${target.fullName}?`,
      message: `This adds ${target.email} to the trusted /admins registry in Firestore so they can manage all campus reports and staff.`,
      confirmLabel: 'Grant Admin Role',
    });
    if (!ok) return;
    try {
      await grantAdminAccess(target);
      showToast('Admin granted', `${target.fullName} is now an administrator.`, 'success');
      await loadUsers();
    } catch (err) {
      showToast(
        'Promotion failed',
        err instanceof Error ? err.message : 'Unable to grant admin role.',
        'error'
      );
    }
  };

  return (
    <div className="space-y-8">
      <ProfileSettingsPage profile={profile} />

      <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldPlus className="w-4 h-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#064E3B] font-display">
              Authorized Administrator Setup
            </h3>
          </div>
          <p className="text-xs text-[#52635D] mt-1 leading-relaxed">
            Create a new administrator account with Email/Password or promote an existing
            registered user. Note: Email/Password sign-in must be enabled in Firebase
            Console Authentication Providers.
          </p>
        </div>

        {/* Provision New Admin Form (hairline divider instead of nested box) */}
        <form
          onSubmit={handleCreateAdmin}
          className="pt-4 border-t border-emerald-950/10 space-y-3"
        >
          <p className="text-xs font-semibold text-[#064E3B]">
            Provision New Admin Credentials
          </p>
          {createAdminError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 break-words">
              {createAdminError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="Full Name (e.g., Nimal Perera)"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Admin Email"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <input
              type="password"
              required
              minLength={6}
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Password (min. 6 chars)"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={creatingAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] rounded-xl hover:bg-[#047857] disabled:opacity-60"
          >
            {creatingAdmin ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Create Admin Account
          </button>
        </form>

        <div className="pt-4 border-t border-emerald-950/10">
          <p className="text-xs font-semibold text-[#064E3B] mb-2">
            Existing Registered Accounts
          </p>
          {loadingUsers ? (
            <div className="py-6 text-xs text-[#52635D]">Loading registered users...</div>
          ) : (
            <div className="divide-y divide-emerald-950/10">
              {users.map((u) => (
                <div
                  key={u.uid}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0F172A] truncate">{u.fullName}</p>
                    <p className="text-[#52635D] truncate">
                      {u.email} {u.studentId ? `· ${u.studentId}` : ''}
                    </p>
                  </div>
                  {u.role === 'admin' ? (
                    <span className="font-semibold text-[#059669] shrink-0">Admin</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePromote(u)}
                      className="px-3 py-1.5 font-semibold text-[#064E3B] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100/70 shrink-0"
                    >
                      Promote to Admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
