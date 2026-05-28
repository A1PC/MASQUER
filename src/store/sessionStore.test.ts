import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from './sessionStore';

const SESSION_KEY = 'masquer.session.userId';
const ADMIN_KEY = 'masquer.session.admin';

function resetStore() {
  useSessionStore.setState({
    currentUser: null,
    bootstrapping: true,
    isAdmin: false,
    currentSessionId: null,
  });
}

describe('sessionStore', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    resetStore();
  });

  it('bootstrap with no session sets currentUser=null and bootstrapping=false', async () => {
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(useSessionStore.getState().bootstrapping).toBe(false);
  });

  it('register sets currentUser on success', async () => {
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('register does not set currentUser on failure', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(false);
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('login sets currentUser on success', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().login({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('logout clears currentUser', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser).not.toBeNull();
    await useSessionStore.getState().logout();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('bootstrap restores previously registered user', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });
});

describe('sessionStore.login — session tracking', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    resetStore();
    useSessionStore.setState({ bootstrapping: false });
  });

  it('writes a sessions row + increments loginCount + sets lastLoginAt on successful login', async () => {
    await useSessionStore.getState().register({ username: 'alice', password: 'password123' });
    await useSessionStore.getState().logout();

    const before = Date.now();
    const r = await useSessionStore
      .getState()
      .login({ username: 'alice', password: 'password123' });
    const after = Date.now();
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const sessions = await db.sessions.where('userId').equals(r.user.id).toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.logoutAt).toBeNull();
    expect(sessions[0]!.durationMs).toBeNull();
    expect(sessions[0]!.loginAt).toBeGreaterThanOrEqual(before);
    expect(sessions[0]!.loginAt).toBeLessThanOrEqual(after);

    expect(useSessionStore.getState().currentSessionId).toBe(sessions[0]!.id);

    const userRow = await db.users.get(r.user.id);
    expect(userRow?.loginCount).toBe(1);
    expect(userRow?.lastLoginAt).toBeGreaterThanOrEqual(before);
  });

  it('orphan-cleans a prior open session when the same user logs in again', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'bob', password: 'password123' });
    if (!reg.ok) return;
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'bob', password: 'password123' });
    const firstSessionId = useSessionStore.getState().currentSessionId!;

    // Simulate a tab close without logout.
    useSessionStore.setState({ currentSessionId: null, currentUser: null });
    localStorage.removeItem(SESSION_KEY);

    const orphan = await db.sessions.get(firstSessionId);
    expect(orphan?.logoutAt).toBeNull();

    await useSessionStore.getState().login({ username: 'bob', password: 'password123' });
    const cleaned = await db.sessions.get(firstSessionId);
    expect(cleaned?.logoutAt).not.toBeNull();
    expect(cleaned?.durationMs).toBeGreaterThanOrEqual(0);

    const all = await db.sessions.where('userId').equals(reg.user.id).toArray();
    expect(all).toHaveLength(2);

    const userRow = await db.users.get(reg.user.id);
    expect(userRow?.loginCount).toBe(2);
  });

  it('does NOT write a sessions row when login fails', async () => {
    const r = await useSessionStore.getState().login({ username: 'ghost', password: 'whatever' });
    expect(r.ok).toBe(false);
    const sessions = await db.sessions.toArray();
    expect(sessions).toHaveLength(0);
    expect(useSessionStore.getState().currentSessionId).toBeNull();
  });
});

describe('sessionStore.logout — session tracking', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    resetStore();
    useSessionStore.setState({ bootstrapping: false });
  });

  it('closes the active session with logoutAt + durationMs on explicit logout', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'lara', password: 'password123' });
    if (!reg.ok) return;
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'lara', password: 'password123' });
    const sid = useSessionStore.getState().currentSessionId!;

    const before = Date.now();
    await useSessionStore.getState().logout();
    const after = Date.now();

    const closed = await db.sessions.get(sid);
    expect(closed?.logoutAt).toBeGreaterThanOrEqual(before);
    expect(closed?.logoutAt).toBeLessThanOrEqual(after);
    expect(closed?.durationMs).toBeGreaterThanOrEqual(0);
    expect(useSessionStore.getState().currentSessionId).toBeNull();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('logout is a no-op for an already-closed session (defensive)', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'mark', password: 'password123' });
    if (!reg.ok) return;
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'mark', password: 'password123' });
    const sid = useSessionStore.getState().currentSessionId!;
    await db.sessions.update(sid, { logoutAt: 12345, durationMs: 12345 });
    await useSessionStore.getState().logout();
    const row = await db.sessions.get(sid);
    expect(row?.logoutAt).toBe(12345);
    expect(row?.durationMs).toBe(12345);
  });
});

describe('sessionStore — admin methods', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_KEY);
    resetStore();
    useSessionStore.setState({ bootstrapping: false });
  });
  afterEach(() => {
    localStorage.removeItem(ADMIN_KEY);
    resetStore();
  });

  it('loginAdmin with correct creds flips isAdmin true and persists', () => {
    const r = useSessionStore.getState().loginAdmin({ username: 'admin', password: 'admin12345' });
    expect(r).toEqual({ ok: true });
    expect(useSessionStore.getState().isAdmin).toBe(true);
    expect(localStorage.getItem(ADMIN_KEY)).toBe('1');
  });

  it('loginAdmin with wrong creds leaves isAdmin false', () => {
    const r = useSessionStore.getState().loginAdmin({ username: 'admin', password: 'wrong' });
    expect(r).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });

  it('logoutAdmin clears the flag and the localStorage key', () => {
    useSessionStore.getState().loginAdmin({ username: 'admin', password: 'admin12345' });
    useSessionStore.getState().logoutAdmin();
    expect(useSessionStore.getState().isAdmin).toBe(false);
    expect(localStorage.getItem(ADMIN_KEY)).toBeNull();
  });

  it('bootstrap restores admin session if localStorage has the key', async () => {
    localStorage.setItem(ADMIN_KEY, '1');
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().isAdmin).toBe(true);
  });
});
