import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Upload,
  Calendar,
  Database,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Eye,
  EyeOff,
  User,
  Sparkles,
  History,
  RefreshCw,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { ChurchService, AuthSession, HomepageImagesConfig } from '../types';
import { exportDatabaseBackup, importDatabaseBackup, fetchAuditLogs, getLocalAuditLogs } from '../utils/storage';
import { ResetSystemModal } from './ResetSystemModal';
import { HomepageImagesSettings } from './HomepageImagesSettings';

interface SettingsPageProps {
  services: ChurchService[];
  onOpenServiceModal: () => void;
  onOpenLogoModal: () => void;
  currentUser?: AuthSession['user'];
  onLogout: () => void;
  membersCount?: number;
  sessionsCount?: number;
  onResetComplete?: () => void;
  onNavigate?: (page: any) => void;
  homepageImages?: HomepageImagesConfig;
  onUpdateHomepageImages?: (updated: HomepageImagesConfig) => void;
  defaultTab?: 'branding' | 'security' | 'services' | 'backup' | 'audit' | 'homepage-images';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  services,
  onOpenServiceModal,
  onOpenLogoModal,
  currentUser,
  onLogout,
  membersCount = 0,
  sessionsCount = 0,
  onResetComplete,
  onNavigate,
  homepageImages = { image1: null, image2: null },
  onUpdateHomepageImages,
  defaultTab = 'branding',
}) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'services' | 'backup' | 'audit' | 'homepage-images'>(
    defaultTab
  );
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>(() => getLocalAuditLogs());
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    setBackupSuccess('Complete church database backup exported successfully!');
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
        setBackupSuccess('Database restored successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setBackupError('Invalid backup file. Restoration failed.');
      }
    };
    reader.readAsText(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: currentUser?.username || 'admin',
          recoveryKey: currentPassword, // Using verified auth check
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to update password.');
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordLoading(false);
    } catch {
      setPasswordError('Network connection error.');
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border-2 border-yellow-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-blue-950 flex items-center justify-center font-bold shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-yellow-400 tracking-wider">
              Administration • Church Settings
            </span>
            <h2 className="text-xl sm:text-2xl font-black">System & Branding Settings</h2>
            <p className="text-xs text-blue-200">
              Configure official logo, manage service times, backups, and security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-yellow-300 border border-white/20">
            Admin: {currentUser?.username || 'Administrator'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'branding'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Church Logo & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('homepage-images')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'homepage-images'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-yellow-400" />
          <span>Homepage Images</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'services'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-yellow-400" />
          <span>Services ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'backup'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Database className="w-4 h-4 text-yellow-400" />
          <span>Database Backups</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'security'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Lock className="w-4 h-4 text-yellow-400" />
          <span>Admin Security</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            loadAuditLogs();
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
            activeTab === 'audit'
              ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <History className="w-4 h-4 text-yellow-400" />
          <span>Audit & Activity Logs ({auditLogs.length})</span>
        </button>
      </div>

      {backupSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {backupError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{backupError}</span>
        </div>
      )}

      {/* Tab 1: Logo & Branding */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-yellow-400 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-black text-blue-950">
                Official Church Logo & Visual Identity
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Ensure consistent branding across Android phones, tablets, laptops, and attendance sheets
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
                  <li><strong>Church Name:</strong> HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH</li>
                  <li><strong>Location:</strong> MANKESSIM (Central Region, Ghana)</li>
                  <li><strong>Official Colors:</strong> Royal Blue, Radiant Yellow/Gold, and Crisp White.</li>
                  <li><strong>Display:</strong> Vector SVG scaling and object containment ensure the logo never distorts on any device.</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50/70 border border-yellow-200 rounded-2xl text-yellow-950">
                <h5 className="font-bold mb-1">How to Replace Logo:</h5>
                <p>Click &ldquo;Upload / Replace Logo File&rdquo; to choose any PNG, SVG, or JPG file from your phone or laptop. It takes effect immediately across all pages.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Homepage Images Management */}
      {activeTab === 'homepage-images' && (
        <HomepageImagesSettings
          homepageImages={homepageImages}
          onUpdateImages={onUpdateHomepageImages || (() => {})}
          adminUsername={currentUser?.fullName || currentUser?.username || 'Administrator'}
        />
      )}

      {/* Tab 2: Church Services */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-blue-950">
                Configured Church Services ({services.length})
              </h3>
              <p className="text-xs text-gray-500">
                Service schedules available for roll call in the Record Attendance Book
              </p>
            </div>
            <button
              onClick={onOpenServiceModal}
              className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-yellow-300 font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span>Add / Edit Services</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((srv) => (
              <div key={srv.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-950">{srv.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-extrabold uppercase">
                    {srv.dayOfWeek}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-semibold mt-1">{srv.defaultTime}</p>
                {srv.description && <p className="text-xs text-gray-600 mt-1">{srv.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Database Backups */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-md space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-black text-blue-950">
              Shared Database & Offline Backup Management
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Export and safeguard church members and attendance rolls with encrypted JSON backup files
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportBackup}
              className="px-5 py-3 rounded-xl bg-blue-900 text-yellow-300 hover:bg-blue-800 font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Database className="w-4 h-4 text-yellow-400" />
              <span>Export Complete Database Backup (JSON)</span>
            </button>

            <label className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs flex items-center gap-2 cursor-pointer transition">
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
      )}

      {/* Tab 4: Admin Security */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-md space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-blue-950">
              Administrator Account Security
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Change administrator password and view active credentials status
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-yellow-300 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-blue-950">{currentUser?.fullName || 'Administrator'}</p>
                <p className="text-xs text-gray-500">Username: {currentUser?.username || 'admin'}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold"
            >
              Logout
            </button>
          </div>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Password updated successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="max-w-md space-y-3.5">
            <h4 className="font-bold text-xs text-gray-700 uppercase">Change Administrator Password</h4>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Recovery Secret Key *</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter recovery secret key"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">New Password (min 8 chars) *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs hover:bg-blue-800 transition"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Audit & Activity Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-blue-950">
                  Administrator Activity & Audit History
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold">
                  {auditLogs.length} Events
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Official activity record of administrative actions, data resets, and system security events
              </p>
            </div>

            <button
              type="button"
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              <span>{auditLoading ? 'Refreshing...' : 'Refresh Logs'}</span>
            </button>
          </div>

          {/* Privacy & Safeguard Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-950">
            <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-blue-900">Protected Audit Guarantee:</span>
              <p className="text-blue-800 text-[11px]">
                Administrator passwords, recovery keys, and confidential credentials are never recorded in system audit logs. All entries record execution timestamp, administrator account, records affected, and verification result.
              </p>
            </div>
          </div>

          {/* Log Entries List */}
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">No Audit Events Logged Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                System resets and major administrative actions will be automatically recorded and displayed here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((entry: any) => {
                const isSuccess = entry.result === 'SUCCESS';
                const formattedDate = entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'N/A';

                return (
                  <div
                    key={entry.id || Math.random()}
                    className={`p-4 rounded-2xl border transition ${
                      isSuccess
                        ? 'bg-white border-gray-200 hover:border-blue-400'
                        : 'bg-red-50/40 border-red-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {entry.result || 'EVENT'}
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-950">
                          {entry.event || 'ADMIN_ACTION'}
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-500 font-medium">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="pt-2 text-xs space-y-1.5">
                      <p className="text-gray-700 font-medium">{entry.details}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-medium pt-1">
                        <span>
                          <strong className="text-gray-700">Admin Account:</strong>{' '}
                          {entry.adminUsername || 'Administrator'}
                        </span>

                        {entry.recordsCleared && (
                          <span>
                            <strong className="text-gray-700">Records Cleared:</strong>{' '}
                            {entry.recordsCleared.members} members,{' '}
                            {entry.recordsCleared.sessions} sessions (Total:{' '}
                            {entry.recordsCleared.total})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DANGER ZONE / SYSTEM RESET SECTION */}
      <div className="bg-red-50/70 rounded-3xl p-6 sm:p-8 border-2 border-red-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-yellow-300 flex items-center justify-center shadow-md shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">
                Restricted Administrative Zone
              </span>
              <h3 className="text-base sm:text-lg font-black text-red-950">
                System Reset & Data Maintenance
              </h3>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 text-xs font-bold self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-red-700" />
            <span>Administrator Authorized Only</span>
          </div>
        </div>

        <p className="text-xs text-red-900/90 leading-relaxed max-w-2xl">
          Permanently clear operational church data including member registrations, attendance rolls,
          and generated reports. Your administrator login credentials, security rules, and church
          logo will be safely preserved.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition transform active:scale-95 border border-red-700 cursor-pointer"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span>RESET SYSTEM / CLEAR ALL DATA</span>
          </button>

          <span className="text-[11px] text-gray-500 font-medium">
            Requires password re-authentication and phrase verification in 2 steps.
          </span>
        </div>
      </div>

      {/* System Reset Modal Dialog */}
      <ResetSystemModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetComplete={() => {
          setIsResetModalOpen(false);
          loadAuditLogs();
          if (onResetComplete) onResetComplete();
        }}
        onNavigate={onNavigate}
        membersCount={membersCount}
        sessionsCount={sessionsCount}
      />
    </div>
  );
};
