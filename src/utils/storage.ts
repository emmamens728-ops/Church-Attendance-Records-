import {
  ChurchMember,
  ChurchService,
  AttendanceSession,
  AuthSession,
  HomepageImageData,
  HomepageImagesConfig,
} from '../types';
import { INITIAL_MEMBERS, INITIAL_SERVICES, INITIAL_SESSIONS } from '../data/initialMembers';

const KEYS = {
  MEMBERS: 'hop_members_v1',
  SERVICES: 'hop_services_v1',
  SESSIONS: 'hop_attendance_sessions_v1',
  LOGO: 'hop_church_logo_custom',
  HOMEPAGE_IMAGES: 'hop_homepage_images_v1',
  AUTH_TOKEN: 'hop_session_token_v2',
  AUTH_USER: 'hop_session_user_v2',
  AUTH_EXPIRES: 'hop_session_expires_v2',
  IS_RESET: 'hop_system_is_reset_v1',
  AUDIT_LOGS: 'hop_audit_logs_v1',
  PENDING_MEMBERS: 'hop_pending_members_queue_v1',
  PENDING_ATTENDANCE: 'hop_pending_attendance_queue_v1',
};

// ---------------- AUTHENTICATION STORAGE ----------------

export const getStoredAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem(KEYS.AUTH_TOKEN);
    const expiresStr = localStorage.getItem(KEYS.AUTH_EXPIRES);
    if (!token || !expiresStr) return null;

    const expiresAt = parseInt(expiresStr, 10);
    if (Date.now() > expiresAt) {
      clearStoredAuthSession();
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const getStoredAuthUser = (): AuthSession['user'] | null => {
  try {
    const raw = localStorage.getItem(KEYS.AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveStoredAuthSession = (
  token: string,
  user: { id: string; username: string; email?: string; fullName: string; role: 'admin' },
  expiresAt: number
): void => {
  try {
    localStorage.setItem(KEYS.AUTH_TOKEN, token);
    localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
    localStorage.setItem(KEYS.AUTH_EXPIRES, expiresAt.toString());
  } catch (err) {
    console.error('Failed to save auth session', err);
  }
};

export const clearStoredAuthSession = (): void => {
  try {
    localStorage.removeItem(KEYS.AUTH_TOKEN);
    localStorage.removeItem(KEYS.AUTH_USER);
    localStorage.removeItem(KEYS.AUTH_EXPIRES);
  } catch (err) {
    console.error('Failed to clear auth session', err);
  }
};

export const checkIsAuthenticated = (): boolean => {
  return Boolean(getStoredAuthToken());
};

import defaultChurchLogo from '../assets/images/church_logo.jpg';
import defaultHomepageImage1 from '../assets/images/homepage_image1.jpg';
import defaultHomepageImage2 from '../assets/images/homepage_image2.jpg';

// ---------------- LOGO STORAGE (PROTECTED PERMANENT ASSET) ----------------

export const getStoredLogo = (): string => {
  return defaultChurchLogo;
};

export const saveStoredLogo = (_dataUrl: string): void => {
  console.warn('[PROTECTED ASSET] Official church logo is permanent and immutable.');
};

export const clearStoredLogo = (): void => {
  console.warn('[PROTECTED ASSET] Official church logo is permanent and cannot be cleared.');
};

// ---------------- HOMEPAGE IMAGES STORAGE (PROTECTED PERMANENT ASSETS) ----------------

const OFFICIAL_PROTECTED_HOMEPAGE_IMAGES: HomepageImagesConfig = {
  image1: {
    slot: 'image1',
    url: defaultHomepageImage1,
    title: 'Sanctuary & Worship Area',
    caption: 'Official Church Worship Center — House of Power of Ministry International Church, Mankessim',
  },
  image2: {
    slot: 'image2',
    url: defaultHomepageImage2,
    title: 'Church Ministries & Fellowship',
    caption: 'Holy Ghost Power, Divine Worship & Kingdom Fellowship in Mankessim',
  },
};

export const getStoredHomepageImages = (): HomepageImagesConfig => {
  try {
    const raw = localStorage.getItem(KEYS.HOMEPAGE_IMAGES);
    if (!raw) return OFFICIAL_PROTECTED_HOMEPAGE_IMAGES;
    const parsed = JSON.parse(raw);
    return {
      image1: parsed.image1 || OFFICIAL_PROTECTED_HOMEPAGE_IMAGES.image1,
      image2: parsed.image2 || OFFICIAL_PROTECTED_HOMEPAGE_IMAGES.image2,
    };
  } catch {
    return OFFICIAL_PROTECTED_HOMEPAGE_IMAGES;
  }
};

export const saveStoredHomepageImages = (images: HomepageImagesConfig): void => {
  try {
    localStorage.setItem(KEYS.HOMEPAGE_IMAGES, JSON.stringify(images));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_homepage_images_updated'));
    }
  } catch (err) {
    console.error('Failed to save homepage images to localStorage', err);
  }
};

export const fetchHomepageImagesFromServer = async (): Promise<HomepageImagesConfig> => {
  try {
    const res = await fetch('/api/church/homepage-images');
    if (!res.ok) return getStoredHomepageImages();
    const data = await res.json();
    if (data.homepageImages) {
      saveStoredHomepageImages(data.homepageImages);
      return data.homepageImages;
    }
    return getStoredHomepageImages();
  } catch {
    return getStoredHomepageImages();
  }
};

export const uploadHomepageImageToServer = async (
  slot: 'image1' | 'image2',
  dataUrl: string,
  metadata: {
    fileName: string;
    fileSize: number;
    width?: number;
    height?: number;
    title?: string;
    caption?: string;
  }
): Promise<HomepageImageData> => {
  const token = getStoredAuthToken();
  if (!token) {
    throw new Error('Administrator authentication required. Please log in.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(
      'A working internet connection to persistent storage is required to upload and save images permanently. Currently offline.'
    );
  }

  try {
    const res = await fetch('/api/church/homepage-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        slot,
        dataUrl,
        ...metadata,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to upload image to server.');
    }

    // Update local cache
    const current = getStoredHomepageImages();
    current[slot] = data.image;
    saveStoredHomepageImages(current);

    return data.image;
  } catch (err: any) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error(
        'Unable to connect to the persistent storage server. Please verify your connection and try again.'
      );
    }
    throw err;
  }
};

export const removeHomepageImageFromServer = async (slot: 'image1' | 'image2'): Promise<void> => {
  const token = getStoredAuthToken();
  if (!token) {
    throw new Error('Administrator authentication required. Please log in.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(
      'A working internet connection is required to remove images from persistent storage. Currently offline.'
    );
  }

  try {
    const res = await fetch(`/api/church/homepage-images/${slot}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to remove image from server.');
    }

    // Update local cache
    const current = getStoredHomepageImages();
    current[slot] = null;
    saveStoredHomepageImages(current);
  } catch (err: any) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error(
        'Unable to connect to the persistent storage server. Please verify your connection and try again.'
      );
    }
    throw err;
  }
};

// ---------------- MEMBERS STORAGE & DEDUPLICATION ----------------

export const deduplicateMemberList = (members: ChurchMember[]): ChurchMember[] => {
  if (!Array.isArray(members)) return [];
  const seenIds = new Set<string>();
  const seenMemberIds = new Set<string>();
  const result: ChurchMember[] = [];

  for (const m of members) {
    if (!m || !m.id) continue;
    const normMemberId = (m.memberId || '').trim().toUpperCase();
    if (seenIds.has(m.id) || (normMemberId && seenMemberIds.has(normMemberId))) {
      continue;
    }
    seenIds.add(m.id);
    if (normMemberId) seenMemberIds.add(normMemberId);
    result.push(m);
  }
  return result;
};

export const getMembers = (): ChurchMember[] => {
  try {
    const isReset = localStorage.getItem(KEYS.IS_RESET);
    const raw = localStorage.getItem(KEYS.MEMBERS);
    if (!raw) {
      if (isReset === 'true') {
        return [];
      }
      const dedup = deduplicateMemberList(INITIAL_MEMBERS);
      saveMembers(dedup);
      return dedup;
    }
    const parsed = JSON.parse(raw);
    return deduplicateMemberList(parsed);
  } catch {
    return [];
  }
};

export const saveMembers = (members: ChurchMember[]): void => {
  try {
    const dedup = deduplicateMemberList(members);
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(dedup));
    pushDataToServer();
  } catch (err) {
    console.error('Error saving members', err);
  }
};

export interface RegisterMemberResult {
  success: boolean;
  member?: ChurchMember;
  message: string;
  subMessage?: string;
  duplicateWarning?: boolean;
  existingMember?: ChurchMember;
  isOffline?: boolean;
}

export const registerMemberApi = async (
  newMember: ChurchMember,
  allowDuplicateName = false
): Promise<RegisterMemberResult> => {
  const localMembers = getMembers();
  const canonicalId = (newMember.memberId || '').trim().toUpperCase();
  const normName = (newMember.fullName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normPhone = (newMember.phone || '').replace(/\D/g, '');

  // 1. Check ID collision locally
  const localWithId = localMembers.find(
    (m) => m.memberId && m.memberId.toUpperCase() === canonicalId && m.id !== newMember.id
  );
  if (localWithId) {
    return {
      success: false,
      message: `Member ID "${canonicalId}" is already assigned to ${localWithId.fullName}.`,
    };
  }

  // 2. Check duplicate detection locally
  const localDuplicate = localMembers.find((m) => {
    if (m.id === newMember.id) return false;
    const existingNormName = (m.fullName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingPhone = (m.phone || '').replace(/\D/g, '');

    // Match by full name
    if (normName && existingNormName === normName) {
      return true;
    }
    // Match by contact phone number
    if (normPhone && normPhone.length >= 7 && existingPhone && normPhone === existingPhone) {
      return true;
    }
    return false;
  });

  if (localDuplicate && !allowDuplicateName) {
    const isPhoneMatch = Boolean(
      normPhone &&
      normPhone.length >= 7 &&
      (localDuplicate.phone || '').replace(/\D/g, '') === normPhone
    );
    const isNameMatch = Boolean(
      normName &&
      (localDuplicate.fullName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') === normName
    );
    const matchReason = isPhoneMatch && isNameMatch
      ? 'name and contact phone number'
      : isPhoneMatch
      ? 'contact phone number'
      : 'name';

    return {
      success: false,
      duplicateWarning: true,
      existingMember: localDuplicate,
      message: 'POSSIBLE DUPLICATE MEMBER',
      subMessage: `A member with that ${matchReason} already exists in the database (${localDuplicate.fullName}, ID: ${localDuplicate.memberId}). Please verify before proceeding.`,
    };
  }

  // 3. Offline handling: store in pending sync queue
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const updatedMember: ChurchMember = { ...newMember, isPendingSync: true as any };
    const updatedList = deduplicateMemberList([updatedMember, ...localMembers]);
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(updatedList));

    const pendingRaw = localStorage.getItem(KEYS.PENDING_MEMBERS);
    const queue: ChurchMember[] = pendingRaw ? JSON.parse(pendingRaw) : [];
    const filteredQueue = queue.filter(
      (m) => m.memberId?.toUpperCase() !== canonicalId && m.id !== updatedMember.id
    );
    filteredQueue.push(updatedMember);
    localStorage.setItem(KEYS.PENDING_MEMBERS, JSON.stringify(filteredQueue));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_members_updated'));
    }

    return {
      success: true,
      isOffline: true,
      member: updatedMember,
      message: 'MEMBER SAVED LOCALLY (OFFLINE)',
      subMessage: 'Network is offline. Your member record is saved locally as PENDING SYNC and will automatically submit to the central database when connection returns.',
    };
  }

  // 4. Online registration via dedicated server endpoint
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/church/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ member: newMember, allowDuplicateName }),
    });

    const data = await res.json();

    if (res.status === 409 && data.error === 'PossibleDuplicate') {
      return {
        success: false,
        duplicateWarning: true,
        existingMember: data.existingMember,
        message: 'POSSIBLE DUPLICATE MEMBER',
        subMessage: 'This member may already be registered. Please check the existing record before continuing.',
      };
    }

    if (res.status === 409 && data.error === 'DuplicateMemberId') {
      return {
        success: false,
        message: data.message || `Member ID "${canonicalId}" is already registered.`,
      };
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to register member on server.');
    }

    // Success confirmed by server database!
    const savedMember = data.member;
    const currentList = getMembers();
    const updatedList = deduplicateMemberList([savedMember, ...currentList]);
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(updatedList));

    // Remove from pending queue if present
    const pendingRaw = localStorage.getItem(KEYS.PENDING_MEMBERS);
    if (pendingRaw) {
      const queue: ChurchMember[] = JSON.parse(pendingRaw);
      const filtered = queue.filter(
        (m) => m.memberId?.toUpperCase() !== canonicalId && m.id !== savedMember.id
      );
      localStorage.setItem(KEYS.PENDING_MEMBERS, JSON.stringify(filtered));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_members_updated'));
    }

    return {
      success: true,
      member: savedMember,
      message: 'MEMBER REGISTERED SUCCESSFULLY!',
      subMessage: 'Your member has been registered and saved successfully.',
    };
  } catch (err: any) {
    if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
      const updatedMember: ChurchMember = { ...newMember, isPendingSync: true as any };
      const updatedList = deduplicateMemberList([updatedMember, ...localMembers]);
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(updatedList));

      const pendingRaw = localStorage.getItem(KEYS.PENDING_MEMBERS);
      const queue: ChurchMember[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      queue.push(updatedMember);
      localStorage.setItem(KEYS.PENDING_MEMBERS, JSON.stringify(queue));

      return {
        success: true,
        isOffline: true,
        member: updatedMember,
        message: 'MEMBER SAVED LOCALLY (PENDING SYNC)',
        subMessage: 'Server could not be reached. Member is safely stored locally and will synchronize once reconnected.',
      };
    }

    return {
      success: false,
      message: err.message || 'An unexpected error occurred while saving the member.',
    };
  }
};

// ---------------- SERVICES STORAGE ----------------

export const getServices = (): ChurchService[] => {
  try {
    const raw = localStorage.getItem(KEYS.SERVICES);
    if (!raw) {
      saveServices(INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    const parsed = JSON.parse(raw);
    // SECTION 2: Automatically migrate any stored services array to Sunday Service exclusively
    if (!Array.isArray(parsed) || parsed.length !== 1 || parsed[0].id !== 'srv-sunday') {
      saveServices(INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    return parsed;
  } catch {
    return INITIAL_SERVICES;
  }
};

export const saveServices = (services: ChurchService[]): void => {
  try {
    // SECTION 2: Ensure only Sunday Service is saved
    const normalized = services.length === 1 && services[0].id === 'srv-sunday'
      ? services
      : INITIAL_SERVICES;
    localStorage.setItem(KEYS.SERVICES, JSON.stringify(normalized));
    pushDataToServer();
  } catch (err) {
    console.error('Error saving services', err);
  }
};

// ---------------- ADMINISTRATOR SECURITY HELPERS ----------------

export const changeAdminEmail = async (
  currentPassword: string,
  newEmail: string
): Promise<{ success: boolean; message: string; user?: any }> => {
  const token = getStoredAuthToken();
  if (!token) throw new Error('Administrator authentication required. Please log in.');

  const res = await fetch('/api/auth/change-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newEmail }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update administrator email.');
  }

  if (data.user) {
    const expiresStr = localStorage.getItem(KEYS.AUTH_EXPIRES) || `${Date.now() + 8 * 3600 * 1000}`;
    saveStoredAuthSession(token, data.user, parseInt(expiresStr, 10));
  }

  return data;
};

export const changeAdminUsername = async (
  currentPassword: string,
  newUsername: string
): Promise<{ success: boolean; message: string; user?: any }> => {
  const token = getStoredAuthToken();
  if (!token) throw new Error('Administrator authentication required. Please log in.');

  const res = await fetch('/api/auth/change-username', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newUsername }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update administrator username.');
  }

  if (data.user) {
    const expiresStr = localStorage.getItem(KEYS.AUTH_EXPIRES) || `${Date.now() + 8 * 3600 * 1000}`;
    saveStoredAuthSession(token, data.user, parseInt(expiresStr, 10));
  }

  return data;
};

export const changeAdminPassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  recoveryKey?: string
): Promise<{ success: boolean; message: string }> => {
  const token = getStoredAuthToken();
  if (!token) throw new Error('Administrator authentication required. Please log in.');

  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword, recoveryKey }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update administrator password.');
  }

  return data;
};

// ---------------- ATTENDANCE SESSIONS STORAGE ----------------

export const getSessions = (): Record<string, AttendanceSession> => {
  try {
    const isReset = localStorage.getItem(KEYS.IS_RESET);
    const raw = localStorage.getItem(KEYS.SESSIONS);
    if (!raw) {
      if (isReset === 'true') {
        return {};
      }
      const initialMap: Record<string, AttendanceSession> = {};
      INITIAL_SESSIONS.forEach((s) => {
        initialMap[s.id] = s;
      });
      saveSessions(initialMap);
      return initialMap;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveSessions = (sessions: Record<string, AttendanceSession>): void => {
  try {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    pushDataToServer();
  } catch (err) {
    console.error('Error saving sessions', err);
  }
};

export interface SubmitAttendanceResult {
  success: boolean;
  session?: AttendanceSession;
  message: string;
  subMessage?: string;
  isOffline?: boolean;
}

export const submitAttendanceApi = async (
  session: AttendanceSession
): Promise<SubmitAttendanceResult> => {
  const localSessions = getSessions();
  const canonicalSessionId = `${session.serviceId || 'srv-sunday'}_${session.date}`;

  // 1. Offline Mode: save locally as PENDING SUBMISSION
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const pendingSession: AttendanceSession = {
      ...session,
      id: canonicalSessionId,
      serviceName: 'Sunday Service',
      isPendingSync: true,
      submissionStatus: 'pending_submission',
      submittedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    localSessions[canonicalSessionId] = pendingSession;
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(localSessions));

    // Save to pending queue
    const queueRaw = localStorage.getItem(KEYS.PENDING_ATTENDANCE);
    const queue: AttendanceSession[] = queueRaw ? JSON.parse(queueRaw) : [];
    const filteredQueue = queue.filter((s) => s.id !== canonicalSessionId);
    filteredQueue.push(pendingSession);
    localStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(filteredQueue));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_attendance_updated'));
    }

    return {
      success: true,
      isOffline: true,
      session: pendingSession,
      message: 'SAVED LOCALLY — PENDING SUBMISSION',
      subMessage: 'Network is offline. Your Sunday Service attendance records are safely stored locally as PENDING SUBMISSION and will automatically submit to the central database when your internet connection is restored.',
    };
  }

  // 2. Online Mode: Submit via dedicated backend endpoint
  const token = getStoredAuthToken();
  try {
    const res = await fetch('/api/church/attendance/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ session }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to submit attendance to database.');
    }

    const savedSession: AttendanceSession = data.session || {
      ...session,
      id: canonicalSessionId,
      serviceName: 'Sunday Service',
      isPendingSync: false,
      submissionStatus: 'submitted',
      submittedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    localSessions[canonicalSessionId] = savedSession;
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(localSessions));

    // Clean up from pending queue
    const queueRaw = localStorage.getItem(KEYS.PENDING_ATTENDANCE);
    if (queueRaw) {
      const queue: AttendanceSession[] = JSON.parse(queueRaw);
      const filtered = queue.filter((s) => s.id !== canonicalSessionId);
      localStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(filtered));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_attendance_updated'));
    }

    return {
      success: true,
      session: savedSession,
      message: 'ATTENDANCE SUBMITTED SUCCESSFULLY!',
      subMessage: 'Your Sunday Service attendance records have been saved and are available in the Admin Portal.',
    };
  } catch (err: any) {
    if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
      const pendingSession: AttendanceSession = {
        ...session,
        id: canonicalSessionId,
        serviceName: 'Sunday Service',
        isPendingSync: true,
        submissionStatus: 'pending_submission',
        submittedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      localSessions[canonicalSessionId] = pendingSession;
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(localSessions));

      const queueRaw = localStorage.getItem(KEYS.PENDING_ATTENDANCE);
      const queue: AttendanceSession[] = queueRaw ? JSON.parse(queueRaw) : [];
      const filteredQueue = queue.filter((s) => s.id !== canonicalSessionId);
      filteredQueue.push(pendingSession);
      localStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(filteredQueue));

      return {
        success: true,
        isOffline: true,
        session: pendingSession,
        message: 'ATTENDANCE SAVED LOCALLY — PENDING SYNC',
        subMessage: 'Could not connect to the database server. Attendance is safely stored locally and will synchronize once reconnected.',
      };
    }

    return {
      success: false,
      message: err.message || 'Submission failed. Your marked entries have been preserved so you can retry.',
    };
  }
};

// ---------------- BACKGROUND OFFLINE SYNCHRONIZATION ----------------

export const syncPendingOfflineData = async (): Promise<{ membersSynced: number; attendanceSynced: number }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { membersSynced: 0, attendanceSynced: 0 };
  }

  let membersSynced = 0;
  let attendanceSynced = 0;

  // 1. Sync pending members
  try {
    const rawMembers = localStorage.getItem(KEYS.PENDING_MEMBERS);
    if (rawMembers) {
      const queue: ChurchMember[] = JSON.parse(rawMembers);
      if (queue.length > 0) {
        const remaining: ChurchMember[] = [];
        for (const m of queue) {
          try {
            const res = await registerMemberApi(m, true);
            if (res.success && !res.isOffline) {
              membersSynced++;
            } else {
              remaining.push(m);
            }
          } catch {
            remaining.push(m);
          }
        }
        localStorage.setItem(KEYS.PENDING_MEMBERS, JSON.stringify(remaining));
      }
    }
  } catch (err) {
    console.error('Error syncing pending members', err);
  }

  // 2. Sync pending attendance
  try {
    const rawAttendance = localStorage.getItem(KEYS.PENDING_ATTENDANCE);
    if (rawAttendance) {
      const queue: AttendanceSession[] = JSON.parse(rawAttendance);
      if (queue.length > 0) {
        const remaining: AttendanceSession[] = [];
        for (const s of queue) {
          try {
            const res = await submitAttendanceApi(s);
            if (res.success && !res.isOffline) {
              attendanceSynced++;
            } else {
              remaining.push(s);
            }
          } catch {
            remaining.push(s);
          }
        }
        localStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(remaining));
      }
    }
  } catch (err) {
    console.error('Error syncing pending attendance', err);
  }

  return { membersSynced, attendanceSynced };
};

// Set up online event listener to trigger synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingOfflineData().then(({ membersSynced, attendanceSynced }) => {
      if (membersSynced > 0 || attendanceSynced > 0) {
        console.log(`[ONLINE_SYNC] Synced ${membersSynced} member(s) and ${attendanceSynced} attendance session(s).`);
      }
    });
  });
}

// ---------------- SERVER SYNCHRONIZATION ----------------

export const pushDataToServer = async (): Promise<boolean> => {
  const token = getStoredAuthToken();
  if (!token) return false;

  try {
    const payload = {
      members: getMembers(),
      services: getServices(),
      attendanceSessions: getSessions(),
      customLogo: getStoredLogo(),
      homepageImages: getStoredHomepageImages(),
    };

    const res = await fetch('/api/church/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch {
    // Offline mode: silently keep local cache safe
    return false;
  }
};

export const pullDataFromServer = async (): Promise<boolean> => {
  const token = getStoredAuthToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/church/data', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return false;
    const data = await res.json();

    if (Array.isArray(data.members)) {
      const dedup = deduplicateMemberList(data.members);
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(dedup));
    }
    if (Array.isArray(data.services)) {
      localStorage.setItem(KEYS.SERVICES, JSON.stringify(data.services));
    }
    if (data.attendanceSessions && typeof data.attendanceSessions === 'object') {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(data.attendanceSessions));
    }
    if (data.customLogo) {
      localStorage.setItem(KEYS.LOGO, data.customLogo);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hop_logo_updated'));
      }
    }
    if (data.homepageImages && typeof data.homepageImages === 'object') {
      saveStoredHomepageImages(data.homepageImages);
    }
    return true;
  } catch {
    return false;
  }
};

// ---------------- BACKUP EXPORT & IMPORT ----------------

export const exportDatabaseBackup = (): string => {
  const data = {
    appName: 'HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH, MANKESSIM',
    exportedAt: new Date().toISOString(),
    members: getMembers(),
    services: getServices(),
    sessions: getSessions(),
    customLogo: getStoredLogo(),
    homepageImages: getStoredHomepageImages(),
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabaseBackup = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed.members)) {
      saveMembers(parsed.members);
    }
    if (Array.isArray(parsed.services)) {
      saveServices(parsed.services);
    }
    if (parsed.sessions && typeof parsed.sessions === 'object') {
      saveSessions(parsed.sessions);
    }
    if (parsed.customLogo) {
      saveStoredLogo(parsed.customLogo);
    }
    if (parsed.homepageImages && typeof parsed.homepageImages === 'object') {
      saveStoredHomepageImages(parsed.homepageImages);
    }
    return true;
  } catch (err) {
    console.error('Failed to import database backup', err);
    return false;
  }
};

// ---------------- SYSTEM RESET OPERATIONAL DATA ----------------

export const clearLocalChurchOperationalData = (): void => {
  try {
    localStorage.setItem(KEYS.IS_RESET, 'true');
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify({}));
    // Clear any temporary search queries and cached report filters
    sessionStorage.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('hop_data_reset'));
    }
  } catch (err) {
    console.error('Failed to clear local operational data', err);
  }
};

export interface SystemResetResult {
  success: boolean;
  message: string;
  notice?: string;
  deletedMembersCount?: number;
  deletedSessionsCount?: number;
  auditEvent?: any;
}

export const executeServerSystemReset = async (
  password: string,
  confirmationPhrase: string
): Promise<SystemResetResult> => {
  const token = getStoredAuthToken();
  if (!token) {
    throw new Error('Administrator authentication session is missing or expired. Please log in.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(
      'A secure online connection is required to complete the system reset. Please connect to the internet before resetting.'
    );
  }

  try {
    const res = await fetch('/api/church/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password, confirmationPhrase }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'System reset failed on the server.');
    }

    // Clear local operational data and cached records immediately
    clearLocalChurchOperationalData();

    if (data.auditEvent) {
      saveLocalAuditLog(data.auditEvent);
    }

    return data;
  } catch (err: any) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error(
        'Unable to communicate with the server. A secure online connection is required to complete the system reset.'
      );
    }
    throw err;
  }
};

// ---------------- AUDIT LOGS STORAGE ----------------

export const fetchAuditLogs = async (): Promise<any[]> => {
  const token = getStoredAuthToken();
  if (!token) return getLocalAuditLogs();

  try {
    const res = await fetch('/api/church/audit-logs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return getLocalAuditLogs();
    const data = await res.json();
    if (Array.isArray(data.auditLogs)) {
      localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(data.auditLogs));
      return data.auditLogs;
    }
    return getLocalAuditLogs();
  } catch {
    return getLocalAuditLogs();
  }
};

export const getLocalAuditLogs = (): any[] => {
  try {
    const raw = localStorage.getItem(KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalAuditLog = (entry: any): void => {
  try {
    const list = getLocalAuditLogs();
    const updated = [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, 50);
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save local audit log', err);
  }
};
