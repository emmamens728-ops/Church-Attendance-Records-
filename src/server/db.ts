import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { INITIAL_MEMBERS, INITIAL_SERVICES, INITIAL_SESSIONS } from '../data/initialMembers';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_PATH = path.resolve(DATA_DIR, 'church.db');
const LEGACY_JSON_PATH = path.resolve(DATA_DIR, 'church-store.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export interface MemberRecord {
  id: string;
  memberId: string;
  fullName: string;
  normalizedName: string;
  phone: string;
  normalizedPhone: string;
  gender: string;
  ageGroup: string;
  department: string;
  residentialArea: string;
  status: string;
  joinedDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
}

export interface AttendanceSessionRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string;
  headCountNote: string;
  offeringNote: string;
  isLocked: number;
  isHistorical: number;
  submissionStatus: string;
  submittedAt: string;
  submittedBy: string;
  lastUpdated: string;
}

export interface AdminUserRecord {
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
}

export interface DatabaseHealthInfo {
  status: 'healthy' | 'degraded' | 'error';
  engine: string;
  totalMembers: number;
  totalSessions: number;
  totalAttendanceRecords: number;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  walEnabled: boolean;
  integrityOk: boolean;
  lastError: string | null;
}

class ChurchDatabaseManager {
  private db: DatabaseSync;
  private lastBackupTime: string | null = null;
  private lastBackupStatus: string | null = null;
  private lastError: string | null = null;

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.configurePragmas();
    this.createTablesAndIndexes();
    this.migrateLegacyDataIfNeeded();
    this.initAutomatedBackupSchedule();
  }

  private configurePragmas(): void {
    try {
      // WAL (Write-Ahead Logging) enables high concurrency, fast reads while writes happen
      this.db.exec('PRAGMA journal_mode = WAL;');
      // Synchronous NORMAL gives reliable ACID compliance with optimal SSD performance
      this.db.exec('PRAGMA synchronous = NORMAL;');
      // Enforce relational foreign keys
      this.db.exec('PRAGMA foreign_keys = ON;');
      // 64MB Cache size for indexed in-memory lookups
      this.db.exec('PRAGMA cache_size = -64000;');
    } catch (err: any) {
      console.error('[DATABASE] Error configuring PRAGMAs:', err);
      this.lastError = err.message;
    }
  }

  private createTablesAndIndexes(): void {
    this.db.exec(`
      -- Members Table: Scalable up to 1,000,000 records
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        memberId TEXT UNIQUE NOT NULL,
        fullName TEXT NOT NULL,
        normalizedName TEXT NOT NULL,
        phone TEXT,
        normalizedPhone TEXT,
        gender TEXT DEFAULT 'Male',
        ageGroup TEXT DEFAULT 'Adult',
        department TEXT DEFAULT 'General Congregation',
        residentialArea TEXT DEFAULT 'Mankessim Central',
        status TEXT DEFAULT 'Active Member',
        joinedDate TEXT,
        notes TEXT DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isDeleted INTEGER DEFAULT 0
      );

      -- B-Tree Indexes for lightning-fast queries
      CREATE UNIQUE INDEX IF NOT EXISTS idx_members_member_id ON members(memberId);
      CREATE INDEX IF NOT EXISTS idx_members_norm_name ON members(normalizedName);
      CREATE INDEX IF NOT EXISTS idx_members_norm_phone ON members(normalizedPhone);
      CREATE INDEX IF NOT EXISTS idx_members_active_dept ON members(isDeleted, department);
      CREATE INDEX IF NOT EXISTS idx_members_active_status ON members(isDeleted, status);
      CREATE INDEX IF NOT EXISTS idx_members_created ON members(createdAt DESC);

      -- Attendance Sessions
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        serviceId TEXT NOT NULL,
        serviceName TEXT NOT NULL,
        date TEXT NOT NULL,
        headCountNote TEXT DEFAULT '',
        offeringNote TEXT DEFAULT '',
        isLocked INTEGER DEFAULT 0,
        isHistorical INTEGER DEFAULT 0,
        submissionStatus TEXT DEFAULT 'submitted',
        submittedAt TEXT NOT NULL,
        submittedBy TEXT NOT NULL,
        lastUpdated TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON attendance_sessions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_service_date ON attendance_sessions(serviceId, date);

      -- Attendance Records per Member
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        memberId TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT,
        markedBy TEXT,
        notes TEXT DEFAULT '',
        isArchived INTEGER DEFAULT 0,
        archivedName TEXT,
        archivedMemberId TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_att_records_session_member ON attendance_records(sessionId, memberId);
      CREATE INDEX IF NOT EXISTS idx_att_records_member ON attendance_records(memberId);
      CREATE INDEX IF NOT EXISTS idx_att_records_status ON attendance_records(status);

      -- Admin User Profile
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        fullName TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        salt TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        recoveryHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastLoginAt TEXT
      );

      -- Active Admin Sessions (In-database tokens)
      CREATE TABLE IF NOT EXISTS active_sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expiresAt);

      -- System & Branding Settings
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      -- Audit Trail
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        adminId TEXT,
        adminUsername TEXT,
        timestamp TEXT NOT NULL,
        result TEXT NOT NULL,
        details TEXT,
        metaJson TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);

      -- Backup Metadata Registry
      CREATE TABLE IF NOT EXISTS backups_metadata (
        id TEXT PRIMARY KEY,
        fileName TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        memberCount INTEGER NOT NULL,
        sessionCount INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_backups_created ON backups_metadata(createdAt DESC);
    `);
  }

  /**
   * Safe, non-destructive migration from legacy church-store.json
   */
  private migrateLegacyDataIfNeeded(): void {
    try {
      // Check if admin user already exists in SQLite
      const adminCount = this.db.prepare('SELECT COUNT(*) as c FROM admin_users').get() as { c: number };
      const memberCount = this.db.prepare('SELECT COUNT(*) as c FROM members').get() as { c: number };

      if (adminCount.c > 0 && memberCount.c > 0) {
        // Already migrated and initialized
        return;
      }

      if (fs.existsSync(LEGACY_JSON_PATH)) {
        console.log('[MIGRATION] Inspecting existing church-store.json for migration to SQLite...');
        const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
        const legacy = JSON.parse(raw);

        this.db.exec('BEGIN TRANSACTION;');

        // 1. Migrate Admin User
        if (legacy.adminUser && legacy.adminUser.username) {
          const insertAdmin = this.db.prepare(`
            INSERT OR REPLACE INTO admin_users (id, username, email, fullName, role, salt, passwordHash, recoveryHash, createdAt, lastLoginAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          insertAdmin.run(
            legacy.adminUser.id || `adm-${Date.now()}`,
            legacy.adminUser.username,
            legacy.adminUser.email || null,
            legacy.adminUser.fullName || 'Presiding Administrator',
            'admin',
            legacy.adminUser.salt,
            legacy.adminUser.passwordHash,
            legacy.adminUser.recoveryHash,
            legacy.adminUser.createdAt || new Date().toISOString(),
            legacy.adminUser.lastLoginAt || null
          );
          console.log(`[MIGRATION] Successfully migrated administrator: ${legacy.adminUser.username}`);
        }

        // 2. Migrate Members
        const membersList = Array.isArray(legacy.members) && legacy.members.length > 0 ? legacy.members : INITIAL_MEMBERS;
        const insertMember = this.db.prepare(`
          INSERT OR REPLACE INTO members (
            id, memberId, fullName, normalizedName, phone, normalizedPhone,
            gender, ageGroup, department, residentialArea, status, joinedDate, notes,
            createdAt, updatedAt, isDeleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        for (const m of membersList) {
          if (!m || !m.fullName) continue;
          const canonicalId = (m.memberId || '').trim().toUpperCase();
          const cleanName = m.fullName.trim();
          const normName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normPhone = (m.phone || '').replace(/\D/g, '');

          insertMember.run(
            m.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            canonicalId || `HOP-MK-${Math.floor(Math.random() * 900 + 100)}`,
            cleanName,
            normName,
            m.phone || 'N/A',
            normPhone,
            m.gender || 'Male',
            m.ageGroup || 'Adult',
            m.department || 'General Congregation',
            m.residentialArea || 'Mankessim Central',
            m.status || 'Active Member',
            m.joinedDate || new Date().toISOString().slice(0, 10),
            m.notes || '',
            m.createdAt || new Date().toISOString(),
            m.updatedAt || new Date().toISOString()
          );
        }
        console.log(`[MIGRATION] Successfully migrated ${membersList.length} member records into SQLite.`);

        // 3. Migrate Attendance Sessions & Records
        if (legacy.attendanceSessions && typeof legacy.attendanceSessions === 'object') {
          const insertSession = this.db.prepare(`
            INSERT OR REPLACE INTO attendance_sessions (
              id, serviceId, serviceName, date, headCountNote, offeringNote,
              isLocked, isHistorical, submissionStatus, submittedAt, submittedBy, lastUpdated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertRecord = this.db.prepare(`
            INSERT OR REPLACE INTO attendance_records (
              id, sessionId, memberId, status, timestamp, markedBy, notes, isArchived, archivedName, archivedMemberId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const sId of Object.keys(legacy.attendanceSessions)) {
            const s = legacy.attendanceSessions[sId];
            if (!s || !s.date) continue;

            insertSession.run(
              s.id || sId,
              s.serviceId || 'srv-sunday',
              s.serviceName || 'Sunday Service',
              s.date,
              s.headCountNote || '',
              s.offeringNote || '',
              s.isLocked ? 1 : 0,
              s.isHistorical ? 1 : 0,
              s.submissionStatus || 'submitted',
              s.submittedAt || s.lastUpdated || new Date().toISOString(),
              s.submittedBy || 'Administrator',
              s.lastUpdated || new Date().toISOString()
            );

            if (s.records && typeof s.records === 'object') {
              for (const mId of Object.keys(s.records)) {
                const r = s.records[mId];
                if (!r) continue;
                insertRecord.run(
                  `${s.id || sId}_${mId}`,
                  s.id || sId,
                  r.memberId || mId,
                  r.status || 'present',
                  r.timestamp || '08:00',
                  r.markedBy || 'Administrator',
                  r.notes || '',
                  r.isArchived ? 1 : 0,
                  r.archivedName || null,
                  r.archivedMemberId || null
                );
              }
            }
          }
          console.log(`[MIGRATION] Successfully migrated attendance sessions into SQLite.`);
        }

        // 4. Migrate Custom Logo & Homepage Images into App Settings
        if (legacy.customLogo) {
          this.setSetting('customLogo', legacy.customLogo);
        }
        if (legacy.homepageImages) {
          this.setSetting('homepageImages', JSON.stringify(legacy.homepageImages));
        }

        // 5. Migrate Audit Logs
        if (Array.isArray(legacy.auditLogs)) {
          const insertAudit = this.db.prepare(`
            INSERT OR REPLACE INTO audit_logs (id, event, adminId, adminUsername, timestamp, result, details, metaJson)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of legacy.auditLogs) {
            insertAudit.run(
              a.id || `audit-${Date.now()}-${Math.random()}`,
              a.event || 'SYSTEM_EVENT',
              a.adminId || 'admin',
              a.adminUsername || 'admin',
              a.timestamp || new Date().toISOString(),
              a.result || 'SUCCESS',
              a.details || '',
              a.metaJson ? JSON.stringify(a.metaJson) : null
            );
          }
        }

        this.db.exec('COMMIT;');

        // Preserve pre-sqlite legacy file for safety
        fs.copyFileSync(LEGACY_JSON_PATH, path.resolve(DATA_DIR, 'church-store.pre-sqlite.json'));
        console.log('[MIGRATION] Migration completed successfully. Legacy backup saved as church-store.pre-sqlite.json.');
      } else {
        // First run initialization with INITIAL_MEMBERS if brand new
        this.db.exec('BEGIN TRANSACTION;');
        const insertMember = this.db.prepare(`
          INSERT OR REPLACE INTO members (
            id, memberId, fullName, normalizedName, phone, normalizedPhone,
            gender, ageGroup, department, residentialArea, status, joinedDate, notes,
            createdAt, updatedAt, isDeleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        for (const m of INITIAL_MEMBERS) {
          const normName = m.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normPhone = (m.phone || '').replace(/\D/g, '');
          insertMember.run(
            m.id,
            m.memberId,
            m.fullName,
            normName,
            m.phone,
            normPhone,
            m.gender,
            m.ageGroup,
            m.department,
            m.residentialArea,
            m.status,
            m.joinedDate,
            m.notes || '',
            new Date().toISOString(),
            new Date().toISOString()
          );
        }
        this.db.exec('COMMIT;');
        console.log('[INITIALIZATION] Seeded database with initial congregation records.');
      }
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      console.error('[MIGRATION] Migration error:', err);
      this.lastError = err.message;
    }
  }

  private initAutomatedBackupSchedule(): void {
    // Perform initial verification backup on startup
    const initialTimer = setTimeout(() => {
      this.createBackup('SYSTEM_STARTUP_SCHEDULE')
        .then((res) => {
          if (res.success) {
            console.log(`[BACKUP] Initial verification backup created: ${res.fileName}`);
          }
        })
        .catch((e) => console.error('[BACKUP] Initial backup error:', e));
    }, 2000);
    if (initialTimer.unref) initialTimer.unref();

    // Schedule regular automated snapshots every 6 hours
    const intervalTimer = setInterval(() => {
      this.createBackup('SYSTEM_SCHEDULED')
        .then((res) => {
          if (res.success) {
            console.log(`[BACKUP] Scheduled 6-hour backup created: ${res.fileName}`);
            this.cleanOldBackups(20); // retain last 20 automated snapshots
          }
        })
        .catch((e) => console.error('[BACKUP] Scheduled backup error:', e));
    }, 6 * 60 * 60 * 1000);
    if (intervalTimer.unref) intervalTimer.unref();
  }

  // ==========================================
  // MEMBER OPERATIONS (SCALABLE TO 1,000,000)
  // ==========================================

  public getMembersPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): {
    members: MemberRecord[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['isDeleted = 0'];
    const sqlParams: any[] = [];

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      const normQ = `%${params.search.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}%`;
      conditions.push('(fullName LIKE ? OR memberId LIKE ? OR phone LIKE ? OR residentialArea LIKE ? OR normalizedName LIKE ?)');
      sqlParams.push(q, q, q, q, normQ);
    }

    if (params.department && params.department !== 'All Departments') {
      conditions.push('department = ?');
      sqlParams.push(params.department);
    }

    if (params.status && params.status !== 'All Statuses') {
      conditions.push('status = ?');
      sqlParams.push(params.status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count Total (Indexed O(1) or O(log N))
    const countSql = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const countRow = this.db.prepare(countSql).get(...sqlParams) as { total: number };
    const totalCount = countRow ? countRow.total : 0;

    // Sorting
    const allowedSortFields = ['fullName', 'memberId', 'joinedDate', 'createdAt', 'department', 'status'];
    const sortField = allowedSortFields.includes(params.sortBy || '') ? params.sortBy! : 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Paginated Select
    const selectSql = `
      SELECT * FROM members
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    const members = this.db.prepare(selectSql).all(...sqlParams, limit, offset) as unknown as MemberRecord[];

    return {
      members,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  public getMemberById(id: string): MemberRecord | null {
    const row = this.db.prepare('SELECT * FROM members WHERE id = ? AND isDeleted = 0').get(id);
    return (row as unknown as MemberRecord) || null;
  }

  public getMemberByMemberId(memberId: string): MemberRecord | null {
    const canonical = (memberId || '').trim().toUpperCase();
    const row = this.db.prepare('SELECT * FROM members WHERE memberId = ? AND isDeleted = 0').get(canonical);
    return (row as unknown as MemberRecord) || null;
  }

  public checkDuplicate(fullName: string, phone: string, excludeId?: string): {
    isDuplicate: boolean;
    existingMember?: MemberRecord;
    matchReason?: string;
  } {
    const cleanName = (fullName || '').trim();
    const cleanPhone = (phone || '').trim();
    const normName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normPhone = cleanPhone.replace(/\D/g, '');

    const query = excludeId
      ? 'SELECT * FROM members WHERE isDeleted = 0 AND id != ? AND (normalizedName = ? OR (normalizedPhone = ? AND length(normalizedPhone) >= 7)) LIMIT 1'
      : 'SELECT * FROM members WHERE isDeleted = 0 AND (normalizedName = ? OR (normalizedPhone = ? AND length(normalizedPhone) >= 7)) LIMIT 1';

    const params = excludeId ? [excludeId, normName, normPhone] : [normName, normPhone];
    const match = this.db.prepare(query).get(...params) as unknown as MemberRecord | undefined;

    if (!match) {
      return { isDuplicate: false };
    }

    const nameMatch = normName && match.normalizedName === normName;
    const phoneMatch = normPhone && normPhone.length >= 7 && match.normalizedPhone === normPhone;
    const reason = nameMatch && phoneMatch
      ? 'name and phone number'
      : phoneMatch
      ? 'contact phone number'
      : 'full name';

    return {
      isDuplicate: true,
      existingMember: match,
      matchReason: reason,
    };
  }

  public createMember(member: {
    id?: string;
    memberId: string;
    fullName: string;
    phone?: string;
    gender?: string;
    ageGroup?: string;
    department?: string;
    residentialArea?: string;
    status?: string;
    joinedDate?: string;
    notes?: string;
  }, adminUsername: string): { success: boolean; member?: MemberRecord; error?: string; message?: string } {
    const canonicalMemberId = (member.memberId || '').trim().toUpperCase();
    const cleanFullName = (member.fullName || '').trim();
    const cleanPhone = (member.phone || '').trim();
    const normName = cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normPhone = cleanPhone.replace(/\D/g, '');
    const id = member.id || `mem-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    try {
      this.db.exec('BEGIN TRANSACTION;');

      // Verify UNIQUE memberId
      const existingIdCheck = this.db.prepare('SELECT memberId, fullName FROM members WHERE memberId = ?').get(canonicalMemberId) as any;
      if (existingIdCheck) {
        this.db.exec('ROLLBACK;');
        return {
          success: false,
          error: 'DuplicateMemberId',
          message: `Member ID "${canonicalMemberId}" is already assigned to ${existingIdCheck.fullName}.`,
        };
      }

      const stmt = this.db.prepare(`
        INSERT INTO members (
          id, memberId, fullName, normalizedName, phone, normalizedPhone,
          gender, ageGroup, department, residentialArea, status, joinedDate, notes,
          createdAt, updatedAt, isDeleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      stmt.run(
        id,
        canonicalMemberId,
        cleanFullName,
        normName,
        cleanPhone || 'N/A',
        normPhone,
        member.gender || 'Male',
        member.ageGroup || 'Adult',
        member.department || 'General Congregation',
        member.residentialArea || 'Mankessim Central',
        member.status || 'Active Member',
        member.joinedDate || now.slice(0, 10),
        member.notes || '',
        now,
        now
      );

      // Record Audit Log
      this.recordAuditLog({
        event: 'MEMBER_REGISTERED',
        adminUsername,
        result: 'SUCCESS',
        details: `Registered member ${cleanFullName} (${canonicalMemberId}).`,
      });

      this.db.exec('COMMIT;');

      const created = this.getMemberById(id);
      return { success: true, member: created! };
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      return { success: false, error: 'DatabaseError', message: err.message };
    }
  }

  public updateMember(id: string, updates: {
    fullName?: string;
    phone?: string;
    gender?: string;
    ageGroup?: string;
    department?: string;
    residentialArea?: string;
    status?: string;
    joinedDate?: string;
    notes?: string;
  }, adminUsername: string): { success: boolean; member?: MemberRecord; error?: string; message?: string } {
    const existing = this.getMemberById(id);
    if (!existing) {
      return { success: false, error: 'NotFound', message: 'Member record not found.' };
    }

    const cleanName = (updates.fullName || existing.fullName).trim();
    const cleanPhone = (updates.phone !== undefined ? updates.phone : existing.phone).trim();
    const normName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normPhone = cleanPhone.replace(/\D/g, '');
    const now = new Date().toISOString();

    try {
      this.db.exec('BEGIN TRANSACTION;');

      const stmt = this.db.prepare(`
        UPDATE members SET
          fullName = ?,
          normalizedName = ?,
          phone = ?,
          normalizedPhone = ?,
          gender = ?,
          ageGroup = ?,
          department = ?,
          residentialArea = ?,
          status = ?,
          joinedDate = ?,
          notes = ?,
          updatedAt = ?
        WHERE id = ? AND isDeleted = 0
      `);

      stmt.run(
        cleanName,
        normName,
        cleanPhone || 'N/A',
        normPhone,
        updates.gender || existing.gender,
        updates.ageGroup || existing.ageGroup,
        updates.department || existing.department,
        updates.residentialArea || existing.residentialArea,
        updates.status || existing.status,
        updates.joinedDate || existing.joinedDate,
        updates.notes !== undefined ? updates.notes : existing.notes,
        now,
        id
      );

      this.recordAuditLog({
        event: 'MEMBER_UPDATED',
        adminUsername,
        result: 'SUCCESS',
        details: `Updated member profile for ${cleanName} (${existing.memberId}).`,
      });

      this.db.exec('COMMIT;');

      const updated = this.getMemberById(id);
      return { success: true, member: updated! };
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      return { success: false, error: 'UpdateFailed', message: err.message };
    }
  }

  public deleteMember(id: string, adminUsername: string, retentionPolicy: 'preserve' | 'purge' = 'preserve'): {
    success: boolean;
    member?: MemberRecord;
    error?: string;
    message?: string;
  } {
    const existing = this.getMemberById(id);
    if (!existing) {
      return { success: false, error: 'NotFound', message: 'Member record not found.' };
    }

    try {
      this.db.exec('BEGIN TRANSACTION;');

      // Soft delete member
      this.db.prepare('UPDATE members SET isDeleted = 1, updatedAt = ? WHERE id = ?').run(new Date().toISOString(), id);

      // Handle retention in attendance records
      if (retentionPolicy === 'purge') {
        this.db.prepare('DELETE FROM attendance_records WHERE memberId = ? OR memberId = ?').run(existing.id, existing.memberId);
      } else {
        // Preserve historical presence but mark archived
        this.db.prepare(`
          UPDATE attendance_records SET
            isArchived = 1,
            archivedName = ?,
            archivedMemberId = ?
          WHERE memberId = ? OR memberId = ?
        `).run(existing.fullName, existing.memberId, existing.id, existing.memberId);
      }

      this.recordAuditLog({
        event: 'PERMANENT_MEMBER_DELETION',
        adminUsername,
        result: 'SUCCESS',
        details: `Deleted member ${existing.fullName} (${existing.memberId}) with retention policy: ${retentionPolicy}.`,
      });

      this.db.exec('COMMIT;');
      return { success: true, member: existing };
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      return { success: false, error: 'DeleteFailed', message: err.message };
    }
  }

  public getAllMembersForClient(limit = 1000): MemberRecord[] {
    return this.db.prepare('SELECT * FROM members WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT ?').all(limit) as unknown as MemberRecord[];
  }

  // ==========================================
  // ATTENDANCE SESSIONS & RECORDS
  // ==========================================

  public submitAttendance(sessionData: {
    serviceId: string;
    serviceName?: string;
    date: string;
    records: Record<string, { memberId: string; status: string; timestamp?: string; notes?: string; markedBy?: string }>;
    headCountNote?: string;
    offeringNote?: string;
  }, adminUsername: string): { success: boolean; session?: any; error?: string; message?: string } {
    const serviceId = sessionData.serviceId || 'srv-sunday';
    const canonicalSessionId = `${serviceId}_${sessionData.date}`;
    const now = new Date().toISOString();

    try {
      this.db.exec('BEGIN TRANSACTION;');

      // Upsert Session Header
      const sessionStmt = this.db.prepare(`
        INSERT OR REPLACE INTO attendance_sessions (
          id, serviceId, serviceName, date, headCountNote, offeringNote,
          isLocked, isHistorical, submissionStatus, submittedAt, submittedBy, lastUpdated
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'submitted', ?, ?, ?)
      `);

      sessionStmt.run(
        canonicalSessionId,
        serviceId,
        sessionData.serviceName || 'Sunday Service',
        sessionData.date,
        sessionData.headCountNote || '',
        sessionData.offeringNote || '',
        now,
        adminUsername,
        now
      );

      // Upsert Individual Attendance Records Idempotently
      const recordStmt = this.db.prepare(`
        INSERT OR REPLACE INTO attendance_records (
          id, sessionId, memberId, status, timestamp, markedBy, notes, isArchived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);

      let presentCount = 0;
      let absentCount = 0;
      let excusedCount = 0;

      if (sessionData.records && typeof sessionData.records === 'object') {
        for (const mId of Object.keys(sessionData.records)) {
          const rec = sessionData.records[mId];
          if (!rec) continue;
          const status = rec.status === 'present' ? 'present' : rec.status === 'excused' ? 'excused' : 'absent';
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
          else excusedCount++;

          const recordId = `${canonicalSessionId}_${rec.memberId || mId}`;
          recordStmt.run(
            recordId,
            canonicalSessionId,
            rec.memberId || mId,
            status,
            rec.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rec.markedBy || adminUsername,
            rec.notes || ''
          );
        }
      }

      this.recordAuditLog({
        event: 'ATTENDANCE_SUBMITTED',
        adminUsername,
        result: 'SUCCESS',
        details: `Saved Sunday Service attendance for ${sessionData.date} (${presentCount} present, ${excusedCount} excused, ${absentCount} absent).`,
      });

      this.db.exec('COMMIT;');

      const fullSession = this.getAttendanceSessionById(canonicalSessionId);
      return { success: true, session: fullSession };
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      return { success: false, error: 'SubmitError', message: err.message };
    }
  }

  public getAttendanceSessionById(sessionId: string): any {
    const session = this.db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) return null;

    const records = this.db.prepare('SELECT * FROM attendance_records WHERE sessionId = ?').all(sessionId) as any[];
    const recordsMap: Record<string, any> = {};
    for (const r of records) {
      recordsMap[r.memberId] = {
        memberId: r.memberId,
        status: r.status,
        timestamp: r.timestamp,
        markedBy: r.markedBy,
        notes: r.notes,
        isArchived: Boolean(r.isArchived),
        archivedName: r.archivedName,
        archivedMemberId: r.archivedMemberId,
      };
    }

    return {
      ...session,
      isLocked: Boolean(session.isLocked),
      isHistorical: Boolean(session.isHistorical),
      records: recordsMap,
    };
  }

  public getAllAttendanceSessions(): Record<string, any> {
    const sessions = this.db.prepare('SELECT * FROM attendance_sessions ORDER BY date DESC').all() as any[];
    const result: Record<string, any> = {};

    for (const s of sessions) {
      const records = this.db.prepare('SELECT * FROM attendance_records WHERE sessionId = ?').all(s.id) as any[];
      const recordMap: Record<string, any> = {};
      for (const r of records) {
        recordMap[r.memberId] = {
          memberId: r.memberId,
          status: r.status,
          timestamp: r.timestamp,
          markedBy: r.markedBy,
          notes: r.notes,
          isArchived: Boolean(r.isArchived),
          archivedName: r.archivedName,
          archivedMemberId: r.archivedMemberId,
        };
      }
      result[s.id] = {
        ...s,
        isLocked: Boolean(s.isLocked),
        isHistorical: Boolean(s.isHistorical),
        records: recordMap,
      };
    }
    return result;
  }

  // ==========================================
  // ADMIN AUTHENTICATION & SESSIONS
  // ==========================================

  public getAdminUser(): AdminUserRecord | null {
    const user = this.db.prepare('SELECT * FROM admin_users LIMIT 1').get();
    return (user as unknown as AdminUserRecord) || null;
  }

  public createAdminUser(user: {
    username: string;
    email?: string;
    fullName: string;
    salt: string;
    passwordHash: string;
    recoveryHash: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO admin_users (
        id, username, email, fullName, role, salt, passwordHash, recoveryHash, createdAt, lastLoginAt
      ) VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, NULL)
    `);
    stmt.run(
      `adm-${Date.now()}`,
      user.username.trim().toLowerCase(),
      user.email ? user.email.trim().toLowerCase() : null,
      user.fullName.trim(),
      user.salt,
      user.passwordHash,
      user.recoveryHash,
      new Date().toISOString()
    );
  }

  public updateAdminPassword(passwordHash: string, salt: string): void {
    this.db.prepare('UPDATE admin_users SET passwordHash = ?, salt = ?').run(passwordHash, salt);
  }

  public saveActiveSession(token: string, userId: string, username: string, expiresAt: number): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO active_sessions (token, userId, username, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(token, userId, username, expiresAt, new Date().toISOString());
  }

  public getActiveSession(token: string): { userId: string; username: string; expiresAt: number } | null {
    const row = this.db.prepare('SELECT userId, username, expiresAt FROM active_sessions WHERE token = ?').get(token) as any;
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.deleteActiveSession(token);
      return null;
    }
    return row;
  }

  public deleteActiveSession(token: string): void {
    this.db.prepare('DELETE FROM active_sessions WHERE token = ?').run(token);
  }

  // ==========================================
  // APP SETTINGS & BRANDING
  // ==========================================

  public getSetting(key: string, defaultValue: string | null = null): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
    return row ? row.value : defaultValue;
  }

  public setSetting(key: string, value: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
    `).run(key, value, new Date().toISOString());
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  public recordAuditLog(log: {
    event: string;
    adminId?: string;
    adminUsername?: string;
    result: string;
    details?: string;
    meta?: any;
  }): void {
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (id, event, adminId, adminUsername, timestamp, result, details, metaJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        log.event,
        log.adminId || 'admin',
        log.adminUsername || 'Administrator',
        new Date().toISOString(),
        log.result,
        log.details || '',
        log.meta ? JSON.stringify(log.meta) : null
      );
    } catch {
      // Non-fatal
    }
  }

  public getAuditLogs(limit = 50): any[] {
    return this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  // ==========================================
  // BACKUPS, SNAPSHOTS & RESTORATION
  // ==========================================

  public async createBackup(reason = 'MANUAL_ADMIN_BACKUP'): Promise<{
    success: boolean;
    fileName: string;
    fileSize: number;
    filePath: string;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `hopmic_backup_${timestamp}.db`;
    const destPath = path.resolve(BACKUPS_DIR, fileName);

    try {
      // VACUUM INTO performs a 100% consistent, non-blocking snapshot of active SQLite DB
      this.db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}';`);

      const stat = fs.statSync(destPath);
      const memberCountRow = this.db.prepare('SELECT COUNT(*) as c FROM members WHERE isDeleted = 0').get() as { c: number };
      const sessionCountRow = this.db.prepare('SELECT COUNT(*) as c FROM attendance_sessions').get() as { c: number };

      this.db.prepare(`
        INSERT INTO backups_metadata (id, fileName, fileSize, memberCount, sessionCount, createdAt, createdBy, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
      `).run(
        `backup-${Date.now()}`,
        fileName,
        stat.size,
        memberCountRow.c,
        sessionCountRow.c,
        new Date().toISOString(),
        reason
      );

      this.lastBackupTime = new Date().toISOString();
      this.lastBackupStatus = 'SUCCESS';

      this.recordAuditLog({
        event: 'DATABASE_BACKUP_CREATED',
        result: 'SUCCESS',
        details: `Created atomic database backup snapshot ${fileName} (${(stat.size / 1024).toFixed(1)} KB, ${memberCountRow.c} members).`,
      });

      return {
        success: true,
        fileName,
        fileSize: stat.size,
        filePath: destPath,
      };
    } catch (err: any) {
      this.lastBackupStatus = `FAILED: ${err.message}`;
      this.lastError = err.message;
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        filePath: '',
      };
    }
  }

  public listBackups(): any[] {
    return this.db.prepare('SELECT * FROM backups_metadata ORDER BY createdAt DESC LIMIT 30').all();
  }

  private cleanOldBackups(retainCount = 20): void {
    try {
      const all = this.db.prepare('SELECT * FROM backups_metadata ORDER BY createdAt DESC').all() as any[];
      if (all.length > retainCount) {
        const toDelete = all.slice(retainCount);
        for (const b of toDelete) {
          const filePath = path.resolve(BACKUPS_DIR, b.fileName);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch {}
          }
          this.db.prepare('DELETE FROM backups_metadata WHERE id = ?').run(b.id);
        }
      }
    } catch {}
  }

  public getHealth(): DatabaseHealthInfo {
    try {
      const memberRow = this.db.prepare('SELECT COUNT(*) as c FROM members WHERE isDeleted = 0').get() as any;
      const sessionRow = this.db.prepare('SELECT COUNT(*) as c FROM attendance_sessions').get() as any;
      const recordRow = this.db.prepare('SELECT COUNT(*) as c FROM attendance_records').get() as any;
      const sizeBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;

      // Integrity Check
      const integrityRow = this.db.prepare('PRAGMA integrity_check').get() as any;
      const integrityOk = integrityRow && Object.values(integrityRow)[0] === 'ok';

      return {
        status: integrityOk ? 'healthy' : 'degraded',
        engine: 'SQLite 3 (WAL Mode + B-Tree Indexes)',
        totalMembers: memberRow ? memberRow.c : 0,
        totalSessions: sessionRow ? sessionRow.c : 0,
        totalAttendanceRecords: recordRow ? recordRow.c : 0,
        databaseSizeBytes: sizeBytes,
        databaseSizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
        lastBackupAt: this.lastBackupTime,
        lastBackupStatus: this.lastBackupStatus,
        walEnabled: true,
        integrityOk,
        lastError: this.lastError,
      };
    } catch (err: any) {
      return {
        status: 'error',
        engine: 'SQLite 3',
        totalMembers: 0,
        totalSessions: 0,
        totalAttendanceRecords: 0,
        databaseSizeBytes: 0,
        databaseSizeFormatted: '0 KB',
        lastBackupAt: null,
        lastBackupStatus: 'ERROR',
        walEnabled: false,
        integrityOk: false,
        lastError: err.message,
      };
    }
  }

  public resetOperationalData(adminUsername: string): { deletedMembers: number; deletedSessions: number } {
    this.db.exec('BEGIN TRANSACTION;');
    const membersBefore = (this.db.prepare('SELECT COUNT(*) as c FROM members').get() as any).c;
    const sessionsBefore = (this.db.prepare('SELECT COUNT(*) as c FROM attendance_sessions').get() as any).c;

    this.db.exec('DELETE FROM attendance_records;');
    this.db.exec('DELETE FROM attendance_sessions;');
    this.db.exec('DELETE FROM members;');

    this.recordAuditLog({
      event: 'SYSTEM_RESET',
      adminUsername,
      result: 'SUCCESS',
      details: `Cleared ${membersBefore} members and ${sessionsBefore} attendance sessions. System credentials and branding preserved.`,
    });

    this.db.exec('COMMIT;');
    return { deletedMembers: membersBefore, deletedSessions: sessionsBefore };
  }
}

// Singleton export
export const churchDb = new ChurchDatabaseManager();
