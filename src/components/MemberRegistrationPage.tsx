import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Save,
  Check,
  User,
  Phone,
  MapPin,
  Tag,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { ChurchMember, Gender, AgeGroup, Department, MembershipStatus } from '../types';
import { generateNextMemberId, isMemberIdUnique } from '../utils/memberId';
import { registerMemberApi } from '../utils/storage';

interface MemberRegistrationPageProps {
  onSave: (member: ChurchMember) => void;
  existingCount: number;
  existingMembers?: ChurchMember[];
  onNavigateTo: (page: any) => void;
  setHasUnsavedChanges: (val: boolean) => void;
}

export const MemberRegistrationPage: React.FC<MemberRegistrationPageProps> = ({
  onSave,
  existingCount,
  existingMembers = [],
  onNavigateTo,
  setHasUnsavedChanges,
}) => {
  const initialId = existingMembers.length > 0
    ? generateNextMemberId(existingMembers)
    : `HOP-MK-${String(existingCount + 1).padStart(3, '0')}`;

  const [fullName, setFullName] = useState('');
  const [memberId, setMemberId] = useState(initialId);
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [department, setDepartment] = useState<Department>('General Congregation');
  const [residentialArea, setResidentialArea] = useState('Mankessim Central');
  const [status, setStatus] = useState<MembershipStatus>('Active Member');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Submission & Dialog States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{
    title: string;
    subtitle: string;
    member: ChurchMember;
  } | null>(null);

  // Duplicate Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingMember: ChurchMember;
    pendingMember: ChurchMember;
  } | null>(null);

  // View Existing Member Details Modal
  const [viewingExistingMember, setViewingExistingMember] = useState<ChurchMember | null>(null);

  // Synchronize next sequential ID if members list updates
  useEffect(() => {
    if (existingMembers && existingMembers.length > 0) {
      setMemberId(generateNextMemberId(existingMembers));
    } else {
      const nextNum = String(existingCount + 1).padStart(3, '0');
      setMemberId(`HOP-MK-${nextNum}`);
    }
  }, [existingMembers, existingCount]);

  // Track unsaved form edits
  useEffect(() => {
    const isDirty = Boolean(fullName.trim() || phone.trim() || notes.trim());
    setHasUnsavedChanges(isDirty);
    return () => setHasUnsavedChanges(false);
  }, [fullName, phone, notes, setHasUnsavedChanges]);

  // Execute registration with automatic saving to database
  const executeRegistration = async (memberToSave: ChurchMember, allowDuplicateName = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerMemberApi(memberToSave, allowDuplicateName);

      if (result.duplicateWarning && result.existingMember) {
        setIsSubmitting(false);
        setDuplicateWarning({
          existingMember: result.existingMember,
          pendingMember: memberToSave,
        });
        return;
      }

      if (!result.success) {
        setIsSubmitting(false);
        setError(result.message || 'Registration failed. Please verify your details.');
        return;
      }

      // Verified save by authoritative database!
      const finalMember = result.member || memberToSave;
      onSave(finalMember);
      setHasUnsavedChanges(false);

      // Display official success message
      setSuccessNotice({
        title: 'MEMBER REGISTERED SUCCESSFULLY!',
        subtitle: result.subMessage || 'Your member has been registered and saved successfully.',
        member: finalMember,
      });

      // Automatically reset form so administrator can register another member
      setFullName('');
      setPhone('');
      setNotes('');
      setResidentialArea('Mankessim Central');
      setGender('Male');
      setAgeGroup('Adult');
      setDepartment('General Congregation');
      setStatus('Active Member');

      // Next sequential ID
      const updatedList = [finalMember, ...existingMembers];
      setMemberId(generateNextMemberId(updatedList));
      setIsSubmitting(false);
      setDuplicateWarning(null);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to complete member registration.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      setError('Full member name is required.');
      return;
    }

    if (!memberId.trim()) {
      setError('Unique Church Member ID is required.');
      return;
    }

    const canonicalId = memberId.trim().toUpperCase();

    // Primary key check
    if (existingMembers && !isMemberIdUnique(canonicalId, existingMembers)) {
      setError(`Member ID "${canonicalId}" is already assigned to an existing member. Please use a unique Member ID.`);
      return;
    }

    const newMember: ChurchMember = {
      id: `mem-${Date.now()}`,
      memberId: canonicalId,
      fullName: fullName.trim(),
      phone: phone.trim() || 'N/A',
      gender,
      ageGroup,
      department,
      residentialArea: residentialArea.trim() || 'Mankessim Central',
      status,
      joinedDate: new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
    };

    executeRegistration(newMember, false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border-2 border-yellow-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-yellow-400 tracking-wider">
              Administration • Member Registration
            </span>
            <h2 className="text-xl sm:text-2xl font-black">Register Congregation Member</h2>
            <p className="text-xs text-blue-200">
              House of Power of Ministry International Church, Mankessim
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTo('member-directory')}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 self-start border border-white/20 transition cursor-pointer"
        >
          <Users className="w-4 h-4 text-yellow-300" />
          <span>View Directory ({existingCount})</span>
        </button>
      </div>

      {/* Registration Card */}
      <div className="bg-white rounded-3xl shadow-md border-2 border-blue-200 p-6 sm:p-8">
        {error && (
          <div className="p-4 mb-5 bg-red-50 border-2 border-red-200 text-red-800 text-xs rounded-2xl flex items-start gap-3 font-semibold animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm">Registration Incomplete</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successNotice && (
          <div className="p-5 mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg text-emerald-900 tracking-tight">
                    {successNotice.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded-full uppercase">
                    Saved to Database
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1 font-medium">
                  {successNotice.subtitle}
                </p>
                <div className="mt-3 p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-950">
                      {successNotice.member.fullName}
                    </span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px]">
                      {successNotice.member.memberId}
                    </span>
                    <span className="text-gray-500">• {successNotice.member.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTo('member-directory')}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-yellow-300 font-bold text-xs transition cursor-pointer"
                    >
                      View in Directory →
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTo('attendance-book')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Attendance Roster →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Full Member Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Deacon Kwame Osei"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 rounded-xl text-sm font-bold text-blue-950 focus:bg-white outline-none transition disabled:opacity-60"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Unique Church Member ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-yellow-600 font-bold text-xs">
                  #
                </div>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="e.g. HOP-MK-005"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 rounded-xl text-sm font-black text-blue-950 focus:bg-white outline-none uppercase tracking-wider transition disabled:opacity-60 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0244123890"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 rounded-xl text-sm font-medium focus:bg-white outline-none transition disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Residential Neighborhood in Mankessim
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={residentialArea}
                  onChange={(e) => setResidentialArea(e.target.value)}
                  placeholder="e.g. Mankessim Central, Edumadze, Twafo"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 focus:border-blue-600 rounded-xl text-sm font-medium focus:bg-white outline-none transition disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-60"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-60"
              >
                <option value="Adult">Adult</option>
                <option value="Youth">Youth</option>
                <option value="Children">Children</option>
                <option value="Elder">Elder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">Membership Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-60"
              >
                <option value="Active Member">Active Member</option>
                <option value="Visitor / First Timer">Visitor / First Timer</option>
                <option value="Church Executive / Pastor">Church Executive / Pastor</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              Ministry / Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-60"
            >
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

          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">Spiritual Care & Pastoral Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Baptized, plays bass guitar, prayer request..."
              rows={2}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none resize-none transition disabled:opacity-60"
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
            <span className="text-[11px] text-gray-500 font-medium text-center sm:text-left">
              Registration automatically saves to the persistent church database upon submission.
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => onNavigateTo('member-directory')}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-98 text-yellow-300 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-2 border-yellow-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-yellow-400" />
                    <span>REGISTER MEMBER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: POSSIBLE DUPLICATE MEMBER WARNING MODAL */}
      {/* ======================================================== */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
            {/* Warning Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-4 text-blue-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950 text-yellow-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight">
                    POSSIBLE DUPLICATE MEMBER
                  </h3>
                  <span className="text-[11px] font-bold text-blue-950/80">
                    Duplicate Verification Check
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="p-1 rounded-lg text-blue-950 hover:bg-black/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-yellow-50 border border-yellow-300 rounded-2xl text-xs text-yellow-950 font-medium">
                <p className="font-bold text-sm text-yellow-900 mb-1">
                  A member with that name or contact information already exists in the database.
                </p>
                <p>
                  Please review the existing church member record before proceeding. You can view their details, cancel registration, or confirm this is a different individual with the same name.
                </p>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                    Existing Registered Member
                  </span>
                  <p className="font-black text-blue-950 text-sm">
                    {duplicateWarning.existingMember.fullName}
                  </p>
                  <p className="font-mono text-xs font-bold text-blue-800">
                    ID: {duplicateWarning.existingMember.memberId}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Phone: {duplicateWarning.existingMember.phone}
                  </p>
                  <p className="text-gray-600">
                    Dept: {duplicateWarning.existingMember.department}
                  </p>
                  <p className="text-gray-600">
                    Area: {duplicateWarning.existingMember.residentialArea}
                  </p>
                </div>

                <div className="p-3.5 bg-blue-50/70 rounded-2xl border-2 border-blue-300">
                  <span className="text-[10px] font-black uppercase text-blue-800 block mb-1">
                    New Member Being Registered
                  </span>
                  <p className="font-black text-blue-950 text-sm">
                    {duplicateWarning.pendingMember.fullName}
                  </p>
                  <p className="font-mono text-xs font-bold text-blue-800">
                    ID: {duplicateWarning.pendingMember.memberId}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Phone: {duplicateWarning.pendingMember.phone}
                  </p>
                  <p className="text-gray-600">
                    Dept: {duplicateWarning.pendingMember.department}
                  </p>
                  <p className="text-gray-600">
                    Area: {duplicateWarning.pendingMember.residentialArea}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                Note: In church congregations, two different people may share the same name (e.g., father & son, or different individuals). If this is a genuinely different person, you may continue registration.
              </p>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewingExistingMember(duplicateWarning.existingMember);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-blue-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-700" />
                  <span>View Existing Member</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel Registration
                </button>

                <button
                  type="button"
                  onClick={() => executeRegistration(duplicateWarning.pendingMember, true)}
                  className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-xs transition cursor-pointer shadow-md"
                >
                  Continue Registration (Different Person) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: VIEW EXISTING MEMBER DETAILS MODAL */}
      {/* ======================================================== */}
      {viewingExistingMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-blue-900 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-blue-950 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                  Existing Member Record
                </span>
                <h4 className="font-black text-base">{viewingExistingMember.fullName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingExistingMember(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-gray-500 font-bold block">Member ID:</span>
                  <span className="font-mono font-black text-blue-950 text-sm">
                    {viewingExistingMember.memberId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block">Status:</span>
                  <span className="font-bold text-emerald-800">
                    {viewingExistingMember.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block">Phone:</span>
                  <span className="font-bold text-gray-900">{viewingExistingMember.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block">Department:</span>
                  <span className="font-bold text-gray-900">
                    {viewingExistingMember.department}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block">Location:</span>
                  <span className="font-bold text-gray-900">
                    {viewingExistingMember.residentialArea}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-bold block">Joined Date:</span>
                  <span className="font-bold text-gray-900">
                    {viewingExistingMember.joinedDate}
                  </span>
                </div>
              </div>

              {viewingExistingMember.notes && (
                <div className="p-3 bg-blue-50/50 rounded-xl text-gray-700">
                  <span className="font-bold block text-blue-950 mb-0.5">Notes:</span>
                  <span>{viewingExistingMember.notes}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingExistingMember(null)}
                  className="px-4 py-2 rounded-xl bg-blue-950 text-yellow-300 font-bold text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
