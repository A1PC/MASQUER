import { db } from '@/db';
import type { User } from '@/db';
import {
  PASSWORD_HASHING,
  base64ToBytes,
  bytesToBase64,
  deriveKey,
  generateSalt,
  timingSafeEqual,
} from '@/systems/crypto';
import { pickRandomAvatarColor } from '@/systems/avatar';
import { WALLET_CONFIG } from '@/systems/wallet';

const SESSION_KEY = 'localGamble.session.userId';

export type RegisterError = 'username_taken' | 'reserved_username' | 'unknown';
export type LoginError = 'invalid_credentials' | 'banned' | 'unknown';

export type RegisterResult = { ok: true; user: User } | { ok: false; error: RegisterError };

export type LoginResult = { ok: true; user: User } | { ok: false; error: LoginError };

export async function register(input: {
  username: string;
  password: string;
}): Promise<RegisterResult> {
  const trimmed = input.username.trim();
  if (trimmed.toLowerCase() === 'admin') {
    return { ok: false, error: 'reserved_username' };
  }
  const usernameLower = trimmed.toLowerCase();
  const salt = generateSalt();
  const hash = await deriveKey(input.password, salt, PASSWORD_HASHING.iterations);

  const user: User = {
    id: crypto.randomUUID(),
    username: trimmed,
    usernameLower,
    passwordHash: bytesToBase64(hash),
    passwordSalt: bytesToBase64(salt),
    pbkdf2Iterations: PASSWORD_HASHING.iterations,
    avatarColor: pickRandomAvatarColor(),
    createdAt: Date.now(),
  };

  try {
    await db.transaction('rw', db.users, db.balances, async () => {
      await db.users.add(user);
      await db.balances.add({
        userId: user.id,
        chips: WALLET_CONFIG.STARTING_CHIPS,
        updatedAt: Date.now(),
      });
    });
  } catch (e) {
    if (isUniqueIndexError(e)) return { ok: false, error: 'username_taken' };
    return { ok: false, error: 'unknown' };
  }

  setStoredSession(user.id);
  return { ok: true, user };
}

export async function login(input: { username: string; password: string }): Promise<LoginResult> {
  const usernameLower = input.username.trim().toLowerCase();
  if (usernameLower === 'admin') {
    // Reserved — short-circuit to invalid_credentials without leaking the
    // reservation via a distinct error. Run the KDF anyway to keep timing
    // consistent with the normal-failure path.
    const salt = generateSalt();
    await deriveKey(input.password, salt, PASSWORD_HASHING.iterations);
    return { ok: false, error: 'invalid_credentials' };
  }
  const user = await db.users.where('usernameLower').equals(usernameLower).first();
  const salt = user ? base64ToBytes(user.passwordSalt) : generateSalt();
  const iters = user?.pbkdf2Iterations ?? PASSWORD_HASHING.iterations;
  const candidateHash = await deriveKey(input.password, salt, iters);

  if (!user) return { ok: false, error: 'invalid_credentials' };

  const storedHash = base64ToBytes(user.passwordHash);
  if (!timingSafeEqual(candidateHash, storedHash)) {
    return { ok: false, error: 'invalid_credentials' };
  }

  if (user.isBanned === true) {
    return { ok: false, error: 'banned' };
  }

  setStoredSession(user.id);
  return { ok: true, user };
}

export function logout(): Promise<void> {
  clearStoredSession();
  return Promise.resolve();
}

export async function restoreSession(): Promise<User | null> {
  const id = getStoredSessionId();
  if (!id) return null;
  const user = await db.users.get(id);
  if (!user) {
    clearStoredSession();
    return null;
  }
  return user;
}

function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setStoredSession(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {
    // localStorage unavailable
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function isUniqueIndexError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'name' in e &&
    (e as Record<string, unknown>).name === 'ConstraintError'
  );
}
