# Phase 15 sub-project #10.v1 — Bingo (British) upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 #10.v1 — re-skin the bingo cabinet on the MASQUER / Velvet Deco bar (shared chrome for both variants) PLUS extend `/admin/bingo` with stats panels alongside the existing per-difficulty tuning UI. British-only variant bits land here; American-only bits land in #10.v2.

**Architecture:** Single PR. BingoPage uses a custom layout (no `GameShell`) — manually retrofit `LobbyButton` + `OddsInfoBox` (pattern lottery uses post-#255). Logic / machine / ball-caller scheduler all stay byte-stable. Admin stats are read-only over existing `rounds.details` — no schema migration.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 + `useEffectiveReducedMotion` · Dexie 4 (no bump) · Recharts (lazy admin chunk per ADR-0039) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-26-phase-15-10-v1-bingo-british-design.md` (will merge shortly). Read §3 invariants + §4.1–§4.7 chrome polish + §4.8 admin stats + §4.10 scope guardrails.

---

## Shared rules

1. **Pure logic untouched.** Do NOT modify `src/games/bingo/logic.ts`, `machine.ts`, `useBingoBallCaller.ts`, or their `*.test.ts`. The `VARIANTS` config, `evaluateCardWins`, `generateCard`, claim-race semantics, `cpuScheduler` actor — all byte-stable.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from `src/games/bingo/**`. Wallet via `@/systems/**`.
3. **One `rounds` row per game** (ADR-0016). Bonus accumulation pattern unchanged.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** No new ADRs expected. No CLAUDE.md edits.
6. **Commit subject ≤ 100 chars** (`feedback-localgamble-commit-subject-limit`). Use scope `admin` (NOT `admin-bingo`) per `reference-localgamble-commitlint-scopes`.
7. **No `--no-verify`. No `--amend`** — soft-reset + new commit if needed.
8. **DoD per batch:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
9. **TS strict + exactOptionalPropertyTypes** — `{...(cond ? {key: val} : {})}` spread.
10. **Existing `/admin/bingo` per-difficulty tuning UI MUST be preserved.** Add stats alongside, don't replace.

---

## Known `BingoRoundDetails` shape (from `BingoPage.tsx` settle bridge — implementer verify)

```ts
type BingoRoundDetails = {
  variant: 'british' | 'american';
  difficulty: 'easy' | 'medium' | 'hard';
  speed: ...;
  daubMode: 'auto' | 'manual';
  finalCallCount: number;          // for FAST BINGO detection (≤ 40)
  cpuCount: number;
  userTier1: boolean;              // player won a LINE bonus
  userTier2: boolean;              // player won DOUBLE LINE / 4-CORNERS bonus
  userTier3: boolean;              // player won the BINGO (tier-3 pot)
  cpuTier3Winner: number | null;   // index of CPU that took the BINGO (null if user won or no winner)
  bonusesEarned: number;           // total chips earned across tier-1 + tier-2 bonuses
  pot: number;                     // tier-3 prize size (paid to userTier3 winner or kept by house on CPU win)
};
```

**Notably missing**: `cardCount` (the 1-4 cards the player chose). The "Card-count usage" stat from spec §4.8.5 is **not directly derivable**. Per spec guidance: ship the stats that ARE derivable; document the `cardCount` gap in the PR description (don't extend the `details` write to add it — that's logic-side and out of scope).

---

## File structure

| File                                                       | Action  | Responsibility                                                                                      |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `src/games/bingo/BingoPage.tsx`                            | Rewrite | MASQUER · Bingo title + manual `LobbyButton` + `OddsInfoBox` + RULES button + token pass.           |
| `src/games/bingo/BingoPage.test.tsx`                       | Modify  | New shell assertions.                                                                               |
| `src/games/bingo/BingoVariantModal.tsx`                    | Modify  | Brand tokens; scrollable body.                                                                      |
| `src/games/bingo/BingoVariantModal.test.tsx`               | Modify  | Update class-name assertions.                                                                       |
| `src/games/bingo/BingoCard.tsx`                            | Modify  | Brand tokens; daub-tap animation; daubed-cell magenta ring.                                         |
| `src/games/bingo/BingoCard.test.tsx`                       | Modify  | Update assertions.                                                                                  |
| `src/games/bingo/CallBoard.tsx`                            | Modify  | Brand tokens; dramatic ball-call animation (scale-in + gold glow, 250 ms); current-ball halo.       |
| `src/games/bingo/CallBoard.test.tsx`                       | Modify  | Pin animation contract + reduced-motion path.                                                       |
| `src/games/bingo/CpuCardMini.tsx`                          | Modify  | Brand tokens; daubed-cell ring.                                                                     |
| `src/games/bingo/CpuCardMini.test.tsx`                     | Modify  | Update assertions.                                                                                  |
| `src/games/bingo/WinBanner.tsx`                            | Modify  | Brand tokens; tier-3 jewel-magenta signature; FAST BINGO British copy refresh.                      |
| `src/games/bingo/WinBanner.test.tsx`                       | Modify  | Update assertions.                                                                                  |
| `src/games/bingo/EndScreen.tsx`                            | Modify  | Brand tokens; scrollable per-card breakdown body; FAST BINGO British copy.                          |
| `src/games/bingo/EndScreen.test.tsx`                       | Modify  | Scroll-cap assertion + brand-token assertions.                                                      |
| `src/games/bingo/DaubToggle.tsx`                           | Modify  | Brand tokens.                                                                                       |
| `src/games/bingo/DaubToggle.test.tsx`                      | Modify  | Update.                                                                                             |
| `src/games/bingo/SetupPanel.tsx`                           | Modify  | Brand tokens.                                                                                       |
| `src/games/bingo/SetupPanel.test.tsx`                      | Modify  | Update.                                                                                             |
| `src/games/bingo/ballPalette.ts`                           | Modify  | Move raw hex to brand tokens only if a clear equivalent exists; keep intrinsic ball colours.        |
| `src/games/bingo/ballPalette.test.ts`                      | Modify  | Update if assertions shift.                                                                         |
| `src/games/bingo/BingoRules.tsx`                           | NEW     | Rules content (both variants) rendered in shared `RulesModal`.                                      |
| `src/systems/stats.ts`                                     | Modify  | 4 new additive bingo aggregations (§4.8.7 / Task A.8).                                              |
| `src/systems/stats.test.ts`                                | Modify  | Pin against ~15-row fixture covering both variants × 3 difficulties × mixed outcomes.               |
| `src/components/charts/BingoVariantDifficultyBar.tsx`      | NEW     | Stacked-bar chart wrapper (variant × difficulty). Custom tooltip via `ChartTooltipShell` from #251. |
| `src/components/charts/BingoVariantDifficultyBar.test.tsx` | NEW     | Smoke render.                                                                                       |
| `src/pages/admin/AdminBingoPage.tsx`                       | Modify  | Add STATISTICS section below existing per-difficulty tuning UI (which stays intact).                |
| `src/pages/admin/AdminBingoPage.test.tsx`                  | Modify  | Add assertions for the new stats section.                                                           |

---

## Branch

`git checkout main && git pull origin main && git checkout -b phase-15-10-v1-pr-a`

## Task A.0 — Read context (10 min)

- [ ] **Step 1: Read the spec** end-to-end.
- [ ] **Step 2: Read each bingo UI file** in `src/games/bingo/` to internalise the current visual + state contracts.
- [ ] **Step 3: Read the reference upgraded pages** for the LobbyButton/OddsInfoBox/RulesModal retrofit pattern — `src/pages/lottery/LotteryPage.tsx` (closest analog — also has no GameShell). `BlackjackPage.tsx` etc. use GameShell so they're API-source-of-truth only.
- [ ] **Step 4: Read `AdminRoulettePage.tsx` + `AdminSlotsPage.tsx`** for the StatCards + chart + recent-table layout to mirror.
- [ ] **Step 5: Read `BingoPage.tsx` settle-bridge** (line ~117 — the `details:` block) to confirm the `BingoRoundDetails` shape against the inline note in this plan.

## Task A.1 — `BingoRules` content + RulesModal wiring

**Files:** `src/games/bingo/BingoRules.tsx` (NEW), `BingoPage.tsx`.

- [ ] **Step 1: Create `BingoRules.tsx`** mirroring the Blackjack / Lottery rules pattern. Sectioned `<h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">` headings; body `text-ivory/85`. Per spec §4.6:
  - Object · Variants (British 90-ball / American 75-ball) · Tiers (LINE 25 / DOUBLE LINE 75 / BINGO 250 / FAST BINGO 500) · Daub mode · Difficulty · Race-to-claim · Reduced motion.
- [ ] **Step 2: Wire the RULES button** into `BingoPage` (bottom-left) and the shared `RulesModal` (already scrollable per #230). Mirror the pattern from `LotteryPage`.
- [ ] **Step 3: Test** — RULES button opens modal; modal contains British + American sections.
- [ ] **Step 4: Commit.**

## Task A.2 — `BingoPage` MASQUER title + LobbyButton + OddsInfoBox + Rules

**Files:** `src/games/bingo/BingoPage.tsx`, `BingoPage.test.tsx`.

- [ ] **Step 1: Replace** `<h1>🎯 BINGO — 🇬🇧 SETUP</h1>` (or similar) with:
  - `MASQUER · Bingo` centred title.
  - Subtitle below: `British · setup` (or `British · easy` / `American · hard` etc.) — driven by current variant + machine state.
- [ ] **Step 2: Add `<LobbyButton />`** absolute top-left of the page (manual retrofit; mirror `LotteryPage` from #255).
- [ ] **Step 3: Add `<OddsInfoBox>`** absolute top-right with `Line 25 · Double Line 75 · BINGO 250 · Fast BINGO 500 (≤40 calls)`.
- [ ] **Step 4: Add RULES button** + RulesModal trigger (from Task A.1).
- [ ] **Step 5: Tokenize remaining `BingoPage` colours.**
- [ ] **Step 6: Update tests** — title + LobbyButton + OddsInfoBox + RULES button presence.
- [ ] **Step 7: Commit.**

## Task A.3 — Brand-token pass across remaining bingo UI

**Files:** `BingoVariantModal.tsx`, `BingoCard.tsx`, `CallBoard.tsx`, `CpuCardMini.tsx`, `WinBanner.tsx`, `EndScreen.tsx`, `DaubToggle.tsx`, `SetupPanel.tsx`, + tests.

- [ ] **Step 1: For each file, replace raw hex / non-token Tailwind** with brand tokens. Reuse: `bg-velvet`, `bg-velvet-deep`, `bg-felt-table`, `bg-felt-table-deep`, `text-ivory`, `text-gold`, `text-gold-bright`, `border-brass`, `bg-jewel-magenta` (tier-3 win signature).
- [ ] **Step 2: BingoCard daubed cells** get a `bg-jewel-magenta` ring + subtle scale (1.0 → 1.05 → 1.0 on tap, 150 ms, reduced-motion skip).
- [ ] **Step 3: CpuCardMini** matches BingoCard's daubed-cell treatment, smaller scale.
- [ ] **Step 4: WinBanner / EndScreen tier-3** uses `bg-jewel-magenta` border + glow.
- [ ] **Step 5: Update tests** — drop hex assertions; use class-name or data-token assertions.
- [ ] **Step 6: Commit batched.**

## Task A.4 — `CallBoard` dramatic ball-call animation

**Files:** `CallBoard.tsx`, `CallBoard.test.tsx`.

- [ ] **Step 1: Apply the lottery-hero ball-reveal pattern** (#255 task A.5) to the current-ball circle:
  - `<motion.div>` with `initial={{ scale: 0.6, opacity: 0 }}` `animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}` `transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}`.
  - Brief gold-glow flash via `shadow-gold-glow` token, ~150 ms.
  - Reduced-motion via `useEffectiveReducedMotion()` → instant.
- [ ] **Step 2: Tokenize the last-10-balls strip** + brass frame.
- [ ] **Step 3: Add `play('ball.drop')`** via the page-level sound bridge (Task A.5).
- [ ] **Step 4: Update tests** — assert motion variant + reduced-motion path.
- [ ] **Step 5: Commit.**

## Task A.5 — `useSound` integration

**Files:** `BingoPage.tsx` (page-level sound bridge).

- [ ] **Step 1: Wire `useSound`:**
  - `play('ball.drop')` on each new call (watch `snapshot.context.callIndex` change).
  - `play('chip.place')` on manual daub tap (BingoCard onClick).
  - `play('win.small')` on user tier-1 claim.
  - `play('win.medium')` on user tier-2 claim.
  - `play('win.jackpot')` on user tier-3 win (and on FAST BINGO).
  - `play('loss')` on CPU tier-3 win.
  - All gated on `useEffectiveReducedMotion`.
- [ ] **Step 2: Debounce ball-call sound at Hard difficulty.** If `ballCallIntervalMs < 200`, coalesce — play at most one `ball.drop` per 200 ms (the rapid Hard pace would otherwise feel exhausting).
- [ ] **Step 3: Test** — mock `useSound`, assert calls per outcome.
- [ ] **Step 4: Commit.**

## Task A.6 — Scrollable modals

**Files:** `BingoVariantModal.tsx`, `EndScreen.tsx`.

- [ ] **Step 1: Add `max-h-[60vh] overflow-y-auto`** to BingoVariantModal body.
- [ ] **Step 2: Same for EndScreen** — the per-card breakdown can grow tall with 4 cards × many wins.
- [ ] **Step 3: Apply brand-token chrome** (`bg-velvet-deep`, `border-brass/60`, ivory body) on each modal.
- [ ] **Step 4: Update tests** — assert scroll-container class.
- [ ] **Step 5: Commit.**

## Task A.7 — British-only variant bits

**Files:** `ballPalette.ts`, `WinBanner.tsx`, `EndScreen.tsx`, `BingoRules.tsx`.

- [ ] **Step 1: 9-decile UK ball palette** — review the current palette; promote intrinsic colours to tokens only if a brand-named equivalent already exists. If not, keep the per-decile hex and add a code comment explaining the intent. Don't add new "british-decile-\*" tokens unless the brand spec asks for them.
- [ ] **Step 2: FAST BINGO British copy** — `WinBanner` and `EndScreen` should use British-friendly phrasing ("BINGO!" not "BINGO!!!", "FAST BINGO BONUS" not "SUPER FAST BINGO!", etc. — implementer judgment).
- [ ] **Step 3: British rules section** in `BingoRules.tsx` covers the 9-column number ranges (1-9, 10-19, ..., 80-90) + the LINE/DOUBLE LINE/FULL HOUSE tier names.
- [ ] **Step 4: Commit.**

## Task A.8 — New stats aggregations in `src/systems/stats.ts`

**Files:** `src/systems/stats.ts`, `src/systems/stats.test.ts`.

- [ ] **Step 1: Add aggregations.** Per spec §4.8.7, adapted to the actual `BingoRoundDetails` fields:

  ```ts
  // ─── Phase 15 #10.v1 — Bingo all-time admin stats ─────────────────────

  type BingoVariant = 'british' | 'american';
  type BingoDifficulty = 'easy' | 'medium' | 'hard';

  interface PersistedBingoDetails {
    readonly variant: BingoVariant;
    readonly difficulty: BingoDifficulty;
    readonly finalCallCount: number;
    readonly userTier1: boolean;
    readonly userTier2: boolean;
    readonly userTier3: boolean;
    readonly cpuTier3Winner: number | null;
    readonly bonusesEarned: number;
    readonly pot: number;
  }

  export interface BingoAllTimeStats {
    gamesPlayed: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    netPlayerChips: number;
    actualRtp: number | null;
    playerTier3Wins: number;
    cpuTier3Wins: number;
    playerBingoCapturePct: number; // playerTier3Wins / gamesPlayed (0 when no games)
    fastBingoPlayerWins: number; // userTier3 === true && finalCallCount <= 40
    fastBingoHitRate: number; // fastBingoPlayerWins / playerTier3Wins (0 when no player wins)
    lineWins: number; // count where userTier1 === true
    doubleLineWins: number; // count where userTier2 === true (covers double-line + 4-corners; spec §4.8.7 acknowledges details don't separate them)
    totalBonusesPaid: number; // sum of bonusesEarned
    totalPotsWonByPlayer: number; // sum of pot where userTier3 === true
  }

  export interface BingoVariantDifficultyCount {
    variant: BingoVariant;
    difficulty: BingoDifficulty;
    count: number;
  }

  export interface BingoBallsToBingo {
    difficulty: BingoDifficulty;
    averageCalls: number | null; // mean finalCallCount over games where userTier3 === true; null when no player wins at that difficulty
  }

  export async function getBingoAllTimeStats(): Promise<BingoAllTimeStats>;
  export async function getBingoVariantDifficultyDistribution(): Promise<
    BingoVariantDifficultyCount[]
  >;
  export async function getBingoBallsToBingo(): Promise<BingoBallsToBingo[]>;
  ```

  All iterate `db.rounds.where('game').equals('bingo').toArray()` once.

- [ ] **Step 2: NOTE — card-count usage NOT shipped.** Per the plan's note about `BingoRoundDetails` lacking `cardCount`, skip the `getBingoCardCountUsage()` from spec §4.8.5. Document this in the PR description.

- [ ] **Step 3: Tests.** Seed ~15 fake bingo rounds covering both variants × all 3 difficulties × mixed tier outcomes. Pin each aggregation.

- [ ] **Step 4: Commit.**

## Task A.9 — `BingoVariantDifficultyBar` chart wrapper

**Files:** `src/components/charts/BingoVariantDifficultyBar.tsx` (NEW), `BingoVariantDifficultyBar.test.tsx` (NEW).

- [ ] **Step 1: Create a stacked-bar Recharts wrapper** mirroring `PocketDistributionBar` / `BaccaratWinnerBar`. X-axis: variant ('British' / 'American'). Stacked bars: 'Easy' / 'Medium' / 'Hard'. Each stack segment coloured semantically (Easy = `bg-jewel-emerald`-equivalent, Medium = `bg-gold`-equivalent, Hard = `bg-velvet`-equivalent — implementer picks closest existing tokens).
- [ ] **Step 2: Use `ChartTooltipShell` from #251** for the custom tooltip (variant + difficulty + count).
- [ ] **Step 3: Test** — smoke render with fake data.
- [ ] **Step 4: Commit.**

## Task A.10 — `AdminBingoPage` STATISTICS section

**Files:** `src/pages/admin/AdminBingoPage.tsx`, `src/pages/admin/AdminBingoPage.test.tsx`.

- [ ] **Step 1: Read the current file** to find where the per-difficulty tuning UI lives. Keep it intact — add the stats section BELOW it (or above; place wherever reads cleanly with the existing layout).

- [ ] **Step 2: Add `STATISTICS` section** with this layout (mirror `AdminRoulettePage` / `AdminSlotsPage`):
  - **4 StatCards row**: Games Played · House Net Chips (red if positive, green if negative) · Player BINGO Capture % · FAST BINGO Hit Rate
  - **Hero chart**: `<BingoVariantDifficultyBar />`
  - **Bonus economics panel** (small mini-bar): LINE wins count · DOUBLE LINE / 4-CORNERS wins count · BINGO wins by player (count + total pot) · Total bonuses paid (chips)
  - **Average balls-to-BINGO**: 3 cells in a row showing the mean per difficulty
  - **Recent games table (last 20)** — columns `Played at | Variant | Difficulty | Outcome | Players | Bet | Payout | House P/L`. Outcome badge: green "BINGO" for tier-3 player win, gold for tier-1/2 bonus-only, red "LOST" for CPU tier-3. `Players` column shows `cpuCount + 1` (player + N CPUs) since per-game `cardCount` isn't in details; document this substitution. Ordering: load all + sort by `playedAt` desc + slice 20 (#250 pattern; do NOT use `.where(...).reverse().limit(...)`).

- [ ] **Step 3: Use `useLiveQuery`** with inferred-Promise pattern (Phase 9 trap — no explicit generic).

- [ ] **Step 4: Tests.** Seed fake rounds; render the page; assert each card text + chart presence + table rows + that the existing per-difficulty tuning UI still renders.

- [ ] **Step 5: Commit.**

## Task A.11 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**
  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```
- [ ] **Step 2: Push + open PR** titled `phase-15(#10.v1): bingo British reskin + admin stats` (count ≤ 100 chars).
- [ ] **Step 3: Report DoD + PR URL.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §4.1 title + shell retrofit → A.2
- §4.2 brand pass → A.2 + A.3
- §4.3 sound → A.5
- §4.4 ball-call animation → A.4
- §4.5 scrollable modals → A.6
- §4.6 RulesModal + content → A.1 + A.2
- §4.7 British-only bits → A.7
- §4.8 admin stats → A.8 + A.9 + A.10
- §4.9 out of scope → respected via §4.10 allowed-paths
- §4.10 scope guardrails → applied per-task

**Placeholder scan:** None.

**Type consistency:** `BingoAllTimeStats`, `BingoVariantDifficultyCount`, `BingoBallsToBingo`, `PersistedBingoDetails` referenced consistently. The PR-level `cardCount` gap is documented (skip).

**Risks already flagged in spec §7** carried forward:

- Title crowding — A.2 step 1 reminds the implementer to use a quiet subtitle.
- Ball-call sound cadence — A.5 step 2 debounces at Hard difficulty.
- Manual-daub sound noise — A.5 step 1 plays `chip.place` per tap; if noisy, lower volume or debounce.
- EndScreen content height — A.6 scroll-caps.

---
