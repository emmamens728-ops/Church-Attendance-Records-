import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';

interface AdminSetupPageProps {
  onSetupSuccess: () => void;
  onGoToLogin: () => void;
  onOpenLogoModal: () => void;
}

export const AdminSetupPage: React.FC<AdminSetupPageProps> = ({
  onSetupSuccess,
  onGoToLogin,
  onOpenLogoModal,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);

  // Check if system has already been setup
  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.isSetupComplete) {
          setIsAlreadySetup(true);
        }
      })
      .catch(() => {
        // If offline, check local storage
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!username.trim() || username.trim().length < 3) {
      setError('Administrator username must be at least 3 characters long.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and re-type.');
      return;
    }

    if (!recoveryKey.trim() || recoveryKey.trim().length < 4) {
      setError('Please provide a secure recovery key (at least 4 characters) for password resets.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || 'Church Administrator',
          username: username.trim().toLowerCase(),
          email: email.trim() ? email.trim().toLowerCase() : undefined,
          password,
          recoveryKey: recoveryKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Setup failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSetupSuccess();
      }, 1500);
    } catch (err: any) {
      setError('Network connection error. Please ensure server is running.');
      setLoading(false);
    }
  };

  if (isAlreadySetup) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-10 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-2 border-yellow-400 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-900 mx-auto flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-blue-950">Administrator Setup Completed</h2>
          <p className="text-xs text-gray-600">
            The administrator account for HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH has already been initialized and locked for security.
          </p>
          <button
            onClick={onGoToLogin}
            className="w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition"
          >
            <span>Proceed to Administrator Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-8 px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6 text-white text-center relative">
          <div
            className="cursor-pointer shrink-0 inline-block mb-2"
            onClick={onOpenLogoModal}
            title="Church Logo Emblem"
          >
            <ChurchLogo size="md" showUploadButton={false} />
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase">
            HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
          </h2>
          <div className="inline-block bg-yellow-400 text-blue-950 text-xs font-black px-2.5 py-0.5 rounded-md mt-1">
            LOCATION: MANKESSIM
          </div>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Initial Administrator Account Setup Wizard
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 mb-5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Initial Security Setup:</span> Create your unique
              administrator credentials. Once initialized, setup is permanently locked and only
              your administrator account will have access to the church records.
            </div>
          </div>

          {error && (
            <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Administrator account created securely! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full Name / Pastor Title *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rev. Emmanuel Kofi Mensah / Administrator"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Administrator Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hopadmin / revmensah"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-blue-950 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@church.org"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password (min 8 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-8 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password Recovery Secret Key *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="e.g. MankessimPower2026 / Secret Phrase"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Remember this phrase. You will need it if you ever need to reset your administrator password.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Lock className="w-4 h-4 text-yellow-400" />
              <span>{loading ? 'Creating Administrator Account...' : 'Create Administrator Account'}</span>
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs font-bold text-blue-900 hover:underline"
            >
              Already set up? Go to Administrator Login →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
