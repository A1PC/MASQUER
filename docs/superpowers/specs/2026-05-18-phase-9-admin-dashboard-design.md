# Phase 9 — Admin Dashboard: design spec

**Date:** 2026-05-18
**Author:** Claude (collaborative session with Developer)
**Status:** Approved by user 2026-05-18 → implementation
**Tagged release this builds on:** `v0.6-slots` (Phase 5) plus subsequent
non-phase tweaks (PRs #102 / #103 / #104)
**Target release tag:** `v0.9-admin-dashboard`

> **Why "Phase 9"?** This is a final-stage platform feature that touches every
> game and the auth layer. It skips numbering 6-8 (Baccarat, Stats, Polish)
> from the original BUILD_GUIDE because the user wants admin tooling shipped
> before those — the dashboard's own per-user stats subsume much of Phase 7's
> StatsPage scope. The skipped phases remain on the roadmap and will renumber
> later if needed.

---

## 1. Goal

Ship a hidden admin dashboard at `/admin/*` that lets the operator:

- See every registered user, drill into any one, and view full stats
- Adjust any user's chip balance (with audit trail) and ban / unban them
- See site-wide totals: chips wagered, won, lost; total rounds; total
  sessions; biggest winners / losers; per-game distribution
- See charts for credit flow over time and game-share breakdown

Plus the cross-cutting instrumentation needed for the above: session
start/end tracking, per-game time-on-page tracking, login counts, ban-aware
auth.

## 2. In scope / out of scope

**In scope**

- Hidden `/admin/login` route with hardcoded credential check (`admin` /
  `admin12345`). Admin session is synthetic — no row in `users` table.
- Route guard `RequireAdmin` protecting all `/admin/*` routes except the
  login page.
- Dexie v1 → v2 schema migration: 3 new tables (`sessions`, `gameVisits`,
  `adjustments`) + 3 new columns on `users` (`isBanned`, `loginCount`,
  `lastLoginAt`).
- Tracking instrumentation: `sessionStore.login` / `logout` hook the
  sessions table; `beforeunload` listener closes the active session
  best-effort; `useGameVisit` hook in `GameShell` records game-page
  enter/exit.
- Ban-aware login: `auth.login` rejects banned users with
  `error: 'banned'`.
- `src/systems/admin.ts` module: `banUser`, `unbanUser`, `adjustBalance`.
- Five dashboard pages: Overview, Users list, Per-user, Adjustments
  audit log, Sessions log.
- Recharts integration (lazy-loaded with the admin route).
- 2 new ADRs (0034 admin auth model, 0035 tracking schema).

**Out of scope (deferred)**

- Multi-admin support / admin user management (only one hardcoded admin).
- Adjustment reversals / audit log editing.
- Real-time push between browsers (multi-browser admin views — Dexie's
  `useLiveQuery` covers same-browser reactivity).
- Per-session geolocation, IP, user-agent (no value in local-only app).
- Charts beyond line / bar / donut (e.g. heatmaps, sankey).
- Hash chain / tamper detection for the audit log.
- Export CSV / JSON of any data.
- Admin password change flow (the password is hardcoded by design).
- Backfill of historical sessions/game-visits for Phases 0-5. Only data
  from Phase 9 onwards has session and game-visit rows.

## 3. Auth model

### 3.1 Admin credentials

```ts
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin12345';
```

These live in `src/systems/admin-auth.ts`. The password is in source code
by design — this is a local play-money app with no server, and the admin
view is purely a UI gate over the local IndexedDB. Anyone with access to
DevTools can already see all the data; the admin login is a convenience,
not a security boundary.

### 3.2 Admin session

- Login: `POST` to admin-auth's `loginAdmin({ username, password })`.
  Pure synchronous check of the two strings (no PBKDF2 since the password
  is already public). On match: write `localStorage` key
  `masquer.session.admin = '1'`. On mismatch: return
  `{ ok: false, error: 'invalid_credentials' }`.
- Restore: `restoreAdminSession()` reads the localStorage key and returns
  `{ isAdmin: boolean }`.
- Logout: `logoutAdmin()` clears the localStorage key.

The admin session and user session keys are **independent**:

- `masquer.session.userId` — regular user session (existing)
- `masquer.session.admin` — admin session (new)

A browser tab can have one or the other or neither, but not both
simultaneously (the route guard for `/admin/*` requires admin; the
`RequireAuth` guard for `/lobby` etc. requires a user). Visiting `/login`
while admin clears the admin session; visiting `/admin/login` while a
user is logged in logs out the user first (or warns — we'll warn and
require explicit user logout first).

### 3.3 Session store extension

`sessionStore` gains:

```ts
interface SessionState {
  // existing
  currentUser: User | null;
  bootstrapping: boolean;
  // new
  isAdmin: boolean;
  /** UUID of the active sessions row for the logged-in user. Null when no
   *  user is logged in. Used by logout + beforeunload to close the row. */
  currentSessionId: string | null;

  loginAdmin: (input: { username: string; password: string }) => Promise<...>;
  logoutAdmin: () => Promise<void>;
}
```

`bootstrap()` restores both: if `localStorage` has the admin key, set
`isAdmin: true`; if it has the user key, restore the `currentUser` as
before.

### 3.4 Reserved username

`auth.register` and `auth.login` both reject username `admin`
(case-insensitive, after trim) with a new error case
`error: 'reserved_username'` (register) / `'invalid_credentials'`
(login — treated like a normal failure to avoid leaking the reserved
name). Documented in ADR-0034.

### 3.5 Route guard

New `RequireAdmin` component, parallel to existing `RequireAuth`:

```tsx
function RequireAdmin({ children }) {
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

## 4. Schema migration (Dexie v1 → v2)

### 4.1 New columns on `users`

```ts
export interface User {
  // existing
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  pbkdf2Iterations: number;
  avatarColor: string;
  createdAt: number;
  // new in v2
  isBanned?: boolean; // optional for backward-compat; treated as false if undefined
  loginCount?: number; // optional; treated as 0 if undefined
  lastLoginAt?: number; // optional
}
```

All three new fields are optional so existing v1 records remain valid.
The Dexie upgrade function doesn't need to backfill — readers treat
`undefined` as the appropriate default.

### 4.2 New table — `sessions`

```ts
export interface Session {
  id: string; // crypto.randomUUID()
  userId: string; // FK → users.id (indexed)
  loginAt: number; // ms epoch
  logoutAt: number | null;
  durationMs: number | null; // computed on close (logoutAt - loginAt)
}
```

Indexes: `id` (primary), `userId`, `loginAt`, `[userId+loginAt]`.

Rows are created on login. They're closed when:

1. `sessionStore.logout()` is called (explicit logout).
2. The browser `beforeunload` event fires (best-effort).
3. The same user logs in again with a prior session still open (orphan
   cleanup — close it with `logoutAt = newLoginAt`).

### 4.3 New table — `gameVisits`

```ts
export interface GameVisit {
  id: string;
  userId: string;
  sessionId: string; // FK → sessions.id
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip';
  enteredAt: number;
  exitedAt: number | null;
  durationMs: number | null;
}
```

Indexes: `id`, `userId`, `game`, `sessionId`, `[userId+game]`,
`[userId+enteredAt]`.

Created when `<GameShell>` mounts; closed on unmount (router navigation
or session-end cascade).

### 4.4 New table — `adjustments`

```ts
export interface Adjustment {
  id: string;
  userId: string; // who got the credit/debit
  amount: number; // signed integer (positive = credit, negative = debit)
  reason: string; // free text, min 3 chars
  adjustedAt: number;
}
```

Indexes: `id`, `userId`, `adjustedAt`, `[userId+adjustedAt]`.

No `adminUserId` field — there's only one admin and it has no DB row.
If we ever support multiple admins, we'll add `adminLabel: string` then.

### 4.5 Dexie versioning

```ts
this.version(1).stores({
  users: 'id, &usernameLower, createdAt',
  balances: 'userId',
  rounds: 'id, userId, game, playedAt, [userId+playedAt]',
});

this.version(2).stores({
  users: 'id, &usernameLower, createdAt, isBanned', // index isBanned for fast banned-user filters
  balances: 'userId',
  rounds: 'id, userId, game, playedAt, [userId+playedAt]',
  sessions: 'id, userId, loginAt, [userId+loginAt]',
  gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
  adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
});
```

No `.upgrade()` callback is needed — Dexie handles adding new tables and
new optional fields automatically. Existing v1 users keep their data.

## 5. Tracking instrumentation

### 5.1 Session tracking

`sessionStore.login(input)` is wrapped:

```ts
login: async (input) => {
  const result = await auth.login(input);
  if (!result.ok) return result;
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  // 1. Close any orphan session for this user (defensive).
  const orphan = await db.sessions
    .where('[userId+loginAt]')
    .between([result.user.id, 0], [result.user.id, Infinity])
    .filter((s) => s.logoutAt === null)
    .first();
  if (orphan) {
    await db.sessions.update(orphan.id, {
      logoutAt: now,
      durationMs: now - orphan.loginAt,
    });
  }
  // 2. Write the new session.
  await db.sessions.add({
    id: sessionId,
    userId: result.user.id,
    loginAt: now,
    logoutAt: null,
    durationMs: null,
  });
  // 3. Bump login count + lastLoginAt.
  await db.users.update(result.user.id, {
    loginCount: (result.user.loginCount ?? 0) + 1,
    lastLoginAt: now,
  });
  // 4. Track the session id in store for later close.
  set({ currentUser: result.user, currentSessionId: sessionId });
  return result;
},
```

`sessionStore.logout()` closes the active session:

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

### 5.2 `beforeunload` listener

`AppBootstrap` registers a `beforeunload` listener:

```ts
useEffect(() => {
  const handler = () => {
    const { currentSessionId } = useSessionStore.getState();
    if (!currentSessionId) return;
    // Best-effort synchronous-ish close.
    // We can't await in beforeunload — fire and forget.
    const now = Date.now();
    // db.sessions.update returns a promise; we don't await it.
    // Browsers MAY abort the IndexedDB transaction. Orphan cleanup at next
    // login is the safety net.
    void db.sessions.get(currentSessionId).then((session) => {
      if (session && session.logoutAt === null) {
        return db.sessions.update(currentSessionId, {
          logoutAt: now,
          durationMs: now - session.loginAt,
        });
      }
    });
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);
```

The orphan-cleanup path in `sessionStore.login` (above) is the safety
net: if `beforeunload` failed to close the session, the next login will.

### 5.3 Game visit tracking

A new hook `useGameVisit(game)` registered inside `GameShell`:

```ts
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

`GameShell` is updated to accept a `game: Game` prop and call this hook:

```tsx
function GameShell({ title, meta, recentItems, bettingPanel, children, game }) {
  useGameVisit(game);
  return ( ... existing JSX ... );
}
```

All 4 game pages (Coin Flip, Blackjack, Roulette, Slots) pass their game
key to `<GameShell game="...">`.

### 5.4 Ban-aware login

`auth.login` gains a banned-user check after credential validation:

```ts
if (user.isBanned === true) {
  return { ok: false, error: 'banned' };
}
```

The `LoginPage` surfaces the `'banned'` error as "This account has been
suspended. Contact the operator." (No DM channel for that — it's just
the messaging.)

### 5.5 `src/systems/admin.ts`

```ts
export async function banUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: true });
}

export async function unbanUser(userId: string): Promise<void> {
  await db.users.update(userId, { isBanned: false });
}

export async function adjustBalance(input: {
  userId: string;
  amount: number; // signed integer
  reason: string; // min 3 chars
}): Promise<
  | { ok: true; newBalance: number }
  | {
      ok: false;
      error: 'invalid_amount' | 'invalid_reason' | 'no_user' | 'would_go_negative' | 'unknown';
    }
> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    return { ok: false, error: 'invalid_amount' };
  }
  if (input.reason.trim().length < 3) {
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
        reason: input.reason.trim(),
        adjustedAt: Date.now(),
      });
      return { ok: true as const, newBalance: newChips };
    });
  } catch {
    return { ok: false, error: 'unknown' };
  }
}
```

Tests cover: amount validation, reason validation, no-user, would-go-negative,
success path writes both balance and adjustment row atomically.

## 6. Routes and layout

```
/login                       → LoginPage             (existing)
/register                    → RegisterPage          (existing)
/lobby                       → LobbyPage             (existing; user routes unchanged)
/play/*                      → game pages            (existing; unchanged)
/admin/login                 → AdminLoginPage        (new; no shell)
/admin                       → AdminOverviewPage     ┐
/admin/users                 → AdminUsersListPage    │
/admin/users/:userId         → AdminUserPage         │  all wrapped in
/admin/adjustments           → AdminAuditPage        │  <RequireAdmin><AdminLayout/>
/admin/sessions              → AdminSessionsPage     ┘
```

### 6.1 `AdminLayout`

Fixed left sidebar (160px) + content area. Sidebar:

```
🎰 MASQUER · ADMIN
─────────────────────
📊 Overview              ← active highlight
👥 Users
💰 Adjustments
📈 Sessions
─────────────────────
🚪 Log out
```

The sidebar header shows the project name + "ADMIN" badge so it's
visually distinct from the player-facing GameShell.

`Log out` calls `sessionStore.logoutAdmin()` and navigates to
`/admin/login`.

### 6.2 `AdminLoginPage`

Stripped-down login form: username + password + submit. No
register link. No DevWipeButton. On success: navigate to `/admin`.
On failure: show "Invalid admin credentials" (no enumeration —
same message whether username or password was wrong).

## 7. Dashboard content

### 7.1 Overview (`/admin`)

**Stats cards row** (6 cards in a horizontal grid; wraps on narrow):

- Total chips wagered (sum of `rounds.betAmount`)
- Total chips paid out (sum of `rounds.payout`)
- Total net (paid out − wagered)
- Total games played (count of `rounds`)
- Registered users (count of `users`)
- Active sessions (count of `sessions` where `logoutAt === null`)

**Charts**:

- **Line chart** — Daily credit flow (sum of `rounds.netChange` per day)
  for last 30 days. X axis = date; Y axis = chip flow. Two lines: wagered
  (red) and won (green).
- **Bar chart** — Top 5 winners (by all-time net) and top 5 losers
  (negative net). Single chart with diverging bars from a centre axis.
- **Donut** — Game distribution (by rounds played). 4-5 slices.

**Recent activity**: bottom table — 20 most recent rounds across all users
with columns: time / username / game / bet / outcome / net.

### 7.2 Users list (`/admin/users`)

Table with columns: username / balance / total rounds / total net / last
login / status (active / banned). Click a row → drill into
`/admin/users/:userId`.

- Search box at top (filters by username substring, case-insensitive)
- Click column header to sort ascending/descending
- Banned users get a small red badge

Implementation: `useLiveQuery` over `db.users.toArray()` + on-the-fly
aggregation of rounds/balance per user. Acceptable performance for the
local-only context (a few hundred users at most).

### 7.3 Per-user (`/admin/users/:userId`)

**Header row**:

- Avatar (colored circle with first letter of username)
- Username + member-since date
- Current balance (gold-bright text)
- "Ban / Unban" toggle button (state-aware)
- "Adjust credits" button → opens modal

**Stats cards row**:

- Rounds played
- Total wagered
- Total won (positive netChange sum)
- Total lost (absolute of negative netChange sum)
- Net (won − lost)
- Login count
- Total time on site (sum of `sessions.durationMs`; format as "Xh Ym")
- Average session length (totalTimeOnSite / sessions count)

**Per-game breakdown table**:

| Game      | Rounds | Wagered |  Won | Lost |  Net | Time on game |
| --------- | -----: | ------: | ---: | ---: | ---: | -----------: |
| Blackjack |    150 |    3450 | 4100 |  500 |  650 |       1h 23m |
| Roulette  |     80 |    1800 | 1200 |  450 | -150 |          47m |
| Slots     |    220 |    1100 |  890 |  210 | -210 |       2h 14m |

**Activity line chart** — net change per day over the last 30 days.

**Adjustment history table** — adjustments for this user, newest first.

**Recent rounds table** — last 20 rounds with game / bet / outcome / net.

### 7.4 Adjustments audit log (`/admin/adjustments`)

Single table, newest first, columns:

| Time | Username | Amount | Reason            |
| ---- | -------- | ------ | ----------------- |
| now  | alice    | +500   | first-month bonus |
| 1h   | bob      | −100   | typo correction   |
| ...  | ...      | ...    | ...               |

Username links to `/admin/users/:userId`. Pagination at 50 per page.

### 7.5 Sessions log (`/admin/sessions`)

Single table, newest first, columns:

| Login  | Username | Duration | Game visits | Status |
| ------ | -------- | -------- | ----------- | ------ |
| 1m ago | alice    | active   | 2 (active)  | 🟢     |
| 1h ago | bob      | 23m      | 4           | closed |

Status icon: 🟢 active (logoutAt null), ⚪ closed.

Game-visits cell is the count of gameVisits rows linked to this session.

## 8. Charts — Recharts integration

Recharts is loaded only when the admin bundle loads. `AdminLayout` is
imported via `React.lazy`:

```ts
// router.tsx
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
```

The admin pages are statically imported INSIDE `AdminLayout`, so the
whole admin tree (including Recharts) is one chunk.

Wrapper components in `src/pages/admin/charts/` give us a consistent
styling surface and test seams:

```tsx
// src/pages/admin/charts/NetFlowLine.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Point { date: string; wagered: number; won: number; }

export default function NetFlowLine({ data }: { data: Point[] }) {
  return (
    <div data-chart="net-flow-line" style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={...}>
          <XAxis dataKey="date" stroke="#d4af37" />
          <YAxis stroke="#d4af37" />
          <Tooltip ... />
          <Line dataKey="wagered" stroke="#a3122a" />
          <Line dataKey="won" stroke="#3dd17a" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Wrappers added: `NetFlowLine`, `WinnersLosersBar`, `GameDistributionDonut`,
`UserActivityLine`. Tests check the wrapper renders with the right
`data-chart` attribute and forwards the correct data series; they do NOT
test Recharts internals.

## 9. Tests

### 9.1 Pure logic

- **Schema migration** — open DB with v1 data, close, reopen at v2,
  verify existing user rows are intact and new tables exist.
- **`admin-auth`** — `loginAdmin` with correct creds → ok; with wrong
  username → error; with wrong password → error; reserved-username check
  in `auth.register` and `auth.login`.
- **`admin.banUser` / `unbanUser`** — flips the field.
- **`admin.adjustBalance`** — happy path (balance updated + adjustment
  row written atomically); validation errors (invalid amount, short
  reason, missing user, would-go-negative).
- **`auth.login` ban check** — banned user gets `error: 'banned'`.

### 9.2 Tracking

- **Session lifecycle** — login writes a sessions row; logout closes it
  with the right durationMs; second login while orphan present cleans
  the orphan.
- **`useGameVisit` hook** — mounting writes a row; unmounting closes
  it; userId/sessionId absence is a no-op.
- **`loginCount` increment** — verified after multiple logins.

### 9.3 Components

- **`RequireAdmin`** — without admin session → redirects to /admin/login;
  with admin session → renders children.
- **`AdminLoginPage`** — happy path navigates to /admin; wrong creds
  shows error.
- **`AdminLayout`** — renders sidebar; "Log out" calls logoutAdmin and
  navigates to /admin/login.
- **`AdminOverviewPage`** — with seeded users/rounds/sessions, renders
  the 6 stats cards with correct values and the 3 charts (presence test
  via `data-chart` attrs).
- **`AdminUsersListPage`** — renders one row per user; click navigates.
- **`AdminUserPage`** — renders per-user stats; Ban button toggles; Adjust
  Credits modal submits and updates balance.
- **`AdminAuditPage`** — renders adjustments newest-first.

### 9.4 Coverage targets

- ≥ 90% on `src/systems/admin.ts`, `src/systems/admin-auth.ts`, the
  session-tracking additions to `sessionStore.ts`, `useGameVisit`.
- Component tests for all admin pages (RTL).
- Integration: register user → log in → enter Blackjack → spin some
  rounds → log out → log in as admin → see the user appear in the list
  with correct stats.

## 10. ADRs

### ADR-0034 — Admin auth model

- **Decision:** hidden `/admin/login` route with hardcoded credential
  check. Admin session synthetic (no users-table row). Independent
  localStorage key. Username `admin` is reserved in user
  registration/login.
- **Rationale:** local-only play-money app; admin gate is a convenience
  not a security boundary; symmetric with the rest of the auth surface
  but kept separate so admin can't accidentally appear in user lists or
  be banned.
- **Consequences:** the admin password lives in source (visible to
  anyone with DevTools — explicitly accepted). Future multi-admin
  support requires a real DB-backed admin role.

### ADR-0035 — Phase 9 tracking schema

- **Decision:** three new Dexie tables (`sessions`, `gameVisits`,
  `adjustments`) plus three optional columns on `users` (`isBanned`,
  `loginCount`, `lastLoginAt`). Tracking starts at Phase 9; no
  backfill for prior phases.
- **Rationale:** clean separation of concerns (each table owns one
  kind of event). Optional columns avoid a forced upgrade migration
  for existing user rows.
- **Consequences:** site-wide stats that count rounds work historically
  (rounds table has been around since Phase 1). Session-time and
  game-time stats are only meaningful from Phase 9 onwards. Documented
  in the dashboard UI ("data since v0.9-admin-dashboard").

## 11. PR sequencing (6 PRs)

### PR A — Schema v2 + ADRs

**Branch:** `phase-9-admin-pr-a-schema`
**Scope:** `db/schema.ts` version-2 stores definition + `User` /
`Session` / `GameVisit` / `Adjustment` interfaces. ADRs 0034 + 0035.
Tests for schema migration via `fake-indexeddb`. `vitest.config.ts`
coverage paths updated (`src/systems/admin*.ts`, etc).

### PR B — Tracking systems

**Branch:** `phase-9-admin-pr-b-tracking`
**Scope:**

- `sessionStore` extended with `currentSessionId`, `isAdmin`,
  `loginAdmin`, `logoutAdmin`. Login/logout writes sessions rows;
  login increments `loginCount` + sets `lastLoginAt`; login cleans
  orphan sessions.
- `auth.login` ban check; `auth.register` + `auth.login`
  reserved-username check.
- `src/systems/admin.ts` (`banUser`, `unbanUser`, `adjustBalance`).
- `src/systems/admin-auth.ts` (`loginAdmin`, `logoutAdmin`,
  `restoreAdminSession`).
- `useGameVisit(game)` hook in `src/games/_shared/useGameVisit.ts`.
- `GameShell` accepts `game` prop and calls the hook.
- All 4 game pages pass their game key (`'blackjack' | 'roulette' |
'slots' | 'coin-flip'`) to GameShell.
- `AppBootstrap` registers `beforeunload` listener.
- Tests for all of the above.

### PR C — Admin auth UI shell

**Branch:** `phase-9-admin-pr-c-auth-ui`
**Scope:**

- `RequireAdmin` component (parallel to `RequireAuth`).
- `pages/admin/AdminLoginPage.tsx` (login form).
- `pages/admin/AdminLayout.tsx` (sidebar + content area, with sidebar
  links + log-out).
- Router setup: `/admin/login` (no guard) and `/admin/*` (under
  `<RequireAdmin><Suspense fallback={...}><AdminLayout/></Suspense></RequireAdmin>`).
- The admin routes initially render empty placeholders for each section
  (Overview / Users / Adjustments / Sessions / per-user). PR D fills them.

### PR D — Overview + Users list + Charts

**Branch:** `phase-9-admin-pr-d-overview`
**Scope:**

- Recharts dependency added to `package.json`.
- `pages/admin/charts/` — `NetFlowLine`, `WinnersLosersBar`,
  `GameDistributionDonut` wrappers.
- `AdminOverviewPage` — 6 stats cards + 3 charts + recent rounds table.
- `AdminUsersListPage` — searchable / sortable table; click-to-drill.
- `pages/admin/queries.ts` — `useLiveQuery`-based aggregation helpers
  (sum-wagered, top-winners, etc.) shared between overview and per-user.

### PR E — Per-user + actions + audit + sessions log

**Branch:** `phase-9-admin-pr-e-per-user`
**Scope:**

- `AdminUserPage` — header + stats cards + per-game table + activity
  chart + adjustment history + recent rounds.
- `AdjustCreditsModal` — opens from per-user page; calls
  `admin.adjustBalance`.
- Ban / Unban toggle on per-user page.
- `AdminAuditPage` — adjustment log table.
- `AdminSessionsPage` — session log table.
- `UserActivityLine` chart wrapper.

### PR F — Release v0.9-admin-dashboard

**Branch:** `chore/release-v0.9-admin-dashboard`
**Scope:** empty release commit + tag + GitHub Release. Release notes
summarise what landed across PRs A-E.

## 12. Definition of Done (Phase 9)

Per CLAUDE.md hard rule 8:

- [ ] All 6 PRs merged to main
- [ ] `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`
      green locally on main after PR E
- [ ] CI: all 4 jobs green on main
- [ ] Bundle size: main bundle unchanged (≤ 800 kB); admin chunk
      separate (~150 kB additional, only loaded when admin visits
      /admin/\*). Documented in PR D body.
- [ ] Manual smoke:
  - [ ] Register a user → play 10 rounds across at least 2 games →
        log out
  - [ ] Visit `/admin/login` → log in as admin → land on `/admin`
  - [ ] Overview shows non-zero stats and charts render
  - [ ] Users list shows the registered user with correct totals
  - [ ] Drill into the user → all stats present, per-game breakdown
        non-zero where applicable
  - [ ] Ban the user → log out admin → try to log in as the user →
        rejected with "suspended" message
  - [ ] Log in admin → unban → user can log in again
  - [ ] Adjust credits +500 with reason "test grant" → user's balance
        increases by 500; adjustment appears in audit log
- [ ] Adjust credits −user.balance → rejected with "would go negative"
- [ ] Session log shows the test session with correct duration
- [ ] Reduced-motion: charts render statically (Recharts is already
      reduced-motion-friendly by default)

## 13. Risks and mitigations

| Risk                                                              | Mitigation                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `beforeunload` doesn't fire (mobile / programmatic close)         | Orphan cleanup at next login. Session shows as "active" until then; minor UI imperfection. |
| Recharts bundle bloat                                             | Lazy-loaded with admin route via `React.lazy`. Tracked in DoD bundle check.                |
| `useLiveQuery` perf with many users                               | Acceptable for hundreds; if it becomes a problem, denormalise pre-computed aggregates.     |
| Admin password visible in source                                  | Documented as acceptable; this is a local play-money app, not a secured system.            |
| User registers as `Admin` (capitalised) → bypasses reserved check | Reserved check is case-insensitive (`.toLowerCase() === 'admin'`).                         |
| Multi-tab session conflicts                                       | Only the most recent tab's session is "active". Orphan cleanup keeps the data correct.     |
| Migration regression breaks existing user data                    | Migration is purely additive (new tables + new optional columns); test covers v1→v2 path.  |

## 14. Open questions

None at spec time. All decisions locked during brainstorming.

---

**Spec status:** Approved 2026-05-18. Proceed to writing-plans skill.
