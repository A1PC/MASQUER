import { create } from 'zustand';
import * as auth from '@/systems/auth';
import type { User } from '@/db';
import type { LoginResult, RegisterResult } from '@/systems/auth';

interface SessionState {
  currentUser: User | null;
  bootstrapping: boolean;

  bootstrap: () => Promise<void>;
  register: (input: { username: string; password: string }) => Promise<RegisterResult>;
  login: (input: { username: string; password: string }) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  bootstrapping: true,

  bootstrap: async () => {
    const user = await auth.restoreSession();
    set({ currentUser: user, bootstrapping: false });
  },

  register: async (input) => {
    const result = await auth.register(input);
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  login: async (input) => {
    const result = await auth.login(input);
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  logout: async () => {
    await auth.logout();
    set({ currentUser: null });
  },
}));

export const useCurrentUser = (): User | null => useSessionStore((s) => s.currentUser);

export const useIsBootstrapping = (): boolean => useSessionStore((s) => s.bootstrapping);
