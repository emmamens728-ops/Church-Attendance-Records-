import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Church,
  BookOpen,
  Shield,
  Upload,
  Calendar,
  Users,
  Award,
  Heart,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { NavigationControls } from './components/NavigationControls';
import { HomePage } from './components/HomePage';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AttendanceBook } from './components/AttendanceBook';
import { MemberRegistrationPage } from './components/MemberRegistrationPage';
import { AdminSection } from './components/AdminSection';
import { AttendanceReports } from './components/AttendanceReports';
import { SettingsPage } from './components/SettingsPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminSetupPage } from './components/AdminSetupPage';
import { PasswordResetPage } from './components/PasswordResetPage';
import { LogoUploadModal } from './components/LogoUploadModal';
import { ServiceManagerModal } from './components/ServiceManagerModal';
import { ChurchLogo } from './components/ChurchLogo';
import { SplashScreen } from './components/SplashScreen';

import {
  getMembers,
  saveMembers,
  getServices,
  saveServices,
  getSessions,
  saveSessions,
  getStoredAuthToken,
  getStoredAuthUser,
  clearStoredAuthSession,
  saveStoredAuthSession,
  pullDataFromServer,
  pushDataToServer,
  getStoredHomepageImages,
  fetchHomepageImagesFromServer,
  deduplicateMemberList,
} from './utils/storage';

import {
  ChurchMember,
  ChurchService,
  AttendanceSession,
  AppPage,
  AuthSession,
  HomepageImagesConfig,
} from './types';

const PROTECTED_PAGES: AppPage[] = [
  'admin-dashboard',
  'attendance-book',
  'register-member',
  'member-directory',
  'attendance-history',
  'reports',
  'settings',
];

export default function App() {
  // Navigation State with History Stack
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [historyStack, setHistoryStack] = useState<AppPage[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Unsaved Changes Form Guard
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [pendingNavigationPage, setPendingNavigationPage] = useState<AppPage | null>(null);

  // Authentication State
  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    const token = getStoredAuthToken();
    const user = getStoredAuthUser();
    return {
      isAuthenticated: Boolean(token),
      token: token || undefined,
      user: user || undefined,
    };
  });
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(true);

  // Church Data State
  const [members, setMembers] = useState<ChurchMember[]>(() => getMembers());
  const [services, setServices] = useState<ChurchService[]>(() => getServices());
  const [sessions, setSessions] = useState<Record<string, AttendanceSession>>(() => getSessions());
  const [homepageImages, setHomepageImages] = useState<HomepageImagesConfig>(() => getStoredHomepageImages());

  // Modal & Notification States
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Splash Screen States:
  // 1. Initial full-screen opening splash screen (20-second duration on app open or reload)
  const [showInitialSplash, setShowInitialSplash] = useState<boolean>(true);

  // 2. Post-login splash screen (same 20-second church logo screen after successful authentication)
  const [showPostLoginSplash, setShowPostLoginSplash] = useState<boolean>(false);
  const [pendingLoginDestination, setPendingLoginDestination] = useState<AppPage>('admin-dashboard');

  const handleInitialSplashComplete = useCallback(() => {
    setShowInitialSplash(false);
  }, []);

  // 1. Initial check of server setup status
  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        setIsSetupComplete(data.isSetupComplete);
        // If not setup and user visited login, redirect to setup
        if (!data.isSetupComplete && (currentPage === 'login' || currentPage === 'admin-dashboard')) {
          setCurrentPage('setup');
        }
      })
      .catch(() => {
        // Offline: assume setup complete if members exist
        setIsSetupComplete(true);
      });
  }, [currentPage]);

  // 2. Synchronize with server if authenticated
  useEffect(() => {
    if (authSession.isAuthenticated) {
      pullDataFromServer().then((success) => {
        if (success) {
          setMembers(getMembers());
          setServices(getServices());
          setSessions(getSessions());
          setHomepageImages(getStoredHomepageImages());
        }
      });
    }
  }, [authSession.isAuthenticated]);

  // 3. Periodic session expiration check
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStoredAuthToken();
      if (authSession.isAuthenticated && !token) {
        // Session expired
        setAuthSession({ isAuthenticated: false });
        setAuthNotice('Your administrator session has expired. Please log in again.');
        navigateTo('login', true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [authSession.isAuthenticated]);

  // 3b. Real-time reset synchronization
  useEffect(() => {
    const handleResetEvent = () => {
      setMembers([]);
      setSessions({});
    };
    window.addEventListener('hop_data_reset', handleResetEvent);
    return () => window.removeEventListener('hop_data_reset', handleResetEvent);
  }, []);

  // 3c. Fetch and synchronize homepage images across devices
  useEffect(() => {
    fetchHomepageImagesFromServer().then((imgs) => {
      if (imgs) setHomepageImages(imgs);
    });

    const handleImagesUpdated = () => {
      setHomepageImages(getStoredHomepageImages());
    };

    const handleMembersUpdated = () => {
      setMembers(deduplicateMemberList(getMembers()));
    };

    const handleAttendanceUpdated = () => {
      setSessions(getSessions());
    };

    window.addEventListener('hop_homepage_images_updated', handleImagesUpdated);
    window.addEventListener('hop_members_updated', handleMembersUpdated);
    window.addEventListener('hop_attendance_updated', handleAttendanceUpdated);

    return () => {
      window.removeEventListener('hop_homepage_images_updated', handleImagesUpdated);
      window.removeEventListener('hop_members_updated', handleMembersUpdated);
      window.removeEventListener('hop_attendance_updated', handleAttendanceUpdated);
    };
  }, []);

  // 4. Safe Navigation Function with Authorization & Unsaved Changes Guard
  const navigateTo = useCallback(
    (targetPage: AppPage, force = false) => {
      // If there are unsaved changes and not forced, prompt user
      if (hasUnsavedChanges && !force && targetPage !== currentPage) {
        setPendingNavigationPage(targetPage);
        return;
      }

      // Check access control: Protect administrator pages
      if (PROTECTED_PAGES.includes(targetPage) && !authSession.isAuthenticated) {
        setAuthNotice('Administrator authentication is required to access that section.');
        setTimeout(() => setAuthNotice(null), 4000);

        // Store intended destination so post-login splash screen opens it automatically
        setPendingLoginDestination(targetPage);

        // Redirect to setup if not setup, else login
        const redirectPage = isSetupComplete ? 'login' : 'setup';
        targetPage = redirectPage;
      }

      // If user is already on target page, no-op
      if (targetPage === currentPage && !force) return;

      // Update history stack
      setHistoryStack((prev) => {
        const newStack = prev.slice(0, historyIndex + 1);
        newStack.push(targetPage);
        return newStack;
      });
      setHistoryIndex((prev) => prev + 1);

      setCurrentPage(targetPage);
      setHasUnsavedChanges(false);
      setPendingNavigationPage(null);

      // Sync window history
      try {
        window.history.pushState({ page: targetPage }, '', '#' + targetPage);
      } catch {
        // ignore
      }
    },
    [currentPage, historyIndex, hasUnsavedChanges, authSession.isAuthenticated, isSetupComplete]
  );

  const handlePostLoginSplashComplete = useCallback(() => {
    setShowPostLoginSplash(false);
    const destination = pendingLoginDestination || 'admin-dashboard';
    navigateTo(destination, true);
  }, [pendingLoginDestination, navigateTo]);

  // 5. Back and Forward Navigation Handlers
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const handleGoBack = () => {
    if (!canGoBack) return;

    if (hasUnsavedChanges) {
      const prevPage = historyStack[historyIndex - 1];
      setPendingNavigationPage(prevPage);
      return;
    }

    const prevIndex = historyIndex - 1;
    const targetPage = historyStack[prevIndex];

    // Check protected access
    if (PROTECTED_PAGES.includes(targetPage) && !authSession.isAuthenticated) {
      navigateTo('login', true);
      return;
    }

    setHistoryIndex(prevIndex);
    setCurrentPage(targetPage);
    setHasUnsavedChanges(false);
  };

  const handleGoForward = () => {
    if (!canGoForward) return;

    if (hasUnsavedChanges) {
      const nextPage = historyStack[historyIndex + 1];
      setPendingNavigationPage(nextPage);
      return;
    }

    const nextIndex = historyIndex + 1;
    const targetPage = historyStack[nextIndex];

    // Check protected access
    if (PROTECTED_PAGES.includes(targetPage) && !authSession.isAuthenticated) {
      navigateTo('login', true);
      return;
    }

    setHistoryIndex(nextIndex);
    setCurrentPage(targetPage);
    setHasUnsavedChanges(false);
  };

  // 6. Browser popstate event listener
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.page) {
        const page = e.state.page as AppPage;
        if (PROTECTED_PAGES.includes(page) && !authSession.isAuthenticated) {
          navigateTo('login', true);
        } else {
          setCurrentPage(page);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authSession.isAuthenticated, navigateTo]);

  // 7. Discard unsaved changes confirmation
  const handleConfirmDiscard = () => {
    if (pendingNavigationPage) {
      setHasUnsavedChanges(false);
      navigateTo(pendingNavigationPage, true);
    }
  };

  // 8. Authentication Actions
  const handleLoginSuccess = (user: any) => {
    // 1. Save and establish verified authentication session
    const token = getStoredAuthToken() || undefined;
    setAuthSession({
      isAuthenticated: true,
      token,
      user,
    });

    // 2. Show the exact same 20-second church logo splash screen before opening destination
    setShowPostLoginSplash(true);
  };

  const handleLogout = async () => {
    try {
      const token = getStoredAuthToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }

    clearStoredAuthSession();
    setAuthSession({ isAuthenticated: false });
    setHistoryStack(['home']);
    setHistoryIndex(0);
    setCurrentPage('home');
  };

  // 9. Data CRUD Handlers
  const handleUpdateSession = (updatedSession: AttendanceSession) => {
    const updated = {
      ...sessions,
      [updatedSession.id]: updatedSession,
    };
    setSessions(updated);
    saveSessions(updated);
  };

  const handleAddMember = (newMember: ChurchMember) => {
    const updated = deduplicateMemberList([newMember, ...members]);
    setMembers(updated);
    saveMembers(updated);
  };

  const handleUpdateMember = (updatedMember: ChurchMember) => {
    const updated = members.map((m) =>
      m.id === updatedMember.id ? updatedMember : m
    );
    const dedup = deduplicateMemberList(updated);
    setMembers(dedup);
    saveMembers(dedup);
  };

  const handleDeleteMember = async (
    memberId: string,
    password?: string,
    retentionPolicy: 'preserve' | 'purge' = 'preserve'
  ): Promise<{ success: boolean; message?: string }> => {
    const token = getStoredAuthToken();
    if (password && token) {
      try {
        const res = await fetch(`/api/church/members/${encodeURIComponent(memberId)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password,
            retentionPolicy,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            message: data.message || data.error || 'Failed to permanently delete member.',
          };
        }
        if (Array.isArray(data.members)) {
          setMembers(data.members);
          saveMembers(data.members);
        } else {
          const updated = members.filter((m) => m.id !== memberId);
          setMembers(updated);
          saveMembers(updated);
        }
        if (data.attendanceSessions) {
          setSessions(data.attendanceSessions);
          saveSessions(data.attendanceSessions);
        }
        return { success: true, message: data.message };
      } catch {
        return {
          success: false,
          message: 'Network connection error while connecting to church database.',
        };
      }
    } else {
      const updated = members.filter((m) => m.id !== memberId);
      setMembers(updated);
      saveMembers(updated);
      return { success: true };
    }
  };

  const handleSaveServices = (updatedServices: ChurchService[]) => {
    setServices(updatedServices);
    saveServices(updatedServices);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900 selection:bg-yellow-400 selection:text-blue-950">
      {/* Responsive Navigation Bar */}
      <Navbar
        activePage={currentPage}
        onNavigate={(p) => navigateTo(p)}
        authSession={authSession}
        onLogout={handleLogout}
        onOpenLogoModal={() => setIsLogoModalOpen(true)}
        isSetupComplete={isSetupComplete}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5">
        {/* Forward & Backward Navigation Toolbar (Hidden on Home page) */}
        <NavigationControls
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          currentPage={currentPage}
          onGoHome={() => navigateTo('home')}
        />

        {/* Global Access Warning / Auth Notice Strip */}
        {authNotice && (
          <div className="mb-5 p-3.5 bg-yellow-50 border-2 border-yellow-400 text-yellow-950 text-xs sm:text-sm rounded-2xl flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 font-bold">
              <Lock className="w-5 h-5 text-yellow-600 shrink-0" />
              <span>{authNotice}</span>
            </div>
            <button
              onClick={() => setAuthNotice(null)}
              className="px-2.5 py-1 text-xs font-black text-blue-950 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* PAGE 1: HOME LANDING PAGE */}
        {currentPage === 'home' && (
          <HomePage
            onGoToAttendance={() => {
              if (authSession.isAuthenticated) {
                navigateTo('attendance-book');
              } else {
                setPendingLoginDestination('attendance-book');
                navigateTo('login');
              }
            }}
            onGoToAdmin={() => {
              if (authSession.isAuthenticated) {
                navigateTo('admin-dashboard');
              } else {
                setPendingLoginDestination('admin-dashboard');
                navigateTo('login');
              }
            }}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            totalMembersCount={members.length}
            homepageImages={homepageImages}
          />
        )}

        {/* PAGE 2: ADMIN DASHBOARD */}
        {currentPage === 'admin-dashboard' && (
          <AdminDashboardView
            members={members}
            services={services}
            sessions={sessions}
            onNavigate={(p) => navigateTo(p)}
            currentUser={authSession.user}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
          />
        )}

        {/* PAGE 3: RECORD ATTENDANCE BOOK */}
        {currentPage === 'attendance-book' && (
          <AttendanceBook
            members={members}
            services={services}
            sessions={sessions}
            onUpdateSession={handleUpdateSession}
            onAddMember={handleAddMember}
            userSession={{
              isLoggedIn: authSession.isAuthenticated,
              username: authSession.user?.username || 'admin',
              role: 'admin',
              fullName: authSession.user?.fullName || 'Administrator',
            }}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {/* PAGE 4: REGISTER MEMBERS */}
        {currentPage === 'register-member' && (
          <MemberRegistrationPage
            onSave={handleAddMember}
            existingMembers={members}
            existingCount={members.length}
            onNavigateTo={(p) => navigateTo(p)}
            setHasUnsavedChanges={setHasUnsavedChanges}
          />
        )}

        {/* PAGE 5: MEMBER DIRECTORY */}
        {currentPage === 'member-directory' && (
          <AdminSection
            members={members}
            services={services}
            sessions={sessions}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onSaveServices={handleSaveServices}
            userSession={{
              isLoggedIn: authSession.isAuthenticated,
              username: authSession.user?.username || 'admin',
              role: 'admin',
              fullName: authSession.user?.fullName || 'Administrator',
            }}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            onBackToHome={() => navigateTo('home')}
            onNavigatePage={(p) => navigateTo(p)}
            defaultTab="members"
          />
        )}

        {/* PAGE 6: ATTENDANCE HISTORY */}
        {currentPage === 'attendance-history' && (
          <AttendanceReports
            members={members}
            services={services}
            sessions={sessions}
          />
        )}

        {/* PAGE 7: REPORTS */}
        {currentPage === 'reports' && (
          <AttendanceReports
            members={members}
            services={services}
            sessions={sessions}
          />
        )}

        {/* PAGE 8: SETTINGS */}
        {currentPage === 'settings' && (
          <SettingsPage
            services={services}
            onOpenServiceModal={() => setIsServiceModalOpen(true)}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            currentUser={authSession.user}
            onLogout={handleLogout}
            membersCount={members.length}
            sessionsCount={Object.keys(sessions).length}
            onResetComplete={() => {
              setMembers([]);
              setSessions({});
            }}
            onNavigate={(p) => navigateTo(p)}
            homepageImages={homepageImages}
            onUpdateHomepageImages={setHomepageImages}
          />
        )}

        {/* PAGE 9: ADMIN LOGIN */}
        {currentPage === 'login' && (
          <AdminLoginPage
            onLoginSuccess={handleLoginSuccess}
            onGoToResetPassword={() => navigateTo('reset-password')}
            onGoToSetup={() => navigateTo('setup')}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
            targetDestination={pendingLoginDestination}
          />
        )}

        {/* PAGE 10: INITIAL SETUP */}
        {currentPage === 'setup' && (
          <AdminSetupPage
            onSetupSuccess={() => {
              setIsSetupComplete(true);
              navigateTo('login', true);
            }}
            onGoToLogin={() => navigateTo('login')}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
          />
        )}

        {/* PAGE 11: PASSWORD RESET */}
        {currentPage === 'reset-password' && (
          <PasswordResetPage
            onResetSuccess={() => navigateTo('login', true)}
            onGoToLogin={() => navigateTo('login')}
            onOpenLogoModal={() => setIsLogoModalOpen(true)}
          />
        )}
      </main>

      {/* Unsaved Changes Confirmation Modal */}
      {pendingNavigationPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-2 border-yellow-400 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-700 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-black text-blue-950">Unsaved Form Data</h4>
            <p className="text-xs text-gray-600 mt-2">
              You have unsaved changes in this form. If you navigate away now, your edits will be discarded.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPendingNavigationPage(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <LogoUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
      />

      <ServiceManagerModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        services={services}
        onSaveServices={handleSaveServices}
      />

      {/* Full-Screen Opening Church Logo Splash Screen (20s on app open or reload) */}
      {showInitialSplash && (
        <SplashScreen key="initial-splash" onComplete={handleInitialSplashComplete} />
      )}

      {/* Full-Screen Post-Login Church Logo Splash Screen (20s after successful authentication) */}
      {showPostLoginSplash && (
        <SplashScreen key="post-login-splash" onComplete={handlePostLoginSplashComplete} />
      )}

      {/* Official Church Footer */}
      <footer className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white border-t-4 border-yellow-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div
                className="cursor-pointer"
                onClick={() => setIsLogoModalOpen(true)}
                title="Click to replace official church logo"
              >
                <ChurchLogo size="md" showUploadButton={false} />
              </div>

              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
                </h3>
                <p className="text-yellow-400 font-bold text-xs">
                  LOCATION: MANKESSIM, CENTRAL REGION, GHANA
                </p>
                <p className="text-blue-200 text-xs mt-1">
                  Empowered by the Spirit • Transforming Lives • Walking in Kingdom Dominion
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <button
                onClick={() => navigateTo('home')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
              >
                Home
              </button>
              <button
                onClick={() => setIsLogoModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black transition flex items-center gap-1.5 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Replace Church Logo</span>
              </button>

              {authSession.isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition"
                >
                  Logout ({authSession.user?.username})
                </button>
              ) : (
                <button
                  onClick={() => navigateTo(isSetupComplete ? 'login' : 'setup')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 font-bold border border-white/20 transition"
                >
                  {isSetupComplete ? 'Admin Login' : 'Initial Admin Setup'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-blue-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-blue-300">
            <p>
              © {new Date().getFullYear()} HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH, MANKESSIM. All rights reserved.
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Administrator-Only Access • Offline Sync • Voice Search Active</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
