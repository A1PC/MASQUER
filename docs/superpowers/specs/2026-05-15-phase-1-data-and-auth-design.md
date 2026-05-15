# Phase 1 — Data + Auth — Design Spec

- **Status:** Approved (2026-05-15)
- **Author:** @adamzspare (with Claude Opus 4.7)
- **Phase:** 1 of 9 (BUILD_GUIDE.md §12)
- **Supersedes:** —
- **Related ADRs:** 0008–0012 (created as part of this phase)
- **Implementation plan:** `docs/superpowers/plans/2026-05-15-phase-1-data-and-auth-plan.md` (to be written next)

---

## 1. Goal

Stand up the data layer (IndexedDB via Dexie) and the local-profile auth
system so every later phase has:

- a persistent typed database with versioned schema migrations,
- a `currentUser` accessible from anywhere via a Zustand store,
- route protection that gates `/lobby`, `/stats`, `/leaderboard`, and all
  future game pages,
- a starter chip balance (1,000) provisioned at registration time so
  Phase 2's wallet API has a row to read from on day one.

Phase 1 is complete when BUILD_GUIDE §12 row 1's definition of done is
met: **"Can register a user, log out, log back in; refresh keeps you
logged in; password is hashed in the DB."**

## 2. Non-goals (explicitly out of scope)

- Wallet read/write API (`placeBet`, `settleRound`, `getBalance`) → Phase 2
- Game logic of any kind → Phases 3–6
- Stats or leaderboard → Phase 7
- Password reset / change-password flow → out of MVP entirely (no channel)
- "Delete my account" UI → out of MVP
- "Remember me" checkbox → session always persists per BUILD_GUIDE §7
- Password rehash on login when iteration count later bumps → Phase 8
- Session expiration → no security boundary to defend
- Multi-tab session sync → other tabs see stale state until refresh
- Avatar customization UI → random palette pick only, user-pick is Phase 8
- CSV/JSON export of profile data → out of MVP

## 3. Decisions made

| #   | Decision                                                                                                                                  | Rationale                                                                                     | ADR                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| 1   | Phase 1 ships `users`+`balances`+`rounds` schema; registers create both `users` and `balances` rows in one transaction                    | Phase 2 wallet API can assume the row exists; transactional creation prevents drift           | — (BUILD_GUIDE §7) |
| 2   | PBKDF2-HMAC-SHA-256 with **600,000 iterations**; iteration count stored per-user                                                          | OWASP 2024 recommendation; per-user storage allows future bumps without breaking old accounts | 0009               |
| 3   | Auth API as pure async functions in `src/systems/auth.ts` with discriminated-union result types; Zustand `sessionStore` is a thin wrapper | Pattern matches Phase 2's `wallet.ts` + `walletStore.ts`; testable without React              | 0008               |
| 4   | Forms via **React Hook Form + Zod**; schemas live in `src/systems/auth-schemas.ts`                                                        | Reusable schemas (forms + auth.ts both validate); future BettingPanel uses same pattern       | 0012               |
| 5   | Route protection via `<RequireAuth>` wrapper component per protected route                                                                | Most common React Router pattern; easy to grep                                                | 0011               |
| 6   | Username stored as entered (`username`) PLUS an indexed lowercase field (`usernameLower`) for unique lookups                              | Pretty display + case-insensitive uniqueness enforced by Dexie's `&` unique index             | —                  |
| 7   | Avatar color randomly picked from a **curated 10-color palette** matching the retro Vegas theme                                           | Guarantees every avatar reads well on dark felt                                               | —                  |
| 8   | Session persistence via `localStorage` key `localGamble.session.userId`                                                                   | Single string, synchronous read on app boot, survives refresh and tab close                   | 0010               |
| 9   | Three-PR sequence: data layer → auth system → UI wiring                                                                                   | Matches Phase 0 cadence; each PR's CI tests against its own additions                         | —                  |

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│  UI LAYER (src/pages/, src/components/)                          │
│  LoginPage, RegisterPage, LobbyPage, RequireAuth                 │
│  React Hook Form + Zod for forms; Tailwind for styling           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ subscribes to + calls
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  STATE LAYER (src/store/)                                        │
│  sessionStore: { currentUser, bootstrapping, login, register,    │
│                  logout, bootstrap }                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ delegates I/O to
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  SYSTEMS LAYER (src/systems/)                                    │
│  auth.ts        → register / login / logout / restoreSession     │
│  crypto.ts      → PBKDF2 derive, timingSafeEqual, base64         │
│  avatar.ts      → palette + pickRandomAvatarColor                │
│  auth-schemas.ts → Zod validation schemas + inferred types       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ persists via
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  DATA LAYER (src/db/)                                            │
│  schema.ts → Dexie class + User/Balance/Round interfaces         │
│  index.ts  → singleton db export                                 │
│  + localStorage (one key, for session persistence)               │
└──────────────────────────────────────────────────────────────────┘
```

**Invariants enforced by the layering:**

- UI never touches `src/db` or `localStorage` directly. UI only knows about the store.
- Store never touches Dexie or localStorage directly. Store only calls `auth.ts`.
- Game code (`src/games/**`) won't touch any of this directly — when Phase 2+ adds game files, ESLint already enforces the import ban.

## 5. PR sequence

### PR #1 — Data layer (`phase-1-db`)

**Goal:** Working Dexie schema + typed helpers + test DB harness. No auth, no UI.

**Files added:**

```
src/db/schema.ts              ~60 lines — User/Balance/Round interfaces + LocalGambleDB class
src/db/index.ts               ~5 lines — singleton export
src/db/db.test.ts             ~80 lines — schema sanity tests
src/test/db-helpers.ts        ~15 lines — resetDb() helper
docs/adr/0008-discriminated-union-results.md
docs/adr/0009-pbkdf2-600k-iterations.md
docs/adr/0010-session-persistence-localstorage.md
docs/adr/0011-route-protection-requireauth.md
docs/adr/0012-forms-rhf-zod.md
```

**Files modified:**

```
src/test/setup.ts             — add `import 'fake-indexeddb/auto';` line
docs/risks.md                 — add R-16..R-23
```

**Dependencies added:**

- `fake-indexeddb` (devDependency)

### PR #2 — Auth system (`phase-1-auth-system`)

**Goal:** Pure-function auth API with full unit test coverage. No UI changes.

**Files added:**

```
src/systems/crypto.ts         ~50 lines — PBKDF2 helpers, base64, timingSafeEqual
src/systems/crypto.test.ts    ~50 lines — 5 sanity tests
src/systems/avatar.ts         ~20 lines — palette + pickRandomAvatarColor
src/systems/avatar.test.ts    ~30 lines — palette membership, crypto.getRandomValues used
src/systems/auth-schemas.ts   ~30 lines — Zod schemas + inferred types
src/systems/auth-schemas.test.ts ~60 lines — validation cases
src/systems/auth.ts           ~150 lines — register / login / logout / restoreSession
src/systems/auth.test.ts      ~250 lines — 15 tests covering Section 6.4 matrix
```

**Dependencies added:**

- `zod` (production)

### PR #3 — UI wiring (`phase-1-ui`)

**Goal:** Working register → log out → log in → refresh flow in the browser.

**Files added:**

```
src/store/sessionStore.ts          ~70 lines
src/store/sessionStore.test.ts     ~80 lines
src/components/RequireAuth.tsx     ~25 lines
src/components/RequireAuth.test.tsx ~50 lines
src/pages/LoginPage.test.tsx       ~80 lines
src/pages/RegisterPage.test.tsx    ~80 lines
src/pages/LobbyPage.test.tsx       ~50 lines
```

**Files modified:**

```
src/App.tsx                  — bootstrap call + loading splash + RequireAuth on protected routes
src/pages/LoginPage.tsx      — replaces placeholder with full form
src/pages/RegisterPage.tsx   — replaces placeholder with full form
src/pages/LobbyPage.tsx      — replaces placeholder with welcome + avatar + logout
src/App.test.tsx             — updated to assert /lobby redirects to /login when no session
```

**Dependencies added:**

- `react-hook-form` (production)
- `@hookform/resolvers` (production)

**Release:** After PR #3 merges, a `chore(release): v0.2-data-and-auth` PR adds CHANGELOG, then the tag is pushed.

## 6. File contents — verbatim drafts

### 6.1 `src/db/schema.ts`

```ts
import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  pbkdf2Iterations: number;
  avatarColor: string;
  createdAt: number;
}

export interface Balance {
  userId: string;
  chips: number;
  updatedAt: number;
}

export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: unknown;
  balanceAfter: number;
  playedAt: number;
}

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;

  constructor(name = 'localGamble') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
  }
}
```

### 6.2 `src/db/index.ts`

```ts
import { LocalGambleDB } from './schema';

export const db = new LocalGambleDB();

export type { User, Balance, Round } from './schema';
```

### 6.3 `src/test/db-helpers.ts`

```ts
import { db } from '@/db';

/** Wipe and re-open the DB. Use in beforeEach for tests that mutate. */
export async function resetDb(): Promise<void> {
  await db.delete();
  await db.open();
}
```

### 6.4 `src/test/setup.ts` (modified)

Original (PR #3 of Phase 0):

```ts
import '@testing-library/jest-dom/vitest';
```

After Phase 1 PR #1:

```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
```

`fake-indexeddb/auto` MUST be imported before any code that touches Dexie (Dexie binds to `indexedDB` at construction time). Putting it first in the setup file guarantees this for every test.

### 6.5 `src/systems/crypto.ts`

```ts
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
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: HASH_ALGO },
    baseKey,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Constant-time byte comparison. Returns true iff arrays are byte-equal. */
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
```

### 6.6 `src/systems/avatar.ts`

```ts
export const AVATAR_PALETTE = [
  '#a3122a',
  '#d4af37',
  '#3df0ff',
  '#ff5cf2',
  '#3dd17a',
  '#9c5cff',
  '#ff8c42',
  '#ffe066',
  '#27c4d6',
  '#e85d75',
] as const;

export type AvatarColor = (typeof AVATAR_PALETTE)[number];

export function pickRandomAvatarColor(): AvatarColor {
  const i = crypto.getRandomValues(new Uint32Array(1))[0]! % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[i]!;
}
```

### 6.7 `src/systems/auth-schemas.ts`

```ts
import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, underscore, and hyphen only');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### 6.8 `src/systems/auth.ts`

```ts
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

const SESSION_KEY = 'localGamble.session.userId';
const STARTING_CHIPS = 1000;

export type RegisterError = 'username_taken' | 'unknown';
export type LoginError = 'invalid_credentials' | 'unknown';

export type RegisterResult = { ok: true; user: User } | { ok: false; error: RegisterError };

export type LoginResult = { ok: true; user: User } | { ok: false; error: LoginError };

export async function register(input: {
  username: string;
  password: string;
}): Promise<RegisterResult> {
  const trimmed = input.username.trim();
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
        chips: STARTING_CHIPS,
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
  const user = await db.users.where('usernameLower').equals(usernameLower).first();
  const salt = user ? base64ToBytes(user.passwordSalt) : generateSalt();
  const iters = user?.pbkdf2Iterations ?? PASSWORD_HASHING.iterations;
  const candidateHash = await deriveKey(input.password, salt, iters);

  if (!user) return { ok: false, error: 'invalid_credentials' };

  const storedHash = base64ToBytes(user.passwordHash);
  if (!timingSafeEqual(candidateHash, storedHash)) {
    return { ok: false, error: 'invalid_credentials' };
  }

  setStoredSession(user.id);
  return { ok: true, user };
}

export async function logout(): Promise<void> {
  clearStoredSession();
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
    /* private mode */
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function isUniqueIndexError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'name' in e &&
    (e as { name: unknown }).name === 'ConstraintError'
  );
}
```

### 6.9 `src/store/sessionStore.ts`

```ts
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
```

### 6.10 `src/components/RequireAuth.tsx`

```tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/store/sessionStore';

interface Props {
  children: ReactNode;
}

export default function RequireAuth({ children }: Props): JSX.Element {
  const user = useCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

### 6.11 `src/App.tsx` (modified)

```tsx
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export default function App() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <LobbyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <StatsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <LeaderboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}
```

### 6.12 `src/pages/LoginPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { loginSchema, type LoginInput } from '@/systems/auth-schemas';

export default function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/lobby';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (currentUser) navigate(from, { replace: true });
  }, [currentUser, from, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await login(values);
    if (!result.ok) {
      setSubmitError('Invalid username or password.');
      return;
    }
    navigate(from, { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
        noValidate
      >
        <h1 className="text-center text-2xl text-gold">Sign in</h1>

        <label className="block">
          <span className="text-sm text-white/80">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('username')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.username.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        {submitError && (
          <p className="text-sm text-casino-red" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-casino-red px-4 py-2 font-display tracking-wide text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-white/70">
          New here?{' '}
          <Link to="/register" className="text-gold underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
```

### 6.13 `src/pages/RegisterPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { registerSchema, type RegisterInput } from '@/systems/auth-schemas';

export default function RegisterPage() {
  const registerUser = useSessionStore((s) => s.register);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (currentUser) navigate('/lobby', { replace: true });
  }, [currentUser, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await registerUser({
      username: values.username,
      password: values.password,
    });
    if (!result.ok) {
      if (result.error === 'username_taken') {
        setError('username', { message: 'That username is already taken.' });
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      return;
    }
    navigate('/lobby', { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
      >
        <h1 className="text-center text-2xl text-gold">Create an account</h1>

        <label className="block">
          <span className="text-sm text-white/80">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('username')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.username.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </label>

        {submitError && (
          <p className="text-sm text-casino-red" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-casino-red px-4 py-2 font-display tracking-wide text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-white/70">
          Already have one?{' '}
          <Link to="/login" className="text-gold underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
```

### 6.14 `src/pages/LobbyPage.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';

export default function LobbyPage() {
  const user = useCurrentUser();
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-label="avatar"
            className="inline-block h-10 w-10 rounded-full"
            style={{ backgroundColor: user.avatarColor }}
          />
          <h1 className="text-2xl">
            Welcome, <span className="text-gold">{user.username}</span>
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
        >
          Log out
        </button>
      </header>

      <p className="text-white/60">
        Phase 1 placeholder. Wallet, game grid, and stats land in upcoming phases.
      </p>
    </main>
  );
}
```

_The inline `style={{ backgroundColor: user.avatarColor }}` is the one
permitted place where a non-theme color value reaches a `style` attribute,
because the value is per-user dynamic data, not a static design token.
Document this exception in `docs/conventions.md` when ESLint's hex-literal
rule is added in Phase 8._

### 6.15 `src/App.test.tsx` (modified)

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

it('redirects to /login when no session is active', async () => {
  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});
```

## 7. Test plan

### 7.1 Auth system (`src/systems/auth.test.ts`)

| #   | Test                                                 | Asserts                                                          |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `register` creates user + balance row + sets session | Both DB rows exist; localStorage key set                         |
| 2   | `register` rejects duplicate (case-insensitive)      | Returns `{ok: false, error: 'username_taken'}`                   |
| 3   | `register` strips username whitespace                | Stored username is trimmed                                       |
| 4   | `register` assigns avatarColor from palette          | `result.user.avatarColor ∈ AVATAR_PALETTE`                       |
| 5   | `register` stores pbkdf2Iterations                   | Equals current `PASSWORD_HASHING.iterations`                     |
| 6   | `register` salts uniquely                            | Two calls with same password produce different `passwordHash`    |
| 7   | `login` succeeds with correct credentials            | Returns `{ok: true, user}`; session set                          |
| 8   | `login` succeeds case-insensitively for username     | `Adam` registers, `aDaM` logs in                                 |
| 9   | `login` fails with wrong password                    | Returns `invalid_credentials`                                    |
| 10  | `login` fails for non-existent user                  | Returns `invalid_credentials` (NOT a different code — no oracle) |
| 11  | `login` runs KDF when user doesn't exist             | Timing of "no user" within 50ms of "wrong password"              |
| 12  | `logout` clears the session                          | localStorage key gone                                            |
| 13  | `restoreSession` returns persisted user              | After register → restore → user returned                         |
| 14  | `restoreSession` cleans stale session                | If localStorage points to deleted user, returns null + clears    |
| 15  | `restoreSession` returns null when no key            | No DB read, null returned                                        |

### 7.2 Crypto (`src/systems/crypto.test.ts`)

| #   | Test                                                                 |
| --- | -------------------------------------------------------------------- |
| 1   | `deriveKey` is deterministic given same password + salt + iterations |
| 2   | `deriveKey` is non-deterministic given different salts               |
| 3   | `timingSafeEqual` returns false for different lengths                |
| 4   | `timingSafeEqual` returns true for byte-equal arrays                 |
| 5   | `bytesToBase64` ↔ `base64ToBytes` round-trip preserves bytes         |

### 7.3 Validation schemas (`src/systems/auth-schemas.test.ts`)

| #   | Test                                                              |
| --- | ----------------------------------------------------------------- |
| 1   | Short username (`'ab'`) fails with min-length message             |
| 2   | Long username (>20) fails with max-length message                 |
| 3   | Username with spaces fails with regex message                     |
| 4   | Valid username/password passes loginSchema                        |
| 5   | Mismatched confirmPassword fails registerSchema with correct path |
| 6   | Trim happens on username before regex check                       |

### 7.4 Component / store tests

| File                     | Tests                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `sessionStore.test.ts`   | bootstrap restores user; register sets currentUser; logout clears it; failed register doesn't set currentUser                     |
| `RequireAuth.test.tsx`   | Renders children when user; redirects to /login when not; preserves `state.from`                                                  |
| `LoginPage.test.tsx`     | Renders; validation errors show; submits and navigates on success; shows error on bad credentials; logged-in user redirected away |
| `RegisterPage.test.tsx`  | Renders; password mismatch shows inline error; username-taken sets field error; success navigates to /lobby                       |
| `LobbyPage.test.tsx`     | Shows username + avatar swatch; logout clears session and navigates to /login                                                     |
| `App.test.tsx` (updated) | Unauthed → /lobby redirects to /login                                                                                             |

### 7.5 DB sanity (`src/db/db.test.ts`)

| #   | Test                                                                                      |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | `db.open()` succeeds                                                                      |
| 2   | `users` table has `&usernameLower` unique index (insert duplicate throws ConstraintError) |
| 3   | `balances.add` then `get` round-trips                                                     |
| 4   | `rounds` compound index `[userId+playedAt]` is queryable                                  |
| 5   | `resetDb()` empties all tables                                                            |

Coverage thresholds from ADR-0003 (`src/systems/**/*.ts` ≥ 80%) easily satisfied; `src/games/**/logic.ts` threshold not yet triggered (no game logic files).

## 8. Code conventions update

Append to `docs/conventions.md` under "Imports":

```
- UI (src/pages/, src/components/) never imports from `src/db/**` or
  `src/store/**`'s underlying storage. UI imports from `src/store/<x>Store`
  for state and reads result types from `src/systems/<x>`.
- localStorage access is allowed in `src/systems/auth.ts` ONLY. Other code
  that needs persistence should use Dexie via src/db/.
```

## 9. ADRs introduced in Phase 1

| ID   | Title                                                | Status   |
| ---- | ---------------------------------------------------- | -------- |
| 0008 | Discriminated-union result type for system functions | Accepted |
| 0009 | PBKDF2 with 600,000 iterations stored per-user       | Accepted |
| 0010 | Session persistence via localStorage single-key      | Accepted |
| 0011 | Route protection via `<RequireAuth>` wrapper         | Accepted |
| 0012 | Forms via React Hook Form + Zod                      | Accepted |

Each is a separate file under `docs/adr/`, drafted in PR #1 using the template from `docs/adr/_template.md` (Phase 0). Content for each ADR is roughly: context (what problem), decision (what we chose), alternatives considered (with rationale), consequences (what becomes easier / harder), references (BUILD_GUIDE sections + related ADRs).

## 10. Risk register additions

Append to `docs/risks.md` (existing R-01..R-15 from Phase 0 remain):

| ID   | Risk                                                 | Phase     | L   | I   | Mitigation                                                                                  |
| ---- | ---------------------------------------------------- | --------- | --- | --- | ------------------------------------------------------------------------------------------- |
| R-16 | PBKDF2 takes too long, login feels frozen            | 1         | M   | L   | 600k iters ≈ 300-500ms; UI shows `isSubmitting` spinner. Drop to 210k if users complain.    |
| R-17 | localStorage unavailable (private mode)              | 1         | L   | M   | All localStorage access wrapped in try/catch; degrade gracefully.                           |
| R-18 | User opens app on different browser → empty          | 1         | H   | L   | Intentional; data is local per-browser. Documented in dev-setup.                            |
| R-19 | Username uniqueness race (two tabs register at once) | 1         | L   | L   | Dexie `&usernameLower` index throws ConstraintError; caught and reported as username_taken. |
| R-20 | Login timing oracle reveals username existence       | 1         | L   | M   | Always run KDF on login even when user not found.                                           |
| R-21 | RequireAuth flash-of-content during bootstrap        | 1         | M   | L   | App renders "Loading…" splash while `bootstrapping` is true.                                |
| R-22 | Test pollution between test files                    | 1         | M   | M   | `resetDb()` helper + `beforeEach` in any test that writes.                                  |
| R-23 | Dexie ConstraintError detection brittle              | 1, future | L   | M   | Centralized `isUniqueIndexError` helper.                                                    |

## 11. GitHub project setup

Phase 1 milestone already exists from Phase 0 setup (milestone #2). Create 3 issues attached to it:

```bash
PHASE_1_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 1 — Data + Auth") | .number')

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling" \
  --title "[Phase 1] PR #1 — Dexie schema (users + balances + rounds) and test harness" \
  --body "Schema (User, Balance, Round), unique usernameLower index, compound [userId+playedAt] index on rounds, resetDb() helper, fake-indexeddb dev dep. ADRs 0008–0012 drafted. See spec §5 PR #1."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling,tests" \
  --title "[Phase 1] PR #2 — systems/auth.ts pure functions + crypto + schemas + tests" \
  --body "PBKDF2 600k, register/login/logout/restoreSession, discriminated-union results, 15-case test matrix, schema validation tests. See spec §5 PR #2 and §7."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling" \
  --title "[Phase 1] PR #3 — Login/Register pages, RequireAuth, sessionStore, lobby" \
  --body "RHF+Zod forms, RequireAuth wrapper, bootstrap loading splash, lobby with avatar+logout. See spec §5 PR #3 and §12 smoke plan."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,chore" \
  --title "[Phase 1] Tag v0.2-data-and-auth release after PR #3 merges" \
  --body "chore(release) PR + tag + GH release. Close 4 issues + milestone."
```

## 12. Manual smoke test plan per PR

### PR #1

1. `pnpm test:run` → new `db.test.ts` passes
2. `pnpm typecheck` → schema types compile
3. Open DevTools → IndexedDB → confirm no `localGamble` database exists yet (auth doesn't run on app boot until PR #3)

### PR #2

1. `pnpm test:run` → all 15 auth + 5 crypto + 6 schema tests pass
2. Coverage report shows `src/systems/**/*.ts` ≥ 80%
3. `pnpm build` succeeds
4. No UI behavior changes — visiting `/lobby` still shows the Phase 0 placeholder

### PR #3 (the full Phase 1 acceptance smoke from §4a above)

1. `pnpm dev` → `/` redirects to `/lobby` → redirects to `/login`
2. Click "Create an account" → fill `Adam`/`password123`/`password123` → submit
3. Land on `/lobby` showing "Welcome, Adam" + avatar swatch
4. DevTools → IndexedDB → `localGamble` → `users` has `Adam` with hashed password (verify long base64 string, NOT plaintext)
5. `balances` has Adam's userId with `chips: 1000`
6. localStorage has `localGamble.session.userId` = Adam's UUID
7. Refresh → "Loading…" briefly → `/lobby` (still logged in)
8. Click "Log out" → land on `/login` → localStorage key cleared
9. Visit `/lobby` directly → redirects to `/login`
10. Register again with `Adam` (or `aDaM`) → inline "That username is already taken."
11. Login with wrong password → "Invalid username or password."
12. Successful login → land on `/lobby`

## 13. Definition of Done — Phase 1

**Repository state**

- [ ] All files in PR #1, #2, #3 inventories on `main`
- [ ] `grep -R "Math.random" src/` returns no hits
- [ ] No `src/pages/**` or `src/components/**` file imports from `src/db/**`
- [ ] No file outside `src/systems/auth.ts` calls `localStorage.*`

**Tooling state**

- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm dev` serves
- [ ] The 12-step PR #3 smoke test passes
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`, `pnpm format:check` all exit 0
- [ ] Coverage ≥ 80% for `src/systems/**/*.ts`
- [ ] Bundle size recorded in PR #3 description

**Functional state (BUILD_GUIDE §12 row 1)**

- [ ] Register a user → succeeds
- [ ] Log out → returns to /login
- [ ] Log back in → succeeds
- [ ] Refresh → still logged in
- [ ] Password is hashed in IndexedDB (NOT plaintext)

**GitHub state**

- [ ] All 4 Phase 1 issues closed
- [ ] Tag `v0.2-data-and-auth` exists and is the latest release
- [ ] Phase 1 milestone closed
- [ ] CHANGELOG entry for `[v0.2-data-and-auth]`

**ADR state**

- [ ] ADRs 0008–0012 present and Accepted

## 14. Rollback / recovery

- **Bad merge to main:** revert via PR; subsequent Dependabot or feature PRs may need rebase.
- **Dev IndexedDB corrupted during testing:** DevTools → Application → IndexedDB → delete `localGamble` → reload.
- **Wrong PBKDF2 iteration count shipped:** future-version migration runs the new KDF on the user's stored password at next login. Phase 8 polish item; not a Phase 1 concern.
- **Username encoding regression (e.g., emoji broke regex):** tighten or relax the regex; new accounts only — existing accounts are unaffected.

## 15. Release procedure

After PR #3 merges:

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.2-data-and-auth
# Update CHANGELOG.md (move Unreleased entries → [v0.2-data-and-auth] with date)
git add CHANGELOG.md
git commit -m "chore(release): v0.2-data-and-auth"
gh pr create --title "chore(release): v0.2-data-and-auth" \
  --body "Tags Phase 1 completion. See CHANGELOG.md."
# After merge:
git checkout main && git pull --ff-only
git tag -a v0.2-data-and-auth -m "Phase 1 — Data + Auth complete"
git push origin v0.2-data-and-auth
gh release create v0.2-data-and-auth --title "v0.2-data-and-auth" \
  --notes-file CHANGELOG.md --latest
gh issue close $(gh issue list --milestone "Phase 1 — Data + Auth" --state open --json number --jq '.[].number')
PHASE_1_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 1 — Data + Auth") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_1_MS -f state=closed
```

## 16. Handoff to Phase 2

Once `v0.2-data-and-auth` is tagged, Phase 2 (Wallet + Lobby + Game shell) inherits:

1. Schema in place (`users`, `balances`, `rounds` — the latter declared but unused).
2. Architectural pattern set: `systems/<thing>.ts` (pure-ish async, side-effecting) + `store/<thing>Store.ts` (Zustand wrapper) + UI calls the store. Phase 2's `wallet.ts` + `walletStore.ts` follow the same template as `auth.ts` + `sessionStore.ts`.
3. Discriminated-union result type (ADR-0008) is the template for wallet errors (`insufficient_chips`, `below_minimum`, `above_maximum`, ...).
4. `RequireAuth` is in place; new pages (`BlackjackPage` etc.) just go inside it.
5. The starter chip balance (1,000) was provisioned at register time, so `getBalance(userId)` has a row to read from on day one.
6. The form pattern (RHF + Zod) is the template for `BettingPanel`.

Phase 2 brainstorming asks its own clarifying questions (seedable RNG API, betting flow UX, lobby cabinet layout, "daily top-up" mechanics, integer-only chip math enforcement, etc.) and produces its own spec → plan → execution cycle.

## 17. Open questions

None blocking. To revisit later:

- Whether to add a "show password" toggle on Login/Register (Phase 8 polish).
- Whether to add "rehash on login if stored iter count < current" (Phase 8).
- Whether to add a real splash screen (logo + sound) instead of the text "Loading…" (Phase 8).
- Whether to add a per-user `lastLoginAt` field for stats (could be Phase 7).
- Whether to add multi-tab session sync via `storage` event (probably skip — local app, single user).

---

_End of Phase 1 spec. The next artifact is the implementation plan
(`docs/superpowers/plans/2026-05-15-phase-1-data-and-auth-plan.md`), produced
by the writing-plans skill._
