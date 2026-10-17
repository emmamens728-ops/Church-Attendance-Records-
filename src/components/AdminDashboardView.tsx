import React from 'react';
import {
  Users,
  BookOpen,
  UserPlus,
  FileSpreadsheet,
  Calendar,
  Settings,
  Sparkles,
  TrendingUp,
  Award,
  Clock,
  ArrowRight,
  Shield,
  HeartHandshake,
  CheckCircle2,
  Mic,
  History,
  Image as ImageIcon,
} from 'lucide-react';
import { ChurchMember, ChurchService, AttendanceSession, AppPage, AuthSession } from '../types';

interface AdminDashboardViewProps {
  members: ChurchMember[];
  services: ChurchService[];
  sessions: Record<string, AttendanceSession>;
  onNavigate: (page: AppPage) => void;
  currentUser?: AuthSession['user'];
  onOpenLogoModal: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  members,
  services,
  sessions,
  onNavigate,
  currentUser,
  onOpenLogoModal,
}) => {
  // Statistics
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'Active Member').length;
  const visitors = members.filter((m) => m.status === 'Visitor / First Timer').length;
  const youthAndChildren = members.filter(
    (m) => m.ageGroup === 'Youth' || m.ageGroup === 'Children'
  ).length;

  const sessionList = Object.values(sessions).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latestSession = sessionList[0];
  const latestPresentCount = latestSession
    ? Object.values(latestSession.records).filter((r) => r.status === 'present').length
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border-2 border-yellow-400 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-blue-950 font-black text-xs uppercase tracking-wider mb-2 shadow-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Official Executive Administration</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Welcome, {currentUser?.fullName || 'Church Administrator'}
            </h2>
            <p className="text-xs sm:text-sm text-yellow-300 font-bold mt-1">
              HOUSE OF POWER OF MINISTRY INTERNATIONAL CHURCH • MANKESSIM
            </p>
            <p className="text-xs text-blue-200 mt-1">
              All member management, attendance registers, and official reporting are active under your administrator control.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('attendance-book')}
              className="px-5 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Take Roll Call</span>
            </button>
            <button
              onClick={() => onNavigate('register-member')}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 transition"
            >
              <UserPlus className="w-4 h-4 text-yellow-300" />
              <span>+ Register Soul</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-950">
            <span>TOTAL MEMBERS</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">{totalMembers}</p>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Enrolled souls</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>ACTIVE MEMBERS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{activeMembers}</p>
          <p className="text-[11px] text-emerald-800/80 font-medium mt-0.5">Regular attendees</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-yellow-400 bg-yellow-50/30 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-yellow-950">
            <span>FIRST-TIMERS</span>
            <HeartHandshake className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-yellow-950 mt-1">{visitors}</p>
          <p className="text-[11px] text-yellow-800 font-medium mt-0.5">New visitors</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-purple-900">
            <span>YOUTH & KIDS</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{youthAndChildren}</p>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Next generation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span>SERVICES</span>
            <Calendar className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">{services.length}</p>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Configured weekly</p>
        </div>
      </div>

      {/* Fast Action Gateway Cards */}
      <div>
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
          Quick Access Portals & Administrative Tools
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('attendance-book')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-600 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-yellow-300 flex items-center justify-center mb-3 group-hover:bg-yellow-400 group-hover:text-blue-950 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Record Attendance Book
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Mark service roll call, voice search members, and record physical attendance head counts.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              Open Attendance Register →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('register-member')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-yellow-400 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-yellow-300 transition">
              <UserPlus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Register New Member
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Enroll new congregation members, assign ministries, Mankessim residential areas, and notes.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              Add New Member →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('member-directory')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-600 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-white transition">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Member Directory & Search
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Search by typing or speaking, filter by department, update details, or view profiles.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              Browse {totalMembers} Members →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('attendance-history')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-600 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-white transition">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Attendance History
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Review historical attendance sessions by date and see past congregational trends.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              View History ({sessionList.length} Sessions) →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-yellow-400 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-blue-950 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-yellow-300 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Attendance Reports & CSV
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Generate attendance percentages and download CSV files for church records and board review.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              Download CSV Reports →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-yellow-400 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center mb-3 group-hover:bg-yellow-400 group-hover:text-blue-950 transition">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Homepage Images
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Upload, preview, and update the two customizable showcase images on the church homepage.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              Manage Images (2 Slots) →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-600 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-yellow-300 transition">
              <Settings className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Settings & Branding
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Upload church logo, manage services, export database backups, and change password.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              System Settings →
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-5 rounded-2xl bg-white border-2 border-blue-200 hover:border-blue-600 text-left hover:shadow-md transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center mb-3 group-hover:bg-blue-900 group-hover:text-yellow-300 transition">
              <History className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-blue-950 group-hover:text-blue-800">
              Audit & Activity History
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Review verified records of system resets and administrative security events.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 mt-3 group-hover:translate-x-1 transition-transform">
              View Activity Logs →
            </span>
          </button>
        </div>
      </div>

      {/* Latest Session Snapshot */}
      {latestSession && (
        <div className="bg-white rounded-3xl p-6 border border-blue-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                Most Recent Recorded Service
              </span>
              <h4 className="font-bold text-base text-blue-950">{latestSession.serviceName}</h4>
              <p className="text-xs text-gray-500">Date: {latestSession.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700">{latestPresentCount}</span>
              <span className="text-xs text-gray-500 ml-1">Present</span>
            </div>
            <button
              onClick={() => onNavigate('attendance-history')}
              className="px-4 py-2 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs"
            >
              View Roll
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
