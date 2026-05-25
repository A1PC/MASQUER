# Phase 15 sub-project #6 — Roulette upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 sub-project #6 — re-skin the European-roulette table on the MASQUER / Velvet Deco design system, ship a 30 s / 10 s auto-spin betting-window machine with a skippable `SPIN NOW` button, fix the long-standing ball-centre visual, raise the chip-ladder ceiling to 1000 + remove the 10-position bet cap, and add a new all-time `/admin/roulette` analytics page derived from the existing `rounds` table.

**Architecture:** Two implementation PRs per the spec. **PR A** rebuilds the game UI, the XState machine (new timed-window states + `SPIN_NOW` event), the wheel-ball alignment maths, the bet-cap config, the rules content, and the ADR / BUILD_GUIDE updates. Pure logic (`logic.ts` / `bets.ts` / `wheel.ts`) is byte-stable. **PR B** is a read-only admin page that aggregates `db.rounds` rows where `game === 'roulette'`, surfaces them via new helpers in `src/systems/stats.ts`, and renders Recharts panels through the existing lazy admin chunk (ADR-0039).

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 + `useEffectiveReducedMotion` · Dexie 4 (no schema bump) · Recharts (lazy admin chunk) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12 · Storybook 8.

**Spec:** `docs/superpowers/specs/2026-05-25-phase-15-6-roulette-design.md` (merged at #233). Read it before each PR.

---

## Shared rules (apply to every task in both PRs)

1. **Pure logic untouched.** Do NOT modify `src/games/roulette/logic.ts`, `bets.ts`, `wheel.ts`, or their `*.test.ts`. The `spin()` function (and its `randomInt(0, 36)` call), `settleOne`, and `buildRoundResult` stay byte-stable. `config.ts` constants change; that's separate.
2. **Games sandbox** preserved. No `@/db` or `@/store` imports from inside `src/games/roulette/**`. Wallet access via `@/systems/**` (existing pattern in `RoulettePage.tsx`).
3. **One `rounds` row per spin** (ADR-0016). Zero-bet auto-spins produce zero rows — the page settle-bridge no-ops when `bets.length === 0`.
4. **Integer money. No `Math.random()`.** Existing ESLint enforces.
5. **Spec-first.** ADR amendments + BUILD_GUIDE §8.2 update commit first; code follows.
6. **Conventional Commits**, scope `roulette` (game), `adr` (ADR docs), `build-guide` or `docs` (BUILD_GUIDE), `stats` (PR B systems/stats.ts), `admin` (PR B admin page). **Subject ≤ 100 chars** — commitlint fails Meta files otherwise (captured in `feedback-localgamble-commit-subject-limit`).
7. **No skipping git hooks.** Husky + lint-staged + prettier --write must run on every commit. No `--no-verify`. No `--amend` — soft-reset + new commit if you need to rewrite.
8. **DoD per task batch / before opening a PR:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
9. **TS strict + exactOptionalPropertyTypes.** Optional fields must use the spread/`{...(cond ? {key: val} : {})}` pattern, never `key: undefined`.
10. **Tokens-only Tailwind** in the rebuilt files. The exceptions are intrinsically colour-bearing brand surfaces (e.g. wheel woods, pocket fills) — codify those colours as tokens in `tailwind.config.ts` + `src/theme/tokens.ts` if they don't already exist.

---

## File structure

### PR A — Re-skin / timer / ball / bet-cap / rules

| File                                                              | Action   | Responsibility                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/roulette/config.ts`                                    | Modify   | Drop `MAX_POSITIONS_PER_ROUND`; add `INITIAL_BET_WINDOW_MS`, `BETWEEN_ROUNDS_MS`, `RESULT_DISPLAY_MS`.                                                                                                                                                                             |
| `src/games/roulette/machine.ts`                                   | Rewrite  | New states `placing_bets`, `spinning`, `settled`, `between_rounds`; new events `SPIN_NOW`, `PAUSE_TIMER`, `RESUME_TIMER`; remove old `SPIN` event + cap guard.                                                                                                                     |
| `src/games/roulette/machine.test.ts`                              | Rewrite  | Cover all new states + events + zero-bet path + timer pause + reduced-motion path.                                                                                                                                                                                                 |
| `src/games/roulette/WheelView.tsx`                                | Modify   | Ball-centre offset (`+ ARC_DEG / 2`). Tokenize pocket fills + wheel woods if needed.                                                                                                                                                                                               |
| `src/games/roulette/WheelView.test.tsx`                           | Modify   | Pin the new `thetaDeg` invariant; update existing rotation assertions to new value.                                                                                                                                                                                                |
| `src/games/roulette/RoulettePage.tsx`                             | Rewrite  | Wire `LobbyButton` + `OddsInfoBox`; render timer countdown ring + remaining-seconds text; replace SPIN button with `SPIN NOW`; remove `meta=` prop; remove `chipSelector` separate component path if folded into shared chip ladder; pause/resume timer on rules-modal open/close. |
| `src/games/roulette/RoulettePage.test.tsx`                        | Rewrite  | Full cycle test with fake timers; SPIN_NOW skips both windows; zero-bet auto-spin path.                                                                                                                                                                                            |
| `src/games/roulette/BettingLayout.tsx`                            | Modify   | Tokenize colours; ensure unlimited positions render without overflow.                                                                                                                                                                                                              |
| `src/games/roulette/BettingLayout.test.tsx`                       | Modify   | Drop any "10-position cap" assertion; add "places 15 positions" smoke.                                                                                                                                                                                                             |
| `src/games/roulette/ChipSelector.tsx`                             | Modify   | Tokenize chip colours to match the chip ladder from #230 (`velvet` / `brass` / `ivory` mapping).                                                                                                                                                                                   |
| `src/games/roulette/ChipSelector.test.tsx`                        | Modify   | Update colour assertions.                                                                                                                                                                                                                                                          |
| `src/games/roulette/ChipStack.tsx`                                | Modify   | Tokenize + add Framer Motion entry animation on stack append.                                                                                                                                                                                                                      |
| `src/games/roulette/ChipStack.test.tsx`                           | Modify   | Update colour assertions; mock `useReducedMotion`.                                                                                                                                                                                                                                 |
| `src/games/roulette/ResultBanner.tsx`                             | Modify   | Re-skin with brand tokens; use shared `Panel` primitive or styled to match the OddsInfoBox visual language.                                                                                                                                                                        |
| `src/games/roulette/ResultBanner.test.tsx`                        | Modify   | Update assertions if class names change.                                                                                                                                                                                                                                           |
| `src/games/roulette/rules.tsx`                                    | Rewrite  | New sections: object, bet types, the zero, **auto-spin timer**, **bet maximums (unlimited positions × 1000)**, result determination.                                                                                                                                               |
| `tailwind.config.ts`                                              | Modify   | Add `roulette-pocket-red / -black / -green` tokens if reusing brand `velvet` / `ink` / `emerald` doesn't fit visually.                                                                                                                                                             |
| `src/theme/tokens.ts`                                             | Modify   | Mirror any new tokens.                                                                                                                                                                                                                                                             |
| `scripts/gen-audio.mjs`                                           | Modify   | Add `wheel.spin` (whoosh) + `ball.drop` (short percussive click) WAV samples.                                                                                                                                                                                                      |
| `public/sounds/wheel.spin.wav`                                    | Generate | Output of the script — commit alongside.                                                                                                                                                                                                                                           |
| `public/sounds/ball.drop.wav`                                     | Generate | Same.                                                                                                                                                                                                                                                                              |
| `src/systems/sound/soundEngine.ts` (or wherever sample map lives) | Modify   | Register the two new sample keys.                                                                                                                                                                                                                                                  |
| `docs/adr/0030-roulette-bet-position-model.md`                    | Modify   | Append "Amendment (Phase 15 #6, 2026-05-25)" — cap removed.                                                                                                                                                                                                                        |
| `docs/adr/0031-roulette-spin-animation-contract.md`               | Modify   | Append "Ball-centre offset (Phase 15 #6, 2026-05-25)" — `+ ARC_DEG / 2`.                                                                                                                                                                                                           |
| `docs/adr/0046-roulette-auto-spin-betting-windows.md`             | New      | Full ADR for the timer machine.                                                                                                                                                                                                                                                    |
| `BUILD_GUIDE.md`                                                  | Modify   | §8.2 updates: bet-cap note, auto-spin note, ball-centre note. Reference ADR-0046.                                                                                                                                                                                                  |

### PR B — All-time admin analytics

| File                                                   | Action | Responsibility                                                                                                                                  |
| ------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/stats.ts`                                 | Modify | Add `getRouletteAllTimeStats()` + `getRouletteNumberDistribution()` (read-only, additive — do NOT modify existing fns).                         |
| `src/systems/stats.test.ts` (or co-located test file)  | Modify | Pin aggregations against a ~20-row fixture covering all colours, parities, dozens, columns, the zero.                                           |
| `src/pages/admin/AdminRoulettePage.tsx`                | New    | 4 StatCards + 37-bar distribution chart + parity panel + dozens/columns panel + recent-draws table.                                             |
| `src/pages/admin/AdminRoulettePage.test.tsx`           | New    | Render with fake `db.rounds` rows; assert each card + chart count.                                                                              |
| `src/components/admin/AdminSidebar.tsx`                | Modify | Add "ROULETTE" nav entry with `CircleDot` lucide icon, link to `/admin/roulette`.                                                               |
| `src/components/admin/AdminSidebar.test.tsx`           | Modify | Update nav-entry assertions.                                                                                                                    |
| `src/router.tsx`                                       | Modify | Add `const AdminRoulettePage = lazy(() => import('@/pages/admin/AdminRoulettePage'));` + route under the admin layout.                          |
| `src/components/charts/PocketDistributionBar.tsx`      | New    | Thin Recharts wrapper for the 37-bar coloured-by-pocket-colour distribution chart. Mirrors the pattern in `src/components/charts/*` (ADR-0039). |
| `src/components/charts/PocketDistributionBar.test.tsx` | New    | Smoke render.                                                                                                                                   |

---

## PR A — Re-skin / timer / ball / bet-cap / rules

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-6-pr-a`

### Task A.0 — Read the spec + brand tokens (5 min)

- [ ] **Step 1: Read the spec.**
      Open `docs/superpowers/specs/2026-05-25-phase-15-6-roulette-design.md` and skim sections 3 (invariants), 4 (PR A scope), and 8 (risks). The plan below implements §4 task by task.
- [ ] **Step 2: Read the existing brand tokens.**
      Open `src/theme/tokens.ts` and `tailwind.config.ts`. Confirm the tokens you'll be reusing: `bg-felt-table`, `bg-felt-table-deep`, `text-ivory`, `bg-velvet`, `text-gold`, `border-brass`, `roulette-wood-*`. If you find different names with the same meaning, prefer them.
- [ ] **Step 3: Read the chip ladder from #230.**
      Open `src/games/_shared/BettingPanel.tsx` to confirm the `CHIP_STYLES` record (or wherever the chip palette lives). Match colour mapping `1 / 5 / 25 / 100 / 500 / 1000 → palette` in PR A's chip work below.
- [ ] **Step 4: Read the existing roulette files** you'll be touching (`config.ts`, `machine.ts`, `WheelView.tsx`, `RoulettePage.tsx`, `BettingLayout.tsx`, `ChipSelector.tsx`, `ChipStack.tsx`, `ResultBanner.tsx`, `rules.tsx`). Internalise the current shape before changing it.

### Task A.1 — ADR + BUILD_GUIDE updates (spec-first)

**Files:**

- Modify: `docs/adr/0030-roulette-bet-position-model.md`
- Modify: `docs/adr/0031-roulette-spin-animation-contract.md`
- Create: `docs/adr/0046-roulette-auto-spin-betting-windows.md`
- Modify: `BUILD_GUIDE.md` (§8.2)

- [ ] **Step 1: Append amendment to ADR-0030.**

  Add at the end of `docs/adr/0030-roulette-bet-position-model.md`:

  ```markdown
  ## Amendment (2026-05-25, Phase 15 #6)

  The original 10-position cap (`MAX_POSITIONS_PER_ROUND`) was a safety
  rail introduced before the deferred-`placeBet` wallet model was battle-
  tested. With Phase-4's deferred-placeBet model now stable across all
  multi-bet games, the cap is removed: the player may place an unlimited
  number of positions per round, each up to `MAX_BET` (1000). Total
  stake is bounded by the player's chip balance, not by position count.

  The bet-key uniqueness contract is unchanged — one `PlacedBet` per
  `BetPositionKey` per round, with subsequent clicks accumulating into
  the existing `amount` field.

  Implementation: `addBet` in `src/games/roulette/machine.ts` no longer
  short-circuits when `bets.length >= cap`; `ROULETTE_CONFIG.MAX_POSITIONS_PER_ROUND`
  is deleted from `src/games/roulette/config.ts`. Tests asserting the
  cap-rejection branch are removed.
  ```

- [ ] **Step 2: Append amendment to ADR-0031.**

  Add at the end of `docs/adr/0031-roulette-spin-animation-contract.md`:

  ````markdown
  ## Amendment — Ball-centre offset (2026-05-25, Phase 15 #6)

  The ball's `thetaDeg` in `WheelView.tsx` was originally
  `targetIdx * ARC_DEG`, which placed the ball at the **leading edge**
  of the winning pocket. Pocket N spans `[i * ARC_DEG, (i+1) * ARC_DEG]`
  in wheel-local angle, so the geometric centre is `(i + 0.5) * ARC_DEG`.
  The corrected formula:

  ```ts
  const thetaDeg = targetIdx * ARC_DEG + ARC_DEG / 2; // centre of pocket
  ```
  ````

  The wheel-rotation maths is unchanged: the wheel still ends at integer
  multiples of 360°, so pocket N's geometric viewport centre equals the
  new `thetaDeg`. The orbit and rotation remain independent; only the
  ball's end angle changes.

  Tests pin the new offset directly.

  ## Amendment — Auto-spin betting windows (2026-05-25, Phase 15 #6)

  The legacy `betting → spinning → settled` sequence (requiring an
  explicit `SPIN` event) is replaced by the four-state timed cycle in
  ADR-0046. The spin animation, duration, easing, and reduced-motion
  contract from this ADR are unchanged. The only delta here is _what
  triggers the transition into `spinning`_: a 30-second window on initial
  mount and a 10-second window between rounds, both skippable via
  `SPIN_NOW`. See ADR-0046 for full state graph + delays.

  ```

  ```

- [ ] **Step 3: Create ADR-0046.**

  Write `docs/adr/0046-roulette-auto-spin-betting-windows.md`:

  ```markdown
  # ADR-0046: Roulette — auto-spin betting windows

  - Status: Accepted
  - Date: 2026-05-25
  - Deciders: @adamzspare
  - Supersedes: the legacy explicit `SPIN` event in the original
    Phase-4 roulette machine.
  - Amends: ADR-0031 (spin animation contract — spin trigger only;
    animation contract unchanged).

  ## Context

  The original Phase-4 roulette machine required the player to click
  SPIN explicitly to leave the `betting` state. In Phase 15 #6 the
  user requested an authentic casino cadence:

  > When you click on the roulette wheel option from the lobby menu,
  > give the player 30s to place their bets, then the wheel auto
  > spins. After the spin, the player can click a button to spin the
  > wheel immediately, otherwise, give them 10s before the wheel auto
  > spins with or without the bets on the board.

  ## Decision

  Replace the three-state machine with a four-state timed cycle:
  ```

  placing_bets ──after 30s──┐
  │ ▼
  │ SPIN_NOW ──► spinning
  │ │ after SPIN_DURATION_MS
  │ ▼
  │ settled
  │ │ after RESULT_DISPLAY_MS
  │ ▼
  └────────── between_rounds
  │ after 10s
  │ OR SPIN_NOW
  ▼
  (back to spinning — same target action via setSpinResult on entry)

  ```

  **Constants (in `ROULETTE_CONFIG`):**

  - `INITIAL_BET_WINDOW_MS = 30_000`
  - `BETWEEN_ROUNDS_MS = 10_000`
  - `RESULT_DISPLAY_MS = 1_500`
  - Existing `SPIN_DURATION_MS = 5_000` unchanged.

  **Events:**

  - `PLACE_BET`, `REMOVE_BET`, `CLEAR_ALL` — accepted in
    `placing_bets` and `between_rounds`.
  - `SPIN_NOW` — accepted in `placing_bets` and `between_rounds`;
    transitions immediately to `spinning`.
  - `PAUSE_TIMER`, `RESUME_TIMER` — accepted in either timer state;
    snapshot `betWindowEndsAt` on pause, recompute on resume so the
    remaining window is preserved.
  - Legacy `SPIN` event is removed. Legacy `NEW_ROUND` event is removed
    (auto-driven by `RESULT_DISPLAY_MS`).

  **Zero-bet path.** The auto-spin transition has **no** guard. If
  the timer expires with `bets.length === 0`, the wheel spins anyway
  (cosmetic only). The page's settle-bridge no-ops when there are no
  handles to settle — no `rounds` row is written. ADR-0016's "one
  rounds row per round" contract is preserved because a zero-stake
  spin is, by ADR-0016's own wording, a non-event.

  **Pause behaviour.** The timer pauses when the player opens the
  RULES modal (they're reading; the dealer waits) and resumes on
  close. The timer does NOT pause when the browser tab is hidden —
  browser background throttling slows the tick but does not stop it,
  matching the "real casino" feel.

  **Reduced motion.** Timers tick normally; the visual countdown ring
  collapses to a static "Auto-spin in 12 s" text label. The spin
  animation reduced-motion path (`spinDurationMs: 0` from ADR-0031)
  is unchanged.

  **Timer mechanism.** XState v5's `after` delays drive the auto-
  transitions. The numeric countdown surfaced to the player is
  computed in the page from `betWindowEndsAt: number | null` in
  machine context, ticked via `setInterval(..., 100)` inside a
  `useEffect`. Counter ticks are NOT events — they live in component
  state only.

  ## Alternatives considered

  - **Keep legacy `SPIN` event + add an optional auto-timer.** Rejected:
    branching event handling everywhere and a perpetually-on-or-off
    timer toggle muddied the brainstorm. Replacement is cleaner.
  - **`fromCallback` actor managing `setTimeout`.** Rejected for the
    primary trigger (XState `after` is simpler) but viable for the
    pause/resume path if `after` re-keying proves brittle in tests.
    Implementer may switch if the after-extend pattern is awkward;
    document if so.
  - **3-state machine where `settled` directly returns to `placing_bets`.**
    Rejected: collapsing `settled` and `between_rounds` made the result
    banner timing brittle (the banner needs ≥ 1 s to read; the 10-s
    window is for re-betting after the banner clears). Splitting them
    keeps each state's purpose obvious.

  ## Consequences

  - The legacy "click SPIN to play" interaction is gone. Players who
    want immediate action use `SPIN NOW`.
  - Visit-tracking (`useGameVisit` in `GameShell`) is unaffected — the
    page is still mounted across rounds.
  - The page must mount/unmount cleanly to cancel timers on navigate-
    away. React's strict-mode double-mount in dev triggers XState's
    `after` twice — verify cleanup in dev.
  - Reduced-motion users still get the same 30 s / 10 s windows. The
    spin itself remains instant for them.

  ## References

  - Spec: `docs/superpowers/specs/2026-05-25-phase-15-6-roulette-design.md` §4.5
  - ADR-0031 — animation contract (spin trigger amended here)
  - ADR-0016 — one rounds row per round
  - BUILD_GUIDE §8.2
  - `src/games/roulette/machine.ts`
  ```

- [ ] **Step 4: Update BUILD_GUIDE §8.2.**

  Read `BUILD_GUIDE.md`, find §8.2 (Roulette), and append a `### Phase 15 #6 amendments (2026-05-25)` subsection:

  ```markdown
  ### Phase 15 #6 amendments (2026-05-25)

  - **No 10-position cap.** Players may place unlimited bet positions per round, each up to `MAX_BET` (1000). Total stake is bounded by the player's chip balance. See ADR-0030 amendment.
  - **Auto-spin betting windows.** The wheel auto-spins 30 s after entering the page, then 10 s between rounds. The `SPIN NOW` button skips the current window. Zero-bet auto-spins run (cosmetic) but write no `rounds` row. See ADR-0046.
  - **Ball lands on pocket centre.** The ball's final viewport angle is `(idx + 0.5) * (360 / 37)` so it visually settles on the centre of the winning pocket, not its leading edge. See ADR-0031 amendment.
  ```

- [ ] **Step 5: Commit + run markdownlint.**

  ```bash
  npx markdownlint-cli2 docs/adr/0030-* docs/adr/0031-* docs/adr/0046-* BUILD_GUIDE.md
  git add docs/adr/0030-roulette-bet-position-model.md docs/adr/0031-roulette-spin-animation-contract.md docs/adr/0046-roulette-auto-spin-betting-windows.md BUILD_GUIDE.md
  git commit -m "docs(roulette): ADR-0046 auto-spin windows; amend 0030/0031 + BUILD_GUIDE"
  ```

  Subject is 78 chars (under 100).

### Task A.2 — Config + sample additions

**Files:**

- Modify: `src/games/roulette/config.ts`
- Modify: `scripts/gen-audio.mjs`
- Modify: `src/systems/sound/soundEngine.ts` (or wherever the sample map is)

- [ ] **Step 1: Update `ROULETTE_CONFIG`.**

  Replace `src/games/roulette/config.ts` with:

  ```ts
  export const ROULETTE_CONFIG = {
    /** Per-bet-position chip minimum. Matches Blackjack via ADR-0025. */
    MIN_BET: 5,
    /** Per-bet-position chip maximum. Matches Blackjack via ADR-0025. */
    MAX_BET: 1_000,
    /** Chip denominations shown in the selector (left → right). ADR-0030. */
    CHIP_DENOMINATIONS: [5, 25, 100, 250, 500, 1_000] as const,
    /** Spin animation duration in ms. ADR-0031. */
    SPIN_DURATION_MS: 5_000,
    /** Result-banner / pocket-pulse duration in ms. ADR-0031. */
    RESULT_PULSE_MS: 600,
    /** ADR-0046 — initial betting window after page mount. */
    INITIAL_BET_WINDOW_MS: 30_000,
    /** ADR-0046 — re-betting window between rounds. */
    BETWEEN_ROUNDS_MS: 10_000,
    /** ADR-0046 — how long the settled banner lingers before between_rounds starts. */
    RESULT_DISPLAY_MS: 1_500,
  } as const;

  export type RouletteConfig = typeof ROULETTE_CONFIG;
  export type ChipDenomination = (typeof ROULETTE_CONFIG.CHIP_DENOMINATIONS)[number];
  ```

  Note: `MAX_POSITIONS_PER_ROUND` is **deleted** (per ADR-0030 amendment).

- [ ] **Step 2: Add new sound samples.**

  Read `scripts/gen-audio.mjs`. Add two new sample definitions:
  - `wheel.spin` — a whoosh: ~600 ms low-pass-filtered noise sweep, fade-in over 100 ms, fade-out over 300 ms. Looks at the existing samples for the helper pattern (likely `mkWhoosh()` or similar — match the existing style).
  - `ball.drop` — a short percussive click: 60 ms enveloped sine at ~700 Hz with a sharp attack and 50 ms decay.

  If the script lacks helpers for these shapes, write minimal ones inline. Run `node scripts/gen-audio.mjs` to regenerate `public/sounds/`. Commit the generated `.wav` files alongside.

- [ ] **Step 3: Register the new sample keys.**

  In whichever module maps sample keys → URLs (likely `src/systems/sound/soundEngine.ts` or `src/systems/sound/samples.ts`), add `'wheel.spin'` and `'ball.drop'` entries. Mirror the existing entries' shape.

- [ ] **Step 4: Run typecheck.**

  ```bash
  pnpm typecheck
  ```

- [ ] **Step 5: Commit.**

  ```bash
  git add src/games/roulette/config.ts scripts/gen-audio.mjs src/systems/sound/ public/sounds/wheel.spin.wav public/sounds/ball.drop.wav
  git commit -m "feat(roulette): config constants + wheel.spin / ball.drop samples"
  ```

### Task A.3 — Ball-centre fix (one-line surgical change)

**Files:**

- Modify: `src/games/roulette/WheelView.tsx`
- Modify: `src/games/roulette/WheelView.test.tsx`

- [ ] **Step 1: Update `thetaDeg` in `WheelView.tsx`.**

  Find the line:

  ```ts
  const thetaDeg = targetIdx * ARC_DEG;
  ```

  Replace with:

  ```ts
  // Pocket N's geometric centre, in viewport degrees (slice spans
  // [i * ARC_DEG, (i+1) * ARC_DEG] → centre = (i + 0.5) * ARC_DEG).
  // The ball orbit lands at this angle so the ball visually settles
  // on the pocket centre, not its leading edge. See ADR-0031 amendment.
  const thetaDeg = targetIdx * ARC_DEG + ARC_DEG / 2;
  ```

- [ ] **Step 2: Update the alignment-invariant test.**

  In `WheelView.test.tsx`, find the existing test that pins `data-rotate-target` for the ball orbit. Update its expected values to include the `+ ARC_DEG / 2` (≈ `+4.864864864864865°`) offset.

  Add (or replace) a parametric invariant test:

  ```ts
  it('lands the ball on the geometric centre of the winning pocket', () => {
    for (let n = 0; n <= 36; n += 1) {
      const { container } = render(
        <WheelView targetNumber={n} spinning={false} settled={true} />,
      );
      const orbit = container.querySelector('[data-roulette-layer="ball-orbit"]');
      const target = Number(orbit?.getAttribute('data-rotate-target'));
      const idx = POCKET_ORDER.indexOf(n);
      const expected = idx * (360 / 37) + (360 / 37) / 2;
      expect(target).toBeCloseTo(expected, 6);
      cleanup();
    }
  });
  ```

- [ ] **Step 3: Run tests.**

  ```bash
  pnpm exec vitest run src/games/roulette/WheelView.test.tsx
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add src/games/roulette/WheelView.tsx src/games/roulette/WheelView.test.tsx
  git commit -m "fix(roulette): land ball on pocket centre, not leading edge (ADR-0031)"
  ```

### Task A.4 — Rewrite the XState machine

**Files:**

- Rewrite: `src/games/roulette/machine.ts`
- Rewrite: `src/games/roulette/machine.test.ts`

This is the largest single task in PR A. The full machine code is below; copy it verbatim and adapt only if you discover a typed-event mismatch.

- [ ] **Step 1: Replace `machine.ts`.**

  ```ts
  import { assign, setup } from 'xstate';
  import { ROULETTE_CONFIG } from './config';
  import { buildRoundResult, spin } from './logic';
  import type { BetPositionKey, PlacedBet, SpinResult } from './types';

  interface Context {
    bets: PlacedBet[];
    spinResult: SpinResult | null;
    roundResult: ReturnType<typeof buildRoundResult> | null;
    spinDurationMs: number;
    /** When non-null, the wallclock ms at which the current timer state's
     *  auto-spin fires. The page reads this to drive the countdown ring +
     *  remaining-seconds text. Set on entry to placing_bets / between_rounds;
     *  cleared on exit. */
    betWindowEndsAt: number | null;
    /** When non-null, the wallclock ms when PAUSE_TIMER fired. RESUME_TIMER
     *  extends betWindowEndsAt by (now - pausedAt). */
    pausedAt: number | null;
  }

  type MachineEvent =
    | { type: 'PLACE_BET'; bet: PlacedBet }
    | { type: 'REMOVE_BET'; key: BetPositionKey }
    | { type: 'CLEAR_ALL' }
    | { type: 'SPIN_NOW' }
    | { type: 'PAUSE_TIMER' }
    | { type: 'RESUME_TIMER' };

  type MachineInput =
    | {
        spinDurationMs?: number;
        initialBetWindowMs?: number;
        betweenRoundsMs?: number;
        resultDisplayMs?: number;
      }
    | undefined;

  export const rouletteMachine = setup({
    types: {
      context: {} as Context,
      events: {} as MachineEvent,
      input: undefined as MachineInput,
    },
    actions: {
      addBet: assign({
        bets: ({ context, event }) => {
          if (event.type !== 'PLACE_BET') return context.bets;
          const idx = context.bets.findIndex((b) => b.key === event.bet.key);
          if (idx >= 0) {
            const existing = context.bets[idx]!;
            const next = [...context.bets];
            next[idx] = { ...existing, amount: existing.amount + event.bet.amount };
            return next;
          }
          // ADR-0030 amendment (Phase 15 #6) — no position cap.
          return [...context.bets, event.bet];
        },
      }),
      removeBet: assign({
        bets: ({ context, event }) => {
          if (event.type !== 'REMOVE_BET') return context.bets;
          return context.bets.filter((b) => b.key !== event.key);
        },
      }),
      clearAll: assign({ bets: () => [] }),
      setSpinResult: assign({ spinResult: () => spin() }),
      setRoundResult: assign({
        roundResult: ({ context }) => {
          if (!context.spinResult) return null;
          return buildRoundResult(context.bets, context.spinResult);
        },
      }),
      prepareNextRound: assign({
        bets: ({ context }) => {
          if (!context.spinResult) return [];
          const winningNumber = context.spinResult.number;
          return context.bets
            .filter((b) => !b.numbers.includes(winningNumber))
            .map((b) => ({ ...b, betHandleId: '' }));
        },
        spinResult: () => null,
        roundResult: () => null,
      }),
      armInitialBetWindow: assign({
        betWindowEndsAt: () => Date.now() + ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS,
        pausedAt: () => null,
      }),
      armBetweenRoundsWindow: assign({
        betWindowEndsAt: () => Date.now() + ROULETTE_CONFIG.BETWEEN_ROUNDS_MS,
        pausedAt: () => null,
      }),
      clearWindow: assign({ betWindowEndsAt: () => null, pausedAt: () => null }),
      pause: assign({ pausedAt: () => Date.now() }),
      resume: assign({
        betWindowEndsAt: ({ context }) => {
          if (context.betWindowEndsAt === null || context.pausedAt === null)
            return context.betWindowEndsAt;
          const pausedFor = Date.now() - context.pausedAt;
          return context.betWindowEndsAt + pausedFor;
        },
        pausedAt: () => null,
      }),
    },
    delays: {
      spinDuration: ({ context }) => context.spinDurationMs,
      initialBetWindow: () => ROULETTE_CONFIG.INITIAL_BET_WINDOW_MS,
      betweenRoundsWindow: () => ROULETTE_CONFIG.BETWEEN_ROUNDS_MS,
      resultDisplay: () => ROULETTE_CONFIG.RESULT_DISPLAY_MS,
    },
  }).createMachine({
    id: 'roulette',
    initial: 'placing_bets',
    context: ({ input }) => ({
      bets: [],
      spinResult: null,
      roundResult: null,
      spinDurationMs: input?.spinDurationMs ?? ROULETTE_CONFIG.SPIN_DURATION_MS,
      betWindowEndsAt: null,
      pausedAt: null,
    }),
    states: {
      placing_bets: {
        entry: 'armInitialBetWindow',
        exit: 'clearWindow',
        on: {
          PLACE_BET: { actions: 'addBet' },
          REMOVE_BET: { actions: 'removeBet' },
          CLEAR_ALL: { actions: 'clearAll' },
          SPIN_NOW: { target: 'spinning' },
          PAUSE_TIMER: { actions: 'pause' },
          RESUME_TIMER: { actions: 'resume' },
        },
        after: {
          initialBetWindow: { target: 'spinning' },
        },
      },
      spinning: {
        entry: 'setSpinResult',
        after: {
          spinDuration: { target: 'settled', actions: 'setRoundResult' },
        },
      },
      settled: {
        after: {
          resultDisplay: { target: 'between_rounds', actions: 'prepareNextRound' },
        },
      },
      between_rounds: {
        entry: 'armBetweenRoundsWindow',
        exit: 'clearWindow',
        on: {
          PLACE_BET: { actions: 'addBet' },
          REMOVE_BET: { actions: 'removeBet' },
          CLEAR_ALL: { actions: 'clearAll' },
          SPIN_NOW: { target: 'spinning' },
          PAUSE_TIMER: { actions: 'pause' },
          RESUME_TIMER: { actions: 'resume' },
        },
        after: {
          betweenRoundsWindow: { target: 'spinning' },
        },
      },
    },
  });
  ```

- [ ] **Step 2: Replace `machine.test.ts`.** Cover:
  - enters `placing_bets` on mount, arms `betWindowEndsAt`
  - `PLACE_BET` adds; `REMOVE_BET` removes; `CLEAR_ALL` clears
  - `addBet` no longer rejects past 10 positions (test placing 15 distinct positions)
  - `SPIN_NOW` from `placing_bets` transitions to `spinning` immediately, clears `betWindowEndsAt`
  - 30 s elapses → auto-spin to `spinning`
  - `spinning` sets `spinResult` via `setSpinResult`; after `SPIN_DURATION_MS` transitions to `settled` and sets `roundResult`
  - `settled` after `RESULT_DISPLAY_MS` transitions to `between_rounds`, clears `spinResult` + `roundResult` and prunes winning bets
  - `between_rounds` arms a 10 s timer; `SPIN_NOW` skips
  - Zero-bet auto-spin (don't place any bets in `placing_bets`, advance 30 s, observe `spinning` entry with empty `bets`)
  - `PAUSE_TIMER` snapshots `pausedAt`; `RESUME_TIMER` extends `betWindowEndsAt` by the paused duration (use `vi.setSystemTime` to control wallclock)
  - Reduced-motion path: `spinDurationMs: 0` from input still settles via the same flow
  - All tests use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(...)`. Use `await Promise.resolve()` between sends if needed to flush microtasks (per Phase 12 lesson).

- [ ] **Step 3: Run tests.**

  ```bash
  pnpm exec vitest run src/games/roulette/machine.test.ts
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add src/games/roulette/machine.ts src/games/roulette/machine.test.ts
  git commit -m "feat(roulette): auto-spin betting windows + remove position cap (ADR-0046)"
  ```

### Task A.5 — Re-skin BettingLayout / ChipSelector / ChipStack / ResultBanner

**Files:**

- Modify: `src/games/roulette/BettingLayout.tsx` + test
- Modify: `src/games/roulette/ChipSelector.tsx` + test
- Modify: `src/games/roulette/ChipStack.tsx` + test
- Modify: `src/games/roulette/ResultBanner.tsx` + test
- Possibly modify: `tailwind.config.ts` + `src/theme/tokens.ts` (if adding pocket-colour tokens)

- [ ] **Step 1: Survey current colours.**

  Open each file and list every raw hex (`#XXXXXX`) or non-token Tailwind class. Decide for each whether it maps to an existing token (`bg-velvet`, `bg-felt-table`, `text-ivory`, `text-gold`, `border-brass`, `roulette-wood-*`, `roulette-pocket-*` if you add them).

- [ ] **Step 2: Add tokens if needed.**

  If `roulette-pocket-red`/`-black`/`-green` don't exist (likely, given `WheelView.tsx` hard-codes them), add them in:
  - `src/theme/tokens.ts` — under the roulette section.
  - `tailwind.config.ts` — under `theme.extend.colors`.

  Suggested values matching the current visual:

  ```ts
  'roulette-pocket-red': '#a3122a',
  'roulette-pocket-black': '#1a1a1a',
  'roulette-pocket-green': '#3dd17a',
  ```

  If a brand-equivalent already exists (e.g. `velvet === #a3122a`), reuse instead.

- [ ] **Step 3: Re-skin `ChipSelector.tsx`.**

  Replace the inline hex `CHIP_COLORS` record with token-driven styling, matching the `BettingPanel` chip palette from #230. Keep the size, ring, scale-on-select interaction. The 1000 chip is already supported.

- [ ] **Step 4: Re-skin `ChipStack.tsx` + add entry animation.**

  Wrap the rendered stack in a `motion.div` from Framer Motion. On a new chip click (when the stack's chip-count increases by 1), animate the topmost chip with `initial={{ scale: 0.6, opacity: 0 }}` `animate={{ scale: 1, opacity: 1 }}` `transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}`. Use the existing `useEffectiveReducedMotion()` hook to short-circuit to instant in reduced-motion.

- [ ] **Step 5: Re-skin `ResultBanner.tsx`.**

  Replace ad-hoc styling with the shared `Panel` primitive (or the closest one in `@/components/ui`). Use `text-ivory` for the body, `text-gold` for the number, `bg-velvet` for the surface. Animate in via the shared `motion-safe` slide variant.

- [ ] **Step 6: Re-skin `BettingLayout.tsx`.**

  Tokenize the felt-table colours. Ensure the position grid accommodates unlimited bet positions without overflow — likely already fine because each grid cell is fixed; only the chip-stack at each cell grows. Verify by mentally running through 20+ chip clicks across 20+ positions.

- [ ] **Step 7: Update each component's tests.**
  - Drop any colour-hex assertions in favour of class-name or `data-token` assertions.
  - `BettingLayout.test.tsx` — drop the 10-position cap assertion if present; add a smoke test that places 15 distinct positions and counts them.
  - `ChipStack.test.tsx` — mock `useEffectiveReducedMotion()` (or `useReducedMotion`) to return `true` so animation doesn't introduce timing flakes.

- [ ] **Step 8: Run targeted tests.**

  ```bash
  pnpm exec vitest run src/games/roulette/BettingLayout.test.tsx src/games/roulette/ChipSelector.test.tsx src/games/roulette/ChipStack.test.tsx src/games/roulette/ResultBanner.test.tsx
  ```

- [ ] **Step 9: Commit.**

  ```bash
  git add src/games/roulette/BettingLayout.tsx src/games/roulette/BettingLayout.test.tsx src/games/roulette/ChipSelector.tsx src/games/roulette/ChipSelector.test.tsx src/games/roulette/ChipStack.tsx src/games/roulette/ChipStack.test.tsx src/games/roulette/ResultBanner.tsx src/games/roulette/ResultBanner.test.tsx tailwind.config.ts src/theme/tokens.ts
  git commit -m "feat(roulette): tokenize chips / layout / banner + chip-stack animation"
  ```

### Task A.6 — Rewrite RoulettePage with timer + SPIN NOW + LobbyButton + OddsInfoBox

**Files:**

- Rewrite: `src/games/roulette/RoulettePage.tsx`
- Rewrite: `src/games/roulette/RoulettePage.test.tsx`

- [ ] **Step 1: Replace `RoulettePage.tsx`.** Key changes:
  1. Import `LobbyButton`, `OddsInfoBox` from `@/games/_shared/`.
  2. Import `useSound` from `@/systems/sound/useSound`.
  3. Import `useEffectiveReducedMotion` from `@/motion/useEffectiveReducedMotion`.
  4. Drop the `meta=` prop on `<GameShell>`.
  5. Add `lobbyButton={<LobbyButton />}` and `oddsInfo={<OddsInfoBox>Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Six-line 5:1 · Column 2:1 · Dozen 2:1 · Red/Black/Odd/Even/Low/High 1:1</OddsInfoBox>}`.
  6. Replace the `inBetting`/`hasBets`/`handleSpinClick` flow with: `inPlacingBets = state.matches('placing_bets')`, `inSpinning`, `inSettled`, `inBetweenRounds = state.matches('between_rounds')`. `canPlace = inPlacingBets || inBetweenRounds`.
  7. The SPIN button becomes a `SPIN NOW` button: `disabled={!canPlace}`, on-click sends `{ type: 'SPIN_NOW' }`. **No** wallet placeBet on click — that moves into a new bridge effect:
     - When the machine **enters** `spinning`, the bridge loops over `state.context.bets` and calls `placeBet` for each (same try/refund pattern as today). Once all handles are collected, NO event is sent (the machine is already in `spinning`). The settle-bridge later reads `handlesRef`.
     - Edge case: if a `placeBet` fails mid-loop, refund the placed ones (existing pattern) and _let the spin run anyway_ — the page just records nothing in settle. This matches the user's "zero-bet auto-spin is fine" rule.
  8. Remove the `<button>New round</button>` — auto-driven now.
  9. Add a timer display in the page that reads `state.context.betWindowEndsAt`. Render a countdown ring (SVG `circle` with `stroke-dashoffset` keyed off `(endsAt - Date.now()) / windowMs`) and a numeric label (`Math.ceil((endsAt - Date.now()) / 1000)s`). Use `setInterval(() => forceUpdate(), 100)` inside a `useEffect` that re-runs when the timer state changes. In reduced-motion, render only the numeric label.
  10. Wire `useSound`: `chip.place` on every `PLACE_BET` send, `wheel.spin` on entry to `spinning`, `ball.drop` on entry to `settled`, win/loss stinger on settle.
  11. Wire rules-modal pause: `GameShell.RulesModal` exposes `onOpenChange`. Plumb that so opening sends `{ type: 'PAUSE_TIMER' }` and closing sends `{ type: 'RESUME_TIMER' }`. If `GameShell` doesn't expose `onOpenChange`, add it now (minimal change — just forward Radix's `onOpenChange`).
  12. Remove the `useReducedMotion` import in favor of `useEffectiveReducedMotion` for consistency with #4/#5.

- [ ] **Step 2: Rewrite `RoulettePage.test.tsx`.** Coverage:
  - Page renders the wheel + betting layout + chip selector.
  - LobbyButton + OddsInfoBox render.
  - Timer countdown text renders during `placing_bets`.
  - Clicking SPIN NOW sends `SPIN_NOW` and transitions through the cycle.
  - Auto-spin: with fake timers, advance 30 s → assert wheel target is set.
  - Zero-bet auto-spin doesn't call `settleRound`.
  - Bet → spin → settle → between_rounds → spin (full cycle) with fake timers.
  - PAUSE_TIMER fires when rules modal opens; RESUME_TIMER fires on close.
  - Reduced-motion path: numeric label only, no ring.

- [ ] **Step 3: Run tests.**

  ```bash
  pnpm exec vitest run src/games/roulette/RoulettePage.test.tsx
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add src/games/roulette/RoulettePage.tsx src/games/roulette/RoulettePage.test.tsx src/games/_shared/GameShell.tsx
  git commit -m "feat(roulette): page rebuild with timer countdown + SPIN_NOW + shared shell"
  ```

### Task A.7 — Rewrite the rules

**File:**

- Modify: `src/games/roulette/rules.tsx`

- [ ] **Step 1: Rewrite to cover the new rules.** Sections (mirror the Blackjack rules layout from #230):
  - **Object** — Predict the winning pocket. One spin per round; many bets per spin.
  - **Bet types & payouts** — Same table as today, with `<h3>` per category. Add unlimited-positions note.
  - **The zero** — Even-money & outside bets lose on 0. Inside bets including 0 (Straight 0, Split 0-1/0-2/0-3, Street 0-1-2 / 0-2-3) pay normally.
  - **Auto-spin** — _"30 seconds to place your first bets; 10 seconds between rounds. The SPIN NOW button skips either window. The wheel spins whether or not you've placed a bet."_
  - **Bet maximums** — _"Up to 1000 chips per position; unlimited positions; total stake bounded by your balance."_
  - **Result determination** — _"The winning number is decided by the RNG before the wheel starts moving (cosmetic animation only). The ball lands on the centre of the winning pocket."_
  - **Repeat last bets** — _"Not yet supported; coming in a future polish."_

  Use the same `<h3 class="font-display text-xs tracking-[0.18em] text-gold">` heading style as the existing rules.

- [ ] **Step 2: Commit.**

  ```bash
  git add src/games/roulette/rules.tsx
  git commit -m "docs(roulette): rewrite rules — timer + unlimited positions + ball centre"
  ```

### Task A.8 — Full DoD + open PR A

- [ ] **Step 1: Run the full DoD.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

  All six must pass.

- [ ] **Step 2: Push + open PR.**

  ```bash
  git push -u origin phase-15-6-pr-a
  gh pr create --title "phase-15(#6) PR A: roulette reskin + auto-spin + ball centre + unlimited bets" --body "$(...)"
  ```

  Body should summarise: shipped sections per task list, key behaviours verified, ADRs added/amended, scope confirmation (no other games touched, sandbox preserved, logic byte-stable). Reference spec + plan paths.

- [ ] **Step 3: Report DoD result + PR URL.** Do NOT merge — controller reviews + merges.

---

## PR B — Admin all-time roulette analytics

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-6-pr-b`

### Task B.0 — Survey existing admin pages

- [ ] **Step 1: Read the comparator pages.**
  - `src/pages/admin/AdminLotteryPage.tsx` — the closest analogue: aggregate stats, distribution chart, recent draws table.
  - `src/pages/admin/AdminBingoPage.tsx` — the admin sidebar pattern + per-game lazy-loaded chunk pattern.
  - `src/components/admin/AdminSidebar.tsx` — where the new nav item goes.
  - `src/router.tsx` — the lazy-route pattern.

- [ ] **Step 2: Read `src/systems/stats.ts`.**

  Confirm the existing function shapes; add the new functions in the same style.

### Task B.1 — Add new aggregations to `src/systems/stats.ts`

**File:**

- Modify: `src/systems/stats.ts`
- Modify: `src/systems/stats.test.ts` (or create roulette-specific test file beside it)

- [ ] **Step 1: Add the aggregation functions.**

  Append to `src/systems/stats.ts`:

  ```ts
  // ─── Phase 15 #6 — Roulette all-time admin stats ────────────────────────

  import type { RouletteRoundDetails } from '@/games/roulette/types';

  export interface RouletteAllTimeStats {
    ballsSpun: number;
    netHouseChips: number; // positive = house won
    netPlayerChips: number; // mirror of netHouseChips
    redCount: number;
    blackCount: number;
    greenCount: number;
    oddCount: number;
    evenCount: number;
    lowCount: number;
    highCount: number;
    dozenCounts: [number, number, number];
    columnCounts: [number, number, number];
  }

  /** Column membership of each number per BUILD_GUIDE §8.2.
   *  Column 1: 1,4,7,10,...,34 (n mod 3 === 1)
   *  Column 2: 2,5,8,11,...,35 (n mod 3 === 2)
   *  Column 3: 3,6,9,12,...,36 (n mod 3 === 0, n !== 0)
   */
  function columnOf(n: number): 0 | 1 | 2 | 3 {
    if (n === 0) return 0; // not in any column
    const m = n % 3;
    if (m === 1) return 1;
    if (m === 2) return 2;
    return 3;
  }

  function dozenOf(n: number): 0 | 1 | 2 | 3 {
    if (n === 0) return 0;
    if (n <= 12) return 1;
    if (n <= 24) return 2;
    return 3;
  }

  export async function getRouletteAllTimeStats(): Promise<RouletteAllTimeStats> {
    const rows = await db.rounds.where('game').equals('roulette').toArray();
    let ballsSpun = 0;
    let netHouseChips = 0;
    let redCount = 0;
    let blackCount = 0;
    let greenCount = 0;
    let oddCount = 0;
    let evenCount = 0;
    let lowCount = 0;
    let highCount = 0;
    const dozenCounts: [number, number, number] = [0, 0, 0];
    const columnCounts: [number, number, number] = [0, 0, 0];

    for (const r of rows) {
      const d = r.details as RouletteRoundDetails | undefined;
      if (!d?.spin) continue;
      ballsSpun += 1;
      netHouseChips += r.betAmount - r.payout;
      const n = d.spin.number;
      const c = d.spin.color;
      if (c === 'red') redCount += 1;
      else if (c === 'black') blackCount += 1;
      else greenCount += 1;
      if (n !== 0) {
        if (n % 2 === 1) oddCount += 1;
        else evenCount += 1;
        if (n <= 18) lowCount += 1;
        else highCount += 1;
        const dz = dozenOf(n);
        if (dz > 0) dozenCounts[dz - 1] += 1;
        const col = columnOf(n);
        if (col > 0) columnCounts[col - 1] += 1;
      }
    }

    return {
      ballsSpun,
      netHouseChips,
      netPlayerChips: -netHouseChips,
      redCount,
      blackCount,
      greenCount,
      oddCount,
      evenCount,
      lowCount,
      highCount,
      dozenCounts,
      columnCounts,
    };
  }

  export interface RouletteDistributionPoint {
    number: number; // 0..36
    count: number;
    color: 'red' | 'black' | 'green';
  }

  export async function getRouletteNumberDistribution(): Promise<RouletteDistributionPoint[]> {
    const rows = await db.rounds.where('game').equals('roulette').toArray();
    const counts = new Array<number>(37).fill(0);
    for (const r of rows) {
      const d = r.details as RouletteRoundDetails | undefined;
      if (!d?.spin) continue;
      counts[d.spin.number]! += 1;
    }
    // Static colour map per ADR-0029.
    const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    return Array.from({ length: 37 }, (_, n) => ({
      number: n,
      count: counts[n]!,
      color: n === 0 ? 'green' : RED.has(n) ? 'red' : 'black',
    }));
  }
  ```

- [ ] **Step 2: Tests.**

  Add to `src/systems/stats.test.ts` (or create a dedicated file). Use `fake-indexeddb` from the existing test setup. Seed ~20 fake `roulette` rounds covering all colours / parities / dozens / columns / the zero, then assert each aggregation.

- [ ] **Step 3: Run.**

  ```bash
  pnpm exec vitest run src/systems/stats.test.ts
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add src/systems/stats.ts src/systems/stats.test.ts
  git commit -m "feat(stats): all-time roulette aggregations (ballsSpun, distribution, parity)"
  ```

### Task B.2 — Build `AdminRoulettePage` + chart wrapper

**Files:**

- Create: `src/pages/admin/AdminRoulettePage.tsx`
- Create: `src/pages/admin/AdminRoulettePage.test.tsx`
- Create: `src/components/charts/PocketDistributionBar.tsx`
- Create: `src/components/charts/PocketDistributionBar.test.tsx`

- [ ] **Step 1: Create the chart wrapper.**

  Mirror an existing wrapper from `src/components/charts/`. Render `<BarChart>` with 37 bars (one per `RouletteDistributionPoint`). Use `<Cell>` to colour each bar by pocket colour. Wrap in `<ResponsiveContainer>`.

- [ ] **Step 2: Create the page.**

  Layout:
  - **Top row**: 4 `StatCard`s — `Balls Spun`, `House Net Chips` (tone red if positive / green if negative; mirror lottery's profit card), `Red %`, `Black %`.
  - **Distribution panel**: `<PocketDistributionBar data={distribution} />`.
  - **Parity panel**: 6 mini-cards or a small bar chart for Red / Black / Odd / Even / Low / High.
  - **Dozens + Columns**: two small bar charts (3 bars each).
  - **(Optional) Recent draws table**: last 20 rounds with timestamp + number + colour. Defer if time-pressed; the spec marks this optional.

  Wire `useLiveQuery` from `dexie-react-hooks` for both `getRouletteAllTimeStats()` + `getRouletteNumberDistribution()` (typed promise return per the Phase 9 pattern in the status snapshot).

- [ ] **Step 3: Test.**

  Seed fake rows; render the page; assert each StatCard text + chart presence.

- [ ] **Step 4: Commit.**

  ```bash
  git add src/pages/admin/AdminRoulettePage.tsx src/pages/admin/AdminRoulettePage.test.tsx src/components/charts/PocketDistributionBar.tsx src/components/charts/PocketDistributionBar.test.tsx
  git commit -m "feat(admin): all-time roulette analytics page (stat cards + distribution chart)"
  ```

### Task B.3 — Wire router + sidebar

**Files:**

- Modify: `src/router.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx` + test

- [ ] **Step 1: Add lazy route.**

  In `src/router.tsx`, near the other admin lazies:

  ```ts
  const AdminRoulettePage = lazy(() => import('@/pages/admin/AdminRoulettePage'));
  ```

  Add the route under the admin layout:

  ```ts
  { path: '/admin/roulette', element: <AdminRoulettePage /> },
  ```

- [ ] **Step 2: Add sidebar entry.**

  In `AdminSidebar.tsx`, add a new nav item: label `ROULETTE`, icon `CircleDot` from `lucide-react`, path `/admin/roulette`. Update tests.

- [ ] **Step 3: Run targeted tests.**

  ```bash
  pnpm exec vitest run src/components/admin/AdminSidebar.test.tsx
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add src/router.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminSidebar.test.tsx
  git commit -m "feat(admin): /admin/roulette route + sidebar nav entry"
  ```

### Task B.4 — Full DoD + open PR B

- [ ] **Step 1: Run the full DoD.**

  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
  ```

- [ ] **Step 2: Open PR.**

  ```bash
  git push -u origin phase-15-6-pr-b
  gh pr create --title "phase-15(#6) PR B: admin all-time roulette analytics" --body "$(...)"
  ```

- [ ] **Step 3: Report.** Do NOT merge.

---

## Self-review

**Spec coverage:** Each section of the spec maps to a task here.

- §4.1 (visual rebuild) → A.5 + A.6
- §4.2 (sound) → A.2 (samples) + A.6 (wiring)
- §4.3 (animation polish) → A.5 (chip stack) + A.6 (timer ring)
- §4.4 (ball centre) → A.3 + ADR-0031 in A.1
- §4.5 (auto-spin timer) → A.4 + ADR-0046 in A.1
- §4.6 (unlimited positions) → A.2 (config) + A.4 (machine) + ADR-0030 in A.1
- §4.7 (rules) → A.7
- §4.8 (scope guardrails) → applied via PR A's allowlist
- §5.1–5.5 (admin) → PR B tasks B.1–B.3

**Placeholder scan:** None — every code block above is complete.

**Type consistency:** Verified — `RouletteAllTimeStats`, `RouletteDistributionPoint`, `RouletteRoundDetails`, `Context`, `MachineEvent`, `MachineInput` referenced consistently.

**Risks already flagged** (in spec §8 — carry forward): XState `after` pause/resume nuance (Task A.4 step 2); sound-sample regeneration commit (A.2); chip-button factor-out optional (A.5); admin lazy-route file disable header (B.3).

---
