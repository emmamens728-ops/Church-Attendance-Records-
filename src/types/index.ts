export type Gender = 'Male' | 'Female';

export type AgeGroup = 'Children' | 'Youth' | 'Adult' | 'Elder';

export type Department =
  | 'Pastoral Board & Leadership'
  | 'Choir & Praise Team'
  | 'Ushers & Protocol'
  | 'Men of Power Fellowship'
  | 'Women of Grace Ministry'
  | 'Youth & Campus Ministry'
  | 'Children Sunday School'
  | 'Media & Sound Ministry'
  | 'Prayer Warriors & Intercessors'
  | 'Evangelism & Follow-up'
  | 'General Congregation';

export type MembershipStatus =
  | 'Active Member'
  | 'Visitor / First Timer'
  | 'Church Executive / Pastor'
  | 'Inactive';

export interface ChurchMember {
  id: string;
  memberId: string; // e.g. "HOP-MK-001"
  fullName: string;
  phone: string;
  email?: string;
  gender: Gender;
  ageGroup: AgeGroup;
  department: Department;
  residentialArea: string; // Mankessim community / neighborhood
  status: MembershipStatus;
  joinedDate: string;
  emergencyContact?: string;
  notes?: string;
  photoUrl?: string;
  isPendingSync?: boolean;
}

export interface ChurchService {
  id: string;
  name: string;
  dayOfWeek: string;
  defaultTime: string;
  description: string;
  theme?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceRecord {
  memberId: string;
  status: AttendanceStatus;
  timestamp?: string;
  markedBy?: string;
  notes?: string;
  isArchived?: boolean;
  archivedName?: string;
  archivedMemberId?: string;
}

export interface AttendanceSession {
  id: string; // composite key e.g. "srv-sunday_2026-10-18"
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceRecord>; // memberId -> AttendanceRecord
  headCountNote?: string;
  offeringNote?: string;
  isLocked?: boolean;
  isHistorical?: boolean;
  isRetiredService?: boolean;
  isPendingSync?: boolean;
  submittedAt?: string;
  submittedBy?: string;
  submissionStatus?: 'draft' | 'pending_submission' | 'submitting' | 'submitted' | 'failed';
  lastUpdated: string;
}

export type VoiceState = 'ready' | 'listening' | 'processing' | 'error' | 'unsupported';

export type UserRole = 'admin' | 'pastor' | 'usher' | 'guest';

// Navigation Pages in the Church Attendance Web Application
export type AppPage =
  | 'home'
  | 'admin-dashboard'
  | 'attendance-book'
  | 'register-member'
  | 'member-directory'
  | 'attendance-history'
  | 'reports'
  | 'settings'
  | 'login'
  | 'setup'
  | 'reset-password';

// Administrator User Profile
export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: 'admin';
  salt: string;
  passwordHash: string;
  recoveryHash: string; // Hashed recovery phrase for self-service password reset
  createdAt: string;
  lastLoginAt?: string;
}

// Client Active Authentication Session
export interface AuthSession {
  isAuthenticated: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    fullName: string;
    role: 'admin';
  };
  expiresAt?: number;
}

// Backward compatibility alias for legacy components
export interface UserSession {
  isLoggedIn: boolean;
  username: string;
  role: 'admin' | 'pastor' | 'usher' | 'guest';
  fullName: string;
}

// Homepage Customizable Images
export interface HomepageImageData {
  slot: 'image1' | 'image2';
  url: string; // Persistent URL or relative path
  dataUrl?: string; // base64 cached locally for offline display
  fileName?: string;
  fileSize?: number; // Size in bytes
  mimeType?: string; // image/jpeg, image/png, image/webp
  width?: number;
  height?: number;
  title?: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface HomepageImagesConfig {
  image1: HomepageImageData | null;
  image2: HomepageImageData | null;
}
