# Phase 15 sub-project #12.v1 — Texas Hold'em Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 15 #12.v1 — apply the standard Phase 15 polish recipe to Texas Hold'em (lead poker variant), plus all shared chrome that #12.v2 Five-Card Draw and #12.v3 Omaha inherit for free, plus the new `/admin/poker` page scaffold.

**Architecture:** Two PRs.

- **PR A — chrome + Hold'em polish**: MasquerCard migration via adapter + brand-token pass + Venetian masquerade names + sound + reduced-motion swap + dramatic showdown stagger + MASQUER chrome (LobbyButton/OddsInfoBox/RulesModal) + drops `min-h-screen`. Touches `poker/_shared/**` + `poker/holdem/**` + import-touch on Draw + Omaha (no semantic change). BUILD_GUIDE §13a amendment.
- **PR B — `/admin/poker`**: new `/admin/poker` page with 4 StatCards + variant tabs + hero stacked-bar chart + biggest-pots panel + recent sessions table. Three new aggregations in `src/systems/stats.ts`. Variant tabs populate from existing persisted `details.variant` field — no schema migration.

PR A is the heavy one (~12 files touched, ~6 new). PR B is the standard admin-pattern.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 · Dexie 4 (no bump) · Recharts (lazy admin chunk per ADR-0039) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-12-v1-holdem-design.md` (PR #276, will merge before PR A dispatches).

---

## Shared rules

1. **Pure logic untouched.** `holdem/{holdemLogic,machine}.ts`, `_shared/{handEvaluator,sidePots,deck,types}.ts`, `_shared/ai/{archetypes,decide}.ts` byte-stable. Polish is presentational + additive only.
2. **Games sandbox preserved.** No `@/db` or `@/store` imports from `src/games/poker/**`.
3. **One `rounds` row per poker session** (ADR-0041). No change to wallet model.
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** BUILD_GUIDE §13a amendment in the first commit.
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** (`feedback-localgamble-commit-subject-limit`).
8. **Conventional Commits.** Scopes for this work: `poker` (game-side), `admin` (NOT `admin-poker` — PR B), `stats` (aggregations), `routing` (router/nav), `ui` (shared primitives), `docs` (spec/ADR/BUILD_GUIDE).
9. **No `--no-verify`. No `--amend`.** Reset + new commit if needed.
10. **TS strict + exactOptionalPropertyTypes.** Optional fields via `{...(cond ? {key: val} : {})}` spread.
11. **Tokens-only Tailwind** in rebuilt files.
12. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```
13. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** (see `feedback-localgamble-min-h-screen-in-pages` memory; this trap fired on Plinko, will fire on poker if not handled).
14. **For visual UI changes, screenshot via Playwright before pushing** (`feedback-localgamble-screenshot-before-pushing-ui` memory). Dev server + screenshot recipe in §"Visual verification" below.

---

## Critical context

### Card type adapter (load-bearing for A.3)

**The mismatch:** poker's `_shared/types.ts` `Card` uses `rank: number` where **Ace = 14**. Brand `@/components/brand/PlayingCard` uses `rank: 1 | 2 | 3 | ... | 13` where **Ace = 1**.

**Solution:** rewrite `_shared/PlayingCard.tsx` as a thin **adapter component**. Its public Props stay the same (`{ card: Card | null; faceDown?; size?; highlight? }`); internally it converts the poker rank to the brand rank and renders `<MasquerCard>` (the brand component). All 6 existing import sites (`holdem/Seat`, `holdem/ShowdownReveal`, `holdem/CommunityBoard`, `omaha/OmahaSeat`, `five-card-draw/DrawSeat`, `five-card-draw/DiscardControls`) keep their imports unchanged — they just render the new visual for free. The only test file change is `_shared/PlayingCard.test.tsx` which needs to assert the new MasquerCard render shape (data-attrs / aria-label / etc.).

This avoids touching Draw and Omaha for the card migration AND keeps PR A's diff focused.

### Reduced-motion hook swap

`useReducedMotion()` from `framer-motion` returns `boolean | null`. `useEffectiveReducedMotion()` from `@/motion/useEffectiveReducedMotion` returns `boolean`. Direct boolean usage works the same in `if (reduce)` checks; the difference is only relevant for explicit `=== null` checks (none in current poker code — verify in A.4).

### Showdown auto-next-hand timing

Current `HoldemPage.tsx:108-126` schedules `START_HAND` 1,200 ms after entering `idle` post-hand. New stagger reveal takes up to `N × 250 + 600 ms` (= 2,100 ms for 6-max). **Fix:** wait for `ShowdownReveal.onRevealComplete` before scheduling the next hand. See A.4 Step 4.

### File structure

#### PR A — game-side

| File                                                 | Action  | Responsibility                                                                                                                                                              |
| ---------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/poker/_shared/maskNames.ts`               | NEW     | `MASK_NAME_POOL` + `assignMaskName(rng, tableSize)` pure helper.                                                                                                            |
| `src/games/poker/_shared/maskNames.test.ts`          | NEW     | Pin pool size, no-repeat within table, deterministic per seeded rng.                                                                                                        |
| `src/games/poker/_shared/MaskAvatar.tsx`             | NEW     | Brass-ringed circle with the first letter of the mask name. Active-to-act seat glow variant.                                                                                |
| `src/games/poker/_shared/MaskAvatar.test.tsx`        | NEW     | Initial letter renders + active-to-act glow class.                                                                                                                          |
| `src/games/poker/_shared/PokerOddsHeader.tsx`        | NEW     | Variant-aware OddsInfoBox content wrapper.                                                                                                                                  |
| `src/games/poker/_shared/PokerOddsHeader.test.tsx`   | NEW     | Each variant renders distinct text.                                                                                                                                         |
| `src/games/poker/_shared/PokerRulesModal.tsx`        | NEW     | Variant-aware RulesModal wrapper; Hold'em rules block populated, Draw/Omaha placeholders.                                                                                   |
| `src/games/poker/_shared/PokerRulesModal.test.tsx`   | NEW     | Each variant renders distinct rules body.                                                                                                                                   |
| `src/games/poker/_shared/PlayingCard.tsx`            | Rewrite | Thin adapter — converts poker `Card` (Ace=14) to brand `PlayingCard` (Ace=1). Same Props. Renders `<MasquerCard>`.                                                          |
| `src/games/poker/_shared/PlayingCard.test.tsx`       | Modify  | Update assertions for new render shape (Masquer porcelain card with data-attrs).                                                                                            |
| `src/games/poker/_shared/PokerVariantModal.tsx`      | Modify  | Brand-token pass (replace `bg-felt-deep`/`text-white`/etc. with `bg-velvet-deep`/`text-ivory`/etc.). MaskMark in header.                                                    |
| `src/games/poker/_shared/PokerVariantModal.test.tsx` | Modify  | Update class-string assertions.                                                                                                                                             |
| `src/games/poker/PokerLobbyPage.tsx`                 | Modify  | MASQUER · Poker title + LobbyButton + brand tokens.                                                                                                                         |
| `src/games/poker/holdem/HoldemPage.tsx`              | Rewrite | Chrome rewrite — `flex h-full flex-col`, MASQUER title, LobbyButton, PokerOddsHeader, RulesButton+RulesModal, sound, `useEffectiveReducedMotion`, mask names, stagger wait. |
| `src/games/poker/holdem/HoldemPage.test.tsx`         | Modify  | New chrome + sound mock + mask-name assertions.                                                                                                                             |
| `src/games/poker/holdem/PokerTable.tsx`              | Modify  | Brand-token pass; oval-felt brass-edged backdrop; central pot in `font-mono tabular-nums text-gold-bright`.                                                                 |
| `src/games/poker/holdem/Seat.tsx`                    | Modify  | MaskAvatar adopt; mask name display; brand tokens; active-to-act glow.                                                                                                      |
| `src/games/poker/holdem/Seat.test.tsx`               | Modify  | MaskAvatar + mask name in DOM; archetype label not present.                                                                                                                 |
| `src/games/poker/holdem/CommunityBoard.tsx`          | Modify  | Brand-token pass; per-card dramatic reveal variant (scale + gold-glow + ~250 ms flop stagger).                                                                              |
| `src/games/poker/holdem/CommunityBoard.test.tsx`     | Modify  | Update class assertions.                                                                                                                                                    |
| `src/games/poker/holdem/BettingControls.tsx`         | Modify  | Brand tokens; brass-themed slider.                                                                                                                                          |
| `src/games/poker/holdem/BettingControls.test.tsx`    | Modify  | Update assertions.                                                                                                                                                          |
| `src/games/poker/holdem/SessionBar.tsx`              | Modify  | Brand tokens.                                                                                                                                                               |
| `src/games/poker/holdem/SessionBar.test.tsx`         | Modify  | Update assertions.                                                                                                                                                          |
| `src/games/poker/holdem/SetupPanel.tsx`              | Modify  | Brand tokens; standard SetupPanel chrome (felt backdrop + brass border + `w-full max-w-3xl`).                                                                               |
| `src/games/poker/holdem/SetupPanel.test.tsx`         | Modify  | Update.                                                                                                                                                                     |
| `src/games/poker/holdem/ShowdownReveal.tsx`          | Rewrite | Implements stagger orchestration (250 ms per seat + 600 ms winner glow + `win.{tier}` stinger); `onRevealComplete` callback; reduced-motion path.                           |
| `src/games/poker/holdem/ShowdownReveal.test.tsx`     | Modify  | Stagger timing assertions; winner glow class present on winning seat; reduced-motion instant path.                                                                          |
| `BUILD_GUIDE.md` §13a                                | Modify  | Note polish pass + mask names + admin scaffold.                                                                                                                             |

#### PR B — admin

| File                                                       | Action | Responsibility                                                                                                                                                   |
| ---------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/stats.ts`                                     | Modify | Add `PersistedPokerDetails` type + `getPokerAllTimeStats(variant?)` + `getPokerSessionsByVariant(days)` + `getPokerBiggestPots(limit, variant?)`. Additive only. |
| `src/systems/stats.test.ts`                                | Modify | Pin against ~12-row poker fixture covering all 3 variants × win/loss/push across past 30 days.                                                                   |
| `src/pages/admin/AdminPokerPage.tsx`                       | NEW    | 4 StatCards + variant tabs + hero chart + biggest-pots panel + recent sessions table.                                                                            |
| `src/pages/admin/AdminPokerPage.test.tsx`                  | NEW    | Render with fake rounds; assert each StatCard + tabs + chart + table.                                                                                            |
| `src/components/charts/PokerSessionsByVariantBar.tsx`      | NEW    | Recharts stacked-bar chart wrapper (Hold'em gold / Draw brass / Omaha velvet).                                                                                   |
| `src/components/charts/PokerSessionsByVariantBar.test.tsx` | NEW    | Smoke render.                                                                                                                                                    |
| `src/pages/admin/AdminLayout.tsx`                          | Modify | Add "Poker" nav entry between "Slots" and "Plinko".                                                                                                              |
| `src/pages/admin/AdminLayout.test.tsx`                     | Modify | Update.                                                                                                                                                          |
| `src/router.tsx`                                           | Modify | Add lazy route `/admin/poker`.                                                                                                                                   |

---

## PR A — chrome + Hold'em polish

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-12-v1-pr-a`

### Task A.0 — Read context (15 min)

- [ ] **Step 1: Read the spec** end-to-end. Internalise §3 locked decisions + §4 architecture + §7 risks.
- [ ] **Step 2: Read this plan** completely. Note "Critical context" above — the rank=14→1 adapter is load-bearing.
- [ ] **Step 3: Read existing `src/games/poker/`** files — note `_shared/types.ts` for `Card` shape, all `holdem/*.tsx` to size the brand-token pass, `_shared/PlayingCard.tsx` for the existing adapter surface area.
- [ ] **Step 4: Read `@/components/brand/PlayingCard`** end-to-end so the adapter (A.3) produces correct props.
- [ ] **Step 5: Read `docs/PHASE_15_PATTERNS.md` §1.1-§1.7** for the standard chrome recipe.
- [ ] **Step 6: Read `feedback-localgamble-min-h-screen-in-pages` + `feedback-localgamble-screenshot-before-pushing-ui` memories** — both will fire during this PR.

### Task A.1 — `maskNames.ts` + `MaskAvatar.tsx` (build the new shared bits first)

**Files:** `src/games/poker/_shared/maskNames.ts` (NEW) + test, `src/games/poker/_shared/MaskAvatar.tsx` (NEW) + test.

These have no upstream dependencies. Build + test FIRST.

- [ ] **Step 1: Write `maskNames.ts`:**

  ```ts
  export const MASK_NAME_POOL = [
    'Bauta',
    'Colombina',
    'Volto',
    'Moretta',
    'Arlecchino',
    'Pantalone',
    'Pulcinella',
    'Brighella',
    'Pierrot',
    'Dottore',
    'Capitano',
    'Zanni',
  ] as const;

  export type MaskName = (typeof MASK_NAME_POOL)[number];

  /** Returns the first `tableSize - 1` mask names from a Fisher-Yates shuffle
   *  seeded by the session RNG. Deterministic per session; never repeats within
   *  a single table. */
  export function assignMaskName(sessionRng: () => number, tableSize: number): MaskName[] {
    if (tableSize - 1 > MASK_NAME_POOL.length) {
      throw new RangeError(`tableSize ${tableSize} exceeds pool of ${MASK_NAME_POOL.length}`);
    }
    if (tableSize < 2) return [];
    const shuffled = [...MASK_NAME_POOL];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(sessionRng() * (i + 1));
      [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, tableSize - 1);
  }
  ```

- [ ] **Step 2: Test `maskNames.test.ts`:**
  - Pool size = 12.
  - `assignMaskName(rng, 6)` returns 5 unique names.
  - `assignMaskName(rng, 13)` throws RangeError.
  - Same seeded RNG → same output (pin against a fixed seed).
  - Different seeds → different orderings (sanity check).
  - `tableSize === 1` returns [].

- [ ] **Step 3: Write `MaskAvatar.tsx`:**

  ```tsx
  import type { JSX } from 'react';

  interface Props {
    name: string;
    active?: boolean;
    size?: 'sm' | 'md';
  }

  /** Brass-ringed circle with the first letter of the mask name. */
  export default function MaskAvatar({ name, active = false, size = 'md' }: Props): JSX.Element {
    const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
    return (
      <div
        className={[
          'flex items-center justify-center rounded-full bg-velvet font-display tracking-[0.18em] text-gold-bright',
          'border-2 border-brass',
          dim,
          active ? 'ring-2 ring-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.6)]' : '',
        ].join(' ')}
        data-mask-avatar
        data-mask-name={name}
        aria-label={`Player ${name}`}
      >
        {name.charAt(0)}
      </div>
    );
  }
  ```

- [ ] **Step 4: Test `MaskAvatar.test.tsx`:**
  - Renders the first letter.
  - `active` adds `ring-2` class.
  - `data-mask-name` matches the prop.

- [ ] **Step 5: Run.**

  ```bash
  pnpm exec vitest run src/games/poker/_shared/maskNames.test.ts src/games/poker/_shared/MaskAvatar.test.tsx
  ```

- [ ] **Step 6: Commit.**
  ```bash
  git add src/games/poker/_shared/{maskNames,MaskAvatar}.*
  git commit -m "feat(poker): MASK_NAME_POOL + assignMaskName + MaskAvatar primitives"
  ```

### Task A.2 — `PokerOddsHeader.tsx` + `PokerRulesModal.tsx`

**Files:** both NEW + tests.

- [ ] **Step 1: Write `PokerOddsHeader.tsx`:**

  ```tsx
  import type { JSX } from 'react';
  import OddsInfoBox from '@/games/_shared/OddsInfoBox';

  type Variant = 'holdem' | 'five-card-draw' | 'omaha';

  const CONTENT: Record<Variant, string> = {
    holdem: "No-Limit Hold'em · 2-6 players · 80 BB buy-in · Rebuy on bust",
    'five-card-draw': 'No-Limit Five-Card Draw · 2-6 players · 80 BB buy-in · Rebuy on bust',
    omaha: 'No-Limit Omaha · 2-6 players · 80 BB buy-in · Rebuy on bust',
  };

  interface Props {
    variant: Variant;
  }

  export default function PokerOddsHeader({ variant }: Props): JSX.Element {
    return (
      <OddsInfoBox>
        <span data-poker-odds-variant={variant}>{CONTENT[variant]}</span>
      </OddsInfoBox>
    );
  }
  ```

- [ ] **Step 2: Test `PokerOddsHeader.test.tsx`** — render each variant; assert distinct text + `data-poker-odds-variant`.

- [ ] **Step 3: Write `PokerRulesModal.tsx`:**

  ```tsx
  import type { JSX } from 'react';
  import RulesModal from '@/games/_shared/RulesModal';

  type Variant = 'holdem' | 'five-card-draw' | 'omaha';

  interface Props {
    open: boolean;
    variant: Variant;
    onClose: () => void;
  }

  function HoldemRules(): JSX.Element {
    return (
      <div className="text-ivory/85 space-y-3">
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
          <p>Make the best 5-card hand from your 2 hole cards + the 5 community cards.</p>
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
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BETTING ROUNDS</h3>
          <p>Preflop → Flop (3) → Turn (1) → River (1). Action: fold · check · call · raise.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BLINDS</h3>
          <p>
            Heads-up: button is small blind. 3+: button posts nothing; next two seats post SB + BB.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SHOWDOWN</h3>
          <p>
            If two or more players remain after the final betting round, hole cards are revealed and
            the best 5-card hand wins the pot (split on ties).
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
          <p>Cash game. Buy-in = 80 BB. Rebuy on bust. Leave Table at any time between hands.</p>
        </section>
      </div>
    );
  }

  function DrawRules(): JSX.Element {
    return (
      <div className="text-ivory/85">
        <p className="text-sm italic">Full rules content coming in #12.v2.</p>
      </div>
    );
  }

  function OmahaRules(): JSX.Element {
    return (
      <div className="text-ivory/85">
        <p className="text-sm italic">Full rules content coming in #12.v3.</p>
      </div>
    );
  }

  const RULES: Record<Variant, () => JSX.Element> = {
    holdem: HoldemRules,
    'five-card-draw': DrawRules,
    omaha: OmahaRules,
  };

  const TITLES: Record<Variant, string> = {
    holdem: "MASQUER · Hold'em",
    'five-card-draw': 'MASQUER · Five-Card Draw',
    omaha: 'MASQUER · Omaha',
  };

  export default function PokerRulesModal({ open, variant, onClose }: Props): JSX.Element {
    const Body = RULES[variant];
    return (
      <RulesModal open={open} title={TITLES[variant]} onClose={onClose}>
        <Body />
      </RulesModal>
    );
  }
  ```

- [ ] **Step 4: Test `PokerRulesModal.test.tsx`** — render each variant; assert each gets its block (Hold'em full text; Draw/Omaha placeholder copy).

- [ ] **Step 5: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/poker/_shared/PokerOddsHeader.test.tsx src/games/poker/_shared/PokerRulesModal.test.tsx
  git add src/games/poker/_shared/{PokerOddsHeader,PokerRulesModal}.*
  git commit -m "feat(poker): variant-aware OddsHeader + RulesModal shared chrome"
  ```

### Task A.3 — `_shared/PlayingCard.tsx` adapter rewrite (card migration)

**Files:** `src/games/poker/_shared/PlayingCard.tsx` (rewrite) + test (modify).

This is the load-bearing migration step — all 6 existing import sites just inherit the new visual for free.

- [ ] **Step 1: Read** `src/games/poker/_shared/types.ts` to confirm `Card` shape (rank: number where Ace=14 + suit: string).

- [ ] **Step 2: Read** `src/components/brand/PlayingCard.tsx` Props signature.

- [ ] **Step 3: Rewrite `PlayingCard.tsx` as adapter:**

  ```tsx
  import type { JSX } from 'react';
  import type { Card } from './types';
  import MasquerCard, { type Rank, type Suit, type CardSize } from '@/components/brand/PlayingCard';

  type Size = 'table' | 'hole' | 'mini';

  interface Props {
    card: Card | null;
    faceDown?: boolean;
    size?: Size;
    highlight?: boolean;
  }

  // Poker uses Ace=14, brand card uses Ace=1. Convert.
  function adaptRank(pokerRank: number): Rank {
    if (pokerRank === 14) return 1;
    if (pokerRank >= 2 && pokerRank <= 13) return pokerRank as Rank;
    throw new RangeError(`unsupported poker rank ${pokerRank}`);
  }

  function adaptSuit(pokerSuit: string): Suit {
    if (pokerSuit === 'h' || pokerSuit === 'd' || pokerSuit === 'c' || pokerSuit === 's') {
      return pokerSuit;
    }
    throw new RangeError(`unsupported suit ${pokerSuit}`);
  }

  const SIZE_MAP: Record<Size, CardSize> = {
    table: 'lg',
    hole: 'md',
    mini: 'sm',
  };

  /** Adapter — converts poker's Card (Ace=14) shape to the brand MasquerCard
   *  (Ace=1) shape so the entire poker UI inherits the unified MASQUER card
   *  visual for free. Existing call sites (Seat/CommunityBoard/etc) are
   *  unchanged; they get the new look automatically. */
  export default function PlayingCard({
    card,
    faceDown = false,
    size = 'hole',
    highlight = false,
  }: Props): JSX.Element {
    if (card === null) {
      return (
        <div
          className="rounded border border-brass/30 bg-velvet-deep/40"
          style={{ width: 100, height: 140 }}
          data-card-empty
        />
      );
    }
    return (
      <div
        className={
          highlight
            ? 'ring-2 ring-gold-bright rounded-md shadow-[0_0_8px_rgba(232,189,109,0.7)]'
            : ''
        }
      >
        <MasquerCard
          rank={adaptRank(card.rank)}
          suit={adaptSuit(card.suit)}
          faceDown={faceDown}
          size={SIZE_MAP[size]}
        />
      </div>
    );
  }
  ```

- [ ] **Step 4: Update `PlayingCard.test.tsx`** to assert MasquerCard render shape (look at existing brand-card tests for the data-attrs / aria-label patterns). Likely:
  - Renders empty slot when `card === null` (check `data-card-empty`).
  - Face-down renders the brand back (Colombina mask present).
  - Face-up renders the brand face (suit glyph + rank label).
  - `highlight` adds `ring-2` class wrapper.
  - Rank adapter: poker `{rank: 14, suit: 'h'}` renders as Ace (1) of hearts.

- [ ] **Step 5: Run the FULL suite** to catch any Draw/Omaha component test breakage from the visual swap.

  ```bash
  pnpm exec vitest run
  ```

  If Draw/Omaha tests fail on visual shape assertions, fix the assertions (not the adapter — Draw + Omaha intentionally consume the migrated visual). Document any test fix in commit message.

- [ ] **Step 6: Commit.**
  ```bash
  git add src/games/poker/_shared/PlayingCard.tsx src/games/poker/_shared/PlayingCard.test.tsx
  # plus any incidental test fixes for Draw/Omaha card-render assertions
  git commit -m "feat(poker): migrate poker visual to MasquerCard via _shared adapter"
  ```

### Task A.4 — `HoldemPage.tsx` chrome rewrite + tests

**Files:** `src/games/poker/holdem/HoldemPage.tsx` (rewrite) + test (modify).

- [ ] **Step 1: Rewrite root + shell.** Replace `min-h-screen` with `flex h-full flex-col`; main wrapper `flex flex-1 flex-col overflow-hidden p-4 pt-16`; absolute LobbyButton (top-left) + PokerOddsHeader (top-right) + RulesButton (bottom-left) + RulesModal state. Title block: `MASQUER · Hold'em` (text-2xl gold-bright) + variant subtitle `Texas · No-Limit · Cash` (text-xs ivory/55).

- [ ] **Step 2: Replace useReducedMotion.** `import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';` — replace `const reduce = useReducedMotion();` with `const reduce = useEffectiveReducedMotion();`. Verify no `=== null` checks (none expected).

- [ ] **Step 3: Mask name plumbing.** In `buildMachineInput`, replace the per-seat archetype-based name with `assignMaskName(rng, tableSize)`:

  ```ts
  const maskNames = assignMaskName(rng, tableSize);
  const aiArchetypes = Array.from({ length: tableSize - 1 }, (_, i) => {
    const archetype = pickArchetype(rng);
    const name = maskNames[i]!; // hidden archetype; display only the mask name
    const stack = stakes.bb * 80;
    return { archetype, name, stack };
  });
  ```

  Archetype still set on each seat (still drives `decide()`); just never displayed in the UI.

- [ ] **Step 4: Auto-next-hand timing fix.** Replace the fixed 1,200 ms `setTimeout` with a check that the ShowdownReveal has finished. Simplest approach: add a `revealComplete` flag in HoldemSession state (set by `ShowdownReveal.onRevealComplete`); the auto-next-hand effect gates on `revealComplete === true && idle`. Alternatively, lengthen the setTimeout to `Math.max(1_200, MAX_REVEAL_MS + 400)` where `MAX_REVEAL_MS = 6 * 250 + 600 = 2100`. Pick the cleaner option (callback-driven) and document in the diff.

- [ ] **Step 5: Sound wiring.** `import { useSound } from '@/systems/sound/useSound';` → `const { play } = useSound();`. Wire per spec §4.4:
  - `play('chip.place')` on PLAYER_ACTION (bet/raise/call), REBUY confirm, and inside `holdemMachine` blind-post step (or fire from the page when entering `betting` for the first hand of a session — pick the cleanest place).
  - `play('card.deal')` — fire on the page when entering `betting` from `posting_blinds` (initial deal); when entering `advance_street` (1 fire for turn/river; 3 staggered fires for flop). Use `setTimeout` chains for the flop stagger.
  - Showdown card flips: fire `card.deal` per seat reveal — but this is owned by `ShowdownReveal` (A.6).
  - `play('win.{tier}')` / `play('loss')` — fire on the page when entering `hand_complete`, gated on the player's net change for that hand. Tier function:
    ```ts
    function pickWinTier(wonAmount: number, committed: number): 'small' | 'medium' | 'jackpot' {
      const ratio = wonAmount / Math.max(1, committed);
      if (ratio >= 20) return 'jackpot';
      if (ratio >= 2) return 'medium';
      return 'small';
    }
    ```

- [ ] **Step 6: Bust prompt + session-over screens.** Replace `bg-felt-deep text-white` with brand tokens. Panel: `bg-velvet-deep border border-brass/60 rounded-lg p-8`. Headings: `font-display text-2xl tracking-[0.18em] text-gold-bright`. Body: `text-ivory/85`. Buttons: gold primary (`bg-gold text-felt-deep hover:bg-gold-bright`) for positive actions; brass-outlined for secondary.

- [ ] **Step 7: Update HoldemPage.test.tsx.** Add:
  - MASQUER · Hold'em title in DOM.
  - LobbyButton + PokerOddsHeader + RulesButton present.
  - When session active, mock sound is called for chip.place / card.deal / win tiers.
  - Mask names render in seats; archetype labels (`Rock`, `Shark`, etc) NOT in DOM.
  - Replace any existing `min-h-screen` class assertions with `h-full flex-col`.

- [ ] **Step 8: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/poker/holdem/HoldemPage.test.tsx
  git add src/games/poker/holdem/HoldemPage.tsx src/games/poker/holdem/HoldemPage.test.tsx
  git commit -m "feat(poker): MASQUER Hold'em shell + sound + mask names + reveal-aware timing"
  ```

### Task A.5 — `PokerTable.tsx` + `Seat.tsx` + `CommunityBoard.tsx` + `BettingControls.tsx` + `SessionBar.tsx` + `SetupPanel.tsx` brand pass

**Files:** all in `src/games/poker/holdem/` + their tests.

Bulk brand-token pass. Replace every raw colour class with the standard pairings from `docs/PHASE_15_PATTERNS.md §1.4`:

- `bg-felt-deep` → `bg-felt-table` (or `bg-felt-table-deep` for deeper variant)
- `text-white` → `text-ivory`
- `text-white/60` → `text-ivory/55`
- `bg-casino-red` (panel) → `bg-velvet`
- `text-casino-red` (label) → keep `text-casino-red` (semantic — error/loss)
- `text-chip-win` — keep (semantic — win)
- `text-gold-bright` — keep
- `border-brass/40` / `border-brass/60` / `border-brass` for hairlines
- Panel surfaces: `bg-velvet-deep` for cards, `bg-velvet` for accents

- [ ] **Step 1: `Seat.tsx`** — adopt `<MaskAvatar name={seat.occupant.name} active={isToAct} />`. Display mask name in `font-display text-sm tracking-[0.18em] text-ivory/85`. Stack count in `font-mono tabular-nums text-gold-bright`. Status badges (Folded/All-In) styled with brand tokens. Card slots use `PlayingCard` (already migrated).

- [ ] **Step 2: `PokerTable.tsx`** — backdrop: `bg-felt-table` with inset oval `bg-felt-table-deep` panel + `border-brass/60` ring. Central pot display: `font-mono tabular-nums text-2xl text-gold-bright`. Seats positioned around the oval (preserve existing positioning logic).

- [ ] **Step 3: `CommunityBoard.tsx`** — render the 5 board slots via PlayingCard. Per-card dramatic reveal variant:

  ```tsx
  const revealVariant = reduce
    ? { initial: false, animate: { scale: 1, opacity: 1 } }
    : {
        initial: { scale: 0.6, opacity: 0 },
        animate: { scale: [0.6, 1.05, 1], opacity: 1 },
        transition: { duration: 0.4, delay: i * 0.25, ease: [0.16, 1, 0.3, 1] },
      };
  ```

  Each card wrapped in `<motion.div {...revealVariant}>` with `key={card-or-slot-id}` so re-mounts trigger re-animation. Flop = 3 staggered (delay 0/0.25/0.5); turn/river = single delay 0.

- [ ] **Step 4: `BettingControls.tsx`** — raise slider with brass thumb + brass track + gold-bright fill. Action buttons: fold (brass-outlined ivory text), check/call (brass-outlined ivory text), raise (filled gold). Disabled state: `opacity-40`.

- [ ] **Step 5: `SessionBar.tsx`** — brand pass. Hands played / pot / blind level / leave-table button.

- [ ] **Step 6: `SetupPanel.tsx`** — apply the standard SetupPanel chrome (`mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6`).

- [ ] **Step 7: Update all 6 test files** with new class-string assertions where they pinned old colours.

- [ ] **Step 8: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/poker/holdem/
  git add src/games/poker/holdem/*.tsx src/games/poker/holdem/*.test.tsx
  git commit -m "feat(poker): brand-token pass on PokerTable/Seat/Board/Betting/Session/Setup"
  ```

### Task A.6 — `ShowdownReveal.tsx` stagger rewrite

**Files:** `src/games/poker/holdem/ShowdownReveal.tsx` (rewrite) + test (modify).

- [ ] **Step 1: Rewrite to orchestrate stagger:**

  ```tsx
  import type { JSX } from 'react';
  import { useEffect, useState } from 'react';
  import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
  import { useSound } from '@/systems/sound/useSound';
  import type { Seat } from './machine'; // or wherever Seat type lives
  import PlayingCard from '../_shared/PlayingCard';

  const STAGGER_MS = 250;
  const WINNER_GLOW_MS = 600;

  interface Props {
    seatsAtShowdown: Seat[];
    winningSeatIds: number[];
    winTier: 'small' | 'medium' | 'jackpot' | 'loss'; // for player-side stinger; 'loss' if player didn't win
    onRevealComplete: () => void;
  }

  export default function ShowdownReveal({
    seatsAtShowdown,
    winningSeatIds,
    winTier,
    onRevealComplete,
  }: Props): JSX.Element {
    const reduce = useEffectiveReducedMotion();
    const { play } = useSound();
    const [revealedSeatIds, setRevealedSeatIds] = useState<Set<number>>(new Set());
    const [winnerGlow, setWinnerGlow] = useState(false);

    useEffect(() => {
      if (reduce) {
        // Reveal all instant + winner glow static + single batched sound
        const allIds = new Set(seatsAtShowdown.map((s) => s.seatId));
        setRevealedSeatIds(allIds);
        setWinnerGlow(true);
        play(winTier === 'loss' ? 'loss' : `win.${winTier}`);
        const t = setTimeout(onRevealComplete, 0);
        return () => clearTimeout(t);
      }
      const seatsLtR = [...seatsAtShowdown].sort((a, b) => a.seatId - b.seatId);
      const timers: ReturnType<typeof setTimeout>[] = [];
      seatsLtR.forEach((seat, i) => {
        timers.push(
          setTimeout(() => {
            setRevealedSeatIds((prev) => new Set(prev).add(seat.seatId));
            play('card.deal');
          }, i * STAGGER_MS),
        );
      });
      const totalStagger = seatsLtR.length * STAGGER_MS;
      timers.push(
        setTimeout(() => {
          setWinnerGlow(true);
          play(winTier === 'loss' ? 'loss' : `win.${winTier}`);
        }, totalStagger),
      );
      timers.push(
        setTimeout(() => {
          onRevealComplete();
        }, totalStagger + WINNER_GLOW_MS),
      );
      return () => timers.forEach(clearTimeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once per mount per showdown

    return (
      <div className="flex flex-wrap items-center justify-center gap-4" data-showdown-reveal>
        {seatsAtShowdown.map((seat) => {
          const isRevealed = revealedSeatIds.has(seat.seatId);
          const isWinner = winningSeatIds.includes(seat.seatId);
          const glow = isWinner && winnerGlow;
          return (
            <div
              key={seat.seatId}
              data-showdown-seat-id={seat.seatId}
              data-showdown-winner={isWinner ? 'true' : 'false'}
              className={
                glow
                  ? 'ring-2 ring-gold-bright rounded-md shadow-[0_0_12px_rgba(232,189,109,0.85)]'
                  : ''
              }
            >
              <div className="flex gap-1">
                {seat.holeCards.map((c, i) => (
                  <PlayingCard key={i} card={c} faceDown={!isRevealed} size="hole" />
                ))}
              </div>
              <div className="text-center text-xs text-ivory/85" data-showdown-mask-name>
                {seat.occupant.name}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 2: Update ShowdownReveal.test.tsx:**
  - Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` for stagger assertions.
  - Pin: at t=0 no seats revealed; at t=250 one seat revealed; ... ; at t=N*250 all revealed; at t=N*250+600 `onRevealComplete` called.
  - Pin: winning seat has `data-showdown-winner="true"` + `ring-2` class during winner-glow window.
  - Reduced-motion path: all seats revealed instantly + `onRevealComplete` called immediately (use the existing fake-motion helper if there is one, else mock `useEffectiveReducedMotion`).
  - Sound mock: `card.deal` fired N times during stagger; `win.{tier}` fired at end.

- [ ] **Step 3: Wire `onRevealComplete` from `HoldemPage`** — gate the auto-next-hand effect on `revealComplete === true && idle`. Update HoldemPage.test.tsx accordingly.

- [ ] **Step 4: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/poker/holdem/ShowdownReveal.test.tsx src/games/poker/holdem/HoldemPage.test.tsx
  git add src/games/poker/holdem/ShowdownReveal.tsx src/games/poker/holdem/ShowdownReveal.test.tsx src/games/poker/holdem/HoldemPage.tsx src/games/poker/holdem/HoldemPage.test.tsx
  git commit -m "feat(poker): showdown stagger reveal + winner glow + tier stinger"
  ```

### Task A.7 — PokerLobbyPage + PokerVariantModal brand pass + ADR/BUILD_GUIDE

**Files:** `src/games/poker/PokerLobbyPage.tsx`, `src/games/poker/_shared/PokerVariantModal.tsx` (+ test), `BUILD_GUIDE.md`.

- [ ] **Step 1: PokerLobbyPage.tsx** — MASQUER · Poker title + LobbyButton (top-left) + brand-token pass on existing chrome.

- [ ] **Step 2: PokerVariantModal.tsx** — brand pass; MaskMark in header; brand tokens on the 3 variant tiles.

- [ ] **Step 3: BUILD_GUIDE.md §13a amendment** — note polish pass + mask names + admin scaffold + showdown stagger. Add link to spec + ADR-0041 reference.

- [ ] **Step 4: Markdownlint + run + commit.**
  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md
  pnpm exec vitest run src/games/poker/
  git add src/games/poker/PokerLobbyPage.tsx src/games/poker/_shared/PokerVariantModal.tsx src/games/poker/_shared/PokerVariantModal.test.tsx BUILD_GUIDE.md
  git commit -m "feat(poker): lobby + variant modal brand pass; BUILD_GUIDE §13a amend"
  ```

### Task A.8 — Visual verification (per `feedback-localgamble-screenshot-before-pushing-ui`)

**Why:** Plinko taught us — verify visually BEFORE pushing. The chrome rewrite touches many surfaces; layout regressions are easy to miss in tests.

- [ ] **Step 1: Start dev server.** `pnpm dev > /tmp/dev.log 2>&1 &`
- [ ] **Step 2: Screenshot at 1440×900.** Use a Playwright script (see Plinko's `/tmp/screenshot-plinko.mjs` for the pattern):
  - Register a fresh user
  - Navigate to `/play/poker/holdem`
  - Screenshot setup
  - Sit Down (low stakes, 4 seats, 80 BB buy-in)
  - Screenshot the table mid-hand
  - Continue past hand_complete to trigger showdown
  - Screenshot showdown reveal
- [ ] **Step 3: Read each screenshot via the Read tool.** Sanity check: MASQUER title visible, mask names (Bauta etc.) on seats, no "Rock"/"Shark" labels, brass-bordered table, gold-bright pot, brand tokens throughout, no overflow.
- [ ] **Step 4: If something is off, fix + re-screenshot.** Iterate locally; this is faster than pushing a wrong PR.
- [ ] **Step 5: Stop dev server.** `pkill -f vite`

### Task A.9 — Full DoD + open PR

- [ ] **Step 1: Full DoD locally.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

  All six must pass. Do NOT push if any fail.

- [ ] **Step 2: Push.** `git push -u origin phase-15-12-v1-pr-a`

- [ ] **Step 3: Open PR.**

  ```bash
  gh pr create --title "phase-15(#12.v1) PR A: poker chrome + Hold'em polish + MasquerCard + masks" --body "..."
  ```

  Title is 84 chars — under 100.

- [ ] **Step 4: Report.** PR URL + DoD confirmation + 4 user-locked decisions verified (MasquerCard migration / mask names hidden / showdown stagger / `/admin/poker` is PR B). Do NOT merge — controller merges.

---

## PR B — `/admin/poker`

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-12-v1-pr-b`

### Task B.0 — Read context

- [ ] Read `src/pages/admin/AdminBingoPage.tsx` + `AdminPlinkoPage.tsx` for the established admin layout pattern.
- [ ] Read `src/systems/stats.ts` recent aggregations (`getPlinkoAllTimeStats`, `getBingoAllTimeStats`) for the additive pattern.
- [ ] Read `src/components/charts/ChartTooltip.tsx` for the `ChartTooltipShell` + `DefaultChartTooltip` pattern.

### Task B.1 — Aggregations in `src/systems/stats.ts`

- [ ] **Step 1: Add types + aggregations** (additive — do NOT modify existing):

  ```ts
  type PokerVariant = 'holdem' | 'five-card-draw' | 'omaha';

  interface PersistedPokerDetails {
    readonly variant: PokerVariant;
    readonly tableSize: number;
    readonly stakes: { sb: number; bb: number };
    readonly handsPlayed: number;
    readonly rebuys: number;
    readonly biggestPotWon: number;
    readonly sessionId: string;
  }

  export interface PokerAllTimeStats {
    sessions: number;
    hands: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    netPlayerChips: number;
    actualRtp: number | null;
    biggestPotEver: number;
  }

  export interface PokerSessionsByVariantDay {
    date: string;
    holdem: number;
    fiveCardDraw: number;
    omaha: number;
  }

  export interface PokerBiggestPot {
    playedAt: number;
    variant: PokerVariant;
    amount: number;
  }

  export async function getPokerAllTimeStats(variant?: PokerVariant): Promise<PokerAllTimeStats>;
  export async function getPokerSessionsByVariant(
    days: number,
  ): Promise<PokerSessionsByVariantDay[]>;
  export async function getPokerBiggestPots(
    limit: number,
    variant?: PokerVariant,
  ): Promise<PokerBiggestPot[]>;
  ```

- [ ] **Step 2: Tests** — seed ~12 fake poker rounds covering all 3 variants × win/loss/push across past 30 days. Pin each aggregation's output (total sessions, per-variant filter, biggest pot, RTP).

- [ ] **Step 3: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): poker all-time aggregations + sessions-by-variant + biggest pots"
  ```

### Task B.2 — Chart wrapper

**Files:** `src/components/charts/PokerSessionsByVariantBar.tsx` + test.

- [ ] **Step 1: Recharts stacked bar.** Mirror `BingoVariantDifficultyBar` / `PlinkoBinDistributionBar` shape. Three stacked segments per day-bar: Hold'em (gold), Draw (brass), Omaha (velvet). X-axis = date; Y-axis = session count. `ChartTooltipShell` for the tooltip.
- [ ] **Step 2: Smoke test.**
- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/charts/PokerSessionsByVariantBar.tsx src/components/charts/PokerSessionsByVariantBar.test.tsx
  git commit -m "feat(stats): poker sessions-by-variant stacked-bar chart wrapper"
  ```

### Task B.3 — `AdminPokerPage.tsx`

**Files:** `src/pages/admin/AdminPokerPage.tsx` + test (both NEW).

- [ ] **Step 1: Layout** per spec §5.1:
  - Tabs row: `All · Hold'em · Five-Card Draw · Omaha`. Default `All`. Selected tab is `font-display text-gold-bright border-b-2 border-brass`; unselected `text-ivory/55`.
  - 4 StatCards row: Sessions / Hands / House Net Chips (red if positive / green if negative) / Actual RTP.
  - Hero chart: `<PokerSessionsByVariantBar days={30} />` (always shows all 3 variants regardless of tab — gives full context).
  - Biggest pots panel: top 10 by amount via `getPokerBiggestPots(10, currentTab === 'all' ? undefined : currentTab)`. Each row: rank · amount · variant · timestamp.
  - Recent sessions table (last 20): load-all + sort-by-playedAt desc + slice-20 (#250 pattern). Columns: time · variant · table size · stakes · bought in · final · net · hands.

- [ ] **Step 2: `useLiveQuery`** with inferred-Promise pattern (Phase 9 trap — no explicit generic).

- [ ] **Step 3: Tab handling.** Local `useState<'all' | PokerVariant>('all')`. Filter StatCards + biggest-pots + recent table by current tab. Hero chart always shows all variants.

- [ ] **Step 4: Tests** — seed fake rounds; assert each StatCard text + tabs render + table renders.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/pages/admin/AdminPokerPage.tsx src/pages/admin/AdminPokerPage.test.tsx
  git commit -m "feat(stats): admin poker page with variant tabs + 4 stat cards + recent table"
  ```

### Task B.4 — Router + sidebar

**Files:** `src/router.tsx`, `src/pages/admin/AdminLayout.tsx` + test.

- [ ] **Step 1: Lazy route.**
  ```ts
  const AdminPokerPage = lazy(() => import('@/pages/admin/AdminPokerPage'));
  // route: { path: 'poker', element: <AdminPokerPage /> },
  ```
- [ ] **Step 2: Nav entry** in `AdminLayout` between `Slots` and `Plinko`.
- [ ] **Step 3: Update AdminLayout.test.tsx.**
- [ ] **Step 4: Commit.**
  ```bash
  git add src/router.tsx src/pages/admin/AdminLayout.tsx src/pages/admin/AdminLayout.test.tsx
  git commit -m "feat(routing): lazy /admin/poker route + sidebar nav entry"
  ```

### Task B.5 — DoD + open PR

- [ ] **Step 1: Full DoD locally.**
- [ ] **Step 2: Push.** `git push -u origin phase-15-12-v1-pr-b`
- [ ] **Step 3: Open PR.**
  ```bash
  gh pr create --title "phase-15(#12.v1) PR B: /admin/poker scaffold with variant tabs" --body "..."
  ```
  Title is ~63 chars.
- [ ] **Step 4: Report.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §3.1 MasquerCard migration → A.3 (adapter rewrite — single-file change, 6 import sites unchanged)
- §3.2 `/admin/poker` scaffold → PR B (B.1-B.5)
- §3.3 Venetian masquerade names → A.1, A.4 Step 3 (plumbed into buildMachineInput)
- §3.4 Showdown stagger + gold glow → A.6 + A.4 Step 4 (auto-next-hand wait)
- §4.2 Shared chrome (maskNames / MaskAvatar / PokerOddsHeader / PokerRulesModal / PlayingCard adapter / PokerVariantModal / PokerLobbyPage) → A.1, A.2, A.3, A.7
- §4.3 Hold'em-specific polish (HoldemPage / PokerTable / Seat / CommunityBoard / BettingControls / SessionBar / ShowdownReveal / SetupPanel) → A.4, A.5, A.6
- §4.4 Sound taxonomy → A.4 Step 5 + A.6 Step 1
- §4.5 Showdown stagger animation → A.6
- §4.6 Mask names → A.1, A.4 Step 3
- §5 Admin page → PR B
- §7 Risks: card type adapter (A.3 explicit), reduced-motion hook swap (A.4 Step 2), stagger vs. auto-next-hand timing (A.4 Step 4 + A.6 Step 3), screenshot before pushing (A.8)

**Placeholder scan:** None. Every step has explicit code or commands.

**Type consistency:** `Card` (poker, Ace=14) vs `Rank` (brand, Ace=1) handled by the A.3 adapter. `PokerVariant` consistent across PR A (mask plumbing) + PR B (aggregations + page filtering).

**Risks carried forward:** All 5 spec §7 risks have explicit task coverage.

---
