# Phase 15 sub-project #11 — Plinko upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 15 #11 — full polish + admin page + critical animation/geometry rebuild (triangular peg pyramid, ball trajectory traces actual RNG path, buckets sit at pyramid base) + bigger board (26 rows / 27 bins, fills ~70-80vh) + bet ceiling 1M/ball + 1000-ball auto cap.

**Architecture:** Two PRs.

- **PR A — game-side rebuild**: MASQUER · Plinko shell + brand-token pass + triangular peg pyramid + bucket alignment + peg-centred ball trajectory + ROW_COUNT 20→26 + MULTIPLIER_CURVES retune + bet ceiling 1M + sound + edge-bin celebration + manual-drop cooldown.
- **PR B — admin analytics**: `/admin/plinko` with 4 StatCards + 27-bin distribution chart + per-risk panel + multiplier curve viewer (read-only) + recent drops table. New aggregations in `src/systems/stats.ts`. Read-only over existing `rounds` table; no schema migration.

PR A is the big one — geometry rebuild is genuine engineering work, not just visual polish.

**Tech Stack:** TypeScript 5 strict + exactOptionalPropertyTypes · React 18 · Vite 5 · Tailwind 3 · XState v5 + @xstate/react · Framer Motion 12 + `useEffectiveReducedMotion` · Dexie 4 (no bump) · Recharts (lazy admin chunk per ADR-0039) · Vitest 2 + RTL + fake-indexeddb · pnpm 9.12.

**Spec:** `docs/superpowers/specs/2026-05-27-phase-15-11-plinko-design.md` (will merge shortly).

---

## Shared rules

1. **Logic structure preserved.** `dropBall(rng)` + `payoutFor(risk, bin, stake)` keep their shape. CHANGED: `ROW_COUNT` 20→26, `BIN_COUNT` 21→27, `MULTIPLIER_CURVES` retuned (each risk a 27-element array; RTP ∈ [0.95, 0.98]).
2. **Games sandbox** preserved. No `@/db` / `@/store` imports from `src/games/plinko/**`.
3. **One `rounds` row per ball** (ADR-0016).
4. **Integer money. No `Math.random()`.** Existing ESLint enforces.
5. **Spec-first.** BUILD_GUIDE §8.5 amendment first if needed (bet ceiling note).
6. **No CLAUDE.md edits.**
7. **Commit subject ≤ 100 chars** (`feedback-localgamble-commit-subject-limit`). `admin` scope (NOT `admin-plinko`).
8. **No `--no-verify`. No `--amend`.**
9. **DoD per PR:**
   ```
   pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .
   ```
10. **TS strict + exactOptionalPropertyTypes.**
11. **Tokens-only Tailwind** in rebuilt files.

---

## File structure

### PR A — game-side

| File                                         | Action  | Responsibility                                                                                                                                                                         |
| -------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/games/plinko/config.ts` (or `logic.ts`) | Modify  | `ROW_COUNT = 26`, `BIN_COUNT = 27`, `MAX_BET = 1_000_000`, `MAX_AUTO_BALLS = 1_000`.                                                                                                   |
| `src/games/plinko/logic.ts`                  | Modify  | Retune `MULTIPLIER_CURVES` (4 risks × 27 bins each). `dropBall`/`payoutFor` shape stable.                                                                                              |
| `src/games/plinko/logic.test.ts`             | Modify  | New 27-bin RTP test asserting each risk lands in [0.95, 0.98]. Update bin-specific tests.                                                                                              |
| `src/games/plinko/geometry.ts`               | NEW     | Pure geometry helpers — `pegPosition(row, col)`, `binCentreX(bin)`, peg-pyramid layout math.                                                                                           |
| `src/games/plinko/geometry.test.ts`          | NEW     | Pin peg positions + bin centres; assert ball trajectory's final x equals bin centre.                                                                                                   |
| `src/games/plinko/Board.tsx`                 | Rewrite | Render triangular peg pyramid (26 rows × R+1 pegs each) using `geometry.ts`. ~70-80vh tall.                                                                                            |
| `src/games/plinko/Board.test.tsx`            | Modify  | Update assertions for new peg count + positioning.                                                                                                                                     |
| `src/games/plinko/FallingBall.tsx`           | Rewrite | Build keyframes from path using `geometry.ts` so trajectory traces actual RNG path. Peg-squash animation per row. Trail sparkles on high-multiplier drops.                             |
| `src/games/plinko/FallingBall.test.tsx`      | Modify  | Pin trajectory keyframes for a known path; assert final-x equals binCentreX(bin).                                                                                                      |
| `src/games/plinko/BinRow.tsx`                | Rewrite | 27 buckets aligned with bottom peg row gaps. Brand-token chrome. Edge bins styled distinct.                                                                                            |
| `src/games/plinko/BinRow.test.tsx`           | Modify  | 27-bucket count + positioning assertions.                                                                                                                                              |
| `src/games/plinko/PlinkoPage.tsx`            | Rewrite | MASQUER · Plinko title + LobbyButton + OddsInfoBox + RULES button. Manual cooldown. Sound wiring (chip.place / ball.drop / peg.ping with debounce / tier stingers + edge celebration). |
| `src/games/plinko/PlinkoPage.test.tsx`       | Modify  | New shell + sound mock + 1000-ball cap + 1M bet assertions.                                                                                                                            |
| `src/games/plinko/SetupPanel.tsx`            | Modify  | Brand tokens. New bet ceiling display (1,000,000).                                                                                                                                     |
| `src/games/plinko/SetupPanel.test.tsx`       | Modify  | Update.                                                                                                                                                                                |
| `src/games/plinko/AutoDropControls.tsx`      | Modify  | Brand tokens. Auto ball count cap raised to 1,000.                                                                                                                                     |
| `src/games/plinko/AutoDropControls.test.tsx` | Modify  | Update for 1,000-ball cap.                                                                                                                                                             |
| `src/games/plinko/HistoryStrip.tsx`          | Modify  | Brand tokens.                                                                                                                                                                          |
| `src/games/plinko/EndScreen.tsx`             | Modify  | Brand tokens. Scrollable body. Edge-bin signature celebration.                                                                                                                         |
| `src/games/plinko/EndScreen.test.tsx`        | Modify  | Update.                                                                                                                                                                                |
| `src/games/plinko/PlinkoRules.tsx`           | NEW     | Rules content rendered in shared `RulesModal`.                                                                                                                                         |
| `src/games/plinko/machine.ts`                | Modify  | Only config-constant references (no semantic changes). Auto cap 100 → 1000.                                                                                                            |
| `src/games/plinko/machine.test.ts`           | Modify  | Update if it pins auto cap or bet ceiling.                                                                                                                                             |
| `src/systems/sound/{engine,ids}.ts`          | Modify  | Register `peg.ping` sample key.                                                                                                                                                        |
| `scripts/gen-audio.mjs`                      | Modify  | Add `peg.ping` generation (short ~40 ms ~600 Hz click).                                                                                                                                |
| `src/assets/audio/peg-ping.wav`              | Create  | Generated.                                                                                                                                                                             |
| `BUILD_GUIDE.md` §8.5                        | Modify  | New ceilings + 27-bin note.                                                                                                                                                            |
| `docs/adr/0047-plinko-peg-geometry.md`       | NEW     | Geometry contract + row-count change + RTP retune rationale.                                                                                                                           |

### PR B — admin

| File                                                      | Action | Responsibility                                                                                       |
| --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `src/systems/stats.ts`                                    | Modify | Add `getPlinkoAllTimeStats`, `getPlinkoBinDistribution`, `getPlinkoRiskDistribution`. Additive only. |
| `src/systems/stats.test.ts`                               | Modify | Pin against ~20-row plinko fixture covering all 4 risks × mixed bins.                                |
| `src/pages/admin/AdminPlinkoPage.tsx`                     | NEW    | 4 StatCards + hero chart + per-risk panel + curve viewer + recent table.                             |
| `src/pages/admin/AdminPlinkoPage.test.tsx`                | NEW    | Render with fake rounds; assert each card text + chart + table.                                      |
| `src/components/charts/PlinkoBinDistributionBar.tsx`      | NEW    | 27-bar Recharts wrapper, `ChartTooltipShell`.                                                        |
| `src/components/charts/PlinkoBinDistributionBar.test.tsx` | NEW    | Smoke render.                                                                                        |
| `src/pages/admin/AdminLayout.tsx` + test                  | Modify | Add `Plinko` nav entry; preserve existing entries.                                                   |
| `src/router.tsx`                                          | Modify | Add lazy route `/admin/plinko`.                                                                      |

---

## PR A — game-side rebuild

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-11-pr-a`

### Task A.0 — Read context (15 min)

- [ ] **Step 1: Read the spec** end-to-end. Internalise §4.3 geometry rebuild + §4.4 trajectory + §4.3.1 RTP retune.
- [ ] **Step 2: Read existing `src/games/plinko/`** files — note the current uniform grid + FallingBall percent math + how `inFlightBalls` feeds the page.
- [ ] **Step 3: Read `src/games/lottery/HeroSection.tsx`** for the dramatic ball-reveal motion variant (lottery ships ball-by-ball reveal; mirror the squash pattern for peg impacts).
- [ ] **Step 4: Read `docs/PHASE_15_PATTERNS.md`** for the per-game polish recipe + sound cadence guardrails.

### Task A.1 — Geometry helpers + RTP retune (build the math first)

**Files:** `src/games/plinko/geometry.ts` (NEW) + test, `src/games/plinko/logic.ts` (constants + curves) + test, `src/games/plinko/config.ts` if config split exists.

This is the load-bearing piece. Build + test the math BEFORE touching any UI.

- [ ] **Step 1: Write `geometry.ts`** with pure functions:

  ```ts
  export const ROW_COUNT = 26;
  export const BIN_COUNT = 27; // ROW_COUNT + 1

  /** Peg position (x%, y%) for row R, column C (0 ≤ C ≤ R).
   *  Row 0 has 1 peg at x=50%; row R has R+1 pegs spaced uniformly.
   *  Y is linear from 0 (apex) to 100% (bottom of peg field). */
  export function pegPosition(row: number, col: number): { x: number; y: number } {
    if (row < 0 || row >= ROW_COUNT) throw new RangeError(`row ${row} out of range`);
    if (col < 0 || col > row) throw new RangeError(`col ${col} out of range for row ${row}`);
    // Pyramid horizontal range: row R occupies (R / (ROW_COUNT - 1)) × board-width centred.
    // Each row uses 100% × (R + 1) / ROW_COUNT of horizontal space, centred.
    const rowWidth = ((row + 1) / ROW_COUNT) * 100; // % of board
    const startX = 50 - rowWidth / 2;
    const stepX = row === 0 ? 0 : rowWidth / row;
    const x = startX + col * stepX;
    const y = (row / (ROW_COUNT - 1)) * 100;
    return { x, y };
  }

  /** Bin centre x% — bin B sits in the gap between peg(ROW_COUNT-1, B-1) and peg(ROW_COUNT-1, B),
   *  with edge gaps handled (bin 0 = left of leftmost peg; bin BIN_COUNT-1 = right of rightmost peg). */
  export function binCentreX(bin: number): number {
    if (bin < 0 || bin >= BIN_COUNT) throw new RangeError(`bin ${bin} out of range`);
    const lastRow = ROW_COUNT - 1;
    const rowWidth = ((lastRow + 1) / ROW_COUNT) * 100;
    const startX = 50 - rowWidth / 2;
    const stepX = rowWidth / lastRow;
    // Bin B's centre is at the gap between peg(lastRow, B-1) and peg(lastRow, B).
    // Bin 0 centre = startX - stepX/2; Bin BIN_COUNT-1 centre = startX + lastRow*stepX + stepX/2.
    return startX + (bin - 0.5) * stepX;
  }
  ```

- [ ] **Step 2: Test geometry.**
  - `pegPosition(0, 0)` returns `{x: 50, y: 0}`.
  - `pegPosition(ROW_COUNT-1, 0)` and `pegPosition(ROW_COUNT-1, ROW_COUNT-1)` are symmetric around 50%.
  - All 27 `binCentreX(bin)` values are monotonically increasing, span the bucket range.
  - For all paths, the final-row column (= count of R) maps to a peg whose x equals `binCentreX(count of R)` — this is the load-bearing invariant.

- [ ] **Step 3: Bump constants in `config.ts` / `logic.ts`**:

  ```ts
  export const MAX_BET = 1_000_000;
  export const MAX_AUTO_BALLS = 1_000;
  ```

  Re-export `ROW_COUNT`, `BIN_COUNT` from `geometry.ts` (or define in `config.ts` and import into `geometry.ts` — implementer picks).

- [ ] **Step 4: Retune `MULTIPLIER_CURVES`** in `logic.ts`. Each risk is a 27-element symmetric array, monotonically non-increasing from edge to centre. Target RTP per risk:
  - Safe: ~0.97-0.98 (gentle V; edge ~40-50; centre ~0.92-0.96)
  - Low: ~0.96-0.97 (moderate V; edge ~600-800; centre ~0.85-0.90)
  - Medium: ~0.95-0.96 (heavy V; edge ~5,000-8,000; centre ~0.75-0.80)
  - High: ~0.95-0.97 (steepest V; edge ~50,000-80,000; centre ~0.70-0.75)

  **Iterative tuning loop**:
  1. Pick edge + shoulder + centre values.
  2. Compute `rtp = Σ binomial(26, k) / 2²⁶ × multiplier[k]` for k = 0..26.
  3. Tweak interior values to land RTP in [0.95, 0.98].
  4. Verify symmetry: `multiplier[k] === multiplier[26 - k]`.
  5. Verify monotonic: `multiplier[k] ≥ multiplier[k+1]` for k < 13.

  Reference Binomial(26, 0.5) probabilities:

  ```
  P(k=0)=1.49e-08, P(k=1)=3.87e-07, P(k=2)=4.84e-06, P(k=3)=3.87e-05,
  P(k=4)=2.42e-04, P(k=5)=1.16e-03, P(k=6)=4.45e-03, P(k=7)=1.40e-02,
  P(k=8)=3.67e-02, P(k=9)=8.16e-02, P(k=10)=1.55e-01, P(k=11)=2.40e-01,
  P(k=12)=3.20e-01, P(k=13)=3.55e-01,
  (P symmetric: P(k=14..26) = P(26-k))
  ```

  Implementer should write a small Node script (or `vitest.bench` helper) to compute RTP given a curve, iterate on the values, and check in the final curves.

- [ ] **Step 5: Update `logic.test.ts`**:
  - Update path-length test: `dropBall(...).path.length === 26`.
  - Update bin-range test: `0 ≤ bin ≤ 26`.
  - Update RTP test: for each risk, computed RTP under `Binomial(26, 0.5)` is in [0.95, 0.98].
  - Update structural tests (monotonic curve, symmetry) for the new 27-element arrays.
  - Drop or update specific-bin-payout tests that pinned old multiplier values.

- [ ] **Step 6: Run.**

  ```bash
  pnpm exec vitest run src/games/plinko/logic.test.ts src/games/plinko/geometry.test.ts
  ```

- [ ] **Step 7: Commit.**
  ```bash
  git add src/games/plinko/{geometry.ts,geometry.test.ts,logic.ts,logic.test.ts,config.ts}
  git commit -m "feat(plinko): geometry helpers + ROW_COUNT 26 + MULTIPLIER_CURVES retune"
  ```

### Task A.2 — ADR-0047 + BUILD_GUIDE amendment (spec-first)

**Files:** `docs/adr/0047-plinko-peg-geometry.md` (NEW), `BUILD_GUIDE.md` §8.5.

- [ ] **Step 1: Write ADR-0047.** Cover:
  - Context: Phase 15 #11 polish, user direction for triangular pyramid + bigger board.
  - Decision: triangular peg layout (row R has R+1 pegs); ball trajectory traces RNG path; row count 20→26 with `MULTIPLIER_CURVES` retuned to RTP ∈ [0.95, 0.98] at Binomial(26, 0.5).
  - Consequences: edge events ~64× rarer than before; high-risk edges pay ~50K-80K; per-ball ceiling 1M; auto-cap 1000.
- [ ] **Step 2: Amend BUILD_GUIDE §8.5** — new ROW_COUNT / BIN_COUNT, new edge multipliers, new bet ceiling. Reference ADR-0047.
- [ ] **Step 3: Markdownlint + commit.**
  ```bash
  npx markdownlint-cli2 docs/adr/0047-* BUILD_GUIDE.md
  git add docs/adr/0047-plinko-peg-geometry.md BUILD_GUIDE.md
  git commit -m "docs(plinko): ADR-0047 peg geometry + RTP retune; BUILD_GUIDE §8.5 amend"
  ```

### Task A.3 — Sound asset

**Files:** `scripts/gen-audio.mjs`, `src/systems/sound/{engine,ids}.ts`, `src/assets/audio/peg-ping.wav`.

- [ ] **Step 1: Add `peg.ping`** generator to `scripts/gen-audio.mjs` — ~40 ms sine wave at ~600 Hz with sharp attack (5 ms) + exponential decay. Should sound like a peg ping (think pachinko / pinball).
- [ ] **Step 2: Register key** in `src/systems/sound/ids.ts` (or wherever sample keys live).
- [ ] **Step 3: Generate + commit the WAV.**
  ```bash
  node scripts/gen-audio.mjs
  git add scripts/gen-audio.mjs src/systems/sound/ src/assets/audio/peg-ping.wav
  git commit -m "feat(plinko): peg.ping sound sample + engine registration"
  ```

### Task A.4 — Board (triangular peg pyramid)

**Files:** `src/games/plinko/Board.tsx` + test.

- [ ] **Step 1: Rewrite Board** to render 26 rows × (R+1) pegs each using `pegPosition(row, col)`. Tailwind: `h-[78vh]` on the board wrapper; width derived from the geometry constraint (`w-[55vh]` for an equilateral-triangle look, or `aspect-[2/3]` — implementer tunes).
- [ ] **Step 2: Pegs as brass discs** — small `<div>` with `bg-brass` + radial gradient + tiny shadow. ~10-12 px diameter. Position via `absolute` + `left/top` percentages from `pegPosition`.
- [ ] **Step 3: Peg ID** — each peg has `data-row={row}` `data-col={col}` for testing.
- [ ] **Step 4: Frame** — wrap the pyramid in a brass-bordered velvet panel with a subtle felt-table backdrop.
- [ ] **Step 5: Update tests** — assert 26 rows present, row R has R+1 pegs, all pegs positioned via geometry helper.
- [ ] **Step 6: Commit.**

### Task A.5 — FallingBall (trajectory traces actual path)

**Files:** `src/games/plinko/FallingBall.tsx` + test.

- [ ] **Step 1: Rewrite trajectory.** Replace the ±2% percent math with peg-centred keyframes:
  ```ts
  // For each row R, compute the ball's column C = count of R-choices in path[0..R-1].
  // The ball arrives at peg (R, C); then bounces L/R based on path[R].
  const xKeyframes: number[] = [pegPosition(0, 0).x]; // start at apex
  const yKeyframes: number[] = [pegPosition(0, 0).y];
  let col = 0;
  for (let row = 1; row < ROW_COUNT; row++) {
    // path[row - 1] determined where ball came from
    if (path[row - 1] === 'R') col += 1;
    const pos = pegPosition(row, col);
    xKeyframes.push(pos.x);
    yKeyframes.push(pos.y);
  }
  // After last row, ball drops into bin
  // path[ROW_COUNT - 1] determines final L/R
  if (path[ROW_COUNT - 1] === 'R') col += 1;
  xKeyframes.push(binCentreX(col));
  yKeyframes.push(100); // bottom of board (bucket level)
  ```
- [ ] **Step 2: Per-row squash animation.** Each row, the ball briefly scales vertically (1 → 0.85 → 1) on impact. Use Framer Motion variants per keyframe, or `scaleY` keyframes interpolated with `times`.
- [ ] **Step 3: Trail sparkles** (optional, if `payout / stake ≥ 100`). 3-4 fading gold dots behind the ball during last 3 rows. Use a separate `<motion.div>` set spawned at each peg in last 3 rows.
- [ ] **Step 4: `onLanded` callback** — fires when animation completes (or instantly under reduced-motion).
- [ ] **Step 5: Reduced-motion path** — skip animation entirely, jump to bin position, fire `onLanded` immediately.
- [ ] **Step 6: Tests** — for a known path (e.g. all-R), assert keyframes follow the right diagonal; final-x equals `binCentreX(BIN_COUNT - 1)`. Repeat for all-L. Repeat for a balanced path landing at bin 13.
- [ ] **Step 7: Commit.**

### Task A.6 — BinRow (27 buckets aligned with bottom pegs)

**Files:** `src/games/plinko/BinRow.tsx` + test.

- [ ] **Step 1: Rewrite BinRow** to render 27 buckets, each centred on `binCentreX(bin)`. Width per bucket = `100 / BIN_COUNT` × board-width. No vertical gap between BinRow and Board's bottom peg row.
- [ ] **Step 2: Bin styling** — each bucket shows its multiplier in `font-mono tabular-nums text-gold-bright`. Edge bins (0 + 26) get `bg-jewel-magenta/30` + brass border (signature jackpot tier). Middle bins (10-16) get `bg-felt-table-deep/60` (loss territory). Other bins gradient between.
- [ ] **Step 3: Per-bin landing pulse** — when a ball lands in bin B, that bucket pulses (`scale: [1, 1.1, 1]` + brief gold glow). Implementer reads `landedBin` prop or similar from the page.
- [ ] **Step 4: Update tests** — 27 buckets render, correct multipliers per risk shown, edge styling applied.
- [ ] **Step 5: Commit.**

### Task A.7 — PlinkoPage rebuild

**Files:** `src/games/plinko/PlinkoPage.tsx` + test, `src/games/plinko/PlinkoRules.tsx` (NEW).

- [ ] **Step 1: Title + manual LobbyButton/OddsInfoBox/RulesModal retrofit.** Per `docs/PHASE_15_PATTERNS.md` §1.1-1.3:
  - `MASQUER · Plinko` title + risk subtitle when in-game.
  - `<LobbyButton />` absolute top-left.
  - `<OddsInfoBox>Safe 16× edge · Low 110× · Medium 420× · High 5000× (centre <1×)</OddsInfoBox>` absolute top-right.
    - Update the OddsInfoBox content with NEW edge values from the retuned curves (e.g. `Safe ~50× · Low ~600× · Medium ~6K× · High ~50K× (centre <1×)`).
  - RULES button bottom-left → new `PlinkoRules` content (object · risk levels · multiplier table · manual/auto · bet limits · RTP).
- [ ] **Step 2: Brand-token pass** on remaining surfaces.
- [ ] **Step 3: Sound wiring** (`useSound`):
  - `chip.place` on bet commit.
  - `ball.drop` on ball spawn.
  - `peg.ping` per peg hit. **Debounce: max 1 per 30 ms** across all in-flight balls. Easiest: a ref-tracked `lastPlayedAt` timestamp; each peg hit checks `now - lastPlayedAt >= 30ms` before calling `play('peg.ping')`. Reduced-motion: skip per-peg, fire one batched sound per ball landing.
  - `win.small/.medium/.jackpot` on bin landing — gate on `payout / stake`: <2× = small, 2-20× = medium, ≥20× = jackpot.
  - `loss` on bin landing if `payout < stake` (debounced in auto mode).
- [ ] **Step 4: Edge-bin celebration** — when ball lands in bin 0 or 26 at High risk:
  - Coin shower (~20 chip particles drift down for ~2 s) via `<motion.div>` over the board.
  - Screen shake — board container `x: [0, -2, 2, -1, 1, 0]` for 400 ms.
  - Tier-3 banner with `bg-jewel-magenta` border + `win.jackpot` sound.
  - Reduced-motion → skip shake + shower; show banner + sound only.
  - Debounce: max one celebration per ~1 s (auto mode can stack).
- [ ] **Step 5: Manual-drop cooldown** — 150 ms gate on the DROP button. Disabled state + faint fading ring.
- [ ] **Step 6: Tests** — title + shell + sound mocks + 1M bet ceiling + 1000-ball auto cap + manual cooldown.
- [ ] **Step 7: Commit.**

### Task A.8 — Remaining UI surfaces

**Files:** `SetupPanel.tsx` (+ test) — bet ceiling 1M, `AutoDropControls.tsx` (+ test) — auto cap 1000, `HistoryStrip.tsx`, `EndScreen.tsx` (+ test), `machine.ts` (+ test) — config constants.

- [ ] **Step 1: SetupPanel** — bet input shows new max 1,000,000. Brand tokens. Update test.
- [ ] **Step 2: AutoDropControls** — ball-count input/slider shows new max 1,000. Brand tokens. Update test.
- [ ] **Step 3: HistoryStrip** — brand tokens. (Still shows rolling last 50.)
- [ ] **Step 4: EndScreen** — brand tokens. `max-h-[60vh] overflow-y-auto` on body. Edge-bin landing styling.
- [ ] **Step 5: Machine** — update config-constant references (`MAX_BET` / `MAX_AUTO_BALLS`). No semantic changes.
- [ ] **Step 6: Commit batched.**

### Task A.9 — Full DoD + open PR

- [ ] **Step 1: Full DoD.**
- [ ] **Step 2: Open PR** titled `phase-15(#11) PR A: plinko geometry + bigger pyramid + 1M bet + sound` (~76 chars).
- [ ] **Step 3: Report.** Do NOT merge.

---

## PR B — admin analytics

### Branch

`git checkout main && git pull origin main && git checkout -b phase-15-11-pr-b`

### Task B.0 — Read context

- [ ] Read `src/pages/admin/AdminRoulettePage.tsx` + `AdminSlotsPage.tsx` for the established admin-stats layout.

### Task B.1 — Aggregations in `src/systems/stats.ts`

- [ ] **Step 1: Add aggregations** (additive only — do NOT modify existing):

  ```ts
  type PlinkoRisk = 'safe' | 'low' | 'medium' | 'high';

  interface PersistedPlinkoDetails {
    readonly risk: PlinkoRisk;
    readonly bin: number; // 0..26
    readonly multiplier: number;
  }

  export interface PlinkoAllTimeStats {
    ballsDropped: number;
    totalWagered: number;
    totalPaid: number;
    netHouseChips: number;
    netPlayerChips: number;
    actualRtp: number | null;
    perRisk: Record<
      PlinkoRisk,
      {
        drops: number;
        wagered: number;
        paid: number;
        rtp: number | null;
      }
    >;
    jackpotHits: number; // bin 0 or 26 at high risk
    edgeBinHits: number; // bin 0 or 26 at any risk
    centreBinHits: number; // bin 13 (worst payout)
  }

  export interface PlinkoBinDistribution {
    bin: number;
    count: number;
  }
  export interface PlinkoRiskDistribution {
    risk: PlinkoRisk;
    count: number;
  }

  export async function getPlinkoAllTimeStats(): Promise<PlinkoAllTimeStats>;
  export async function getPlinkoBinDistribution(): Promise<PlinkoBinDistribution[]>;
  export async function getPlinkoRiskDistribution(): Promise<PlinkoRiskDistribution[]>;
  ```

- [ ] **Step 2: Tests** — seed ~20 fake plinko rounds covering all 4 risks × mixed bins. Pin each aggregation.
- [ ] **Step 3: Commit.**

### Task B.2 — Chart wrapper

**Files:** `src/components/charts/PlinkoBinDistributionBar.tsx` + test.

- [ ] **Step 1: 27-bar Recharts wrapper.** Mirror `PocketDistributionBar` / `SlotsCombinationBar`. Edge bins coloured `jewel-magenta`; centre `gold` dim; gradient between. `ChartTooltipShell` for custom tooltip.
- [ ] **Step 2: Smoke test.**
- [ ] **Step 3: Commit.**

### Task B.3 — AdminPlinkoPage

**Files:** `src/pages/admin/AdminPlinkoPage.tsx` + test.

- [ ] **Step 1: Layout** per spec §5.3:
  - 4 StatCards row: Balls Dropped · House Net Chips (red if positive / green if negative) · Actual RTP · Jackpot Hits.
  - Hero chart: `<PlinkoBinDistributionBar />`.
  - Per-risk panel: 4 mini-bars (Safe / Low / Medium / High) showing drops + per-risk RTP.
  - Multiplier curve viewer: 4 sparklines, one per risk, showing the configured `MULTIPLIER_CURVES`. Read-only.
  - Recent drops table (last 20): timestamp · risk · bin · multiplier · stake · payout · house P/L. Ordered by `playedAt` desc via load-all + sort-in-memory + slice-20 (#250 pattern).
- [ ] **Step 2: `useLiveQuery`** with inferred-Promise pattern (Phase 9 trap; no explicit generic).
- [ ] **Step 3: Tests** — seed fake rounds; assert each card text + chart presence + table rows.
- [ ] **Step 4: Commit.**

### Task B.4 — Router + sidebar

**Files:** `src/router.tsx`, `src/pages/admin/AdminLayout.tsx` + test.

- [ ] **Step 1: Lazy route** — `const AdminPlinkoPage = lazy(() => import('@/pages/admin/AdminPlinkoPage'));` + route `/admin/plinko`.
- [ ] **Step 2: Nav entry** in `AdminLayout` after `Slots`. Update test.
- [ ] **Step 3: Commit.**

### Task B.5 — DoD + open PR

- [ ] **Step 1: Full DoD.**
- [ ] **Step 2: Open PR** titled `phase-15(#11) PR B: admin all-time plinko analytics` (~52 chars).
- [ ] **Step 3: Report.** Do NOT merge.

---

## Self-review

**Spec coverage:**

- §4.1 title + shell → A.7
- §4.2 brand pass → A.4, A.6, A.7, A.8
- §4.3 geometry rebuild + ROW_COUNT/curves → A.1, A.4
- §4.4 trajectory matches path → A.5
- §4.5 peg-ping sound → A.3, A.7
- §4.6 edge-bin celebration → A.7
- §4.7 ball-trail sparkles → A.5
- §4.8 manual cooldown → A.7
- §4.9 bet limits → A.1 (constants), A.7 (UI), A.8 (panels)
- §4.10 sound table → A.7
- §4.11 scrollable + rules → A.7, A.8
- §5 admin → PR B (B.1-B.5)

**Placeholder scan:** None — every step has code or exact commands.

**Type consistency:** `ROW_COUNT`, `BIN_COUNT`, `PlinkoRisk`, `PersistedPlinkoDetails`, `PlinkoAllTimeStats` referenced consistently.

**Risks from spec §8** carried forward:

- Geometry rebuild is highest-risk piece → A.1 builds + tests math FIRST before any UI (Step 0).
- Peg-ping cadence → A.7 Step 3 has the 30 ms debounce.
- 1M-stake swings → documented in BUILD_GUIDE amendment (A.2 Step 2).
- 1000-ball auto-session performance → implementer verifies during A.8 (visual smoke).
- Edge-bin celebration stacking → A.7 Step 4 debounces to 1 per ~1 s.

---
