# Phase 12 — Plinko Design

**Author:** brainstormed 2026-05-20 with user
**Status:** Spec — pending implementation plan
**Phase:** 12 (NEXT per project roadmap)
**Goal:** Add a modern-casino-style Plinko game — 20-row peg board, 21 bins, four risk levels, manual + auto-drop modes, deterministic seeded path animation.

---

## 1. Context

Phase 11.5 shipped competitive bingo (`v0.11.5-bingo-competitive`). Phase 12 adds the next game: **Plinko**, modeled after Stake's modern casino implementation. Single-player, no AI opponents, no variants — just stake → drop → multiplier → payout.

The game lives in the games sandbox at `src/games/plinko/`. It follows existing conventions: pure `logic.ts` (no React, no I/O), XState v5 machine, wallet bridge via `useGameRound('plinko')`, one `rounds` row per settled ball via `wallet.settleRound`.

---

## 2. Game flavour + board

**Style:** modern casino Plinko (think Stake). Not the TV-show variant. Not the manual-aim hybrid.

**Board:** fixed **20 rows of pegs**, **21 bins** at the bottom. Row N has N+3 pegs (row 0 = 3 pegs, row 19 = 22 pegs). Symmetric isosceles-triangle layout.

**Drop point:** centre-top of the board. No player aim. Path determined entirely by RNG.

**No variants.** No British/American style alternative.

---

## 3. Risk levels + multiplier curves

Player picks one of four risk levels per drop: **Safe / Low / Medium / High**. Same board, same probabilities — only the bin multiplier curves change.

### Probability distribution (fixed)

Each ball makes 20 independent L/R choices. Bin index = count of R-moves. Distribution is `Binomial(20, 0.5)`:

| Bin | Prob       | 1-in       |
| --- | ---------- | ---------- |
| 0   | 0.00000095 | 1,048,576  |
| 1   | 0.0000191  | 52,429     |
| 2   | 0.000181   | 5,514      |
| 3   | 0.00109    | 917        |
| 4   | 0.00462    | 217        |
| 5   | 0.0148     | 68         |
| 6   | 0.0370     | 27         |
| 7   | 0.0739     | 14         |
| 8   | 0.120      | 8.3        |
| 9   | 0.160      | 6.2        |
| 10  | 0.176      | 5.7 (mode) |

(Bins 11–20 mirror bins 9–0.)

### Multiplier curves (RTP target ~97% across all risk levels)

All curves symmetric across the centre (bin 10 is lowest). Edges (0 and 20) are highest. Numbers below are the design target — exact tuning happens in PR A, where the implementer adjusts edge values until each row's `sum(prob[bin] × multiplier[bin])` lands in `[0.965, 0.975]`.

| Bin (0/20)      | Bin (1/19) | Bin (2/18) | Bin (3/17) | Bin (4/16) | Bin (5/15) | Bin (6/14) | Bin (7/13) | Bin (8/12) | Bin (9/11) | Bin (10) |
| --------------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | -------- |
| **Safe** 16x    | 9x         | 4x         | 2x         | 1.4x       | 1.2x       | 1.1x       | 1.0x       | 0.9x       | 0.7x       | 0.5x     |
| **Low** 110x    | 41x        | 10x        | 5x         | 3x         | 1.5x       | 1.0x       | 0.7x       | 0.5x       | 0.4x       | 0.3x     |
| **Medium** 420x | 130x       | 26x        | 10x        | 4x         | 2x         | 1.1x       | 0.5x       | 0.3x       | 0.3x       | 0.2x     |
| **High** 5000x  | 1000x      | 130x       | 26x        | 9x         | 3x         | 1.5x       | 0.5x       | 0.3x       | 0.2x       | 0.2x     |

### Jackpot ceilings (max bet 5000, single ball)

- Safe edge: 5000 × 16 = **80,000** chips
- Low edge: 5000 × 110 = **550,000** chips
- Medium edge: 5000 × 420 = **2,100,000** chips
- High edge: 5000 × 5000 = **25,000,000** chips (≈ 1 hit per 1,048,576 drops)

### Why centre is loss territory

Centre bin (10) returns less than 1× on every risk level — you lose part or most of your bet on the most likely outcome. Edge multipliers (rare) fund the centre's drag, keeping RTP at ~97% across the whole curve. Variance scales with risk; expected return does not.

---

## 4. Logic API

`src/games/plinko/logic.ts` exposes:

```typescript
export type Risk = 'safe' | 'low' | 'medium' | 'high';

export const ROW_COUNT = 20;
export const BIN_COUNT = 21;
export const BET_MIN = 10;
export const BET_MAX = 5000;
export const AUTO_BALLS_MIN = 1;
export const AUTO_BALLS_MAX = 100;
export const AUTO_INTERVAL_MS = { slow: 1000, normal: 500, fast: 250 } as const;
export type AutoIntervalKey = keyof typeof AUTO_INTERVAL_MS;

export const MULTIPLIER_CURVES: Record<Risk, readonly number[]>; // length 21 each, symmetric

/** Drops one ball through 20 peg rows. Returns the path and the landing bin. */
export function dropBall(rng: () => number): { path: ('L' | 'R')[]; bin: number };

/** Integer payout: floor(stake * MULTIPLIER_CURVES[risk][bin]). */
export function payoutFor(risk: Risk, bin: number, stake: number): number;

/** Inlined mulberry32 + stringSeed pattern (matches bingo + lottery). */
function mulberry32(seed: number): () => number;
function stringSeed(s: string): number;
```

The `logic.ts` file follows the games-sandbox rule: NO imports from `@/db/*` or `@/store/*`. RNG helpers are inlined.

Floor-round on payouts favours the player on remainder, matching ADR-0036.

---

## 5. Setup screen

Visible when machine state is `idle` AND no balls in flight AND history is empty.

```
┌──────────────────────────────────────────────────────────┐
│ 🔻 PLINKO                                Balance: 5,000  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  RISK                                                    │
│  [SAFE]  [LOW]  [MED]  [HIGH]                            │
│                                                          │
│  BET PER BALL                                            │
│  [    50    ]  +10  +100  ×2  MAX                        │
│                                                          │
│  MODE                                                    │
│  [MANUAL]  [AUTO]                                        │
│                                                          │
│  (when AUTO selected)                                    │
│  Balls:    [   10   ]   (1-100)                          │
│  Interval: [SLOW] [NORM] [FAST]                          │
│                                                          │
│  ┌──────────────────────────────┐                        │
│  │   DROP (50)        ← manual  │                        │
│  └──────────────────────────────┘                        │
│         OR                                               │
│  ┌──────────────────────────────┐                        │
│  │ START AUTO (10 × 50 = 500)   │ ← auto                 │
│  └──────────────────────────────┘                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Risk + bet + mode are local React state. Submitting fires `DROP_MANUAL` or `START_AUTO` into the machine.

Bet input clamps to [10, 5000]. Helpers: +10, +100, ×2 (caps at 5000), MAX (sets to 5000).

DROP/START AUTO button disabled until wallet hydrated.

When AUTO is selected: Balls input (1–100) + Interval picker. START AUTO label shows total commit (`balls × bet`). Note: stake is NOT pre-debited; each ball pays its own stake on spawn.

---

## 6. Play screen

Layout once a drop is in progress or after the first manual drop:

```
┌──────────────────────────────────────────────────────────┐
│ 🔻 PLINKO — HIGH                         Balance: 12,500 │
├──────────────────────────────────────────────────────────┤
│                                          ┌─ History ──┐  │
│                  ●                       │ 0.2x  loss │  │
│              ·   ·                       │ 1.5x  +50  │  │
│            ·   ·   ·                     │ 0.3x  loss │  │
│           ·   ·   ·   ·                  │ 3x   +200  │  │
│          ·   ·   ·   ·   ·               │ 0.2x  loss │  │
│         (20 rows of pegs)                └────────────┘  │
│        ·   ·   ·   ·   ·   ·                             │
│       · · · · · · · · · · · · ·                          │
│                                                          │
│  [5000x][1000x][130x][26x][9x][3x][1.5x][0.5x][0.3x]...  │
│       (21 bin row, current ball-bin pulses gold)         │
│                                                          │
│  Auto: 23 / 100 balls       [■ STOP AUTO]                │
└──────────────────────────────────────────────────────────┘
```

When auto session ends (any reason), an **EndScreen** component replaces the play surface (mirrors Bingo's pattern) and shows:

- Reason (Completed / Stopped / Insufficient chips)
- Balls played, total stake, total payout, net (green/red), biggest single-ball win + bin
- **DROP MORE** (back to setup) + **BACK TO LOBBY** buttons

### Coloured-ball visuals

Bin row colours by multiplier tier:

- `>= 100×`: deep red with bright glow
- `>= 5×`: gold
- `>= 1×`: neon-cyan
- `< 1×`: muted gray
- `< 0.5×`: deep red (deeper than 100× — uses border style to disambiguate)

Bin pulses bright gold for ~600ms when a ball lands in it.

Ball: 10px radial-gradient (white → magenta). Visible against dark felt and gold pegs.

---

## 7. State machine

XState v5. Simpler than Bingo — no opponents, no claim race.

### Context

```typescript
type Mode = 'manual' | 'auto';

interface FallingBallState {
  ballId: string;
  betHandleId: string;
  bet: number;
  path: ('L' | 'R')[];
  bin: number;
  multiplier: number;
  payout: number;
  spawnedAt: number;
}

interface HistoryEntry {
  ballId: string;
  risk: Risk;
  bin: number;
  multiplier: number;
  bet: number;
  payout: number;
}

interface PlinkoContext {
  risk: Risk;
  bet: number;
  mode: Mode;
  autoBallsRequested: number;
  autoBallsSpawned: number;
  autoIntervalMs: number;
  sessionId: string;
  inFlightBalls: FallingBallState[];
  history: HistoryEntry[]; // rolling last 50, last 5 shown
  autoStopReason: 'completed' | 'user-stop' | 'insufficient-chips' | null;
}
```

### Events

```typescript
type PlinkoEvent =
  | {
      type: 'DROP_MANUAL';
      bet: number;
      risk: Risk;
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
      sessionId: string;
    }
  | {
      type: 'START_AUTO';
      bet: number;
      risk: Risk;
      ballsRequested: number;
      intervalMs: number;
      sessionId: string;
    }
  | {
      type: 'AUTO_TICK';
      betHandleId: string;
      path: ('L' | 'R')[];
      bin: number;
      multiplier: number;
      payout: number;
      ballId: string;
    }
  | { type: 'AUTO_STOP'; reason: 'user-stop' | 'insufficient-chips' | 'completed' }
  | { type: 'BALL_LANDED'; ballId: string }
  | { type: 'RESET' };
```

Event payloads are rich: PlinkoPage (the wallet bridge) does all async work (`placeBet`, RNG path, multiplier lookup, `payoutFor`) and sends a fully-resolved event into the machine. The machine is sync, deterministic, and easily testable.

### State graph

```
idle
  ├─ DROP_MANUAL    → idle (records in-flight ball + sets sessionId for this single drop)
  ├─ START_AUTO     → playing-auto
  └─ BALL_LANDED    → idle (cleanup + add to history; emits no transition)

playing-auto
  ├─ entry: 'startAutoSession'
  ├─ AUTO_TICK      → playing-auto (spawn ball, increment counters)
  ├─ BALL_LANDED    → playing-auto (cleanup that ball + add history)
                       | if autoBallsSpawned === autoBallsRequested
                         AND inFlightBalls is empty → idle
                            with autoStopReason: 'completed'
                       | else stay
  ├─ AUTO_STOP      → playing-auto-stopping (records reason)
  └─ DROP_MANUAL    → ignored (UI blocks; defensive)

playing-auto-stopping
  ├─ BALL_LANDED    → playing-auto-stopping
                       | if inFlightBalls is empty → idle
                            with autoStopReason already set
                       | else stay
```

**No `settling` / `done` states.** Each ball settles independently via `BALL_LANDED`. The EndScreen renders client-side when state re-enters `idle` from auto (i.e., `autoStopReason != null` AND `inFlightBalls.length === 0`).

### Wallet bridge (in `PlinkoPage`)

Manual drop:

```typescript
async function handleManualDrop() {
  const result = await placeBet(bet, { min: BET_MIN, max: BET_MAX });
  if (!result.ok) return;
  const { path, bin } = dropBall(rng);
  const multiplier = MULTIPLIER_CURVES[risk][bin];
  const payout = payoutFor(risk, bin, bet);
  const ballId = crypto.randomUUID();
  const sessionId = crypto.randomUUID(); // new session per manual click
  send({
    type: 'DROP_MANUAL',
    bet,
    risk,
    betHandleId: result.handle.betId,
    path,
    bin,
    multiplier,
    payout,
    ballId,
    sessionId,
  });
}
```

Auto scheduler (a `useEffect` keyed on `state.matches('playing-auto')`):

```typescript
useEffect(() => {
  if (!snapshot.matches('playing-auto')) return;
  if (snapshot.context.autoBallsSpawned >= snapshot.context.autoBallsRequested) return;

  const tick = async () => {
    if (balance < snapshot.context.bet) {
      send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
      return;
    }
    const result = await placeBet(snapshot.context.bet, { min: BET_MIN, max: BET_MAX });
    if (!result.ok) {
      send({ type: 'AUTO_STOP', reason: 'insufficient-chips' });
      return;
    }
    const { path, bin } = dropBall(rng);
    const multiplier = MULTIPLIER_CURVES[snapshot.context.risk][bin];
    const payout = payoutFor(snapshot.context.risk, bin, snapshot.context.bet);
    const ballId = crypto.randomUUID();
    send({
      type: 'AUTO_TICK',
      betHandleId: result.handle.betId,
      path,
      bin,
      multiplier,
      payout,
      ballId,
    });
  };

  const t = setTimeout(tick, snapshot.context.autoIntervalMs);
  return () => clearTimeout(t);
}, [snapshot, balance]);
```

When a `<FallingBall>` animation finishes, it calls `onLanded(ballId, payout, won, multiplier, bin)` → PlinkoPage does `settleRound(handle, { won, payout, details })` THEN `send({ type: 'BALL_LANDED', ballId })`.

### Cleanup

- Auto scheduler `setTimeout` cleared on `useEffect` cleanup (state transition or unmount).
- In-flight ball animations finish naturally even after unmount (cleanup deferred to component unmount lifecycle of each `<FallingBall>`; though `useGameVisit` will record session end appropriately).

---

## 8. UI components

| File                                         | Status | Purpose                                                        |
| -------------------------------------------- | ------ | -------------------------------------------------------------- |
| `src/games/plinko/PlinkoPage.tsx`            | NEW    | Page shell + wallet bridge + auto scheduler + ball lifecycle   |
| `src/games/plinko/PlinkoPage.test.tsx`       | NEW    | E2E tests                                                      |
| `src/games/plinko/SetupPanel.tsx`            | NEW    | Risk + bet + mode + auto config pickers                        |
| `src/games/plinko/SetupPanel.test.tsx`       | NEW    |                                                                |
| `src/games/plinko/Board.tsx`                 | NEW    | 20-row peg grid + bin row + in-flight `<FallingBall>` overlays |
| `src/games/plinko/Board.test.tsx`            | NEW    |                                                                |
| `src/games/plinko/FallingBall.tsx`           | NEW    | One-ball Framer Motion animation; `onLanded` callback          |
| `src/games/plinko/FallingBall.test.tsx`      | NEW    |                                                                |
| `src/games/plinko/BinRow.tsx`                | NEW    | 21 bins, current multipliers, flash on hit                     |
| `src/games/plinko/BinRow.test.tsx`           | NEW    |                                                                |
| `src/games/plinko/HistoryStrip.tsx`          | NEW    | Rolling last 5 drops as coloured pills                         |
| `src/games/plinko/HistoryStrip.test.tsx`     | NEW    |                                                                |
| `src/games/plinko/AutoDropControls.tsx`      | NEW    | Progress + STOP button during auto                             |
| `src/games/plinko/AutoDropControls.test.tsx` | NEW    |                                                                |
| `src/games/plinko/EndScreen.tsx`             | NEW    | Auto-session summary (replaces play surface)                   |
| `src/games/plinko/EndScreen.test.tsx`        | NEW    |                                                                |
| `src/games/plinko/logic.ts`                  | NEW    | Pure: `dropBall`, `payoutFor`, `MULTIPLIER_CURVES`             |
| `src/games/plinko/logic.test.ts`             | NEW    |                                                                |
| `src/games/plinko/machine.ts`                | NEW    | XState v5 machine                                              |
| `src/games/plinko/machine.test.ts`           | NEW    |                                                                |

### FallingBall animation detail

- Props: `path: ('L'|'R')[]`, `boardGeometry: { rowYs: number[], colXs: number[][] }`, `onLanded: () => void`.
- Renders a `motion.div` positioned absolutely over the Board.
- Framer Motion `animate` sequence: 20 keyframes (one per row), each ~75ms with `easeInOut`. Position at row N = `(rowYs[N], colXs[N][r_count_so_far])` where `r_count_so_far` is the count of 'R' in `path.slice(0, N)`.
- Slight horizontal noise per row (±3px) for organic feel.
- Total drop ~1.5s.
- On final keyframe complete: calls `onLanded()`.
- `useReducedMotion` collapses to instant placement + immediate `onLanded()`.

### Visual style

Felt-deep background. Pegs gold (#d4af37). Bins coloured by tier (red >=100x / gold >=5x / cyan >=1x / gray <1x). Ball white-to-magenta gradient with glow. History pills coloured to match bin.

---

## 9. Persistence

### `Round.game` enum

Extends to include `'plinko'`. One-line change to `src/db/schema.ts`. No Dexie version bump (the enum is TS-level only).

### Rounds row shape

```typescript
{
  game: 'plinko',
  stake: number,           // 10-5000
  payout: number,          // floor(stake * multiplier)
  won: boolean,            // payout > stake (strict; 1.0x = push = !won)
  details: {
    risk: 'safe' | 'low' | 'medium' | 'high',
    bin: number,           // 0-20
    multiplier: number,    // raw curve value, e.g. 0.5, 16, 5000
    sessionId: string,     // UUID grouping all balls of one auto session OR one manual click
  }
}
```

### Settle pattern

One row per ball. Manual click → 1 row. Auto session of 100 balls → 100 rows, all sharing `details.sessionId`.

`wallet.placeBet` + `wallet.settleRound` API unchanged. No new wallet plumbing.

---

## 10. Integration

### Stats

- `Round.game = 'plinko'` enum value added.
- `getUserGameStats('plinko')` works generically (reads stake/payout/won/timestamp only).
- `getLeaderboard({ game: 'plinko', metric })` works generically.
- StatsPerGamePage `GAME_LABELS` gains `plinko: 'Plinko'`.
- LeaderboardPerGamePage `GAME_LABELS` gains `plinko: 'PLINKO'`.
- StatsLeftRail `TABS` + `SLUG` gain `Plinko` / `plinko`.
- StatsPage + LeaderboardPage `TITLES` gain `plinko: 'PLINKO'`.

### Nav

- Sidebar `GAMES` array gains `{ to: '/play/plinko', icon: '🔻', label: 'Plinko' }`.
- Lobby `CabinetCarousel` `CABINETS` array gains `{ to: '/play/plinko', icon: '🔻', label: 'PLINKO', status: 'playable' }`. Alphabetical placement: after Bingo.

### Router

- `/play/plinko` route, lazy-loaded. No query param needed.

---

## 11. Testing

### `logic.test.ts` (~40 tests)

- `dropBall(rng)` — given seeded RNG, returns deterministic `{path, bin}`. Pinned outputs for 5 seeds.
- `dropBall` — invariants: `path.length === 20`, `bin === path.filter(d => d === 'R').length`, `bin in [0, 20]`.
- `dropBall` — over 100,000 seeded runs, observed bin distribution matches `Binomial(20, 0.5)` within ±0.5%. Single deterministic probabilistic test, fully reproducible.
- `payoutFor(risk, bin, stake)` via `it.each`: 4 risks × 21 bins × 3 stakes = 252 cells.
- `payoutFor` — floor-round behaviour: `payoutFor('safe', 10, 1)` = floor(0.5) = 0; `payoutFor('safe', 10, 3)` = floor(1.5) = 1.
- `MULTIPLIER_CURVES` — RTP per risk: `sum(prob[bin] × multiplier[bin]) in [0.965, 0.975]`.
- `MULTIPLIER_CURVES` — symmetric: `curve[i] === curve[20-i]`.
- `MULTIPLIER_CURVES` — monotonic from centre: `curve[10] <= curve[9] <= ... <= curve[0]`.

### `machine.test.ts` (~25 tests)

- Initial state `idle` with empty context.
- `DROP_MANUAL` records ball in `inFlightBalls`, stays `idle`.
- `BALL_LANDED` removes from `inFlightBalls`, appends to `history`, history capped at 50.
- `START_AUTO` transitions to `playing-auto`, initialises session counters.
- `AUTO_TICK` increments `autoBallsSpawned`, adds to `inFlightBalls`.
- `AUTO_TICK` ignored when `autoBallsSpawned === autoBallsRequested`.
- `AUTO_STOP` transitions to `playing-auto-stopping`, records reason.
- `playing-auto-stopping` + `BALL_LANDED` + empty in-flight → `idle`.
- `playing-auto` + `BALL_LANDED` reaching cap + empty in-flight → `idle` with `autoStopReason: 'completed'`.
- Two `DROP_MANUAL`s before `BALL_LANDED`: both balls in `inFlightBalls`.
- `DROP_MANUAL` during `playing-auto`: ignored (defensive).
- `RESET` clears all state.

### Component tests

- `Board.test.tsx`: 20 rows, correct peg count per row, renders `<FallingBall>` children for each in-flight ball.
- `FallingBall.test.tsx`: given a path, on mount eventually calls `onLanded`. With `useReducedMotion` mocked, `onLanded` fires synchronously.
- `BinRow.test.tsx`: 21 bins, multipliers match curve, pulses on hit (asserted via `data-flash`).
- `HistoryStrip.test.tsx`: renders last 5 entries. Empty history = empty strip.
- `AutoDropControls.test.tsx`: progress text correct, STOP fires callback.
- `SetupPanel.test.tsx`: risk picker, bet clamping, mode picker reveals auto config, button label reflects stake.
- `EndScreen.test.tsx`: summary stats correct, buttons fire callbacks.

### `PlinkoPage.test.tsx` (~6 e2e)

- Setup → DROP → ball spawns → animation → balance changes → rounds row written.
- Auto: 5 balls → 5 rounds rows + session summary.
- Auto with insufficient chips mid-run → `AUTO_STOP` reason `insufficient-chips`.
- Manual click: rounds row's `details.sessionId` is unique per click.
- Auto session: all rounds rows share `details.sessionId`.
- Settle bridge writes `risk`, `bin`, `multiplier` correctly.

### Performance targets

- Auto-drop at 250ms interval = up to 6 balls concurrently. Target 60fps on 2020 MacBook Air.
- 100-ball auto session = ~200 Dexie transactions over ~1.5 minutes (matches Lottery precedent).

---

## 12. Out of scope

Defer to Phase 15 polish or future enhancement:

- **Admin tunability** of multiplier curves (`/admin/plinko`). Curves stay as code constants for Phase 12.
- **Sound effects** — ball drops, bin pings, jackpot ding. Phase 15.
- **Ball-trail / sparkle effects** on big wins.
- **Confetti / coin shower** for jackpot bin hits (reuse Slots ADR-0033 tiered-celebration pattern).
- **Cooldown** between manual drops. Currently no cooldown — spam-clickable.
- **Drop-from-column picker** (the rejected hybrid Plinko variant).
- **Persistent history beyond rolling 50.** Stats page covers the longer view.
- **Pre-funded batch multi-ball with single rounds row.** Per-ball rows is simpler and matches Lottery.

These will be appended to `masquer-deferred-features` memory.

---

## 13. Rollout

Four PRs, mirroring Phase 11.5:

- **PR A** — `logic.ts` + multiplier curves + `dropBall` + `payoutFor` + commitlint scope `plinko` + `Round.game` enum extension + tests. No UI / machine.
- **PR B** — XState machine (manual + auto modes + scheduler events) + tests. UI is stubbed via a `PlinkoPage` placeholder.
- **PR C** — UI rewrite: Board, FallingBall, BinRow, HistoryStrip, AutoDropControls, SetupPanel, PlinkoPage, EndScreen. Component + e2e tests. Game playable end-to-end via direct URL.
- **PR D** — Sidebar + lobby cabinet + stats/leaderboard nav (GAME_LABELS, TABS, SLUG, TITLES) + BUILD_GUIDE §10.7 + tag `v0.12-plinko` + GitHub Release + memory snapshot.

**Branch naming:** `phase-12-plinko-pr-{a,b,c,d}`.

**No new ADR.** Game-sandbox + wallet + settle conventions preserved.

---

## 14. Open questions

None at spec time. All design decisions made during brainstorming. Multiplier curve numbers in §3 are design targets — the implementer in PR A will fine-tune edge values until each row's RTP lands in `[0.965, 0.975]`. The shape (symmetric, monotonic, lowest at centre) is locked.
