import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  Settings,
  Shield,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Info,
  ArrowLeft,
  Home,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  FileDown,
  X,
  MessageSquare,
} from 'lucide-react';
import { normalizeGhanaPhone } from '../utils/phoneUtils';
import { ChurchLogo } from './ChurchLogo';
import { VoiceSearchBox } from './VoiceSearchBox';
import { MemberModal } from './MemberModal';
import { ServiceManagerModal } from './ServiceManagerModal';
import { AttendanceReports } from './AttendanceReports';
import { exportMembersToCsv } from '../utils/exportCsv';
import { exportDatabaseBackup, importDatabaseBackup } from '../utils/storage';
import {
  ChurchMember,
  ChurchService,
  AttendanceSession,
  UserSession,
  AppPage,
} from '../types';

interface AdminSectionProps {
  members: ChurchMember[];
  services: ChurchService[];
  sessions: Record<string, AttendanceSession>;
  onAddMember: (member: ChurchMember) => void;
  onUpdateMember: (member: ChurchMember) => void;
  onDeleteMember: (
    id: string,
    password?: string,
    retentionPolicy?: 'preserve' | 'purge'
  ) => Promise<{ success: boolean; message?: string } | void> | void;
  onSaveServices: (services: ChurchService[]) => void;
  userSession: UserSession;
  onOpenLogoModal: () => void;
  onBackToHome?: () => void;
  onNavigatePage?: (page: AppPage) => void;
  defaultTab?: 'members' | 'reports' | 'services' | 'branding';
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  members,
  services,
  sessions,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSaveServices,
  userSession,
  onOpenLogoModal,
  onBackToHome,
  onNavigatePage,
  defaultTab = 'members',
}) => {
  const [adminTab, setAdminTab] = useState<'members' | 'reports' | 'services' | 'branding'>(
    defaultTab
  );

  useEffect(() => {
    if (defaultTab) {
      setAdminTab(defaultTab);
    }
  }, [defaultTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal states
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<ChurchMember | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);

  // Filter members for Admin search
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesId = m.memberId.toLowerCase().includes(q);
        const matchesPhone = m.phone.toLowerCase().includes(q);
        const matchesArea = m.residentialArea.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesArea) {
          return false;
        }
      }

      if (filterDepartment !== 'All' && m.department !== filterDepartment) {
        return false;
      }

      if (filterStatus !== 'All' && m.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, filterDepartment, filterStatus]);

  // Handle member actions
  const handleEdit = (member: ChurchMember) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  // Secure Permanent Deletion State & Handlers
  const [memberToDelete, setMemberToDelete] = useState<ChurchMember | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteRetentionPolicy, setDeleteRetentionPolicy] = useState<'preserve' | 'purge'>('preserve');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleDelete = (member: ChurchMember) => {
    setMemberToDelete(member);
    setDeleteStep(1);
    setDeleteRetentionPolicy('preserve');
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
    setDeleteLoading(false);
  };

  const handleExportMemberBackup = (member: ChurchMember) => {
    try {
      const memberSessions = Object.values(sessions).filter(
        (s) => s.records && s.records[member.id] && s.records[member.id].status === 'present'
      );
      const backupData = {
        church: 'HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH',
        location: 'MANKESSIM',
        exportType: 'SINGLE_MEMBER_RECORD_BACKUP',
        exportedAt: new Date().toISOString(),
        exportedBy: userSession.fullName || userSession.username,
        member,
        attendanceHistory: {
          totalServicesAttended: memberSessions.length,
          services: memberSessions.map((s) => ({
            sessionId: s.id,
            serviceName: s.serviceName,
            date: s.date,
            status: s.records[member.id].status,
            timestamp: s.records[member.id].timestamp,
          })),
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HOPMIC_Member_${member.memberId}_${member.fullName.replace(/\s+/g, '_')}_Backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess(`Member record backup for ${member.fullName} exported!`);
      setTimeout(() => setBackupSuccess(null), 3000);
    } catch {
      setDeleteError('Failed to generate member backup file.');
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    if (!deletePassword) {
      setDeleteError('Please enter your administrator password to authorize deletion.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const result = await onDeleteMember(
        memberToDelete.id,
        deletePassword,
        deleteRetentionPolicy
      );

      if (result && typeof result === 'object' && result.success === false) {
        setDeleteError(result.message || 'Incorrect administrator password or deletion failed.');
        setDeleteLoading(false);
        return;
      }

      setBackupSuccess(`Member ${memberToDelete.fullName} (${memberToDelete.memberId}) was permanently deleted.`);
      setMemberToDelete(null);
      setDeleteStep(1);
      setDeletePassword('');
      setTimeout(() => setBackupSuccess(null), 3500);
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while permanently deleting member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveMember = (member: ChurchMember) => {
    if (editingMember) {
      onUpdateMember(member);
    } else {
      onAddMember(member);
    }
  };

  // Database Backup handlers
  const handleExportBackup = () => {
    const backupJson = exportDatabaseBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HOPMIC_Mankessim_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupSuccess('Database backup file downloaded successfully!');
    setTimeout(() => setBackupSuccess(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const success = importDatabaseBackup(reader.result as string);
      if (success) {
        setBackupSuccess('Database restored successfully! Reloading application...');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setBackupError('Failed to restore database. Invalid file format.');
        setTimeout(() => setBackupError(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Official Church Branding Banner on Admin Dashboard */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border-2 border-yellow-400 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            <div
              className="cursor-pointer shrink-0"
              onClick={onOpenLogoModal}
              title="Click to replace official church logo"
            >
              <ChurchLogo size="lg" showUploadButton={false} />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-blue-950 font-black text-xs uppercase tracking-wider mb-1.5 shadow-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Administration Dashboard</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                <span className="font-extrabold text-yellow-300 text-sm">
                  LOCATION: MANKESSIM
                </span>
                <span className="text-blue-300">•</span>
                <span className="text-xs text-blue-200">
                  Congregation Registry • Services • Attendance History • Official Branding
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center gap-1.5 shadow-md transition"
                title="Return to Home Screen"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home Page</span>
              </button>
            )}

            <button
              onClick={onOpenLogoModal}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition"
              title="Upload official church logo"
            >
              <Upload className="w-4 h-4 text-yellow-300" />
              <span>Upload Church Logo</span>
            </button>

            <button
              onClick={() => setIsServiceModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition"
            >
              <Calendar className="w-4 h-4 text-yellow-300" />
              <span>Manage Services</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setAdminTab('members')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            adminTab === 'members'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members Registry ({members.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('reports')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            adminTab === 'reports'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Attendance Reports & CSV</span>
        </button>

        <button
          onClick={() => setAdminTab('branding')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            adminTab === 'branding'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span>Logo & Branding Settings</span>
        </button>
      </div>

      {/* Backup notification */}
      {backupSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {backupError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-bold">
          <Info className="w-4 h-4 text-red-600" />
          <span>{backupError}</span>
        </div>
      )}

      {/* TAB 1: MEMBERS REGISTRY WITH VOICE SEARCH */}
      {adminTab === 'members' && (
        <div className="space-y-6">
          {/* Voice Search Box in Admin */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-blue-950 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                  ADMIN MEMBER SEARCH (VOICE & TEXT INPUT)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Search by full name, partial name, unique member ID (HOP-MK-XXX), or phone number
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportMembersToCsv(members)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <UserPlus className="w-4 h-4 text-yellow-400" />
                  <span>+ Add New Member</span>
                </button>
              </div>
            </div>

            {/* Voice Search Component */}
            <VoiceSearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Speak or type member name, ID (e.g. HOP-MK-001), phone, or area..."
              sectionName="ADMIN"
            />

            {/* Department and Status Filters */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Ministry:</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="All">All Departments</option>
                  <option value="Pastoral Board & Leadership">Pastoral Board & Leadership</option>
                  <option value="Choir & Praise Team">Choir & Praise Team</option>
                  <option value="Ushers & Protocol">Ushers & Protocol</option>
                  <option value="Men of Power Fellowship">Men of Power Fellowship</option>
                  <option value="Women of Grace Ministry">Women of Grace Ministry</option>
                  <option value="Youth & Campus Ministry">Youth & Campus Ministry</option>
                  <option value="Children Sunday School">Children Sunday School</option>
                  <option value="Media & Sound Ministry">Media & Sound Ministry</option>
                  <option value="Prayer Warriors & Intercessors">Prayer Warriors & Intercessors</option>
                  <option value="General Congregation">General Congregation</option>
                </select>

                <span className="text-xs font-bold text-gray-500 ml-2">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active Member">Active Member</option>
                  <option value="Visitor / First Timer">Visitor / First Timer</option>
                  <option value="Church Executive / Pastor">Church Executive / Pastor</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Found {filteredMembers.length} member{filteredMembers.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl shadow-md border border-blue-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-950 uppercase">
                Congregation Roster ({filteredMembers.length})
              </span>
              <span className="text-xs text-gray-500">
                Click any member to view spiritual care record
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-2 stroke-1" />
                <p className="font-bold text-base text-gray-700">No members match your search</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try speaking another name or clearing the filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Member Information Results Display */}
                    <div
                      className="flex items-start gap-3.5 cursor-pointer flex-1"
                      onClick={() => setSelectedMemberDetail(member)}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-blue-900 text-yellow-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ring-1 ring-blue-700">
                        {member.fullName.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-blue-950 hover:text-blue-800">
                            {member.fullName}
                          </span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">
                            {member.memberId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              member.status === 'Active Member'
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === 'Visitor / First Timer'
                                ? 'bg-yellow-400 text-blue-950'
                                : member.status === 'Church Executive / Pastor'
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {member.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
                          <span className="font-medium text-blue-900">{member.department}</span>

                          {normalizeGhanaPhone(member.phone) ? (
                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`tel:${normalizeGhanaPhone(member.phone)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 font-bold text-blue-900 hover:text-yellow-600 hover:underline"
                                title={`Tap to dial ${member.phone}`}
                              >
                                <Phone className="w-3.5 h-3.5 text-blue-700" />
                                <span>{member.phone}</span>
                              </a>
                              <a
                                href={`tel:${normalizeGhanaPhone(member.phone)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                                title={`Call ${member.fullName}`}
                              >
                                <Phone className="w-2.5 h-2.5 text-blue-800" />
                                <span>Call</span>
                              </a>
                              <a
                                href={`sms:${normalizeGhanaPhone(member.phone)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-[10px] inline-flex items-center gap-1 shadow-2xs transition-transform active:scale-95"
                                title={`Text message ${member.fullName}`}
                              >
                                <MessageSquare className="w-2.5 h-2.5 text-blue-950" />
                                <span>SMS</span>
                              </a>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400 italic">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{member.phone && member.phone !== 'N/A' ? member.phone : 'No phone number available.'}</span>
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {member.residentialArea}
                          </span>
                          <span className="text-gray-400">
                            ({member.gender}, {member.ageGroup})
                          </span>
                        </div>

                        {member.notes && (
                          <p className="text-xs text-gray-500 italic mt-0.5">
                            Note: {member.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => setSelectedMemberDetail(member)}
                        className="px-3 py-1.5 rounded-xl border border-blue-200 text-blue-900 hover:bg-blue-100 font-bold text-xs transition"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 hover:border-yellow-300 transition"
                        title="Edit member details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="p-2 rounded-xl border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition"
                        title="Delete member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REPORTS */}
      {adminTab === 'reports' && (
        <AttendanceReports members={members} services={services} sessions={sessions} />
      )}

      {/* TAB 3: LOGO & BRANDING SETTINGS */}
      {adminTab === 'branding' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-yellow-400 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-extrabold text-blue-950">
                Official Church Logo & Visual Identity
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Ensure consistent branding across Android phones, tablets, laptops, and printed attendance sheets
              </p>
            </div>

            <button
              onClick={onOpenLogoModal}
              className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center gap-2 shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Upload / Replace Logo File</span>
            </button>
          </div>

          {/* Current Logo Display Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="p-6 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 rounded-2xl flex flex-col items-center justify-center text-center text-white ring-2 ring-yellow-400">
              <ChurchLogo size="hero" showUploadButton={false} />
              <div className="mt-4">
                <span className="text-[11px] font-extrabold tracking-widest text-yellow-400 uppercase">
                  Official Church Seal
                </span>
                <h4 className="text-base font-black mt-0.5">
                  HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
                </h4>
                <p className="text-xs text-yellow-300 font-bold mt-0.5">LOCATION: MANKESSIM</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-600">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <h5 className="font-bold text-blue-950 mb-1">Branding Guidelines:</h5>
                <ul className="list-disc list-inside space-y-1 text-blue-900">
                  <li>
                    <strong>Official Name:</strong> HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
                  </li>
                  <li>
                    <strong>Location:</strong> MANKESSIM (Central Region, Ghana)
                  </li>
                  <li>
                    <strong>Official Colors:</strong> Royal Blue, Radiant Yellow/Gold, and Crisp White.
                  </li>
                  <li>
                    <strong>No Distortion:</strong> The logo container utilizes responsive aspect ratios and object containment so it never stretches on any device.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50/70 border border-yellow-200 rounded-2xl text-yellow-950">
                <h5 className="font-bold mb-1">How to Replace with Your Official Logo:</h5>
                <p>
                  1. Click the <strong>&ldquo;Upload / Replace Logo File&rdquo;</strong> button above or on the logo emblem in the navigation bar.
                </p>
                <p className="mt-1">
                  2. Choose your official graphic file (PNG, SVG, or high-res JPG).
                </p>
                <p className="mt-1">
                  3. Tap <strong>&ldquo;Apply Official Logo&rdquo;</strong>. It will be saved immediately to device storage and rendered across every screen without rebuilding the app!
                </p>
              </div>
            </div>
          </div>

          {/* Database Backup & Restore */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="font-extrabold text-sm text-blue-950 uppercase mb-2">
              Database & Offline Sync Management
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Safeguard church attendance records with offline backup files.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-xl bg-blue-900 text-yellow-300 hover:bg-blue-800 font-bold text-xs flex items-center gap-2 shadow-xs"
              >
                <Database className="w-4 h-4 text-yellow-400" />
                <span>Export Full Church Data Backup (JSON)</span>
              </button>

              <label className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Restore Backup File</span>
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMemberDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-950 to-indigo-950 p-6 text-white text-center relative">
              <button
                onClick={() => setSelectedMemberDetail(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-blue-200 hover:text-white"
              >
                ✕
              </button>
              <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-blue-950 font-black text-2xl mx-auto flex items-center justify-center mb-2 shadow-lg">
                {selectedMemberDetail.fullName.charAt(0)}
              </div>
              <h3 className="text-lg font-black">{selectedMemberDetail.fullName}</h3>
              <p className="font-mono text-xs text-yellow-300 font-bold">
                {selectedMemberDetail.memberId}
              </p>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold mt-2">
                {selectedMemberDetail.status}
              </span>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              {/* Profile Contact Section with Click-to-Call and Text Message Buttons */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-800" />
                    <span>Member Phone Contact</span>
                  </span>
                  {normalizeGhanaPhone(selectedMemberDetail.phone) ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ghana (+233)
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    {normalizeGhanaPhone(selectedMemberDetail.phone) ? (
                      <a
                        href={`tel:${normalizeGhanaPhone(selectedMemberDetail.phone)}`}
                        className="font-black text-base text-blue-950 hover:text-yellow-600 underline tracking-wide inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Tap or click to open phone dialer with this member's number"
                      >
                        <Phone className="w-4 h-4 text-blue-700" />
                        <span>{selectedMemberDetail.phone}</span>
                      </a>
                    ) : (
                      <span className="text-gray-500 italic font-medium text-xs">
                        No phone number available.
                      </span>
                    )}
                  </div>

                  {normalizeGhanaPhone(selectedMemberDetail.phone) && (
                    <div className="flex items-center gap-2">
                      {/* Call Button: Opens phone calling interface with number pre-filled */}
                      <a
                        href={`tel:${normalizeGhanaPhone(selectedMemberDetail.phone)}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-blue-700"
                        title={`Call ${selectedMemberDetail.fullName} (${selectedMemberDetail.phone})`}
                      >
                        <Phone className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Call</span>
                      </a>

                      {/* Text Message Button: Opens phone messaging application with number pre-filled */}
                      <a
                        href={`sms:${normalizeGhanaPhone(selectedMemberDetail.phone)}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ring-1 ring-yellow-500"
                        title={`Send Text Message to ${selectedMemberDetail.fullName} (${selectedMemberDetail.phone})`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-950" />
                        <span>Text Message</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Ministry / Group:</span>
                <span className="font-bold text-blue-950">{selectedMemberDetail.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Mankessim Residence:</span>
                <span className="font-bold text-blue-950">
                  {selectedMemberDetail.residentialArea}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Demographics:</span>
                <span className="font-bold text-blue-950">
                  {selectedMemberDetail.gender}, {selectedMemberDetail.ageGroup}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Date Joined:</span>
                <span className="font-bold text-blue-950">{selectedMemberDetail.joinedDate}</span>
              </div>
              {selectedMemberDetail.notes && (
                <div className="py-2 bg-yellow-50 p-3 rounded-xl border border-yellow-200 text-yellow-950">
                  <span className="font-bold block mb-0.5">Spiritual Care Notes:</span>
                  <span>{selectedMemberDetail.notes}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    handleEdit(selectedMemberDetail);
                    setSelectedMemberDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-900 text-yellow-300 font-bold"
                >
                  Edit Information
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Edit/Add Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        editingMember={editingMember}
        existingCount={members.length}
        existingMembers={members}
      />

      {/* Services Manager Modal */}
      <ServiceManagerModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        services={services}
        onSaveServices={onSaveServices}
      />

      {/* Multi-Step Permanent Member Deletion Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header with Church Identity & Deletion Warning */}
            <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white p-5 sm:p-6 relative">
              <button
                type="button"
                onClick={() => {
                  setMemberToDelete(null);
                  setDeleteStep(1);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-yellow-300 shrink-0 border border-white/20">
                  <AlertTriangle className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-yellow-400 text-red-950 font-black text-[10px] tracking-wider uppercase mb-1">
                    PERMANENT DELETION WARNING
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {deleteStep === 1 ? 'Remove Member from Records' : 'Authorize Permanent Deletion'}
                  </h3>
                  <p className="text-xs text-red-100 font-medium">
                    House of Power of Ministry International Church • Mankessim
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Member Profile Recap Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 mb-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-300 font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                  {memberToDelete.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-blue-950 text-base truncate">
                      {memberToDelete.fullName}
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono font-black text-xs">
                      {memberToDelete.memberId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-500">Department: </span>
                      <span className="font-bold text-gray-800">{memberToDelete.department}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Mankessim: </span>
                      <span className="font-bold text-gray-800">{memberToDelete.residentialArea}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Phone: </span>
                      <span className="font-bold text-gray-800">{memberToDelete.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Joined: </span>
                      <span className="font-bold text-gray-800">{memberToDelete.joinedDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {deleteError && (
                <div className="p-3.5 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* STEP 1: WARNING, REVIEW, AND BACKUP OPTIONS */}
              {deleteStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-950">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Irreversible Administrative Action
                    </p>
                    Permanently deleting this congregation member will remove them from the church register. You can review their full profile or download an offline backup file before deciding to proceed.
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* View Details Option */}
                      <button
                        type="button"
                        onClick={() => {
                          const m = memberToDelete;
                          setMemberToDelete(null);
                          setSelectedMemberDetail(m);
                        }}
                        className="py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-blue-700" />
                        <span>View Member Details</span>
                      </button>

                      {/* Export / Backup Option */}
                      <button
                        type="button"
                        onClick={() => handleExportMemberBackup(memberToDelete)}
                        className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 text-amber-700" />
                        <span>Create Member Backup</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMemberToDelete(null);
                          setDeleteError(null);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteStep(2);
                          setDeleteError(null);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Proceed to Deletion</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: RETENTION POLICY & PASSWORD RE-AUTHENTICATION */}
              {deleteStep === 2 && (
                <div className="space-y-4">
                  {/* Retention Policy Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select Attendance Retention Policy:
                    </label>
                    <div className="space-y-2">
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          deleteRetentionPolicy === 'preserve'
                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="retentionPolicy"
                          value="preserve"
                          checked={deleteRetentionPolicy === 'preserve'}
                          onChange={() => setDeleteRetentionPolicy('preserve')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-blue-950 block">
                            Preserve Historical Attendance (Recommended)
                          </span>
                          <span className="text-gray-600">
                            Detaches member profile from active rolls but preserves previous service headcounts and dates for accurate reporting.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          deleteRetentionPolicy === 'purge'
                            ? 'border-red-600 bg-red-50/70 ring-1 ring-red-500'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="retentionPolicy"
                          value="purge"
                          checked={deleteRetentionPolicy === 'purge'}
                          onChange={() => setDeleteRetentionPolicy('purge')}
                          className="mt-0.5 text-red-600 focus:ring-red-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-red-950 block">
                            Purge All Records
                          </span>
                          <span className="text-gray-600">
                            Completely wipes member and deletes all attendance entries across past church services and prayer meetings.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Password Authorization */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Enter Administrator Password to Confirm:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showDeletePassword ? 'text' : 'password'}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Administrator password"
                        className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteStep(1);
                        setDeleteError(null);
                      }}
                      disabled={deleteLoading}
                      className="py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteMember}
                      disabled={deleteLoading || !deletePassword}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {deleteLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying & Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Confirm Permanent Deletion</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
