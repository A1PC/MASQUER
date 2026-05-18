import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loginAdmin, logoutAdmin, restoreAdminSession } from './admin-auth';

const ADMIN_KEY = 'localGamble.session.admin';

describe('admin-auth', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_KEY);
  });
  afterEach(() => {
    localStorage.removeItem(ADMIN_KEY);
  });

  describe('loginAdmin', () => {
    it('succeeds with the canonical credentials', () => {
      const r = loginAdmin({ username: 'admin', password: 'admin12345' });
      expect(r).toEqual({ ok: true });
      expect(localStorage.getItem(ADMIN_KEY)).toBe('1');
    });

    it('rejects wrong password', () => {
      const r = loginAdmin({ username: 'admin', password: 'wrong' });
      expect(r).toEqual({ ok: false, error: 'invalid_credentials' });
      expect(localStorage.getItem(ADMIN_KEY)).toBeNull();
    });

    it('rejects wrong username', () => {
      const r = loginAdmin({ username: 'root', password: 'admin12345' });
      expect(r).toEqual({ ok: false, error: 'invalid_credentials' });
      expect(localStorage.getItem(ADMIN_KEY)).toBeNull();
    });

    it('username comparison is case-sensitive (Admin ≠ admin)', () => {
      const r = loginAdmin({ username: 'Admin', password: 'admin12345' });
      expect(r).toEqual({ ok: false, error: 'invalid_credentials' });
    });
  });

  describe('restoreAdminSession', () => {
    it('returns { isAdmin: false } when key absent', () => {
      expect(restoreAdminSession()).toEqual({ isAdmin: false });
    });

    it('returns { isAdmin: true } when key is "1"', () => {
      localStorage.setItem(ADMIN_KEY, '1');
      expect(restoreAdminSession()).toEqual({ isAdmin: true });
    });

    it('returns { isAdmin: false } when key has any other value', () => {
      localStorage.setItem(ADMIN_KEY, 'bogus');
      expect(restoreAdminSession()).toEqual({ isAdmin: false });
    });
  });

  describe('logoutAdmin', () => {
    it('clears the admin key', () => {
      localStorage.setItem(ADMIN_KEY, '1');
      logoutAdmin();
      expect(localStorage.getItem(ADMIN_KEY)).toBeNull();
    });

    it('is a no-op when no admin session exists', () => {
      expect(() => logoutAdmin()).not.toThrow();
      expect(localStorage.getItem(ADMIN_KEY)).toBeNull();
    });
  });
});
