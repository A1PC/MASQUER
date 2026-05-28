# Phase 13b — Five-Card Draw Design

**Author:** brainstormed 2026-05-21 with user
**Status:** Spec — pending implementation plan
**Phase:** 13b (poker trio, middle entry; reuses the `poker/_shared/` core from 13a)
**Goal:** Add No-Limit Five-Card Draw (2-6 players vs personality-archetype AI), reusing Hold'em's table/stakes/betting/session framework and the shared poker core. The only genuinely new logic is a single draw/discard street + an AI discard strategy.

---

## 1. Context

Phase 13a (`v0.13a-texas-holdem`) shipped the reusable poker infrastructure under `src/games/poker/_shared/`. Phase 13b adds the second poker variant on top of it. Almost everything is inherited; the new surface is small and well-bounded:

- A **draw/discard street**: after the first betting round, each live player discards 0-3 cards and draws replacements, then a second betting round, then showdown.
- An **AI discard strategy** (`decideDiscard`) — the one new piece of poker AI.

The `_shared/` core, the buy-in/cash-out session model (ADR-0041), and the wallet-bridge-async / machine-pure pattern are all reused unchanged. **Shipped Hold'em code is not modified.**

---

## 2. Rules + format (inherited from Hold'em unless noted)

- **Variant:** No-Limit Five-Card Draw.
- **Players:** configurable 2-6 (you + 1-5 AI). You sit at the bottom seat.
- **Betting:** No-Limit. Two betting rounds — pre-draw and post-draw.
- **Forced bets:** blinds (SB/BB), same as Hold'em (heads-up: button posts SB, acts first pre-draw, last post-draw).
- **Stakes:** tiered tables — Low 10/20, Mid 50/100, High 250/500. Buy-in 40-100 big blinds.
- **Session:** buy-in/cash-out, rebuy on your bust, re-seat fresh AI on AI bust. One `rounds` row per session (ADR-0041).
- **The draw (NEW):** single draw round. Each live player discards **0 to 3** cards (hard cap 3) and draws the same number of replacements. Default action is **stand pat** (discard 0). The "keep an ace, draw 4" rule is **out of scope**.
- **Deck safety:** 6 players × 5 = 30 dealt + up to 6 × 3 = 18 drawn = 48 of 52. No reshuffle of discards is needed at any legal table size.
- **No community cards.** Hands are evaluated on each player's final 5 cards via `evaluateBest5`.

---

## 3. Architecture + file structure

`src/games/poker/five-card-draw/` is a new sibling to `holdem/`, reusing `_shared/`. The only addition to `_shared/` is the AI discard module (it is reusable poker AI, so it belongs in `_shared/ai/`).

**Reused from `_shared/` unchanged:** `deck` (`deckFromSeed`), `handEvaluator` (`evaluateBest5`, `compareHands`), `sidePots` (`computeSidePots`), `ai/decide` + `ai/archetypes`, `PlayingCard`, `PokerVariantModal`, `types`. `evaluateFrom` is not used (no board).

**Reused from `holdem/` by import (no Hold'em changes):** `BettingControls`, `SessionBar`, `ShowdownReveal`, `SetupPanel`, `stakesConfig`. Where a Hold'em component hardcodes a Hold'em-only assumption (e.g. a "Texas Hold'em" label or a community-board reference), a thin fork is made into `five-card-draw/` instead — decided per-component during PR C, default is import-and-reuse.

```
src/games/poker/_shared/ai/
└─ decideDiscard.ts + .test.ts        ← NEW: which cards to discard (0-3), archetype-flavoured

src/games/poker/five-card-draw/
├─ drawLogic.ts + .test.ts            ← dealHand(5 each), applyDiscards, resolveShowdown
├─ machine.ts + .test.ts             ← XState: betting + draw streets
├─ FiveCardDrawPage.tsx + .test.tsx  ← orchestrator: wallet bridge + AI turn/discard driver
├─ DrawTable.tsx                     ← row-based layout, no community board
├─ DrawSeat.tsx + .test.tsx          ← seat with "drew N" / "stood pat" draw label
└─ DiscardControls.tsx + .test.tsx   ← tap-to-discard hand + DRAW(n) button (cap 3)
```

**Top-level:** no `Round.game` change (`'poker'` already covers it; `details.variant: 'five-card-draw'`). `PokerVariant` already lists `'five-card-draw'`. No commitlint change (`poker` scope exists). `PokerVariantModal` already renders a greyed "Five-Card Draw" card — PR D flips it active + adds the route.

**No new ADR** — fully within established conventions.

---

## 4. Draw machine

XState v5, `five-card-draw/machine.ts`. New machine (not a refactor of Hold'em); reuses `_shared` pure helpers. Minor duplication of betting-round-closure logic from Hold'em is accepted (lowest risk; Hold'em untouched).

### Lifecycle

```
idle
 └─ START_HAND → posting_blinds        (post SB/BB, deal 5 hole cards each face-down)
posting_blinds → bet_predraw           (auto)
bet_predraw                            (first betting round)
 ├─ PLAYER_ACTION { fold | check | call }
 ├─ PLAYER_RAISE { amount }
 ├─ AI_ACTION { seatId, decision }
 └─ on round close:  ≥2 live → drawing ;  1 live → award_uncontested → hand_complete
drawing                                (each live seat discards 0-3 + draws, in seat order from first-after-button)
 ├─ PLAYER_DISCARD { indices }         (your discard set, length ≤3)
 ├─ AI_DISCARD { seatId, indices }     (page sends resolved decideDiscard result)
 └─ when all live seats have drawn → bet_postdraw
bet_postdraw                           (second betting round, same rules)
 ├─ ≥2 live at close → showdown
 └─ 1 live → award_uncontested → hand_complete
showdown                               (evaluateBest5 each live hand; computeSidePots; award; handResult)
 └─ hand_complete
hand_complete
 ├─ your stack 0 → bust_prompt (REBUY | LEAVE_TABLE)
 └─ else → idle
session_over                           (reached via LEAVE_TABLE)
```

### Context

```typescript
type DrawStreet = 'predraw' | 'draw' | 'postdraw';

interface DrawSeatState {
  seatId: number; // 0 = you; 1..5 = AI
  occupant: 'you' | { archetype: Archetype; name: string };
  stack: number;
  holeCards: Card[]; // exactly 5
  committedThisStreet: number;
  committedThisHand: number;
  discardCount: number; // how many drawn this hand (for the "drew N" label); -1 = not yet drawn
  hasDrawn: boolean;
  status: 'active' | 'folded' | 'all-in' | 'busted' | 'empty';
}

interface DrawContext {
  sessionId: string;
  handNumber: number;
  variant: 'five-card-draw';
  stakes: { sb: number; bb: number };
  tableSize: number;
  seats: DrawSeatState[];
  buttonSeat: number;
  deck: Card[]; // seeded `${sessionId}.${handNumber}`
  deckCursor: number; // next undealt index (after the initial 30, advances as replacements are drawn)
  street: DrawStreet;
  pot: number;
  currentBet: number;
  minRaise: number;
  toActSeat: number;
  lastAggressorSeat: number | null;
  actedSinceLastRaise: number[];
  sidePots: SidePot[];
  handResult: HandResult | null;
  // session-level (same as Hold'em):
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
| { type: 'PLAYER_DISCARD'; indices: number[] }      // ≤3, validated
| { type: 'AI_DISCARD'; seatId: number; indices: number[] }
| { type: 'REBUY'; amount: number }
| { type: 'LEAVE_TABLE' }
| { type: 'RESEAT_AI'; seatId: number; archetype: Archetype; name: string; stack: number }
```

### `drawLogic.ts` (pure)

- `dealHand(seed, numSeats): { holeCards: Card[][]; deckCursor: number }` — 5 cards per seat dealt round-robin from the seeded deck; returns the cursor pointing past the 30 dealt cards.
- `applyDiscards(deck, cursor, holeCards, indices): { holeCards: Card[]; cursor: number }` — replaces the cards at `indices` (≤3, validated) with the next cards from the deck; returns the new 5-card hand + advanced cursor. Deterministic.
- `resolveShowdown({ seats })` → `Record<seatId, awarded>` — `computeSidePots` over contributions + `evaluateBest5` per live hand + `compareHands` (split on tie, odd chip to first winner clockwise). Mirrors Hold'em's `resolveShowdown` but with no board argument.
- `nextActiveSeat(seats, from)` — reused/duplicated from Hold'em's helper.

### Validation

`PLAYER_DISCARD` / `AI_DISCARD` indices are de-duplicated, clamped to ≤3, and any out-of-range index is dropped. An empty array = stand pat.

### Determinism

Deck seeded per hand; AI seeded; machine tests feed scripted `AI_ACTION` + `AI_DISCARD` with fixed seeds. The machine does no async work.

---

## 5. AI

### Betting — reuse `_shared/ai/decide`

`decide` reuses unchanged, but its `DecisionContext.street` is `'preflop'|'flop'|'turn'|'river'` and its strength model branches on that: `preflop` uses `preflopStrength` (reads exactly 2 cards), otherwise `postflopStrength(holeCards, board)` (uses `evaluateBest5`).

**Integration mapping (the one wrinkle):** for both Five-Card-Draw betting rounds the AI holds a full 5-card hand, so it must always use the made-hand (`evaluateBest5`) strength path, never the 2-card `preflopStrength` path. The page therefore builds the `DecisionContext` with **`street: 'flop'`** (or any non-`'preflop'` street) and passes the AI's 5 hole cards as `holeCards` with `board: []`. `postflopStrength([...5 cards], [])` calls `evaluateBest5` on the 5 cards directly — exactly the made-hand strength we want. This mapping lives in the page's AI driver and is documented there; no change to `decide` itself.

### Discard — new `_shared/ai/decideDiscard`

```typescript
export function decideDiscard(holeCards: Card[], archetype: Archetype, rng: () => number): number[];
```

Returns the indices (≤3) to discard. Logic, using `evaluateBest5` on the current 5:

- **Straight or better** (straight / flush / full house / quads / straight-flush) → stand pat, `[]`.
- **Trips** → discard the 2 non-trip cards (draw 2).
- **Two pair** → discard the odd card (draw 1).
- **One pair** → keep the pair, discard the other 3 (draw 3).
- **4-to-a-flush** (4 of one suit) → discard the off-suit card (draw 1).
- **4-to-an-open-ended-straight** → discard the non-contributing card (draw 1).
- **Nothing** → keep the highest 1-2 cards, discard the rest (≤3; default keep top 2, draw 3).

**Archetype flavour (seeded via `rng`):**

- **Maniac** — with probability `bluffFactor`, stand pat on a weak hand (rep strength) or break a pair to draw 3 aggressively.
- **Rock** — always the textbook line above.
- **Station / Shark** — textbook, with a small chance of keeping an extra high kicker (draw one fewer).

Always returns ≤3 indices, de-duplicated, in range. Fully deterministic per `(hand, archetype, seed)`.

---

## 6. UI

Row-based layout, no community board. Cards reuse `_shared/PlayingCard` (the blackjack-style visual).

- **`DiscardControls.tsx`** (NEW) — your 5 cards; tap a card to mark it for discard (it drops + shows ✕); the 4th discard tap is blocked (cap 3); a **DRAW (n)** button where n = current discard count (default 0 = stand pat). On DRAW → `PLAYER_DISCARD { indices }`. Visible only during `drawing` when it's your turn. `useReducedMotion` collapses the drop/flip.
- **`DrawSeat.tsx`** (NEW, or thin fork of `holdem/Seat`) — stack, archetype, 5 face-down cards (revealed at showdown), dealer/blind markers, acting glow, FOLDED/ALL-IN/BUSTED states, and a **"drew N" / "stood pat"** label shown after the seat draws.
- **`DrawTable.tsx`** (NEW) — AI `DrawSeat`s across the top, **no community board**, your seat + (`BettingControls` during betting rounds / `DiscardControls` during the draw) at the bottom, `SessionBar` on the right rail.
- **Reused from `holdem/` by import:** `BettingControls`, `SessionBar`, `ShowdownReveal`, `SetupPanel` (variant label via prop; thin fork only if it hardcodes "Hold'em"). From `_shared/`: `PlayingCard`, `PokerVariantModal`.
- **`FiveCardDrawPage.tsx`** (NEW) — same orchestrator pattern as `HoldemPage`: a session-keyed sub-component mounts the machine via `input` after `placeBet` resolves; wallet bridge (SIT DOWN / REBUY / LEAVE → `settleRound` with `details.variant: 'five-card-draw'`); AI driver `useEffect` that on an AI's turn calls `decide` (betting rounds) or `decideDiscard` (during the draw) after a seeded thinking delay (`useReducedMotion` → ~0), then sends `AI_ACTION` / `AI_DISCARD`; `START_HAND` / `RESEAT_AI` loops; `beforeunload` best-effort settle.

---

## 7. Persistence + integration

- **One `rounds` row per session** (ADR-0041): `game: 'poker'`, `stake: totalBoughtIn`, `payout: finalStack`, `won: finalStack > totalBoughtIn`, `details: { variant: 'five-card-draw', tableSize, stakes, handsPlayed, rebuys, biggestPotWon, sessionId }`.
- **Stats/leaderboard** already aggregate `poker` generically — no aggregation or label changes needed.
- **`PokerVariantModal`** — flip the existing greyed "Five-Card Draw" card to active → `navigate('/play/poker/five-card-draw')`.
- **Routes** — add `/play/poker/five-card-draw` (lazy). `/play/poker` modal host already exists.
- No sidebar/cabinet change (the Poker cabinet already opens the variant modal).

---

## 8. Testing (~90 new tests)

- **PR A** — `decideDiscard`: stand pat on straight+; draw 2 on trips; draw 1 on two-pair and on 4-to-a-flush / 4-to-an-open-straight; draw 3 on one pair; ≤2 high cards kept on nothing; archetype flavour deterministic per seed; never returns >3 indices; never out-of-range/duplicate. `drawLogic`: `dealHand` 5-each distinct + deterministic; `applyDiscards` replaces exactly the indexed cards from the cursor with no reuse + advances the cursor; `resolveShowdown` single-winner / split / side-pot eligibility (reuse Hold'em showdown test shapes).
- **PR B** — machine: blind posting (incl. heads-up button-is-SB); pre-draw betting closure (check-around, raise/reraise/call, all-fold); `drawing` advances only after every live seat has drawn; post-draw betting; showdown awards main + side pots; uncontested win; button rotation; your-bust → bust_prompt; rebuy; leave → session_over. Seeded decks + scripted `AI_ACTION` / `AI_DISCARD`.
- **PR C** — `DiscardControls` (tap toggles discard mark; 4th tap blocked; DRAW fires the indices; default stand pat); `DrawSeat` draw-count label; `FiveCardDrawPage` e2e (fake-indexeddb + wallet hydration + seeded deck + `useReducedMotion` mocked): sit → pre-draw bet → discard → draw → post-draw bet → showdown → leave → assert a `rounds` row with `game: 'poker'`, `details.variant: 'five-card-draw'`, `stake === totalBoughtIn`, `payout === finalStack`.

**Test infra:** seeded `deckFromSeed`; scripted machine events (machine never calls `decide`/`decideDiscard`); `useReducedMotion` mocked true; fake-indexeddb + wallet hydration for the e2e.

---

## 9. Out of scope

→ append to `masquer-deferred-features`:

- Keep-an-ace-draw-4 rule (capped at 3 here).
- Multiple draw rounds / Triple Draw.
- Lowball / deuce-to-seven / Badugi.
- Joker or wild cards.
- Equity-aware (simulate-the-draw) AI discard.
- Sound effects.
- Omaha (that is 13c — `evaluateFrom(..., 'omaha')` already exists in `_shared`).
- Admin tunability of AI archetypes (shared candidate with the rest of poker).

---

## 10. Rollout

Four PRs, branches `phase-13b-draw-pr-{a..d}`:

- **PR A** — `_shared/ai/decideDiscard` + `five-card-draw/drawLogic` + tests. Pure logic.
- **PR B** — `five-card-draw/machine` (betting + draw streets) + tests + placeholder `FiveCardDrawPage` + `/play/poker/five-card-draw` route.
- **PR C** — UI: `DiscardControls`, `DrawSeat`, `DrawTable` + full `FiveCardDrawPage` (wallet + AI driver) + reused Hold'em controls. Playable via direct URL.
- **PR D** — flip the variant-modal card to active + BUILD_GUIDE §10.8 update (note Five-Card Draw under the poker section) + tag `v0.13b-five-card-draw` + GitHub Release + memory snapshot.

**No new ADR.** Shipped Hold'em code is not modified.

---

## 11. Open questions

None at spec time. The one integration nuance — mapping the betting AI's `DecisionContext.street` so it judges a full 5-card draw hand via `evaluateBest5` rather than the 2-card preflop path — is specified in §5 and is the implementer's key correctness checkpoint in PR C's AI driver.
