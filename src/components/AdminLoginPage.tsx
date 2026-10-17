import React, { useState } from 'react';
import {
  Lock,
  User,
  Shield,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { saveStoredAuthSession } from '../utils/storage';

interface AdminLoginPageProps {
  onLoginSuccess: (user: any) => void;
  onGoToResetPassword: () => void;
  onGoToSetup: () => void;
  onOpenLogoModal: () => void;
  targetDestination?: string;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onGoToResetPassword,
  onGoToSetup,
  onOpenLogoModal,
  targetDestination = 'admin-dashboard',
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your administrator username or email.');
      return;
    }

    if (!password) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'NotInitialized') {
          setError('No administrator account has been set up yet.');
        } else {
          setError(data.error || data.message || 'Invalid administrator login credentials.');
        }
        setLoading(false);
        return;
      }

      // Save token and session
      saveStoredAuthSession(data.token, data.user, data.expiresAt);
      onLoginSuccess(data.user);
    } catch (err) {
      setError('Network connection error. Please ensure the server is active.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 sm:p-7 text-white text-center relative">
          <div
            className="cursor-pointer shrink-0 inline-block mb-2"
            onClick={onOpenLogoModal}
            title="Click to customize official church logo"
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
            Administrator Authentication Portal
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/80 text-yellow-300 text-xs font-bold border border-yellow-400/50 shadow-xs">
            {targetDestination === 'attendance-book' ? (
              <>
                <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
                <span>Access: Record Attendance Book</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span>Access: Admin Portal</span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="p-3.5 mb-5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span>{error}</span>
                {error.includes('No administrator account') && (
                  <button
                    type="button"
                    onClick={onGoToSetup}
                    className="block mt-1 font-bold text-blue-900 underline"
                  >
                    Click here to run Initial Administrator Setup →
                  </button>
                )}
              </div>
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
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-blue-950 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Administrator Password</label>
                <button
                  type="button"
                  onClick={onGoToResetPassword}
                  className="text-[11px] font-bold text-blue-900 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>{loading ? 'Verifying Administrator Credentials...' : 'Sign In / Login to Admin Portal'}</span>
            </button>
          </form>

          {/* Setup Link */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-2 text-center text-xs">
            <span className="text-gray-500">First time launching the application?</span>
            <button
              type="button"
              onClick={onGoToSetup}
              className="font-bold text-blue-900 hover:text-blue-950 underline flex items-center gap-1"
            >
              <span>Initial Administrator Account Setup Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
