# Phase 15 sub-project #12.v2 — Five-Card Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the MASQUER polish recipe to Five-Card Draw, inheriting the shared chrome shipped in #12.v1 Hold'em.

**Architecture:** Single PR. No admin work (the Draw tab in `/admin/poker` already populates from existing aggregations).

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-12-v2-five-card-draw-design.md` (PR #282).

---

## Shared rules

1. **Pure logic untouched.** `five-card-draw/{drawLogic,machine}.ts`, `_shared/{handEvaluator,sidePots,deck,types}.ts`, `_shared/ai/{archetypes,decide,decideDiscard}.ts` byte-stable.
2. **Games sandbox preserved.** No `@/db` or `@/store` imports from `src/games/poker/**`.
3. **One `rounds` row per poker session** (ADR-0041). No change to wallet model.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **No CLAUDE.md edits.**
6. **Commit subject ≤ 100 chars** (`feedback-localgamble-commit-subject-limit`).
7. **Conventional Commits.** Scopes for this PR: `poker`, `docs`. Never `admin` (no admin work). Never `sound` (reverted earlier this phase).
8. **No `--no-verify`. No `--amend`.** Reset + new commit if hook fails.
9. **TS strict + exactOptionalPropertyTypes.** Optional fields via spread.
10. **Tokens-only Tailwind** in rebuilt files.
11. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** (per `localgamble-min-h-screen-in-pages` memory).
12. **Visual verification via Playwright at 1440×900 before pushing** (per `localgamble-screenshot-before-pushing-ui` memory).
13. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```

---

## Critical context

### Hold'em is the canonical shape

Every task in this plan has a direct analog in `src/games/poker/holdem/`. **Read the matching Hold'em file before writing the Draw version** — the diff is small but the patterns are load-bearing (mask-name plumbing, banner + grace overlay layout, isPostHand gate, MaskAvatar + brand-token combo on Seat).

| Draw file              | Mirror these Hold'em files                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| `FiveCardDrawPage.tsx` | `holdem/HoldemPage.tsx`                                                           |
| `DrawTable.tsx`        | `holdem/PokerTable.tsx`                                                           |
| `DrawSeat.tsx`         | `holdem/Seat.tsx`                                                                 |
| `DiscardControls.tsx`  | nothing direct — but follow brand-token pairings from `PHASE_15_PATTERNS.md §1.4` |

### Five-Card Draw key differences

- **5 hole cards per seat** (not 2).
- **No community board** — `evaluateBest5(seat.holeCards)` directly evaluates the 5 cards.
- **Draw phase** between two betting rounds (DiscardControls drives it). Already wired in machine — pure UI.
- **`drewLabel`** prop on DrawSeat — shows "drew 2" / "stood pat" after draw. **Preserve as-is.**

### File structure

| File                                                       | Action  | Responsibility                                                                                                                         |
| ---------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/poker/_shared/PokerOddsHeader.tsx`              | Modify  | Fill the `five-card-draw` content string.                                                                                              |
| `src/games/poker/_shared/PokerOddsHeader.test.tsx`         | Modify  | Update the Draw variant assertion.                                                                                                     |
| `src/games/poker/_shared/PokerRulesModal.tsx`              | Modify  | Replace `DrawRules` placeholder body with real rules.                                                                                  |
| `src/games/poker/_shared/PokerRulesModal.test.tsx`         | Modify  | Update the Draw variant assertion to match real content.                                                                               |
| `src/games/poker/five-card-draw/DrawSeat.tsx`              | Modify  | MaskAvatar adopt + brand tokens + `revealHoleCards` + `handRank` props. Drop archetype label.                                          |
| `src/games/poker/five-card-draw/DrawSeat.test.tsx`         | Modify  | Replace archetype-label + neon-cyan assertions with MaskAvatar + brand-token assertions. New cases for `revealHoleCards` + `handRank`. |
| `src/games/poker/five-card-draw/DrawTable.tsx`             | Modify  | Brand pass + `isPostHand` reveal threading.                                                                                            |
| `src/games/poker/five-card-draw/DiscardControls.tsx`       | Modify  | Brand-token pass.                                                                                                                      |
| `src/games/poker/five-card-draw/DiscardControls.test.tsx`  | Modify  | Update class-string assertions.                                                                                                        |
| `src/games/poker/five-card-draw/FiveCardDrawPage.tsx`      | Rewrite | Chrome retrofit (mirror HoldemPage).                                                                                                   |
| `src/games/poker/five-card-draw/FiveCardDrawPage.test.tsx` | Modify  | Add MASQUER chrome + sound + mask name + grace + banner assertions.                                                                    |
| `BUILD_GUIDE.md` §13b                                      | Modify  | Note polish pass + chrome inheritance from §13a.                                                                                       |

---

## Branch

```bash
git checkout main && git pull origin main && git checkout -b phase-15-12-v2-draw
```

---

## Task A.0 — Read context (15 min)

- [ ] **Step 1:** Read the spec end-to-end (`docs/superpowers/specs/2026-05-27-phase-15-12-v2-five-card-draw-design.md`).
- [ ] **Step 2:** Read this plan.
- [ ] **Step 3:** Read the canonical Hold'em mirrors:
  - `src/games/poker/holdem/HoldemPage.tsx` (full chrome — mask plumbing, sound wiring, banner + grace overlay, fallback grace trigger from idle)
  - `src/games/poker/holdem/PokerTable.tsx` (isPostHand gate + per-AI-seat reveal threading)
  - `src/games/poker/holdem/Seat.tsx` (MaskAvatar + brand tokens + `revealHoleCards` + `handRank`)
- [ ] **Step 4:** Read the current Draw files to size the diff:
  - `src/games/poker/five-card-draw/{FiveCardDrawPage,DrawTable,DrawSeat,DiscardControls}.tsx`
  - Their `.test.tsx` siblings to find pinned assertions that need flipping
- [ ] **Step 5:** Read the shared variant-aware shell:
  - `src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal,MaskAvatar,maskNames}.{ts,tsx}` and tests
- [ ] **Step 6:** Read project memories `feedback-localgamble-min-h-screen-in-pages` + `feedback-localgamble-screenshot-before-pushing-ui` if not already in your working context — both will fire during this PR.

---

## Task A.1 — Shared variant content (build first)

**Files:** `src/games/poker/_shared/PokerOddsHeader.tsx` + `PokerRulesModal.tsx` + their tests.

These have no Draw-file dependencies. Build + test FIRST — locks the shared API the new FiveCardDrawPage will consume.

- [ ] **Step 1:** In `PokerOddsHeader.tsx`, replace the Draw placeholder:

  ```ts
  // Before
  'five-card-draw': "Five-Card Draw · v2 coming soon",
  // After
  'five-card-draw': "No-Limit Five-Card Draw · 2-6 players · 80 BB buy-in · Rebuy on bust",
  ```

  Verify Hold'em's `holdem` string is structurally identical (same Hold'em format).

- [ ] **Step 2:** Update `PokerOddsHeader.test.tsx`. The Draw variant assertion likely checks for "v2 coming soon" — replace with `expect(...).toHaveTextContent('No-Limit Five-Card Draw')` (or similar substring assertion).

- [ ] **Step 3:** In `PokerRulesModal.tsx`, replace the `DrawRules` component body. Use the same JSX shape as `HoldemRules`:

  ```tsx
  function DrawRules(): JSX.Element {
    return (
      <div className="text-ivory/85 space-y-3">
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
          <p>
            Make the best 5-card hand from your dealt 5 cards. After the first betting round
            optionally replace 0-3 cards from the deck. Best hand after the second betting round
            wins.
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
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">DRAW PHASE</h3>
          <p>
            Tap cards to select up to 3 for replacement. Click DRAW to swap, or STAND PAT to keep
            your hand. Order: pre-draw bet → draw → post-draw bet → showdown.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BETTING ROUNDS</h3>
          <p>Pre-draw and post-draw. Action: fold · check · call · raise.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SHOWDOWN</h3>
          <p>
            If two or more players remain after the post-draw bet, hole cards reveal and the best
            5-card hand wins the pot (split on ties).
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
          <p>Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table at any time between hands.</p>
        </section>
      </div>
    );
  }
  ```

- [ ] **Step 4:** Update `PokerRulesModal.test.tsx`. Draw variant assertion likely checks for "Rules coming in v2" placeholder — replace with `expect(...).toHaveTextContent('DRAW PHASE')` or similar substring matching the new content.

- [ ] **Step 5:** Run.

  ```bash
  pnpm exec vitest run src/games/poker/_shared/PokerOddsHeader.test.tsx src/games/poker/_shared/PokerRulesModal.test.tsx
  ```

- [ ] **Step 6:** Commit.
  ```bash
  git add src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal}.{ts,tsx} src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal}.test.tsx
  git commit -m "feat(poker): fill PokerOddsHeader + PokerRulesModal Draw content"
  ```

---

## Task A.2 — DrawSeat retrofit

**Files:** `src/games/poker/five-card-draw/DrawSeat.tsx` + test.

Mirror `src/games/poker/holdem/Seat.tsx` exactly — same Props additions, same MaskAvatar adoption, same brand-token swap. Preserve `drewLabel`.

- [ ] **Step 1:** Update imports:

  ```ts
  import type { JSX } from 'react';
  import type { DrawSeatState } from './machine';
  import type { HandRank, HandCategory } from '../_shared/types';
  import PlayingCard from '../_shared/PlayingCard';
  import MaskAvatar from '../_shared/MaskAvatar';
  ```

- [ ] **Step 2:** Add the same `HAND_CATEGORY_LABEL` map that `holdem/Seat.tsx` exports inline. (Don't share — keep it co-located per existing pattern.)

- [ ] **Step 3:** Extend Props:

  ```ts
  interface Props {
    seat: DrawSeatState;
    isButton: boolean;
    isSb: boolean;
    isBb: boolean;
    isActing: boolean;
    /** Cards to highlight as part of the winning best-5 */
    highlightCards?: boolean;
    /** Post-hand reveal — flips AI cards face-up without the winner ring. */
    revealHoleCards?: boolean;
    /** Hand category label shown beneath the cards. Only set during post-hand reveal. */
    handRank?: HandRank;
    /** Position label for layout orientation */
    position?: 'top' | 'bottom';
    /** Label shown after the draw phase (e.g. "drew 2" / "stood pat") */
    drewLabel?: string;
  }
  ```

- [ ] **Step 4:** In the function body:
  - Drop the `archetype` derivation + the `font-display text-[10px] tracking-wider` archetype label rendering (currently somewhere around line 90-100 — locate by reading the full file in A.0).
  - Replace `actingRing = 'ring-2 ring-neon-cyan shadow-[0_0_12px_rgba(61,240,255,0.6)]'` with `'ring-2 ring-gold-bright shadow-[0_0_12px_rgba(232,189,109,0.6)]'`.
  - Replace the outer container className from:
    ```ts
    'relative flex flex-col items-center gap-1 rounded-lg border border-gold/20 bg-felt-deep/80 px-3 py-2';
    ```
    to:
    ```ts
    'relative flex flex-col items-center gap-1 rounded-lg border border-brass/40 bg-velvet-deep/70 px-3 py-2';
    ```
  - Replace blind badges (SB / BB) backgrounds: `bg-neon-cyan/70` → `bg-brass/80`; `bg-neon-magenta/70` → `bg-gold-bright`. (Mirror holdem/Seat.)
  - Replace name `text-white` → `text-ivory/85`; player name keeps `text-gold-bright`.

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

- [ ] **Step 7:** Insert hand-category badge BEFORE the state badges (FOLDED / ALL-IN / BUSTED block):

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

- [ ] **Step 8:** Preserve `drewLabel` rendering exactly where it is today (don't lose Draw-specific behaviour).

- [ ] **Step 9:** Update `DrawSeat.test.tsx`. Locate every assertion that:
  - Pins `archetype.toUpperCase()` (e.g. `expect(screen.getByText('ROCK'))`) — replace with assertions that mask name is present + archetype labels are NOT present, mirroring `holdem/Seat.test.tsx:34-51`.
  - Pins `neon-cyan` / `neon-magenta` / `bg-felt-deep` / `text-white` classes — flip to brand-token equivalents.
  - Add the two new tests from holdem/Seat: "does not leak hand-category badge during play" + "revealHoleCards + handRank renders the hand-category badge". Copy from `src/games/poker/holdem/Seat.test.tsx:186-244` and adjust `Seat` → `DrawSeat`, `makeSeat` → the equivalent helper in DrawSeat.test.tsx.

- [ ] **Step 10:** Run + commit.
  ```bash
  pnpm exec vitest run src/games/poker/five-card-draw/DrawSeat.test.tsx
  git add src/games/poker/five-card-draw/DrawSeat.tsx src/games/poker/five-card-draw/DrawSeat.test.tsx
  git commit -m "feat(poker): DrawSeat MaskAvatar + brand tokens + reveal/handRank props"
  ```

---

## Task A.3 — DrawTable brand pass + isPostHand reveal

**Files:** `src/games/poker/five-card-draw/DrawTable.tsx`.

Mirror `holdem/PokerTable.tsx`'s isPostHand pattern. Five-Card Draw has no community board, so the AI-seat reveal section is the only place that needs the new gate.

- [ ] **Step 1:** Add imports if needed:

  ```ts
  import { evaluateBest5 } from '../_shared/handEvaluator';
  import type { HandRank } from '../_shared/types';
  ```

- [ ] **Step 2:** Replace raw colour classes with brand tokens:
  - `bg-felt-deep` → `bg-felt-table` (or `bg-felt-table-deep` for the inset oval)
  - `text-white` / `text-white/60` → `text-ivory` / `text-ivory/55`
  - `neon-cyan` / `neon-magenta` accents → drop or replace with `text-gold-bright` / `border-brass`
  - Central pot display: `font-mono tabular-nums text-2xl text-gold-bright`
  - Outer table wrapper: `rounded-[3rem] border border-brass/60 bg-felt-table-deep p-6`

- [ ] **Step 3:** Compute `isPostHand`:

  ```ts
  const isShowdown = stateValue === 'hand_complete' || stateValue === 'showdown';
  const isPostHand = isShowdown || (stateValue === 'idle' && handResult !== null);
  ```

  (Mirror `holdem/PokerTable.tsx:84-89`.)

- [ ] **Step 4:** In the AI seats render loop, thread `revealHoleCards` + `handRank` per seat:

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
      const revealHoleCards = isPostHand && seat.holeCards.length === 5;
      // No community board in Five-Card Draw — evaluate the 5 hole cards directly.
      // Showdown-revealed entries that already carry a handRank take precedence.
      const handRank: HandRank | undefined = revealHoleCards
        ? (revealedEntry?.handRank ?? evaluateBest5(seat.holeCards))
        : undefined;

      return (
        <DrawSeat
          key={seat.seatId}
          seat={seatWithRevealedCards}
          isButton={seat.seatId === buttonSeat}
          isSb={seat.seatId === sbSeat}
          isBb={seat.seatId === bbSeat}
          isActing={inBettingState && toActSeat === seat.seatId}
          revealHoleCards={revealHoleCards}
          {...(revealedEntry ? { highlightCards: isWinner } : {})}
          {...(handRank ? { handRank } : {})}
          {...(seat.drewLabel ? { drewLabel: seat.drewLabel } : {})}
          position="top"
        />
      );
    });
  }
  ```

  **Notes on shape:**
  - `seat.holeCards.length === 5` (NOT 2 like Hold'em).
  - No `board.length === 5` guard — the 5 hole cards are the complete hand once dealt.
  - Preserve any existing `drewLabel` plumbing from the current DrawTable. Use spread to avoid passing `undefined` (exactOptionalPropertyTypes).
  - Use the actual field name on the seat for `drewLabel` (might be `seat.drewLabel`, `seat.drewCount`, or derived elsewhere — verify from the current file).

- [ ] **Step 5:** Run + commit (tests for DrawTable likely exist or live inside FiveCardDrawPage.test.tsx — run the affected suite):
  ```bash
  pnpm exec vitest run src/games/poker/five-card-draw
  git add src/games/poker/five-card-draw/DrawTable.tsx
  git commit -m "feat(poker): DrawTable brand pass + post-hand AI reveal"
  ```

---

## Task A.4 — DiscardControls brand pass

**Files:** `src/games/poker/five-card-draw/DiscardControls.tsx` + test.

- [ ] **Step 1:** Tap-to-discard selected-card ring: `ring-2 ring-gold-bright`. Idle/unselected card: no ring; `border border-brass/40` if a border is shown.

- [ ] **Step 2:** DRAW button (primary): `rounded-md border-2 border-brass bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet-deep disabled:opacity-40 disabled:cursor-not-allowed`. (Mirror Plinko's DROP button style.)

- [ ] **Step 3:** STAND PAT button (secondary): `rounded-md border border-brass/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:border-brass`.

- [ ] **Step 4:** Caption text (e.g. "Select up to 3 cards to replace"): `text-[11px] text-ivory/85`.

- [ ] **Step 5:** Update `DiscardControls.test.tsx`. Find every class assertion pinning `bg-felt-deep` / `neon-*` / `text-white` — flip to brand-token equivalents (or to `data-*` attribute assertions where the classes are too specific to be load-bearing).

- [ ] **Step 6:** Run + commit.
  ```bash
  pnpm exec vitest run src/games/poker/five-card-draw/DiscardControls.test.tsx
  git add src/games/poker/five-card-draw/DiscardControls.tsx src/games/poker/five-card-draw/DiscardControls.test.tsx
  git commit -m "feat(poker): DiscardControls brand-token pass"
  ```

---

## Task A.5 — FiveCardDrawPage chrome rewrite

**Files:** `src/games/poker/five-card-draw/FiveCardDrawPage.tsx` + test.

**Step-by-step.** This is the big task. Diff your output against `src/games/poker/holdem/HoldemPage.tsx` line-by-line — every section has a direct analog.

### Top of file

- [ ] **Step 1:** Update imports:

  ```ts
  import type { JSX } from 'react';
  import { useCallback, useEffect, useRef, useState } from 'react';
  import { motion } from 'framer-motion'; // for the celebration shake if porting from HoldemPage; else skip
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
  import { decide } from '../_shared/ai/decide';
  import { decideDiscard } from '../_shared/ai/decideDiscard';
  import { assignMaskName } from '../_shared/maskNames';
  import PokerOddsHeader from '../_shared/PokerOddsHeader';
  import PokerRulesModal from '../_shared/PokerRulesModal';
  import { drawMachine, type DrawContext, type MachineInput } from './machine';
  import { STAKES } from '../holdem/stakesConfig';
  import type { StakesTier } from '../holdem/stakesConfig';
  import DrawTable from './DrawTable';
  ```

  Drop the `useReducedMotion` import from `framer-motion` and the `ARCHETYPE_NAMES` constant + `pickArchetype` (keep pickArchetype only if `buildMachineInput` still needs to pick archetypes — yes, archetypes still drive AI; just the NAME is no longer derived from archetype).

### Constants

- [ ] **Step 2:** Add the same constants HoldemPage uses:
  ```ts
  const LEAVE_GRACE_MS = 15_000;
  const OUTCOME_BANNER_MS = 3_000;
  ```

### Win-tier helper

- [ ] **Step 3:** Add the same `pickWinTier` helper HoldemPage uses (extract from HoldemPage if it's defined there inline):

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

  Or import from a shared module if HoldemPage already extracted it. If not, inline-duplicate (Phase 15 patterns explicitly allow this rather than extracting prematurely).

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

### DrawSession component — chrome + state additions

- [ ] **Step 5:** Inside `DrawSession`, swap the hook:

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

- [ ] **Step 7:** Add the reset effect (mirror HoldemPage:132-142):

  ```ts
  useEffect(() => {
    if (snapshot.context.handNumber !== lastHandNumberRef.current) {
      lastHandNumberRef.current = snapshot.context.handNumber;
      setRevealComplete(false);
      setGraceRemainingMs(null);
      setOutcomeBannerVisible(false);
      const playerSeat = snapshot.context.seats.find((s) => s.seatId === 0);
      if (playerSeat) {
        playerStartStackRef.current = playerSeat.stack + playerSeat.committedThisHand;
      }
    }
  }, [snapshot.context.handNumber, snapshot.context.seats]);
  ```

- [ ] **Step 8:** Add the outcome-banner auto-dismiss effect (mirror HoldemPage's 3s timer).

- [ ] **Step 9:** Add the countdown-tick effect (mirror HoldemPage's grace countdown).

- [ ] **Step 10:** Add the fallback grace trigger effect — fires from `idle` with handResult populated (mirror HoldemPage's fallback). Crucial for fold-out paths in Draw because the machine moves through hand_complete to idle similarly.

- [ ] **Step 11:** Add the auto-next-hand effect — gated on `revealComplete` AND `graceRemainingMs <= 0`. Wrap the `setGraceRemainingMs(null)` in a `setTimeout(() => …, 0)` to satisfy `react-hooks/set-state-in-effect`.

- [ ] **Step 12:** Add `handleRevealComplete`, `handleDealNow` callbacks (mirror HoldemPage:362-370).

### Sound wiring

- [ ] **Step 13:** Sound transitions effect — mirror HoldemPage's pattern:
  - On entering `posting_blinds`: 2 `chip.place` (SB + BB, 80 ms apart) + start 5-card deal stagger via 5 × 60 ms `card.deal` timers per seat (or coalesce to ~12/sec total).
  - On entering `betting` after `posting_blinds` (initial bets begin): no extra sound.
  - On entering `drawing`: schedule `card.deal` per replacement card with 80 ms stagger. **Note:** Five-Card Draw machine has a `drawing` state. Confirm exact state name from `machine.ts`. Replacement card count comes from `seat.drewCount` (or wherever it's stored — verify).
  - On entering `betting` after `drawing` (post-draw betting begins): no extra sound.
  - On player actions: `chip.place` for call/raise (already wired via handleCall/handleRaise).
  - On entering `hand_complete` with player-side outcome: `play(winTier === 'loss' ? 'loss' : \`win.${winTier}\`)`.

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

- [ ] **Step 15:** Wrap the existing DrawTable render with a `<div className="relative h-full">` for the absolute overlays, and add the outcome banner + grace bar (lift the entire JSX block from HoldemPage:430-499 — swap `PokerTable` for `DrawTable`):

  ```tsx
  return (
    <div className="relative h-full">
      <DrawTable
        ctx={snapshot.context}
        stateValue={stateValue}
        winTier={winTier}
        onRevealComplete={handleRevealComplete}
        onFold={handleFold}
        onCheck={handleCheck}
        onCall={handleCall}
        onRaise={handleRaise}
        onLeave={handleLeave}
        // ... preserve any Draw-specific props (DiscardControls callbacks, drawing handlers, etc)
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

  (Verify the `DrawTable` Props signature — if it doesn't already accept `winTier` and `onRevealComplete`, add them in A.3.)

### Bust prompt + session-over screens

- [ ] **Step 16:** Rewrite the bust prompt + session-over branches with brand tokens (mirror HoldemPage:362-428). The current Draw versions use raw colours that need to flip.

### Top-level FiveCardDrawPage shell

- [ ] **Step 17:** Replace the page-root shell (currently has a `min-h-screen`-style flex centring SetupPanel). Mirror HoldemPage's bottom of file (line 449-489):

  ```tsx
  export default function FiveCardDrawPage(): JSX.Element | null {
    const user = useCurrentUser();
    const balance = useBalance();
    const { placeBet } = useGameRound('poker');

    const [session, setSession] = useState<SessionState | null>(null);
    const [sessionKey, setSessionKey] = useState(0);
    const [rulesOpen, setRulesOpen] = useState(false);

    const handleSitDown =
      useCallback(/* ... existing logic, with maskNames plumbed via buildMachineInput */);
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
          <PokerOddsHeader variant="five-card-draw" />
        </div>

        <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
          <header className="mb-2 text-center">
            <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
              MASQUER &middot; Five-Card Draw
            </h1>
            <p
              className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
              data-draw-subtitle
            >
              Five-Card Draw &middot; No-Limit &middot; Cash
            </p>
          </header>

          {!session ? (
            <div className="flex flex-1 items-center justify-center">
              <SetupPanel balance={balance} onSitDown={handleSitDown} />
            </div>
          ) : (
            <DrawSession
              key={`${session.input.sessionId}-${sessionKey}`}
              session={session}
              onSessionOver={handleSessionOver}
              onReset={handleReset}
            />
          )}
        </main>

        <RulesButton onClick={() => setRulesOpen(true)} />
        <PokerRulesModal
          open={rulesOpen}
          variant="five-card-draw"
          onClose={() => setRulesOpen(false)}
        />
      </div>
    );
  }
  ```

  (Verify the existing `SetupPanel` import + shape — Draw might use its own SetupPanel from a sibling file. Preserve.)

### Tests

- [ ] **Step 18:** Update `FiveCardDrawPage.test.tsx` — add the same assertions HoldemPage.test.tsx has:
  - MASQUER · Five-Card Draw title (heading level 1, regex match).
  - LobbyButton link present.
  - PokerOddsHeader Draw content visible (e.g. `expect(screen.getByText(/No-Limit Five-Card Draw/)).toBeInTheDocument()`).
  - Rules button present.
  - Page root uses `h-full`, NOT `min-h-screen`.
  - AI seats show mask names (any of `MASK_NAME_POOL`) + NOT any archetype labels (ROCK / SHARK / etc).
  - Between-hands grace: after fold → grace overlay appears with `data-grace-seconds` countdown + `LEAVE NOW` + `DEAL NOW` buttons. Pattern from `holdem/HoldemPage.test.tsx:291-326`.

- [ ] **Step 19:** Mock setup at top of test (same as Hold'em):

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
  pnpm exec vitest run src/games/poker/five-card-draw/FiveCardDrawPage.test.tsx
  git add src/games/poker/five-card-draw/FiveCardDrawPage.tsx src/games/poker/five-card-draw/FiveCardDrawPage.test.tsx
  git commit -m "feat(poker): MASQUER Draw shell + sound + masks + grace + reveal"
  ```

---

## Task A.6 — BUILD_GUIDE + visual verification

- [ ] **Step 1:** Amend `BUILD_GUIDE.md` §13b — note the Phase 15 polish pass + chrome inheritance from §13a. Brief — one paragraph + link to spec.

  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md
  git add BUILD_GUIDE.md
  git commit -m "docs(poker): BUILD_GUIDE §13b — note phase 15 polish + chrome inheritance"
  ```

- [ ] **Step 2:** Start the dev server.

  ```bash
  pkill -f vite 2>/dev/null || true
  rm -rf node_modules/.vite
  pnpm dev > /tmp/dev.log 2>&1 &
  sleep 4
  curl -sI http://localhost:5173/ | head -1
  ```

- [ ] **Step 3:** Write a Playwright script (adapt `/tmp/screenshot-holdem-reveal.mjs`) that registers a fresh user, navigates to `/play/poker/five-card-draw`, sits at a 4-player table, screenshots:
  - Setup screen (MASQUER · Five-Card Draw title, brand-token chrome, BACK TO LOBBY, ODDS & PAYOUTS, RULES)
  - Table mid-hand (5 AI hole cards face-down, mask avatars, MASQUER cards in player hand)
  - Mid-discard (DiscardControls visible with brand tokens)
  - Post-fold grace overlay (NEXT HAND IN Xs + LEAVE NOW + DEAL NOW)
  - All AI hole cards face-up + hand-category labels under each seat
  - Rules modal (Draw rules block rendered)

- [ ] **Step 4:** Read the screenshots. Sanity check the visual is on-brand + nothing overflows.

- [ ] **Step 5:** Stop dev. `pkill -f vite`

---

## Task A.7 — Full DoD + open PR

- [ ] **Step 1:** Full DoD locally.

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

  All six must pass. Do NOT push if any fail.

- [ ] **Step 2:** Push.

  ```bash
  git push -u origin phase-15-12-v2-draw
  ```

- [ ] **Step 3:** Open PR.

  ```bash
  gh pr create --title "phase-15(#12.v2) Five-Card Draw — MASQUER chrome + reveal + grace" --body "..."
  ```

  Title is ~70 chars.

- [ ] **Step 4:** Report PR URL + summary + DoD confirmation + screenshot-verification confirmation. Do NOT merge — controller merges.

---

## Self-review

**Spec coverage:**

- §4.1 FiveCardDrawPage chrome → A.5
- §4.2 DrawTable brand pass + isPostHand reveal → A.3
- §4.3 DrawSeat retrofit → A.2
- §4.4 Sound taxonomy → A.5 Step 13
- §4.5 DiscardControls brand pass → A.4
- §4.6 PokerOddsHeader Draw content → A.1 Step 1
- §4.7 PokerRulesModal Draw rules block → A.1 Step 3

**Placeholder scan:** None. Every step has explicit code or commands.

**Type consistency:** `WinTier`, `HandRank`, `PokerVariant`, `DrawSeatState` consistent. `drewLabel` preserved.

**Risks carried forward:** All 5 spec §7 risks have explicit task coverage.

---
