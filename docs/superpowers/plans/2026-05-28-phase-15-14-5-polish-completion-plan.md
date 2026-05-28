# Phase 15 sub-project #14.5 — Polish completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 15 #14.5 — close every remaining visual + functional gap before #15 Final integration: player Stats+Leaderboard MASQUER reskin, missing admin pages (Blackjack + Coin-flip), additive enrichment of every existing game admin page (per-user drill-down + KPI grid + extra chart), `_shared/` primitives sweep, non-admin page sweep, in-game drift sweep.

**Architecture:** Four PRs.

- **PR A — Player Stats + Leaderboard reskin** (~14 files): drop `min-h-screen` → `flex h-full flex-col`; MASQUER chrome on `StatsPage` + `LeaderboardPage` + their LeftRails + sub-pages + supporting components.
- **PR B — Admin completion + enrichment** (~30 files, ~15 new aggregations): NEW `AdminBlackjackPage` + `AdminCoinFlipPage` + lazy routes + sidebar entries. Enrich 9 existing game admin pages **additively** with per-user drill-down (NEW shared `TopPlayersPanel`) + 3-5 KPIs in secondary StatCard grid + 1 game-specific extra chart. **Additive only — never removes existing content.**
- **PR C — `_shared/` + non-admin pages sweep** (~33 files): 7 `_shared/` primitives + ~26 non-admin pages token swap + layout/UX consistency (button hierarchy, modal chrome, padding rhythm, header tiers).
- **PR D — In-game drift sweep** (~71 files): mechanical token swap across `src/games/**` with INTENTIONAL game-identity colours preserved.

**Dispatch order:** A first → B + C in parallel after A → D last (D needs `_shared/` tokens locked by C as reference).

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · React Router 7 · Vite 5 · Tailwind 3 · Dexie 4 (no bump) · Recharts (lazy admin chunk) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-28-phase-15-14-5-polish-completion-design.md` (PR #298).

---

## Shared rules (apply to every PR)

1. **Pure logic untouched.** `src/games/**/{logic,machine,bets,resolveRoll,dice,stakes}.ts` byte-stable. `src/systems/stats.ts` is **additive only** — new fns + optional args on existing fns; never modify behaviour at `sinceMs === undefined`.
2. **Games sandbox preserved.** Admin code under `src/pages/admin/**` may read from `src/db/**` / `src/store/**` / `src/systems/**`.
3. **Integer money. No `Math.random()`.** ESLint enforces.
4. **No CLAUDE.md edits.**
5. **Commit subject ≤ 100 chars** ([[localgamble-commit-subject-limit]]).
6. **Conventional Commits.** Scopes: `admin`, `stats`, `ui`, `routing`, `theme` (cross-codebase brand sweep where it doesn't fit a game scope), `docs`. Never `admin-blackjack` etc. Never `sound` (reverted earlier).
7. **No `--no-verify`. No `--amend`.** Reset + new commit on hook failure.
8. **TS strict + exactOptionalPropertyTypes.** Use `{...(cond ? {key: val} : {})}` spread for optional fields.
9. **Tokens-only Tailwind** in rebuilt files. Pairings from [`PHASE_15_PATTERNS.md §1.4`](../../PHASE_15_PATTERNS.md#14-brand-tokens-velvet-deco).
10. **Page roots MUST be `flex h-full flex-col`, NEVER `min-h-screen`** ([[localgamble-min-h-screen-in-pages]]).
11. **Visual verification via Playwright at 1440×900 before pushing each PR** ([[localgamble-screenshot-before-pushing-ui]]).
12. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```
13. **`useLiveQuery` inferred-Promise pattern** — no explicit generic (Phase 9 trap).
14. **Recharts uses `ChartTooltipShell`** — never the default `contentStyle` (#251 pattern).
15. **House Net tone:** green positive / red negative (casino-operator perspective).
16. **PR B ADDITIVE-ONLY:** every existing StatCard, chart, panel, table, header, label, button, link on every existing admin page **MUST stay**. New content adds vertical space; never overwrites. Existing tests that pin existing elements remain green; new tests cover new elements only.

---

## Critical context

### Standardised button hierarchy (PR C)

| Tier        | Tokens                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Primary     | `bg-velvet border-2 border-brass text-gold-bright hover:bg-velvet-deep font-display text-xs tracking-[0.18em]` |
| Secondary   | `border border-brass/60 text-ivory hover:bg-velvet font-display text-xs tracking-[0.18em]`                     |
| Tertiary    | `text-ivory hover:text-gold-bright text-xs`                                                                    |
| Destructive | `border-2 border-casino-red text-casino-red hover:bg-casino-red/10 font-display text-xs tracking-[0.18em]`     |

### Standardised header tiers (PR C)

| Level              | Tokens                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Page title (h1)    | `font-display text-2xl tracking-[0.18em] text-gold-bright`                                                                       |
| Section title (h2) | `font-display text-xs tracking-wider text-ivory/60` (admin) or `font-display text-xs tracking-[0.18em] text-gold-bright` (lobby) |
| Card label         | `font-display text-[11px] tracking-[0.18em] text-ivory/55`                                                                       |

### Standardised modal chrome

```
container: bg-velvet-deep border border-brass/60 rounded-lg shadow-2xl p-6
backdrop: bg-black/60 backdrop-blur-sm
max-h on body: max-h-[60vh] overflow-y-auto
```

### Intentional game-identity colours — DO NOT touch in PR D

| Location                                           | Colour                                                | Why preserve                             |
| -------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `src/games/slots/SlotsPage.tsx` tier-3 celebration | `bg-jewel-magenta` accents                            | Signature jackpot moment                 |
| `src/components/brand/BrandCoin.tsx` (coin-flip)   | heads/tails facing colours                            | Part of the brand mark, not theme tokens |
| `src/games/roulette/**` pocket colours             | `roulette-red` / `roulette-pocket` / `roulette-green` | Game-intrinsic                           |
| `src/games/baccarat/**` scoreboard                 | `scoreboard-banker` / `-player` / `-tie`              | Game-intrinsic                           |
| `src/games/bingo/**` BINGO column palette          | per-column heatmap                                    | Game-intrinsic                           |
| `src/games/plinko/BinRow.tsx` edge bins            | `bg-jewel-magenta/40`                                 | Signature jackpot tier                   |
| `src/games/craps/PointPuck.tsx` faces              | `bg-gold-bright` ON / `bg-casino-red` OFF             | Game-intrinsic                           |
| `text-chip-win` / `text-casino-red` semantic       | —                                                     | Win/loss semantics                       |

---

## PR A — Player Stats + Leaderboard reskin

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-5-pr-a
```

### Task A.0 — Read context

- [ ] **Step 1:** Read spec + plan.
- [ ] **Step 2:** Read `src/pages/stats/{StatsPage,StatsLeftRail,StatsOverviewPage,StatsPerGamePage,StatCardGrid,ViewModeToggle,EmptyState}.tsx` + `formatters.ts`.
- [ ] **Step 3:** Read `src/pages/leaderboard/{LeaderboardPage,LeaderboardLeftRail,LeaderboardOverviewPage,LeaderboardPerGamePage,Board,MeAllToggle}.tsx`. Note `LeaderboardLeftRail` is a thin wrapper around `StatsLeftRail`.
- [ ] **Step 4:** Read `src/pages/admin/AdminLayout.tsx` (post #14) as the canonical MASQUER sidebar/page chrome pattern.
- [ ] **Step 5:** Memories `feedback-localgamble-min-h-screen-in-pages` + `feedback-localgamble-screenshot-before-pushing-ui`.

### Task A.1 — `StatsLeftRail` brand pass (shared by Stats + Leaderboard)

Mirror `AdminLayout`'s sidebar exactly (it's the canonical MASQUER sidebar shape from #14).

- [ ] **Step 1:** Update outer container:

  ```tsx
  // Before
  <aside className="w-40 shrink-0 border-r border-gold/40 bg-felt-deep py-4">
  // After
  <aside className="w-40 shrink-0 overflow-y-auto border-r border-brass/60 bg-velvet-deep py-4" data-stats-rail>
  ```

- [ ] **Step 2:** Add an "OVERVIEW" / "PER-GAME" heading above the nav (mirror AdminLayout):

  ```tsx
  <div className="px-4 pb-4 font-display text-xs tracking-[0.2em] text-gold-bright">
    {basePath === '/stats' ? 'STATS' : 'LEADERBOARD'}
  </div>
  ```

- [ ] **Step 3:** Update NavLink className builder:

  ```tsx
  <NavLink
    key={t.label}
    to={to}
    {...(t.end ? { end: true } : {})}
    className={({ isActive }) =>
      [
        'border-l-[3px] px-4 py-2 text-xs transition flex items-center gap-2',
        isActive
          ? 'border-brass bg-velvet font-display tracking-[0.12em] text-gold-bright'
          : 'border-transparent text-ivory/55 hover:bg-velvet/50',
      ].join(' ')
    }
  >
    <span aria-hidden>{t.icon}</span>
    <span>{t.label}</span>
  </NavLink>
  ```

- [ ] **Step 4:** Tests in `StatsLeftRail.test.tsx`: flip any pinned `bg-felt-deep` / `border-gold/40` assertions to brand tokens; assert the heading text + `data-stats-rail`.

- [ ] **Step 5:** Commit.
  ```bash
  git add src/pages/stats/StatsLeftRail.{tsx,test.tsx}
  git commit -m "feat(theme): StatsLeftRail brand pass — match AdminLayout sidebar"
  ```

### Task A.2 — `StatsPage.tsx` chrome retrofit

- [ ] **Step 1:**

  ```tsx
  // Before
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

  // After
  <div className="flex h-full flex-col bg-felt-table text-ivory" data-stats-page>
    <div className="flex flex-1 overflow-hidden">
      <StatsLeftRail basePath="/stats" />
      <main className="flex flex-1 flex-col overflow-auto p-6" data-stats-main>
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            STATS · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  </div>
  ```

- [ ] **Step 2:** Add a test for `h-full` + `data-stats-page` + heading text.

- [ ] **Step 3:** Commit.
  ```bash
  git add src/pages/stats/StatsPage.tsx
  git commit -m "feat(theme): StatsPage MASQUER chrome retrofit + drop min-h-screen"
  ```

### Task A.3 — `LeaderboardPage.tsx` + `LeaderboardLeftRail.tsx` retrofit

LeaderboardLeftRail is a thin wrapper around StatsLeftRail — no changes needed to the wrapper.

- [ ] **Step 1:** LeaderboardPage same shape as Task A.2:

  ```tsx
  <div className="flex h-full flex-col bg-felt-table text-ivory" data-leaderboard-page>
    <div className="flex flex-1 overflow-hidden">
      <LeaderboardLeftRail />
      <main className="flex flex-1 flex-col overflow-auto p-6" data-leaderboard-main>
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            LEADERBOARD · {title}
          </h1>
          <ViewModeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  </div>
  ```

- [ ] **Step 2:** Test for `h-full` + `data-leaderboard-page`.

- [ ] **Step 3:** Commit.

### Task A.4 — Sub-pages brand pass

Files: `StatsOverviewPage.tsx`, `StatsPerGamePage.tsx`, `LeaderboardOverviewPage.tsx`, `LeaderboardPerGamePage.tsx`, `Board.tsx`.

For each: read the file, identify legacy tokens, swap:

| From                                  | To                                                    |
| ------------------------------------- | ----------------------------------------------------- |
| `text-white`                          | `text-ivory`                                          |
| `text-white/60` / `text-white/50` etc | `text-ivory/55` (or matching opacity)                 |
| `text-gold` (when foreground colour)  | `text-gold-bright`                                    |
| `bg-felt-deep`                        | `bg-felt-table` (page bg) or `bg-velvet-deep` (panel) |
| `bg-black` accents                    | `bg-velvet-deep`                                      |
| `border-gold/30` / `border-gold/40`   | `border-brass/30` / `border-brass/60`                 |

For each sub-page header that says e.g. "OVERVIEW STATS" or "BLACKJACK STATS", standardise to `font-display text-xs tracking-wider text-ivory/60` (matching admin section headers).

- [ ] **Step 1:** StatsOverviewPage.tsx — token sweep + assert sample tokens in tests.
- [ ] **Step 2:** StatsPerGamePage.tsx — same.
- [ ] **Step 3:** LeaderboardOverviewPage.tsx — same.
- [ ] **Step 4:** LeaderboardPerGamePage.tsx — same.
- [ ] **Step 5:** Board.tsx — table rendering brand tokens (header row brass-bordered, body rows ivory text, alternating velvet shades).
- [ ] **Step 6:** Commit per sub-page or batched.

### Task A.5 — Supporting components brand pass

Files: `EmptyState.tsx`, `StatCardGrid.tsx`, `ViewModeToggle.tsx`, `MeAllToggle.tsx`.

- [ ] **Step 1:** `EmptyState.tsx` — central placeholder with brass-outlined card + ivory message + gold-bright CTA.
- [ ] **Step 2:** `StatCardGrid.tsx` — verify grid + card chrome matches `src/pages/admin/StatCard.tsx` brand tokens. (StatCard itself was updated in #14.)
- [ ] **Step 3:** `ViewModeToggle.tsx` — brand-tokened tab buttons (matching DateRangeFilter primitive from #14).
- [ ] **Step 4:** `MeAllToggle.tsx` — same tab pattern.
- [ ] **Step 5:** Update tests + commit batched.

### Task A.6 — Visual verification

- [ ] **Step 1:** Dev server + Playwright at 1440×900. Register user, navigate `/stats` + `/stats/blackjack` + `/leaderboard` + `/leaderboard/poker`. Screenshot each.
- [ ] **Step 2:** Verify sidebar matches AdminLayout pattern, header is gold-bright tracking-[0.18em], no min-h-screen overflow.
- [ ] **Step 3:** Stop dev.

### Task A.7 — Full DoD + open PR

- [ ] **Step 1:** Full DoD.
- [ ] **Step 2:** Push.
- [ ] **Step 3:** `gh pr create --title "phase-15(#14.5) PR A: Stats + Leaderboard MASQUER reskin" --body "..."` (~58 chars).
- [ ] **Step 4:** Report. STOP.

---

## PR B — Admin completion + enrichment

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-5-pr-b
```

### Task B.0 — Read context

- [ ] **Step 1:** Read spec §4.3 end-to-end.
- [ ] **Step 2:** Read every existing admin page (`AdminPlinkoPage`, `AdminPokerPage`, `AdminBingoPage`, `AdminBaccaratPage`, `AdminRoulettePage`, `AdminSlotsPage`, `AdminLotteryPage`, `AdminCrapsPage`) to understand each page's current StatCard rows + hero chart + secondary panel + recent-table — the additive-only constraint means you cannot reshape any of it.
- [ ] **Step 3:** Read `src/systems/stats.ts` end-to-end. Note existing per-game aggregator shapes; new KPIs will extend each return type.
- [ ] **Step 4:** Read `src/components/admin/DateRangeFilter.tsx` (from #14) — drill-down + KPIs feed off `sinceMs`.
- [ ] **Step 5:** Read `src/db/schema.ts` `Round` interface — confirm `details` is unstructured JSON (no migration required).
- [ ] **Step 6:** Memories.

### Task B.1 — NEW shared `TopPlayersPanel` + `getTopPlayersForGame`

**Files:** `src/components/admin/TopPlayersPanel.tsx` (NEW) + test, `src/systems/stats.ts` (add fn) + test.

- [ ] **Step 1:** Add aggregation:

  ```ts
  export interface TopPlayerRow {
    userId: string;
    username: string;
    rounds: number;
    netChips: number;
    biggestWin: number;
  }

  export async function getTopPlayersForGame(
    game: Round['game'],
    limit: number,
    sinceMs?: number,
  ): Promise<TopPlayerRow[]> {
    let rows = await db.rounds.where('game').equals(game).toArray();
    if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
    const byUser = new Map<string, { rounds: number; netChips: number; biggestWin: number }>();
    for (const r of rows) {
      const cur = byUser.get(r.userId) ?? { rounds: 0, netChips: 0, biggestWin: 0 };
      cur.rounds += 1;
      cur.netChips += r.netChange;
      if (r.netChange > cur.biggestWin) cur.biggestWin = r.netChange;
      byUser.set(r.userId, cur);
    }
    const usernames = await resolveUsernames([...byUser.keys()]); // helper from existing leaderboard aggregations
    return [...byUser.entries()]
      .map(([userId, v]) => ({
        userId,
        username: usernames.get(userId) ?? '<deleted>',
        rounds: v.rounds,
        netChips: v.netChips,
        biggestWin: v.biggestWin,
      }))
      .sort((a, b) => b.netChips - a.netChips)
      .slice(0, limit);
  }
  ```

  Note: `resolveUsernames` is the helper already present from PR C of #14 (used by leaderboard aggregations). Import or extract.

- [ ] **Step 2:** Test against ~12-round fixture across 3 users.

- [ ] **Step 3:** NEW `TopPlayersPanel.tsx`:

  ```tsx
  import type { JSX } from 'react';
  import { Link } from 'react-router';
  import { useLiveQuery } from 'dexie-react-hooks';
  import { getTopPlayersForGame, type TopPlayerRow } from '@/systems/stats';
  import type { Round } from '@/db';

  interface Props {
    game: Round['game'];
    limit?: number;
    sinceMs?: number;
  }

  const EMPTY: TopPlayerRow[] = [];

  export default function TopPlayersPanel({ game, limit = 10, sinceMs }: Props): JSX.Element {
    const rows = useLiveQuery(
      () => getTopPlayersForGame(game, limit, sinceMs),
      [game, limit, sinceMs],
      EMPTY,
    );
    return (
      <section aria-label="Top players" data-top-players-panel>
        <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">TOP PLAYERS</h2>
        <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-xs text-ivory/40">No players yet.</p>
          ) : (
            <table className="w-full text-left text-xs" data-top-players-table>
              <thead>
                <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Player</th>
                  <th className="py-2 pr-3">Rounds</th>
                  <th className="py-2 pr-3">Net chips</th>
                  <th className="py-2 pr-3">Biggest win</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.userId} className="border-b border-brass/10">
                    <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">{i + 1}</td>
                    <td className="py-2 pr-3 text-ivory">
                      <Link to={`/admin/users/${r.userId}`} className="hover:text-gold-bright">
                        {r.username}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                      {r.rounds.toLocaleString()}
                    </td>
                    <td
                      className={[
                        'py-2 pr-3 font-mono tabular-nums',
                        r.netChips >= 0 ? 'text-chip-win' : 'text-casino-red',
                      ].join(' ')}
                    >
                      {r.netChips >= 0 ? '+' : ''}
                      {r.netChips.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
                      +{r.biggestWin.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 4:** Smoke test for TopPlayersPanel.

- [ ] **Step 5:** Commit.
  ```bash
  git add src/components/admin/TopPlayersPanel.{tsx,test.tsx} src/systems/stats.{ts,test.ts}
  git commit -m "feat(stats): shared TopPlayersPanel + getTopPlayersForGame aggregation"
  ```

### Task B.2 — NEW `AdminBlackjackPage`

**Files:** `src/pages/admin/AdminBlackjackPage.{tsx,test.tsx}` (NEW) + extend `stats.ts` with Blackjack aggregations + NEW `BlackjackHandOutcomeBar` chart.

- [ ] **Step 1:** Add Blackjack aggregations to `stats.ts`:

  ```ts
  export interface BlackjackAllTimeStats {
    hands: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    actualRtp: number | null;
    // New KPIs (additive across this PR):
    avgHandValue: number | null;
    winRate: number | null;
    bustRate: number | null;
    splitRate: number | null;
    biggestHandWon: number;
  }

  export interface BlackjackHandOutcome {
    outcome: 'blackjack' | 'win' | 'lose' | 'push' | 'bust';
    count: number;
  }

  export async function getBlackjackAllTimeStats(sinceMs?: number): Promise<BlackjackAllTimeStats> {
    let rows = await db.rounds.where('game').equals('blackjack').toArray();
    if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
    // …reduce — read details.handResults for split/bust/etc; safe-cast as Record<string,unknown>; fall back to scalar fields on the row when details fields missing.
    return {
      /* … */
    };
  }

  export async function getBlackjackHandOutcomeDistribution(
    sinceMs?: number,
  ): Promise<BlackjackHandOutcome[]> {
    let rows = await db.rounds.where('game').equals('blackjack').toArray();
    if (sinceMs !== undefined) rows = rows.filter((r) => r.playedAt > sinceMs);
    const counts: Record<BlackjackHandOutcome['outcome'], number> = {
      blackjack: 0,
      win: 0,
      lose: 0,
      push: 0,
      bust: 0,
    };
    for (const r of rows) {
      const d = r.details as Record<string, unknown> | undefined;
      const outcome = inferBlackjackOutcome(r, d);
      counts[outcome] += 1;
    }
    return (Object.entries(counts) as Array<[BlackjackHandOutcome['outcome'], number]>).map(
      ([outcome, count]) => ({ outcome, count }),
    );
  }

  /** Infer outcome from row + details. Fall back to scalar inference if details missing. */
  function inferBlackjackOutcome(
    r: Round,
    d: Record<string, unknown> | undefined,
  ): BlackjackHandOutcome['outcome'] {
    // Blackjack details may include `{ playerTotal, dealerTotal, isBlackjack, isBusted, outcome }`. Use what's available.
    if (d && typeof d.outcome === 'string') return d.outcome as BlackjackHandOutcome['outcome'];
    // Fallback from scalars:
    if (r.netChange === 0) return 'push';
    if (r.netChange > 0) return r.payout >= r.betAmount * 2.5 ? 'blackjack' : 'win';
    return 'lose';
  }
  ```

  Read `src/games/blackjack/**` to confirm what shape `doSettle` writes to `details`. If `outcome` isn't persisted, the fallback path handles it.

- [ ] **Step 2:** NEW chart `src/components/charts/BlackjackHandOutcomeBar.tsx`:

  ```tsx
  import type { JSX } from 'react';
  import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
  import { ChartTooltipShell, DefaultChartTooltip } from './ChartTooltip';
  import type { BlackjackHandOutcome } from '@/systems/stats';

  const COLOR: Record<BlackjackHandOutcome['outcome'], string> = {
    blackjack: 'var(--brand-gold-bright, #e6c068)',
    win: 'var(--brand-chip-win, #4ade80)',
    push: 'var(--brand-ivory, #f6efde)',
    lose: 'var(--brand-casino-red, #b91c1c)',
    bust: 'var(--brand-casino-red, #7f1d1d)',
  };

  interface Props {
    data: BlackjackHandOutcome[];
  }

  export default function BlackjackHandOutcomeBar({ data }: Props): JSX.Element {
    return (
      <div className="h-56 w-full" data-blackjack-outcome-bar>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="outcome" tick={{ fill: 'var(--brand-ivory, #f6efde)', fontSize: 11 }} />
            <YAxis
              tick={{ fill: 'var(--brand-ivory, #f6efde)', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip content={<DefaultChartTooltip />} cursor={{ fill: 'rgba(232,189,109,0.1)' }} />
            <Bar dataKey="count">
              {data.map((d) => (
                <Cell key={d.outcome} fill={COLOR[d.outcome]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  ```

  Plus smoke test.

- [ ] **Step 3:** NEW `AdminBlackjackPage.tsx` (mirror AdminPlinkoPage layout):

  ```tsx
  import type { JSX } from 'react';
  import { useMemo, useState } from 'react';
  import { useLiveQuery } from 'dexie-react-hooks';
  import StatCard from './StatCard';
  import BlackjackHandOutcomeBar from '@/components/charts/BlackjackHandOutcomeBar';
  import DateRangeFilter, {
    rangeToSinceMs,
    type RangePreset,
  } from '@/components/admin/DateRangeFilter';
  import TopPlayersPanel from '@/components/admin/TopPlayersPanel';
  import {
    getBlackjackAllTimeStats,
    getBlackjackHandOutcomeDistribution,
    type BlackjackAllTimeStats,
    type BlackjackHandOutcome,
  } from '@/systems/stats';
  import { db } from '@/db';
  import type { Round } from '@/db';

  const EMPTY_STATS: BlackjackAllTimeStats = {
    hands: 0,
    totalWagered: 0,
    totalPaid: 0,
    netHouseChips: 0,
    actualRtp: null,
    avgHandValue: null,
    winRate: null,
    bustRate: null,
    splitRate: null,
    biggestHandWon: 0,
  };
  const EMPTY_OUTCOMES: BlackjackHandOutcome[] = [];
  const EMPTY_ROUNDS: Round[] = [];

  export default function AdminBlackjackPage(): JSX.Element {
    const [range, setRange] = useState<RangePreset>('all');
    const sinceMs = useMemo(() => rangeToSinceMs(range), [range]);

    const stats = useLiveQuery(() => getBlackjackAllTimeStats(sinceMs), [sinceMs], EMPTY_STATS);
    const outcomes = useLiveQuery(
      () => getBlackjackHandOutcomeDistribution(sinceMs),
      [sinceMs],
      EMPTY_OUTCOMES,
    );
    const recentRounds = useLiveQuery(
      async () => {
        const all = await db.rounds.where('game').equals('blackjack').toArray();
        return all.sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
      },
      [],
      EMPTY_ROUNDS,
    );
    const filteredRecent = useMemo(
      () => (sinceMs ? recentRounds.filter((r) => r.playedAt > sinceMs) : recentRounds),
      [recentRounds, sinceMs],
    );

    const houseNetTone: 'positive' | 'negative' | 'neutral' =
      stats.netHouseChips > 0 ? 'positive' : stats.netHouseChips < 0 ? 'negative' : 'neutral';
    const rtpDisplay = stats.actualRtp === null ? '—' : `${(stats.actualRtp * 100).toFixed(1)}%`;

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-base tracking-wider text-gold-bright">BLACKJACK</h1>
        <DateRangeFilter value={range} onChange={setRange} storageKey="admin.blackjack.range" />

        {/* Top 4 StatCards (matches every other admin page) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatCard label="Hands played" value={stats.hands.toLocaleString()} />
          <StatCard label="Total wagered" value={stats.totalWagered.toLocaleString()} />
          <StatCard
            label="House net chips"
            value={
              stats.netHouseChips >= 0
                ? `+${stats.netHouseChips.toLocaleString()}`
                : stats.netHouseChips.toLocaleString()
            }
            tone={houseNetTone}
          />
          <StatCard label="Actual RTP" value={rtpDisplay} sub="target ~99%" />
        </div>

        {/* Hero chart */}
        <section aria-label="Hand outcome distribution">
          <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">HAND OUTCOMES</h2>
          <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
            <BlackjackHandOutcomeBar data={outcomes} />
          </div>
        </section>

        {/* New KPI grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <StatCard
            label="Avg hand value"
            value={stats.avgHandValue === null ? '—' : stats.avgHandValue.toFixed(1)}
          />
          <StatCard
            label="Win rate"
            value={stats.winRate === null ? '—' : `${(stats.winRate * 100).toFixed(1)}%`}
          />
          <StatCard
            label="Bust rate"
            value={stats.bustRate === null ? '—' : `${(stats.bustRate * 100).toFixed(1)}%`}
          />
          <StatCard
            label="Split rate"
            value={stats.splitRate === null ? '—' : `${(stats.splitRate * 100).toFixed(1)}%`}
          />
          <StatCard
            label="Biggest hand won"
            value={stats.biggestHandWon === 0 ? '—' : `+${stats.biggestHandWon.toLocaleString()}`}
          />
        </div>

        {/* Top players panel */}
        <TopPlayersPanel game="blackjack" {...(sinceMs !== undefined ? { sinceMs } : {})} />

        {/* Recent rounds table */}
        <section aria-label="Recent hands">
          <h2 className="mb-2 font-display text-xs tracking-wider text-ivory/60">RECENT HANDS</h2>
          <div className="rounded-md border border-brass/60 bg-velvet-deep p-4">
            {filteredRecent.length === 0 ? (
              <p className="py-4 text-center text-xs text-ivory/40">No hands recorded.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brass/30 uppercase tracking-wider text-ivory/40">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Bet</th>
                    <th className="py-2 pr-3">Payout</th>
                    <th className="py-2 pr-3">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.map((r) => (
                    <tr key={r.id} className="border-b border-brass/10">
                      <td className="py-2 pr-3 font-mono tabular-nums text-ivory/55">
                        {new Date(r.playedAt).toISOString().slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-ivory/85">
                        {r.betAmount.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-gold-bright">
                        {r.payout.toLocaleString()}
                      </td>
                      <td
                        className={[
                          'py-2 pr-3 font-mono tabular-nums',
                          r.netChange >= 0 ? 'text-chip-win' : 'text-casino-red',
                        ].join(' ')}
                      >
                        {r.netChange >= 0 ? '+' : ''}
                        {r.netChange.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    );
  }
  ```

- [ ] **Step 4:** Test with seeded fixture (~10 blackjack rounds).

- [ ] **Step 5:** Lazy route in `router.tsx`:

  ```ts
  const AdminBlackjackPage = lazy(() => import('@/pages/admin/AdminBlackjackPage'));
  // route: { path: 'blackjack', element: <AdminBlackjackPage /> },
  ```

- [ ] **Step 6:** AdminLayout NAV_ITEMS — insert "Blackjack" after "Sessions" or in alphabetical position. Update AdminLayout.test.tsx ordering.

- [ ] **Step 7:** Commit.

### Task B.3 — NEW `AdminCoinFlipPage`

Mirror Task B.2 for Coin-flip. Aggregations:

- `getCoinFlipAllTimeStats(sinceMs?)` → `{ flips, totalWagered, totalPaid, netHouseChips, actualRtp, longestStreak, headsCallRate, tailsCallRate, avgBet, biggestSingleWin }`
- `getCoinFlipFaceDistribution(sinceMs?)` → `[{ outcome: 'heads' | 'tails', count }]`

NEW chart: `CoinFlipFaceDistributionBar.tsx`.

NEW page: `AdminCoinFlipPage.tsx` — same shape as B.2.

Lazy route + AdminLayout nav entry + AdminLayout test update.

- [ ] Steps 1-7 mirror B.2.

### Task B.4 — Extend existing 9 admin pages with KPI grid + extra chart + drill-down

**Pattern (apply per page):**

1. Extend the page's aggregator (in `stats.ts`) with new KPI fields (additive — old fields stay, no behaviour change).
2. NEW chart wrapper (one per game per §4.3.4 of spec). Verify Craps already has the bet-type chart; skip Craps's extra chart.
3. In the page, render BELOW the existing hero chart:
   - The NEW chart (alongside or below the existing hero chart)
   - The NEW KPI grid (secondary StatCard row)
   - The NEW `<TopPlayersPanel game="<game>" sinceMs={sinceMs} />`
4. Update test: existing assertions stay (additive constraint); add new assertions for `[data-top-players-panel]`, the new KPI StatCards, the new chart's `data-*` attr.

**Page-by-page checklist:**

- [ ] **B.4.a Plinko (`AdminPlinkoPage`)** — KPIs from spec §4.3.3 (avg ball drop / risk distribution / edge-bin hit rate / auto-session avg balls / biggest single ball). NEW chart `PlinkoRiskTierBar`. Drill-down panel.
- [ ] **B.4.b Poker (`AdminPokerPage`)** — KPIs (avg hands per session / win rate / biggest pot ever / avg buy-in / all-in frequency). NEW chart `PokerWinRateByPositionBar`. Drill-down panel.
- [ ] **B.4.c Bingo (`AdminBingoPage`)** — KPIs (avg call count / fast-bingo rate / per-difficulty house edge / avg session length / biggest single win). NEW chart `BingoCallCountHistogram`. Drill-down panel.
- [ ] **B.4.d Baccarat (`AdminBaccaratPage`)** — KPIs (banker % / player % / tie % / avg shoe length / biggest single win). NEW chart `BaccaratWinnerDonut`. Drill-down panel.
- [ ] **B.4.e Roulette (`AdminRoulettePage`)** — KPIs (avg spin payout / hot number / cold number / column bias / biggest single win). NEW chart `RouletteColumnBiasBar`. Drill-down panel.
- [ ] **B.4.f Slots (`AdminSlotsPage`)** — KPIs (avg payout / symbol jackpot count / avg spin cost / biggest single win / avg session length). NEW chart `SlotsSymbolHeatmap`. Drill-down panel.
- [ ] **B.4.g Lottery (`AdminLotteryPage`)** — KPIs (avg ticket spend / per-prize-tier hit rate / jackpot near-misses / avg lines per ticket / biggest single payout). NEW chart `LotteryPrizeTierBar`. Drill-down panel.
- [ ] **B.4.h Craps (`AdminCrapsPage`)** — KPIs (avg rolls per session / seven-out rate / point-made rate / bet-type variety / biggest single roll). Skip extra chart (`CrapsBetTypeFrequencyBar` already exists). Drill-down panel.

For each, commit per page or batched 2-3.

### Task B.5 — Visual verification

- [ ] **Step 1:** Screenshot all 11 admin pages at 1440×900. Confirm:
  - Existing top StatCard row + hero chart + recent table all still render (additive constraint verified)
  - NEW KPI grid below hero chart
  - NEW extra chart alongside hero (or below, where space requires)
  - NEW TopPlayersPanel renders
  - DateRangeFilter functional

### Task B.6 — Full DoD + open PR

- [ ] **Step 1:** Full DoD. 2,717 existing tests stay green (additive constraint).
- [ ] **Step 2:** Push + open PR. Title: `phase-15(#14.5) PR B: admin completion + per-user drill-down + KPIs + charts` (~80 chars).
- [ ] **Step 3:** Report. STOP.

---

## PR C — `_shared/` + non-admin pages sweep

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-5-pr-c
```

### Task C.0 — Read context + drift inventory

- [ ] **Step 1:** Read spec §4.4.
- [ ] **Step 2:** Read each `_shared/` primitive (7 files): GameShell, RulesButton, RulesModal, OddsInfoBox, BettingPanel, RecentResults, StubGamePage. Note current tokens + structure.
- [ ] **Step 3:** Read non-admin pages: LoginPage, RegisterPage, ProfilePage, SettingsPage, LobbyPage. Note current tokens.
- [ ] **Step 4:** Read `src/components/ui/` Button/Card/Field/Input — confirm they already use brand tokens (or note required updates).
- [ ] **Step 5:** Grep for remaining drift: `grep -rE "text-white\b|text-gold\b|bg-felt-deep\b|min-h-screen" src/pages/ src/games/_shared/ --include="*.tsx"`.

### Task C.1 — `_shared/` primitives sweep

Per file, token swap + verify no `min-h-screen` + verify standardised button/header tokens.

- [ ] **Step 1: `GameShell.tsx`** — swap `bg-felt-deep` → `bg-felt-table`; `text-white` → `text-ivory`; `text-gold` (when text colour) → `text-gold-bright`. Verify root container uses `flex h-full flex-col`. Update test.
- [ ] **Step 2: `RulesButton.tsx`** — apply primary-button-tier tokens from Critical Context table (button hierarchy). Update test.
- [ ] **Step 3: `RulesModal.tsx`** — apply standardised modal chrome (`bg-velvet-deep border border-brass/60 rounded-lg shadow-2xl`); backdrop `bg-black/60 backdrop-blur-sm`. Body `max-h-[60vh] overflow-y-auto`. Update test.
- [ ] **Step 4: `OddsInfoBox.tsx`** — `text-gold` → `text-gold-bright`; `bg-velvet-deep` panel; ivory body. Update test.
- [ ] **Step 5: `BettingPanel.tsx`** — chip stacks brand-tokened (brass-edged, gold-bright highlights); MAX/MIN buttons secondary-tier. Update test.
- [ ] **Step 6: `RecentResults.tsx`** — `bg-felt-deep` → `bg-felt-table-deep`; tier badges brand-token-mapped. Update test.
- [ ] **Step 7: `StubGamePage.tsx`** — brand-token sweep. Update test.
- [ ] **Step 8: Commit** batched as `feat(theme): _shared/ primitives brand pass + standardised tokens`.

### Task C.2 — Non-admin pages sweep

- [ ] **Step 1: `LoginPage.tsx`** — title `text-gold` → `text-gold-bright`; verify `Card`/`Field`/`Input`/`Button` are brand-tokened (PR C extends `src/components/ui/` if not). Card chrome: `bg-velvet-deep border border-brass/60`.
- [ ] **Step 2: `RegisterPage.tsx`** — same pattern.
- [ ] **Step 3: `ProfilePage.tsx`** — title brand pass; Avatar chrome verify; edit-form Card brand pass.
- [ ] **Step 4: `SettingsPage.tsx`** — sections brand-tokened; Delete-Account zone `border-2 border-casino-red` destructive tier.
- [ ] **Step 5: `LobbyPage.tsx`** — verify tile chrome already brand-tokened (probably is — was polished in #3 + #10). Brand sweep on any remaining drift. Hero marquee polish.
- [ ] **Step 6:** Any game-wrapper pages in `src/pages/` not yet visited — token sweep.
- [ ] **Step 7: Commit** per page or batched 2-3.

### Task C.3 — `src/components/ui/` audit

- [ ] **Step 1:** Read each component (Button, Card, Field, Input, Modal, Tooltip, etc) — confirm brand tokens.
- [ ] **Step 2:** If any use legacy `text-white` / `text-gold` / `bg-felt-deep`, swap to brand tokens.
- [ ] **Step 3:** If button variants don't match the standardised hierarchy (primary/secondary/tertiary/destructive), extend `Button.tsx` variant prop accordingly.
- [ ] **Step 4:** Update tests + commit.

### Task C.4 — Visual verification

- [ ] **Step 1:** Dev + Playwright. Screenshot Login, Register, Profile, Settings, Lobby + 2 game pages that consume `_shared/` (e.g. Blackjack + Roulette) to verify the `_shared/` sweep cascaded correctly.
- [ ] **Step 2:** Verify standardised button tiers + modal chrome present + no min-h-screen overflow.

### Task C.5 — Full DoD + open PR

- [ ] **Step 1:** Full DoD.
- [ ] **Step 2:** Push.
- [ ] **Step 3:** `gh pr create --title "phase-15(#14.5) PR C: _shared/ + non-admin pages brand sweep" --body "..."` (~62 chars).
- [ ] **Step 4:** Report. STOP.

---

## PR D — In-game drift sweep

### Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-14-5-pr-d
```

### Task D.0 — Read context + INTENTIONAL colour preservation list

- [ ] **Step 1:** Read spec §4.5 PLUS the Critical Context "INTENTIONAL game-identity colours" table in this plan.
- [ ] **Step 2:** Build a drift inventory: `grep -rlE "text-white\b|text-gold\b|bg-felt-deep\b|min-h-screen|border-gold" src/games/ --include="*.tsx" | sort`.

### Task D.1 — Mechanical sweep per-game

For each game directory, perform the mechanical token swap PLUS verify intentional colours are preserved. Per file:

1. Read file end-to-end.
2. Identify each legacy token occurrence:
   - `text-white` → `text-ivory` (unless inside game-identity logic like dice pip white)
   - `text-white/N` → `text-ivory/N`
   - `text-gold` → `text-gold-bright` (when text foreground; preserve when it's part of a gradient or background spec)
   - `bg-felt-deep` → `bg-felt-table` (page bg) / `bg-felt-table-deep` (panel bg) / `bg-velvet-deep` (card)
   - `border-gold/N` → `border-brass/N`
   - `min-h-screen` → `flex h-full flex-col` (page root) or `flex-1` (inner)
3. **Cross-reference the intentional-colour preservation list.** If the token is in the preservation list, skip.
4. Update test (if it pins any of the swapped tokens).
5. Visual sanity check.

**Commit order** (split for review ergonomics):

- [ ] **D.1.a Blackjack + Roulette** (~10 files)
- [ ] **D.1.b Slots + Baccarat** (~12 files) — watch Slots `neon-magenta` jackpot
- [ ] **D.1.c Bingo + Lottery** (~14 files) — watch BINGO column palette
- [ ] **D.1.d Plinko** (~10 files) — watch `jewel-magenta` edge bins
- [ ] **D.1.e Poker** (~20 files: 3 variants + shared) — should be mostly clean post-#12, but verify
- [ ] **D.1.f Craps + Coin-flip** (~10 files) — watch PointPuck colours + BrandCoin

Commit each batch: `feat(theme): drift sweep — <games>`.

### Task D.2 — `BingoPage.tsx` + `DealingDemo.tsx` `min-h-screen` fix

These two files still use `min-h-screen` per the spec's risk callout. Fix in PR D as part of the per-game pass.

- [ ] **Step 1:** `BingoPage.tsx` root: swap to `flex h-full flex-col`.
- [ ] **Step 2:** `DealingDemo.tsx` (dev-only, unrouted) — swap or delete. Confirm with quick `grep -r "DealingDemo" src/` — if no callers, delete; otherwise swap.
- [ ] **Step 3:** Update tests.

### Task D.3 — Visual verification

- [ ] **Step 1:** Screenshot each game page at 1440×900 after the sweep. Confirm no visual regression.

### Task D.4 — Full DoD + open PR

- [ ] **Step 1:** Full DoD.
- [ ] **Step 2:** Push.
- [ ] **Step 3:** `gh pr create --title "phase-15(#14.5) PR D: in-game drift sweep — token consistency" --body "..."` (~65 chars).
- [ ] **Step 4:** Report. STOP.

---

## Self-review

**Spec coverage:**

- §4.2 Player Stats + Leaderboard reskin → PR A (tasks A.0-A.7)
- §4.3.1 NEW admin pages → PR B (B.2 + B.3)
- §4.3.2 TopPlayersPanel → PR B (B.1)
- §4.3.3 Per-game KPI grid → PR B (B.4.a-h, additive)
- §4.3.4 Per-game extra chart → PR B (B.4.a-g, additive; Craps skipped)
- §4.4 `_shared/` + non-admin pages sweep → PR C (C.1-C.3)
- §4.5 In-game drift sweep with intentional-colour preservation → PR D (D.0-D.2)

**Placeholder scan:** None. Every step has explicit code stubs, commands, or per-file checklists.

**Type consistency:** `TopPlayerRow`, `BlackjackAllTimeStats`, `BlackjackHandOutcome`, `CoinFlipAllTimeStats`, `RangePreset` all defined once + reused. Per-game KPI fields appended additively to existing `XAllTimeStats` interfaces.

**Risks carried forward:** All spec §6 risks have explicit task coverage:

- PR B size → split commits per page in B.4
- PR D width → split commits per game-pair in D.1
- Additive-only constraint → explicit rule #16 + B.4 instructions
- TopPlayersPanel = shared primitive used by 11 pages → built once in B.1
- Bundle splitting → verify in DoD `pnpm build`
- `min-h-screen` cleanup on BingoPage + DealingDemo → D.2
- Empty-state on new aggregations → fallback `—` per existing pattern in each new StatCard

---
