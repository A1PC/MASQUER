# Phase 15 #5 — Blackjack Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Blackjack on the design system + motion/sound; ship the unified **MasquerCard** (porcelain face + gold border + royal SVG art + mask back) used by Blackjack now and adopted by Baccarat + the poker trio later; ship the **"Velvet Duel"** gameplay variant (dealer interleaves card-by-card with the player until 17; player must Hit on totals < 14; player picks each Ace's value 1-or-11; 5-card winning hands pay 3:2). All existing Phase-3 mechanics (split/DAS/double/insurance/surrender/H17) preserved.

**Architecture:** Three sequential PRs:

- **A** — Shared `src/components/brand/PlayingCard.tsx` (the MasquerCard) + Royal silhouette SVGs for J/Q/K + Storybook story + tests. Purely additive; no game touched.
- **B** — Velvet Duel machine rules: extend `Card` with optional `aceValue`; extend `handTotal` to honour the locked Ace value for player cards (and keep dealer aces soft-auto); add `dealerInterleaving` + `awaiting_ace_choice` state + `ACE_PROMPT`/`CHOOSE_ACE` events + min-stand-14 guard; weave `dealer_draw_one` into `after_action`; settle.ts adds `fiveCardCharlie` + 3:2 payout. ADR-0045 + BUILD_GUIDE §10.x update.
- **C** — Page rebuild: swap blackjack's local `Card.tsx`/`HandView.tsx` for `MasquerCard`; re-skin `ActionPanel`/`InsurancePrompt`/`DealerArea`/`PlayerArea` on #1 primitives; add `AceValuePrompt` Modal + 5-CARD CHARLIE outcome Badge + win-streak indicator; wire `useSound` + `useEffectiveReducedMotion`.

**Tech Stack:** TypeScript 5 (strict, exactOptionalPropertyTypes), React 18, Vite 5, Tailwind 3, XState v5, Framer Motion 12, Vitest 2 + RTL, pnpm 9.12, alias `@/* → src/*`. Reuses #0 `MaskMark`, #1 primitives (`@/components/ui` — Button/Card/Panel/Badge/Modal/Icon/useToast/cn), #2 `useSound`/`useEffectiveReducedMotion`.

**Spec:** `docs/superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md`. Existing files: `src/games/blackjack/{types.ts,hand.ts,settle.ts,machine.ts,dealer.ts,cards.ts,config.ts,Card.tsx,HandView.tsx,DealerArea.tsx,PlayerArea.tsx,ActionPanel.tsx,InsurancePrompt.tsx,BlackjackPage.tsx,rules.tsx,PIP_LAYOUT.ts}` and matching `*.test.{ts,tsx}`. Path conventions follow the established blackjack module + the `MaskMark`/`Icon` patterns from #0/#1.

**Branches:** `phase-15-5-pr-a/b/c`. DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`. Conventional commits: `blackjack` scope for game changes, `theme` for the shared card component, `build-guide`/`adr` for docs.

---

## PR A — Shared MasquerCard + Royal art (additive)

**Branch:** `phase-15-5-pr-a`. Adds the shared brand card component + Storybook story. No blackjack game changes.

### Task A.1: `MasquerCard` foundations + test

**Files:** Create `src/components/brand/PlayingCard.tsx`, `PlayingCard.test.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main
git checkout -b phase-15-5-pr-a
```

- [ ] **Step 2: Failing test** `src/components/brand/PlayingCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PlayingCard from './PlayingCard';

describe('PlayingCard', () => {
  it('renders rank + suit corners on a face-up number card', () => {
    const { getAllByText } = render(<PlayingCard rank={7} suit="h" />);
    expect(getAllByText('7').length).toBeGreaterThan(0); // top-left + bottom-right
    expect(getAllByText('♥').length).toBeGreaterThan(0);
  });
  it('renders an Ace as "A"', () => {
    const { getAllByText } = render(<PlayingCard rank={1} suit="s" />);
    expect(getAllByText('A').length).toBeGreaterThan(0);
  });
  it.each([
    [11, 'J'],
    [12, 'Q'],
    [13, 'K'],
  ] as const)('renders royal label %s as %s', (rank, label) => {
    const { getAllByText } = render(<PlayingCard rank={rank} suit="d" />);
    expect(getAllByText(label).length).toBeGreaterThan(0);
  });
  it('renders the mask back when faceDown', () => {
    const { getByRole, queryByText } = render(<PlayingCard rank={7} suit="h" faceDown />);
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
    expect(queryByText('7')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — FAIL.** `pnpm exec vitest run src/components/brand/PlayingCard.test.tsx`
- [ ] **Step 4: Implement `PlayingCard.tsx`** (the canonical component — face + back + 4 sizes):

```tsx
import type { JSX } from 'react';
import MaskMark from './MaskMark';
import { cn } from '@/components/ui';

export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type CardSize = 'sm' | 'md' | 'lg';

interface PlayingCardProps {
  rank: Rank;
  suit: Suit;
  faceDown?: boolean;
  size?: CardSize;
  className?: string;
}

const SUIT_GLYPH: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_RED = new Set<Suit>(['h', 'd']);

const SIZE_PX: Record<
  CardSize,
  { w: number; h: number; corner: number; pip: number; cinzel: number }
> = {
  sm: { w: 64, h: 90, corner: 12, pip: 26, cinzel: 11 },
  md: { w: 100, h: 140, corner: 18, pip: 44, cinzel: 14 },
  lg: { w: 130, h: 182, corner: 22, pip: 54, cinzel: 18 },
};

function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export default function PlayingCard({
  rank,
  suit,
  faceDown = false,
  size = 'md',
  className,
}: PlayingCardProps): JSX.Element {
  const dim = SIZE_PX[size];
  const label = rankLabel(rank);
  const glyph = SUIT_GLYPH[suit];
  const red = SUIT_RED.has(suit);

  if (faceDown) {
    return (
      <div
        role="img"
        aria-label="Face-down card"
        className={cn(
          'relative rounded-[10px] border-2 border-gold',
          'shadow-[0_6px_18px_rgba(0,0,0,0.55)]',
          'bg-[repeating-linear-gradient(45deg,#5a1320_0_7px,#4a0f1a_7px_14px)]',
          'before:pointer-events-none before:absolute before:inset-1.5 before:rounded-[6px] before:border before:border-gold/60',
          className,
        )}
        style={{ width: dim.w, height: dim.h }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <MaskMark variant="simple" size={Math.round(dim.w * 0.5)} title="MASQUER mask" />
          <span
            className="font-display tracking-[0.3em]"
            style={{ fontSize: dim.cinzel, color: '#e6c068' }}
          >
            M
          </span>
        </div>
      </div>
    );
  }

  const color = red ? '#a3122a' : '#0c1711';
  const isRoyal = rank === 11 || rank === 12 || rank === 13;

  return (
    <div
      className={cn(
        'relative rounded-[10px] border border-brass',
        'bg-gradient-to-b from-[#fffcf2] via-[#f6efde] to-[#e2d4b6]',
        'shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_0_0_4px_#fffcf2,inset_0_0_0_5px_#e6c068]',
        'before:pointer-events-none before:absolute before:inset-2 before:rounded-[6px] before:border before:border-brass/45',
        className,
      )}
      style={{ width: dim.w, height: dim.h, color }}
    >
      <Corner top left rank={label} glyph={glyph} size={dim.corner} />
      <div className="absolute inset-0 flex items-center justify-center">
        {isRoyal ? (
          <RoyalArt rank={rank} red={red} size={dim} />
        ) : (
          <span className="font-display" style={{ fontSize: rank === 1 ? dim.pip * 1.4 : dim.pip }}>
            {glyph}
          </span>
        )}
      </div>
      <Corner bottom right rank={label} glyph={glyph} size={dim.corner} />
    </div>
  );
}

interface CornerProps {
  rank: string;
  glyph: string;
  size: number;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}
function Corner({ rank, glyph, size, top, bottom, left, right }: CornerProps): JSX.Element {
  const pos = cn(
    'absolute',
    top && 'top-2.5',
    bottom && 'bottom-2.5',
    left && 'left-3',
    right && 'right-3',
    bottom && 'rotate-180',
  );
  return (
    <div
      className={pos}
      style={{
        fontFamily: '"Cormorant Garamond", serif',
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <div>{rank}</div>
      <div style={{ fontSize: size * 0.8, marginTop: 2 }}>{glyph}</div>
    </div>
  );
}
```

(`RoyalArt` is added in Task A.2; until then the file won't compile — Task A.2 is part of the same PR.)

- [ ] **Step 5: Commit (in-progress; A.2 finishes the build).**

```bash
git add src/components/brand/PlayingCard.tsx src/components/brand/PlayingCard.test.tsx
git commit -m "feat(theme): scaffold MasquerCard (faces + back + corners; royals stub next)"
```

### Task A.2: Royal SVG silhouettes (J/Q/K)

**Files:** Modify `src/components/brand/PlayingCard.tsx` (add `RoyalArt`)

- [ ] **Step 1: Add a `RoyalArt` component** inside `PlayingCard.tsx` (or a sibling file `src/components/brand/RoyalArt.tsx` if cleaner). One stylised SVG silhouette per royal — deco crown + masquerade eye-mask + drape, in gold linework with the suit's drape colour (oxblood for red suits, ink for black). Sized to ~75% of the card's inner area.

```tsx
interface RoyalArtProps {
  rank: 11 | 12 | 13;
  red: boolean;
  size: { w: number; h: number };
}
function RoyalArt({ rank, red, size }: RoyalArtProps): JSX.Element {
  const drape = red ? '#5a1320' : '#0c1711';
  const gold = '#c79a4b';
  const face = '#f2e7cc';
  const w = Math.round(size.w * 0.74);
  const h = Math.round(size.h * 0.66);
  return (
    <svg width={w} height={h} viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect
        x="3"
        y="3"
        width="94"
        height="124"
        fill="none"
        stroke={gold}
        strokeWidth="0.9"
        rx="4"
      />
      {rank === 11 && <Jack drape={drape} gold={gold} face={face} />}
      {rank === 12 && <Queen drape={drape} gold={gold} face={face} />}
      {rank === 13 && <King drape={drape} gold={gold} face={face} />}
    </svg>
  );
}

interface FigProps {
  drape: string;
  gold: string;
  face: string;
}
function Jack({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      {/* hooded courtier — pointed cowl */}
      <path
        d="M30,32 L50,18 L70,32 Q72,46 70,68 Q72,84 70,108 L30,108 Q28,84 30,68 Q28,46 30,32 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="60" rx="13" ry="16" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M38,57 C41,54 59,54 62,57 Q59,64 50,64 Q41,64 38,57 Z" fill={gold} />
      <circle cx="44" cy="59" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="59" r="1.2" fill="#0c1711" />
      <path d="M28,108 L72,108 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
    </>
  );
}
function Queen({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      <g fill={gold}>
        <path d="M30,30 L36,18 L42,28 L50,14 L58,28 L64,18 L70,30 Z" />
        <circle cx="50" cy="14" r="2.2" fill="#a3122a" />
        <circle cx="36" cy="18" r="1.6" />
        <circle cx="64" cy="18" r="1.6" />
      </g>
      <path
        d="M28,36 Q26,55 30,70 Q34,80 32,98 L36,108 L64,108 L68,98 Q66,80 70,70 Q74,55 72,36 Q60,44 50,40 Q40,44 28,36 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="58" rx="14" ry="17" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M37,55 C40,52 60,52 63,55 Q60,62 50,62 Q40,62 37,55 Z" fill={gold} />
      <circle cx="44" cy="57" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="57" r="1.2" fill="#0c1711" />
      <path d="M46,68 Q50,71 54,68" stroke="#a3122a" strokeWidth="1.3" fill="none" />
      <path d="M28,108 L72,108 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
      <path d="M48,118 l3,4 l-3,4 l-3,-4 Z" fill={gold} />
    </>
  );
}
function King({ drape, gold, face }: FigProps): JSX.Element {
  return (
    <>
      <g fill={gold}>
        <path d="M28,32 L34,14 L44,28 L50,10 L56,28 L66,14 L72,32 Z" />
        <circle cx="50" cy="10" r="2.4" fill={drape} />
      </g>
      <path
        d="M24,38 Q24,55 28,70 Q32,82 32,102 L36,112 L64,112 L68,102 Q68,82 72,70 Q76,55 76,38 Q60,46 50,42 Q40,46 24,38 Z"
        fill={drape}
      />
      <ellipse cx="50" cy="58" rx="14" ry="17" fill={face} stroke={gold} strokeWidth="0.6" />
      <path d="M37,55 C40,52 60,52 63,55 Q60,62 50,62 Q40,62 37,55 Z" fill={gold} />
      <circle cx="44" cy="57" r="1.2" fill="#0c1711" />
      <circle cx="56" cy="57" r="1.2" fill="#0c1711" />
      <path d="M44,68 Q50,72 56,68" stroke="#0c1711" strokeWidth="1.4" fill="none" />
      <path d="M42,72 Q46,80 50,72 Q54,80 58,72" fill="none" stroke="#0c1711" strokeWidth="1.2" />
      <path d="M28,112 L72,112 L78,128 L22,128 Z" fill={drape} stroke={gold} strokeWidth="0.6" />
    </>
  );
}
```

- [ ] **Step 2: Run the test — expect PASS.** `pnpm exec vitest run src/components/brand/PlayingCard.test.tsx`
- [ ] **Step 3: Commit.**

```bash
git add src/components/brand/PlayingCard.tsx
git commit -m "feat(theme): Royal SVG silhouettes (Jack / Queen / King) for MasquerCard"
```

### Task A.3: Storybook story + DoD + PR A

**Files:** Create `src/components/brand/PlayingCard.stories.tsx`

- [ ] **Step 1:** Add a story (Storybook globs include `src/components/**/*.stories.tsx`):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import PlayingCard, { type Rank, type Suit } from './PlayingCard';

const meta: Meta<typeof PlayingCard> = {
  title: 'Brand/PlayingCard',
  component: PlayingCard,
  args: { rank: 7, suit: 'h', size: 'lg' },
  argTypes: {
    rank: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] satisfies Rank[],
    },
    suit: { control: 'select', options: ['h', 'd', 'c', 's'] satisfies Suit[] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    faceDown: { control: 'boolean' },
  },
};
export default meta;
type S = StoryObj<typeof PlayingCard>;
export const Number: S = {};
export const Ace: S = { args: { rank: 1, suit: 's' } };
export const Jack: S = { args: { rank: 11, suit: 'h' } };
export const Queen: S = { args: { rank: 12, suit: 'h' } };
export const King: S = { args: { rank: 13, suit: 's' } };
export const Back: S = { args: { faceDown: true } };
```

(Confirm Storybook's `main.ts` includes `src/components/**/*.stories.tsx` — it currently globs `src/components/ui/**/*.stories.@(ts|tsx)`; widen to `src/components/**/*.stories.@(ts|tsx)` here.)

- [ ] **Step 2: Widen Storybook glob** if needed (`.storybook/main.ts`):

```typescript
stories: ['../src/components/**/*.stories.@(ts|tsx)'],
```

- [ ] **Step 3: DoD + PR.**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
git add src/components/brand/PlayingCard.stories.tsx .storybook/main.ts
git commit -m "feat(theme): Storybook story for MasquerCard"
git push -u origin phase-15-5-pr-a
gh pr create --title "phase-15(#5) PR A: shared MasquerCard + royal art" --body "Additive new component (\`src/components/brand/PlayingCard.tsx\`) — porcelain face + gold inset border + Times-serif pips + Royal SVG silhouettes (J/Q/K) + Colombina mask back. Storybook story + tests. No game touched yet. Blackjack adopts it in PR C; Baccarat (#7) and the poker trio (#12.v1–v3) adopt it later."
```

---

## PR B — Velvet Duel machine rules + ADR-0045 + BUILD_GUIDE update

**Branch:** `phase-15-5-pr-b` (off main after PR A merges). Modifies the blackjack game logic per the spec. UI stays on the old `Card.tsx` for this PR — PR C does the page swap.

### Task B.1: Card type + handTotal honour locked Ace value

**Files:** Modify `src/games/blackjack/types.ts`, `src/games/blackjack/hand.ts`, `src/games/blackjack/hand.test.ts`

- [ ] **Step 1: Branch.**

```bash
git checkout main && git pull origin main
git checkout -b phase-15-5-pr-b
```

- [ ] **Step 2: Extend `Card`** in `types.ts` with an optional locked Ace value (player aces only — dealer aces never set it):

```typescript
export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  readonly faceUp: boolean;
  /** Player-locked Ace value (1 or 11). Only set for Aces on player hands once
   *  the player has chosen via the ACE_PROMPT. Dealer aces never set this. */
  readonly aceValue?: 1 | 11;
}
```

- [ ] **Step 3: Failing tests** in `hand.test.ts`:

```typescript
it('respects a player-locked aceValue when computing total', () => {
  const cards: Card[] = [
    { rank: 'A', suit: '♠', faceUp: true, aceValue: 1 },
    { rank: '5', suit: '♥', faceUp: true },
  ];
  expect(handTotal(cards).value).toBe(6); // 1 + 5
});
it('keeps soft-auto when aceValue is not locked (dealer/unresolved)', () => {
  const cards: Card[] = [
    { rank: 'A', suit: '♠', faceUp: true },
    { rank: '5', suit: '♥', faceUp: true },
  ];
  expect(handTotal(cards).value).toBe(16); // 11 + 5, soft
});
```

- [ ] **Step 4: Update `handTotal`** in `hand.ts` to honour the locked value:

```typescript
export function handTotal(cards: readonly Card[]): HandTotal {
  let total = 0;
  let softAces = 0; // aces currently counted as 11 (unlocked)
  for (const c of cards) {
    if (c.rank === 'A') {
      if (c.aceValue === 1) {
        total += 1;
      } else if (c.aceValue === 11) {
        total += 11;
        // locked-11 — never demote even if it busts (that's the player's call)
      } else {
        total += 11;
        softAces += 1;
      }
    } else {
      total += rankValue(c.rank);
    }
  }
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  return { value: total, soft: softAces > 0 };
}
```

- [ ] **Step 5: Run — PASS. Commit.**

```bash
git add src/games/blackjack/types.ts src/games/blackjack/hand.ts src/games/blackjack/hand.test.ts
git commit -m "feat(blackjack): honour player-locked Ace value in handTotal"
```

### Task B.2: settle.ts — 5-Card Charlie 3:2 bonus

**Files:** Modify `src/games/blackjack/types.ts`, `src/games/blackjack/settle.ts`, `src/games/blackjack/settle.test.ts`

- [ ] **Step 1: Extend `HandResult` + `BlackjackRoundDetails.hands[]`** in `types.ts`:

```typescript
export interface HandResult {
  readonly handIdx: number;
  readonly outcome: Outcome;
  readonly playerTotal: number;
  readonly dealerTotal: number;
  readonly payout: number;
  /** True when the hand wins with 5+ cards (3:2 Charlie bonus applied). */
  readonly fiveCardCharlie: boolean;
}
```

And add `readonly fiveCardCharlie: boolean;` to each `hands[]` entry in `BlackjackRoundDetails`.

- [ ] **Step 2: Failing test** in `settle.test.ts`:

```typescript
it('pays 5-Card Charlie 3:2 on a 5-card win (no natural collision)', () => {
  const hand: Hand = makeHand({
    betAmount: 100,
    cards: [c('5', '♠'), c('3', '♥'), c('2', '♦'), c('4', '♣'), c('6', '♥')],
  }); // total 20, 5 cards
  const dealer: Card[] = [c('K', '♠'), c('9', '♦')]; // total 19
  const result = settlePlayerHand(hand, dealer);
  expect(result.outcome).toBe('player-win');
  expect(result.fiveCardCharlie).toBe(true);
  expect(result.payout).toBe(250); // bet 100 + 150 winnings (3:2)
});
it('no Charlie bonus on loss with 5 cards', () => {
  const hand: Hand = makeHand({
    betAmount: 100,
    cards: [c('5', '♠'), c('3', '♥'), c('2', '♦'), c('4', '♣'), c('5', '♥')],
  }); // total 19
  const dealer: Card[] = [c('K', '♠'), c('A', '♦')]; // BJ — but use total 20 instead to avoid natural
  // ... use dealer total 20
});
```

(Use the existing test helpers in `settle.test.ts` — `c()` is the established card factory in those tests; mirror its pattern.)

- [ ] **Step 3: Update `settlePlayerHand`** in `settle.ts`:

```typescript
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
  } else if (playerHasBJ && !dealerHasBJ) {
    outcome = 'player-blackjack';
    const winnings = Math.ceil(hand.betAmount / 2) * 3;
    payout = hand.betAmount + winnings;
  } else if (dealerHasBJ && !playerHasBJ) {
    outcome = 'player-loss';
    payout = 0;
  } else if (dealerBust || playerTotal > dealerTotal) {
    outcome = 'player-win';
    payout = hand.betAmount * 2; // baseline 1:1
  } else if (playerTotal === dealerTotal) {
    outcome = 'push';
    payout = hand.betAmount;
  } else {
    outcome = 'player-loss';
    payout = 0;
  }

  // 5-Card Charlie: bonus on a non-natural win with 5+ cards.
  const fiveCardCharlie = outcome === 'player-win' && hand.cards.length >= 5;
  if (fiveCardCharlie) {
    payout = Math.floor(hand.betAmount * 2.5); // bet back + 1.5× winnings
  }

  return { handIdx: 0, outcome, playerTotal, dealerTotal, payout, fiveCardCharlie };
}
```

- [ ] **Step 4: Find every caller that constructs `BlackjackRoundDetails`** (`settle.ts` builds `hands[]`; machine emits the details) and add `fiveCardCharlie: result.fiveCardCharlie` to each `hands[]` entry. Update the matching test factories.
- [ ] **Step 5: Run — PASS. Commit.**

```bash
git add src/games/blackjack/types.ts src/games/blackjack/settle.ts src/games/blackjack/settle.test.ts src/games/blackjack/machine.ts
git commit -m "feat(blackjack): 5-Card Charlie 3:2 bonus on 5+ card wins"
```

### Task B.3: Machine — min-stand-14 + dealer interleaving + ace prompt + surrender exception

**Files:** Modify `src/games/blackjack/machine.ts`, `src/games/blackjack/machine.test.ts`

The XState v5 machine grows three things: a `dealerInterleaving: boolean` flag, an `awaiting_ace_choice` state with `ACE_PROMPT` / `CHOOSE_ACE` events, and a `dealer_draw_one` step that runs in `after_action` whenever `dealerInterleaving` is true and the trigger wasn't a Surrender.

- [ ] **Step 1: Update context + events.**

```typescript
interface Context {
  // …existing fields…
  /** True until the dealer reaches 17+; gates the alternation. */
  dealerInterleaving: boolean;
  /** Set when a player Ace is awaiting CHOOSE_ACE. cleared on resolve. */
  acePrompt: { handIdx: number; cardIdx: number; allowEleven: boolean } | null;
}

type Event =
  | /* existing events */
  | { type: 'CHOOSE_ACE'; value: 1 | 11 };
```

Initial context: `dealerInterleaving: false, acePrompt: null`. `dealerInterleaving` flips to `true` at the start of `player_action` (post-naturals check) IF the dealer isn't at 17 yet.

- [ ] **Step 2: STAND guard ≥ 14** — add to the `STAND` event handler in `player_action`:

```typescript
guard: ({ context }) => handTotal(context.hands[context.activeHand].cards).value >= 14,
```

Add a failing test asserting STAND is rejected on totals < 14 (machine stays in `player_action`).

- [ ] **Step 3: Ace prompt.**
- After every card deal to a player hand, check the dealt card: if `rank === 'A'`, compute `allowEleven = handTotal(cardsWithOurAceAt11) <= 21`. If `allowEleven === false`, immediately lock the ace at 1 in context (no prompt). Otherwise set `context.acePrompt = { handIdx, cardIdx, allowEleven: true }` and transition to a new `awaiting_ace_choice` state.
- `awaiting_ace_choice.on.CHOOSE_ACE` writes `value` onto `cards[cardIdx].aceValue`, clears `acePrompt`, and transitions to the appropriate next state (whatever was next in the deal/alternation flow — track via a `pendingAfterAce: 'deal' | 'alternation' | 'player_turn'` context field).
- Add tests covering: ace at deal time prompts (with allowEleven=true), CHOOSE_ACE 11 locks 11; ace where 11 would bust auto-locks 1 with NO prompt; multiple aces prompt sequentially; dealer aces never prompt.

- [ ] **Step 4: Dealer interleaving (`dealer_draw_one` weave).**
- Replace the existing `after_action` body so that after HIT / DOUBLE / SPLIT-first-card-dealt: if `context.dealerInterleaving === true`, flip the hole face-up (idempotent), deal one card to the dealer, recompute dealer total; if dealer ≥ 17 (or hard 17 per H17), set `dealerInterleaving = false`; if dealer busts, mark `dealerBusted = true` in context. Then return to `player_action` (or settle if all hands are resolved).
- SURRENDER short-circuits: skip the dealer draw, mark the hand surrendered, transition straight to `settling`.
- Add tests: player Hit → dealer reveals hole + draws one; dealer reaches 17 mid-alternation, stops drawing; Surrender does not draw; Split — actions on either hand both trigger draws; Insurance-peek with dealer BJ ends pre-alternation; doubled hand → one alternation tick then move on.

- [ ] **Step 5: Player-done dealer finish.**
- The existing `dealer_action` state plays out the rest of the dealer's draws per H17 once the player is done — keep it, but now it only runs if `dealerInterleaving === false`'s last tick left dealer < 17 (which only happens if dealer hadn't reached 17 yet but the player just finished). Add a test for the case where the dealer is exactly 17 when the player stands (dealer plays no further cards).

- [ ] **Step 6: Run all machine tests — PASS. Commit.**

```bash
git add src/games/blackjack/machine.ts src/games/blackjack/machine.test.ts
git commit -m "feat(blackjack): Velvet Duel — alternation, min-stand-14, ace prompt, surrender exception"
```

### Task B.4: ADR-0045 + BUILD_GUIDE update

**Files:** Create `docs/adr/0045-blackjack-velvet-duel-variant.md`; Modify `BUILD_GUIDE.md` (the Phase 3 / blackjack rules section)

- [ ] **Step 1:** Write ADR-0045 (copy `docs/adr/_template.md`): record the four rule additions (alternation, min-stand-14, player Ace-value choice, 5-Card Charlie 3:2) and the unchanged Phase-3 mechanics (split, DAS, double, insurance, surrender, H17). Reference the #5 spec at `docs/superpowers/specs/2026-05-25-phase-15-5-blackjack-design.md`.
- [ ] **Step 2:** Update `BUILD_GUIDE.md` §10.x blackjack rules: append a "Velvet Duel variant (Phase 15)" subsection summarising the four rule additions (paragraph form) and pointing to ADR-0045. Don't remove the Phase-3 baseline; the variant builds on it.
- [ ] **Step 3:** Run `npx markdownlint-cli2 BUILD_GUIDE.md docs/adr/0045-blackjack-velvet-duel-variant.md` — fix any MD001/MD038 issues. Commit.

```bash
git add docs/adr/0045-blackjack-velvet-duel-variant.md BUILD_GUIDE.md
git commit -m "docs(adr): ADR-0045 Velvet Duel blackjack variant + BUILD_GUIDE update"
```

### Task B.5: Full DoD + PR B

- [ ] **Step 1: DoD.**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
```

- [ ] **Step 2: Push + PR.**

```bash
git push -u origin phase-15-5-pr-b
gh pr create --title "phase-15(#5) PR B: Velvet Duel rules + ADR-0045" --body "Game logic for #5. Adds dealer interleaving, min-stand-14, player Ace value choice (1 or 11; auto-1 if 11 would bust), and the 5-Card Charlie 3:2 bonus. Preserves split/DAS/double/insurance/surrender/H17. ADR-0045 + BUILD_GUIDE updated. UI still on the old Card.tsx — PR C does the page swap."
```

---

## PR C — Page rebuild on #1 primitives + MasquerCard adoption

**Branch:** `phase-15-5-pr-c` (off main after PR B). Swaps the local `Card.tsx`/`HandView.tsx` for `MasquerCard`, re-skins the page, adds the AceValuePrompt Modal, the Charlie outcome Badge, and the win-streak indicator. Wires `useSound` + `useEffectiveReducedMotion`.

### Task C.1: Adopt `MasquerCard` (drop local Card.tsx)

**Files:** Modify `src/games/blackjack/HandView.tsx`, `DealerArea.tsx`, `PlayerArea.tsx`; delete `src/games/blackjack/Card.tsx` + `Card.test.tsx` + `PIP_LAYOUT.ts` + `HandView.test.tsx` (rewritten).

- [ ] **Step 1:** Replace every `import Card from './Card'` with `import PlayingCard from '@/components/brand/PlayingCard'`. Map `Card`'s blackjack rank/suit (`'A'|'2'..|'K'` × `'♠'|'♥'|'♦'|'♣'`) to MasquerCard's `(rank: 1..13, suit: 'h'|'d'|'c'|'s')` via a small adapter (`rankToNumber`/`suitToLetter`) co-located in `HandView.tsx`. Pass `faceDown={!card.faceUp}` for dealer hole.
- [ ] **Step 2:** Update `HandView.tsx` to render via `<PlayingCard>` with size `lg` for the centre table and `md` for split / smaller layouts. Delete the local `Card.tsx`, `Card.test.tsx`, `PIP_LAYOUT.ts` (no longer used).
- [ ] **Step 3:** Update `HandView.test.tsx` to assert the MasquerCard render path (assert the corner rank + suit text, since the MasquerCard `face-down` test asserts `role="img"`).
- [ ] **Step 4: Run tests + commit.**

```bash
pnpm exec vitest run src/games/blackjack
git add src/games/blackjack/
git commit -m "feat(blackjack): adopt MasquerCard; delete local Card + PIP_LAYOUT"
```

### Task C.2: ActionPanel + Stand-disabled tooltip + AceValuePrompt

**Files:** Modify `src/games/blackjack/ActionPanel.tsx`; Create `src/games/blackjack/AceValuePrompt.tsx`, `AceValuePrompt.test.tsx`

- [ ] **Step 1:** Rebuild `ActionPanel.tsx` with #1 `Button`s (Hit / Stand / Double / Split / Surrender / Insurance). `Stand` is `disabled` when `playerTotal < 14` AND wrapped in a `Tooltip` (from `@/components/ui`) reading "Must Hit on totals below 14". Use `<Icon>` glyphs (lucide: `Plus` for Hit, `MinusSquare` / `Hand` for Stand, `Coins` for Double, etc. — pick the closest real glyph). Buttons fire the existing machine events.
- [ ] **Step 2:** Add `src/games/blackjack/AceValuePrompt.tsx` — a Radix-backed `Modal` (from `@/components/ui`) that opens when `snapshot.context.acePrompt !== null` and dispatches `CHOOSE_ACE { value }` on button click:

```tsx
import type { JSX } from 'react';
import { Modal, Button } from '@/components/ui';

interface AceValuePromptProps {
  open: boolean;
  allowEleven: boolean;
  onChoose: (value: 1 | 11) => void;
}

export default function AceValuePrompt({
  open,
  allowEleven,
  onChoose,
}: AceValuePromptProps): JSX.Element {
  return (
    <Modal
      open={open}
      onOpenChange={() => {
        /* not user-dismissable */
      }}
      title="Count this Ace as"
      description={
        allowEleven ? 'Choose 1 or 11 for the Ace you just drew.' : '11 would bust — locked at 1.'
      }
    >
      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="secondary" size="lg" onClick={() => onChoose(1)}>
          1
        </Button>
        {allowEleven && (
          <Button variant="primary" size="lg" onClick={() => onChoose(11)}>
            11
          </Button>
        )}
      </div>
    </Modal>
  );
}
```

Add `AceValuePrompt.test.tsx`: renders both buttons when `allowEleven`; renders only the `1` button + a "locked at 1" line when not; clicking a button calls `onChoose`.

- [ ] **Step 3: Commit.**

```bash
git add src/games/blackjack/ActionPanel.tsx src/games/blackjack/AceValuePrompt.tsx src/games/blackjack/AceValuePrompt.test.tsx
git commit -m "feat(blackjack): ActionPanel re-skin (#1 Buttons + Stand tooltip) + AceValuePrompt"
```

### Task C.3: Page rebuild on #1 primitives + win-streak + Charlie badge + sound

**Files:** Modify `src/games/blackjack/BlackjackPage.tsx`, `BlackjackPage.test.tsx`, `DealerArea.tsx`, `PlayerArea.tsx`, `InsurancePrompt.tsx`

- [ ] **Step 1:** Rebuild `BlackjackPage.tsx`:
  - Composition: `GameShell` shell + a deco `Panel` for the table felt; `DealerArea` (re-skinned with Card/CardHeader + the dealer's MasquerCards) at the top; `PlayerArea` (with split tabs, total, outcome `Badge`) at the bottom; the existing `BettingPanel` for the bet + the new `ActionPanel`; the existing `InsurancePrompt` re-skinned (Modal); the new `AceValuePrompt`.
  - Wire `useSound` (from `@/systems/sound/useSound`): `chip.place` on `placeBet` resolved; `card.deal` on every card dealt (subscribe to snapshot changes via `useEffect`); `win.small`/`win.medium` on settle (medium when `fiveCardCharlie`); `loss` on bust/loss; (insurance pays already trigger via the same win family).
  - Wire `useEffectiveReducedMotion` (from `@/motion/useEffectiveReducedMotion`) — drop the legacy framer `useReducedMotion`. Card slide/flip on deal uses #2 shared variants (transform-only, ≤ 250 ms); reduced-motion → instant.
  - Add a session-local **win-streak** state: `useState(0)` resetting on mount/leave; increment on any winning hand outcome in the round, reset on loss/bust. Render a `Badge tone="win"` with `<Icon name="Flame">` next to the player area when `streak >= 2` (matches the coin-flip pattern).
  - Show **5-CARD CHARLIE** outcome `Badge tone="win"` next to the per-hand outcome when the hand's `fiveCardCharlie` is true.
- [ ] **Step 2:** `DealerArea.tsx` / `PlayerArea.tsx`: re-skin layout (deco `Panel` containers, Cinzel labels), render `<PlayingCard>` for each card, render outcome `Badge` with tone-by-outcome.
- [ ] **Step 3:** `InsurancePrompt.tsx`: re-skin as a `Modal` (mirror `AceValuePrompt` structure) with Take / Decline buttons.
- [ ] **Step 4:** Update `BlackjackPage.test.tsx`:
  - Stand disabled with helper text when player total < 14.
  - After Hit, the dealer's hole flips + one new dealer card appears (assert MasquerCard count).
  - Ace prompt opens when an Ace is dealt; choosing 11 locks at 11 (assert total reflects it).
  - 5-card winning hand shows the CHARLIE badge.
  - `useSound.play` is called with `chip.place` / `card.deal` / `win.medium` / `loss` at the right moments (mock `useSound`).
  - Win-streak increments on win, resets on loss.
- [ ] **Step 5: Commit.**

```bash
git add src/games/blackjack/
git commit -m "feat(blackjack): BlackjackPage rebuild on design system + sound + win-streak + Charlie badge"
```

### Task C.4: DoD + PR C

- [ ] **Step 1: Full DoD.**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
```

- [ ] **Step 2: Push + PR.**

```bash
git push -u origin phase-15-5-pr-c
gh pr create --title "phase-15(#5) PR C: blackjack page rebuild + MasquerCard adoption" --body "Final PR of #5. Swaps blackjack's local Card.tsx for the shared MasquerCard; re-skins ActionPanel / DealerArea / PlayerArea / InsurancePrompt on #1 primitives; adds the AceValuePrompt Modal, the 5-CARD CHARLIE outcome Badge, and the session-local win-streak indicator; wires useSound + useEffectiveReducedMotion. Completes #5."
```

---

## Self-review

- **Spec coverage:** unified MasquerCard + royal art (§3.1 → PR A) · Velvet Duel alternation + min-stand-14 + surrender exception + dealer-finish (§3.2 → B.3) · player Ace value choice with auto-1 fallback (§2 + §3.2 → B.1 + B.3) · 5-Card Charlie 3:2 (§2 + §3.2 → B.2) · page rebuild + AceValuePrompt + Charlie badge + win-streak + sound + motion (§3.3 → C.1–C.3) · ADR-0045 + BUILD_GUIDE update (§2 → B.4) · 3-PR split (§4 → A/B/C). ✓
- **Placeholder scan:** PR A provides full code for `MasquerCard` + `RoyalArt`. PR B provides full code for `Card.aceValue`, `handTotal`, and `settlePlayerHand`'s 5-Card Charlie branch; the machine changes are described step-by-step with the exact events/states and a per-step test checklist (no "TBD"). PR C is specified per file with primitives + exact behavioural assertions for the tests. The Royal silhouettes are full SVG paths.
- **Type/name consistency:** `Card.aceValue?: 1 | 11` used identically across types/hand/machine; `fiveCardCharlie` on `HandResult` + `BlackjackRoundDetails.hands[]`; `MasquerCard` props (`rank: 1..13`, `suit: 'h'|'d'|'c'|'s'`, `faceDown?`, `size?`, `className?`) consistent between PR A component + PR C adapter; `AceValuePrompt` props (`open`, `allowEleven`, `onChoose`) consistent between component + test. The blackjack `Card.rank` is `'A'|'2'..|'K'` + `suit` is `'♠'|'♥'|'♦'|'♣'`; the adapter in HandView.tsx maps these to MasquerCard's `1..13` + `'h'|'d'|'c'|'s'`. ✓
- **Risk notes:** (1) Storybook glob currently targets `src/components/ui/**`; PR A widens it to `src/components/**` — verify Storybook still builds (`pnpm build-storybook`). (2) `BlackjackRoundDetails.hands[]` gains `fiveCardCharlie`; any callers serialising/replaying the details need updates (grep `BlackjackRoundDetails` and `details as BlackjackRoundDetails` — likely only `BlackjackPage` + recent-results display). (3) The ace prompt blocks all other input via the Modal — confirm Radix Dialog focus-trap doesn't conflict with the existing InsurancePrompt (only one should be open at a time; ace prompt only opens post-insurance per the machine's state graph). (4) The icon names (`Plus`, `MinusSquare`, etc.) — confirm against lucide (NAV_ICON-test pattern catches bad names; PR C should reuse that test).
- **Additive / invariants:** game logic IS modified (Velvet Duel) — explicitly recorded in ADR-0045 + BUILD_GUIDE per CLAUDE.md spec-first. One `rounds` row per round preserved; integer money; seeded RNG; games sandbox preserved (page imports `useGameRound`/`useSound`/motion via `@/systems`/`@/motion`); tokens-only; reduced-motion via #2; CLAUDE.md not edited.
