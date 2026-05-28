# Phase 15 sub-project #12.v3 — Omaha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the MASQUER polish recipe to Omaha, inheriting the shared chrome shipped in #12.v1 Hold'em and the inheritance pattern proven in #12.v2 Five-Card Draw. Closes the poker trio.

**Architecture:** Single PR. No admin work — the Omaha tab in `/admin/poker` already populates from existing aggregations.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-12-v3-omaha-design.md` (PR #285).

---

## Shared rules

1. **Pure logic untouched.** `omaha/{omahaLogic,machine}.ts`, `_shared/{handEvaluator,sidePots,deck,types}.ts`, `_shared/ai/{archetypes,decide,decideOmaha}.ts` byte-stable.
2. **Games sandbox preserved.** No `@/db` or `@/store` imports from `src/games/poker/**`.
3. **One `rounds` row per poker session** (ADR-0041). No wallet model change.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **No CLAUDE.md edits.**
6. **Commit subject ≤ 100 chars.**
7. **Conventional Commits.** Scopes: `poker`, `docs`. Never `admin` (no admin work). Never `sound` (reverted).
8. **No `--no-verify`. No `--amend`.** Reset + new commit on hook failure.
9. **TS strict + exactOptionalPropertyTypes.** Optional fields via spread.
10. **Tokens-only Tailwind** in rebuilt files.
11. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** (per `masquer-min-h-screen-in-pages`).
12. **Visual verification via Playwright at 1440×900 before pushing** (per `masquer-screenshot-before-pushing-ui`).
13. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```

---

## Critical context

### Hold'em is the canonical shape (again)

Every task has a direct analog in `src/games/poker/holdem/`. Diff against the matching Hold'em file before writing — the pattern is load-bearing.

| Omaha file       | Mirror these Hold'em files |
| ---------------- | -------------------------- |
| `OmahaPage.tsx`  | `holdem/HoldemPage.tsx`    |
| `OmahaTable.tsx` | `holdem/PokerTable.tsx`    |
| `OmahaSeat.tsx`  | `holdem/Seat.tsx`          |

### Five-Card Draw was the precedent

`src/games/poker/five-card-draw/` was retrofitted with this exact same shape in #12.v2 (PR #284). Read those files too as a second reference for the mechanical changes (`FiveCardDrawPage.tsx`, `DrawSeat.tsx`, `DrawTable.tsx`).

### Omaha-specific differences

- **4 hole cards per seat** (Hold'em=2, Draw=5).
- **Community board exists** (5 cards: flop / turn / river). Same as Hold'em.
- **Hand evaluation rule**: `evaluateFrom(holeCards, board, 'omaha')` enforces "exactly 2 of 4 hole + exactly 3 of 5 board". **Do NOT** use `evaluateBest5([...holeCards, ...board])` directly — that allows 0/1/3/4 hole cards (illegal in Omaha). Verify the helper import name in `_shared/handEvaluator.ts` before writing.
- **OmahaSeat already renders 4 cards** with `cardSize: 'mini'` at top positions. Don't regress the layout when adopting MaskAvatar + brand tokens.
- **AI driver uses `decideOmaha`** (not `decide`). Page shouldn't touch this — it's already wired through the AI turn effect. Confirm.

### File structure

| File                                               | Action  | Responsibility                                                                                                                         |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/poker/_shared/PokerOddsHeader.tsx`      | Modify  | Fill the `omaha` content string.                                                                                                       |
| `src/games/poker/_shared/PokerOddsHeader.test.tsx` | Modify  | Update Omaha variant assertion.                                                                                                        |
| `src/games/poker/_shared/PokerRulesModal.tsx`      | Modify  | Replace `OmahaRules` placeholder body with real rules (incl. the 2+3 rule).                                                            |
| `src/games/poker/_shared/PokerRulesModal.test.tsx` | Modify  | Update Omaha variant assertion to match real content.                                                                                  |
| `src/games/poker/omaha/OmahaSeat.tsx`              | Modify  | MaskAvatar adopt + brand tokens + `revealHoleCards` + `handRank` props. Drop archetype label. Preserve 4-card layout.                  |
| `src/games/poker/omaha/OmahaSeat.test.tsx`         | Modify  | Replace archetype-label + neon-cyan assertions with MaskAvatar + brand-token assertions. New cases for `revealHoleCards` + `handRank`. |
| `src/games/poker/omaha/OmahaTable.tsx`             | Modify  | Brand pass + `isPostHand` reveal threading using `evaluateFrom(holeCards, board, 'omaha')`.                                            |
| `src/games/poker/omaha/OmahaPage.tsx`              | Rewrite | Chrome retrofit (mirror HoldemPage).                                                                                                   |
| `src/games/poker/omaha/OmahaPage.test.tsx`         | Modify  | Add MASQUER chrome + sound + mask name + grace + banner assertions.                                                                    |
| `BUILD_GUIDE.md` §13c                              | Modify  | Note polish pass + chrome inheritance.                                                                                                 |

---

## Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-12-v3-omaha
```

---

## Task A.0 — Read context (15 min)

- [ ] **Step 1:** Read the spec end-to-end (`docs/superpowers/specs/2026-05-27-phase-15-12-v3-omaha-design.md`).
- [ ] **Step 2:** Read this plan.
- [ ] **Step 3:** Read the canonical mirrors:
  - `src/games/poker/holdem/HoldemPage.tsx` (full chrome — mask plumbing, sound, banner + grace overlay, fallback grace trigger)
  - `src/games/poker/holdem/PokerTable.tsx` (isPostHand gate + per-AI-seat reveal threading; uses `evaluateBest5` because Hold'em is "any" rule)
  - `src/games/poker/holdem/Seat.tsx` (MaskAvatar + brand tokens + `revealHoleCards` + `handRank`)
- [ ] **Step 4:** Read the #12.v2 mirrors as a second precedent:
  - `src/games/poker/five-card-draw/{FiveCardDrawPage,DrawTable,DrawSeat}.tsx`
- [ ] **Step 5:** Read the current Omaha files to size the diff:
  - `src/games/poker/omaha/{OmahaPage,OmahaTable,OmahaSeat}.tsx`
  - Their `.test.tsx` siblings to find pinned assertions that need flipping
- [ ] **Step 6:** Read `src/games/poker/_shared/handEvaluator.ts` and confirm the `evaluateFrom(holeCards, board, rule)` signature + the `'omaha'` rule branch. Verify the export name before writing imports.
- [ ] **Step 7:** Read project memories `feedback-masquer-min-h-screen-in-pages` + `feedback-masquer-screenshot-before-pushing-ui`.

---

## Task A.1 — Shared variant content (build first)

**Files:** `src/games/poker/_shared/PokerOddsHeader.tsx` + `PokerRulesModal.tsx` + their tests.

Locks the shared API the new OmahaPage will consume.

- [ ] **Step 1:** In `PokerOddsHeader.tsx`, replace the Omaha placeholder:

  ```ts
  // Before
  'omaha': "Omaha · v3 coming soon",
  // After
  'omaha': "No-Limit Omaha · 2-6 players · 80 BB buy-in · Rebuy on bust",
  ```

  Verify both `holdem` + `five-card-draw` strings are structurally identical (same trio format).

- [ ] **Step 2:** Update `PokerOddsHeader.test.tsx`. Replace the placeholder substring assertion with `expect(...).toHaveTextContent('No-Limit Omaha')` (or similar).

- [ ] **Step 3:** In `PokerRulesModal.tsx`, replace the `OmahaRules` component body. Same JSX shape as `HoldemRules`/`DrawRules`:

  ```tsx
  function OmahaRules(): JSX.Element {
    return (
      <div className="text-ivory/85 space-y-3">
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
          <p>
            Make the best 5-card hand using <strong>exactly 2 of your 4 hole cards</strong> +{' '}
            <strong>exactly 3 of the 5 community cards</strong>. The 2+3 rule is strict — you cannot
            play "the board" or use just 1 hole card.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
            HAND RANKINGS (HIGH → LOW)
          </h3>
          <ol className="list-inside list-decimal text-sm">
            <li>Royal Flush · Straight Flush</li>
            <li>Four of a Kind</li>
            <li>Full House</li>
            <li>Flush</li>
            <li>Straight</li>
            <li>Three of a Kind</li>
            <li>Two Pair</li>
            <li>One Pair</li>
            <li>High Card</li>
          </ol>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BLINDS</h3>
          <p>
            Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BETTING ROUNDS</h3>
          <p>Preflop → Flop (3) → Turn (1) → River (1). Action: fold · check · call · raise.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SHOWDOWN</h3>
          <p>
            If two or more players remain after the river, hole cards reveal and the best 5-card
            hand wins per the 2+3 rule (split on ties).
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
          <p>Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table any time between hands.</p>
        </section>
      </div>
    );
  }
  ```

- [ ] **Step 4:** Update `PokerRulesModal.test.tsx`. Omaha variant assertion: replace placeholder substring with `expect(...).toHaveTextContent('2 of your 4 hole cards')` (or similar — the 2+3 rule is the load-bearing content).

- [ ] **Step 5:** Run.

  ```bash
  pnpm exec vitest run src/games/poker/_shared/PokerOddsHeader.test.tsx src/games/poker/_shared/PokerRulesModal.test.tsx
  ```

- [ ] **Step 6:** Commit.
  ```bash
  git add src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal}.{ts,tsx} src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal}.test.tsx
  git commit -m "feat(poker): fill PokerOddsHeader + PokerRulesModal Omaha content"
  ```

---

## Task A.2 — OmahaSeat retrofit

**Files:** `src/games/poker/omaha/OmahaSeat.tsx` + test.

Mirror `holdem/Seat.tsx` (which #12.v2 also mirrored for DrawSeat). Preserve the 4-card layout — OmahaSeat renders all 4 hole cards with `cardSize: 'mini'` at top positions.

- [ ] **Step 1:** Update imports:

  ```ts
  import type { JSX } from 'react';
  import type { OmahaSeatState } from './machine';
  import type { HandRank, HandCategory } from '../_shared/types';
  import PlayingCard from '../_shared/PlayingCard';
  import MaskAvatar from '../_shared/MaskAvatar';
  ```

- [ ] **Step 2:** Add the `HAND_CATEGORY_LABEL` map (same as `holdem/Seat.tsx` — co-located, not shared):

  ```ts
  const HAND_CATEGORY_LABEL: Record<HandCategory, string> = {
    'high-card': 'High Card',
    pair: 'Pair',
    'two-pair': 'Two Pair',
    trips: 'Three of a Kind',
    straight: 'Straight',
    flush: 'Flush',
    'full-house': 'Full House',
    quads: 'Four of a Kind',
    'straight-flush': 'Straight Flush',
  };
  ```

- [ ] **Step 3:** Extend Props:

  ```ts
  interface Props {
    seat: OmahaSeatState;
    isButton: boolean;
    isSb: boolean;
    isBb: boolean;
    isActing: boolean;
    /** Cards to highlight as part of the winning best-5 */
    highlightCards?: boolean;
    /** Post-hand reveal — flips AI hole cards face-up without the winner ring. */
    revealHoleCards?: boolean;
    /** Hand category label shown beneath the cards. Only set during post-hand. */
    handRank?: HandRank;
    /** Position label for layout orientation */
    position?: 'top' | 'bottom';
  }
  ```

- [ ] **Step 4:** In the function body:
  - Drop the `archetype` derivation (`seat.occupant.archetype.toUpperCase()`) and its rendered label.
  - Replace `actingRing = 'ring-2 ring-neon-cyan shadow-[0_0_12px_rgba(61,240,255,0.6)]'` with `'ring-2 ring-gold-bright shadow-[0_0_12px_rgba(232,189,109,0.6)]'`.
  - Replace the outer container className:
    ```ts
    // Before
    'relative flex flex-col items-center gap-1 rounded-lg border border-gold/20 bg-felt-deep/80 px-3 py-2';
    // After
    'relative flex flex-col items-center gap-1 rounded-lg border border-brass/40 bg-velvet-deep/70 px-3 py-2';
    ```
  - Replace SB/BB badge backgrounds: `bg-neon-cyan/70` → `bg-brass/80`; `bg-neon-magenta/70` → `bg-gold-bright`.
  - Replace name color: `text-white` → `text-ivory/85`; player name keeps `text-gold-bright`.

- [ ] **Step 5:** Insert the MaskAvatar block (mirror holdem/Seat):

  ```tsx
  <div className="flex flex-col items-center gap-1 leading-none">
    {!isYou && <MaskAvatar name={name} active={isActing} size="sm" />}
    <span
      className={[
        'font-display text-[11px] tracking-[0.18em]',
        isYou ? 'text-gold-bright' : 'text-ivory/85',
      ].join(' ')}
      data-seat-name
    >
      {name}
    </span>
  </div>
  ```

- [ ] **Step 6:** Update `showFaceUp` to honour `revealHoleCards`:

  ```ts
  const showFaceUp = isYou || highlightCards || revealHoleCards;
  ```

- [ ] **Step 7:** Insert the hand-category badge BEFORE the state badges (FOLDED/ALL-IN/BUSTED):

  ```tsx
  {
    handRank && (
      <span
        className="font-display text-[9px] tracking-[0.18em] text-gold-bright"
        data-seat-hand-category={handRank.category}
      >
        {HAND_CATEGORY_LABEL[handRank.category]}
      </span>
    );
  }
  ```

- [ ] **Step 8:** Preserve the 4-card layout — OmahaSeat's existing JSX renders `seat.holeCards.slice(0, 4)` or similar with `cardSize` derived from `position`. Don't change that block beyond the `showFaceUp` plumbing.

- [ ] **Step 9:** Update `OmahaSeat.test.tsx`. Same pattern as DrawSeat:
  - Find every `expect(screen.getByText('ROCK'))` / `'SHARK'` / `'MANIAC'` / `'STATION'` assertion — replace with mask-name-present + archetype-labels-not-present pattern from `holdem/Seat.test.tsx:34-51`.
  - Find every pinned `neon-cyan` / `neon-magenta` / `bg-felt-deep` / `text-white` class assertion — flip to brand-token equivalents.
  - Add the two new tests from `holdem/Seat.test.tsx` ("does not leak hand-category badge during play" + "revealHoleCards + handRank renders the hand-category badge"). Adjust the `holeCards` array to 4 cards (Omaha) instead of 2 (Hold'em) for those tests.

- [ ] **Step 10:** Run + commit.
  ```bash
  pnpm exec vitest run src/games/poker/omaha/OmahaSeat.test.tsx
  git add src/games/poker/omaha/OmahaSeat.tsx src/games/poker/omaha/OmahaSeat.test.tsx
  git commit -m "feat(poker): OmahaSeat MaskAvatar + brand tokens + reveal/handRank props"
  ```

---

## Task A.3 — OmahaTable brand pass + isPostHand reveal

**Files:** `src/games/poker/omaha/OmahaTable.tsx`.

Mirror `holdem/PokerTable.tsx`'s isPostHand pattern. The **only** Omaha-specific deviation: hand-rank computation uses `evaluateFrom(holeCards, board, 'omaha')`.

- [ ] **Step 1:** Add imports:

  ```ts
  import { evaluateFrom } from '../_shared/handEvaluator';
  import type { HandRank } from '../_shared/types';
  ```

  Confirm the export name — read `_shared/handEvaluator.ts` if uncertain.

- [ ] **Step 2:** Brand-token pass:
  - `bg-felt-deep` → `bg-felt-table` / `bg-felt-table-deep`
  - `text-white` / `text-white/60` → `text-ivory` / `text-ivory/55`
  - `neon-*` accents → drop or replace with `text-gold-bright` / `border-brass`
  - Central pot display: `font-mono tabular-nums text-2xl text-gold-bright`
  - Outer wrapper: `rounded-[3rem] border border-brass/60 bg-felt-table-deep p-6`

- [ ] **Step 3:** Compute `isPostHand`:

  ```ts
  const isShowdown = stateValue === 'hand_complete' || stateValue === 'showdown';
  const isPostHand = isShowdown || (stateValue === 'idle' && handResult !== null);
  ```

- [ ] **Step 4:** In the AI seats render loop, thread `revealHoleCards` + `handRank`:

  ```tsx
  {
    aiSeats.map((seat) => {
      const revealedEntry =
        isShowdown && handResult
          ? handResult.revealedHands.find((rh) => rh.seatId === seat.seatId)
          : null;
      const seatWithRevealedCards = revealedEntry
        ? { ...seat, holeCards: revealedEntry.holeCards }
        : seat;
      const isWinner = handResult?.winners.some((w) => w.seatId === seat.seatId) ?? false;

      // Post-hand reveal — Omaha needs 4 hole cards visible at hand end.
      const revealHoleCards = isPostHand && seat.holeCards.length === 4;

      // Omaha rule: must use exactly 2 of 4 hole cards + exactly 3 of 5 board.
      // evaluateFrom(...,'omaha') enforces this; do NOT use evaluateBest5(...).
      // Pre-river fold-outs leave the board incomplete → skip the category.
      const handRank: HandRank | undefined = revealHoleCards
        ? (revealedEntry?.handRank ??
          (board.length === 5 ? evaluateFrom(seat.holeCards, board, 'omaha') : undefined))
        : undefined;

      return (
        <OmahaSeat
          key={seat.seatId}
          seat={seatWithRevealedCards}
          isButton={seat.seatId === buttonSeat}
          isSb={seat.seatId === sbSeat}
          isBb={seat.seatId === bbSeat}
          isActing={inBettingState && toActSeat === seat.seatId}
          revealHoleCards={revealHoleCards}
          {...(revealedEntry ? { highlightCards: isWinner } : {})}
          {...(handRank ? { handRank } : {})}
          position="top"
        />
      );
    });
  }
  ```

  **Notes:**
  - `seat.holeCards.length === 4` (NOT 2 or 5).
  - `board.length === 5` guard (same as Hold'em — Omaha also has a 5-card community board).
  - Use `evaluateFrom(..., 'omaha')`, NOT `evaluateBest5`. Critical for correctness.

- [ ] **Step 5:** Run + commit.
  ```bash
  pnpm exec vitest run src/games/poker/omaha
  git add src/games/poker/omaha/OmahaTable.tsx
  git commit -m "feat(poker): OmahaTable brand pass + post-hand AI reveal (2+3 rule)"
  ```

---

## Task A.4 — OmahaPage chrome rewrite

**Files:** `src/games/poker/omaha/OmahaPage.tsx` + test.

This is the big task. Diff your output against `holdem/HoldemPage.tsx` line-by-line. Read FiveCardDrawPage.tsx for a second confirmation. Every section has a direct analog.

### Top of file

- [ ] **Step 1:** Update imports:

  ```ts
  import type { JSX } from 'react';
  import { useCallback, useEffect, useRef, useState } from 'react';
  import { motion } from 'framer-motion'; // only if porting celebration shake from HoldemPage; else skip
  import { useMachine } from '@xstate/react';
  import { useCurrentUser } from '@/store/sessionStore';
  import { useBalance } from '@/store/walletStore';
  import { useGameRound } from '@/games/_shared/useGameRound';
  import LobbyButton from '@/games/_shared/LobbyButton';
  import RulesButton from '@/games/_shared/RulesButton';
  import { useSound } from '@/systems/sound/useSound';
  import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
  import type { BetHandle } from '@/systems/wallet';
  import type { Archetype } from '../_shared/ai/archetypes';
  import { decideOmaha } from '../_shared/ai/decideOmaha';
  import { assignMaskName } from '../_shared/maskNames';
  import PokerOddsHeader from '../_shared/PokerOddsHeader';
  import PokerRulesModal from '../_shared/PokerRulesModal';
  import { omahaMachine, type OmahaContext, type MachineInput } from './machine';
  import { STAKES } from '../holdem/stakesConfig';
  import type { StakesTier } from '../holdem/stakesConfig';
  import SetupPanel from '../holdem/SetupPanel';
  import OmahaTable from './OmahaTable';
  ```

  Drop the `useReducedMotion` import from `framer-motion` and the `ARCHETYPE_NAMES` constant. Keep `pickArchetype` because `buildMachineInput` still picks archetypes (just the names change).

### Constants

- [ ] **Step 2:** Add the same constants HoldemPage uses:
  ```ts
  const LEAVE_GRACE_MS = 15_000;
  const OUTCOME_BANNER_MS = 3_000;
  ```

### Win-tier helper

- [ ] **Step 3:** Inline-duplicate `pickWinTier` from HoldemPage (Phase 15 patterns explicitly allow this rather than premature extraction):
  ```ts
  type WinTier = 'small' | 'medium' | 'jackpot' | 'loss';
  function pickWinTier(wonAmount: number, committed: number): WinTier {
    if (wonAmount <= 0) return 'loss';
    const ratio = wonAmount / Math.max(1, committed);
    if (ratio >= 20) return 'jackpot';
    if (ratio >= 2) return 'medium';
    return 'small';
  }
  ```

### buildMachineInput mask plumbing

- [ ] **Step 4:** Rewrite `buildMachineInput`:
  ```ts
  function buildMachineInput(
    sessionId: string,
    buyIn: number,
    tableSize: number,
    stakes: { sb: number; bb: number },
    rng: () => number,
  ): MachineInput {
    const maskNames = assignMaskName(rng, tableSize);
    const aiArchetypes = Array.from({ length: tableSize - 1 }, (_, i) => {
      const archetype = pickArchetype(rng);
      const name = maskNames[i]!;
      const stack = stakes.bb * 80;
      return { archetype, name, stack };
    });
    return { sessionId, buyIn, tableSize, stakes, aiArchetypes };
  }
  ```

### OmahaSession chrome + state additions

- [ ] **Step 5:** Hook swap inside `OmahaSession`:

  ```ts
  // Before
  const reduce = useReducedMotion();
  // After
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  ```

- [ ] **Step 6:** Add state for grace + outcome banner (mirror HoldemPage:114-122):

  ```ts
  const [revealComplete, setRevealComplete] = useState(false);
  const lastHandNumberRef = useRef<number>(snapshot.context.handNumber);
  const playerStartStackRef = useRef<number>(session.input.buyIn);
  const prevStateValueRef = useRef<string>('idle');
  const [graceRemainingMs, setGraceRemainingMs] = useState<number | null>(null);
  const [outcomeBannerVisible, setOutcomeBannerVisible] = useState(false);
  ```

- [ ] **Step 7:** Add the reset effect (mirror HoldemPage:132-142).

- [ ] **Step 8:** Add the outcome-banner auto-dismiss effect (3s timer).

- [ ] **Step 9:** Add the countdown-tick effect.

- [ ] **Step 10:** Add the fallback grace trigger effect — fires from `idle` with handResult populated. Crucial for fold-out paths.

- [ ] **Step 11:** Add the auto-next-hand effect — gated on `revealComplete` AND `graceRemainingMs <= 0`. Wrap the `setGraceRemainingMs(null)` in `setTimeout(() => …, 0)` to satisfy `react-hooks/set-state-in-effect`.

- [ ] **Step 12:** Add `handleRevealComplete`, `handleDealNow` callbacks (mirror HoldemPage:362-370).

### Sound wiring

- [ ] **Step 13:** Sound transitions effect — mirror HoldemPage's pattern:
  - On entering `posting_blinds`: 2 `chip.place` (SB + BB, 80 ms apart) + start 4-card-per-seat deal stagger via `card.deal` timers per seat (80 ms apart, coalesce to ~12/sec total).
  - On entering `advance_street` flop: 3 `card.deal` staggered 120 ms apart.
  - On entering `advance_street` turn/river: single `card.deal`.
  - On player actions: `chip.place` for call/raise (wired via handleCall/handleRaise).
  - On entering `hand_complete` with player outcome: `play(winTier === 'loss' ? 'loss' : \`win.${winTier}\`)`.

### Showdown win-tier

- [ ] **Step 14:** Compute win-tier from handResult (mirror HoldemPage:349-356):
  ```ts
  const playerSeat = snapshot.context.seats.find((s) => s.seatId === 0);
  const playerHandWonAmount = (() => {
    if (!snapshot.context.handResult || !playerSeat) return 0;
    const w = snapshot.context.handResult.winners.find((w) => w.seatId === 0);
    return w?.awarded ?? 0;
  })();
  const playerHandCommitted = playerSeat?.committedThisHand ?? 0;
  const winTier: WinTier = pickWinTier(playerHandWonAmount, playerHandCommitted);
  ```

### Render shell

- [ ] **Step 15:** Wrap the existing OmahaTable render with `<div className="relative h-full">` + add the outcome banner + grace bar (lift HoldemPage:430-499, swap `PokerTable` → `OmahaTable`):

  ```tsx
  return (
    <div className="relative h-full">
      <OmahaTable
        ctx={snapshot.context}
        stateValue={stateValue}
        winTier={winTier}
        onRevealComplete={handleRevealComplete}
        onFold={handleFold}
        onCheck={handleCheck}
        onCall={handleCall}
        onRaise={handleRaise}
        onLeave={handleLeave}
      />
      {outcomeBannerVisible && (
        <div
          className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center"
          data-outcome-banner
        >
          <div
            className={[
              'rounded-lg border-2 px-10 py-5 text-center backdrop-blur-sm shadow-2xl',
              isPlayerWin
                ? 'border-gold-bright bg-velvet-deep/95 text-gold-bright'
                : 'border-casino-red bg-velvet-deep/95 text-casino-red',
            ].join(' ')}
            data-outcome-banner-tone={isPlayerWin ? 'win' : 'loss'}
          >
            <div className="font-display text-3xl tracking-[0.22em]">
              {isPlayerWin
                ? `YOU WIN +${playerHandWonAmount.toLocaleString()}`
                : 'BETTER LUCK NEXT HAND'}
            </div>
          </div>
        </div>
      )}
      {inGracePeriod && (
        <div
          className="absolute inset-x-0 bottom-6 z-30 flex justify-center"
          data-between-hands-bar
        >
          <div className="flex items-center gap-4 rounded-md border border-brass/60 bg-velvet-deep/95 px-6 py-3 shadow-xl">
            <span className="font-display text-xs tracking-[0.18em] text-ivory/70">
              Next hand in{' '}
              <span className="text-gold-bright tabular-nums" data-grace-seconds>
                {Math.ceil(graceRemainingMs / 1000)}s
              </span>
            </span>
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-md border border-casino-red/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-casino-red hover:bg-casino-red/10"
              data-leave-grace
            >
              LEAVE NOW
            </button>
            <button
              type="button"
              onClick={handleDealNow}
              className="rounded-md border border-brass/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
              data-deal-now
            >
              DEAL NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
  ```

  Verify `OmahaTable`'s Props signature accepts `winTier` + `onRevealComplete`; if not, add them in A.3 retroactively (same change `PokerTable` got in #12.v1).

### Bust prompt + session-over screens

- [ ] **Step 16:** Rewrite the bust prompt + session-over branches with brand tokens (mirror HoldemPage:362-428).

### Top-level OmahaPage shell

- [ ] **Step 17:** Replace the page-root shell. Mirror HoldemPage's bottom-of-file (line 449-489):

  ```tsx
  export default function OmahaPage(): JSX.Element | null {
    const user = useCurrentUser();
    const balance = useBalance();
    const { placeBet } = useGameRound('poker');

    const [session, setSession] = useState<SessionState | null>(null);
    const [sessionKey, setSessionKey] = useState(0);
    const [rulesOpen, setRulesOpen] = useState(false);

    const handleSitDown =
      useCallback(/* preserve existing — buildMachineInput now plumbs maskNames */);
    const handleSessionOver = useCallback(() => {}, []);
    const handleReset = useCallback(() => {
      setSession(null);
      setSessionKey((k) => k + 1);
    }, []);

    if (!user) return null;

    return (
      <div className="relative flex h-full flex-col bg-felt-table text-ivory">
        <div className="absolute left-4 top-4 z-20">
          <LobbyButton />
        </div>
        <div className="absolute right-4 top-4 z-20">
          <PokerOddsHeader variant="omaha" />
        </div>

        <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
          <header className="mb-2 text-center">
            <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
              MASQUER &middot; Omaha
            </h1>
            <p
              className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
              data-omaha-subtitle
            >
              Omaha &middot; No-Limit &middot; Cash
            </p>
          </header>

          {!session ? (
            <div className="flex flex-1 items-center justify-center">
              <SetupPanel balance={balance} onSitDown={handleSitDown} />
            </div>
          ) : (
            <OmahaSession
              key={`${session.input.sessionId}-${sessionKey}`}
              session={session}
              onSessionOver={handleSessionOver}
              onReset={handleReset}
            />
          )}
        </main>

        <RulesButton onClick={() => setRulesOpen(true)} />
        <PokerRulesModal open={rulesOpen} variant="omaha" onClose={() => setRulesOpen(false)} />
      </div>
    );
  }
  ```

### Tests

- [ ] **Step 18:** Update `OmahaPage.test.tsx` — add the same assertions HoldemPage.test.tsx + FiveCardDrawPage.test.tsx have:
  - MASQUER · Omaha title (heading level 1, regex match).
  - LobbyButton link present.
  - PokerOddsHeader Omaha content visible (e.g. `expect(screen.getByText(/No-Limit Omaha/)).toBeInTheDocument()`).
  - Rules button present.
  - Page root uses `h-full`, NOT `min-h-screen`.
  - AI seats show mask names + NOT any archetype labels.
  - Between-hands grace: after fold → grace overlay with `data-grace-seconds` + `LEAVE NOW` + `DEAL NOW`. Pattern from `holdem/HoldemPage.test.tsx:291-326`.

- [ ] **Step 19:** Mock setup at top of test (same as Hold'em + Draw):

  ```ts
  vi.mock('@/motion/useEffectiveReducedMotion', () => ({
    useEffectiveReducedMotion: () => true,
  }));
  vi.mock('@/systems/sound/useSound', () => ({
    useSound: () => ({ play: vi.fn() }),
  }));
  ```

- [ ] **Step 20:** Run + commit.
  ```bash
  pnpm exec vitest run src/games/poker/omaha/OmahaPage.test.tsx
  git add src/games/poker/omaha/OmahaPage.tsx src/games/poker/omaha/OmahaPage.test.tsx
  git commit -m "feat(poker): MASQUER Omaha shell + sound + masks + grace + reveal"
  ```

---

## Task A.5 — BUILD_GUIDE + visual verification

- [ ] **Step 1:** Amend `BUILD_GUIDE.md` §13c — note the Phase 15 polish pass + chrome inheritance from §13a + reference the 2+3 rule + spec link.

  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md
  git add BUILD_GUIDE.md
  git commit -m "docs(poker): BUILD_GUIDE §13c — note phase 15 polish + chrome inheritance"
  ```

- [ ] **Step 2:** Start the dev server.

  ```bash
  pkill -f vite 2>/dev/null || true
  rm -rf node_modules/.vite
  pnpm dev > /tmp/dev.log 2>&1 &
  sleep 4
  curl -sI http://localhost:5173/ | head -1
  ```

- [ ] **Step 3:** Write a Playwright script (adapt `/tmp/screenshot-holdem-reveal.mjs`) that registers a fresh user, navigates to `/play/poker/omaha`, sits at a 4-player table, screenshots:
  - Setup screen (MASQUER · Omaha title, brand-token chrome, BACK TO LOBBY, ODDS & PAYOUTS, RULES)
  - Table mid-hand (4 AI hole cards face-down + community board + mask avatars)
  - Post-fold grace overlay (NEXT HAND IN Xs + LEAVE NOW + DEAL NOW)
  - All AI hole cards face-up + hand-category labels (when board reaches river)
  - Rules modal showing the 2+3 rule callout

- [ ] **Step 4:** Read the screenshots. Sanity check the visual is on-brand, 4 cards per AI seat, no overflow, 2+3 rule text visible in modal.

- [ ] **Step 5:** Stop dev. `pkill -f vite`

---

## Task A.6 — Full DoD + open PR

- [ ] **Step 1:** Full DoD locally.

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

  All six must pass. Do NOT push if any fail.

- [ ] **Step 2:** Push.

  ```bash
  git push -u origin phase-15-12-v3-omaha
  ```

- [ ] **Step 3:** Open PR.

  ```bash
  gh pr create --title "phase-15(#12.v3) Omaha — MASQUER chrome + reveal + grace (closes trio)" --body "..."
  ```

  Title is ~70 chars.

- [ ] **Step 4:** Report PR URL + summary + DoD confirmation + screenshot-verification confirmation. Do NOT merge — controller merges.

---

## Self-review

**Spec coverage:**

- §4.1 OmahaPage chrome → A.4
- §4.2 OmahaTable brand pass + isPostHand reveal (with `evaluateFrom(...,'omaha')`) → A.3
- §4.3 OmahaSeat retrofit → A.2
- §4.4 Sound taxonomy → A.4 Step 13
- §4.5 PokerOddsHeader Omaha content → A.1 Step 1
- §4.6 PokerRulesModal Omaha rules block (2+3 rule load-bearing) → A.1 Step 3

**Placeholder scan:** None. Every step has explicit code or commands.

**Type consistency:** `WinTier`, `HandRank`, `PokerVariant`, `OmahaSeatState` consistent. `evaluateFrom(...,'omaha')` (NOT `evaluateBest5`) called out explicitly in A.3 + critical-context.

**Risks carried forward:** All spec §7 risks have explicit task coverage. The single critical bug-vector (`evaluateBest5` instead of `evaluateFrom(...,'omaha')`) gets two callouts in the plan.

---
