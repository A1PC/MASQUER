# Phase 9 Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden admin dashboard at `/admin/*` plus the cross-cutting tracking instrumentation (sessions, game-visits, login counts, ban-aware auth, audit-trailed credit adjustments) that powers it, end-to-end, all merged onto `main` and tagged `v0.9-admin-dashboard`.

**Architecture:** Six independent PRs. Each PR ships a vertical slice that compiles and tests green on its own. PR A extends the Dexie schema additively (v1 → v2, no upgrade callback needed — purely new tables and optional columns). PR B wraps `sessionStore` to record session and login data, adds the `admin-auth` + `admin` modules, and threads a `useGameVisit` hook through every `GameShell`. PR C ships the admin auth UI (`/admin/login`, `RequireAdmin`, `AdminLayout` sidebar) with placeholder pages. PR D adds Recharts (lazy-loaded inside the admin chunk only) plus the Overview and Users-list pages with three chart wrappers. PR E ships the per-user drill-in with ban/adjust actions and the audit + sessions log pages. PR F is the release tag.

**Tech Stack:** TypeScript 5, React 18, Vite 5, XState 5 (existing — admin doesn't add new machines), Tailwind 3, Dexie 4 (versioned migration), dexie-react-hooks (`useLiveQuery`), Recharts (new, lazy-loaded), Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-18-phase-9-admin-dashboard-design.md` (merged in PR #105).

**Branch model:** 6 PRs, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state, and has full CI green. Subagent-driven development; fresh subagent per task; two-stage review (spec then code) between tasks; full code review at PR boundary.

```
phase-9-admin-pr-a-schema      → PR A: schema v2 + ADRs
phase-9-admin-pr-b-tracking    → PR B: tracking systems + admin module + admin-auth
phase-9-admin-pr-c-auth-ui     → PR C: RequireAdmin + AdminLoginPage + AdminLayout
phase-9-admin-pr-d-overview    → PR D: Overview + Users list + Recharts wrappers
phase-9-admin-pr-e-per-user    → PR E: per-user + ban/adjust + audit + sessions
chore/release-v0.9-admin-dashboard → release tag + GitHub Release
```

**Hard rules (CLAUDE.md) that apply to every task:**

1. **No `Math.random` anywhere.** Only `src/systems/rng.ts`. ESLint enforces this.
2. **Money is integers.** No floats, no `parseFloat`. All chip math via `Math.floor`/`Math.ceil`/`Math.round` if a division is ever needed.
3. **Games are sandboxed.** `src/games/**` (except `*Page.tsx`) cannot import from `@/db/*` or `@/store/*`. Admin pages live in `src/pages/admin/` and ARE allowed to read the DB / store.
4. **Every round records exactly one row.** Already true. Admin adjustments record exactly one `adjustments` row + one `balances` update in the same transaction.
5. **Definition of done** for every task that touches code: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` must all pass before the task is considered complete.
6. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI, merge into main, branch the next PR off the freshly-merged main.
7. **Commit messages:** Conventional Commits, scoped. Allowed scopes for this phase: `admin`, `auth`, `db`, `session`, `tracking`, `routing`, `ui`, `theme`, `build-guide`, `adr`, `ci`, `release`. Header ≤ 100 chars.
8. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Repo conventions to mirror:**

- **Test command** is `pnpm exec vitest run` and `pnpm exec vitest run <path>`. Do NOT use `pnpm test --run` — pnpm consumes the `--run` flag.
- **macOS case-insensitive filesystem.** No new collisions in this phase (all new files have distinct stems), but if you ever add a data file that shares a stem with a component, use the `*View.tsx` convention (per Phase 3 `HandView` / Phase 4 `WheelView` / Phase 5 `SymbolView` precedent).
- **lint-staged + Husky** auto-runs `eslint --fix` + `prettier --write` on commit. Expect minor whitespace reformatting on commit — this is normal.
- **Markdownlint MD029** has bitten previous phases when a numbered list (`1.` `2.` `3.`) is split by code blocks. Avoid that pattern in markdown task instructions — use bold "**Change A**", "**Change B**" or bullets instead.

---

## File map

Created across the 6 PRs:

```
src/db/schema.ts                                   # PR A — extended (new interfaces + v2 store block)

src/systems/admin-auth.ts                          # PR B
src/systems/admin-auth.test.ts                     # PR B
src/systems/admin.ts                               # PR B
src/systems/admin.test.ts                          # PR B
src/systems/auth.ts                                # PR B — extended (reserved + banned checks)
src/games/_shared/useGameVisit.ts                  # PR B
src/games/_shared/useGameVisit.test.ts             # PR B
src/games/_shared/GameShell.tsx                    # PR B — extended (game prop + hook call)
src/games/coin-flip/CoinFlipPage.tsx               # PR B — pass game="coin-flip"
src/games/blackjack/BlackjackPage.tsx              # PR B — pass game="blackjack"
src/games/roulette/RoulettePage.tsx                # PR B — pass game="roulette"
src/games/slots/SlotsPage.tsx                      # PR B — pass game="slots"
src/store/sessionStore.ts                          # PR B — extended (sessions + admin)
src/store/sessionStore.test.ts                     # PR B — extended
src/components/AppBootstrap.tsx                    # PR B — beforeunload listener

src/components/RequireAdmin.tsx                    # PR C
src/components/RequireAdmin.test.tsx               # PR C
src/pages/admin/AdminLoginPage.tsx                 # PR C
src/pages/admin/AdminLoginPage.test.tsx            # PR C
src/pages/admin/AdminLayout.tsx                    # PR C
src/pages/admin/AdminLayout.test.tsx               # PR C
src/router.tsx                                     # PR C — extended (admin routes)

src/pages/admin/queries.ts                         # PR D
src/pages/admin/queries.test.ts                    # PR D
src/pages/admin/StatCard.tsx                       # PR D
src/pages/admin/StatCard.test.tsx                  # PR D
src/pages/admin/charts/NetFlowLine.tsx             # PR D
src/pages/admin/charts/NetFlowLine.test.tsx        # PR D
src/pages/admin/charts/WinnersLosersBar.tsx        # PR D
src/pages/admin/charts/WinnersLosersBar.test.tsx   # PR D
src/pages/admin/charts/GameDistributionDonut.tsx   # PR D
src/pages/admin/charts/GameDistributionDonut.test.tsx # PR D
src/pages/admin/AdminOverviewPage.tsx              # PR D
src/pages/admin/AdminOverviewPage.test.tsx         # PR D
src/pages/admin/AdminUsersListPage.tsx             # PR D
src/pages/admin/AdminUsersListPage.test.tsx        # PR D

src/pages/admin/AdminUserPage.tsx                  # PR E
src/pages/admin/AdminUserPage.test.tsx             # PR E
src/pages/admin/AdjustCreditsModal.tsx             # PR E
src/pages/admin/AdjustCreditsModal.test.tsx        # PR E
src/pages/admin/charts/UserActivityLine.tsx        # PR E
src/pages/admin/charts/UserActivityLine.test.tsx   # PR E
src/pages/admin/AdminAuditPage.tsx                 # PR E
src/pages/admin/AdminAuditPage.test.tsx            # PR E
src/pages/admin/AdminSessionsPage.tsx              # PR E
src/pages/admin/AdminSessionsPage.test.tsx         # PR E

docs/adr/0034-admin-auth-model.md                  # PR A
docs/adr/0035-phase-9-tracking-schema.md           # PR A

modified for coverage paths:
vitest.config.ts                                   # PR A — add admin paths

modified for the new dependency:
package.json                                       # PR D — add recharts
pnpm-lock.yaml                                     # PR D — regenerated
```

---

## Definition of Done (per task, per PR, per phase)

**Per task:** the named files exist with the named contents, all tests in the task pass, the commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four green locally on the PR branch. CI green on the PR (4 jobs: Meta files, Install·Typecheck·Build, Lint·Format, Test·Coverage). Code reviewed via the subagent-driven-development two-stage review per task + a final code review at PR boundary.

**Per phase (after PR E merges, before PR F release):**

- Manual smoke (the full flow described in spec §12):
  - Register a regular user; play 10 rounds across at least two games; log out.
  - Visit `/admin/login`; log in as `admin` / `admin12345`; land on `/admin`.
  - Overview shows non-zero stats and 3 charts render with data.
  - Users list shows the registered user with correct totals.
  - Drill into the user → all stats present; per-game breakdown non-zero where applicable.
  - Ban user → log out admin → user login rejected with the "suspended" message.
  - Log in admin → unban → user can log in again.
  - Adjust credits +500 with reason "test grant" → user's balance increases; row appears in audit log; ALSO in user's per-user history.
  - Adjust credits −<full balance + 1> → rejected with "would go negative".
  - Sessions log shows the test session with correct duration.
- Bundle size: main bundle unchanged (≤ 800 kB); admin chunk separate (~150 kB delta, only loaded when admin visits `/admin/*`). Verified via `pnpm build` output.
- Reduced motion: admin pages still render (no animation-dependent layout).

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: latest commit is `136f722 docs(build-guide): add Phase 9 Admin Dashboard design spec (#105)` or newer (spec already on main).

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~554 tests passing. If anything fails, STOP and surface to the user — do not start Phase 9 on a broken main.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-18-phase-9-admin-dashboard-design.md` — every section. This plan assumes the spec is your reference for _what_ and uses your reading time on _how_.

---

# PR A — Schema v2 + ADRs

**Branch:** `phase-9-admin-pr-a-schema` (off `main`)
**Goal of this PR:** Extend the Dexie schema additively to v2 — 3 new tables (`sessions`, `gameVisits`, `adjustments`) plus 3 new optional columns on `users`. Add the two ADRs that document the auth model and the tracking schema. After this PR merges the data model is in place; the next PR uses it.
**Risk:** Low. Dexie additive migrations don't need an upgrade callback. Existing v1 user rows remain valid.
**Estimated tasks:** 8.

## Task A.1: Branch and add new type interfaces to `schema.ts`

**Files:**

- Modify: `src/db/schema.ts`

This task extends the type definitions only. The runtime `stores()` block is updated in Task A.2.

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-9-admin-pr-a-schema
```

- [ ] **Step 2: Replace `src/db/schema.ts` with the v2 type surface**

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
  /** v2: soft-ban flag. Banned users cannot log in. Undefined = false. */
  isBanned?: boolean;
  /** v2: number of successful logins (incremented in sessionStore.login). */
  loginCount?: number;
  /** v2: epoch ms of the most recent successful login. */
  lastLoginAt?: number;
}

export interface Balance {
  userId: string;
  chips: number;
  updatedAt: number;
  /** Timestamp of last daily +50 claim. undefined for users created before this
   *  field existed (treated as "never claimed → eligible immediately"). */
  lastDailyClaimAt?: number;
}

export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: unknown;
  balanceAfter: number;
  playedAt: number;
}

/** v2: one row per user login. Closed by logout, beforeunload, or orphan
 *  cleanup at next login. ADR-0035. */
export interface Session {
  id: string;
  userId: string;
  loginAt: number;
  logoutAt: number | null;
  durationMs: number | null;
}

/** v2: one row per game-page mount. Closed on unmount. ADR-0035. */
export interface GameVisit {
  id: string;
  userId: string;
  sessionId: string;
  game: Round['game'];
  enteredAt: number;
  exitedAt: number | null;
  durationMs: number | null;
}

/** v2: one row per admin chip adjustment. Signed amount. ADR-0035. */
export interface Adjustment {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  adjustedAt: number;
}

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;
  // v2 tables — added in Task A.2:
  sessions!: EntityTable<Session, 'id'>;
  gameVisits!: EntityTable<GameVisit, 'id'>;
  adjustments!: EntityTable<Adjustment, 'id'>;

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

Note: this task only declares the typed EntityTable handles. The v2 `stores()` block (which makes them runtime-real) lands in Task A.2 — typecheck will pass either way because EntityTable is a type-only declaration.

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add v2 type interfaces (User extensions, Session, GameVisit, Adjustment)"
```

## Task A.2: Add Dexie v2 `stores()` block

**Files:**

- Modify: `src/db/schema.ts`

- [ ] **Step 1: Append the v2 stores block inside the `LocalGambleDB` constructor**

Add this after the `this.version(1).stores({...})` line, still inside the constructor:

```ts
this.version(2).stores({
  // existing tables — re-stated (Dexie requires it even if unchanged) +
  // add `isBanned` to the users index list so admin can quickly filter banned.
  users: 'id, &usernameLower, createdAt, isBanned',
  balances: 'userId',
  rounds: 'id, userId, game, playedAt, [userId+playedAt]',
  // new tables:
  sessions: 'id, userId, loginAt, [userId+loginAt]',
  gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
  adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
});
```

No `.upgrade()` callback is needed — adding new tables and new optional columns is purely additive; existing v1 rows remain valid and queryable.

- [ ] **Step 2: Verify typecheck + build**

```bash
pnpm typecheck && pnpm build
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add Dexie v2 stores (sessions, gameVisits, adjustments)"
```

## Task A.3: Schema migration test

**Files:**

- Create: `src/db/schema.test.ts`

TDD: tests verify both the v1→v2 path (existing user remains intact) and that the new tables exist and accept inserts.

- [ ] **Step 1: Write `src/db/schema.test.ts`** with this exact content:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db, type User, type Session, type GameVisit, type Adjustment } from '@/db';

async function freshDb() {
  await db.delete();
  await db.open();
}

describe('schema v2', () => {
  beforeEach(async () => {
    await freshDb();
  });
  afterEach(async () => {
    await freshDb();
  });

  it('opens at version 2', () => {
    expect(db.verno).toBe(2);
  });

  it('has the new tables: sessions, gameVisits, adjustments', () => {
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toContain('sessions');
    expect(names).toContain('gameVisits');
    expect(names).toContain('adjustments');
  });

  it('accepts a Session row insert + read', async () => {
    const row: Session = {
      id: 'sess-1',
      userId: 'u-1',
      loginAt: 1000,
      logoutAt: null,
      durationMs: null,
    };
    await db.sessions.add(row);
    const got = await db.sessions.get('sess-1');
    expect(got).toEqual(row);
  });

  it('accepts a GameVisit row insert + read', async () => {
    const row: GameVisit = {
      id: 'gv-1',
      userId: 'u-1',
      sessionId: 'sess-1',
      game: 'blackjack',
      enteredAt: 2000,
      exitedAt: null,
      durationMs: null,
    };
    await db.gameVisits.add(row);
    const got = await db.gameVisits.get('gv-1');
    expect(got).toEqual(row);
  });

  it('accepts an Adjustment row insert + read', async () => {
    const row: Adjustment = {
      id: 'adj-1',
      userId: 'u-1',
      amount: 500,
      reason: 'test grant',
      adjustedAt: 3000,
    };
    await db.adjustments.add(row);
    const got = await db.adjustments.get('adj-1');
    expect(got).toEqual(row);
  });

  it('queries sessions by [userId+loginAt] compound index', async () => {
    await db.sessions.bulkAdd([
      { id: 's-1', userId: 'u-1', loginAt: 100, logoutAt: 200, durationMs: 100 },
      { id: 's-2', userId: 'u-1', loginAt: 300, logoutAt: null, durationMs: null },
      { id: 's-3', userId: 'u-2', loginAt: 150, logoutAt: 250, durationMs: 100 },
    ]);
    const u1Sessions = await db.sessions
      .where('[userId+loginAt]')
      .between(['u-1', 0], ['u-1', Infinity])
      .toArray();
    expect(u1Sessions).toHaveLength(2);
    expect(u1Sessions.map((s) => s.id).sort()).toEqual(['s-1', 's-2']);
  });

  it('User isBanned is queryable via index', async () => {
    await db.users.bulkAdd([
      {
        id: 'u-1',
        username: 'a',
        usernameLower: 'a',
        passwordHash: 'h',
        passwordSalt: 's',
        pbkdf2Iterations: 1,
        avatarColor: '#fff',
        createdAt: 1,
        isBanned: true,
      } as User,
      {
        id: 'u-2',
        username: 'b',
        usernameLower: 'b',
        passwordHash: 'h',
        passwordSalt: 's',
        pbkdf2Iterations: 1,
        avatarColor: '#fff',
        createdAt: 2,
      } as User,
    ]);
    const banned = await db.users.where('isBanned').equals(1).toArray();
    expect(banned).toHaveLength(1);
    expect(banned[0]!.id).toBe('u-1');
  });
});

describe('schema v1 → v2 upgrade preserves existing data', () => {
  it('a user row created under v1 is still readable under v2', async () => {
    // Open a fresh v1-only database under a different name so we can test the upgrade.
    const tmp = new Dexie('localGamble-upgrade-test');
    tmp.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    await tmp.open();
    await tmp.table('users').add({
      id: 'legacy-1',
      username: 'Legacy',
      usernameLower: 'legacy',
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 1,
      avatarColor: '#fff',
      createdAt: 1234,
    });
    tmp.close();

    // Re-open with v2 schema applied.
    const upgraded = new Dexie('localGamble-upgrade-test');
    upgraded.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    upgraded.version(2).stores({
      users: 'id, &usernameLower, createdAt, isBanned',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
    });
    await upgraded.open();
    const row = await upgraded.table('users').get('legacy-1');
    expect(row).toBeDefined();
    expect(row.username).toBe('Legacy');
    // The optional v2 fields default to undefined — readers must tolerate.
    expect(row.isBanned).toBeUndefined();
    expect(row.loginCount).toBeUndefined();
    expect(row.lastLoginAt).toBeUndefined();
    upgraded.close();
    await Dexie.delete('localGamble-upgrade-test');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/db/schema.test.ts
```

Expected: PASS (all 8 tests).

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.test.ts
git commit -m "test(db): schema v2 — new tables, indexes, v1→v2 upgrade preserves data"
```

## Task A.4: Vitest coverage thresholds for admin paths

**Files:**

- Modify: `vitest.config.ts`

- [ ] **Step 1: Update `vitest.config.ts`**

Find the `coverage` block. Add the admin paths to both `include` AND `thresholds`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  css: false,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    include: [
      'src/games/**/logic.ts',
      'src/games/blackjack/**/*.ts',
      'src/games/roulette/**/*.ts',
      'src/games/slots/**/*.ts',
      'src/systems/**/*.ts',
    ],
    exclude: ['**/*.test.ts', '**/*.test.tsx'],
    thresholds: {
      'src/games/**/logic.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/blackjack/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/roulette/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/games/slots/**/*.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
      'src/systems/**/*.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
},
```

Note: `src/systems/**/*.ts` already covers the new `admin.ts` and `admin-auth.ts` that PR B will add. No additional threshold entry needed.

- [ ] **Step 2: Run coverage to confirm nothing regressed**

```bash
pnpm exec vitest run --coverage
```

Expected: all tests pass; coverage thresholds met. No new files to cover in this PR — the threshold tightening kicks in once PR B lands.

- [ ] **Step 3: Commit (optional — only if there were changes)**

If you didn't actually change `vitest.config.ts` in this task because the `systems/**` glob already covers admin paths, skip the commit. Otherwise:

```bash
git add vitest.config.ts
git commit -m "test(admin): include admin paths in coverage report"
```

(Most likely: no commit needed in this task — proceed to A.5.)

## Task A.5: ADR-0034 — Admin auth model

**Files:**

- Create: `docs/adr/0034-admin-auth-model.md`

- [ ] **Step 1: Write `docs/adr/0034-admin-auth-model.md`**

```markdown
# ADR-0034: Admin auth model

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

Phase 9 ships a hidden admin dashboard at `/admin/*`. The admin needs to log
in, but does not need a real user record (no balance, no game history, no
avatar). The admin password is requested to be a fixed `admin12345` —
short, memorable, easily typed for QA.

The app is local-only (no server). All data lives in the browser's
IndexedDB and is fully readable via DevTools. The admin login is therefore
a UI convenience, not a security boundary.

## Decision

**Hidden `/admin/login` route** with a hardcoded credential check (`admin` /
`admin12345`). The password lives in source code (`src/systems/admin-auth.ts`)
by design — the local-only architecture makes secrecy impossible regardless.

**Synthetic admin session.** No row in the `users` table. The admin session
is recorded as a flag in `localStorage` under the key
`localGamble.session.admin = '1'`, separate from the regular user session
key `localGamble.session.userId`. Both keys can be set independently but a
single tab will only ever have one or the other active in the UI (the
route guards enforce this).

**Reserved username.** `auth.register` rejects username `admin`
(case-insensitive, after trim) with `error: 'reserved_username'`.
`auth.login` rejects it with `error: 'invalid_credentials'` (same message as
any other login failure, so we don't leak the reserved-name fact).

**Route guard `RequireAdmin`** parallel to `RequireAuth` — checks the
`isAdmin` flag in `sessionStore` and redirects to `/admin/login` if absent.

## Alternatives considered

- **Seeded admin user with `role: 'admin'`.** Would let us reuse the
  existing PBKDF2 auth path. Rejected: introduces a DB row that needs to
  be filtered out of every "all users" query in the admin dashboard,
  could accidentally appear in the user list / be banned, and offers no
  real security benefit given the local-only context.
- **Separate admin database.** Overkill. Two Dexie connections to
  coordinate, two backup stories, no upside.
- **No admin auth at all** (anyone visiting `/admin` gets in). Rejected:
  the user explicitly wants a credential gate so the dashboard isn't
  reachable by accident from a kid's tab. The gate doesn't need to be
  cryptographically strong; it just needs to require an intent to enter.

## Consequences

- The admin password is visible in the JS bundle and in DevTools. Accepted.
- Future multi-admin support requires a real DB-backed admin role —
  effectively rewriting this ADR. Acceptable trade-off for shipping the
  dashboard now.
- The reserved-username rule is permanent: a user that registered as
  `admin` before this rule existed would still be findable via the
  database, but any new registration with that name fails. We don't expect
  legacy `admin` users to exist (local-only app, single developer).

## References

- BUILD_GUIDE §3 (Architecture — admin is a new top-level section)
- ADR-0035 — Phase 9 tracking schema (companion ADR)
- `src/systems/admin-auth.ts`
- `src/components/RequireAdmin.tsx`
- Phase 9 spec §3
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0034-admin-auth-model.md
git commit -m "docs(adr): 0034 — admin auth model (hidden /admin/login, synthetic session)"
```

## Task A.6: ADR-0035 — Phase 9 tracking schema

**Files:**

- Create: `docs/adr/0035-phase-9-tracking-schema.md`

- [ ] **Step 1: Write `docs/adr/0035-phase-9-tracking-schema.md`**

````markdown
# ADR-0035: Phase 9 tracking schema

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

The admin dashboard (Phase 9) needs to surface per-user and site-wide
analytics that the existing schema cannot answer:

- Total time on site per user (needs session start/end events)
- Total time on each game per user (needs game-page enter/exit events)
- Number of logins per user
- An audit trail of admin chip adjustments

The existing schema (Phase 1) has three tables: `users`, `balances`,
`rounds`. None capture session-level or page-level lifecycle events;
none capture admin actions.

## Decision

Add three new tables and three optional columns on `users`, all under a
single Dexie version 2 bump. No data migration callback is needed —
adding tables and adding optional columns are both additive.

**New optional columns on `users`** (treated as their default if absent):

- `isBanned?: boolean` (default false) — soft-ban flag; `auth.login`
  rejects banned users.
- `loginCount?: number` (default 0) — incremented in `sessionStore.login`.
- `lastLoginAt?: number` (default undefined) — set in `sessionStore.login`.

**New `sessions` table** — one row per login.

```ts
{ id, userId, loginAt, logoutAt: number | null, durationMs: number | null }
```
````

Closed by: explicit logout, `beforeunload` listener (best-effort), or
orphan cleanup at the user's next login.

**New `gameVisits` table** — one row per game-page mount.

```ts
{ id, userId, sessionId, game, enteredAt, exitedAt: number | null, durationMs: number | null }
```

Closed on component unmount (router navigation, logout cascade, or tab
close via the same best-effort path as sessions).

**New `adjustments` table** — one row per admin chip change.

```ts
{
  (id, userId, amount, reason, adjustedAt);
}
```

Written atomically with the `balances` update by `admin.adjustBalance`.
No `adminUserId` — single hardcoded admin in MVP. Future multi-admin
support adds the field.

## Alternatives considered

- **Embed session-time data on `users` as cumulative counters.** Would
  let us answer "total time on site" with a single column read but loses
  granularity (no per-session breakdown, no game-time-per-session). Rejected:
  the admin needs to drill into individual sessions and game visits.
- **Embed game-visit data on the session row** (e.g.
  `gameTimes: Record<Game, number>`). Awkward to query; mutating a JSON
  blob on every page transition is expensive. Rejected.
- **Reuse the rounds table for adjustments** with a special
  `game: 'admin-adjustment'`. Rejected: pollutes "rounds played" stats
  and conflates game actions with admin actions.
- **Hash chain for tamper detection on adjustments.** Overkill for a
  local-only single-admin context. Deferred indefinitely.

## Consequences

- Session-time and game-time stats are only meaningful from Phase 9
  onwards (no backfill). The dashboard surfaces this with a small
  "data since v0.9-admin-dashboard" note.
- Total rounds, total wagered, total won — all of these are answerable
  from the existing `rounds` table for all historical data.
- Schema migration is forward-only (Dexie v2). Downgrading to a v1-only
  build would silently drop the new tables (and their data) on the next
  v2 open.
- `beforeunload` is best-effort; orphan-session cleanup at next login is
  the safety net.

## References

- ADR-0034 — Admin auth model (companion ADR)
- `src/db/schema.ts` — type definitions and version 2 stores
- `src/store/sessionStore.ts` — session lifecycle hooks
- `src/games/_shared/useGameVisit.ts` — game-page enter/exit hook
- `src/systems/admin.ts` — `adjustBalance` writes the audit row
- Phase 9 spec §4, §5

````

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0035-phase-9-tracking-schema.md
git commit -m "docs(adr): 0035 — Phase 9 tracking schema (sessions, gameVisits, adjustments)"
````

## Task A.7: Extend `commitlint.config.js` with admin + tracking scopes

**Files:**

- Modify: `commitlint.config.js`

The Phase 9 commits use two new scopes — `admin` and `tracking` — that aren't in the current allowlist. Without this change, the first PR B commit (`feat(admin): ...`) would be rejected by the husky `commit-msg` hook.

- [ ] **Step 1: Open `commitlint.config.js`** and confirm the current `scope-enum` array.

- [ ] **Step 2: Add `'admin'` and `'tracking'` to the array**

Append two entries to the existing list:

```js
'admin',
'tracking',
```

- [ ] **Step 3: Verify** by running commitlint against sample headers

```bash
echo "feat(admin): test" | npx commitlint
echo "feat(tracking): test" | npx commitlint
```

Expected: both exit 0 (silent success).

- [ ] **Step 4: Commit**

```bash
git add commitlint.config.js
git commit -m "build(ci): allow admin + tracking scopes in commitlint"
```

## Task A.8: PR A — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~562 tests passing (8 new schema tests).

- [ ] **Step 2: Run markdownlint locally to catch CI failures BEFORE pushing**

```bash
npx markdownlint-cli2 'docs/adr/0034-admin-auth-model.md' 'docs/adr/0035-phase-9-tracking-schema.md' 'docs/superpowers/plans/2026-05-18-phase-9-admin-dashboard-plan.md'
```

Expected: 0 errors. If any errors surface, fix them inline (the Phase 5 plan had to fix `MD029/ol-prefix` errors after the fact — avoid that here).

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-9-admin-pr-a-schema
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-9(admin): Dexie v2 schema (sessions / gameVisits / adjustments) + 2 ADRs" --body "$(cat <<'EOF'
## Summary

PR A of Phase 9. Extends the Dexie schema additively to v2.

- 3 new optional columns on \`users\`: \`isBanned\`, \`loginCount\`, \`lastLoginAt\`
- 3 new tables: \`sessions\`, \`gameVisits\`, \`adjustments\`
- v2 \`stores()\` block added; no upgrade callback needed (purely additive)
- 8 new tests: insert + read for each new table, compound-index query, isBanned index, v1→v2 upgrade preserves existing user rows
- ADR-0034 admin auth model, ADR-0035 Phase 9 tracking schema

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] 562 tests passing total
- [x] markdownlint clean
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted (PR A).

---

# PR B — Tracking systems

**Branch:** `phase-9-admin-pr-b-tracking` (off freshly-merged `main`)
**Goal of this PR:** Wire the cross-cutting tracking instrumentation that the admin dashboard reads from. Add `admin-auth.ts` (synthetic admin session module), `admin.ts` (ban/adjust functions), extend `auth.ts` (reserved-username + banned checks), extend `sessionStore.ts` (write session rows + admin methods + login count), register a `beforeunload` listener in `AppBootstrap`, add the `useGameVisit` hook, and thread it through every `GameShell`.
**Risk:** Medium-high. Many touchpoints. Tests for every layer.
**Estimated tasks:** 14.

## Task B.1: Reserved-username check in `auth.register`

**Files:**

- Modify: `src/systems/auth.ts`
- Modify: `src/systems/auth.test.ts`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-9-admin-pr-b-tracking
```

- [ ] **Step 2: Append failing test to `src/systems/auth.test.ts`**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Expected: FAIL — `reserved_username` is not yet a valid error code.

- [ ] **Step 4: Update `src/systems/auth.ts`**

Extend the `RegisterError` type:

```ts
export type RegisterError = 'username_taken' | 'reserved_username' | 'unknown';
```

At the top of the `register` function body, AFTER `const trimmed = input.username.trim();` and BEFORE `const usernameLower = trimmed.toLowerCase();`, insert:

```ts
if (trimmed.toLowerCase() === 'admin') {
  return { ok: false, error: 'reserved_username' };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Expected: PASS. All previously passing register tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/systems/auth.ts src/systems/auth.test.ts
git commit -m "feat(auth): reserve 'admin' username (case-insensitive) in register"
```

## Task B.2: Reserved-username check in `auth.login`

**Files:**

- Modify: `src/systems/auth.ts`
- Modify: `src/systems/auth.test.ts`

The `login` check returns `'invalid_credentials'` (NOT a distinct error) so we don't leak the reserved-name fact through error enumeration. The user-facing message stays the same.

- [ ] **Step 1: Append failing test to `src/systems/auth.test.ts`**

```ts
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
```

- [ ] **Step 2: Run — expect FAIL** (currently the login function would proceed to the DB lookup and fail with `invalid_credentials` after hashing — but it would also leak timing. We want to short-circuit).

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Actually the test will probably PASS already because `admin` doesn't exist in the users table and login returns `invalid_credentials` after the hash. But to be safe (and to short-circuit before the expensive PBKDF2), add the check anyway.

- [ ] **Step 3: Update `src/systems/auth.ts`**

At the top of the `login` function body, AFTER `const usernameLower = input.username.trim().toLowerCase();` and BEFORE the `db.users.where(...)` call, insert:

```ts
if (usernameLower === 'admin') {
  // Reserved — do not leak that fact via a distinct error or via faster timing.
  // Run the KDF anyway to keep timing consistent with the normal-failure path.
  const salt = generateSalt();
  await deriveKey(input.password, salt, PASSWORD_HASHING.iterations);
  return { ok: false, error: 'invalid_credentials' };
}
```

This preserves the existing constant-time behaviour established by the `runs the KDF even when user does not exist` test.

- [ ] **Step 4: Run tests**

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Expected: PASS (all reserved-username login tests + previous timing test still pass).

- [ ] **Step 5: Commit**

```bash
git add src/systems/auth.ts src/systems/auth.test.ts
git commit -m "feat(auth): short-circuit reserved 'admin' username in login (constant-time)"
```

## Task B.3: Banned-user check in `auth.login`

**Files:**

- Modify: `src/systems/auth.ts`
- Modify: `src/systems/auth.test.ts`

- [ ] **Step 1: Append failing test to `src/systems/auth.test.ts`**

```ts
describe('auth.login — banned user', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('rejects login when isBanned=true with error "banned"', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    await db.users.update(reg.user.id, { isBanned: true });
    localStorage.removeItem(SESSION_KEY);

    const r = await login({ username: 'alice', password: 'password123' });
    expect(r).toEqual({ ok: false, error: 'banned' });
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
```

The import block at the top of `auth.test.ts` needs `import { db } from '@/db';` if it's not already there.

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Expected: FAIL — `banned` is not yet a valid error code.

- [ ] **Step 3: Update `src/systems/auth.ts`**

Extend the `LoginError` type:

```ts
export type LoginError = 'invalid_credentials' | 'banned' | 'unknown';
```

In the `login` function, AFTER the `if (!timingSafeEqual(...)) return ...;` check (i.e. AFTER the password is verified) and BEFORE `setStoredSession`, insert:

```ts
if (user.isBanned === true) {
  return { ok: false, error: 'banned' };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm exec vitest run src/systems/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/auth.ts src/systems/auth.test.ts
git commit -m "feat(auth): reject login for banned users (error: 'banned')"
```

## Task B.4: `src/systems/admin-auth.ts` — synthetic admin session

**Files:**

- Create: `src/systems/admin-auth.ts`
- Create: `src/systems/admin-auth.test.ts`

- [ ] **Step 1: Write failing test `admin-auth.test.ts`**

```ts
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
```

- [ ] **Step 2: Run — expect FAIL** (cannot import).

- [ ] **Step 3: Write `src/systems/admin-auth.ts`**

```ts
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
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/systems/admin-auth.ts src/systems/admin-auth.test.ts
git commit -m "feat(admin): admin-auth module (loginAdmin / restoreAdminSession / logoutAdmin)"
```

## Task B.5: `src/systems/admin.ts` — `banUser` / `unbanUser`

**Files:**

- Create: `src/systems/admin.ts`
- Create: `src/systems/admin.test.ts`

- [ ] **Step 1: Write failing test `admin.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { banUser, unbanUser } from './admin';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

const SESSION_KEY = 'localGamble.session.userId';

describe('admin.banUser / admin.unbanUser', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('banUser flips isBanned to true on the user row', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(true);
  });

  it('unbanUser flips isBanned to false', async () => {
    const reg = await register({ username: 'bob', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    await unbanUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(false);
  });

  it('banUser is idempotent', async () => {
    const reg = await register({ username: 'carol', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await banUser(reg.user.id);
    await banUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(true);
  });

  it('unbanUser is idempotent', async () => {
    const reg = await register({ username: 'dave', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await unbanUser(reg.user.id);
    await unbanUser(reg.user.id);
    const row = await db.users.get(reg.user.id);
    expect(row?.isBanned).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/systems/admin.ts`** (banUser + unbanUser only — adjustBalance in next task)

```ts
import { db } from '@/db';

/**
 * Admin operations on user records. ADR-0034 / ADR-0035.
 *
 * Imported by AdminUserPage and AdjustCreditsModal. Not exposed via
 * sessionStore — the admin pages call these directly.
 */

export async function banUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: true });
}

export async function unbanUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: false });
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/systems/admin.ts src/systems/admin.test.ts
git commit -m "feat(admin): banUser + unbanUser (toggles isBanned flag)"
```

## Task B.6: `admin.adjustBalance` — transactional balance change + audit row

**Files:**

- Modify: `src/systems/admin.ts`
- Modify: `src/systems/admin.test.ts`

- [ ] **Step 1: Append failing tests to `admin.test.ts`**

```ts
import { adjustBalance } from './admin';
import { WALLET_CONFIG } from '@/systems/wallet';

describe('admin.adjustBalance', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('credits the user balance and writes an audit row (transactional)', async () => {
    const reg = await register({ username: 'eve', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 500, reason: 'test grant' });
    expect(r).toEqual({ ok: true, newBalance: WALLET_CONFIG.STARTING_CHIPS + 500 });

    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS + 500);

    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      userId: reg.user.id,
      amount: 500,
      reason: 'test grant',
    });
    expect(adjustments[0]!.id).toBeTypeOf('string');
    expect(adjustments[0]!.adjustedAt).toBeGreaterThan(0);
  });

  it('debits the user balance (negative amount)', async () => {
    const reg = await register({ username: 'frank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: -200, reason: 'rollback' });
    expect(r).toEqual({ ok: true, newBalance: WALLET_CONFIG.STARTING_CHIPS - 200 });
  });

  it('trims whitespace from reason before storing', async () => {
    const reg = await register({ username: 'gail', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    await adjustBalance({ userId: reg.user.id, amount: 5, reason: '  hello  ' });
    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments[0]!.reason).toBe('hello');
  });

  it('rejects non-integer amount', async () => {
    const reg = await register({ username: 'hank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 1.5, reason: 'nope' });
    expect(r).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('rejects zero amount', async () => {
    const reg = await register({ username: 'iris', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 0, reason: 'no-op' });
    expect(r).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('rejects reason shorter than 3 trimmed chars', async () => {
    const reg = await register({ username: 'jack', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({ userId: reg.user.id, amount: 5, reason: 'ab' });
    expect(r).toEqual({ ok: false, error: 'invalid_reason' });
  });

  it('rejects when userId has no balance row', async () => {
    const r = await adjustBalance({ userId: 'ghost', amount: 100, reason: 'noone' });
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });

  it('rejects when the resulting balance would go negative', async () => {
    const reg = await register({ username: 'kate', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const r = await adjustBalance({
      userId: reg.user.id,
      amount: -(WALLET_CONFIG.STARTING_CHIPS + 1),
      reason: 'over-debit',
    });
    expect(r).toEqual({ ok: false, error: 'would_go_negative' });

    // Balance and audit table both untouched.
    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS);
    const adjustments = await db.adjustments.where('userId').equals(reg.user.id).toArray();
    expect(adjustments).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Append `adjustBalance` to `src/systems/admin.ts`**

```ts
export type AdjustBalanceError =
  | 'invalid_amount'
  | 'invalid_reason'
  | 'no_user'
  | 'would_go_negative'
  | 'unknown';

export type AdjustBalanceResult =
  | { ok: true; newBalance: number }
  | { ok: false; error: AdjustBalanceError };

/**
 * Admin chip adjustment. Writes the new balance AND an audit row atomically.
 * Negative amount = debit, positive = credit. Reason min 3 chars (trimmed).
 */
export async function adjustBalance(input: {
  userId: string;
  amount: number;
  reason: string;
}): Promise<AdjustBalanceResult> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    return { ok: false, error: 'invalid_amount' };
  }
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: 'invalid_reason' };
  }
  try {
    return await db.transaction('rw', db.balances, db.adjustments, async () => {
      const balance = await db.balances.get(input.userId);
      if (!balance) return { ok: false, error: 'no_user' as const };
      const newChips = balance.chips + input.amount;
      if (newChips < 0) return { ok: false, error: 'would_go_negative' as const };
      await db.balances.put({ ...balance, chips: newChips, updatedAt: Date.now() });
      await db.adjustments.add({
        id: crypto.randomUUID(),
        userId: input.userId,
        amount: input.amount,
        reason,
        adjustedAt: Date.now(),
      });
      return { ok: true as const, newBalance: newChips };
    });
  } catch {
    return { ok: false, error: 'unknown' };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/systems/admin.ts src/systems/admin.test.ts
git commit -m "feat(admin): adjustBalance (transactional balance change + audit row)"
```

## Task B.7: Extend `sessionStore` types (admin + currentSessionId)

**Files:**

- Modify: `src/store/sessionStore.ts`

This task adds the new state shape ONLY. The actual session-write logic arrives in B.8.

- [ ] **Step 1: Replace the contents of `src/store/sessionStore.ts`**

```ts
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
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  logout: async () => {
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
```

`db` is imported but not yet used in this file — that's fine; B.8 uses it. ESLint may flag the unused import depending on config; if so, defer the `db` import to B.8.

- [ ] **Step 2: Verify typecheck and existing tests still pass**

```bash
pnpm typecheck && pnpm exec vitest run src/store/sessionStore.test.ts
```

Expected: both exit 0. The existing `bootstrap`, `register`, `login`, `logout` tests still pass because we haven't changed their behaviour — only added `isAdmin` + `currentSessionId` to the state shape.

- [ ] **Step 3: Commit**

```bash
git add src/store/sessionStore.ts
git commit -m "feat(session): extend store with isAdmin + currentSessionId + admin methods"
```

## Task B.8: `sessionStore.login` — write session row + increment loginCount

**Files:**

- Modify: `src/store/sessionStore.ts`
- Modify: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Append failing tests to `src/store/sessionStore.test.ts`**

```ts
describe('sessionStore.login — session tracking', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('writes a sessions row + increments loginCount + sets lastLoginAt on successful login', async () => {
    await useSessionStore.getState().register({ username: 'alice', password: 'password123' });
    // register doesn't write a session row (the user is auto-logged in via setStoredSession,
    // but the session row is created in login). Log out then log in to exercise the path.
    await useSessionStore.getState().logout();

    const before = Date.now();
    const r = await useSessionStore
      .getState()
      .login({ username: 'alice', password: 'password123' });
    const after = Date.now();
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Session row exists, is open.
    const sessions = await db.sessions.where('userId').equals(r.user.id).toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.logoutAt).toBeNull();
    expect(sessions[0]!.durationMs).toBeNull();
    expect(sessions[0]!.loginAt).toBeGreaterThanOrEqual(before);
    expect(sessions[0]!.loginAt).toBeLessThanOrEqual(after);

    // currentSessionId set to that row's id.
    expect(useSessionStore.getState().currentSessionId).toBe(sessions[0]!.id);

    // loginCount on the user row was incremented.
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

    // Simulate a tab close without logout — clear currentSessionId in memory but leave the DB row open.
    useSessionStore.setState({ currentSessionId: null, currentUser: null });
    localStorage.removeItem('localGamble.session.userId');

    // Confirm the row is still open.
    const orphan = await db.sessions.get(firstSessionId);
    expect(orphan?.logoutAt).toBeNull();

    await useSessionStore.getState().login({ username: 'bob', password: 'password123' });
    // Orphan now closed.
    const cleaned = await db.sessions.get(firstSessionId);
    expect(cleaned?.logoutAt).not.toBeNull();
    expect(cleaned?.durationMs).toBeGreaterThanOrEqual(0);

    // A second sessions row exists (the new one).
    const all = await db.sessions.where('userId').equals(reg.user.id).toArray();
    expect(all).toHaveLength(2);

    // loginCount is now 2.
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
```

The test imports may need: `import { db } from '@/db'; import { resetDb } from '@/test/db-helpers';` — add to the top of the test file if not already imported.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Update the `login` method in `src/store/sessionStore.ts`**

Replace the existing `login` method with:

```ts
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

  // Read back the updated user so the store has the fresh loginCount / lastLoginAt.
  const freshUser = (await db.users.get(result.user.id)) ?? result.user;
  set({ currentUser: freshUser, currentSessionId: sessionId });
  return { ok: true, user: freshUser };
},
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/store/sessionStore.ts src/store/sessionStore.test.ts
git commit -m "feat(session): write sessions row + bump loginCount + orphan cleanup on login"
```

## Task B.9: `sessionStore.logout` — close the active session

**Files:**

- Modify: `src/store/sessionStore.ts`
- Modify: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Append failing test to `src/store/sessionStore.test.ts`**

```ts
describe('sessionStore.logout — session tracking', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
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
    expect(row?.logoutAt).toBe(12345); // unchanged
    expect(row?.durationMs).toBe(12345);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Update the `logout` method**

Replace the existing `logout` with:

```ts
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
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/store/sessionStore.ts src/store/sessionStore.test.ts
git commit -m "feat(session): close active session row on logout"
```

## Task B.10: `AppBootstrap` — `beforeunload` listener

**Files:**

- Modify: `src/components/AppBootstrap.tsx`
- Modify: `src/components/AppBootstrap.test.tsx`

- [ ] **Step 1: Append failing test to `src/components/AppBootstrap.test.tsx`**

```ts
describe('AppBootstrap — beforeunload session close', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('registers a beforeunload listener that closes the active session', async () => {
    // Create a real session.
    await useSessionStore.getState().register({ username: 'nina', password: 'password123' });
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'nina', password: 'password123' });
    const sid = useSessionStore.getState().currentSessionId!;

    // Mount AppBootstrap (just to register the listener).
    render(
      <AppBootstrap>
        <div>child</div>
      </AppBootstrap>,
    );

    // Wait for any bootstrap effect to settle.
    await waitFor(() => expect(useSessionStore.getState().bootstrapping).toBe(false));

    // Simulate beforeunload.
    window.dispatchEvent(new Event('beforeunload'));

    // The handler fires a fire-and-forget Promise — let microtasks flush.
    await new Promise((r) => setTimeout(r, 50));

    const closed = await db.sessions.get(sid);
    expect(closed?.logoutAt).not.toBeNull();
    expect(closed?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('beforeunload is a no-op when no session is active', async () => {
    render(
      <AppBootstrap>
        <div>child</div>
      </AppBootstrap>,
    );
    await waitFor(() => expect(useSessionStore.getState().bootstrapping).toBe(false));

    // No throw, no work to do.
    expect(() => window.dispatchEvent(new Event('beforeunload'))).not.toThrow();
  });
});
```

Imports needed at top of `AppBootstrap.test.tsx`: `useSessionStore`, `resetDb`, `db`, `waitFor`. Match the existing imports in the file.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Update `src/components/AppBootstrap.tsx`**

Add a new `useEffect` BELOW the existing bootstrap effect:

```tsx
useEffect(() => {
  const handler = () => {
    const sid = useSessionStore.getState().currentSessionId;
    if (!sid) return;
    const now = Date.now();
    // Fire-and-forget — beforeunload cannot await. The orphan-cleanup path
    // in sessionStore.login is the safety net if this write is aborted.
    void db.sessions.get(sid).then((s) => {
      if (s && s.logoutAt === null) {
        return db.sessions.update(sid, {
          logoutAt: now,
          durationMs: now - s.loginAt,
        });
      }
    });
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);
```

Add the import for `db` if not already present:

```tsx
import { db } from '@/db';
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/components/AppBootstrap.tsx src/components/AppBootstrap.test.tsx
git commit -m "feat(tracking): beforeunload listener closes active session best-effort"
```

## Task B.11: `useGameVisit` hook

**Files:**

- Create: `src/games/_shared/useGameVisit.ts`
- Create: `src/games/_shared/useGameVisit.test.ts`

- [ ] **Step 1: Write failing test `useGameVisit.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameVisit } from './useGameVisit';
import { useSessionStore } from '@/store/sessionStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('useGameVisit', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });
  afterEach(() => {
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('writes a gameVisit row on mount with enteredAt set', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'amy', password: 'password123' });
    if (!reg.ok) return;
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'amy', password: 'password123' });

    const { unmount } = renderHook(() => useGameVisit('blackjack'));

    // Wait for the async insert.
    await new Promise((r) => setTimeout(r, 10));

    const visits = await db.gameVisits.where('userId').equals(reg.user.id).toArray();
    expect(visits).toHaveLength(1);
    expect(visits[0]!.game).toBe('blackjack');
    expect(visits[0]!.exitedAt).toBeNull();
    expect(visits[0]!.durationMs).toBeNull();
    expect(visits[0]!.enteredAt).toBeGreaterThan(0);

    unmount();
    await new Promise((r) => setTimeout(r, 10));

    const after = await db.gameVisits.get(visits[0]!.id);
    expect(after?.exitedAt).toBeGreaterThanOrEqual(visits[0]!.enteredAt);
    expect(after?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('does nothing when no user is logged in', async () => {
    const { unmount } = renderHook(() => useGameVisit('slots'));
    await new Promise((r) => setTimeout(r, 10));
    const visits = await db.gameVisits.toArray();
    expect(visits).toHaveLength(0);
    unmount();
  });

  it('does nothing when no currentSessionId is set (defensive)', async () => {
    const reg = await useSessionStore
      .getState()
      .register({ username: 'ben', password: 'password123' });
    if (!reg.ok) return;
    // Manually clear the sessionId while keeping the user — exercise the guard.
    useSessionStore.setState({ currentSessionId: null });
    const { unmount } = renderHook(() => useGameVisit('roulette'));
    await new Promise((r) => setTimeout(r, 10));
    const visits = await db.gameVisits.toArray();
    expect(visits).toHaveLength(0);
    unmount();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/games/_shared/useGameVisit.ts`**

```ts
import { useEffect } from 'react';
import { db } from '@/db';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import type { Round } from '@/db';

type Game = Round['game'];

/**
 * Records a game-page visit. Writes a `gameVisits` row on mount, closes it
 * (sets `exitedAt` + `durationMs`) on unmount. Called from inside GameShell
 * so every game page is instrumented uniformly.
 *
 * Silent no-op when there's no user or no active session — the dashboard
 * can ignore the (rare) gap.
 */
export function useGameVisit(game: Game): void {
  const userId = useCurrentUser()?.id;
  const sessionId = useSessionStore((s) => s.currentSessionId);

  useEffect(() => {
    if (!userId || !sessionId) return;
    const visitId = crypto.randomUUID();
    const enteredAt = Date.now();

    void db.gameVisits.add({
      id: visitId,
      userId,
      sessionId,
      game,
      enteredAt,
      exitedAt: null,
      durationMs: null,
    });

    return () => {
      const now = Date.now();
      void db.gameVisits.update(visitId, {
        exitedAt: now,
        durationMs: now - enteredAt,
      });
    };
  }, [userId, sessionId, game]);
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/games/_shared/useGameVisit.ts src/games/_shared/useGameVisit.test.ts
git commit -m "feat(tracking): useGameVisit hook writes gameVisit row on mount/unmount"
```

## Task B.12: Wire `useGameVisit` into `GameShell` + game pages

**Files:**

- Modify: `src/games/_shared/GameShell.tsx`
- Modify: `src/games/_shared/GameShell.test.tsx`
- Modify: `src/games/coin-flip/CoinFlipPage.tsx`
- Modify: `src/games/blackjack/BlackjackPage.tsx`
- Modify: `src/games/roulette/RoulettePage.tsx`
- Modify: `src/games/slots/SlotsPage.tsx`

- [ ] **Step 1: Update `GameShell.tsx` to accept `game` prop and call the hook**

Add to the imports at the top:

```tsx
import { useGameVisit } from './useGameVisit';
import type { Round } from '@/db';

type Game = Round['game'];
```

Update the `Props` interface to include `game`:

```tsx
interface Props {
  title: string;
  meta?: string;
  recentItems?: RecentResultItem[];
  bettingPanel: ReactNode;
  children: ReactNode;
  /** Required for visit tracking. Pass the same key used in db.rounds.game. */
  game: Game;
}
```

In the component body, BEFORE the return statement, call the hook:

```tsx
useGameVisit(game);
```

(Pass `game` straight through — no destructuring change needed beyond adding it to the prop list.)

- [ ] **Step 2: Update each game page to pass `game` to `<GameShell>`**

`src/games/coin-flip/CoinFlipPage.tsx`: find the `<GameShell ...>` usage and add `game="coin-flip"`.

`src/games/blackjack/BlackjackPage.tsx`: add `game="blackjack"`.

`src/games/roulette/RoulettePage.tsx`: add `game="roulette"`.

`src/games/slots/SlotsPage.tsx`: add `game="slots"`.

For each, the change is a one-liner where the `<GameShell` element opens. Example for Coin Flip:

```tsx
<GameShell title="🪙 Coin Flip" meta="..." bettingPanel={...} game="coin-flip">
```

- [ ] **Step 3: Update `GameShell.test.tsx` to pass `game="coin-flip"`** to every render (or any other valid game key). Without it, the test won't compile.

Run:

```bash
pnpm typecheck
```

Expected: existing tests that render `<GameShell>` without `game` now fail typecheck. Add `game="coin-flip"` to each render call.

- [ ] **Step 4: Verify tests still pass**

```bash
pnpm exec vitest run src/games/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/_shared/GameShell.tsx src/games/_shared/GameShell.test.tsx \
  src/games/coin-flip/CoinFlipPage.tsx \
  src/games/blackjack/BlackjackPage.tsx \
  src/games/roulette/RoulettePage.tsx \
  src/games/slots/SlotsPage.tsx
git commit -m "feat(tracking): GameShell accepts game prop and tracks per-game visits"
```

## Task B.13: `useIsAdmin` accessor + check `logoutAdmin` path

**Files:**

- Modify: `src/store/sessionStore.test.ts`

The `useIsAdmin` selector hook was added in Task B.7. Pin its behaviour with a test.

- [ ] **Step 1: Append test to `src/store/sessionStore.test.ts`**

```ts
describe('sessionStore — admin methods', () => {
  beforeEach(() => {
    localStorage.removeItem('localGamble.session.admin');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });
  afterEach(() => {
    localStorage.removeItem('localGamble.session.admin');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('loginAdmin with correct creds flips isAdmin true and persists', () => {
    const r = useSessionStore.getState().loginAdmin({ username: 'admin', password: 'admin12345' });
    expect(r).toEqual({ ok: true });
    expect(useSessionStore.getState().isAdmin).toBe(true);
    expect(localStorage.getItem('localGamble.session.admin')).toBe('1');
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
    expect(localStorage.getItem('localGamble.session.admin')).toBeNull();
  });

  it('bootstrap restores admin session if localStorage has the key', async () => {
    localStorage.setItem('localGamble.session.admin', '1');
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().isAdmin).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/store/sessionStore.test.ts
```

Expected: PASS (all session tests including the admin ones).

- [ ] **Step 3: Commit**

```bash
git add src/store/sessionStore.test.ts
git commit -m "test(session): pin loginAdmin / logoutAdmin / bootstrap admin behaviours"
```

## Task B.14: PR B — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~600 tests passing (~40 new across auth + admin + admin-auth + session + useGameVisit + AppBootstrap).

- [ ] **Step 2: Run coverage to confirm thresholds met**

```bash
pnpm exec vitest run --coverage
```

Expected: `src/systems/admin.ts` and `src/systems/admin-auth.ts` both ≥ 80% (per the `src/systems/**/*.ts` threshold).

- [ ] **Step 3: Run markdownlint on any markdown changes**

```bash
npx markdownlint-cli2 'docs/superpowers/plans/2026-05-18-phase-9-admin-dashboard-plan.md'
```

Expected: 0 errors.

- [ ] **Step 4: Push branch**

```bash
git push -u origin phase-9-admin-pr-b-tracking
```

- [ ] **Step 5: Open PR**

```bash
gh pr create --title "phase-9(admin): tracking systems (sessions, gameVisits, admin module, ban + reserved-username)" --body "$(cat <<'EOF'
## Summary

PR B of Phase 9. Wires the cross-cutting tracking instrumentation.

- \`auth.register\` rejects reserved 'admin' username (case-insensitive)
- \`auth.login\` short-circuits 'admin' to invalid_credentials (constant-time)
- \`auth.login\` rejects banned users with error 'banned'
- \`src/systems/admin-auth.ts\` — loginAdmin / restoreAdminSession / logoutAdmin
- \`src/systems/admin.ts\` — banUser / unbanUser / adjustBalance (transactional + audit row)
- \`sessionStore\` extended: currentSessionId, isAdmin, loginAdmin, logoutAdmin
- \`sessionStore.login\` writes a sessions row + increments loginCount + cleans orphan
- \`sessionStore.logout\` closes the active session
- \`AppBootstrap\` registers a beforeunload listener (best-effort session close)
- \`useGameVisit\` hook + GameShell extended with \`game\` prop
- All 4 game pages pass their game key to GameShell

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~40 new tests passing (admin, admin-auth, session, useGameVisit, beforeunload)
- [x] Coverage thresholds met
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced, branch deleted (PR B).

---

# PR C — Admin auth UI shell

**Branch:** `phase-9-admin-pr-c-auth-ui` (off freshly-merged `main`)
**Goal of this PR:** Ship the hidden admin login form, the `RequireAdmin` route guard, and the `AdminLayout` (sidebar + outlet). Five placeholder pages are wired so navigation works end-to-end — the actual data pages arrive in PR D and E. After this PR you can log in as admin, see the dashboard skeleton, click between pages, and log out.
**Risk:** Low-medium. Mostly routing + UI scaffolding. Visual smoke test required because no e2e for nav.
**Estimated tasks:** 7.

## Task C.1: `RequireAdmin` route guard

**Files:**

- Create: `src/components/RequireAdmin.tsx`
- Create: `src/components/RequireAdmin.test.tsx`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-9-admin-pr-c-auth-ui
```

- [ ] **Step 2: Write failing test `RequireAdmin.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAdmin from './RequireAdmin';
import { useSessionStore } from '@/store/sessionStore';

function renderWithRouter(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<div>admin dashboard</div>} />
        </Route>
        <Route path="/admin/login" element={<div>admin login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders the child route when isAdmin is true', () => {
    useSessionStore.setState({ isAdmin: true });
    renderWithRouter('/admin');
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('redirects to /admin/login when isAdmin is false', () => {
    useSessionStore.setState({ isAdmin: false });
    renderWithRouter('/admin');
    expect(screen.getByText('admin login page')).toBeInTheDocument();
  });

  it('renders nothing while bootstrapping (avoids redirect flash)', () => {
    useSessionStore.setState({ bootstrapping: true, isAdmin: false });
    renderWithRouter('/admin');
    expect(screen.queryByText('admin dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('admin login page')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Write `src/components/RequireAdmin.tsx`**

```tsx
import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useIsAdmin, useIsBootstrapping } from '@/store/sessionStore';

export default function RequireAdmin(): JSX.Element | null {
  const isAdmin = useIsAdmin();
  const bootstrapping = useIsBootstrapping();

  if (bootstrapping) return null;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 5: Run tests — expect PASS.**

- [ ] **Step 6: Commit**

```bash
git add src/components/RequireAdmin.tsx src/components/RequireAdmin.test.tsx
git commit -m "feat(admin): RequireAdmin route guard (redirects to /admin/login)"
```

## Task C.2: `AdminLoginPage`

**Files:**

- Create: `src/pages/admin/AdminLoginPage.tsx`
- Create: `src/pages/admin/AdminLoginPage.test.tsx`

- [ ] **Step 1: Write failing test `AdminLoginPage.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLoginPage from './AdminLoginPage';
import { useSessionStore } from '@/store/sessionStore';

const ADMIN_KEY = 'localGamble.session.admin';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<div>admin dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_KEY);
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('shows username + password fields and a sign-in button', () => {
    renderPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('logs in successfully with correct credentials and navigates to /admin', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'admin12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('admin dashboard')).toBeInTheDocument();
    expect(useSessionStore.getState().isAdmin).toBe(true);
  });

  it('shows an error and stays on the login page when credentials are wrong', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });

  it('does not include any link back to the regular app (hidden route)', () => {
    renderPage();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/AdminLoginPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';

export default function AdminLoginPage(): JSX.Element {
  const navigate = useNavigate();
  const loginAdmin = useSessionStore((s) => s.loginAdmin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = loginAdmin({ username, password });
    if (result.ok) {
      navigate('/admin', { replace: true });
    } else {
      setError('Invalid credentials.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-casino-felt-deep px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-casino-gold-deep/60 bg-casino-felt-deeper p-6 shadow-gold-glow"
      >
        <h1 className="mb-1 font-display text-lg tracking-[0.18em] text-casino-gold">
          ADMIN ACCESS
        </h1>
        <p className="mb-6 text-xs text-white/50">Restricted — staff only.</p>

        <label
          htmlFor="admin-username"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Username
        </label>
        <input
          id="admin-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          autoFocus
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-casino-felt-deeper px-3 py-2 text-sm text-white focus:border-casino-gold focus:outline-none"
        />

        <label
          htmlFor="admin-password"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-casino-felt-deeper px-3 py-2 text-sm text-white focus:border-casino-gold focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-casino-red">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-sm bg-casino-gold py-2 font-display text-sm tracking-wider text-casino-felt-deeper hover:bg-casino-gold-bright"
        >
          SIGN IN
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminLoginPage.tsx src/pages/admin/AdminLoginPage.test.tsx
git commit -m "feat(admin): AdminLoginPage (hidden /admin/login)"
```

## Task C.3: `AdminLayout` (sidebar + outlet)

**Files:**

- Create: `src/pages/admin/AdminLayout.tsx`
- Create: `src/pages/admin/AdminLayout.test.tsx`

- [ ] **Step 1: Write failing test `AdminLayout.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useSessionStore } from '@/store/sessionStore';

const ADMIN_KEY = 'localGamble.session.admin';

function renderLayoutAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>overview content</div>} />
          <Route path="users" element={<div>users content</div>} />
          <Route path="users/:id" element={<div>per-user content</div>} />
          <Route path="adjustments" element={<div>adjustments content</div>} />
          <Route path="sessions" element={<div>sessions content</div>} />
        </Route>
        <Route path="/admin/login" element={<div>admin login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.setItem(ADMIN_KEY, '1');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: true,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders sidebar nav with 5 links and the current page content', () => {
    renderLayoutAt('/admin');
    expect(screen.getByText('overview content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /^users$/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /adjustments/i })).toHaveAttribute(
      'href',
      '/admin/adjustments',
    );
    expect(screen.getByRole('link', { name: /sessions/i })).toHaveAttribute(
      'href',
      '/admin/sessions',
    );
  });

  it('marks the active nav link with aria-current=page', () => {
    renderLayoutAt('/admin/users');
    const usersLink = screen.getByRole('link', { name: /^users$/i });
    expect(usersLink).toHaveAttribute('aria-current', 'page');
  });

  it('log-out button clears isAdmin and navigates to /admin/login', async () => {
    const user = userEvent.setup();
    renderLayoutAt('/admin');
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(useSessionStore.getState().isAdmin).toBe(false);
    expect(screen.getByText('admin login')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/AdminLayout.tsx`**

```tsx
import type { JSX } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/adjustments', label: 'Adjustments', end: false },
  { to: '/admin/sessions', label: 'Sessions', end: false },
] as const;

export default function AdminLayout(): JSX.Element {
  const navigate = useNavigate();
  const logoutAdmin = useSessionStore((s) => s.logoutAdmin);

  function handleLogout() {
    logoutAdmin();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-casino-felt-deep text-white">
      <aside className="w-44 shrink-0 border-r border-casino-gold-deep/40 bg-casino-felt-deeper py-4">
        <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-casino-gold">
          ADMIN
        </div>
        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'border-l-[3px] px-4 py-2 text-xs',
                  isActive
                    ? 'border-casino-gold bg-casino-gold/10 text-casino-gold-bright'
                    : 'border-transparent text-white/60 hover:bg-white/5',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="my-3 border-t border-casino-gold-deep/30" />
          <button
            type="button"
            onClick={handleLogout}
            className="border-l-[3px] border-transparent px-4 py-2 text-left text-xs text-white/60 hover:bg-white/5"
          >
            Log out
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminLayout.tsx src/pages/admin/AdminLayout.test.tsx
git commit -m "feat(admin): AdminLayout (sidebar nav + outlet + log-out)"
```

## Task C.4: Five placeholder admin pages

**Files:**

- Create: `src/pages/admin/AdminOverviewPage.tsx` (placeholder — full impl in PR D)
- Create: `src/pages/admin/AdminUsersListPage.tsx` (placeholder — full impl in PR D)
- Create: `src/pages/admin/AdminUserPage.tsx` (placeholder — full impl in PR E)
- Create: `src/pages/admin/AdminAuditPage.tsx` (placeholder — full impl in PR E)
- Create: `src/pages/admin/AdminSessionsPage.tsx` (placeholder — full impl in PR E)

These placeholders let PR C ship with a fully-navigable admin shell. PRs D and E replace the bodies; the file names and default exports stay stable.

- [ ] **Step 1: Write the placeholders** (one file each, ~10 lines).

`src/pages/admin/AdminOverviewPage.tsx`:

```tsx
import type { JSX } from 'react';

export default function AdminOverviewPage(): JSX.Element {
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">OVERVIEW</h1>
      <p className="text-sm text-white/50">Site-wide stats will appear here in PR D.</p>
    </div>
  );
}
```

`src/pages/admin/AdminUsersListPage.tsx`:

```tsx
import type { JSX } from 'react';

export default function AdminUsersListPage(): JSX.Element {
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">USERS</h1>
      <p className="text-sm text-white/50">User list will appear here in PR D.</p>
    </div>
  );
}
```

`src/pages/admin/AdminUserPage.tsx`:

```tsx
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';

export default function AdminUserPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">USER · {id}</h1>
      <p className="text-sm text-white/50">Per-user stats will appear here in PR E.</p>
    </div>
  );
}
```

`src/pages/admin/AdminAuditPage.tsx`:

```tsx
import type { JSX } from 'react';

export default function AdminAuditPage(): JSX.Element {
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">
        ADJUSTMENTS · audit log
      </h1>
      <p className="text-sm text-white/50">Adjustments log will appear here in PR E.</p>
    </div>
  );
}
```

`src/pages/admin/AdminSessionsPage.tsx`:

```tsx
import type { JSX } from 'react';

export default function AdminSessionsPage(): JSX.Element {
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">
        SESSIONS · all
      </h1>
      <p className="text-sm text-white/50">Sessions list will appear here in PR E.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminOverviewPage.tsx src/pages/admin/AdminUsersListPage.tsx \
  src/pages/admin/AdminUserPage.tsx src/pages/admin/AdminAuditPage.tsx \
  src/pages/admin/AdminSessionsPage.tsx
git commit -m "feat(admin): scaffold 5 admin page placeholders (filled in PR D + E)"
```

## Task C.5: Register `/admin/*` routes

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Inspect the existing router**

```bash
sed -n '1,80p' src/router.tsx
```

Note which form is in use: `createBrowserRouter` (data router) or `<BrowserRouter><Routes>`. Both forms shown below — use the one matching the existing file.

- [ ] **Step 2: Add the admin routes**

Add the imports near the top:

```tsx
import RequireAdmin from '@/components/RequireAdmin';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage';
import AdminUsersListPage from '@/pages/admin/AdminUsersListPage';
import AdminUserPage from '@/pages/admin/AdminUserPage';
import AdminAuditPage from '@/pages/admin/AdminAuditPage';
import AdminSessionsPage from '@/pages/admin/AdminSessionsPage';
```

**Data-router form** — add to the root children array (alongside the existing `RequireAuth`-wrapped block):

```tsx
{
  path: '/admin/login',
  element: <AdminLoginPage />,
},
{
  element: <RequireAdmin />,
  children: [
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminOverviewPage /> },
        { path: 'users', element: <AdminUsersListPage /> },
        { path: 'users/:id', element: <AdminUserPage /> },
        { path: 'adjustments', element: <AdminAuditPage /> },
        { path: 'sessions', element: <AdminSessionsPage /> },
      ],
    },
  ],
},
```

**JSX `<Routes>` form** — add inside the existing `<Routes>`:

```tsx
<Route path="/admin/login" element={<AdminLoginPage />} />
<Route element={<RequireAdmin />}>
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminOverviewPage />} />
    <Route path="users" element={<AdminUsersListPage />} />
    <Route path="users/:id" element={<AdminUserPage />} />
    <Route path="adjustments" element={<AdminAuditPage />} />
    <Route path="sessions" element={<AdminSessionsPage />} />
  </Route>
</Route>
```

- [ ] **Step 3: Verify typecheck + build**

```bash
pnpm typecheck && pnpm build
```

Expected: both exit 0.

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev
```

In the browser:

- Navigate to `http://localhost:5173/admin` → redirects to `/admin/login`.
- Submit `admin` / `wrong` → error message, stays on login.
- Submit `admin` / `admin12345` → lands on `/admin` showing the OVERVIEW placeholder + sidebar.
- Click each sidebar item — placeholder content swaps, active link highlighted in gold.
- Click "Log out" → returns to `/admin/login`.
- Hit `/admin` again — redirect proves session cleared.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/router.tsx
git commit -m "feat(routing): register /admin/* routes (login + guarded layout + 5 children)"
```

## Task C.6: Lazy-load admin bundle

**Files:**

- Modify: `src/router.tsx`

PR D will pull in Recharts (~95 kB minified). It must not ship to non-admin users. Switch to `React.lazy()` so Vite emits a separate chunk.

- [ ] **Step 1: Replace the static admin imports with lazy imports**

Replace:

```tsx
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverviewPage from '@/pages/admin/AdminOverviewPage';
import AdminUsersListPage from '@/pages/admin/AdminUsersListPage';
import AdminUserPage from '@/pages/admin/AdminUserPage';
import AdminAuditPage from '@/pages/admin/AdminAuditPage';
import AdminSessionsPage from '@/pages/admin/AdminSessionsPage';
```

with:

```tsx
import { lazy, Suspense } from 'react';

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'));
const AdminUsersListPage = lazy(() => import('@/pages/admin/AdminUsersListPage'));
const AdminUserPage = lazy(() => import('@/pages/admin/AdminUserPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSessionsPage = lazy(() => import('@/pages/admin/AdminSessionsPage'));

const adminFallback = (
  <div className="flex min-h-screen items-center justify-center bg-casino-felt-deep text-xs text-white/40">
    Loading admin…
  </div>
);
```

Wrap each top-level admin route element in `<Suspense fallback={adminFallback}>`. Child page elements inherit the boundary from `AdminLayout` — no individual wrappers needed.

```tsx
// /admin/login element:
element: (
  <Suspense fallback={adminFallback}>
    <AdminLoginPage />
  </Suspense>
),
// /admin layout element:
element: (
  <Suspense fallback={adminFallback}>
    <AdminLayout />
  </Suspense>
),
```

- [ ] **Step 2: Build and confirm chunk split**

```bash
pnpm build
```

Expected: build output shows a separate chunk for the admin pages (~5-15 kB at this stage; will grow when PR D adds Recharts). Main bundle size unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "perf(admin): lazy-load admin pages (separate Vite chunk)"
```

## Task C.7: PR C — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~620 tests passing.

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-9-admin-pr-c-auth-ui
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-9(admin): auth UI shell — RequireAdmin + login + layout + placeholders" --body "$(cat <<'EOF'
## Summary

PR C of Phase 9. Ships the hidden admin auth UI + dashboard shell.

- \`RequireAdmin\` route guard (redirects to /admin/login when not admin)
- \`AdminLoginPage\` at hidden /admin/login with hardcoded admin/admin12345
- \`AdminLayout\` (sidebar + outlet + log-out)
- 5 placeholder pages: Overview, Users list, Per-user, Audit, Sessions (bodies filled in PR D + E)
- Routes registered in src/router.tsx
- Admin pages lazy-loaded — separate Vite chunk

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] Manual smoke: login → navigate → log out → confirm redirect
- [x] Build output confirms admin chunk is split
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced (PR C).

---

# PR D — Overview + Users list + Charts

**Branch:** `phase-9-admin-pr-d-overview` (off freshly-merged `main`)
**Goal of this PR:** Replace the Overview and Users-list placeholders with real data-driven pages. Add Recharts as a dependency (lazy-loaded with the admin chunk only). Ship three reusable chart wrappers (NetFlowLine, WinnersLosersBar, GameDistributionDonut) and the `StatCard` primitive. Introduce `queries.ts` — a single module that owns all admin-facing Dexie aggregation logic.
**Risk:** Medium. Charts have a footprint on the bundle (~95 kB Recharts) but must stay in the admin chunk. Aggregation correctness matters — pin with unit tests.
**Estimated tasks:** 9.

## Task D.1: Branch + add Recharts dependency

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (regenerated)

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-9-admin-pr-d-overview
```

- [ ] **Step 2: Add Recharts (pin minor)**

```bash
pnpm add recharts@^2.15.0
```

Expected: package.json gains `"recharts": "^2.15.0"` under `dependencies`; pnpm-lock.yaml updates.

- [ ] **Step 3: Build to confirm Recharts ships in the admin chunk (it isn't imported anywhere yet, so this is just a sanity check)**

```bash
pnpm build
```

Expected: build succeeds. No new chunk yet (no import).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(admin): add recharts ^2.15.0 (lazy-loaded with admin chunk)"
```

## Task D.2: `queries.ts` — admin Dexie aggregations

**Files:**

- Create: `src/pages/admin/queries.ts`
- Create: `src/pages/admin/queries.test.ts`

This module is the single owner of all DB aggregations the admin pages need. All admin pages import from here — no page reaches into `db` directly for analytics.

- [ ] **Step 1: Write failing test `queries.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import {
  getAllUserStats,
  getSiteWideStats,
  getNetFlowSeries,
  getGameDistribution,
  getTopWinners,
  getTopLosers,
} from './queries';

const SESSION_KEY = 'localGamble.session.userId';

async function seedTwoUsersWithRounds() {
  await resetDb();
  localStorage.removeItem(SESSION_KEY);
  const a = await register({ username: 'alice', password: 'password123' });
  const b = await register({ username: 'bob', password: 'password123' });
  if (!a.ok || !b.ok) throw new Error('register failed');

  // Alice: +200 net across 3 rounds, all blackjack
  await db.rounds.bulkAdd([
    {
      id: 'r-1',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    },
    {
      id: 'r-2',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1150,
      playedAt: 2000,
    },
    {
      id: 'r-3',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1200,
      playedAt: 3000,
    },
  ]);

  // Bob: −150 net across 2 rounds, mixed games
  await db.rounds.bulkAdd([
    {
      id: 'r-4',
      userId: b.user.id,
      game: 'roulette',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1500,
    },
    {
      id: 'r-5',
      userId: b.user.id,
      game: 'slots',
      betAmount: 50,
      payout: 0,
      netChange: -50,
      outcome: 'loss',
      details: {},
      balanceAfter: 850,
      playedAt: 2500,
    },
  ]);

  return { aliceId: a.user.id, bobId: b.user.id };
}

describe('queries.getSiteWideStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when no users exist', async () => {
    const s = await getSiteWideStats();
    expect(s).toEqual({
      userCount: 0,
      totalWagered: 0,
      totalPaidOut: 0,
      totalNetChange: 0,
      totalRounds: 0,
    });
  });

  it('aggregates wagered / paid / net / rounds across all users', async () => {
    await seedTwoUsersWithRounds();
    const s = await getSiteWideStats();
    expect(s.userCount).toBe(2);
    expect(s.totalRounds).toBe(5);
    expect(s.totalWagered).toBe(100 + 50 + 50 + 100 + 50);
    expect(s.totalPaidOut).toBe(200 + 100 + 100 + 0 + 0);
    expect(s.totalNetChange).toBe(100 + 50 + 50 - 100 - 50);
  });
});

describe('queries.getAllUserStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns one row per user with totals + balance', async () => {
    const { aliceId, bobId } = await seedTwoUsersWithRounds();
    const rows = await getAllUserStats();
    expect(rows).toHaveLength(2);
    const alice = rows.find((r) => r.userId === aliceId)!;
    const bob = rows.find((r) => r.userId === bobId)!;
    expect(alice.username).toBe('alice');
    expect(alice.totalNetChange).toBe(200);
    expect(alice.totalRounds).toBe(3);
    expect(alice.currentBalance).toBe(1200); // from seeded balanceAfter? — no, from db.balances; verify
    expect(bob.totalNetChange).toBe(-150);
    expect(bob.totalRounds).toBe(2);
  });
});

describe('queries.getNetFlowSeries', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns a daily-bucketed net-change series', async () => {
    await seedTwoUsersWithRounds();
    const series = await getNetFlowSeries();
    expect(series.length).toBeGreaterThan(0);
    const totalFromSeries = series.reduce((s, p) => s + p.netChange, 0);
    expect(totalFromSeries).toBe(50); // 100+50+50-100-50
    // Each bucket is { dayStartMs, netChange }
    for (const p of series) {
      expect(typeof p.dayStartMs).toBe('number');
      expect(typeof p.netChange).toBe('number');
    }
  });

  it('returns empty array when no rounds', async () => {
    const s = await getNetFlowSeries();
    expect(s).toEqual([]);
  });
});

describe('queries.getGameDistribution', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('counts rounds per game', async () => {
    await seedTwoUsersWithRounds();
    const d = await getGameDistribution();
    expect(d.find((g) => g.game === 'blackjack')?.rounds).toBe(3);
    expect(d.find((g) => g.game === 'roulette')?.rounds).toBe(1);
    expect(d.find((g) => g.game === 'slots')?.rounds).toBe(1);
  });
});

describe('queries.getTopWinners / getTopLosers', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('top winners is sorted descending by netChange', async () => {
    await seedTwoUsersWithRounds();
    const w = await getTopWinners(5);
    expect(w[0]!.username).toBe('alice');
    expect(w[0]!.totalNetChange).toBe(200);
  });

  it('top losers is sorted ascending (most negative first)', async () => {
    await seedTwoUsersWithRounds();
    const l = await getTopLosers(5);
    expect(l[0]!.username).toBe('bob');
    expect(l[0]!.totalNetChange).toBe(-150);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/queries.ts`**

```ts
import { db } from '@/db';
import type { Round, User } from '@/db';

export type UserStatsRow = {
  userId: string;
  username: string;
  currentBalance: number;
  totalWagered: number;
  totalPaidOut: number;
  totalNetChange: number;
  totalRounds: number;
  loginCount: number;
  lastLoginAt: number | null;
  isBanned: boolean;
  createdAt: number;
};

export async function getAllUserStats(): Promise<UserStatsRow[]> {
  const users = await db.users.toArray();
  const out: UserStatsRow[] = [];
  for (const u of users) {
    const rounds = await db.rounds.where('userId').equals(u.id).toArray();
    const bal = await db.balances.get(u.id);
    out.push({
      userId: u.id,
      username: u.username,
      currentBalance: bal?.chips ?? 0,
      totalWagered: sumBy(rounds, (r) => r.betAmount),
      totalPaidOut: sumBy(rounds, (r) => r.payout),
      totalNetChange: sumBy(rounds, (r) => r.netChange),
      totalRounds: rounds.length,
      loginCount: u.loginCount ?? 0,
      lastLoginAt: u.lastLoginAt ?? null,
      isBanned: u.isBanned === true,
      createdAt: u.createdAt,
    });
  }
  return out;
}

export type SiteWideStats = {
  userCount: number;
  totalWagered: number;
  totalPaidOut: number;
  totalNetChange: number;
  totalRounds: number;
};

export async function getSiteWideStats(): Promise<SiteWideStats> {
  const [userCount, rounds] = await Promise.all([db.users.count(), db.rounds.toArray()]);
  return {
    userCount,
    totalRounds: rounds.length,
    totalWagered: sumBy(rounds, (r) => r.betAmount),
    totalPaidOut: sumBy(rounds, (r) => r.payout),
    totalNetChange: sumBy(rounds, (r) => r.netChange),
  };
}

export type NetFlowPoint = { dayStartMs: number; netChange: number };

export async function getNetFlowSeries(): Promise<NetFlowPoint[]> {
  const rounds = await db.rounds.toArray();
  if (rounds.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const r of rounds) {
    const day = startOfUtcDay(r.playedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + r.netChange);
  }
  return [...byDay.entries()]
    .map(([dayStartMs, netChange]) => ({ dayStartMs, netChange }))
    .sort((a, b) => a.dayStartMs - b.dayStartMs);
}

export type GameDistributionPoint = { game: Round['game']; rounds: number; netChange: number };

export async function getGameDistribution(): Promise<GameDistributionPoint[]> {
  const rounds = await db.rounds.toArray();
  const byGame = new Map<Round['game'], { rounds: number; netChange: number }>();
  for (const r of rounds) {
    const cur = byGame.get(r.game) ?? { rounds: 0, netChange: 0 };
    byGame.set(r.game, { rounds: cur.rounds + 1, netChange: cur.netChange + r.netChange });
  }
  return [...byGame.entries()].map(([game, v]) => ({ game, ...v }));
}

export async function getTopWinners(limit: number): Promise<UserStatsRow[]> {
  const all = await getAllUserStats();
  return all
    .filter((u) => u.totalNetChange > 0)
    .sort((a, b) => b.totalNetChange - a.totalNetChange)
    .slice(0, limit);
}

export async function getTopLosers(limit: number): Promise<UserStatsRow[]> {
  const all = await getAllUserStats();
  return all
    .filter((u) => u.totalNetChange < 0)
    .sort((a, b) => a.totalNetChange - b.totalNetChange)
    .slice(0, limit);
}

// ----- per-user helpers (used by PR E) -----

export async function getUserStatsRow(userId: string): Promise<UserStatsRow | null> {
  const u = await db.users.get(userId);
  if (!u) return null;
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  const bal = await db.balances.get(userId);
  return {
    userId: u.id,
    username: u.username,
    currentBalance: bal?.chips ?? 0,
    totalWagered: sumBy(rounds, (r) => r.betAmount),
    totalPaidOut: sumBy(rounds, (r) => r.payout),
    totalNetChange: sumBy(rounds, (r) => r.netChange),
    totalRounds: rounds.length,
    loginCount: u.loginCount ?? 0,
    lastLoginAt: u.lastLoginAt ?? null,
    isBanned: u.isBanned === true,
    createdAt: u.createdAt,
  };
}

export async function getUserGameDistribution(userId: string): Promise<GameDistributionPoint[]> {
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  const byGame = new Map<Round['game'], { rounds: number; netChange: number }>();
  for (const r of rounds) {
    const cur = byGame.get(r.game) ?? { rounds: 0, netChange: 0 };
    byGame.set(r.game, { rounds: cur.rounds + 1, netChange: cur.netChange + r.netChange });
  }
  return [...byGame.entries()].map(([game, v]) => ({ game, ...v }));
}

export async function getUserGameTime(
  userId: string,
): Promise<{ game: Round['game']; durationMs: number }[]> {
  const visits = await db.gameVisits.where('userId').equals(userId).toArray();
  const byGame = new Map<Round['game'], number>();
  for (const v of visits) {
    const dur = v.durationMs ?? 0;
    byGame.set(v.game, (byGame.get(v.game) ?? 0) + dur);
  }
  return [...byGame.entries()].map(([game, durationMs]) => ({ game, durationMs }));
}

export async function getUserSessionTime(userId: string): Promise<number> {
  const sessions = await db.sessions.where('userId').equals(userId).toArray();
  return sessions.reduce((s, sess) => s + (sess.durationMs ?? 0), 0);
}

export async function getUserNetFlowSeries(userId: string): Promise<NetFlowPoint[]> {
  const rounds = await db.rounds.where('userId').equals(userId).toArray();
  if (rounds.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const r of rounds) {
    const day = startOfUtcDay(r.playedAt);
    byDay.set(day, (byDay.get(day) ?? 0) + r.netChange);
  }
  return [...byDay.entries()]
    .map(([dayStartMs, netChange]) => ({ dayStartMs, netChange }))
    .sort((a, b) => a.dayStartMs - b.dayStartMs);
}

// ----- helpers -----

function sumBy<T>(items: readonly T[], f: (t: T) => number): number {
  let s = 0;
  for (const it of items) s += f(it);
  return s;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
```

- [ ] **Step 4: Run tests — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/queries.ts src/pages/admin/queries.test.ts
git commit -m "feat(admin): queries.ts — site-wide + per-user aggregations"
```

## Task D.3: `StatCard` primitive

**Files:**

- Create: `src/pages/admin/StatCard.tsx`
- Create: `src/pages/admin/StatCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders label + value', () => {
    render(<StatCard label="Total wagered" value="12,345" />);
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('renders an optional sub-line', () => {
    render(<StatCard label="L" value="V" sub="across 99 rounds" />);
    expect(screen.getByText(/across 99 rounds/i)).toBeInTheDocument();
  });

  it('uses the casino-gold accent for a positive tone', () => {
    const { container } = render(<StatCard label="L" value="V" tone="positive" />);
    expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
  });

  it('uses the casino-red accent for a negative tone', () => {
    const { container } = render(<StatCard label="L" value="V" tone="negative" />);
    expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/StatCard.tsx`**

```tsx
import type { JSX, ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative';
};

export default function StatCard({ label, value, sub, tone = 'neutral' }: Props): JSX.Element {
  const valueColor =
    tone === 'positive'
      ? 'text-casino-green-bright'
      : tone === 'negative'
        ? 'text-casino-red'
        : 'text-white';
  return (
    <div
      data-tone={tone}
      className="rounded-md border border-casino-gold-deep/30 bg-casino-felt-deeper px-4 py-3"
    >
      <div className="font-display text-[10px] tracking-[0.18em] text-white/50">
        {label.toUpperCase()}
      </div>
      <div className={`mt-1 font-display text-2xl ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/40">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/StatCard.tsx src/pages/admin/StatCard.test.tsx
git commit -m "feat(admin): StatCard primitive (label / value / sub / tone)"
```

## Task D.4: `NetFlowLine` chart

**Files:**

- Create: `src/pages/admin/charts/NetFlowLine.tsx`
- Create: `src/pages/admin/charts/NetFlowLine.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NetFlowLine from './NetFlowLine';

describe('NetFlowLine', () => {
  it('renders an empty-state when given no data', () => {
    render(<NetFlowLine data={[]} />);
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });

  it('renders a chart container when given data', () => {
    const { container } = render(
      <NetFlowLine
        data={[
          { dayStartMs: 1000, netChange: 100 },
          { dayStartMs: 86_400_000 + 1000, netChange: -50 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/charts/NetFlowLine.tsx`**

```tsx
import type { JSX } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetFlowPoint } from '@/pages/admin/queries';

type Props = { data: NetFlowPoint[]; height?: number };

export default function NetFlowLine({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No data yet — play a round to populate.</div>;
  }
  const chartData = data.map((p) => ({
    day: new Date(p.dayStartMs).toISOString().slice(0, 10),
    netChange: p.netChange,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#ffe066',
          }}
        />
        <Line
          type="monotone"
          dataKey="netChange"
          stroke="#d4af37"
          strokeWidth={2}
          dot={{ r: 2, fill: '#d4af37' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/charts/NetFlowLine.tsx src/pages/admin/charts/NetFlowLine.test.tsx
git commit -m "feat(admin): NetFlowLine chart (daily net-change line)"
```

## Task D.5: `WinnersLosersBar` chart

**Files:**

- Create: `src/pages/admin/charts/WinnersLosersBar.tsx`
- Create: `src/pages/admin/charts/WinnersLosersBar.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinnersLosersBar from './WinnersLosersBar';

describe('WinnersLosersBar', () => {
  it('renders empty state when given no data', () => {
    render(<WinnersLosersBar winners={[]} losers={[]} />);
    expect(screen.getByText(/no winners or losers yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given at least one entry', () => {
    const { container } = render(
      <WinnersLosersBar
        winners={[{ username: 'alice', totalNetChange: 200 }]}
        losers={[{ username: 'bob', totalNetChange: -150 }]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/charts/WinnersLosersBar.tsx`**

```tsx
import type { JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Entry = { username: string; totalNetChange: number };
type Props = { winners: Entry[]; losers: Entry[]; height?: number };

export default function WinnersLosersBar({ winners, losers, height = 240 }: Props): JSX.Element {
  const combined = [...winners.slice().reverse(), ...losers];
  if (combined.length === 0) {
    return <div className="text-xs text-white/40">No winners or losers yet.</div>;
  }
  const chartData = combined.map((e) => ({
    name: e.username,
    value: e.totalNetChange,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis
          dataKey="name"
          type="category"
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
          width={70}
        />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#ffe066',
          }}
        />
        <Bar dataKey="value">
          {chartData.map((d) => (
            <Cell key={d.name} fill={d.value >= 0 ? '#3dd17a' : '#c0392b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/charts/WinnersLosersBar.tsx src/pages/admin/charts/WinnersLosersBar.test.tsx
git commit -m "feat(admin): WinnersLosersBar chart (top winners / losers combined)"
```

## Task D.6: `GameDistributionDonut` chart

**Files:**

- Create: `src/pages/admin/charts/GameDistributionDonut.tsx`
- Create: `src/pages/admin/charts/GameDistributionDonut.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameDistributionDonut from './GameDistributionDonut';

describe('GameDistributionDonut', () => {
  it('renders empty state when given no data', () => {
    render(<GameDistributionDonut data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given at least one game', () => {
    const { container } = render(
      <GameDistributionDonut
        data={[
          { game: 'blackjack', rounds: 3, netChange: 200 },
          { game: 'roulette', rounds: 1, netChange: -100 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/charts/GameDistributionDonut.tsx`**

```tsx
import type { JSX } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { GameDistributionPoint } from '@/pages/admin/queries';

const COLORS: Record<string, string> = {
  blackjack: '#3dd17a',
  roulette: '#c0392b',
  slots: '#d4af37',
  baccarat: '#5b6ed1',
  'coin-flip': '#9b59b6',
};

type Props = { data: GameDistributionPoint[]; height?: number };

export default function GameDistributionDonut({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet.</div>;
  }
  const chartData = data.map((d) => ({ name: d.game, value: d.rounds }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {chartData.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name] ?? '#888'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#ffe066',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/charts/GameDistributionDonut.tsx src/pages/admin/charts/GameDistributionDonut.test.tsx
git commit -m "feat(admin): GameDistributionDonut chart (rounds per game)"
```

## Task D.7: `AdminOverviewPage` (replace placeholder)

**Files:**

- Modify: `src/pages/admin/AdminOverviewPage.tsx`
- Create: `src/pages/admin/AdminOverviewPage.test.tsx`

- [ ] **Step 1: Write failing test `AdminOverviewPage.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminOverviewPage from './AdminOverviewPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('AdminOverviewPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders the four stat cards and three chart sections when data exists', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    });

    render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/users/i)).toBeInTheDocument());
    expect(screen.getByText(/total wagered/i)).toBeInTheDocument();
    expect(screen.getByText(/total paid out/i)).toBeInTheDocument();
    expect(screen.getByText(/net house/i)).toBeInTheDocument();
    expect(screen.getByText(/net flow/i)).toBeInTheDocument();
    expect(screen.getByText(/top winners/i)).toBeInTheDocument();
    expect(screen.getByText(/game distribution/i)).toBeInTheDocument();
  });

  it('shows zero-state copy when no data exists', async () => {
    render(
      <MemoryRouter>
        <AdminOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/total wagered/i)).toBeInTheDocument());
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Replace `src/pages/admin/AdminOverviewPage.tsx`** (no longer a placeholder):

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from './StatCard';
import NetFlowLine from './charts/NetFlowLine';
import WinnersLosersBar from './charts/WinnersLosersBar';
import GameDistributionDonut from './charts/GameDistributionDonut';
import {
  getGameDistribution,
  getNetFlowSeries,
  getSiteWideStats,
  getTopLosers,
  getTopWinners,
} from './queries';

export default function AdminOverviewPage(): JSX.Element {
  const stats = useLiveQuery(getSiteWideStats, [], {
    userCount: 0,
    totalWagered: 0,
    totalPaidOut: 0,
    totalNetChange: 0,
    totalRounds: 0,
  });
  const netFlow = useLiveQuery(getNetFlowSeries, [], []);
  const winners = useLiveQuery(() => getTopWinners(5), [], []);
  const losers = useLiveQuery(() => getTopLosers(5), [], []);
  const distribution = useLiveQuery(getGameDistribution, [], []);

  // House net = − sum of user net (player wins = house losses).
  const houseNet = -stats.totalNetChange;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-casino-gold">OVERVIEW</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Users" value={stats.userCount} sub={`${stats.totalRounds} rounds`} />
        <StatCard label="Total wagered" value={stats.totalWagered.toLocaleString()} />
        <StatCard label="Total paid out" value={stats.totalPaidOut.toLocaleString()} />
        <StatCard
          label="Net house"
          value={houseNet.toLocaleString()}
          tone={houseNet >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">NET FLOW</h2>
        <NetFlowLine data={netFlow} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          TOP WINNERS / LOSERS
        </h2>
        <WinnersLosersBar winners={winners} losers={losers} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          GAME DISTRIBUTION
        </h2>
        <GameDistributionDonut data={distribution} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdminOverviewPage.tsx src/pages/admin/AdminOverviewPage.test.tsx
git commit -m "feat(admin): AdminOverviewPage — 4 stat cards + 3 charts (live-queried)"
```

## Task D.8: `AdminUsersListPage` (replace placeholder)

**Files:**

- Modify: `src/pages/admin/AdminUsersListPage.tsx`
- Create: `src/pages/admin/AdminUsersListPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUsersListPage from './AdminUsersListPage';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('AdminUsersListPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('lists registered users with username + balance + net change columns', async () => {
    await register({ username: 'alice', password: 'password123' });
    await register({ username: 'bob', password: 'password123' });
    render(
      <MemoryRouter>
        <AdminUsersListPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /username/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /balance/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /net/i })).toBeInTheDocument();
  });

  it('clicking a row navigates to /admin/users/:id', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin/users" element={<AdminUsersListPage />} />
          <Route path="/admin/users/:id" element={<div>user detail page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));
    expect(await screen.findByText('user detail page')).toBeInTheDocument();
    if (!r.ok) throw new Error('register failed');
  });

  it('renders a banned badge on banned users', async () => {
    const r = await register({ username: 'eve', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const { db } = await import('@/db');
    await db.users.update(r.user.id, { isBanned: true });
    render(
      <MemoryRouter>
        <AdminUsersListPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('eve')).toBeInTheDocument());
    expect(screen.getByText(/banned/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Replace `src/pages/admin/AdminUsersListPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { getAllUserStats } from './queries';

export default function AdminUsersListPage(): JSX.Element {
  const rows = useLiveQuery(getAllUserStats, [], []);

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">
        USERS · {rows.length}
      </h1>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-casino-gold-deep/30 text-xs uppercase tracking-wider text-white/50">
            <th className="py-2 pr-3">Username</th>
            <th className="py-2 pr-3">Balance</th>
            <th className="py-2 pr-3">Net change</th>
            <th className="py-2 pr-3">Rounds</th>
            <th className="py-2 pr-3">Logins</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 pr-3">
                <Link
                  to={`/admin/users/${r.userId}`}
                  className="text-casino-gold-bright hover:underline"
                >
                  {r.username}
                </Link>
              </td>
              <td className="py-2 pr-3">{r.currentBalance.toLocaleString()}</td>
              <td
                className={`py-2 pr-3 ${r.totalNetChange > 0 ? 'text-casino-green-bright' : r.totalNetChange < 0 ? 'text-casino-red' : 'text-white/70'}`}
              >
                {r.totalNetChange > 0 ? '+' : ''}
                {r.totalNetChange.toLocaleString()}
              </td>
              <td className="py-2 pr-3">{r.totalRounds}</td>
              <td className="py-2 pr-3">{r.loginCount}</td>
              <td className="py-2 pr-3">
                {r.isBanned ? (
                  <span className="rounded-sm bg-casino-red/20 px-2 py-0.5 text-xs uppercase tracking-wider text-casino-red">
                    Banned
                  </span>
                ) : (
                  <span className="text-xs text-white/40">active</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-xs text-white/40">
                No users registered yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdminUsersListPage.tsx src/pages/admin/AdminUsersListPage.test.tsx
git commit -m "feat(admin): AdminUsersListPage — table with banned badge + drill-in links"
```

## Task D.9: PR D — verify, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~660 tests passing. Build output shows admin chunk now includes Recharts (~95 kB delta within the admin chunk; main bundle unchanged).

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev
```

Verify:

- Register a regular user, play 5 blackjack rounds + 3 roulette + 2 slots.
- Log out → admin login → /admin overview shows non-zero stat cards + 3 charts render.
- Click Users → see the registered user in the table → click their name → reaches placeholder (PR E will fill).
- DevTools network tab: confirm only a single admin chunk loads.

Stop dev server.

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-9-admin-pr-d-overview
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-9(admin): Overview + Users list + Recharts (lazy chunk)" --body "$(cat <<'EOF'
## Summary

PR D of Phase 9. Replaces 2 placeholder pages with real, data-driven pages.

- recharts ^2.15.0 added — ships in the admin chunk only (lazy-loaded)
- \`queries.ts\` — single owner of Dexie aggregations (site-wide + per-user)
- \`StatCard\` primitive (label / value / sub / tone)
- 3 chart wrappers: NetFlowLine, WinnersLosersBar, GameDistributionDonut
- \`AdminOverviewPage\` — 4 stat cards + 3 chart sections, useLiveQuery
- \`AdminUsersListPage\` — table with drill-in links + banned badge

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] Manual smoke: register, play rounds, log in as admin, verify stats + charts
- [x] Build output confirms recharts in admin chunk only
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced (PR D).

---

# PR E — Per-user + actions + audit + sessions

**Branch:** `phase-9-admin-pr-e-per-user` (off freshly-merged `main`)
**Goal of this PR:** Replace the three remaining placeholder pages — AdminUserPage (per-user drill-in), AdminAuditPage (all adjustments), AdminSessionsPage (all sessions). Add the AdjustCreditsModal + ban/unban actions on the per-user page. Add one more chart (UserActivityLine).
**Risk:** Medium. Modals + destructive admin actions need confirmation + clear error messaging. AdjustCredits is the only place users can lose chips by admin fiat — keep the audit pristine.
**Estimated tasks:** 7.

## Task E.1: `UserActivityLine` chart

**Files:**

- Create: `src/pages/admin/charts/UserActivityLine.tsx`
- Create: `src/pages/admin/charts/UserActivityLine.test.tsx`

A per-user net-flow series. Same shape as `NetFlowLine` but rendered with a different accent so a per-user view doesn't look identical to the site-wide overview.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-9-admin-pr-e-per-user
```

- [ ] **Step 2: Write failing test `UserActivityLine.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserActivityLine from './UserActivityLine';

describe('UserActivityLine', () => {
  it('renders empty state when given no data', () => {
    render(<UserActivityLine data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given data', () => {
    const { container } = render(
      <UserActivityLine
        data={[
          { dayStartMs: 1000, netChange: 100 },
          { dayStartMs: 86_400_000 + 1000, netChange: -25 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Write `src/pages/admin/charts/UserActivityLine.tsx`**

```tsx
import type { JSX } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetFlowPoint } from '@/pages/admin/queries';

type Props = { data: NetFlowPoint[]; height?: number };

export default function UserActivityLine({ data, height = 180 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet for this user.</div>;
  }
  const chartData = data.map((p) => ({
    day: new Date(p.dayStartMs).toISOString().slice(0, 10),
    netChange: p.netChange,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#ffe066',
          }}
        />
        <Area
          type="monotone"
          dataKey="netChange"
          stroke="#5b6ed1"
          fill="rgba(91,110,209,0.25)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/charts/UserActivityLine.tsx src/pages/admin/charts/UserActivityLine.test.tsx
git commit -m "feat(admin): UserActivityLine chart (per-user daily net-change area)"
```

## Task E.2: `AdjustCreditsModal`

**Files:**

- Create: `src/pages/admin/AdjustCreditsModal.tsx`
- Create: `src/pages/admin/AdjustCreditsModal.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdjustCreditsModal from './AdjustCreditsModal';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';

describe('AdjustCreditsModal', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('does not render when open is false', () => {
    render(<AdjustCreditsModal open={false} userId="u-1" username="x" onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows form fields when open', () => {
    render(<AdjustCreditsModal open={true} userId="u-1" username="alice" onClose={() => {}} />);
    expect(screen.getByText(/adjust credits/i)).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('applies a credit and closes the modal on success', async () => {
    const reg = await register({ username: 'eve', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="eve" onClose={onClose} />,
    );
    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.type(screen.getByLabelText(/reason/i), 'test grant');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    await new Promise((r) => setTimeout(r, 50));
    expect(onClose).toHaveBeenCalled();
    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS + 500);
  });

  it('shows an error when the adjustment would go negative', async () => {
    const reg = await register({ username: 'frank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="frank" onClose={() => {}} />,
    );
    await user.type(screen.getByLabelText(/amount/i), String(-(WALLET_CONFIG.STARTING_CHIPS + 1)));
    await user.type(screen.getByLabelText(/reason/i), 'over-debit test');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(await screen.findByText(/would go negative/i)).toBeInTheDocument();
  });

  it('shows an error for invalid reason (< 3 chars)', async () => {
    const reg = await register({ username: 'gail', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="gail" onClose={() => {}} />,
    );
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/reason/i), 'no');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(await screen.findByText(/reason must be at least 3/i)).toBeInTheDocument();
  });

  it('cancel button calls onClose without applying', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdjustCreditsModal open={true} userId="u-1" username="x" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/pages/admin/AdjustCreditsModal.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { adjustBalance, type AdjustBalanceError } from '@/systems/admin';

type Props = {
  open: boolean;
  userId: string;
  username: string;
  onClose: () => void;
};

const ERROR_COPY: Record<AdjustBalanceError, string> = {
  invalid_amount: 'Amount must be a non-zero integer.',
  invalid_reason: 'Reason must be at least 3 characters.',
  no_user: 'User no longer exists.',
  would_go_negative: 'That would make the balance go negative.',
  unknown: 'Something went wrong. Try again.',
};

export default function AdjustCreditsModal({
  open,
  userId,
  username,
  onClose,
}: Props): JSX.Element | null {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed === 0) {
      setError(ERROR_COPY.invalid_amount);
      setSubmitting(false);
      return;
    }
    const r = await adjustBalance({ userId, amount: parsed, reason });
    setSubmitting(false);
    if (!r.ok) {
      setError(ERROR_COPY[r.error]);
      return;
    }
    setAmount('');
    setReason('');
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-casino-gold-deep/60 bg-casino-felt-deeper p-6 shadow-gold-glow"
      >
        <h2 className="mb-1 font-display text-base tracking-wider text-casino-gold">
          ADJUST CREDITS
        </h2>
        <p className="mb-4 text-xs text-white/50">User: {username}</p>

        <label
          htmlFor="adj-amount"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Amount (positive = credit, negative = debit)
        </label>
        <input
          id="adj-amount"
          type="number"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
          className="mb-4 w-full rounded-sm border border-white/20 bg-casino-felt-deeper px-3 py-2 text-sm text-white focus:border-casino-gold focus:outline-none"
        />

        <label
          htmlFor="adj-reason"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Reason
        </label>
        <input
          id="adj-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={3}
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-casino-felt-deeper px-3 py-2 text-sm text-white focus:border-casino-gold focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-casino-red">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-casino-gold px-3 py-2 text-xs uppercase tracking-wider text-casino-felt-deeper hover:bg-casino-gold-bright disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdjustCreditsModal.tsx src/pages/admin/AdjustCreditsModal.test.tsx
git commit -m "feat(admin): AdjustCreditsModal (amount + reason + error states)"
```

## Task E.3: `AdminUserPage` (replace placeholder, full per-user dashboard)

**Files:**

- Modify: `src/pages/admin/AdminUserPage.tsx`
- Create: `src/pages/admin/AdminUserPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUserPage from './AdminUserPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';

function renderAt(userId: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUserPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders username + stats + ban + adjust buttons + chart for an existing user', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    });

    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText(/balance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ban/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust credits/i })).toBeInTheDocument();
  });

  it('Ban button flips isBanned to true and the button switches to Unban', async () => {
    const r = await register({ username: 'bob', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const user = userEvent.setup();
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^ban$/i }));
    await waitFor(async () => {
      const u = await db.users.get(r.user.id);
      expect(u?.isBanned).toBe(true);
    });
    expect(await screen.findByRole('button', { name: /unban/i })).toBeInTheDocument();
  });

  it('opens the Adjust Credits modal when clicking the button', async () => {
    const r = await register({ username: 'carol', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const user = userEvent.setup();
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('carol')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /adjust credits/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows "user not found" if the id does not exist', async () => {
    renderAt('ghost-id');
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });

  it('shows per-user adjustment history (if any)', async () => {
    const r = await register({ username: 'dave', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.adjustments.add({
      id: 'adj-1',
      userId: r.user.id,
      amount: 500,
      reason: 'test grant',
      adjustedAt: 1234,
    });
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText(/test grant/i)).toBeInTheDocument());
    expect(screen.getByText('+500')).toBeInTheDocument();
    if (WALLET_CONFIG) {
      // type assert reference (no-op)
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Replace `src/pages/admin/AdminUserPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { banUser, unbanUser } from '@/systems/admin';
import StatCard from './StatCard';
import UserActivityLine from './charts/UserActivityLine';
import GameDistributionDonut from './charts/GameDistributionDonut';
import AdjustCreditsModal from './AdjustCreditsModal';
import {
  getUserStatsRow,
  getUserGameDistribution,
  getUserGameTime,
  getUserNetFlowSeries,
  getUserSessionTime,
} from './queries';

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function AdminUserPage(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const stats = useLiveQuery(() => getUserStatsRow(id), [id], null);
  const series = useLiveQuery(() => getUserNetFlowSeries(id), [id], []);
  const dist = useLiveQuery(() => getUserGameDistribution(id), [id], []);
  const times = useLiveQuery(() => getUserGameTime(id), [id], []);
  const totalSessionMs = useLiveQuery(() => getUserSessionTime(id), [id], 0);
  const adjustments = useLiveQuery(
    () =>
      db.adjustments
        .where('[userId+adjustedAt]')
        .between([id, 0], [id, Infinity])
        .reverse()
        .toArray(),
    [id],
    [],
  );

  if (stats === null) {
    return <div className="text-sm text-white/60">User not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-base tracking-wider text-casino-gold">
          {stats.username}
          {stats.isBanned && (
            <span className="ml-3 rounded-sm bg-casino-red/20 px-2 py-0.5 text-xs uppercase tracking-wider text-casino-red">
              Banned
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (stats.isBanned ? unbanUser(stats.userId) : banUser(stats.userId))}
            className="rounded-sm border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-white/70 hover:bg-white/5"
          >
            {stats.isBanned ? 'Unban' : 'Ban'}
          </button>
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            className="rounded-sm bg-casino-gold px-3 py-2 text-xs uppercase tracking-wider text-casino-felt-deeper hover:bg-casino-gold-bright"
          >
            Adjust credits
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Balance" value={stats.currentBalance.toLocaleString()} />
        <StatCard
          label="Net change"
          value={(stats.totalNetChange > 0 ? '+' : '') + stats.totalNetChange.toLocaleString()}
          tone={
            stats.totalNetChange > 0
              ? 'positive'
              : stats.totalNetChange < 0
                ? 'negative'
                : 'neutral'
          }
          sub={`${stats.totalRounds} rounds`}
        />
        <StatCard label="Logins" value={stats.loginCount} />
        <StatCard label="Time on site" value={formatDuration(totalSessionMs)} />
      </div>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">ACTIVITY</h2>
        <UserActivityLine data={series} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">ROUNDS BY GAME</h2>
          <GameDistributionDonut data={dist} />
        </div>
        <div>
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">TIME BY GAME</h2>
          <ul className="text-sm text-white/80">
            {times.length === 0 && (
              <li className="text-xs text-white/40">No game visits recorded yet.</li>
            )}
            {times.map((t) => (
              <li key={t.game} className="flex justify-between border-b border-white/5 py-1">
                <span className="capitalize">{t.game}</span>
                <span>{formatDuration(t.durationMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          ADJUSTMENT HISTORY
        </h2>
        {adjustments.length === 0 ? (
          <p className="text-xs text-white/40">No admin adjustments yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-casino-gold-deep/30 text-xs uppercase tracking-wider text-white/50">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-white/60">
                    {new Date(a.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                  <td
                    className={`py-2 pr-3 ${a.amount > 0 ? 'text-casino-green-bright' : 'text-casino-red'}`}
                  >
                    {a.amount > 0 ? '+' : ''}
                    {a.amount}
                  </td>
                  <td className="py-2 pr-3">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AdjustCreditsModal
        open={adjustOpen}
        userId={stats.userId}
        username={stats.username}
        onClose={() => setAdjustOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdminUserPage.tsx src/pages/admin/AdminUserPage.test.tsx
git commit -m "feat(admin): AdminUserPage — per-user stats + ban/unban + adjust + audit"
```

## Task E.4: `AdminAuditPage` (replace placeholder, all adjustments site-wide)

**Files:**

- Modify: `src/pages/admin/AdminAuditPage.tsx`
- Create: `src/pages/admin/AdminAuditPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAuditPage from './AdminAuditPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('AdminAuditPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders empty-state when no adjustments exist', async () => {
    render(
      <MemoryRouter>
        <AdminAuditPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/no adjustments/i)).toBeInTheDocument());
  });

  it('lists adjustments newest-first with username + amount + reason', async () => {
    const a = await register({ username: 'alice', password: 'password123' });
    const b = await register({ username: 'bob', password: 'password123' });
    if (!a.ok || !b.ok) throw new Error('register failed');
    await db.adjustments.bulkAdd([
      { id: 'adj-1', userId: a.user.id, amount: 500, reason: 'grant', adjustedAt: 1000 },
      { id: 'adj-2', userId: b.user.id, amount: -200, reason: 'rollback', adjustedAt: 2000 },
    ]);
    render(
      <MemoryRouter>
        <AdminAuditPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/rollback/i)).toBeInTheDocument());
    const rows = screen.getAllByRole('row');
    // Header + 2 data rows
    expect(rows.length).toBeGreaterThanOrEqual(3);
    // Bob (newer) should come before Alice
    const bobIdx = rows.findIndex((r) => r.textContent?.includes('bob'));
    const aliceIdx = rows.findIndex((r) => r.textContent?.includes('alice'));
    expect(bobIdx).toBeLessThan(aliceIdx);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Replace `src/pages/admin/AdminAuditPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db';

export default function AdminAuditPage(): JSX.Element {
  const rows = useLiveQuery(
    async () => {
      const adjustments = await db.adjustments.orderBy('adjustedAt').reverse().toArray();
      const userIds = [...new Set(adjustments.map((a) => a.userId))];
      const users = await db.users.bulkGet(userIds);
      const usernameById = new Map<string, string>();
      users.forEach((u, i) => {
        if (u) usernameById.set(userIds[i]!, u.username);
      });
      return adjustments.map((a) => ({
        ...a,
        username: usernameById.get(a.userId) ?? '<deleted>',
      }));
    },
    [],
    [],
  );

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">
        ADJUSTMENTS · {rows.length}
      </h1>
      {rows.length === 0 ? (
        <p className="text-xs text-white/40">No adjustments recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-casino-gold-deep/30 text-xs uppercase tracking-wider text-white/50">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 pr-3 text-white/60">
                  {new Date(r.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td className="py-2 pr-3">
                  <Link
                    to={`/admin/users/${r.userId}`}
                    className="text-casino-gold-bright hover:underline"
                  >
                    {r.username}
                  </Link>
                </td>
                <td
                  className={`py-2 pr-3 ${r.amount > 0 ? 'text-casino-green-bright' : 'text-casino-red'}`}
                >
                  {r.amount > 0 ? '+' : ''}
                  {r.amount}
                </td>
                <td className="py-2 pr-3">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdminAuditPage.tsx src/pages/admin/AdminAuditPage.test.tsx
git commit -m "feat(admin): AdminAuditPage — site-wide adjustments table newest-first"
```

## Task E.5: `AdminSessionsPage` (replace placeholder)

**Files:**

- Modify: `src/pages/admin/AdminSessionsPage.tsx`
- Create: `src/pages/admin/AdminSessionsPage.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSessionsPage from './AdminSessionsPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('AdminSessionsPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders empty-state when no sessions exist', async () => {
    render(
      <MemoryRouter>
        <AdminSessionsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/no sessions/i)).toBeInTheDocument());
  });

  it('lists sessions newest-first with username + duration + status', async () => {
    const a = await register({ username: 'alice', password: 'password123' });
    if (!a.ok) throw new Error('register failed');
    await db.sessions.bulkAdd([
      { id: 's-1', userId: a.user.id, loginAt: 1000, logoutAt: 5000, durationMs: 4000 },
      { id: 's-2', userId: a.user.id, loginAt: 10_000, logoutAt: null, durationMs: null },
    ]);
    render(
      <MemoryRouter>
        <AdminSessionsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText('alice').length).toBeGreaterThan(0));
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText('4s')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Replace `src/pages/admin/AdminSessionsPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db';

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function AdminSessionsPage(): JSX.Element {
  const rows = useLiveQuery(
    async () => {
      const sessions = await db.sessions.orderBy('loginAt').reverse().toArray();
      const userIds = [...new Set(sessions.map((s) => s.userId))];
      const users = await db.users.bulkGet(userIds);
      const usernameById = new Map<string, string>();
      users.forEach((u, i) => {
        if (u) usernameById.set(userIds[i]!, u.username);
      });
      return sessions.map((s) => ({
        ...s,
        username: usernameById.get(s.userId) ?? '<deleted>',
      }));
    },
    [],
    [],
  );

  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-casino-gold">
        SESSIONS · {rows.length}
      </h1>
      {rows.length === 0 ? (
        <p className="text-xs text-white/40">No sessions recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-casino-gold-deep/30 text-xs uppercase tracking-wider text-white/50">
              <th className="py-2 pr-3">Login</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 pr-3 text-white/60">
                  {new Date(r.loginAt).toISOString().slice(0, 19).replace('T', ' ')}
                </td>
                <td className="py-2 pr-3">
                  <Link
                    to={`/admin/users/${r.userId}`}
                    className="text-casino-gold-bright hover:underline"
                  >
                    {r.username}
                  </Link>
                </td>
                <td className="py-2 pr-3">
                  {r.durationMs !== null ? formatDuration(r.durationMs) : '—'}
                </td>
                <td className="py-2 pr-3">
                  {r.logoutAt === null ? (
                    <span className="rounded-sm bg-casino-green-bright/20 px-2 py-0.5 text-xs uppercase tracking-wider text-casino-green-bright">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-white/40">closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS. Commit.**

```bash
git add src/pages/admin/AdminSessionsPage.tsx src/pages/admin/AdminSessionsPage.test.tsx
git commit -m "feat(admin): AdminSessionsPage — site-wide sessions table newest-first"
```

## Task E.6: Phase-9 E2E manual smoke

**Files:** none modified (manual verification only).

- [ ] **Step 1: Start dev server, exercise every Phase-9 path**

```bash
pnpm dev
```

Run through the entire Phase 9 DoD checklist (from the plan header):

1. Register a regular user `alice` with password `password123`.
2. Play ≥ 10 rounds across at least 3 games (blackjack, roulette, slots).
3. Log out.
4. Visit `/admin/login` directly (note: no link from the user UI — type the URL).
5. Submit `admin` / `wrong` → expect "Invalid credentials." error.
6. Submit `admin` / `admin12345` → expect redirect to `/admin`.
7. **Overview page:** confirm Users = 1, totals are non-zero, NetFlowLine renders, WinnersLosersBar shows alice, GameDistributionDonut shows ≥ 3 slices.
8. **Users page:** confirm alice row present, balance + net + rounds + logins all non-zero.
9. Click alice → drill into per-user page.
10. **Per-user page:** balance, net change, logins, time on site all present. UserActivityLine renders. Time-by-game shows ≥ 3 games with seconds-level durations.
11. Click "Adjust credits" → modal opens. Enter amount `500`, reason `test grant`. Apply.
12. Modal closes. Alice's balance increased by 500. Audit history row appears.
13. Click "Adjust credits" again. Enter amount `-9999999`, reason `over-debit`. Apply → expect "would go negative" error. Cancel.
14. Click "Ban" → button switches to "Unban", banned badge appears in header.
15. Log out admin → open a fresh incognito window or clear `localGamble.session.userId` → log in as alice → expect "Account suspended" (or whatever wording the login form shows for `error: 'banned'`).
16. Log back in as admin → drill into alice → click "Unban" → log out admin → alice can log in again.
17. **Adjustments page:** the `+500` for alice (and any from step 13 — there shouldn't be one since it failed) appears newest-first.
18. **Sessions page:** at least 2 sessions for alice (initial register-login, post-unban login) — durations non-null for closed ones, possibly "Active" for current.
19. Reload `/admin` directly in the address bar — admin session persists (no need to re-login).
20. Click "Log out" in the admin sidebar → redirect to `/admin/login` → reload → still redirected (admin session cleared).

If any step fails, stop and fix before proceeding to Task E.7.

- [ ] **Step 2: Verify reduced-motion compatibility**

In OS accessibility settings (macOS: System Settings → Accessibility → Display → Reduce motion), enable reduced motion. Reload `/admin` → confirm pages still render correctly. Recharts respects this implicitly (no entry animations by default) but verify no surprises.

- [ ] **Step 3: Bundle-size check**

```bash
pnpm build
```

Confirm in the Vite output:

- Main bundle ≤ 800 kB.
- A separate admin chunk exists (probably `admin-*.js`) containing Recharts (~95 kB chunk overhead expected).

If main bundle has grown unexpectedly (e.g., > 50 kB delta vs pre-Phase-9 baseline), investigate before proceeding — likely an unintentional admin import from a non-admin file.

## Task E.7: PR E — verify, push, open, merge

- [ ] **Step 1: Run the full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~700 tests passing.

- [ ] **Step 2: Push branch**

```bash
git push -u origin phase-9-admin-pr-e-per-user
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-9(admin): per-user page + adjust credits + audit + sessions log" --body "$(cat <<'EOF'
## Summary

PR E of Phase 9 (final feature PR — F is release only).

- \`UserActivityLine\` chart (per-user area)
- \`AdjustCreditsModal\` — amount + reason + full error state mapping
- \`AdminUserPage\` (replaces placeholder) — stats + ban/unban + adjust + activity chart + game distribution + game-time list + adjustment history
- \`AdminAuditPage\` (replaces placeholder) — all site-wide adjustments newest-first
- \`AdminSessionsPage\` (replaces placeholder) — all sessions newest-first with active/closed status
- Phase 9 E2E smoke walkthrough confirmed against the DoD checklist

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] E2E smoke: register, play, log in as admin, drill in, ban, adjust, verify audit, log out
- [x] Bundle: main ≤ 800kB, admin chunk holds recharts
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for CI, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged (PR E). Phase 9 feature work is now complete.

---

# PR F — Release v0.9-admin-dashboard

**Branch:** `chore/release-v0.9-admin-dashboard` (off freshly-merged `main`)
**Goal of this PR:** Document Phase 9 in BUILD_GUIDE.md, bump the version in package.json, tag the release, publish a GitHub Release. No code changes in this PR.
**Risk:** Low. Pure docs + release plumbing.
**Estimated tasks:** 3.

## Task F.1: BUILD_GUIDE Phase 9 documentation

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.9-admin-dashboard
```

- [ ] **Step 2: Update BUILD_GUIDE Phase 9 section**

Find the existing Phase 9 stub (or the "future phases" section if Phase 9 doesn't yet have its own block) and replace/append with:

```markdown
### Phase 9 — Admin Dashboard ✅

Shipped: 2026-05-XX (replace with the release date).

**What shipped:**

- Hidden admin login at `/admin/login` (credentials `admin` / `admin12345`,
  hardcoded in source — see ADR-0034).
- Cross-cutting tracking instrumentation:
  - `sessions` table (one row per login; closed by logout / beforeunload / orphan cleanup).
  - `gameVisits` table (one row per game-page mount; closed on unmount).
  - `loginCount` + `lastLoginAt` columns on `users`.
- Soft ban (`isBanned` column on `users`) — banned users fail `auth.login`
  with `error: 'banned'`.
- Audit-trailed credit adjustments (`adjustments` table, transactional with
  the `balances` update).
- Admin dashboard pages: Overview (4 stat cards + 3 charts), Users list,
  Per-user drill-in (stats + ban + adjust + activity chart + game-time
  list + per-user audit), Adjustments log, Sessions log.
- Recharts (~95 kB) lazy-loaded with the admin chunk — does not ship to
  regular users.

**What is explicitly NOT in scope:** real multi-admin support (hardcoded
credentials only), JWT/server-side auth (purely local UI gate), historical
backfill of session/game-time data (only data collected from this release
forward is visible).

**ADRs:** 0034 (admin auth model), 0035 (tracking schema).

**Tests:** ~140 new across schema, admin, admin-auth, sessionStore,
useGameVisit, AppBootstrap, RequireAdmin, AdminLoginPage, AdminLayout,
queries, charts, AdminOverviewPage, AdminUsersListPage, AdminUserPage,
AdjustCreditsModal, AdminAuditPage, AdminSessionsPage.
```

- [ ] **Step 3: Run markdownlint**

```bash
npx markdownlint-cli2 BUILD_GUIDE.md
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add BUILD_GUIDE.md
git commit -m "docs(build-guide): mark Phase 9 (admin dashboard) shipped"
```

## Task F.2: Version bump

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Bump version to 0.9.0**

Edit `package.json`:

```json
"version": "0.9.0",
```

(Replace the previous `"version": "0.6.x"` line — whatever it currently is.)

- [ ] **Step 2: Verify build still works (no test or code changes, but sanity check)**

```bash
pnpm install && pnpm build
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(release): bump to 0.9.0"
```

## Task F.3: Open PR, merge, tag, GitHub Release

- [ ] **Step 1: Push branch + open PR**

```bash
git push -u origin chore/release-v0.9-admin-dashboard
gh pr create --title "chore(release): v0.9-admin-dashboard — Phase 9 docs + version bump" --body "$(cat <<'EOF'
## Summary

PR F of Phase 9 — release plumbing only, no code changes.

- BUILD_GUIDE marks Phase 9 shipped with summary, scope-not, ADR refs, test count
- package.json version bumped to 0.9.0

## Test plan

- [x] markdownlint clean
- [x] \`pnpm build\` green
- [ ] CI green (4 jobs)
- [ ] After merge: tag v0.9-admin-dashboard, publish GitHub Release

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for CI, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 3: Tag the release locally + push tag**

```bash
git tag -a v0.9-admin-dashboard -m "v0.9 — Admin Dashboard"
git push origin v0.9-admin-dashboard
```

- [ ] **Step 4: Publish GitHub Release**

```bash
gh release create v0.9-admin-dashboard --title "v0.9 — Admin Dashboard" --notes "$(cat <<'EOF'
## What's new

Phase 9 ships a hidden admin dashboard at \`/admin/*\` plus the cross-cutting
tracking instrumentation that powers it.

**Highlights**

- Hardcoded admin login (\`admin\` / \`admin12345\`) at \`/admin/login\`
- Site-wide overview: 4 stat cards (Users, Wagered, Paid out, Net house) + 3 charts (NetFlowLine, WinnersLosersBar, GameDistributionDonut)
- Users list with click-through drill-in, banned badge
- Per-user dashboard with activity chart, time-by-game breakdown, ban/adjust controls, full adjustment history
- Adjustments audit log (site-wide)
- Sessions log (site-wide, active vs closed)
- Soft-ban: banned users fail login with a distinct error
- Audit-trailed transactional credit adjustments

**Architecture**

- Dexie v2 (additive): \`sessions\`, \`gameVisits\`, \`adjustments\` tables; \`isBanned\`, \`loginCount\`, \`lastLoginAt\` columns on \`users\`
- Recharts (~95kB) lazy-loaded in the admin chunk only — main bundle unchanged
- 140 new tests across schema, systems, store, hooks, components, pages

**ADRs**

- 0034 — Admin auth model
- 0035 — Phase 9 tracking schema

EOF
)"
```

Expected: a public release page on GitHub at `https://github.com/A1PC/localGamble/releases/tag/v0.9-admin-dashboard`.

- [ ] **Step 5: Update [[project_localgamble_status]] memory**

Open `/Users/adam/.claude/projects/-Users-adam/memory/project_localgamble_status.md` and update the body:

```markdown
Phases 0-5 + 9 complete as of 2026-05-XX. (Phase 9 shipped early to enable
admin/QA workflows before the usual Phase 6-8 sequence.) Phase 6 (Baccarat)
not started; user signals when to begin.
```

Update the description on the index entry too if the wording diverges.

---

# Self-Review Checklist

After finishing PR F (Task F.3 step 5), run through this checklist before declaring Phase 9 done:

- [ ] **Spec coverage:** every spec section §3.1–§13.3 maps to at least one task.
- [ ] **DoD:** every PR (A–E) ran `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` clean before merge.
- [ ] **Test count:** ~140 new tests added (rough; verify via `git diff main~7 --stat`).
- [ ] **Bundle:** main bundle ≤ 800 kB; admin chunk holds Recharts and admin pages; no leaked admin imports in non-admin files.
- [ ] **No `Math.random` introduced** — `grep -r "Math.random" src/` returns only the existing whitelist.
- [ ] **No floats in money** — all chip math goes through integer operations.
- [ ] **No game imports `src/db/**`or`src/store/**`** — ESLint catches but verify with `grep -rE "from '@/db|from '@/store'" src/games/` (admin pages and `*Page.tsx` files exempt).
- [ ] **Reserved-username works** — quick check: try registering `admin` in the running app, expect rejection.
- [ ] **Reduced motion** — admin pages still render with `prefers-reduced-motion: reduce`.
- [ ] **GitHub Release published** — link visible on the repo's Releases tab.
- [ ] **Memory updated** — `project_localgamble_status.md` reflects v0.9 shipped.

If anything fails, hot-fix it on `main` with a `fix/admin-*` branch; don't roll the release back unless something is genuinely broken.

---
