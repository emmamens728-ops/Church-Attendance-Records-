import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { INITIAL_MEMBERS, INITIAL_SERVICES, INITIAL_SESSIONS } from './src/data/initialMembers';

const PORT = 3000;
const DATA_DIR = path.resolve(import.meta.dirname || '.', 'data');
const DB_FILE = path.resolve(DATA_DIR, 'church-store.json');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');

// Interface for server persistent database
interface ServerDatabase {
  adminUser: {
    id: string;
    username: string;
    email?: string;
    fullName: string;
    role: 'admin';
    salt: string;
    passwordHash: string;
    recoveryHash: string;
    createdAt: string;
    lastLoginAt?: string;
  } | null;
  activeSessions: Record<string, { userId: string; username: string; expiresAt: number }>;
  members: any[];
  services: any[];
  attendanceSessions: Record<string, any>;
  customLogo: string | null;
  homepageImages?: {
    image1: any | null;
    image2: any | null;
  };
  deletedMemberIds?: string[];
  auditLogs?: any[];
}

// Ensure database directory and file exists
function loadDatabase(): ServerDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialSessionMap: Record<string, any> = {};
    INITIAL_SESSIONS.forEach((s) => {
      initialSessionMap[s.id] = s;
    });

    const initialDb: ServerDatabase = {
      adminUser: null, // No default admin password exists! User sets up on first run.
      activeSessions: {},
      members: INITIAL_MEMBERS,
      services: INITIAL_SERVICES,
      attendanceSessions: initialSessionMap,
      customLogo: null,
      homepageImages: {
        image1: null,
        image2: null,
      },
      auditLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.homepageImages) {
      parsed.homepageImages = { image1: null, image2: null };
    }
    // SECTION 2: Normalize active services to Sunday Service exclusively
    if (!parsed.services || parsed.services.length !== 1 || parsed.services[0].id !== 'srv-sunday') {
      parsed.services = INITIAL_SERVICES;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    // Ensure member records are strictly deduplicated by memberId and id
    if (Array.isArray(parsed.members)) {
      const seenIds = new Set<string>();
      const seenMemberIds = new Set<string>();
      const uniqueMembers: any[] = [];
      let deduplicatedCount = 0;
      for (const m of parsed.members) {
        if (!m || !m.id) continue;
        const normMemberId = (m.memberId || '').trim().toUpperCase();
        if (seenIds.has(m.id) || (normMemberId && seenMemberIds.has(normMemberId))) {
          deduplicatedCount++;
          continue;
        }
        seenIds.add(m.id);
        if (normMemberId) seenMemberIds.add(normMemberId);
        uniqueMembers.push(m);
      }
      if (deduplicatedCount > 0) {
        parsed.members = uniqueMembers;
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log(`[STARTUP] Cleaned up ${deduplicatedCount} duplicate member record(s).`);
      }
    }
    return parsed;
  } catch (err) {
    console.error('Error reading church-store.json, creating fallback', err);
    return {
      adminUser: null,
      activeSessions: {},
      members: INITIAL_MEMBERS,
      services: INITIAL_SERVICES,
      attendanceSessions: {},
      customLogo: null,
      homepageImages: {
        image1: null,
        image2: null,
      },
    };
  }
}

function saveDatabase(db: ServerDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving church-store.json', err);
  }
}

// Server-side password hashing with PBKDF2 + SHA-512 + 100,000 iterations
function serverHashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateSecureSalt(): string {
  return crypto.randomBytes(24).toString('hex');
}

function generateToken(): string {
  return `hopmic_adm_${Date.now()}_${crypto.randomBytes(32).toString('hex')}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Static serving for persistent uploaded images and PWA public assets
  app.use('/api/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));
  app.use(express.static(path.resolve(import.meta.dirname || '.', 'public')));

  const db = loadDatabase();

  // Authentication Middleware: Verifies session token on protected endpoints
  const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Administrator authentication required to access this resource.',
      });
    }

    const token = authHeader.split(' ')[1];
    const session = db.activeSessions[token];

    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired administrator session. Please log in again.',
      });
    }

    if (Date.now() > session.expiresAt) {
      delete db.activeSessions[token];
      saveDatabase(db);
      return res.status(401).json({
        error: 'SessionExpired',
        message: 'Administrator session has expired. Please log in again.',
      });
    }

    // Refresh expiry window on active use
    session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    (req as any).adminUser = session;
    next();
  };

  // 1. Check if admin setup is complete
  app.get('/api/auth/status', (req: Request, res: Response) => {
    res.json({
      isSetupComplete: Boolean(db.adminUser),
      adminUsername: db.adminUser ? db.adminUser.username : null,
      churchName: 'HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH',
      location: 'MANKESSIM',
    });
  });

  // 2. Initial Administrator Account Setup (Locked once created)
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (db.adminUser) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Administrator account has already been initialized. Setup is permanently locked.',
      });
    }

    const { username, email, fullName, password, recoveryKey } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (!recoveryKey || typeof recoveryKey !== 'string' || recoveryKey.trim().length < 4) {
      return res.status(400).json({ error: 'A recovery secret key (at least 4 characters) is required for password resets.' });
    }

    const salt = generateSecureSalt();
    const passwordHash = serverHashPassword(password, salt);
    const recoveryHash = serverHashPassword(recoveryKey.trim().toLowerCase(), salt);

    const adminUser = {
      id: `adm-${Date.now()}`,
      username: username.trim().toLowerCase(),
      email: email ? email.trim().toLowerCase() : undefined,
      fullName: fullName && fullName.trim() ? fullName.trim() : 'Presiding Administrator',
      role: 'admin' as const,
      salt,
      passwordHash,
      recoveryHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };

    db.adminUser = adminUser;
    saveDatabase(db);

    console.log(`[AUTH] Administrator account successfully created: ${adminUser.username}`);

    res.status(201).json({
      success: true,
      message: 'Administrator account created successfully. Please log in with your credentials.',
    });
  });

  // 3. Administrator Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({
        error: 'NotInitialized',
        message: 'No administrator account has been set up yet. Please complete initial setup first.',
      });
    }

    const { identifier, password } = req.body; // username or email

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isUsernameMatch = db.adminUser.username.toLowerCase() === cleanIdentifier;
    const isEmailMatch = db.adminUser.email && db.adminUser.email.toLowerCase() === cleanIdentifier;

    if (!isUsernameMatch && !isEmailMatch) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    // Verify password hash with stored salt
    const attemptHash = serverHashPassword(password, db.adminUser.salt);
    if (attemptHash !== db.adminUser.passwordHash) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    // Generate secure 8-hour session token
    const token = generateToken();
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

    db.activeSessions[token] = {
      userId: db.adminUser.id,
      username: db.adminUser.username,
      expiresAt,
    };

    db.adminUser.lastLoginAt = new Date().toISOString();
    saveDatabase(db);

    res.json({
      success: true,
      token,
      expiresAt,
      user: {
        id: db.adminUser.id,
        username: db.adminUser.username,
        email: db.adminUser.email,
        fullName: db.adminUser.fullName,
        role: 'admin',
      },
    });
  });

  // 4. Verify Active Session Token
  app.get('/api/auth/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const session = db.activeSessions[token];

    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        delete db.activeSessions[token];
        saveDatabase(db);
      }
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      user: {
        id: db.adminUser?.id,
        username: db.adminUser?.username,
        email: db.adminUser?.email,
        fullName: db.adminUser?.fullName,
        role: 'admin',
      },
      expiresAt: session.expiresAt,
    });
  });

  // 5. Administrator Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      delete db.activeSessions[token];
      saveDatabase(db);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // 6. Administrator Password Reset / Recovery
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    const { identifier, recoveryKey, newPassword } = req.body;

    if (!identifier || !recoveryKey || !newPassword) {
      return res.status(400).json({ error: 'Identifier, recovery key, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isMatch =
      db.adminUser.username.toLowerCase() === cleanIdentifier ||
      (db.adminUser.email && db.adminUser.email.toLowerCase() === cleanIdentifier);

    if (!isMatch) {
      return res.status(401).json({ error: 'Account not found with provided username or email.' });
    }

    const attemptRecoveryHash = serverHashPassword(recoveryKey.trim().toLowerCase(), db.adminUser.salt);
    if (attemptRecoveryHash !== db.adminUser.recoveryHash) {
      return res.status(401).json({ error: 'Invalid recovery key. Password reset denied.' });
    }

    // Update password with new salt and hash
    const newSalt = generateSecureSalt();
    db.adminUser.salt = newSalt;
    db.adminUser.passwordHash = serverHashPassword(newPassword, newSalt);
    db.adminUser.recoveryHash = serverHashPassword(recoveryKey.trim().toLowerCase(), newSalt);

    // Invalidate all active sessions for security
    db.activeSessions = {};
    saveDatabase(db);

    console.log(`[AUTH] Password reset successfully for admin: ${db.adminUser.username}`);

    res.json({
      success: true,
      message: 'Password successfully reset. Please log in with your new password.',
    });
  });

  // 6a. Change Administrator Email (Protected, requires password re-authentication)
  app.post('/api/auth/change-email', requireAdminAuth, (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    const { currentPassword, newEmail } = req.body;

    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({ error: 'New email address is required.' });
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email format. Please provide a valid email address.' });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Administrator password is required to authorize email change.' });
    }

    const attemptHash = serverHashPassword(currentPassword, db.adminUser.salt);
    if (attemptHash !== db.adminUser.passwordHash) {
      return res.status(401).json({ error: 'Incorrect administrator password. Email change rejected.' });
    }

    if (db.adminUser.email && db.adminUser.email.toLowerCase() === cleanEmail) {
      return res.status(400).json({ error: 'The new email address is identical to the current email address.' });
    }

    const oldEmail = db.adminUser.email || 'None';
    db.adminUser.email = cleanEmail;

    // Record audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'ADMIN_EMAIL_CHANGE',
      adminId: db.adminUser.id,
      adminUsername: db.adminUser.username,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Administrator email address updated from "${oldEmail}" to "${cleanEmail}".`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[AUTH] Admin email updated for ${db.adminUser.username} to ${cleanEmail}`);

    res.json({
      success: true,
      message: `Administrator email address updated successfully to "${cleanEmail}".`,
      user: {
        id: db.adminUser.id,
        username: db.adminUser.username,
        email: db.adminUser.email,
        fullName: db.adminUser.fullName,
        role: 'admin',
      },
    });
  });

  // 6b. Change Administrator Username (Protected, requires password re-authentication)
  app.post('/api/auth/change-username', requireAdminAuth, (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    const { currentPassword, newUsername } = req.body;

    if (!newUsername || typeof newUsername !== 'string') {
      return res.status(400).json({ error: 'New username is required.' });
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters in length.' });
    }

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, hyphens, and underscores.' });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Administrator password is required to authorize username change.' });
    }

    const attemptHash = serverHashPassword(currentPassword, db.adminUser.salt);
    if (attemptHash !== db.adminUser.passwordHash) {
      return res.status(401).json({ error: 'Incorrect administrator password. Username change rejected.' });
    }

    if (db.adminUser.username.toLowerCase() === cleanUsername) {
      return res.status(400).json({ error: 'The new username is identical to the current username.' });
    }

    const oldUsername = db.adminUser.username;
    db.adminUser.username = cleanUsername;

    // Update active session usernames for this admin
    if (db.activeSessions) {
      for (const token of Object.keys(db.activeSessions)) {
        if (db.activeSessions[token].userId === db.adminUser.id) {
          db.activeSessions[token].username = cleanUsername;
        }
      }
    }

    // Record audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'ADMIN_USERNAME_CHANGE',
      adminId: db.adminUser.id,
      adminUsername: cleanUsername,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Administrator username updated from "${oldUsername}" to "${cleanUsername}". Internal account ID preserved.`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[AUTH] Admin username updated from ${oldUsername} to ${cleanUsername}`);

    res.json({
      success: true,
      message: `Administrator username updated to "${cleanUsername}" successfully.`,
      user: {
        id: db.adminUser.id,
        username: db.adminUser.username,
        email: db.adminUser.email,
        fullName: db.adminUser.fullName,
        role: 'admin',
      },
    });
  });

  // 6c. Change Administrator Password (Protected, requires current password re-authentication)
  app.post('/api/auth/change-password', requireAdminAuth, (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    const { currentPassword, newPassword, confirmPassword, recoveryKey } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Current administrator password is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }

    const attemptHash = serverHashPassword(currentPassword, db.adminUser.salt);
    if (attemptHash !== db.adminUser.passwordHash) {
      return res.status(401).json({ error: 'Incorrect current password. Password change denied.' });
    }

    // Generate new salt and update hash
    const newSalt = generateSecureSalt();
    const oldSalt = db.adminUser.salt;
    db.adminUser.salt = newSalt;
    db.adminUser.passwordHash = serverHashPassword(newPassword, newSalt);

    // If recoveryKey passed, update recoveryHash with new salt
    if (recoveryKey && typeof recoveryKey === 'string' && recoveryKey.trim()) {
      db.adminUser.recoveryHash = serverHashPassword(recoveryKey.trim().toLowerCase(), newSalt);
    } else {
      (db.adminUser as any).recoverySalt = (db.adminUser as any).recoverySalt || oldSalt;
    }

    // Record audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'ADMIN_PASSWORD_CHANGE',
      adminId: db.adminUser.id,
      adminUsername: db.adminUser.username,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: 'Administrator password changed with new PBKDF2 salt and hash verification.',
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[AUTH] Password changed successfully for admin: ${db.adminUser.username}`);

    res.json({
      success: true,
      message: 'Administrator password updated successfully.',
    });
  });

  // 7. Protected Church Data Endpoints (ADMINISTRATOR ONLY)
  app.get('/api/church/data', requireAdminAuth, (req: Request, res: Response) => {
    res.json({
      members: db.members,
      services: db.services,
      attendanceSessions: db.attendanceSessions,
      customLogo: db.customLogo,
      homepageImages: db.homepageImages || { image1: null, image2: null },
      totalMembers: db.members.length,
    });
  });

  app.post('/api/church/data', requireAdminAuth, (req: Request, res: Response) => {
    const { members, services, attendanceSessions, customLogo, homepageImages } = req.body;

    if (Array.isArray(members)) {
      // Filter out any members that were previously permanently deleted
      const deletedSet = new Set(db.deletedMemberIds || []);
      // Enforce strict deduplication by ID and canonical memberId
      const seenIds = new Set<string>();
      const seenMemberIds = new Set<string>();
      const deduplicated: any[] = [];
      for (const m of members) {
        if (!m || !m.id || deletedSet.has(m.id)) continue;
        const normMemberId = (m.memberId || '').trim().toUpperCase();
        if (seenIds.has(m.id) || (normMemberId && seenMemberIds.has(normMemberId))) {
          continue;
        }
        seenIds.add(m.id);
        if (normMemberId) seenMemberIds.add(normMemberId);
        deduplicated.push(m);
      }
      db.members = deduplicated;
    }
    if (Array.isArray(services)) {
      // SECTION 2: Only Sunday Service is active in the active services configuration
      db.services = INITIAL_SERVICES;
    }
    if (attendanceSessions && typeof attendanceSessions === 'object') {
      const merged = { ...db.attendanceSessions };
      for (const sId of Object.keys(attendanceSessions)) {
        const incoming = attendanceSessions[sId];
        if (incoming) {
          if (incoming.serviceId !== 'srv-sunday') {
            incoming.isHistorical = true;
            incoming.isRetiredService = true;
          }
          merged[sId] = incoming;
        }
      }
      db.attendanceSessions = merged;
    }
    // Strictly protect official church branding and showcase images from client modifications
    if (customLogo !== undefined && customLogo !== db.customLogo) {
      console.log('[BRANDING PROTECTION] Prevented attempt to alter official church logo via sync endpoint.');
    }
    if (homepageImages !== undefined && typeof homepageImages === 'object') {
      console.log('[BRANDING PROTECTION] Prevented attempt to alter protected homepage images via sync endpoint.');
    }

    saveDatabase(db);
    res.json({ success: true, message: 'Church database synchronized successfully.', members: db.members });
  });

  // 7a. Secure Dedicated Member Registration Endpoint with Duplicate Detection
  app.post('/api/church/members', requireAdminAuth, (req: Request, res: Response) => {
    const { member, allowDuplicateName } = req.body;

    if (!member || typeof member !== 'object') {
      return res.status(400).json({ error: 'InvalidMemberData', message: 'Member details are required.' });
    }

    const { fullName, memberId, phone, gender, ageGroup, department, residentialArea, status, notes } = member;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'MissingName', message: 'Member full name is required.' });
    }

    if (!memberId || typeof memberId !== 'string' || !memberId.trim()) {
      return res.status(400).json({ error: 'MissingMemberId', message: 'Member ID is required.' });
    }

    const canonicalMemberId = memberId.trim().toUpperCase();
    const cleanFullName = fullName.trim();
    const cleanPhone = (phone || '').trim();

    // 1. Check if Member ID already exists (Hard Primary Key constraint)
    const existingWithId = db.members.find(
      (m: any) => m.memberId && m.memberId.toUpperCase() === canonicalMemberId
    );
    if (existingWithId) {
      return res.status(409).json({
        error: 'DuplicateMemberId',
        message: `Member ID "${canonicalMemberId}" is already assigned to ${existingWithId.fullName}.`,
        existingMember: existingWithId,
      });
    }

    // 2. Check for Duplicate Detection: normalized name & contact information (phone)
    const normalizedName = cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhoneDigits = cleanPhone.replace(/\D/g, '');

    const potentialDuplicate = db.members.find((m: any) => {
      const existingNormName = (m.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingPhoneDigits = (m.phone || '').replace(/\D/g, '');

      // Check name match
      if (normalizedName && existingNormName === normalizedName) {
        return true;
      }
      // Check contact information (phone number) match
      if (cleanPhoneDigits && cleanPhoneDigits.length >= 7 && existingPhoneDigits && cleanPhoneDigits === existingPhoneDigits) {
        return true;
      }
      return false;
    });

    if (potentialDuplicate && !allowDuplicateName) {
      const isPhoneMatch = Boolean(
        cleanPhoneDigits &&
        cleanPhoneDigits.length >= 7 &&
        (potentialDuplicate.phone || '').replace(/\D/g, '') === cleanPhoneDigits
      );
      const isNameMatch = Boolean(
        normalizedName &&
        (potentialDuplicate.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
      );
      const matchReason = isPhoneMatch && isNameMatch
        ? 'name and phone number'
        : isPhoneMatch
        ? 'contact phone number'
        : 'full name';

      return res.status(409).json({
        error: 'PossibleDuplicate',
        message: `POSSIBLE DUPLICATE MEMBER: A member with that ${matchReason} already exists (${potentialDuplicate.fullName}, ID: ${potentialDuplicate.memberId}).`,
        existingMember: potentialDuplicate,
        matchReason,
      });
    }

    // Create the new member record
    const newMemberRecord = {
      id: member.id || `mem-${Date.now()}`,
      memberId: canonicalMemberId,
      fullName: cleanFullName,
      phone: cleanPhone || 'N/A',
      gender: gender || 'Male',
      ageGroup: ageGroup || 'Adult',
      department: department || 'General Congregation',
      residentialArea: (residentialArea || '').trim() || 'Mankessim Central',
      status: status || 'Active Member',
      joinedDate: member.joinedDate || new Date().toISOString().slice(0, 10),
      notes: (notes || '').trim(),
    };

    // Ensure not in deletedMemberIds
    if (db.deletedMemberIds) {
      db.deletedMemberIds = db.deletedMemberIds.filter((id) => id !== newMemberRecord.id);
    }

    // Append once to authoritative member store
    db.members.unshift(newMemberRecord);

    // Record audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'MEMBER_REGISTERED',
      adminId: (req as any).adminUser?.id || db.adminUser?.id || 'admin',
      adminUsername: (req as any).adminUser?.username || db.adminUser?.username || 'admin',
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Registered new member ${newMemberRecord.fullName} (${newMemberRecord.memberId}, Department: ${newMemberRecord.department}).`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[MEMBER_REGISTRATION] Saved ${newMemberRecord.fullName} (${newMemberRecord.memberId})`);

    res.json({
      success: true,
      message: 'MEMBER REGISTERED SUCCESSFULLY!',
      subMessage: 'Your member has been registered and saved successfully.',
      member: newMemberRecord,
      totalMembers: db.members.length,
      members: db.members,
    });
  });

  // 7b. Secure Dedicated Attendance Submission Endpoint
  app.post('/api/church/attendance/submit', requireAdminAuth, (req: Request, res: Response) => {
    const { session } = req.body;

    if (!session || typeof session !== 'object') {
      return res.status(400).json({ error: 'InvalidSessionData', message: 'Attendance session data is required.' });
    }

    if (!session.date || typeof session.date !== 'string') {
      return res.status(400).json({ error: 'MissingDate', message: 'Service attendance date is required.' });
    }

    const serviceId = session.serviceId || 'srv-sunday';
    const canonicalSessionId = `${serviceId}_${session.date}`;

    // Normalize and validate records
    const validatedRecords: Record<string, any> = {};
    if (session.records && typeof session.records === 'object') {
      for (const mId of Object.keys(session.records)) {
        const rec = session.records[mId];
        if (rec) {
          validatedRecords[mId] = {
            memberId: rec.memberId || mId,
            status: rec.status === 'present' ? 'present' : rec.status === 'excused' ? 'excused' : 'absent',
            timestamp: rec.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            markedBy: rec.markedBy || (req as any).adminUser?.fullName || 'Administrator',
            notes: rec.notes || '',
          };
        }
      }
    }

    const savedSession = {
      id: canonicalSessionId,
      serviceId,
      serviceName: 'Sunday Service',
      date: session.date,
      records: validatedRecords,
      headCountNote: session.headCountNote || '',
      offeringNote: session.offeringNote || '',
      isLocked: false,
      isHistorical: false,
      isPendingSync: false,
      submittedAt: new Date().toISOString(),
      submittedBy: (req as any).adminUser?.fullName || (req as any).adminUser?.username || 'Administrator',
      submissionStatus: 'submitted' as const,
      lastUpdated: new Date().toISOString(),
    };

    if (!db.attendanceSessions) {
      db.attendanceSessions = {};
    }

    // Save or update idempotently: composite key prevents duplicate sessions
    db.attendanceSessions[canonicalSessionId] = savedSession;

    // Audit log
    const presentCount = Object.values(validatedRecords).filter((r: any) => r.status === 'present').length;
    const excusedCount = Object.values(validatedRecords).filter((r: any) => r.status === 'excused').length;
    const absentCount = Object.values(validatedRecords).filter((r: any) => r.status === 'absent').length;

    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'ATTENDANCE_SUBMITTED',
      adminId: (req as any).adminUser?.id || db.adminUser?.id || 'admin',
      adminUsername: (req as any).adminUser?.username || db.adminUser?.username || 'admin',
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Submitted Sunday Service attendance for ${session.date} (${presentCount} present, ${excusedCount} excused, ${absentCount} absent).`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[ATTENDANCE_SUBMIT] Saved attendance session ${canonicalSessionId} (${presentCount} present, ${excusedCount} excused, ${absentCount} absent)`);

    res.json({
      success: true,
      message: 'ATTENDANCE SUBMITTED SUCCESSFULLY!',
      subMessage: 'Your Sunday Service attendance records have been saved and are available in the Admin Portal.',
      session: savedSession,
      attendanceSessions: db.attendanceSessions,
    });
  });

  // 7a. Secure Permanent Member Deletion (ADMINISTRATOR ONLY, WITH REAUTHENTICATION & RETENTION POLICY)
  app.delete('/api/church/members/:id', requireAdminAuth, (req: Request, res: Response) => {
    const memberId = req.params.id;
    const { password, retentionPolicy = 'preserve' } = req.body;

    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    // Require password re-authentication for high-security deletion
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'MissingPassword',
        message: 'Administrator password verification is required to permanently delete a member.',
      });
    }

    const computedHash = serverHashPassword(password, db.adminUser.salt);
    if (computedHash !== db.adminUser.passwordHash) {
      return res.status(401).json({
        error: 'InvalidPassword',
        message: 'Incorrect administrator password. Deletion authorization rejected.',
      });
    }

    // Locate target member
    const existingMember = db.members.find((m: any) => m.id === memberId);
    if (!existingMember) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'The requested congregation member record could not be found.',
      });
    }

    // Remove member from members list
    db.members = db.members.filter((m: any) => m.id !== memberId);

    // Track in deletedMemberIds to avoid resurrection during local sync
    if (!db.deletedMemberIds) {
      db.deletedMemberIds = [];
    }
    if (!db.deletedMemberIds.includes(memberId)) {
      db.deletedMemberIds.push(memberId);
    }

    // Handle retention policy for attendance sessions
    let sessionsAffected = 0;
    if (db.attendanceSessions) {
      for (const sessionId of Object.keys(db.attendanceSessions)) {
        const session = db.attendanceSessions[sessionId];
        if (session && session.records && session.records[memberId]) {
          sessionsAffected++;
          if (retentionPolicy === 'purge') {
            // Completely strip the member record from this session
            delete session.records[memberId];
          } else {
            // Preserve historical entry but flag as archived/detached
            session.records[memberId] = {
              ...session.records[memberId],
              isArchived: true,
              archivedName: existingMember.fullName,
              archivedMemberId: existingMember.memberId,
            };
          }
        }
      }
    }

    // Record permanent audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'PERMANENT_MEMBER_DELETION',
      adminId: (req as any).adminUser?.id || db.adminUser.id,
      adminUsername: (req as any).adminUser?.username || db.adminUser.username,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 1, sessions: sessionsAffected, total: 1 + sessionsAffected },
      details: `Permanently removed member ${existingMember.fullName} (${existingMember.memberId}, Department: ${existingMember.department}, Mankessim: ${existingMember.residentialArea}) with retention policy: "${retentionPolicy}".`,
    };

    if (!db.auditLogs) {
      db.auditLogs = [];
    }
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[MEMBER_DELETION] Permanently deleted ${existingMember.fullName} (${existingMember.memberId}) by ${db.adminUser.username}`);

    res.json({
      success: true,
      message: `Member ${existingMember.fullName} (${existingMember.memberId}) has been permanently deleted from church records.`,
      members: db.members,
      attendanceSessions: db.attendanceSessions,
    });
  });

  // Public GET for church logo without authentication
  app.get('/api/church/logo', (req: Request, res: Response) => {
    res.json({
      success: true,
      customLogo: db.customLogo,
    });
  });

  // 7b. Homepage Images Endpoints
  // Public GET for immediate homepage display without authentication
  app.get('/api/church/homepage-images', (req: Request, res: Response) => {
    res.json({
      success: true,
      homepageImages: db.homepageImages || { image1: null, image2: null },
    });
  });

  // Protected POST to upload or replace a homepage image - PERMANENTLY PROTECTED
  app.post('/api/church/homepage-images', requireAdminAuth, (_req: Request, res: Response) => {
    return res.status(403).json({
      error: 'ProtectedAssetError',
      message:
        'The official church showcase images and logo are permanently protected assets of House of Power of Ministry International Church, Mankessim. Modifying or replacing these official assets is strictly prohibited.',
    });
    // @ts-ignore
    const { slot, dataUrl, fileName, fileSize, width, height, title, caption } = req.body;

    if (slot !== 'image1' && slot !== 'image2') {
      return res.status(400).json({
        error: 'InvalidSlot',
        message: 'Invalid image slot. Must be either "image1" or "image2".',
      });
    }

    const imageSlot = slot as 'image1' | 'image2';

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({
        error: 'MissingData',
        message: 'Image data URL is required.',
      });
    }

    // Server-side MIME validation - strictly JPEG, PNG, or WebP
    const match = dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({
        error: 'InvalidFormat',
        message: 'Unsupported or unsafe file format. Only JPEG, PNG, and WebP images are allowed.',
      });
    }

    const mimeType = match[1];
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const base64Content = match[3];
    const buffer = Buffer.from(base64Content, 'base64');

    // File size limit: 8 Megabytes
    const MAX_SIZE = 8 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({
        error: 'FileTooLarge',
        message: `Image exceeds the 8MB size limit (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Please select a compressed image.`,
      });
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Unique persistent filename
    const savedFileName = `hopmic_${imageSlot}_${Date.now()}.${extension}`;
    const filePath = path.resolve(UPLOADS_DIR, savedFileName);

    try {
      fs.writeFileSync(filePath, buffer);
    } catch (err: any) {
      console.error('Error writing homepage image file:', err);
      return res.status(500).json({
        error: 'StorageFailure',
        message: 'Failed to write uploaded image to persistent server storage.',
      });
    }

    // Safe deletion: remove previous file only after new write succeeded
    const previousImage = db.homepageImages?.[imageSlot];
    if (previousImage && previousImage.url && typeof previousImage.url === 'string' && previousImage.url.startsWith('/api/uploads/')) {
      const oldFileName = path.basename(previousImage.url);
      const oldFilePath = path.resolve(UPLOADS_DIR, oldFileName);
      if (fs.existsSync(oldFilePath) && oldFileName !== savedFileName) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch {
          // non-fatal cleanup
        }
      }
    }

    const imageRecord = {
      slot,
      url: `/api/uploads/${savedFileName}`,
      dataUrl, // Cached dataUrl for offline browser display
      fileName: fileName ? path.basename(fileName) : `${slot}.${extension}`,
      fileSize: buffer.length,
      mimeType,
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      title: title ? String(title).slice(0, 80) : (slot === 'image1' ? 'Sanctuary & Worship Area' : 'Ministries & Fellowship'),
      caption: caption ? String(caption).slice(0, 200) : '',
      uploadedAt: new Date().toISOString(),
      uploadedBy: (req as any).adminUser?.username || 'Administrator',
    };

    if (!db.homepageImages) {
      db.homepageImages = { image1: null, image2: null };
    }
    db.homepageImages[imageSlot] = imageRecord;

    // Record audit event
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'HOMEPAGE_IMAGE_UPDATE',
      adminId: (req as any).adminUser?.id || 'admin',
      adminUsername: (req as any).adminUser?.username || 'Administrator',
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Saved new image for ${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} (${savedFileName}, ${(buffer.length / 1024).toFixed(1)} KB, ${mimeType}).`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[HOMEPAGE_IMAGE] Uploaded ${slot}: ${savedFileName} (${buffer.length} bytes) by ${(req as any).adminUser?.username}`);

    res.json({
      success: true,
      message: `${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} uploaded and saved permanently.`,
      image: imageRecord,
    });
  });

  // Protected DELETE to remove a homepage image - PERMANENTLY PROTECTED
  app.delete('/api/church/homepage-images/:slot', requireAdminAuth, (_req: Request, res: Response) => {
    return res.status(403).json({
      error: 'ProtectedAssetError',
      message:
        'The official church showcase images are permanently protected assets of House of Power of Ministry International Church, Mankessim and cannot be deleted.',
    });
    // @ts-ignore
    const slot = req.params.slot as 'image1' | 'image2';
    if (slot !== 'image1' && slot !== 'image2') {
      return res.status(400).json({
        error: 'InvalidSlot',
        message: 'Invalid image slot. Must be either "image1" or "image2".',
      });
    }

    const previousImage = db.homepageImages?.[slot];
    if (previousImage && previousImage.url && typeof previousImage.url === 'string' && previousImage.url.startsWith('/api/uploads/')) {
      const oldFileName = path.basename(previousImage.url);
      const oldFilePath = path.resolve(UPLOADS_DIR, oldFileName);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch {
          // non-fatal
        }
      }
    }

    if (db.homepageImages) {
      db.homepageImages[slot] = null;
    }

    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'HOMEPAGE_IMAGE_REMOVAL',
      adminId: (req as any).adminUser?.id || 'admin',
      adminUsername: (req as any).adminUser?.username || 'Administrator',
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: { members: 0, sessions: 0, total: 0 },
      details: `Removed ${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} and restored clean placeholder.`,
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);

    saveDatabase(db);

    console.log(`[HOMEPAGE_IMAGE] Removed ${slot} by ${(req as any).adminUser?.username}`);

    res.json({
      success: true,
      message: `${slot === 'image1' ? 'Homepage Image 1' : 'Homepage Image 2'} removed successfully.`,
    });
  });

  // 8. System Reset / Clear All Operational Data (ADMINISTRATOR ONLY, WITH REAUTHENTICATION & EXACT PHRASE)
  app.post('/api/church/reset', requireAdminAuth, (req: Request, res: Response) => {
    if (!db.adminUser) {
      return res.status(400).json({ error: 'System is not initialized.' });
    }

    const { password, confirmationPhrase } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'MissingPassword',
        message: 'Administrator password verification is required.',
      });
    }

    // Verify confirmation phrase exactly
    const REQUIRED_PHRASE = 'RESET ALL CHURCH DATA';
    if (confirmationPhrase !== REQUIRED_PHRASE) {
      return res.status(400).json({
        error: 'InvalidPhrase',
        message: `Confirmation phrase does not match. You must type exactly: "${REQUIRED_PHRASE}"`,
      });
    }

    // Reauthenticate with administrator password
    const attemptHash = serverHashPassword(password, db.adminUser.salt);
    if (attemptHash !== db.adminUser.passwordHash) {
      const failedAudit = {
        id: `audit-${Date.now()}`,
        event: 'SYSTEM_RESET_ATTEMPT',
        adminId: db.adminUser.id,
        adminUsername: db.adminUser.username,
        timestamp: new Date().toISOString(),
        result: 'FAILED' as const,
        recordsCleared: { members: 0, sessions: 0, total: 0 },
        details: 'Failed system reset attempt: Invalid administrator password reauthentication.',
      };
      if (!db.auditLogs) db.auditLogs = [];
      db.auditLogs.unshift(failedAudit);
      saveDatabase(db);

      return res.status(401).json({
        error: 'AuthFailed',
        message: 'Administrator password verification failed. System reset aborted.',
      });
    }

    // Record count before deletion
    const deletedMembersCount = db.members.length;
    const deletedSessionsCount = Object.keys(db.attendanceSessions).length;

    // ATOMIC SAFE CLEARANCE:
    // Operational church data cleared!
    // Strictly preserved: adminUser, activeSessions, services, customLogo!
    db.members = [];
    db.attendanceSessions = {};

    // Audit Event Record (No passwords stored!)
    const auditEvent = {
      id: `audit-${Date.now()}`,
      event: 'SYSTEM_RESET',
      adminId: db.adminUser.id,
      adminUsername: db.adminUser.username,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS' as const,
      recordsCleared: {
        members: deletedMembersCount,
        sessions: deletedSessionsCount,
        total: deletedMembersCount + deletedSessionsCount,
      },
      details: `System reset executed successfully. Cleared ${deletedMembersCount} member records and ${deletedSessionsCount} attendance records. Administrator account and church branding strictly preserved.`,
    };

    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(auditEvent);
    saveDatabase(db);

    console.log(
      `[AUDIT] System reset completed by admin "${db.adminUser.username}". ${deletedMembersCount} members and ${deletedSessionsCount} sessions cleared.`
    );

    res.json({
      success: true,
      message: 'SYSTEM RESET SUCCESSFUL',
      notice:
        'Church records have been cleared. Your administrator account and system settings have been preserved. You can now begin registering members afresh.',
      deletedMembersCount,
      deletedSessionsCount,
      auditEvent,
    });
  });

  // 9. Audit Logs Endpoint (ADMINISTRATOR ONLY)
  app.get('/api/church/audit-logs', requireAdminAuth, (req: Request, res: Response) => {
    res.json({
      auditLogs: db.auditLogs || [],
    });
  });

  // Vite Integration in Development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname || '.', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
