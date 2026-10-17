import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Award,
  TrendingUp,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { exportAttendanceToCsv, exportMembersToCsv } from '../utils/exportCsv';
import { ChurchMember, ChurchService, AttendanceSession } from '../types';

interface AttendanceReportsProps {
  members: ChurchMember[];
  services: ChurchService[];
  sessions: Record<string, AttendanceSession>;
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
  members,
  services,
  sessions,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    Object.keys(sessions)[0] || ''
  );

  const sessionList = useMemo(() => {
    return Object.values(sessions).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [sessions]);

  const activeSession = sessions[selectedSessionId] || sessionList[0];

  // Overall attendance calculation
  const sessionStats = useMemo(() => {
    if (!activeSession) return null;
    let presentCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let visitorCount = 0;

    members.forEach((m) => {
      if (activeSession.records[m.memberId]?.status === 'present') {
        presentCount++;
        if (m.gender === 'Male') maleCount++;
        if (m.gender === 'Female') femaleCount++;
        if (m.status === 'Visitor / First Timer') visitorCount++;
      }
    });

    const total = members.length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return {
      total,
      presentCount,
      absentCount: total - presentCount,
      rate,
      maleCount,
      femaleCount,
      visitorCount,
    };
  }, [activeSession, members]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-blue-950">
            Attendance Reports & Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Historical attendance registers, CSV spreadsheets, and congregational statistics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportMembersToCsv(members)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center gap-1.5 border border-blue-200 transition"
          >
            <Download className="w-4 h-4 text-blue-700" />
            <span>Export Members Directory</span>
          </button>

          {activeSession && (
            <button
              onClick={() => exportAttendanceToCsv(activeSession, members)}
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Selected Session CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions list */}
        <div className="bg-white rounded-3xl p-5 border border-blue-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
            Past Recorded Sessions ({sessionList.length})
          </h4>

          {sessionList.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No attendance sessions recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {sessionList.map((s) => {
                const isSelected = s.id === (activeSession?.id || '');
                const presentCount = Object.values(s.records).filter(
                  (r) => r.status === 'present'
                ).length;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3 rounded-2xl cursor-pointer transition border ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={isSelected ? 'text-yellow-300' : 'text-blue-950'}>
                        {s.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          isSelected
                            ? 'bg-yellow-400 text-blue-950 font-black'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {presentCount} Present
                      </span>
                    </div>
                    <p className={`text-xs mt-1 font-medium truncate ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                      {s.serviceName}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Session Details & Tally */}
        <div className="lg:col-span-2 space-y-4">
          {activeSession && sessionStats ? (
            <div className="bg-white rounded-3xl p-6 border border-blue-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-xs font-extrabold text-yellow-600 uppercase tracking-wider">
                    Detailed Session Register
                  </span>
                  <h4 className="text-lg font-black text-blue-950">
                    {activeSession.serviceName}
                  </h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>Date: {activeSession.date}</span>
                  </p>
                </div>

                <button
                  onClick={() => exportAttendanceToCsv(activeSession, members)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-900 text-yellow-300 font-bold text-xs flex items-center gap-1.5 self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Stat breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800">Total Present</span>
                  <p className="text-2xl font-black text-emerald-700">{sessionStats.presentCount}</p>
                </div>

                <div className="p-3 bg-red-50 rounded-2xl border border-red-200">
                  <span className="text-[11px] font-bold text-red-800">Total Absent</span>
                  <p className="text-2xl font-black text-red-700">{sessionStats.absentCount}</p>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-800">Attendance Rate</span>
                  <p className="text-2xl font-black text-blue-900">{sessionStats.rate}%</p>
                </div>

                <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-200">
                  <span className="text-[11px] font-bold text-yellow-900">First-Timers</span>
                  <p className="text-2xl font-black text-yellow-950">{sessionStats.visitorCount}</p>
                </div>
              </div>

              {/* Members status in this session */}
              <div>
                <h5 className="text-xs font-bold text-gray-700 uppercase mb-2">
                  Session Attendance Breakdown
                </h5>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl">
                  {members.map((m) => {
                    const record = activeSession.records[m.memberId];
                    const isPresent = record?.status === 'present';

                    return (
                      <div
                        key={m.id}
                        className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-950">{m.fullName}</span>
                          <span className="font-mono text-[10px] text-gray-500">({m.memberId})</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isPresent ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-gray-500 border border-blue-200">
              Select a session on the left to view attendance details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
