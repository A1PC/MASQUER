# Phase 6 Baccarat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully playable Baccarat table with all 9 bet zones (Player / Banker / Tie + 2 Pairs + Big/Small + 2 Dragons), a persistent 8-deck shoe with cut card, canonical bead plate + big road scoreboard, and a theatrical card-reveal sequence — all merged onto `main` and tagged `v0.7-baccarat`.

**Architecture:** Six independent PRs landing on main one at a time. **PR A** lays the pure logic foundation (third-card tableau, payouts, shoe model, big-road derivation — all unit-tested) plus ADRs 0036 and 0037 and a commitlint `baccarat` scope. **PR B** wires the XState v5 round machine on top of that logic — still headless. **PR C** ships the card area: a `CardReveal` wrapper around the existing Phase 3 `Card` component that adds the corner-peek + flip animation, plus a `HandView` and a static demo. **PR D** ships the bet area: a generic `BetZone`, the special split `BigSmallZone`, the `BetArea` composing the layout from spec §8, and the `ShoeIndicator`. **PR E** assembles `BaccaratPage`, wires it to the machine, builds the `BeadPlate` + `BigRoad` + `Scoreboard`, adds the `WinCelebration`, wires it into the router, and ships the integration test. **PR F** is release plumbing.

**Tech Stack:** TypeScript 5, React 18, Vite 5, XState 5 + @xstate/react 6, Tailwind 3, Framer Motion 12 (corner-peek + flip + chip motion), Dexie 4 + dexie-react-hooks, Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-18-phase-6-baccarat-design.md` (merged in #113).

**Branch model:** 6 PRs, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state (Baccarat lobby card stays "Phase 6 — coming soon" until PR E flips it), and has full CI green.

```
phase-6-baccarat-pr-a-logic            → PR A: logic.ts + types + config + ADRs + commitlint scope
phase-6-baccarat-pr-b-shoe-machine     → PR B: shoe ops + XState round machine + tests
phase-6-baccarat-pr-c-card-area        → PR C: CardReveal + HandView + reveal animations
phase-6-baccarat-pr-d-bet-area         → PR D: BetZone + BigSmallZone + BetArea + ShoeIndicator
phase-6-baccarat-pr-e-page-and-board   → PR E: BaccaratPage + Scoreboard + WinCelebration + router + integration test
chore/release-v0.7-baccarat            → PR F: BUILD_GUIDE + tag + GitHub Release
```

**Hard rules (CLAUDE.md) that apply to every task:**

1. **No `Math.random` anywhere.** Use the project's `src/systems/rng.ts`. ESLint enforces this.
2. **Money is integers.** No floats. Commission and Big/Small payouts use `Math.floor`. Dragon ratios are integer ratios applied to integer bets.
3. **Games are sandboxed.** `src/games/baccarat/**` (except `BaccaratPage.tsx`) cannot import from `@/db/*` or `@/store/*`. Wallet operations go through `walletStore` via the page.
4. **Every round records exactly one row.** `wallet.settleRound` writes the row, called once per round even when there are multiple bet handles (multi-handle pattern, ADR-0028).
5. **Definition of done** for every code-touching task: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` must all pass before the task is considered complete.
6. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI green, merge into main, branch the next PR off the freshly-merged main.
7. **Commit messages:** Conventional Commits, scoped. Allowed scopes for this phase: `baccarat`, `lobby`, `routing`, `ui`, `theme`, `build-guide`, `adr`, `ci`, `release`, `db` (if needed). Header ≤ 100 chars.
8. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Repo conventions to mirror:**

- Test command is `pnpm exec vitest run` and `pnpm exec vitest run <path>`. Do NOT use `pnpm test --run` — pnpm consumes the `--run` flag.
- macOS case-insensitive filesystem: when a logic file and a React component share a base name, use the `*View.tsx` convention (e.g. Phase 3 `hand.ts` + `HandView.tsx`, Phase 4 `wheel.ts` + `WheelView.tsx`, Phase 5 `symbols.ts` + `ReelView.tsx`). For Phase 6 the cards module already lives as `cards.ts` in Phase 3 — we'll write `src/games/baccarat/shoe.ts` and a `CardReveal.tsx` wrapper, with no name collisions.
- lint-staged + Husky auto-runs `eslint --fix` + `prettier --write` on commit. Expect minor whitespace reformatting on commit — this is normal.
- Markdownlint MD029 has bitten previous phases when a numbered list is split by code blocks. Use bold "**Change A**", "**Change B**" or bullets instead.
- **dexie-react-hooks `useLiveQuery` overload pattern (learned in Phase 9):** providing an explicit `<T>` generic forces the 1-2 arg overload and rejects the 3rd default-value arg. Type the async querier's return as `Promise<T>` and let TS infer; never write `useLiveQuery<Foo>(...)`.
- **react-refresh + lazy imports (learned in Phase 9 PR C):** if a file mixes `lazy()` component bindings with a non-component export, add a file-level `/* eslint-disable react-refresh/only-export-components */` comment.

**Phase 3 / 4 / 5 / 9 reusables we lean on heavily:**

- `src/games/blackjack/Card.tsx` — the formal Times-serif card visual (Times-serif pip + neon glow + gold inset border + pinstripe back). Phase 6 wraps it in `CardReveal.tsx` rather than duplicating the visual.
- `src/games/blackjack/types.ts` — `Suit`, `Rank`, `Card`. Re-exported by Baccarat's `types.ts` to avoid duplication.
- `src/games/blackjack/cards.ts` — `freshShoe()`, `drawCard()`. The existing module is good but Baccarat's cut-card semantics differ (counted from the END of the shoe, not a fixed cutAt index). Baccarat gets its own `shoe.ts` that wraps `buildShoe` + uses its own cut-position model.
- `src/systems/rng.ts` — single source of randomness. Test-seedable.
- `src/games/_shared/GameShell.tsx` — already wired with `useGameVisit` (Phase 9). Baccarat passes `game="baccarat"`.
- `src/games/_shared/BettingPanel.tsx` — chip-denominations panel.
- `src/store/walletStore.ts` — `placeBet`, `settleRound`. Multi-handle pattern is used by Roulette and is the model for Phase 6.
- `src/games/slots/SlotsPage.tsx` `WinCelebration` — the tier-mapped overlay pattern (ADR-0033). Baccarat ports this with slightly different visual mapping (see §11 of the spec).

---

## File map

Created across the 6 PRs:

```
src/games/baccarat/
├─ types.ts                       # PR A — Bet, BetZoneKey, ShoeState, RoundResult, BigRoadCell, etc.
├─ config.ts                      # PR A — MIN/MAX maps, payout ratios, reveal timing constants
├─ logic.ts                       # PR A — handTotal, isPair, playerDrawsThird, bankerDrawsThird, resolveRound, computePayouts, getBigRoad
├─ logic.test.ts                  # PR A — exhaustive cell-by-cell tests
├─ shoe.ts                        # PR B — build8DeckShoe, placeCutCard, drawFromShoe, cutCardPassed
├─ shoe.test.ts                   # PR B
├─ machine.ts                     # PR B — XState v5 round machine
├─ machine.test.ts                # PR B
├─ CardReveal.tsx                 # PR C — wraps Phase 3 <Card> with corner-peek + flip
├─ CardReveal.test.tsx            # PR C
├─ HandView.tsx                   # PR C — Player / Banker hand container with running total
├─ HandView.test.tsx              # PR C
├─ DealingDemo.tsx                # PR C — dev-only static page exercising CardReveal (not routed)
├─ BetZone.tsx                    # PR D — generic single-zone (label, payout text, chip stack overlay, click handler)
├─ BetZone.test.tsx               # PR D
├─ BigSmallZone.tsx               # PR D — special split-half zone
├─ BigSmallZone.test.tsx          # PR D
├─ BetArea.tsx                    # PR D — composes 9 zones into the §8 layout
├─ BetArea.test.tsx               # PR D
├─ ShoeIndicator.tsx              # PR D — "125 cards · cut in 12" / "CUT — reshuffling" / "FRESH SHOE"
├─ ShoeIndicator.test.tsx         # PR D
├─ BeadPlate.tsx                  # PR E — bead plate grid
├─ BeadPlate.test.tsx             # PR E
├─ BigRoad.tsx                    # PR E — big road grid
├─ BigRoad.test.tsx               # PR E
├─ Scoreboard.tsx                 # PR E — composes both grids
├─ WinCelebration.tsx             # PR E — tier-mapped overlay (port from Slots)
├─ BaccaratPage.tsx               # PR E — assembles everything; mounts XState; wallet bridge
└─ BaccaratPage.test.tsx          # PR E — integration test

docs/adr/
├─ 0036-baccarat-third-card-tableau.md   # PR A
└─ 0037-baccarat-persistent-shoe.md      # PR A

modified:
src/router.tsx                            # PR E — swap StubGamePage for BaccaratPage
src/pages/LobbyPage.tsx                   # PR E — flip Baccarat card to playable (if needed)
commitlint.config.js                      # PR A — add 'baccarat' scope
BUILD_GUIDE.md                            # PR F — mark Phase 6 ✅
```

---

## Definition of Done

**Per task:** the named files exist with the named contents, all tests in the task pass, the commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four green locally on the PR branch. CI green on the PR (4 jobs: Meta files, Install·Typecheck·Build, Lint·Format, Test·Coverage).

**Per phase (after PR E merges, before PR F release):**

- Manual smoke (the full DoD checklist in spec §15):
  - Register a user; verify Baccarat is now playable in the lobby.
  - Place 5 chips on each of the 9 zones; total bet 45; press DEAL.
  - Theatrical reveal plays; outcome banner shows; balance settles correctly.
  - 10+ rounds; bead plate and big road populate correctly.
  - Cross a cut card; "CUT — reshuffling next round" shows; next round shows "FRESH SHOE".
  - 1000-chip Banker bet wins → 50 chips commission, 950 net.
  - Dragon margin-of-9 win → magenta jackpot celebration.
  - Reduced motion → cards instant; animations suppressed.
- Bundle: main bundle delta < 30 kB. Baccarat code under `src/games/baccarat/` only.

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: latest commit is `23c0603 docs(build-guide): add Phase 6 Baccarat design spec (#113)` or newer.

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~661 tests passing. If anything fails, STOP and surface to the user.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-18-phase-6-baccarat-design.md` — every section. This plan assumes the spec is the reference for _what_ and uses your reading time on _how_.

- [ ] **Step P.4: Skim Phase 3 cards module to understand the reuse surface**

```bash
cat src/games/blackjack/cards.ts
cat src/games/blackjack/types.ts
cat src/games/blackjack/Card.tsx
```

The plan refers to `Card`, `Rank`, `Suit`, `freshShoe`, `drawCard` from these files.

---

# PR A — Pure logic + ADRs + commitlint scope

**Branch:** `phase-6-baccarat-pr-a-logic` (off `main`)
**Goal of this PR:** Lay the entire pure-logic foundation in `src/games/baccarat/logic.ts` plus `types.ts` and `config.ts`. Every function exhaustively tested. Add the two ADRs that document the third-card tableau and the shoe model. Add `baccarat` to commitlint scopes (otherwise the very first `feat(baccarat): ...` commit in PR B is rejected by the husky `commit-msg` hook).
**Risk:** Low. Pure logic + docs + config. No UI, no DB, no integration concerns.
**Estimated tasks:** 10.

## Task A.1: Branch and add `baccarat` commitlint scope

**Files:**

- Modify: `commitlint.config.js`

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-6-baccarat-pr-a-logic
```

- [ ] **Step 2: Verify the current scope list**

```bash
grep -A 30 "scope-enum" commitlint.config.js
```

Expected: a list including `blackjack`, `roulette`, `slots`, `wallet`, `auth`, `admin`, `tracking`, etc. — NOT including `baccarat`.

- [ ] **Step 3: Add `'baccarat'` to the array**

Open `commitlint.config.js` and append within the `scope-enum` array (alphabetical order doesn't matter; append cleanly):

```js
'baccarat',
```

- [ ] **Step 4: Commit**

```bash
git add commitlint.config.js
git commit -m "build(ci): allow baccarat scope in commitlint"
```

## Task A.2: `src/games/baccarat/types.ts`

**Files:**

- Create: `src/games/baccarat/types.ts`

This is the type surface every subsequent task imports from. Re-export `Card`/`Rank`/`Suit` from Phase 3 to avoid duplication; add Baccarat-specific types.

- [ ] **Step 1: Write the file**

```ts
import type { Card, Rank, Suit } from '@/games/blackjack/types';

export type { Card, Rank, Suit };

/** The 9 bet zones in priority/UI order (Player, Banker, Tie, then sides). */
export type BetZoneKey =
  | 'player'
  | 'banker'
  | 'tie'
  | 'playerPair'
  | 'bankerPair'
  | 'big'
  | 'small'
  | 'playerDragon'
  | 'bankerDragon';

export const BET_ZONE_KEYS: readonly BetZoneKey[] = [
  'player',
  'banker',
  'tie',
  'playerPair',
  'bankerPair',
  'big',
  'small',
  'playerDragon',
  'bankerDragon',
] as const;

/** Chip amount per zone. Default for unbet zones is 0. */
export type Bets = Record<BetZoneKey, number>;

export const EMPTY_BETS: Bets = {
  player: 0,
  banker: 0,
  tie: 0,
  playerPair: 0,
  bankerPair: 0,
  big: 0,
  small: 0,
  playerDragon: 0,
  bankerDragon: 0,
};

/** Hand totals are always 0-9 (ones digit of card-value sum). */
export type HandTotal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Hand {
  readonly cards: readonly Card[];
  readonly total: HandTotal;
}

/** Side that won the round. */
export type Winner = 'player' | 'banker' | 'tie';

/** Persistent shoe state. */
export interface ShoeState {
  /** Remaining cards in dealing order (index 0 is next to be drawn). */
  readonly cards: readonly Card[];
  /** Total cards in the shoe when it was last shuffled (= 416 for an 8-deck shoe). */
  readonly initialSize: number;
  /** Cards remaining behind the cut card (drawn cards beyond `initialSize - cutPosition` triggers reshuffle next round). */
  readonly cutPosition: number;
  /** True when the cut card has been crossed in this shoe — set after a round completes. */
  readonly cutCardPassed: boolean;
}

/** Aggregated round outcome — written into rounds.details. */
export interface RoundResult {
  readonly player: Hand;
  readonly banker: Hand;
  readonly winner: Winner;
  /** Margin of victory (0 for tie). */
  readonly margin: number;
  /** True when the winner won on a 2-card 8 or 9. */
  readonly winnerNatural: boolean;
  /** True when BOTH sides went natural (only meaningful on a tie or close win). */
  readonly bothNatural: boolean;
  /** First-two-card pair status per side. */
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  /** Total number of cards drawn across both hands (used for Big/Small). */
  readonly totalCards: number;
}

/** Per-zone chip change after the round. Sums to the user's net change for the round. */
export type Payouts = Record<BetZoneKey, number>;

/** Bead-plate cell: one round's outcome + decorations. */
export interface BeadCell {
  readonly winner: Winner;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
}

/** Big-road cell: either a winner (Player/Banker) with optional tie-count, or empty. */
export interface BigRoadCell {
  readonly winner: 'player' | 'banker';
  /** Number of consecutive ties layered on top of this cell. */
  readonly ties: number;
  /** True when this cell got a Player Pair on its source round. */
  readonly playerPair: boolean;
  /** True when this cell got a Banker Pair on its source round. */
  readonly bankerPair: boolean;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/types.ts
git commit -m "feat(baccarat): type surface (BetZoneKey, Bets, Hand, RoundResult, scoreboard cells)"
```

## Task A.3: `src/games/baccarat/config.ts`

**Files:**

- Create: `src/games/baccarat/config.ts`

Bet limits, payout ratios, animation timing — every magic number in one place.

- [ ] **Step 1: Write the file**

```ts
import type { BetZoneKey } from './types';

/** Per-zone min / max bet (chips). Spec §6. */
export const BET_LIMITS: Record<BetZoneKey, { min: number; max: number }> = {
  player: { min: 5, max: 2000 },
  banker: { min: 5, max: 2000 },
  tie: { min: 5, max: 2000 },
  playerPair: { min: 5, max: 1000 },
  bankerPair: { min: 5, max: 1000 },
  big: { min: 5, max: 1000 },
  small: { min: 5, max: 1000 },
  playerDragon: { min: 5, max: 1000 },
  bankerDragon: { min: 5, max: 1000 },
};

/** Display strings for the payout ratio shown on each zone label. Spec §4.4, §4.5, §6. */
export const PAYOUT_LABELS: Record<BetZoneKey, string> = {
  player: '1 : 1',
  banker: '1 : 1 − 5%',
  tie: '8 : 1',
  playerPair: '11 : 1',
  bankerPair: '11 : 1',
  big: '0.54 : 1',
  small: '1.5 : 1',
  playerDragon: 'up to 30 : 1',
  bankerDragon: 'up to 30 : 1',
};

/** Banker commission fraction. Commission = floor(winnings * COMMISSION_RATE). */
export const COMMISSION_RATE = 0.05;

/** Big-side payout: floor(bet * BIG_PAYOUT_RATE). Spec §4.5. */
export const BIG_PAYOUT_RATE = 0.54;
/** Small-side payout: floor(bet * SMALL_PAYOUT_RATE). Spec §4.5. */
export const SMALL_PAYOUT_RATE = 1.5;

/** Dragon Bonus payout ladder. Spec §4.5.
 *  Key is winning margin (4..9) plus the 'natural' case. */
export const DRAGON_PAYOUT: Record<'natural' | 4 | 5 | 6 | 7 | 8 | 9, number> = {
  natural: 1, // Win with 2-card 8 or 9
  4: 1,
  5: 2,
  6: 4,
  7: 6,
  8: 10,
  9: 30,
};

/** Shoe model — spec §5. */
export const DECKS_PER_SHOE = 8;
/** Cut card lands uniformly between this many cards from the END (inclusive). */
export const CUT_CARD_RANGE_FROM_END: { min: number; max: number } = { min: 14, max: 28 };

/** Reveal timing — spec §7.2. All durations in milliseconds. */
export const REVEAL_TIMING = {
  cardSlideIn: 200,
  cornerPeek: 150,
  flip: 250,
  pauseBetweenCards: 150,
  pauseBeforeTotal: 400,
  pauseBeforeThirdCard: 800,
  bannerDisplay: 2000,
  reducedMotionBanner: 1000,
} as const;

/** Bead plate grid dimensions (rows × visible columns). */
export const BEAD_PLATE_ROWS = 6;
export const BEAD_PLATE_VISIBLE_COLS = 10;
/** Big road grid dimensions. */
export const BIG_ROAD_ROWS = 6;
export const BIG_ROAD_VISIBLE_COLS = 10;
/** Maximum number of past rounds tracked in scoreboard memory. Older drops silently. */
export const SCOREBOARD_HISTORY_CAP = 60;
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/config.ts
git commit -m "feat(baccarat): config — bet limits, payout ratios, reveal timing, shoe constants"
```

## Task A.4: `logic.ts` — card values, totals, pair detection

**Files:**

- Create: `src/games/baccarat/logic.ts`
- Create: `src/games/baccarat/logic.test.ts`

- [ ] **Step 1: Write `src/games/baccarat/logic.ts`** (initial slice — totals + pairs only; later tasks append)

```ts
import type { Card, Hand, HandTotal, Rank } from './types';

/** Baccarat card value: A=1, 2-9 face, 10/J/Q/K = 0. */
export function cardValue(card: Card): number {
  return RANK_VALUE[card.rank];
}

const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 0,
  J: 0,
  Q: 0,
  K: 0,
};

/** Hand total = ones digit of sum of card values. Always 0-9. */
export function handTotal(cards: readonly Card[]): HandTotal {
  const sum = cards.reduce((s, c) => s + cardValue(c), 0);
  return (sum % 10) as HandTotal;
}

/** Build a Hand from cards (computes total). */
export function makeHand(cards: readonly Card[]): Hand {
  return { cards, total: handTotal(cards) };
}

/** Are the first two cards of `cards` the same RANK? (10 and J do NOT pair.) */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length >= 2 && cards[0]!.rank === cards[1]!.rank;
}
```

- [ ] **Step 2: Write `src/games/baccarat/logic.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { cardValue, handTotal, isPair, makeHand } from './logic';
import type { Card, Rank, Suit } from './types';

function card(rank: Rank, suit: Suit = '♠'): Card {
  return { rank, suit, faceUp: true };
}

describe('cardValue', () => {
  it('A=1', () => expect(cardValue(card('A'))).toBe(1));
  it.each(['2', '3', '4', '5', '6', '7', '8', '9'] as Rank[])('%s = face', (r) => {
    expect(cardValue(card(r))).toBe(Number(r));
  });
  it.each(['10', 'J', 'Q', 'K'] as Rank[])('%s = 0', (r) => {
    expect(cardValue(card(r))).toBe(0);
  });
});

describe('handTotal', () => {
  it('empty hand = 0', () => expect(handTotal([])).toBe(0));
  it('single A = 1', () => expect(handTotal([card('A')])).toBe(1));
  it('two cards under 10 (3 + 4) = 7', () => expect(handTotal([card('3'), card('4')])).toBe(7));
  it('7 + 8 = 15 → ones digit 5', () => expect(handTotal([card('7'), card('8')])).toBe(5));
  it('K + Q = 0 (both worth 0)', () => expect(handTotal([card('K'), card('Q')])).toBe(0));
  it('A + 9 = 10 → ones digit 0', () => expect(handTotal([card('A'), card('9')])).toBe(0));
  it('9 + 9 + 9 = 27 → ones digit 7', () =>
    expect(handTotal([card('9'), card('9'), card('9')])).toBe(7));
});

describe('makeHand', () => {
  it('returns cards + total', () => {
    const h = makeHand([card('7'), card('8')]);
    expect(h.cards).toHaveLength(2);
    expect(h.total).toBe(5);
  });
});

describe('isPair', () => {
  it('two same-rank cards = pair', () =>
    expect(isPair([card('7', '♠'), card('7', '♥')])).toBe(true));
  it('two different ranks = not a pair', () => expect(isPair([card('7'), card('8')])).toBe(false));
  it('10 + J = not a pair (rank-based, not value-based)', () =>
    expect(isPair([card('10'), card('J')])).toBe(false));
  it('J + Q = not a pair', () => expect(isPair([card('J'), card('Q')])).toBe(false));
  it('K + K = pair', () => expect(isPair([card('K', '♠'), card('K', '♦')])).toBe(true));
  it('A + A = pair', () => expect(isPair([card('A', '♣'), card('A', '♥')])).toBe(true));
  it('1 card = not a pair', () => expect(isPair([card('7')])).toBe(false));
  it('0 cards = not a pair', () => expect(isPair([])).toBe(false));
  it('ignores the third card if present', () =>
    expect(isPair([card('7'), card('7'), card('K')])).toBe(true));
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/logic.test.ts
```

Expected: PASS (all card-value, total, and pair tests).

- [ ] **Step 4: Commit**

```bash
git add src/games/baccarat/logic.ts src/games/baccarat/logic.test.ts
git commit -m "feat(baccarat): cardValue + handTotal + isPair with rank-based pair semantics"
```

## Task A.5: `logic.ts` — third-card tableau (the canonical table)

**Files:**

- Modify: `src/games/baccarat/logic.ts`
- Modify: `src/games/baccarat/logic.test.ts`

This is the most safety-critical function in the file. Implement EXACTLY as spec §4.3 specifies and pin every cell with a test.

- [ ] **Step 1: Append to `src/games/baccarat/logic.ts`**

```ts
import type { HandTotal } from './types';

/** Spec §4.3: Player draws a third card iff two-card total is 0..5. */
export function playerDrawsThird(playerTotal: HandTotal): boolean {
  if (playerTotal === 8 || playerTotal === 9) {
    throw new Error('playerDrawsThird: natural pre-empted; caller bug');
  }
  return playerTotal <= 5;
}

/**
 * Spec §4.3: Banker draws iff their two-card total + player's third-card
 * outcome match the canonical tableau.
 *
 * `playerThirdValue` is the Baccarat value (0-9) of Player's third card, or
 * `null` if Player did not draw (stood on 6/7).
 *
 * Naturals are pre-empted upstream; this function throws if banker total is 8/9.
 */
export function bankerDrawsThird(bankerTotal: HandTotal, playerThirdValue: number | null): boolean {
  if (bankerTotal === 8 || bankerTotal === 9) {
    throw new Error('bankerDrawsThird: natural pre-empted; caller bug');
  }

  // Player stood on 6/7 → Banker uses the simpler two-card-total rule.
  if (playerThirdValue === null) {
    return bankerTotal <= 5;
  }

  // Player drew. Validate input is in 0-9.
  if (!Number.isInteger(playerThirdValue) || playerThirdValue < 0 || playerThirdValue > 9) {
    throw new Error(`bankerDrawsThird: invalid playerThirdValue ${playerThirdValue}`);
  }

  // Canonical Baccarat tableau — spec §4.3.
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdValue !== 8;
    case 4:
      return playerThirdValue >= 2 && playerThirdValue <= 7;
    case 5:
      return playerThirdValue >= 4 && playerThirdValue <= 7;
    case 6:
      return playerThirdValue === 6 || playerThirdValue === 7;
    case 7:
      return false;
    default:
      // Should never reach here because bankerTotal is HandTotal (0..9) and we
      // rejected 8/9 above.
      throw new Error(`bankerDrawsThird: impossible bankerTotal ${String(bankerTotal)}`);
  }
}
```

- [ ] **Step 2: Append to `src/games/baccarat/logic.test.ts`** (cell-by-cell coverage)

```ts
import { playerDrawsThird, bankerDrawsThird } from './logic';
import type { HandTotal } from './types';

describe('playerDrawsThird', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('total %i → draws', (t) => {
    expect(playerDrawsThird(t)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('total %i → stands', (t) => {
    expect(playerDrawsThird(t)).toBe(false);
  });
  it.each([8, 9] as HandTotal[])('throws on natural (%i) — caller bug', (t) => {
    expect(() => playerDrawsThird(t)).toThrow(/natural pre-empted/);
  });
});

describe('bankerDrawsThird — Player stood (playerThirdValue=null)', () => {
  it.each([0, 1, 2, 3, 4, 5] as HandTotal[])('banker %i → draws', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(true);
  });
  it.each([6, 7] as HandTotal[])('banker %i → stands', (t) => {
    expect(bankerDrawsThird(t, null)).toBe(false);
  });
});

describe('bankerDrawsThird — Player drew (canonical tableau cells)', () => {
  // For each banker total 0..7, exhaustive over playerThirdValue 0..9.
  const TABLE: Array<{ banker: HandTotal; expected: ReadonlyArray<boolean> }> = [
    // index 0..9 = playerThirdValue
    { banker: 0, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 1, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 2, expected: [true, true, true, true, true, true, true, true, true, true] },
    { banker: 3, expected: [true, true, true, true, true, true, true, true, false, true] },
    { banker: 4, expected: [false, false, true, true, true, true, true, true, false, false] },
    { banker: 5, expected: [false, false, false, false, true, true, true, true, false, false] },
    { banker: 6, expected: [false, false, false, false, false, false, true, true, false, false] },
    { banker: 7, expected: [false, false, false, false, false, false, false, false, false, false] },
  ];

  for (const { banker, expected } of TABLE) {
    describe(`banker ${banker}`, () => {
      for (let v = 0; v <= 9; v++) {
        const want = expected[v]!;
        it(`player third = ${v} → ${want ? 'draws' : 'stands'}`, () => {
          expect(bankerDrawsThird(banker, v)).toBe(want);
        });
      }
    });
  }
});

describe('bankerDrawsThird — input validation', () => {
  it.each([8, 9] as HandTotal[])('throws on natural banker (%i)', (t) => {
    expect(() => bankerDrawsThird(t, 0)).toThrow(/natural pre-empted/);
  });
  it('throws on non-integer playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, 1.5)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on negative playerThirdValue', () => {
    expect(() => bankerDrawsThird(3, -1)).toThrow(/invalid playerThirdValue/);
  });
  it('throws on playerThirdValue > 9', () => {
    expect(() => bankerDrawsThird(3, 10)).toThrow(/invalid playerThirdValue/);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/logic.test.ts
```

Expected: PASS. ~110 new test cases (80 cell-by-cell + edges).

- [ ] **Step 4: Commit**

```bash
git add src/games/baccarat/logic.ts src/games/baccarat/logic.test.ts
git commit -m "feat(baccarat): third-card tableau (playerDrawsThird + bankerDrawsThird) with cell-by-cell tests"
```

## Task A.6: `logic.ts` — `resolveRound` + `computePayouts`

**Files:**

- Modify: `src/games/baccarat/logic.ts`
- Modify: `src/games/baccarat/logic.test.ts`

- [ ] **Step 1: Append to `src/games/baccarat/logic.ts`**

```ts
import type { Bets, Card, Payouts, RoundResult, Winner } from './types';
import { BIG_PAYOUT_RATE, COMMISSION_RATE, DRAGON_PAYOUT, SMALL_PAYOUT_RATE } from './config';

/** Compute the full RoundResult from the two completed hands. */
export function resolveRound(
  playerCards: readonly Card[],
  bankerCards: readonly Card[],
): RoundResult {
  const player = makeHand(playerCards);
  const banker = makeHand(bankerCards);
  const winner: Winner =
    player.total > banker.total ? 'player' : banker.total > player.total ? 'banker' : 'tie';
  const margin = Math.abs(player.total - banker.total);
  const playerNatural = player.cards.length === 2 && (player.total === 8 || player.total === 9);
  const bankerNatural = banker.cards.length === 2 && (banker.total === 8 || banker.total === 9);
  const winnerNatural =
    (winner === 'player' && playerNatural) || (winner === 'banker' && bankerNatural);
  const bothNatural = playerNatural && bankerNatural;
  return {
    player,
    banker,
    winner,
    margin,
    winnerNatural,
    bothNatural,
    playerPair: isPair(playerCards),
    bankerPair: isPair(bankerCards),
    totalCards: playerCards.length + bankerCards.length,
  };
}

/**
 * Per-zone chip change after the round. Positive = chips returned + winnings;
 * negative = stake lost; zero = push or no bet. Caller adds these together
 * to get the net round outcome; wallet.settleRound writes the actual rows.
 *
 * For a PUSH, the zone returns 0 (the wallet returns the original stake).
 * For a LOSS, the zone returns -bet (the stake is forfeit).
 * For a WIN, the zone returns +winnings (the stake is returned separately
 * by the wallet — the layer above this function uses the magnitudes to
 * settle).
 */
export function computePayouts(bets: Bets, result: RoundResult): Payouts {
  return {
    player: payPlayerBanker('player', bets.player, result),
    banker: payPlayerBanker('banker', bets.banker, result),
    tie: payTie(bets.tie, result),
    playerPair: payPair(bets.playerPair, result.playerPair),
    bankerPair: payPair(bets.bankerPair, result.bankerPair),
    big: payBig(bets.big, result),
    small: paySmall(bets.small, result),
    playerDragon: payDragon('player', bets.playerDragon, result),
    bankerDragon: payDragon('banker', bets.bankerDragon, result),
  };
}

function payPlayerBanker(side: 'player' | 'banker', bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.winner === 'tie') return 0; // push
  if (result.winner !== side) return -bet;
  // Win.
  if (side === 'banker') {
    const commission = Math.floor(bet * COMMISSION_RATE);
    return bet - commission;
  }
  return bet; // Player 1:1 winnings
}

function payTie(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.winner !== 'tie') return -bet;
  return bet * 8;
}

function payPair(bet: number, pairFired: boolean): number {
  if (bet === 0) return 0;
  return pairFired ? bet * 11 : -bet;
}

function payBig(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  // Big wins iff total cards drawn is 5 or 6.
  if (result.totalCards === 5 || result.totalCards === 6) {
    return Math.floor(bet * BIG_PAYOUT_RATE);
  }
  return -bet;
}

function paySmall(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  // Small wins iff total cards drawn is exactly 4.
  if (result.totalCards === 4) {
    return Math.floor(bet * SMALL_PAYOUT_RATE);
  }
  return -bet;
}

function payDragon(side: 'player' | 'banker', bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  // Tie with both sides natural: push.
  if (result.bothNatural && result.winner === 'tie') return 0;
  // Otherwise tie: dragon loses (real-Macau rule).
  if (result.winner === 'tie') return -bet;
  if (result.winner !== side) return -bet;
  // Winning side, natural.
  if (result.winnerNatural) {
    return bet * DRAGON_PAYOUT.natural;
  }
  // Winning side, non-natural — pays by margin.
  switch (result.margin) {
    case 4:
      return bet * DRAGON_PAYOUT[4];
    case 5:
      return bet * DRAGON_PAYOUT[5];
    case 6:
      return bet * DRAGON_PAYOUT[6];
    case 7:
      return bet * DRAGON_PAYOUT[7];
    case 8:
      return bet * DRAGON_PAYOUT[8];
    case 9:
      return bet * DRAGON_PAYOUT[9];
    default:
      // Margin 1, 2, or 3 on a non-natural win → Dragon loses.
      return -bet;
  }
}
```

- [ ] **Step 2: Append to `src/games/baccarat/logic.test.ts`**

```ts
import { computePayouts, resolveRound } from './logic';
import { EMPTY_BETS } from './types';

describe('resolveRound', () => {
  it('Player 7 vs Banker 5 → player wins, margin 2', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(2);
    expect(r.winnerNatural).toBe(false);
    expect(r.bothNatural).toBe(false);
    expect(r.totalCards).toBe(4);
  });

  it('Player 8 (natural) vs Banker 5 → player wins natural', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    expect(r.winner).toBe('player');
    expect(r.winnerNatural).toBe(true);
    expect(r.bothNatural).toBe(false);
  });

  it('Player 8 vs Banker 8 → tie, both natural', () => {
    const r = resolveRound([card('A'), card('7')], [card('3'), card('5')]);
    expect(r.winner).toBe('tie');
    expect(r.bothNatural).toBe(true);
  });

  it('detects Player Pair on rank match', () => {
    const r = resolveRound([card('7', '♠'), card('7', '♥')], [card('K'), card('Q')]);
    expect(r.playerPair).toBe(true);
    expect(r.bankerPair).toBe(false);
  });

  it('totalCards counts all dealt cards including thirds', () => {
    const r = resolveRound([card('2'), card('3'), card('4')], [card('5'), card('6'), card('7')]);
    expect(r.totalCards).toBe(6);
  });
});

describe('computePayouts', () => {
  it('zero bets → all zeros', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(computePayouts(EMPTY_BETS, r)).toEqual(EMPTY_BETS);
  });

  it('Player win, bet on Player: returns +bet (1:1 winnings)', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, player: 100 }, r);
    expect(p.player).toBe(100);
  });

  it('Banker win, bet on Banker 100: returns 95 (5% commission floor)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 100 }, r);
    expect(p.banker).toBe(95);
  });

  it('Banker win, bet on Banker 17: returns 17 (floor(17*0.05) = 0 commission)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 17 }, r);
    expect(p.banker).toBe(17);
  });

  it('Banker win, bet on Banker 21: returns 20 (floor(21*0.05) = 1 commission)', () => {
    const r = resolveRound([card('2'), card('3')], [card('3'), card('4')]);
    const p = computePayouts({ ...EMPTY_BETS, banker: 21 }, r);
    expect(p.banker).toBe(20);
  });

  it('Tie: Player and Banker push (return 0), Tie pays 8:1', () => {
    const r = resolveRound([card('3'), card('5')], [card('3'), card('5')]);
    const p = computePayouts({ ...EMPTY_BETS, player: 50, banker: 50, tie: 10 }, r);
    expect(p.player).toBe(0);
    expect(p.banker).toBe(0);
    expect(p.tie).toBe(80);
  });

  it('Player Pair fires: pays 11:1', () => {
    const r = resolveRound([card('7', '♠'), card('7', '♥')], [card('K'), card('Q')]);
    const p = computePayouts({ ...EMPTY_BETS, playerPair: 10 }, r);
    expect(p.playerPair).toBe(110);
  });

  it('No pair: pair bet loses', () => {
    const r = resolveRound([card('7'), card('8')], [card('K'), card('Q')]);
    const p = computePayouts({ ...EMPTY_BETS, playerPair: 10 }, r);
    expect(p.playerPair).toBe(-10);
  });

  it('Big (4 cards) loses; Small (4 cards) wins floor(bet*1.5)', () => {
    const r = resolveRound([card('3'), card('4')], [card('2'), card('3')]);
    expect(r.totalCards).toBe(4);
    const p = computePayouts({ ...EMPTY_BETS, big: 100, small: 100 }, r);
    expect(p.big).toBe(-100);
    expect(p.small).toBe(150);
  });

  it('Small (5 cards) loses; Big (5 cards) wins floor(bet*0.54)', () => {
    const r = resolveRound([card('2'), card('3'), card('4')], [card('2'), card('3')]);
    expect(r.totalCards).toBe(5);
    const p = computePayouts({ ...EMPTY_BETS, big: 100, small: 100 }, r);
    expect(p.small).toBe(-100);
    expect(p.big).toBe(54);
  });

  it('Dragon natural win pays 1:1', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 100 }, r);
    expect(p.playerDragon).toBe(100);
  });

  it('Dragon non-natural margin-9 win pays 30:1', () => {
    const r = resolveRound([card('A'), card('2'), card('6')], [card('K'), card('K')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(9);
    expect(r.winnerNatural).toBe(false);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 50 }, r);
    expect(p.playerDragon).toBe(1500);
  });

  it('Dragon margin-1/2/3 win → loses (real Dragon rule)', () => {
    // Player wins 7 vs Banker 6 → margin 1, non-natural.
    const r = resolveRound([card('3'), card('4')], [card('2'), card('4')]);
    expect(r.winner).toBe('player');
    expect(r.margin).toBe(1);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 100 }, r);
    expect(p.playerDragon).toBe(-100);
  });

  it('Dragon on tie with both natural → push', () => {
    const r = resolveRound([card('A'), card('7')], [card('3'), card('5')]);
    expect(r.bothNatural).toBe(true);
    const p = computePayouts({ ...EMPTY_BETS, playerDragon: 50, bankerDragon: 50 }, r);
    expect(p.playerDragon).toBe(0);
    expect(p.bankerDragon).toBe(0);
  });

  it('Dragon on losing side → loses', () => {
    const r = resolveRound([card('A'), card('7')], [card('2'), card('3')]);
    const p = computePayouts({ ...EMPTY_BETS, bankerDragon: 100 }, r);
    expect(p.bankerDragon).toBe(-100);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/logic.test.ts
```

Expected: PASS. All payout cases pinned.

- [ ] **Step 4: Commit**

```bash
git add src/games/baccarat/logic.ts src/games/baccarat/logic.test.ts
git commit -m "feat(baccarat): resolveRound + computePayouts (commission floor, Dragon ladder, push semantics)"
```

## Task A.7: `logic.ts` — `getBigRoad` + bead-plate derivation

**Files:**

- Modify: `src/games/baccarat/logic.ts`
- Modify: `src/games/baccarat/logic.test.ts`

- [ ] **Step 1: Append to `src/games/baccarat/logic.ts`**

```ts
import type { BeadCell, BigRoadCell, Winner } from './types';
import { BIG_ROAD_ROWS, SCOREBOARD_HISTORY_CAP } from './config';

/** History entry the scoreboard derivers consume. Subset of RoundResult. */
export interface ScoreboardEntry {
  readonly winner: Winner;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
}

/** Bead plate: caps history at SCOREBOARD_HISTORY_CAP rounds. Returns oldest-first. */
export function getBeadPlate(entries: readonly ScoreboardEntry[]): BeadCell[] {
  const trimmed = entries.slice(-SCOREBOARD_HISTORY_CAP);
  return trimmed.map((e) => ({
    winner: e.winner,
    playerPair: e.playerPair,
    bankerPair: e.bankerPair,
  }));
}

/**
 * Big road: walked-pen behavior.
 * - Each new winner of the same type as the previous drops one row in the same column.
 * - A change of winner moves to the top of the next column.
 * - Ties overlay on the most recent non-tie cell (counted, not a new column).
 * - Returns a 2D grid where outer index is column, inner index is row.
 *   Empty cells are not represented (sparse trailing columns are omitted).
 */
export function getBigRoad(entries: readonly ScoreboardEntry[]): BigRoadCell[][] {
  const trimmed = entries.slice(-SCOREBOARD_HISTORY_CAP);
  const columns: BigRoadCell[][] = [];
  // Track current column position so we can drop-down or wrap-to-next.
  let curCol = -1;
  let curRow = -1;
  let curWinner: 'player' | 'banker' | null = null;

  for (const e of trimmed) {
    if (e.winner === 'tie') {
      // Tie overlays on the most recent non-tie cell. If there is no non-tie cell yet,
      // ignore (real casinos do this too — opening tie is just shown on the bead plate).
      if (curCol >= 0 && curRow >= 0) {
        const cell = columns[curCol]![curRow]!;
        columns[curCol]![curRow] = { ...cell, ties: cell.ties + 1 };
      }
      continue;
    }
    const next: BigRoadCell = {
      winner: e.winner,
      ties: 0,
      playerPair: e.playerPair,
      bankerPair: e.bankerPair,
    };
    if (curWinner === null || curWinner !== e.winner) {
      // New column.
      curCol += 1;
      curRow = 0;
      columns[curCol] = [next];
    } else {
      // Same as previous — try to drop down in current column.
      if (curRow + 1 < BIG_ROAD_ROWS) {
        curRow += 1;
        columns[curCol]!.push(next);
      } else {
        // Column overflowed → start a new column to the right.
        curCol += 1;
        curRow = 0;
        columns[curCol] = [next];
      }
    }
    curWinner = e.winner;
  }

  return columns;
}
```

- [ ] **Step 2: Append to `src/games/baccarat/logic.test.ts`**

```ts
import { getBeadPlate, getBigRoad } from './logic';
import type { ScoreboardEntry } from './logic';

function entry(winner: ScoreboardEntry['winner'], pp = false, bp = false): ScoreboardEntry {
  return { winner, playerPair: pp, bankerPair: bp };
}

describe('getBeadPlate', () => {
  it('returns entries unchanged (oldest-first)', () => {
    const e: ScoreboardEntry[] = [entry('player'), entry('banker'), entry('tie')];
    expect(getBeadPlate(e)).toEqual([
      { winner: 'player', playerPair: false, bankerPair: false },
      { winner: 'banker', playerPair: false, bankerPair: false },
      { winner: 'tie', playerPair: false, bankerPair: false },
    ]);
  });

  it('caps to last 60 entries', () => {
    const e: ScoreboardEntry[] = Array.from({ length: 80 }, () => entry('player'));
    expect(getBeadPlate(e)).toHaveLength(60);
  });

  it('preserves pair flags', () => {
    expect(getBeadPlate([entry('player', true, false)])[0]).toMatchObject({ playerPair: true });
  });
});

describe('getBigRoad', () => {
  it('empty input → empty grid', () => {
    expect(getBigRoad([])).toEqual([]);
  });

  it('single player win → one column, one cell', () => {
    const r = getBigRoad([entry('player')]);
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(1);
    expect(r[0]![0]).toMatchObject({ winner: 'player', ties: 0 });
  });

  it('same winner repeats → drops down in same column', () => {
    const r = getBigRoad([entry('player'), entry('player'), entry('player')]);
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(3);
    r[0]!.forEach((cell) => expect(cell.winner).toBe('player'));
  });

  it('winner change → new column', () => {
    const r = getBigRoad([entry('player'), entry('banker'), entry('player')]);
    expect(r).toHaveLength(3);
    expect(r[0]![0]!.winner).toBe('player');
    expect(r[1]![0]!.winner).toBe('banker');
    expect(r[2]![0]!.winner).toBe('player');
  });

  it('tie overlays on the most recent cell (counts ties)', () => {
    const r = getBigRoad([entry('player'), entry('tie'), entry('tie')]);
    expect(r).toHaveLength(1);
    expect(r[0]![0]).toMatchObject({ winner: 'player', ties: 2 });
  });

  it('tie before any non-tie is ignored in the big road', () => {
    const r = getBigRoad([entry('tie'), entry('tie'), entry('player')]);
    expect(r).toHaveLength(1);
    expect(r[0]![0]).toMatchObject({ winner: 'player', ties: 0 });
  });

  it('column overflows after 6 same-side wins → new column', () => {
    const r = getBigRoad(Array.from({ length: 7 }, () => entry('banker')));
    expect(r).toHaveLength(2);
    expect(r[0]).toHaveLength(6);
    expect(r[1]).toHaveLength(1);
  });

  it('PPBPB sequence produces expected shape', () => {
    const r = getBigRoad([
      entry('player'),
      entry('player'),
      entry('banker'),
      entry('player'),
      entry('banker'),
    ]);
    expect(r).toHaveLength(4);
    expect(r.map((col) => col.map((c) => c.winner))).toEqual([
      ['player', 'player'],
      ['banker'],
      ['player'],
      ['banker'],
    ]);
  });

  it('preserves pair flags on the cell that produced the round', () => {
    const r = getBigRoad([entry('player', true, false), entry('banker', false, true)]);
    expect(r[0]![0]).toMatchObject({ playerPair: true, bankerPair: false });
    expect(r[1]![0]).toMatchObject({ playerPair: false, bankerPair: true });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/logic.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/games/baccarat/logic.ts src/games/baccarat/logic.test.ts
git commit -m "feat(baccarat): getBeadPlate + getBigRoad with walked-pen logic + tie overlay"
```

## Task A.8: ADR-0036 — Baccarat third-card tableau + rounding rules

**Files:**

- Create: `docs/adr/0036-baccarat-third-card-tableau.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0036: Baccarat third-card tableau and integer rounding

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

Baccarat (Phase 6) requires a canonical implementation of the third-card
drawing tableau — a fixed lookup table that controls when Banker draws a
third card based on Banker's own two-card total and the value of Player's
third card.

Several Baccarat variants exist (Mini, EZ, Punto Banco, Macau Big Table).
They all share the same Player rule (draw on 0-5, stand on 6-7) but vary
slightly in Banker behavior on edge cells. We picked one variant.

Additionally, the project rule "money is integers" (CLAUDE.md §3.6) means
the 5% banker commission, the Big-side `0.54:1` payout, and the Small-side
`1.5:1` payout cannot be implemented as direct float multiplications.

## Decision

**Canonical Punto Banco tableau** (the version used on full-size Baccarat
tables worldwide):

- Player draws iff two-card total is 0-5 (8/9 are naturals → no third).
- Banker rule, when Player did NOT draw (stood on 6/7): Banker draws iff
  Banker's two-card total is 0-5; stands on 6/7.
- Banker rule, when Player DREW a third with value `v` (0-9):
  - Banker 0/1/2 → always draws
  - Banker 3 → draws unless `v=8`
  - Banker 4 → draws iff `v` in 2..7
  - Banker 5 → draws iff `v` in 4..7
  - Banker 6 → draws iff `v` in 6..7
  - Banker 7 → always stands

**Integer rounding rule:** `floor()` everywhere.

- Banker commission = `floor(winnings * 0.05)`
- Big payout = `floor(bet * 0.54)`
- Small payout = `floor(bet * 1.5)`

`floor` favors the player on rounding remainders, matching low-stakes
real-casino practice ("the dealer doesn't bother making change for nickels").

## Alternatives considered

- **EZ Baccarat tableau.** Skips commission; instead introduces a "Banker
  with 7 made from 3 cards" push rule. Rejected: less commonly known, and
  the commission UI is more interesting to look at.
- **Round to nearest.** Mathematically fairer over the long run. Rejected
  because it sometimes favors the house on bets where floor would favor the
  player, which the user found counter-intuitive in design review.
- **Restrict bet amounts to multiples of 20** so 5% is always whole.
  Rejected: ugly UX, inconsistent with other games' free-form bet amounts.
- **Track sub-chip commission as floating-point debt and settle at session
  end.** Real high-roller practice. Rejected as scope creep.

## Consequences

- The third-card tableau implementation in `src/games/baccarat/logic.ts`
  matches `bankerDrawsThird()` cell-for-cell with this ADR. Every cell is
  pinned by a test in `logic.test.ts`.
- Players see slightly under-house-edge behavior on bets like Banker 17
  (commission of 0 chips instead of "fair" 1 chip). The tilt is sub-1%
  over long play and acceptable for play money.
- Future EZ-Baccarat or alt-variant support requires a new ADR; do not
  silently extend the tableau.

## References

- `src/games/baccarat/logic.ts` — `playerDrawsThird`, `bankerDrawsThird`
- `src/games/baccarat/logic.test.ts` — cell-by-cell tests
- `src/games/baccarat/config.ts` — `COMMISSION_RATE`, `BIG_PAYOUT_RATE`, `SMALL_PAYOUT_RATE`
- Phase 6 spec §4.3, §4.4, §4.5
```

- [ ] **Step 2: Markdownlint check**

```bash
npx markdownlint-cli2 docs/adr/0036-baccarat-third-card-tableau.md
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0036-baccarat-third-card-tableau.md
git commit -m "docs(adr): 0036 — Baccarat canonical third-card tableau + floor rounding"
```

## Task A.9: ADR-0037 — Persistent shoe with cut card

**Files:**

- Create: `docs/adr/0037-baccarat-persistent-shoe.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0037: Baccarat persistent shoe with cut card

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

Real Baccarat is dealt from a persistent 8-deck shoe. A cut card is inserted
roughly 14-28 cards from the bottom (the dealer's choice in practice). Once
the cut card is dealt out (mid-round usually), the shoe is finished and the
table reshuffles between rounds.

Phase 4 (Roulette) used a stateless RNG call per spin. Phase 5 (Slots) used
the cumulative-table weighted pick. Baccarat is the first MASQUER game
where draws are NOT independent — once a card is dealt, the probability of
the next card changes (though the effect is tiny over 416 cards).

## Decision

**Persistent 8-deck shoe** held in the round machine's context (`ShoeState`).

- Shoe initial size: 416 cards (`DECKS_PER_SHOE * 52`).
- Cut-card placement: uniform random integer in `[14, 28]` from the END of
  the shoe (per spec §5). Range pinned in `config.ts`.
- Draws happen via `drawFromShoe(shoe)` which returns the next card and a
  new ShoeState with that card removed.
- After a round completes, `cutCardPassed` is set to true on the shoe if
  fewer than `cutPosition` cards remain. The next call to start a round
  detects this flag and reshuffles a fresh 8-deck shoe.
- Reshuffle is **one-round-delayed**: the round that uses up the cut card
  completes normally; the FOLLOWING round starts with a fresh shoe and
  shows a "FRESH SHOE" banner briefly.
- Shoe state is NOT persisted to Dexie — it lives only in the machine's
  in-memory context. A tab reload starts a fresh shoe. Acceptable for
  local play-money.

## Alternatives considered

- **Infinite-deck approximation** (independent draws each card, no shoe
  state). Simpler. Rejected: the user wanted a realistic shoe with a
  visible cut-card mid-shoe moment, and the long-run probabilities are
  almost identical anyway.
- **Cut-card placement as a fixed 21 cards from end.** Predictable; loses
  the small-but-real variation in real-casino practice. Rejected for the
  realism reason.
- **Persist shoe state in Dexie so it survives reloads.** Adds a new table
  - serialization layer. Rejected: the value of persisting a shoe across
    page reloads is near-zero (no card counting upside in this game), and
    the cost is non-trivial.
- **Reshuffle immediately mid-round when the cut card is hit.** Real
  casinos do NOT do this — once the cut card is dealt, the round finishes
  with the current shoe. Rejected to keep realism.

## Consequences

- Tab reload = fresh shoe. Mostly invisible to the player; the shoe-depth
  indicator just shows ~416 again.
- The shoe lives in the XState context and must be serialized into the
  machine's `RoundResult.details` (or at least its "depth-at-deal"
  snapshot) so that future analytics can compute things like
  "wins-per-shoe" if we ever want them.
- `shoe.ts` is a pure module — no React, no I/O — so it can be unit-tested
  in isolation (`shoe.test.ts`).

## References

- `src/games/baccarat/shoe.ts` — `build8DeckShoe`, `placeCutCard`,
  `drawFromShoe`, `cutCardPassed`
- `src/games/baccarat/types.ts` — `ShoeState`
- `src/games/baccarat/config.ts` — `DECKS_PER_SHOE`, `CUT_CARD_RANGE_FROM_END`
- Phase 6 spec §5
```

- [ ] **Step 2: Markdownlint**

```bash
npx markdownlint-cli2 docs/adr/0037-baccarat-persistent-shoe.md
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0037-baccarat-persistent-shoe.md
git commit -m "docs(adr): 0037 — Baccarat persistent 8-deck shoe + cut card"
```

## Task A.10: PR A — DoD, push, open, merge

- [ ] **Step 1: Run the full DoD locally**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~800 tests passing (~140 new Baccarat-logic tests on top of 661 baseline).

- [ ] **Step 2: Markdownlint both ADRs**

```bash
npx markdownlint-cli2 docs/adr/0036-baccarat-third-card-tableau.md docs/adr/0037-baccarat-persistent-shoe.md
```

Expected: 0 errors.

- [ ] **Step 3: Push branch**

```bash
git push -u origin phase-6-baccarat-pr-a-logic
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --title "phase-6(baccarat): PR A — pure logic (tableau, payouts, big-road) + ADRs" --body "$(cat <<'EOF'
## Summary

PR A of Phase 6. Pure logic foundation, two ADRs, commitlint scope.

- types.ts — 9 BetZoneKey union, Bets, Hand, RoundResult, BeadCell, BigRoadCell
- config.ts — BET_LIMITS, payout constants, reveal timing, shoe constants
- logic.ts:
  - cardValue / handTotal / makeHand / isPair (rank-based)
  - playerDrawsThird, bankerDrawsThird (canonical tableau, cell-by-cell tested)
  - resolveRound, computePayouts (commission floor, Dragon ladder, push semantics)
  - getBeadPlate, getBigRoad (walked-pen with tie overlay)
- ADR-0036 — canonical tableau + floor rounding
- ADR-0037 — persistent 8-deck shoe with cut card
- commitlint scope-enum extended with 'baccarat'

Plan reference: docs/superpowers/plans/2026-05-18-phase-6-baccarat-plan.md — PR A, tasks A.1–A.10.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~140 new tests passing (mostly cell-by-cell coverage on the third-card tableau and payout edges)
- [x] Markdownlint clean on both ADRs
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for CI green, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged, main synced (PR A).

---

# PR B — Shoe ops + XState round machine

**Branch:** `phase-6-baccarat-pr-b-shoe-machine` (off freshly-merged `main`)
**Goal of this PR:** Implement the persistent 8-deck shoe (`shoe.ts`) and wire the entire round flow as an XState v5 machine (`machine.ts`). After this PR, you can run the machine from a unit test and watch a round play out end-to-end — naturals, third cards, settling — all headless.
**Risk:** Medium. The machine has 8 states and several auto-transitions; the shoe interaction needs cut-card semantics that match spec §5.
**Estimated tasks:** 6.

## Task B.1: Branch + `src/games/baccarat/shoe.ts`

**Files:**

- Create: `src/games/baccarat/shoe.ts`
- Create: `src/games/baccarat/shoe.test.ts`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-6-baccarat-pr-b-shoe-machine
```

- [ ] **Step 2: Write `src/games/baccarat/shoe.ts`**

```ts
import { shuffle, randomInt } from '@/systems/rng';
import { buildShoe } from '@/games/blackjack/cards';
import type { Card } from '@/games/blackjack/types';
import { DECKS_PER_SHOE, CUT_CARD_RANGE_FROM_END } from './config';
import type { ShoeState } from './types';

/**
 * Build a fresh 8-deck shoe with a uniformly-random cut-card position.
 * Reuses Phase 3's buildShoe (which builds an N-deck array of Cards) and
 * shuffles with the project RNG.
 */
export function build8DeckShoe(): ShoeState {
  const cards = shuffle(buildShoe(DECKS_PER_SHOE));
  const initialSize = cards.length; // 416
  const fromEnd = randomInt(CUT_CARD_RANGE_FROM_END.min, CUT_CARD_RANGE_FROM_END.max);
  // cutPosition = "draw this many cards before the cut card is reached".
  // So cutPosition = initialSize - fromEnd.
  const cutPosition = initialSize - fromEnd;
  return {
    cards,
    initialSize,
    cutPosition,
    cutCardPassed: false,
  };
}

/**
 * Draw the next card off the shoe. Returns the drawn card + the new ShoeState
 * with that card removed. Throws if shoe is empty (caller bug).
 *
 * Note: cutCardPassed is NOT updated here. It's only updated AFTER a round
 * completes (one-round-delayed reshuffle per ADR-0037). Call markCutIfPassed
 * once at end of round.
 */
export function drawFromShoe(shoe: ShoeState): { card: Card; shoe: ShoeState } {
  if (shoe.cards.length === 0) {
    throw new RangeError('drawFromShoe: shoe is empty');
  }
  const [card, ...rest] = shoe.cards;
  return { card: card!, shoe: { ...shoe, cards: rest } };
}

/**
 * After a round, check whether we've crossed the cut card. If so, mark
 * the shoe so the NEXT round triggers a reshuffle.
 */
export function markCutIfPassed(shoe: ShoeState): ShoeState {
  const dealt = shoe.initialSize - shoe.cards.length;
  if (dealt >= shoe.cutPosition && !shoe.cutCardPassed) {
    return { ...shoe, cutCardPassed: true };
  }
  return shoe;
}

/** Returns true if the next round should start with a fresh shoe. */
export function shouldReshuffleBeforeNextRound(shoe: ShoeState): boolean {
  return shoe.cutCardPassed;
}

/** Cards remaining before the cut card. May be negative if cut was already crossed. */
export function cardsToCut(shoe: ShoeState): number {
  return shoe.cutPosition - (shoe.initialSize - shoe.cards.length);
}
```

- [ ] **Step 3: Confirm `randomInt` exists in `src/systems/rng.ts`** (or pin the function we need)

```bash
grep -n "export function randomInt\|export const randomInt" src/systems/rng.ts || echo "NOT FOUND"
```

If `randomInt(min, max)` doesn't exist, add it to `src/systems/rng.ts` with `[min, max]` inclusive semantics — but Phase 4 already uses it (it was added with Roulette). Verify before assuming.

If you need to add it:

```ts
/** Inclusive on both ends. */
export function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
```

(Where `random()` is the existing seedable RNG.)

- [ ] **Step 4: Write `src/games/baccarat/shoe.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  build8DeckShoe,
  cardsToCut,
  drawFromShoe,
  markCutIfPassed,
  shouldReshuffleBeforeNextRound,
} from './shoe';
import { CUT_CARD_RANGE_FROM_END, DECKS_PER_SHOE } from './config';
import { seedRng, clearSeed } from '@/systems/rng';

describe('build8DeckShoe', () => {
  beforeEach(() => seedRng(12345));
  afterEach(() => clearSeed());

  it('builds 416 cards (8 decks × 52)', () => {
    const s = build8DeckShoe();
    expect(s.cards.length).toBe(DECKS_PER_SHOE * 52);
    expect(s.initialSize).toBe(DECKS_PER_SHOE * 52);
  });

  it('cut position falls in [initialSize - rangeMax, initialSize - rangeMin]', () => {
    const s = build8DeckShoe();
    const min = s.initialSize - CUT_CARD_RANGE_FROM_END.max;
    const max = s.initialSize - CUT_CARD_RANGE_FROM_END.min;
    expect(s.cutPosition).toBeGreaterThanOrEqual(min);
    expect(s.cutPosition).toBeLessThanOrEqual(max);
  });

  it('starts with cutCardPassed = false', () => {
    expect(build8DeckShoe().cutCardPassed).toBe(false);
  });

  it('different RNG seeds produce different shuffles', () => {
    seedRng(1);
    const a = build8DeckShoe();
    seedRng(2);
    const b = build8DeckShoe();
    expect(a.cards).not.toEqual(b.cards);
  });
});

describe('drawFromShoe', () => {
  beforeEach(() => seedRng(12345));
  afterEach(() => clearSeed());

  it('returns next card + shoe with one less card', () => {
    const s0 = build8DeckShoe();
    const { card, shoe: s1 } = drawFromShoe(s0);
    expect(card).toBeDefined();
    expect(s1.cards.length).toBe(s0.cards.length - 1);
    // The returned card was the one at index 0.
    expect(card).toEqual(s0.cards[0]);
  });

  it('throws when shoe is empty', () => {
    const empty = { ...build8DeckShoe(), cards: [] };
    expect(() => drawFromShoe(empty)).toThrow(/empty/);
  });
});

describe('markCutIfPassed + shouldReshuffleBeforeNextRound', () => {
  beforeEach(() => seedRng(12345));
  afterEach(() => clearSeed());

  it('does nothing when fewer cards dealt than cutPosition', () => {
    let s = build8DeckShoe();
    // Draw just 4 cards (one round's worth).
    for (let i = 0; i < 4; i++) s = drawFromShoe(s).shoe;
    s = markCutIfPassed(s);
    expect(s.cutCardPassed).toBe(false);
    expect(shouldReshuffleBeforeNextRound(s)).toBe(false);
  });

  it('marks cutCardPassed once dealt count reaches cutPosition', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition) {
      s = drawFromShoe(s).shoe;
    }
    s = markCutIfPassed(s);
    expect(s.cutCardPassed).toBe(true);
    expect(shouldReshuffleBeforeNextRound(s)).toBe(true);
  });

  it('markCutIfPassed is idempotent', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition) {
      s = drawFromShoe(s).shoe;
    }
    const once = markCutIfPassed(s);
    const twice = markCutIfPassed(once);
    expect(twice).toBe(once); // same reference (no new object)
  });
});

describe('cardsToCut', () => {
  beforeEach(() => seedRng(12345));
  afterEach(() => clearSeed());

  it('returns cutPosition when no cards drawn', () => {
    const s = build8DeckShoe();
    expect(cardsToCut(s)).toBe(s.cutPosition);
  });

  it('counts down as cards are drawn', () => {
    let s = build8DeckShoe();
    const initial = cardsToCut(s);
    for (let i = 0; i < 5; i++) s = drawFromShoe(s).shoe;
    expect(cardsToCut(s)).toBe(initial - 5);
  });

  it('goes negative once cut is crossed', () => {
    let s = build8DeckShoe();
    while (s.initialSize - s.cards.length < s.cutPosition + 3) {
      s = drawFromShoe(s).shoe;
    }
    expect(cardsToCut(s)).toBe(-3);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/shoe.test.ts
```

Expected: PASS. If `seedRng` / `clearSeed` don't exist exactly as named, adjust the import to match `src/systems/rng.ts` (Phase 4 Roulette tests use a seeded RNG; copy their pattern).

- [ ] **Step 6: Commit**

```bash
git add src/games/baccarat/shoe.ts src/games/baccarat/shoe.test.ts
git commit -m "feat(baccarat): persistent 8-deck shoe with cut card (ADR-0037)"
```

## Task B.2: Write the XState v5 machine skeleton

**Files:**

- Create: `src/games/baccarat/machine.ts`

This task lands the machine STRUCTURE (states, events, context, transitions) with the heavy logic stubbed. Subsequent tasks fill in the actions.

- [ ] **Step 1: Write `src/games/baccarat/machine.ts`**

```ts
import { assign, setup } from 'xstate';
import type { Card } from '@/games/blackjack/types';
import type { BetZoneKey, Bets, RoundResult, ShoeState } from './types';
import { EMPTY_BETS } from './types';
import {
  build8DeckShoe,
  drawFromShoe,
  markCutIfPassed,
  shouldReshuffleBeforeNextRound,
} from './shoe';
import {
  bankerDrawsThird,
  cardValue,
  isPair,
  makeHand,
  playerDrawsThird,
  resolveRound,
} from './logic';

export interface Ctx {
  bets: Bets;
  shoe: ShoeState;
  playerCards: Card[];
  bankerCards: Card[];
  roundResult: RoundResult | null;
  roundCount: number;
  /** When true, the upcoming round will start with a fresh shoe banner. */
  freshShoeBanner: boolean;
  /** When true, suppress all card-reveal animations (machine resolves dealing instantly). */
  reducedMotion: boolean;
}

export type Event =
  /** Player toggled chips on the felt. */
  | { type: 'PLACE_CHIP'; zone: BetZoneKey; amount: number }
  /** Player removed chips from a zone. */
  | { type: 'CLEAR_ZONE'; zone: BetZoneKey }
  /** Player clicked CLEAR ALL. */
  | { type: 'CLEAR_ALL' }
  /** Player clicked DEAL. */
  | { type: 'DEAL' }
  /** Reveal animation for a card finished (one event per card). */
  | { type: 'REVEAL_DONE' }
  /** Win-banner display timeout fired. */
  | { type: 'BANNER_DONE' };

export interface MachineInput {
  reducedMotion?: boolean;
}

export const baccaratMachine = setup({
  types: {
    context: {} as Ctx,
    events: {} as Event,
    input: {} as MachineInput,
  },
  actions: {
    placeChip: assign(({ context, event }) => {
      if (event.type !== 'PLACE_CHIP') return {};
      const cur = context.bets[event.zone];
      return { bets: { ...context.bets, [event.zone]: cur + event.amount } };
    }),
    clearZone: assign(({ context, event }) => {
      if (event.type !== 'CLEAR_ZONE') return {};
      return { bets: { ...context.bets, [event.zone]: 0 } };
    }),
    clearAll: assign({ bets: () => ({ ...EMPTY_BETS }) }),
    reshuffleIfNeeded: assign(({ context }) => {
      if (shouldReshuffleBeforeNextRound(context.shoe)) {
        return { shoe: build8DeckShoe(), freshShoeBanner: true };
      }
      return { freshShoeBanner: false };
    }),
    dealInitialFour: assign(({ context }) => {
      let s = context.shoe;
      const player: Card[] = [];
      const banker: Card[] = [];
      // Order: P1, B1, P2, B2.
      ({ card: player[0], shoe: s } = drawWithRequiredCard(s));
      ({ card: banker[0], shoe: s } = drawWithRequiredCard(s));
      ({ card: player[1], shoe: s } = drawWithRequiredCard(s));
      ({ card: banker[1], shoe: s } = drawWithRequiredCard(s));
      return { shoe: s, playerCards: player, bankerCards: banker };
    }),
    dealPlayerThird: assign(({ context }) => {
      const { card, shoe } = drawFromShoe(context.shoe);
      return { shoe, playerCards: [...context.playerCards, card] };
    }),
    dealBankerThird: assign(({ context }) => {
      const { card, shoe } = drawFromShoe(context.shoe);
      return { shoe, bankerCards: [...context.bankerCards, card] };
    }),
    settleRound: assign(({ context }) => {
      const result = resolveRound(context.playerCards, context.bankerCards);
      // Mark cut now that the round's cards have all been drawn.
      const newShoe = markCutIfPassed(context.shoe);
      return { roundResult: result, shoe: newShoe };
    }),
    resetForNextRound: assign(({ context }) => ({
      playerCards: [],
      bankerCards: [],
      roundResult: null,
      roundCount: context.roundCount + 1,
    })),
    clearLosingBets: assign(({ context }) => {
      if (!context.roundResult) return {};
      const r = context.roundResult;
      const next: Bets = { ...context.bets };
      // Each zone independent: zero out the ones that lost. Push (Player/Banker on tie) keeps the chip.
      next.player = r.winner === 'banker' ? 0 : next.player;
      next.banker = r.winner === 'player' ? 0 : next.banker;
      next.tie = r.winner === 'tie' ? next.tie : 0;
      next.playerPair = r.playerPair ? next.playerPair : 0;
      next.bankerPair = r.bankerPair ? next.bankerPair : 0;
      next.big = r.totalCards === 5 || r.totalCards === 6 ? next.big : 0;
      next.small = r.totalCards === 4 ? next.small : 0;
      // Dragon: keep stake if it won OR pushed; clear otherwise.
      next.playerDragon = dragonKept('player', r) ? next.playerDragon : 0;
      next.bankerDragon = dragonKept('banker', r) ? next.bankerDragon : 0;
      return { bets: next };
    }),
  },
  guards: {
    hasAnyBet: ({ context }) => totalBet(context.bets) > 0,
    isNatural: ({ context }) =>
      makeHand(context.playerCards).total >= 8 || makeHand(context.bankerCards).total >= 8,
    playerWillDraw: ({ context }) =>
      playerDrawsThird(makeHand(context.playerCards).total as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7),
    bankerWillDraw: ({ context }) => {
      const bTotal = makeHand(context.bankerCards).total;
      if (bTotal === 8 || bTotal === 9) return false;
      const playerThird =
        context.playerCards.length === 3 ? cardValue(context.playerCards[2]!) : null;
      return bankerDrawsThird(bTotal as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, playerThird);
    },
  },
  delays: {
    bannerDisplay: 2000,
  },
}).createMachine({
  id: 'baccarat',
  context: ({ input }) => ({
    bets: { ...EMPTY_BETS },
    shoe: build8DeckShoe(),
    playerCards: [],
    bankerCards: [],
    roundResult: null,
    roundCount: 0,
    freshShoeBanner: false,
    reducedMotion: input?.reducedMotion === true,
  }),
  initial: 'betting',
  states: {
    betting: {
      on: {
        PLACE_CHIP: { actions: 'placeChip' },
        CLEAR_ZONE: { actions: 'clearZone' },
        CLEAR_ALL: { actions: 'clearAll' },
        DEAL: {
          guard: 'hasAnyBet',
          target: 'preDealReshuffle',
        },
      },
    },
    preDealReshuffle: {
      entry: 'reshuffleIfNeeded',
      always: { target: 'dealing' },
    },
    dealing: {
      entry: 'dealInitialFour',
      always: [{ guard: 'isNatural', target: 'settling' }, { target: 'playerThird' }],
    },
    playerThird: {
      always: [
        { guard: 'playerWillDraw', actions: 'dealPlayerThird', target: 'bankerThird' },
        { target: 'bankerThird' },
      ],
    },
    bankerThird: {
      always: [
        { guard: 'bankerWillDraw', actions: 'dealBankerThird', target: 'settling' },
        { target: 'settling' },
      ],
    },
    settling: {
      entry: ['settleRound', 'clearLosingBets'],
      always: { target: 'showingResult' },
    },
    showingResult: {
      after: {
        bannerDisplay: { target: 'betting', actions: 'resetForNextRound' },
      },
    },
  },
});

// ----- helpers -----

function totalBet(bets: Bets): number {
  return Object.values(bets).reduce((s, n) => s + n, 0);
}

function drawWithRequiredCard(shoe: ShoeState): { card: Card; shoe: ShoeState } {
  const { card, shoe: rest } = drawFromShoe(shoe);
  return { card, shoe: rest };
}

function dragonKept(side: 'player' | 'banker', r: RoundResult): boolean {
  if (r.bothNatural && r.winner === 'tie') return true; // push
  if (r.winner === 'tie') return false;
  return r.winner === side;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0. If the XState type imports need adjustment (the project pin is XState 5.x — match the patterns from `src/games/roulette/machine.ts` and `src/games/slots/machine.ts`), copy their `setup` / `createMachine` shape.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/machine.ts
git commit -m "feat(baccarat): XState round machine — naturals, third cards, settling, banner"
```

## Task B.3: Reduced-motion path through the machine

**Files:**

- Modify: `src/games/baccarat/machine.ts`

The current machine plays out states instantly because each card draw is synchronous and there are no `after:` waits except for the banner. The UI layer is what will animate. But for tests, reducedMotion = true should also shorten the banner display so test rounds complete quickly.

- [ ] **Step 1: Adjust the bannerDisplay delay to be conditional**

Replace the `delays:` block:

```ts
  delays: {
    bannerDisplay: ({ context }) => (context.reducedMotion ? 0 : 2000),
  },
```

(Verify the XState 5 syntax: `delays:` entries can be a function `({ context }) => number`. Match the Phase 4 / Phase 5 pattern.)

- [ ] **Step 2: Commit**

```bash
git add src/games/baccarat/machine.ts
git commit -m "feat(baccarat): collapse banner delay under reduced motion"
```

## Task B.4: Machine tests — happy paths

**Files:**

- Create: `src/games/baccarat/machine.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { baccaratMachine } from './machine';
import { seedRng, clearSeed } from '@/systems/rng';

function startMachine(reducedMotion = true) {
  const actor = createActor(baccaratMachine, { input: { reducedMotion } });
  actor.start();
  return actor;
}

beforeEach(() => seedRng(424242));
afterEach(() => clearSeed());

describe('baccaratMachine — happy paths', () => {
  it('starts in betting with no bets', () => {
    const actor = startMachine();
    const snap = actor.getSnapshot();
    expect(snap.matches('betting')).toBe(true);
    expect(snap.context.bets.player).toBe(0);
    expect(snap.context.roundCount).toBe(0);
  });

  it('PLACE_CHIP accumulates on a zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 50 });
    expect(actor.getSnapshot().context.bets.player).toBe(75);
  });

  it('CLEAR_ZONE zeros a single zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'CLEAR_ZONE', zone: 'player' });
    expect(actor.getSnapshot().context.bets.player).toBe(0);
  });

  it('CLEAR_ALL zeros every zone', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'PLACE_CHIP', zone: 'tie', amount: 10 });
    actor.send({ type: 'CLEAR_ALL' });
    const b = actor.getSnapshot().context.bets;
    expect(b.player).toBe(0);
    expect(b.tie).toBe(0);
  });

  it('DEAL with no bets is rejected (hasAnyBet guard)', () => {
    const actor = startMachine();
    actor.send({ type: 'DEAL' });
    expect(actor.getSnapshot().matches('betting')).toBe(true);
  });

  it('DEAL with a bet runs a full round and returns to betting (reducedMotion=true)', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 25 });
    actor.send({ type: 'DEAL' });
    // bannerDisplay = 0 under reduced motion → microtasks settle quickly.
    await new Promise((r) => setTimeout(r, 20));
    const snap = actor.getSnapshot();
    expect(snap.matches('betting')).toBe(true);
    expect(snap.context.roundResult).not.toBeNull();
    expect(snap.context.roundCount).toBe(1);
  });

  it('settled round writes a non-null roundResult into context', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'tie', amount: 10 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const r = actor.getSnapshot().context.roundResult;
    expect(r).not.toBeNull();
    expect(['player', 'banker', 'tie']).toContain(r!.winner);
  });

  it('shoe cards count drops by exactly 4–6 per round', async () => {
    const actor = startMachine(true);
    const before = actor.getSnapshot().context.shoe.cards.length;
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const after = actor.getSnapshot().context.shoe.cards.length;
    const drawn = before - after;
    expect(drawn).toBeGreaterThanOrEqual(4);
    expect(drawn).toBeLessThanOrEqual(6);
  });
});

describe('baccaratMachine — reshuffle on cut card', () => {
  it('marks cutCardPassed once the shoe crosses the cut', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    // Burn down the shoe by running many rounds. Stop when cutCardPassed flips.
    let safety = 200;
    while (!actor.getSnapshot().context.shoe.cutCardPassed && safety-- > 0) {
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      // Re-place the chip (clearLosingBets may have removed it if we lost).
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    }
    expect(actor.getSnapshot().context.shoe.cutCardPassed).toBe(true);
  });

  it('reshuffles on the NEXT round after cut is crossed and shows freshShoeBanner', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    let safety = 200;
    while (!actor.getSnapshot().context.shoe.cutCardPassed && safety-- > 0) {
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    }
    const sizeAfterCutRound = actor.getSnapshot().context.shoe.cards.length;
    expect(sizeAfterCutRound).toBeLessThan(60); // somewhere near the bottom
    // Trigger the next round.
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const snap = actor.getSnapshot();
    expect(snap.context.shoe.initialSize).toBe(416);
    // Fresh shoe should have ~410-412 cards left (just dealt the round).
    expect(snap.context.shoe.cards.length).toBeGreaterThan(400);
    expect(snap.context.freshShoeBanner).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/machine.test.ts
```

Expected: PASS. If the reshuffle test times out, increase `safety` or the inter-round wait.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/machine.test.ts
git commit -m "test(baccarat): machine — happy paths, cut card, reshuffle on next round"
```

## Task B.5: Machine tests — naturals and third-card branches

**Files:**

- Modify: `src/games/baccarat/machine.test.ts`

We want to assert that the machine takes the right state path under naturals and under third-card draws. Easiest way is to seed the RNG to a value that produces a known dealing sequence, OR mock-draw cards. Since this is finicky with seeded RNG, use a state-snapshot inspection approach: assert that after settle, `totalCards` is the expected value.

- [ ] **Step 1: Append to `src/games/baccarat/machine.test.ts`**

```ts
import { handTotal } from './logic';

describe('baccaratMachine — natural and third-card paths', () => {
  it('when both 2-card hands are non-natural, totalCards lands on 4, 5, or 6', async () => {
    const actor = startMachine(true);
    actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
    actor.send({ type: 'DEAL' });
    await new Promise((r) => setTimeout(r, 20));
    const r = actor.getSnapshot().context.roundResult!;
    expect([4, 5, 6]).toContain(r.totalCards);
  });

  it('when winner is natural, exactly 4 cards are dealt', async () => {
    // Run many rounds; some will end in a 2-card natural. Assert that all such rounds have totalCards=4.
    let foundNatural = false;
    let safety = 80;
    while (!foundNatural && safety-- > 0) {
      const actor = startMachine(true);
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      const r = actor.getSnapshot().context.roundResult!;
      if (r.winnerNatural) {
        expect(r.totalCards).toBe(4);
        foundNatural = true;
      }
    }
    expect(foundNatural).toBe(true); // sanity: we did encounter at least one in 80 attempts
  });

  it('player 6/7 → player stands → totalCards ∈ {4, 5}', async () => {
    let foundPlayerStand = false;
    let safety = 80;
    while (!foundPlayerStand && safety-- > 0) {
      const actor = startMachine(true);
      actor.send({ type: 'PLACE_CHIP', zone: 'player', amount: 5 });
      actor.send({ type: 'DEAL' });
      await new Promise((r) => setTimeout(r, 5));
      const r = actor.getSnapshot().context.roundResult!;
      const playerInitialTotal = handTotal(r.player.cards.slice(0, 2));
      if ((playerInitialTotal === 6 || playerInitialTotal === 7) && r.player.cards.length === 2) {
        // Player stood. Banker might still have drawn → totalCards is 4 or 5.
        expect([4, 5]).toContain(r.totalCards);
        foundPlayerStand = true;
      }
    }
    expect(foundPlayerStand).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/machine.test.ts
```

Expected: PASS. The "find a natural in 80 rounds" assertion has the same low-flake risk as similar tests in Phase 5; if it ever flakes, raise `safety` to 200.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/machine.test.ts
git commit -m "test(baccarat): machine — natural and third-card branch invariants"
```

## Task B.6: PR B — DoD, push, open, merge

- [ ] **Step 1: Run full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~830 tests passing (~30 more than after PR A).

- [ ] **Step 2: Push, open PR, watch CI, merge**

```bash
git push -u origin phase-6-baccarat-pr-b-shoe-machine
gh pr create --title "phase-6(baccarat): PR B — persistent shoe + XState round machine" --body "$(cat <<'EOF'
## Summary

PR B of Phase 6. Wires the shoe and the round machine on top of PR A's pure logic.

- shoe.ts — build8DeckShoe, drawFromShoe, markCutIfPassed, shouldReshuffleBeforeNextRound, cardsToCut
- machine.ts — XState v5 machine: betting → dealing → (player third?) → (banker third?) → settling → showingResult → betting. Banner delay collapses under reducedMotion. Reshuffle happens at the start of the round AFTER the cut card was crossed.
- machine.test.ts — happy paths + cut-card invariant + reshuffle + natural/third-card branch invariants. ~17 tests.

Plan reference: docs/superpowers/plans/2026-05-18-phase-6-baccarat-plan.md — PR B, tasks B.1–B.6.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~30 new tests passing
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged (PR B).

---

# PR C — Card area (CardReveal + HandView)

**Branch:** `phase-6-baccarat-pr-c-card-area` (off freshly-merged `main`)
**Goal of this PR:** Ship the visual card-reveal layer. `CardReveal.tsx` wraps Phase 3's `<Card>` component with a slide-in → corner-peek → flip animation sequence. `HandView.tsx` is the Player/Banker container with the running total. A small `DealingDemo.tsx` (not routed) lets a developer eyeball the animation in `pnpm dev` if they manually navigate to it.
**Risk:** Medium. Animations are timing-sensitive; reduced-motion fallback must be honored throughout. Tests use Framer Motion's `MotionConfig` to skip animations.
**Estimated tasks:** 6.

## Task C.1: Branch + `CardReveal.tsx`

**Files:**

- Create: `src/games/baccarat/CardReveal.tsx`

The component reuses Phase 3's `<Card>` for the actual visual (face + back) and adds the reveal animation as an overlay.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-6-baccarat-pr-c-card-area
```

- [ ] **Step 2: Write `src/games/baccarat/CardReveal.tsx`**

```tsx
import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Card from '@/games/blackjack/Card';
import type { Card as CardType } from '@/games/blackjack/types';
import { REVEAL_TIMING } from './config';

interface Props {
  /** The card to reveal. When null, renders an empty card-sized slot. */
  card: CardType | null;
  /** True once the card should be face-up. Until true, shows the back of the card. */
  revealed: boolean;
  /** Delay before the slide-in starts. ms. */
  delayMs?: number;
  /** Called when the reveal animation finishes (after slide-in + peek + flip). */
  onRevealDone?: () => void;
}

/**
 * Theatrical card reveal: slide-in → corner peek → flip → settled face-up.
 *
 * Phase 6 spec §7.2: total ~600ms per card with sub-timings from REVEAL_TIMING.
 * Reduced-motion fallback: the card appears already face-up at its final position,
 * onRevealDone fires immediately.
 */
export default function CardReveal({
  card,
  revealed,
  delayMs = 0,
  onRevealDone,
}: Props): JSX.Element {
  const reducedMotion = useReducedMotion() ?? false;

  if (reducedMotion) {
    // Fire onRevealDone on the next tick so the parent can stage the next card.
    if (revealed && onRevealDone) {
      queueMicrotask(onRevealDone);
    }
    return (
      <div className="inline-block">
        <Card card={card} faceDown={!revealed} />
      </div>
    );
  }

  if (card === null) {
    return <div className="inline-block w-[80px] h-[112px]" aria-hidden />;
  }

  const totalMs =
    REVEAL_TIMING.cardSlideIn +
    REVEAL_TIMING.cornerPeek +
    REVEAL_TIMING.flip +
    REVEAL_TIMING.pauseBetweenCards;

  return (
    <motion.div
      key={`${card.rank}-${card.suit}-${revealed}`}
      className="inline-block"
      initial={{ x: -40, opacity: 0, rotate: -8 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{
        delay: delayMs / 1000,
        duration: REVEAL_TIMING.cardSlideIn / 1000,
        ease: 'easeOut',
      }}
      onAnimationComplete={() => {
        // After the slide-in, schedule the flip + then the onRevealDone callback.
        if (!revealed) return;
        const peekMs =
          REVEAL_TIMING.cornerPeek + REVEAL_TIMING.flip + REVEAL_TIMING.pauseBetweenCards;
        setTimeout(() => onRevealDone?.(), peekMs);
      }}
    >
      <FlipInner card={card} revealed={revealed} totalMs={totalMs} />
    </motion.div>
  );
}

function FlipInner({
  card,
  revealed,
  totalMs,
}: {
  card: CardType;
  revealed: boolean;
  totalMs: number;
}): JSX.Element {
  // Use a 3D rotation on the inner container for the flip.
  // The "corner peek" is a small Y-rotation before the full flip — implemented
  // as a 2-keyframe sequence on rotateY.
  return (
    <motion.div
      style={{ perspective: 600 }}
      initial={{ rotateY: 180 }}
      animate={{
        rotateY: revealed ? [180, 160, 0] : 180,
      }}
      transition={{
        rotateY: {
          times: [0, 0.3, 1],
          duration: (REVEAL_TIMING.cornerPeek + REVEAL_TIMING.flip) / 1000,
          ease: 'easeOut',
          delay: REVEAL_TIMING.cardSlideIn / 1000,
        },
      }}
    >
      {/* The "back" face stays visible during rotateY=180→0; the "front" face is the Card component which renders face-down at >90°. We re-use Phase 3's Card by toggling faceDown manually based on rotateY threshold; the simplest is to render two copies and rely on backfaceVisibility. */}
      <div style={{ backfaceVisibility: 'hidden' }}>
        <Card card={card} faceDown={false} />
      </div>
    </motion.div>
  );
}
```

Note: the exact flip mechanics depend on how Phase 3's `Card` is built; if its DOM doesn't support clean 3D backface logic, a simpler implementation is to swap from `<Card faceDown={true}>` to `<Card faceDown={false}>` after `cornerPeek + flip / 2` ms — the visual hack of "card spins, you don't notice the swap mid-rotation". Implementer may use either approach.

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/games/baccarat/CardReveal.tsx
git commit -m "feat(baccarat): CardReveal — slide-in + corner-peek + flip animation"
```

## Task C.2: `CardReveal.test.tsx`

**Files:**

- Create: `src/games/baccarat/CardReveal.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import CardReveal from './CardReveal';
import type { Card } from '@/games/blackjack/types';

const SEVEN_SPADES: Card = { rank: '7', suit: '♠', faceUp: true };

describe('CardReveal — reduced-motion path', () => {
  it('renders the card face-up immediately when revealed=true under reducedMotion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <CardReveal card={SEVEN_SPADES} revealed={true} />
      </MotionConfig>,
    );
    // Phase 3's Card renders rank text; assert it's in the document.
    expect(screen.queryByText('7')).toBeInTheDocument();
  });

  it('renders the back when revealed=false under reducedMotion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <CardReveal card={SEVEN_SPADES} revealed={false} />
      </MotionConfig>,
    );
    // The back of the card should not render the rank '7' as primary text.
    // Adjust this test to whatever Phase 3's CardBack actually renders.
    // Safe assertion: the document does not show the face-up rank as a large element.
    // (If Phase 3's CardBack contains a '7' for some reason, switch to checking for a 'card-back' class or test ID.)
    const sevens = screen.queryAllByText('7');
    expect(sevens.length).toBe(0);
  });

  it('calls onRevealDone synchronously (queueMicrotask) under reducedMotion when revealed', async () => {
    const cb = vi.fn();
    render(
      <MotionConfig reducedMotion="always">
        <CardReveal card={SEVEN_SPADES} revealed={true} onRevealDone={cb} />
      </MotionConfig>,
    );
    await new Promise((r) => setTimeout(r, 5));
    expect(cb).toHaveBeenCalled();
  });

  it('renders an empty slot when card is null', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <CardReveal card={null} revealed={false} />
      </MotionConfig>,
    );
    // The empty slot is a div with explicit dimensions; assert it's in the DOM.
    expect(container.querySelector('div[aria-hidden="true"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/CardReveal.test.tsx
```

Expected: PASS. If the rank-7 assertion fails because Phase 3's `<Card>` renders the rank as part of a more complex template (e.g., uses an SVG pip layout), switch to checking for the `data-rank="7"` attribute or whatever the Phase 3 Card surfaces. Read `src/games/blackjack/Card.tsx` to confirm.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/CardReveal.test.tsx
git commit -m "test(baccarat): CardReveal — reduced-motion and onRevealDone callback"
```

## Task C.3: `HandView.tsx`

**Files:**

- Create: `src/games/baccarat/HandView.tsx`

Container for Player or Banker — title, running total, up to 3 `CardReveal` slots.

- [ ] **Step 1: Write `src/games/baccarat/HandView.tsx`**

```tsx
import type { JSX } from 'react';
import CardReveal from './CardReveal';
import { handTotal } from './logic';
import type { Card } from '@/games/blackjack/types';
import { REVEAL_TIMING } from './config';

interface Props {
  /** "PLAYER" or "BANKER". */
  label: 'PLAYER' | 'BANKER';
  /** Cards dealt to this hand, in dealing order. */
  cards: readonly Card[];
  /** How many of the dealt cards have been revealed so far (UI-driven). */
  revealedCount: number;
  /** When true, the hand glows gold (winning side after settle). */
  highlight?: boolean;
  /** Optional callback when a card finishes its reveal — used by the page to step revealedCount forward. */
  onCardRevealed?: (index: number) => void;
}

export default function HandView({
  label,
  cards,
  revealedCount,
  highlight = false,
  onCardRevealed,
}: Props): JSX.Element {
  // Up to 3 slots. Always render 3 to keep layout stable.
  const slots = [0, 1, 2];
  // Total is shown only for revealed cards (so the count climbs visibly).
  const visibleCards = cards.slice(0, revealedCount);
  const total = handTotal(visibleCards);
  return (
    <div
      className={[
        'flex flex-col items-center gap-2 rounded-md border px-3 py-3',
        highlight ? 'border-gold shadow-gold-glow bg-gold/5' : 'border-white/15 bg-white/[0.03]',
      ].join(' ')}
      data-baccarat-hand={label.toLowerCase()}
    >
      <div className="flex items-center gap-3 font-display text-xs tracking-[0.2em] text-gold">
        <span>{label}</span>
        <span className="text-white/80">·</span>
        <span className="tabular-nums text-white">{total}</span>
      </div>
      <div className="flex gap-2">
        {slots.map((i) => {
          const c = cards[i] ?? null;
          const isThird = i === 2;
          const baseDelay =
            i === 0
              ? 0
              : i === 1
                ? REVEAL_TIMING.pauseBetweenCards + REVEAL_TIMING.cardSlideIn
                : REVEAL_TIMING.pauseBeforeThirdCard;
          return (
            <CardReveal
              key={i}
              card={c}
              revealed={i < revealedCount}
              delayMs={baseDelay}
              onRevealDone={() => onCardRevealed?.(i)}
            />
          );
        })}
      </div>
      {revealedCount < cards.length && (
        <div className="text-xs uppercase tracking-wider text-gold/70">DRAW</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/games/baccarat/HandView.tsx
git commit -m "feat(baccarat): HandView — Player/Banker container with running total + DRAW pill"
```

## Task C.4: `HandView.test.tsx`

**Files:**

- Create: `src/games/baccarat/HandView.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import HandView from './HandView';
import type { Card } from '@/games/blackjack/types';

const cards: Card[] = [
  { rank: '3', suit: '♠', faceUp: true },
  { rank: '4', suit: '♥', faceUp: true },
];

function render_(node: React.ReactNode) {
  return render(<MotionConfig reducedMotion="always">{node}</MotionConfig>);
}

describe('HandView', () => {
  it('renders the label and running total of revealed cards', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={2} />);
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    // 3 + 4 = 7 → total 7
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('total only counts revealed cards', () => {
    render_(<HandView label="BANKER" cards={cards} revealedCount={1} />);
    // Only card[0] = 3 revealed → total 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // The 7 should NOT appear yet.
    expect(screen.queryByText('7')).toBeNull();
  });

  it('shows the DRAW pill when revealedCount < cards.length', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={1} />);
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
  });

  it('hides the DRAW pill when all cards are revealed', () => {
    render_(<HandView label="PLAYER" cards={cards} revealedCount={2} />);
    expect(screen.queryByText(/draw/i)).toBeNull();
  });

  it('applies highlight styling when highlight=true', () => {
    const { container } = render_(
      <HandView label="PLAYER" cards={cards} revealedCount={2} highlight />,
    );
    expect(container.querySelector('.border-gold')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/HandView.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/HandView.test.tsx
git commit -m "test(baccarat): HandView — label, total counts only revealed cards, DRAW pill, highlight"
```

## Task C.5: `DealingDemo.tsx` (dev-only, not routed)

**Files:**

- Create: `src/games/baccarat/DealingDemo.tsx`

A tiny stand-alone page that the implementer can mount via a temporary route during PR C work to eyeball the animation. Will not be wired into the router — exists for QA / future reference.

- [ ] **Step 1: Write the file**

```tsx
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import HandView from './HandView';
import type { Card } from '@/games/blackjack/types';

const SAMPLE_PLAYER: Card[] = [
  { rank: '9', suit: '♣', faceUp: true },
  { rank: '7', suit: '♦', faceUp: true },
  { rank: '4', suit: '♥', faceUp: true },
];

const SAMPLE_BANKER: Card[] = [
  { rank: 'K', suit: '♠', faceUp: true },
  { rank: '5', suit: '♥', faceUp: true },
];

/**
 * Dev-only static page to eyeball the dealing animation. NOT routed.
 * To use temporarily, add `{ path: 'dev/baccarat-dealing', element: <DealingDemo /> }`
 * to the router in a local branch.
 */
export default function DealingDemo(): JSX.Element {
  const [playerRevealed, setPlayerRevealed] = useState(0);
  const [bankerRevealed, setBankerRevealed] = useState(0);

  useEffect(() => {
    // Stagger: P1, B1, P2, B2, P3, then last banker.
    const steps = [
      () => setPlayerRevealed(1),
      () => setBankerRevealed(1),
      () => setPlayerRevealed(2),
      () => setBankerRevealed(2),
      () => setPlayerRevealed(3),
    ];
    steps.forEach((s, i) => setTimeout(s, 600 * (i + 1)));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center gap-12 bg-felt-deep p-12">
      <HandView label="PLAYER" cards={SAMPLE_PLAYER} revealedCount={playerRevealed} />
      <HandView label="BANKER" cards={SAMPLE_BANKER} revealedCount={bankerRevealed} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/games/baccarat/DealingDemo.tsx
git commit -m "feat(baccarat): DealingDemo — dev-only static page exercising reveal animation"
```

## Task C.6: PR C — DoD, push, open, merge

- [ ] **Step 1: Run full DoD + manual smoke (optional but recommended)**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0.

To eyeball the animation: temporarily add `{ path: 'dev/baccarat-dealing', element: <DealingDemo /> }` to the router (inside the authenticated routes, but skip Suspense), run `pnpm dev`, navigate to `/dev/baccarat-dealing`, watch one round play out. Revert the router change before committing.

- [ ] **Step 2: Push, open PR, watch CI, merge**

```bash
git push -u origin phase-6-baccarat-pr-c-card-area
gh pr create --title "phase-6(baccarat): PR C — CardReveal + HandView + dealing animation" --body "$(cat <<'EOF'
## Summary

PR C of Phase 6. The visual card-reveal layer.

- CardReveal — slide-in + corner-peek + flip, ~600ms/card, reduced-motion fallback fires onRevealDone synchronously
- HandView — Player/Banker container with running total computed from revealedCount; DRAW pill when more cards to reveal
- DealingDemo — dev-only static page (not routed) for visual QA

Reuses Phase 3's <Card> component for the card visual itself.

Plan reference: docs/superpowers/plans/2026-05-18-phase-6-baccarat-plan.md — PR C, tasks C.1–C.6.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~9 new tests passing (CardReveal x4, HandView x5)
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged (PR C).

---

# PR D — Bet area (BetZone, BigSmallZone, BetArea, ShoeIndicator)

**Branch:** `phase-6-baccarat-pr-d-bet-area` (off freshly-merged `main`)
**Goal of this PR:** Ship the chip-placement layer — every clickable bet zone in the table layout. Pure presentational components driven by `bets` state passed in by the parent (will be wired to the machine in PR E). The `ShoeIndicator` shows "125 cards · cut in 12" / "CUT — reshuffling next round" / "FRESH SHOE".
**Risk:** Low-medium. Lots of small components; the table layout (spec §8) has specific positioning that needs to look right.
**Estimated tasks:** 6.

## Task D.1: Branch + `BetZone.tsx`

**Files:**

- Create: `src/games/baccarat/BetZone.tsx`

Generic single-zone primitive: title, payout label, chip-stack overlay showing current bet, click handler.

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-6-baccarat-pr-d-bet-area
```

- [ ] **Step 2: Write `src/games/baccarat/BetZone.tsx`**

```tsx
import type { JSX } from 'react';
import { motion } from 'framer-motion';

interface Props {
  /** Zone label, e.g. "PLAYER". */
  label: string;
  /** Payout text, e.g. "1 : 1". */
  payoutText: string;
  /** Current chip amount on this zone. */
  amount: number;
  /** Theme variant. */
  variant?: 'main' | 'tie' | 'side';
  /** Called when the player clicks the zone to add a chip. */
  onAddChip: () => void;
  /** Called when the player right-clicks (or long-presses) to clear the zone. */
  onClear: () => void;
  /** Disabled when machine is not in 'betting' state. */
  disabled?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  main: 'border-gold/70 bg-gold/15',
  tie: 'border-chip-win/70 bg-chip-win/15',
  side: 'border-white/20 bg-black/30',
};

export default function BetZone({
  label,
  payoutText,
  amount,
  variant = 'main',
  onAddChip,
  onClear,
  disabled = false,
}: Props): JSX.Element {
  return (
    <button
      type="button"
      data-zone-label={label}
      data-zone-amount={amount}
      disabled={disabled}
      onClick={onAddChip}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      className={[
        'relative flex h-full w-full flex-col items-center justify-center rounded border-2 p-2 transition',
        VARIANT_CLASSES[variant],
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125',
      ].join(' ')}
    >
      <span className="font-display text-[11px] tracking-[0.18em] text-white">{label}</span>
      <span className="mt-0.5 text-[10px] text-white/60">{payoutText}</span>
      {amount > 0 && (
        <motion.span
          key={amount}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-2 rounded-full bg-felt-deep px-3 py-1 font-display text-sm text-gold border border-gold/70 shadow-gold-glow"
          aria-label={`Current bet: ${amount} chips`}
        >
          {amount}
        </motion.span>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/BetZone.tsx
git commit -m "feat(baccarat): BetZone — generic clickable zone with chip overlay"
```

## Task D.2: `BetZone.test.tsx`

**Files:**

- Create: `src/games/baccarat/BetZone.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import BetZone from './BetZone';

function render_(node: React.ReactNode) {
  return render(<MotionConfig reducedMotion="always">{node}</MotionConfig>);
}

describe('BetZone', () => {
  it('renders label and payout text', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={0}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    expect(screen.getByText('1 : 1')).toBeInTheDocument();
  });

  it('hides the chip overlay when amount is 0', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={0}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/current bet/i)).toBeNull();
  });

  it('shows the chip overlay with amount when amount > 0', () => {
    render_(
      <BetZone
        label="PLAYER"
        payoutText="1 : 1"
        amount={75}
        onAddChip={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByLabelText(/current bet: 75 chips/i)).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('calls onAddChip on click', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(
      <BetZone label="P" payoutText="x" amount={0} onAddChip={onAddChip} onClear={() => {}} />,
    );
    await user.click(screen.getByRole('button'));
    expect(onAddChip).toHaveBeenCalledTimes(1);
  });

  it('calls onClear on right-click (contextmenu)', () => {
    const onClear = vi.fn();
    render_(
      <BetZone label="P" payoutText="x" amount={10} onAddChip={() => {}} onClear={onClear} />,
    );
    const btn = screen.getByRole('button');
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(onClear).toHaveBeenCalled();
  });

  it('disabled blocks click', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(
      <BetZone
        label="P"
        payoutText="x"
        amount={0}
        onAddChip={onAddChip}
        onClear={() => {}}
        disabled
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onAddChip).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec vitest run src/games/baccarat/BetZone.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/BetZone.test.tsx
git commit -m "test(baccarat): BetZone — label, chip overlay, click/contextmenu/disabled"
```

## Task D.3: `BigSmallZone.tsx` + tests

**Files:**

- Create: `src/games/baccarat/BigSmallZone.tsx`
- Create: `src/games/baccarat/BigSmallZone.test.tsx`

Special split-half zone: clicking left = Small, clicking right = Big.

- [ ] **Step 1: Write `src/games/baccarat/BigSmallZone.tsx`**

```tsx
import type { JSX } from 'react';
import { motion } from 'framer-motion';

interface Props {
  smallAmount: number;
  bigAmount: number;
  disabled?: boolean;
  onAddSmall: () => void;
  onAddBig: () => void;
  onClearSmall: () => void;
  onClearBig: () => void;
}

export default function BigSmallZone({
  smallAmount,
  bigAmount,
  disabled = false,
  onAddSmall,
  onAddBig,
  onClearSmall,
  onClearBig,
}: Props): JSX.Element {
  return (
    <div className="flex h-full w-full rounded border-2 border-white/20 bg-black/30 overflow-hidden">
      <Half
        side="left"
        label="SMALL"
        payoutText="1.5 : 1"
        amount={smallAmount}
        onAdd={onAddSmall}
        onClear={onClearSmall}
        disabled={disabled}
      />
      <div className="w-px bg-white/15" />
      <Half
        side="right"
        label="BIG"
        payoutText="0.54 : 1"
        amount={bigAmount}
        onAdd={onAddBig}
        onClear={onClearBig}
        disabled={disabled}
      />
    </div>
  );
}

function Half({
  side,
  label,
  payoutText,
  amount,
  onAdd,
  onClear,
  disabled,
}: {
  side: 'left' | 'right';
  label: string;
  payoutText: string;
  amount: number;
  onAdd: () => void;
  onClear: () => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      data-bigsmall-half={side}
      data-zone-amount={amount}
      disabled={disabled}
      onClick={onAdd}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      className={[
        'relative flex flex-1 flex-col items-center justify-center p-2 transition',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5',
      ].join(' ')}
    >
      <span className="font-display text-[11px] tracking-[0.18em] text-white">{label}</span>
      <span className="mt-0.5 text-[10px] text-white/60">{payoutText}</span>
      {amount > 0 && (
        <motion.span
          key={amount}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-2 rounded-full bg-felt-deep px-3 py-1 font-display text-sm text-gold border border-gold/70"
        >
          {amount}
        </motion.span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Write `src/games/baccarat/BigSmallZone.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import BigSmallZone from './BigSmallZone';

function render_(node: React.ReactNode) {
  return render(<MotionConfig reducedMotion="always">{node}</MotionConfig>);
}

const NOOP = () => {};

describe('BigSmallZone', () => {
  it('renders BIG and SMALL labels', () => {
    render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={NOOP}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    expect(screen.getByText('SMALL')).toBeInTheDocument();
    expect(screen.getByText('BIG')).toBeInTheDocument();
  });

  it('clicking left half fires onAddSmall', async () => {
    const onAddSmall = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={onAddSmall}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="left"]')!);
    expect(onAddSmall).toHaveBeenCalled();
  });

  it('clicking right half fires onAddBig', async () => {
    const onAddBig = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        onAddSmall={NOOP}
        onAddBig={onAddBig}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="right"]')!);
    expect(onAddBig).toHaveBeenCalled();
  });

  it('shows chip overlays per half independently', () => {
    render_(
      <BigSmallZone
        smallAmount={10}
        bigAmount={25}
        onAddSmall={NOOP}
        onAddBig={NOOP}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('disabled blocks both halves', async () => {
    const onAddSmall = vi.fn();
    const onAddBig = vi.fn();
    const user = userEvent.setup();
    const { container } = render_(
      <BigSmallZone
        smallAmount={0}
        bigAmount={0}
        disabled
        onAddSmall={onAddSmall}
        onAddBig={onAddBig}
        onClearSmall={NOOP}
        onClearBig={NOOP}
      />,
    );
    await user.click(container.querySelector('[data-bigsmall-half="left"]')!);
    await user.click(container.querySelector('[data-bigsmall-half="right"]')!);
    expect(onAddSmall).not.toHaveBeenCalled();
    expect(onAddBig).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm exec vitest run src/games/baccarat/BigSmallZone.test.tsx
git add src/games/baccarat/BigSmallZone.tsx src/games/baccarat/BigSmallZone.test.tsx
git commit -m "feat(baccarat): BigSmallZone — split-half zone with independent click + chip overlay per side"
```

## Task D.4: `BetArea.tsx` — composes the spec §8 layout

**Files:**

- Create: `src/games/baccarat/BetArea.tsx`
- Create: `src/games/baccarat/BetArea.test.tsx`

Wires 7 single zones + 1 split BigSmallZone into the §8 layout (Pairs row above, Main row centered, Dragons below).

- [ ] **Step 1: Write `src/games/baccarat/BetArea.tsx`**

```tsx
import type { JSX } from 'react';
import BetZone from './BetZone';
import BigSmallZone from './BigSmallZone';
import { PAYOUT_LABELS } from './config';
import type { BetZoneKey, Bets } from './types';

interface Props {
  bets: Bets;
  disabled?: boolean;
  onAddChip: (zone: BetZoneKey) => void;
  onClearZone: (zone: BetZoneKey) => void;
}

export default function BetArea({
  bets,
  disabled = false,
  onAddChip,
  onClearZone,
}: Props): JSX.Element {
  const props = (zone: BetZoneKey) => ({
    label: ZONE_LABELS[zone],
    payoutText: PAYOUT_LABELS[zone],
    amount: bets[zone],
    onAddChip: () => onAddChip(zone),
    onClear: () => onClearZone(zone),
    disabled,
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Pairs + Big/Small row */}
      <div className="grid grid-cols-3 gap-2 h-[72px]">
        <BetZone {...props('playerPair')} variant="side" />
        <BigSmallZone
          smallAmount={bets.small}
          bigAmount={bets.big}
          disabled={disabled}
          onAddSmall={() => onAddChip('small')}
          onAddBig={() => onAddChip('big')}
          onClearSmall={() => onClearZone('small')}
          onClearBig={() => onClearZone('big')}
        />
        <BetZone {...props('bankerPair')} variant="side" />
      </div>

      {/* Main row */}
      <div className="grid grid-cols-3 gap-2 h-[96px]">
        <BetZone {...props('player')} variant="main" />
        <BetZone {...props('tie')} variant="tie" />
        <BetZone {...props('banker')} variant="main" />
      </div>

      {/* Dragon row */}
      <div className="grid grid-cols-2 gap-2 h-[72px]">
        <BetZone {...props('playerDragon')} variant="side" />
        <BetZone {...props('bankerDragon')} variant="side" />
      </div>
    </div>
  );
}

const ZONE_LABELS: Record<BetZoneKey, string> = {
  player: 'PLAYER',
  banker: 'BANKER',
  tie: 'TIE',
  playerPair: 'P PAIR',
  bankerPair: 'B PAIR',
  big: 'BIG',
  small: 'SMALL',
  playerDragon: 'P DRAGON',
  bankerDragon: 'B DRAGON',
};
```

- [ ] **Step 2: Write `src/games/baccarat/BetArea.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import BetArea from './BetArea';
import { EMPTY_BETS } from './types';

function render_(node: React.ReactNode) {
  return render(<MotionConfig reducedMotion="always">{node}</MotionConfig>);
}

describe('BetArea', () => {
  it('renders all 7 single zones + 2 BigSmall halves = 9 clickable areas', () => {
    render_(<BetArea bets={EMPTY_BETS} onAddChip={() => {}} onClearZone={() => {}} />);
    // 7 BetZone buttons + 2 Half buttons (inside BigSmallZone) = 9 buttons
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('shows zone labels per spec §8', () => {
    render_(<BetArea bets={EMPTY_BETS} onAddChip={() => {}} onClearZone={() => {}} />);
    for (const label of [
      'P PAIR',
      'BIG',
      'SMALL',
      'B PAIR',
      'PLAYER',
      'TIE',
      'BANKER',
      'P DRAGON',
      'B DRAGON',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('clicking PLAYER calls onAddChip with "player"', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(<BetArea bets={EMPTY_BETS} onAddChip={onAddChip} onClearZone={() => {}} />);
    await user.click(screen.getByText('PLAYER').closest('button')!);
    expect(onAddChip).toHaveBeenCalledWith('player');
  });

  it('shows chip overlay on a zone when bets[zone] > 0', () => {
    render_(
      <BetArea bets={{ ...EMPTY_BETS, banker: 75 }} onAddChip={() => {}} onClearZone={() => {}} />,
    );
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm exec vitest run src/games/baccarat/BetArea.test.tsx
git add src/games/baccarat/BetArea.tsx src/games/baccarat/BetArea.test.tsx
git commit -m "feat(baccarat): BetArea — 9-zone layout (pairs row + main row + dragons)"
```

## Task D.5: `ShoeIndicator.tsx` + tests

**Files:**

- Create: `src/games/baccarat/ShoeIndicator.tsx`
- Create: `src/games/baccarat/ShoeIndicator.test.tsx`

- [ ] **Step 1: Write `src/games/baccarat/ShoeIndicator.tsx`**

```tsx
import type { JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ShoeState } from './types';
import { cardsToCut } from './shoe';

interface Props {
  shoe: ShoeState;
  /** True only on the round that just started with a fresh shoe. */
  freshShoeBanner: boolean;
}

export default function ShoeIndicator({ shoe, freshShoeBanner }: Props): JSX.Element {
  const remaining = shoe.cards.length;
  const toCut = cardsToCut(shoe);

  return (
    <div className="flex items-center gap-2 text-xs tabular-nums text-white/70">
      <AnimatePresence mode="wait">
        {freshShoeBanner ? (
          <motion.span
            key="fresh"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="rounded bg-chip-win/20 px-2 py-0.5 font-display text-[10px] tracking-[0.2em] text-chip-win"
          >
            FRESH SHOE
          </motion.span>
        ) : shoe.cutCardPassed ? (
          <motion.span
            key="cut"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded bg-casino-red/20 px-2 py-0.5 font-display text-[10px] tracking-[0.2em] text-casino-red"
          >
            CUT — RESHUFFLING NEXT ROUND
          </motion.span>
        ) : (
          <motion.span
            key="depth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-shoe-depth
          >
            Shoe: {remaining} cards · cut in {Math.max(toCut, 0)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/games/baccarat/ShoeIndicator.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import ShoeIndicator from './ShoeIndicator';
import type { ShoeState } from './types';

function shoe(overrides: Partial<ShoeState>): ShoeState {
  return {
    cards: Array.from({ length: 416 }, () => ({
      rank: '2' as const,
      suit: '♠' as const,
      faceUp: true,
    })),
    initialSize: 416,
    cutPosition: 400,
    cutCardPassed: false,
    ...overrides,
  };
}

function render_(node: React.ReactNode) {
  return render(<MotionConfig reducedMotion="always">{node}</MotionConfig>);
}

describe('ShoeIndicator', () => {
  it('shows depth + cards-to-cut by default', () => {
    render_(<ShoeIndicator shoe={shoe({})} freshShoeBanner={false} />);
    expect(screen.getByText(/Shoe: 416 cards/i)).toBeInTheDocument();
    expect(screen.getByText(/cut in 400/i)).toBeInTheDocument();
  });

  it('clamps cards-to-cut to 0 when negative', () => {
    render_(<ShoeIndicator shoe={shoe({ cards: [], cutPosition: 100 })} freshShoeBanner={false} />);
    expect(screen.getByText(/cut in 0/i)).toBeInTheDocument();
  });

  it('shows CUT banner when cutCardPassed=true', () => {
    render_(<ShoeIndicator shoe={shoe({ cutCardPassed: true })} freshShoeBanner={false} />);
    expect(screen.getByText(/cut — reshuffling/i)).toBeInTheDocument();
  });

  it('shows FRESH SHOE banner when freshShoeBanner=true', () => {
    render_(<ShoeIndicator shoe={shoe({})} freshShoeBanner={true} />);
    expect(screen.getByText(/fresh shoe/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm exec vitest run src/games/baccarat/ShoeIndicator.test.tsx
git add src/games/baccarat/ShoeIndicator.tsx src/games/baccarat/ShoeIndicator.test.tsx
git commit -m "feat(baccarat): ShoeIndicator — depth, CUT, and FRESH SHOE banners"
```

## Task D.6: PR D — DoD, push, open, merge

- [ ] **Step 1: Run full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0.

- [ ] **Step 2: Push, open PR, watch CI, merge**

```bash
git push -u origin phase-6-baccarat-pr-d-bet-area
gh pr create --title "phase-6(baccarat): PR D — bet area + shoe indicator" --body "$(cat <<'EOF'
## Summary

PR D of Phase 6. Chip-placement layer.

- BetZone — generic clickable zone with chip overlay
- BigSmallZone — split-half zone, independent click per side
- BetArea — composes the 9 zones into the spec §8 layout (pairs row + main row + dragons)
- ShoeIndicator — depth / CUT / FRESH SHOE banners

All components are presentation-only — driven by props. Machine wiring lands in PR E.

Plan reference: docs/superpowers/plans/2026-05-18-phase-6-baccarat-plan.md — PR D, tasks D.1–D.6.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~20 new tests passing (BetZone x6, BigSmallZone x5, BetArea x4, ShoeIndicator x4)
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged (PR D).

---

# PR E — Page assembly + scoreboard + integration

**Branch:** `phase-6-baccarat-pr-e-page-and-board` (off freshly-merged `main`)
**Goal of this PR:** Ship the actual game. `BeadPlate` + `BigRoad` render the scoreboard from a history slice. `Scoreboard` composes both. `WinCelebration` is the tier-mapped overlay (ported from Slots). `BaccaratPage` mounts the machine, wires the wallet bridge (multi-handle deferred placement), reveals cards step-by-step driven by `onCardRevealed`, and writes one `rounds` row per round via `wallet.settleRound`. Router swaps the StubGamePage for `BaccaratPage`. An integration test exercises the full register-deal-settle path with fake IndexedDB.
**Risk:** High. This is the big assembly PR. Every prior PR's component lands in one page; the wallet bridge is the most intricate part.
**Estimated tasks:** 9.

## Task E.1: Branch + `BeadPlate.tsx`

**Files:**

- Create: `src/games/baccarat/BeadPlate.tsx`
- Create: `src/games/baccarat/BeadPlate.test.tsx`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-6-baccarat-pr-e-page-and-board
```

- [ ] **Step 2: Write `src/games/baccarat/BeadPlate.tsx`**

```tsx
import type { JSX } from 'react';
import { BEAD_PLATE_ROWS, BEAD_PLATE_VISIBLE_COLS } from './config';
import type { BeadCell } from './types';

interface Props {
  cells: readonly BeadCell[];
}

const COLOR: Record<BeadCell['winner'], string> = {
  player: 'bg-casino-red',
  banker: 'bg-blue-500',
  tie: 'bg-chip-win',
};

export default function BeadPlate({ cells }: Props): JSX.Element {
  // Cells fill column-by-column. Compute target columns from BEAD_PLATE_ROWS rows.
  const visibleCols = BEAD_PLATE_VISIBLE_COLS;
  const totalSlots = BEAD_PLATE_ROWS * visibleCols;
  const drawn = cells.slice(-totalSlots);

  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${visibleCols}, 16px)`,
        gridTemplateRows: `repeat(${BEAD_PLATE_ROWS}, 16px)`,
        gridAutoFlow: 'column',
      }}
      data-baccarat-board="bead-plate"
    >
      {Array.from({ length: totalSlots }).map((_, i) => {
        const cell = drawn[i];
        if (!cell) {
          return <div key={i} className="rounded-sm bg-white/[0.03]" />;
        }
        return (
          <div
            key={i}
            className={`relative rounded-full ${COLOR[cell.winner]}`}
            aria-label={`Round ${i + 1}: ${cell.winner}`}
            data-bead-winner={cell.winner}
          >
            {cell.playerPair && (
              <div className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-casino-red ring-1 ring-white" />
            )}
            {cell.bankerPair && (
              <div className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-white" />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/games/baccarat/BeadPlate.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BeadPlate from './BeadPlate';
import type { BeadCell } from './types';

const cell = (winner: BeadCell['winner'], pp = false, bp = false): BeadCell => ({
  winner,
  playerPair: pp,
  bankerPair: bp,
});

describe('BeadPlate', () => {
  it('renders one bead per cell with the correct color attribute', () => {
    const { container } = render(
      <BeadPlate cells={[cell('player'), cell('banker'), cell('tie')]} />,
    );
    expect(container.querySelectorAll('[data-bead-winner="player"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-bead-winner="banker"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-bead-winner="tie"]')).toHaveLength(1);
  });

  it('marks pair decorations', () => {
    const { container } = render(<BeadPlate cells={[cell('player', true, false)]} />);
    expect(container.querySelector('.bg-casino-red.rounded-full.ring-1')).toBeInTheDocument();
  });

  it('truncates to the last (rows × visibleCols) cells', () => {
    const many = Array.from({ length: 200 }, () => cell('player'));
    const { container } = render(<BeadPlate cells={many} />);
    expect(container.querySelectorAll('[data-bead-winner="player"]').length).toBeLessThanOrEqual(
      60,
    );
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm exec vitest run src/games/baccarat/BeadPlate.test.tsx
git add src/games/baccarat/BeadPlate.tsx src/games/baccarat/BeadPlate.test.tsx
git commit -m "feat(baccarat): BeadPlate — column-flow grid with pair decorations"
```

## Task E.2: `BigRoad.tsx` + tests

**Files:**

- Create: `src/games/baccarat/BigRoad.tsx`
- Create: `src/games/baccarat/BigRoad.test.tsx`

- [ ] **Step 1: Write `src/games/baccarat/BigRoad.tsx`**

```tsx
import type { JSX } from 'react';
import { BIG_ROAD_ROWS, BIG_ROAD_VISIBLE_COLS } from './config';
import type { BigRoadCell } from './types';

interface Props {
  columns: readonly (readonly BigRoadCell[])[];
}

const RING: Record<BigRoadCell['winner'], string> = {
  player: 'ring-casino-red text-casino-red',
  banker: 'ring-blue-500 text-blue-500',
};

export default function BigRoad({ columns }: Props): JSX.Element {
  // Render the last N visible columns; older drop off the left.
  const visible = columns.slice(-BIG_ROAD_VISIBLE_COLS);
  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${BIG_ROAD_VISIBLE_COLS}, 18px)`,
        gridTemplateRows: `repeat(${BIG_ROAD_ROWS}, 18px)`,
        gridAutoFlow: 'column',
      }}
      data-baccarat-board="big-road"
    >
      {Array.from({ length: BIG_ROAD_VISIBLE_COLS }).map((_, colIdx) => {
        const col = visible[colIdx] ?? [];
        return Array.from({ length: BIG_ROAD_ROWS }).map((__, rowIdx) => {
          const cell = col[rowIdx];
          if (!cell) {
            return <div key={`${colIdx}-${rowIdx}`} className="rounded-sm bg-white/[0.03]" />;
          }
          return (
            <div
              key={`${colIdx}-${rowIdx}`}
              data-big-road-winner={cell.winner}
              className={`relative grid place-items-center rounded-full ring-2 bg-felt-deep ${RING[cell.winner]} text-[10px] font-bold`}
            >
              {cell.ties > 0 && <span className="leading-none">{cell.ties}</span>}
            </div>
          );
        });
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/games/baccarat/BigRoad.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BigRoad from './BigRoad';
import { getBigRoad } from './logic';

describe('BigRoad', () => {
  it('renders an empty grid when no columns', () => {
    const { container } = render(<BigRoad columns={[]} />);
    expect(container.querySelectorAll('[data-big-road-winner]')).toHaveLength(0);
  });

  it('renders correct ring colors for each winner type', () => {
    const cols = getBigRoad([
      { winner: 'player', playerPair: false, bankerPair: false },
      { winner: 'banker', playerPair: false, bankerPair: false },
    ]);
    const { container } = render(<BigRoad columns={cols} />);
    expect(container.querySelectorAll('[data-big-road-winner="player"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-big-road-winner="banker"]')).toHaveLength(1);
  });

  it('shows tie count overlay on cells with ties > 0', () => {
    const cols = getBigRoad([
      { winner: 'player', playerPair: false, bankerPair: false },
      { winner: 'tie', playerPair: false, bankerPair: false },
      { winner: 'tie', playerPair: false, bankerPair: false },
    ]);
    const { container } = render(<BigRoad columns={cols} />);
    // The player cell should have a "2" in it (two ties).
    expect(container.textContent).toContain('2');
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/games/baccarat/BigRoad.test.tsx
git add src/games/baccarat/BigRoad.tsx src/games/baccarat/BigRoad.test.tsx
git commit -m "feat(baccarat): BigRoad — ring-style grid with tie-count overlay"
```

## Task E.3: `Scoreboard.tsx`

**Files:**

- Create: `src/games/baccarat/Scoreboard.tsx`

- [ ] **Step 1: Write the file**

```tsx
import type { JSX } from 'react';
import BeadPlate from './BeadPlate';
import BigRoad from './BigRoad';
import { getBeadPlate, getBigRoad, type ScoreboardEntry } from './logic';

interface Props {
  /** Round history, oldest-first. */
  history: readonly ScoreboardEntry[];
}

export default function Scoreboard({ history }: Props): JSX.Element {
  const bead = getBeadPlate(history);
  const bigRoad = getBigRoad(history);
  return (
    <div className="flex flex-col gap-3 rounded border border-white/15 bg-felt-deep p-3">
      <div>
        <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-gold">BEAD PLATE</div>
        <BeadPlate cells={bead} />
      </div>
      <div>
        <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-gold">BIG ROAD</div>
        <BigRoad columns={bigRoad} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit (no test — purely a wrapper, exercised by integration test in E.8)**

```bash
git add src/games/baccarat/Scoreboard.tsx
git commit -m "feat(baccarat): Scoreboard — composes BeadPlate + BigRoad with headers"
```

## Task E.4: `WinCelebration.tsx`

**Files:**

- Create: `src/games/baccarat/WinCelebration.tsx`

Port the Slots WinCelebration pattern. The tier-mapped overlay is essentially the same; mapping rules differ per spec §10.

- [ ] **Step 1: Inspect the Slots celebration for the pattern**

```bash
sed -n '236,326p' src/games/slots/SlotsPage.tsx
```

(Read the WinCelebration sub-component from Phase 5 SlotsPage.tsx — it's defined inline. Adapt the shape; do not edit Phase 5.)

- [ ] **Step 2: Write `src/games/baccarat/WinCelebration.tsx`**

```tsx
import type { JSX } from 'react';
import type { Payouts, RoundResult } from './types';

type Tier = 'none' | 'small' | 'medium' | 'jackpot';

interface Props {
  result: RoundResult | null;
  payouts: Payouts | null;
  reducedMotion: boolean;
}

/**
 * Map a settled round + payouts to a celebration tier per spec §10.
 *
 * Tier resolution: highest tier across all winning bets.
 */
export function tierFor(result: RoundResult, payouts: Payouts): Tier {
  let highest: Tier = 'none';
  for (const [zone, change] of Object.entries(payouts) as [keyof Payouts, number][]) {
    if (change <= 0) continue;
    const t = zoneTier(zone, change, result);
    if (rank(t) > rank(highest)) highest = t;
  }
  return highest;
}

function zoneTier(zone: keyof Payouts, change: number, result: RoundResult): Tier {
  if (zone === 'playerDragon' || zone === 'bankerDragon') {
    // Margin-9 win pays 30:1 → if winnings are >= 30x bet, jackpot.
    // We don't have bet here so use change > 25x bet heuristic: easier to just
    // detect by margin.
    if (result.margin === 9 && !result.winnerNatural) return 'jackpot';
    return 'medium';
  }
  if (zone === 'tie') return 'medium';
  if (zone === 'playerPair' || zone === 'bankerPair') return 'medium';
  if (zone === 'player' || zone === 'banker') {
    // Natural-9 win bumps to medium per spec.
    if (result.winnerNatural && result.margin >= 1) {
      // Natural-9 specifically (Player 9 with two cards beats Banker non-9)
      const winnerTotal = result.winner === 'player' ? result.player.total : result.banker.total;
      if (winnerTotal === 9) return 'medium';
    }
    return 'small';
  }
  if (zone === 'big' || zone === 'small') return 'small';
  return 'none';
}

const RANK: Record<Tier, number> = { none: 0, small: 1, medium: 2, jackpot: 3 };
function rank(t: Tier): number {
  return RANK[t];
}

export default function WinCelebration({
  result,
  payouts,
  reducedMotion,
}: Props): JSX.Element | null {
  if (!result || !payouts) return null;
  const tier = tierFor(result, payouts);
  if (tier === 'none') return null;

  const verdictText =
    result.winner === 'tie' ? 'TIE' : result.winner === 'player' ? 'PLAYER WINS' : 'BANKER WINS';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      data-baccarat-celebration={tier}
    >
      {tier === 'jackpot' && !reducedMotion && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,92,242,0.18) 0%, transparent 70%)',
              animation: 'baccaratJackpot 1500ms ease-out',
            }}
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute"
              style={{
                top: 0,
                left: `${(i * 100) / 12 + ((i * 7) % 5)}%`,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #ffd23f, #d4af37)',
                boxShadow: '0 0 4px rgba(212,175,55,0.8)',
                animation: `baccaratCoinFall 1500ms ease-out ${i * 80}ms forwards`,
                opacity: 0,
              }}
            />
          ))}
        </>
      )}
      {tier === 'medium' && !reducedMotion && (
        <div
          aria-hidden
          className="absolute"
          style={{
            width: 360,
            height: 100,
            background:
              'radial-gradient(ellipse at center, rgba(255,224,102,0.5) 0%, transparent 70%)',
            animation: 'baccaratMediumBurst 800ms ease-out',
          }}
        />
      )}
      <div
        className="rounded-md border px-5 py-2 font-display text-sm tracking-wider"
        style={{
          borderColor: tier === 'jackpot' ? '#ff5cf2' : '#d4af37',
          background: '#06120c',
          color: tier === 'jackpot' ? '#ff5cf2' : '#ffe066',
          marginTop: -180,
        }}
      >
        {tier === 'jackpot' ? `JACKPOT — ${verdictText}` : verdictText}
      </div>
    </div>
  );
}
```

The CSS animations (`@keyframes baccaratJackpot`, `baccaratMediumBurst`, `baccaratCoinFall`) need to be defined somewhere — inject them via a `<style>` tag in `BaccaratPage.tsx` (next task) following the Slots precedent.

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/WinCelebration.tsx
git commit -m "feat(baccarat): WinCelebration + tierFor (tier-mapped per spec §10)"
```

## Task E.5: `BaccaratPage.tsx` — the main assembly

**Files:**

- Create: `src/games/baccarat/BaccaratPage.tsx`

This is the big one. Mounts the machine, reveals cards step-by-step, drives the wallet bridge, persists history for the scoreboard, and shows the celebration.

- [ ] **Step 1: Write `src/games/baccarat/BaccaratPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { baccaratMachine } from './machine';
import { BET_LIMITS } from './config';
import { computePayouts } from './logic';
import type { BetZoneKey, Payouts, RoundResult } from './types';
import HandView from './HandView';
import BetArea from './BetArea';
import ShoeIndicator from './ShoeIndicator';
import Scoreboard from './Scoreboard';
import WinCelebration from './WinCelebration';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';

const ANIMATIONS = `
  @keyframes baccaratJackpot { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes baccaratMediumBurst {
    0% { opacity: 0; transform: scale(0.6); }
    40% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(1.3); }
  }
  @keyframes baccaratCoinFall {
    0% { transform: translateY(-30px); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(320px); opacity: 0; }
  }
`;

export default function BaccaratPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const reducedMotion = useReducedMotion() ?? false;

  const [state, send] = useMachine(baccaratMachine, { input: { reducedMotion } });

  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);

  // Reveal pacing: drive how many cards are visible per side as the machine advances.
  const [playerRevealed, setPlayerRevealed] = useState(0);
  const [bankerRevealed, setBankerRevealed] = useState(0);

  // When dealt cards change, reveal them with timing matching REVEAL_TIMING.
  const playerCardCount = state.context.playerCards.length;
  const bankerCardCount = state.context.bankerCards.length;
  useEffect(() => {
    if (reducedMotion) {
      setPlayerRevealed(playerCardCount);
      setBankerRevealed(bankerCardCount);
      return;
    }
    // Reveal in order: P1, B1, P2, B2, (P3?), (B3?).
    // Increment one slot at a time at ~600ms intervals.
    const steps: Array<() => void> = [];
    for (let i = playerRevealed; i < Math.min(playerCardCount, 2); i++) {
      steps.push(() => setPlayerRevealed((n) => Math.max(n, i + 1)));
      steps.push(() => setBankerRevealed((n) => Math.max(n, Math.min(bankerCardCount, i + 1))));
    }
    if (playerCardCount === 3 && playerRevealed < 3) steps.push(() => setPlayerRevealed(3));
    if (bankerCardCount === 3 && bankerRevealed < 3) steps.push(() => setBankerRevealed(3));
    let i = 0;
    const ids: number[] = [];
    for (const s of steps) {
      ids.push(window.setTimeout(s, 400 * ++i));
    }
    return () => {
      ids.forEach(window.clearTimeout);
    };
  }, [playerCardCount, bankerCardCount, reducedMotion, playerRevealed, bankerRevealed]);

  // Reset reveal counters when machine resets (roundCount incremented).
  const roundCount = state.context.roundCount;
  useEffect(() => {
    setPlayerRevealed(0);
    setBankerRevealed(0);
  }, [roundCount]);

  // Wallet bridge — settle once per round when roundResult appears.
  const settledRef = useRef<number>(-1);
  useEffect(() => {
    if (!user) return;
    const result = state.context.roundResult;
    if (!result) return;
    if (settledRef.current === roundCount) return;
    settledRef.current = roundCount;
    const payouts = computePayouts(state.context.bets, result);
    void persistRound(user.id, state.context.bets, result, payouts, settleRound, placeBet);
  }, [state.context.roundResult, roundCount, state.context.bets, user, settleRound, placeBet]);

  // History for the scoreboard — from the rounds table.
  const rounds = useRecentRounds(user?.id, 'baccarat', 60);
  const history = useMemo(
    () =>
      rounds
        .slice()
        .reverse() // useRecentRounds returns newest-first; scoreboard needs oldest-first
        .map((r) => {
          const d = r.details as {
            winner: RoundResult['winner'];
            playerPair: boolean;
            bankerPair: boolean;
          };
          return { winner: d.winner, playerPair: d.playerPair, bankerPair: d.bankerPair };
        }),
    [rounds],
  );

  const inBetting = state.matches('betting');

  const handleAddChip = useCallback(
    (zone: BetZoneKey) => {
      if (!inBetting) return;
      const limit = BET_LIMITS[zone];
      const current = state.context.bets[zone];
      // Add a default 5-chip increment — UI for chip-denom select can replace this later.
      const next = Math.min(limit.max, current === 0 ? limit.min : current + 5);
      send({ type: 'PLACE_CHIP', zone, amount: next - current });
    },
    [inBetting, send, state.context.bets],
  );

  const handleClearZone = useCallback(
    (zone: BetZoneKey) => {
      if (!inBetting) return;
      send({ type: 'CLEAR_ZONE', zone });
    },
    [inBetting, send],
  );

  const handleDeal = useCallback(() => {
    if (!inBetting) return;
    const sum = Object.values(state.context.bets).reduce((s, n) => s + n, 0);
    if (sum === 0) return;
    if (sum > balance) return;
    send({ type: 'DEAL' });
  }, [inBetting, send, state.context.bets, balance]);

  const payouts = useMemo(
    () =>
      state.context.roundResult
        ? computePayouts(state.context.bets, state.context.roundResult)
        : null,
    [state.context.bets, state.context.roundResult],
  );

  if (!user) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ANIMATIONS }} />
      <GameShell
        title="🎴 BACCARAT"
        meta="8-deck shoe · 9 zones"
        game="baccarat"
        bettingPanel={
          <div className="mx-auto flex max-w-[800px] flex-col gap-3 px-2">
            <div className="flex items-center justify-between">
              <ShoeIndicator
                shoe={state.context.shoe}
                freshShoeBanner={state.context.freshShoeBanner}
              />
              <button
                type="button"
                onClick={handleDeal}
                disabled={!inBetting}
                className="rounded bg-gold px-6 py-2 font-display text-sm tracking-wider text-felt-deep hover:bg-gold-bright disabled:opacity-40"
              >
                DEAL
              </button>
            </div>
            <BettingPanel
              min={BET_LIMITS.player.min}
              max={BET_LIMITS.player.max}
              balance={balance}
              onCommit={() => {
                /* chip-denom UI not used for Baccarat — clicking zones places chips directly */
              }}
            />
          </div>
        }
      >
        <div className="relative grid flex-1 grid-cols-[1fr_220px] gap-6 px-4 py-6">
          {/* Left: card area + bet area stacked vertically */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-around gap-6">
              <HandView
                label="PLAYER"
                cards={state.context.playerCards}
                revealedCount={playerRevealed}
                highlight={state.context.roundResult?.winner === 'player'}
              />
              <HandView
                label="BANKER"
                cards={state.context.bankerCards}
                revealedCount={bankerRevealed}
                highlight={state.context.roundResult?.winner === 'banker'}
              />
            </div>
            <BetArea
              bets={state.context.bets}
              disabled={!inBetting}
              onAddChip={handleAddChip}
              onClearZone={handleClearZone}
            />
          </div>
          {/* Right: scoreboard */}
          <Scoreboard history={history} />
          {/* Overlay (always-rendered container; content only when celebration fires) */}
          <WinCelebration
            result={state.context.roundResult}
            payouts={payouts}
            reducedMotion={reducedMotion}
          />
        </div>
      </GameShell>
    </>
  );
}

async function persistRound(
  userId: string,
  bets: Record<string, number>,
  result: RoundResult,
  payouts: Payouts,
  settleRound: ReturnType<typeof useWalletStore.getState>['settleRound'],
  placeBet: ReturnType<typeof useWalletStore.getState>['placeBet'],
): Promise<void> {
  // Place one handle per non-zero bet zone (multi-handle pattern).
  const handles: Array<{ zone: string; betId: string; amount: number }> = [];
  for (const [zone, amount] of Object.entries(bets)) {
    if (amount === 0) continue;
    const r = await placeBet({
      userId,
      game: 'baccarat',
      amount,
      min: 5,
      max: 2000,
    });
    if (!r.ok) {
      // Should be unreachable — caller checked sum vs balance before DEAL.
      // Best effort: refund already-placed handles.
      for (const h of handles) {
        await settleRound({
          handle: {
            betId: h.betId,
            userId,
            game: 'baccarat',
            amount: h.amount,
            placedAt: Date.now(),
          },
          result: {
            outcome: 'push',
            betAmount: h.amount,
            payout: h.amount,
            netChange: 0,
            details: { refunded: true, zone: h.zone },
          },
        });
      }
      return;
    }
    handles.push({ zone, betId: r.handle.betId, amount });
  }
  // Settle each handle with its zone's per-zone payout.
  for (const h of handles) {
    const change = payouts[h.zone as keyof Payouts];
    const outcome = change > 0 ? 'win' : change < 0 ? 'loss' : 'push';
    await settleRound({
      handle: {
        betId: h.betId,
        userId,
        game: 'baccarat',
        amount: h.amount,
        placedAt: Date.now(),
      },
      result: {
        outcome,
        betAmount: h.amount,
        payout: h.amount + change > 0 ? h.amount + change : 0,
        netChange: change,
        details: {
          zone: h.zone,
          winner: result.winner,
          margin: result.margin,
          playerCards: result.player.cards,
          bankerCards: result.banker.cards,
          playerPair: result.playerPair,
          bankerPair: result.bankerPair,
          winnerNatural: result.winnerNatural,
          bothNatural: result.bothNatural,
          totalCards: result.totalCards,
        },
      },
    });
  }
}
```

Note: this `persistRound` writes ONE `rounds` row per bet zone (i.e. N rows per game round, where N = number of non-zero zones). That diverges from "one round = one row" — but each zone's row faithfully captures its outcome. The scoreboard derive query reads any row's `details.winner` so it doesn't matter which zone's row it picks; downstream stats can `GROUP BY round` if needed. **If the reviewer prefers strictly one-row-per-round semantics, change the bridge to write a single row with aggregated details — flag this in PR review.**

- [ ] **Step 2: Commit**

```bash
git add src/games/baccarat/BaccaratPage.tsx
git commit -m "feat(baccarat): BaccaratPage — assembles machine, scoreboard, celebration, wallet bridge"
```

## Task E.6: Wire `/play/baccarat` route

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Replace the StubGamePage line**

Locate this entry in `src/router.tsx`:

```tsx
{ path: 'play/baccarat', element: <StubGamePage game="baccarat" phase={6} /> },
```

Replace with:

```tsx
{ path: 'play/baccarat', element: <BaccaratPage /> },
```

And add the import at the top:

```tsx
import BaccaratPage from '@/games/baccarat/BaccaratPage';
```

- [ ] **Step 2: Verify typecheck + build**

```bash
pnpm typecheck && pnpm build
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat(routing): wire BaccaratPage at /play/baccarat (replacing stub)"
```

## Task E.7: Lobby card (only if Baccarat is still showing as "coming soon")

**Files:**

- Maybe modify: `src/pages/LobbyPage.tsx`

- [ ] **Step 1: Inspect the lobby**

```bash
grep -n "baccarat\|Baccarat" src/pages/LobbyPage.tsx
```

- [ ] **Step 2: If the lobby gates Baccarat behind a "comingSoon" flag or similar, flip it to playable.** The change is one-line. If the card is already playable (just linking to `/play/baccarat`), no change needed and you skip this commit.

```bash
git add src/pages/LobbyPage.tsx
git commit -m "feat(lobby): mark Baccarat as playable"
```

(Skip the commit if no change was needed.)

## Task E.8: Integration test for BaccaratPage

**Files:**

- Create: `src/games/baccarat/BaccaratPage.test.tsx`

- [ ] **Step 1: Write the integration test**

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig, MotionGlobalConfig } from 'framer-motion';
import { createMemoryRouter, RouterProvider } from 'react-router';
import BaccaratPage from './BaccaratPage';
import { register } from '@/systems/auth';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { seedRng, clearSeed } from '@/systems/rng';

function renderPage() {
  const router = createMemoryRouter([{ path: '/play/baccarat', element: <BaccaratPage /> }], {
    initialEntries: ['/play/baccarat'],
  });
  return render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
    </MotionConfig>,
  );
}

describe('BaccaratPage — integration', () => {
  beforeEach(async () => {
    MotionGlobalConfig.skipAnimations = true;
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
    seedRng(98765);
  });

  it('register → bet → DEAL → settles → writes a rounds row with game=baccarat', async () => {
    const reg = await register({ username: 'alice', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    useSessionStore.setState({ currentUser: reg.user });
    await useWalletStore.getState().hydrate(reg.user.id);

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('BACCARAT', { exact: false })).toBeInTheDocument());

    // Place 25 on Player. Click the PLAYER zone 5 times to step the bet up (5 → 10 → 15 → 20 → 25).
    const playerZone = screen.getByText('PLAYER').closest('button')!;
    for (let i = 0; i < 5; i++) {
      await user.click(playerZone);
    }

    // Press DEAL.
    await user.click(screen.getByRole('button', { name: /^DEAL$/i }));

    // Wait for round to settle and a row to be written.
    await waitFor(async () => {
      const rows = await db.rounds.where('userId').equals(reg.user.id).toArray();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]!.game).toBe('baccarat');
    });
  });

  clearSeed();
});
```

This test is intentionally minimal — exercises the end-to-end happy path without trying to be exhaustive (the per-component tests do exhaustive coverage). The key assertion is "a baccarat round row is written" which proves the whole machine ↔ wallet bridge works.

- [ ] **Step 2: Run**

```bash
pnpm exec vitest run src/games/baccarat/BaccaratPage.test.tsx
```

Expected: PASS. Likely to need a tweak or two (the BettingPanel + chip-stepping behavior may need a small adjustment to make the "click 5 times to bet 25" path work cleanly).

- [ ] **Step 3: Commit**

```bash
git add src/games/baccarat/BaccaratPage.test.tsx
git commit -m "test(baccarat): integration — register, bet, DEAL, settle, rounds row written"
```

## Task E.9: PR E — DoD, manual smoke, push, open, merge

- [ ] **Step 1: Manual smoke against the spec §15 DoD checklist**

```bash
pnpm dev
```

Run through every step in spec §15:

- Register a user.
- Lobby shows Baccarat as playable; click → `/play/baccarat`.
- Bet on each of the 9 zones; press DEAL.
- Theatrical reveal plays.
- Outcome banner shows for ~2s.
- Repeat 10+ rounds; bead plate populates left-to-right then wraps; big road follows walked-pen rules.
- Watch for a cut-card crossing (~80 rounds in); CUT banner appears; next round FRESH SHOE.
- 1000 chips on Banker, banker wins → 950 net.
- Dragon margin-9 win → magenta jackpot fires.
- Toggle macOS Reduce Motion; reload; cards appear instantly; banners shorten.

If anything is wrong, fix inline before pushing.

- [ ] **Step 2: Run full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four green. ~870 tests passing.

- [ ] **Step 3: Push, open PR, watch CI, merge**

```bash
git push -u origin phase-6-baccarat-pr-e-page-and-board
gh pr create --title "phase-6(baccarat): PR E — page + scoreboard + celebration + wallet bridge" --body "$(cat <<'EOF'
## Summary

PR E of Phase 6 — feature-complete (PR F is release plumbing only).

- BeadPlate — column-flow grid with pair decorations
- BigRoad — ring-style grid with tie-count overlay (built from getBigRoad)
- Scoreboard — composes both
- WinCelebration + tierFor — tier-mapped overlay per spec §10
- BaccaratPage — assembles machine, scoreboard, celebration, wallet bridge; reveal pacing driven by useEffect on cards.length; wallet bridge writes one rounds row per non-zero bet zone (multi-handle, ADR-0028 pattern)
- Router: /play/baccarat → BaccaratPage (replacing stub)
- Integration test pins the register→bet→DEAL→settle path end-to-end

## Manual smoke

- [x] Spec §15 DoD walked end-to-end in pnpm dev
- [x] Bead plate + big road populate correctly across 10+ rounds
- [x] Cut card + reshuffle behaves
- [x] Reduced motion respected

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` green locally
- [x] ~25 new tests passing across BeadPlate, BigRoad, BaccaratPage integration
- [ ] CI green (4 jobs)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged (PR E). Phase 6 feature work is complete.

---

# PR F — Release v0.7-baccarat

**Branch:** `chore/release-v0.7-baccarat` (off freshly-merged `main`)
**Goal of this PR:** BUILD_GUIDE marks Phase 6 ✅. After the PR merges, push the `v0.7-baccarat` tag and publish a GitHub Release.
**Risk:** Low. Pure docs + release plumbing. Convention: `package.json` stays at `0.0.0` (tag-only versioning per `v0.1`–`v0.9` precedent).
**Estimated tasks:** 3.

## Task F.1: BUILD_GUIDE Phase 6 row

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Branch off freshly-merged main**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.7-baccarat
```

- [ ] **Step 2: Update BUILD_GUIDE §12 — flip Phase 6 to ✅**

Find the row in the §12 phase table:

```markdown
| **6. Baccarat** | Full Baccarat including third-card rules. | Playable; commission and tie payouts correct; third-card tableau tested. |
```

Replace with:

```markdown
| **6. Baccarat** ✅ | Full Baccarat with all 9 bet zones (P / B / T + 2 Pairs + Big/Small + 2 Dragons), persistent 8-deck shoe with cut card, canonical third-card tableau, bead plate + big road scoreboard, theatrical card reveal, tier-mapped celebration. | Shipped 2026-05-XX — see `v0.7-baccarat`. ADR-0036, ADR-0037. |
```

(Replace `2026-05-XX` with the actual release date.)

- [ ] **Step 3: Markdownlint check**

```bash
npx markdownlint-cli2 BUILD_GUIDE.md
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add BUILD_GUIDE.md
git commit -m "docs(build-guide): mark Phase 6 (Baccarat) shipped"
```

## Task F.2: Open PR, merge

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin chore/release-v0.7-baccarat
gh pr create --title "chore(release): v0.7-baccarat — Phase 6 BUILD_GUIDE update" --body "$(cat <<'EOF'
## Summary

PR F of Phase 6 — release plumbing only, no code changes.

- BUILD_GUIDE §12 marks Phase 6 ✅ with ADR refs and shipping date
- package.json stays at 0.0.0 (tag-only versioning per v0.1 → v0.9 precedent)

## Test plan

- [x] markdownlint clean
- [ ] CI green (4 jobs)
- [ ] After merge: tag v0.7-baccarat, publish GitHub Release

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for CI, merge, sync main**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task F.3: Tag + GitHub Release

- [ ] **Step 1: Tag**

```bash
git tag -a v0.7-baccarat -m "v0.7 — Baccarat"
git push origin v0.7-baccarat
```

- [ ] **Step 2: Publish release**

```bash
gh release create v0.7-baccarat --title "v0.7-baccarat — Phase 6 complete" --notes "$(cat <<'EOF'
## What's new

Phase 6 ships full Baccarat with all 9 bet zones — the MVP table game lineup is now complete (Blackjack + Roulette + Slots + Baccarat).

### Highlights

- Player / Banker / Tie main bets
- Side bets: Player Pair, Banker Pair, Big, Small, Player Dragon, Banker Dragon
- Persistent 8-deck shoe with cut card + visible depth indicator + reshuffle banner
- Canonical Punto Banco third-card tableau (cell-by-cell unit-tested)
- Bead plate + big road scoreboard (walked-pen logic with tie overlay)
- Theatrical card reveal: slide-in → corner peek → flip → ~5–6s per round (reduced-motion fallback)
- Tier-mapped celebration: loss / small / medium / jackpot (Dragon 30:1)

### Architecture

- XState v5 round machine (betting → dealing → maybe thirds → settling → showingResult)
- Deferred multi-handle wallet placement (matches Roulette / ADR-0028)
- Pure logic in src/games/baccarat/logic.ts — exhaustive unit tests, 90%+ coverage
- Visual reuse: Phase 3 Card component, GameShell (with Phase 9 useGameVisit tracking)
- ~140 new tests added across 6 PRs

### ADRs

- [ADR-0036 — Baccarat third-card tableau + integer rounding](https://github.com/A1PC/localGamble/blob/main/docs/adr/0036-baccarat-third-card-tableau.md)
- [ADR-0037 — Persistent 8-deck shoe with cut card](https://github.com/A1PC/localGamble/blob/main/docs/adr/0037-baccarat-persistent-shoe.md)

### PRs

A → F (linked in plan): logic + ADRs · shoe + machine · card area · bet area · page + scoreboard · release

Plan: \`docs/superpowers/plans/2026-05-18-phase-6-baccarat-plan.md\`
EOF
)"
```

Expected: a public release page at `https://github.com/A1PC/localGamble/releases/tag/v0.7-baccarat`.

- [ ] **Step 3: Update `project_masquer_status` memory**

Open `/Users/adam/.claude/projects/-Users-adam/memory/project_masquer_status.md`. Add a new tagged-release entry at the top of the list:

```markdown
- `v0.7-baccarat` — Phase 6 (Baccarat: all 9 zones, persistent shoe, third-card tableau, scoreboard, theatrical reveal, tier celebration, ~140 new tests, 6 PRs)
```

Update the description line at the top: "Phases 0-6 plus 9 complete as of YYYY-MM-DD". The MEMORY.md index entry's hook should be updated to match.

---

# Self-Review Checklist

After finishing PR F (Task F.3 step 3), run this once before declaring Phase 6 done:

- [ ] **Spec coverage:** every §1–§17 in the spec maps to at least one task.
- [ ] **DoD:** every PR A–E ran `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` clean before merge.
- [ ] **Test count:** ~140 new tests added. Verify via `git log --since=<PR-A date> --oneline | wc -l` plus inspecting test files.
- [ ] **Bundle:** main bundle delta < 30 kB; Baccarat-specific code under `src/games/baccarat/` only; no leaked imports outside the game folder (except `BaccaratPage.tsx`'s wallet/session/router imports).
- [ ] **No Math.random introduced** — `grep -r "Math.random" src/games/baccarat/` returns nothing.
- [ ] **No floats in money** — all chip math goes through Math.floor for commission and Big/Small.
- [ ] **Games sandboxed** — `grep -rE "from '@/db|from '@/store'" src/games/baccarat/` returns ONLY `BaccaratPage.tsx`.
- [ ] **GitHub Release published** — link visible on the repo's Releases tab.
- [ ] **Memory updated** — `project_masquer_status.md` reflects v0.7 shipped.

If anything fails, hot-fix on `main` with a `fix/baccarat-*` branch.
