# Phase 15 sub-project #14.5 — Polish completion (Stats + Leaderboard reskin + admin completion + consistency audit)

**Status:** Spec
**Author:** Developer + Claude (assistant)
**Date:** 2026-05-28
**Phase:** 15 (Polish & Overhaul) · MASQUER cross-cutting · slotted between #14 Admin overhaul and #15 Final integration
**Scope:** Player-facing Stats + Leaderboard pages, admin completion (missing pages + enrichment), `_shared/` primitives, non-admin pages, in-game drift sweep

---

## 1. Goal

Close every remaining visual + functional gap in the MASQUER suite before the final manual smoke + tag-cutting of #15. Three bundled goals:

1. **Reskin + upgrade the player-facing Stats + Leaderboard pages** — currently still pre-MASQUER (`min-h-screen`, `bg-felt-deep`, `text-white`).
2. **Complete the admin suite** — every game must have an admin page (Blackjack + Coin-flip currently lack one) + every existing game admin page gets **enriched** stats (per-user drill-down panel + new KPIs + game-specific extra chart) **without removing anything that exists today**.
3. **Cross-codebase consistency audit** — the wider `_shared/` primitives, non-admin pages, and remaining in-game drift all get a brand-token + layout/UX pass so the whole app looks unified.

After #14.5 ships, only **#15 Final integration & launch polish** (manual smoke + README + tag cutting) remains.

## 2. Non-goals

Out of scope:

- Manual end-to-end smoke + bug triage — deferred to #15.
- README / CHANGELOG / docs sweep — deferred to #15.
- Tag cutting (`v0.15.XX-*` releases) — deferred to #15.
- New game features — only polish.
- Schema migrations — all new aggregations read existing `rounds` / `users` / `adjustments` tables. Optional `details.*` fields read with `?.` and graceful undefined-handling.

Pure game logic in `src/games/**/{logic,machine,bets,...}.ts` is **byte-stable**. Aggregations in `src/systems/stats.ts` are **additive only** — never modify existing fns' behaviour.

## 3. Locked design decisions

1. **4 PRs in one sub-project** (called #14.5 between #14 and #15) — PR A Stats+Leaderboard reskin, PR B Admin completion + enrichment, PR C `_shared/` + non-admin pages sweep, PR D In-game drift sweep.
2. **Full overhaul stats depth on PR B** — per-user drill-down panel (top 10 players for this game) + 3-5 new KPIs in a secondary StatCard grid + 1 game-specific extra chart per existing admin page.
3. **Full visual audit depth on PRs C+D** — token swap + layout/UX consistency (button styles, modal chrome, padding rhythm). Flag and fix UX inconsistencies, not just colours.
4. **Additive-only constraint on PR B** — every existing StatCard, chart, recent table, panel on every existing admin page **stays**. New KPIs render in a SECONDARY grid below the hero chart. The game-specific extra chart renders ALONGSIDE the existing hero chart (not replacing it). The per-user drill-down panel is NEW vertical space. **Zero existing elements get deleted or replaced.**

## 4. Architecture

### 4.1 PR decomposition

| PR                                         | Files | Scope                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Stats + Leaderboard reskin**         | ~14   | Drop `min-h-screen` → `h-full flex-col`; MASQUER chrome on `StatsPage` + `LeaderboardPage` + their LeftRails + sub-pages + supporting components                                                                                                                    |
| **B — Admin completion + enrichment**      | ~30   | NEW `AdminBlackjackPage` + `AdminCoinFlipPage` + lazy routes + sidebar entries. Enrich 9 existing game admin pages additively: per-user drill-down panel + new KPI grid + game-specific extra chart. ~15 new aggregations. NEW shared `TopPlayersPanel` component.  |
| **C — `_shared/` + non-admin pages sweep** | ~33   | 7 `_shared/` primitives (`GameShell`, `RulesButton`, `RulesModal`, `OddsInfoBox`, `BettingPanel`, `RecentResults`, `StubGamePage`) + non-admin pages (`Login`, `Register`, `Profile`, `Settings`, `Lobby`, game-wrapper pages). Token swap + layout/UX consistency. |
| **D — In-game drift sweep**                | ~71   | Mechanical token swap across `src/games/**`. Watch for intentional game-identity colours (Slots neon-magenta jackpot, Coin-flip BrandCoin).                                                                                                                         |

Dispatch order: A first → B + C in parallel → D last (D needs the `_shared/` tokens locked in by C as reference).

### 4.2 PR A details — Player Stats + Leaderboard reskin

**`StatsPage.tsx` + `LeaderboardPage.tsx`:**

- Root: `<div className="flex h-full flex-col bg-felt-table text-ivory">` (drops `min-h-screen` per [[masquer-min-h-screen-in-pages]]).
- Header: gold-bright title, brand-tokened `<ViewModeToggle />`.
- `<main>` wrapper: `flex flex-1 overflow-auto p-6`.

**LeftRails (`StatsLeftRail` + `LeaderboardLeftRail`):**

- `bg-velvet-deep border-r border-brass/60`.
- Nav items match `AdminLayout` sidebar pattern (`border-l-[3px] border-brass bg-velvet text-gold-bright` active; `text-ivory/55 hover:bg-velvet/50` inactive).
- "OVERVIEW / PER-GAME" heading: `font-display text-xs tracking-[0.2em] text-gold-bright`.

**Sub-pages** (`StatsOverviewPage`, `StatsPerGamePage`, `LeaderboardOverviewPage`, `LeaderboardPerGamePage`, `Board`):

- Token swap to brand pairings.
- `text-gold` (legacy) → `text-gold-bright`.
- `bg-black` accents → `bg-velvet-deep`.

**Supporting components** (`EmptyState`, `StatCardGrid`, `ViewModeToggle`, `MeAllToggle`):

- Brand-tokened chrome — match the equivalent shapes in `_shared/` admin primitives.

`formatters.ts` — pure utility, byte-stable.

### 4.3 PR B details — Admin completion + enrichment

#### 4.3.1 NEW admin pages

**`AdminBlackjackPage.tsx`** — standard 4 StatCards + hero chart + recent table:

- StatCards: Hands played · Total wagered · House Net Chips (green positive / red negative) · Actual RTP
- Hero chart: `BlackjackHandOutcomeBar` (NEW) — bar of `blackjack / win / lose / push / bust` counts
- Recent table (last 20): hand outcome, bet, payout, timestamp

**`AdminCoinFlipPage.tsx`** — same 4 StatCards + hero chart + recent table:

- StatCards: Flips played · Total wagered · House Net Chips · Actual RTP
- Hero chart: `CoinFlipFaceDistributionBar` (NEW) — bar of heads vs tails outcome counts
- Recent table (last 20): face called, face landed, bet, payout, timestamp

#### 4.3.2 Per-user drill-down panel on every game admin page

NEW `src/components/admin/TopPlayersPanel.tsx`:

```ts
interface Props {
  game: Round['game'];
  limit?: number; // default 10
  sinceMs?: number; // optional date filter from existing DateRangeFilter
}
```

Renders a panel with: heading "TOP PLAYERS" + `rank · username · rounds · net chips · biggest single win` columns. Click row → navigate to `/admin/users/:userId`.

Aggregation: `getTopPlayersForGame(game, limit, sinceMs?): Promise<Array<{ userId, username, rounds, netChips, biggestWin }>>`.

Used by all 11 game admin pages (the 9 existing + the 2 new from §4.3.1).

#### 4.3.3 Per-game new KPI grid (secondary StatCard row, below hero chart)

| Game                | New KPIs (additive — never replaces existing top StatCard row)                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Blackjack**       | avg hand value · win rate · bust rate · split rate · biggest hand won                                           |
| **Roulette**        | avg spin payout · hot number · cold number · column bias · biggest single win                                   |
| **Slots**           | avg payout · symbol jackpot count · avg spin cost · biggest single win · avg session length                     |
| **Baccarat**        | banker win % · player win % · tie % · avg shoe length · biggest single win                                      |
| **Bingo**           | avg call count · fast-bingo rate · per-difficulty house edge · avg session length · biggest single win          |
| **Lottery**         | avg ticket spend · per-prize-tier hit rate · jackpot near-misses · avg lines per ticket · biggest single payout |
| **Plinko**          | avg ball drop · risk distribution · edge-bin hit rate · auto-session avg balls · biggest single ball            |
| **Poker**           | avg hands per session · win rate · biggest pot ever · avg buy-in · all-in frequency                             |
| **Craps**           | avg rolls per session · seven-out rate · point-made rate · bet-type variety · biggest single roll               |
| **Coin-flip** (new) | longest streak · heads-call rate · tails-call rate · avg bet · biggest single win                               |

Each new KPI uses the existing `<StatCard>` component for layout consistency. Empty values (no data yet) render `—` per existing pattern.

#### 4.3.4 Per-game extra chart (rendered alongside existing hero chart)

| Game                      | New chart                                                    |
| ------------------------- | ------------------------------------------------------------ |
| **Blackjack** (new admin) | `BlackjackHandOutcomeBar` — hand outcome distribution        |
| **Roulette**              | `RouletteColumnBiasBar` — 1st/2nd/3rd column hit %           |
| **Slots**                 | `SlotsSymbolHeatmap` — symbol frequency per reel position    |
| **Baccarat**              | `BaccaratWinnerDonut` — banker/player/tie distribution       |
| **Bingo**                 | `BingoCallCountHistogram` — call count distribution per game |
| **Lottery**               | `LotteryPrizeTierBar` — prize-tier hit distribution          |
| **Plinko**                | `PlinkoRiskTierBar` — risk-tier session distribution         |
| **Poker**                 | `PokerWinRateByPositionBar` — win rate by seat position      |
| **Craps**                 | (already has `CrapsBetTypeFrequencyBar` from #13 — skip)     |
| **Coin-flip** (new admin) | `CoinFlipFaceDistributionBar` — heads vs tails outcome       |

All chart wrappers brand-tokened + use `ChartTooltipShell` (#251).

#### 4.3.5 New aggregations summary

Per-game aggregations (additive in `stats.ts`):

- `getBlackjackAllTimeStats(sinceMs?)` + `getBlackjackHandOutcomeDistribution(sinceMs?)`
- `getCoinFlipAllTimeStats(sinceMs?)` + `getCoinFlipFaceDistribution(sinceMs?)`
- `getTopPlayersForGame(game, limit, sinceMs?)` — shared by all 11 pages
- Per-game KPI computers (one per game in §4.3.3) — could be folded into the existing `getXAllTimeStats` extension, or as separate fns. **Decision**: extend each existing `getXAllTimeStats` return type with new optional KPI fields. Page reads them and renders the secondary StatCard grid. Back-compat: tests that destructure existing fields keep working.
- Per-game extra-chart aggregations (one per game in §4.3.4) — separate fns each.

Total new aggregations: ~12-15 depending on KPI consolidation.

### 4.4 PR C details — `_shared/` + non-admin pages sweep

#### 4.4.1 `_shared/` primitives (7 files)

| File                | Touches                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `GameShell.tsx`     | Replace `bg-felt-deep` / `text-white` / legacy `text-gold` with brand tokens. Layout rhythm verify.       |
| `RulesButton.tsx`   | Brand-tokened button (brass-outlined, gold-bright on hover).                                              |
| `RulesModal.tsx`    | `bg-velvet-deep border border-brass/60 rounded-lg` + ivory body + max-h-[60vh] overflow-y-auto preserved. |
| `OddsInfoBox.tsx`   | `text-gold` → `text-gold-bright`; `bg-velvet-deep` panel.                                                 |
| `BettingPanel.tsx`  | Brand tokens on chip stacks, MAX/MIN buttons, balance display.                                            |
| `RecentResults.tsx` | `bg-felt-deep` → `bg-felt-table-deep`; brand-tokened chip tier badges.                                    |
| `StubGamePage.tsx`  | Brand tokens (this is a placeholder template).                                                            |

#### 4.4.2 Non-admin pages (~26 files)

| File                                 | Touches                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginPage.tsx` / `RegisterPage.tsx` | Already use `@/components/ui` primitives — verify Card/Field/Input/Button are brand-tokened (PR C extends if not). Title legacy `text-gold` → `text-gold-bright`. |
| `ProfilePage.tsx`                    | Token swap on page title + Avatar circle chrome + edit-form Card.                                                                                                 |
| `SettingsPage.tsx`                   | Token swap on section dividers + Settings groups + Delete-Account zone (red border).                                                                              |
| `LobbyPage.tsx`                      | Verify all tile chrome uses brand tokens. Hero marquee polish.                                                                                                    |
| Game-wrapper pages (in `src/pages/`) | If any wrap a game without GameShell, token swap.                                                                                                                 |

#### 4.4.3 Layout/UX consistency

- **Button hierarchy** — standardised across the app:
  - **Primary**: `bg-velvet border-2 border-brass text-gold-bright hover:bg-velvet-deep`
  - **Secondary**: `border border-brass/60 text-ivory hover:bg-velvet`
  - **Tertiary**: `text-ivory hover:text-gold-bright`
  - **Destructive**: `border-2 border-casino-red text-casino-red hover:bg-casino-red/10`
- **Modal chrome**: `bg-velvet-deep border border-brass/60 rounded-lg shadow-2xl`; backdrop `bg-black/60 backdrop-blur-sm`.
- **Page padding rhythm**: pages use `p-6 / pt-14`; modals use `p-6`.
- **Header hierarchy**:
  - Page title: `font-display text-2xl tracking-[0.18em] text-gold-bright`
  - Section title: `font-display text-xs tracking-wider text-ivory/60` (admin) or `text-gold` (lobby cards)
  - Card label: `font-display text-[11px] tracking-[0.18em] text-ivory/55`
- **`Card`/`Field`/`Input`/`Button` from `@/components/ui`** — verify they all use brand tokens. If any still have legacy hex / `text-white`, fix in PR C.

### 4.5 PR D details — In-game drift sweep (71 files)

Mechanical pass across `src/games/**`. Per file:

| From                                           | To                                                          |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `text-white`                                   | `text-ivory`                                                |
| `text-white/60` / `text-white/55` etc          | `text-ivory/55` (or matching opacity)                       |
| `text-gold` (when text colour, not background) | `text-gold-bright`                                          |
| `bg-felt-deep` (page bg)                       | `bg-felt-table`                                             |
| `bg-felt-deep/80` (panel bg)                   | `bg-velvet-deep/80`                                         |
| `border-gold/30` / `border-gold/40`            | `border-brass/30` / `border-brass/60`                       |
| Any remaining `min-h-screen`                   | `h-full flex-col` (page roots) or `flex-1` (inner sections) |

**INTENTIONAL legacy colours — DO NOT touch:**

- Slots `neon-magenta` jackpot signature accent (`src/games/slots/SlotsPage.tsx` celebration tier 3)
- Coin-flip `BrandCoin` heads/tails facing — these are part of the brand mark, not theme tokens
- Roulette pocket colours (`roulette-red`, `roulette-pocket`, `roulette-green`) — game-intrinsic
- Baccarat scoreboard colours (`scoreboard-banker`, `scoreboard-player`, `scoreboard-tie`) — game-intrinsic
- Bingo BINGO column colours — game-intrinsic
- Plinko `jewel-magenta` edge-bin signature — game-intrinsic
- Craps PointPuck colours (`casino-red` OFF, `gold-bright` ON) — game-intrinsic
- Casino brand colours (`text-chip-win`, `text-casino-red`) — semantic, keep

**Verification per file:** read each rewritten file mentally / via a quick re-render check. The mechanical replace tools (sed) can be used for the easy cases (`text-white \b → text-ivory \b`); but each file needs at least a quick visual confirmation before committing.

**Commit strategy for PR D:** split into ~5 commits by game (Blackjack+Roulette / Slots+Baccarat / Bingo+Lottery / Plinko / Poker+Craps+CoinFlip) to keep diffs reviewable.

## 5. Standing rules

Per `PHASE_15_PATTERNS.md §2`:

1. **Pure logic untouched.** Aggregations in `stats.ts` are **additive only**.
2. **Games sandbox preserved.** Admin code under `src/pages/admin/**` may read from `src/db/**` / `src/store/**` / `src/systems/**`.
3. **Integer money. No `Math.random()`.** ESLint enforces.
4. **No CLAUDE.md edits.**
5. **Commit subject ≤ 100 chars.**
6. **Scopes:** `admin`, `stats`, `ui`, `routing`, `theme` (cross-codebase brand sweep), `docs`. Never `admin-blackjack` etc.
7. **No `--no-verify`, no `--amend`.**
8. **TS strict + exactOptionalPropertyTypes.**
9. **Tokens-only Tailwind** in rebuilt files.
10. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** ([[masquer-min-h-screen-in-pages]]).
11. **Visual verification via Playwright at 1440×900 before pushing each PR** ([[masquer-screenshot-before-pushing-ui]]).
12. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```
13. **`useLiveQuery` inferred-Promise pattern** — no explicit generic (Phase 9 trap).
14. **Recharts uses `ChartTooltipShell`** (#251 pattern).
15. **House Net tone:** green positive / red negative.

**Additional sub-project-specific rule:**

- **Additive-only constraint on PR B** — every existing StatCard, chart, panel, table, header, label, button, link, and assertion on every existing admin page **MUST stay**. New content adds vertical space; never overwrites. Tests that pin existing elements remain green; new tests cover new elements only.

## 6. Risks + watch-outs

- **PR B is HUGE.** ~30 files + ~15 new aggregations. If the implementer hits midway-fatigue, prefer pausing + reporting partial progress over half-committing. Could ship in two sub-PRs (B1 = new admin pages + shared TopPlayersPanel, B2 = enrich existing 9 with KPIs + extra charts). Implementer can split if needed; flag in PR description.
- **PR D is widest (71 files).** Mechanical but every file needs visual sanity check. **Watch for intentional game-identity colours** listed in §4.5.
- **Additive-only on PR B is non-negotiable.** Existing admin-page tests pin specific text / charts; those MUST keep passing. Any test failure of an existing assertion means the rule was broken — revert that change.
- **Per-user drill-down panel** — used by 11 pages. Get `TopPlayersPanel` right once; treat as load-bearing shared primitive.
- **Bundle splitting risk** — adding ~15 new aggregations + 2 new admin pages + drill-down panel will grow the admin bundle. Verify `pnpm build` doesn't exceed warning thresholds.
- **`min-h-screen` cleanup on game pages** — `src/games/baccarat/DealingDemo.tsx` and `src/games/bingo/BingoPage.tsx` still have `min-h-screen`. DealingDemo is dev-only (unrouted); BingoPage shipped without the AppLayout-fit fix. PR D includes both.
- **Empty-state handling on new aggregations** — many games have zero data for the new metrics until users play. Each new StatCard / chart must render `—` or "No data yet" gracefully.

## 7. Definition of done

- All 4 PRs merged.
- Player Stats + Leaderboard pages MASQUER-themed; no `min-h-screen`.
- All 11 games have an admin page (existing 9 + new 2).
- Every existing admin page enriched: drill-down panel + KPI grid + extra chart, **without removing anything**.
- `_shared/` primitives + non-admin pages brand-tokened + layout-unified.
- In-game drift sweep complete; consistent palette across all 14 games.
- All Phase 15 standing rules respected.
- Tag candidate: `v0.15.14.5-polish-completion` after manual smoke.
- **After #14.5, only #15 Final integration & launch polish remains.**

## 8. Open questions

None at spec-write time. All key decisions locked.

## 9. Workflow

Per [`PHASE_15_PATTERNS.md §3`](../../PHASE_15_PATTERNS.md#3-sub-project-workflow):

1. **Spec PR** (this doc).
2. **Plan PR** with task breakdown + inline code stubs.
3. **PR A** dispatched first.
4. **PR B + PR C** dispatched in parallel after PR A merges.
5. **PR D** dispatched after PR B + PR C merge.
6. User says "start next" → controller starts **#15 Final integration & launch polish**.

---
