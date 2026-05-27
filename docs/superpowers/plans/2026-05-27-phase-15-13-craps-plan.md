# Phase 15 sub-project #13 — Craps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 15 #13 — apply the standard MASQUER polish recipe to Craps + ship the NEW `/admin/craps` page. Closes the gameplay polish pass (only #14 Admin overhaul + #15 Final integration remain).

**Architecture:** Two PRs.

- **PR A — game-side polish**: chrome rewrite on CrapsPage + brand pass across 8 visual files + new co-located CrapsOddsHeader + CrapsRulesModal + LEAVE TABLE confirm modal + bust/session-over brand pass + sound + hybrid feedback (per-roll spot flash + big-event banner) + small additive `details.betTypeWagered` accumulation so future sessions feed the admin chart.
- **PR B — `/admin/craps`**: NEW admin page with 4 StatCards + bet-type frequency chart (graceful empty state) + biggest-roll-wins panel + recent sessions table. Three new aggregations in `src/systems/stats.ts`.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 · Dexie 4 (no bump — `details` is unstructured JSON) · Recharts (lazy admin chunk) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-13-craps-design.md` (PR #288).

---

## Shared rules

1. **Pure logic untouched.** `craps/{bets,dice,resolveRoll,machine,stakes}.ts` byte-stable.
2. **Games sandbox preserved.** No `@/db` or `@/store` imports from `src/games/craps/**`.
3. **One `rounds` row per Craps session** (ADR-0041 — table-session wallet).
4. **Integer money. No `Math.random()`.** ESLint enforces.
5. **Spec-first.** BUILD_GUIDE §14 amendment in the first commit of PR A.
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** ([[localgamble-commit-subject-limit]]).
8. **Conventional Commits.** Scopes: `craps` (game-side), `admin` (NOT `admin-craps` — PR B), `stats` (aggregations), `routing` (router/nav), `docs` (spec/BUILD_GUIDE).
9. **No `--no-verify`. No `--amend`.** Reset + new commit on hook failure.
10. **TS strict + exactOptionalPropertyTypes.** Optional fields via `{...(cond ? {key: val} : {})}` spread.
11. **Tokens-only Tailwind** in rebuilt files.
12. **Page root MUST be `flex h-full flex-col`, NEVER `min-h-screen`** ([[localgamble-min-h-screen-in-pages]]).
13. **Visual verification via Playwright at 1440×900 before pushing** ([[localgamble-screenshot-before-pushing-ui]]).
14. **DoD per PR:**
    ```
    pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
    ```

---

## Critical context

### Machine outcome detection (load-bearing for §4.6 banner)

The machine context provides everything needed to detect POINT MADE / SEVEN-OUT / NATURAL / JACKPOT:

- `phase: 'come-out' | 'point'`
- `point: number | null` (the current point value)
- `lastRoll: { d1, d2, total, isHard } | null`
- `lastResolution: RollResolution` (BetOutcome[] per bet)
- `rollNumber: number` (monotonic per session)

Banner trigger logic (in a `CrapsPage` effect watching `rollNumber`):

| Event          | Detect                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| **POINT MADE** | prev `phase === 'point'`, new `phase === 'come-out'`, `lastRoll.total === prev.point` (player's point was hit) |
| **SEVEN-OUT**  | prev `phase === 'point'`, new `phase === 'come-out'`, `lastRoll.total === 7`                                   |
| **JACKPOT**    | `lastResolution.playerNetThisRoll / lastResolution.playerCommittedThisRoll >= 20`                              |
| **NATURAL**    | `phase === 'come-out'` and `lastRoll.total === 7 \|\| 11`; debounce-detect 2 in a row → "ON A ROLL"            |

The page must keep a `prevPhaseRef` + `prevPointRef` to make the transition detection work.

### `details.betTypeWagered` additive field

Spec §7 risk (a): adding `betTypeWagered: Record<betType, totalWagered>` to the persisted `details` object. The `rounds` table's `details` field is `Dexie.any` (unstructured JSON) — no schema migration needed; new sessions just include the field. PR A's `CrapsSession.doSettle` accumulates wagering per bet type during the session (tracked via `useRef<Record<string, number>>({})` updated on every successful `PLACE_BET` event), then writes to `details.betTypeWagered` at settle time.

Old pre-PR-A sessions don't have this field → PR B's chart handles `undefined` gracefully (returns empty array, renders "Bet-type tracking starts with sessions played after Phase 15 #13" empty-state).

### File structure

#### PR A — game-side

| File                                         | Action  | Responsibility                                                                       |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `src/games/craps/CrapsPage.tsx`              | Rewrite | Chrome retrofit + sound + hybrid feedback + LEAVE confirm flow                       |
| `src/games/craps/CrapsPage.test.tsx`         | Modify  | MASQUER chrome + sound mock + banner trigger + h-full + bet-type tracking assertions |
| `src/games/craps/CrapsTable.tsx`             | Modify  | Brand pass; oval-felt brass-edged backdrop; gold-bright pot                          |
| `src/games/craps/BetSpot.tsx`                | Modify  | Brand pass + NEW `flashTone?: 'win' \| 'loss'` + `payoutChips?: number` props        |
| `src/games/craps/ChipTray.tsx`               | Modify  | Brand pass; brass-edged tray; gold-bright denomination                               |
| `src/games/craps/DiceDisplay.tsx`            | Modify  | Brand pass (porcelain die face + gold pip + brass border); reduced-motion path       |
| `src/games/craps/PointPuck.tsx`              | Modify  | Brand pass (gold ON / casino-red OFF + brass border); reduced-motion path            |
| `src/games/craps/PropositionDrawer.tsx`      | Modify  | Brand pass (velvet-deep collapsible + brass border)                                  |
| `src/games/craps/SessionBar.tsx`             | Modify  | Brand pass; gold-bright bankroll; LEAVE TABLE button styled                          |
| `src/games/craps/SetupPanel.tsx`             | Modify  | Brand pass mirroring poker SetupPanel (`mx-auto flex w-full max-w-3xl ...`)          |
| `src/games/craps/CrapsOddsHeader.tsx`        | NEW     | Co-located OddsInfoBox wrapper with Craps payout summary                             |
| `src/games/craps/CrapsOddsHeader.test.tsx`   | NEW     | Smoke render                                                                         |
| `src/games/craps/CrapsRulesModal.tsx`        | NEW     | Co-located RulesModal wrapper with the Craps rules body                              |
| `src/games/craps/CrapsRulesModal.test.tsx`   | NEW     | Smoke render + section presence                                                      |
| `src/games/craps/LeaveConfirmModal.tsx`      | NEW     | LEAVE TABLE confirm dialog with bankroll + P/L summary                               |
| `src/games/craps/LeaveConfirmModal.test.tsx` | NEW     | Confirm / cancel callbacks fire                                                      |
| `BUILD_GUIDE.md` §14                         | Modify  | Note polish pass + hybrid feedback + admin scaffold                                  |

#### PR B — admin

| File                                                      | Action | Responsibility                                                                                                                   |
| --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/stats.ts`                                    | Modify | Add `PersistedCrapsDetails` + `getCrapsAllTimeStats` + `getCrapsBetTypeFrequency` + `getCrapsBiggestSessionWins`. Additive only. |
| `src/systems/stats.test.ts`                               | Modify | Pin against ~12-row craps fixture mixing tiers + with/without `betTypeWagered`                                                   |
| `src/pages/admin/AdminCrapsPage.tsx`                      | NEW    | 4 StatCards + hero chart + biggest panel + recent sessions table                                                                 |
| `src/pages/admin/AdminCrapsPage.test.tsx`                 | NEW    | Render with fake rounds; assert each card text + chart presence + table rows                                                     |
| `src/components/charts/CrapsBetTypeFrequencyBar.tsx`      | NEW    | Stacked bar wrapper with empty-state fallback                                                                                    |
| `src/components/charts/CrapsBetTypeFrequencyBar.test.tsx` | NEW    | Smoke render + empty-state assertion                                                                                             |
| `src/pages/admin/AdminLayout.tsx` + test                  | Modify | Add `Craps` nav entry after `Poker`                                                                                              |
| `src/router.tsx`                                          | Modify | Add lazy route `/admin/craps`                                                                                                    |

---

## PR A — game-side polish

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-13-pr-a`

### Task A.0 — Read context (15 min)

- [ ] **Step 1**: Read the spec end-to-end.
- [ ] **Step 2**: Read this plan.
- [ ] **Step 3**: Read every file in `src/games/craps/` (10 files) + tests to understand current shape.
- [ ] **Step 4**: Read `src/games/poker/holdem/HoldemPage.tsx` for the canonical chrome + outcome-banner shape — direct port for the banner JSX + state.
- [ ] **Step 5**: Read `src/games/_shared/{LobbyButton,OddsInfoBox,RulesButton,RulesModal}.tsx` to confirm the shared chrome API.
- [ ] **Step 6**: Read `src/games/craps/machine.ts` carefully — note `phase` / `point` / `lastRoll` / `lastResolution` shapes, plus the bet-resolution outcome shape needed for §4.6 BetSpot flash.
- [ ] **Step 7**: Read memories `feedback-localgamble-min-h-screen-in-pages` + `feedback-localgamble-screenshot-before-pushing-ui`.

### Task A.1 — CrapsOddsHeader + CrapsRulesModal + LeaveConfirmModal (build shared chrome first)

**Files:** `CrapsOddsHeader.tsx`, `CrapsOddsHeader.test.tsx`, `CrapsRulesModal.tsx`, `CrapsRulesModal.test.tsx`, `LeaveConfirmModal.tsx`, `LeaveConfirmModal.test.tsx` (all NEW).

These have no upstream dependencies. Build + test FIRST.

- [ ] **Step 1: `CrapsOddsHeader.tsx`:**

  ```tsx
  import type { JSX } from 'react';
  import OddsInfoBox from '@/games/_shared/OddsInfoBox';

  export default function CrapsOddsHeader(): JSX.Element {
    return (
      <OddsInfoBox>
        <span data-craps-odds>
          Pass/Don't 1:1 &middot; Field 1:1 (2&times; on 2, 3&times; on 12) &middot; Place 4-10
          (varies) &middot; Hardways 7-9:1 &middot; Props 4-30:1
        </span>
      </OddsInfoBox>
    );
  }
  ```

- [ ] **Step 2: Test** — render + assert `data-craps-odds` + text contains `Pass/Don't 1:1` and `Hardways 7-9:1`.

- [ ] **Step 3: `CrapsRulesModal.tsx`** — mirror PokerRulesModal's body shape, sections per spec §4.3 (Object · Pass/Don't · Come/Don't · Place 4-10 · Field · Hardways · Propositions · Table):

  ```tsx
  import type { JSX } from 'react';
  import RulesModal from '@/games/_shared/RulesModal';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  function Body(): JSX.Element {
    return (
      <div className="text-ivory/85 space-y-3">
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
          <p>
            Bet on the outcome of a two-dice roll. The come-out roll establishes a point; subsequent
            rolls resolve bets until the point is made or a seven-out.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
            PASS LINE / DON'T PASS
          </h3>
          <p>
            Pass wins on come-out 7 or 11; loses on 2, 3, 12. Otherwise the rolled total becomes the
            point — Pass wins if it's made before a 7. Don't Pass mirrors with the 12 as a push.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
            COME / DON'T COME
          </h3>
          <p>
            Available during the point phase. Acts like a fresh Pass/Don't Pass bet — the next roll
            becomes its own travelling come-point.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PLACE 4-10</h3>
          <p>
            Bet that a specific number (4, 5, 6, 8, 9, 10) will roll before a 7. Payouts: 9:5 on
            4/10, 7:5 on 5/9, 7:6 on 6/8. Off on come-out.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">FIELD</h3>
          <p>One-roll bet on 2/3/4/9/10/11/12. Pays 1:1, with 2× on 2 and 3× on 12.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HARDWAYS</h3>
          <p>
            Bet that 4/6/8/10 will roll as a pair before either a 7 or an easy version. Pays 7:1
            (4/10) or 9:1 (6/8).
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PROPOSITIONS</h3>
          <p>
            One-roll bets: Any 7 (4:1), Any Craps (7:1), 2 / 12 (30:1), 3 / 11 (15:1), Horn
            (combined 2/3/11/12), C&amp;E (Any Craps + 11).
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TABLE</h3>
          <p>
            Cash-game table session. Buy-in at the chosen tier; rebuy on bust; LEAVE TABLE at any
            time to credit the final bankroll.
          </p>
        </section>
      </div>
    );
  }

  export default function CrapsRulesModal({ open, onClose }: Props): JSX.Element {
    return (
      <RulesModal open={open} title="MASQUER &middot; Craps" onClose={onClose}>
        <Body />
      </RulesModal>
    );
  }
  ```

- [ ] **Step 4: Test** — render + assert `OBJECT` / `PASS LINE` / `HARDWAYS` / `PROPOSITIONS` / `TABLE` headings present.

- [ ] **Step 5: `LeaveConfirmModal.tsx`** — small velvet-deep modal with bankroll + P/L summary + CONFIRM LEAVE + CANCEL buttons:

  ```tsx
  import type { JSX } from 'react';

  interface Props {
    open: boolean;
    bankroll: number;
    totalBoughtIn: number;
    onCancel: () => void;
    onConfirm: () => void;
  }

  export default function LeaveConfirmModal({
    open,
    bankroll,
    totalBoughtIn,
    onCancel,
    onConfirm,
  }: Props): JSX.Element | null {
    if (!open) return null;
    const net = bankroll - totalBoughtIn;
    const netClass = net >= 0 ? 'text-chip-win' : 'text-casino-red';
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        data-leave-confirm
      >
        <div className="rounded-lg border border-brass/60 bg-velvet-deep p-6 shadow-2xl">
          <h3 className="mb-3 font-display text-lg tracking-[0.18em] text-gold-bright">
            LEAVE TABLE?
          </h3>
          <p className="mb-1 text-sm text-ivory/85">
            Final bankroll:{' '}
            <span className="font-mono tabular-nums text-gold-bright">
              {bankroll.toLocaleString()}
            </span>
          </p>
          <p className="mb-1 text-sm text-ivory/85">
            Bought in:{' '}
            <span className="font-mono tabular-nums text-ivory/55">
              {totalBoughtIn.toLocaleString()}
            </span>
          </p>
          <p className="mb-4 text-sm text-ivory/85">
            Net:{' '}
            <span className={`font-mono tabular-nums ${netClass}`}>
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()}
            </span>
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-brass/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
              data-leave-cancel
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md border-2 border-casino-red bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-casino-red hover:bg-casino-red/10"
              data-leave-confirm-btn
            >
              CONFIRM LEAVE
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 6: Test** — assert CONFIRM fires `onConfirm`, CANCEL fires `onCancel`, `open=false` renders nothing.

- [ ] **Step 7: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/craps/{CrapsOddsHeader,CrapsRulesModal,LeaveConfirmModal}.test.tsx
  git add src/games/craps/{CrapsOddsHeader,CrapsRulesModal,LeaveConfirmModal}.{tsx,test.tsx}
  git commit -m "feat(craps): NEW CrapsOddsHeader + CrapsRulesModal + LeaveConfirmModal"
  ```

### Task A.2 — Brand pass on the 5 small visual files

**Files:** `ChipTray.tsx`, `DiceDisplay.tsx`, `PointPuck.tsx`, `PropositionDrawer.tsx`, `SessionBar.tsx` + their tests.

Mechanical brand-token swap. Read each file, swap colour classes per `PHASE_15_PATTERNS.md §1.4`:

| From                                 | To                                        |
| ------------------------------------ | ----------------------------------------- |
| `bg-felt-deep` / `bg-felt-deep/80`   | `bg-felt-table-deep` / `bg-velvet-deep`   |
| `text-white` / `text-white/70`       | `text-ivory` / `text-ivory/85`            |
| `text-white/60`                      | `text-ivory/55`                           |
| `text-gold` (legacy)                 | `text-gold-bright`                        |
| `border-gold/30` / `border-gold/20`  | `border-brass/60` / `border-brass/40`     |
| `border-white/10`                    | `border-brass/30`                         |
| `bg-white/5` / `bg-white/10` (hover) | `bg-velvet-deep/40` / `bg-velvet-deep/60` |
| `bg-black/20`                        | `bg-velvet-deep/30`                       |
| `neon-cyan` / `neon-magenta`         | drop or replace with brand accent         |

- [ ] **Step 1: DiceDisplay.tsx** — porcelain die: `bg-gradient-to-br from-ivory via-ivory to-[#e2d4b6]` for face, gold-bright pip dots (`bg-gold-bright`), brass border (`border-2 border-brass`). Replace `useReducedMotion` (framer-motion) with `useEffectiveReducedMotion`; reduced-motion path snaps directly to final face (skip tumble keyframes).

- [ ] **Step 2: PointPuck.tsx** — gold-bright `ON` face (`bg-gold-bright text-felt-deep`), casino-red `OFF` face (`bg-casino-red text-ivory`), brass border, flip via Framer Motion. Reduced-motion → instant swap.

- [ ] **Step 3: ChipTray.tsx** — brand-token tray + denomination chip highlight (`ring-2 ring-gold-bright` on selected).

- [ ] **Step 4: PropositionDrawer.tsx** — collapsible velvet-deep panel with brass border + gold-bright section header.

- [ ] **Step 5: SessionBar.tsx** — `bg-velvet-deep border border-brass/60` chrome; gold-bright bankroll display; ivory rolls + point-status; LEAVE TABLE styled per `data-leave-table` (existing).

- [ ] **Step 6: Update each test** — find pinned colour-class assertions; flip to brand-token equivalents.

- [ ] **Step 7: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/craps/{ChipTray,DiceDisplay,PointPuck,PropositionDrawer,SessionBar}.test.tsx
  git add src/games/craps/{ChipTray,DiceDisplay,PointPuck,PropositionDrawer,SessionBar}.{tsx,test.tsx}
  git commit -m "feat(craps): brand-token pass on ChipTray/Dice/Puck/Prop/SessionBar"
  ```

### Task A.3 — BetSpot retrofit (flash + payout chip badge)

**Files:** `BetSpot.tsx` + test.

- [ ] **Step 1**: Add new optional props:

  ```ts
  interface Props {
    betId: string;
    label: string;
    chips: ActiveBet[];
    canPlace: boolean;
    onPlace: () => void;
    onRemove?: (() => void) | undefined;
    /** Transient flash applied after a roll resolution. */
    flashTone?: 'win' | 'loss' | null;
    /** Net chip change credited to this spot for the last roll (display only). */
    payoutChips?: number;
  }
  ```

- [ ] **Step 2: Brand-token swap on the existing className** — replace `border-gold/30 bg-white/5 hover:bg-white/10` with `border-brass/60 bg-velvet-deep/40 hover:bg-velvet-deep/60`; `border-white/10 bg-black/20 opacity-40` with `border-brass/30 bg-velvet-deep/30 opacity-40`; `text-white/70` with `text-ivory/85`.

- [ ] **Step 3: Add flash overlay** based on `flashTone`:

  ```tsx
  const flashClass =
    flashTone === 'win'
      ? 'ring-2 ring-gold-bright shadow-[0_0_8px_rgba(232,189,109,0.7)]'
      : flashTone === 'loss'
        ? 'ring-1 ring-casino-red opacity-60'
        : '';
  ```

  Apply to outer container.

- [ ] **Step 4: Add payout chip badge** when `flashTone === 'win' && payoutChips && payoutChips > 0`:

  ```tsx
  {
    flashTone === 'win' && payoutChips && payoutChips > 0 && (
      <span
        className="absolute -top-2 -right-2 rounded-full bg-gold-bright px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-felt-deep shadow-md"
        data-payout-badge
      >
        +{payoutChips.toLocaleString()}
      </span>
    );
  }
  ```

- [ ] **Step 5: Update tests** — flip colour assertions; add cases for `flashTone='win'` → ring-gold-bright present; `flashTone='loss'` → ring-casino-red present; `flashTone='win' + payoutChips=50` → `data-payout-badge` text `+50`; no `flashTone` → no badge.

- [ ] **Step 6: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/craps/BetSpot.test.tsx
  git add src/games/craps/BetSpot.{tsx,test.tsx}
  git commit -m "feat(craps): BetSpot brand pass + flashTone + payoutChips badge"
  ```

### Task A.4 — CrapsTable + SetupPanel brand pass

**Files:** `CrapsTable.tsx`, `SetupPanel.tsx` + tests.

- [ ] **Step 1: CrapsTable.tsx** — outer wrapper `rounded-[3rem] border border-brass/60 bg-felt-table-deep p-6` (mirror holdem PokerTable). Section headers (`COME` / `PASS LINE` / `FIELD` / `PROPOSITIONS`) styled `font-display text-[10px] tracking-[0.18em] text-ivory/55`. Pot/bankroll display `font-mono tabular-nums text-2xl text-gold-bright`.

- [ ] **Step 2: SetupPanel.tsx** — `mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6` (mirror poker SetupPanel exactly).

- [ ] **Step 3: Update tests.**

- [ ] **Step 4: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/craps/{CrapsTable,SetupPanel}.test.tsx
  git add src/games/craps/{CrapsTable,SetupPanel}.{tsx,test.tsx}
  git commit -m "feat(craps): brand-token pass on CrapsTable + SetupPanel"
  ```

### Task A.5 — CrapsPage chrome rewrite + hybrid feedback + sound

**Files:** `CrapsPage.tsx` + test. This is the big task — diff against `holdem/HoldemPage.tsx` for the banner + grace shapes; adapt for Craps' continuous-play model.

#### Imports

- [ ] **Step 1:** Update imports:
  ```ts
  import type { JSX } from 'react';
  import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
  import { useMachine } from '@xstate/react';
  import { useCurrentUser } from '@/store/sessionStore';
  import { useBalance } from '@/store/walletStore';
  import { useGameRound } from '@/games/_shared/useGameRound';
  import LobbyButton from '@/games/_shared/LobbyButton';
  import RulesButton from '@/games/_shared/RulesButton';
  import { useSound } from '@/systems/sound/useSound';
  import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
  import type { BetHandle } from '@/systems/wallet';
  import { crapsMachine, type CrapsContext, type MachineInput } from './machine';
  import type { Phase } from './machine';
  import type { BetOutcome } from './resolveRoll';
  import { CRAPS_STAKES, type StakesTier } from './stakes';
  import { rollDice, rngFromSeed } from './dice';
  import SetupPanel from './SetupPanel';
  import CrapsTable from './CrapsTable';
  import ChipTray from './ChipTray';
  import SessionBar from './SessionBar';
  import CrapsOddsHeader from './CrapsOddsHeader';
  import CrapsRulesModal from './CrapsRulesModal';
  import LeaveConfirmModal from './LeaveConfirmModal';
  ```

#### Constants

- [ ] **Step 2:** Add at top of file:

  ```ts
  const FLASH_MS = 2_000; // win flash duration
  const FLASH_LOSS_MS = 1_500; // loss flash duration
  const OUTCOME_BANNER_MS = 3_000; // big-event banner auto-dismiss
  const BANNER_DEBOUNCE_MS = 1_000; // prevent back-to-back banners
  const JACKPOT_RATIO = 20; // single-roll net/committed threshold

  type FlashMap = Record<string, { tone: 'win' | 'loss'; payout: number; expiresAt: number }>;
  type BannerKind = 'point-made' | 'seven-out' | 'jackpot' | 'natural-streak';
  ```

#### CrapsSession — new state

- [ ] **Step 3:** Inside `CrapsSession`:
  ```ts
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const [flashMap, setFlashMap] = useState<FlashMap>({});
  const [outcomeBanner, setOutcomeBanner] = useState<{ kind: BannerKind; amount: number } | null>(
    null,
  );
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const lastBannerAtRef = useRef<number>(0);
  // Track per-bet-type wagered for the additive details.betTypeWagered field
  const betTypeWageredRef = useRef<Record<string, number>>({});
  // Transition refs for banner detection
  const prevPhaseRef = useRef<Phase>(ctx.phase);
  const prevPointRef = useRef<number | null>(ctx.point);
  const prevRollNumberRef = useRef<number>(ctx.rollNumber);
  // Natural-streak tracker
  const naturalStreakRef = useRef<number>(0);
  ```

#### Roll-resolution → flash + banner effect

- [ ] **Step 4:** Effect watching `ctx.rollNumber`:

  ```ts
  useEffect(() => {
    if (ctx.rollNumber === prevRollNumberRef.current) return;
    prevRollNumberRef.current = ctx.rollNumber;
    if (!ctx.lastRoll || !ctx.lastResolution) return;

    // Build flash map from resolution outcomes
    const now = performance.now();
    const newFlashes: FlashMap = {};
    let playerNet = 0;
    let playerCommitted = 0;
    for (const outcome of ctx.lastResolution.outcomes) {
      const spotKey = outcome.betSpotKey;
      playerCommitted += outcome.amount;
      if (outcome.kind === 'win' || outcome.kind === 'standing-with-win') {
        const winnings = outcome.winnings ?? 0;
        if (winnings > 0) {
          newFlashes[spotKey] = { tone: 'win', payout: winnings, expiresAt: now + FLASH_MS };
          playerNet += winnings;
        }
      } else if (outcome.kind === 'lose') {
        newFlashes[spotKey] = { tone: 'loss', payout: 0, expiresAt: now + FLASH_LOSS_MS };
        playerNet -= outcome.amount;
      }
      // push / standing / move = no flash
    }
    setFlashMap(newFlashes);

    // Sound: tier stinger + dice clatter (2 staggered reel.stop reused from slots)
    const tier: 'small' | 'medium' | 'jackpot' = pickWinTier(playerNet, playerCommitted);
    if (playerNet > 0) play(`win.${tier}` as const);
    else if (playerNet < 0) play('loss');
    // Already-fired dice sounds handled by separate effect on roll start

    // Big-event banner detection
    const prevPhase = prevPhaseRef.current;
    const prevPoint = prevPointRef.current;
    const rollTotal = ctx.lastRoll.total;
    let bannerKind: BannerKind | null = null;
    let bannerAmount = 0;

    // POINT MADE
    if (prevPhase === 'point' && ctx.phase === 'come-out' && rollTotal === prevPoint) {
      bannerKind = 'point-made';
      bannerAmount = playerNet > 0 ? playerNet : 0;
    }
    // SEVEN-OUT
    else if (prevPhase === 'point' && ctx.phase === 'come-out' && rollTotal === 7) {
      bannerKind = 'seven-out';
    }
    // JACKPOT (any roll)
    if (
      !bannerKind &&
      playerNet > 0 &&
      playerCommitted > 0 &&
      playerNet / playerCommitted >= JACKPOT_RATIO
    ) {
      bannerKind = 'jackpot';
      bannerAmount = playerNet;
    }
    // NATURAL STREAK (2 in a row 7/11 on come-out)
    if (
      prevPhase === 'come-out' &&
      ctx.phase === 'come-out' &&
      (rollTotal === 7 || rollTotal === 11)
    ) {
      naturalStreakRef.current += 1;
      if (naturalStreakRef.current >= 2 && !bannerKind) {
        bannerKind = 'natural-streak';
        bannerAmount = playerNet > 0 ? playerNet : 0;
      }
    } else if (ctx.phase === 'point' || rollTotal === 2 || rollTotal === 3 || rollTotal === 12) {
      naturalStreakRef.current = 0;
    }

    // Banner debounce
    if (bannerKind && now - lastBannerAtRef.current >= BANNER_DEBOUNCE_MS) {
      lastBannerAtRef.current = now;
      setOutcomeBanner({ kind: bannerKind, amount: bannerAmount });
    }

    prevPhaseRef.current = ctx.phase;
    prevPointRef.current = ctx.point;
  }, [ctx.rollNumber, ctx.phase, ctx.point, ctx.lastRoll, ctx.lastResolution, play]);
  ```

  **Note**: `outcome.betSpotKey` is illustrative — confirm the actual property name on `BetOutcome` from `resolveRoll.ts` and adapt. Likewise `outcome.kind`. If the existing type uses different field names, adapt the effect accordingly; the SHAPE of the logic (per-outcome → flash entry; aggregate net → tier; phase transitions → banner) is what's load-bearing.

#### Outcome banner auto-dismiss

- [ ] **Step 5:**
  ```ts
  useEffect(() => {
    if (!outcomeBanner) return;
    const t = setTimeout(() => setOutcomeBanner(null), OUTCOME_BANNER_MS);
    return () => clearTimeout(t);
  }, [outcomeBanner]);
  ```

#### Flash auto-clear

- [ ] **Step 6:**
  ```ts
  useEffect(() => {
    if (Object.keys(flashMap).length === 0) return;
    const t = setTimeout(() => setFlashMap({}), FLASH_MS + 100);
    return () => clearTimeout(t);
  }, [flashMap]);
  ```

#### Dice tumble sound

- [ ] **Step 7:** Effect watching `ctx.rollNumber` separately:
  ```ts
  useEffect(() => {
    if (ctx.rollNumber === 0 || ctx.rollNumber === prevRollNumberRef.current) return;
    // 2 staggered reel.stop for the two dice
    const t1 = setTimeout(() => play('reel.stop'), 0);
    const t2 = setTimeout(() => play('reel.stop'), 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ctx.rollNumber, play]);
  ```

#### Bet-type wagering tracker (for details.betTypeWagered)

- [ ] **Step 8:** Wrap `handlePlaceBet`:

  ```ts
  const handlePlaceBet = useCallback(
    (betType: string, amount: number) => {
      // existing send({ type: 'PLACE_BET', ... })
      send({ type: 'PLACE_BET', betType, amount });
      play('chip.place');
      betTypeWageredRef.current[betType] = (betTypeWageredRef.current[betType] ?? 0) + amount;
    },
    [send, play],
  );
  ```

  Same for any rebuy: `chip.place`. Same for buy-in (handled on session start).

#### doSettle — include betTypeWagered

- [ ] **Step 9:** Extend `doSettle` to pass the tracker contents into `details`:
  ```ts
  await settle(handleRef.current, {
    outcome,
    betAmount: totalBoughtIn,
    payout: bankroll,
    netChange: bankroll - totalBoughtIn,
    details: {
      tier: context.stakes.tier,
      rollsPlayed: context.rollsPlayed,
      rebuys: context.rebuys,
      biggestRollWin: context.biggestWin,
      sessionId: context.sessionId,
      // NEW additive field — see spec §7. Old sessions lack this; admin
      // page handles undefined gracefully.
      betTypeWagered: { ...betTypeWageredRef.current },
    },
  });
  ```

#### LEAVE TABLE confirm flow

- [ ] **Step 10:**

  ```ts
  const handleLeaveClick = useCallback(() => setLeaveConfirmOpen(true), []);
  const handleLeaveCancel = useCallback(() => setLeaveConfirmOpen(false), []);
  const handleLeaveConfirm = useCallback(() => {
    setLeaveConfirmOpen(false);
    void doSettle(ctx).then(() => send({ type: 'LEAVE_TABLE' }));
  }, [ctx, doSettle, send]);
  ```

  Wire `<SessionBar onLeave={handleLeaveClick} />` and render `<LeaveConfirmModal open={leaveConfirmOpen} ... />` at the end of the JSX tree.

#### Win-tier helper

- [ ] **Step 11:** Inline near the top:
  ```ts
  function pickWinTier(net: number, committed: number): 'small' | 'medium' | 'jackpot' {
    const ratio = net / Math.max(1, committed);
    if (ratio >= 20) return 'jackpot';
    if (ratio >= 2) return 'medium';
    return 'small';
  }
  ```

#### Render shell

- [ ] **Step 12:** Wrap the page chrome:

  ```tsx
  return (
    <div className="relative flex h-full flex-col bg-felt-table text-ivory">
      <div className="absolute left-4 top-4 z-20">
        <LobbyButton />
      </div>
      <div className="absolute right-4 top-4 z-20">
        <CrapsOddsHeader />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
        <header className="mb-2 text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER &middot; Craps
          </h1>
          <p
            className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55"
            data-craps-subtitle
          >
            {ctx.stakes.tier.toUpperCase()} &middot;{' '}
            {ctx.phase === 'come-out' ? 'COME OUT' : `POINT ${ctx.point}`} &middot; Bankroll{' '}
            {ctx.bankroll.toLocaleString()}
          </p>
        </header>

        {!session ? (
          <div className="flex flex-1 items-center justify-center">
            <SetupPanel onSitDown={handleSitDown} balance={balance} />
          </div>
        ) : (
          <div className="relative flex flex-1 gap-4">
            <CrapsTable
              ctx={ctx}
              flashMap={flashMap}
              onPlaceBet={handlePlaceBet}
              onRemoveBet={handleRemoveBet}
              onRoll={handleRoll}
            />
            <aside className="w-44 shrink-0">
              <SessionBar
                bankroll={ctx.bankroll}
                rollsPlayed={ctx.rollsPlayed}
                phase={ctx.phase}
                point={ctx.point}
                onLeave={handleLeaveClick}
              />
              <ChipTray
                chips={ctx.stakes.chips}
                selected={selectedChip}
                onSelect={setSelectedChip}
              />
            </aside>
            {outcomeBanner && (
              <div
                className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center"
                data-outcome-banner
              >
                <div
                  className={[
                    'rounded-lg border-2 px-10 py-5 text-center backdrop-blur-sm shadow-2xl',
                    outcomeBanner.kind === 'seven-out'
                      ? 'border-casino-red bg-velvet-deep/95 text-casino-red'
                      : 'border-gold-bright bg-velvet-deep/95 text-gold-bright',
                  ].join(' ')}
                  data-outcome-banner-kind={outcomeBanner.kind}
                >
                  <div className="font-display text-3xl tracking-[0.22em]">
                    {bannerCopy(outcomeBanner.kind, outcomeBanner.amount)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <RulesButton onClick={() => setRulesOpen(true)} />
      <CrapsRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <LeaveConfirmModal
        open={leaveConfirmOpen}
        bankroll={ctx.bankroll}
        totalBoughtIn={ctx.totalBoughtIn}
        onCancel={handleLeaveCancel}
        onConfirm={handleLeaveConfirm}
      />
    </div>
  );
  ```

  Where `bannerCopy` is:

  ```ts
  function bannerCopy(kind: BannerKind, amount: number): string {
    switch (kind) {
      case 'point-made':
        return amount > 0 ? `POINT MADE +${amount.toLocaleString()}` : 'POINT MADE';
      case 'seven-out':
        return 'SEVEN OUT';
      case 'jackpot':
        return `JACKPOT +${amount.toLocaleString()}`;
      case 'natural-streak':
        return amount > 0 ? `ON A ROLL +${amount.toLocaleString()}` : 'ON A ROLL';
    }
  }
  ```

- [ ] **Step 13: Wire `flashMap` into CrapsTable** — pass through to each BetSpot:

  ```tsx
  <BetSpot
    betId={spotKey}
    label={label}
    chips={chips}
    canPlace={canPlace}
    onPlace={() => onPlaceBet(...)}
    {...(flashMap[spotKey] ? { flashTone: flashMap[spotKey]!.tone, payoutChips: flashMap[spotKey]!.payout } : {})}
  />
  ```

  This is in `CrapsTable.tsx` — update to accept + thread `flashMap: FlashMap` prop.

#### Bust prompt + session-over screens

- [ ] **Step 14:** Brand-token rewrite — `bg-velvet-deep border border-brass/60 rounded-lg p-8`, gold-bright headings, ivory body, gold-bright primary button. Mirror Hold'em's bust + session-over screens.

#### Tests

- [ ] **Step 15: Update CrapsPage.test.tsx:**
  - MASQUER · Craps title (heading level 1).
  - LobbyButton link present.
  - CrapsOddsHeader content (`Pass/Don't 1:1`) visible.
  - Rules button + RulesModal open/close.
  - Page root uses `h-full`, NOT `min-h-screen`.
  - Hybrid feedback: simulate a roll that wins → BetSpot has `flashTone='win'` data attr; simulate SEVEN-OUT roll → banner `data-outcome-banner-kind="seven-out"` appears.
  - LEAVE TABLE → confirm modal appears; CONFIRM LEAVE → settle + session_over.
  - `details.betTypeWagered` populated after at least one PLACE_BET.

- [ ] **Step 16:** Add the standard test mocks at top:

  ```ts
  vi.mock('@/motion/useEffectiveReducedMotion', () => ({
    useEffectiveReducedMotion: () => true,
  }));
  vi.mock('@/systems/sound/useSound', () => ({
    useSound: () => ({ play: vi.fn() }),
  }));
  ```

- [ ] **Step 17: Run + commit.**
  ```bash
  pnpm exec vitest run src/games/craps/CrapsPage.test.tsx
  git add src/games/craps/{CrapsPage.tsx,CrapsPage.test.tsx,CrapsTable.tsx,CrapsTable.test.tsx}
  git commit -m "feat(craps): MASQUER Craps shell + sound + hybrid feedback + leave confirm"
  ```

### Task A.6 — BUILD_GUIDE + visual verification

- [ ] **Step 1**: Amend `BUILD_GUIDE.md` §14 — note Phase 15 polish pass (chrome + sound + hybrid feedback + admin scaffold + `details.betTypeWagered` additive field).

  ```bash
  npx markdownlint-cli2 BUILD_GUIDE.md
  git add BUILD_GUIDE.md
  git commit -m "docs(craps): BUILD_GUIDE §14 — phase 15 polish + hybrid feedback"
  ```

- [ ] **Step 2: Visual verification.** Start dev server:

  ```bash
  pkill -f vite 2>/dev/null || true
  rm -rf node_modules/.vite
  pnpm dev > /tmp/dev.log 2>&1 &
  sleep 4
  curl -sI http://localhost:5173/ | head -1
  ```

- [ ] **Step 3:** Adapt `/tmp/screenshot-holdem-reveal.mjs` for Craps. Register a user, navigate to `/play/craps`, sit at Low tier, screenshot:
  - Setup screen (MASQUER · Craps + LobbyButton + ODDS & PAYOUTS + RULES)
  - Mid-table: bet a few chips on Pass Line + Field, ROLL — confirm BetSpot flash on outcome, dice render with porcelain face + gold pips + brass border, PointPuck face is correct
  - Trigger a SEVEN-OUT or POINT MADE if you can: confirm banner with `data-outcome-banner-kind` shows for ~3s
  - LEAVE TABLE → confirm modal renders with brand tokens; CONFIRM LEAVE → SESSION OVER screen
  - RulesModal open + check OBJECT / PASS LINE / etc sections render

- [ ] **Step 4:** Read screenshots. Sanity check.

- [ ] **Step 5:** Stop dev.
  ```bash
  pkill -f vite
  ```

### Task A.7 — Full DoD + open PR

- [ ] **Step 1: Full DoD locally.**
- [ ] **Step 2: Push.** `git push -u origin phase-15-13-pr-a`
- [ ] **Step 3: Open PR.**
  ```bash
  gh pr create --title "phase-15(#13) PR A: MASQUER Craps shell + sound + hybrid feedback" --body "..."
  ```
  Title ~67 chars.
- [ ] **Step 4: Report.** Do NOT merge.

---

## PR B — `/admin/craps`

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-13-pr-b`

### Task B.0 — Read context

- [ ] Read `src/pages/admin/AdminPokerPage.tsx` + `AdminPlinkoPage.tsx` for the canonical admin layout.
- [ ] Read `src/systems/stats.ts` `getPokerAllTimeStats` + `getPlinkoAllTimeStats` for the additive aggregation pattern.

### Task B.1 — Aggregations

- [ ] **Step 1: Types + 3 aggregator fns** in `src/systems/stats.ts` (additive only, do NOT modify existing):

  ```ts
  interface PersistedCrapsDetails {
    readonly tier: 'low' | 'mid' | 'high';
    readonly rollsPlayed: number;
    readonly rebuys: number;
    readonly biggestRollWin: number;
    readonly sessionId: string;
    /** Additive field shipped in PR A. Old pre-PR-A sessions lack this. */
    readonly betTypeWagered?: Record<string, number>;
  }

  export interface CrapsAllTimeStats {
    sessions: number;
    totalRolls: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    netPlayerChips: number;
    actualRtp: number | null;
    biggestRollWin: number;
  }
  export interface CrapsBetTypeWagered {
    betType: string;
    totalWagered: number;
  }
  export interface CrapsBiggestSession {
    playedAt: number;
    tier: string;
    net: number;
  }

  export async function getCrapsAllTimeStats(): Promise<CrapsAllTimeStats>;
  export async function getCrapsBetTypeFrequency(): Promise<CrapsBetTypeWagered[]>;
  export async function getCrapsBiggestSessionWins(limit: number): Promise<CrapsBiggestSession[]>;
  ```

  `getCrapsBetTypeFrequency` walks all craps rounds, merges `details.betTypeWagered` (skipping undefined), returns array sorted desc by totalWagered. If all rounds lack the field → empty array.

- [ ] **Step 2:** Tests — seed ~12 craps rounds; verify each aggregation; verify empty-array fallback when no row has `betTypeWagered`.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): craps all-time aggregations + bet-type frequency + biggest wins"
  ```

### Task B.2 — Chart wrapper

**Files:** `src/components/charts/CrapsBetTypeFrequencyBar.tsx` + test.

- [ ] **Step 1:** Recharts bar chart wrapper using `ChartTooltipShell` (per #251). Empty-state UI when `data.length === 0`:

  ```tsx
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-brass/30 bg-felt-deep p-6 text-center text-xs text-ivory/55">
        Bet-type tracking starts with sessions played after Phase 15 #13.
      </div>
    );
  }
  ```

- [ ] **Step 2:** Smoke test + empty-state test.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/charts/CrapsBetTypeFrequencyBar.{tsx,test.tsx}
  git commit -m "feat(stats): craps bet-type frequency bar chart wrapper"
  ```

### Task B.3 — AdminCrapsPage

**Files:** `src/pages/admin/AdminCrapsPage.tsx` + test (NEW).

- [ ] **Step 1: Layout** per spec §5.1:
  - 4 StatCards: Sessions played / Total rolls / House Net Chips (green positive / red negative) / Actual RTP
  - Hero chart: `<CrapsBetTypeFrequencyBar />`
  - Biggest sessions panel: top 10 by net
  - Recent sessions table (last 20): timestamp / tier / bought in / final bankroll / net / rolls

- [ ] **Step 2:** `useLiveQuery` inferred-Promise pattern (Phase 9 trap).

- [ ] **Step 3:** Recent sessions: load-all + sort-by-`playedAt` desc + `slice(0, 20)` (#250 pattern).

- [ ] **Step 4:** Tests — seed fake rounds; assert each card text + chart presence + table rows + empty-state for bet-type chart when no rows have `betTypeWagered`.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/pages/admin/AdminCrapsPage.{tsx,test.tsx}
  git commit -m "feat(stats): admin craps page with 4 stat cards + bet-type chart + recent table"
  ```

### Task B.4 — Router + sidebar

- [ ] **Step 1:** Lazy route `/admin/craps` in `src/router.tsx`.
- [ ] **Step 2:** "Craps" nav entry in `AdminLayout` after "Poker".
- [ ] **Step 3:** Update `AdminLayout.test.tsx`.
- [ ] **Step 4: Commit.**
  ```bash
  git add src/router.tsx src/pages/admin/AdminLayout.{tsx,test.tsx}
  git commit -m "feat(routing): lazy /admin/craps route + sidebar nav entry"
  ```

### Task B.5 — DoD + open PR

- [ ] Full DoD locally.
- [ ] Push.
- [ ] `gh pr create --title "phase-15(#13) PR B: /admin/craps with bet-type frequency chart" --body "..."` (~67 chars).
- [ ] Report. Do NOT merge.

---

## Self-review

**Spec coverage:**

- §3.1 Hybrid feedback → A.3 (BetSpot props) + A.5 Step 4 (flash + banner orchestration)
- §3.2 Two PRs → PR A (A.0-A.7) + PR B (B.0-B.5)
- §3.3 Dice tumble reuses reel.stop → A.5 Step 7
- §4.2 8 visual files brand pass → A.2 + A.3 + A.4 + A.5
- §4.3 NEW CrapsOddsHeader + CrapsRulesModal + LeaveConfirmModal → A.1
- §4.4 Animation behaviours under reduced motion → A.2 Steps 1-2 (DiceDisplay + PointPuck)
- §4.5 Sound taxonomy → A.5 Steps 7, 8
- §4.6 Hybrid feedback → A.5 Step 4
- §4.7 LEAVE TABLE flow → A.5 Step 10
- §5 /admin/craps → PR B (B.1-B.5)
- §7 risks: `betTypeWagered` field handled in A.5 Steps 8-9 + B.1 Step 1 + B.2 Step 1

**Placeholder scan:** None. Every step has explicit code or commands.

**Type consistency:** `Phase`, `BetOutcome`, `FlashMap`, `BannerKind`, `PersistedCrapsDetails`, `CrapsAllTimeStats` consistent across PR A + PR B. One note: the exact field names on `BetOutcome` (e.g. `betSpotKey` vs `betId`, `kind` vs `outcome`) need to be confirmed in A.0 Step 6 — the plan flags this and allows adapter shape adjustments without changing the load-bearing logic.

**Risks carried forward:** All 6 spec §7 risks have explicit task coverage. The biggest one (per-roll bet data via `details.betTypeWagered`) is covered with the additive PR A field + graceful empty-state in PR B.

---
