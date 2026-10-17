import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';

interface PasswordResetPageProps {
  onResetSuccess: () => void;
  onGoToLogin: () => void;
  onOpenLogoModal: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  onResetSuccess,
  onGoToLogin,
  onOpenLogoModal,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your administrator username or email.');
      return;
    }

    if (!recoveryKey.trim()) {
      setError('Please enter your recovery secret phrase.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          recoveryKey: recoveryKey.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Password reset failed.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onResetSuccess();
      }, 1500);
    } catch {
      setError('Network connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 text-white text-center relative">
          <div
            className="cursor-pointer shrink-0 inline-block mb-2"
            onClick={onOpenLogoModal}
            title="Church Logo Emblem"
          >
            <ChurchLogo size="md" showUploadButton={false} />
          </div>

          <h2 className="text-base sm:text-lg font-extrabold tracking-tight uppercase">
            HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
          </h2>
          <div className="inline-block bg-yellow-400 text-blue-950 text-xs font-black px-2.5 py-0.5 rounded-md mt-1">
            LOCATION: MANKESSIM
          </div>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Administrator Password Recovery & Reset
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Password successfully reset! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Administrator Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter username or email"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password Recovery Secret Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="Enter secret phrase set during setup"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-8 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4 text-yellow-400" />
              <span>{loading ? 'Verifying & Resetting...' : 'Reset Administrator Password'}</span>
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs font-bold text-blue-900 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Administrator Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
