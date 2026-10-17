import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Check,
  X,
  User,
  UserCheck,
  UserX,
  Users,
  Clock,
  Download,
  Filter,
  UserPlus,
  Sparkles,
  ChevronDown,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  WifiOff,
  CloudOff,
  CheckCircle,
  HelpCircle,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { normalizeGhanaPhone } from '../utils/phoneUtils';
import { ChurchLogo } from './ChurchLogo';
import { VoiceSearchBox } from './VoiceSearchBox';
import { QuickVisitorModal } from './QuickVisitorModal';
import { exportAttendanceToCsv } from '../utils/exportCsv';
import {
  ChurchMember,
  ChurchService,
  AttendanceSession,
  AttendanceRecord,
  AttendanceStatus,
  UserSession,
} from '../types';
import { submitAttendanceApi, deduplicateMemberList } from '../utils/storage';

interface AttendanceBookProps {
  members: ChurchMember[];
  services: ChurchService[];
  sessions: Record<string, AttendanceSession>;
  onUpdateSession: (session: AttendanceSession) => void;
  onAddMember: (member: ChurchMember) => void;
  userSession: UserSession;
  onOpenLogoModal: () => void;
  onBackToHome?: () => void;
}

export const AttendanceBook: React.FC<AttendanceBookProps> = ({
  members: rawMembers,
  services,
  sessions,
  onUpdateSession,
  onAddMember,
  userSession,
  onOpenLogoModal,
  onBackToHome,
}) => {
  // Guarantee deduplicated members
  const members = useMemo(() => deduplicateMemberList(rawMembers), [rawMembers]);

  // Sunday Service selection
  const sundayService = services.find((s) => s.id === 'srv-sunday') || services[0];
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    sundayService?.id || 'srv-sunday'
  );

  // Selected Attendance Date
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'present' | 'absent' | 'excused' | 'unmarked' | 'visitors'
  >('all');
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [lastMarkedNotification, setLastMarkedNotification] = useState<string | null>(null);

  // Compute canonical session ID: srv-sunday_YYYY-MM-DD
  const sessionId = `${selectedServiceId}_${selectedDate}`;
  const currentService = services.find((s) => s.id === selectedServiceId) || sundayService;

  // Working Draft Records (temporary attendance selections for the active roster form)
  const [draftRecords, setDraftRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Track sessions submitted during this view session to keep the form clean and reset
  const [submittedSessionIds, setSubmittedSessionIds] = useState<Record<string, boolean>>({});
  const [loadedForEditingSessionId, setLoadedForEditingSessionId] = useState<string | null>(null);

  // Load existing records for the selected session when date or service changes
  useEffect(() => {
    // If the session was just submitted in this view session: keep roster form clear and reset
    if (submittedSessionIds[sessionId] && loadedForEditingSessionId !== sessionId) {
      setDraftRecords({});
      setIsFormDirty(false);
      return;
    }

    const existingSession = sessions[sessionId];
    // If already officially submitted in database, keep roster form clear and ready for the next entry
    // unless the administrator explicitly clicks "Load Saved Selections to Edit"
    if (existingSession?.submissionStatus === 'submitted' && loadedForEditingSessionId !== sessionId) {
      setDraftRecords({});
      setIsFormDirty(false);
    } else if (existingSession && existingSession.records) {
      setDraftRecords(existingSession.records);
      setIsFormDirty(false);
    } else {
      setDraftRecords({});
      setIsFormDirty(false);
    }
  }, [sessionId, loadedForEditingSessionId]);

  // Submission Workflow States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    title: string;
    message: string;
    isOffline?: boolean;
    date: string;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
  } | null>(null);

  // Submission Status determination
  const existingSession = sessions[sessionId];
  const currentSubmissionStatus = useMemo(() => {
    if (isSubmitting) return 'submitting';
    if (existingSession?.submissionStatus === 'submitted' || submittedSessionIds[sessionId]) {
      return 'submitted';
    }
    if (existingSession?.isPendingSync || existingSession?.submissionStatus === 'pending_submission') {
      return 'pending_submission';
    }
    if (isFormDirty || Object.keys(draftRecords).length > 0) return 'draft';
    return 'ready';
  }, [isSubmitting, existingSession, submittedSessionIds, sessionId, isFormDirty, draftRecords]);

  // Handle Mark Present / Absent / Excused
  const setMemberAttendanceStatus = (memberId: string, status: AttendanceStatus) => {
    const member = members.find((m) => m.memberId === memberId);
    const existing = draftRecords[memberId];

    // Toggle off if already that status
    let newStatus: AttendanceStatus = status;
    let updatedRecords = { ...draftRecords };

    if (existing?.status === status) {
      // Unmark
      delete updatedRecords[memberId];
      setDraftRecords(updatedRecords);
      setIsFormDirty(true);
      if (member) {
        setLastMarkedNotification(`${member.fullName}: Selection cleared`);
        setTimeout(() => setLastMarkedNotification(null), 2000);
      }
      return;
    }

    updatedRecords[memberId] = {
      memberId,
      status: newStatus,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      markedBy: userSession.fullName || userSession.username || 'Administrator',
    };

    setDraftRecords(updatedRecords);
    setIsFormDirty(true);

    if (member) {
      setLastMarkedNotification(
        `${member.fullName} marked ${newStatus.toUpperCase()}`
      );
      setTimeout(() => setLastMarkedNotification(null), 2000);
    }
  };

  const [bulkActionConfirm, setBulkActionConfirm] = useState<'markAllPresent' | 'markAllAbsent' | 'clear' | null>(null);

  // Bulk actions execution
  const executeMarkAll = (targetStatus: AttendanceStatus) => {
    const updatedRecords: Record<string, AttendanceRecord> = { ...draftRecords };
    members.forEach((m) => {
      updatedRecords[m.memberId] = {
        memberId: m.memberId,
        status: targetStatus,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        markedBy: userSession.fullName || userSession.username || 'Administrator',
      };
    });
    setDraftRecords(updatedRecords);
    setIsFormDirty(true);
    setBulkActionConfirm(null);
    setLastMarkedNotification(`All active congregation members marked ${targetStatus.toUpperCase()}`);
    setTimeout(() => setLastMarkedNotification(null), 2500);
  };

  const executeClearSelections = () => {
    setDraftRecords({});
    setIsFormDirty(true);
    setBulkActionConfirm(null);
    setLastMarkedNotification('Current attendance selections cleared');
    setTimeout(() => setLastMarkedNotification(null), 2500);
  };

  // Add visitor and mark present immediately
  const handleAddVisitorAndCheckIn = (newVisitor: ChurchMember) => {
    onAddMember(newVisitor);
    setMemberAttendanceStatus(newVisitor.memberId, 'present');
  };

  // Statistics calculation for the active draft roster
  const stats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let childrenCount = 0;
    let visitorsCount = 0;

    members.forEach((m) => {
      const rec = draftRecords[m.memberId];
      if (rec?.status === 'present') {
        presentCount++;
        if (m.gender === 'Male') maleCount++;
        if (m.gender === 'Female') femaleCount++;
        if (m.ageGroup === 'Children') childrenCount++;
        if (m.status === 'Visitor / First Timer') visitorsCount++;
      } else if (rec?.status === 'excused') {
        excusedCount++;
      } else if (rec?.status === 'absent') {
        absentCount++;
      }
    });

    const total = members.length;
    const markedTotal = presentCount + absentCount + excusedCount;
    const unmarkedCount = total - markedTotal;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      total,
      presentCount,
      absentCount,
      excusedCount,
      unmarkedCount,
      markedTotal,
      rate,
      maleCount,
      femaleCount,
      childrenCount,
      visitorsCount,
    };
  }, [members, draftRecords]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search query (voice or typed): supports full name, partial name, member ID, phone
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

      // Department filter
      if (filterDepartment !== 'All' && m.department !== filterDepartment) {
        return false;
      }

      // Attendance status filter
      const record = draftRecords[m.memberId];
      if (filterStatus === 'present' && record?.status !== 'present') return false;
      if (filterStatus === 'absent' && record?.status !== 'absent') return false;
      if (filterStatus === 'excused' && record?.status !== 'excused') return false;
      if (filterStatus === 'unmarked' && record?.status !== undefined) return false;
      if (filterStatus === 'visitors' && m.status !== 'Visitor / First Timer') return false;

      return true;
    });
  }, [members, searchQuery, filterDepartment, filterStatus, draftRecords]);

  const handleLoadSavedRecords = () => {
    const existingSession = sessions[sessionId];
    if (existingSession && existingSession.records) {
      setLoadedForEditingSessionId(sessionId);
      setDraftRecords(existingSession.records);
      setIsFormDirty(true);
      setLastMarkedNotification('Loaded previously submitted records for editing');
      setTimeout(() => setLastMarkedNotification(null), 2500);
    }
  };

  // ========================================================
  // SUBMISSION WORKFLOW
  // ========================================================
  const handleOpenSubmitConfirmation = () => {
    if (Object.keys(draftRecords).length === 0) {
      setLastMarkedNotification('Please mark members as Present, Absent, or Excused before clicking SUBMIT ATTENDANCE.');
      setTimeout(() => setLastMarkedNotification(null), 3000);
      return;
    }
    setSubmissionError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    // Build canonical session to submit
    const sessionToSubmit: AttendanceSession = {
      id: sessionId,
      serviceId: selectedServiceId,
      serviceName: 'Sunday Service',
      date: selectedDate,
      records: draftRecords,
      lastUpdated: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      submittedBy: userSession.fullName || userSession.username || 'Administrator',
      submissionStatus: 'submitting',
    };

    try {
      const result = await submitAttendanceApi(sessionToSubmit);

      if (!result.success) {
        setIsSubmitting(false);
        setSubmissionError(
          result.message || 'Failed to submit attendance to database. Your marked records have been preserved.'
        );
        return;
      }

      // Verify that database has successfully saved the records
      const savedSession = result.session || {
        ...sessionToSubmit,
        submissionStatus: result.isOffline ? 'pending_submission' : 'submitted',
        isPendingSync: Boolean(result.isOffline),
      };

      // Update parent session map
      onUpdateSession(savedSession);

      // Display official success message
      setSubmissionSuccess({
        title: result.isOffline
          ? 'SAVED LOCALLY — PENDING SUBMISSION'
          : 'ATTENDANCE SUBMITTED SUCCESSFULLY!',
        message: result.subMessage ||
          'Your Sunday Service attendance records have been saved and are available in the Admin Portal.',
        isOffline: result.isOffline,
        date: selectedDate,
        presentCount: stats.presentCount,
        absentCount: stats.absentCount,
        excusedCount: stats.excusedCount,
      });

      setIsConfirmModalOpen(false);
      setIsSubmitting(false);

      // ========================================================
      // RESET THE ATTENDANCE ROSTER AFTER SUCCESSFUL SUBMISSION
      // Automatically clear current attendance selections so the form is ready for the next attendance record.
      // Clear temporary form data belonging only to the completed submission.
      // Prevent the previous attendance selections from being accidentally submitted again.
      // Keep all successfully submitted attendance records safely stored in the database.
      // ========================================================
      setSubmittedSessionIds((prev) => ({ ...prev, [sessionId]: true }));
      setLoadedForEditingSessionId(null);
      setDraftRecords({});
      setIsFormDirty(false);
      setSearchQuery('');
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmissionError(err.message || 'An unexpected error occurred during attendance submission.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Official Church Branding Banner on Record Attendance Book Page */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border-2 border-yellow-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

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
                <span>Official Attendance Book Register</span>
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
                  Sunday Service Attendance Roster & Headcount
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition cursor-pointer"
                title="Return to Home Screen"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home Page</span>
              </button>
            )}

            <button
              onClick={() => {
                const sessionForCsv: AttendanceSession = {
                  id: sessionId,
                  serviceId: selectedServiceId,
                  serviceName: 'Sunday Service',
                  date: selectedDate,
                  records: draftRecords,
                  lastUpdated: new Date().toISOString(),
                };
                exportAttendanceToCsv(sessionForCsv, members);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition cursor-pointer"
              title="Download CSV register"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register Visitor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submission Success Alert Banner */}
      {submissionSuccess && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-400 rounded-3xl shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-emerald-950">
                    {submissionSuccess.title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-extrabold text-[11px] uppercase">
                    {submissionSuccess.isOffline ? 'Pending Sync' : 'Verified in Database'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-semibold mt-1">
                  {submissionSuccess.message}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-emerald-900">
                  <span className="font-bold">Service: Sunday Service</span>
                  <span>•</span>
                  <span>Date: {submissionSuccess.date}</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-700">
                    {submissionSuccess.presentCount} Present
                  </span>
                  <span>•</span>
                  <span className="font-bold text-amber-700">
                    {submissionSuccess.excusedCount} Excused
                  </span>
                  <span>•</span>
                  <span className="font-bold text-red-700">
                    {submissionSuccess.absentCount} Absent
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubmissionSuccess(null)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 text-yellow-300 font-black text-xs hover:bg-emerald-900 transition cursor-pointer shrink-0 self-end sm:self-center"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Service Selector & Date Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Service Selector: Sunday Service Exclusively */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-blue-950 uppercase mb-1.5 flex items-center gap-1.5">
              <span>Church Service:</span>
              <span className="text-[10px] bg-yellow-400 text-blue-950 px-2 py-0.5 rounded-md font-black">
                SUNDAY SERVICE
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 sm:py-3 bg-blue-50/70 border-2 border-blue-300 hover:border-blue-500 rounded-xl text-sm font-black text-blue-950 appearance-none outline-none focus:ring-2 focus:ring-blue-600 transition"
              >
                <option value="srv-sunday">
                  Sunday Service (08:30 AM - 11:30 AM)
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-blue-900">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Date Picker with Service Date Prev/Next Controls */}
          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-blue-950 uppercase">
                Attendance Date:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Move to previous service date"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Move to next service date"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Date buttons */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="w-full py-2.5 sm:py-3 px-3 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-xs transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const day = d.getDay();
                d.setDate(d.getDate() - day);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="w-full py-2.5 sm:py-3 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs transition shadow-xs cursor-pointer"
            >
              This Sunday
            </button>
          </div>
        </div>

        {/* Current Session Database Status Indicator */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-600">Roster Session Status:</span>
            {currentSubmissionStatus === 'submitted' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submitted to Database</span>
              </span>
            )}
            {currentSubmissionStatus === 'pending_submission' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold">
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Submission (Offline Queue)</span>
              </span>
            )}
            {currentSubmissionStatus === 'draft' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Draft — Click &ldquo;SUBMIT ATTENDANCE&rdquo; to save</span>
              </span>
            )}
            {currentSubmissionStatus === 'ready' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                <span>Ready for Attendance Marking</span>
              </span>
            )}
          </div>

          {existingSession?.submittedAt && (
            <span className="text-[11px] text-gray-500">
              Last saved: {new Date(existingSession.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {existingSession.submittedBy || 'Admin'}
            </span>
          )}
        </div>
      </div>

      {/* Live Attendance Statistics Cards (Present, Absent, Excused) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* PRESENT */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-emerald-400 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>PRESENT</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
            {stats.presentCount}
          </div>
          <div className="text-[11px] font-semibold text-emerald-800/80 mt-0.5">
            {stats.rate}% Attendance
          </div>
        </div>

        {/* EXCUSED */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-400 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>EXCUSED</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
            {stats.excusedCount}
          </div>
          <div className="text-[11px] font-semibold text-amber-900/80 mt-0.5">
            Officially Notified
          </div>
        </div>

        {/* ABSENT */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-red-300 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-red-800">
            <span>ABSENT</span>
            <UserX className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1">
            {stats.absentCount}
          </div>
          <div className="text-[11px] font-semibold text-red-800/80 mt-0.5">
            Marked absent
          </div>
        </div>

        {/* UNMARKED */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-300 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>UNMARKED</span>
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-800 mt-1">
            {stats.unmarkedCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Awaiting check-in</div>
        </div>

        {/* TOTAL CONGREGATION */}
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span>TOTAL ROLL</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">Active members</div>
        </div>

        {/* VISITORS */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-yellow-400 bg-yellow-50/40 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-950">
            <span>VISITORS</span>
            <Sparkles className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-yellow-950 mt-1">
            {stats.visitorsCount}
          </div>
          <div className="text-[11px] font-bold text-yellow-800 mt-0.5">First-Timers</div>
        </div>
      </div>

      {/* Voice Input Search Bar in RECORD ATTENDANCE BOOK */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-extrabold text-blue-950 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            Member Voice & Text Search for Quick Check-in
          </h3>
          <span className="text-xs text-gray-500">
            Showing {filteredMembers.length} of {members.length} members
          </span>
        </div>

        <VoiceSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Speak or type member name, ID (e.g. HOP-MK-001), or phone to check in..."
          sectionName="RECORD ATTENDANCE BOOK"
        />

        {/* Quick Filter Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-blue-900 text-yellow-300 shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setFilterStatus('present')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'present'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Present ({stats.presentCount})
            </button>
            <button
              onClick={() => setFilterStatus('excused')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'excused'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Excused ({stats.excusedCount})
            </button>
            <button
              onClick={() => setFilterStatus('absent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'absent'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Absent ({stats.absentCount})
            </button>
            <button
              onClick={() => setFilterStatus('unmarked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                filterStatus === 'unmarked'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unmarked ({stats.unmarkedCount})
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Ministry:</span>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none"
            >
              <option value="All">All Departments</option>
              <option value="General Congregation">General Congregation</option>
              <option value="Pastoral Board & Leadership">Pastoral Board & Leadership</option>
              <option value="Choir & Praise Team">Choir & Praise Team</option>
              <option value="Ushers & Protocol">Ushers & Protocol</option>
              <option value="Men of Power Fellowship">Men of Power Fellowship</option>
              <option value="Women of Grace Ministry">Women of Grace Ministry</option>
              <option value="Youth & Campus Ministry">Youth & Campus Ministry</option>
              <option value="Children Sunday School">Children Sunday School</option>
              <option value="Media & Sound Ministry">Media & Sound Ministry</option>
              <option value="Prayer Warriors & Intercessors">Prayer Warriors & Intercessors</option>
              <option value="Evangelism & Follow-up">Evangelism & Follow-up</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      {lastMarkedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-950 text-yellow-300 px-4 py-3 rounded-2xl shadow-2xl border-2 border-yellow-400 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{lastMarkedNotification}</span>
        </div>
      )}

      {/* Congregation Attendance Roster Table */}
      <div className="bg-white rounded-3xl shadow-md border-2 border-blue-200 overflow-hidden">
        {/* Roster Header with CLEARLY VISIBLE SUBMIT ATTENDANCE BUTTON */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 via-blue-50/40 to-yellow-50/30 border-b-2 border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-black text-sm sm:text-base text-blue-950 uppercase tracking-tight">
              Attendance Roster
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold">
              Sunday Service • {selectedDate}
            </span>
          </div>

          {/* Action Buttons with Prominent SUBMIT ATTENDANCE Button */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
            {/* Bulk helper buttons */}
            <button
              type="button"
              onClick={() => setBulkActionConfirm('markAllPresent')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkActionConfirm('clear')}
              className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition cursor-pointer"
            >
              <span>Clear Selections</span>
            </button>

            {existingSession?.submissionStatus === 'submitted' && Object.keys(draftRecords).length === 0 && (
              <button
                type="button"
                onClick={handleLoadSavedRecords}
                className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Load previously saved attendance records to view or make edits"
              >
                <span>Edit Submitted Record</span>
              </button>
            )}

            {/* ======================================================== */}
            {/* 1. ATTENDANCE ROSTER — CLEARLY VISIBLE SUBMIT BUTTON */}
            {/* ======================================================== */}
            <button
              type="button"
              onClick={handleOpenSubmitConfirmation}
              disabled={isSubmitting || Object.keys(draftRecords).length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-95 text-yellow-300 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg border-2 border-yellow-400 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title={
                Object.keys(draftRecords).length === 0
                  ? 'Mark members as Present, Absent, or Excused to submit attendance'
                  : 'Click to officially submit marked Sunday Service attendance to database'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-yellow-400" />
                  <span>SUBMIT ATTENDANCE</span>
                  <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-blue-950 text-[10px] font-black">
                    {stats.markedTotal} Marked
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bulk Confirmation Warning Banner */}
        {bulkActionConfirm && (
          <div className="p-4 bg-yellow-50 border-b-2 border-yellow-300 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold text-yellow-950">
              <AlertTriangle className="w-4 h-4 text-yellow-700" />
              <span>
                {bulkActionConfirm === 'markAllPresent'
                  ? 'Confirm: Mark all active congregation members as PRESENT for Sunday Service?'
                  : 'Confirm: Clear all marked attendance selections for this session?'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkActionConfirm(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (bulkActionConfirm === 'markAllPresent') executeMarkAll('present');
                  else executeClearSelections();
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-900 text-yellow-300 font-extrabold text-xs hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                {bulkActionConfirm === 'markAllPresent' ? 'Yes, Mark All' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-2 stroke-1" />
            <p className="font-bold text-base text-gray-700">No matching members found</p>
            <p className="text-xs text-gray-500 mt-1">
              Try searching with voice input (speak name or ID) or clear your filter
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMembers.map((member) => {
              const record = draftRecords[member.memberId];
              const isPresent = record?.status === 'present';
              const isExcused = record?.status === 'excused';
              const isAbsent = record?.status === 'absent';

              return (
                <div
                  key={member.id}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isPresent
                      ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                      : isExcused
                      ? 'bg-amber-50/40 hover:bg-amber-50/70'
                      : isAbsent
                      ? 'bg-red-50/20 hover:bg-red-50/40'
                      : 'hover:bg-blue-50/30'
                  }`}
                >
                  {/* Member Details */}
                  <div className="flex items-start gap-3">
                    {/* Status Badge Circle */}
                    <div
                      onClick={() => setMemberAttendanceStatus(member.memberId, 'present')}
                      className={`w-11 h-11 min-w-11 rounded-2xl flex items-center justify-center font-bold cursor-pointer transition-all ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                          : isExcused
                          ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                          : isAbsent
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={
                        isPresent
                          ? 'Marked Present'
                          : isExcused
                          ? 'Marked Excused'
                          : isAbsent
                          ? 'Marked Absent'
                          : 'Unmarked (Click to check in)'
                      }
                    >
                      {isPresent ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : isExcused ? (
                        <Clock className="w-5 h-5" />
                      ) : isAbsent ? (
                        <X className="w-6 h-6 stroke-[3]" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-blue-950">
                          {member.fullName}
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900">
                          {member.memberId}
                        </span>

                        {member.status === 'Visitor / First Timer' && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-blue-950 font-black text-[10px] uppercase shadow-xs">
                            Visitor
                          </span>
                        )}

                        {member.status === 'Church Executive / Pastor' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[10px] uppercase">
                            Executive
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="font-medium text-blue-900/80">{member.department}</span>
                        <span>•</span>
                        <span>{member.residentialArea}</span>
                        <span>•</span>
                        {normalizeGhanaPhone(member.phone) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <a
                              href={`tel:${normalizeGhanaPhone(member.phone)}`}
                              className="font-bold text-blue-900 hover:text-yellow-600 underline inline-flex items-center gap-1"
                              title={`Call ${member.fullName} (${member.phone})`}
                            >
                              <Phone className="w-3 h-3 text-blue-700" />
                              <span>{member.phone}</span>
                            </a>
                            <a
                              href={`sms:${normalizeGhanaPhone(member.phone)}`}
                              className="px-1.5 py-0.2 rounded-md bg-yellow-300 hover:bg-yellow-400 text-blue-950 font-bold text-[10px] inline-flex items-center gap-0.5"
                              title={`SMS to ${member.fullName}`}
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>SMS</span>
                            </a>
                          </span>
                        ) : (
                          <span>{member.phone && member.phone !== 'N/A' ? member.phone : 'No phone number available.'}</span>
                        )}
                        {record?.timestamp && (
                          <>
                            <span>•</span>
                            <span className="text-gray-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Recorded at {record.timestamp}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 Touch-Friendly Attendance Action Buttons: PRESENT, ABSENT, EXCUSED */}
                  <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
                    {/* PRESENT Button */}
                    <button
                      type="button"
                      onClick={() => setMemberAttendanceStatus(member.memberId, 'present')}
                      className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-95 ${
                        isPresent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{isPresent ? 'PRESENT' : 'Present'}</span>
                    </button>

                    {/* EXCUSED Button */}
                    <button
                      type="button"
                      onClick={() => setMemberAttendanceStatus(member.memberId, 'excused')}
                      className={`px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-95 ${
                        isExcused
                          ? 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isExcused ? 'EXCUSED' : 'Excused'}</span>
                    </button>

                    {/* ABSENT Button */}
                    <button
                      type="button"
                      onClick={() => setMemberAttendanceStatus(member.memberId, 'absent')}
                      className={`px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs touch-manipulation cursor-pointer active:scale-95 ${
                        isAbsent
                          ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-700'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span>{isAbsent ? 'ABSENT' : 'Absent'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Submission Action Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white border-t-2 border-yellow-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-black">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-yellow-300">
                Sunday Service Attendance Register Review
              </p>
              <p className="text-xs text-blue-200">
                {stats.presentCount} Present • {stats.excusedCount} Excused • {stats.absentCount} Absent • {stats.unmarkedCount} Unmarked
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenSubmitConfirmation}
            disabled={isSubmitting || Object.keys(draftRecords).length === 0}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-blue-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title={
              Object.keys(draftRecords).length === 0
                ? 'Mark members as Present, Absent, or Excused before submitting'
                : 'Click to officially submit marked Sunday Service attendance to database'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-950" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-blue-950" />
                <span>SUBMIT ATTENDANCE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CONFIRMATION DIALOG MODAL (Step 7 & 8) */}
      {/* Display a confirmation dialog showing the attendance date, service, and number of records to submit */}
      {/* ======================================================== */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight">
                    Confirm Attendance Submission
                  </h3>
                  <span className="text-[11px] text-yellow-300 font-semibold">
                    House of Power of Ministry, Mankessim
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {submissionError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{submissionError}</span>
                </div>
              )}

              <p className="text-xs text-gray-600">
                Please review your Sunday Service attendance summary before saving to the central church database:
              </p>

              {/* Service & Date Card */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">Church Service:</span>
                  <span className="font-black text-blue-950 text-sm">
                    Sunday Service
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">Attendance Date:</span>
                  <span className="font-black text-blue-950">
                    {selectedDate}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold">Total Congregation Roll:</span>
                  <span className="font-bold text-gray-900">{stats.total} members</span>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
                  <span className="text-[10px] font-bold text-emerald-800 block">PRESENT</span>
                  <span className="text-xl font-black text-emerald-700">{stats.presentCount}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300">
                  <span className="text-[10px] font-bold text-amber-900 block">EXCUSED</span>
                  <span className="text-xl font-black text-amber-700">{stats.excusedCount}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-300">
                  <span className="text-[10px] font-bold text-red-800 block">ABSENT</span>
                  <span className="text-xl font-black text-red-700">{stats.absentCount}</span>
                </div>
              </div>

              {stats.unmarkedCount > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>
                    {stats.unmarkedCount} member(s) are currently unmarked and will remain unrecorded.
                  </span>
                </div>
              )}

              <p className="text-[11px] text-blue-950/80 font-medium">
                Upon confirmation, this official attendance register will be saved to the database and become immediately available in the Admin Portal and Attendance Reports.
              </p>

              {/* Dialog Buttons */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-95 text-yellow-300 font-black text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-2 border-yellow-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                      <span>Saving Records...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-yellow-400" />
                      <span>Confirm & Submit Attendance</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Quick Visitor registration */}
      <QuickVisitorModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        onAddAndCheckIn={handleAddVisitorAndCheckIn}
        existingCount={members.length}
      />
    </div>
  );
};
