import { ChurchMember } from '../types';

/**
 * Generates the next sequential unique Member ID according to church formatting: HOP-MK-XXX
 * Safely analyzes all existing member IDs to find the maximum assigned index.
 * If no members exist (e.g. after a system reset), restarts fresh from HOP-MK-001.
 */
export const generateNextMemberId = (members: ChurchMember[]): string => {
  let maxNum = 0;

  for (const member of members) {
    if (!member.memberId) continue;
    const match = member.memberId.match(/HOP-MK-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNumber = maxNum + 1;
  return `HOP-MK-${String(nextNumber).padStart(3, '0')}`;
};

/**
 * Checks if a member ID is unique among existing congregation records.
 */
export const isMemberIdUnique = (
  candidateId: string,
  members: ChurchMember[],
  currentMemberId?: string
): boolean => {
  const normalizedCandidate = candidateId.trim().toUpperCase();
  const normalizedCurrent = currentMemberId?.trim().toUpperCase();

  return !members.some((m) => {
    const existingNormalized = m.memberId?.trim().toUpperCase();
    if (normalizedCurrent && existingNormalized === normalizedCurrent) {
      return false;
    }
    return existingNormalized === normalizedCandidate;
  });
};
