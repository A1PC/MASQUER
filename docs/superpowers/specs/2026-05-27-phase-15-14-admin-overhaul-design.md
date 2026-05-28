# Phase 15 sub-project #14 — Admin overhaul

**Status:** Spec
**Author:** Developer + Claude (assistant)
**Date:** 2026-05-27
**Phase:** 15 (Polish & Overhaul) · MASQUER cross-cutting · penultimate sub-project before #15 Final integration
**Scope:** Admin suite at `src/pages/admin/` + supporting aggregations in `src/systems/stats.ts` + new shared admin primitives in `src/components/admin/`

---

## 1. Goal

Elevate the admin suite with cross-cutting improvements that don't fit any single per-game scope. Per-game admin pages (#4-#13) are already consistent via the 4-StatCards + chart + recent-table pattern locked in #236-#258. #14 adds:

1. **AdminLayout MASQUER chrome retrofit** — currently uses pre-MASQUER tokens (`bg-felt-deep`, `text-white`, `border-gold/40`, `min-h-screen`); needs brand-token alignment matching every other page.
2. **AdminOverviewPage upgrade** — cross-game stats, top-game leaderboard, daily activity sparkline, recent admin-actions feed.
3. **Date-range filtering** on every game admin page via a shared `<DateRangeFilter>` primitive (7d / 30d / 90d / All preset only).
4. **Cross-game player leaderboard** at NEW `/admin/leaderboard` — admin-side view of top winners / volume / biggest single wins / longest streaks.
5. **Audit + Sessions** filter + search + paginate with URL query-param state.

Closing this sub-project leaves only **#15 Final integration & launch polish** in Phase 15.

## 2. Non-goals

Out of scope (deferred):

- Real-time admin updates (WebSocket / SSE) — admin sees data on refresh
- Admin role-based permissions (single `admin/admin12345` per ADR-0034)
- Admin chat / notes between admins
- Bulk operations on users (mass ban, mass credit)
- Custom date range picker (calendar widget) — preset 4 options only
- CSV / JSON export of audit logs — deferred to #15 if needed
- Admin-side adjustment workflow improvements (`AdjustCreditsModal` left as-is)
- Per-admin activity attribution beyond the existing `adjustments.adminId` field

Pure logic in `src/systems/{auth,wallet,rng,...}.ts` byte-stable. Aggregations in `src/systems/stats.ts` are **additive only** — existing fns get optional `sinceMs?: number` arg appended; new fns added.

## 3. Locked design decisions

1. **4 PRs full overhaul** — PR A = Layout + Overview, PR B = DateRangeFilter, PR C = Cross-game leaderboard, PR D = Audit/Sessions filter+search+paginate + perf.
2. **Cross-game leaderboard at NEW `/admin/leaderboard`** page with tabbed UI (Top winners / Top by volume / Biggest single win / Longest win streak).
3. **Audit/Sessions filter+search+paginate** without CSV export. Filter dimensions: user / action type / date range. Search: free text (username or note). Pagination: 25 rows/page with prev/next. State in URL query params.

Implicit defaults:

- **Date range presets**: 7d / 30d / 90d / All. No custom picker.
- **Filter state persistence**: `localStorage` per-page key (e.g., `admin.plinko.range`) for the date-range filter; URL query params for Audit/Sessions filters.

## 4. Architecture

### 4.1 PR decomposition

| PR                             | Scope                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **A — Layout + Overview**      | AdminLayout chrome retrofit + AdminOverviewPage upgrade                                                                     |
| **B — DateRangeFilter**        | NEW `<DateRangeFilter>` primitive + retrofit 9 game admin pages + extend `stats.ts` aggregators with optional `sinceMs` arg |
| **C — Cross-game leaderboard** | NEW `/admin/leaderboard` page with 4 tabbed boards                                                                          |
| **D — Audit/Sessions + perf**  | Filter + search + paginate on AdminAuditPage + AdminSessionsPage via shared primitives; performance pass                    |

Dispatch order: A → (B + C in parallel) → D. PR C can use `<DateRangeFilter>` from PR B if B merges first; otherwise C ships without filter and gets one as a follow-up.

### 4.2 PR A — Layout + Overview

**`AdminLayout.tsx` retrofit:**

- Root container: `flex h-full flex-col bg-felt-table text-ivory` (drops `min-h-screen` per [[masquer-min-h-screen-in-pages]]; the AppLayout's `<main>` is the scrollable container).
- Top-bar (already exists as part of layout): `bg-velvet-deep border-b border-brass/60`. Title `MASQUER · Admin` (font-display tracking-[0.18em] text-gold-bright). Logout button right-aligned, brand-tokened secondary (`border border-brass/60 text-ivory hover:bg-velvet`).
- Sidebar:
  - `bg-velvet-deep border-r border-brass/60` chrome
  - `"ADMIN"` heading `font-display text-xs tracking-[0.2em] text-gold-bright`
  - Each nav item: `border-l-[3px] px-4 py-2 text-xs`
    - Active: `border-brass bg-velvet text-gold-bright`
    - Inactive: `border-transparent text-ivory/55 hover:bg-velvet/50`
- Body wrapper: `<main className="flex-1 overflow-auto p-6">` (the inner scrollable area).

**`AdminOverviewPage.tsx` upgrade:**

Existing components retained:

- 4 StatCards row (Users · Total wagered · Total paid out · Net house) — keep but switch to `text-gold-bright`.
- `NetFlowLine` (last 30 days)
- `WinnersLosersBar`
- `GameDistributionDonut`

New sections (between StatCards and existing charts):

- **TOP GAMES BY SESSIONS** — 3 mini-StatCards in a row: top 3 games by total sessions played. Each card shows: game label + sessions count + house net for that game (green positive / red negative).
- **ACTIVITY (LAST 14 DAYS)** — sparkline chart of sessions per day, no axis labels, brand-tokened.
- **RECENT ADMIN ACTIONS** — vertical list of last 10 entries from the `adjustments` table. Each row: `admin · "credit-adjust" / "ban" / etc · target user · ±amount · timestamp`.

New aggregations in `src/systems/stats.ts`:

```ts
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
  date: string;
  sessions: number;
}
export interface RecentAdminAction {
  playedAt: number;
  admin: string;
  targetUser: string;
  type: 'credit-adjust' | 'ban' | 'unban';
  amount: number | null;
  note: string | null;
}

export async function getTopGamesBySessions(limit: number): Promise<TopGameRow[]>;
export async function getDailyActivity(days: number): Promise<DailyActivityPoint[]>;
export async function getRecentAdminActions(limit: number): Promise<RecentAdminAction[]>;
```

NEW chart wrapper: `src/components/charts/DailyActivitySparkline.tsx` — small Recharts line chart, brand-tokened, no axes, `ChartTooltipShell` for tooltip.

### 4.3 PR B — DateRangeFilter

**`<DateRangeFilter>` primitive** at `src/components/admin/DateRangeFilter.tsx`:

```ts
export type RangePreset = '7d' | '30d' | '90d' | 'all';
export interface DateRangeFilterProps {
  value: RangePreset;
  onChange: (next: RangePreset) => void;
  /** localStorage key for persistence. If provided, the hook persists value across mounts. */
  storageKey?: string;
}

/** Convert preset → ms epoch threshold. `all` returns `undefined`. */
export function rangeToSinceMs(preset: RangePreset): number | undefined;
```

UI: 4 tab buttons in a row. Active: `font-display text-gold-bright border-b-2 border-brass`. Inactive: `text-ivory/55 hover:text-ivory/80`.

**Aggregator extensions in `stats.ts`** — every per-game `getXAllTimeStats()` gets an optional `sinceMs?: number` arg:

```ts
// Before
export async function getPokerAllTimeStats(variant?: PokerVariant): Promise<PokerAllTimeStats>;
// After
export async function getPokerAllTimeStats(
  variant?: PokerVariant,
  sinceMs?: number,
): Promise<PokerAllTimeStats>;
```

Inside each aggregator: filter `rounds.where('playedAt').above(sinceMs)` before reducing. `undefined` sinceMs preserves existing all-time behavior (back-compatible).

**Page integration pattern** (mechanical retrofit on each of the 9 admin pages):

```tsx
const [range, setRange] = useState<RangePreset>('all');
const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);
const stats = useLiveQuery(() => getXAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
// …above the StatCards:
<DateRangeFilter value={range} onChange={setRange} storageKey="admin.plinko.range" />;
```

Aggregations also flow through to the hero charts / recent tables where the page filters those too (`recentRounds.filter(r => sinceMs ? r.playedAt > sinceMs : true)`).

### 4.4 PR C — Cross-game leaderboard

NEW `src/pages/admin/AdminLeaderboardPage.tsx` with 4 tabbed boards:

| Tab                    | Source                                                                    | Top columns                                 |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| **Top winners**        | All rounds; group by user; sort by `sum(netChange)` desc                  | rank · username · net chips · rounds played |
| **Top by volume**      | All rounds; group by user; sort by `sum(betAmount)` desc                  | rank · username · total wagered · rounds    |
| **Biggest single win** | All rounds; sort by `netChange` desc                                      | rank · username · game · payout · timestamp |
| **Longest win streak** | All rounds; walk per-user chronologically; longest run of `netChange > 0` | rank · username · streak length · game      |

Each board: 25 rows. Tabbed UI similar to `/admin/poker`'s variant tabs.

If PR B has merged: each tab respects `<DateRangeFilter>` (preset persisted to `admin.leaderboard.<tab>.range`).
If PR C ships before PR B: omit the filter and add it in a follow-up after PR B merges.

New aggregations in `stats.ts`:

```ts
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
  playedAt: number;
}
export interface LeaderboardStreakRow {
  username: string;
  streakLength: number;
  game: string;
}

export async function getLeaderboardTopWinners(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardWinnerRow[]>;
export async function getLeaderboardTopVolume(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardVolumeRow[]>;
export async function getLeaderboardBiggestSingleWins(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardSingleWinRow[]>;
export async function getLeaderboardLongestStreaks(
  limit: number,
  sinceMs?: number,
): Promise<LeaderboardStreakRow[]>;
```

Note: `LeaderboardPage.tsx` (player-side) already exists with per-game boards — different audience + scope. The admin leaderboard is cross-game + global.

Router: `const AdminLeaderboardPage = lazy(() => import('@/pages/admin/AdminLeaderboardPage'));` + route `/admin/leaderboard`.
AdminLayout: nav entry inserted after `Sessions`.

### 4.5 PR D — Audit/Sessions + perf

**Shared primitives** at `src/components/admin/`:

- **`AdminTableFilters.tsx`** — composable filter row:

  ```tsx
  interface Props {
    userFilter?: { value: string; onChange: (v: string) => void };
    typeFilter?: { value: string; options: string[]; onChange: (v: string) => void };
    rangeFilter?: { value: RangePreset; onChange: (r: RangePreset) => void };
    searchTerm?: { value: string; onChange: (s: string) => void; placeholder: string };
  }
  ```

  Each filter conditionally rendered. User-filter renders as a typeahead pulling from `users` table.

- **`AdminPagination.tsx`** — prev/next + page indicator:

  ```tsx
  interface Props {
    page: number; // 1-indexed
    pageSize: number;
    totalRows: number;
    onChange: (page: number) => void;
  }
  ```

- **`useAdminTableState.ts`** hook — URL query-param state:
  ```ts
  export function useAdminTableState(defaults: {
    page?: number;
    user?: string;
    type?: string;
    range?: RangePreset;
    search?: string;
  }): {
    state: { page: number; user: string; type: string; range: RangePreset; search: string };
    setState: (patch: Partial<typeof state>) => void;
  };
  ```
  Reads/writes via `useSearchParams` from react-router.

**AdminAuditPage** uses all 4 filters + pagination. Filters: user, action type (`ban`/`unban`/`credit-adjust`), date range, search (note + username fuzzy).

**AdminSessionsPage** uses 3 filters + pagination. Filters: user, date range, search (username fuzzy). No action-type filter — sessions are uniform.

**Performance pass:**

- Measure first paint on a seeded DB (~5000 rounds, ~50 users). If any admin page > 500 ms first paint, add virtualisation via `@tanstack/react-virtual` on long lists.
- Audit + Sessions at 25/page is naturally bounded; no virt needed.

## 5. Standing rules

Per `PHASE_15_PATTERNS.md §2`:

1. **Pure logic untouched.** `src/systems/{auth,wallet,rng}.ts` byte-stable. `stats.ts` is **additive only** (new fns + optional args on existing fns).
2. **Games sandbox preserved.** Admin code under `src/pages/admin/**` may read from `src/db/**` / `src/store/**` / `src/systems/**`.
3. **Integer money. No `Math.random()`.** ESLint enforces.
4. **Spec-first.** BUILD_GUIDE §9 amendment in PR A's first commit (Phase 9 admin section gets a Phase 15 #14 amendment note).
5. **No CLAUDE.md edits.**
6. **TS strict + exactOptionalPropertyTypes.**
7. **Commit subject ≤ 100 chars.**
8. **Scopes:** `admin` (page-level), `stats` (aggregations), `routing` (router/nav), `ui` (shared admin primitives), `docs` (BUILD_GUIDE).
9. **No `--no-verify`, no `--amend`.**
10. **DoD per PR:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`
11. **Tokens-only Tailwind** in rebuilt files.
12. **AdminLayout root: `flex h-full flex-col`, NEVER `min-h-screen`** (per [[masquer-min-h-screen-in-pages]]).
13. **Visual verification via Playwright at 1440×900 before pushing each PR** (per [[masquer-screenshot-before-pushing-ui]]).
14. **`useLiveQuery` inferred-Promise pattern** — no explicit generic (Phase 9 trap).
15. **Recharts uses `ChartTooltipShell`** — never the default `contentStyle` (per #251 pattern).

## 6. Risks + watch-outs

- **AdminLayout `min-h-screen` may be load-bearing.** Verify how admin pages are mounted (`RequireAdmin` wrapper). `flex h-full flex-col` should work; test by stepping through each admin page after PR A.
- **DateRangeFilter retrofit is a wide diff** — 9 game admin pages touched + every page test updated for filter state. Mechanical but easy to typo. Test the aggregator's `sinceMs=undefined` path stays back-compatible by running full vitest after each page integration.
- **`getLeaderboardLongestStreaks` walks per-user history** — O(N×R). At realistic MASQUER scale (~50 users × ~100 rounds) this is fast. If profiling shows slowness at higher scale, cap to last 90 days.
- **URL query params** require careful encoding. Use `useSearchParams` from react-router; never parse `window.location.search` manually.
- **Existing AdminOverviewPage tests** pin specific text/charts — updates needed for new sections without regressing existing assertions.
- **Per-page `localStorage` keys** for date-range need a consistent naming scheme: `admin.<page>.range` (e.g. `admin.plinko.range`, `admin.poker.range`).

## 7. Definition of done

- All 4 PRs merged.
- AdminLayout looks like a peer of the rest of the MASQUER suite — brand tokens throughout, no `min-h-screen`.
- AdminOverviewPage shows the 3 new sections + existing charts/StatCards.
- DateRangeFilter functional on all 9 game admin pages with preset persistence.
- `/admin/leaderboard` accessible from sidebar with 4 tabs populating from real data.
- AdminAuditPage + AdminSessionsPage have filter + search + paginate with URL query-param state.
- All Phase 15 standing rules respected; full DoD green per PR.
- Tag candidate: `v0.15.14-admin` after manual smoke. **After this, only #15 Final integration remains.**

## 8. Open questions

None at spec-write time. All key decisions locked during brainstorming.

## 9. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs.
3. **PR A** dispatched first (chrome unblocks visual review of B+C+D).
4. **PR B + PR C** dispatched in parallel after PR A merges.
5. **PR D** dispatched after B + C merge.
6. User says "start next" → controller starts **#15 Final integration** (the last sub-project).

---
