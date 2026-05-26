# Phase 15 sub-project #8 — Baccarat upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 sub-project #8 — re-skin the baccarat table on the MASQUER / Velvet Deco design system (PR A) and ship the all-time `/admin/baccarat` analytics page (PR B). Logic + 9 bet zones + persistent shoe + canonical third-card tableau byte-stable.

**Architecture:** Two PRs. **PR A** is UI-only — brand pass + shared shell + chip consolidation + sound + rules rewrite. **PR B** is read-only over the existing `rounds` table — new aggregations in `src/systems/stats.ts` + new admin page mirroring `/admin/roulette` (#236) and `/admin/slots` (#242).

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 + `useEffectiveReducedMotion` · Dexie 4 (no schema bump) · Recharts (lazy admin chunk per ADR-0039) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-26-phase-15-8-baccarat-design.md` (merged at #245). Read it before each PR.

---

## Shared rules (apply to every task)

1. **Pure logic untouched.** Do NOT modify `src/games/baccarat/logic.ts`, `shoe.ts`, `types.ts`, `config.ts`, or their `*.test.ts`. ADRs 0036 + 0037 (tableau + persistent shoe) locked. Banker commission floor-round rule unchanged.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from `src/games/baccarat/**`. Wallet via `@/systems/**` only (existing pattern).
3. **One `rounds` row per round** (ADR-0016). `rounds.details` shape (`RoundResult` + per-zone payouts) is the contract PR B reads — no schema migration.
4. **Integer money. No `Math.random()`.** Existing ESLint enforces.
5. **Spec-first per CLAUDE.md.** Any ADR amendment commits before code.
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** (commitlint Meta files fails otherwise — `feedback-localgamble-commit-subject-limit`).
8. **No skipping git hooks.** No `--no-verify`. No `--amend` — soft-reset + new commit if you need to rewrite.
9. **DoD before opening each PR:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
10. **TS strict + exactOptionalPropertyTypes.** Optional fields via `{...(cond ? {key: val} : {})}` spread.
11. **Tokens-only Tailwind** in rebuilt files. Promote semantic colours (scoreboard banker/player/tie) to tokens if missing.

---

## File structure

### PR A — Re-skin

| File                                        | Action  | Responsibility                                                                                                                     |
| ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/baccarat/BaccaratPage.tsx`       | Rewrite | Title `MASQUER · Baccarat`; remove `meta`; add LobbyButton + OddsInfoBox; `useSound` integration; tokenize colours.                |
| `src/games/baccarat/BaccaratPage.test.tsx`  | Modify  | New assertions: title, LobbyButton + OddsInfoBox presence, sound mocks fire correctly.                                             |
| `src/games/baccarat/ChipSelector.tsx`       | Rewrite | Delete inline `CHIP_COLORS` / `CHIP_LABELS`; consume `ChipDenominationButton` from `@/games/_shared/`.                             |
| `src/games/baccarat/ChipSelector.test.tsx`  | Modify  | Update class-name assertions; verify chip palette comes from shared component.                                                     |
| `src/games/baccarat/BetArea.tsx`            | Modify  | Tokenize colours; brass-bordered bet zones on felt.                                                                                |
| `src/games/baccarat/BetArea.test.tsx`       | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/BetZone.tsx`            | Modify  | Tokenize.                                                                                                                          |
| `src/games/baccarat/BetZone.test.tsx`       | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/BigSmallZone.tsx`       | Modify  | Tokenize.                                                                                                                          |
| `src/games/baccarat/BigSmallZone.test.tsx`  | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/HandView.tsx`           | Modify  | Tokenize. Verify MasquerCard adapter is clean post-#226 consolidation.                                                             |
| `src/games/baccarat/HandView.test.tsx`      | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/CardReveal.tsx`         | Modify  | Tokenize the reveal-card visual layer.                                                                                             |
| `src/games/baccarat/CardReveal.test.tsx`    | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/Scoreboard.tsx`         | Modify  | Tokenize. Scoreboard semantic colours via the new `scoreboard-*` tokens.                                                           |
| `src/games/baccarat/BeadPlate.tsx`          | Modify  | Tokenize. Use `scoreboard-*` tokens for the win-marker dots.                                                                       |
| `src/games/baccarat/BeadPlate.test.tsx`     | Modify  | Update class-name / data-token assertions.                                                                                         |
| `src/games/baccarat/BigRoad.tsx`            | Modify  | Tokenize. Use `scoreboard-*` tokens.                                                                                               |
| `src/games/baccarat/BigRoad.test.tsx`       | Modify  | Update assertions if any moved.                                                                                                    |
| `src/games/baccarat/ShoeIndicator.tsx`      | Modify  | Tokenize.                                                                                                                          |
| `src/games/baccarat/ShoeIndicator.test.tsx` | Modify  | Update assertions.                                                                                                                 |
| `src/games/baccarat/WinCelebration.tsx`     | Modify  | Tokenize; tie into ADR-0033 tier celebration via existing `useSound` win-tier stingers.                                            |
| `src/games/baccarat/rules.tsx`              | Rewrite | New rules content per spec §4.5: object, card values, naturals, third-card summary, payouts, commission, shoe, limits, scoreboard. |
| `tailwind.config.ts`                        | Modify  | Add `scoreboard-banker / scoreboard-player / scoreboard-tie` tokens if missing.                                                    |
| `src/theme/tokens.ts`                       | Modify  | Mirror new tokens.                                                                                                                 |

### PR B — All-time admin baccarat analytics

| File                                               | Action | Responsibility                                                                                                         |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/systems/stats.ts`                             | Modify | Add `getBaccaratAllTimeStats()` + `getBaccaratWinnerDistribution()` + `getBaccaratShoeStats()` (additive only).        |
| `src/systems/stats.test.ts`                        | Modify | Pin aggregations against a ~20-row baccarat fixture covering all winners / pairs / naturals / dragons.                 |
| `src/pages/admin/AdminBaccaratPage.tsx`            | New    | 4 StatCards + winner distribution chart + side-bet hit rates panel + streak stats + recent rounds table.               |
| `src/pages/admin/AdminBaccaratPage.test.tsx`       | New    | Render with fake `db.rounds` rows; assert each card + chart count + table rows.                                        |
| `src/pages/admin/AdminLayout.tsx`                  | Modify | Add `Baccarat` nav entry below `Slots`.                                                                                |
| `src/pages/admin/AdminLayout.test.tsx`             | Modify | Assert the new nav link.                                                                                               |
| `src/router.tsx`                                   | Modify | Add lazy route `const AdminBaccaratPage = lazy(...)` + route `/admin/baccarat`.                                        |
| `src/components/charts/BaccaratWinnerBar.tsx`      | New    | Recharts BarChart with 3 bars (Player / Banker / Tie), coloured by scoreboard tokens + custom ivory-on-velvet tooltip. |
| `src/components/charts/BaccaratWinnerBar.test.tsx` | New    | Smoke render.                                                                                                          |

---

## PR A — Re-skin

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-8-pr-a`

### Task A.0 — Read context (10 min)

- [ ] **Step 1: Read the spec.** `docs/superpowers/specs/2026-05-26-phase-15-8-baccarat-design.md` §3–§4.
- [ ] **Step 2: Read the current baccarat files** (`BaccaratPage.tsx`, `ChipSelector.tsx`, `BetArea.tsx`, `BetZone.tsx`, `BigSmallZone.tsx`, `Scoreboard.tsx`, `BeadPlate.tsx`, `BigRoad.tsx`, `rules.tsx`, `HandView.tsx`, `CardReveal.tsx`, `WinCelebration.tsx`).
- [ ] **Step 3: Read the reference upgraded pages** for patterns: `SlotsPage.tsx`, `RoulettePage.tsx`, `BlackjackPage.tsx`.
- [ ] **Step 4: Read the shared shell components.** `LobbyButton.tsx`, `OddsInfoBox.tsx`, `ChipDenominationButton.tsx` (note: the shared button takes an arbitrary `denomination` — baccarat's `[5, 25, 100, 500, 1000]` ladder is fine; just skip the `1` chip).
- [ ] **Step 5: Read `useSound` + `useEffectiveReducedMotion`** to confirm the wiring style.

### Task A.1 — Scoreboard tokens

**Files:** `tailwind.config.ts`, `src/theme/tokens.ts`.

- [ ] **Step 1: Add scoreboard tokens.** If missing, add to `src/theme/tokens.ts` + mirror in `tailwind.config.ts`:

  ```ts
  // src/theme/tokens.ts — under a `scoreboard` section
  scoreboard: {
    banker: '#a3122a',  // red
    player: '#1e3a8a',  // deep blue
    tie:    '#3dd17a',  // green
  },
  ```

  If the brand has already established these via other names (e.g. `velvet` for red, a separate `jewel.sapphire` for blue, `jewel.emerald` for green), prefer reusing existing tokens — implementer's call, document the chosen names.

- [ ] **Step 2: Commit.**
  ```bash
  git add tailwind.config.ts src/theme/tokens.ts
  git commit -m "feat(theme): scoreboard-banker / -player / -tie tokens for baccarat"
  ```

### Task A.2 — ChipSelector consolidation

**Files:** `src/games/baccarat/ChipSelector.tsx`, `src/games/baccarat/ChipSelector.test.tsx`.

- [ ] **Step 1: Rewrite to use the shared component.**

  ```tsx
  import type { JSX } from 'react';
  import { CHIP_DENOMINATIONS, type ChipDenomination } from './config';
  import ChipDenominationButton from '@/games/_shared/ChipDenominationButton';

  interface Props {
    value: ChipDenomination;
    onChange: (next: ChipDenomination) => void;
    disabled?: boolean;
  }

  export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
    return (
      <div className="flex items-center gap-2.5">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-ivory/55">Chip:</span>
        {CHIP_DENOMINATIONS.map((d) => (
          <ChipDenominationButton
            key={d}
            denomination={d}
            selected={d === value}
            disabled={disabled}
            onClick={() => onChange(d)}
            ariaLabel={`Select ${d}-chip`}
          />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 2: Update tests** for the new shape. Existing tests likely assert on chip class names / hex — switch to asserting on the shared component being rendered or class names from `chipStyles.ts`.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/games/baccarat/ChipSelector.tsx src/games/baccarat/ChipSelector.test.tsx
  git commit -m "feat(baccarat): consume shared ChipDenominationButton (palette parity)"
  ```

### Task A.3 — Tokenize bet-area + scoreboard components

**Files:** `src/games/baccarat/{BetArea,BetZone,BigSmallZone,Scoreboard,BeadPlate,BigRoad,ShoeIndicator,HandView,CardReveal,WinCelebration}.tsx` + their tests.

- [ ] **Step 1: For each file, replace raw hex / non-token Tailwind with brand tokens.**
  - Felt: `bg-felt-table`, `bg-felt-table-deep`
  - Brass borders: `border-brass`, `border-brass/40`
  - Text: `text-ivory`, `text-ivory/80`, `text-gold`, `text-gold-bright`
  - Scoreboard cells: `bg-scoreboard-banker`, `bg-scoreboard-player`, `bg-scoreboard-tie` (per Task A.1's tokens)
  - Velvet: `bg-velvet`, `bg-velvet-deep`
  - Magenta jackpot signature: `bg-jewel-magenta` if applicable (only the big-win flash, if WinCelebration uses it).

- [ ] **Step 2: Verify each component still renders correctly via Storybook stories** (if present).

- [ ] **Step 3: Update tests.** Drop hex-based assertions in favour of class names or `data-*` attributes. Mirror the pattern from Roulette / Slots tokenization PRs.

- [ ] **Step 4: Run targeted tests.**

  ```bash
  pnpm exec vitest run src/games/baccarat
  ```

- [ ] **Step 5: Commit.** Batched commit OK (these are all small tokenization edits).
  ```bash
  git add src/games/baccarat/*.tsx src/games/baccarat/*.test.tsx
  git commit -m "feat(baccarat): tokenize bet-area / scoreboard / hand / reveal / celebration"
  ```

### Task A.4 — Rules rewrite

**File:** `src/games/baccarat/rules.tsx`.

- [ ] **Step 1: Rewrite per spec §4.5.** Mirror Slots / Blackjack section structure (`<h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">` headings, body `text-ivory/85`, tight sections).

  Sections:
  - **Object** — Bet on Player or Banker (or Tie). Hand totals = ones-digit of card-value sum. Closest to 9 wins.
  - **Card values** — Ace 1, 2–9 face, 10/J/Q/K = 0.
  - **Naturals** — 2-card 8 or 9 ends the hand.
  - **Third-card rules** — Player draws on 0–5; Banker's draw depends on Player's third-card value per the canonical Punto Banco tableau (ADR-0036).
  - **Payouts** — Player 1:1 · Banker 1:1 minus 5% commission · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 · Dragons up to 30:1.
  - **Commission** — Floor-rounded; tiny wins (< 20 chips) pay 0.
  - **Shoe + cut card** — 8-deck persistent shoe; reshuffle next round after cut card.
  - **Bet limits** — 5–2000 (main) / 5–1000 (side).
  - **Scoreboard** — Bead plate (one cell per round) + Big road (column-compressed streaks).

- [ ] **Step 2: Commit.**
  ```bash
  git add src/games/baccarat/rules.tsx
  git commit -m "docs(baccarat): rewrite rules — 9 zones + commission + tableau summary"
  ```

### Task A.5 — `BaccaratPage` rewrite

**Files:** `src/games/baccarat/BaccaratPage.tsx`, `src/games/baccarat/BaccaratPage.test.tsx`.

- [ ] **Step 1: Update imports.**

  ```ts
  import LobbyButton from '@/games/_shared/LobbyButton';
  import OddsInfoBox from '@/games/_shared/OddsInfoBox';
  import { useSound } from '@/systems/sound/useSound';
  import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
  ```

  Replace `useReducedMotion` from framer-motion (if used) with `useEffectiveReducedMotion`.

- [ ] **Step 2: Update the GameShell call.**

  ```tsx
  <GameShell
    title="MASQUER · Baccarat"
    game="baccarat"
    lobbyButton={<LobbyButton />}
    oddsInfo={
      <OddsInfoBox>
        Player 1:1 · Banker 1:1 (−5%) · Tie 8:1 · Pairs 11:1 · Big 0.54:1 · Small 1.5:1 · Dragons 30:1
      </OddsInfoBox>
    }
    recentItems={recentItems}
    rules={<BaccaratRules />}
    bettingPanel={...}
  >
  ```

  Remove the `meta=` prop entirely.

- [ ] **Step 3: Wire `useSound`.**

  ```ts
  const reduceMotion = useEffectiveReducedMotion();
  const { play } = useSound();
  ```

  - `play('chip.place')` on each bet-zone chip click. Match the existing pattern in Slots / Blackjack.
  - `play('card.deal')` on each card flip in `CardReveal` (or via a callback wired up the tree if cleaner — implementer's call).
  - `play('win.small' | 'win.medium' | 'win.jackpot')` on settle, gated on the existing tier-mapping for baccarat (naturals + 30:1 Dragon hits → jackpot; other wins → small/medium per ADR-0033 thresholds).
  - `play('loss')` on settle if net negative.
  - Optionally `play('wheel.spin')` on cut-card-passed → reshuffle notification (implementer judges; skip if misplaced).
  - All gated on `!reduceMotion`.

- [ ] **Step 4: Tokenize remaining colours in the page** (any inline styles or non-token classes).

- [ ] **Step 5: Rewrite tests.**
  - Title `MASQUER · Baccarat` assertion.
  - LobbyButton + OddsInfoBox presence.
  - Sound mocks: `play('chip.place')` fires on chip click, `play('card.deal')` on deal, tier stinger on settle.
  - Pure logic flow (existing tests for placing bets / dealing / settling) should still pass with minor selector adjustments only.

- [ ] **Step 6: Run.**

  ```bash
  pnpm exec vitest run src/games/baccarat/BaccaratPage.test.tsx
  ```

- [ ] **Step 7: Commit.**
  ```bash
  git add src/games/baccarat/BaccaratPage.tsx src/games/baccarat/BaccaratPage.test.tsx
  git commit -m "feat(baccarat): MASQUER · Baccarat page rebuild — shell + sound + tokens"
  ```

### Task A.6 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

- [ ] **Step 2: Push + open PR.**

  ```bash
  git push -u origin phase-15-8-pr-a
  gh pr create --title "phase-15(#8) PR A: baccarat reskin — shell + chips + sound + rules" --body "$(...)"
  ```

  Subject is 81 chars (under 100). Body summarises tasks done, scope confirmations, test count delta.

- [ ] **Step 3: Report DoD + PR URL.** Do NOT merge.

---

## PR B — All-time admin baccarat analytics

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-8-pr-b`

### Task B.0 — Read context

- [ ] **Step 1: Read the closest analogues** — `src/pages/admin/AdminRoulettePage.tsx` (#236) + `src/pages/admin/AdminSlotsPage.tsx` (#242). Mirror their layout + data-flow.
- [ ] **Step 2: Read `src/systems/stats.ts`** to confirm existing fn shapes; add new fns at the bottom (additive only).
- [ ] **Step 3: Read `src/games/baccarat/types.ts`** to confirm `RoundResult` fields (`winner`, `playerPair`, `bankerPair`, `winnerNatural`, `bothNatural`, `margin`, `totalCards`).

### Task B.1 — Add aggregations to `src/systems/stats.ts`

**Files:** `src/systems/stats.ts`, `src/systems/stats.test.ts`.

- [ ] **Step 1: Add aggregations.** Append at the bottom:

  ```ts
  // ─── Phase 15 #8 — Baccarat all-time admin stats ──────────────────────

  import type { RoundResult as BaccaratRoundResult } from '@/games/baccarat/types';

  export interface BaccaratAllTimeStats {
    roundsPlayed: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    netPlayerChips: number;
    actualRtp: number | null;
    playerWins: number;
    bankerWins: number;
    ties: number;
    naturalWins: number;
    doubleNaturals: number;
    playerPairs: number;
    bankerPairs: number;
    bigCount: number; // 5–6 cards dealt
    smallCount: number; // 4 cards dealt
    playerDragons: number; // player wins by ≥ 4 with non-natural
    bankerDragons: number;
  }

  export async function getBaccaratAllTimeStats(): Promise<BaccaratAllTimeStats> {
    const rows = await db.rounds.where('game').equals('baccarat').toArray();
    let roundsPlayed = 0;
    let totalWagered = 0;
    let totalPaid = 0;
    let playerWins = 0,
      bankerWins = 0,
      ties = 0;
    let naturalWins = 0,
      doubleNaturals = 0;
    let playerPairs = 0,
      bankerPairs = 0;
    let bigCount = 0,
      smallCount = 0;
    let playerDragons = 0,
      bankerDragons = 0;
    for (const r of rows) {
      const d = r.details as BaccaratRoundResult | undefined;
      if (!d?.winner) continue;
      roundsPlayed += 1;
      totalWagered += r.betAmount;
      totalPaid += r.payout;
      if (d.winner === 'player') playerWins += 1;
      else if (d.winner === 'banker') bankerWins += 1;
      else ties += 1;
      if (d.winnerNatural) naturalWins += 1;
      if (d.bothNatural) doubleNaturals += 1;
      if (d.playerPair) playerPairs += 1;
      if (d.bankerPair) bankerPairs += 1;
      // Big = 5–6 cards (one side took a third); Small = 4 cards (both stood).
      if (d.totalCards === 4) smallCount += 1;
      else if (d.totalCards >= 5) bigCount += 1;
      // Dragon = winner won by ≥ 4 with a non-natural.
      if (d.margin >= 4 && !d.winnerNatural) {
        if (d.winner === 'player') playerDragons += 1;
        else if (d.winner === 'banker') bankerDragons += 1;
      }
    }
    const netHouseChips = totalWagered - totalPaid;
    return {
      roundsPlayed,
      totalWagered,
      totalPaid,
      netHouseChips,
      netPlayerChips: -netHouseChips,
      actualRtp: totalWagered > 0 ? totalPaid / totalWagered : null,
      playerWins,
      bankerWins,
      ties,
      naturalWins,
      doubleNaturals,
      playerPairs,
      bankerPairs,
      bigCount,
      smallCount,
      playerDragons,
      bankerDragons,
    };
  }

  export interface BaccaratWinnerCount {
    winner: 'player' | 'banker' | 'tie';
    count: number;
  }

  export async function getBaccaratWinnerDistribution(): Promise<BaccaratWinnerCount[]> {
    const rows = await db.rounds.where('game').equals('baccarat').toArray();
    let player = 0,
      banker = 0,
      tie = 0;
    for (const r of rows) {
      const d = r.details as BaccaratRoundResult | undefined;
      if (!d?.winner) continue;
      if (d.winner === 'player') player += 1;
      else if (d.winner === 'banker') banker += 1;
      else tie += 1;
    }
    return [
      { winner: 'player', count: player },
      { winner: 'banker', count: banker },
      { winner: 'tie', count: tie },
    ];
  }

  export interface BaccaratStreakStats {
    longestPlayerStreak: number;
    longestBankerStreak: number;
    longestTieStreak: number;
  }

  export async function getBaccaratStreakStats(): Promise<BaccaratStreakStats> {
    // Walk rows chronologically; track current run.
    const rows = await db.rounds.where('game').equals('baccarat').toArray();
    rows.sort((a, b) => a.timestamp - b.timestamp);
    let curWinner: BaccaratRoundResult['winner'] | null = null;
    let curRun = 0;
    let longestPlayer = 0,
      longestBanker = 0,
      longestTie = 0;
    for (const r of rows) {
      const d = r.details as BaccaratRoundResult | undefined;
      if (!d?.winner) continue;
      if (d.winner === curWinner) {
        curRun += 1;
      } else {
        curWinner = d.winner;
        curRun = 1;
      }
      if (curWinner === 'player' && curRun > longestPlayer) longestPlayer = curRun;
      else if (curWinner === 'banker' && curRun > longestBanker) longestBanker = curRun;
      else if (curWinner === 'tie' && curRun > longestTie) longestTie = curRun;
    }
    return {
      longestPlayerStreak: longestPlayer,
      longestBankerStreak: longestBanker,
      longestTieStreak: longestTie,
    };
  }
  ```

- [ ] **Step 2: Tests.** Seed ~20 baccarat rounds covering all 3 winners, both pairs, naturals, double naturals, dragons (margin ≥ 4), big/small (totalCards 4 vs 5/6). Assert each aggregation. Mirror the existing patterns in `stats.test.ts` for Roulette / Slots.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): all-time baccarat aggregations (winners, naturals, pairs, dragons)"
  ```

### Task B.2 — Chart wrapper + admin page

**Files:** `src/components/charts/BaccaratWinnerBar.tsx` + test, `src/pages/admin/AdminBaccaratPage.tsx` + test.

- [ ] **Step 1: Chart wrapper.** Mirror `PocketDistributionBar` (#236) / `SlotsCombinationBar` (#242). 3 bars (Player / Banker / Tie), coloured via `<Cell>` using the scoreboard tokens. Custom ivory-on-velvet-deep tooltip per #237's pattern.

- [ ] **Step 2: Page.** Layout mirrors `AdminRoulettePage` / `AdminSlotsPage`:
  - **Top: 4 StatCards** — Rounds Played, House Net (red if positive / green if negative), Actual RTP, Naturals %.
  - **Winner-distribution chart** — `<BaccaratWinnerBar />`.
  - **Side-bet hit rates** panel — Pairs / Big / Small / Dragons as mini-cards or a small bar chart.
  - **Streak stats** — longest Player / Banker / Tie streaks.
  - **Recent rounds table** — last 20: timestamp, winner badge, totals (e.g. P 7 / B 5), side-bet badges (Pair, Big/Small, Dragon), bet, payout, P/L.

  Wire `useLiveQuery` per the Phase 9 trap (type the querier's return as `Promise<T>`, no explicit generic).

- [ ] **Step 3: Test.** Seed fake rows; render page; assert each card text + chart bar count + table rows.

- [ ] **Step 4: Commit.**
  ```bash
  git add src/components/charts/BaccaratWinnerBar.tsx src/components/charts/BaccaratWinnerBar.test.tsx src/pages/admin/AdminBaccaratPage.tsx src/pages/admin/AdminBaccaratPage.test.tsx
  git commit -m "feat(admin): all-time baccarat analytics page + winner-bar chart"
  ```

### Task B.3 — Wire router + sidebar

**Files:** `src/router.tsx`, `src/pages/admin/AdminLayout.tsx`, `src/pages/admin/AdminLayout.test.tsx`.

- [ ] **Step 1: Lazy route.**

  ```ts
  const AdminBaccaratPage = lazy(() => import('@/pages/admin/AdminBaccaratPage'));
  // route definition under the admin layout:
  { path: '/admin/baccarat', element: <AdminBaccaratPage /> },
  ```

- [ ] **Step 2: Sidebar entry.** Add `Baccarat` nav text-link below `Slots` in `AdminLayout.tsx`. Update test.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/router.tsx src/pages/admin/AdminLayout.tsx src/pages/admin/AdminLayout.test.tsx
  git commit -m "feat(admin): /admin/baccarat lazy route + sidebar nav entry"
  ```

### Task B.4 — Full DoD + open PR

- [ ] **Step 1: Run the full DoD.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

- [ ] **Step 2: Open PR.**

  ```bash
  git push -u origin phase-15-8-pr-b
  gh pr create --title "phase-15(#8) PR B: admin all-time baccarat analytics" --body "$(...)"
  ```

- [ ] **Step 3: Report.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §4.1 (title + meta) → A.5 Step 2
- §4.2 (shared shell) → A.5 Step 2
- §4.3 (brand pass) → A.1 + A.3
- §4.4 (sound) → A.5 Step 3
- §4.5 (rules) → A.4
- §4.6 (ChipSelector consolidation) → A.2
- §4.7 (out of scope) → respected in scope guardrails
- §4.8 (PR A guardrails) → applied via allowlist + commits
- §5.1–5.5 (admin) → PR B tasks B.0–B.3

**Placeholder scan:** None — every code block is complete or has clear implementer guardrails.

**Type consistency:** `BaccaratAllTimeStats` / `BaccaratWinnerCount` / `BaccaratStreakStats` / `BaccaratRoundResult` types referenced consistently. `useSound` / `useEffectiveReducedMotion` / `LobbyButton` / `OddsInfoBox` / `ChipDenominationButton` shapes match existing usage in Slots / Roulette / Blackjack pages.

**Risks already flagged in spec §8** carried forward:

- Banker commission UX label — stays deferred unless naturally addressed in A.4.
- Dragon side-bet derivation — verified via `margin` + `winnerNatural` in B.1.
- Shoe-life metrics — `BaccaratShoeStats` (per spec §5.2) — DEFERRED in this plan; the easier `getBaccaratStreakStats()` is included instead since streaks ARE derivable from rounds, while shoe-life requires cut-card-passed events that may not be logged. If the implementer finds a way to derive shoe life from existing fields, add it; otherwise leave it for a follow-up.
- Scoreboard tokens — explicit in A.1.
- Tier celebration — preserved via existing ADR-0033 hooks.

---
