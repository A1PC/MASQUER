# Phase 14 — Craps Design

**Author:** brainstormed 2026-05-22 with user
**Status:** Spec — pending implementation plan
**Phase:** 14 (the LAST game phase; only Phase 15 Polish remains)
**Goal:** Add full-table single-player Craps — two dice, come-out/point phases, the complete bet set (line, odds, come/don't-come, place, field, proposition/center), a per-bet resolver registry, tiered tables, and a table-session wallet (buy-in bankroll, ADR-0041).

---

## 1. Context

Phase 13 shipped the poker trio. Phase 14 — Craps — is the final game before the Phase 15 Polish pass. It does **not** reuse the poker `_shared/` core (that's cards); Craps is its own dice world in `src/games/craps/`. It DOES reuse the table-session wallet pattern (ADR-0041, from poker) and the project's seeded-RNG + XState v5 + Framer-Motion + wallet-bridge-async/machine-pure conventions.

This is the heaviest single-game logic surface in the project: ~15+ distinct bet types, each with its own win/lose/push/standing resolution rule and payout, plus the come-out/point phase machine and the standard "working/off" bet rules.

---

## 2. Rules + format

- **Single-player.** You are the shooter; you bet against the house. No AI opponents.
- **Two dice**, each uniform 1-6. Roll total drives all resolution.
- **Phases:**
  - **Come-out roll:** 7 or 11 → Pass wins (Don't-Pass loses); 2/3/12 → "craps", Pass loses (Don't-Pass wins on 2/3, **pushes on 12** — "bar 12"); 4/5/6/8/9/10 → that number becomes the **point**, phase → point.
  - **Point phase:** roll === point → Pass (+ odds) wins, point cleared, phase → come-out; roll === 7 → "seven out", Pass/Come/Place lose, Don't-side wins, phase → come-out; any other → resolve one-roll + come/field/prop bets that hit; standing bets remain.
- **Bet set (full table):**
  - **Line:** Pass, Don't Pass.
  - **Odds:** free odds behind Pass/Don't-Pass and behind Come/Don't-Come — **true odds, no house edge** (4/10 → 2:1, 5/9 → 3:2, 6/8 → 6:5; don't-side lays the inverse).
  - **Come / Don't Come:** like the line but established during the point phase; a Come bet "travels" to the number rolled.
  - **Place:** 4/5/6/8/9/10 (9:5 / 7:5 / 7:6 for 4·10 / 5·9 / 6·8). OFF on the come-out by default.
  - **Field:** one-roll on 2/3/4/9/10/11/12 — 1:1, **2:1 on 2, 3:1 on 12**.
  - **Proposition/center:** one-roll — Any 7 (4:1), Any Craps (7:1), 2 (30:1), 3 (15:1), 11 (15:1), 12 (30:1), Horn + C&E (composites); multi-roll — Hardways: hard 4/10 (7:1), hard 6/8 (9:1), lose on the easy way or any 7.
- **Stakes:** tiered tables (Low / Mid / High) — each defines a table minimum, a maximum, and a buy-in range. Odds are capped at a simple multiple of the line bet (exact cap documented in the registry; default 3× the line).
- **Session:** buy in to a table bankroll; bets + payouts move within the bankroll in-memory across rolls; leave = cash out; one `rounds` row per session (ADR-0041).
- **Working/off:** standard casino defaults — place bets are OFF (not working) on the come-out; come-odds off on the come-out. A "place working on come-out" toggle is out of scope.

---

## 3. Architecture + file structure

`src/games/craps/` — self-contained. Reuses the wallet (`useGameRound`/`placeBet`/`settleRound`), seeded RNG (inlined `mulberry32` + `stringSeed`), XState v5, Framer Motion.

```
src/games/craps/
├─ dice.ts + .test.ts            ← seeded two-dice roll, total, isHard
├─ bets.ts + .test.ts            ← BET_TYPES registry (id, label, canPlace, isWorking, resolve, payout)
├─ resolveRoll.ts + .test.ts     ← maps active bets → per-bet outcomes for a roll/point/phase
├─ stakes.ts                     ← tiered table config (Low/Mid/High)
├─ machine.ts + .test.ts         ← XState: come-out/point phases, placement validation, working rules, session
├─ CrapsPage.tsx + .test.tsx     ← shell + wallet bridge (buy-in/cash-out) + roll driver
├─ CrapsTable.tsx                ← authentic half-table layout
├─ BetSpot.tsx + .test.tsx       ← one clickable bet area (chips, dim-when-ineligible, resolve flash)
├─ Dice.tsx + .test.tsx          ← two-dice tumble animation (reduced-motion → instant)
├─ PointPuck.tsx                 ← ON/OFF puck over the point
├─ PropositionDrawer.tsx         ← collapsible centre prop bets
├─ ChipTray.tsx                  ← chip-denomination selector (mirrors roulette's ChipSelector)
├─ SessionBar.tsx                ← bankroll, session net, LEAVE TABLE
└─ SetupPanel.tsx                ← stakes tier + buy-in
```

**Top-level:** `Round.game` enum gains `'craps'`; commitlint scope `craps`; `/play/craps` route; sidebar (icon 🎲) + lobby cabinet + stats/leaderboard nav.

**ADR-0042 (new):** records the craps bet-resolver-registry contract + payout convention + working/off defaults (lands in PR C).

---

## 4. Dice + bet-resolution registry

### `dice.ts` (pure)

```typescript
export interface Roll {
  d1: number; // 1-6
  d2: number; // 1-6
  total: number; // 2-12
  isHard: boolean; // d1 === d2
}
export function rollDice(rng: () => number): Roll;
```

Each die `Math.floor(rng() * 6) + 1`. Inlined `mulberry32` + `stringSeed`; one RNG per session seeded `${sessionId}.${rollNumber}`. Tested for the full 36-outcome distribution + isHard.

### `bets.ts` — the per-bet resolver registry

```typescript
export type Phase = 'come-out' | 'point';

export type BetOutcome =
  | { kind: 'win'; payout: number } // payout = WINNINGS only (excl. stake); machine credits stake + winnings
  | { kind: 'lose' }
  | { kind: 'push' } // stake returned (e.g. Don't Pass on 12)
  | { kind: 'standing' } // unresolved this roll; bet remains
  | { kind: 'move'; toPoint: number }; // come / don't-come travels to the rolled number

export interface BetContext {
  point: number | null;
}

export interface BetType {
  id: string; // 'pass' | 'dont-pass' | 'come' | 'dont-come' | 'odds-pass' | 'odds-dont' |
  // 'place-4'..'place-10' | 'field' | 'hard-4' | 'hard-6' | 'hard-8' | 'hard-10' |
  // 'any-7' | 'any-craps' | 'prop-2' | 'prop-3' | 'prop-11' | 'prop-12' | 'horn' | 'c-and-e'
  label: string;
  canPlace(phase: Phase, ctx: BetContext): boolean; // may this bet be placed now?
  isWorking(phase: Phase): boolean; // is it live this roll? (place bets off on come-out)
  resolve(roll: Roll, phase: Phase, point: number | null, betPoint: number | null): BetOutcome;
  payout(amount: number, betPoint: number | null): number; // winnings only, floor-rounded (ADR-0036)
}

export const BET_TYPES: Record<string, BetType>;
```

**Payout convention:** `payout()` returns **winnings only**; the machine credits `stake + winnings` on a `win`. Floor-rounded (favours player on remainder, per ADR-0036). Payout tables baked into the registry per §2.

### `resolveRoll.ts`

```typescript
export interface ActiveBet {
  betId: string;
  amount: number;
  betPoint: number | null;
}
export interface RollResolution {
  perBet: Array<{ bet: ActiveBet; outcome: BetOutcome }>;
  netReturned: number; // chips returned to bankroll this roll (stake-returns for wins/pushes + winnings)
}
export function resolveRoll(
  bets: ActiveBet[],
  roll: Roll,
  phase: Phase,
  point: number | null,
): RollResolution;
```

Iterates active bets, skips non-working ones (`isWorking` false → `standing`), calls each resolver, computes `netReturned`. Pure + deterministic. The machine applies the outcomes (credit wins, drop losers, keep standing, relocate `move` bets).

**PR split:** PR A registers `pass`/`dont-pass`/`come`/`dont-come`/`odds-pass`/`odds-dont` + `resolveRoll`; PR B registers `place-*`/`field`/`hard-*`/`any-7`/`any-craps`/`prop-2`/`prop-3`/`prop-11`/`prop-12`/`horn`/`c-and-e`.

---

## 5. Machine + session/wallet

### `machine.ts` (XState v5)

**States:** `idle → table → settling → session_over`. `table` has phase sub-state via `context.phase` ('come-out' | 'point').

```
idle
 └─ SIT_DOWN → table { phase: 'come-out', point: null }   (input: stakes + buyIn → bankroll)
table
 ├─ PLACE_BET { betId, amount, betPoint? }   guard: bet canPlace(phase) + amount within [tableMin, tableMax] + bankroll >= amount
 ├─ REMOVE_BET { betId, betPoint? }          guard: bet is removable in this phase (place/odds/props yes; contract pass/come once travelled no)
 ├─ ROLL { roll }                            (page sends the resolved Roll; machine applies resolveRoll + phase transition)
 ├─ REBUY { amount }
 └─ LEAVE_TABLE → settling                   guard: allowed between rolls
settling → session_over (page settles the wallet)
```

**ROLL handling:** apply `resolveRoll(bets, roll, phase, point)`; credit `win`/`push` returns to `bankroll`; drop losers; keep `standing`; relocate `move` bets (come/don't-come → the rolled number, carrying their amount); then phase transition:

- come-out: 7/11 or 2/3/12 → resolve the line, stay come-out; 4-10 → set `point`, phase 'point'.
- point: roll === point → pass+odds already resolved as wins by `resolveRoll`; clear point, phase 'come-out'; roll === 7 → seven-out (resolveRoll already lost pass/come/place + won don't-side); clear point + all point-phase bets per their resolution, phase 'come-out'.

**Context:**

```typescript
interface CrapsContext {
  sessionId: string;
  rollNumber: number;
  stakes: { tableMin: number; tableMax: number; tier: 'low' | 'mid' | 'high' };
  bankroll: number;
  phase: Phase;
  point: number | null;
  bets: ActiveBet[];
  lastRoll: Roll | null;
  lastResolution: RollResolution | null;
  totalBoughtIn: number;
  rebuys: number;
  rollsPlayed: number;
  biggestWin: number;
}
```

**Events:** `SIT_DOWN` (via `input` `{ sessionId, buyIn, stakes }`), `PLACE_BET`, `REMOVE_BET`, `ROLL { roll }`, `REBUY { amount }`, `LEAVE_TABLE`.

**Working/off:** each resolver's `isWorking(phase)` encodes the standard defaults (place + come-odds off on come-out). `resolveRoll` treats non-working bets as `standing`.

**Session/wallet (ADR-0041 reuse):** SIT_DOWN does `placeBet(buyIn)` → `bankroll` + the session handle. Bets + payouts move within `bankroll` in-memory (the wallet doesn't change per roll). REBUY tops up. LEAVE_TABLE → `settleRound(sessionHandle, { betAmount: totalBoughtIn, payout: finalBankroll, won: finalBankroll > totalBoughtIn, details })`. One `rounds` row per session.

**Determinism:** dice seeded per roll; the machine never calls `rollDice` — the page sends `ROLL { roll }`. Machine tests feed scripted rolls.

**ADR-0042:** the bet-resolver-registry contract (the `BetType` interface, payout-returns-winnings-only, the working/off defaults) is recorded as an ADR in PR C — a novel, rule-dense subsystem worth a durable record.

---

## 6. UI

Authentic half-table layout (single-player — only one player's betting area). Chip-on-spot betting like roulette.

- **`ChipTray.tsx`** — chip-denomination selector (mirrors roulette's `ChipSelector`): pick a chip value (scaled to the tier), click bet spots to drop it. Shows the bankroll.
- **`BetSpot.tsx`** — one clickable bet area: label + stacked chips + potential; **dimmed/disabled when `canPlace` is false** in the current phase; click places the selected chip; remove affordance for removable bets (before a roll); win/lose flash on resolve.
- **`CrapsTable.tsx`** — authentic half-table: Place row (4·5·6·8·9·10 with the `PointPuck` on the point) on top; COME band; FIELD strip (2× on 2, 3× on 12 marked); PASS LINE + DON'T PASS along the bottom with odds behind; the `PropositionDrawer` (collapsible) for the centre bets; the `Dice` + recent rolls.
- **`Dice.tsx`** — two dice tumble on ROLL, settle on the rolled faces (Framer Motion; `useReducedMotion` → instant show).
- **`PointPuck.tsx`** — ON (white, over the point) / OFF (black) puck.
- **`PropositionDrawer.tsx`** — collapsible centre box: hardways 4/6/8/10, any 7, any craps, 2/3/11/12, horn, C&E. Tap to expand.
- **`SessionBar.tsx`** — bankroll, session net (green/red), rolls played, LEAVE TABLE (between-rolls only).
- **`SetupPanel.tsx`** — stakes tier + buy-in slider + SIT DOWN (disabled until wallet hydrated + balance ≥ min buy-in).
- **`CrapsPage.tsx`** — orchestrator: session-keyed sub-component mounting the machine after `placeBet` (SIT DOWN); wallet bridge (SIT DOWN / REBUY / LEAVE → `settleRound`); the **ROLL driver** (player clicks ROLL → `rollDice(rng)` → send `ROLL { roll }`); `beforeunload` best-effort settle; seed a `mulberry32` per session (no `Math.random`). Reads `phase`/`point` to dim/enable spots + place the puck.

**Phase affordances:** come-out → puck OFF, Pass/Don't-Pass/Field/props live, place bets dimmed (off on come-out); point set → puck ON the number, Come + odds + place live. Reduced motion honoured (dice settle instantly).

**Visual style:** felt-green, gold trim, neon-cyan pass line / active spots, casino-red don't-pass; white dice with red pips. Consistent with the rest of the app.

---

## 7. Persistence + integration

- **One `rounds` row per session** (ADR-0041): `game: 'craps'`, `stake: totalBoughtIn`, `payout: finalBankroll`, `won: finalBankroll > totalBoughtIn`, `details: { tier, rollsPlayed, rebuys, biggestWin, sessionId }`.
- **`Round.game`** gains `'craps'` (forces GAME_LABELS exhaustiveness updates).
- **Stats/leaderboard** aggregate `craps` generically — no new aggregations. `GAME_LABELS`: `craps: 'Craps'` (stats) / `'CRAPS'` (leaderboard); StatsLeftRail TABS+SLUG, StatsPage + LeaderboardPage TITLES gain craps.
- **Sidebar** 🎲 Craps → `/play/craps`. **Lobby cabinet** → direct `<Link to="/play/craps">` (one mode; no variant modal).
- **Route** `/play/craps`, lazy-loaded.
- **Commitlint** scope `craps` added in PR A.
- No Dexie version bump (enum is TS-level).

---

## 8. Testing (~140 total)

- **PR A (~45):** `dice` (36-outcome distribution, isHard, deterministic by seed); registry for pass/don't-pass/come/don't-come/odds — `it.each` over (roll, phase, point, betPoint) → outcome; payouts (even money; true odds 2:1/3:2/6:5; don't-pass push on 12); `resolveRoll` aggregation + `netReturned`.
- **PR B (~40):** place (9:5/7:5/7:6, off on come-out via `isWorking`), field (2:1 on 2, 3:1 on 12, lose on 5/6/7/8), hardways (win on hard, lose on easy/7, multi-roll standing), one-roll props (any 7 4:1, any craps 7:1, 2/3/11/12, horn, C&E). Each resolver's win/lose/push/standing/move pinned.
- **PR C (~35):** machine — come-out (7/11 win, 2/3/12 craps incl. don't-pass 12 push, point set), point (point made → win + back to come-out; seven-out → don't-side wins + back to come-out), placement validation per phase, working/off (place off on come-out), come-bet travel (`move`), remove-bet rules, rebuy, leave→session_over, biggestWin. Seeded/scripted rolls.
- **PR D (~20):** BetSpot dims when ineligible + places/removes chips; Dice settles on rolled faces (reduced-motion instant); PointPuck ON/OFF; CrapsPage e2e (fake-indexeddb + wallet hydration + seeded dice + `useReducedMotion` mocked): sit → place pass-line bet → roll a point → roll the point → win credited → leave → assert a `rounds` row with `game: 'craps'`, `stake === totalBoughtIn`, `payout === finalBankroll`.
- **PR E (~8):** nav entries + GAME_LABELS + variant-free cabinet link + count updates.

**Infra:** seeded dice; scripted `ROLL { roll }` (machine never calls `rollDice`); `useReducedMotion` mocked true; fake-indexeddb + wallet hydration for the e2e.

---

## 9. Out of scope

→ append to `localgamble-deferred-features`:

- Put / Buy / Lay bets.
- "Place bets working on come-out" toggle.
- Fire bet / bonus / all-small-tall-make bets.
- Hop bets.
- Configurable field paytable; configurable odds cap beyond the default 3×.
- Multi-roll bet-history viewer beyond the per-session rounds row.
- Dealer / stickman flavour + voice calls.
- Sound effects.
- Admin tunability of payouts / stakes.

---

## 10. Rollout

Six PRs, branches `phase-14-craps-pr-{a..f}`:

- **PR A** — `dice` + `bets` registry (line/odds/come) + `resolveRoll` + `stakes` + tests. Pure. Adds commitlint scope `craps`.
- **PR B** — registry: place/field/proposition/hardways + tests. Pure.
- **PR C** — `machine` (phases, placement validation, working rules, session) + **ADR-0042** + placeholder `CrapsPage` + `/play/craps` route + tests.
- **PR D** — UI (CrapsTable, BetSpot, Dice, PointPuck, PropositionDrawer, ChipTray, SessionBar, SetupPanel) + full CrapsPage (wallet bridge + roll driver) + tests. Playable via direct URL.
- **PR E** — `Round.game` enum + GAME_LABELS + sidebar + lobby cabinet + stats/leaderboard nav + BUILD_GUIDE §10.9.
- **PR F** — tag `v0.14-craps` + GitHub Release + memory snapshot. **Completes all gameplay phases; only Phase 15 Polish remains.**

**One new ADR:** ADR-0042 (craps bet-resolver registry + working-bet rules).

---

## 11. Open questions

None at spec time. All decisions made during brainstorming. The field + odds + proposition payouts in §2 use standard casino tables (documented in the registry); the implementer follows them exactly. The one judgement call — the odds cap (default 3× the line bet) — is documented in the registry and tunable there.
