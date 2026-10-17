import { ChurchMember, AttendanceSession } from '../types';

export const exportAttendanceToCsv = (
  session: AttendanceSession,
  members: ChurchMember[]
): void => {
  const memberMap = new Map(members.map((m) => [m.memberId, m]));

  const headers = [
    'Service Name',
    'Date',
    'Member ID',
    'Full Name',
    'Phone Number',
    'Gender',
    'Age Group',
    'Department / Ministry',
    'Mankessim Residential Area',
    'Status',
    'Attendance Status',
    'Recorded By',
    'Notes',
  ];

  const rows: string[][] = [];

  members.forEach((m) => {
    const record = session.records[m.memberId];
    const isPresent = record?.status === 'present';
    rows.push([
      `"${session.serviceName.replace(/"/g, '""')}"`,
      `"${session.date}"`,
      `"${m.memberId}"`,
      `"${m.fullName.replace(/"/g, '""')}"`,
      `"${m.phone}"`,
      `"${m.gender}"`,
      `"${m.ageGroup}"`,
      `"${m.department.replace(/"/g, '""')}"`,
      `"${m.residentialArea.replace(/"/g, '""')}"`,
      `"${m.status}"`,
      `"${record?.status === 'present' ? 'PRESENT' : record?.status === 'excused' ? 'EXCUSED' : 'ABSENT'}"`,
      `"${record?.markedBy || ''}"`,
      `"${(record?.notes || '').replace(/"/g, '""')}"`,
    ]);
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = session.serviceName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  link.setAttribute('href', url);
  link.setAttribute('download', `HOPMIC_Attendance_${safeName}_${session.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportMembersToCsv = (members: ChurchMember[]): void => {
  const headers = [
    'Member ID',
    'Full Name',
    'Phone Number',
    'Gender',
    'Age Group',
    'Department',
    'Mankessim Residential Area',
    'Membership Status',
    'Joined Date',
    'Notes',
  ];

  const rows = members.map((m) => [
    `"${m.memberId}"`,
    `"${m.fullName.replace(/"/g, '""')}"`,
    `"${m.phone}"`,
    `"${m.gender}"`,
    `"${m.ageGroup}"`,
    `"${m.department.replace(/"/g, '""')}"`,
    `"${m.residentialArea.replace(/"/g, '""')}"`,
    `"${m.status}"`,
    `"${m.joinedDate}"`,
    `"${(m.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `HOPMIC_Mankessim_Members_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
