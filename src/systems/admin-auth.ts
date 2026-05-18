/**
 * Synthetic admin session. ADR-0034.
 *
 * Hidden /admin/login route uses these to authenticate. No PBKDF2 — the
 * password is hardcoded in source and visible in DevTools regardless
 * (this is a local-only app; the admin gate is a UI convenience, not a
 * security boundary).
 */

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin12345';
const ADMIN_KEY = 'localGamble.session.admin';

export type LoginAdminError = 'invalid_credentials';

export type LoginAdminResult = { ok: true } | { ok: false; error: LoginAdminError };

export function loginAdmin(input: { username: string; password: string }): LoginAdminResult {
  if (input.username !== ADMIN_USERNAME || input.password !== ADMIN_PASSWORD) {
    return { ok: false, error: 'invalid_credentials' };
  }
  try {
    localStorage.setItem(ADMIN_KEY, '1');
  } catch {
    // localStorage unavailable — admin login still "ok" but session won't persist
  }
  return { ok: true };
}

export function restoreAdminSession(): { isAdmin: boolean } {
  try {
    return { isAdmin: localStorage.getItem(ADMIN_KEY) === '1' };
  } catch {
    return { isAdmin: false };
  }
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
}
