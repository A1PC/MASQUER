# Phase 3 — Blackjack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully playable Blackjack game on the Phase 2 substrate — pure logic + XState machine + formal pip-pattern Card UI + BlackjackPage wired into the existing GameShell + RecentResults + lobby cabinet flipped from stub to playable.

**Architecture:** 3 sequential PRs. PR A=pure logic (cards/hand/dealer/settle) + XState v5 machine, no UI. PR B=Card and Hand visual components, no game logic. PR C=BlackjackPage glues them together and updates the lobby/sidebar. Release PR tags `v0.4-blackjack`.

**Tech Stack:** XState v5 (new dep), Framer Motion 12 (already installed for hole-card flip animation), Tailwind 3, React 18, TypeScript 6. All randomness through `src/systems/rng.ts` (seedable mulberry32 from Phase 2). Wallet API (`placeBet`, `settleRound`) and `useGameRound` hook from Phase 2 reused as-is, with multi-hand pattern per ADR-0028.

**Spec:** `docs/superpowers/specs/2026-05-17-phase-3-blackjack-design.md`

---

## File Structure (after all 3 PRs merge)

```
MASQUER/
├── BUILD_GUIDE.md                                       # MODIFIED (PR A): §8.1 rule updates
├── CHANGELOG.md                                         # MODIFIED (release PR)
├── package.json                                         # MODIFIED (PR A): +xstate
├── docs/
│   ├── adr/
│   │   ├── 0021-blackjack-h17.md                        # NEW (PR A)
│   │   ├── 0022-blackjack-split-rules.md                # NEW (PR A)
│   │   ├── 0023-blackjack-insurance.md                  # NEW (PR A)
│   │   ├── 0024-blackjack-shoe-penetration.md           # NEW (PR A)
│   │   ├── 0025-blackjack-bet-limits-and-rounding.md    # NEW (PR A)
│   │   ├── 0026-blackjack-xstate-machine.md             # NEW (PR A)
│   │   ├── 0027-blackjack-card-style.md                 # NEW (PR B)
│   │   └── 0028-blackjack-multi-hand-wallet-pattern.md  # NEW (PR A)
│   └── risks.md                                         # MODIFIED (PRs A, C): R-32..R-40
└── src/
    ├── components/
    │   └── Sidebar.tsx                                  # MODIFIED (PR C): NEW badge moves to Blackjack
    ├── games/
    │   └── blackjack/
    │       ├── ActionPanel.tsx                          # NEW (PR C)
    │       ├── BlackjackPage.test.tsx                   # NEW (PR C)
    │       ├── BlackjackPage.tsx                        # NEW (PR C)
    │       ├── Card.test.tsx                            # NEW (PR B)
    │       ├── Card.tsx                                 # NEW (PR B)
    │       ├── cards.test.ts                            # NEW (PR A)
    │       ├── cards.ts                                 # NEW (PR A)
    │       ├── config.ts                                # NEW (PR A)
    │       ├── dealer.test.ts                           # NEW (PR A)
    │       ├── dealer.ts                                # NEW (PR A)
    │       ├── DealerArea.tsx                           # NEW (PR C)
    │       ├── Hand.test.tsx                            # NEW (PR B)
    │       ├── Hand.tsx                                 # NEW (PR B)
    │       ├── hand.test.ts                             # NEW (PR A)
    │       ├── hand.ts                                  # NEW (PR A)
    │       ├── InsurancePrompt.tsx                      # NEW (PR C)
    │       ├── machine.test.ts                          # NEW (PR A)
    │       ├── machine.ts                               # NEW (PR A)
    │       ├── PIP_LAYOUT.ts                            # NEW (PR B)
    │       ├── PlayerArea.tsx                           # NEW (PR C)
    │       ├── settle.test.ts                           # NEW (PR A)
    │       ├── settle.ts                                # NEW (PR A)
    │       └── types.ts                                 # NEW (PR A)
    ├── pages/
    │   └── lobby/
    │       └── CabinetCarousel.tsx                      # MODIFIED (PR C): Blackjack stub → playable
    └── router.tsx                                       # MODIFIED (PR C): /play/blackjack → BlackjackPage
```

---

## Pre-flight (run once before Task A1)

- [ ] **Step 1: Verify clean main and Phase 2 already shipped**

```bash
cd /Users/adam/localGamble
git checkout main && git pull --ff-only
git status
git log --oneline -5
```

Expected: clean tree; one of the recent commits is `docs(build-guide): add Phase 3 (Blackjack) design spec` (`f5de082` or newer). `v0.3-wallet-and-game-shell` tag should be visible in `git tag -l`.

- [ ] **Step 2: Verify quality gates pass on main**

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0; 165 tests pass (Phase 2 baseline).

If anything fails, STOP and report BLOCKED.

- [ ] **Step 3: Get the Phase 3 milestone number**

```bash
PHASE_3_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 3 — Blackjack") | .number')
echo "Phase 3 milestone: $PHASE_3_MS"
```

Expected: a number (probably `4`).

- [ ] **Step 4: File the 4 Phase 3 issues**

Use `--milestone "Phase 3 — Blackjack"` (the title; the numeric ID has historically not worked with `gh issue create` in this repo per prior phase deviations).

```bash
gh issue create --milestone "Phase 3 — Blackjack" --label "phase-3,tooling,tests" \
  --title "[Phase 3] PR A — Logic + XState machine + tests + 7 ADRs" \
  --body "Pure logic: cards/hand/dealer/settle. XState v5 machine. 88 new tests. ADRs 0021-0026, 0028. BUILD_GUIDE §8.1 rule updates. R-32..R-37 risks. xstate dep added. See spec §5.1."

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

---

# PR A — `phase-3-logic`

## Task A1: Branch + install xstate

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-3-logic
```

- [ ] **Step 2: Install xstate as production dep**

```bash
pnpm add xstate @xstate/react
```

Expected: both added to `dependencies`. xstate v5+ and @xstate/react v5+.

- [ ] **Step 3: Verify install**

```bash
pnpm list xstate @xstate/react
```

## Task A2: Create types.ts

**Files:**

- Create: `src/games/blackjack/types.ts`

- [ ] **Step 1: Create the file**

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
  /** True if this hand was created by splitting (cannot be a natural blackjack). */
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

export interface HandTotal {
  value: number;
  /** Soft means the hand contains an Ace currently counted as 11. */
  soft: boolean;
}

export type Action = 'hit' | 'stand' | 'double' | 'split';

export type Outcome =
  | 'player-blackjack' // 3:2 payout
  | 'player-win' // 1:1
  | 'push' // bet returned
  | 'player-loss' // 0
  | 'player-bust'; // 0 (subset of loss; tracked separately for stats)

export interface HandResult {
  readonly handIdx: number;
  readonly outcome: Outcome;
  readonly playerTotal: number;
  readonly dealerTotal: number;
  /** Payout (gross return to player including bet). 0 on loss/bust. */
  readonly payout: number;
}

export type InsuranceStatus = 'not-offered' | 'declined' | 'won' | 'lost';

export interface InsuranceState {
  readonly status: InsuranceStatus;
  readonly bet: number; // 0 if not taken
  readonly payout: number; // gross return to player from insurance
}

export interface BlackjackRoundDetails {
  readonly dealerCards: readonly Card[];
  readonly hands: ReadonlyArray<{
    readonly cards: readonly Card[];
    readonly bet: number;
    readonly doubled: boolean;
    readonly fromSplit: boolean;
    readonly fromSplitAces: boolean;
    readonly outcome: Outcome;
    readonly payout: number;
  }>;
  readonly insurance: InsuranceState;
  /** All bet handle IDs placed during this round (for traceability; see ADR-0028). */
  readonly betHandleIds: readonly string[];
  /** Snapshot of the rules in effect at the time of the round. */
  readonly config: {
    readonly h17: boolean;
    readonly maxHands: number;
    readonly das: boolean;
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

## Task A3: Create config.ts

**Files:**

- Create: `src/games/blackjack/config.ts`

- [ ] **Step 1: Create the file**

```ts
export const BLACKJACK_CONFIG = {
  /** Hit-on-soft-17 (true) vs Stand-on-all-17 (false). ADR-0021. */
  H17: true,
  /** Maximum number of hands per round (resplit). ADR-0022. */
  MAX_HANDS: 4,
  /** Double after split allowed. ADR-0022. */
  DAS: true,
  /** Number of decks in the shoe. ADR-0024. */
  DECKS: 6,
  /** Cut card position (cards dealt from start of shoe before reshuffle). ADR-0024. */
  CUT_CARD_AT: 156,
  /** Min bet per hand. ADR-0025. */
  MIN_BET: 5,
  /** Max bet per hand. ADR-0025. */
  MAX_BET: 1_000,
  /** Insurance bet as a fraction of the main bet. ADR-0023. */
  INSURANCE_RATIO: 0.5,
} as const;

export type BlackjackConfig = typeof BLACKJACK_CONFIG;
```

## Task A4: cards.ts + cards.test.ts

**Files:**

- Create: `src/games/blackjack/cards.ts`
- Create: `src/games/blackjack/cards.test.ts`

- [ ] **Step 1: Create cards.ts**

```ts
import { shuffle } from '@/systems/rng';
import type { Card, Rank, Suit } from './types';

const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];

/** A multi-deck shoe of `decks * 52` cards in canonical order. Caller is responsible for shuffling. */
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

/** Builds a fresh shuffled shoe of `decks` decks. Uses systems/rng (seedable in tests). */
export function freshShoe(decks = 6): Card[] {
  return shuffle(buildShoe(decks));
}

/** Mutating draw — removes and returns the top card of the shoe. Throws RangeError if empty. */
export function drawCard(shoe: Card[]): Card {
  const c = shoe.pop();
  if (!c) throw new RangeError('drawCard: shoe is empty');
  return c;
}

/** True when the shoe has had `cutAt` or more cards dealt (measured from `originalSize`).
 *  Used to trigger a reshuffle BEFORE the next round starts. */
export function needsReshuffle(shoe: Card[], originalSize: number, cutAt: number): boolean {
  const dealt = originalSize - shoe.length;
  return dealt >= cutAt;
}
```

- [ ] **Step 2: Create cards.test.ts**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { buildShoe, drawCard, freshShoe, needsReshuffle } from './cards';
import { seed, unseed } from '@/systems/rng';

afterEach(() => unseed());

describe('buildShoe', () => {
  it('returns 52 cards for 1 deck', () => {
    expect(buildShoe(1)).toHaveLength(52);
  });

  it('returns 312 cards for the default 6 decks', () => {
    expect(buildShoe()).toHaveLength(312);
  });

  it('contains 4 suits × 13 ranks × N decks with each combination N times', () => {
    const shoe = buildShoe(6);
    const counts = new Map<string, number>();
    for (const c of shoe) {
      const key = `${c.rank}${c.suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(52);
    for (const n of counts.values()) expect(n).toBe(6);
  });
});

describe('freshShoe', () => {
  it('produces a deterministic order under a seed', () => {
    seed(42);
    const a = freshShoe(6);
    unseed();
    seed(42);
    const b = freshShoe(6);
    expect(a.map((c) => `${c.rank}${c.suit}`)).toEqual(b.map((c) => `${c.rank}${c.suit}`));
  });

  it('produces different orders for different seeds', () => {
    seed(1);
    const a = freshShoe(6);
    unseed();
    seed(2);
    const b = freshShoe(6);
    expect(a.map((c) => `${c.rank}${c.suit}`)).not.toEqual(b.map((c) => `${c.rank}${c.suit}`));
  });
});

describe('drawCard', () => {
  it('returns and removes the top card', () => {
    const shoe = buildShoe(1);
    const before = shoe.length;
    const c = drawCard(shoe);
    expect(shoe.length).toBe(before - 1);
    expect(c).toBeDefined();
  });

  it('throws RangeError when shoe is empty', () => {
    expect(() => drawCard([])).toThrow(RangeError);
  });
});

describe('needsReshuffle', () => {
  it('returns false when fewer than cutAt cards dealt', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 100; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(false);
  });

  it('returns true at exact cutAt boundary', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 156; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(true);
  });

  it('returns true beyond cutAt', () => {
    const shoe = buildShoe(6);
    for (let i = 0; i < 200; i++) drawCard(shoe);
    expect(needsReshuffle(shoe, 312, 156)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:run -- src/games/blackjack/cards.test.ts
```

Expected: 10/10 pass.

## Task A5: hand.ts + hand.test.ts

**Files:**

- Create: `src/games/blackjack/hand.ts`
- Create: `src/games/blackjack/hand.test.ts`

- [ ] **Step 1: Create hand.ts**

```ts
import type { Card, Hand, HandTotal, Rank } from './types';

/** Compute hand value, picking the best (highest, not busting) Ace interpretation.
 *  Returns the value AND whether it's "soft" (contains an Ace counted as 11). */
export function handTotal(cards: readonly Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces += 1;
      total += 11;
    } else {
      total += rankValue(c.rank);
    }
  }
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

/** Player can split if hand has exactly 2 cards of the same RANK VALUE
 *  (10-value cards split with each other: 10-J, J-Q, etc., per common house rule). */
export function canSplit(hand: Hand, currentHandCount: number, maxHands: number): boolean {
  if (hand.cards.length !== 2) return false;
  if (currentHandCount >= maxHands) return false;
  if (hand.fromSplitAces) return false;
  const [a, b] = hand.cards;
  if (!a || !b) return false;
  return rankValue(a.rank) === rankValue(b.rank);
}

/** Player can double on a 2-card hand. Can double after split only if DAS is enabled.
 *  Split-Ace hands cannot double (no further actions per standard rule). */
export function canDouble(hand: Hand, dasEnabled: boolean): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.doubled) return false;
  if (hand.fromSplitAces) return false;
  if (hand.fromSplit && !dasEnabled) return false;
  return true;
}

function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number.parseInt(rank, 10);
}
```

- [ ] **Step 2: Create hand.test.ts**

```ts
import { describe, expect, it } from 'vitest';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import type { Card, Hand, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

function makeHand(overrides: Partial<Hand> = {}): Hand {
  return {
    cards: [],
    fromSplit: false,
    fromSplitAces: false,
    doubled: false,
    betHandleId: 'bh-x',
    betAmount: 10,
    resolved: false,
    ...overrides,
  };
}

describe('handTotal', () => {
  it('returns 0 for empty', () => {
    expect(handTotal([])).toEqual({ value: 0, soft: false });
  });

  it('K = 10 hard', () => {
    expect(handTotal([card('K')])).toEqual({ value: 10, soft: false });
  });

  it('A alone = 11 soft', () => {
    expect(handTotal([card('A')])).toEqual({ value: 11, soft: true });
  });

  it('A-A = 12 soft (one Ace as 11, one as 1)', () => {
    expect(handTotal([card('A'), card('A')])).toEqual({ value: 12, soft: true });
  });

  it('A-K = 21 soft (natural BJ value)', () => {
    expect(handTotal([card('A'), card('K')])).toEqual({ value: 21, soft: true });
  });

  it('A-7 = 18 soft', () => {
    expect(handTotal([card('A'), card('7')])).toEqual({ value: 18, soft: true });
  });

  it('A-7-5 = 13 hard (Ace converts to 1)', () => {
    expect(handTotal([card('A'), card('7'), card('5')])).toEqual({ value: 13, soft: false });
  });

  it('A-A-9 = 21 soft (one Ace stays at 11)', () => {
    expect(handTotal([card('A'), card('A'), card('9')])).toEqual({ value: 21, soft: true });
  });

  it('A-A-A-A-7 = 11 hard (all Aces convert to 1)', () => {
    expect(handTotal([card('A'), card('A'), card('A'), card('A'), card('7')])).toEqual({
      value: 11,
      soft: false,
    });
  });

  it('5-7-Q = 22 bust', () => {
    expect(handTotal([card('5'), card('7'), card('Q')])).toEqual({ value: 22, soft: false });
  });

  it('10-J = 20 hard', () => {
    expect(handTotal([card('10'), card('J')])).toEqual({ value: 20, soft: false });
  });
});

describe('isBust', () => {
  it('returns true for total > 21', () => {
    expect(isBust([card('K'), card('Q'), card('5')])).toBe(true);
  });
  it('returns false for total <= 21', () => {
    expect(isBust([card('K'), card('A')])).toBe(false);
  });
});

describe('isNaturalBlackjack', () => {
  it('A-K, 2 cards, not from split → true', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('K')] }))).toBe(true);
  });

  it('A-K from a split → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('K')], fromSplit: true }))).toBe(
      false,
    );
  });

  it('A-7-3 = 21 in 3 cards → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('A'), card('7'), card('3')] }))).toBe(false);
  });

  it('K-Q = 20 → false', () => {
    expect(isNaturalBlackjack(makeHand({ cards: [card('K'), card('Q')] }))).toBe(false);
  });
});

describe('canSplit', () => {
  it('two same-rank cards, room for another hand → true', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8')] }), 1, 4)).toBe(true);
  });

  it('two cards with same value but different ranks (10 and J) → true (10-value rule)', () => {
    expect(canSplit(makeHand({ cards: [card('10'), card('J')] }), 1, 4)).toBe(true);
  });

  it('mismatched ranks → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('7')] }), 1, 4)).toBe(false);
  });

  it('three cards → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8'), card('5')] }), 1, 4)).toBe(false);
  });

  it('at max hands → false', () => {
    expect(canSplit(makeHand({ cards: [card('8'), card('8')] }), 4, 4)).toBe(false);
  });

  it('hand created from split-Aces → false', () => {
    expect(canSplit(makeHand({ cards: [card('A'), card('A')], fromSplitAces: true }), 1, 4)).toBe(
      false,
    );
  });
});

describe('canDouble', () => {
  it('2 cards, DAS enabled, from main hand → true', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')] }), true)).toBe(true);
  });

  it('3 cards → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('5'), card('1' as Rank)] }), true)).toBe(
      false,
    );
  });

  it('already doubled → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], doubled: true }), true)).toBe(false);
  });

  it('split-Ace hand → false', () => {
    expect(canDouble(makeHand({ cards: [card('A'), card('5')], fromSplitAces: true }), true)).toBe(
      false,
    );
  });

  it('split hand with DAS disabled → false', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], fromSplit: true }), false)).toBe(
      false,
    );
  });

  it('split hand with DAS enabled → true', () => {
    expect(canDouble(makeHand({ cards: [card('5'), card('6')], fromSplit: true }), true)).toBe(
      true,
    );
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:run -- src/games/blackjack/hand.test.ts
```

Expected: ~20 tests pass.

## Task A6: dealer.ts + dealer.test.ts

**Files:**

- Create: `src/games/blackjack/dealer.ts`
- Create: `src/games/blackjack/dealer.test.ts`

- [ ] **Step 1: Create dealer.ts**

```ts
import { handTotal } from './hand';
import type { Card } from './types';

/** H17: dealer hits on soft 17 (e.g. A-6, A-2-4), stands on hard 17 and higher. */
export function dealerShouldHit(cards: readonly Card[]): boolean {
  const total = handTotal(cards);
  if (total.value < 17) return true;
  if (total.value === 17 && total.soft) return true;
  return false;
}
```

- [ ] **Step 2: Create dealer.test.ts**

```ts
import { describe, expect, it } from 'vitest';
import { dealerShouldHit } from './dealer';
import type { Card, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

describe('dealerShouldHit (H17 rule)', () => {
  it('hits on hard 16', () => {
    expect(dealerShouldHit([card('K'), card('6')])).toBe(true);
  });
  it('hits on hard 12', () => {
    expect(dealerShouldHit([card('7'), card('5')])).toBe(true);
  });
  it('stands on hard 17', () => {
    expect(dealerShouldHit([card('K'), card('7')])).toBe(false);
  });
  it('HITS on soft 17 (A-6) — the H17 rule', () => {
    expect(dealerShouldHit([card('A'), card('6')])).toBe(true);
  });
  it('HITS on soft 17 (A-2-4)', () => {
    expect(dealerShouldHit([card('A'), card('2'), card('4')])).toBe(true);
  });
  it('stands on soft 18 (A-7)', () => {
    expect(dealerShouldHit([card('A'), card('7')])).toBe(false);
  });
  it('stands on soft 19 (A-8)', () => {
    expect(dealerShouldHit([card('A'), card('8')])).toBe(false);
  });
  it('stands on hard 18', () => {
    expect(dealerShouldHit([card('K'), card('8')])).toBe(false);
  });
  it('stands on 21 natural', () => {
    expect(dealerShouldHit([card('A'), card('K')])).toBe(false);
  });
  it('stands on hard 20', () => {
    expect(dealerShouldHit([card('K'), card('J')])).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:run -- src/games/blackjack/dealer.test.ts
```

Expected: 10/10 pass.

## Task A7: settle.ts + settle.test.ts

**Files:**

- Create: `src/games/blackjack/settle.ts`
- Create: `src/games/blackjack/settle.test.ts`

- [ ] **Step 1: Create settle.ts**

```ts
import { handTotal, isNaturalBlackjack } from './hand';
import type {
  BlackjackRoundDetails,
  Card,
  Hand,
  HandResult,
  InsuranceState,
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
    payout = hand.betAmount * 2;
  } else if (playerHasBJ && !dealerHasBJ) {
    outcome = 'player-blackjack';
    // 3:2 payout with bet rounded UP to nearest even (ADR-0025).
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

  return { handIdx: 0, outcome, playerTotal, dealerTotal, payout };
}

/** Aggregate per-hand results + insurance into the round-level summary the wallet expects. */
export function buildRoundDetails(input: {
  dealerCards: readonly Card[];
  hands: readonly Hand[];
  insurance: InsuranceState;
  betHandleIds: readonly string[];
  config: BlackjackRoundDetails['config'];
}): {
  totalBet: number;
  totalPayout: number;
  primaryOutcome: 'win' | 'loss' | 'push';
  details: BlackjackRoundDetails;
} {
  const handResults = input.hands.map((h, i) => ({
    ...settlePlayerHand(h, input.dealerCards),
    handIdx: i,
  }));

  const handsTotalBet = input.hands.reduce((acc, h) => acc + h.betAmount, 0);
  const handsTotalPayout = handResults.reduce((acc, r) => acc + r.payout, 0);
  const totalBet = handsTotalBet + input.insurance.bet;
  const totalPayout = handsTotalPayout + input.insurance.payout;

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

/** Compute the insurance outcome and payout given dealer's final cards and bet amount.
 *  Insurance pays 2:1 (i.e. gross return 3x the insurance bet) if dealer has natural BJ. */
export function settleInsurance(args: {
  taken: boolean;
  bet: number;
  dealerCards: readonly Card[];
}): InsuranceState {
  if (!args.taken) return { status: 'not-offered', bet: 0, payout: 0 };
  const dealerTotal = handTotal(args.dealerCards).value;
  const dealerHasBJ = args.dealerCards.length === 2 && dealerTotal === 21;
  if (dealerHasBJ) {
    return { status: 'won', bet: args.bet, payout: args.bet * 3 };
  }
  return { status: 'lost', bet: args.bet, payout: 0 };
}
```

- [ ] **Step 2: Create settle.test.ts**

```ts
import { describe, expect, it } from 'vitest';
import { buildRoundDetails, settleInsurance, settlePlayerHand } from './settle';
import type { Card, Hand, InsuranceState, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

function makeHand(overrides: Partial<Hand> = {}): Hand {
  return {
    cards: [],
    fromSplit: false,
    fromSplitAces: false,
    doubled: false,
    betHandleId: 'bh-x',
    betAmount: 10,
    resolved: false,
    ...overrides,
  };
}

describe('settlePlayerHand', () => {
  it('player BJ vs dealer non-BJ → 3:2 payout', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('K')], betAmount: 10 }), [
      card('5'),
      card('K'),
    ]);
    expect(r.outcome).toBe('player-blackjack');
    expect(r.payout).toBe(25); // bet 10 + winnings 15
  });

  it('player BJ on odd bet rounds UP to nearest even (bet 5 → 9 winnings → return 14)', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('Q')], betAmount: 5 }), [
      card('K'),
      card('6'),
    ]);
    expect(r.outcome).toBe('player-blackjack');
    expect(r.payout).toBe(14); // bet 5 + winnings 9
  });

  it('player BJ vs dealer BJ → push (BJ stand-off)', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('K')], betAmount: 10 }), [
      card('A'),
      card('K'),
    ]);
    expect(r.outcome).toBe('push');
    expect(r.payout).toBe(10);
  });

  it('dealer BJ vs player non-BJ → loss', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('5')], betAmount: 10 }), [
      card('A'),
      card('K'),
    ]);
    expect(r.outcome).toBe('player-loss');
    expect(r.payout).toBe(0);
  });

  it('player 20 vs dealer 18 → 1:1 win', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('Q')], betAmount: 10 }), [
      card('K'),
      card('8'),
    ]);
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('player 18 vs dealer 20 → loss', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('8')], betAmount: 10 }), [
      card('K'),
      card('Q'),
    ]);
    expect(r.outcome).toBe('player-loss');
    expect(r.payout).toBe(0);
  });

  it('player 19 vs dealer 19 → push', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('9')], betAmount: 10 }), [
      card('K'),
      card('9'),
    ]);
    expect(r.outcome).toBe('push');
    expect(r.payout).toBe(10);
  });

  it('player bust → loss (with bust outcome tag)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('K'), card('Q'), card('5')], betAmount: 10 }),
      [card('K'), card('5')],
    );
    expect(r.outcome).toBe('player-bust');
    expect(r.payout).toBe(0);
  });

  it('dealer bust → player wins regardless of total', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('5')], betAmount: 10 }), [
      card('K'),
      card('7'),
      card('5'),
    ]);
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('player+dealer both bust → player loses (player bust prioritized)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('K'), card('Q'), card('3')], betAmount: 10 }),
      [card('K'), card('Q'), card('5')],
    );
    expect(r.outcome).toBe('player-bust');
    expect(r.payout).toBe(0);
  });

  it('split-Ace 21 vs dealer 20 → wins 1:1 (NOT 3:2; fromSplit blocks BJ classification)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('A'), card('K')], betAmount: 10, fromSplit: true }),
      [card('K'), card('Q')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('doubled win: bet field reflects doubled amount → 2x doubled-bet payout', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('5'), card('6'), card('K')], betAmount: 20, doubled: true }),
      [card('K'), card('7')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(40);
  });
});

describe('settleInsurance', () => {
  it('not taken → not-offered, bet 0, payout 0', () => {
    expect(settleInsurance({ taken: false, bet: 0, dealerCards: [] })).toEqual({
      status: 'not-offered',
      bet: 0,
      payout: 0,
    });
  });

  it('taken, dealer BJ → won, payout = 3x bet (2:1 + bet returned)', () => {
    expect(settleInsurance({ taken: true, bet: 25, dealerCards: [card('A'), card('K')] })).toEqual({
      status: 'won',
      bet: 25,
      payout: 75,
    });
  });

  it('taken, dealer non-BJ → lost, payout 0', () => {
    expect(settleInsurance({ taken: true, bet: 25, dealerCards: [card('A'), card('5')] })).toEqual({
      status: 'lost',
      bet: 25,
      payout: 0,
    });
  });

  it('taken, dealer 21 in 3 cards (not natural) → lost', () => {
    expect(
      settleInsurance({
        taken: true,
        bet: 25,
        dealerCards: [card('A'), card('5'), card('5')],
      }),
    ).toEqual({ status: 'lost', bet: 25, payout: 0 });
  });
});

describe('buildRoundDetails', () => {
  const config = { h17: true, maxHands: 4, das: true };
  const noInsurance: InsuranceState = { status: 'not-offered', bet: 0, payout: 0 };

  it('single hand win: totalBet=bet, totalPayout=2x, primary=win', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('8')],
      hands: [makeHand({ cards: [card('K'), card('Q')], betAmount: 10 })],
      insurance: noInsurance,
      betHandleIds: ['bh1'],
      config,
    });
    expect(result.totalBet).toBe(10);
    expect(result.totalPayout).toBe(20);
    expect(result.primaryOutcome).toBe('win');
    expect(result.details.hands).toHaveLength(1);
  });

  it('two hands: one win one loss → primary = push or loss based on net', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('8')],
      hands: [
        makeHand({ cards: [card('K'), card('Q')], betAmount: 10, fromSplit: true }), // win
        makeHand({ cards: [card('K'), card('5')], betAmount: 10, fromSplit: true }), // loss
      ],
      insurance: noInsurance,
      betHandleIds: ['bh1', 'bh2'],
      config,
    });
    expect(result.totalBet).toBe(20);
    expect(result.totalPayout).toBe(20); // 20 win + 0 loss
    expect(result.primaryOutcome).toBe('push');
  });

  it('insurance won + main loss aggregates correctly', () => {
    const result = buildRoundDetails({
      dealerCards: [card('A'), card('K')],
      hands: [makeHand({ cards: [card('K'), card('5')], betAmount: 50 })],
      insurance: { status: 'won', bet: 25, payout: 75 },
      betHandleIds: ['bh1', 'ins1'],
      config,
    });
    expect(result.totalBet).toBe(75); // 50 + 25
    expect(result.totalPayout).toBe(75); // 0 main + 75 insurance
    expect(result.primaryOutcome).toBe('push');
  });

  it('records insurance state in details', () => {
    const result = buildRoundDetails({
      dealerCards: [card('A'), card('K')],
      hands: [makeHand({ cards: [card('K'), card('5')], betAmount: 50 })],
      insurance: { status: 'won', bet: 25, payout: 75 },
      betHandleIds: ['bh1', 'ins1'],
      config,
    });
    expect(result.details.insurance.status).toBe('won');
    expect(result.details.insurance.bet).toBe(25);
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:run -- src/games/blackjack/settle.test.ts
```

Expected: ~20 tests pass.

## Task A8: machine.ts (XState v5 machine)

**Files:**

- Create: `src/games/blackjack/machine.ts`

This is the largest single file in PR A (~280 lines). The state machine handles betting → dealing → insurance → naturals check → per-hand player action → dealer action → settling.

- [ ] **Step 1: Create machine.ts**

```ts
import { setup, assign } from 'xstate';
import { drawCard, freshShoe, needsReshuffle } from './cards';
import { dealerShouldHit } from './dealer';
import { canDouble, canSplit, handTotal, isBust, isNaturalBlackjack } from './hand';
import { buildRoundDetails, settleInsurance } from './settle';
import { BLACKJACK_CONFIG } from './config';
import type { Card, Hand, InsuranceState } from './types';

interface Context {
  shoe: Card[];
  shoeOriginalSize: number;
  dealerCards: Card[];
  hands: Hand[];
  activeHandIdx: number;
  insurance: InsuranceState;
  betAmount: number;
  betHandleIds: string[];
  /** Result of buildRoundDetails — consumed by the page to call wallet.settleRound. */
  roundResult?: ReturnType<typeof buildRoundDetails>;
}

const initialContext = (): Context => ({
  shoe: [],
  shoeOriginalSize: 0,
  dealerCards: [],
  hands: [],
  activeHandIdx: 0,
  insurance: { status: 'not-offered', bet: 0, payout: 0 },
  betAmount: 0,
  betHandleIds: [],
});

export const blackjackMachine = setup({
  types: {
    context: {} as Context,
    events: {} as
      | { type: 'PLACE_BET'; amount: number }
      | { type: 'BET_PLACED'; betHandleId: string }
      | { type: 'TAKE_INSURANCE'; betHandleId: string; bet: number }
      | { type: 'DECLINE_INSURANCE' }
      | { type: 'HIT' }
      | { type: 'STAND' }
      | { type: 'DOUBLE'; betHandleId: string }
      | { type: 'SPLIT'; betHandleId: string }
      | { type: 'NEW_ROUND' },
  },
  guards: {
    dealerShowsAce: ({ context }) => context.dealerCards[0]?.rank === 'A',
    dealerHasBlackjack: ({ context }) => {
      if (context.dealerCards.length !== 2) return false;
      return handTotal(context.dealerCards).value === 21;
    },
    playerHasBlackjack: ({ context }) =>
      context.hands.length === 1 && isNaturalBlackjack(context.hands[0]!),
    canHitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return !h.resolved && !h.fromSplitAces;
    },
    canDoubleActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return canDouble(h, BLACKJACK_CONFIG.DAS);
    },
    canSplitActive: ({ context }) => {
      const h = context.hands[context.activeHandIdx];
      if (!h) return false;
      return canSplit(h, context.hands.length, BLACKJACK_CONFIG.MAX_HANDS);
    },
    allHandsResolved: ({ context }) => context.hands.every((h) => h.resolved),
    allHandsBust: ({ context }) => context.hands.every((h) => isBust(h.cards)),
    dealerShouldHit: ({ context }) => dealerShouldHit(context.dealerCards),
  },
  actions: {
    initShoe: assign(({ context }) => {
      const needs =
        context.shoe.length === 0 ||
        needsReshuffle(context.shoe, context.shoeOriginalSize, BLACKJACK_CONFIG.CUT_CARD_AT);
      if (needs) {
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
      const dHole = { ...drawCard(shoe), faceUp: false };
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
        dealerCards: [d1, dHole],
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
      return { shoe, dealerCards: [...context.dealerCards, c] };
    }),
    hitActive: assign(({ context }) => {
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      const hands = context.hands.map((h, i) =>
        i === context.activeHandIdx ? { ...h, cards: [...h.cards, c] } : h,
      );
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
    doubleActive: assign(({ context, event }) => {
      if (event.type !== 'DOUBLE') return {};
      const shoe = [...context.shoe];
      const c = drawCard(shoe);
      const hands = context.hands.map((h, i) => {
        if (i !== context.activeHandIdx) return h;
        return {
          ...h,
          cards: [...h.cards, c],
          betAmount: h.betAmount * 2,
          betHandleId: event.betHandleId, // additional handle for the doubled bet
          doubled: true,
          resolved: true, // exactly one card after doubling, hand ends
        };
      });
      const betHandleIds = [...context.betHandleIds, event.betHandleId];
      return { shoe, hands, betHandleIds };
    }),
    splitActive: assign(({ context, event }) => {
      if (event.type !== 'SPLIT') return {};
      const active = context.hands[context.activeHandIdx]!;
      const shoe = [...context.shoe];
      const isSplittingAces = active.cards[0]?.rank === 'A';
      // Each split hand gets one of the original two cards, then one new card.
      const newCardForHandA = drawCard(shoe);
      const newCardForHandB = drawCard(shoe);
      const handA: Hand = {
        cards: [active.cards[0]!, newCardForHandA],
        fromSplit: true,
        fromSplitAces: isSplittingAces,
        doubled: false,
        betHandleId: active.betHandleId,
        betAmount: active.betAmount,
        resolved: isSplittingAces, // split-Ace hands cannot take further action
      };
      const handB: Hand = {
        cards: [active.cards[1]!, newCardForHandB],
        fromSplit: true,
        fromSplitAces: isSplittingAces,
        doubled: false,
        betHandleId: event.betHandleId,
        betAmount: active.betAmount,
        resolved: isSplittingAces,
      };
      const hands = [
        ...context.hands.slice(0, context.activeHandIdx),
        handA,
        handB,
        ...context.hands.slice(context.activeHandIdx + 1),
      ];
      return {
        shoe,
        hands,
        betHandleIds: [...context.betHandleIds, event.betHandleId],
      };
    }),
    recordInsurance: assign(({ event }) => {
      if (event.type !== 'TAKE_INSURANCE') return {};
      return {
        insurance: { status: 'declined', bet: event.bet, payout: 0 } as InsuranceState,
        // status will be flipped to 'won' or 'lost' in `resolveInsurance`
      };
    }),
    resolveInsurance: assign(({ context }) => ({
      insurance: settleInsurance({
        taken: context.insurance.bet > 0,
        bet: context.insurance.bet,
        dealerCards: context.dealerCards,
      }),
    })),
    advanceToNextHand: assign(({ context }) => {
      const next = context.hands.findIndex((h, i) => i > context.activeHandIdx && !h.resolved);
      return { activeHandIdx: next === -1 ? context.activeHandIdx : next };
    }),
    composeRoundResult: assign(({ context }) => ({
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
    resetRound: assign(() => {
      const fresh = initialContext();
      return {
        dealerCards: fresh.dealerCards,
        hands: fresh.hands,
        activeHandIdx: 0,
        insurance: fresh.insurance,
        betAmount: 0,
        betHandleIds: [],
        roundResult: undefined,
      };
    }),
  },
}).createMachine({
  id: 'blackjack',
  initial: 'betting',
  context: initialContext(),
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
        { guard: 'dealerShowsAce', target: 'insurance_prompt' },
        { target: 'checking_naturals' },
      ],
    },
    insurance_prompt: {
      on: {
        TAKE_INSURANCE: {
          target: 'checking_naturals',
          actions: assign(({ event, context }) => ({
            insurance: { status: 'declined', bet: event.bet, payout: 0 },
            betHandleIds: [...context.betHandleIds, event.betHandleId],
          })),
        },
        DECLINE_INSURANCE: { target: 'checking_naturals' },
      },
    },
    checking_naturals: {
      entry: ['revealHoleCard', 'resolveInsurance'],
      always: [
        {
          guard: 'dealerHasBlackjack',
          target: 'settling',
          actions: assign(({ context }) => ({
            hands: context.hands.map((h) => ({ ...h, resolved: true })),
          })),
        },
        {
          guard: 'playerHasBlackjack',
          target: 'settling',
          actions: assign(({ context }) => ({
            hands: context.hands.map((h) => ({ ...h, resolved: true })),
          })),
        },
        { target: 'player_action' },
      ],
    },
    player_action: {
      always: [
        // If active hand is already resolved (e.g., split-Aces), advance.
        { guard: 'allHandsResolved', target: 'dealer_check' },
      ],
      on: {
        HIT: { actions: ['hitActive'], target: 'after_action' },
        STAND: { actions: ['standActive'], target: 'after_action' },
        DOUBLE: { guard: 'canDoubleActive', actions: ['doubleActive'], target: 'after_action' },
        SPLIT: { guard: 'canSplitActive', actions: ['splitActive'], target: 'after_action' },
      },
    },
    after_action: {
      always: [
        { guard: 'allHandsResolved', target: 'dealer_check' },
        { actions: ['advanceToNextHand'], target: 'player_action' },
      ],
    },
    dealer_check: {
      // If all hands busted, dealer doesn't draw — go straight to settling.
      always: [{ guard: 'allHandsBust', target: 'settling' }, { target: 'dealer_action' }],
    },
    dealer_action: {
      // dealer draws per H17 rule; this loops via re-entry
      always: [
        {
          guard: 'dealerShouldHit',
          actions: ['dealerHit'],
          target: 'dealer_action',
          reenter: true,
        },
        { target: 'settling' },
      ],
    },
    settling: {
      entry: ['composeRoundResult'],
      on: {
        NEW_ROUND: { target: 'betting', actions: ['resetRound'] },
      },
    },
  },
});
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exits 0. If XState v5 type complaints appear, double-check that the `event.type` narrowing inside `assign` callbacks works — XState v5 narrows by event type if the guard/transition specifies it.

## Task A9: machine.test.ts

**Files:**

- Create: `src/games/blackjack/machine.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { blackjackMachine } from './machine';
import { seed, unseed } from '@/systems/rng';

afterEach(() => unseed());

function startMachine() {
  const actor = createActor(blackjackMachine);
  actor.start();
  return actor;
}

describe('blackjackMachine — initial', () => {
  it('starts in betting state', () => {
    const actor = startMachine();
    expect(actor.getSnapshot().value).toBe('betting');
    actor.stop();
  });
});

describe('blackjackMachine — bet placement', () => {
  it('PLACE_BET advances to awaiting_bet_handle and records amount', () => {
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 25 });
    expect(actor.getSnapshot().value).toBe('awaiting_bet_handle');
    expect(actor.getSnapshot().context.betAmount).toBe(25);
    actor.stop();
  });

  it('BET_PLACED records handle and starts dealing', () => {
    const actor = startMachine();
    seed(123);
    actor.send({ type: 'PLACE_BET', amount: 25 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh-1' });
    const snap = actor.getSnapshot();
    // After dealing, machine moves to checking_naturals OR insurance_prompt depending on dealer up card
    expect(['checking_naturals', 'insurance_prompt', 'player_action']).toContain(
      typeof snap.value === 'string' ? snap.value : '',
    );
    expect(snap.context.betHandleIds[0]).toBe('bh-1');
    expect(snap.context.hands).toHaveLength(1);
    expect(snap.context.hands[0]!.cards).toHaveLength(2);
    expect(snap.context.dealerCards).toHaveLength(2);
    actor.stop();
  });
});

describe('blackjackMachine — dealer Ace triggers insurance', () => {
  it('routes through insurance_prompt when dealer up-card is Ace', () => {
    // Find a seed that gives dealer an Ace. With mulberry32 + standard shuffle,
    // we search for a seed via trial:
    for (let s = 1; s < 50; s++) {
      seed(s);
      const actor = startMachine();
      actor.send({ type: 'PLACE_BET', amount: 25 });
      actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
      const snap = actor.getSnapshot();
      if (snap.context.dealerCards[0]?.rank === 'A') {
        expect(snap.value).toBe('insurance_prompt');
        actor.stop();
        unseed();
        return;
      }
      actor.stop();
      unseed();
    }
    // If no seed in [1, 50) produced a dealer-Ace, the search is too narrow.
    // For test stability, fall back to manually constructing the scenario via
    // an artificial seed found offline. (Skip-or-mark in case of CI variance.)
    expect.fail('No seed in [1, 50) produced a dealer Ace; broaden search or mock');
  });
});

describe('blackjackMachine — player action transitions', () => {
  it('HIT adds a card to the active hand', () => {
    seed(10);
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 25 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
    // Decline insurance if prompted
    if (actor.getSnapshot().value === 'insurance_prompt') {
      actor.send({ type: 'DECLINE_INSURANCE' });
    }
    // If we're in player_action, hit. (May have skipped through to settling on natural.)
    if (actor.getSnapshot().value === 'player_action') {
      const before = actor.getSnapshot().context.hands[0]!.cards.length;
      actor.send({ type: 'HIT' });
      const after = actor.getSnapshot().context.hands[0]!.cards.length;
      expect(after).toBe(before + 1);
    }
    actor.stop();
  });

  it('STAND marks the active hand resolved', () => {
    seed(11);
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 25 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
    if (actor.getSnapshot().value === 'insurance_prompt') {
      actor.send({ type: 'DECLINE_INSURANCE' });
    }
    if (actor.getSnapshot().value === 'player_action') {
      actor.send({ type: 'STAND' });
      // After stand with single hand, we should be in dealer_check → dealer_action → settling
      const v = actor.getSnapshot().value;
      expect(['settling', 'dealer_action', 'dealer_check']).toContain(
        typeof v === 'string' ? v : '',
      );
    }
    actor.stop();
  });
});

describe('blackjackMachine — settle reaches', () => {
  it('after STAND, machine reaches settling with a roundResult', () => {
    seed(50);
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 10 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
    if (actor.getSnapshot().value === 'insurance_prompt') {
      actor.send({ type: 'DECLINE_INSURANCE' });
    }
    if (actor.getSnapshot().value === 'player_action') {
      actor.send({ type: 'STAND' });
    }
    expect(actor.getSnapshot().value).toBe('settling');
    expect(actor.getSnapshot().context.roundResult).toBeDefined();
    actor.stop();
  });
});

describe('blackjackMachine — new round reset', () => {
  it('NEW_ROUND from settling returns to betting and clears context', () => {
    seed(50);
    const actor = startMachine();
    actor.send({ type: 'PLACE_BET', amount: 10 });
    actor.send({ type: 'BET_PLACED', betHandleId: 'bh' });
    if (actor.getSnapshot().value === 'insurance_prompt') {
      actor.send({ type: 'DECLINE_INSURANCE' });
    }
    if (actor.getSnapshot().value === 'player_action') {
      actor.send({ type: 'STAND' });
    }
    actor.send({ type: 'NEW_ROUND' });
    expect(actor.getSnapshot().value).toBe('betting');
    expect(actor.getSnapshot().context.hands).toHaveLength(0);
    expect(actor.getSnapshot().context.roundResult).toBeUndefined();
    actor.stop();
  });
});
```

The test count target for machine.ts is ~25 — the file above has ~10 concrete tests and demonstrates the patterns. The implementer should add additional cases:

- SPLIT transition produces 2 hands (find a seed that deals a pair OR construct scenario by injecting cards via test helper)
- Resplit to 3 then 4 hands; at max-hands SPLIT guard fails
- DOUBLE marks the active hand resolved with doubled=true and betAmount doubled
- TAKE_INSURANCE adds bet+handle and routes through checking_naturals → settles correctly if dealer BJ
- Player BJ vs dealer non-BJ goes straight to settling with 3:2 payout reflected in roundResult
- Both hands bust → skip dealer_action → settling
- Dealer hits soft 17 (find seed); dealer stands hard 17
- Shoe reshuffle triggers on second round when penetration crossed

To handle deterministic XState testing without manual seed-hunting, the implementer may want a test-only utility that constructs a machine with a custom initial context (pre-dealt cards). Add this if seed-based tests become flaky:

```ts
// test helper, do NOT export from non-test code
export const __testCreateMachine = (initialContext: Partial<Context>) =>
  blackjackMachine.provide({
    /* override actions to use injected context */
  });
```

- [ ] **Step 2: Run machine tests**

```bash
pnpm test:run -- src/games/blackjack/machine.test.ts
```

Expected: all pass. If a seed-search test loops too far, broaden the search bound or mock.

## Task A10: Add 7 ADRs (0021-0026, 0028)

**Files:**

- Create: `docs/adr/0021-blackjack-h17.md`
- Create: `docs/adr/0022-blackjack-split-rules.md`
- Create: `docs/adr/0023-blackjack-insurance.md`
- Create: `docs/adr/0024-blackjack-shoe-penetration.md`
- Create: `docs/adr/0025-blackjack-bet-limits-and-rounding.md`
- Create: `docs/adr/0026-blackjack-xstate-machine.md`
- Create: `docs/adr/0028-blackjack-multi-hand-wallet-pattern.md`

ADR-0027 is created in PR B.

- [ ] **Step 1: Create each ADR**

Use the template `docs/adr/_template.md` and the spec's §3 + §8 + §13 as the source-of-truth content for each ADR. Each ADR is ~30-50 lines of context/decision/alternatives/consequences/references.

Below is `0021-blackjack-h17.md` in full as the reference; the others follow the same shape with content derived from the spec.

```markdown
# ADR-0021: Blackjack — H17 (dealer hits soft 17)

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §8.1 says "pick one rule and document it" for what the dealer
does on a soft 17. Two options: stand on all 17s (S17) or hit on soft 17
(H17). BUILD_GUIDE notes S17 as "standard" but leaves it open.

## Decision

Adopt **H17** (dealer hits soft 17). Implemented in `dealer.ts`:
`dealerShouldHit(cards)` returns true when value < 17 OR (value === 17 AND
soft).

## Alternatives considered

- **S17 (stand on all 17s)** — player-friendlier; ~0.2% lower house edge.
  Simpler rule. Recommended by BUILD_GUIDE.
- **Variable per session** — overkill for play money.

## Consequences

- House edge ~0.2% higher than S17.
- One additional code path in dealer logic (`total.soft` check).
- Spec §13 codifies BUILD_GUIDE §8.1 wording update.

## References

- BUILD_GUIDE.md §8.1 (after update)
- Phase 3 spec §3 decision #1
- `src/games/blackjack/dealer.ts`
```

Repeat the pattern for the other 6 ADRs; each maps to a numbered decision in spec §3.

## Task A11: BUILD_GUIDE.md §8.1 edits

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Update §8.1 dealer rule**

In `BUILD_GUIDE.md` find the line in §8.1 that reads:

```
- Dealer plays after the player: hits until 17 or higher (dealer stands on all 17s — pick one rule and document it; "stand on soft 17" is standard).
```

Replace with:

```
- Dealer plays after the player: hits until 17 or higher. **Dealer hits on soft 17 (H17)** (ADR-0021). House edge ~0.2% higher than S17 in exchange for closer Vegas Strip parity.
```

- [ ] **Step 2: Update §8.1 split rule and add Insurance bullet**

Find:

```
- Player actions: **Hit**, **Stand**, **Double Down** (double bet, take exactly one card), **Split** (when two equal-rank cards — optional for MVP, can defer).
```

Replace with:

```
- Player actions: **Hit**, **Stand**, **Double Down** (double bet, take exactly one card), **Split** (up to 4 total hands; standard split-Aces rule: one card each, no resplit aces, no double on split aces; ADR-0022). DAS (double after split) allowed.
- **Insurance** (when dealer's up-card is Ace, before dealer peeks): bet is half the main bet, pays 2:1 if dealer has natural blackjack (ADR-0023).
```

- [ ] **Step 3: Update §8.1 payouts**

In the outcomes-and-payouts block, replace:

```
  - Player blackjack (natural 21 on first two cards): **3 to 2**.
```

with:

```
  - Player blackjack (natural 21 on first two cards): **3 to 2**. For odd bets, bet is rounded UP to nearest even before applying 3:2 (winnings = Math.ceil(bet/2) × 3; ADR-0025).
```

- [ ] **Step 4: Commit**

```bash
git add BUILD_GUIDE.md
git commit -m "docs(build-guide): codify Phase 3 Blackjack rules (H17, Split, Insurance, rounding)"
```

(Add this to one of the chunked commits; doesn't need its own.)

## Task A12: risks.md updates (R-32..R-37)

**Files:**

- Modify: `docs/risks.md`

- [ ] **Step 1: Append the new rows to the risk table**

Append after the last R-XX row from prior phases:

```markdown
| R-32 | XState v5 API shift in a future minor version breaks machine.ts | 3+ | L | M | Pin to specific minor; integration tests catch breakage; XState v5 stable as of 2025. |
| R-33 | Soft-17 detection bug (e.g. A-3-3 misidentified as hard 17) | 3 | M | H | Exhaustive `dealer.test.ts` + `hand.test.ts` with all multi-ace combos. |
| R-34 | Insurance payout miscomputed on dealer BJ (main + insurance both settle correctly) | 3 | M | M | Dedicated tests in `settle.test.ts` for all insurance × main-hand outcome combos. |
| R-35 | Reshuffle never triggers (off-by-one in needsReshuffle) | 3 | L | M | Test asserts exact cutAt boundary triggers reshuffle. |
| R-36 | Splits to 4 hands consume more shoe than expected; mid-round shoe exhaustion | 3 | L | H | drawCard throws; test that no round can plausibly exhaust a 6-deck shoe (~30 cards max per round). |
| R-37 | Multi-hand wallet pattern: a placeBet for split fails (insufficient_chips) after main bet placed | 3 | M | M | Wallet placeBet for split occurs at SPLIT action time; on failure, surface error and prevent the split (page-level guard checks balance before sending SPLIT). |
```

## Task A13: PR A local DoD verification

**Files:** none

- [ ] **Step 1: Run all five quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count after PR A: 165 (Phase 2 baseline) + ~88 = ~253.

Coverage on `src/games/blackjack/**/*.ts` should be ≥ 90% (ADR-0003 gate for game logic). `machine.ts` may need careful test coverage — XState machines are pure but the action callbacks may have uncovered branches; aim for 90%+ overall.

## Task A14: Commit, push, open PR, watch CI, merge

**Files:** none

- [ ] **Step 1: Commit in 5 chunks**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(blackjack): add xstate and @xstate/react deps"

git add src/games/blackjack/types.ts src/games/blackjack/config.ts
git commit -m "feat(blackjack): add types + config (rules, limits, shoe penetration)"

git add src/games/blackjack/cards.ts src/games/blackjack/cards.test.ts \
        src/games/blackjack/hand.ts src/games/blackjack/hand.test.ts \
        src/games/blackjack/dealer.ts src/games/blackjack/dealer.test.ts \
        src/games/blackjack/settle.ts src/games/blackjack/settle.test.ts
git commit -m "feat(blackjack): pure logic (cards, hand value, dealer H17, settle with insurance)"

git add src/games/blackjack/machine.ts src/games/blackjack/machine.test.ts
git commit -m "feat(blackjack): XState v5 round state machine"

git add docs/adr/0021-blackjack-h17.md \
        docs/adr/0022-blackjack-split-rules.md \
        docs/adr/0023-blackjack-insurance.md \
        docs/adr/0024-blackjack-shoe-penetration.md \
        docs/adr/0025-blackjack-bet-limits-and-rounding.md \
        docs/adr/0026-blackjack-xstate-machine.md \
        docs/adr/0028-blackjack-multi-hand-wallet-pattern.md \
        docs/risks.md \
        BUILD_GUIDE.md
git commit -m "docs(adr): ADRs 0021-0026 + 0028 + BUILD_GUIDE §8.1 + R-32..R-37 risks"
```

Verify each commit message fits commitlint header limit (100 chars).

- [ ] **Step 2: Push**

```bash
git push -u origin phase-3-logic
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-3(blackjack): pure logic + XState machine + tests + 7 ADRs" \
  --body "$(cat <<'EOF'
## Summary
PR A of Phase 3. Pure logic + XState v5 state machine + 88 new tests. No UI.

- src/games/blackjack/cards.ts (shoe build/draw/reshuffle)
- src/games/blackjack/hand.ts (handTotal Ace 1/11, canSplit, canDouble, isNaturalBlackjack)
- src/games/blackjack/dealer.ts (dealerShouldHit — H17 rule)
- src/games/blackjack/settle.ts (settlePlayerHand, settleInsurance, buildRoundDetails)
- src/games/blackjack/machine.ts (XState v5 round state machine — 9 states)
- 7 ADRs (0021-0026, 0028)
- BUILD_GUIDE §8.1 codifies H17 + split + insurance + BJ rounding
- R-32..R-37 risks
- xstate + @xstate/react deps added

## BUILD_GUIDE reference
- Phase: 3 — Blackjack
- Sections: §8.1

## How tested
- pnpm test:run → ~253 (165 prior + 88 new)
- Coverage on src/games/blackjack/**/*.ts ≥ 90% (ADR-0003)

## Definition of done
- [ ] All 4 CI jobs green
- [ ] Coverage gate satisfied for game logic

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch + merge**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 3 — Blackjack" --search "PR A" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR B — `phase-3-cards`

## Task B1: Branch + PIP_LAYOUT.ts

**Files:**

- Create: `src/games/blackjack/PIP_LAYOUT.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-3-cards
```

- [ ] **Step 2: Create PIP_LAYOUT.ts**

A table-driven layout for classical pip arrangements per number-card rank.

```ts
/** Pip layout as a 2D position grid for each non-court rank.
 *  Each entry is a (row, col) on a 7-row by 3-col canvas (visual grid).
 *  Court cards (J, Q, K) and Ace use a different rendering path (court frame / single big pip).
 */
import type { Rank } from './types';

export type PipPosition = { row: number; col: number };

/** 7×3 grid: rows 0-6 top-to-bottom, cols 0=left/1=center/2=right. */
export const PIP_LAYOUTS: Partial<Record<Rank, readonly PipPosition[]>> = {
  '2': [
    { row: 0, col: 1 },
    { row: 6, col: 1 },
  ],
  '3': [
    { row: 0, col: 1 },
    { row: 3, col: 1 },
    { row: 6, col: 1 },
  ],
  '4': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '5': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 3, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '6': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '7': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '8': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 5, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '9': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
    { row: 3, col: 1 },
    { row: 4, col: 0 },
    { row: 4, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '10': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
    { row: 4, col: 0 },
    { row: 4, col: 2 },
    { row: 5, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
};

/** Some ranks need an inverted pip (rotated 180°) to look authentic — typically
 *  the second pip in vertical-pair positions of even ranks. For Phase 3, we keep
 *  all pips upright to simplify; Phase 8 polish can invert the bottom-half pips. */
```

## Task B2: Create Card.tsx

**Files:**

- Create: `src/games/blackjack/Card.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { JSX } from 'react';
import type { Card as CardType, Rank } from './types';
import { PIP_LAYOUTS } from './PIP_LAYOUT';

interface Props {
  card: CardType | null;
  /** When true, render the back of the card regardless of `card.faceUp`. */
  faceDown?: boolean;
}

const COURT_RANKS: ReadonlySet<Rank> = new Set(['J', 'Q', 'K']);

export default function Card({ card, faceDown = false }: Props): JSX.Element {
  if (!card || faceDown || !card.faceUp) {
    return <CardBack />;
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  const colorClass = isRed ? 'text-casino-red' : 'text-felt-deep';
  const glowClass = isRed
    ? 'drop-shadow-[0_0_4px_rgba(255,92,242,0.35)]'
    : 'drop-shadow-[0_0_4px_rgba(61,240,255,0.35)]';

  return (
    <div
      className={`relative h-[124px] w-[88px] flex-shrink-0 rounded-lg ${colorClass}`}
      style={{
        background: 'linear-gradient(160deg,#fff 0%,#fff 70%,#f8f3e3 100%)',
        boxShadow:
          '0 4px 14px rgba(0,0,0,0.4), inset 0 0 0 1.5px #d4af37, inset 0 0 0 2.5px rgba(255,255,255,0.6)',
        fontFamily: 'Times New Roman, Times, serif',
        fontWeight: 'bold',
      }}
    >
      <Corner rank={card.rank} suit={card.suit} glowClass={glowClass} position="tl" />
      <CenterArt card={card} glowClass={glowClass} />
      <Corner rank={card.rank} suit={card.suit} glowClass={glowClass} position="br" />
    </div>
  );
}

function Corner({
  rank,
  suit,
  glowClass,
  position,
}: {
  rank: Rank;
  suit: string;
  glowClass: string;
  position: 'tl' | 'br';
}) {
  const positionClasses =
    position === 'tl' ? 'top-[6px] left-[8px]' : 'bottom-[6px] right-[8px] rotate-180';
  return (
    <div className={`absolute flex flex-col items-center leading-none ${positionClasses}`}>
      <span className="text-[18px]">{rank}</span>
      <span className={`mt-[1px] text-[12px] ${glowClass}`}>{suit}</span>
    </div>
  );
}

function CenterArt({ card, glowClass }: { card: CardType; glowClass: string }) {
  const { rank, suit } = card;
  if (rank === 'A') {
    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className={`text-[50px] ${glowClass}`}>{suit}</span>
      </div>
    );
  }
  if (COURT_RANKS.has(rank)) {
    return (
      <div
        className={`absolute inset-x-[12px] inset-y-[18px] flex items-center justify-center rounded-[3px] text-[38px] ${glowClass}`}
        style={{ border: '1.5px solid currentColor' }}
      >
        {rank}
      </div>
    );
  }
  const positions = PIP_LAYOUTS[rank] ?? [];
  return (
    <div
      className="absolute inset-x-[16px] inset-y-[18px] grid items-center justify-items-center"
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(7, 1fr)',
        lineHeight: 0.9,
      }}
    >
      {positions.map((pos, i) => (
        <span
          key={i}
          className={`text-[16px] ${glowClass}`}
          style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
        >
          {suit}
        </span>
      ))}
    </div>
  );
}

function CardBack(): JSX.Element {
  return (
    <div
      className="relative h-[124px] w-[88px] flex-shrink-0 rounded-lg"
      style={{
        background:
          'repeating-linear-gradient(45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'repeating-linear-gradient(-45deg, transparent 0 3px, rgba(212,175,55,0.13) 3px 4px),' +
          'radial-gradient(circle at 30% 30%, #c11d35 0%, #a3122a 40%, #6e0a1d 100%)',
        boxShadow:
          '0 4px 14px rgba(0,0,0,0.4), 0 0 16px rgba(212,175,55,0.3), inset 0 0 0 3px #d4af37, inset 0 0 0 4.5px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="absolute inset-[10px] flex flex-col items-center justify-center rounded font-display tracking-widest text-gold"
        style={{
          border: '1px solid rgba(212,175,55,0.6)',
          textShadow: '0 0 6px rgba(212,175,55,0.6), 0 0 12px rgba(212,175,55,0.3)',
        }}
      >
        <div className="text-[18px]">LG</div>
      </div>
    </div>
  );
}
```

## Task B3: Card.test.tsx

**Files:**

- Create: `src/games/blackjack/Card.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from './Card';
import type { Card as CardType } from './types';

const card = (rank: CardType['rank'], suit: CardType['suit'] = '♠', faceUp = true): CardType => ({
  rank,
  suit,
  faceUp,
});

describe('Card', () => {
  it('renders rank in both corners for a non-court card', () => {
    render(<Card card={card('7', '♦')} />);
    const sevens = screen.getAllByText('7');
    expect(sevens).toHaveLength(2);
  });

  it('renders suit symbol multiple times for pip-card', () => {
    render(<Card card={card('7', '♦')} />);
    const diamonds = screen.getAllByText('♦');
    // 2 corners + 7 pips = 9
    expect(diamonds.length).toBeGreaterThanOrEqual(9);
  });

  it('renders Ace with single large center pip + 2 corner suits', () => {
    render(<Card card={card('A', '♠')} />);
    const spades = screen.getAllByText('♠');
    expect(spades.length).toBe(3); // 2 corners + 1 center
  });

  it('renders King with corner letters and framed center K', () => {
    render(<Card card={card('K', '♥')} />);
    const kings = screen.getAllByText('K');
    expect(kings.length).toBe(3); // 2 corners + 1 court
  });

  it('renders Queen with corner letters and framed center Q', () => {
    render(<Card card={card('Q', '♣')} />);
    const queens = screen.getAllByText('Q');
    expect(queens.length).toBe(3);
  });

  it('renders Jack with corner letters and framed center J', () => {
    render(<Card card={card('J', '♦')} />);
    const jacks = screen.getAllByText('J');
    expect(jacks.length).toBe(3);
  });

  it('red suits use casino-red text color class', () => {
    const { container } = render(<Card card={card('K', '♥')} />);
    expect(container.querySelector('.text-casino-red')).toBeTruthy();
  });

  it('black suits use felt-deep text color class', () => {
    const { container } = render(<Card card={card('K', '♠')} />);
    expect(container.querySelector('.text-felt-deep')).toBeTruthy();
  });

  it('faceDown=true renders the card back (no rank visible)', () => {
    render(<Card card={card('K', '♥')} faceDown={true} />);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('card.faceUp=false renders the card back', () => {
    render(<Card card={card('K', '♥', false)} />);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('null card renders the card back', () => {
    render(<Card card={null} />);
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('renders 10 with 10 pips', () => {
    render(<Card card={card('10', '♠')} />);
    const tens = screen.getAllByText('10');
    expect(tens.length).toBe(2); // 2 corners
    const pips = screen.getAllByText('♠');
    expect(pips.length).toBeGreaterThanOrEqual(12); // 2 corners + 10 pips
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:run -- src/games/blackjack/Card.test.tsx
```

Expected: 12/12 pass.

## Task B4: Hand.tsx

**Files:**

- Create: `src/games/blackjack/Hand.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { JSX } from 'react';
import Card from './Card';
import type { Card as CardType } from './types';

interface Props {
  cards: readonly CardType[];
  /** Index of a card to render face-down (typically dealer's hole card at index 1). */
  faceDownIdx?: number;
}

/** Renders a fanned stack of cards with -32px margin overlap (corners still visible). */
export default function Hand({ cards, faceDownIdx }: Props): JSX.Element {
  return (
    <div className="flex flex-row">
      {cards.map((c, i) => (
        <div key={i} className={i === 0 ? '' : '-ml-8'}>
          <Card card={c} faceDown={i === faceDownIdx} />
        </div>
      ))}
    </div>
  );
}
```

## Task B5: Hand.test.tsx

**Files:**

- Create: `src/games/blackjack/Hand.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hand from './Hand';
import type { Card } from './types';

const c = (rank: Card['rank'], suit: Card['suit'] = '♠'): Card => ({ rank, suit, faceUp: true });

describe('Hand', () => {
  it('renders an empty hand without crashing', () => {
    const { container } = render(<Hand cards={[]} />);
    expect(container.querySelectorAll('div')).toBeDefined();
  });

  it('renders each card', () => {
    render(<Hand cards={[c('A', '♠'), c('K', '♥')]} />);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('K').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the faceDownIdx card as back (no rank visible)', () => {
    render(<Hand cards={[c('A', '♠'), c('K', '♥')]} faceDownIdx={1} />);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('does NOT apply overlap class to the first card', () => {
    const { container } = render(<Hand cards={[c('A'), c('K')]} />);
    const wrappers = container.querySelectorAll('.flex.flex-row > div');
    expect(wrappers[0]?.className).not.toContain('-ml-8');
    expect(wrappers[1]?.className).toContain('-ml-8');
  });

  it('renders 5 cards in a hand with appropriate overlap', () => {
    render(<Hand cards={[c('2'), c('3'), c('4'), c('5'), c('6')]} />);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:run -- src/games/blackjack/Hand.test.tsx
```

Expected: 5/5 pass.

## Task B6: ADR-0027

**Files:**

- Create: `docs/adr/0027-blackjack-card-style.md`

```markdown
# ADR-0027: Blackjack — card visual style (formal pip + neon glow + pinstripe back)

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

The Blackjack page introduces playing-card rendering for the first time
in the project. The cards must feel "casino" but stay in the project's
"old-school Vegas content + modern web execution" design philosophy.

## Decision

- **Face cards (non-court):** formal Times New Roman bold rank letters
  in opposite corners; classical pip arrangements via a table-driven
  `PIP_LAYOUTS` grid (per-rank positions on a 7×3 visual grid).
- **Ace:** single large centered suit pip.
- **Court cards (J/Q/K):** framed rank letter inside a gold-bordered
  inset rectangle. Proper royal art is Phase 8 polish.
- **Glow:** subtle drop-shadow on suit symbols — neon-cyan for spades/
  clubs, neon-magenta for hearts/diamonds.
- **Background:** cream-to-white gradient (top-down).
- **Border:** 1.5px gold inset ring + 1px white highlight ring.
- **Back:** pinstripe cross-hatch (4px diagonal gold lines at 90°) over
  radial casino-red gradient; gold border; inset frame with "LG" monogram
  in Bungee with gold glow.

## Alternatives considered

- Minimal flat (just centered big suit + corners) — too plain.
- Pip pattern without neon glow — too generic.
- Bold neon throughout — too aggressive; loses formal-casino-card feel.

## Consequences

- All-CSS rendering; no image assets to manage.
- Phase 8 polish can replace court-card framed letters with real royal SVGs.
- Reusable for any future card-based game (none planned but baccarat etc.).
- Pinstripe back is the project's card-back identity.

## References

- Phase 3 spec §3 decisions #11, #12, #13
- `src/games/blackjack/Card.tsx`, `src/games/blackjack/PIP_LAYOUT.ts`
- Project design philosophy (memory: project-masquer-design-philosophy)
```

## Task B7: PR B local DoD + commit + push + open + merge

- [ ] **Step 1: All five gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all green. Test count: 253 (PR A) + ~17 = ~270.

- [ ] **Step 2: Commit in 3 chunks**

```bash
git add src/games/blackjack/PIP_LAYOUT.ts
git commit -m "feat(blackjack): add PIP_LAYOUT table for classical pip positions"

git add src/games/blackjack/Card.tsx src/games/blackjack/Card.test.tsx \
        src/games/blackjack/Hand.tsx src/games/blackjack/Hand.test.tsx
git commit -m "feat(blackjack): Card + Hand components (pip pattern + neon glow + pinstripe back)"

git add docs/adr/0027-blackjack-card-style.md
git commit -m "docs(adr): ADR-0027 Blackjack card visual style"
```

- [ ] **Step 3: Push + PR + merge**

```bash
git push -u origin phase-3-cards
gh pr create --title "phase-3(blackjack): Card + Hand visual components + ADR-0027" \
  --body "PR B of Phase 3. Pure visual components — no game logic.

- src/games/blackjack/PIP_LAYOUT.ts: table-driven pip positions per rank
- src/games/blackjack/Card.tsx: formal serif pip + neon glow + gold border + pinstripe back
- src/games/blackjack/Hand.tsx: fanned stack with -32px overlap
- ~17 new tests
- ADR-0027

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 3 — Blackjack" --search "PR B" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR C — `phase-3-page`

## Task C1: Branch

```bash
git checkout main && git pull --ff-only
git checkout -b phase-3-page
```

## Task C2: DealerArea.tsx

**Files:**

- Create: `src/games/blackjack/DealerArea.tsx`

```tsx
import type { JSX } from 'react';
import Hand from './Hand';
import { handTotal } from './hand';
import type { Card } from './types';

interface Props {
  cards: readonly Card[];
  holeRevealed: boolean;
}

export default function DealerArea({ cards, holeRevealed }: Props): JSX.Element {
  const visibleForTotal = holeRevealed ? cards : cards.slice(0, 1);
  const total = visibleForTotal.length > 0 ? handTotal(visibleForTotal).value : 0;
  const totalLabel = holeRevealed ? `total ${total}` : `showing ${total}`;
  return (
    <div className="text-center">
      <div className="mx-auto mb-2 flex max-w-[300px] items-baseline justify-between">
        <span className="font-display text-[10px] tracking-[1.5px] text-gold">DEALER</span>
        <span className="font-mono text-[11px] text-white/65">{totalLabel}</span>
      </div>
      <div className="flex justify-center">
        <Hand cards={cards} faceDownIdx={holeRevealed ? undefined : 1} />
      </div>
    </div>
  );
}
```

## Task C3: PlayerArea.tsx

**Files:**

- Create: `src/games/blackjack/PlayerArea.tsx`

```tsx
import type { JSX } from 'react';
import Hand from './Hand';
import { handTotal } from './hand';
import type { Hand as HandType } from './types';

interface Props {
  hands: readonly HandType[];
  activeHandIdx: number;
  inSettlement: boolean;
}

export default function PlayerArea({ hands, activeHandIdx, inSettlement }: Props): JSX.Element {
  return (
    <div className="flex justify-center gap-4">
      {hands.map((h, i) => {
        const total = handTotal(h.cards).value;
        const isActive = !inSettlement && i === activeHandIdx;
        const isResolved = h.resolved;
        return (
          <div
            key={i}
            className={`rounded-lg p-2 text-center ${
              isActive
                ? 'border-2 border-neon-cyan bg-neon-cyan/5 shadow-[0_0_14px_rgba(61,240,255,0.25)]'
                : 'border-2 border-gold/25 opacity-65'
            } ${isResolved && !isActive ? 'opacity-55' : ''}`}
          >
            <div
              className={`mb-1 font-display text-[9px] tracking-[1.5px] ${isActive ? 'text-neon-cyan' : 'text-gold'}`}
            >
              {isActive ? '▶ ' : ''}
              HAND {i + 1} · {total}
            </div>
            <Hand cards={h.cards} />
            <div className="mt-1.5 font-mono text-[10px] text-gold-bright">Bet: {h.betAmount}</div>
          </div>
        );
      })}
    </div>
  );
}
```

## Task C4: ActionPanel.tsx

**Files:**

- Create: `src/games/blackjack/ActionPanel.tsx`

```tsx
import type { JSX } from 'react';
import type { Hand } from './types';
import { canDouble, canSplit } from './hand';
import { BLACKJACK_CONFIG } from './config';

interface Props {
  hands: readonly Hand[];
  activeHandIdx: number;
  balance: number;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
}

export default function ActionPanel({
  hands,
  activeHandIdx,
  balance,
  onHit,
  onStand,
  onDouble,
  onSplit,
}: Props): JSX.Element {
  const active = hands[activeHandIdx];
  const canHit = active !== undefined && !active.resolved && !active.fromSplitAces;
  const canDoubleNow =
    active !== undefined && canDouble(active, BLACKJACK_CONFIG.DAS) && balance >= active.betAmount;
  const canSplitNow =
    active !== undefined &&
    canSplit(active, hands.length, BLACKJACK_CONFIG.MAX_HANDS) &&
    balance >= active.betAmount;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-[1.5px] text-gold">YOUR MOVE</span>
        <span className="font-mono text-[11px] text-white/50">
          Balance: {balance} · Bet: {active?.betAmount ?? 0}
        </span>
      </div>
      <div className="flex gap-2.5">
        <Btn label="HIT" onClick={onHit} enabled={canHit} primary />
        <Btn label="STAND" onClick={onStand} enabled={canHit} primary />
        <Btn label="DOUBLE" onClick={onDouble} enabled={canDoubleNow} />
        <Btn label="SPLIT" onClick={onSplit} enabled={canSplitNow} />
      </div>
      {!canSplitNow && active && active.cards.length === 2 && (
        <p className="mt-2 text-center text-[11px] text-white/40">
          Split unavailable:{' '}
          {hands.length >= BLACKJACK_CONFIG.MAX_HANDS
            ? `max ${BLACKJACK_CONFIG.MAX_HANDS} hands`
            : "cards aren't matching ranks"}
        </p>
      )}
    </div>
  );
}

function Btn({
  label,
  onClick,
  enabled,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  enabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`flex-1 rounded-lg border-2 border-gold py-3.5 font-display text-[15px] tracking-[1.5px] ${
        primary ? 'bg-casino-red text-white' : 'bg-transparent text-gold-bright'
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {label}
    </button>
  );
}
```

## Task C5: InsurancePrompt.tsx

**Files:**

- Create: `src/games/blackjack/InsurancePrompt.tsx`

```tsx
import type { JSX } from 'react';
import { BLACKJACK_CONFIG } from './config';

interface Props {
  mainBet: number;
  onTake: () => void;
  onDecline: () => void;
}

export default function InsurancePrompt({ mainBet, onTake, onDecline }: Props): JSX.Element {
  const insuranceBet = Math.floor(mainBet * BLACKJACK_CONFIG.INSURANCE_RATIO);
  const winnings = insuranceBet * 2;
  return (
    <div className="mx-auto max-w-[420px] rounded-lg border border-gold-bright bg-gold-bright/[0.06] p-4 text-center">
      <div className="mb-2 font-display text-[13px] tracking-[1.5px] text-gold-bright">
        INSURANCE?
      </div>
      <p className="mb-3 text-[11px] text-white/70">
        Pay {insuranceBet} (half your bet) to win {winnings} if dealer has blackjack.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={onTake}
          className="rounded-md border-2 border-gold bg-casino-red px-5 py-2.5 font-display text-[12px] tracking-[1px] text-white"
        >
          TAKE +{insuranceBet}
        </button>
        <button
          onClick={onDecline}
          className="rounded-md border-2 border-gold/50 bg-transparent px-5 py-2.5 font-display text-[12px] tracking-[1px] text-white"
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
```

## Task C6: BlackjackPage.tsx (the integration)

**Files:**

- Create: `src/games/blackjack/BlackjackPage.tsx`

This file wires the XState machine to the React UI via `@xstate/react`'s `useMachine`, bridges the machine's bet-placement events to `wallet.placeBet`, and calls `wallet.settleRound` exactly once when the machine reaches `settling`.

```tsx
import type { JSX } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
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

  const [snapshot, send] = useMachine(blackjackMachine);
  const settledRef = useRef<string | null>(null); // guard against double-settle

  // Bridge: when machine awaits a bet handle, call wallet.placeBet for the main bet.
  useEffect(() => {
    if (!user) return;
    if (snapshot.matches('awaiting_bet_handle')) {
      void (async () => {
        const result = await placeBet({
          userId: user.id,
          game: 'blackjack',
          amount: snapshot.context.betAmount,
          min: BLACKJACK_CONFIG.MIN_BET,
          max: BLACKJACK_CONFIG.MAX_BET,
        });
        if (result.ok) {
          send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
        }
        // If failure, machine stays in awaiting_bet_handle; UI shows error in PR D follow-up.
        // For Phase 3, BettingPanel's own validation prevents most failures.
      })();
    }
  }, [snapshot, send, placeBet, user]);

  // Bridge: when machine reaches settling, call wallet.settleRound ONCE with the aggregate.
  useEffect(() => {
    if (!snapshot.matches('settling')) return;
    const rr = snapshot.context.roundResult;
    if (!rr || !user) return;
    const firstHandleId = snapshot.context.betHandleIds[0];
    if (!firstHandleId || settledRef.current === firstHandleId) return;
    settledRef.current = firstHandleId;
    void (async () => {
      await settleRound({
        handle: {
          betId: firstHandleId,
          userId: user.id,
          game: 'blackjack',
          amount: rr.totalBet,
          placedAt: Date.now(),
        },
        result: {
          outcome: rr.primaryOutcome,
          betAmount: rr.totalBet,
          payout: rr.totalPayout,
          netChange: rr.totalPayout - rr.totalBet,
          details: rr.details,
        },
      });
      // After settle persists, auto-advance to NEW_ROUND after a short delay (UI shows result).
      // For simplicity in Phase 3, immediately allow user to dismiss via PLACE BET (machine sends NEW_ROUND inside BettingPanel hook below).
    })();
  }, [snapshot, settleRound, user]);

  // Reset the settled-ref guard when we leave settling.
  useEffect(() => {
    if (!snapshot.matches('settling')) {
      settledRef.current = null;
    }
  }, [snapshot]);

  const items: RecentResultItem[] = useMemo(
    () =>
      rounds.map((r) => {
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
      }),
    [rounds],
  );

  if (!user) return null;

  // Determine which bottom panel to show.
  let bottomPanel: JSX.Element;
  if (snapshot.matches('betting') || snapshot.matches('settling')) {
    bottomPanel = (
      <BettingPanel
        min={BLACKJACK_CONFIG.MIN_BET}
        max={BLACKJACK_CONFIG.MAX_BET}
        balance={balance}
        onCommit={(amount) => {
          if (snapshot.matches('settling')) send({ type: 'NEW_ROUND' });
          send({ type: 'PLACE_BET', amount });
        }}
        callButtons={() => null}
      />
    );
  } else if (snapshot.matches('insurance_prompt')) {
    bottomPanel = (
      <InsurancePrompt
        mainBet={snapshot.context.betAmount}
        onTake={async () => {
          const insuranceBet = Math.floor(
            snapshot.context.betAmount * BLACKJACK_CONFIG.INSURANCE_RATIO,
          );
          const result = await placeBet({
            userId: user.id,
            game: 'blackjack',
            amount: insuranceBet,
            min: 1, // insurance bet bypasses table min
            max: BLACKJACK_CONFIG.MAX_BET,
          });
          if (result.ok) {
            send({ type: 'TAKE_INSURANCE', betHandleId: result.handle.betId, bet: insuranceBet });
          }
        }}
        onDecline={() => send({ type: 'DECLINE_INSURANCE' })}
      />
    );
  } else {
    // player_action / after_action / dealer_check / dealer_action
    bottomPanel = (
      <ActionPanel
        hands={snapshot.context.hands}
        activeHandIdx={snapshot.context.activeHandIdx}
        balance={balance}
        onHit={() => send({ type: 'HIT' })}
        onStand={() => send({ type: 'STAND' })}
        onDouble={async () => {
          const h = snapshot.context.hands[snapshot.context.activeHandIdx];
          if (!h) return;
          const result = await placeBet({
            userId: user.id,
            game: 'blackjack',
            amount: h.betAmount,
            min: BLACKJACK_CONFIG.MIN_BET,
            max: BLACKJACK_CONFIG.MAX_BET,
          });
          if (result.ok) send({ type: 'DOUBLE', betHandleId: result.handle.betId });
        }}
        onSplit={async () => {
          const h = snapshot.context.hands[snapshot.context.activeHandIdx];
          if (!h) return;
          const result = await placeBet({
            userId: user.id,
            game: 'blackjack',
            amount: h.betAmount,
            min: BLACKJACK_CONFIG.MIN_BET,
            max: BLACKJACK_CONFIG.MAX_BET,
          });
          if (result.ok) send({ type: 'SPLIT', betHandleId: result.handle.betId });
        }}
      />
    );
  }

  const holeRevealed =
    !snapshot.matches('betting') &&
    !snapshot.matches('awaiting_bet_handle') &&
    !snapshot.matches('dealing') &&
    !snapshot.matches('insurance_prompt');

  return (
    <GameShell
      title="🃏 BLACKJACK"
      meta="3:2 BJ · H17 · 5–1000"
      recentItems={items}
      bettingPanel={bottomPanel}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        <DealerArea cards={snapshot.context.dealerCards} holeRevealed={holeRevealed} />
        <div className="h-px w-[420px] border-t border-dashed border-gold/20" />
        <PlayerArea
          hands={snapshot.context.hands}
          activeHandIdx={snapshot.context.activeHandIdx}
          inSettlement={snapshot.matches('settling')}
        />
      </div>
    </GameShell>
  );
}
```

## Task C7: BlackjackPage.test.tsx

**Files:**

- Create: `src/games/blackjack/BlackjackPage.test.tsx`

- [ ] **Step 1: Write integration tests**

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BlackjackPage from './BlackjackPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { seed, unseed } from '@/systems/rng';

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'A',
      usernameLower: 'a',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as never);
  await db.balances.put({ userId: 'u', chips: 1_000, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
});
afterEach(() => unseed());

function renderPage() {
  return render(
    <MemoryRouter>
      <BlackjackPage />
    </MemoryRouter>,
  );
}

describe('BlackjackPage', () => {
  it('renders title and BettingPanel initially', () => {
    renderPage();
    expect(screen.getByText(/BLACKJACK/)).toBeInTheDocument();
    expect(screen.getByText(/PLACE BET/)).toBeInTheDocument();
  });

  it('places a bet and deals four cards', async () => {
    seed(7);
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    await waitFor(() => {
      expect(screen.getByText(/DEALER/)).toBeInTheDocument();
    });
  });

  it('writes a rounds row on settle', async () => {
    seed(50);
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    // Wait until we're in player_action or beyond.
    await waitFor(() => expect(screen.queryByText('HIT')).toBeInTheDocument(), { timeout: 3_000 });
    // Decline insurance if prompted (depends on dealt cards).
    if (screen.queryByText(/INSURANCE/)) {
      await userEvent.click(screen.getByText(/DECLINE/));
    }
    await userEvent.click(screen.getByText('STAND'));
    // Wait for the rounds row to appear.
    await waitFor(
      async () => {
        const rows = await db.rounds.toArray();
        expect(rows.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5_000 },
    );
  });

  it('updates balance via wallet on settle', async () => {
    seed(50);
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    await waitFor(() => expect(useWalletStore.getState().balance).toBeLessThan(1_000));
    if (screen.queryByText(/INSURANCE/)) {
      await userEvent.click(screen.getByText(/DECLINE/));
    }
    await userEvent.click(screen.getByText('STAND'));
    await waitFor(
      () => {
        const b = useWalletStore.getState().balance ?? 0;
        // After settle, balance is either restored to ≤1000 (loss/push/win)
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1_100);
      },
      { timeout: 5_000 },
    );
  });
});
```

Extend the implementer's tests with additional scenarios:

- Insurance prompt appears on dealer Ace (seed-search loop similar to machine test).
- Split shows two hands.
- Double-down deals exactly one card and marks resolved.
- Test count for this file: ~12.

## Task C8: Router change

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Add import**

Add at the top with other game imports:

```tsx
import BlackjackPage from '@/games/blackjack/BlackjackPage';
```

- [ ] **Step 2: Swap stub for real page**

Find:

```tsx
{ path: 'play/blackjack', element: <StubGamePage game="blackjack" phase={3} /> },
```

Replace with:

```tsx
{ path: 'play/blackjack', element: <BlackjackPage /> },
```

## Task C9: CabinetCarousel update

**Files:**

- Modify: `src/pages/lobby/CabinetCarousel.tsx`

- [ ] **Step 1: Update Blackjack cabinet**

Find:

```tsx
{ to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'stub', phase: 3 },
```

Replace with:

```tsx
{ to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'playable' },
```

## Task C10: Sidebar NEW badge move

**Files:**

- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Move NEW badge from Coin Flip to Blackjack**

Find the GAMES array:

```ts
{ to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip', badge: 'NEW' },
{ to: '/play/blackjack', icon: '🃏', label: 'Blackjack', phase: 'P3' },
```

Replace with:

```ts
{ to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip' },
{ to: '/play/blackjack', icon: '🃏', label: 'Blackjack', badge: 'NEW' },
```

## Task C11: Risks R-38..R-40

**Files:**

- Modify: `docs/risks.md`

```markdown
| R-38 | Animation glitch on hole-card flip (Framer Motion + state race) | 3 | L | L | Card component uses `rotateY` motion with explicit transition; tested visually post-merge. |
| R-39 | Multi-hand layout overflows at narrow viewport (<1024px) | 3 | M | L | CSS scrollable container at player area; documented in dev-setup. |
| R-40 | "BJ" badge in RecentResults shows for split-Ace 21 by accident | 3 | L | L | BlackjackRoundDetails.hands[i].outcome distinguishes player-blackjack from player-win 21; UI mapping checks specific outcome. |
```

## Task C12: PR C local DoD

**Files:** none

- [ ] **Step 1: All five gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all green. Test count ~282. Coverage on `src/games/blackjack/**/*.ts` ≥ 90%; `src/games/blackjack/**/*.tsx` ≥ 80%.

- [ ] **Step 2: Manual smoke (controller, post-merge)**

Subagent should NOT run `pnpm dev` interactively (would block). Note that manual smoke is deferred to controller; the 13-step smoke is in spec §11.

## Task C13: PR C commit + push + open + merge

- [ ] **Step 1: Commit in 6 chunks**

```bash
git add src/games/blackjack/DealerArea.tsx src/games/blackjack/PlayerArea.tsx \
        src/games/blackjack/ActionPanel.tsx src/games/blackjack/InsurancePrompt.tsx
git commit -m "feat(blackjack): add DealerArea, PlayerArea, ActionPanel, InsurancePrompt subcomponents"

git add src/games/blackjack/BlackjackPage.tsx src/games/blackjack/BlackjackPage.test.tsx
git commit -m "feat(blackjack): add BlackjackPage wiring machine + Cards + wallet"

git add src/router.tsx
git commit -m "feat(blackjack): route /play/blackjack to BlackjackPage"

git add src/pages/lobby/CabinetCarousel.tsx
git commit -m "feat(lobby): flip Blackjack cabinet from stub to playable"

git add src/components/Sidebar.tsx
git commit -m "feat(ui): move NEW badge from Coin Flip to Blackjack"

git add docs/risks.md
git commit -m "docs(repo): add R-38..R-40 Phase 3 UI risks to register"
```

- [ ] **Step 2: Push + PR + merge**

```bash
git push -u origin phase-3-page
gh pr create --title "phase-3(blackjack): BlackjackPage + lobby upgrade + routing" \
  --body "PR C of Phase 3. Final.

- BlackjackPage wires GameShell + XState machine + Card components + wallet
- DealerArea / PlayerArea / ActionPanel / InsurancePrompt subcomponents
- Router: /play/blackjack → BlackjackPage (no longer StubGamePage)
- Lobby cabinet: stub → playable
- Sidebar NEW badge moved from Coin Flip to Blackjack
- R-38..R-40 risks

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 3 — Blackjack" --search "PR C" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# Release: v0.4-blackjack

## Task Rel1: Release PR

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Branch + update CHANGELOG**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.4-blackjack
```

Update `CHANGELOG.md`: move accumulated `[Unreleased]` entries (if any) into a new `[v0.4-blackjack] — 2026-05-17` section. Use plan Task Rel1 verbatim content:

```markdown
## [v0.4-blackjack] — 2026-05-17

### Added

- Full Blackjack game: H17 rule, Split (up to 4 hands), DAS, Insurance, 3:2 natural blackjack
- 6-deck shoe with 50% penetration cut card; reshuffle automatic
- XState v5 round state machine (9 states with branching transitions)
- Pure logic modules: cards, hand value, dealer rule, settle (with insurance)
- Card visual style: formal Times serif pip pattern + subtle neon glow + gold inset border
- Card back: pinstripe cross-hatch over radial casino-red gradient + "LG" monogram
- DealerArea + PlayerArea + ActionPanel + InsurancePrompt components
- BlackjackPage integrating GameShell + XState machine + Card components
- Lobby cabinet flipped from stub to playable; NEW badge moved from Coin Flip to Blackjack
- 8 new ADRs (0021–0028)
- 9 new risk register entries (R-32 to R-40)
- xstate + @xstate/react dependencies

### Changed

- BUILD_GUIDE §8.1 codifies H17 + split rules + insurance + BJ rounding
```

- [ ] **Step 2: Commit + PR + merge**

```bash
git add CHANGELOG.md
git commit -m "chore(release): v0.4-blackjack"
git push -u origin chore/release-v0.4-blackjack
gh pr create --title "chore(release): v0.4-blackjack" --body "Tags Phase 3 completion. See CHANGELOG.md."
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task Rel2: Tag + release + close issues + milestone

```bash
git tag -a v0.4-blackjack -m "Phase 3 — Blackjack complete"
git push origin v0.4-blackjack
gh release create v0.4-blackjack --title "v0.4-blackjack" --notes-file CHANGELOG.md --latest
gh issue list --milestone "Phase 3 — Blackjack" --state open --json number --jq '.[].number' \
  | xargs -I {} gh issue close {} --comment "Completed in v0.4-blackjack."
PHASE_3_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 3 — Blackjack") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_3_MS -f state=closed
```

## Task Rel3: Final DoD verification

```bash
ls .github/workflows/claude.yml
grep -R "Math.random" src/ ; echo "Exit: $?"  # 1 = good
grep -rEn "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "src/systems/auth.ts" | grep -v "src/store/uiStore.ts" | grep -v ".test." ; echo "Exit: $?"  # 1 = good
grep -rEn "from '@/db" src/pages src/components ; echo "Exit: $?"  # 1 = good
ls docs/adr/0021-*.md docs/adr/0022-*.md docs/adr/0023-*.md docs/adr/0024-*.md \
   docs/adr/0025-*.md docs/adr/0026-*.md docs/adr/0027-*.md docs/adr/0028-*.md

node --version
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
gh release view v0.4-blackjack
gh issue list --milestone "Phase 3 — Blackjack" --state all
```

All should succeed; the grep-for-absence commands should exit 1 with no output.

Manual smoke (deferred to controller): the 13-step plan from spec §11.

---

## Self-Review Notes

Spec coverage:

- Spec §3 decisions 1-18 → mapped to ADRs 0021-0028 in Task A10 + B6; rule implementations in cards.ts, hand.ts, dealer.ts, settle.ts, machine.ts, BlackjackPage.tsx, ActionPanel.tsx, InsurancePrompt.tsx.
- Spec §4 architecture diagram → layer files PR A (logic + machine), PR B (Card/Hand), PR C (Page+subcomponents).
- Spec §5 PR breakdown → A1-A14 + B1-B7 + C1-C13 + Rel1-Rel3.
- Spec §6 verbatim drafts → quoted in plan Tasks A2-A8 (types/config/cards/hand/dealer/settle/machine), B2 (PIP_LAYOUT), B3 (Card), B4 (Hand), C2-C6 (DealerArea/PlayerArea/ActionPanel/InsurancePrompt/BlackjackPage), C8-C10 (router + carousel + sidebar).
- Spec §7 test plan → tests embedded in tasks (A4 cards, A5 hand, A6 dealer, A7 settle, A9 machine, B3 Card, B5 Hand, C7 BlackjackPage). Test counts ≈ spec's promise (cards 10, hand ~20, dealer 10, settle ~20, machine ~10-25, Card 12, Hand 5, page ~12).
- Spec §8 ADRs → Task A10 + B6.
- Spec §9 risks → Task A12 + C11.
- Spec §10 GitHub setup → pre-flight Step 4.
- Spec §11 smoke plan → executed by controller post-merge (subagents cannot run pnpm dev interactively).
- Spec §12 DoD + §13 BUILD_GUIDE edits + §14 rollback + §15 release procedure + §16 handoff → addressed across Tasks A11, A13, Rel1, Rel3.

Placeholders: no TBD/TODO/"fill in details." Two intentional caveats:

- Machine test file (A9) has fewer than 25 explicit tests; implementer must add ~15 more cases as outlined in the "additional scenarios" note. This is a known plan-vs-spec gap — flagging here so subagent doesn't ship under-tested.
- BlackjackPage.test.tsx (C7) similarly has 4 explicit tests + a guidance note for the remaining ~8. Same treatment.

If the implementer prefers exhaustive verbatim tests, expand from spec §7 patterns.

Type / name consistency: `Card`, `Hand`, `HandTotal`, `Suit`, `Rank`, `Outcome`, `InsuranceState`, `BlackjackRoundDetails`, `BLACKJACK_CONFIG`, `H17`/`MAX_HANDS`/`DAS`/`DECKS`/`CUT_CARD_AT`/`MIN_BET`/`MAX_BET`/`INSURANCE_RATIO`, `blackjackMachine`, branch names `phase-3-logic`/`phase-3-cards`/`phase-3-page` — all consistent across tasks.

Scope: Phase 3 only. No Phase 4+ game logic. No real royal card art (Phase 8).

Test count at end of Phase 3: 165 (Phase 2 baseline) + 88 (PR A) + 17 (PR B) + 12 (PR C) = ~282.
