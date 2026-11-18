export const ISSUE_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Internet / Wi-Fi',
  'Furniture',
  'Cleaning',
  'Laboratory Equipment',
  'Infrastructure',
  'Safety',
  'Other',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_STATUSES = [
  'Pending',
  'Under Review',
  'In Progress',
  'Resolved',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const STAFF_AVAILABILITIES = ['Available', 'Busy', 'Off Duty'] as const;
export type StaffAvailability = (typeof STAFF_AVAILABILITIES)[number];

export type UserRole = 'student' | 'admin';

export const CAMPUS_BUILDINGS = [
  'Engineering Hall (Building A)',
  'Science & Labs Complex (Building B)',
  'Central University Library',
  'Student Union & Commons',
  'Lecture Theater Block C',
  'North Residence Hall',
  'Innovation & Computing Center',
  'Sports & Recreation Pavilion',
] as const;

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  studentId: string;
  role: UserRole;
  createdAt: Date | null;
}

export interface AIAnalysisResult {
  category: IssueCategory;
  priority: IssuePriority;
  priorityReason: string;
  summary: string;
  description: string;
  department: string;
  recommendation: string;
  visualFindings: string;
  imageUnclear: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  needsHumanReview: boolean;
  potentialDuplicate: {
    isPotentialDuplicate: boolean;
    matchedReportId: string;
    reason: string;
  };
  analyzedAt?: string;
}

export interface AdminComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  status: IssueStatus;
  timestamp: string;
  note: string;
}

export interface CampusReport {
  reportId: string;
  title: string;
  description: string;
  category: IssueCategory;
  location: string;
  building: string;
  roomNumber: string;
  additionalInfo: string;
  imageUrl: string;
  priority: IssuePriority;
  status: IssueStatus;
  studentId: string;
  studentName: string;
  studentUniversityId: string;
  assignedDepartment: string;
  assignedStaff: string;
  aiAnalysis: AIAnalysisResult | null;
  adminComments: AdminComment[];
  statusHistory: StatusHistoryEntry[];
  isDemo: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  resolvedAt: Date | null;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  reportId: string;
  message: string;
  type: 'submitted' | 'status_change' | 'comment' | 'assignment' | 'system';
  isRead: boolean;
  createdAt: Date | null;
}

export interface MaintenanceDepartment {
  departmentId: string;
  departmentName: string;
  description: string;
  createdAt: Date | null;
}

export interface StaffMember {
  staffId: string;
  fullName: string;
  email: string;
  departmentId: string;
  departmentName: string;
  availability: StaffAvailability;
  createdAt: Date | null;
}

export interface IntelligenceReport {
  executiveSummary: string;
  observations: Array<{
    title: string;
    detail: string;
    focusArea: string;
  }>;
  recommendedActions: string[];
  generatedAt: string;
}
