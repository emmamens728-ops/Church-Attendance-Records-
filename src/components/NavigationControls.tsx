import React from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Home } from 'lucide-react';
import { AppPage } from '../types';

interface NavigationControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  currentPage: AppPage;
  onGoHome: () => void;
}

const PAGE_NAMES: Record<AppPage, string> = {
  home: 'Home',
  'admin-dashboard': 'Admin Dashboard',
  'attendance-book': 'Record Attendance Book',
  'register-member': 'Register Members',
  'member-directory': 'Member Directory',
  'attendance-history': 'Attendance History',
  reports: 'Reports & CSV',
  settings: 'Settings',
  login: 'Administrator Login',
  setup: 'Initial Administrator Setup',
  'reset-password': 'Password Recovery',
};

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  currentPage,
  onGoHome,
}) => {
  if (currentPage === 'home') return null;

  return (
    <div className="w-full bg-white rounded-2xl p-2.5 sm:p-3 shadow-xs border border-blue-200 mb-5 flex flex-wrap items-center justify-between gap-2.5">
      {/* Back and Forward Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!canGoBack}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
            canGoBack
              ? 'bg-blue-900 text-yellow-300 hover:bg-blue-800 cursor-pointer active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
          title={canGoBack ? 'Go back to previous page' : 'No previous page in history'}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onGoForward}
          disabled={!canGoForward}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
            canGoForward
              ? 'bg-blue-900 text-yellow-300 hover:bg-blue-800 cursor-pointer active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
          title={canGoForward ? 'Go forward to next page' : 'No next page in history'}
        >
          <span>Forward</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 overflow-x-auto">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-1 text-blue-900 hover:underline font-bold"
        >
          <Home className="w-3.5 h-3.5 text-yellow-500" />
          <span>Home</span>
        </button>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="font-extrabold text-blue-950 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          {PAGE_NAMES[currentPage] || currentPage}
        </span>
      </div>
    </div>
  );
};
