# Phase 7 — Stats + Leaderboard (design spec)

**Status:** Approved 2026-05-19.
**Owner:** @adamzspare.
**Implements:** BUILD_GUIDE §9 (Stats) and §10 (Leaderboard).
**Related:** ADR-0016 (every round writes one row via wallet.settleRound — the rounds table is the single source for derived stats), ADR-0035 (Phase 9 tracking schema — sessions and gameVisits are the source for time-played and per-session stats).

## 1. Goal

Replace the two stub pages at `/stats` and `/leaderboard` with playable, data-driven dashboards that derive everything from the existing `rounds`, `sessions`, `gameVisits`, and `users` tables. Ship together, tagged `v0.8-stats-leaderboard`.

## 2. In scope

- StatsPage at `/stats` with left-rail nav: Overview tab + one tab per game (Blackjack / Roulette / Slots / Baccarat / Coin Flip).
- LeaderboardPage at `/leaderboard` with the same left-rail structure.
- Per-page **Cards ↔ Graphs view-mode toggle** (top-right), persisting across sessions via `uiStore`, one preference shared between both routes.
- 16 metrics per game (overview is the aggregated all-games view; per-game tabs scope every metric to that game).
- 5 overview leaderboards + 3 boards × 5 games = 20 boards total. Every board has a **Me / All** toggle.
- **Friendly empty-state** ("No rounds in Blackjack yet — try it! →") on every zero-round tab.
- Aggregation refactor: promote `src/pages/admin/queries.ts` → `src/systems/stats.ts`, extend with player-facing metrics (peaks, streaks, sessions, win rate). Admin imports from the new location.
- Recharts moved into a shared lazy chunk used by both player (Graphs view) and admin (dashboard) pages.

## 3. Out of scope

- Time-windowed views ("Today", "This Week"). All-time only. Possible Phase 15 polish.
- Date-range custom filtering.
- Export to CSV / PDF.
- Player profiles / pages beyond the existing stub at `/profile`.
- Cross-machine sync, friend lists, social.
- Achievements / badges.
- Stats for the admin user — admin remains a synthetic session with no rounds (ADR-0034).

## 4. Page structure

### 4.1 Left-rail nav (both pages)

```
┌──────────────┬─────────────────────────────────────────────────────┐
│ 📊 OVERVIEW  │  Header: title · Cards ↔ Graphs toggle (top-right) │
│ 🃏 Blackjack │  Empty-state nudge OR data content                  │
│ 🎡 Roulette  │                                                     │
│ 🎰 Slots     │                                                     │
│ 🎴 Baccarat  │                                                     │
│ 🪙 Coin Flip │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

- Rail width: 160 px. Active tab highlighted with gold left-border and gold-bright text.
- Tab state stored in URL: `/stats` = overview, `/stats/blackjack` = per-game. Direct-link friendly.
- Same scheme for `/leaderboard`, `/leaderboard/blackjack`, etc.
- The view-mode toggle (top-right of the content area) persists across tabs and across the two routes — one preference per user, stored in the `uiStore`.

### 4.2 Header + view-mode toggle

```
┌──────────────────────────────────────────────────────────────┐
│  STATS · OVERVIEW                          [ Cards | Graphs ]│
└──────────────────────────────────────────────────────────────┘
```

- Title uses display font, gold-bright. Includes current tab name.
- Toggle is a two-segment pill (Cards default, Graphs alternative). Sets the `viewMode` slice in `uiStore`. Persisted to `localStorage` under `localGamble.ui.statsViewMode`.

### 4.3 Empty state

When a player has zero rounds for the active tab:

- **Overview empty:** "No rounds yet — pick a game from the lobby and your stats will appear here." + lobby button.
- **Per-game empty:** "No Blackjack rounds yet — try it! →" + a button that navigates to `/play/blackjack`.

Cards-view shows the empty-state component instead of stat cards. Graphs-view shows the same empty-state (charts collapse to a single message).

## 5. StatsPage metrics

The same metric set applies to the Overview tab (aggregated across all games) and to each per-game tab (scoped to just that game).

### 5.1 Core metrics (BUILD_GUIDE §9)

| Metric        | Source                                  | Definition                                                       |
| ------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Rounds played | `rounds`                                | Count of rows for this user (and game, if scoped)                |
| Total wagered | `rounds.betAmount`                      | Sum                                                              |
| Total won     | `rounds.payout`                         | Sum of all credited chips (stake-returned + winnings)            |
| Total lost    | `-rounds.netChange where netChange < 0` | Sum of forfeit stake across losing rounds                        |
| Net change    | `rounds.netChange`                      | Sum (signed)                                                     |
| RTP %         | `(totalWon / totalWagered) * 100`       | Returns-to-player percentage. Shown as "—" when totalWagered = 0 |
| Time played   | `gameVisits.durationMs`                 | Sum, formatted as "Xh Ym" or "Xm Ys"                             |

### 5.2 Peaks & streaks

| Metric                       | Source                      | Definition                                                      |
| ---------------------------- | --------------------------- | --------------------------------------------------------------- |
| Biggest single-round win     | `rounds.netChange`          | Max positive netChange. Shows round timestamp                   |
| Biggest single-round loss    | `rounds.netChange`          | Min (most-negative) netChange. Shows round timestamp            |
| Longest win streak           | `rounds.outcome === 'win'`  | Longest consecutive run of wins, oldest-to-newest order         |
| Longest losing streak        | `rounds.outcome === 'loss'` | Longest consecutive run of losses (pushes break neither streak) |
| Highest balance ever reached | `rounds.balanceAfter`       | Max value of `balanceAfter` across all rounds + starting chips  |

### 5.3 Extras

| Metric           | Source                                             | Definition                                                    |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Best session     | `sessions` + `rounds` joined on time-window        | Highest sum of netChange across rounds within one session row |
| Worst session    | same                                               | Lowest sum                                                    |
| Average bet size | `rounds.betAmount / rounds.count`                  | Mean                                                          |
| Win rate %       | `rounds.outcome === 'win' / total non-push rounds` | Excludes pushes from denominator                              |

Total: **16 metrics** (7 core + 5 peaks/streaks + 4 extras). Overview tab shows all 16 in aggregated form. Per-game tabs show all 16 scoped to that game.

### 5.4 Cards view rendering

Stat cards are arranged in a responsive grid (4-col on wide, 2-col on narrow):

```
┌────────────┬────────────┬────────────┬────────────┐
│ NET CHANGE │ ROUNDS     │ WAGERED    │ RTP        │
│   +1,250   │    147     │   5,820    │   98.2%    │
└────────────┴────────────┴────────────┴────────────┘
┌────────────┬────────────┬────────────┬────────────┐
│ BIGGEST WIN│ BIGGEST    │ WIN STREAK │ LOSS STREAK│
│   +320     │    LOSS    │     7      │     4      │
│            │   −180     │            │            │
└────────────┴────────────┴────────────┴────────────┘
... etc
```

Each card has: small uppercase label, large value (signed where applicable, gold-bright for positive, casino-red for negative, white for neutrals), optional sub-text (e.g. "across 99 rounds" on Win Rate, timestamp on Biggest Win).

### 5.5 Graphs view rendering

The Cards layout is replaced (toggle is mutually exclusive). Charts list per tab:

**Overview tab (Graphs mode):**

- `NetFlowLine` — daily net change over the user's entire play history (reuses Phase 9's existing chart).
- `GameDistributionDonut` — rounds per game (reuses Phase 9's chart).
- `WinRateByGameBar` — horizontal bar per game showing win-rate %. New chart this phase.

**Per-game tab (Graphs mode):**

- `NetFlowLine` — same chart, filtered to just this game's rounds.
- `WinLossTimeline` — sparkline of round outcomes (win/loss/push as colored ticks). New chart.
- `BetSizeHistogram` — distribution of bet amounts in 5-bin buckets. New chart.

A small summary header above the charts still shows the headline numbers (Net, Rounds, RTP) so the user has context.

## 6. LeaderboardPage boards

### 6.1 Overview tab — 5 boards

| Board                          | Sort                                              | Tiebreaker                               |
| ------------------------------ | ------------------------------------------------- | ---------------------------------------- |
| **Biggest net winner**         | netChange desc                                    | createdAt asc                            |
| **Most rounds played**         | rounds.count desc                                 | createdAt asc                            |
| **Biggest single-round win**   | max(netChange) desc                               | round.playedAt asc (older win wins ties) |
| **Longest win streak**         | maxWinStreak desc                                 | createdAt asc                            |
| **Most variety (games tried)** | distinct(game).count desc, then rounds.count desc | createdAt asc                            |

### 6.2 Per-game tab — 3 boards × 5 games = 15 boards

Each game tab (Blackjack / Roulette / Slots / Baccarat / Coin Flip) shows:

| Board                                       | Sort                          |
| ------------------------------------------- | ----------------------------- |
| **Best player** (highest net for this game) | netChange (in that game) desc |
| **Biggest single-round win** (in that game) | max(netChange) desc           |
| **Most rounds played** (in that game)       | rounds.count desc             |

### 6.3 Me / All toggle

Each board has a small **Me / All** pill toggle at top-right:

- **All** (default): Top 10 entries; current user highlighted with gold ring and "(you)" annotation.
- **Me**: Shows the current user's row PLUS up to 3 entries above and 3 below. Centered on the user. If user is in top 10, looks similar to All. If user is rank 47, shows ranks 44-50.

The toggle is per-board (you can flip individual boards independently). State is in-session only — does not persist across reloads.

### 6.4 Banned users

Filtered out of every leaderboard. The `isBanned` flag from Phase 9 (ADR-0034) excludes users from the underlying `getAllUserStats()` filter when called from leaderboard code. Stats for the banned user are still derivable for them (their own /stats page works), but they don't appear on /leaderboard rankings.

### 6.5 Cards vs Graphs view

The same view-mode toggle applies. In Graphs mode:

- **Overview tab**: shows the same 5 boards as ranked horizontal bar charts (player name + bar length scaled to leader = 100%).
- **Per-game tab**: same 3 boards as horizontal bar charts.

Cards view: standard ranking table with rank number, username, value, and a small accent for the current user.

## 7. Aggregation refactor

### 7.1 Move

`src/pages/admin/queries.ts` → `src/systems/stats.ts`

The file becomes the single neutral source of derived stats. Admin and player pages both import from there. The existing Phase 9 functions (`getAllUserStats`, `getSiteWideStats`, `getNetFlowSeries`, `getGameDistribution`, `getTopWinners`, `getTopLosers`, plus per-user helpers) are preserved unchanged in signature.

### 7.2 New functions added

For each user, scoped optionally to a single game:

```
getUserMetrics(userId, game?): UserMetrics  // 15-metric bundle
getUserStreaks(userId, game?): { longestWin: number, longestLoss: number }
getUserPeaks(userId, game?): { biggestWin, biggestLoss, highestBalance }
getUserSessionStats(userId, game?): { best: number, worst: number, count: number }
getUserWinLossTimeline(userId, game?, limit?): Array<{ playedAt, outcome }>
getUserBetSizeHistogram(userId, game?): Array<{ binMin, binMax, count }>
```

Site-wide additions for leaderboards (already partially supported in Phase 9 admin):

```
getLeaderboard(metric: LeaderboardMetric, game?: Game, limit?: number): Array<LeaderboardRow>
```

Where `LeaderboardMetric` covers each of the 20 boards (overview + per-game).

### 7.3 Phase 9 admin compatibility

Admin pages must continue to work without changes beyond their import paths. PR sequence: PR A renames + adds re-export shim at the old path so admin keeps working through the cutover; PR F deletes the shim once admin imports are updated.

## 8. View-mode preference (uiStore extension)

Existing `src/store/uiStore.ts` holds the sidebar collapsed state. Extend it:

```ts
interface UiState {
  // ... existing
  statsViewMode: 'cards' | 'graphs';
  setStatsViewMode: (mode: 'cards' | 'graphs') => void;
}
```

Persisted to `localStorage` under `localGamble.ui.statsViewMode` (matches the existing `localGamble.ui.sidebarCollapsed` pattern). Default: `'cards'`.

## 9. Recharts shared lazy chunk

Currently Recharts lives in the admin Vite chunk (lazy-loaded when admin pages mount). Phase 7 needs Recharts on `/stats` and `/leaderboard` too.

**Decision:** extract the chart wrappers (`NetFlowLine`, `GameDistributionDonut`, plus the three new player-only charts) to `src/components/charts/`. Each component does its own `lazy()` import internally OR the whole `src/components/charts/` is lazy-loaded as a chunk. Implementation choice in the plan; goal is to keep the main bundle unchanged (still 720 kB) while reusing one Recharts chunk across player + admin.

The three new charts (`WinRateByGameBar`, `WinLossTimeline`, `BetSizeHistogram`) live alongside the moved ones.

## 10. Tests

### 10.1 systems/stats.ts (≥ 90% line coverage)

- Every existing Phase 9 function continues to pass its existing tests (the test file moves with the module).
- New functions get unit tests with seeded `rounds` / `sessions` / `gameVisits` data:
  - Empty / single-round / many-rounds for each metric.
  - Edge cases for streaks: all-wins, all-losses, alternating, pushes interrupting (do not reset).
  - Peaks: ties on biggest win (oldest wins per tiebreaker).
  - Win rate: pushes excluded from denominator; zero non-push rounds returns null.
  - Histogram: zero-bet rounds excluded; bin boundaries are inclusive-low/exclusive-high.

### 10.2 StatsPage / LeaderboardPage integration tests

- Mount with zero rounds → friendly empty-state visible, no crash.
- Mount with seeded rounds → headline numbers correct, all 15 cards present in Cards view.
- Toggle Cards → Graphs → charts render (jsdom + ResizeObserver polyfill from Phase 9 setup).
- Toggle persists across remount via uiStore.
- LeaderboardPage Me / All toggle filters correctly with multiple seeded users.
- Banned user excluded from leaderboard but their /stats still works.

### 10.3 Visual smoke (manual, before PR F)

Walk every tab on both pages. Confirm empty state on a fresh user, switch toggle, navigate to a game, play 5 rounds, return, verify reactive update via useLiveQuery.

## 11. ADRs to write

- **ADR-0038 — Stats aggregation module location.** Document the move of `pages/admin/queries.ts` → `systems/stats.ts`. Justify the rename (the file is no longer admin-specific). Note the deprecation of the admin re-export shim after PR F.
- **ADR-0039 — Shared Recharts chunk.** Document the chart-wrapper extract to `src/components/charts/`. Justify keeping the chunk shared between player and admin to avoid double-loading Recharts.

## 12. PR sequencing (6 PRs)

| PR  | Branch                                 | Scope                                                                                                                                                                                                    |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `phase-7-pr-a-stats-module`            | Move `pages/admin/queries.ts` → `systems/stats.ts`; add re-export shim at old path; add new functions (peaks, streaks, sessions, win-rate, histograms, getLeaderboard). Exhaustive unit tests. ADR-0038. |
| B   | `phase-7-pr-b-stats-cards`             | StatsPage shell (left rail + tabs + view-mode toggle), uiStore extension, all 16 stat cards on overview + per-game in Cards view. Empty-state component. Integration tests.                              |
| C   | `phase-7-pr-c-stats-graphs`            | Extract chart wrappers to `src/components/charts/`, add three new charts (`WinRateByGameBar`, `WinLossTimeline`, `BetSizeHistogram`), wire Graphs view on overview + per-game tabs. ADR-0039.            |
| D   | `phase-7-pr-d-leaderboard-cards`       | LeaderboardPage shell (same left rail), all 20 boards in Cards view, Me / All toggle, banned-user exclusion. Integration tests.                                                                          |
| E   | `phase-7-pr-e-leaderboard-graphs`      | Graphs view on LeaderboardPage (boards rendered as horizontal bar charts). Remove the queries.ts re-export shim; switch admin to import from `systems/stats.ts` directly.                                |
| F   | `chore/release-v0.8-stats-leaderboard` | BUILD_GUIDE marks Phase 7 ✅; tag `v0.8-stats-leaderboard`; GitHub Release; memory snapshot update.                                                                                                      |

Estimated total tasks: ~40.

## 13. Definition of done (phase-level)

After PR E merges, before PR F:

- All 4 CI checks green on every PR.
- ~250 new tests passing.
- Bundle: main bundle ≤ 730 kB (delta < 15 kB vs 720 kB baseline). Recharts in shared lazy chunk only.
- Manual smoke walkthrough (spec §10.3) passes.
- Admin dashboard still works end-to-end with the new shared aggregation module.
- New user with zero rounds sees friendly empty states on both pages; navigating to a game from a per-game empty state lands on the correct game route.

## 14. Risks

- **Refactor risk on Phase 9 admin queries.** Moving `queries.ts` could break admin pages if the shim isn't bulletproof. Mitigation: PR A keeps the shim; admin tests continue to pass against both paths during the transition. PR E removes the shim only after admin imports are updated and verified.
- **Recharts double-loading.** If the chart-wrapper extract creates two chunks, the main bundle could regress. Mitigation: build-output inspection in PR C confirms one Recharts chunk in `dist/assets/`.
- **Win-streak performance.** Computing longest streaks requires scanning all rounds in order. For users with thousands of rounds this could spike. Mitigation: cap the scan to most recent 10,000 rounds (still derivable, just bounded); document the cap inline.
- **LiveQuery overload.** Many simultaneous useLiveQuery subscriptions across 5 tabs × 15 metrics could create thrash on every settled round. Mitigation: each tab only queries its own scope; reactive updates only fire when the underlying tables change.
- **Empty-state friction.** A new user lands on /stats and sees only empty states. Mitigation: every empty state has a button that links straight to the relevant game.

## 15. Open questions

None remaining at design time. (If any surface during implementation, raise inline rather than silently picking.)
