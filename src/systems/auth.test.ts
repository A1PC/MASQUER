import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { AVATAR_PALETTE } from '@/systems/avatar';
import { PASSWORD_HASHING } from '@/systems/crypto';
import { login, logout, register, restoreSession } from './auth';

const SESSION_KEY = 'localGamble.session.userId';

describe('auth.register', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('creates user + balance row + sets session', async () => {
    const result = await register({ username: 'Adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const userInDb = await db.users.get(result.user.id);
    const balanceInDb = await db.balances.get(result.user.id);
    expect(userInDb?.username).toBe('Adam');
    expect(balanceInDb?.chips).toBe(1000);
    expect(localStorage.getItem(SESSION_KEY)).toBe(result.user.id);
  });

  it('rejects duplicate username case-insensitively', async () => {
    await register({ username: 'Adam', password: 'password123' });
    const second = await register({ username: 'aDaM', password: 'password123' });
    expect(second).toEqual({ ok: false, error: 'username_taken' });
  });

  it('strips username whitespace', async () => {
    const result = await register({ username: '  adam  ', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.username).toBe('adam');
  });

  it('assigns avatarColor from the curated palette', async () => {
    const result = await register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(AVATAR_PALETTE).toContain(result.user.avatarColor);
    }
  });

  it('stores pbkdf2Iterations matching current PASSWORD_HASHING.iterations', async () => {
    const result = await register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.pbkdf2Iterations).toBe(PASSWORD_HASHING.iterations);
    }
  });

  it('produces different password hashes for two users with the same password (salt is unique)', async () => {
    const a = await register({ username: 'alice', password: 'samepassword' });
    const b = await register({ username: 'bob', password: 'samepassword' });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.user.passwordHash).not.toBe(b.user.passwordHash);
      expect(a.user.passwordSalt).not.toBe(b.user.passwordSalt);
    }
  });
});

describe('auth.login', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('succeeds with correct credentials', async () => {
    await register({ username: 'Adam', password: 'password123' });
    localStorage.removeItem(SESSION_KEY);
    const result = await login({ username: 'Adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(localStorage.getItem(SESSION_KEY)).toBe(result.user.id);
    }
  });

  it('matches username case-insensitively', async () => {
    await register({ username: 'Adam', password: 'password123' });
    const result = await login({ username: 'aDaM', password: 'password123' });
    expect(result.ok).toBe(true);
  });

  it('fails with wrong password', async () => {
    await register({ username: 'adam', password: 'password123' });
    const result = await login({ username: 'adam', password: 'wrongpass' });
    expect(result).toEqual({ ok: false, error: 'invalid_credentials' });
  });

  it('fails for non-existent user', async () => {
    const result = await login({ username: 'ghost', password: 'whatever' });
    expect(result).toEqual({ ok: false, error: 'invalid_credentials' });
  });

  it('runs the KDF even when user does not exist (no timing oracle)', async () => {
    await register({ username: 'adam', password: 'password123' });
    const t0 = performance.now();
    await login({ username: 'ghost', password: 'whatever' });
    const tNoUser = performance.now() - t0;

    const t1 = performance.now();
    await login({ username: 'adam', password: 'wrongpass' });
    const tWrongPwd = performance.now() - t1;

    // Allow a generous 50% delta — the point is "same order of magnitude"
    // not "identical to the millisecond." The 600k-iter KDF dominates both.
    const ratio = Math.abs(tNoUser - tWrongPwd) / Math.max(tNoUser, tWrongPwd);
    expect(ratio).toBeLessThan(0.5);
  });
});

describe('auth.logout and restoreSession', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('logout clears the session', async () => {
    await register({ username: 'adam', password: 'password123' });
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    await logout();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restoreSession returns the persisted user', async () => {
    const r = await register({ username: 'adam', password: 'password123' });
    expect(r.ok).toBe(true);
    const restored = await restoreSession();
    expect(restored?.id).toBe(r.ok ? r.user.id : '');
  });

  it('restoreSession cleans stale session when stored userId points to a deleted user', async () => {
    const r = await register({ username: 'adam', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.users.delete(r.user.id);
    const restored = await restoreSession();
    expect(restored).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restoreSession returns null when no session is stored', async () => {
    const restored = await restoreSession();
    expect(restored).toBeNull();
  });
});

describe('auth.register — reserved username', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it.each(['admin', 'Admin', 'ADMIN', '  admin  ', 'aDmIn'])(
    'rejects username %j (case- and whitespace-insensitive)',
    async (username) => {
      const r = await register({ username, password: 'password123' });
      expect(r).toEqual({ ok: false, error: 'reserved_username' });
    },
  );

  it('still accepts usernames that merely contain "admin" as a substring', async () => {
    const r = await register({ username: 'admin42', password: 'password123' });
    expect(r.ok).toBe(true);
  });
});

describe('auth.login — reserved username', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it.each(['admin', 'Admin', 'ADMIN', '  admin  '])(
    'rejects username %j with invalid_credentials (no enumeration of reservation)',
    async (username) => {
      const r = await login({ username, password: 'admin12345' });
      expect(r).toEqual({ ok: false, error: 'invalid_credentials' });
    },
  );
});

describe('auth.login — banned user', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('allows login when isBanned=true (overlay handles in-app suspension)', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    await db.users.update(reg.user.id, { isBanned: true });
    localStorage.removeItem(SESSION_KEY);

    // Banned users log in successfully so they reach the in-app BANNED
    // overlay (AppLayout renders it when currentUser.isBanned). Wallet.placeBet
    // refuses to debit chips while banned, so no chip movement is possible.
    const r = await login({ username: 'alice', password: 'password123' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user.isBanned).toBe(true);
  });

  it('allows login when isBanned=false (or undefined)', async () => {
    const reg = await register({ username: 'bob', password: 'password123' });
    expect(reg.ok).toBe(true);
    localStorage.removeItem(SESSION_KEY);
    const r = await login({ username: 'bob', password: 'password123' });
    expect(r.ok).toBe(true);
  });

  it('allows login after unban (isBanned=false)', async () => {
    const reg = await register({ username: 'carol', password: 'password123' });
    if (!reg.ok) return;
    await db.users.update(reg.user.id, { isBanned: true });
    localStorage.removeItem(SESSION_KEY);
    await db.users.update(reg.user.id, { isBanned: false });
    const r = await login({ username: 'carol', password: 'password123' });
    expect(r.ok).toBe(true);
  });
});
