# Phase 15 sub-project #10.v1 — Bingo (British) upgrade

**Status:** Draft for user review (amended 2026-05-26 — admin stats expansion added per user feedback; same single PR).
**Date:** 2026-05-26 (initial + addendum same day).
**Sub-project:** #10.v1 in the Phase 15 umbrella (`2026-05-22-phase-15-umbrella-roadmap-design.md`). Per release order, follows #9 Lottery ✅, precedes #10.v2 Bingo (American), then #11 Plinko.
**Variant split:** Per the umbrella's variant-as-config rule, multi-variant games split into `x.vN` sub-projects. **10.v1 ships the SHARED chrome polish** (works for both British and American) **plus British-only variant bits**. **10.v2 ships American-only variant bits** and inherits the shared chrome from 10.v1 for free.
**Original release:** Phase 11 / 11.5 (`v0.11-bingo` solo → `v0.11.5-bingo-competitive` competitive vs CPUs, shipped 2026-05-19/20). 90-ball British 3×9 + 75-ball American 5×5 (with free centre), 3 difficulties (Easy 2 CPUs / Medium 5 / Hard 9 — Hard forces manual daub), tier-1 line + tier-2 (two-line / four-corners) bonuses + tier-3 full-house / blackout payout, per-CPU latency rolled at game start, race-to-claim semantics via global `claimedTiers: Set<Tier>`. ADR-0033 tiered-celebration reused. No bingo-specific ADRs of its own.
**Scope answer:** _Pure re-skin (both variants visually equal) + sound + scrollable modals + LobbyButton/OddsInfoBox manual retrofit + RulesModal + ball-call animation polish + MASQUER · Bingo title. Logic + machine byte-stable._

---

## 1. Goal

Bring the bingo cabinet to the MASQUER / Velvet Deco bar via the now-standard polish patterns, picking up both variants visually. Most of the game stays as-is — the variant-as-config logic, the XState machine with `cpuScheduler` `fromCallback` actor, the global tier-claim race, the in-game bonus accumulation, the tier celebration reuse from ADR-0033, the admin tunability page at `/admin/bingo` — all stay structurally intact. The work is:

1. **Visual rebuild** — tokenize colours across all 10 bingo files, retrofit `LobbyButton` + `OddsInfoBox` into the custom BingoPage header (no `GameShell` wrapper — same pattern lottery uses).
2. **Sound integration** — wire `useSound` for ball-call, daub-tap, tier win/loss, and bonus-claim stingers.
3. **Scrollable modals** — `max-h-[60vh] overflow-y-auto` on `BingoVariantModal` and `EndScreen` (and the existing rules modal if there is one).
4. **Animation polish on ball-call** — make the ball-reveal more dramatic (scale-in + glow flash, ~250 ms per call) matching the lottery hero pattern from #255, with `useEffectiveReducedMotion` short-circuit.
5. **Rules modal** — bingo doesn't have a rules popover today. Add the bottom-left RULES button + `RulesModal` covering both variants' rules.
6. **British-only variant bits** — palette refinement for the 9-decile UK ball colours; FAST BINGO bonus copy refresh; column-range labels in the British rules section.

The rest (logic, machine, ball-caller scheduler, CPU AI, claim semantics, per-difficulty tuning, admin page) stays byte-stable.

---

## 2. Decomposition (umbrella variant split)

**Single PR for 10.v1.** Spec → plan → implementation PR cycle, then user explicit "start next" → 10.v2.

10.v1 ships:

- All SHARED chrome polish (works for both variants).
- British-only variant bits (palette refinements, British rules-section content).
- American keeps working visually but doesn't get its variant-specific polish yet (5-column B-I-N-G-O headers refinement, US palette refinements, free-centre treatment) — those land in 10.v2.

  10.v2 will ship:

- American-only variant bits.
- Inherits all chrome from 10.v1 (no chrome work duplicated).

---

## 3. Standing invariants

1. **Pure logic untouched.** `src/games/bingo/logic.ts`, `machine.ts`, `useBingoBallCaller.ts`, and their `*.test.ts` stay byte-stable. The `VARIANTS` config, the `evaluateCardWins` per-variant evaluator, the `generateCard` per-variant generator, the `pickSymbol`-equivalent ball-sequence generator — all unchanged.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from `src/games/bingo/**`. Wallet via `@/systems/**` (existing pattern via `useGameRound`).
3. **One `rounds` row per game** (ADR-0016). Bonus accumulation pattern from Phase 11.5 unchanged — bonuses earned during play accumulate in `machine.context.bonusesEarned` and pay in the final `settleRound` payout.
4. **Integer money. No `Math.random()`.** Existing ESLint enforces.
5. **Spec-first per CLAUDE.md.** No ADR changes expected (no new ADR; no amendments).
6. **No CLAUDE.md edits.**
7. **Commitlint header-max-length 100** (`feedback-masquer-commit-subject-limit`); only `admin` (not `admin-bingo`) is a valid scope (`reference-masquer-commitlint-scopes`).
8. **`/admin/bingo` page untouched** — already ships per-difficulty tuning controls from Phase 11.5; not in this PR's scope.

---

## 4. Scope (single PR — 10.v1)

### 4.1 Title + shared shell retrofit

BingoPage doesn't use `GameShell`. Manually retrofit:

- **MASQUER · Bingo** title in the page header (replaces `🎯 BINGO — 🇬🇧 SETUP` etc. — keep variant indicator but as a small subtitle next to the title, not in the title itself).
- **`<LobbyButton />`** from `@/games/_shared/LobbyButton` absolute top-left of the page (manual retrofit; mirror the lottery pattern from #255).
- **`<OddsInfoBox>`** absolute top-right with contents: `Line 25 · Double Line 75 · BINGO 250 · Fast BINGO 500 (≤40 calls)`.
- **Rules button** — bottom-left, opening the `<RulesModal>`. Covered in §4.6.

The current `<h1>🎯 BINGO — 🇬🇧 SETUP</h1>` becomes:

```
[LobbyButton]                 MASQUER · Bingo                [OddsInfoBox]
                              British · setup
```

(British/American picked from the existing variant state; difficulty shown as subtitle if game is in progress.)

### 4.2 Visual rebuild (brand pass — shared across both variants)

Tokenize colours across:

- `BingoPage.tsx`
- `BingoVariantModal.tsx`
- `BingoCard.tsx`
- `CallBoard.tsx`
- `CpuCardMini.tsx`
- `WinBanner.tsx`
- `EndScreen.tsx`
- `DaubToggle.tsx`
- `SetupPanel.tsx`
- `ballPalette.ts` (only if the palette has raw hex that should move to tokens; the per-decile / per-column semantic colours should largely stay since they're intrinsic brand colours of the game — promote to brand-named tokens only if a clear equivalent exists)

Replace raw hex with brand tokens (`bg-felt-table`, `bg-felt-table-deep`, `text-ivory`, `text-gold`, `text-gold-bright`, `border-brass`, `bg-velvet`, `bg-velvet-deep`, `bg-jewel-magenta` for tier-3 win signature). New tokens added only if missing.

**Card surface**: each player's card sits on a `bg-velvet` panel with brass border. Daubed cells get a `bg-jewel-magenta` ring (or gold-glow) to read at a glance. CpuCardMini gets a smaller version of the same.

**Call board** (the running list of called balls): brass-framed strip showing the current ball (large + animated) + the last 10 balls + "Ball N of 90" (British) / "Ball N of 75" (American).

### 4.3 Sound

Wire `useSound`:

| Event                                     | Sample        | Notes                               |
| ----------------------------------------- | ------------- | ----------------------------------- |
| Each ball call                            | `ball.drop`   | Reuse (shipped for lottery in #255) |
| Manual daub tap                           | `chip.place`  | Reuse                               |
| Tier-1 LINE claim (user-first)            | `win.small`   | Reuse                               |
| Tier-2 DOUBLE LINE / 4-CORNERS claim      | `win.medium`  | Reuse                               |
| Tier-3 BINGO / Fast BINGO win             | `win.jackpot` | Reuse                               |
| Tier-3 BINGO claimed by CPU (player loss) | `loss`        | Reuse                               |

All gated on `useEffectiveReducedMotion`. If a single CPU's claim race results in many simultaneous events, debounce/coalesce in the page bridge (typical case: only the winner gets a stinger).

### 4.4 Animation polish on ball-call

Currently the called ball appears with a Framer Motion drop-in. Polish:

- **Ball reveal**: when a new ball is called, the current-ball circle scales in from 0.6 → 1.05 → 1.0 with a gold-glow flash (~250 ms) — same pattern as the lottery hero ball-reveal from #255 task A.5. `useEffectiveReducedMotion` short-circuit collapses to instant.
- **Drum-roll feel**: maybe a brief 100 ms "shuffle" of fake numbers before settling on the called ball — implementer's call (small touch; skip if it feels like padding).
- **Daub tap**: small scale punch (0.95 → 1.05 → 1.0, ~150 ms) on cell-tap in manual mode.
- **Per-cell daub indicator**: a brass disc fills the cell with a slight rotate-in.

### 4.5 Scrollable modals

`max-h-[60vh] overflow-y-auto` on:

- `BingoVariantModal` body (the variant + difficulty chooser — typically small but apply the cap anyway for visual consistency).
- `EndScreen` per-card breakdown (this CAN grow tall if the player has 4 cards × many wins).

The new `RulesModal` (§4.6) gets the same treatment via the shared component.

Apply brand-token chrome to each modal (`bg-velvet-deep`, `border-brass/60`, ivory body text).

### 4.6 RulesModal — covers both variants

Bingo doesn't have a rules popover today. Add the RULES button + `RulesModal` (shared component) at the bottom-left of `BingoPage`. Content sections:

- **Object** — Match the called numbers on your card. Be first to claim a tier.
- **Variants**:
  - **British (90-ball)** — 3×9 grid, 15 numbered cells per card. Numbers 1–90, distributed across 9 columns (1-9, 10-19, ..., 80-90).
  - **American (75-ball)** — 5×5 grid with a FREE centre, 24 numbered cells per card. Numbers under B (1-15), I (16-30), N (31-45), G (46-60), O (61-75).
- **Tiers** — LINE (any row complete) pays 25 · DOUBLE LINE / FOUR CORNERS pays 75 · BINGO (full card) pays 250 · FAST BINGO (≤40 calls) pays a 500-chip bonus.
- **Daub mode** — AUTO (cells daub when called) or MANUAL (you click each cell yourself). Hard difficulty forces manual.
- **Difficulty** — Easy 2 CPUs · Medium 5 CPUs · Hard 9 CPUs. Higher difficulty = larger pot multiplier (×2 / ×4 / ×8) and faster CPU latency.
- **Race-to-claim** — Tier prizes go to whoever calls first (you or a CPU). Tier-1 + tier-2 bonuses get paid only when YOU win them; tier-3 BINGO is the pot. Bonuses paid in the final round settlement.
- **Reduced motion** — Animations collapse; the game stays fully playable.

### 4.7 British-only variant bits

- Refine the 9-decile UK ball palette tokens (or keep current if visually fine).
- Refresh FAST BINGO copy / banner in `WinBanner` and `EndScreen` for British wording.
- British rules-section content in `LotteryRules`-style component (per §4.6).

(American-only refinements — 5-column B-I-N-G-O column headers, free-centre treatment, US palette refinements — stay for 10.v2.)

### 4.8 Admin stats expansion (per user feedback, 2026-05-26)

Extend `/admin/bingo` with stat panels alongside the existing per-difficulty tuning selector (which stays untouched — the selector is the page's primary control surface and must keep working).

**Layout** — keep the existing difficulty tuning section at the top (or wherever it currently sits), add a new "STATISTICS" section below it that mirrors the layout pattern shipped in `AdminRoulettePage` / `AdminSlotsPage` / `AdminBaccaratPage`:

#### 4.8.1 Top: 4 StatCards

| Card                   | Value                                                      | Notes                                                                                                          |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Games played           | All-time count of `rounds where game === 'bingo'`          | Volume baseline.                                                                                               |
| House net (chips)      | `sum(betAmount) - sum(payout)`                             | Red tone if positive (house up) / green if negative (house down) — matches lottery / roulette card convention. |
| Player BINGO capture % | `(player tier-3 wins) / (total games settled)`             | % of games where the player beat all CPUs to the tier-3 BINGO.                                                 |
| FAST BINGO hit rate    | `(games settled with finalCallCount ≤ 40) / (total games)` | Pace metric.                                                                                                   |

#### 4.8.2 Hero chart: Variant × Difficulty distribution

Stacked-bar chart with one bar per variant (British / American), segmented by difficulty (Easy / Medium / Hard). Uses the `ChartTooltipShell` from #251 with a small custom content showing the variant + difficulty + count. Wraps in the existing lazy admin chart chunk (ADR-0039).

#### 4.8.3 Bonus economics panel

A small 4-row mini-bar panel (the same `MiniBar` component used by Roulette/Baccarat admin panels) showing:

- Line wins (count + total chips paid)
- Double Line / Four Corners wins (count + total chips paid)
- BINGO (tier-3) wins by player (count + total chips paid)
- FAST BINGO bonus hits (count + total chips paid — the 500-chip kicker)

#### 4.8.4 Average balls-to-BINGO per difficulty

Three numeric stat cells in a row (Easy / Medium / Hard) showing the mean `finalCallCount` for games that ended in tier-3 BINGO. Lower number = faster games. Helps the operator see if a difficulty's CPU latency is well-tuned.

#### 4.8.5 Card-count usage

Single mini-bar panel showing percentage of games played with 1 / 2 / 3 / 4 cards. Helps the operator see player load preferences.

#### 4.8.6 Recent games table (last 20)

Mirrors the recent-rounds tables in Roulette / Baccarat / Slots / Lottery admin pages post-#250 / #251:

| Played at | Variant | Difficulty | Outcome | Cards | Bet | Payout | House P/L |
| --------- | ------- | ---------- | ------- | ----- | --- | ------ | --------- |

Outcome shows a coloured badge: green "BINGO" for tier-3 player win, gold for tier-1/tier-2 bonus-only, red "LOST" for CPU-won tier-3. Use the same brand-token + tabular-nums treatment as the other admin recent tables.

**Ordering**: load all `bingo` rounds, sort by `playedAt` desc in-memory, slice 20 — the pattern from #250 that fixed the `.where(...).reverse().limit()` indexing bug.

#### 4.8.7 New aggregations in `src/systems/stats.ts`

Additive functions (do NOT modify existing fns):

```ts
export interface BingoAllTimeStats {
  gamesPlayed: number;
  totalWagered: number;
  totalPaid: number;
  netHouseChips: number;
  netPlayerChips: number;
  actualRtp: number | null;
  playerTier3Wins: number; // player won the BINGO
  cpuTier3Wins: number; // a CPU won the BINGO (player loss)
  playerBingoCapturePct: number; // playerTier3Wins / gamesPlayed
  fastBingoCount: number; // finalCallCount <= 40 settled
  fastBingoHitRate: number; // fastBingoCount / gamesPlayed
  lineWins: number;
  doubleLineWins: number;
  // (Four Corners is a tier-2 American-only variant; track separately if details carry it.)
  fourCornersWins: number;
  totalLinePaid: number;
  totalDoubleLinePaid: number;
  totalFourCornersPaid: number;
  totalFastBingoPaid: number; // 500-chip kicker payouts
}

export interface BingoVariantDifficultyCount {
  variant: 'british' | 'american';
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

export interface BingoCardCountUsage {
  cardCount: 1 | 2 | 3 | 4;
  count: number;
}

export interface BingoBallsToBingo {
  difficulty: 'easy' | 'medium' | 'hard';
  averageCalls: number | null; // null when no tier-3 player win at that difficulty yet
}

export async function getBingoAllTimeStats(): Promise<BingoAllTimeStats>;
export async function getBingoVariantDifficultyDistribution(): Promise<
  BingoVariantDifficultyCount[]
>;
export async function getBingoCardCountUsage(): Promise<BingoCardCountUsage[]>;
export async function getBingoBallsToBingo(): Promise<BingoBallsToBingo[]>;
```

All iterate `db.rounds.where('game').equals('bingo').toArray()` once. Implementer verifies the actual `BingoRoundDetails` shape (variant / difficulty / finalCallCount / fastFullHouse / cardCount / cpuTier3Winner / perCardPayouts / bonusesEarned) and adapts the field reads accordingly. If any of the requested fields aren't currently persisted (e.g. `cardCount`), document the gap in the PR description and ship the stats that ARE derivable — DO NOT change `rounds` schema or `BingoRoundDetails` writes to add new fields in this PR.

Tests pin each aggregation against a ~15-row bingo fixture covering both variants × all 3 difficulties × mixed outcomes.

### 4.9 Out of scope (deferred docket items + 10.v2 territory)

Deferred-docket items (per `masquer-deferred-features`):

- Pattern Bingo (X, T, postage stamp etc.) — out.
- Speed Bingo / Coverall jackpot — out.
- Multi-human-player mode — N/A single-user.
- Custom CPU AI personalities — out.
- Per-CPU latency variation across calls — out.
- Save/resume mid-game — out.
- Ball-cage animation (real physics) — out; the polish in §4.4 is enough.
- Auto-call BINGO in manual mode — out.

  10.v2 territory (not touched here):

- 5-column B-I-N-G-O column header treatment.
- Free-centre cell visual signature.
- US palette refinements (5-column semantic colours).
- Any American-specific rules-section refinements.

### 4.9 Out of scope (renumbered after admin-stats addendum)

Was §4.8 in the original draft. Same content (deferred-docket items + 10.v2 territory). The admin stats expansion in §4.8 is NOW in scope.

### 4.10 Scope guardrails (10.v1)

**Allowed paths:**

- `src/games/bingo/**` (all UI files + tests) — game polish per §4.1–§4.7.
- `src/systems/stats.ts` + test — additive new aggregations per §4.8.7.
- `src/pages/admin/AdminBingoPage.tsx` + test — add STATISTICS section while preserving the existing per-difficulty tuning UI per §4.8.
- `src/components/charts/**` — only if a new chart wrapper is needed (likely `BingoVariantDifficultyBar.tsx` — mirror `PocketDistributionBar` / `BaccaratWinnerBar` pattern).
- `tailwind.config.ts` + `src/theme/tokens.ts` (only if a new bingo-specific token is genuinely needed — default: reuse existing).
- `BUILD_GUIDE.md` (only if §11 / §11.5 needs a small amendment note pointing to the polish; default: skip).

**Not allowed:**

- `src/games/bingo/logic.ts` / `machine.ts` / `useBingoBallCaller.ts` and their `*.test.ts` — byte-stable.
- Other games.
- Schema migrations (admin stats are read-only over existing `rounds.details`).
- The existing `/admin/bingo` per-difficulty tuning UI — preserve it; add stats alongside, don't replace.
- New gameplay (no new tiers, no Pattern Bingo, no Speed Bingo).

---

## 5. Sub-project workflow

Per the umbrella's §6 cycle:

1. **Spec PR** (this doc).
2. **Plan PR**.
3. **Implementation PR** (single — no PR B).
4. Await user's explicit "start next" → 10.v2 American.

---

## 6. Testing strategy

- **Pure logic** (`logic.test.ts`, `machine.test.ts`, `useBingoBallCaller.test.ts`) — untouched; all existing tests pass.
- **Page tests** — update for new title, LobbyButton + OddsInfoBox presence, rules button, sound mocks.
- **Animation tests** — assert ball-reveal motion variant + reduced-motion path (mock `useEffectiveReducedMotion`).
- **Modal tests** — assert scrollable container class on EndScreen + BingoVariantModal.
- **DoD**: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`

---

## 7. Risks + open items

- **Title takes up too much space in the busy bingo header**. The current header already crowds difficulty + setup status. Implementer should be mindful — the subtitle should be quiet (e.g. `text-xs text-ivory/55`).
- **Ball-call sound cadence under fast-difficulty**. Hard difficulty calls balls fast (instant or near-instant). 75–90 `ball.drop` sounds in quick succession could be exhausting. Lower sample volume or add a tiny cooldown if it feels bad. Implementer judgment.
- **Manual-daub `chip.place` sound on every tap** could feel noisy when daubing many cells. Consider debouncing or playing a quieter variant. Implementer judgment.
- **EndScreen content height** — already can grow tall with 4 cards × many wins. The scroll cap (§4.5) helps; verify under stress.

---

## 8. Self-review

1. **Placeholder scan**: none.
2. **Internal consistency**: variant split explicit (10.v1 ships shared + British-only bits; 10.v2 ships American-only bits + inherits chrome).
3. **Scope check**: single PR; logic byte-stable; admin untouched.
4. **Ambiguity check**: ball-call sound cadence + manual-daub noise both flagged in §7.

---
