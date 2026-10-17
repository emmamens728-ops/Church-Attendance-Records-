import React, { useState } from 'react';
import { X, Lock, ShieldCheck, CheckCircle2, User, KeyRound } from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { UserRole, UserSession } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
  onOpenLogoModal: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenLogoModal,
}) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setUsername('church_admin');
      setPassword('admin123');
    } else if (selectedRole === 'pastor') {
      setUsername('rev_mensah');
      setPassword('pastor123');
    } else if (selectedRole === 'usher') {
      setUsername('usher_protocol');
      setPassword('usher123');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter username');
      return;
    }

    if (!password) {
      setError('Please enter password or PIN');
      return;
    }

    // Determine full name
    let fullName = 'Administrator';
    if (role === 'pastor') fullName = 'Rev. Emmanuel Kofi Mensah';
    if (role === 'usher') fullName = 'Deaconess Sarah (Attendance Usher)';
    if (username.toLowerCase().includes('admin')) fullName = 'Church Administrator';

    onLoginSuccess({
      isLoggedIn: true,
      username,
      role,
      fullName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header with Deep Blue & Yellow Accent */}
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 px-6 pt-6 pb-5 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prominent Official Logo on Admin Login */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div onClick={onOpenLogoModal} className="cursor-pointer" title="Click to customize church logo">
              <ChurchLogo size="lg" showUploadButton={false} />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-white mt-1">
              HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
            </h2>
            <div className="inline-block bg-yellow-400 text-blue-950 text-xs font-black px-2.5 py-0.5 rounded-md shadow-xs">
              LOCATION: MANKESSIM
            </div>
            <p className="text-xs text-blue-200 mt-0.5 font-medium">
              Administrative & Attendance Access Portal
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Role Switcher */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Select Your Access Role:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin')}
                  className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                    role === 'admin'
                      ? 'bg-blue-900 text-yellow-300 border-yellow-400 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('pastor')}
                  className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                    role === 'pastor'
                      ? 'bg-blue-900 text-yellow-300 border-yellow-400 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Pastor
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('usher')}
                  className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                    role === 'usher'
                      ? 'bg-blue-900 text-yellow-300 border-yellow-400 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Usher / Protocol
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Username / ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password / Security PIN</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-yellow-400" />
              <span>Login to Church Portal</span>
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="mt-4 p-3 bg-yellow-50/70 border border-yellow-200 rounded-xl text-[11px] text-yellow-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-700 shrink-0" />
            <span>
              Authorized church officials only. Quick login credentials for testing: admin / admin123
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
