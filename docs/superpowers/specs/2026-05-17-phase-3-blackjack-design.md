# Phase 3 — Blackjack — Design Spec

- **Status:** Approved (2026-05-17)
- **Author:** Developer (with Claude Opus 4.7)
- **Phase:** 3 of 9 (BUILD_GUIDE.md §12, §8.1)
- **Related ADRs:** 0021–0028 (created as part of this phase)
- **Implementation plan:** `docs/superpowers/plans/2026-05-17-phase-3-blackjack-plan.md` (to be written next)

---

## 1. Goal

Ship a fully playable Blackjack game using the Phase 2 game-shell substrate. By the end of Phase 3:

- A user can play Blackjack end-to-end: place a bet → see two cards dealt up and the dealer's one-up/one-down → take actions (Hit, Stand, Double, Split, Insurance) → dealer auto-plays → settle → balance + RecentResults rail update.
- All standard casino rules implemented: H17 (dealer hits soft 17), Split up to 4 hands with standard split-Aces rule, DAS (double after split), Insurance side bet, 3:2 natural blackjack payout.
- 6-deck shoe with cut card at 50% penetration.
- Lobby's Blackjack cabinet flips from "stub" to "playable"; NEW badge moves from Coin Flip to Blackjack.
- Pure game logic in `logic.ts` with exhaustive unit tests (deterministic via seeded RNG).
- Round state managed via XState machine for clear, debuggable transitions.

Phase 3 is complete when BUILD_GUIDE §12 row 3's definition of done is met: **"Playable end-to-end; wallet updates; rounds logged; logic.test.ts covers blackjack, bust, push, dealer rules, double down."** Plus extensions in §13 of this spec (split, insurance, DAS).

## 2. Non-goals

- **Surrender** (early or late) — not in BUILD_GUIDE; not requested.
- **Side bets beyond Insurance** (Lucky Ladies, Perfect Pairs, 21+3, etc.) — out of MVP.
- **Card-counting helpers** (true count display, hi-lo running count) — defeats the spirit of the game.
- **Multi-hand simultaneous play** (e.g. playing two boxes at once for higher action) — single bet per round.
- **Proper royal art on J/Q/K** — Phase 3 uses framed-rank placeholder cards (formal serif rank letter inside a gold-bordered frame). Phase 8 polish can add real royal SVGs.
- **Animations beyond what GameShell provides + a card-flip on the dealer hole-card reveal** — full table animation (chip-stacking, smooth-deal-from-shoe, hand pulse on bust, etc.) is Phase 8 polish. Phase 3 ships static card placement + the existing Framer Motion patterns from Phase 2 (RecentResults slide-in, win/loss pill).
- **Sound effects** — Phase 8.
- **Statistics / strategy hints** — Phase 7 stats, no in-game hints planned.
- **6:5 blackjack payout option** — BUILD_GUIDE explicitly specifies 3:2.

## 3. Decisions made

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Rationale                                                                                                                                                                                                                                                                                           | ADR  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | **H17** — dealer hits on soft 17 (e.g. A-6, A-4-2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | User-chosen; harder for player; common in Vegas Strip; small additional code (track soft-vs-hard total). Diverges from BUILD_GUIDE's recommendation of S17 — BUILD_GUIDE.md §8.1 wording updated in PR A.                                                                                           | 0021 |
| 2   | **Split** up to 4 total hands (resplit up to twice)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Full casino ruleset; max 4 hands bounds the state space.                                                                                                                                                                                                                                            | 0022 |
| 3   | **Split Aces** — one card each, no resplit aces, no double, 21 pays 1:1 (not as a natural blackjack)                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standard rule; without it, Aces become the universal optimal split.                                                                                                                                                                                                                                 | 0022 |
| 4   | **DAS allowed** (double after split)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Standard modern rule; small house-edge reduction; one flag in the action-availability check.                                                                                                                                                                                                        | 0022 |
| 5   | **Insurance bet** included                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | User-chosen; adds a mid-round prompt + side-bet settlement logic + UI. Modal prompt on dealer-Ace up card; offer is `bet/2` to win `bet` (2:1) if dealer has natural blackjack.                                                                                                                     | 0023 |
| 6   | **Shoe:** 6 decks (312 cards), cut card at 156 dealt (50% penetration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | BUILD_GUIDE §8.1 says 6 decks. 50% penetration is more frequent reshuffle than typical Vegas (75-80%) — chosen for higher randomness variance per round; reshuffles roughly every 30-40 rounds.                                                                                                     | 0024 |
| 7   | **Bet range:** 5 chips minimum, 1000 chips maximum                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | "Real-table feel" while keeping plenty of plays per starting 1000-chip stake.                                                                                                                                                                                                                       | 0025 |
| 8   | **BJ payout rounding:** when crediting a natural blackjack on an odd bet, round the bet UP to the nearest even number before applying 3:2                                                                                                                                                                                                                                                                                                                                                                                                                    | Avoids fractional chips. Formula: `winnings = Math.ceil(bet / 2) * 3`. Player gets slight edge on odd bets (e.g. bet 5 → winnings 9 instead of 7.5).                                                                                                                                                | 0025 |
| 9   | **Round state machine:** XState                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Blackjack has ≥8 distinct states with branching transitions (betting → dealing → checking-blackjacks → insurance-prompt → player-action [per hand] → dealer-action → settled). Hand-rolled state would be fragile; XState gives compile-time exhaustiveness, visualization, and tested transitions. | 0026 |
| 10  | **3-PR sequence:** Logic+XState → Card/Hand components → Page+lobby                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Each PR has a clear single concern. PR A is pure (no React); PR B is pure UI components (no game logic); PR C wires them together and updates the lobby.                                                                                                                                            | —    |
| 11  | **Card visual style:** formal pip-pattern + subtle neon glow + gold inset border + cream gradient                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Locked from brainstorm: "old-school Vegas content, modern web execution." Times New Roman bold rank letters; classical pip arrangements; cyan-tinted glow on black suits, magenta-tinted on red suits; 1.5px gold inset ring with white highlight.                                                  | 0027 |
| 12  | **Card back:** pinstripe cross-hatch (4px gold diagonal lines at 90°) over radial casino-red gradient + gold border + center "LG" monogram                                                                                                                                                                                                                                                                                                                                                                                                                   | Locked from brainstorm; tailored/modern feel over the red base.                                                                                                                                                                                                                                     | 0027 |
| 13  | **Court cards (J/Q/K):** framed-rank placeholder for Phase 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Real royal artwork is Phase 8 polish. Phase 3 ships a centered serif rank letter inside an inset gold-bordered rectangle.                                                                                                                                                                           | 0027 |
| 14  | **Table layout:** dealer area top, player area bottom, dashed felt divider; active hand cyan-highlighted with glow + "▶ HAND N · TOTAL" label; bet chip indicator below each hand; action panel docks at bottom replacing BettingPanel during the round                                                                                                                                                                                                                                                                                                      | Single-screen, centered, scales 1024-1920px per design philosophy.                                                                                                                                                                                                                                  | 0027 |
| 15  | **Hand layout:** cards stack with `-32px` margin overlap (fanned-but-tight); corners remain visible for value-reading                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fits up to ~5 cards per hand without wrapping.                                                                                                                                                                                                                                                      | —    |
| 16  | **Insurance UI:** appears as a yellow-bordered prompt panel within the game area (between player hand and action panel) — NOT a modal overlay                                                                                                                                                                                                                                                                                                                                                                                                                | Stays in-flow; same docked layout; user can see the dealer's Ace + their own hand while deciding.                                                                                                                                                                                                   | —    |
| 17  | **RecentResults pill mapping:** Win → green "W" + bet amount + net. Loss → red "L". Push → grey "P". Natural blackjack → yellow "BJ" pill. Insurance and split sub-bets fold into the same single round-level row (one bet handle = one round = one row)                                                                                                                                                                                                                                                                                                     | Keeps one Round per bet handle. Multi-hand split scenarios still produce ONE rounds row whose `details` JSON captures all hands + per-hand outcomes + insurance status.                                                                                                                             | 0023 |
| 18  | **Multi-hand wallet pattern:** for a round with N hands (1-4) + optional insurance, place N+optional bets via N+1 `wallet.placeBet` calls (main bet, then one extra `placeBet` per additional split hand, plus optional insurance `placeBet`). At settle time, call `wallet.settleRound` exactly ONCE with the FIRST hand's bet handle; the `RoundResult.betAmount` and `RoundResult.payout` aggregate across ALL hands and insurance. The other bet-handle IDs are stored in `details.betHandleIds` for traceability but produce NO separate `rounds` rows. | Keeps "one round = one rounds-table row" simple for RecentResults / stats / leaderboard derivation. Trade-off: chips-deducted via N+1 `placeBet`s vs chips-credited via 1 `settleRound` — net change still consistent on the balance row at any point.                                              | 0028 |

## 4. Architecture overview

### 4.1 Layer diagram (Phase 3 additions)

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI LAYER (src/games/blackjack/)                                     │
│                                                                      │
│  BlackjackPage.tsx           — wires GameShell + XState machine      │
│  Card.tsx                    — single playing card (pip pattern)     │
│  Hand.tsx                    — fanned stack of cards                 │
│  PlayerArea.tsx              — N hands, active-hand highlight        │
│  DealerArea.tsx              — dealer's 2-card hand, hole reveal     │
│  ActionPanel.tsx             — HIT/STAND/DOUBLE/SPLIT buttons        │
│  InsurancePrompt.tsx         — TAKE / DECLINE panel                  │
│                                                                      │
│  Lobby update: CabinetCarousel flips blackjack from stub→playable    │
│  Sidebar NEW badge moves from Coin Flip → Blackjack                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ consumes via xstate hook
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STATE MACHINE (src/games/blackjack/machine.ts)                      │
│  XState v5 setup() / createMachine. Pure transitions; no DOM.        │
│  States: betting → dealing → checking-naturals → (insurance-prompt)  │
│          → player-action (per hand) → dealer-action → settling       │
│          → settled                                                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ uses pure helpers from
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PURE LOGIC (src/games/blackjack/logic.ts)                           │
│  Hand value (handles Ace 1/11 + soft total), card deal, dealer       │
│  play rule (H17), legal-actions, settlement (BJ/win/push/loss with   │
│  insurance), payout computation. No React, no I/O.                   │
│                                                                      │
│  Shoe management:                                                    │
│    buildShoe(decks=6), draw(shoe), needsReshuffle(shoe, cutAt=156)   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PHASE 2 SUBSTRATE (unchanged)                                       │
│  GameShell, BettingPanel, RecentResults, useGameRound                │
│  wallet.placeBet / settleRound                                       │
│  systems/rng.ts (mulberry32 seeded for tests)                        │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Round lifecycle (XState machine, plain English)

1. **`betting`** — BettingPanel shown; user composes a bet (5-1000); clicks PLACE BET.
2. **`dealing`** — wallet.placeBet for the main bet; deal 2 cards to player + 2 to dealer (one dealer card face-down). Reshuffle shoe if cut card passed BEFORE this round started.
3. **`checking-naturals`** — if dealer's up card is Ace AND player has 21, offer "even money" auto-settlement (out of MVP — we skip this); proceed to insurance step.
4. **`insurance-prompt`** (only if dealer's up card is Ace) — show InsurancePrompt; user takes (places insurance bet = main bet / 2) or declines.
5. **`peek-blackjack`** (only after insurance offered, OR if dealer's up card is 10/J/Q/K) — peek at hole card. If dealer has blackjack:
   - Settle insurance bet (if taken): 2:1 payout.
   - If player ALSO has blackjack: push on main bet.
   - Otherwise: player loses main bet.
   - → `settling`.
   - If player has blackjack and dealer doesn't: pay 3:2 → `settling`.
6. **`player-action`** — for each hand (sequence): show ActionPanel with legal actions. Player chooses HIT/STAND/DOUBLE/SPLIT. After SPLIT, the original hand becomes two; we play them sequentially. SPLIT-Aces auto-deal one card each then mark both as stood. After all hands stand, double, or bust → `dealer-action`. If all hands busted → skip directly to `settling` (dealer doesn't draw).
7. **`dealer-action`** — reveal hole card; dealer hits per H17 rule until total ≥ 17 (hits on soft 17).
8. **`settling`** — for each player hand, compare to dealer total; assign W/L/P; compute payouts. Compose RoundResult with aggregated bet + payout + per-hand details. Call wallet.settleRound ONCE with the first hand's bet handle.
9. **`settled`** — show round outcome (win/loss pill + total net change); BettingPanel reappears; "↻ Repeat last bet" pill available.

### 4.3 Invariants

- All randomness through `src/systems/rng.ts` (Phase 2). ESLint bans `Math.random`.
- Game logic in `src/games/blackjack/logic.ts` is pure: no React, no Date.now, no Math.random, no Dexie.
- Game state machine in `src/games/blackjack/machine.ts` is pure: pure XState transitions; effects (wallet calls) happen in the page via xstate listeners.
- Page (`BlackjackPage.tsx`) imports GameShell + machine + Card/Hand components; never touches Dexie directly.
- All chip amounts are integers (per existing ADRs).
- One `rounds` row per played round, written by `wallet.settleRound` (per ADR-0016).

## 5. PR sequence

### 5.1 PR A — `phase-3-logic` (pure logic + state machine, no UI)

**Goal:** Working game logic and XState machine, with tests that exercise rule combinations exhaustively. No UI changes.

**New dep:** `xstate` (production).

**Files added:**

```
src/games/blackjack/types.ts                       ~60 lines  — shared types (Card, Hand, Suit, Rank, Action, etc.)
src/games/blackjack/cards.ts                       ~60 lines  — buildShoe, draw, needsReshuffle
src/games/blackjack/cards.test.ts                  ~80 lines  — shoe build/draw/reshuffle invariants
src/games/blackjack/hand.ts                        ~80 lines  — handTotal, isSoft, isBlackjack, canSplit
src/games/blackjack/hand.test.ts                   ~140 lines — handTotal under various card combos, soft-vs-hard
src/games/blackjack/dealer.ts                      ~30 lines  — dealerShouldHit (H17 rule)
src/games/blackjack/dealer.test.ts                 ~80 lines  — covers soft 17 hit, hard 17 stand, hits to 21+ bust
src/games/blackjack/settle.ts                      ~120 lines — settlePlayerHand, aggregateRoundResult (multi-hand+insurance)
src/games/blackjack/settle.test.ts                 ~150 lines — natural BJ payouts, win/loss/push, insurance, split outcomes
src/games/blackjack/machine.ts                     ~280 lines — XState v5 machine
src/games/blackjack/machine.test.ts                ~220 lines — state transitions, legal-actions per state
src/games/blackjack/config.ts                      ~30 lines  — BLACKJACK_CONFIG (bet limits, rules, deck count)
docs/adr/0021-blackjack-h17.md
docs/adr/0022-blackjack-split-rules.md
docs/adr/0023-blackjack-insurance.md
docs/adr/0024-blackjack-shoe-penetration.md
docs/adr/0025-blackjack-bet-limits-and-rounding.md
docs/adr/0026-blackjack-xstate-machine.md
docs/adr/0028-blackjack-multi-hand-wallet-pattern.md
```

**Files modified:**

```
src/db/schema.ts        # Round.game union already has 'blackjack' (from Phase 1); verify
src/systems/wallet.ts   # No changes — existing placeBet/settleRound used as-is
package.json            # +xstate ^5
BUILD_GUIDE.md          # §8.1: H17 rule explicit; insurance documented; split rules + rounding spelled out
docs/risks.md           # +R-32..R-37
```

### 5.2 PR B — `phase-3-cards` (visual components, no game logic)

**Goal:** Card and Hand visual components, render correctly for all 52 ranks + back.

**Files added:**

```
src/games/blackjack/Card.tsx                       ~120 lines — single card with pip pattern + back
src/games/blackjack/Card.test.tsx                  ~120 lines — renders rank/suit; pip count; face-down vs face-up
src/games/blackjack/Hand.tsx                       ~50 lines  — fanned-stack of cards with -32px overlap
src/games/blackjack/Hand.test.tsx                  ~60 lines  — renders all cards; respects faceDown index
src/games/blackjack/PIP_LAYOUT.ts                  ~80 lines  — per-rank pip-grid definitions (table-driven)
docs/adr/0027-blackjack-card-style.md
```

**Files modified:** none

### 5.3 PR C — `phase-3-page` (game page + lobby update)

**Goal:** BlackjackPage uses XState + Card components; lobby cabinet flips to playable.

**Files added:**

```
src/games/blackjack/BlackjackPage.tsx              ~200 lines — wires GameShell + machine + Card components
src/games/blackjack/BlackjackPage.test.tsx         ~180 lines — end-to-end render + interaction tests
src/games/blackjack/DealerArea.tsx                 ~40 lines
src/games/blackjack/PlayerArea.tsx                 ~80 lines  — N hands, active-hand highlight
src/games/blackjack/ActionPanel.tsx                ~60 lines
src/games/blackjack/InsurancePrompt.tsx            ~50 lines
```

**Files modified:**

```
src/router.tsx                              # /play/blackjack: StubGamePage → BlackjackPage
src/pages/lobby/CabinetCarousel.tsx         # Blackjack: stub → playable; remove phase=3 tag
src/components/Sidebar.tsx                  # Move NEW badge from Coin Flip → Blackjack
docs/risks.md                               # +R-38..R-40 (UI-specific)
```

After PR C merges, a `chore(release): v0.4-blackjack` PR adds CHANGELOG and tags. Plus probably an update for "Coin Flip remains in lobby as game #5" — verify it's still in CabinetCarousel.

## 6. File contents — verbatim drafts (key files)

This section excerpts the most consequential files. The rest follow the patterns established in Phases 0-2.

### 6.1 `src/games/blackjack/types.ts`

```ts
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** True after the card is revealed (dealer's hole card flips to true). */
  readonly faceUp: boolean;
}

export interface Hand {
  readonly cards: readonly Card[];
  /** True if this hand was created by splitting (cannot blackjack). */
  readonly fromSplit: boolean;
  /** True if this hand was a result of splitting Aces (only one card each, no further actions). */
  readonly fromSplitAces: boolean;
  /** True after the player commits a DOUBLE on this hand. */
  readonly doubled: boolean;
  /** Bet handle id from wallet.placeBet for this specific hand. */
  readonly betHandleId: string;
  /** Bet amount on this specific hand (including double if doubled). */
  readonly betAmount: number;
  /** True if player has finished acting on this hand (stand, bust, or 21 reached). */
  readonly resolved: boolean;
}

export type HandTotal = { value: number; soft: boolean }; // soft means contains an Ace counted as 11

export type Action = 'hit' | 'stand' | 'double' | 'split';

export type Outcome =
  | 'player-blackjack' // 3:2 payout
  | 'player-win' // 1:1
  | 'push' // 1:1 of bet returned
  | 'player-loss' // 0
  | 'player-bust'; // 0 (subset of loss; tracked separately for stats)

export interface HandResult {
  readonly handIdx: number;
  readonly outcome: Outcome;
  readonly playerTotal: number;
  readonly dealerTotal: number;
  /** Payout (gross return to player including bet). */
  readonly payout: number;
}

export type InsuranceOutcome = 'not-offered' | 'declined' | 'won' | 'lost';

export interface BlackjackRoundDetails {
  readonly dealerCards: readonly Card[]; // all face-up at end of round
  readonly hands: ReadonlyArray<{
    readonly cards: readonly Card[];
    readonly bet: number;
    readonly doubled: boolean;
    readonly fromSplit: boolean;
    readonly fromSplitAces: boolean;
    readonly outcome: Outcome;
    readonly payout: number;
  }>;
  readonly insurance: {
    readonly status: InsuranceOutcome;
    readonly bet: number; // 0 if not taken
    readonly payout: number; // gross return to player from insurance
  };
  /** All bet handle IDs placed during this round (for traceability; see ADR-0028). */
  readonly betHandleIds: readonly string[];
  /** Configuration snapshot (rules in effect at the time of the round, for replay/audit). */
  readonly config: {
    readonly h17: boolean;
    readonly maxHands: number;
    readonly das: boolean;
  };
}
```

### 6.2 `src/games/blackjack/cards.ts`

```ts
import { shuffle } from '@/systems/rng';
import type { Card, Rank, Suit } from './types';

const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];

/** A multi-deck shoe of `decks * 52` cards. Caller is responsible for shuffling. */
export function buildShoe(decks = 6): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, faceUp: true });
      }
    }
  }
  return cards;
}

/** Builds a fresh shuffled shoe of 6 decks. */
export function freshShoe(decks = 6): Card[] {
  return shuffle(buildShoe(decks));
}

/** Mutating draw — removes and returns the top card of the shoe. Throws if empty. */
export function drawCard(shoe: Card[]): Card {
  const c = shoe.pop();
  if (!c) throw new RangeError('drawCard: shoe is empty');
  return c;
}

/** True when the shoe has had `cutAt` or more cards dealt (cutAt = position of the cut card,
 *  measured from the START of the original 6-deck shoe). Triggers reshuffle BEFORE next round. */
export function needsReshuffle(shoe: Card[], originalSize: number, cutAt: number): boolean {
  const dealt = originalSize - shoe.length;
  return dealt >= cutAt;
}
```

### 6.3 `src/games/blackjack/hand.ts`

```ts
import type { Card, Hand, HandTotal } from './types';

/** Compute hand value, choosing the best (highest, not busting) Ace interpretation.
 *  Returns the value AND whether it's "soft" (contains an Ace counted as 11). */
export function handTotal(cards: readonly Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K' || c.rank === '10') {
      total += 10;
    } else {
      total += Number.parseInt(c.rank, 10);
    }
  }
  // Convert Aces from 11 to 1 as needed to avoid busting.
  let acesAsEleven = aces;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }
  return { value: total, soft: acesAsEleven > 0 };
}

export function isBust(cards: readonly Card[]): boolean {
  return handTotal(cards).value > 21;
}

/** A natural blackjack: exactly 2 cards, totaling 21, not from a split. */
export function isNaturalBlackjack(hand: Hand): boolean {
  if (hand.fromSplit) return false;
  if (hand.cards.length !== 2) return false;
  return handTotal(hand.cards).value === 21;
}

/** Player can split if hand has exactly 2 cards of the same rank
 *  (10-value cards can split with each other: 10-J, J-Q, etc., per common house rule). */
export function canSplit(hand: Hand, currentHandCount: number, maxHands: number): boolean {
  if (hand.cards.length !== 2) return false;
  if (currentHandCount >= maxHands) return false;
  if (hand.fromSplitAces) return false; // split aces can't resplit
  const [a, b] = hand.cards;
  if (!a || !b) return false;
  return rankValue(a.rank) === rankValue(b.rank);
}

function rankValue(rank: string): number {
  if (rank === 'A') return 11;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 10;
  return Number.parseInt(rank, 10);
}

/** Player can double on a 2-card hand. Can double after split if DAS is enabled.
 *  Split-Ace hands cannot double (no further actions). */
export function canDouble(hand: Hand, dasEnabled: boolean): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.doubled) return false;
  if (hand.fromSplitAces) return false;
  if (hand.fromSplit && !dasEnabled) return false;
  return true;
}
```

### 6.4 `src/games/blackjack/dealer.ts`

```ts
import { handTotal } from './hand';
import type { Card } from './types';

/** H17: dealer hits on soft 17 (e.g. A-6, A-2-4), stands on hard 17 and higher. */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  const total = handTotal(cards);
  if (total.value < 17) return true;
  if (total.value === 17 && total.soft) return true; // H17 rule
  return false;
}
```

### 6.5 `src/games/blackjack/settle.ts`

```ts
import { handTotal, isBust, isNaturalBlackjack } from './hand';
import type {
  BlackjackRoundDetails,
  Card,
  Hand,
  HandResult,
  InsuranceOutcome,
  Outcome,
} from './types';

/** Compute the outcome and payout for a single player hand vs the dealer's final hand. */
export function settlePlayerHand(hand: Hand, dealerCards: readonly Card[]): HandResult {
  const playerTotal = handTotal(hand.cards).value;
  const dealerTotal = handTotal(dealerCards).value;
  const dealerBust = dealerTotal > 21;
  const playerBust = playerTotal > 21;
  const dealerHasBJ = dealerCards.length === 2 && dealerTotal === 21;
  const playerHasBJ = isNaturalBlackjack(hand);

  let outcome: Outcome;
  let payout: number;

  if (playerBust) {
    outcome = 'player-bust';
    payout = 0;
  } else if (dealerBust) {
    outcome = 'player-win';
    payout = hand.betAmount * 2; // bet back + 1:1 winnings
  } else if (playerHasBJ && !dealerHasBJ) {
    outcome = 'player-blackjack';
    // 3:2 payout, round bet up to nearest even before applying (see ADR-0025).
    const winnings = Math.ceil(hand.betAmount / 2) * 3;
    payout = hand.betAmount + winnings;
  } else if (dealerHasBJ && !playerHasBJ) {
    outcome = 'player-loss';
    payout = 0;
  } else if (playerTotal > dealerTotal) {
    outcome = 'player-win';
    payout = hand.betAmount * 2;
  } else if (playerTotal === dealerTotal) {
    outcome = 'push';
    payout = hand.betAmount;
  } else {
    outcome = 'player-loss';
    payout = 0;
  }

  return {
    handIdx: 0, // caller fills
    outcome,
    playerTotal,
    dealerTotal,
    payout,
  };
}

/** Aggregate per-hand results + insurance into the single round payload that wallet.settleRound expects. */
export function buildRoundDetails(input: {
  dealerCards: readonly Card[];
  hands: readonly Hand[];
  insurance: { status: InsuranceOutcome; bet: number; payout: number };
  betHandleIds: readonly string[];
  config: BlackjackRoundDetails['config'];
}): {
  /** Aggregate betAmount across all hands + insurance (chips placed). */
  totalBet: number;
  /** Aggregate payout across all hands + insurance (chips returned). */
  totalPayout: number;
  /** Highest-priority outcome for the wallet's `Round.outcome` field. */
  primaryOutcome: 'win' | 'loss' | 'push';
  details: BlackjackRoundDetails;
} {
  const handResults = input.hands.map((h, i) => ({
    ...settlePlayerHand(h, input.dealerCards),
    handIdx: i,
  }));

  const handsTotal = input.hands.reduce((acc, h) => acc + h.betAmount, 0);
  const handPayouts = handResults.reduce((acc, r) => acc + r.payout, 0);
  const totalBet = handsTotal + input.insurance.bet;
  const totalPayout = handPayouts + input.insurance.payout;

  // Primary outcome: 'win' if net > 0; 'push' if net == 0; 'loss' if net < 0.
  const net = totalPayout - totalBet;
  const primaryOutcome: 'win' | 'loss' | 'push' = net > 0 ? 'win' : net < 0 ? 'loss' : 'push';

  const details: BlackjackRoundDetails = {
    dealerCards: input.dealerCards,
    hands: input.hands.map((h, i) => ({
      cards: h.cards,
      bet: h.betAmount,
      doubled: h.doubled,
      fromSplit: h.fromSplit,
      fromSplitAces: h.fromSplitAces,
      outcome: handResults[i]!.outcome,
      payout: handResults[i]!.payout,
    })),
    insurance: input.insurance,
    betHandleIds: input.betHandleIds,
    config: input.config,
  };

  return { totalBet, totalPayout, primaryOutcome, details };
}
```

### 6.6 `src/games/blackjack/config.ts`

```ts
export const BLACKJACK_CONFIG = {
  /** Hit-on-soft-17 (true) vs Stand-on-all-17 (false). */
  H17: true,
  /** Maximum number of hands per round (resplit). */
  MAX_HANDS: 4,
  /** Double after split allowed. */
  DAS: true,
  /** Number of decks in the shoe. */
  DECKS: 6,
  /** Cut card position (cards dealt from start of shoe before reshuffle). */
  CUT_CARD_AT: 156,
  /** Min bet per hand. */
  MIN_BET: 5,
  /** Max bet per hand. */
  MAX_BET: 1_000,
  /** Insurance bet is half the main bet, pays 2:1 on dealer natural BJ. */
  INSURANCE_RATIO: 0.5,
  INSURANCE_PAYOUT_MULTIPLIER: 3, // bet+winnings = 3x insurance bet on dealer BJ
} as const;

export type BlackjackConfig = typeof BLACKJACK_CONFIG;
```

### 6.7 `src/games/blackjack/machine.ts` (XState v5 outline)

This is the structural shell. Full implementation is ~280 lines; the spec captures the state diagram and key transition guards.

```ts
import { setup, assign } from 'xstate';
import type { Card, Hand, InsuranceOutcome } from './types';
import { BLACKJACK_CONFIG } from './config';
import { drawCard, freshShoe, needsReshuffle } from './cards';
import { dealerShouldHit } from './dealer';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import { buildRoundDetails } from './settle';

interface Context {
  shoe: Card[];
  shoeOriginalSize: number;
  dealerCards: Card[];
  hands: Hand[];
  activeHandIdx: number;
  insurance: { status: InsuranceOutcome; bet: number; payout: number };
  betAmount: number; // initial main-hand bet
  /** Set by parent (the BlackjackPage) when wallet.placeBet returns. */
  betHandleIds: string[];
  /** Output from the settle event, consumed by the parent to call wallet.settleRound. */
  roundResult?: ReturnType<typeof buildRoundDetails>;
}

export const blackjackMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: 'PLACE_BET'; amount: number }
      | { type: 'BET_PLACED'; betHandleId: string } // from parent after wallet.placeBet OK
      | { type: 'TAKE_INSURANCE'; betHandleId: string }
      | { type: 'DECLINE_INSURANCE' }
      | { type: 'HIT' }
      | { type: 'STAND' }
      | { type: 'DOUBLE'; betHandleId: string } // parent calls placeBet for the additional amount
      | { type: 'SPLIT'; betHandleId: string }
      | { type: 'NEW_ROUND' },
  },
  guards: {
    dealerShowsAce: ({ context }) => context.dealerCards[0]?.rank === 'A',
    dealerHasBlackjack: ({ context }) => {
      const t = handTotal(context.dealerCards);
      return context.dealerCards.length === 2 && t.value === 21;
    },
    playerHasBlackjack: ({ context }) =>
      context.hands.length === 1 && isNaturalBlackjack(context.hands[0]!),
    canHitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx]!;
      return !h.resolved && !h.fromSplitAces;
    },
    allHandsResolved: ({ context }) => context.hands.every((h) => h.resolved),
    allHandsBust: ({ context }) => context.hands.every((h) => isBust(h.cards)),
    canDoubleActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx]!;
      return canDouble(h, BLACKJACK_CONFIG.DAS);
    },
    canSplitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx]!;
      return canSplit(h, context.hands.length, BLACKJACK_CONFIG.MAX_HANDS);
    },
  },
  actions: {
    initShoe: assign(({ context }) => {
      if (
        context.shoe.length === 0 ||
        needsReshuffle(context.shoe, context.shoeOriginalSize, BLACKJACK_CONFIG.CUT_CARD_AT)
      ) {
        const fresh = freshShoe(BLACKJACK_CONFIG.DECKS);
        return { shoe: fresh, shoeOriginalSize: fresh.length };
      }
      return {};
    }),
    dealOpening: assign(({ context }) => {
      const shoe = [...context.shoe];
      const p1 = drawCard(shoe);
      const d1 = drawCard(shoe);
      const p2 = drawCard(shoe);
      const d2 = { ...drawCard(shoe), faceUp: false }; // hole card
      const initialHand: Hand = {
        cards: [p1, p2],
        fromSplit: false,
        fromSplitAces: false,
        doubled: false,
        betHandleId: context.betHandleIds[0] ?? '',
        betAmount: context.betAmount,
        resolved: false,
      };
      return {
        shoe,
        dealerCards: [d1, d2],
        hands: [initialHand],
        activeHandIdx: 0,
      };
    }),
    revealHoleCard: assign(({ context }) => ({
      dealerCards: context.dealerCards.map((c, i) => (i === 1 ? { ...c, faceUp: true } : c)),
    })),
    dealerHit: assign(({ context }) => {
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      return {
        shoe,
        dealerCards: [...context.dealerCards, c],
      };
    }),
    hitActive: assign(({ context }) => {
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      const hands = context.hands.map((h, i) =>
        i === context.activeHandIdx ? { ...h, cards: [...h.cards, c] } : h,
      );
      // If active hand busts or reaches 21, mark resolved.
      const active = hands[context.activeHandIdx]!;
      const total = handTotal(active.cards).value;
      if (total >= 21) {
        hands[context.activeHandIdx] = { ...active, resolved: true };
      }
      return { shoe, hands };
    }),
    standActive: assign(({ context }) => {
      const hands = context.hands.map((h, i) =>
        i === context.activeHandIdx ? { ...h, resolved: true } : h,
      );
      return { hands };
    }),
    // ... actions for DOUBLE, SPLIT, settle, etc. (full content in PR A)
  },
}).createMachine({
  id: 'blackjack',
  initial: 'betting',
  context: ({ input }) => ({
    shoe: [],
    shoeOriginalSize: 0,
    dealerCards: [],
    hands: [],
    activeHandIdx: 0,
    insurance: { status: 'not-offered', bet: 0, payout: 0 },
    betAmount: 0,
    betHandleIds: [],
  }),
  states: {
    betting: {
      on: {
        PLACE_BET: {
          target: 'awaiting_bet_handle',
          actions: assign(({ event }) => ({ betAmount: event.amount })),
        },
      },
    },
    awaiting_bet_handle: {
      on: {
        BET_PLACED: {
          target: 'dealing',
          actions: assign(({ event }) => ({ betHandleIds: [event.betHandleId] })),
        },
      },
    },
    dealing: {
      entry: ['initShoe', 'dealOpening'],
      always: [
        // If dealer shows Ace, offer insurance before peek
        { guard: 'dealerShowsAce', target: 'insurance_prompt' },
        // If dealer up is 10-value, silent peek for BJ
        { target: 'checking_naturals' },
      ],
    },
    insurance_prompt: {
      on: {
        TAKE_INSURANCE: {
          target: 'checking_naturals',
          // ...assign insurance bet + add handle to betHandleIds
        },
        DECLINE_INSURANCE: {
          target: 'checking_naturals',
        },
      },
    },
    checking_naturals: {
      entry: ['revealHoleCard'],
      always: [
        {
          guard: 'dealerHasBlackjack',
          target: 'settling' /* resolves all hands as loss or push */,
        },
        { guard: 'playerHasBlackjack', target: 'settling' /* player BJ pays 3:2 */ },
        { target: 'player_action' },
      ],
    },
    player_action: {
      on: {
        HIT: { actions: ['hitActive'], target: 'check_after_action' },
        STAND: { actions: ['standActive'], target: 'check_after_action' },
        DOUBLE: { guard: 'canDoubleActive', /* ... */ target: 'check_after_action' },
        SPLIT: { guard: 'canSplitActive', /* ... */ target: 'check_after_action' },
      },
    },
    check_after_action: {
      always: [
        { guard: 'allHandsResolved', guard: 'allHandsBust', target: 'settling' },
        { guard: 'allHandsResolved', target: 'dealer_action' },
        { /* advance to next unresolved hand */ target: 'player_action' },
      ],
    },
    dealer_action: {
      always: [
        { /* dealer must hit per H17 */ actions: 'dealerHit', target: 'dealer_action' },
        { target: 'settling' },
      ],
    },
    settling: {
      entry: assign(({ context }) => ({
        roundResult: buildRoundDetails({
          dealerCards: context.dealerCards,
          hands: context.hands,
          insurance: context.insurance,
          betHandleIds: context.betHandleIds,
          config: {
            h17: BLACKJACK_CONFIG.H17,
            maxHands: BLACKJACK_CONFIG.MAX_HANDS,
            das: BLACKJACK_CONFIG.DAS,
          },
        }),
      })),
      // Page subscribes to context.roundResult and calls wallet.settleRound, then sends NEW_ROUND
      on: {
        NEW_ROUND: {
          target: 'betting',
          actions: assign({
            /* reset round-local context */
          }),
        },
      },
    },
  },
});
```

(Full XState machine in PR A; this excerpt shows the structure + state diagram.)

### 6.8 `src/games/blackjack/Card.tsx` and `Hand.tsx`

The Card component takes `{ card: Card | null; faceDown?: boolean }` and renders the formal-pip layout with neon glow + gold inset border + gradient background. The Hand component takes `{ cards: Card[]; faceDownIdx?: number }` and renders the fanned stack. Verbatim contents track the v2/back mockups; see PR B for the full files.

### 6.9 `src/games/blackjack/BlackjackPage.tsx` (~200 lines)

```tsx
import type { JSX } from 'react';
import { useActor } from '@xstate/react';
import { useCallback, useEffect } from 'react';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance, useWalletStore } from '@/store/walletStore';
import { blackjackMachine } from './machine';
import { BLACKJACK_CONFIG } from './config';
import DealerArea from './DealerArea';
import PlayerArea from './PlayerArea';
import ActionPanel from './ActionPanel';
import InsurancePrompt from './InsurancePrompt';
import type { RecentResultItem } from '@/games/_shared/RecentResults';
import type { BlackjackRoundDetails } from './types';

export default function BlackjackPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const placeBet = useWalletStore((s) => s.placeBet);
  const settleRound = useWalletStore((s) => s.settleRound);
  const rounds = useRecentRounds(user?.id, 'blackjack', 12);

  const [state, send] = useActor(blackjackMachine);

  // Bridge: when machine wants a bet placed, call wallet then send BET_PLACED.
  useEffect(() => {
    // wired per-state in PR C
  }, [state.value]);

  // Settle bridge: when machine enters 'settling', call wallet.settleRound once with aggregate.
  useEffect(() => {
    if (state.matches('settling') && state.context.roundResult) {
      // call wallet.settleRound with first bet handle + aggregate result
      // then send NEW_ROUND
    }
  }, [state, settleRound, send]);

  // ... handlers for PLACE_BET, HIT, STAND, DOUBLE, SPLIT, TAKE_INSURANCE, DECLINE_INSURANCE

  if (!user) return null;

  const items: RecentResultItem[] = rounds.map((r) => {
    const d = r.details as BlackjackRoundDetails;
    const anyBJ = d.hands.some((h) => h.outcome === 'player-blackjack');
    return {
      key: r.id,
      badgeText: anyBJ ? 'BJ' : r.outcome === 'win' ? 'W' : r.outcome === 'loss' ? 'L' : 'P',
      badgeColor: anyBJ
        ? '#ffe066'
        : r.outcome === 'win'
          ? '#3dd17a'
          : r.outcome === 'loss'
            ? '#7a1f2b'
            : '#7a7a7a',
      badgeTextColor: anyBJ || r.outcome === 'win' ? '#06120c' : '#fff',
      betLabel: String(r.betAmount),
      netChips: r.netChange,
      accent: r.outcome,
    };
  });

  return (
    <GameShell
      title="🃏 BLACKJACK"
      meta="3:2 BJ · H17 · 5–1000"
      recentItems={items}
      bettingPanel={
        state.matches('betting') ? (
          <BettingPanel
            min={BLACKJACK_CONFIG.MIN_BET}
            max={BLACKJACK_CONFIG.MAX_BET}
            balance={balance}
            onCommit={(amount) => send({ type: 'PLACE_BET', amount })}
            callButtons={() => null}
          />
        ) : state.matches('insurance_prompt') ? (
          <InsurancePrompt
            bet={state.context.betAmount}
            onTake={() => {
              /* place insurance bet then send TAKE_INSURANCE */
            }}
            onDecline={() => send({ type: 'DECLINE_INSURANCE' })}
          />
        ) : (
          <ActionPanel
            state={state}
            send={send}
            balance={balance}
            config={BLACKJACK_CONFIG}
            placeBet={placeBet}
            userId={user.id}
          />
        )
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <DealerArea cards={state.context.dealerCards} />
        <div className="h-px w-[420px] border-t border-dashed border-gold/20" />
        <PlayerArea
          hands={state.context.hands}
          activeHandIdx={state.context.activeHandIdx}
          inSettlement={state.matches('settling') || state.matches('settled')}
        />
      </div>
    </GameShell>
  );
}
```

(Sub-components like `DealerArea`, `PlayerArea`, `ActionPanel`, `InsurancePrompt` are straightforward presentations of the spec data; full verbatim in PR C.)

### 6.10 Routing change

`src/router.tsx` — replace:

```tsx
{ path: 'play/blackjack', element: <StubGamePage game="blackjack" phase={3} /> },
```

with:

```tsx
{ path: 'play/blackjack', element: <BlackjackPage /> },
```

Add import `import BlackjackPage from '@/games/blackjack/BlackjackPage';`.

### 6.11 Lobby cabinet update

`src/pages/lobby/CabinetCarousel.tsx` — change the Blackjack cabinet entry from:

```tsx
{ to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'stub', phase: 3 },
```

to:

```tsx
{ to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'playable' },
```

This makes the BLACKJACK cabinet render in the cyan "PLAY NOW" styling.

### 6.12 Sidebar NEW badge move

`src/components/Sidebar.tsx` — change the GAMES array:

```ts
// Before:
{ to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip', badge: 'NEW' },
{ to: '/play/blackjack', icon: '🃏', label: 'Blackjack', phase: 'P3' },

// After:
{ to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip' },
{ to: '/play/blackjack', icon: '🃏', label: 'Blackjack', badge: 'NEW' },
```

## 7. Test plan

### 7.1 Pure logic (PR A)

| File              | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards.test.ts`   | buildShoe with 6 decks → 312 cards, 4 suits × 13 ranks × 6 copies each; `drawCard` empty throws; `needsReshuffle` triggers at exactly cutAt cards dealt; freshShoe shuffles (deterministic under seed). ~8 tests.                                                                                                                                                                                                                                                                               |
| `hand.test.ts`    | `handTotal` for: empty hand → 0; pair → sum; Ace alone → 11 soft; A-A → 12 soft; A-K → 21 soft (BJ); A-7 → 18 soft; A-7-5 → 13 hard; multiple aces collapse correctly. `isNaturalBlackjack` for A-K (yes), A-10 from split (no), K-A-Q (no, 3 cards). `canSplit` for matched ranks, mismatched ranks, mixed 10-values (10-J, 10-K, J-Q), already-split-Aces (no), at max hands (no). `canDouble` for 2-card hand (yes), 3+ cards (no), split-Ace (no), DAS-disabled+from-split (no). ~20 tests. |
| `dealer.test.ts`  | `dealerShouldHit`: hard 16 → hit; hard 17 → stand; soft 17 (A-6) → hit (H17 rule); soft 18 → stand; bust threshold; over-21 → don't hit (irrelevant); single-card edge case. ~10 tests.                                                                                                                                                                                                                                                                                                         |
| `settle.test.ts`  | All Outcome cases × multiple bet amounts; insurance won (dealer BJ + insurance taken); insurance lost (no dealer BJ + insurance taken); push on BJ-vs-BJ; multi-hand round (one wins, one loses) aggregate; split-Aces 21 pays 1:1 not 3:2; double down win pays out 2x bet (4x doubled); odd-bet BJ rounding (bet 5 → winnings 9). ~25 tests.                                                                                                                                                  |
| `machine.test.ts` | XState transition tests using `@xstate/test` or direct interpreter assertions: betting → PLACE_BET → awaiting_bet_handle; BET_PLACED → dealing → checking_naturals (when dealer non-Ace); dealer Ace → insurance_prompt; TAKE_INSURANCE → checking_naturals; player BJ + dealer non-Ace → settling with 3:2; HIT to bust → resolved; STAND → advance to next hand; SPLIT → 2 hands; resplit to 3 hands; max-hands guard; DOUBLE on first hand → resolved with doubled flag. ~25 tests.          |

Total PR A: ~88 tests.

### 7.2 Components (PR B)

| File            | Tests                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Card.test.tsx` | Renders rank corner + suit; faceDown shows back; pip pattern for non-court cards; court card (K/Q/J) shows framed letter; Ace shows single large pip; red suits use red text; classNames for glow per suit color. ~12 tests. |
| `Hand.test.tsx` | Renders all cards; faceDownIdx renders that index as back; empty hand renders nothing; stack overlap classes applied. ~5 tests.                                                                                              |

Total PR B: ~17 tests.

### 7.3 Page integration (PR C)

| File                     | Tests                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlackjackPage.test.tsx` | Renders initial betting state; PLACE BET deals 4 cards (2 player + 2 dealer); dealer hole card face down; HIT adds a card to active hand; STAND advances; insurance prompt appears on dealer Ace; settling triggers wallet.settleRound; recentResults rail updates after round. End-to-end seeded RNG: bet → call → resolve → balance reflects payout. ~12 tests. |

Total PR C: ~12 tests.

**Test count after Phase 3:** ~165 baseline (Phase 2) + 88 + 17 + 12 = **~282**.

Coverage gates: `src/games/blackjack/**/*.ts` (non-test) at 90% (per ADR-0003 for game logic). `src/games/blackjack/**/*.tsx` UI at 80% (component coverage).

## 8. ADRs introduced in Phase 3

| ID   | Title                                                                                                    | PR  |
| ---- | -------------------------------------------------------------------------------------------------------- | --- |
| 0021 | Blackjack: H17 (dealer hits soft 17)                                                                     | A   |
| 0022 | Blackjack: Split rules — max 4 hands, DAS, standard split-Aces                                           | A   |
| 0023 | Blackjack: Insurance bet included                                                                        | A   |
| 0024 | Blackjack: 6-deck shoe with 50% penetration cut card                                                     | A   |
| 0025 | Blackjack: 5-1000 bet range; round-bet-up-to-even for BJ 3:2 rounding                                    | A   |
| 0026 | Blackjack: round state via XState v5 machine                                                             | A   |
| 0027 | Blackjack: card visual style (formal pip + neon glow + gold border; pinstripe back)                      | B   |
| 0028 | Blackjack: multi-hand wallet pattern — N placeBet calls, ONE settleRound call with aggregate RoundResult | A   |

## 9. Risk register additions

Append to `docs/risks.md`:

| ID   | Risk                                                                                             | Phase | L   | I   | Mitigation                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------ | ----- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-32 | XState v5 API shift in a future minor version breaks our machine                                 | 3+    | L   | M   | Pin to specific minor; integration tests catch breakage; XState v5 is stable as of 2025.                                                                               |
| R-33 | Soft-17 detection bug (e.g. A-3-3 misidentified as hard 17)                                      | 3     | M   | H   | Exhaustive `dealer.test.ts` cases + `hand.test.ts` with all multi-ace combos.                                                                                          |
| R-34 | Insurance payout miscomputed on dealer BJ (settles main bet AND insurance correctly)             | 3     | M   | M   | Dedicated tests in `settle.test.ts` for all insurance+main-hand outcome combos.                                                                                        |
| R-35 | Reshuffle never triggers (off-by-one in needsReshuffle)                                          | 3     | L   | M   | Test asserts exact cutAt boundary triggers reshuffle.                                                                                                                  |
| R-36 | Splits to 4 hands consume more shoe than expected; mid-round shoe exhaustion                     | 3     | L   | H   | drawCard throws; test that no round can plausibly exhaust a 6-deck shoe (max ~30 cards per round with max splits + max hits).                                          |
| R-37 | Multi-hand wallet pattern: a placeBet for split fails (insufficient_chips) after main bet placed | 3     | M   | M   | Wallet placeBet for split occurs at SPLIT action time; if it fails, we surface the error and prevent the split (machine guard checks balance before SPLIT transition). |
| R-38 | Animation glitch on hole-card flip (Framer Motion + state change race)                           | 3     | L   | L   | Card component uses `<motion.div animate={{ rotateY: ... }}>` with explicit transition; tested visually.                                                               |
| R-39 | Multi-hand layout overflows at narrow viewport (<1024px)                                         | 3     | M   | L   | CSS scrollable container at the player area; documented in `docs/dev-setup.md`.                                                                                        |
| R-40 | "BJ" badge in RecentResults shows for split-Ace 21 by accident                                   | 3     | L   | L   | `BlackjackRoundDetails.hands[i].outcome` distinguishes `player-blackjack` from `player-win` 21; UI mapping checks the specific outcome.                                |

## 10. GitHub project setup

Phase 3 milestone already exists from Phase 0 setup (milestone #4). Create 4 issues for the 3 PRs + release:

```bash
PHASE_3_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 3 — Blackjack") | .number')

gh issue create --milestone "Phase 3 — Blackjack" --label "phase-3,tooling,tests" \
  --title "[Phase 3] PR A — Logic + XState machine + tests + 7 ADRs" \
  --body "Pure logic: cards/hand/dealer/settle. XState machine. 88 new tests. ADRs 0021-0026, 0028. BUILD_GUIDE §8.1 rule updates. R-32..R-37 risks. See spec §5.1."

gh issue create --milestone "Phase 3 — Blackjack" --label "phase-3,tooling" \
  --title "[Phase 3] PR B — Card + Hand components + pip layout + ADR-0027" \
  --body "Pure visual components: formal pip-pattern Card with neon glow + gold border + pinstripe back. ~17 tests. ADR-0027. See spec §5.2."

gh issue create --milestone "Phase 3 — Blackjack" --label "phase-3,tooling" \
  --title "[Phase 3] PR C — BlackjackPage + lobby upgrade + routing" \
  --body "BlackjackPage wires GameShell + machine + Cards. Lobby cabinet flips stub→playable. Sidebar NEW badge moves to Blackjack. R-38..R-40 risks. See spec §5.3."

gh issue create --milestone "Phase 3 — Blackjack" --label "phase-3,chore" \
  --title "[Phase 3] Tag v0.4-blackjack release after PR C merges" \
  --body "chore(release) PR + tag + GH release + close milestone."
```

## 11. Manual smoke test plan per PR

### PR A

- `pnpm test:run` — all new logic+machine tests pass.
- No UI changes; `/play/blackjack` still shows StubGamePage.

### PR B

- `pnpm test:run` — all new component tests pass.
- Storybook-style preview: temporarily render Card and Hand on a dev-only page to visually inspect (delete before PR). OR use `pnpm dev` + Vite + isolate via a test route. Optional; tests cover behavior.

### PR C (the full Phase 3 acceptance smoke)

```bash
pnpm dev
```

Then in the browser:

1. Login → lobby → see Blackjack cabinet in cyan "PLAY NOW" styling (no longer dimmed P3 stub).
2. Sidebar shows "NEW" badge next to Blackjack (not Coin Flip).
3. Click Blackjack → /play/blackjack → game page renders.
4. BettingPanel shows; click chip denominations to build bet of 25; PLACE BET.
5. Two player cards + dealer's up card + face-down hole card appear. Hand totals shown.
6. If dealer up card is Ace → InsurancePrompt appears → click DECLINE → continue.
7. Click HIT → card added to player hand → total updates. Bust if over 21.
8. Click STAND → dealer reveals hole card → dealer hits per H17 rule → settled.
9. Win/loss/push pill appears. RecentResults rail gains an entry with W/L/P/BJ pill.
10. DevTools → Application → IndexedDB → `MASQUER` → `rounds` table has a new row with `game='blackjack'` and `details.hands[]` populated.
11. Place a bet → if dealt a pair (e.g. 8-8), SPLIT button enables → click → 2 hands appear side-by-side → play each.
12. Bet larger amount → if dealt 11 against dealer non-10, DOUBLE button enables → click → exactly one card dealt → hand resolved.
13. Test the insurance flow: get an Ace as dealer up → TAKE → 25 chips deducted (assuming 50 bet) → if dealer has BJ, insurance pays 50 + main bet lost; if not, insurance lost + round proceeds normally.

## 12. Definition of Done — Phase 3

**Repository state**

- [ ] All files in §5 (3-PR inventory) on `main`
- [ ] `grep -R "Math.random" src/` returns zero hits
- [ ] No file in `src/pages/**` or `src/components/**` directly imports from `src/db/**`
- [ ] BUILD_GUIDE.md §8.1 updated per §13 of this spec

**Tooling state**

- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm dev` serves; the 13-step PR C smoke passes
- [ ] `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check` all exit 0
- [ ] Coverage ≥ 90% on `src/games/blackjack/**/*.ts` (non-test), ≥ 80% on `src/games/blackjack/**/*.tsx` (UI)
- [ ] Bundle size recorded in PR C description

**Functional state (BUILD_GUIDE §12 row 3 + extensions)**

- [ ] Player can place bet, deal cards, hit/stand/double/split
- [ ] H17 rule observed in dealer auto-play
- [ ] Natural blackjack pays 3:2 (with even-bet rounding for odd bets)
- [ ] Push on equal totals returns bet
- [ ] Bust loses bet
- [ ] Split up to 4 hands; split-Aces get one card each
- [ ] DAS allowed
- [ ] Insurance prompt on dealer Ace; pays 2:1 on dealer BJ
- [ ] Round details written to `rounds` table; `details` JSON has full hands + insurance

**GitHub state**

- [ ] All 4 Phase 3 issues closed
- [ ] Tag `v0.4-blackjack` exists and is the latest release
- [ ] Phase 3 milestone closed
- [ ] CHANGELOG `[v0.4-blackjack]` entry added

**ADR state**

- [ ] ADRs 0021–0028 present and Accepted

## 13. BUILD_GUIDE.md edits required (in PR A)

In §8.1, update the dealer rule line:

- Before: `Dealer plays after the player: hits until 17 or higher (dealer stands on all 17s — pick one rule and document it; "stand on soft 17" is standard).`
- After: `Dealer plays after the player: hits until 17 or higher. **Dealer hits on soft 17 (H17)** (ADR-0021). House edge ~0.2% higher than S17.`

Add a bullet under §8.1 actions:

- `**Insurance** (when dealer shows Ace, before dealer peeks): half the main bet, pays 2:1 if dealer has natural blackjack (ADR-0023).`

Add a bullet under §8.1 outcomes:

- `Split: up to 4 total hands; split-Aces get one card each and cannot resplit or double (ADR-0022). DAS (double after split) allowed.`

Add the rounding rule note:

- `BJ 3:2 payout rounding: when bet is odd, the bet is rounded UP to the nearest even number before applying 3:2. Formula: winnings = Math.ceil(bet/2) × 3 (ADR-0025).`

## 14. Rollback procedure

- **Bad merge to main:** revert via PR (`git revert -m 1`).
- **XState machine bug causes stuck state:** in BlackjackPage, add a "Force New Round" emergency button that resets the machine to `betting` state. Phase 8 polish if needed; not required for Phase 3.
- **Card visuals broken under specific viewport:** Tailwind responsive utilities should handle; if not, scoped fix.
- **Cut card off-by-one:** add a smoke-test bash script that plays 100 rounds and counts shoe operations.

## 15. Release procedure

After PR C merges:

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.4-blackjack
# Update CHANGELOG.md
git add CHANGELOG.md
git commit -m "chore(release): v0.4-blackjack"
gh pr create --title "chore(release): v0.4-blackjack" --body "Tags Phase 3 completion. See CHANGELOG.md."
# After CI green + merge:
git checkout main && git pull --ff-only
git tag -a v0.4-blackjack -m "Phase 3 — Blackjack complete"
git push origin v0.4-blackjack
gh release create v0.4-blackjack --title "v0.4-blackjack" --notes-file CHANGELOG.md --latest
gh issue close $(gh issue list --milestone "Phase 3 — Blackjack" --state open --json number --jq '.[].number')
PHASE_3_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 3 — Blackjack") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_3_MS -f state=closed
```

## 16. Handoff to Phase 4

Once `v0.4-blackjack` is tagged, Phase 4 (Roulette) inherits:

1. **XState pattern established.** Roulette has fewer states than Blackjack (just "betting → spinning → settled") but the XState approach is now familiar.
2. **Card components** can be reused if any cards involved (they're not in Roulette, but the pattern of "game-specific component file" is established).
3. **Multi-bet pattern from ADR-0028:** Roulette allows multiple bets per round (e.g. straight up + red + dozen). Same wallet pattern: N placeBet calls, ONE settleRound aggregating winnings.
4. **Lobby cabinet template:** flip Roulette stub → playable; move NEW badge from Blackjack → Roulette.
5. **RecentResults pill mapping:** Roulette uses winning-number chips ("23 RED" green/red).

Phase 4 brainstorming opens with: European wheel (single zero), all bet types from BUILD_GUIDE §8.2, spin animation, wheel visualization.

## 17. Open questions

None blocking. To revisit later:

- Replace court-card placeholders with proper royal SVG art (Phase 8).
- Add a "strategy hint" optional overlay showing basic strategy chart suggestion (Phase 8 or never).
- Add card-deal sounds (Phase 8 polish).
- Surface session win/loss/push count in the RecentResults SESSION strip (currently shows net; could break out outcomes).
- Insurance "even money" auto-shortcut for player-natural + dealer-Ace situations.

---

_End of Phase 3 spec. The next artifact is the implementation plan
(`docs/superpowers/plans/2026-05-17-phase-3-blackjack-plan.md`),
produced by the writing-plans skill after user review of this spec._
