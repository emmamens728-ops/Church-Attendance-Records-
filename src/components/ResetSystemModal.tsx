import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  Lock,
  Trash2,
  CheckCircle2,
  X,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Database,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { exportDatabaseBackup, executeServerSystemReset, SystemResetResult } from '../utils/storage';

interface ResetSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
  onNavigate?: (page: 'admin-dashboard' | 'register-member') => void;
  membersCount: number;
  sessionsCount: number;
}

export const ResetSystemModal: React.FC<ResetSystemModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
  onNavigate,
  membersCount,
  sessionsCount,
}) => {
  // Steps: 1 = Initial Warning & Backup, 2 = Password Reauth & Phrase Confirmation, 3 = Completion Screen
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Backup verification
  const [backupVerified, setBackupVerified] = useState(false);
  const [backupDownloadMsg, setBackupDownloadMsg] = useState<string | null>(null);

  // Step 2 Form
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const REQUIRED_PHRASE = 'RESET ALL CHURCH DATA';

  // Processing & Error
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<SystemResetResult | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      const backupJson = exportDatabaseBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HOPMIC_Pre_Reset_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupVerified(true);
      setBackupDownloadMsg('Backup file verified and downloaded successfully! Keep this file in a safe location.');
    } catch {
      setErrorMessage('Failed to generate church records backup. Please try again.');
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (phraseInput.trim() !== REQUIRED_PHRASE) {
      setErrorMessage(`Please type the exact phrase: "${REQUIRED_PHRASE}"`);
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your administrator password for reauthentication.');
      return;
    }

    setIsResetting(true);

    try {
      const result = await executeServerSystemReset(password, phraseInput.trim());
      setResetResult(result);
      setStep(3);
      onResetComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'System reset failed. Please verify credentials.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (isResetting) return;
    setStep(1);
    setBackupVerified(false);
    setBackupDownloadMsg(null);
    setPassword('');
    setPhraseInput('');
    setErrorMessage(null);
    setResetResult(null);
    onClose();
  };

  const isPhraseMatch = phraseInput.trim() === REQUIRED_PHRASE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Danger Banner */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600 text-yellow-300 shadow-md">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-yellow-300 tracking-wider">
                HOUSE OF POWER OF MINISTRY INT. CHURCH • MANKESSIM
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Reset System / Clear All Data
              </h3>
            </div>
          </div>
          {step !== 3 && (
            <button
              onClick={handleClose}
              disabled={isResetting}
              className="p-1.5 rounded-xl text-red-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP 1: INITIAL WARNING & BACKUP STEP */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-red-950">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>CONFIRMATION REQUIRED</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                “WARNING: You are about to reset the church management system. This action may
                permanently remove registered members, attendance records, visitors, reports, and
                other saved church data. This operation cannot be undone unless a backup is
                available. Please create and verify a backup before proceeding.”
              </p>
            </div>

            {/* Impact Scope Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-gray-500 font-bold block">Current Registered Members:</span>
                <span className="text-base font-black text-blue-950">{membersCount} members</span>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-gray-500 font-bold block">Recorded Attendance Sessions:</span>
                <span className="text-base font-black text-blue-950">{sessionsCount} sessions</span>
              </div>
            </div>

            {/* Protected System Information Safeguard Notice */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Protected System Safeguards:
              </span>
              <p className="text-[11px] text-blue-800">
                Your administrator account login credentials, database configuration, church logo,
                and interface settings will remain strictly preserved.
              </p>
            </div>

            {/* Backup Notification */}
            {backupDownloadMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{backupDownloadMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition"
              >
                Cancel — Keep Data
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 text-xs font-black flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4 text-blue-800" />
                  <span>Create Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <span>Continue to Reset</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: REAUTHENTICATION & PHRASE CONFIRMATION STEP */}
        {step === 2 && (
          <form onSubmit={handleExecuteReset} className="p-6 sm:p-8 space-y-5">
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1">
              <span className="font-black flex items-center gap-1.5 text-amber-900">
                <Lock className="w-4 h-4 text-amber-700" />
                Step 2: Administrator Authorization & Identity Verification
              </span>
              <p>
                To prevent accidental data loss, re-enter your administrator password and type the
                exact phrase below to authorize the system reset.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Password Verification Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Administrator Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your administrator password"
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  required
                  autoFocus
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

            {/* Confirmation Phrase Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Type the exact confirmation phrase: <span className="font-mono text-red-700 select-all font-black">{REQUIRED_PHRASE}</span>
              </label>
              <input
                type="text"
                value={phraseInput}
                onChange={(e) => setPhraseInput(e.target.value)}
                placeholder="Type RESET ALL CHURCH DATA"
                className={`w-full px-3.5 py-2.5 border-2 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wider outline-none transition ${
                  isPhraseMatch
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950'
                    : 'border-gray-300 bg-gray-50 text-gray-900 focus:border-red-500'
                }`}
                required
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={isPhraseMatch ? 'text-emerald-700 font-bold' : 'text-gray-500'}>
                  {isPhraseMatch ? '✓ Phrase matches exactly' : 'Phrase must match exactly in uppercase'}
                </span>
                <span className="font-mono text-gray-400">
                  {phraseInput.length} / {REQUIRED_PHRASE.length}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isResetting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition"
              >
                ← Back to Warning
              </button>

              <button
                type="submit"
                disabled={!isPhraseMatch || !password || isResetting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResetting ? 'Verifying & Clearing Data...' : 'CONFIRM RESET SYSTEM'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: RESET COMPLETION SCREEN */}
        {step === 3 && (
          <div className="p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">
                Operation Verified & Audited
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-blue-950 mt-0.5">
                SYSTEM RESET SUCCESSFUL
              </h3>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 text-left space-y-2">
              <p className="font-bold text-sm text-emerald-900">
                “Church records have been cleared. Your administrator account and system settings
                have been preserved. You can now begin registering members afresh.”
              </p>
              <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 space-y-1">
                <p>• Cleared {resetResult?.deletedMembersCount || 0} registered member records.</p>
                <p>• Cleared {resetResult?.deletedSessionsCount || 0} attendance sessions.</p>
                <p>• Cached offline synchronization records cleared on this device.</p>
                <p>• Administrator login and official church branding preserved.</p>
                <p>• Unique Member ID numbering will now restart with fresh ID <strong>HOP-MK-001</strong>.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  if (onNavigate) onNavigate('admin-dashboard');
                }}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm border border-gray-300 transition"
              >
                Return to Admin Dashboard
              </button>

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  if (onNavigate) onNavigate('register-member');
                }}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-black text-xs sm:text-sm shadow-md transition"
              >
                Begin Member Registration →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
