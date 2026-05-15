const PBKDF2_ITERATIONS = 600_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;
const HASH_ALGO = 'SHA-256';

export const PASSWORD_HASHING = {
  algorithm: 'PBKDF2' as const,
  hash: HASH_ALGO,
  iterations: PBKDF2_ITERATIONS,
  saltBytes: SALT_BYTES,
  hashBits: HASH_BITS,
};

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

export async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(saltBytes), iterations, hash: HASH_ALGO },
    baseKey,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}
