import React, { useState } from 'react';
import { X, UserCheck, Sparkles, HeartHandshake } from 'lucide-react';
import { ChurchMember, Gender, AgeGroup } from '../types';

interface QuickVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAndCheckIn: (member: ChurchMember) => void;
  existingCount: number;
}

export const QuickVisitorModal: React.FC<QuickVisitorModalProps> = ({
  isOpen,
  onClose,
  onAddAndCheckIn,
  existingCount,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('Female');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [residentialArea, setResidentialArea] = useState('Mankessim');
  const [invitedBy, setInvitedBy] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const nextNum = String(existingCount + 1).padStart(3, '0');
    const newVisitor: ChurchMember = {
      id: `vis-${Date.now()}`,
      memberId: `HOP-VIS-${nextNum}`,
      fullName: fullName.trim(),
      phone: phone.trim() || 'N/A',
      gender,
      ageGroup,
      department: 'General Congregation',
      residentialArea: residentialArea.trim() || 'Mankessim',
      status: 'Visitor / First Timer',
      joinedDate: new Date().toISOString().slice(0, 10),
      notes: invitedBy.trim() ? `Invited by ${invitedBy.trim()}` : 'First time visitor',
    };

    onAddAndCheckIn(newVisitor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400 text-blue-950 font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Quick Register First-Timer</h3>
              <p className="text-xs text-yellow-300">
                Welcome to House of Power of Ministry Int. Church
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-blue-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Visitor / First Timer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sister Mercy Asare"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024XXXXXXX"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Area in Mankessim</label>
              <input
                type="text"
                value={residentialArea}
                onChange={(e) => setResidentialArea(e.target.value)}
                placeholder="e.g. Market Circle"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Age Group</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Adult">Adult</option>
                <option value="Youth">Youth</option>
                <option value="Children">Children</option>
                <option value="Elder">Elder</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Invited By / Notes</label>
            <input
              type="text"
              value={invitedBy}
              onChange={(e) => setInvitedBy(e.target.value)}
              placeholder="e.g. Invited by Brother Baidoo"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Register & Check-In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
