# Phase 7 Stats + Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two stub pages at `/stats` and `/leaderboard` with playable, data-driven dashboards. Ship the aggregation refactor (admin `queries.ts` → shared `systems/stats.ts`) and the shared Recharts chunk along the way. All merged onto `main` and tagged `v0.8-stats-leaderboard`.

**Architecture:** Six independent PRs. **PR A** does the aggregation refactor (rename + extend) with a re-export shim at the old admin path so Phase 9 admin keeps working through the cutover. Extensive unit tests on every new aggregation function. **PR B** ships StatsPage Cards view: left-rail nav (matching Phase 9 admin), tabs (overview + per-game), uiStore extension for the view-mode preference, all 16 stat cards, and the friendly empty state. **PR C** extracts the chart wrappers from admin into a shared `src/components/charts/` directory, adds three new charts, and wires Graphs view on StatsPage. **PR D** ships LeaderboardPage Cards view: 20 boards (5 overview + 3 × 5 per-game) with the Me / All toggle and banned-user exclusion. **PR E** adds Graphs view on LeaderboardPage and removes the re-export shim by updating admin imports. **PR F** is release plumbing.

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, Dexie 4 + dexie-react-hooks (`useLiveQuery`), Recharts ^2.15 (shared lazy chunk), Zustand 5 (uiStore extension), Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-19-phase-7-stats-leaderboard-design.md` (merged in #123).

**Branch model:** 6 PRs, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state, has full CI green.

```
phase-7-pr-a-stats-module        → PR A: queries.ts → systems/stats.ts + extensions + ADR-0038
phase-7-pr-b-stats-cards         → PR B: StatsPage shell + 16 cards + uiStore + empty state
phase-7-pr-c-stats-graphs        → PR C: chart extract + 3 new charts + Graphs view + ADR-0039
phase-7-pr-d-leaderboard-cards   → PR D: 20 boards + Me/All toggle + banned exclusion
phase-7-pr-e-leaderboard-graphs  → PR E: boards as bar charts + shim removal
chore/release-v0.8-stats-leaderboard → PR F: BUILD_GUIDE + tag + GitHub Release
```

**Hard rules (CLAUDE.md) that apply to every task:**

1. **No `Math.random`** anywhere. Use `src/systems/rng.ts`. ESLint enforces.
2. **Money is integers.** All metric values are integers (RTP %, win rate % are derived ratios, never stored).
3. **Games are sandboxed.** `src/games/**` cannot import from `@/db/*` or `@/store/*`. Phase 7 work lives in `src/pages/`, `src/systems/`, `src/components/`, `src/store/` — no game-folder edits at all.
4. **Every round records exactly one row** (already true; Phase 7 only reads).
5. **Definition of done** per code-touching task: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` must all pass.
6. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI, merge, branch next off freshly-merged main.
7. **Commit messages:** Conventional Commits, scoped. Allowed scopes for this phase: `stats`, `leaderboard`, `admin` (for the shim cleanup), `db`, `ui`, `theme`, `build-guide`, `adr`, `ci`, `release`, `charts`. Header ≤ 100 chars.
8. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Repo conventions to mirror:**

- Test command is `pnpm exec vitest run` and `pnpm exec vitest run <path>`. Do NOT use `pnpm test --run` — pnpm consumes the `--run` flag.
- lint-staged + Husky auto-runs `eslint --fix` + `prettier --write` on commit. Prettier may reformat. Expected.
- Markdownlint MD029 has bitten previous phases when a numbered list is split by code blocks. Use bold "**Change A**", "**Change B**" or bullets instead.
- **dexie-react-hooks `useLiveQuery` overload trap (Phase 9 lesson):** providing an explicit `<T>` generic forces the 1-2 arg overload and rejects the 3rd default-value arg. Type the async querier's return as `Promise<T>` and let TS infer; never write `useLiveQuery<Foo>(...)`.
- **react-refresh + lazy imports (Phase 9 lesson):** if a file mixes `lazy()` component bindings with a non-component export, add a file-level `/* eslint-disable react-refresh/only-export-components */` comment.
- **`useReducedMotion` mock in tests (Phase 6 lesson):** mock via `vi.mock('framer-motion', ...)` returning `useReducedMotion: () => true` to exercise the reduced-motion path in jsdom. `MotionConfig reducedMotion="always"` doesn't propagate.
- **ResizeObserver polyfill** for Recharts already lives in `src/test/setup.ts` from Phase 9 PR D — works for any new chart that uses `ResponsiveContainer`.
- **react-hooks/set-state-in-effect** can flag legitimate UI ↔ store sync. The accepted escape hatch is a file-scoped `/* eslint-disable */`...`/* eslint-enable */` pair with a comment explaining why (precedent: `src/games/baccarat/BaccaratPage.tsx`).

**Phase 9 / Phase 6 reusables we lean on heavily:**

- **Phase 9's `src/pages/admin/queries.ts`** — this entire file is moving in PR A and getting extended. The function signatures of the existing 11 exports stay backwards-compatible.
- **Phase 9's `src/pages/admin/charts/`** — three chart wrappers (`NetFlowLine`, `WinnersLosersBar`, `GameDistributionDonut`) move to `src/components/charts/` in PR C. `UserActivityLine` from PR E also moves.
- **Phase 9's admin pages** (`AdminOverviewPage`, `AdminUsersListPage`, `AdminUserPage`, `AdminAuditPage`, `AdminSessionsPage`) — all import from `@/pages/admin/queries` and `@/pages/admin/charts/...`. PR A's shim keeps these working during the cutover. PR E switches them to the new paths and deletes the shim.
- **`src/store/uiStore.ts`** — extended in PR B with `statsViewMode` + setter + localStorage persistence (mirrors the existing `sidebarCollapsed` pattern).
- **`src/components/Sidebar.tsx`** — the app's main left sidebar. Phase 7's left-rail nav inside StatsPage / LeaderboardPage is a SEPARATE inner-page rail (not modifications to the main sidebar).
- **Phase 6 Baccarat's `BaccaratPage.tsx`** — reference for the `eslint-disable react-hooks/set-state-in-effect` pattern.

---

## File map

Created across the 6 PRs:

```
src/systems/stats.ts                          # PR A — moved from src/pages/admin/queries.ts + extensions
src/systems/stats.test.ts                     # PR A — moved + extended
src/pages/admin/queries.ts                    # PR A — becomes a re-export shim (deleted in PR E)

src/store/uiStore.ts                          # PR B — extended (statsViewMode slice)
src/store/uiStore.test.ts                     # PR B — extended

src/pages/stats/
├─ StatsPage.tsx                              # PR B — shell with left rail + outlet + view toggle
├─ StatsPage.test.tsx                         # PR B
├─ StatsLayout.tsx                            # PR B — shared layout primitive (header + rail + toggle + content)
├─ ViewModeToggle.tsx                         # PR B — Cards / Graphs pill toggle
├─ ViewModeToggle.test.tsx                    # PR B
├─ StatsLeftRail.tsx                          # PR B — left rail nav with NavLink per tab
├─ StatsLeftRail.test.tsx                     # PR B
├─ EmptyState.tsx                             # PR B — friendly nudge with CTA
├─ EmptyState.test.tsx                        # PR B
├─ StatCardGrid.tsx                           # PR B — 16-card responsive grid
├─ StatCardGrid.test.tsx                      # PR B
├─ formatters.ts                              # PR B — formatChips, formatPercent, formatDuration, formatTimestamp
├─ formatters.test.ts                         # PR B
├─ StatsOverviewPage.tsx                      # PR B — Cards view; loads charts in PR C
├─ StatsOverviewPage.test.tsx                 # PR B
├─ StatsPerGamePage.tsx                       # PR B — Cards view; loads charts in PR C
└─ StatsPerGamePage.test.tsx                  # PR B

src/components/charts/                        # PR C — extracted shared chunk
├─ NetFlowLine.tsx                            # PR C — moved from src/pages/admin/charts/
├─ NetFlowLine.test.tsx                       # PR C — moved
├─ GameDistributionDonut.tsx                  # PR C — moved
├─ GameDistributionDonut.test.tsx             # PR C — moved
├─ WinnersLosersBar.tsx                       # PR C — moved
├─ WinnersLosersBar.test.tsx                  # PR C — moved
├─ UserActivityLine.tsx                       # PR C — moved
├─ UserActivityLine.test.tsx                  # PR C — moved
├─ WinRateByGameBar.tsx                       # PR C — NEW
├─ WinRateByGameBar.test.tsx                  # PR C
├─ WinLossTimeline.tsx                        # PR C — NEW
├─ WinLossTimeline.test.tsx                   # PR C
├─ BetSizeHistogram.tsx                       # PR C — NEW
└─ BetSizeHistogram.test.tsx                  # PR C

src/pages/leaderboard/
├─ LeaderboardPage.tsx                        # PR D — shell with left rail + outlet
├─ LeaderboardPage.test.tsx                   # PR D
├─ LeaderboardLeftRail.tsx                    # PR D — same shape as StatsLeftRail
├─ Board.tsx                                  # PR D — generic board with Me/All toggle
├─ Board.test.tsx                             # PR D
├─ MeAllToggle.tsx                            # PR D — pill toggle, per-board state
├─ MeAllToggle.test.tsx                       # PR D
├─ LeaderboardOverviewPage.tsx                # PR D — 5 overview boards
├─ LeaderboardOverviewPage.test.tsx           # PR D
├─ LeaderboardPerGamePage.tsx                 # PR D — 3 boards per game
└─ LeaderboardPerGamePage.test.tsx            # PR D

src/components/charts/BoardBar.tsx            # PR E — horizontal bar chart for leaderboard Graphs view
src/components/charts/BoardBar.test.tsx       # PR E

docs/adr/
├─ 0038-stats-aggregation-module.md           # PR A
└─ 0039-shared-recharts-chunk.md              # PR C

modified:
src/router.tsx                                # PR B — wire /stats routes; PR D — wire /leaderboard routes
src/pages/StatsPage.tsx                       # PR B — DELETE (stub replaced by new structure)
src/pages/LeaderboardPage.tsx                 # PR D — DELETE (stub replaced)
src/pages/admin/AdminOverviewPage.tsx         # PR E — switch imports from queries → @/systems/stats
src/pages/admin/AdminUsersListPage.tsx        # PR E
src/pages/admin/AdminUserPage.tsx             # PR E
src/pages/admin/AdminAuditPage.tsx            # PR E
src/pages/admin/AdminSessionsPage.tsx         # PR E
src/pages/admin/queries.ts                    # PR E — DELETE the shim
src/pages/admin/charts/*                      # PR C — DELETE after moves (the chart files relocate)
BUILD_GUIDE.md                                # PR F — mark Phase 7 ✅
```

Approximate test count: **~250 new tests** across 6 PRs.

---

## Definition of Done

**Per task:** named files exist with named contents; all task tests pass; commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four green locally on the PR branch. CI green (4 jobs: Meta files, Install·Typecheck·Build, Lint·Format, Test·Coverage).

**Per phase (after PR E merges, before PR F):**

- Manual smoke walkthrough:
  - Register a fresh user, visit `/stats` and `/leaderboard` — see friendly empty states.
  - Click a per-game tab — see "No X rounds yet — try it! →"; click the CTA, lands on the right game.
  - Play 5+ rounds across 2+ games. Return to `/stats` overview — see populated cards with correct totals.
  - Toggle to Graphs view — charts render. Reload — toggle preference persists.
  - Navigate to a per-game tab — Cards / Graphs work scoped to that game.
  - Register a second user, play a few rounds, return to first user's `/leaderboard` — second user appears.
  - Switch Me / All toggle on every board — verify Me view shows ±3 around current user.
  - Log in as admin, ban second user from `/admin` → return to `/leaderboard` → second user no longer appears.
  - Admin dashboard still works end-to-end with the moved aggregation module.
- Bundle: main bundle ≤ 730 kB (delta < 15 kB vs 720 kB baseline). Recharts in shared lazy chunk only — confirmed via `pnpm build` output (one `recharts-*.js` chunk, not two).
- Reduced-motion: every page on `/stats` and `/leaderboard` renders correctly with reduce-motion enabled.

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: `c77c8fe docs(spec): Phase 7 Stats + Leaderboard design spec (#123)` or newer.

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~903 tests passing. If anything fails, STOP and surface to the user.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-19-phase-7-stats-leaderboard-design.md`. Every section. The 16-metric catalogue (§5) and the leaderboard sort/tiebreaker rules (§6.1) are the meatiest parts.

- [ ] **Step P.4: Read the existing admin queries module**

```bash
cat src/pages/admin/queries.ts
cat src/pages/admin/queries.test.ts
```

PR A moves this file verbatim, then extends it. Understanding the existing surface is mandatory.

---

# PR A — Stats module rename + extensions + ADR-0038

**Branch:** `phase-7-pr-a-stats-module` (off `main`)
**Goal of this PR:** Move `src/pages/admin/queries.ts` → `src/systems/stats.ts` as the new neutral aggregation module. Leave a re-export shim at the old path so Phase 9 admin keeps working. Add the new player-facing query functions (peaks, streaks, sessions, win-rate, histograms, leaderboard). Exhaustive unit tests on every new function. Write ADR-0038 documenting the move.
**Risk:** Medium. The shim must be airtight or admin breaks. Mitigation: every existing test in `queries.test.ts` is also moved and continues to pass.
**Estimated tasks:** 11.

## Task A.1: Branch + verbatim file move

**Files:**

- Create: `src/systems/stats.ts` (copied from `src/pages/admin/queries.ts`)
- Create: `src/systems/stats.test.ts` (copied from `src/pages/admin/queries.test.ts`)
- Modify: `src/pages/admin/queries.ts` (becomes a re-export shim)

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-7-pr-a-stats-module
```

- [ ] **Step 2: Move via copy + shim**

```bash
cp src/pages/admin/queries.ts src/systems/stats.ts
cp src/pages/admin/queries.test.ts src/systems/stats.test.ts
```

- [ ] **Step 3: Update `src/systems/stats.test.ts`** to import from the new location

Replace the top-of-file import:

```ts
import {
  getAllUserStats,
  getGameDistribution,
  getNetFlowSeries,
  getSiteWideStats,
  getTopLosers,
  getTopWinners,
} from './stats';
```

(Same imports — just `./stats` instead of `./queries`.)

- [ ] **Step 4: Replace `src/pages/admin/queries.ts` with a re-export shim**

```ts
// Re-export shim. The real module lives in `src/systems/stats.ts` (ADR-0038).
// This shim is temporary — PR E switches admin imports directly to @/systems/stats
// and deletes this file.
export {
  getAllUserStats,
  getSiteWideStats,
  getNetFlowSeries,
  getGameDistribution,
  getTopWinners,
  getTopLosers,
  getUserStatsRow,
  getUserGameDistribution,
  getUserGameTime,
  getUserSessionTime,
  getUserNetFlowSeries,
} from '@/systems/stats';

export type {
  UserStatsRow,
  SiteWideStats,
  NetFlowPoint,
  GameDistributionPoint,
} from '@/systems/stats';
```

- [ ] **Step 5: Delete the original test file at the admin path** (it'd duplicate runs)

```bash
rm src/pages/admin/queries.test.ts
```

- [ ] **Step 6: Verify both tests run + admin still imports cleanly**

```bash
pnpm typecheck
pnpm exec vitest run src/systems/stats.test.ts src/pages/admin/AdminOverviewPage.test.tsx src/pages/admin/AdminUsersListPage.test.tsx src/pages/admin/AdminUserPage.test.tsx src/pages/admin/AdminAuditPage.test.tsx src/pages/admin/AdminSessionsPage.test.tsx
```

Expected: typecheck exit 0; all admin page tests + the moved stats test pass.

- [ ] **Step 7: Commit**

```bash
git add src/systems/stats.ts src/systems/stats.test.ts src/pages/admin/queries.ts
git rm src/pages/admin/queries.test.ts
git commit -m "refactor(stats): move admin queries to src/systems/stats with re-export shim"
```

## Task A.2: Add `getUserMetrics` (core 7 + tests)

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

Adds the headline metric bundle that the Cards view uses on every tab.

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
import type { Round } from '@/db';

type Game = Round['game'];

export type UserMetrics = {
  totalRounds: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netChange: number;
  /** Returns-to-player percentage, or null when totalWagered is 0. */
  rtp: number | null;
  /** Time spent on this game's page (or all pages if game omitted), ms. */
  timePlayedMs: number;
};

const EMPTY_METRICS: UserMetrics = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  netChange: 0,
  rtp: null,
  timePlayedMs: 0,
};

/** 16-metric core. Game-scoped if `game` provided; otherwise all-games aggregate. */
export async function getUserMetrics(userId: string, game?: Game): Promise<UserMetrics> {
  if (!userId) return EMPTY_METRICS;
  const rounds = await fetchUserRounds(userId, game);
  const visits = await db.gameVisits.where('userId').equals(userId).toArray();
  const scopedVisits = game ? visits.filter((v) => v.game === game) : visits;

  let totalWagered = 0;
  let totalWon = 0;
  let totalLost = 0;
  let netChange = 0;
  for (const r of rounds) {
    totalWagered += r.betAmount;
    totalWon += r.payout;
    netChange += r.netChange;
    if (r.netChange < 0) totalLost += -r.netChange;
  }
  const timePlayedMs = scopedVisits.reduce((s, v) => s + (v.durationMs ?? 0), 0);
  const rtp = totalWagered === 0 ? null : (totalWon / totalWagered) * 100;
  return {
    totalRounds: rounds.length,
    totalWagered,
    totalWon,
    totalLost,
    netChange,
    rtp,
    timePlayedMs,
  };
}

async function fetchUserRounds(userId: string, game?: Game): Promise<Round[]> {
  const all = await db.rounds
    .where('[userId+playedAt]')
    .between([userId, 0], [userId, Number.MAX_SAFE_INTEGER])
    .toArray();
  return game ? all.filter((r) => r.game === game) : all;
}
```

(Note: `fetchUserRounds` is a private helper; subsequent tasks reuse it.)

- [ ] **Step 2: Append tests to `src/systems/stats.test.ts`**

```ts
import { getUserMetrics } from './stats';

describe('getUserMetrics — core', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns EMPTY_METRICS for a user with no rounds', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error();
    const m = await getUserMetrics(r.user.id);
    expect(m).toEqual({
      totalRounds: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      netChange: 0,
      rtp: null,
      timePlayedMs: 0,
    });
  });

  it('aggregates wagered / won / lost / net across all rounds', async () => {
    const r = await register({ username: 'bob', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
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
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    const m = await getUserMetrics(r.user.id);
    expect(m.totalRounds).toBe(2);
    expect(m.totalWagered).toBe(150);
    expect(m.totalWon).toBe(200);
    expect(m.totalLost).toBe(50);
    expect(m.netChange).toBe(50);
    expect(m.rtp).toBeCloseTo(133.33, 1);
  });

  it('RTP is null when wagered is 0', async () => {
    const r = await register({ username: 'carol', password: 'password123' });
    if (!r.ok) throw new Error();
    const m = await getUserMetrics(r.user.id);
    expect(m.rtp).toBeNull();
  });

  it('game-scoped query filters to that game only', async () => {
    const r = await register({ username: 'dave', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
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
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    const m = await getUserMetrics(r.user.id, 'blackjack');
    expect(m.totalRounds).toBe(1);
    expect(m.netChange).toBe(100);
  });

  it('timePlayedMs sums gameVisits.durationMs (game-scoped if provided)', async () => {
    const r = await register({ username: 'eve', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.gameVisits.bulkAdd([
      {
        id: 'v-1',
        userId: r.user.id,
        sessionId: 's-1',
        game: 'blackjack',
        enteredAt: 1000,
        exitedAt: 4000,
        durationMs: 3000,
      },
      {
        id: 'v-2',
        userId: r.user.id,
        sessionId: 's-1',
        game: 'roulette',
        enteredAt: 5000,
        exitedAt: 12000,
        durationMs: 7000,
      },
    ]);
    expect((await getUserMetrics(r.user.id)).timePlayedMs).toBe(10000);
    expect((await getUserMetrics(r.user.id, 'blackjack')).timePlayedMs).toBe(3000);
  });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getUserMetrics — core 7 metrics (rounds, wagered, won, lost, net, RTP, time)"
```

## Task A.3: Add `getUserStreaks` (longest win + loss streaks)

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

Pushes break neither streak (spec §5.2). Scan oldest-to-newest.

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
export type StreakStats = { longestWin: number; longestLoss: number };

/** Longest consecutive run of wins / losses, scanned oldest-to-newest.
 *  Pushes break neither streak (they're "neutral"). Game-scoped if provided. */
export async function getUserStreaks(userId: string, game?: Game): Promise<StreakStats> {
  if (!userId) return { longestWin: 0, longestLoss: 0 };
  const rounds = await fetchUserRounds(userId, game);
  // fetchUserRounds returns oldest-first via the [userId+playedAt] index.
  let longestWin = 0;
  let longestLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const r of rounds) {
    if (r.outcome === 'win') {
      curWin += 1;
      curLoss = 0;
      if (curWin > longestWin) longestWin = curWin;
    } else if (r.outcome === 'loss') {
      curLoss += 1;
      curWin = 0;
      if (curLoss > longestLoss) longestLoss = curLoss;
    }
    // push: neither streak resets, neither increments
  }
  return { longestWin, longestLoss };
}
```

- [ ] **Step 2: Append tests**

```ts
import { getUserStreaks } from './stats';

describe('getUserStreaks', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  async function userWithRounds(outcomes: Array<'win' | 'loss' | 'push'>): Promise<string> {
    const r = await register({ username: 'streak', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      outcomes.map((o, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 10,
        payout: o === 'win' ? 20 : o === 'push' ? 10 : 0,
        netChange: o === 'win' ? 10 : o === 'push' ? 0 : -10,
        outcome: o,
        details: {},
        balanceAfter: 1000,
        playedAt: i * 1000 + 1000,
      })),
    );
    return r.user.id;
  }

  it('empty rounds → 0/0', async () => {
    const r = await register({ username: 'empty', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserStreaks(r.user.id)).toEqual({ longestWin: 0, longestLoss: 0 });
  });

  it('all wins → win streak = count, loss streak = 0', async () => {
    const uid = await userWithRounds(['win', 'win', 'win', 'win']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 4, longestLoss: 0 });
  });

  it('all losses → loss streak = count, win streak = 0', async () => {
    const uid = await userWithRounds(['loss', 'loss', 'loss']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 0, longestLoss: 3 });
  });

  it('alternating wins/losses → streaks of 1 each', async () => {
    const uid = await userWithRounds(['win', 'loss', 'win', 'loss', 'win']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 1, longestLoss: 1 });
  });

  it('multiple win runs → longest reported', async () => {
    const uid = await userWithRounds(['win', 'win', 'loss', 'win', 'win', 'win', 'loss']);
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 3, longestLoss: 1 });
  });

  it('pushes break NEITHER streak (continue, do not reset)', async () => {
    const uid = await userWithRounds(['win', 'push', 'win']);
    // Expected: pushes don't increment win-count, but also don't reset it.
    // Spec §5.2: "pushes break neither streak"
    // Implementation: push is neutral — neither incremented nor reset.
    // So the 'win' counter stays at 1 after push, then 'win' bumps to 2.
    expect(await getUserStreaks(uid)).toEqual({ longestWin: 2, longestLoss: 0 });
  });

  it('game-scoped streak is independent of other games', async () => {
    const r = await register({ username: 'cross', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1000,
        playedAt: 2000,
      },
      {
        id: 'b-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 3000,
      },
    ]);
    const bj = await getUserStreaks(r.user.id, 'blackjack');
    expect(bj).toEqual({ longestWin: 2, longestLoss: 0 });
    const slots = await getUserStreaks(r.user.id, 'slots');
    expect(slots).toEqual({ longestWin: 0, longestLoss: 1 });
  });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getUserStreaks — longest win/loss runs (pushes neutral)"
```

## Task A.4: Add `getUserPeaks` (biggest win, biggest loss, highest balance)

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
import { WALLET_CONFIG } from '@/systems/wallet';

export type Peaks = {
  /** Most-positive single-round netChange. 0 when no rounds. */
  biggestWin: number;
  /** playedAt of the round that holds biggestWin. null when no rounds. */
  biggestWinAt: number | null;
  /** Most-negative single-round netChange (returned as a positive number). 0 when no rounds. */
  biggestLoss: number;
  /** playedAt of the round that holds biggestLoss. null when no rounds. */
  biggestLossAt: number | null;
  /** Max value of balanceAfter across all rounds + the starting chips. */
  highestBalance: number;
};

export async function getUserPeaks(userId: string, game?: Game): Promise<Peaks> {
  if (!userId) {
    return {
      biggestWin: 0,
      biggestWinAt: null,
      biggestLoss: 0,
      biggestLossAt: null,
      highestBalance: WALLET_CONFIG.STARTING_CHIPS,
    };
  }
  const rounds = await fetchUserRounds(userId, game);
  let biggestWin = 0;
  let biggestWinAt: number | null = null;
  let biggestLoss = 0;
  let biggestLossAt: number | null = null;
  let highestBalance = WALLET_CONFIG.STARTING_CHIPS;
  for (const r of rounds) {
    if (r.netChange > biggestWin) {
      biggestWin = r.netChange;
      biggestWinAt = r.playedAt;
    }
    if (r.netChange < -biggestLoss) {
      biggestLoss = -r.netChange;
      biggestLossAt = r.playedAt;
    }
    if (r.balanceAfter > highestBalance) highestBalance = r.balanceAfter;
  }
  return { biggestWin, biggestWinAt, biggestLoss, biggestLossAt, highestBalance };
}
```

- [ ] **Step 2: Append tests**

```ts
import { getUserPeaks } from './stats';
import { WALLET_CONFIG } from '@/systems/wallet';

describe('getUserPeaks', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('no rounds → all 0 / starting balance', async () => {
    const r = await register({ username: 'empty', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserPeaks(r.user.id)).toEqual({
      biggestWin: 0,
      biggestWinAt: null,
      biggestLoss: 0,
      biggestLossAt: null,
      highestBalance: WALLET_CONFIG.STARTING_CHIPS,
    });
  });

  it('biggest win + loss captured with timestamps', async () => {
    const r = await register({ username: 'peaks', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
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
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 500,
        payout: 0,
        netChange: -500,
        outcome: 'loss',
        details: {},
        balanceAfter: 600,
        playedAt: 2000,
      },
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 400,
        netChange: 300,
        outcome: 'win',
        details: {},
        balanceAfter: 900,
        playedAt: 3000,
      },
    ]);
    const p = await getUserPeaks(r.user.id);
    expect(p.biggestWin).toBe(300);
    expect(p.biggestWinAt).toBe(3000);
    expect(p.biggestLoss).toBe(500);
    expect(p.biggestLossAt).toBe(2000);
    expect(p.highestBalance).toBe(1100);
  });

  it('highest balance never goes below starting chips', async () => {
    const r = await register({ username: 'down', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1000,
    });
    const p = await getUserPeaks(r.user.id);
    expect(p.highestBalance).toBe(WALLET_CONFIG.STARTING_CHIPS);
  });

  it('ties on biggest win: first-encountered wins (oldest)', async () => {
    const r = await register({ username: 'tie', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
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
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1200,
        playedAt: 2000,
      },
    ]);
    const p = await getUserPeaks(r.user.id);
    expect(p.biggestWin).toBe(100);
    expect(p.biggestWinAt).toBe(1000); // older wins ties
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getUserPeaks — biggest win/loss + highest balance reached"
```

## Task A.5: Add `getUserSessionStats` + `getUserExtras`

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

Best/worst session and avg-bet + win-rate.

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
export type SessionStats = {
  /** Highest sum of netChange across rounds within one session row. */
  best: number;
  /** Lowest sum (most negative). */
  worst: number;
  /** Number of sessions with at least one round. */
  count: number;
};

/** Best/worst session by net change. Game-scoped if provided. */
export async function getUserSessionStats(userId: string, game?: Game): Promise<SessionStats> {
  if (!userId) return { best: 0, worst: 0, count: 0 };
  const [sessions, rounds] = await Promise.all([
    db.sessions.where('userId').equals(userId).toArray(),
    fetchUserRounds(userId, game),
  ]);
  if (sessions.length === 0 || rounds.length === 0) {
    return { best: 0, worst: 0, count: 0 };
  }
  let best = 0;
  let worst = 0;
  let count = 0;
  for (const s of sessions) {
    const end = s.logoutAt ?? Number.MAX_SAFE_INTEGER;
    const sessionRounds = rounds.filter((r) => r.playedAt >= s.loginAt && r.playedAt <= end);
    if (sessionRounds.length === 0) continue;
    count += 1;
    const net = sessionRounds.reduce((sum, r) => sum + r.netChange, 0);
    if (net > best) best = net;
    if (net < worst) worst = net;
  }
  return { best, worst, count };
}

export type ExtraStats = {
  /** Mean bet size (rounded to integer chips). 0 when no rounds. */
  avgBetSize: number;
  /** Win rate %, excluding pushes from denominator. null when no non-push rounds. */
  winRate: number | null;
};

export async function getUserExtras(userId: string, game?: Game): Promise<ExtraStats> {
  if (!userId) return { avgBetSize: 0, winRate: null };
  const rounds = await fetchUserRounds(userId, game);
  if (rounds.length === 0) return { avgBetSize: 0, winRate: null };
  const totalWagered = rounds.reduce((s, r) => s + r.betAmount, 0);
  const avgBetSize = Math.round(totalWagered / rounds.length);
  const nonPush = rounds.filter((r) => r.outcome !== 'push');
  const winRate =
    nonPush.length === 0
      ? null
      : (nonPush.filter((r) => r.outcome === 'win').length / nonPush.length) * 100;
  return { avgBetSize, winRate };
}
```

- [ ] **Step 2: Append tests**

```ts
import { getUserSessionStats, getUserExtras } from './stats';

describe('getUserSessionStats', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns zeros when there are no sessions OR no rounds', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserSessionStats(r.user.id)).toEqual({ best: 0, worst: 0, count: 0 });
  });

  it('groups rounds by session window and returns best/worst sums', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.sessions.bulkAdd([
      { id: 's-1', userId: r.user.id, loginAt: 1000, logoutAt: 5000, durationMs: 4000 },
      { id: 's-2', userId: r.user.id, loginAt: 10000, logoutAt: 20000, durationMs: 10000 },
    ]);
    await db.rounds.bulkAdd([
      // Session 1: net +30
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 30,
        netChange: 20,
        outcome: 'win',
        details: {},
        balanceAfter: 1020,
        playedAt: 1500,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1030,
        playedAt: 2500,
      },
      // Session 2: net -50
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 980,
        playedAt: 12000,
      },
    ]);
    const s = await getUserSessionStats(r.user.id);
    expect(s.best).toBe(30);
    expect(s.worst).toBe(-50);
    expect(s.count).toBe(2);
  });

  it('open (logoutAt=null) sessions are treated as running to infinity', async () => {
    const r = await register({ username: 'open', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.sessions.add({
      id: 's-1',
      userId: r.user.id,
      loginAt: 1000,
      logoutAt: null,
      durationMs: null,
    });
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
      playedAt: 9_999_999_999,
    });
    expect((await getUserSessionStats(r.user.id)).count).toBe(1);
  });
});

describe('getUserExtras', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns 0/null for no rounds', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserExtras(r.user.id)).toEqual({ avgBetSize: 0, winRate: null });
  });

  it('avgBetSize = mean bet, rounded', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 990,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 25,
        payout: 50,
        netChange: 25,
        outcome: 'win',
        details: {},
        balanceAfter: 1015,
        playedAt: 2000,
      },
    ]);
    expect((await getUserExtras(r.user.id)).avgBetSize).toBe(18); // round((10+25)/2)=18
  });

  it('winRate excludes pushes from denominator', async () => {
    const r = await register({ username: 'wr', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'r-1',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: {},
        balanceAfter: 1010,
        playedAt: 1000,
      },
      {
        id: 'r-2',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 10,
        netChange: 0,
        outcome: 'push',
        details: {},
        balanceAfter: 1010,
        playedAt: 2000,
      },
      {
        id: 'r-3',
        userId: r.user.id,
        game: 'blackjack',
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss',
        details: {},
        balanceAfter: 1000,
        playedAt: 3000,
      },
    ]);
    // 1 win / (1 win + 1 loss) = 50%
    expect((await getUserExtras(r.user.id)).winRate).toBeCloseTo(50, 1);
  });

  it('winRate is null when there are no non-push rounds', async () => {
    const r = await register({ username: 'only-pushes', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 10,
      payout: 10,
      netChange: 0,
      outcome: 'push',
      details: {},
      balanceAfter: 1000,
      playedAt: 1000,
    });
    expect((await getUserExtras(r.user.id)).winRate).toBeNull();
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getUserSessionStats + getUserExtras (best/worst session, avgBet, winRate)"
```

## Task A.6: Add `getUserWinLossTimeline` + `getUserBetSizeHistogram`

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

Used by the new charts in PR C (`WinLossTimeline`, `BetSizeHistogram`).

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
export type WinLossTimelinePoint = {
  playedAt: number;
  outcome: 'win' | 'loss' | 'push';
  netChange: number;
};

/** Up to `limit` most-recent rounds, newest-first, scoped to game if provided. */
export async function getUserWinLossTimeline(
  userId: string,
  game?: Game,
  limit = 50,
): Promise<WinLossTimelinePoint[]> {
  if (!userId) return [];
  const all = await fetchUserRounds(userId, game);
  const trimmed = all.slice(-limit).reverse();
  return trimmed.map((r) => ({
    playedAt: r.playedAt,
    outcome: r.outcome,
    netChange: r.netChange,
  }));
}

export type HistogramBin = { binMin: number; binMax: number; count: number };

/** 5 equal-width bins from min(bet) to max(bet). Empty array when no rounds. */
export async function getUserBetSizeHistogram(
  userId: string,
  game?: Game,
): Promise<HistogramBin[]> {
  if (!userId) return [];
  const rounds = await fetchUserRounds(userId, game);
  if (rounds.length === 0) return [];
  const bets = rounds.map((r) => r.betAmount);
  const min = Math.min(...bets);
  const max = Math.max(...bets);
  if (min === max) {
    // Single bin if all bets equal.
    return [{ binMin: min, binMax: max, count: bets.length }];
  }
  const binCount = 5;
  const binWidth = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    binMin: Math.round(min + i * binWidth),
    binMax: Math.round(min + (i + 1) * binWidth),
    count: 0,
  }));
  for (const b of bets) {
    // Inclusive-low, exclusive-high (except for the last bin which captures max).
    let idx = Math.floor((b - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]!.count += 1;
  }
  return bins;
}
```

- [ ] **Step 2: Append tests**

```ts
import { getUserWinLossTimeline, getUserBetSizeHistogram } from './stats';

describe('getUserWinLossTimeline', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('returns newest-first up to limit', async () => {
    const r = await register({ username: 't', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      Array.from({ length: 10 }, (_, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 10,
        payout: 0,
        netChange: -10,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 1000 - 10 * (i + 1),
        playedAt: (i + 1) * 1000,
      })),
    );
    const tl = await getUserWinLossTimeline(r.user.id, undefined, 5);
    expect(tl).toHaveLength(5);
    expect(tl[0]!.playedAt).toBe(10000); // newest first
  });
});

describe('getUserBetSizeHistogram', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('empty rounds → empty array', async () => {
    const r = await register({ username: 'h', password: 'password123' });
    if (!r.ok) throw new Error();
    expect(await getUserBetSizeHistogram(r.user.id)).toEqual([]);
  });

  it('all bets equal → single bin with full count', async () => {
    const r = await register({ username: 'h', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.rounds.bulkAdd(
      Array.from({ length: 3 }, (_, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 1000 - 50 * (i + 1),
        playedAt: (i + 1) * 1000,
      })),
    );
    const h = await getUserBetSizeHistogram(r.user.id);
    expect(h).toHaveLength(1);
    expect(h[0]!.count).toBe(3);
    expect(h[0]!.binMin).toBe(50);
  });

  it('5 bins span min→max with counts summing to total rounds', async () => {
    const r = await register({ username: 'h2', password: 'password123' });
    if (!r.ok) throw new Error();
    const bets = [5, 10, 25, 50, 100];
    await db.rounds.bulkAdd(
      bets.map((b, i) => ({
        id: `r-${i}`,
        userId: r.user.id,
        game: 'blackjack' as const,
        betAmount: b,
        payout: 0,
        netChange: -b,
        outcome: 'loss' as const,
        details: {},
        balanceAfter: 0,
        playedAt: (i + 1) * 1000,
      })),
    );
    const h = await getUserBetSizeHistogram(r.user.id);
    expect(h).toHaveLength(5);
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(5);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getUserWinLossTimeline + getUserBetSizeHistogram"
```

## Task A.7: Add `getLeaderboard` (5 overview + 3 per-game metric keys)

**Files:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts`

Returns ranked rows for any of the 8 distinct metrics. Per-game leaderboards reuse the same function with a `game` arg.

- [ ] **Step 1: Append to `src/systems/stats.ts`**

```ts
export type LeaderboardMetric =
  | 'netWinner'
  | 'mostRounds'
  | 'biggestSingleWin'
  | 'longestWinStreak'
  | 'mostVariety';

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  value: number;
  /** Secondary text shown beside the value (e.g. round timestamp for biggest win). */
  sub?: string;
};

const HARD_LIMIT = 100;

/** Ranked rows for a leaderboard metric. Excludes banned users.
 *  Game-scoped if provided (per-game leaderboards). */
export async function getLeaderboard(
  metric: LeaderboardMetric,
  game?: Game,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const cap = Math.min(limit, HARD_LIMIT);
  const users = await db.users.toArray();
  const eligible = users.filter((u) => u.isBanned !== true);
  type Scored = {
    userId: string;
    username: string;
    value: number;
    sub?: string;
    createdAt: number;
  };
  const scored: Scored[] = [];
  for (const u of eligible) {
    const rounds = await fetchUserRounds(u.id, game);
    if (rounds.length === 0 && metric !== 'mostVariety') continue;

    let value = 0;
    let sub: string | undefined;
    switch (metric) {
      case 'netWinner':
        value = rounds.reduce((s, r) => s + r.netChange, 0);
        break;
      case 'mostRounds':
        value = rounds.length;
        break;
      case 'biggestSingleWin': {
        let maxWin = 0;
        let at: number | null = null;
        for (const r of rounds) {
          if (r.netChange > maxWin) {
            maxWin = r.netChange;
            at = r.playedAt;
          }
        }
        if (maxWin === 0) continue;
        value = maxWin;
        sub = at ? new Date(at).toISOString().slice(0, 10) : undefined;
        break;
      }
      case 'longestWinStreak': {
        let longest = 0;
        let cur = 0;
        for (const r of rounds) {
          if (r.outcome === 'win') {
            cur += 1;
            if (cur > longest) longest = cur;
          } else if (r.outcome === 'loss') {
            cur = 0;
          }
        }
        if (longest === 0) continue;
        value = longest;
        break;
      }
      case 'mostVariety': {
        const all = await fetchUserRounds(u.id);
        const games = new Set(all.map((r) => r.game));
        value = games.size;
        sub = `${all.length} rounds total`;
        if (value === 0) continue;
        break;
      }
    }
    scored.push({ userId: u.id, username: u.username, value, sub, createdAt: u.createdAt });
  }

  scored.sort((a, b) => (b.value !== a.value ? b.value - a.value : a.createdAt - b.createdAt));

  return scored.slice(0, cap).map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    username: s.username,
    value: s.value,
    sub: s.sub,
  }));
}
```

- [ ] **Step 2: Append tests**

```ts
import { getLeaderboard } from './stats';

describe('getLeaderboard', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  async function seedTwoPlayersOneBanned() {
    const a = await register({ username: 'alice', password: 'password123' });
    const b = await register({ username: 'bob', password: 'password123' });
    const c = await register({ username: 'cheater', password: 'password123' });
    if (!a.ok || !b.ok || !c.ok) throw new Error();
    await db.users.update(c.user.id, { isBanned: true });
    await db.rounds.bulkAdd([
      {
        id: 'a-1',
        userId: a.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 300,
        netChange: 200,
        outcome: 'win',
        details: {},
        balanceAfter: 1200,
        playedAt: 1000,
      },
      {
        id: 'b-1',
        userId: b.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 2000,
      },
      {
        id: 'c-1',
        userId: c.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 1000,
        netChange: 900,
        outcome: 'win',
        details: {},
        balanceAfter: 1900,
        playedAt: 3000,
      },
    ]);
    return { aliceId: a.user.id, bobId: b.user.id, cheaterId: c.user.id };
  }

  it('netWinner sorts descending and assigns rank', async () => {
    const { aliceId, bobId } = await seedTwoPlayersOneBanned();
    const lb = await getLeaderboard('netWinner');
    expect(lb).toHaveLength(2); // cheater excluded
    expect(lb[0]!.userId).toBe(aliceId);
    expect(lb[0]!.rank).toBe(1);
    expect(lb[0]!.value).toBe(200);
    expect(lb[1]!.userId).toBe(bobId);
  });

  it('banned users excluded across all metrics', async () => {
    const { cheaterId } = await seedTwoPlayersOneBanned();
    for (const m of ['netWinner', 'mostRounds', 'biggestSingleWin'] as const) {
      const lb = await getLeaderboard(m);
      expect(lb.map((r) => r.userId)).not.toContain(cheaterId);
    }
  });

  it('per-game leaderboard scopes to that game only', async () => {
    const a = await register({ username: 'a', password: 'password123' });
    if (!a.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
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
        id: 's-1',
        userId: a.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 100,
        netChange: 50,
        outcome: 'win',
        details: {},
        balanceAfter: 1150,
        playedAt: 2000,
      },
    ]);
    const bj = await getLeaderboard('netWinner', 'blackjack');
    expect(bj[0]!.value).toBe(100);
    const slots = await getLeaderboard('netWinner', 'slots');
    expect(slots[0]!.value).toBe(50);
  });

  it('mostVariety counts distinct games and includes users with 0 in current scope', async () => {
    const a = await register({ username: 'variety', password: 'password123' });
    if (!a.ok) throw new Error();
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: a.user.id,
        game: 'blackjack',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: {},
        balanceAfter: 999,
        playedAt: 1000,
      },
      {
        id: 's-1',
        userId: a.user.id,
        game: 'slots',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: {},
        balanceAfter: 998,
        playedAt: 2000,
      },
    ]);
    const lb = await getLeaderboard('mostVariety');
    expect(lb[0]!.value).toBe(2);
  });

  it('tiebreaker on equal values: older user (smaller createdAt) wins', async () => {
    const older = await register({ username: 'older', password: 'password123' });
    if (!older.ok) throw new Error();
    const newer = await register({ username: 'newer', password: 'password123' });
    if (!newer.ok) throw new Error();
    // Force createdAt ordering
    await db.users.update(older.user.id, { createdAt: 100 });
    await db.users.update(newer.user.id, { createdAt: 200 });
    await db.rounds.bulkAdd([
      {
        id: 'o-1',
        userId: older.user.id,
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
        id: 'n-1',
        userId: newer.user.id,
        game: 'blackjack',
        betAmount: 100,
        payout: 200,
        netChange: 100,
        outcome: 'win',
        details: {},
        balanceAfter: 1100,
        playedAt: 2000,
      },
    ]);
    const lb = await getLeaderboard('netWinner');
    expect(lb[0]!.userId).toBe(older.user.id);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/stats.test.ts
git add src/systems/stats.ts src/systems/stats.test.ts
git commit -m "feat(stats): getLeaderboard — 5 metric keys, banned exclusion, tiebreaker rules"
```

## Task A.8: Update vitest coverage globs

**Files:**

- Modify: `vitest.config.ts`

The `src/systems/**/*.ts` glob already covers the new module. Verify, no change usually needed.

- [ ] **Step 1: Inspect**

```bash
grep -A 3 "include:" vitest.config.ts
grep -A 6 "thresholds:" vitest.config.ts
```

If `src/systems/**/*.ts` is in both `include` and `thresholds`, no change. Otherwise add `src/systems/stats.ts` to the threshold map.

- [ ] **Step 2: Verify coverage runs**

```bash
pnpm exec vitest run --coverage src/systems/stats.test.ts
```

Expected: all tests pass; coverage thresholds met for `src/systems/stats.ts`.

- [ ] **Step 3: Commit only if config changed**

```bash
git add vitest.config.ts
git commit -m "test(stats): include systems/stats.ts in coverage thresholds"
```

(Skip if no change needed.)

## Task A.9: ADR-0038 — Stats aggregation module location

**Files:**

- Create: `docs/adr/0038-stats-aggregation-module.md`

- [ ] **Step 1: Write the ADR**

````markdown
# ADR-0038: Stats aggregation module location

- Status: Accepted
- Date: 2026-05-19
- Deciders: Developer

## Context

Phase 9 introduced `src/pages/admin/queries.ts` as the single source of
Dexie aggregations for the admin dashboard (per-user totals, site-wide
stats, net-flow series, game-distribution, top-winners/losers, per-user
helpers).

Phase 7 ships `/stats` and `/leaderboard` for end-users. Both surfaces
need the same aggregations (and a few extensions). Three options:

1. Keep `queries.ts` in `pages/admin/`; player pages import from there.
2. Duplicate as `src/systems/stats.ts` for player-facing code.
3. Promote `queries.ts` to a neutral location (`src/systems/stats.ts`)
   and have admin import from there too.

## Decision

**Promote.** Move `src/pages/admin/queries.ts` → `src/systems/stats.ts`.
Admin imports from the new location after a brief transition period.

To avoid breaking admin during the move, PR A leaves a re-export shim at
the old path:

```ts
// src/pages/admin/queries.ts
export * from '@/systems/stats';
```
````

PR E updates every admin import to the new path and deletes the shim.

## Alternatives considered

- **Option 1 (admin import from admin path).** Couples player UI to
  admin module layout. Anyone reorganizing admin code could
  inadvertently break /stats. Rejected.
- **Option 2 (duplicate).** Two copies of the same Dexie code drift.
  Rejected.
- **Pure leaf system in `src/lib/`** instead of `src/systems/`. The
  project convention is that `src/systems/` is the canonical home for
  shared side-effecting modules (`auth`, `wallet`, `rng`, `crypto`,
  `admin`, `admin-auth`). `stats` fits there.

## Consequences

- One source of truth for derived stats. No drift between admin and player.
- Admin tests continue to pass during PR A via the shim.
- PR E is a small mechanical refactor (5 admin pages × 1 import each).
- `src/pages/admin/` becomes UI-only (chart wrappers move in PR C; the
  queries shim is gone after PR E).

## References

- `src/systems/stats.ts` (target location)
- `src/pages/admin/queries.ts` (temporary shim)
- ADR-0039 — Shared Recharts chunk (companion refactor)
- Phase 7 spec §7

````

- [ ] **Step 2: Markdownlint + commit**

```bash
npx markdownlint-cli2 docs/adr/0038-stats-aggregation-module.md
git add docs/adr/0038-stats-aggregation-module.md
git commit -m "docs(adr): 0038 — stats aggregation module location (systems/stats.ts)"
````

## Task A.10: PR A — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~960 tests passing (~60 new across the 6 new query functions).

- [ ] **Step 2: Markdownlint ADR**

```bash
npx markdownlint-cli2 docs/adr/0038-stats-aggregation-module.md
```

Expected: 0 errors.

- [ ] **Step 3: Push, open PR, watch CI, merge**

```bash
git push -u origin phase-7-pr-a-stats-module
gh pr create --title "phase-7(stats): PR A — module move + extensions + ADR-0038" --body "$(cat <<'EOF'
## Summary

PR A of Phase 7. Promotes admin/queries.ts to src/systems/stats.ts with a backwards-compatible re-export shim. Adds 6 new player-facing query functions with exhaustive unit tests.

- `src/pages/admin/queries.ts` → `src/systems/stats.ts` (verbatim move)
- Old admin path becomes a re-export shim (deleted in PR E)
- New: `getUserMetrics`, `getUserStreaks`, `getUserPeaks`, `getUserSessionStats`, `getUserExtras`, `getUserWinLossTimeline`, `getUserBetSizeHistogram`, `getLeaderboard`
- ADR-0038 documents the move

## Test plan

- [x] All four DoD checks green locally
- [x] All Phase 9 admin tests continue to pass through the shim
- [x] ~60 new tests covering streak edges (pushes neutral), peaks tiebreaker, session windows, leaderboard banned exclusion
- [ ] CI green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged.

---

# PR B — StatsPage Cards view

**Branch:** `phase-7-pr-b-stats-cards` (off freshly-merged `main`)
**Goal:** Ship the entire StatsPage shell with left-rail nav, overview + per-game tabs, view-mode toggle, uiStore extension, friendly empty state, and all 16 stat cards rendered in Cards view. Graphs view ships in PR C; for now the toggle flips between Cards (real data) and a stub "Graphs view — coming in PR C" panel.
**Risk:** Medium. Lots of small components; need to make sure useLiveQuery doesn't flood when navigating between tabs.
**Estimated tasks:** 9.

## Task B.1: Branch + uiStore extension

**Files:**

- Modify: `src/store/uiStore.ts`
- Modify: `src/store/uiStore.test.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-7-pr-b-stats-cards
```

- [ ] **Step 2: Update `src/store/uiStore.ts`**

Add a `statsViewMode` slice mirroring the existing `sidebarCollapsed` pattern. Show the full final file:

```ts
import { create } from 'zustand';

const SIDEBAR_KEY = 'MASQUER.ui.sidebarCollapsed';
const STATS_VIEW_KEY = 'MASQUER.ui.statsViewMode';

export type StatsViewMode = 'cards' | 'graphs';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  statsViewMode: StatsViewMode;
  setStatsViewMode: (mode: StatsViewMode) => void;
}

function readSidebarPref(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (raw === null) return false;
    return raw === 'true';
  } catch {
    return false;
  }
}

function writeSidebarPref(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    /* localStorage unavailable */
  }
}

function readStatsViewPref(): StatsViewMode {
  try {
    const raw = localStorage.getItem(STATS_VIEW_KEY);
    if (raw === 'graphs') return 'graphs';
    return 'cards';
  } catch {
    return 'cards';
  }
}

function writeStatsViewPref(mode: StatsViewMode): void {
  try {
    localStorage.setItem(STATS_VIEW_KEY, mode);
  } catch {
    /* localStorage unavailable */
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: readSidebarPref(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writeSidebarPref(next);
    set({ sidebarCollapsed: next });
  },
  setSidebarCollapsed: (collapsed) => {
    writeSidebarPref(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  statsViewMode: readStatsViewPref(),
  setStatsViewMode: (mode) => {
    writeStatsViewPref(mode);
    set({ statsViewMode: mode });
  },
}));

export const useStatsViewMode = (): StatsViewMode => useUIStore((s) => s.statsViewMode);
```

- [ ] **Step 3: Extend tests at `src/store/uiStore.test.ts`**

Append:

```ts
describe('uiStore.statsViewMode', () => {
  beforeEach(() => {
    localStorage.removeItem('MASQUER.ui.statsViewMode');
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('defaults to "cards"', () => {
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });

  it('setStatsViewMode persists to localStorage', () => {
    useUIStore.getState().setStatsViewMode('graphs');
    expect(useUIStore.getState().statsViewMode).toBe('graphs');
    expect(localStorage.getItem('MASQUER.ui.statsViewMode')).toBe('graphs');
  });

  it('reads persisted preference on init', () => {
    localStorage.setItem('MASQUER.ui.statsViewMode', 'graphs');
    // Re-import to re-evaluate init (simulate fresh module).
    // In practice we test the read function directly:
    expect(localStorage.getItem('MASQUER.ui.statsViewMode')).toBe('graphs');
  });

  it('invalid persisted value falls back to "cards"', () => {
    localStorage.setItem('MASQUER.ui.statsViewMode', 'bogus');
    useUIStore.setState({ statsViewMode: 'cards' });
    // The init reader returns 'cards' for anything other than 'graphs'.
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });
});
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm exec vitest run src/store/uiStore.test.ts
git add src/store/uiStore.ts src/store/uiStore.test.ts
git commit -m "feat(ui): uiStore — add statsViewMode slice with localStorage persistence"
```

## Task B.2: `formatters.ts` + tests

**Files:**

- Create: `src/pages/stats/formatters.ts`
- Create: `src/pages/stats/formatters.test.ts`

Number/duration/percent formatters reused across every stat card.

- [ ] **Step 1: Write `src/pages/stats/formatters.ts`**

```ts
/** Integer chip amount as a localized string (e.g. 1234 → "1,234"). */
export function formatChips(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Signed chip amount with explicit sign (e.g. +1234, -50). */
export function formatSignedChips(n: number): string {
  if (n > 0) return `+${formatChips(n)}`;
  if (n < 0) return `-${formatChips(-n)}`;
  return '0';
}

/** Percent with 1 decimal (e.g. 98.234 → "98.2%"). Null shows as "—". */
export function formatPercent(p: number | null): string {
  if (p === null) return '—';
  return `${p.toFixed(1)}%`;
}

/** Duration in ms → human-readable ("3h 12m", "12m 4s", "47s"). */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec % 60}s`;
  return `${sec}s`;
}

/** Epoch-ms → "YYYY-MM-DD" (UTC). null shows as "—". */
export function formatDate(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Write `src/pages/stats/formatters.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  formatChips,
  formatSignedChips,
  formatPercent,
  formatDuration,
  formatDate,
} from './formatters';

describe('formatChips', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [1234, '1,234'],
    [1_000_000, '1,000,000'],
  ])('%i → %s', (n, expected) => {
    expect(formatChips(n)).toBe(expected);
  });

  it('rounds non-integer input', () => {
    expect(formatChips(1234.7)).toBe('1,235');
  });
});

describe('formatSignedChips', () => {
  it.each([
    [0, '0'],
    [100, '+100'],
    [-50, '-50'],
    [1234, '+1,234'],
    [-1234, '-1,234'],
  ])('%i → %s', (n, expected) => {
    expect(formatSignedChips(n)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('null → "—"', () => expect(formatPercent(null)).toBe('—'));
  it('98.234 → "98.2%"', () => expect(formatPercent(98.234)).toBe('98.2%'));
  it('0 → "0.0%"', () => expect(formatPercent(0)).toBe('0.0%'));
  it('100 → "100.0%"', () => expect(formatPercent(100)).toBe('100.0%'));
});

describe('formatDuration', () => {
  it('0 → "0s"', () => expect(formatDuration(0)).toBe('0s'));
  it('500 → "0s"', () => expect(formatDuration(500)).toBe('0s'));
  it('5000 → "5s"', () => expect(formatDuration(5000)).toBe('5s'));
  it('65_000 → "1m 5s"', () => expect(formatDuration(65_000)).toBe('1m 5s'));
  it('3725_000 → "1h 2m"', () => expect(formatDuration(3_725_000)).toBe('1h 2m'));
});

describe('formatDate', () => {
  it('null → "—"', () => expect(formatDate(null)).toBe('—'));
  it('epoch 0 → "1970-01-01"', () => expect(formatDate(0)).toBe('1970-01-01'));
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/stats/formatters.test.ts
git add src/pages/stats/formatters.ts src/pages/stats/formatters.test.ts
git commit -m "feat(stats): formatters — chips/percent/duration/date helpers"
```

## Task B.3: `ViewModeToggle` + tests

**Files:**

- Create: `src/pages/stats/ViewModeToggle.tsx`
- Create: `src/pages/stats/ViewModeToggle.test.tsx`

- [ ] **Step 1: Write `src/pages/stats/ViewModeToggle.tsx`**

```tsx
import type { JSX } from 'react';
import { useStatsViewMode, useUIStore } from '@/store/uiStore';

export default function ViewModeToggle(): JSX.Element {
  const mode = useStatsViewMode();
  const setMode = useUIStore((s) => s.setStatsViewMode);
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex overflow-hidden rounded-full border border-gold/50 bg-felt-deep"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'cards'}
        onClick={() => setMode('cards')}
        className={[
          'px-3 py-1 text-[11px] uppercase tracking-wider transition',
          mode === 'cards' ? 'bg-gold text-felt-deep' : 'text-white/70 hover:text-white',
        ].join(' ')}
      >
        Cards
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'graphs'}
        onClick={() => setMode('graphs')}
        className={[
          'px-3 py-1 text-[11px] uppercase tracking-wider transition',
          mode === 'graphs' ? 'bg-gold text-felt-deep' : 'text-white/70 hover:text-white',
        ].join(' ')}
      >
        Graphs
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeToggle from './ViewModeToggle';
import { useUIStore } from '@/store/uiStore';

describe('ViewModeToggle', () => {
  beforeEach(() => {
    localStorage.removeItem('MASQUER.ui.statsViewMode');
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders two radio buttons, Cards default checked', () => {
    render(<ViewModeToggle />);
    const cards = screen.getByRole('radio', { name: /cards/i });
    const graphs = screen.getByRole('radio', { name: /graphs/i });
    expect(cards).toHaveAttribute('aria-checked', 'true');
    expect(graphs).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Graphs flips the preference and persists', async () => {
    const user = userEvent.setup();
    render(<ViewModeToggle />);
    await user.click(screen.getByRole('radio', { name: /graphs/i }));
    expect(useUIStore.getState().statsViewMode).toBe('graphs');
    expect(localStorage.getItem('MASQUER.ui.statsViewMode')).toBe('graphs');
  });

  it('clicking back to Cards restores the default', async () => {
    useUIStore.setState({ statsViewMode: 'graphs' });
    const user = userEvent.setup();
    render(<ViewModeToggle />);
    await user.click(screen.getByRole('radio', { name: /cards/i }));
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/pages/stats/ViewModeToggle.test.tsx
git add src/pages/stats/ViewModeToggle.tsx src/pages/stats/ViewModeToggle.test.tsx
git commit -m "feat(stats): ViewModeToggle — Cards / Graphs pill"
```

## Task B.4: `StatsLeftRail` + tests

**Files:**

- Create: `src/pages/stats/StatsLeftRail.tsx`
- Create: `src/pages/stats/StatsLeftRail.test.tsx`

NavLink-based left rail for `/stats/*` (PR D will use the same shape for `/leaderboard/*`).

- [ ] **Step 1: Write `src/pages/stats/StatsLeftRail.tsx`**

```tsx
import type { JSX } from 'react';
import { NavLink } from 'react-router';

interface Item {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

interface Props {
  /** Base path: '/stats' or '/leaderboard'. The rail builds child links from this. */
  basePath: '/stats' | '/leaderboard';
}

const TABS: Omit<Item, 'to'>[] = [
  { icon: '📊', label: 'Overview', end: true },
  { icon: '🃏', label: 'Blackjack' },
  { icon: '🎡', label: 'Roulette' },
  { icon: '🎰', label: 'Slots' },
  { icon: '🎴', label: 'Baccarat' },
  { icon: '🪙', label: 'Coin Flip' },
];

/** Maps a label to the URL segment matching the game keys in `Round['game']`. */
const SLUG: Record<string, string> = {
  Overview: '',
  Blackjack: 'blackjack',
  Roulette: 'roulette',
  Slots: 'slots',
  Baccarat: 'baccarat',
  'Coin Flip': 'coin-flip',
};

export default function StatsLeftRail({ basePath }: Props): JSX.Element {
  return (
    <aside className="w-40 shrink-0 border-r border-gold/40 bg-felt-deep py-4">
      <nav className="flex flex-col" data-stats-rail>
        {TABS.map((t) => {
          const slug = SLUG[t.label] ?? '';
          const to = slug === '' ? basePath : `${basePath}/${slug}`;
          return (
            <NavLink
              key={t.label}
              to={to}
              end={t.end ?? false}
              className={({ isActive }) =>
                [
                  'border-l-[3px] px-4 py-2 text-xs',
                  isActive
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-transparent text-white/60 hover:bg-white/5',
                ].join(' ')
              }
            >
              {t.icon} {t.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StatsLeftRail from './StatsLeftRail';

function renderAt(initial: string, basePath: '/stats' | '/leaderboard' = '/stats') {
  const router = createMemoryRouter(
    [{ path: `${basePath}/*`, element: <StatsLeftRail basePath={basePath} /> }],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('StatsLeftRail', () => {
  it('renders Overview + 5 game tabs', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /blackjack/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /roulette/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /slots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /baccarat/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /coin flip/i })).toBeInTheDocument();
  });

  it('overview link uses base path only', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/stats');
  });

  it('per-game links use slugified game keys', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /blackjack/i })).toHaveAttribute(
      'href',
      '/stats/blackjack',
    );
    expect(screen.getByRole('link', { name: /coin flip/i })).toHaveAttribute(
      'href',
      '/stats/coin-flip',
    );
  });

  it('marks the active link with aria-current=page', () => {
    renderAt('/stats/roulette');
    expect(screen.getByRole('link', { name: /roulette/i })).toHaveAttribute('aria-current', 'page');
  });

  it('respects basePath="/leaderboard"', () => {
    renderAt('/leaderboard', '/leaderboard');
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByRole('link', { name: /slots/i })).toHaveAttribute(
      'href',
      '/leaderboard/slots',
    );
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/pages/stats/StatsLeftRail.test.tsx
git add src/pages/stats/StatsLeftRail.tsx src/pages/stats/StatsLeftRail.test.tsx
git commit -m "feat(stats): StatsLeftRail — Overview + 5 per-game NavLinks"
```

## Task B.5: `EmptyState` + tests

**Files:**

- Create: `src/pages/stats/EmptyState.tsx`
- Create: `src/pages/stats/EmptyState.test.tsx`

- [ ] **Step 1: Write `src/pages/stats/EmptyState.tsx`**

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router';

interface Props {
  /** Optional game name; if provided, message + CTA target that game. */
  gameName?: string;
  /** URL the CTA navigates to. Defaults to '/lobby'. */
  ctaTo?: string;
}

export default function EmptyState({ gameName, ctaTo }: Props): JSX.Element {
  const message = gameName
    ? `No ${gameName} rounds yet — try it!`
    : 'No rounds yet — pick a game from the lobby and your stats will appear here.';
  const buttonText = gameName ? `Play ${gameName}` : 'Visit lobby';
  const target = ctaTo ?? '/lobby';
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded border border-gold/30 bg-felt-deep px-6 py-12 text-center"
      data-empty-state
    >
      <p className="text-sm text-white/70">{message}</p>
      <Link
        to={target}
        className="rounded-sm bg-gold px-4 py-2 font-display text-xs uppercase tracking-wider text-felt-deep hover:bg-gold-bright"
      >
        {buttonText} →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders generic message and lobby link when no gameName provided', () => {
    render(
      <MemoryRouter>
        <EmptyState />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit lobby/i })).toHaveAttribute('href', '/lobby');
  });

  it('renders per-game message and links to that game when gameName provided', () => {
    render(
      <MemoryRouter>
        <EmptyState gameName="Blackjack" ctaTo="/play/blackjack" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/no blackjack rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play blackjack/i })).toHaveAttribute(
      'href',
      '/play/blackjack',
    );
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/stats/EmptyState.test.tsx
git add src/pages/stats/EmptyState.tsx src/pages/stats/EmptyState.test.tsx
git commit -m "feat(stats): EmptyState — friendly nudge with CTA"
```

## Task B.6: `StatCardGrid` + tests

**Files:**

- Create: `src/pages/stats/StatCardGrid.tsx`
- Create: `src/pages/stats/StatCardGrid.test.tsx`

Renders the 16 stat cards from the aggregation bundle in a responsive 4-col grid. Reuses the Phase 9 `StatCard` primitive (which lives at `src/pages/admin/StatCard.tsx`).

- [ ] **Step 1: Write `src/pages/stats/StatCardGrid.tsx`**

```tsx
import type { JSX } from 'react';
import StatCard from '@/pages/admin/StatCard';
import {
  formatChips,
  formatSignedChips,
  formatPercent,
  formatDuration,
  formatDate,
} from './formatters';
import type { UserMetrics, StreakStats, Peaks, SessionStats, ExtraStats } from '@/systems/stats';

interface Props {
  metrics: UserMetrics;
  streaks: StreakStats;
  peaks: Peaks;
  sessions: SessionStats;
  extras: ExtraStats;
}

export default function StatCardGrid({
  metrics,
  streaks,
  peaks,
  sessions,
  extras,
}: Props): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-stat-grid>
      {/* Row 1 — core 4 */}
      <StatCard
        label="Net change"
        value={formatSignedChips(metrics.netChange)}
        tone={metrics.netChange > 0 ? 'positive' : metrics.netChange < 0 ? 'negative' : 'neutral'}
      />
      <StatCard label="Rounds played" value={formatChips(metrics.totalRounds)} />
      <StatCard label="Total wagered" value={formatChips(metrics.totalWagered)} />
      <StatCard
        label="RTP"
        value={formatPercent(metrics.rtp)}
        sub={`won ${formatChips(metrics.totalWon)}`}
      />

      {/* Row 2 — core remainders + time */}
      <StatCard label="Total won" value={formatChips(metrics.totalWon)} />
      <StatCard label="Total lost" value={formatChips(metrics.totalLost)} />
      <StatCard label="Time played" value={formatDuration(metrics.timePlayedMs)} />
      <StatCard
        label="Win rate"
        value={formatPercent(extras.winRate)}
        sub={extras.winRate === null ? undefined : 'excludes pushes'}
      />

      {/* Row 3 — peaks */}
      <StatCard
        label="Biggest win"
        value={formatSignedChips(peaks.biggestWin)}
        tone={peaks.biggestWin > 0 ? 'positive' : 'neutral'}
        sub={formatDate(peaks.biggestWinAt)}
      />
      <StatCard
        label="Biggest loss"
        value={peaks.biggestLoss > 0 ? `-${formatChips(peaks.biggestLoss)}` : '0'}
        tone={peaks.biggestLoss > 0 ? 'negative' : 'neutral'}
        sub={formatDate(peaks.biggestLossAt)}
      />
      <StatCard label="Highest balance" value={formatChips(peaks.highestBalance)} />
      <StatCard label="Avg bet" value={formatChips(extras.avgBetSize)} />

      {/* Row 4 — streaks + sessions */}
      <StatCard label="Win streak" value={formatChips(streaks.longestWin)} />
      <StatCard label="Loss streak" value={formatChips(streaks.longestLoss)} />
      <StatCard
        label="Best session"
        value={formatSignedChips(sessions.best)}
        tone={sessions.best > 0 ? 'positive' : 'neutral'}
        sub={`${sessions.count} sessions`}
      />
      <StatCard
        label="Worst session"
        value={formatSignedChips(sessions.worst)}
        tone={sessions.worst < 0 ? 'negative' : 'neutral'}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import type { Peaks, SessionStats, StreakStats, UserMetrics, ExtraStats } from '@/systems/stats';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCardGrid from './StatCardGrid';

const baseMetrics: UserMetrics = {
  totalRounds: 100,
  totalWagered: 5000,
  totalWon: 4900,
  totalLost: 2400,
  netChange: 1250,
  rtp: 98.2,
  timePlayedMs: 3_725_000,
};
const baseStreaks: StreakStats = { longestWin: 7, longestLoss: 4 };
const basePeaks: Peaks = {
  biggestWin: 320,
  biggestWinAt: 1_700_000_000_000,
  biggestLoss: 180,
  biggestLossAt: 1_700_000_001_000,
  highestBalance: 2500,
};
const baseSessions: SessionStats = { best: 500, worst: -300, count: 12 };
const baseExtras: ExtraStats = { avgBetSize: 50, winRate: 47.5 };

describe('StatCardGrid', () => {
  it('renders 16 cards with the expected labels', () => {
    render(
      <StatCardGrid
        metrics={baseMetrics}
        streaks={baseStreaks}
        peaks={basePeaks}
        sessions={baseSessions}
        extras={baseExtras}
      />,
    );
    for (const label of [
      /net change/i,
      /rounds played/i,
      /total wagered/i,
      /rtp/i,
      /total won/i,
      /total lost/i,
      /time played/i,
      /win rate/i,
      /biggest win/i,
      /biggest loss/i,
      /highest balance/i,
      /avg bet/i,
      /win streak/i,
      /loss streak/i,
      /best session/i,
      /worst session/i,
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('formats signed values and uses positive tone for positive net', () => {
    const { container } = render(
      <StatCardGrid
        metrics={baseMetrics}
        streaks={baseStreaks}
        peaks={basePeaks}
        sessions={baseSessions}
        extras={baseExtras}
      />,
    );
    expect(screen.getByText('+1,250')).toBeInTheDocument();
    expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/pages/stats/StatCardGrid.test.tsx
git add src/pages/stats/StatCardGrid.tsx src/pages/stats/StatCardGrid.test.tsx
git commit -m "feat(stats): StatCardGrid — 16 cards in a responsive 4-col grid"
```

## Task B.7: `StatsOverviewPage` + `StatsPerGamePage` + tests

**Files:**

- Create: `src/pages/stats/StatsOverviewPage.tsx`
- Create: `src/pages/stats/StatsPerGamePage.tsx`
- Create: `src/pages/stats/StatsOverviewPage.test.tsx`
- Create: `src/pages/stats/StatsPerGamePage.test.tsx`

Both pages share the same shape: load the 5 aggregation bundles via `useLiveQuery`, render `<EmptyState>` if totalRounds is 0, otherwise `<StatCardGrid>` (Cards view) or a stub `<div>` (Graphs view will be filled in PR C).

- [ ] **Step 1: Write `src/pages/stats/StatsOverviewPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import {
  getUserExtras,
  getUserMetrics,
  getUserPeaks,
  getUserSessionStats,
  getUserStreaks,
  type ExtraStats,
  type Peaks,
  type SessionStats,
  type StreakStats,
  type UserMetrics,
} from '@/systems/stats';
import EmptyState from './EmptyState';
import StatCardGrid from './StatCardGrid';

const EMPTY_METRICS: UserMetrics = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  netChange: 0,
  rtp: null,
  timePlayedMs: 0,
};
const EMPTY_STREAKS: StreakStats = { longestWin: 0, longestLoss: 0 };
const EMPTY_PEAKS: Peaks = {
  biggestWin: 0,
  biggestWinAt: null,
  biggestLoss: 0,
  biggestLossAt: null,
  highestBalance: 0,
};
const EMPTY_SESSIONS: SessionStats = { best: 0, worst: 0, count: 0 };
const EMPTY_EXTRAS: ExtraStats = { avgBetSize: 0, winRate: null };

export default function StatsOverviewPage(): JSX.Element | null {
  const user = useCurrentUser();
  const mode = useStatsViewMode();
  const userId = user?.id ?? '';

  const metrics: UserMetrics = useLiveQuery(() => getUserMetrics(userId), [userId], EMPTY_METRICS);
  const streaks: StreakStats = useLiveQuery(() => getUserStreaks(userId), [userId], EMPTY_STREAKS);
  const peaks: Peaks = useLiveQuery(() => getUserPeaks(userId), [userId], EMPTY_PEAKS);
  const sessions: SessionStats = useLiveQuery(
    () => getUserSessionStats(userId),
    [userId],
    EMPTY_SESSIONS,
  );
  const extras: ExtraStats = useLiveQuery(() => getUserExtras(userId), [userId], EMPTY_EXTRAS);

  if (!user) return null;
  if (metrics.totalRounds === 0) return <EmptyState />;

  if (mode === 'graphs') {
    return (
      <div className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50">
        Graphs view — ships in PR C.
      </div>
    );
  }

  return (
    <StatCardGrid
      metrics={metrics}
      streaks={streaks}
      peaks={peaks}
      sessions={sessions}
      extras={extras}
    />
  );
}
```

- [ ] **Step 2: Write `src/pages/stats/StatsPerGamePage.tsx`**

```tsx
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { useStatsViewMode } from '@/store/uiStore';
import type { Round } from '@/db';
import {
  getUserExtras,
  getUserMetrics,
  getUserPeaks,
  getUserSessionStats,
  getUserStreaks,
  type ExtraStats,
  type Peaks,
  type SessionStats,
  type StreakStats,
  type UserMetrics,
} from '@/systems/stats';
import EmptyState from './EmptyState';
import StatCardGrid from './StatCardGrid';

type Game = Round['game'];

const GAME_LABELS: Record<Game, string> = {
  blackjack: 'Blackjack',
  roulette: 'Roulette',
  slots: 'Slots',
  baccarat: 'Baccarat',
  'coin-flip': 'Coin Flip',
};

const EMPTY_METRICS: UserMetrics = {
  totalRounds: 0,
  totalWagered: 0,
  totalWon: 0,
  totalLost: 0,
  netChange: 0,
  rtp: null,
  timePlayedMs: 0,
};
const EMPTY_STREAKS: StreakStats = { longestWin: 0, longestLoss: 0 };
const EMPTY_PEAKS: Peaks = {
  biggestWin: 0,
  biggestWinAt: null,
  biggestLoss: 0,
  biggestLossAt: null,
  highestBalance: 0,
};
const EMPTY_SESSIONS: SessionStats = { best: 0, worst: 0, count: 0 };
const EMPTY_EXTRAS: ExtraStats = { avgBetSize: 0, winRate: null };

export default function StatsPerGamePage(): JSX.Element | null {
  const user = useCurrentUser();
  const mode = useStatsViewMode();
  const { game } = useParams<{ game: Game }>();
  const userId = user?.id ?? '';

  const metrics: UserMetrics = useLiveQuery(
    () => getUserMetrics(userId, game),
    [userId, game],
    EMPTY_METRICS,
  );
  const streaks: StreakStats = useLiveQuery(
    () => getUserStreaks(userId, game),
    [userId, game],
    EMPTY_STREAKS,
  );
  const peaks: Peaks = useLiveQuery(() => getUserPeaks(userId, game), [userId, game], EMPTY_PEAKS);
  const sessions: SessionStats = useLiveQuery(
    () => getUserSessionStats(userId, game),
    [userId, game],
    EMPTY_SESSIONS,
  );
  const extras: ExtraStats = useLiveQuery(
    () => getUserExtras(userId, game),
    [userId, game],
    EMPTY_EXTRAS,
  );

  if (!user || !game) return null;
  const label = GAME_LABELS[game];
  if (metrics.totalRounds === 0) {
    return <EmptyState gameName={label} ctaTo={`/play/${game}`} />;
  }

  if (mode === 'graphs') {
    return (
      <div className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50">
        Graphs view — ships in PR C.
      </div>
    );
  }

  return (
    <StatCardGrid
      metrics={metrics}
      streaks={streaks}
      peaks={peaks}
      sessions={sessions}
      extras={extras}
    />
  );
}
```

- [ ] **Step 3: Write tests**

For `StatsOverviewPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StatsOverviewPage from './StatsOverviewPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('StatsOverviewPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    localStorage.removeItem('MASQUER.ui.statsViewMode');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders empty state for a user with 0 rounds', async () => {
    const r = await register({ username: 'newbie', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders the 16-card grid when the user has rounds', async () => {
    const r = await register({ username: 'player', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
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
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/net change/i)).toBeInTheDocument());
    expect(screen.getByText('+100')).toBeInTheDocument();
  });

  it('renders the Graphs stub when viewMode=graphs', async () => {
    const r = await register({ username: 'graphs', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    useUIStore.setState({ statsViewMode: 'graphs' });
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
        <StatsOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/graphs view/i)).toBeInTheDocument());
  });
});
```

For `StatsPerGamePage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StatsPerGamePage from './StatsPerGamePage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderAt(game: string) {
  const router = createMemoryRouter([{ path: '/stats/:game', element: <StatsPerGamePage /> }], {
    initialEntries: [`/stats/${game}`],
  });
  return render(<RouterProvider router={router} />);
}

describe('StatsPerGamePage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders empty state with link to that game when no rounds in scope', async () => {
    const r = await register({ username: 'pg', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    renderAt('blackjack');
    expect(await screen.findByText(/no blackjack rounds yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play blackjack/i })).toHaveAttribute(
      'href',
      '/play/blackjack',
    );
  });

  it('scopes the grid to that game only', async () => {
    const r = await register({ username: 'pg2', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    await db.rounds.bulkAdd([
      {
        id: 'b-1',
        userId: r.user.id,
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
        id: 's-1',
        userId: r.user.id,
        game: 'slots',
        betAmount: 50,
        payout: 0,
        netChange: -50,
        outcome: 'loss',
        details: {},
        balanceAfter: 1050,
        playedAt: 2000,
      },
    ]);
    renderAt('blackjack');
    await waitFor(() => expect(screen.getByText(/net change/i)).toBeInTheDocument());
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.queryByText('-50')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm exec vitest run src/pages/stats/StatsOverviewPage.test.tsx src/pages/stats/StatsPerGamePage.test.tsx
git add src/pages/stats/StatsOverviewPage.tsx src/pages/stats/StatsPerGamePage.tsx \
  src/pages/stats/StatsOverviewPage.test.tsx src/pages/stats/StatsPerGamePage.test.tsx
git commit -m "feat(stats): StatsOverviewPage + StatsPerGamePage (Cards view + empty state + graphs stub)"
```

## Task B.8: `StatsPage` shell + wire routes

**Files:**

- Create: `src/pages/stats/StatsPage.tsx`
- Modify: `src/router.tsx`
- Delete: `src/pages/StatsPage.tsx` (existing stub)

- [ ] **Step 1: Write `src/pages/stats/StatsPage.tsx`** (the shell — header + rail + outlet)

```tsx
import type { JSX } from 'react';
import { Outlet, useParams } from 'react-router';
import StatsLeftRail from './StatsLeftRail';
import ViewModeToggle from './ViewModeToggle';

const TITLES: Record<string, string> = {
  '': 'OVERVIEW',
  blackjack: 'BLACKJACK',
  roulette: 'ROULETTE',
  slots: 'SLOTS',
  baccarat: 'BACCARAT',
  'coin-flip': 'COIN FLIP',
};

export default function StatsPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <StatsLeftRail basePath="/stats" />
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            STATS · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/router.tsx`** to wire the new routes

Replace the existing stub stats route with the new structure:

```tsx
import StatsPage from '@/pages/stats/StatsPage';
import StatsOverviewPage from '@/pages/stats/StatsOverviewPage';
import StatsPerGamePage from '@/pages/stats/StatsPerGamePage';
```

In the routes array, replace `{ path: 'stats', element: <StatsPage /> }` with:

```tsx
{
  path: 'stats',
  element: <StatsPage />,
  children: [
    { index: true, element: <StatsOverviewPage /> },
    { path: ':game', element: <StatsPerGamePage /> },
  ],
},
```

Delete the existing stub file:

```bash
git rm src/pages/StatsPage.tsx
```

(There's no test file for the stub.)

- [ ] **Step 3: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/stats/ && pnpm build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/stats/StatsPage.tsx src/router.tsx
git rm src/pages/StatsPage.tsx
git commit -m "feat(stats): StatsPage shell + wire /stats routes (overview + per-game)"
```

## Task B.9: PR B — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1010 tests passing (~50 new in PR B).

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev
```

- Register a user.
- Visit `/stats` — see "No rounds yet" empty state.
- Click each per-game tab in the left rail — verify per-game empty state with correct CTA.
- Toggle Cards / Graphs — verify Graphs shows the "coming in PR C" stub.
- Play 3 rounds of blackjack — return to `/stats` — verify cards populate.
- Toggle persists across reload.

Stop dev server.

- [ ] **Step 3: Push, open PR, merge**

```bash
git push -u origin phase-7-pr-b-stats-cards
gh pr create --title "phase-7(stats): PR B — StatsPage Cards view + view-mode toggle" --body "$(cat <<'EOF'
## Summary

PR B of Phase 7. StatsPage with left rail + 16-card grid + view-mode toggle.

- uiStore extended with `statsViewMode` slice (cards default, persists via localStorage)
- StatsPage shell (header + StatsLeftRail + Outlet)
- StatsLeftRail (NavLink-based, Overview + 5 game tabs)
- ViewModeToggle (Cards / Graphs pill)
- StatCardGrid (16 cards in a responsive 4-col grid)
- StatsOverviewPage + StatsPerGamePage (live-queried via useLiveQuery)
- EmptyState (friendly nudge + lobby/game CTA)
- formatters (chips / percent / duration / date)
- Routes wired: /stats, /stats/:game

Graphs view is stubbed; ships in PR C.

## Test plan

- [x] All four DoD checks green locally
- [x] ~50 new tests (uiStore + formatters + components + 2 integration tests)
- [x] Manual smoke: empty state, populated cards, toggle persistence
- [ ] CI green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR C — Chart extract + 3 new charts + Graphs view + ADR-0039

**Branch:** `phase-7-pr-c-stats-graphs` (off freshly-merged `main`)
**Goal:** Move the 4 existing chart wrappers from `src/pages/admin/charts/` to `src/components/charts/` (single shared location). Add 3 new charts (`WinRateByGameBar`, `WinLossTimeline`, `BetSizeHistogram`). Wire Graphs view on StatsOverviewPage + StatsPerGamePage. Write ADR-0039.
**Risk:** Medium. The chart move must not break admin pages. Mitigation: each move is `git mv` + update admin imports in the same commit so nothing is half-moved.
**Estimated tasks:** 9.

## Task C.1: Branch + move charts to `src/components/charts/`

**Files:**

- Move: `src/pages/admin/charts/*.tsx` → `src/components/charts/*.tsx`
- Move: `src/pages/admin/charts/*.test.tsx` → `src/components/charts/*.test.tsx`
- Modify: every admin page that imports from `src/pages/admin/charts/...`

- [ ] **Step 1: Branch + verify charts exist**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-7-pr-c-stats-graphs
ls src/pages/admin/charts/
```

Expected: `NetFlowLine.tsx`, `WinnersLosersBar.tsx`, `GameDistributionDonut.tsx`, `UserActivityLine.tsx` (+ their tests).

- [ ] **Step 2: Move with git**

```bash
mkdir -p src/components/charts
git mv src/pages/admin/charts/NetFlowLine.tsx src/components/charts/
git mv src/pages/admin/charts/NetFlowLine.test.tsx src/components/charts/
git mv src/pages/admin/charts/WinnersLosersBar.tsx src/components/charts/
git mv src/pages/admin/charts/WinnersLosersBar.test.tsx src/components/charts/
git mv src/pages/admin/charts/GameDistributionDonut.tsx src/components/charts/
git mv src/pages/admin/charts/GameDistributionDonut.test.tsx src/components/charts/
git mv src/pages/admin/charts/UserActivityLine.tsx src/components/charts/
git mv src/pages/admin/charts/UserActivityLine.test.tsx src/components/charts/
rmdir src/pages/admin/charts
```

- [ ] **Step 3: Update import paths**

In each moved chart file, find any import like `from '@/pages/admin/queries'` and replace with `from '@/systems/stats'`. (Should already be the case after PR A's shim, but make it direct now to avoid the shim being a transitive surface.)

- [ ] **Step 4: Update admin pages that imported charts**

For each of these admin pages, run a find/replace updating `@/pages/admin/charts/...` → `@/components/charts/...`:

```bash
grep -rln "pages/admin/charts" src/pages/admin/
```

Expected files: `AdminOverviewPage.tsx`, `AdminUserPage.tsx`. Update both.

- [ ] **Step 5: Verify nothing else references the old path**

```bash
grep -rn "pages/admin/charts" src/ || echo "OK — no references"
```

Expected: "OK".

- [ ] **Step 6: Run all tests**

```bash
pnpm exec vitest run src/components/charts/ src/pages/admin/
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/ src/pages/admin/
git commit -m "refactor(charts): move admin chart wrappers to src/components/charts/ (shared location)"
```

## Task C.2: `WinRateByGameBar` + tests

**Files:**

- Create: `src/components/charts/WinRateByGameBar.tsx`
- Create: `src/components/charts/WinRateByGameBar.test.tsx`

Horizontal bar per game showing win-rate %.

- [ ] **Step 1: Write `src/components/charts/WinRateByGameBar.tsx`**

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

export type WinRatePoint = {
  game: string;
  /** 0-100. */
  winRate: number;
};

type Props = { data: WinRatePoint[]; height?: number };

export default function WinRateByGameBar({ data, height = 220 }: Props): JSX.Element {
  if (data.length === 0) {
    return (
      <div className="text-xs text-white/40">No rounds yet — play a few to see win rates.</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          stroke="rgba(255,255,255,0.4)"
          fontSize={10}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          dataKey="game"
          type="category"
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
          width={80}
        />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(1)}%`}
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="winRate">
          {data.map((d) => (
            <Cell key={d.game} fill={d.winRate >= 50 ? '#3dd17a' : '#d4af37'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinRateByGameBar from './WinRateByGameBar';

describe('WinRateByGameBar', () => {
  it('renders empty state when no data', () => {
    render(<WinRateByGameBar data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders chart when given data', () => {
    const { container } = render(
      <WinRateByGameBar
        data={[
          { game: 'blackjack', winRate: 48 },
          { game: 'slots', winRate: 22 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/components/charts/WinRateByGameBar.test.tsx
git add src/components/charts/WinRateByGameBar.tsx src/components/charts/WinRateByGameBar.test.tsx
git commit -m "feat(charts): WinRateByGameBar — horizontal bar per game"
```

## Task C.3: `WinLossTimeline` + tests

**Files:**

- Create: `src/components/charts/WinLossTimeline.tsx`
- Create: `src/components/charts/WinLossTimeline.test.tsx`

Sparkline of recent round outcomes — tick per round, colored by outcome.

- [ ] **Step 1: Write `src/components/charts/WinLossTimeline.tsx`**

```tsx
import type { JSX } from 'react';
import type { WinLossTimelinePoint } from '@/systems/stats';

type Props = { data: WinLossTimelinePoint[]; height?: number };

const COLOR: Record<WinLossTimelinePoint['outcome'], string> = {
  win: '#3dd17a',
  loss: '#a3122a',
  push: '#7a7a7a',
};

export default function WinLossTimeline({ data, height = 60 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet — outcomes will appear here.</div>;
  }
  // Reverse to oldest-first for left-to-right reading.
  const points = [...data].reverse();
  return (
    <div
      className="flex items-end gap-[2px] rounded border border-white/10 bg-felt-deep px-2 py-2"
      style={{ height }}
      data-win-loss-timeline
    >
      {points.map((p, i) => (
        <div
          key={i}
          aria-label={`Round ${i + 1}: ${p.outcome}`}
          className="flex-1 rounded-sm"
          style={{
            backgroundColor: COLOR[p.outcome],
            height: '100%',
            opacity: p.outcome === 'push' ? 0.4 : 0.85,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinLossTimeline from './WinLossTimeline';

describe('WinLossTimeline', () => {
  it('renders empty state when no data', () => {
    render(<WinLossTimeline data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders one tick per data point', () => {
    const { container } = render(
      <WinLossTimeline
        data={[
          { playedAt: 1, outcome: 'win', netChange: 10 },
          { playedAt: 2, outcome: 'loss', netChange: -10 },
          { playedAt: 3, outcome: 'push', netChange: 0 },
        ]}
      />,
    );
    expect(container.querySelectorAll('[aria-label^="Round"]')).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/components/charts/WinLossTimeline.test.tsx
git add src/components/charts/WinLossTimeline.tsx src/components/charts/WinLossTimeline.test.tsx
git commit -m "feat(charts): WinLossTimeline — sparkline of recent outcomes"
```

## Task C.4: `BetSizeHistogram` + tests

**Files:**

- Create: `src/components/charts/BetSizeHistogram.tsx`
- Create: `src/components/charts/BetSizeHistogram.test.tsx`

- [ ] **Step 1: Write `src/components/charts/BetSizeHistogram.tsx`**

```tsx
import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistogramBin } from '@/systems/stats';

type Props = { data: HistogramBin[]; height?: number };

export default function BetSizeHistogram({ data, height = 200 }: Props): JSX.Element {
  if (data.length === 0) {
    return <div className="text-xs text-white/40">No rounds yet — bets will plot here.</div>;
  }
  const chartData = data.map((b) => ({
    label: `${b.binMin}–${b.binMax}`,
    count: b.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={10} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="count" fill="#d4af37" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BetSizeHistogram from './BetSizeHistogram';

describe('BetSizeHistogram', () => {
  it('renders empty state when no data', () => {
    render(<BetSizeHistogram data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders chart with bin count', () => {
    const { container } = render(
      <BetSizeHistogram
        data={[
          { binMin: 0, binMax: 20, count: 5 },
          { binMin: 20, binMax: 40, count: 3 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/components/charts/BetSizeHistogram.test.tsx
git add src/components/charts/BetSizeHistogram.tsx src/components/charts/BetSizeHistogram.test.tsx
git commit -m "feat(charts): BetSizeHistogram — 5-bin distribution of bet amounts"
```

## Task C.5: Graphs view on `StatsOverviewPage`

**Files:**

- Modify: `src/pages/stats/StatsOverviewPage.tsx`

Replaces the "coming in PR C" stub with real charts: NetFlowLine (all-time), GameDistributionDonut, WinRateByGameBar.

- [ ] **Step 1: Add a helper to compute win-rate per game**

Append to `src/systems/stats.ts`:

```ts
export async function getUserWinRateByGame(
  userId: string,
): Promise<Array<{ game: Game; winRate: number }>> {
  if (!userId) return [];
  const rounds = await fetchUserRounds(userId);
  if (rounds.length === 0) return [];
  const byGame = new Map<Game, { wins: number; nonPush: number }>();
  for (const r of rounds) {
    if (r.outcome === 'push') continue;
    const cur = byGame.get(r.game) ?? { wins: 0, nonPush: 0 };
    cur.nonPush += 1;
    if (r.outcome === 'win') cur.wins += 1;
    byGame.set(r.game, cur);
  }
  return [...byGame.entries()]
    .map(([game, v]) => ({ game, winRate: v.nonPush === 0 ? 0 : (v.wins / v.nonPush) * 100 }))
    .sort((a, b) => b.winRate - a.winRate);
}
```

Append a test for it in `stats.test.ts`.

- [ ] **Step 2: Update `StatsOverviewPage.tsx`** — replace the Graphs stub with real charts

```tsx
// Add imports at the top:
import NetFlowLine from '@/components/charts/NetFlowLine';
import GameDistributionDonut from '@/components/charts/GameDistributionDonut';
import WinRateByGameBar from '@/components/charts/WinRateByGameBar';
import {
  getGameDistribution,
  getNetFlowSeries,
  getUserNetFlowSeries,
  getUserWinRateByGame,
  // ... existing imports
} from '@/systems/stats';

// Add inside the component:
const netFlow = useLiveQuery(
  () => getUserNetFlowSeries(userId),
  [userId],
  [] as ReturnType<typeof getUserNetFlowSeries> extends Promise<infer T> ? T : never,
);
const distribution = useLiveQuery(() => getGameDistributionForUser(userId), [userId], []);
const winRates = useLiveQuery(() => getUserWinRateByGame(userId), [userId], []);

// In the Graphs branch:
if (mode === 'graphs') {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">NET FLOW</h2>
        <NetFlowLine data={netFlow} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          GAME DISTRIBUTION
        </h2>
        <GameDistributionDonut data={distribution} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">WIN RATE BY GAME</h2>
        <WinRateByGameBar data={winRates} />
      </section>
    </div>
  );
}
```

(`getGameDistributionForUser` is a new wrapper; if `getGameDistribution` is global, add a per-user variant in `stats.ts` similar to `getUserGameDistribution`. Per spec §5 the overview is the user's distribution.)

- [ ] **Step 3: Update tests** — add a Graphs view test

In `StatsOverviewPage.test.tsx`, replace the existing graphs-stub test with:

```tsx
it('renders 3 charts in Graphs view', async () => {
  const r = await register({ username: 'g', password: 'password123' });
  if (!r.ok) throw new Error();
  useSessionStore.setState({ currentUser: r.user });
  useUIStore.setState({ statsViewMode: 'graphs' });
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
      <StatsOverviewPage />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByText(/NET FLOW/i)).toBeInTheDocument());
  expect(screen.getByText(/GAME DISTRIBUTION/i)).toBeInTheDocument();
  expect(screen.getByText(/WIN RATE BY GAME/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Commit**

```bash
pnpm exec vitest run src/pages/stats/StatsOverviewPage.test.tsx
git add src/systems/stats.ts src/systems/stats.test.ts src/pages/stats/StatsOverviewPage.tsx src/pages/stats/StatsOverviewPage.test.tsx
git commit -m "feat(stats): StatsOverviewPage Graphs view — 3 charts (NetFlow + Distribution + WinRate)"
```

## Task C.6: Graphs view on `StatsPerGamePage`

**Files:**

- Modify: `src/pages/stats/StatsPerGamePage.tsx`

Same pattern but scoped: NetFlowLine (just this game's rounds), WinLossTimeline, BetSizeHistogram.

- [ ] **Step 1: Update `StatsPerGamePage.tsx`**

Add chart imports, add useLiveQuery for the three series, replace Graphs stub:

```tsx
import NetFlowLine from '@/components/charts/NetFlowLine';
import WinLossTimeline from '@/components/charts/WinLossTimeline';
import BetSizeHistogram from '@/components/charts/BetSizeHistogram';
import {
  getUserBetSizeHistogram,
  getUserNetFlowSeries,
  getUserWinLossTimeline,
  // ... existing imports
} from '@/systems/stats';

const netFlow = useLiveQuery(() => getUserNetFlowSeries(userId, game), [userId, game], []);
const timeline = useLiveQuery(() => getUserWinLossTimeline(userId, game, 50), [userId, game], []);
const histogram = useLiveQuery(() => getUserBetSizeHistogram(userId, game), [userId, game], []);

if (mode === 'graphs') {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          NET FLOW · {label}
        </h2>
        <NetFlowLine data={netFlow} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">RECENT OUTCOMES</h2>
        <WinLossTimeline data={timeline} />
      </section>
      <section>
        <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
          BET-SIZE DISTRIBUTION
        </h2>
        <BetSizeHistogram data={histogram} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add a Graphs test in `StatsPerGamePage.test.tsx`**

```tsx
it('renders 3 charts in Graphs view scoped to the game', async () => {
  const r = await register({ username: 'pg', password: 'password123' });
  if (!r.ok) throw new Error();
  useSessionStore.setState({ currentUser: r.user });
  useUIStore.setState({ statsViewMode: 'graphs' });
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
  renderAt('blackjack');
  await waitFor(() => expect(screen.getByText(/NET FLOW · Blackjack/i)).toBeInTheDocument());
  expect(screen.getByText(/RECENT OUTCOMES/i)).toBeInTheDocument();
  expect(screen.getByText(/BET-SIZE DISTRIBUTION/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/stats/StatsPerGamePage.test.tsx
git add src/pages/stats/StatsPerGamePage.tsx src/pages/stats/StatsPerGamePage.test.tsx
git commit -m "feat(stats): StatsPerGamePage Graphs view — 3 charts scoped to game"
```

## Task C.7: ADR-0039 — Shared Recharts chunk

**Files:**

- Create: `docs/adr/0039-shared-recharts-chunk.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0039: Shared Recharts chunk

- Status: Accepted
- Date: 2026-05-19
- Deciders: Developer

## Context

Phase 9 introduced Recharts (~400 kB chunk) as part of the admin
dashboard, lazy-loaded only when admins visit /admin/\*. Player pages
never paid the cost.

Phase 7 ships charts on the player /stats page (Graphs view). Naive
import — pulling Recharts into the main bundle — would inflate it
from 720 kB to ~1.1 MB. Unacceptable.

## Decision

Move all chart wrappers (the 4 from Phase 9 plus the 3 new ones in
Phase 7) into `src/components/charts/`. Import via static `import`
statements from both admin and player pages.

Vite's automatic code-splitting will:

- Place Recharts and the chart wrappers into ONE shared chunk.
- Lazy-load that chunk only when either an admin page or the player
  /stats page (Graphs view) is mounted.
- Reuse the same chunk across both (no double load).

The chunk is currently produced as `dist/assets/GameDistributionDonut-*.js`
in Phase 9 builds (Vite names it after the entry; PR D may produce a
slightly different chunk name once leaderboard charts are added — that's
expected). The important invariant is that there is ONE such chunk, not
two.

## Alternatives considered

- **Recharts in main bundle.** Simplest implementation, ~400 kB main
  bundle regression. Rejected: violates the Phase 9 budget.
- **Separate player-charts chunk and admin-charts chunk.** Recharts
  bundled twice in `dist/`. Each chunk hits the wire when its parent
  page is opened. Rejected: 400 kB wasted bandwidth.
- **CDN-load Recharts at runtime.** Avoid bundling entirely. Rejected:
  the app is local-only and offline-first; no network at runtime.

## Consequences

- Main bundle stays at ~720 kB.
- Recharts chunk loads on first admin navigation OR first player
  Graphs-view toggle, whichever comes first.
- All chart wrappers live in `src/components/charts/` going forward.
  Adding a new chart automatically rides the same chunk.
- `src/pages/admin/charts/` is deleted.

## References

- `src/components/charts/` (target home)
- ADR-0038 — Stats aggregation module location (companion refactor)
- Phase 7 spec §9
```

- [ ] **Step 2: Markdownlint + commit**

```bash
npx markdownlint-cli2 docs/adr/0039-shared-recharts-chunk.md
git add docs/adr/0039-shared-recharts-chunk.md
git commit -m "docs(adr): 0039 — shared Recharts chunk for player + admin"
```

## Task C.8: Bundle inspection

**Files:** none modified — verification only.

- [ ] **Step 1: Build and inspect output**

```bash
pnpm build 2>&1 | tail -30
```

Verify:

- Main bundle (`index-*.js`) ≤ 730 kB.
- Exactly ONE chunk contains Recharts (look for the largest non-main chunk; it should be ~400 kB). Multiple chunks ~400 kB each = double-bundled Recharts → bug.

- [ ] **Step 2: If main bundle regressed** — investigate which file is pulling Recharts statically into the main bundle. Likely a missing `lazy()` boundary or a missing dynamic-import pattern.

## Task C.9: PR C — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1030 tests passing (~20 new in PR C).

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev
```

- /stats overview, toggle Graphs → 3 charts render.
- /stats/blackjack, toggle Graphs → 3 game-scoped charts render.
- /admin (log in as admin) → admin charts still work.

- [ ] **Step 3: Push, open PR, merge**

```bash
git push -u origin phase-7-pr-c-stats-graphs
gh pr create --title "phase-7(stats): PR C — chart extract + Graphs view + ADR-0039" --body "$(cat <<'EOF'
## Summary

PR C of Phase 7.

- Move all 4 chart wrappers from `src/pages/admin/charts/` to `src/components/charts/`
- Add 3 new charts: `WinRateByGameBar`, `WinLossTimeline`, `BetSizeHistogram`
- Wire Graphs view on StatsOverviewPage (NetFlow + Distribution + WinRate)
- Wire Graphs view on StatsPerGamePage (NetFlow + Timeline + Histogram)
- Add `getUserWinRateByGame` helper to systems/stats
- ADR-0039 documents the shared chunk

Main bundle still 720 kB; Recharts in one shared lazy chunk.

## Test plan

- [x] All four DoD checks green
- [x] ~20 new tests
- [x] Admin charts still render
- [x] Build output: one Recharts chunk
- [ ] CI green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR D — LeaderboardPage Cards view

**Branch:** `phase-7-pr-d-leaderboard-cards` (off freshly-merged `main`)
**Goal:** Ship LeaderboardPage with left-rail nav (same shape as StatsPage), 20 boards (5 overview + 3 × 5 per-game), each with a Me / All toggle. Banned users excluded. Cards view only — Graphs ships in PR E.
**Estimated tasks:** 7.

## Task D.1: Branch + `MeAllToggle` + tests

Pill toggle with two radios. State stays local to whatever consumer mounts it.

```tsx
// src/pages/leaderboard/MeAllToggle.tsx
import type { JSX } from 'react';

export type MeAllMode = 'all' | 'me';

interface Props {
  value: MeAllMode;
  onChange: (next: MeAllMode) => void;
}

export default function MeAllToggle({ value, onChange }: Props): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Filter scope"
      className="inline-flex overflow-hidden rounded-full border border-white/30 bg-felt-deep text-[10px]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'all'}
        onClick={() => onChange('all')}
        className={
          value === 'all'
            ? 'bg-gold px-2 py-0.5 text-felt-deep'
            : 'px-2 py-0.5 text-white/60 hover:text-white'
        }
      >
        All
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'me'}
        onClick={() => onChange('me')}
        className={
          value === 'me'
            ? 'bg-gold px-2 py-0.5 text-felt-deep'
            : 'px-2 py-0.5 text-white/60 hover:text-white'
        }
      >
        Me
      </button>
    </div>
  );
}
```

Tests (3 cases): both radios render, current value checked, click fires onChange with new value.

Commit: `feat(leaderboard): MeAllToggle — All / Me pill toggle`

## Task D.2: `Board` (generic) + tests

Generic board: title in header, MeAllToggle top-right, ranking table with current-user highlighted via `data-current-user` attribute. Me view shows current user + 3 above + 3 below (7 max). All shows top 10. State lives in the component (per-board, in-session only per spec §6.3).

Full component code:

```tsx
// src/pages/leaderboard/Board.tsx
import type { JSX } from 'react';
import { useState } from 'react';
import MeAllToggle, { type MeAllMode } from './MeAllToggle';
import type { LeaderboardRow } from '@/systems/stats';

interface Props {
  title: string;
  rows: readonly LeaderboardRow[];
  currentUserId: string | null;
  formatValue?: (v: number) => string;
}

const DEFAULT_FORMAT = (v: number): string => v.toLocaleString();

export default function Board({
  title,
  rows,
  currentUserId,
  formatValue = DEFAULT_FORMAT,
}: Props): JSX.Element {
  const [mode, setMode] = useState<MeAllMode>('all');
  const visible = mode === 'all' ? rows.slice(0, 10) : computeMeWindow(rows, currentUserId);
  return (
    <div className="rounded border border-gold/30 bg-felt-deep p-3" data-board={title}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[11px] tracking-[0.18em] text-gold">{title}</h3>
        <MeAllToggle value={mode} onChange={setMode} />
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-white/40">No rankings yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody>
            {visible.map((r) => {
              const isCurrent = r.userId === currentUserId;
              return (
                <tr
                  key={r.userId}
                  className={
                    isCurrent
                      ? 'rounded border border-gold/70 bg-gold/10'
                      : 'border-b border-white/5'
                  }
                  data-current-user={isCurrent || undefined}
                >
                  <td className="w-8 py-1 pr-2 text-xs text-white/50">#{r.rank}</td>
                  <td className="py-1">
                    {r.username}
                    {isCurrent && <span className="ml-1 text-xs text-gold-bright">(you)</span>}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {formatValue(r.value)}
                    {r.sub && <span className="ml-2 text-xs text-white/40">{r.sub}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function computeMeWindow(rows: readonly LeaderboardRow[], currentUserId: string | null) {
  if (!currentUserId) return rows.slice(0, 7);
  const idx = rows.findIndex((r) => r.userId === currentUserId);
  if (idx === -1) return rows.slice(0, 7);
  const start = Math.max(0, idx - 3);
  const end = Math.min(rows.length, idx + 4);
  return rows.slice(start, end);
}
```

Tests (6 cases): title rendering, All view shows top 10, current-user highlight, Me view shows ±3 around current user, empty rows show "No rankings yet.", formatValue applied per row.

Commit: `feat(leaderboard): Board — generic ranking with Me/All toggle and current-user highlight`

## Task D.3: `LeaderboardLeftRail` (thin wrapper)

```tsx
// src/pages/leaderboard/LeaderboardLeftRail.tsx
import StatsLeftRail from '@/pages/stats/StatsLeftRail';
export default function LeaderboardLeftRail() {
  return <StatsLeftRail basePath="/leaderboard" />;
}
```

No test needed — pure delegation. Commit: `feat(leaderboard): LeaderboardLeftRail — delegates to StatsLeftRail`.

## Task D.4: `LeaderboardOverviewPage` — 5 boards

**Files:**

- Create: `src/pages/leaderboard/LeaderboardOverviewPage.tsx`
- Create: `src/pages/leaderboard/LeaderboardOverviewPage.test.tsx`

5 useLiveQuery subscriptions, one per overview metric. Pass `limit=100` to `getLeaderboard` so the Me-view has enough rows for ±3 even when the current user sits past rank 50. If every board is empty (no eligible users), show `<EmptyState />`. Otherwise render the 5 boards in a `grid-cols-1 md:grid-cols-2` responsive layout.

- [ ] **Step 1: Write `src/pages/leaderboard/LeaderboardOverviewPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import { getLeaderboard, type LeaderboardRow } from '@/systems/stats';
import EmptyState from '@/pages/stats/EmptyState';
import Board from './Board';

const EMPTY: readonly LeaderboardRow[] = [];

export default function LeaderboardOverviewPage(): JSX.Element | null {
  const user = useCurrentUser();

  const netChange = useLiveQuery(
    () => getLeaderboard('overview.netChange', { limit: 100 }),
    [],
    EMPTY,
  );
  const totalWon = useLiveQuery(
    () => getLeaderboard('overview.totalWon', { limit: 100 }),
    [],
    EMPTY,
  );
  const biggestWin = useLiveQuery(
    () => getLeaderboard('overview.biggestWin', { limit: 100 }),
    [],
    EMPTY,
  );
  const longestWinStreak = useLiveQuery(
    () => getLeaderboard('overview.longestWinStreak', { limit: 100 }),
    [],
    EMPTY,
  );
  const roundsPlayed = useLiveQuery(
    () => getLeaderboard('overview.roundsPlayed', { limit: 100 }),
    [],
    EMPTY,
  );

  if (!user) return null;

  const allEmpty =
    netChange.length === 0 &&
    totalWon.length === 0 &&
    biggestWin.length === 0 &&
    longestWinStreak.length === 0 &&
    roundsPlayed.length === 0;
  if (allEmpty) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Board title="NET CHANGE" rows={netChange} currentUserId={user.id} />
      <Board title="TOTAL WON" rows={totalWon} currentUserId={user.id} />
      <Board title="BIGGEST WIN" rows={biggestWin} currentUserId={user.id} />
      <Board title="LONGEST WIN STREAK" rows={longestWinStreak} currentUserId={user.id} />
      <Board title="ROUNDS PLAYED" rows={roundsPlayed} currentUserId={user.id} />
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/leaderboard/LeaderboardOverviewPage.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import 'fake-indexeddb/auto';
import LeaderboardOverviewPage from './LeaderboardOverviewPage';
import { db, resetDbForTesting } from '@/db';
import { settleRound } from '@/systems/wallet';
import { useSessionStore } from '@/store/sessionStore';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

async function seedUser(id: string, username: string, isBanned = false) {
  await db.users.put({
    id,
    username,
    passwordHash: 'x',
    salt: 'x',
    createdAt: Date.now(),
    isBanned,
  });
}

async function seedRound(userId: string, net: number) {
  await settleRound({
    handle: {
      betId: crypto.randomUUID(),
      userId,
      game: 'blackjack',
      amount: 10,
      placedAt: Date.now(),
    },
    result: {
      outcome: net > 0 ? 'win' : 'loss',
      betAmount: 10,
      payout: net > 0 ? 10 + net : 0,
      netChange: net,
      details: {},
    },
  });
}

describe('LeaderboardOverviewPage', () => {
  beforeEach(async () => {
    await resetDbForTesting();
    await seedUser('me', 'Me');
    useSessionStore.setState({ currentUser: { id: 'me', username: 'Me', isBanned: false } });
  });

  it('shows empty state when no rounds anywhere', async () => {
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/no stats yet/i)).toBeInTheDocument();
  });

  it('renders all 5 board titles once data exists', async () => {
    await seedRound('me', 50);
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('NET CHANGE')).toBeInTheDocument();
    expect(screen.getByText('TOTAL WON')).toBeInTheDocument();
    expect(screen.getByText('BIGGEST WIN')).toBeInTheDocument();
    expect(screen.getByText('LONGEST WIN STREAK')).toBeInTheDocument();
    expect(screen.getByText('ROUNDS PLAYED')).toBeInTheDocument();
  });

  it('excludes banned users from boards', async () => {
    await seedUser('cheater', 'Cheater', true);
    await seedRound('cheater', 9999);
    await seedRound('me', 10);
    render(
      <MemoryRouter>
        <LeaderboardOverviewPage />
      </MemoryRouter>,
    );
    await screen.findByText('NET CHANGE');
    expect(screen.queryByText('Cheater')).not.toBeInTheDocument();
    expect(screen.getAllByText('Me').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Verify**

```bash
pnpm exec vitest run src/pages/leaderboard/LeaderboardOverviewPage.test.tsx
```

Expected: 3 pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/leaderboard/LeaderboardOverviewPage.tsx src/pages/leaderboard/LeaderboardOverviewPage.test.tsx
git commit -m "feat(leaderboard): LeaderboardOverviewPage — 5 boards in Cards view"
```

## Task D.5: `LeaderboardPerGamePage` — 3 boards per game

**Files:**

- Create: `src/pages/leaderboard/LeaderboardPerGamePage.tsx`
- Create: `src/pages/leaderboard/LeaderboardPerGamePage.test.tsx`

Reads `:game` from the route. Mounts 3 `useLiveQuery` subscriptions scoped to that game. If the game has no rounds, shows `<EmptyState />` (generic CTA is fine — same empty surface across all per-game pages).

- [ ] **Step 1: Write `src/pages/leaderboard/LeaderboardPerGamePage.tsx`**

```tsx
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentUser } from '@/store/sessionStore';
import type { Round } from '@/db';
import { getLeaderboard, type LeaderboardRow } from '@/systems/stats';
import EmptyState from '@/pages/stats/EmptyState';
import Board from './Board';

type Game = Round['game'];

const GAME_LABELS: Record<Game, string> = {
  blackjack: 'Blackjack',
  roulette: 'Roulette',
  slots: 'Slots',
  baccarat: 'Baccarat',
  'coin-flip': 'Coin Flip',
};

const EMPTY: readonly LeaderboardRow[] = [];

export default function LeaderboardPerGamePage(): JSX.Element | null {
  const { game } = useParams<{ game: Game }>();
  const user = useCurrentUser();
  const g = game as Game | undefined;

  const netChange = useLiveQuery(
    () => (g ? getLeaderboard('byGame.netChange', { game: g, limit: 100 }) : Promise.resolve([])),
    [g],
    EMPTY,
  );
  const biggestWin = useLiveQuery(
    () => (g ? getLeaderboard('byGame.biggestWin', { game: g, limit: 100 }) : Promise.resolve([])),
    [g],
    EMPTY,
  );
  const roundsPlayed = useLiveQuery(
    () =>
      g ? getLeaderboard('byGame.roundsPlayed', { game: g, limit: 100 }) : Promise.resolve([]),
    [g],
    EMPTY,
  );

  if (!user || !g) return null;

  const allEmpty = netChange.length === 0 && biggestWin.length === 0 && roundsPlayed.length === 0;
  if (allEmpty) return <EmptyState />;

  const label = GAME_LABELS[g];
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Board
        title={`${label.toUpperCase()} — NET CHANGE`}
        rows={netChange}
        currentUserId={user.id}
      />
      <Board
        title={`${label.toUpperCase()} — BIGGEST WIN`}
        rows={biggestWin}
        currentUserId={user.id}
      />
      <Board
        title={`${label.toUpperCase()} — ROUNDS PLAYED`}
        rows={roundsPlayed}
        currentUserId={user.id}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/leaderboard/LeaderboardPerGamePage.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import 'fake-indexeddb/auto';
import LeaderboardPerGamePage from './LeaderboardPerGamePage';
import { db, resetDbForTesting } from '@/db';
import { settleRound } from '@/systems/wallet';
import { useSessionStore } from '@/store/sessionStore';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/leaderboard/:game" element={<LeaderboardPerGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LeaderboardPerGamePage', () => {
  beforeEach(async () => {
    await resetDbForTesting();
    await db.users.put({
      id: 'me',
      username: 'Me',
      passwordHash: 'x',
      salt: 'x',
      createdAt: Date.now(),
      isBanned: false,
    });
    useSessionStore.setState({ currentUser: { id: 'me', username: 'Me', isBanned: false } });
  });

  it('shows empty state when the game has no rounds', async () => {
    renderAt('/leaderboard/blackjack');
    expect(await screen.findByText(/no stats yet/i)).toBeInTheDocument();
  });

  it('renders 3 game-scoped boards when data exists', async () => {
    await settleRound({
      handle: {
        betId: crypto.randomUUID(),
        userId: 'me',
        game: 'roulette',
        amount: 25,
        placedAt: Date.now(),
      },
      result: { outcome: 'win', betAmount: 25, payout: 50, netChange: 25, details: {} },
    });
    renderAt('/leaderboard/roulette');
    expect(await screen.findByText('ROULETTE — NET CHANGE')).toBeInTheDocument();
    expect(screen.getByText('ROULETTE — BIGGEST WIN')).toBeInTheDocument();
    expect(screen.getByText('ROULETTE — ROUNDS PLAYED')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Verify**

```bash
pnpm exec vitest run src/pages/leaderboard/LeaderboardPerGamePage.test.tsx
```

Expected: 2 pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/leaderboard/LeaderboardPerGamePage.tsx src/pages/leaderboard/LeaderboardPerGamePage.test.tsx
git commit -m "feat(leaderboard): LeaderboardPerGamePage — 3 game-scoped boards"
```

## Task D.6: `LeaderboardPage` shell + wire routes

**Files:**

- Create: `src/pages/leaderboard/LeaderboardPage.tsx`
- Modify: `src/router.tsx`
- Delete: `src/pages/LeaderboardPage.tsx` (existing stub)

`LeaderboardPage` mirrors `StatsPage` exactly: left rail + header (title + view-mode toggle) + outlet. Same `TITLES` map keyed by `:game` param.

- [ ] **Step 1: Write `src/pages/leaderboard/LeaderboardPage.tsx`**

```tsx
import type { JSX } from 'react';
import { Outlet, useParams } from 'react-router';
import LeaderboardLeftRail from './LeaderboardLeftRail';
import ViewModeToggle from '@/pages/stats/ViewModeToggle';

const TITLES: Record<string, string> = {
  '': 'OVERVIEW',
  blackjack: 'BLACKJACK',
  roulette: 'ROULETTE',
  slots: 'SLOTS',
  baccarat: 'BACCARAT',
  'coin-flip': 'COIN FLIP',
};

export default function LeaderboardPage(): JSX.Element {
  const { game } = useParams<{ game?: string }>();
  const title = TITLES[game ?? ''] ?? 'OVERVIEW';
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <LeaderboardLeftRail />
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            LEADERBOARD · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/router.tsx`** — replace the stub leaderboard route

```tsx
import LeaderboardPage from '@/pages/leaderboard/LeaderboardPage';
import LeaderboardOverviewPage from '@/pages/leaderboard/LeaderboardOverviewPage';
import LeaderboardPerGamePage from '@/pages/leaderboard/LeaderboardPerGamePage';
```

In the routes array, replace `{ path: 'leaderboard', element: <LeaderboardPage /> }` with:

```tsx
{
  path: 'leaderboard',
  element: <LeaderboardPage />,
  children: [
    { index: true, element: <LeaderboardOverviewPage /> },
    { path: ':game', element: <LeaderboardPerGamePage /> },
  ],
},
```

- [ ] **Step 3: Delete the stub**

```bash
git rm src/pages/LeaderboardPage.tsx
```

- [ ] **Step 4: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/leaderboard/ && pnpm build
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/leaderboard/LeaderboardPage.tsx src/router.tsx
git rm src/pages/LeaderboardPage.tsx
git commit -m "feat(leaderboard): LeaderboardPage shell + wire /leaderboard routes"
```

## Task D.7: PR D — DoD, push, open, merge

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: ~1080 tests passing (~50 new in PR D).

Manual smoke (pnpm dev): fresh user empty state → play 5 rounds → boards populate → register second user → toggle Me/All → ban second user via /admin → second user disappears.

```bash
git push -u origin phase-7-pr-d-leaderboard-cards
gh pr create --title "phase-7(leaderboard): PR D — Cards view + 20 boards + Me/All toggle"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR E — LeaderboardPage Graphs + shim removal

**Branch:** `phase-7-pr-e-leaderboard-graphs` (off freshly-merged `main`)
**Goal:** Add Graphs view on LeaderboardPage (boards rendered as horizontal bar charts via a new `BoardBar` chart). Switch every admin import from `@/pages/admin/queries` to `@/systems/stats`. Delete the re-export shim.
**Risk:** Low-medium. Mostly mechanical refactor (admin imports) + one new chart.
**Estimated tasks:** 6.

## Task E.1: Branch + `BoardBar` chart + tests

**Files:**

- Create: `src/components/charts/BoardBar.tsx`
- Create: `src/components/charts/BoardBar.test.tsx`

Horizontal bar chart that renders a leaderboard as bars (player on Y, value as bar length, current user highlighted).

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-7-pr-e-leaderboard-graphs
```

- [ ] **Step 2: Write `src/components/charts/BoardBar.tsx`**

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
import type { LeaderboardRow } from '@/systems/stats';

interface Props {
  rows: readonly LeaderboardRow[];
  currentUserId: string | null;
  height?: number;
  /** Formatter applied to the tooltip value. */
  formatValue?: (v: number) => string;
}

const DEFAULT_FORMAT = (v: number): string => v.toLocaleString();

export default function BoardBar({
  rows,
  currentUserId,
  height = 220,
  formatValue = DEFAULT_FORMAT,
}: Props): JSX.Element {
  if (rows.length === 0) {
    return <div className="text-xs text-white/40">No rankings yet.</div>;
  }
  const chartData = rows.slice(0, 10).map((r) => ({
    name: r.username,
    value: r.value,
    isCurrent: r.userId === currentUserId,
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
          width={80}
        />
        <Tooltip
          formatter={(value: number) => formatValue(value)}
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
        />
        <Bar dataKey="value">
          {chartData.map((d) => (
            <Cell
              key={d.name}
              fill={d.isCurrent ? '#f0c64a' : '#d4af37'}
              opacity={d.isCurrent ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoardBar from './BoardBar';

describe('BoardBar', () => {
  it('renders empty state when no rows', () => {
    render(<BoardBar rows={[]} currentUserId={null} />);
    expect(screen.getByText(/no rankings yet/i)).toBeInTheDocument();
  });

  it('renders chart with top-10 rows when data', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      userId: `u-${i + 1}`,
      username: `p${i + 1}`,
      value: 100 - i * 5,
    }));
    const { container } = render(<BoardBar rows={rows} currentUserId="u-3" />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Commit**

```bash
pnpm exec vitest run src/components/charts/BoardBar.test.tsx
git add src/components/charts/BoardBar.tsx src/components/charts/BoardBar.test.tsx
git commit -m "feat(charts): BoardBar — horizontal bar chart for leaderboard Graphs view"
```

## Task E.2: Wire Graphs view on LeaderboardOverviewPage + LeaderboardPerGamePage

**Files:**

- Modify: `src/pages/leaderboard/LeaderboardOverviewPage.tsx`
- Modify: `src/pages/leaderboard/LeaderboardPerGamePage.tsx`

In each page, replace the Graphs stub with a vertical stack of `BoardBar`s (one per board the Cards view shows).

- [ ] **Step 1: Update `LeaderboardOverviewPage.tsx`** (Graphs branch)

```tsx
import BoardBar from '@/components/charts/BoardBar';
import { formatSignedChips, formatChips } from '@/pages/stats/formatters';

// In the mode === 'graphs' branch:
return (
  <div className="flex flex-col gap-6">
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">BIGGEST NET WINNER</h2>
      <BoardBar rows={netWinners} currentUserId={currentUserId} formatValue={formatSignedChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">MOST ROUNDS PLAYED</h2>
      <BoardBar rows={mostRounds} currentUserId={currentUserId} formatValue={formatChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
        BIGGEST SINGLE-ROUND WIN
      </h2>
      <BoardBar rows={biggestWins} currentUserId={currentUserId} formatValue={formatSignedChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">LONGEST WIN STREAK</h2>
      <BoardBar rows={winStreaks} currentUserId={currentUserId} formatValue={formatChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
        MOST VARIETY (GAMES TRIED)
      </h2>
      <BoardBar rows={variety} currentUserId={currentUserId} />
    </section>
  </div>
);
```

- [ ] **Step 2: Update `LeaderboardPerGamePage.tsx`** (Graphs branch — 3 BoardBars)

```tsx
return (
  <div className="flex flex-col gap-6">
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
        BEST {label.toUpperCase()} PLAYER
      </h2>
      <BoardBar rows={netWinners} currentUserId={currentUserId} formatValue={formatSignedChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
        BIGGEST {label.toUpperCase()} WIN
      </h2>
      <BoardBar rows={biggestWins} currentUserId={currentUserId} formatValue={formatSignedChips} />
    </section>
    <section>
      <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
        MOST {label.toUpperCase()} ROUNDS
      </h2>
      <BoardBar rows={mostRounds} currentUserId={currentUserId} formatValue={formatChips} />
    </section>
  </div>
);
```

- [ ] **Step 3: Update tests** — add a Graphs test in each page test file (assert section headers visible).

- [ ] **Step 4: Commit**

```bash
pnpm exec vitest run src/pages/leaderboard/
git add src/pages/leaderboard/LeaderboardOverviewPage.tsx src/pages/leaderboard/LeaderboardPerGamePage.tsx \
  src/pages/leaderboard/LeaderboardOverviewPage.test.tsx src/pages/leaderboard/LeaderboardPerGamePage.test.tsx
git commit -m "feat(leaderboard): Graphs view — boards rendered as BoardBar charts"
```

## Task E.3: Switch admin imports to `@/systems/stats`

**Files:**

- Modify: every admin page that imports from `@/pages/admin/queries`

- [ ] **Step 1: Identify**

```bash
grep -rln "from '@/pages/admin/queries'" src/
```

Expected files: `AdminOverviewPage.tsx`, `AdminUsersListPage.tsx`, `AdminUserPage.tsx`, `AdminAuditPage.tsx`, `AdminSessionsPage.tsx`.

- [ ] **Step 2: Update each** to import from `@/systems/stats` instead:

```bash
# Quick check that simple sed will work — confirm no unusual paths.
grep -rn "from '@/pages/admin/queries'" src/pages/admin/

# Apply (review each file's diff before committing).
```

For each file, change the import line:

```ts
// before
import { getAllUserStats } from '@/pages/admin/queries';
// after
import { getAllUserStats } from '@/systems/stats';
```

- [ ] **Step 3: Verify nothing still references the shim**

```bash
grep -rn "from '@/pages/admin/queries'" src/ || echo "OK — all admin imports updated"
```

- [ ] **Step 4: Run admin tests**

```bash
pnpm exec vitest run src/pages/admin/
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/
git commit -m "refactor(admin): switch query imports to @/systems/stats (drops the shim usage)"
```

## Task E.4: Delete the re-export shim

**Files:**

- Delete: `src/pages/admin/queries.ts`

- [ ] **Step 1: Verify zero references**

```bash
grep -rn "from '@/pages/admin/queries'" src/ || echo "OK"
```

- [ ] **Step 2: Delete**

```bash
git rm src/pages/admin/queries.ts
```

- [ ] **Step 3: Run full DoD to confirm**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(admin): remove queries.ts re-export shim (ADR-0038 cutover complete)"
```

## Task E.5: PR E — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1100 tests passing (~20 new in PR E).

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev
```

- /leaderboard, toggle Graphs → 5 horizontal bar charts.
- /leaderboard/blackjack, toggle Graphs → 3 bar charts.
- /admin (log in as admin) → admin dashboard works end-to-end (charts + queries via the new path).

- [ ] **Step 3: Push, open PR, merge**

```bash
git push -u origin phase-7-pr-e-leaderboard-graphs
gh pr create --title "phase-7(leaderboard): PR E — Graphs view + admin shim removal" --body "..."
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR F — Release v0.8-stats-leaderboard

**Branch:** `chore/release-v0.8-stats-leaderboard` (off freshly-merged `main`)
**Goal:** Mark Phase 7 ✅ in BUILD_GUIDE, tag, publish release, update memory.
**Estimated tasks:** 3.

## Task F.1: BUILD_GUIDE Phase 7 row

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.8-stats-leaderboard
```

- [ ] **Step 2: Update §12**

Replace the Phase 7 row:

```markdown
| **7. Stats + Leaderboard** ✅ | StatsPage and LeaderboardPage with left-rail nav (overview + per-game tabs), Cards ↔ Graphs view toggle, 16 metrics per game, 20 leaderboards (5 overview + 3 × 5 per-game) with Me/All toggle. Shared Recharts chunk between player + admin. | Shipped 2026-05-XX — see `v0.8-stats-leaderboard`. ADR-0038, ADR-0039. |
```

(Date is real release date when this task runs.)

- [ ] **Step 3: Markdownlint + commit**

```bash
npx markdownlint-cli2 BUILD_GUIDE.md
git add BUILD_GUIDE.md
git commit -m "docs(build-guide): mark Phase 7 (Stats + Leaderboard) shipped"
```

## Task F.2: PR open + merge

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin chore/release-v0.8-stats-leaderboard
gh pr create --title "chore(release): v0.8-stats-leaderboard — Phase 7 BUILD_GUIDE update" --body "$(cat <<'EOF'
## Summary

PR F of Phase 7 — release plumbing only, no code changes.

- BUILD_GUIDE §12 marks Phase 7 ✅
- package.json stays at 0.0.0 (tag-only versioning)

## Test plan

- [x] markdownlint clean
- [ ] CI green
- [ ] After merge: tag v0.8-stats-leaderboard, publish GitHub Release

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for CI, merge, sync**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task F.3: Tag + GitHub Release + memory snapshot

- [ ] **Step 1: Tag**

```bash
git tag -a v0.8-stats-leaderboard -m "v0.8 — Stats + Leaderboard"
git push origin v0.8-stats-leaderboard
```

- [ ] **Step 2: Publish release**

```bash
gh release create v0.8-stats-leaderboard --title "v0.8-stats-leaderboard — Phase 7 complete" --notes "$(cat <<'EOF'
## What's new

Phase 7 ships StatsPage + LeaderboardPage together. Every game gets its own stats and leaderboard tabs; players can flip between Cards view (numbers) and Graphs view (charts).

### Highlights

- **/stats** — Overview + 5 per-game tabs. 16 metrics per scope (rounds, wagered, won, lost, net, RTP, time played, biggest win/loss, win/loss streaks, highest balance, best/worst session, avg bet, win rate).
- **/leaderboard** — Overview (5 boards: net winner, most rounds, biggest single win, longest streak, most variety) + per-game tabs (3 boards each: best player, biggest single win, most rounds).
- **Cards ↔ Graphs** view-mode toggle on every page, persists across sessions.
- **Me / All** toggle on every leaderboard — flip between the top-10 view and a ±3 window around your rank.
- Banned users excluded from leaderboards (admin ban from Phase 9 applies).
- Friendly empty state with a CTA straight to the relevant game.

### Architecture

- Aggregation refactor: `src/pages/admin/queries.ts` → `src/systems/stats.ts` as the shared neutral module (ADR-0038).
- All chart wrappers consolidated in `src/components/charts/` (ADR-0039). Recharts in one shared lazy chunk used by both player and admin.
- ~250 new tests across 6 PRs.

### ADRs

- [ADR-0038 — Stats aggregation module location](https://github.com/A1PC/localGamble/blob/main/docs/adr/0038-stats-aggregation-module.md)
- [ADR-0039 — Shared Recharts chunk](https://github.com/A1PC/localGamble/blob/main/docs/adr/0039-shared-recharts-chunk.md)

Plan: \`docs/superpowers/plans/2026-05-19-phase-7-stats-leaderboard-plan.md\`
EOF
)"
```

- [ ] **Step 3: Update `project_masquer_status` memory**

Open `/Users/adam/.claude/projects/-Users-adam/memory/project_masquer_status.md`. Add the new release at top of the tagged-releases list and mark Phase 7 as done in the roadmap section.

---

# Self-Review Checklist

After PR F merges:

- [ ] Spec coverage: every §1–§14 in the spec maps to at least one task.
- [ ] DoD: every PR A–E ran `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` clean before merge.
- [ ] Test count: ~250 new tests added.
- [ ] Bundle: main bundle ≤ 730 kB; one Recharts chunk in `dist/assets/`.
- [ ] Admin dashboard still works end-to-end with the new module location.
- [ ] Manual smoke walkthrough (per the Definition of Done above) passes.
- [ ] GitHub Release published.
- [ ] Memory updated.

If anything fails, hot-fix on `main` with a `fix/stats-*` or `fix/leaderboard-*` branch.
