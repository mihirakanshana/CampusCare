import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  db,
  storage,
  FIREBASE_PROJECT_ID,
  OperationType,
  handleFirestoreError,
} from '../firebase/config';
import {
  AIAnalysisResult,
  AdminComment,
  AppNotification,
  CampusReport,
  IssueCategory,
  IssuePriority,
  IssueStatus,
  MaintenanceDepartment,
  StaffAvailability,
  StaffMember,
  StatusHistoryEntry,
  UserProfile,
} from '../types/campuscare';

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function toDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

function mapReport(data: Record<string, unknown>, id: string): CampusReport {
  return {
    reportId: String(data.reportId || id),
    title: String(data.title || ''),
    description: String(data.description || ''),
    category: (data.category as IssueCategory) || 'Other',
    location: String(data.location || ''),
    building: String(data.building || ''),
    roomNumber: String(data.roomNumber || ''),
    additionalInfo: String(data.additionalInfo || ''),
    imageUrl: String(data.imageUrl || ''),
    priority: (data.priority as IssuePriority) || 'Medium',
    status: (data.status as IssueStatus) || 'Pending',
    studentId: String(data.studentId || ''),
    studentName: String(data.studentName || 'Student'),
    studentUniversityId: String(data.studentUniversityId || ''),
    assignedDepartment: String(data.assignedDepartment || ''),
    assignedStaff: String(data.assignedStaff || ''),
    aiAnalysis: (data.aiAnalysis as AIAnalysisResult | null) || null,
    adminComments: Array.isArray(data.adminComments) ? (data.adminComments as AdminComment[]) : [],
    statusHistory: Array.isArray(data.statusHistory) ? (data.statusHistory as StatusHistoryEntry[]) : [],
    isDemo: Boolean(data.isDemo),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    resolvedAt: toDate(data.resolvedAt),
  };
}

export function generateReportId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  return `CC-${year}-${rand}${ts}`;
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function uploadReportPhoto(file: File, userId: string): Promise<string> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be 5 MB or smaller.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const storageRef = ref(storage, `reports/${userId}/${Date.now()}_${safeName}`);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });
    let settled = false;

    const resetStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        uploadTask.cancel();
        reject(
          new Error(
            `Photo upload timed out. Firebase Storage may not be enabled yet for project "${FIREBASE_PROJECT_ID}".`
          )
        );
      }, 10000);
    };

    let stallTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      uploadTask.cancel();
      reject(
        new Error(
          `Photo upload timed out. Firebase Storage may not be enabled yet for project "${FIREBASE_PROJECT_ID}".`
        )
      );
    }, 10000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.bytesTransferred > 0) {
          resetStallTimer();
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(stallTimer);
        const message = err instanceof Error ? err.message : String(err);
        reject(
          new Error(
            `Firebase Storage upload failed (${message}). Ensure Firebase Storage is enabled for project "${FIREBASE_PROJECT_ID}" with storage.rules deployed.`
          )
        );
      },
      async () => {
        if (settled) return;
        clearTimeout(stallTimer);
        try {
          const url = await withTimeout(
            getDownloadURL(uploadTask.snapshot.ref),
            8000,
            'Timed out retrieving uploaded photo URL.'
          );
          settled = true;
          resolve(url);
        } catch (err) {
          settled = true;
          const message = err instanceof Error ? err.message : String(err);
          reject(new Error(`Failed to finalize uploaded photo URL: ${message}`));
        }
      }
    );
  });
}

function sanitizeAiAnalysis(ai: AIAnalysisResult | null | undefined): AIAnalysisResult | null {
  if (!ai) return null;
  try {
    return JSON.parse(JSON.stringify(ai)) as AIAnalysisResult;
  } catch {
    return null;
  }
}

export async function createReport(params: {
  title: string;
  description: string;
  category: IssueCategory;
  building: string;
  roomNumber: string;
  additionalInfo?: string;
  imageUrl?: string;
  priority: IssuePriority;
  aiAnalysis?: AIAnalysisResult | null;
  profile: UserProfile;
}): Promise<string> {
  const reportId = generateReportId();
  const cleanBuilding = params.building.trim().slice(0, 120) || 'Campus Grounds';
  const cleanRoom = (params.roomNumber || '').trim().slice(0, 60);
  const location = cleanRoom
    ? `${cleanBuilding} · ${cleanRoom}`
    : cleanBuilding;

  const cleanStudentName =
    (params.profile.fullName || '').trim().slice(0, 120) || 'Campus Student';
  const cleanStudentUnivId = (params.profile.studentId || '').trim().slice(0, 40);

  const initialHistory: StatusHistoryEntry[] = [
    {
      status: 'Pending',
      timestamp: new Date().toISOString(),
      note: 'Report submitted by student.',
    },
  ];

  const payload = {
    reportId,
    title: params.title.trim().slice(0, 180),
    description: params.description.trim().slice(0, 4000),
    category: params.category,
    location: location.slice(0, 200),
    building: cleanBuilding,
    roomNumber: cleanRoom,
    additionalInfo: (params.additionalInfo || '').trim().slice(0, 1000),
    imageUrl: (params.imageUrl || '').slice(0, 1500),
    priority: params.priority,
    status: 'Pending' as IssueStatus,
    studentId: params.profile.uid,
    studentName: cleanStudentName,
    studentUniversityId: cleanStudentUnivId,
    assignedDepartment: '',
    assignedStaff: '',
    aiAnalysis: sanitizeAiAnalysis(params.aiAnalysis),
    adminComments: [],
    statusHistory: initialHistory,
    isDemo: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
  };

  try {
    await withTimeout(
      setDoc(doc(db, 'reports', reportId), payload),
      15000,
      'Saving the report to Cloud Firestore timed out. Check your internet connection and Firebase setup.'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
  }

  // Create confirmation notification (non-blocking so report submission never stalls on notification write)
  const notificationId = generateSafeId('notif');
  try {
    await withTimeout(
      setDoc(doc(db, 'notifications', notificationId), {
        notificationId,
        userId: params.profile.uid,
        reportId,
        message: `Report ${reportId} ("${payload.title.slice(0, 60)}") was submitted for triage.`,
        type: 'submitted',
        isRead: false,
        createdAt: serverTimestamp(),
      }),
      6000,
      'Notification write timed out.'
    );
  } catch (err) {
    console.warn('Confirmation notification could not be created:', err);
  }

  return reportId;
}

export async function addStudentAdditionalInfo(
  reportId: string,
  additionalInfo: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      additionalInfo: additionalInfo.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
  }
}

export async function updateReportByAdmin(params: {
  report: CampusReport;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedDepartment?: string;
  assignedStaff?: string;
  newComment?: { authorName: string; message: string };
}): Promise<void> {
  const { report } = params;
  const nextStatus = params.status ?? report.status;
  const nextPriority = params.priority ?? report.priority;
  const nextDept = params.assignedDepartment ?? report.assignedDepartment;
  const nextStaff = params.assignedStaff ?? report.assignedStaff;

  const updatedHistory = [...report.statusHistory];
  if (nextStatus !== report.status) {
    updatedHistory.push({
      status: nextStatus,
      timestamp: new Date().toISOString(),
      note:
        nextStatus === 'Resolved'
          ? 'Marked resolved by campus administration.'
          : `Status updated to ${nextStatus}.`,
    });
  }

  const updatedComments = [...report.adminComments];
  if (params.newComment && params.newComment.message.trim()) {
    updatedComments.push({
      id: generateSafeId('cmt'),
      authorName: params.newComment.authorName.slice(0, 100),
      authorRole: 'admin',
      message: params.newComment.message.trim().slice(0, 800),
      createdAt: new Date().toISOString(),
    });
  }

  const updateData: Record<string, unknown> = {
    status: nextStatus,
    priority: nextPriority,
    assignedDepartment: nextDept.slice(0, 120),
    assignedStaff: nextStaff.slice(0, 120),
    statusHistory: updatedHistory.slice(-10),
    adminComments: updatedComments.slice(-50),
    updatedAt: serverTimestamp(),
  };

  if (nextStatus === 'Resolved' && report.status !== 'Resolved') {
    updateData.resolvedAt = serverTimestamp();
  } else if (nextStatus !== 'Resolved' && report.status === 'Resolved') {
    updateData.resolvedAt = null;
  }

  try {
    await updateDoc(doc(db, 'reports', report.reportId), updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reports/${report.reportId}`);
  }

  // Send targeted notification to student if studentId exists & is not a synthetic demo user
  const notificationsToSend: Array<{ message: string; type: AppNotification['type'] }> = [];
  if (nextStatus !== report.status) {
    notificationsToSend.push({
      message: `Report ${report.reportId} status changed to "${nextStatus}".`,
      type: 'status_change',
    });
  }
  if (nextDept !== report.assignedDepartment || nextStaff !== report.assignedStaff) {
    const target = [nextDept, nextStaff].filter(Boolean).join(' · ');
    if (target) {
      notificationsToSend.push({
        message: `Report ${report.reportId} assigned to ${target}.`,
        type: 'assignment',
      });
    }
  }
  if (params.newComment && params.newComment.message.trim()) {
    notificationsToSend.push({
      message: `Administrator commented on ${report.reportId}: "${params.newComment.message.trim().slice(0, 90)}"`,
      type: 'comment',
    });
  }

  for (const n of notificationsToSend) {
    const notificationId = generateSafeId('notif');
    try {
      await setDoc(doc(db, 'notifications', notificationId), {
        notificationId,
        userId: report.studentId,
        reportId: report.reportId,
        message: n.message.slice(0, 500),
        type: n.type,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notificationId}`);
    }
  }
}

export function subscribeStudentReports(
  studentUid: string,
  onData: (reports: CampusReport[]) => void
) {
  const q = query(
    collection(db, 'reports'),
    where('studentId', '==', studentUid),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapReport(d.data(), d.id))
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'reports')
  );
}

export function subscribeAllReports(onData: (reports: CampusReport[]) => void) {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapReport(d.data(), d.id));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'reports')
  );
}

export function subscribeReportById(
  reportId: string,
  onData: (report: CampusReport | null) => void
) {
  return onSnapshot(
    doc(db, 'reports', reportId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(mapReport(snapshot.data(), snapshot.id));
    },
    (error) => handleFirestoreError(error, OperationType.GET, `reports/${reportId}`)
  );
}

export function subscribeUserNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            notificationId: String(data.notificationId || d.id),
            userId: String(data.userId || ''),
            reportId: String(data.reportId || ''),
            message: String(data.message || ''),
            type: (data.type as AppNotification['type']) || 'system',
            isRead: Boolean(data.isRead),
            createdAt: toDate(data.createdAt),
          };
        })
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.isRead);
  if (unread.length === 0) return;
  const batch = writeBatch(db);
  for (const n of unread) {
    batch.update(doc(db, 'notifications', n.notificationId), { isRead: true });
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}

export function subscribeDepartments(onData: (items: MaintenanceDepartment[]) => void) {
  const q = query(collection(db, 'departments'), orderBy('departmentName', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            departmentId: String(data.departmentId || d.id),
            departmentName: String(data.departmentName || ''),
            description: String(data.description || ''),
            createdAt: toDate(data.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'departments')
  );
}

export async function createDepartment(departmentName: string, description: string): Promise<void> {
  const departmentId = generateSafeId('dept');
  try {
    await setDoc(doc(db, 'departments', departmentId), {
      departmentId,
      departmentName: departmentName.trim().slice(0, 120),
      description: description.trim().slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `departments/${departmentId}`);
  }
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'departments', departmentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `departments/${departmentId}`);
  }
}

export function subscribeStaff(onData: (items: StaffMember[]) => void) {
  const q = query(collection(db, 'staff'), orderBy('fullName', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            staffId: String(data.staffId || d.id),
            fullName: String(data.fullName || ''),
            email: String(data.email || ''),
            departmentId: String(data.departmentId || ''),
            departmentName: String(data.departmentName || ''),
            availability: (data.availability as StaffAvailability) || 'Available',
            createdAt: toDate(data.createdAt),
          };
        })
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'staff')
  );
}

export async function createStaffMember(params: {
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  availability: StaffAvailability;
}): Promise<void> {
  const staffId = generateSafeId('staff');
  try {
    await setDoc(doc(db, 'staff', staffId), {
      staffId,
      fullName: params.fullName.trim().slice(0, 120),
      email: params.email.trim().slice(0, 200),
      departmentId: params.departmentId,
      departmentName: params.departmentName.slice(0, 120),
      availability: params.availability,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `staff/${staffId}`);
  }
}

export async function updateStaffAvailability(
  staffId: string,
  availability: StaffAvailability
): Promise<void> {
  try {
    await updateDoc(doc(db, 'staff', staffId), { availability });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `staff/${staffId}`);
  }
}

export async function deleteStaffMember(staffId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `staff/${staffId}`);
  }
}

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(100)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        fullName: String(data.fullName || ''),
        email: String(data.email || ''),
        studentId: String(data.studentId || ''),
        role: data.role === 'admin' ? 'admin' : 'student',
        createdAt: toDate(data.createdAt),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function grantAdminAccess(targetUser: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'admins', targetUser.uid), {
      uid: targetUser.uid,
      email: targetUser.email,
      fullName: targetUser.fullName,
      grantedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', targetUser.uid), { role: 'admin' });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `admins/${targetUser.uid}`);
  }
}

// Admin-only Demo Data Seeding
export async function seedDemoData(adminProfile: UserProfile): Promise<{ reportsCreated: number }> {
  const deptSeeds = [
    {
      departmentId: 'dept-electrical',
      departmentName: 'Electrical Maintenance',
      description: 'Lighting, circuit breakers, HVAC electrical systems, and classroom wiring.',
    },
    {
      departmentId: 'dept-plumbing',
      departmentName: 'Plumbing & Water Systems',
      description: 'Pipe leaks, restroom fixtures, laboratory drains, and campus water lines.',
    },
    {
      departmentId: 'dept-it-network',
      departmentName: 'Campus IT & Networking',
      description: 'Wi-Fi access points, lecture hall AV, and wired campus network switches.',
    },
    {
      departmentId: 'dept-facilities',
      departmentName: 'General Facilities & Carpentry',
      description: 'Classroom seating, doors, structural fixtures, and custodial support.',
    },
    {
      departmentId: 'dept-safety',
      departmentName: 'Campus Safety & Compliance',
      description: 'Urgent physical hazards, fire egress, exposed wiring, and emergency response.',
    },
  ];

  for (const dept of deptSeeds) {
    try {
      await setDoc(doc(db, 'departments', dept.departmentId), {
        ...dept,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `departments/${dept.departmentId}`);
    }
  }

  const staffSeeds = [
    {
      staffId: 'staff-elena-vance',
      fullName: 'Elena Vance',
      email: 'e.vance@unifix.edu',
      departmentId: 'dept-electrical',
      departmentName: 'Electrical Maintenance',
      availability: 'Available' as StaffAvailability,
    },
    {
      staffId: 'staff-marcus-chen',
      fullName: 'Marcus Chen',
      email: 'm.chen@unifix.edu',
      departmentId: 'dept-plumbing',
      departmentName: 'Plumbing & Water Systems',
      availability: 'Available' as StaffAvailability,
    },
    {
      staffId: 'staff-priya-nair',
      fullName: 'Priya Nair',
      email: 'p.nair@unifix.edu',
      departmentId: 'dept-it-network',
      departmentName: 'Campus IT & Networking',
      availability: 'Busy' as StaffAvailability,
    },
    {
      staffId: 'staff-david-okafor',
      fullName: 'David Okafor',
      email: 'd.okafor@unifix.edu',
      departmentId: 'dept-safety',
      departmentName: 'Campus Safety & Compliance',
      availability: 'Available' as StaffAvailability,
    },
  ];

  for (const member of staffSeeds) {
    try {
      await setDoc(doc(db, 'staff', member.staffId), {
        ...member,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `staff/${member.staffId}`);
    }
  }

  const nowIso = new Date().toISOString();
  const earlierIso = new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString();

  const sampleReports = [
    {
      reportId: 'CC-DEMO-1001',
      title: 'Broken classroom ceiling fan oscillating loudly',
      description:
        'The ceiling fan near the third row of Lecture Room 204 is wobbling noticeably when switched on and makes a loud metallic clicking noise.',
      category: 'Electrical' as IssueCategory,
      building: 'Engineering Hall (Building A)',
      roomNumber: 'Room 204',
      location: 'Engineering Hall (Building A) · Room 204',
      priority: 'Medium' as IssuePriority,
      status: 'In Progress' as IssueStatus,
      assignedDepartment: 'Electrical Maintenance',
      assignedStaff: 'Elena Vance',
      aiAnalysis: {
        category: 'Electrical',
        priority: 'Medium',
        priorityReason: 'Mechanical ceiling fixture fault causing noise and potential bracket wear.',
        summary: 'Ceiling fan in Building A Room 204 is wobbling and making metallic noise.',
        description:
          'A ceiling fan mounted above the third row in Engineering Hall Room 204 exhibits excessive oscillation and metallic clicking during operation.',
        department: 'Electrical Maintenance',
        recommendation: 'Power off the fan circuit and inspect mounting bracket and motor bearings.',
        visualFindings: 'No photo attached in sample record.',
        imageUnclear: false,
        confidence: 'High',
        needsHumanReview: false,
        potentialDuplicate: { isPotentialDuplicate: false, matchedReportId: '', reason: '' },
      },
      statusHistory: [
        { status: 'Pending', timestamp: earlierIso, note: 'Demo incident created.' },
        { status: 'Under Review', timestamp: earlierIso, note: 'Assigned to Electrical Maintenance.' },
        { status: 'In Progress', timestamp: nowIso, note: 'Technician dispatched for inspection.' },
      ],
    },
    {
      reportId: 'CC-DEMO-1002',
      title: 'Water leakage near chemistry laboratory entrance',
      description:
        'Steady water pooling along the corridor tile right outside Wet Lab B-112, creating a slippery walkway near electrical floor outlets.',
      category: 'Plumbing' as IssueCategory,
      building: 'Science & Labs Complex (Building B)',
      roomNumber: 'Lab B-112 Corridor',
      location: 'Science & Labs Complex (Building B) · Lab B-112 Corridor',
      priority: 'High' as IssuePriority,
      status: 'Under Review' as IssueStatus,
      assignedDepartment: 'Plumbing & Water Systems',
      assignedStaff: 'Marcus Chen',
      aiAnalysis: {
        category: 'Plumbing',
        priority: 'High',
        priorityReason: 'Active water pooling near high-foot-traffic lab corridor and floor outlets.',
        summary: 'Water leakage pooling outside Chemistry Lab B-112.',
        description:
          'Persistent water accumulation observed along the corridor floor adjacent to Lab B-112, posing a slip and moisture hazard.',
        department: 'Plumbing & Water Systems',
        recommendation: 'Place wet-floor barriers immediately and inspect nearby supply valves.',
        visualFindings: 'Sample record without attachment.',
        imageUnclear: false,
        confidence: 'High',
        needsHumanReview: true,
        potentialDuplicate: { isPotentialDuplicate: false, matchedReportId: '', reason: '' },
      },
      statusHistory: [
        { status: 'Pending', timestamp: earlierIso, note: 'Demo incident created.' },
        { status: 'Under Review', timestamp: nowIso, note: 'Flagged high priority for Plumbing review.' },
      ],
    },
    {
      reportId: 'CC-DEMO-1003',
      title: 'Damaged classroom chair with detached armrest',
      description:
        'Tablet-arm lecture chair in the back row has a cracked mounting weld and sharp metal edge.',
      category: 'Furniture' as IssueCategory,
      building: 'Lecture Theater Block C',
      roomNumber: 'Hall C-105',
      location: 'Lecture Theater Block C · Hall C-105',
      priority: 'Low' as IssuePriority,
      status: 'Resolved' as IssueStatus,
      assignedDepartment: 'General Facilities & Carpentry',
      assignedStaff: 'General Crew',
      aiAnalysis: {
        category: 'Furniture',
        priority: 'Low',
        priorityReason: 'Isolated seating defect; chair can be tagged out until replaced.',
        summary: 'Lecture chair in Hall C-105 has a detached tablet armrest.',
        description:
          'A single student lecture chair in Hall C-105 has a fractured armrest weld requiring replacement or removal.',
        department: 'General Facilities & Carpentry',
        recommendation: 'Remove damaged unit from service and replace with spare seating.',
        visualFindings: 'Sample record.',
        imageUnclear: false,
        confidence: 'High',
        needsHumanReview: false,
        potentialDuplicate: { isPotentialDuplicate: false, matchedReportId: '', reason: '' },
      },
      statusHistory: [
        { status: 'Pending', timestamp: earlierIso, note: 'Demo incident created.' },
        { status: 'In Progress', timestamp: earlierIso, note: 'Replacement unit scheduled.' },
        { status: 'Resolved', timestamp: nowIso, note: 'Damaged chair replaced with new unit.' },
      ],
      resolved: true,
    },
    {
      reportId: 'CC-DEMO-1004',
      title: 'Campus Wi-Fi connectivity drops on 3rd floor study wing',
      description:
        'Students in the 3rd floor silent study wing lose eduroam / campus Wi-Fi every 10 minutes with DNS timeout errors.',
      category: 'Internet / Wi-Fi' as IssueCategory,
      building: 'Central University Library',
      roomNumber: '3rd Floor East Wing',
      location: 'Central University Library · 3rd Floor East Wing',
      priority: 'Medium' as IssuePriority,
      status: 'Pending' as IssueStatus,
      assignedDepartment: 'Campus IT & Networking',
      assignedStaff: '',
      aiAnalysis: {
        category: 'Internet / Wi-Fi',
        priority: 'Medium',
        priorityReason: 'Recurring wireless drop affecting multiple study workstations.',
        summary: 'Intermittent campus Wi-Fi drops in Library 3rd Floor East Wing.',
        description:
          'Repeated wireless disconnections and DNS timeouts reported across the Central University Library 3rd Floor East study area.',
        department: 'Campus IT & Networking',
        recommendation: 'Inspect ceiling access point telemetry and switch uplink health.',
        visualFindings: 'Sample record.',
        imageUnclear: false,
        confidence: 'High',
        needsHumanReview: true,
        potentialDuplicate: { isPotentialDuplicate: false, matchedReportId: '', reason: '' },
      },
      statusHistory: [{ status: 'Pending', timestamp: nowIso, note: 'Demo incident created.' }],
    },
    {
      reportId: 'CC-DEMO-1005',
      title: 'Exposed electrical wiring near stairwell junction box',
      description:
        'Conduit cover plate is missing beside the ground floor stairwell exit, leaving insulated conductors exposed at hand height.',
      category: 'Safety' as IssueCategory,
      building: 'Science & Labs Complex (Building B)',
      roomNumber: 'Ground Stairwell North',
      location: 'Science & Labs Complex (Building B) · Ground Stairwell North',
      priority: 'Urgent' as IssuePriority,
      status: 'Pending' as IssueStatus,
      assignedDepartment: 'Campus Safety & Compliance',
      assignedStaff: 'David Okafor',
      aiAnalysis: {
        category: 'Safety',
        priority: 'Urgent',
        priorityReason: 'Exposed electrical junction box at reachable height in a public stairwell.',
        summary: 'Missing conduit cover exposing wiring in Building B North Stairwell.',
        description:
          'An electrical junction box in the Building B Ground North Stairwell is missing its protective cover plate, exposing conductors to pedestrian contact.',
        department: 'Campus Safety & Compliance',
        recommendation: 'Restrict immediate access and dispatch licensed electrician urgently.',
        visualFindings: 'Sample record.',
        imageUnclear: false,
        confidence: 'High',
        needsHumanReview: true,
        potentialDuplicate: { isPotentialDuplicate: false, matchedReportId: '', reason: '' },
      },
      statusHistory: [{ status: 'Pending', timestamp: nowIso, note: 'Demo incident created.' }],
    },
  ];

  for (const item of sampleReports) {
    try {
      await setDoc(doc(db, 'reports', item.reportId), {
        reportId: item.reportId,
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        building: item.building,
        roomNumber: item.roomNumber,
        additionalInfo: 'Seeded demonstration record for competition preview.',
        imageUrl: '',
        priority: item.priority,
        status: item.status,
        studentId: adminProfile.uid,
        studentName: `${adminProfile.fullName} (Demo Seed)`,
        studentUniversityId: 'DEMO-SEED',
        assignedDepartment: item.assignedDepartment,
        assignedStaff: item.assignedStaff,
        aiAnalysis: item.aiAnalysis,
        adminComments: [],
        statusHistory: item.statusHistory,
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resolvedAt: item.resolved ? serverTimestamp() : null,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${item.reportId}`);
    }
  }

  return { reportsCreated: sampleReports.length };
}

export async function clearDemoReports(reports: CampusReport[]): Promise<number> {
  const demoItems = reports.filter((r) => r.isDemo);
  for (const item of demoItems) {
    try {
      await deleteDoc(doc(db, 'reports', item.reportId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${item.reportId}`);
    }
  }
  return demoItems.length;
}
