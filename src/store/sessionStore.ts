import { create } from 'zustand';
import * as auth from '@/systems/auth';
import * as adminAuth from '@/systems/admin-auth';
import { db } from '@/db';
import type { User } from '@/db';
import type { LoginResult, RegisterResult } from '@/systems/auth';
import type { LoginAdminResult } from '@/systems/admin-auth';

interface SessionState {
  currentUser: User | null;
  bootstrapping: boolean;
  /** True when the admin login is active. Independent of currentUser. */
  isAdmin: boolean;
  /** UUID of the active `sessions` row for the logged-in user. Null when no
   *  user is logged in. Used by logout + beforeunload to close the row. */
  currentSessionId: string | null;

  bootstrap: () => Promise<void>;
  register: (input: { username: string; password: string }) => Promise<RegisterResult>;
  login: (input: { username: string; password: string }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  loginAdmin: (input: { username: string; password: string }) => LoginAdminResult;
  logoutAdmin: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentUser: null,
  bootstrapping: true,
  isAdmin: false,
  currentSessionId: null,

  bootstrap: async () => {
    const user = await auth.restoreSession();
    const { isAdmin } = adminAuth.restoreAdminSession();
    set({ currentUser: user, isAdmin, bootstrapping: false });
  },

  register: async (input) => {
    const result = await auth.register(input);
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  login: async (input) => {
    const result = await auth.login(input);
    if (!result.ok) return result;
    const now = Date.now();

    // Orphan cleanup: close any prior open session for this user.
    const openPrior = await db.sessions
      .where('[userId+loginAt]')
      .between([result.user.id, 0], [result.user.id, Infinity])
      .filter((s) => s.logoutAt === null)
      .first();
    if (openPrior) {
      await db.sessions.update(openPrior.id, {
        logoutAt: now,
        durationMs: now - openPrior.loginAt,
      });
    }

    // Write the new session row.
    const sessionId = crypto.randomUUID();
    await db.sessions.add({
      id: sessionId,
      userId: result.user.id,
      loginAt: now,
      logoutAt: null,
      durationMs: null,
    });

    // Bump loginCount + lastLoginAt on the user row.
    await db.users.update(result.user.id, {
      loginCount: (result.user.loginCount ?? 0) + 1,
      lastLoginAt: now,
    });

    const freshUser = (await db.users.get(result.user.id)) ?? result.user;
    set({ currentUser: freshUser, currentSessionId: sessionId });
    return { ok: true, user: freshUser };
  },

  logout: async () => {
    const { currentSessionId } = get();
    if (currentSessionId) {
      const now = Date.now();
      const session = await db.sessions.get(currentSessionId);
      if (session && session.logoutAt === null) {
        await db.sessions.update(currentSessionId, {
          logoutAt: now,
          durationMs: now - session.loginAt,
        });
      }
    }
    await auth.logout();
    set({ currentUser: null, currentSessionId: null });
  },

  loginAdmin: (input) => {
    const result = adminAuth.loginAdmin(input);
    if (result.ok) set({ isAdmin: true });
    return result;
  },

  logoutAdmin: () => {
    adminAuth.logoutAdmin();
    set({ isAdmin: false });
  },
}));

export const useCurrentUser = (): User | null => useSessionStore((s) => s.currentUser);

export const useIsBootstrapping = (): boolean => useSessionStore((s) => s.bootstrapping);

export const useIsAdmin = (): boolean => useSessionStore((s) => s.isAdmin);
