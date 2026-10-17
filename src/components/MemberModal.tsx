import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Save,
  Check,
  User,
  Phone,
  MapPin,
  Tag,
  AlertTriangle,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ChurchMember, Gender, AgeGroup, Department, MembershipStatus } from '../types';
import { generateNextMemberId, isMemberIdUnique } from '../utils/memberId';
import { registerMemberApi } from '../utils/storage';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: ChurchMember) => void;
  editingMember?: ChurchMember | null;
  existingCount: number;
  existingMembers?: ChurchMember[];
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMember,
  existingCount,
  existingMembers = [],
}) => {
  const [fullName, setFullName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [department, setDepartment] = useState<Department>('General Congregation');
  const [residentialArea, setResidentialArea] = useState('');
  const [status, setStatus] = useState<MembershipStatus>('Active Member');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingMember: ChurchMember;
    pendingMember: ChurchMember;
  } | null>(null);

  // View existing member detail modal
  const [viewingExisting, setViewingExisting] = useState<ChurchMember | null>(null);

  useEffect(() => {
    if (editingMember) {
      setFullName(editingMember.fullName);
      setMemberId(editingMember.memberId);
      setPhone(editingMember.phone);
      setGender(editingMember.gender);
      setAgeGroup(editingMember.ageGroup);
      setDepartment(editingMember.department);
      setResidentialArea(editingMember.residentialArea);
      setStatus(editingMember.status);
      setNotes(editingMember.notes || '');
    } else {
      // Auto generate next sequential ID
      const nextId = existingMembers && existingMembers.length > 0
        ? generateNextMemberId(existingMembers)
        : `HOP-MK-${String(existingCount + 1).padStart(3, '0')}`;
      setFullName('');
      setMemberId(nextId);
      setPhone('');
      setGender('Male');
      setAgeGroup('Adult');
      setDepartment('General Congregation');
      setResidentialArea('Mankessim Central');
      setStatus('Active Member');
      setNotes('');
    }
    setError(null);
    setDuplicateWarning(null);
    setViewingExisting(null);
  }, [editingMember, existingCount, existingMembers, isOpen]);

  if (!isOpen) return null;

  const executeSaveNewMember = async (memberToSave: ChurchMember, allowDuplicateName = false) => {
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

      // Verified save in database
      const finalMember = result.member || memberToSave;
      onSave(finalMember);
      setIsSubmitting(false);
      setDuplicateWarning(null);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to save member to database.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      setError('Full member name is required');
      return;
    }
    if (!memberId.trim()) {
      setError('Member ID is required');
      return;
    }

    const canonicalId = memberId.trim().toUpperCase();

    if (existingMembers && !isMemberIdUnique(canonicalId, existingMembers, editingMember?.memberId)) {
      setError(`Member ID "${canonicalId}" is already assigned to another member.`);
      return;
    }

    const memberData: ChurchMember = {
      id: editingMember ? editingMember.id : `mem-${Date.now()}`,
      memberId: canonicalId,
      fullName: fullName.trim(),
      phone: phone.trim() || 'N/A',
      gender,
      ageGroup,
      department,
      residentialArea: residentialArea.trim() || 'Mankessim Central',
      status,
      joinedDate: editingMember ? editingMember.joinedDate : new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
    };

    if (editingMember) {
      // Direct update for existing member
      setIsSubmitting(true);
      try {
        await onSave(memberData);
        setIsSubmitting(false);
        onClose();
      } catch {
        setIsSubmitting(false);
      }
    } else {
      // New member registration with atomic database check & saving
      executeSaveNewMember(memberData, false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-400 text-blue-950 font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editingMember ? 'Edit Church Member' : 'Register New Congregation Member'}
              </h2>
              <p className="text-xs text-blue-200">
                House of Power of Ministry International Church, Mankessim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Member Warning Panel */}
        {duplicateWarning && (
          <div className="p-5 bg-yellow-50 border-b-2 border-yellow-300 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-yellow-500 text-blue-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-yellow-950 uppercase">
                  POSSIBLE DUPLICATE MEMBER DETECTED
                </h4>
                <p className="text-xs text-yellow-900 font-medium mt-0.5">
                  A member with that name or contact information already exists in the database.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-yellow-300 text-xs text-blue-950 mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Existing Member:</span>
                <span className="font-extrabold">{duplicateWarning.existingMember.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Member ID:</span>
                <span className="font-mono font-bold text-blue-900">{duplicateWarning.existingMember.memberId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Phone Number:</span>
                <span>{duplicateWarning.existingMember.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Department:</span>
                <span>{duplicateWarning.existingMember.department}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setViewingExisting(duplicateWarning.existingMember)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-blue-950 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-700" />
                <span>View Existing Record</span>
              </button>

              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancel Registration
              </button>

              <button
                type="button"
                onClick={() => executeSaveNewMember(duplicateWarning.pendingMember, true)}
                className="px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black cursor-pointer shadow-sm"
              >
                Proceed (Different Person) →
              </button>
            </div>
          </div>
        )}

        {/* View Details Sub-Modal */}
        {viewingExisting && (
          <div className="p-4 bg-blue-950 text-white border-b-2 border-yellow-400 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-yellow-400 uppercase text-[10px]">
                Full Record of Registered Member
              </span>
              <button
                type="button"
                onClick={() => setViewingExisting(null)}
                className="text-blue-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="font-black text-sm text-white">{viewingExisting.fullName} ({viewingExisting.memberId})</p>
            <p className="text-blue-200">
              Phone: {viewingExisting.phone} • Dept: {viewingExisting.department} • Area: {viewingExisting.residentialArea}
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Brother Samuel Kwesi Arthur"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Unique Member ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. HOP-MK-019"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0244123456"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Residential Area in Mankessim
              </label>
              <input
                type="text"
                value={residentialArea}
                onChange={(e) => setResidentialArea(e.target.value)}
                placeholder="e.g. Edumadze, Twafo, Roman Hospital"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Children">Children</option>
                <option value="Youth">Youth</option>
                <option value="Adult">Adult</option>
                <option value="Elder">Elder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Active Member">Active Member</option>
                <option value="Visitor / First Timer">Visitor / First Timer</option>
                <option value="Church Executive / Pastor">Church Executive / Pastor</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Department / Fellowship Ministry
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
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
              <option value="General Congregation">General Congregation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Spiritual Care Info</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Baptized, plays drums, prayer request, invited by..."
              rows={2}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-98 text-yellow-300 font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-2 border-yellow-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-yellow-400" />
                  <span>{editingMember ? 'Update Member' : 'Register Member'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
