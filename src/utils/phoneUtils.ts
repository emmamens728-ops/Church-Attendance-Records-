/**
 * Utility functions for Ghanaian and international telephone and SMS links.
 * Normalizes phone numbers safely for tel: and sms: protocol URIs without
 * altering the original stored representation in member records.
 */

export function normalizeGhanaPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'na' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'nil'
  ) {
    return null;
  }

  // Remove whitespace, hyphens, brackets, dots
  const stripped = trimmed.replace(/[\s\-\(\)\.]/g, '');

  // If already prefixed with + (international format)
  if (stripped.startsWith('+')) {
    const digits = stripped.slice(1).replace(/\D/g, '');
    if (digits.length < 7) return null;
    return `+${digits}`;
  }

  // Extract all digit characters
  const digits = stripped.replace(/\D/g, '');
  if (digits.length < 7) return null;

  // If starts with Ghana country code '233' (e.g. 233241234567)
  if (digits.startsWith('233')) {
    return `+${digits}`;
  }

  // If standard Ghanaian local number starting with '0' (e.g. 024XXXXXXX, 020XXXXXXX, 055XXXXXXX, 050XXXXXXX, etc.)
  if (digits.startsWith('0')) {
    return `+233${digits.slice(1)}`;
  }

  // 9 digits without leading 0 (e.g. 24XXXXXXX)
  if (digits.length === 9) {
    return `+233${digits}`;
  }

  // Any other valid digit sequence: fallback to Ghana country code
  return `+233${digits}`;
}

export function isPhoneValid(phone?: string | null): boolean {
  return normalizeGhanaPhone(phone) !== null;
}
