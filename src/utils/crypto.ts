/**
 * Cryptographic Utility for Secure Password Hashing & Authentication
 * Uses Web Crypto API (SubtleCrypto) with PBKDF2 + SHA-512 + 100,000 iterations.
 * Passwords are NEVER stored in plain text.
 */

export const generateSalt = (): string => {
  const array = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const hashPassword = async (password: string, salt: string): Promise<string> => {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback simulation for non-subtle environments
    return simpleSha256Fallback(password + salt);
  }

  try {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-512',
      },
      passwordKey,
      512
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Crypto subtle failed, using SHA fallback', err);
    return simpleSha256Fallback(password + salt);
  }
};

export const verifyPassword = async (
  passwordAttempt: string,
  salt: string,
  storedHash: string
): Promise<boolean> => {
  const attemptHash = await hashPassword(passwordAttempt, salt);
  return attemptHash === storedHash;
};

// Fallback digest if SubtleCrypto is unavailable in certain sandboxes
const simpleSha256Fallback = async (input: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Pure JS DJB2/FNV-like hash for complete fallback
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const generateSessionToken = (): string => {
  const randBytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randBytes);
  } else {
    for (let i = 0; i < randBytes.length; i++) {
      randBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(randBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `hopmic_adm_${Date.now()}_${hex}`;
};
