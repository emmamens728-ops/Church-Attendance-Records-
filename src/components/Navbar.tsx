import React, { useState } from 'react';
import {
  Home,
  LayoutDashboard,
  BookOpen,
  UserPlus,
  Users,
  History,
  FileSpreadsheet,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  Shield,
  Wifi,
  Sparkles,
  Upload,
} from 'lucide-react';
import { ChurchLogo } from './ChurchLogo';
import { AppPage, AuthSession } from '../types';

interface NavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  authSession: AuthSession;
  onLogout: () => void;
  onOpenLogoModal: () => void;
  isSetupComplete: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  authSession,
  onLogout,
  onOpenLogoModal,
  isSetupComplete,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (page: AppPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  // Navigation items for authorized administrator
  const adminNavItems = [
    { page: 'home' as AppPage, label: 'Home', icon: Home },
    { page: 'admin-dashboard' as AppPage, label: 'Admin Dashboard', icon: LayoutDashboard },
    { page: 'attendance-book' as AppPage, label: 'Record Attendance Book', icon: BookOpen },
    { page: 'register-member' as AppPage, label: 'Register Members', icon: UserPlus },
    { page: 'member-directory' as AppPage, label: 'Member Directory', icon: Users },
    { page: 'attendance-history' as AppPage, label: 'Attendance History', icon: History },
    { page: 'reports' as AppPage, label: 'Reports', icon: FileSpreadsheet },
    { page: 'settings' as AppPage, label: 'Settings', icon: Settings },
  ];

  // Navigation items for public / unauthenticated visitor
  const publicNavItems = [
    { page: 'home' as AppPage, label: 'Home', icon: Home },
  ];

  const currentNavItems = authSession.isAuthenticated ? adminNavItems : publicNavItems;

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-yellow-400 shadow-md">
      {/* Top Gold Banner with Motto & Status */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-white px-3 py-1 text-[11px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-yellow-400 uppercase tracking-wider">
              HOUSE OF POWER OF MINISTRY INT. CHURCH
            </span>
            <span className="hidden sm:inline text-blue-300">•</span>
            <span className="hidden md:inline text-blue-100 font-medium">
              Location: Mankessim, Central Region, Ghana
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Offline & Online Synchronized</span>
              <span className="sm:hidden">Synced</span>
            </div>

            <button
              onClick={onOpenLogoModal}
              className="inline-flex items-center gap-1 text-yellow-300 hover:text-white transition-colors underline cursor-pointer"
              title="Replace church logo"
            >
              <Upload className="w-3 h-3" />
              <span className="hidden sm:inline">Change Logo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Logo and Church Name (Shortened on mobile: HOUSE OF POWER - MANKESSIM) */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group shrink-0"
          title="Return to Home Screen"
        >
          <div className="shrink-0 transition-transform group-hover:scale-105">
            <ChurchLogo size="sm" showUploadButton={false} />
          </div>

          <div>
            {/* Desktop Full Church Name */}
            <h1 className="hidden lg:block text-base font-black text-blue-950 tracking-tight leading-tight group-hover:text-blue-900 transition-colors">
              HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH
            </h1>

            {/* Mobile / Tablet Shortened Church Name */}
            <h1 className="lg:hidden text-sm sm:text-base font-black text-blue-950 tracking-tight leading-tight group-hover:text-blue-900 transition-colors">
              HOUSE OF POWER - MANKESSIM
            </h1>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
              <span className="bg-yellow-400 text-blue-950 px-1.5 py-0.2 rounded text-[10px] font-black">
                MANKESSIM
              </span>
              <span className="hidden sm:inline">• Official Church Portal</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.page;

            return (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-900 text-yellow-300 shadow-md ring-2 ring-yellow-400'
                    : 'text-gray-700 hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-yellow-400' : 'text-blue-700'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Auth Controls & Mobile Hamburger Trigger */}
        <div className="flex items-center gap-2">
          {authSession.isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-black text-blue-950">
                  {authSession.user?.fullName || 'Administrator'}
                </span>
                <span className="text-[10px] text-yellow-700 font-bold uppercase">
                  Logged In (Admin)
                </span>
              </div>

              <button
                onClick={handleLogoutClick}
                className="hidden xl:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
                title="Logout from administrator session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isSetupComplete ? (
                <button
                  onClick={() => handleNavClick('login')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Admin Login</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNavClick('setup')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs shadow-md transition animate-pulse"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Setup Admin</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl text-blue-950 hover:bg-blue-50 border border-gray-200 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {authSession.isAuthenticated ? 'Administrator Menu' : 'Church Portal Navigation'}
            </span>
            {authSession.isAuthenticated && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Session
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.page;

              return (
                <button
                  key={item.page}
                  onClick={() => handleNavClick(item.page)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-left ${
                    isActive
                      ? 'bg-blue-900 text-yellow-300 ring-2 ring-yellow-400 shadow-md'
                      : 'text-gray-800 hover:bg-blue-50 hover:text-blue-950'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-blue-700'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {authSession.isAuthenticated && (
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({authSession.user?.username})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
