# Phase 15 sub-project #14 — Admin overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 15 #14 — elevate the admin suite with cross-cutting improvements: MASQUER chrome retrofit, Overview upgrade, date-range filter on every game admin page, cross-game leaderboard, and Audit/Sessions filter+search+paginate.

**Architecture:** Four PRs.

- **PR A — Layout + Overview**: `AdminLayout.tsx` MASQUER chrome retrofit (drops `min-h-screen`, brand tokens, sidebar polish) + `AdminOverviewPage.tsx` upgrade (top-games panel, daily activity sparkline, recent adjustments feed) + 3 new aggregations + 1 new chart wrapper.
- **PR B — DateRangeFilter**: NEW shared `<DateRangeFilter>` primitive (7d / 30d / 90d / All preset only, `localStorage` persistence) + retrofit **8 game admin pages** (Baccarat, Bingo, Craps, Lottery, Plinko, Poker, Roulette, Slots) to consume it + extend each game's aggregator(s) with optional `sinceMs?: number` arg.
- **PR C — Cross-game leaderboard**: NEW `/admin/leaderboard` page with 4 tabbed boards (Top winners / Top by volume / Biggest single win / Longest win streak) + 4 new aggregations + lazy route + sidebar nav.
- **PR D — Audit/Sessions + perf**: Shared `<AdminTableFilters>` + `<AdminPagination>` + `useAdminTableState` hook (URL query-param state) + retrofit `AdminAuditPage` + `AdminSessionsPage` + performance pass.

**Dispatch order:** A first → B + C in parallel after A merges → D after B + C merge.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · React Router 7 (`useSearchParams`) · Vite 5 · Tailwind 3 · Dexie 4 (no schema bump) · Recharts (lazy admin chunk) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-14-admin-overhaul-design.md` (PR #292).

---

## Shared rules (apply to every PR in this sub-project)

1. **Pure logic untouched.** `src/systems/{auth,wallet,rng,...}.ts` byte-stable. `src/systems/stats.ts` is **additive only** — new fns + optional args on existing fns. Never modify existing aggregator behaviour at `sinceMs === undefined`.
2. **Games sandbox preserved.** Admin code under `src/pages/admin/**` may read from `src/db/**` / `src/store/**` / `src/systems/**`.
3. **Integer money. No `Math.random()`.** ESLint enforces.
4. **No CLAUDE.md edits.**
5. **Commit subject ≤ 100 chars** ([[masquer-commit-subject-limit]]).
6. **Conventional Commits.** Scopes: `admin` (page-level), `stats` (aggregations), `routing` (router/nav), `ui` (shared admin primitives in `src/components/admin/`), `docs` (BUILD_GUIDE). Never `admin-leaderboard` / `admin-audit` etc — flat enum only.
7. **No `--no-verify`. No `--amend`.** Reset + new commit on hook failure.
8. **TS strict + exactOptionalPropertyTypes.** Optional fields via spread.
9. **Tokens-only Tailwind** in rebuilt files. Pairings from [`PHASE_15_PATTERNS.md §1.4`](../../PHASE_15_PATTERNS.md#14-brand-tokens-velvet-deco).
10. **AdminLayout root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** ([[masquer-min-h-screen-in-pages]]).
11. **Visual verification via Playwright at 1440×900 before pushing each PR** ([[masquer-screenshot-before-pushing-ui]]).
12. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```
13. **`useLiveQuery` inferred-Promise pattern** — no explicit generic (Phase 9 trap).
14. **Recharts uses `ChartTooltipShell`** — never the default `contentStyle` (#251 pattern).
15. **House Net tone:** green when positive (house ahead), red when negative — casino-operator perspective. Matches every other admin page.

---

## Critical context

### `Adjustment` shape (PR A.4 feed)

`src/db/schema.ts:Adjustment` is `{ id, userId, amount, reason, adjustedAt }` — **there is no `adminId` field**. So the "recent admin actions" feed in `AdminOverviewPage` shows: target user · ±amount · reason · timestamp (NO admin attribution). The spec section §4.2 calls this "RECENT ADJUSTMENTS" — that's the load-bearing label.

### Per-game `AllTimeStats` aggregator inventory (PR B target list)

`stats.ts` currently has these per-game AllTimeStats aggregators that need optional `sinceMs?: number` extensions:

| Game     | Aggregator                       | Extra arg         |
| -------- | -------------------------------- | ----------------- |
| Baccarat | `getBaccaratAllTimeStats()`      | +                 |
| Bingo    | `getBingoAllTimeStats()`         | +                 |
| Craps    | `getCrapsAllTimeStats()`         | +                 |
| Plinko   | `getPlinkoAllTimeStats()`        | +                 |
| Poker    | `getPokerAllTimeStats(variant?)` | + (after variant) |
| Roulette | `getRouletteAllTimeStats()`      | +                 |
| Slots    | `getSlotsAllTimeStats()`         | +                 |

Lottery doesn't have a single `getLotteryAllTimeStats` — it uses several lottery-specific aggregators. **Lottery admin page handling:** add the filter to `AdminLotteryPage` but pass `sinceMs` to whichever lottery aggregator(s) feed the StatCards. Verify exact aggregator names during A.0 / B.0.

### 8 game admin pages need DateRangeFilter retrofit (NOT 9)

`AdminBlackjackPage` and `AdminCoinFlipPage` **do not exist** — those games rely on the cross-cutting `AdminUserPage` / `AdminOverviewPage` for their data. So PR B's retrofit list is 8 pages: Baccarat, Bingo, Craps, Lottery, Plinko, Poker, Roulette, Slots.

### URL query-param state (PR D)

Use `useSearchParams` from `react-router`. Pattern:

```ts
const [search, setSearch] = useSearchParams();
const page = Number(search.get('page') ?? '1');
const userFilter = search.get('user') ?? '';
// Update: setSearch(prev => { prev.set('page', '2'); return prev; });
```

Never parse `window.location.search` manually.

### File structure

#### PR A — Layout + Overview

| File                                                    | Action                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/pages/admin/AdminLayout.tsx`                       | Chrome retrofit (drop `min-h-screen`, brand tokens, MASQUER · Admin title) |
| `src/pages/admin/AdminLayout.test.tsx`                  | Updated assertions for brand tokens + `h-full`                             |
| `src/pages/admin/AdminOverviewPage.tsx`                 | Add 3 new sections (top games, sparkline, recent adjustments)              |
| `src/pages/admin/AdminOverviewPage.test.tsx`            | New section assertions                                                     |
| `src/systems/stats.ts`                                  | Add `getTopGamesBySessions` + `getDailyActivity` + `getRecentAdjustments`  |
| `src/systems/stats.test.ts`                             | Pin new aggregations against fixture                                       |
| `src/components/charts/DailyActivitySparkline.tsx`      | NEW chart wrapper                                                          |
| `src/components/charts/DailyActivitySparkline.test.tsx` | NEW smoke test                                                             |
| `BUILD_GUIDE.md` §9                                     | Phase 15 #14 amendment note                                                |

#### PR B — DateRangeFilter

| File                                            | Action                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/DateRangeFilter.tsx`      | NEW primitive + `rangeToSinceMs` helper                                                                              |
| `src/components/admin/DateRangeFilter.test.tsx` | NEW tests (smoke + persistence)                                                                                      |
| `src/systems/stats.ts`                          | Add `sinceMs?: number` arg to 7 per-game `AllTimeStats` aggregators + lottery aggregators that feed AdminLotteryPage |
| `src/systems/stats.test.ts`                     | New cases pinning `sinceMs` filter behaviour                                                                         |
| `src/pages/admin/AdminBaccaratPage.tsx`         | Add filter state + storage key + pass sinceMs                                                                        |
| `src/pages/admin/AdminBingoPage.tsx`            | Same                                                                                                                 |
| `src/pages/admin/AdminCrapsPage.tsx`            | Same                                                                                                                 |
| `src/pages/admin/AdminLotteryPage.tsx`          | Same                                                                                                                 |
| `src/pages/admin/AdminPlinkoPage.tsx`           | Same                                                                                                                 |
| `src/pages/admin/AdminPokerPage.tsx`            | Same (passes sinceMs after existing variantArg)                                                                      |
| `src/pages/admin/AdminRoulettePage.tsx`         | Same                                                                                                                 |
| `src/pages/admin/AdminSlotsPage.tsx`            | Same                                                                                                                 |
| Each page's `.test.tsx`                         | Filter present + sinceMs threaded into aggregator                                                                    |

#### PR C — Cross-game leaderboard

| File                                            | Action                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `src/pages/admin/AdminLeaderboardPage.tsx`      | NEW page with 4 tabbed boards                                           |
| `src/pages/admin/AdminLeaderboardPage.test.tsx` | NEW page test                                                           |
| `src/systems/stats.ts`                          | Add 4 leaderboard aggregations (winners / volume / single-win / streak) |
| `src/systems/stats.test.ts`                     | Pin each aggregation against fixture                                    |
| `src/router.tsx`                                | Add lazy route `/admin/leaderboard`                                     |
| `src/pages/admin/AdminLayout.tsx`               | NEW "Leaderboard" nav entry after "Sessions"                            |
| `src/pages/admin/AdminLayout.test.tsx`          | Update nav-link ordering test                                           |

#### PR D — Audit/Sessions + perf

| File                                              | Action                                          |
| ------------------------------------------------- | ----------------------------------------------- |
| `src/components/admin/AdminTableFilters.tsx`      | NEW composable filter row                       |
| `src/components/admin/AdminTableFilters.test.tsx` | NEW tests                                       |
| `src/components/admin/AdminPagination.tsx`        | NEW prev/next + page indicator                  |
| `src/components/admin/AdminPagination.test.tsx`   | NEW tests                                       |
| `src/components/admin/useAdminTableState.ts`      | NEW URL-query-param state hook                  |
| `src/components/admin/useAdminTableState.test.ts` | NEW tests                                       |
| `src/pages/admin/AdminAuditPage.tsx`              | Rewrite to use filters + pagination + URL state |
| `src/pages/admin/AdminAuditPage.test.tsx`         | Filter / search / paginate assertions           |
| `src/pages/admin/AdminSessionsPage.tsx`           | Same retrofit                                   |
| `src/pages/admin/AdminSessionsPage.test.tsx`      | Same retrofit                                   |

---

## PR A — Layout + Overview

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-pr-a
```

### Task A.0 — Read context

- [ ] **Step 1:** Read the spec end-to-end.
- [ ] **Step 2:** Read this plan top-to-bottom.
- [ ] **Step 3:** Read `src/pages/admin/AdminLayout.tsx` + `AdminOverviewPage.tsx` end-to-end. Note current chrome tokens to replace.
- [ ] **Step 4:** Read `src/db/schema.ts` `Adjustment` interface — confirm fields `{id, userId, amount, reason, adjustedAt}`. No `adminId`.
- [ ] **Step 5:** Read 3 reference admin pages for the brand-token pattern: `AdminPokerPage.tsx`, `AdminPlinkoPage.tsx`, `AdminBingoPage.tsx`.
- [ ] **Step 6:** Read `src/components/charts/ChartTooltip.tsx` for the `ChartTooltipShell` pattern.
- [ ] **Step 7:** Read memories `feedback-masquer-min-h-screen-in-pages` + `feedback-masquer-screenshot-before-pushing-ui`.

### Task A.1 — `AdminLayout.tsx` chrome retrofit

- [ ] **Step 1: Replace root `div` and chrome:**

  ```tsx
  // Before
  <div className="flex min-h-screen bg-felt-deep text-white">
    <aside className="w-44 shrink-0 border-r border-gold/40 bg-felt-deep py-4">
      <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold">ADMIN</div>

  // After
  <div className="flex h-full flex-col bg-felt-table text-ivory" data-admin-layout>
    {/* Top bar */}
    <header className="flex items-center justify-between border-b border-brass/60 bg-velvet-deep px-6 py-3">
      <h1 className="font-display text-sm tracking-[0.18em] text-gold-bright">
        MASQUER &middot; Admin
      </h1>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border border-brass/60 px-3 py-1 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
        data-admin-logout
      >
        LOGOUT
      </button>
    </header>
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-brass/60 bg-velvet-deep py-4" data-admin-sidebar>
        <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold-bright">ADMIN</div>
        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'border-l-[3px] px-4 py-2 text-xs transition',
                  isActive
                    ? 'border-brass bg-velvet font-display tracking-[0.12em] text-gold-bright'
                    : 'border-transparent text-ivory/55 hover:bg-velvet/50',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-felt-table p-6" data-admin-main>
        <Outlet />
      </main>
    </div>
  </div>
  ```

  Note: if the current file already has a separate top-bar somewhere else (e.g., from a `RequireAdmin` wrapper), don't duplicate — adapt the existing structure.

- [ ] **Step 2: Update `AdminLayout.test.tsx`:**
  - Find any pinned class assertions on `bg-felt-deep` / `text-white` / `border-gold/40` / `min-h-screen` — replace with brand-token + `h-full` equivalents.
  - Add new assertion: `expect(container.firstElementChild?.className).toContain('h-full')` and `.not.toContain('min-h-screen')`.
  - Add assertion: title `MASQUER · Admin` rendered.
  - Add assertion: `data-admin-logout` button rendered + click triggers logout (mock `logoutAdmin`).

- [ ] **Step 3: Run + commit.**
  ```bash
  pnpm exec vitest run src/pages/admin/AdminLayout.test.tsx
  git add src/pages/admin/AdminLayout.tsx src/pages/admin/AdminLayout.test.tsx
  git commit -m "feat(admin): AdminLayout MASQUER chrome retrofit + drop min-h-screen"
  ```

### Task A.2 — New stats.ts aggregations

- [ ] **Step 1:** Add types + 3 aggregators to `src/systems/stats.ts` (place near other admin-facing aggregations; group together):

  ```ts
  // ── Admin Overview augmentation (Phase 15 #14) ─────────────────────────────

  export interface TopGameRow {
    game:
      | 'blackjack'
      | 'roulette'
      | 'slots'
      | 'baccarat'
      | 'bingo'
      | 'lottery'
      | 'plinko'
      | 'poker'
      | 'craps'
      | 'coin-flip';
    sessions: number;
    houseNet: number;
  }

  export interface DailyActivityPoint {
    date: string; // YYYY-MM-DD UTC
    sessions: number;
  }

  export interface RecentAdjustmentRow {
    id: string;
    adjustedAt: number;
    targetUser: string;
    amount: number;
    reason: string;
  }

  /** Top N games by total session count. Session = one `rounds` row.
   *  Poker + Craps use session-level rows per ADR-0041 — counts equal sessions
   *  there; other games count discrete rounds. */
  export async function getTopGamesBySessions(limit: number): Promise<TopGameRow[]> {
    const rows = await db.rounds.toArray();
    const byGame = new Map<TopGameRow['game'], { sessions: number; houseNet: number }>();
    for (const r of rows) {
      const cur = byGame.get(r.game as TopGameRow['game']) ?? { sessions: 0, houseNet: 0 };
      cur.sessions += 1;
      cur.houseNet += r.betAmount - r.payout; // positive = house ahead
      byGame.set(r.game as TopGameRow['game'], cur);
    }
    return [...byGame.entries()]
      .map(([game, v]) => ({ game, sessions: v.sessions, houseNet: v.houseNet }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, limit);
  }

  /** Sessions per day for the last `days` calendar days (UTC). Includes
   *  zero-session days so the sparkline renders gaps visibly. */
  export async function getDailyActivity(days: number): Promise<DailyActivityPoint[]> {
    const now = Date.now();
    const dayMs = 86_400_000;
    const startMs = now - days * dayMs;
    const rows = await db.rounds.where('playedAt').above(startMs).toArray();
    const buckets = new Map<string, number>();
    // Pre-seed every day in the range with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startMs + i * dayMs).toISOString().slice(0, 10);
      buckets.set(date, 0);
    }
    for (const r of rows) {
      const date = new Date(r.playedAt).toISOString().slice(0, 10);
      buckets.set(date, (buckets.get(date) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, sessions]) => ({ date, sessions }));
  }

  /** Last N adjustments with target-user resolution. */
  export async function getRecentAdjustments(limit: number): Promise<RecentAdjustmentRow[]> {
    const adjustments = await db.adjustments.toArray();
    adjustments.sort((a, b) => b.adjustedAt - a.adjustedAt);
    const sliced = adjustments.slice(0, limit);
    const userIds = [...new Set(sliced.map((a) => a.userId))];
    const users = await db.users.bulkGet(userIds);
    const usernameById = new Map<string, string>();
    users.forEach((u, i) => {
      if (u) usernameById.set(userIds[i]!, u.username);
    });
    return sliced.map((a) => ({
      id: a.id,
      adjustedAt: a.adjustedAt,
      targetUser: usernameById.get(a.userId) ?? '<deleted>',
      amount: a.amount,
      reason: a.reason,
    }));
  }
  ```

- [ ] **Step 2: Tests** in `stats.test.ts`. Seed fixture: 4 games × 3 rounds across 5 days + 4 adjustments. Pin:
  - `getTopGamesBySessions(3)` returns 3 rows sorted desc by sessions.
  - `getDailyActivity(7)` returns 7 entries with zero-day filling.
  - `getRecentAdjustments(2)` returns the 2 most recent + resolves usernames.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): top-games + daily-activity + recent-adjustments aggregations"
  ```

### Task A.3 — `DailyActivitySparkline.tsx` chart wrapper

- [ ] **Step 1: NEW file** `src/components/charts/DailyActivitySparkline.tsx`:

  ```tsx
  import type { JSX } from 'react';
  import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
  import { ChartTooltipShell } from './ChartTooltip';
  import type { DailyActivityPoint } from '@/systems/stats';

  interface Props {
    data: DailyActivityPoint[];
  }

  function Body({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DailyActivityPoint }>;
  }): JSX.Element | null {
    if (!active || !payload?.[0]) return null;
    const p = payload[0]!.payload;
    return (
      <ChartTooltipShell>
        <div className="font-mono text-[10px] tabular-nums text-ivory">
          {p.date}: <span className="text-gold-bright">{p.sessions}</span>
        </div>
      </ChartTooltipShell>
    );
  }

  export default function DailyActivitySparkline({ data }: Props): JSX.Element {
    return (
      <div className="h-16 w-full" data-daily-activity-sparkline>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              content={<Body />}
              cursor={{ stroke: 'var(--brand-brass, #c79a4b)', strokeOpacity: 0.4 }}
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="var(--brand-gold-bright, #e6c068)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  ```

- [ ] **Step 2: Smoke test** `DailyActivitySparkline.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render } from '@testing-library/react';
  import DailyActivitySparkline from './DailyActivitySparkline';

  describe('DailyActivitySparkline', () => {
    it('renders without crashing on empty data', () => {
      const { container } = render(<DailyActivitySparkline data={[]} />);
      expect(container.querySelector('[data-daily-activity-sparkline]')).not.toBeNull();
    });
    it('renders with data', () => {
      const { container } = render(
        <DailyActivitySparkline
          data={[
            { date: '2026-05-20', sessions: 3 },
            { date: '2026-05-21', sessions: 5 },
          ]}
        />,
      );
      expect(container.querySelector('[data-daily-activity-sparkline]')).not.toBeNull();
    });
  });
  ```

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/charts/DailyActivitySparkline.{tsx,test.tsx}
  git commit -m "feat(stats): DailyActivitySparkline chart wrapper for admin overview"
  ```

### Task A.4 — `AdminOverviewPage.tsx` upgrade

- [ ] **Step 1: Add imports + EMPTY constants:**

  ```ts
  import DailyActivitySparkline from '@/components/charts/DailyActivitySparkline';
  import {
    getDailyActivity,
    getRecentAdjustments,
    getTopGamesBySessions,
    type DailyActivityPoint,
    type RecentAdjustmentRow,
    type TopGameRow,
  } from '@/systems/stats';

  const EMPTY_TOP_GAMES: TopGameRow[] = [];
  const EMPTY_ACTIVITY: DailyActivityPoint[] = [];
  const EMPTY_ADJUSTMENTS: RecentAdjustmentRow[] = [];
  ```

- [ ] **Step 2: Add `useLiveQuery` hooks** alongside existing ones:

  ```ts
  const topGames = useLiveQuery(() => getTopGamesBySessions(3), [], EMPTY_TOP_GAMES);
  const activity = useLiveQuery(() => getDailyActivity(14), [], EMPTY_ACTIVITY);
  const recentAdjustments = useLiveQuery(() => getRecentAdjustments(10), [], EMPTY_ADJUSTMENTS);
  ```

- [ ] **Step 3: Add 3 new sections** between the 4 StatCards row and the existing `NetFlowLine`:

  **TOP GAMES BY SESSIONS:**

  ```tsx
  <section aria-label="Top games by sessions">
    <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
      TOP GAMES BY SESSIONS
    </h2>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {topGames.length === 0 ? (
        <p className="col-span-3 py-4 text-center text-xs text-ivory/40">No sessions yet.</p>
      ) : (
        topGames.map((g) => (
          <div
            key={g.game}
            className="rounded-md border border-brass/60 bg-velvet-deep p-4"
            data-top-game={g.game}
          >
            <div className="font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
              {g.game.replace('-', ' ')}
            </div>
            <div className="mt-1 font-mono text-lg tabular-nums text-ivory">
              {g.sessions.toLocaleString()}
            </div>
            <div className="text-xs text-ivory/55">sessions</div>
            <div
              className={[
                'mt-1 font-mono text-xs tabular-nums',
                g.houseNet >= 0 ? 'text-chip-win' : 'text-casino-red',
              ].join(' ')}
            >
              House {g.houseNet >= 0 ? '+' : ''}
              {g.houseNet.toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  </section>
  ```

  **ACTIVITY (LAST 14 DAYS):**

  ```tsx
  <section aria-label="Daily activity">
    <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">
      ACTIVITY (LAST 14 DAYS)
    </h2>
    <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
      <DailyActivitySparkline data={activity} />
    </div>
  </section>
  ```

  **RECENT ADJUSTMENTS:**

  ```tsx
  <section aria-label="Recent adjustments">
    <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">RECENT ADJUSTMENTS</h2>
    <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
      {recentAdjustments.length === 0 ? (
        <p className="py-4 text-center text-xs text-ivory/40">No adjustments recorded.</p>
      ) : (
        <ul className="divide-y divide-brass/20" data-recent-adjustments>
          {recentAdjustments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="text-ivory/55 tabular-nums">
                {new Date(a.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
              </span>
              <span className="flex-1 truncate text-ivory">{a.targetUser}</span>
              <span
                className={[
                  'font-mono tabular-nums',
                  a.amount >= 0 ? 'text-chip-win' : 'text-casino-red',
                ].join(' ')}
              >
                {a.amount >= 0 ? '+' : ''}
                {a.amount.toLocaleString()}
              </span>
              <span className="truncate text-ivory/55">{a.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
  ```

- [ ] **Step 4: Brand-token sweep on existing sections.** Find any `text-gold` (legacy) → `text-gold-bright`; `text-white/60` → `text-ivory/55`. Check the existing section headers — they likely use `text-white/60`. Flip.

- [ ] **Step 5: Update `AdminOverviewPage.test.tsx`:**
  - Add assertion: TOP GAMES section renders when fixture has rounds for ≥3 games.
  - Add assertion: ACTIVITY section renders `[data-daily-activity-sparkline]`.
  - Add assertion: RECENT ADJUSTMENTS section renders `[data-recent-adjustments]` and lists fixture adjustments.
  - Add empty-state assertion: zero adjustments → "No adjustments recorded." text.
  - Find existing `text-gold` / `text-white` assertions → flip to brand tokens.

- [ ] **Step 6: Run + commit.**
  ```bash
  pnpm exec vitest run src/pages/admin/AdminOverviewPage.test.tsx
  git add src/pages/admin/AdminOverviewPage.{tsx,test.tsx}
  git commit -m "feat(admin): AdminOverviewPage top games + activity sparkline + recent adjustments"
  ```

### Task A.5 — BUILD_GUIDE amendment

- [ ] **Step 1: Amend `BUILD_GUIDE.md` §9** with a Phase 15 #14 note (Phase 9 was the original admin section). One-paragraph + link to spec.
- [ ] **Step 2: Markdownlint + commit.**
  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md
  git add BUILD_GUIDE.md
  git commit -m "docs(admin): BUILD_GUIDE §9 — note phase 15 #14 admin chrome + overview upgrade"
  ```

### Task A.6 — Visual verification

- [ ] **Step 1:** Start dev server.

  ```bash
  pkill -f vite 2>/dev/null || true
  rm -rf node_modules/.vite
  pnpm dev > /tmp/dev.log 2>&1 &
  sleep 4
  curl -sI http://localhost:5173/ | head -1
  ```

- [ ] **Step 2:** Adapt `/tmp/screenshot-holdem-reveal.mjs` template. Register user, navigate to `/admin/login`, log in with `admin/admin12345`, screenshot `/admin`. Then click through to `/admin/users`, `/admin/sessions`, `/admin/adjustments` and one game page (e.g. `/admin/plinko`) to confirm the sidebar + top-bar render consistently.

- [ ] **Step 3: Verify in screenshots:**
  - MASQUER · Admin title in top-bar
  - Brand-tokened sidebar (`bg-velvet-deep` + brass border + gold-bright active state)
  - TOP GAMES / ACTIVITY / RECENT ADJUSTMENTS sections render on `/admin`
  - No scroll bars beyond the inner main area; no `min-h-screen` overflow

- [ ] **Step 4: Stop dev.** `pkill -f vite`

### Task A.7 — Full DoD + open PR

- [ ] **Step 1: Full DoD.** All 6 gates green.
- [ ] **Step 2: Push.** `git push -u origin phase-15-14-pr-a`
- [ ] **Step 3: Open PR.**
  ```bash
  gh pr create --title "phase-15(#14) PR A: AdminLayout MASQUER chrome + Overview upgrade" --body "..."
  ```
  Title ~67 chars.
- [ ] **Step 4: Report PR URL + DoD + screenshot verification. STOP.**

---

## PR B — DateRangeFilter

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-pr-b
```

### Task B.0 — Read context

- [ ] **Step 1:** Read spec §4.3.
- [ ] **Step 2:** Read the 8 target admin pages to inventory their current aggregator calls + which would benefit from `sinceMs` filtering. Note that Lottery has multiple aggregators feeding one page — list them all.
- [ ] **Step 3:** Read `src/systems/stats.ts` for each per-game `AllTimeStats` aggregator's body — confirm they all iterate `db.rounds` (or equivalent), so adding `.where('playedAt').above(sinceMs)` is a clean drop-in.

### Task B.1 — `DateRangeFilter` primitive + `rangeToSinceMs` helper

- [ ] **Step 1: NEW file** `src/components/admin/DateRangeFilter.tsx`:

  ```tsx
  import type { JSX } from 'react';
  import { useEffect } from 'react';

  export type RangePreset = '7d' | '30d' | '90d' | 'all';

  export interface DateRangeFilterProps {
    value: RangePreset;
    onChange: (next: RangePreset) => void;
    /** Optional localStorage key. If provided, the component hydrates from the
     *  key on mount and writes back on change. */
    storageKey?: string;
  }

  const PRESETS: ReadonlyArray<{ key: RangePreset; label: string }> = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: 'all', label: 'All' },
  ];

  const DAY_MS = 86_400_000;

  /** Convert a preset to a milliseconds-since-epoch threshold. `all` returns
   *  `undefined` so aggregators can skip the where-clause. */
  export function rangeToSinceMs(preset: RangePreset): number | undefined {
    if (preset === 'all') return undefined;
    if (preset === '7d') return Date.now() - 7 * DAY_MS;
    if (preset === '30d') return Date.now() - 30 * DAY_MS;
    return Date.now() - 90 * DAY_MS;
  }

  export default function DateRangeFilter({
    value,
    onChange,
    storageKey,
  }: DateRangeFilterProps): JSX.Element {
    // Hydrate from localStorage on mount when storageKey provided.
    useEffect(() => {
      if (!storageKey) return;
      const stored = localStorage.getItem(storageKey);
      if (
        stored &&
        (stored === '7d' || stored === '30d' || stored === '90d' || stored === 'all') &&
        stored !== value
      ) {
        onChange(stored);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist on change.
    useEffect(() => {
      if (!storageKey) return;
      localStorage.setItem(storageKey, value);
    }, [storageKey, value]);

    return (
      <div
        role="tablist"
        aria-label="Date range filter"
        className="flex items-center gap-4 border-b border-brass/30"
        data-date-range-filter
      >
        {PRESETS.map((p) => {
          const selected = p.key === value;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={selected}
              data-range={p.key}
              onClick={() => onChange(p.key)}
              className={[
                'px-1 pb-2 pt-1 text-xs transition',
                selected
                  ? 'font-display text-gold-bright border-b-2 border-brass'
                  : 'text-ivory/55 hover:text-ivory/80',
              ].join(' ')}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 2: Tests** `DateRangeFilter.test.tsx`:
  - Renders 4 buttons with correct `data-range` attrs.
  - Click fires `onChange`.
  - With `storageKey`, mount hydrates from `localStorage` if present.
  - With `storageKey`, change writes to `localStorage`.
  - `rangeToSinceMs('all')` returns `undefined`.
  - `rangeToSinceMs('7d')` returns roughly `Date.now() - 7 * 86_400_000` (assert within 1s tolerance).

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/admin/DateRangeFilter.{tsx,test.tsx}
  git commit -m "feat(ui): shared DateRangeFilter primitive + rangeToSinceMs helper"
  ```

### Task B.2 — Extend stats.ts aggregators with `sinceMs?` arg

For each of the 7 per-game `AllTimeStats` aggregators, append an optional `sinceMs?: number` parameter and filter by `playedAt > sinceMs` when set. Keep behaviour identical when `sinceMs === undefined`.

- [ ] **Step 1: `getBaccaratAllTimeStats`** — example pattern:

  ```ts
  // Before
  export async function getBaccaratAllTimeStats(): Promise<BaccaratAllTimeStats> {
    const rows = await db.rounds.where('game').equals('baccarat').toArray();
    // …
  }
  // After
  export async function getBaccaratAllTimeStats(sinceMs?: number): Promise<BaccaratAllTimeStats> {
    let rows = await db.rounds.where('game').equals('baccarat').toArray();
    if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
    // …
  }
  ```

  Use the same `.filter()` post-query pattern (NOT a chained `.where('playedAt').above(sinceMs)`) — Dexie doesn't compose secondary where-clauses without compound indexes that don't all exist on `rounds`. Load-all + filter is the load-bearing pattern (matches #250 "recent rounds" precedent).

- [ ] **Step 2-7: Repeat for** `getBingoAllTimeStats`, `getCrapsAllTimeStats`, `getPlinkoAllTimeStats`, `getPokerAllTimeStats` (append AFTER existing `variant?` arg), `getRouletteAllTimeStats`, `getSlotsAllTimeStats`. Same `.filter` post-load pattern.

- [ ] **Step 8: Lottery aggregators** — read `getLotteryAllTimeStats` (or whichever fns feed AdminLotteryPage's StatCards). Extend each one similarly. List the aggregators in the commit body.

- [ ] **Step 9: Tests in `stats.test.ts`:** for each extended aggregator, add ONE case with `sinceMs = now - 1day` and verify only recent fixture rows are counted (existing fixtures span multiple days; new tests pick the recent slice). Don't modify existing `sinceMs === undefined` tests.

- [ ] **Step 10: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): optional sinceMs arg on per-game AllTimeStats aggregators"
  ```

### Task B.3 — Retrofit 8 game admin pages

Same pattern for each page. Example for `AdminPlinkoPage.tsx`:

- [ ] **Step 1: Add imports + state:**

  ```tsx
  import DateRangeFilter, {
    rangeToSinceMs,
    type RangePreset,
  } from '@/components/admin/DateRangeFilter';
  // ...
  const [range, setRange] = useState<RangePreset>('all');
  const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);
  ```

- [ ] **Step 2: Thread `sinceMs` into the aggregator hook:**

  ```tsx
  // Before
  const stats = useLiveQuery(() => getPlinkoAllTimeStats(), [], EMPTY_STATS);
  // After
  const stats = useLiveQuery(() => getPlinkoAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
  ```

- [ ] **Step 3: Render the filter above the StatCards:**

  ```tsx
  <DateRangeFilter value={range} onChange={setRange} storageKey="admin.plinko.range" />
  ```

- [ ] **Step 4: Filter the recent-rounds table client-side too:**

  ```tsx
  const filteredRecent = useMemo(() => {
    return sinceMs ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds;
  }, [recentRounds, sinceMs]);
  // Use filteredRecent below
  ```

- [ ] **Step 5: Update `AdminPlinkoPage.test.tsx`:**
  - Assert `<DateRangeFilter>` renders with `data-date-range-filter`.
  - Click `[data-range="7d"]` → assert `getPlinkoAllTimeStats` was called with a `sinceMs` argument (mock the aggregator).

- [ ] **Step 6: Repeat steps 1-5 for the other 7 pages** with the appropriate storageKey:
  - `AdminBaccaratPage.tsx` → `admin.baccarat.range`
  - `AdminBingoPage.tsx` → `admin.bingo.range`
  - `AdminCrapsPage.tsx` → `admin.craps.range`
  - `AdminLotteryPage.tsx` → `admin.lottery.range` (thread sinceMs into each lottery-specific aggregator the page consumes)
  - `AdminPokerPage.tsx` → `admin.poker.range` (call `getPokerAllTimeStats(variantArg, sinceMs)` — sinceMs is the SECOND arg)
  - `AdminRoulettePage.tsx` → `admin.roulette.range`
  - `AdminSlotsPage.tsx` → `admin.slots.range`

- [ ] **Step 7: Run all 8 tests + commit. Suggest splitting into 2-3 commits if it gets too long:**
  ```bash
  pnpm exec vitest run src/pages/admin
  git add src/pages/admin/Admin{Baccarat,Bingo,Craps}Page.{tsx,test.tsx}
  git commit -m "feat(admin): DateRangeFilter on Baccarat + Bingo + Craps admin pages"
  # 2nd commit
  git add src/pages/admin/Admin{Lottery,Plinko,Poker}Page.{tsx,test.tsx}
  git commit -m "feat(admin): DateRangeFilter on Lottery + Plinko + Poker admin pages"
  # 3rd commit
  git add src/pages/admin/Admin{Roulette,Slots}Page.{tsx,test.tsx}
  git commit -m "feat(admin): DateRangeFilter on Roulette + Slots admin pages"
  ```

### Task B.4 — Visual verification

- [ ] **Step 1: Start dev + screenshot** each of the 8 admin pages with `range=30d` set via the filter click. Verify the filter row renders + clicking 7d / 30d / 90d / All switches the active tab.

### Task B.5 — Full DoD + open PR

- [ ] **Step 1: Full DoD.**
- [ ] **Step 2: Push.** `git push -u origin phase-15-14-pr-b`
- [ ] **Step 3: Open PR.**
  ```bash
  gh pr create --title "phase-15(#14) PR B: DateRangeFilter + retrofit 8 game admin pages" --body "..."
  ```
- [ ] **Step 4: Report. STOP.**

---

## PR C — Cross-game leaderboard

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-pr-c
```

### Task C.0 — Read context

- [ ] **Step 1:** Read spec §4.4.
- [ ] **Step 2:** Read `src/pages/admin/AdminPokerPage.tsx` for the tabbed-UI pattern (variant tabs).
- [ ] **Step 3:** Read `src/db/schema.ts` `Round` interface — confirm `userId`, `netChange`, `betAmount`, `payout`, `playedAt`, `game` fields.

### Task C.1 — 4 leaderboard aggregations

- [ ] **Step 1:** Add to `src/systems/stats.ts`:

  ```ts
  // ── Cross-game leaderboard (Phase 15 #14 PR C) ─────────────────────────────

  export interface LeaderboardWinnerRow {
    username: string;
    netChips: number;
    rounds: number;
  }
  export interface LeaderboardVolumeRow {
    username: string;
    totalWagered: number;
    rounds: number;
  }
  export interface LeaderboardSingleWinRow {
    username: string;
    game: string;
    payout: number;
    netChange: number;
    playedAt: number;
  }
  export interface LeaderboardStreakRow {
    username: string;
    streakLength: number;
    game: string;
  }

  async function loadFilteredRounds(sinceMs?: number) {
    let rows = await db.rounds.toArray();
    if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
    return rows;
  }

  async function resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
    const users = await db.users.bulkGet(userIds);
    const m = new Map<string, string>();
    users.forEach((u, i) => {
      if (u) m.set(userIds[i]!, u.username);
    });
    return m;
  }

  export async function getLeaderboardTopWinners(
    limit: number,
    sinceMs?: number,
  ): Promise<LeaderboardWinnerRow[]> {
    const rows = await loadFilteredRounds(sinceMs);
    const byUser = new Map<string, { netChips: number; rounds: number }>();
    for (const r of rows) {
      const cur = byUser.get(r.userId) ?? { netChips: 0, rounds: 0 };
      cur.netChips += r.netChange;
      cur.rounds += 1;
      byUser.set(r.userId, cur);
    }
    const usernames = await resolveUsernames([...byUser.keys()]);
    return [...byUser.entries()]
      .map(([userId, v]) => ({
        username: usernames.get(userId) ?? '<deleted>',
        netChips: v.netChips,
        rounds: v.rounds,
      }))
      .sort((a, b) => b.netChips - a.netChips)
      .slice(0, limit);
  }

  export async function getLeaderboardTopVolume(
    limit: number,
    sinceMs?: number,
  ): Promise<LeaderboardVolumeRow[]> {
    const rows = await loadFilteredRounds(sinceMs);
    const byUser = new Map<string, { totalWagered: number; rounds: number }>();
    for (const r of rows) {
      const cur = byUser.get(r.userId) ?? { totalWagered: 0, rounds: 0 };
      cur.totalWagered += r.betAmount;
      cur.rounds += 1;
      byUser.set(r.userId, cur);
    }
    const usernames = await resolveUsernames([...byUser.keys()]);
    return [...byUser.entries()]
      .map(([userId, v]) => ({
        username: usernames.get(userId) ?? '<deleted>',
        totalWagered: v.totalWagered,
        rounds: v.rounds,
      }))
      .sort((a, b) => b.totalWagered - a.totalWagered)
      .slice(0, limit);
  }

  export async function getLeaderboardBiggestSingleWins(
    limit: number,
    sinceMs?: number,
  ): Promise<LeaderboardSingleWinRow[]> {
    const rows = await loadFilteredRounds(sinceMs);
    rows.sort((a, b) => b.netChange - a.netChange);
    const sliced = rows.slice(0, limit);
    const usernames = await resolveUsernames([...new Set(sliced.map((r) => r.userId))]);
    return sliced.map((r) => ({
      username: usernames.get(r.userId) ?? '<deleted>',
      game: r.game,
      payout: r.payout,
      netChange: r.netChange,
      playedAt: r.playedAt,
    }));
  }

  export async function getLeaderboardLongestStreaks(
    limit: number,
    sinceMs?: number,
  ): Promise<LeaderboardStreakRow[]> {
    const rows = await loadFilteredRounds(sinceMs);
    // Group by user, sort each user's rounds by playedAt asc, walk for longest win streak.
    const byUser = new Map<string, Array<{ playedAt: number; netChange: number; game: string }>>();
    for (const r of rows) {
      const arr = byUser.get(r.userId) ?? [];
      arr.push({ playedAt: r.playedAt, netChange: r.netChange, game: r.game });
      byUser.set(r.userId, arr);
    }
    const usernames = await resolveUsernames([...byUser.keys()]);
    const streaks: LeaderboardStreakRow[] = [];
    for (const [userId, arr] of byUser) {
      arr.sort((a, b) => a.playedAt - b.playedAt);
      let curStreak = 0;
      let curGame = '';
      let bestStreak = 0;
      let bestGame = '';
      for (const r of arr) {
        if (r.netChange > 0) {
          curStreak += 1;
          curGame = r.game;
          if (curStreak > bestStreak) {
            bestStreak = curStreak;
            bestGame = curGame;
          }
        } else {
          curStreak = 0;
        }
      }
      if (bestStreak > 0) {
        streaks.push({
          username: usernames.get(userId) ?? '<deleted>',
          streakLength: bestStreak,
          game: bestGame,
        });
      }
    }
    return streaks.sort((a, b) => b.streakLength - a.streakLength).slice(0, limit);
  }
  ```

- [ ] **Step 2: Tests** in `stats.test.ts`. Seed ~15 rounds across 3 users + 4 games. Pin each aggregator's top-N result.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): cross-game admin leaderboard aggregations (4 boards)"
  ```

### Task C.2 — `AdminLeaderboardPage.tsx`

- [ ] **Step 1: NEW file** `src/pages/admin/AdminLeaderboardPage.tsx`:

  ```tsx
  import type { JSX } from 'react';
  import { useMemo, useState } from 'react';
  import { useLiveQuery } from 'dexie-react-hooks';
  import DateRangeFilter, {
    rangeToSinceMs,
    type RangePreset,
  } from '@/components/admin/DateRangeFilter';
  import {
    getLeaderboardBiggestSingleWins,
    getLeaderboardLongestStreaks,
    getLeaderboardTopVolume,
    getLeaderboardTopWinners,
    type LeaderboardSingleWinRow,
    type LeaderboardStreakRow,
    type LeaderboardVolumeRow,
    type LeaderboardWinnerRow,
  } from '@/systems/stats';

  type TabKey = 'winners' | 'volume' | 'single-win' | 'streak';

  const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
    { key: 'winners', label: 'Top winners' },
    { key: 'volume', label: 'Top by volume' },
    { key: 'single-win', label: 'Biggest single win' },
    { key: 'streak', label: 'Longest win streak' },
  ];

  const EMPTY_WINNERS: LeaderboardWinnerRow[] = [];
  const EMPTY_VOLUME: LeaderboardVolumeRow[] = [];
  const EMPTY_SINGLE: LeaderboardSingleWinRow[] = [];
  const EMPTY_STREAK: LeaderboardStreakRow[] = [];

  function formatTimestamp(ms: number): string {
    return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  }

  export default function AdminLeaderboardPage(): JSX.Element {
    const [tab, setTab] = useState<TabKey>('winners');
    const [range, setRange] = useState<RangePreset>('all');
    const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

    const winners = useLiveQuery(
      () => getLeaderboardTopWinners(25, sinceMs),
      [sinceMs],
      EMPTY_WINNERS,
    );
    const volume = useLiveQuery(
      () => getLeaderboardTopVolume(25, sinceMs),
      [sinceMs],
      EMPTY_VOLUME,
    );
    const singleWins = useLiveQuery(
      () => getLeaderboardBiggestSingleWins(25, sinceMs),
      [sinceMs],
      EMPTY_SINGLE,
    );
    const streaks = useLiveQuery(
      () => getLeaderboardLongestStreaks(25, sinceMs),
      [sinceMs],
      EMPTY_STREAK,
    );

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-base tracking-wider text-gold-bright">LEADERBOARD</h1>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Leaderboard tab"
          className="flex items-center gap-6 border-b border-brass/30"
        >
          {TABS.map((t) => {
            const selected = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                data-leaderboard-tab={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'px-1 pb-2 pt-1 text-xs transition',
                  selected
                    ? 'font-display text-gold-bright border-b-2 border-brass'
                    : 'text-ivory/55 hover:text-ivory/80',
                ].join(' ')}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Date range filter */}
        <DateRangeFilter
          value={range}
          onChange={setRange}
          storageKey={`admin.leaderboard.${tab}.range`}
        />

        {/* Tab body */}
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {tab === 'winners' && <WinnersTable rows={winners} />}
          {tab === 'volume' && <VolumeTable rows={volume} />}
          {tab === 'single-win' && <SingleWinTable rows={singleWins} />}
          {tab === 'streak' && <StreakTable rows={streaks} />}
        </div>
      </div>
    );
  }

  // Each table component renders rank + columns. Compact — all in one file for now.

  function WinnersTable({ rows }: { rows: LeaderboardWinnerRow[] }): JSX.Element {
    if (rows.length === 0)
      return <p className="py-4 text-center text-xs text-ivory/40">No data.</p>;
    return (
      <table className="w-full text-left text-xs" data-leaderboard-winners>
        <thead>
          <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Player</th>
            <th className="py-2 pr-3">Net chips</th>
            <th className="py-2 pr-3">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
              <td className="py-2 pr-3 text-ivory">{r.username}</td>
              <td
                className={[
                  'py-2 pr-3 font-mono tabular-nums',
                  r.netChips >= 0 ? 'text-chip-win' : 'text-casino-red',
                ].join(' ')}
              >
                {r.netChips >= 0 ? '+' : ''}
                {r.netChips.toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                {r.rounds.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function VolumeTable({ rows }: { rows: LeaderboardVolumeRow[] }): JSX.Element {
    if (rows.length === 0)
      return <p className="py-4 text-center text-xs text-ivory/40">No data.</p>;
    return (
      <table className="w-full text-left text-xs" data-leaderboard-volume>
        <thead>
          <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Player</th>
            <th className="py-2 pr-3">Total wagered</th>
            <th className="py-2 pr-3">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
              <td className="py-2 pr-3 text-ivory">{r.username}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
                {r.totalWagered.toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                {r.rounds.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function SingleWinTable({ rows }: { rows: LeaderboardSingleWinRow[] }): JSX.Element {
    if (rows.length === 0)
      return <p className="py-4 text-center text-xs text-ivory/40">No data.</p>;
    return (
      <table className="w-full text-left text-xs" data-leaderboard-single-win>
        <thead>
          <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Player</th>
            <th className="py-2 pr-3">Game</th>
            <th className="py-2 pr-3">Payout</th>
            <th className="py-2 pr-3">Net</th>
            <th className="py-2 pr-3">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.username}-${r.playedAt}-${i}`} className="border-b border-brass/10">
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
              <td className="py-2 pr-3 text-ivory">{r.username}</td>
              <td className="py-2 pr-3 text-ivory/85">{r.game}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
                {r.payout.toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-chip-win">
                +{r.netChange.toLocaleString()}
              </td>
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                {formatTimestamp(r.playedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function StreakTable({ rows }: { rows: LeaderboardStreakRow[] }): JSX.Element {
    if (rows.length === 0)
      return <p className="py-4 text-center text-xs text-ivory/40">No data.</p>;
    return (
      <table className="w-full text-left text-xs" data-leaderboard-streak>
        <thead>
          <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Player</th>
            <th className="py-2 pr-3">Streak</th>
            <th className="py-2 pr-3">Game</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.username}-${i}`} className="border-b border-brass/10">
              <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
              <td className="py-2 pr-3 text-ivory">{r.username}</td>
              <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
                {r.streakLength}
              </td>
              <td className="py-2 pr-3 text-ivory/85">{r.game}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  ```

- [ ] **Step 2: Tests** `AdminLeaderboardPage.test.tsx`. Seed fixture with 3 users × 5 rounds across 3 games. Assert:
  - Each tab click switches `data-leaderboard-tab` aria-selected.
  - Each tab table renders fixture rows with correct columns.
  - Empty-state for "Longest streak" when no positive-netChange rounds.
  - Date range filter present + persists per-tab to `localStorage`.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/pages/admin/AdminLeaderboardPage.{tsx,test.tsx}
  git commit -m "feat(admin): cross-game leaderboard page with 4 tabbed boards"
  ```

### Task C.3 — Router + sidebar nav

- [ ] **Step 1: `src/router.tsx`:**

  ```ts
  const AdminLeaderboardPage = lazy(() => import('@/pages/admin/AdminLeaderboardPage'));
  // route: { path: 'leaderboard', element: <AdminLeaderboardPage /> },
  ```

- [ ] **Step 2: `AdminLayout.tsx` NAV_ITEMS:** insert after `Sessions`:

  ```ts
  { to: '/admin/sessions', label: 'Sessions', end: false },
  { to: '/admin/leaderboard', label: 'Leaderboard', end: false },  // ← NEW
  { to: '/admin/lottery', label: 'Lottery', end: false },
  ```

- [ ] **Step 3: Update `AdminLayout.test.tsx`** for new nav-link ordering.

- [ ] **Step 4: Commit.**
  ```bash
  git add src/router.tsx src/pages/admin/AdminLayout.{tsx,test.tsx}
  git commit -m "feat(routing): lazy /admin/leaderboard route + sidebar nav entry"
  ```

### Task C.4 — Visual verification

- [ ] **Step 1:** Screenshot each of the 4 tabs at 1440×900 with seeded data.
- [ ] **Step 2:** Verify tab switching + date range filter behaviour.

### Task C.5 — Full DoD + open PR

- [ ] **Step 1: Full DoD.**
- [ ] **Step 2: Push + open PR** `phase-15(#14) PR C: cross-game admin leaderboard (4 tabbed boards)`. ~70 chars.

---

## PR D — Audit/Sessions + perf

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-pr-d
```

### Task D.0 — Read context

- [ ] **Step 1:** Read spec §4.5.
- [ ] **Step 2:** Read `src/pages/admin/AdminAuditPage.tsx` + `AdminSessionsPage.tsx` end-to-end.
- [ ] **Step 3:** Read react-router `useSearchParams` docs or example from any existing usage.

### Task D.1 — `useAdminTableState` hook

- [ ] **Step 1: NEW file** `src/components/admin/useAdminTableState.ts`:

  ```ts
  import { useCallback, useMemo } from 'react';
  import { useSearchParams } from 'react-router';
  import type { RangePreset } from './DateRangeFilter';

  export interface AdminTableState {
    page: number;
    user: string;
    type: string;
    range: RangePreset;
    search: string;
  }

  export interface AdminTableStateDefaults {
    page?: number;
    user?: string;
    type?: string;
    range?: RangePreset;
    search?: string;
  }

  function parseRange(v: string | null): RangePreset {
    if (v === '7d' || v === '30d' || v === '90d' || v === 'all') return v;
    return 'all';
  }

  /** URL-query-param state for admin tables. Returns a snapshot + setter that
   *  merges partial updates into the query string. */
  export function useAdminTableState(defaults: AdminTableStateDefaults = {}): {
    state: AdminTableState;
    setState: (patch: Partial<AdminTableState>) => void;
  } {
    const [search, setSearch] = useSearchParams();

    const state = useMemo<AdminTableState>(
      () => ({
        page: Number(search.get('page') ?? defaults.page ?? 1),
        user: search.get('user') ?? defaults.user ?? '',
        type: search.get('type') ?? defaults.type ?? '',
        range: parseRange(search.get('range') ?? defaults.range ?? 'all'),
        search: search.get('q') ?? defaults.search ?? '',
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
      [search],
    );

    const setState = useCallback(
      (patch: Partial<AdminTableState>) => {
        setSearch(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (patch.page !== undefined) next.set('page', String(patch.page));
            if (patch.user !== undefined) {
              if (patch.user) next.set('user', patch.user);
              else next.delete('user');
            }
            if (patch.type !== undefined) {
              if (patch.type) next.set('type', patch.type);
              else next.delete('type');
            }
            if (patch.range !== undefined) {
              if (patch.range !== 'all') next.set('range', patch.range);
              else next.delete('range');
            }
            if (patch.search !== undefined) {
              if (patch.search) next.set('q', patch.search);
              else next.delete('q');
            }
            return next;
          },
          { replace: true },
        );
      },
      [setSearch],
    );

    return { state, setState };
  }
  ```

- [ ] **Step 2: Tests** `useAdminTableState.test.ts`:
  - Returns defaults when URL empty.
  - Reads from URL on mount.
  - `setState` updates URL.
  - `setState({ range: 'all' })` removes the query param.
  - `setState({ user: '' })` removes the query param.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/admin/useAdminTableState.{ts,test.ts}
  git commit -m "feat(ui): useAdminTableState hook for URL-query-param admin table state"
  ```

### Task D.2 — `AdminTableFilters` + `AdminPagination` primitives

- [ ] **Step 1: NEW `AdminTableFilters.tsx`** — composable filter row. Renders only the slots provided:

  ```tsx
  import type { JSX, ReactNode } from 'react';
  import DateRangeFilter, { type RangePreset } from './DateRangeFilter';

  interface SearchSlot {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }
  interface RangeSlot {
    value: RangePreset;
    onChange: (r: RangePreset) => void;
  }
  interface SelectSlot {
    value: string;
    onChange: (v: string) => void;
    options: ReadonlyArray<{ value: string; label: string }>;
  }

  interface Props {
    /** Free-text search input. */
    search?: SearchSlot;
    /** Date range filter. */
    range?: RangeSlot;
    /** Action-type dropdown (Audit only). */
    type?: SelectSlot;
    /** User filter (could be typeahead in future; v1 is plain text). */
    user?: SearchSlot;
    /** Optional reset button — renders if any slot provided. */
    onReset?: () => void;
  }

  export default function AdminTableFilters({
    search,
    range,
    type,
    user,
    onReset,
  }: Props): JSX.Element {
    return (
      <div className="flex flex-wrap items-center gap-4" data-admin-table-filters>
        {user && (
          <label className="flex items-center gap-2 text-xs text-ivory/55">
            User
            <input
              type="text"
              value={user.value}
              onChange={(e) => user.onChange(e.target.value)}
              placeholder={user.placeholder}
              className="w-32 rounded-md border border-brass/60 bg-velvet-deep px-2 py-1 text-xs text-ivory"
              data-admin-filter-user
            />
          </label>
        )}
        {type && (
          <label className="flex items-center gap-2 text-xs text-ivory/55">
            Type
            <select
              value={type.value}
              onChange={(e) => type.onChange(e.target.value)}
              className="rounded-md border border-brass/60 bg-velvet-deep px-2 py-1 text-xs text-ivory"
              data-admin-filter-type
            >
              <option value="">All</option>
              {type.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {range && <DateRangeFilter value={range.value} onChange={range.onChange} />}
        {search && (
          <label className="flex flex-1 items-center gap-2 text-xs text-ivory/55">
            Search
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              className="flex-1 rounded-md border border-brass/60 bg-velvet-deep px-2 py-1 text-xs text-ivory"
              data-admin-filter-search
            />
          </label>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-brass/60 px-3 py-1 text-xs text-ivory hover:bg-velvet"
            data-admin-filter-reset
          >
            Reset
          </button>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Tests** `AdminTableFilters.test.tsx`:
  - Renders only slots provided (user-only / type-only / etc).
  - Input change fires onChange.
  - Reset button calls onReset.

- [ ] **Step 3: NEW `AdminPagination.tsx`** — prev/next + page indicator:

  ```tsx
  import type { JSX } from 'react';

  interface Props {
    page: number; // 1-indexed
    pageSize: number;
    totalRows: number;
    onChange: (page: number) => void;
  }

  export default function AdminPagination({
    page,
    pageSize,
    totalRows,
    onChange,
  }: Props): JSX.Element {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const start = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(totalRows, page * pageSize);
    const canPrev = page > 1;
    const canNext = page < totalPages;
    return (
      <div
        className="flex items-center justify-between gap-3 pt-3 text-xs text-ivory/55"
        data-admin-pagination
      >
        <span data-admin-pagination-summary>
          {start}-{end} of {totalRows.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onChange(page - 1)}
            className="rounded-md border border-brass/60 px-2 py-1 disabled:opacity-40"
            data-admin-pagination-prev
          >
            ← Prev
          </button>
          <span className="font-mono tabular-nums text-ivory" data-admin-pagination-page>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onChange(page + 1)}
            className="rounded-md border border-brass/60 px-2 py-1 disabled:opacity-40"
            data-admin-pagination-next
          >
            Next →
          </button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Tests** `AdminPagination.test.tsx`:
  - Summary + page indicator render correctly.
  - Prev disabled on page 1; Next disabled on last page.
  - Click fires onChange with correct page.
  - `totalRows=0` renders `0-0 of 0` and disables both buttons.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/components/admin/{AdminTableFilters,AdminPagination}.{tsx,test.tsx}
  git commit -m "feat(ui): AdminTableFilters + AdminPagination primitives"
  ```

### Task D.3 — `AdminAuditPage` retrofit

- [ ] **Step 1: Rewrite** to use filters + pagination:

  ```tsx
  import type { JSX } from 'react';
  import { useLiveQuery } from 'dexie-react-hooks';
  import { useMemo } from 'react';
  import { Link } from 'react-router';
  import { db } from '@/db';
  import type { Adjustment } from '@/db';
  import AdminTableFilters from '@/components/admin/AdminTableFilters';
  import AdminPagination from '@/components/admin/AdminPagination';
  import { useAdminTableState } from '@/components/admin/useAdminTableState';
  import { rangeToSinceMs } from '@/components/admin/DateRangeFilter';

  type AuditRow = Adjustment & { username: string };

  const PAGE_SIZE = 25;
  const EMPTY_ROWS: AuditRow[] = [];

  const TYPE_OPTIONS = [
    { value: 'credit-adjust', label: 'Credit adjust' },
    { value: 'ban', label: 'Ban' },
    { value: 'unban', label: 'Unban' },
  ];

  function inferType(reason: string): string {
    // The Adjustment row doesn't carry an explicit type; infer from reason
    // prefix per existing convention. Adjust as needed once the type field
    // is added in a future schema bump.
    const lower = reason.toLowerCase();
    if (lower.includes('ban')) return lower.includes('unban') ? 'unban' : 'ban';
    return 'credit-adjust';
  }

  export default function AdminAuditPage(): JSX.Element {
    const { state, setState } = useAdminTableState({ page: 1, range: 'all' });
    const sinceMs = useMemo(() => rangeToSinceMs(state.range), [state.range]);

    const allRows: AuditRow[] = useLiveQuery(
      async (): Promise<AuditRow[]> => {
        const adjustments = await db.adjustments.toArray();
        adjustments.sort((a, b) => b.adjustedAt - a.adjustedAt);
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
      EMPTY_ROWS,
    );

    // Apply filters in-memory.
    const filtered = useMemo(() => {
      let rows = allRows;
      if (sinceMs !== undefined) rows = rows.filter((r) => r.adjustedAt > sinceMs);
      if (state.user) {
        const needle = state.user.toLowerCase();
        rows = rows.filter((r) => r.username.toLowerCase().includes(needle));
      }
      if (state.type) {
        rows = rows.filter((r) => inferType(r.reason) === state.type);
      }
      if (state.search) {
        const needle = state.search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.reason.toLowerCase().includes(needle) || r.username.toLowerCase().includes(needle),
        );
      }
      return rows;
    }, [allRows, sinceMs, state.user, state.type, state.search]);

    const pageStart = (state.page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    function handleReset(): void {
      setState({ page: 1, user: '', type: '', range: 'all', search: '' });
    }

    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-base tracking-wider text-gold-bright">
          ADJUSTMENTS · {filtered.length}
        </h1>

        <AdminTableFilters
          user={{
            value: state.user,
            onChange: (v) => setState({ user: v, page: 1 }),
            placeholder: 'Username',
          }}
          type={{
            value: state.type,
            options: TYPE_OPTIONS,
            onChange: (v) => setState({ type: v, page: 1 }),
          }}
          range={{ value: state.range, onChange: (r) => setState({ range: r, page: 1 }) }}
          search={{
            value: state.search,
            onChange: (v) => setState({ search: v, page: 1 }),
            placeholder: 'Reason or username',
          }}
          onReset={handleReset}
        />

        {pageRows.length === 0 ? (
          <p className="py-4 text-center text-xs text-ivory/40">
            No adjustments match the current filters.
          </p>
        ) : (
          <table className="w-full text-left text-sm" data-admin-audit-table>
            <thead>
              <tr className="border-b border-brass/30 text-xs uppercase tracking-wider text-ivory/40">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-brass/10">
                  <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                    {new Date(r.adjustedAt).toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2 pr-3 text-ivory">
                    <Link to={`/admin/users/${r.userId}`} className="hover:text-gold-bright">
                      {r.username}
                    </Link>
                  </td>
                  <td
                    className={[
                      'py-2 pr-3 font-mono tabular-nums',
                      r.amount >= 0 ? 'text-chip-win' : 'text-casino-red',
                    ].join(' ')}
                  >
                    {r.amount >= 0 ? '+' : ''}
                    {r.amount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-ivory/85">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <AdminPagination
          page={state.page}
          pageSize={PAGE_SIZE}
          totalRows={filtered.length}
          onChange={(p) => setState({ page: p })}
        />
      </div>
    );
  }
  ```

- [ ] **Step 2: Update `AdminAuditPage.test.tsx`:**
  - Seed ~30 adjustments across 5 users.
  - Assert pagination renders + clicking next moves to page 2.
  - Assert user filter narrows results.
  - Assert search filter narrows results.
  - Assert URL query params update on filter change.
  - Assert reset button clears all filters.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/pages/admin/AdminAuditPage.{tsx,test.tsx}
  git commit -m "feat(admin): AdminAuditPage filter + search + paginate with URL state"
  ```

### Task D.4 — `AdminSessionsPage` retrofit

Same pattern as D.3 but no `type` filter (sessions are uniform). Search filter on username only.

- [ ] **Step 1: Rewrite** using same primitives. Adjust `inferType` removal; filter on `loginAt > sinceMs` and `username.toLowerCase().includes(state.user.toLowerCase())` and `state.search` against username.
- [ ] **Step 2: Update test** with seeded sessions fixture.
- [ ] **Step 3: Commit.**
  ```bash
  git add src/pages/admin/AdminSessionsPage.{tsx,test.tsx}
  git commit -m "feat(admin): AdminSessionsPage filter + search + paginate with URL state"
  ```

### Task D.5 — Performance pass

- [ ] **Step 1: Seed a realistic DB** via a one-off Node script `/tmp/seed-admin-perf.mjs`:
  - 50 users
  - 5,000 rounds spread across all games
  - 100 adjustments
  - 200 sessions

- [ ] **Step 2: Start dev + measure first paint** via Playwright on each admin page. Record ms.

- [ ] **Step 3: If any page > 500 ms**, add `@tanstack/react-virtual` to the offending table. Otherwise document the measurements in the PR description and skip.

### Task D.6 — Visual verification

- [ ] **Step 1:** Screenshot AdminAuditPage with filters applied + pagination on page 2.
- [ ] **Step 2:** Screenshot AdminSessionsPage with filters applied.

### Task D.7 — Full DoD + open PR

- [ ] **Step 1: Full DoD.**
- [ ] **Step 2: Push + open PR.** Title: `phase-15(#14) PR D: Audit + Sessions filter/search/paginate + perf` (~70 chars).

---

## Self-review

**Spec coverage:**

- §4.2 AdminLayout + AdminOverviewPage → PR A
- §4.3 DateRangeFilter primitive + 8 page retrofit + aggregator extensions → PR B
- §4.4 Cross-game leaderboard at `/admin/leaderboard` with 4 boards + filter → PR C
- §4.5 AdminAuditPage + AdminSessionsPage filter+search+paginate via shared primitives → PR D

**Placeholder scan:** None. Every step has explicit code or commands.

**Type consistency:** `RangePreset`, `TopGameRow`, `DailyActivityPoint`, `RecentAdjustmentRow`, `LeaderboardWinnerRow`, `LeaderboardVolumeRow`, `LeaderboardSingleWinRow`, `LeaderboardStreakRow`, `AdminTableState`, `AdminTableStateDefaults` defined once + reused.

**Risks carried forward:** All spec §6 risks have explicit task coverage:

- AdminLayout `min-h-screen` trap → A.1
- DateRangeFilter wide diff → B.3 split into 3 commits to keep diffs reviewable
- `getLeaderboardLongestStreaks` walk → C.1 with explicit O(N×R) note + acceptable scale
- URL query params → D.1 uses `useSearchParams` exclusively
- Existing AdminOverviewPage tests → A.4 Step 5 flips assertions
- Per-page `localStorage` keys → B.3 uses `admin.<game>.range` consistently

---
