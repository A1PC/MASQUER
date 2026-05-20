# Phase 13a — Texas Hold'em + Shared Poker Infrastructure Design

**Author:** brainstormed 2026-05-20 with user
**Status:** Spec — pending implementation plan
**Phase:** 13a (NEXT per roadmap — heaviest of the poker trio; ships shared infra for 13b/13c)
**Goal:** Add No-Limit Texas Hold'em (configurable 2-6 players vs personality-archetype AI, tiered stakes, buy-in/cash-out session with rebuy) and the reusable poker infrastructure (deck, hand evaluator, side pots, AI engine, variant chooser) that Five-Card Draw (13b) and Omaha (13c) build on.

---

## 1. Context

Phase 12 (Plinko, `v0.12-plinko`) shipped 2026-05-20. Phase 13a is the heaviest phase yet — effectively two deliverables: (1) reusable poker infrastructure under `src/games/poker/_shared/`, (2) the Texas Hold'em game under `src/games/poker/holdem/`.

It introduces a genuinely new wallet pattern: a **buy-in/cash-out session** where one `rounds` row spans many hands, and wallet debits (buy-in + rebuys) don't correspond 1:1 to the rounds row. This warrants a new ADR (ADR-0041).

Follows existing conventions: pure logic with no React/I/O, XState v5 machine, the wallet-bridge-does-async / machine-is-pure pattern (page resolves AI decisions + async wallet calls, sends pre-resolved events into a synchronous machine). Card visual reuses the established blackjack/baccarat look.

---

## 2. Game rules + format

- **Variant:** No-Limit Texas Hold'em.
- **Players:** configurable 2-6 (you + 1-5 AI). You always sit at the bottom seat.
- **Betting:** No-Limit — bet/raise anything from the min (one big blind, or min-raise = size of the last raise) up to your whole stack (all-in).
- **Stakes:** tiered tables. Low 10/20, Mid 50/100, High 250/500 (small blind / big blind). Buy-in = 40-100 big blinds for the chosen tier.
- **Session model:** buy-in/cash-out. Sit down with a stack (wallet debited), play many hands, leave between hands (wallet credited final stack). Bust → rebuy or leave.
- **AI bust:** re-seat a fresh AI (new archetype + house stack); table stays at chosen size.
- **Player bust:** prompt rebuy (additional wallet debit) or leave.
- **Card visual:** reuse the blackjack/baccarat style (Times-serif pips, cyan/magenta neon glow by suit, gold inset border, pinstripe back). Ported into `poker/_shared/PlayingCard.tsx`.

---

## 3. Architecture + file structure

`src/games/poker/_shared/` holds the reusable core; `src/games/poker/holdem/` holds Hold'em specifics. 13b adds `poker/five-card-draw/`, 13c adds `poker/omaha/`, both reusing `_shared/`.

```
src/games/poker/
├─ _shared/
│  ├─ types.ts                 ← Card, Rank, Suit, HandRank, HandCategory, PokerVariant
│  ├─ deck.ts                  ← freshDeck, shuffle (seeded), deckFromSeed
│  ├─ deck.test.ts
│  ├─ handEvaluator.ts         ← evaluateBest5, evaluateFrom, compareHands
│  ├─ handEvaluator.test.ts
│  ├─ sidePots.ts              ← computeSidePots (all-in-aware pot splitting)
│  ├─ sidePots.test.ts
│  ├─ ai/
│  │  ├─ archetypes.ts         ← Rock / Station / Maniac / Shark profiles
│  │  ├─ decide.ts             ← shared decision engine
│  │  └─ decide.test.ts
│  ├─ PlayingCard.tsx          ← ported blackjack/baccarat card visual (shared by all poker variants)
│  ├─ PlayingCard.test.tsx
│  ├─ PokerVariantModal.tsx    ← /play/poker chooser (Hold'em active, Draw/Omaha coming-soon)
│  └─ PokerVariantModal.test.tsx
└─ holdem/
   ├─ holdemLogic.ts           ← deal structure, street progression, showdown via _shared
   ├─ holdemLogic.test.ts
   ├─ machine.ts               ← XState v5 hand lifecycle + session lifecycle
   ├─ machine.test.ts
   ├─ HoldemPage.tsx           ← table shell + wallet bridge + AI turn driver
   ├─ HoldemPage.test.tsx
   ├─ PokerTable.tsx           ← row-based layout
   ├─ Seat.tsx
   ├─ Seat.test.tsx
   ├─ CommunityBoard.tsx
   ├─ CommunityBoard.test.tsx
   ├─ BettingControls.tsx
   ├─ BettingControls.test.tsx
   ├─ SetupPanel.tsx
   ├─ SetupPanel.test.tsx
   ├─ SessionBar.tsx
   ├─ SessionBar.test.tsx
   ├─ ShowdownReveal.tsx
   └─ ShowdownReveal.test.tsx
```

**Top-level changes:** `Round.game` enum gains `'poker'`; commitlint scope `poker`; `/play/poker` + `/play/poker/holdem` routes; sidebar + lobby cabinet + stats/leaderboard nav.

**No Dexie version bump** — the enum is a TS-level union.

---

## 4. Shared core — deck + types + hand evaluator

All pure, no React, no I/O. Inlined mulberry32 + stringSeed (matches bingo/plinko).

### types.ts

```typescript
export type Suit = 'c' | 'd' | 'h' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J 12=Q 13=K 14=A
export interface Card {
  rank: Rank;
  suit: Suit;
}
export type PokerVariant = 'holdem' | 'five-card-draw' | 'omaha';

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'quads'
  | 'straight-flush';

export interface HandRank {
  category: HandCategory;
  categoryValue: number; // 0 (high-card) .. 8 (straight-flush)
  tiebreakers: number[]; // most-significant first; lexicographic compare
  best5: Card[]; // the exact 5 cards forming the hand (for UI highlight)
}
```

### deck.ts

```typescript
export function freshDeck(): Card[]; // 52 ordered cards
export function shuffle(deck: Card[], rng: () => number): Card[]; // Fisher-Yates
export function deckFromSeed(seed: string): Card[]; // freshDeck + shuffle(mulberry32(stringSeed(seed)))
```

One shuffled deck per hand, seeded by `${sessionId}.${handNumber}`.

### handEvaluator.ts — the reusable core

```typescript
/** Best 5-card hand from N>=5 cards (Hold'em: 7). */
export function evaluateBest5(cards: Card[]): HandRank;

/** Variant-aware: 'any' = best 5 of all (Hold'em/Draw); 'omaha' = exactly 2 hole + 3 board. */
export function evaluateFrom(holeCards: Card[], board: Card[], rule: 'any' | 'omaha'): HandRank;

/** >0 a wins, <0 b wins, 0 exact tie (→ split pot). */
export function compareHands(a: HandRank, b: HandRank): number;
```

**Algorithm:** for 7 cards, enumerate all C(7,5)=21 combos, score each, keep the max. Scoring: detect flush → check straight-flush; rank-multiplicity counts → quads / full-house / trips / two-pair / pair; straight detection including the wheel (A-2-3-4-5 ranks as 5-high). `categoryValue` + `tiebreakers` give a total order. Brute-force 21-combo is trivially fast and easy to verify — no perfect-hash lookup tables needed for a play-money app.

`evaluateFrom(..., 'omaha')` enumerates C(holeCards,2)×C(board,3) combos. Built into `_shared` from the start so 13c reuses it untouched; Phase 13a only exercises the `'any'` path.

### sidePots.ts

```typescript
export interface SidePot {
  amount: number;
  eligibleSeatIds: number[];
}
/** Given each seat's total hand contribution + which seats are live (not folded),
 *  returns ordered pots (main first). Handles multiple all-ins at different amounts. */
export function computeSidePots(
  contributions: { seatId: number; committed: number; folded: boolean }[],
): SidePot[];
```

---

## 5. AI engine — personality archetypes

PR B. Pure, seeded, deterministic. The engine takes a `DecisionContext` and returns a `Decision`. **The AI sees only its own hole cards + the board — never your cards or the deck.** Enforced by `DecisionContext` simply not containing that data.

### archetypes.ts

```typescript
export type Archetype = 'rock' | 'station' | 'maniac' | 'shark';

export interface ArchetypeProfile {
  vpipThreshold: number; // hand-strength (0-1) to enter a pot; lower = looser
  aggression: number; // P(raise vs call) when hand clears threshold
  bluffFactor: number; // P(bluff) with a weak hand in favourable spots
  cautiousness: number; // fold-to-bet sensitivity, 0-1
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  rock: { vpipThreshold: 0.72, aggression: 0.45, bluffFactor: 0.04, cautiousness: 0.85 },
  station: { vpipThreshold: 0.4, aggression: 0.15, bluffFactor: 0.02, cautiousness: 0.2 },
  maniac: { vpipThreshold: 0.3, aggression: 0.85, bluffFactor: 0.35, cautiousness: 0.15 },
  shark: { vpipThreshold: 0.55, aggression: 0.6, bluffFactor: 0.18, cautiousness: 0.55 },
};
```

### decide.ts

```typescript
export interface DecisionContext {
  holeCards: Card[];
  board: Card[]; // 0 (preflop) .. 5
  street: 'preflop' | 'flop' | 'turn' | 'river';
  potSize: number;
  toCall: number;
  minRaise: number;
  stack: number;
  position: 'early' | 'late' | 'blinds';
  numActivePlayers: number;
  archetype: Archetype;
  rng: () => number; // seeded
}

export type Decision =
  | { action: 'fold' }
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'raise'; amount: number }; // total bet size (No-Limit)

export function decide(ctx: DecisionContext): Decision;
```

**Logic:**

1. **Hand strength (0-1).** Preflop: Chen-formula-style score from hole cards (pairs, suited, connected, high cards). Postflop: `evaluateBest5(holeCards + board)` normalised to 0-1 (`categoryValue` + tiebreakers), plus a draw bonus (flush/straight draws nudge strength up).
2. **Pot odds.** If `toCall > 0`: `potOdds = toCall / (potSize + toCall)`. Fold if strength < a cautiousness-adjusted threshold of potOdds (unless bluff-raising).
3. **Archetype modulation.** Strength ≥ `vpipThreshold` → with P=`aggression` raise (pot-fraction size, clamped to stack = all-in); else call/check. Strength < threshold → mostly fold, but with P=`bluffFactor` in favourable spots (late position, few opponents, no prior aggression) fire a bluff raise.
4. **All-in.** Raise size ≥ stack → `amount = stack`. Short stacks shove more readily.
5. All stochastic branches use the seeded `rng` so output is reproducible.

**Legality guarantee:** `decide` never returns an illegal action (no check when `toCall>0`; no raise above stack). The machine re-validates defensively.

**Seat assignment:** each AI seat gets a seeded-random archetype at table creation; re-seated AIs get a fresh random archetype. Names are archetype-flavoured labels ("Rock", "Station", "Maniac", "Shark", numbered if duplicated).

---

## 6. Betting + session state machine

PR C. XState v5, `holdem/machine.ts`. The page drives AI + wallet (async); the machine is synchronous + deterministic.

### Hand lifecycle

```
idle (between hands / seated)
  └─ START_HAND → posting_blinds
posting_blinds  (post SB/BB, deal 2 hole cards each, set first-to-act)
  └─ (auto) → betting { street: preflop }
betting  ← re-entered per street
  ├─ PLAYER_ACTION { fold | check | call }
  ├─ PLAYER_RAISE { amount }
  ├─ AI_ACTION { seatId, decision }     (page sends resolved Decision)
  └─ on round close:
      ├─ ≥2 live AND street<river → advance_street (deal flop/turn/river) → betting
      ├─ ≥2 live AND street==river → showdown
      └─ 1 live (rest folded) → award_uncontested → hand_complete
showdown  (reveal live hole cards, side pots, evaluate, award; write handResult)
  └─ (auto) → hand_complete
hand_complete  (stacks updated, button moves, busted AIs flagged)
  ├─ your stack == 0 → bust_prompt
  └─ else → idle
bust_prompt
  ├─ REBUY → idle (wallet debited, stack topped up)
  └─ LEAVE_TABLE → session_over
```

### Context

```typescript
interface SeatState {
  seatId: number; // 0 = you; 1..5 = AI
  occupant: 'you' | { archetype: Archetype; name: string };
  stack: number;
  holeCards: Card[];
  committedThisStreet: number;
  committedThisHand: number; // for side-pot math
  status: 'active' | 'folded' | 'all-in' | 'busted' | 'empty';
}

interface PokerContext {
  sessionId: string;
  handNumber: number;
  variant: 'holdem';
  stakes: { sb: number; bb: number };
  seats: SeatState[];
  buttonSeat: number; // rotates each hand
  deck: Card[]; // seeded by `${sessionId}.${handNumber}`
  board: Card[]; // 0-5
  street: 'preflop' | 'flop' | 'turn' | 'river';
  pot: number; // display total
  currentBet: number; // amount to match this street
  minRaise: number;
  toActSeat: number;
  lastAggressorSeat: number | null;
  actedSinceLastRaise: number[];
  sidePots: SidePot[];
  handResult: HandResult | null;
  // session-level:
  totalBoughtIn: number;
  rebuys: number;
  handsPlayed: number;
  biggestPotWon: number;
}
```

### Events

```typescript
| { type: 'START_HAND' }
| { type: 'PLAYER_ACTION'; action: 'fold' | 'check' | 'call' }
| { type: 'PLAYER_RAISE'; amount: number }
| { type: 'AI_ACTION'; seatId: number; decision: Decision }
| { type: 'REBUY'; amount: number }
| { type: 'LEAVE_TABLE' }
| { type: 'RESEAT_AI'; seatId: number; archetype: Archetype; name: string; stack: number }
```

### Betting-round closure rule

A street closes when every live, non-all-in seat has matched the current bet or folded, AND action has returned to the last aggressor (or checked around with no bet). Tracked via `lastAggressorSeat` + `actedSinceLastRaise`. Standard but fiddly — heavily tested.

### Heads-up special case

In 2-player poker the button posts the small blind and acts FIRST preflop, LAST postflop. The machine handles this explicitly.

### AI driving

The page watches `toActSeat`. When it's an AI seat, it builds a `DecisionContext` from machine context, calls `decide(ctx)` (after a short seeded "thinking" delay for feel), and sends `AI_ACTION`. The machine validates + applies (clamps illegal raises; over-stack = all-in). No AI logic or timers in the machine.

### Showdown

Machine computes side pots (`computeSidePots`), evaluates each live hand (`evaluateBest5`), awards each pot to its best eligible hand(s) (split on `compareHands === 0`), writes `handResult` (winners, amounts, revealed hands, winning best-5) for the UI.

### Determinism

Deck seeded per hand; AI seeded; full hand replays identically given seed + player inputs. Machine tests use fixed seeds + scripted player/AI actions (machine tests feed `AI_ACTION` directly, never call `decide` — keeps machine + AI tests independent).

---

## 7. Session + wallet lifecycle (ADR-0041)

### Buy-in

`/play/poker` → variant modal → Hold'em → `/play/poker/holdem`. SetupPanel: table size (2-6), stakes tier, buy-in (40-100 BB slider). **SIT DOWN** → `placeBet(buyIn)` debits the wallet once; the returned handle is the **session handle**.

### Stacks

Your stack = `buyIn` (in machine context). Each AI gets a house-funded stack (40-100 BB, seeded) — no wallet impact. Chips move in context during play.

### Rebuy

Your bust → `bust_prompt`. **REBUY** → `placeBet(rebuyAmount)` debits wallet, adds to your stack, `totalBoughtIn += rebuyAmount`, `rebuys += 1`.

### AI re-seat

AI bust → `RESEAT_AI` (fresh seeded archetype + house stack). No wallet involvement.

### Cash-out

**LEAVE TABLE** (enabled between hands only) → `settleRound(sessionHandle, result)`:

- `betAmount = totalBoughtIn`
- `payout = finalStack`
- `won = payout > betAmount`
- `netChange = payout - betAmount`

### One rounds row per session

```typescript
{
  game: 'poker',
  stake: totalBoughtIn,
  payout: finalStack,
  won: finalStack > totalBoughtIn,
  details: {
    variant: 'holdem',
    tableSize: number,
    stakes: { sb, bb },
    handsPlayed: number,
    rebuys: number,
    biggestPotWon: number,
    sessionId: string,
  }
}
```

### ADR-0041: poker buy-in/cash-out session wallet model

First game where wallet debits don't 1:1 the rounds row. Decision: each `placeBet` (buy-in + rebuys) is its own wallet debit; only the FIRST returns the session handle used for the single final `settleRound`. Rebuy amounts accumulate into `totalBoughtIn`. The final settle credits `finalStack` and writes ONE rounds row with `stake = totalBoughtIn`. Net wallet effect: `-buyIn -rebuy1 -rebuy2 ... +finalStack` — exactly correct. Rejected alternative: chip escrow + reconciliation (more complex, no benefit).

### Edge cases

- Bust + decline rebuy → `payout = 0`, clean loss row.
- Wallet < rebuy → rebuy options clamp to balance; balance 0 → only LEAVE offered.
- Tab closed mid-session → session handle open + in-memory stack lost. **Mitigation:** best-effort `beforeunload` settle with current stack; if that fails, the buy-in is forfeit (documented limitation). The LEAVE-between-hands rule keeps the common path clean.

---

## 8. UI components

PR D. Row-based layout. Cards reuse the blackjack/baccarat visual.

- **`PlayingCard.tsx`** (`_shared`) — ports the exact blackjack/baccarat card visual (Times-serif rank+pip, cyan/magenta neon glow by suit, gold inset border, pinstripe back). Props: `card`, `faceDown?`, `size: 'table'|'hole'|'mini'`, `highlight?` (gold glow for winning best-5). Lifts the gradient/border/font tokens from `blackjack/Card.tsx` for pixel-identical look. Shared by all three poker variants.
- **`PokerTable.tsx`** — row-based: AI seats across the top, `CommunityBoard` + pot centred, your seat + `BettingControls` at the bottom, `SessionBar` on the right rail.
- **`Seat.tsx`** — name + archetype (AI) or "YOU", stack (animates on change), two cards (yours face-up; AI face-down until showdown), dealer button + SB/BB markers, cyan glow on turn, FOLDED dim / ALL-IN badge / BUSTED state, brief last-action label.
- **`CommunityBoard.tsx`** — up to 5 community cards, Framer Motion flip per street (flop = 3, turn/river = 1), pot below. `useReducedMotion` → instant.
- **`BettingControls.tsx`** — No-Limit; only enabled on your turn. FOLD / CHECK (toCall=0) or CALL {amount}; RAISE with slider (min `minRaise`, max stack = ALL-IN) + quick buttons (½ pot, ¾ pot, pot, all-in) + live total readout. Validates min-raise ≤ amount ≤ stack.
- **`SetupPanel.tsx`** — table size (2-6), stakes tier, buy-in slider, SIT DOWN (disabled until wallet hydrated + balance ≥ min buy-in).
- **`SessionBar.tsx`** — session net (green/red), hands played, stack vs total-bought-in, LEAVE TABLE (disabled mid-hand, tooltip "Leave between hands").
- **`ShowdownReveal.tsx`** — flips live AI hole cards, highlights winners' best-5 (gold glow), shows winning category ("Flush, Ace high"), animates pot chips to winner(s); split pots show divided amounts.
- **`bust_prompt`** overlay — "Out of chips. Rebuy?" → rebuy slider (within table min/max, capped at balance) + REBUY / LEAVE.
- **`HoldemPage.tsx`** — orchestrator: wallet bridge (SIT DOWN/REBUY/LEAVE), AI turn driver `useEffect` (build `DecisionContext` → `decide()` → seeded thinking delay (~600-1200ms, reduced-motion → ~0) → `AI_ACTION`), `beforeunload` best-effort settle, renders SetupPanel → PokerTable → session-over summary.

**Reduced motion:** card flips, chip slides, AI thinking delay all collapse.

---

## 9. Integration

- **`Round.game`** gains `'poker'` (one value; `details.variant` distinguishes). Forces `GAME_LABELS` exhaustiveness updates (like Plinko).
- **Stats/leaderboard** generic — a session reads as one round (stake = totalBoughtIn, payout = finalStack). `GAME_LABELS`: `poker: 'Poker'` (stats) / `'POKER'` (leaderboard). StatsLeftRail TABS+SLUG, StatsPage+LeaderboardPage TITLES gain poker.
- **Sidebar** `♠️ Poker` → `/play/poker`. **Lobby cabinet** Poker → opens `PokerVariantModal` (not a direct link).
- **`PokerVariantModal`** — three cards: Texas Hold'em (active → `/play/poker/holdem`), Five-Card Draw + Omaha (greyed "COMING SOON").
- **Routes** — `/play/poker` (modal host / lobby redirect if hit directly) + `/play/poker/holdem`, both lazy-loaded.

---

## 10. Testing

~230 new tests.

- **PR A `_shared` core (~90):** handEvaluator (every category, wheel, ace-high straight, flush>straight, full-house tiebreak, kicker resolution, exact-tie→0, best-5-of-7 selection, `it.each` matchups); deck (52 unique, seeded determinism, deckFromSeed reproducibility); sidePots (single all-in, multiple all-ins at different amounts, eligibility, everyone all-in).
- **PR B AI (~30):** archetype tendencies on canned contexts; pot-odds; all-in when raise ≥ stack; preflop strength ordering (AA>AKs>72o); deterministic per seed; never illegal; AI output independent of opponent hole cards.
- **PR C machine (~50):** blind posting incl. heads-up button-is-SB; street progression; round closure (check-around, raise/reraise/call, all-fold); all-in side pots; showdown awards main+side; split pots; uncontested win; button rotation; your-bust→bust_prompt; rebuy; leave→session_over. Seeded + scripted actions.
- **PR D UI (~40):** PlayingCard render + face-down; BettingControls slider clamp + CHECK-only-when-toCall-0 + off-turn disabled; SetupPanel buy-in range per tier; SessionBar LEAVE disabled mid-hand; ShowdownReveal flip + winner highlight; HoldemPage e2e (seeded deck + scripted AI): sit → play a hand → showdown → stacks update → leave → rounds row with correct totalBoughtIn/finalStack.
- **PR E nav (~10):** variant modal (1 active, 2 coming-soon), Hold'em navigates; sidebar/cabinet/stats/leaderboard entries; label maps.

**Infra:** seeded `deckFromSeed`; scripted `AI_ACTION` (machine tests never call `decide`); `useReducedMotion` mocked true; fake-indexeddb + wallet hydration for e2e.

---

## 11. Out of scope

Defer to Phase 15 / future:

- Multi-table / tournament mode (blind escalation, payouts).
- Hand-history viewer beyond the per-session rounds row.
- Run-it-twice, rabbit-hunt, time-bank, sit-out.
- AI adapting to the player's observed tendencies (current AI is stateless per decision).
- AI tells / chat.
- Omaha + Five-Card Draw (13c + 13b — `_shared` is built ready).
- Admin tunability of AI archetypes / stakes (mirror `/admin/bingo` later).
- Sound effects.
- Insurance / side bets.

These append to `localgamble-deferred-features`.

---

## 12. Rollout

Six PRs, branches `phase-13a-poker-pr-{a..f}`:

- **PR A** — `_shared/` deck + types + handEvaluator + sidePots + tests. Reusable foundation.
- **PR B** — `_shared/ai/` archetypes + decide + tests.
- **PR C** — `holdem/` machine + holdemLogic + ADR-0041 + placeholder HoldemPage + tests.
- **PR D** — `holdem/` UI (PlayingCard, PokerTable, Seat, CommunityBoard, BettingControls, SetupPanel, SessionBar, ShowdownReveal) + full HoldemPage wallet/AI bridge + tests. Playable via direct URL.
- **PR E** — PokerVariantModal + `/play/poker` routing + `Round.game` enum + GAME_LABELS + sidebar + lobby cabinet + stats/leaderboard nav + BUILD_GUIDE §10.8.
- **PR F** — tag `v0.13a-texas-holdem` + GitHub Release + memory snapshot.

**One new ADR:** ADR-0041 (poker buy-in/cash-out session wallet model), lands in PR C alongside the session machine.

---

## 13. Open questions

None at spec time. All design decisions made during brainstorming. The multiplier-free poker economics are fully determined by blinds + stacks + No-Limit rules. AI archetype tuning values in §5 are starting points — the implementer may adjust the four profile constants during PR B if play-testing reveals an archetype is degenerate, but the four archetypes and the decision-engine structure are locked.
