# Phase 13c — Omaha Hold'em Design

**Author:** brainstormed 2026-05-21 with user
**Status:** Spec — pending implementation plan
**Phase:** 13c (final poker variant; completes the poker trio)
**Goal:** Add No-Limit Omaha Hold'em (2-6 players vs archetype AI) as a near-clone of Texas Hold'em — community board, flop/turn/river, blinds, side pots, buy-in/cash-out session — with three differences: 4 hole cards, the mandatory exactly-2-hole + exactly-3-board showdown rule (`evaluateFrom(..., 'omaha')`, already built in 13a), and a new `decideOmaha` AI.

---

## 1. Context

Phase 13a shipped the reusable `poker/_shared/` core and Texas Hold'em; 13b added Five-Card Draw. 13c is the last poker variant. It is the most clone-like: Omaha shares Hold'em's entire structure (community board, four streets, blinds, side pots) and the hand-evaluation groundwork already exists — `evaluateFrom(holeCards, board, 'omaha')` was built and tested in 13a (exactly 2 of 4 hole cards × exactly 3 of 5 board cards).

The new surface is small: a 4-card deal, the omaha showdown rule, a 4-card AI (`decideOmaha`), and a 4-hole-card UI. **Hold'em and Draw code are not modified.**

---

## 2. Rules + format (inherited from Hold'em unless noted)

- **Variant:** No-Limit Omaha Hold'em. (Omaha is classically Pot-Limit; we chose No-Limit for consistency with Hold'em + Draw and to reuse the betting controls verbatim.)
- **Players:** configurable 2-6 (you + 1-5 AI). You sit at the bottom seat.
- **Betting:** No-Limit. Four streets — preflop / flop / turn / river — same as Hold'em.
- **Forced bets:** blinds (SB/BB); heads-up button posts SB, acts first preflop, last postflop.
- **Stakes:** tiered — Low 10/20, Mid 50/100, High 250/500. Buy-in 40-100 big blinds.
- **Session:** buy-in/cash-out, rebuy on your bust, re-seat fresh AI on AI bust. One `rounds` row per session (ADR-0041).
- **Hole cards (NEW):** **4 per player** (vs Hold'em's 2), dealt face-down.
- **Showdown rule (NEW, mandatory):** each player makes their best 5-card hand using **exactly 2** of their 4 hole cards + **exactly 3** of the 5 board cards. Enforced by `evaluateFrom(holeCards, board, 'omaha')`. This is not a choice — it is the defining Omaha rule.
- **Community board:** 5 cards (flop 3 / turn 1 / river 1), revealed by street, same as Hold'em.
- **Deck safety:** 6 × 4 = 24 hole + 5 board + burns ≈ 32 of 52. Safe.

---

## 3. Architecture + file structure

`src/games/poker/omaha/` is a new sibling to `holdem/` and `five-card-draw/`, reusing `_shared/`. The only `_shared/` addition is `decideOmaha`.

**Reused from `_shared/` unchanged:** `deck` (`deckFromSeed`), `handEvaluator` (`evaluateFrom(..., 'omaha')` + `compareHands` — built + tested in 13a), `sidePots` (`computeSidePots`), `ai/archetypes`, `PlayingCard`, `PokerVariantModal`, `types`.

**Reused from `holdem/` by import (no Hold'em changes):** `BettingControls`, `SessionBar`, `CommunityBoard` (Omaha has the same 5-card board), `stakesConfig`. `SetupPanel`/`Seat`/`ShowdownReveal` thin-forked into `omaha/` only where they assume 2 hole cards or a Hold'em label.

```
src/games/poker/_shared/ai/
└─ decideOmaha.ts + .test.ts     ← NEW: 4-card preflop strength + omaha postflop strength;
                                    reuses ARCHETYPES + pot-odds + raise-sizing from decide

src/games/poker/omaha/
├─ omahaLogic.ts + .test.ts      ← dealHand (4 each + 5 board), nextActiveSeat, resolveShowdown (via evaluateFrom 'omaha')
├─ machine.ts + .test.ts         ← XState: Hold'em-clone (posting_blinds → preflop → flop → turn → river → showdown), 4-card deal
├─ OmahaPage.tsx + .test.tsx     ← orchestrator: wallet bridge + AI driver (uses decideOmaha)
├─ OmahaTable.tsx                ← layout: community board + 4 hole cards
└─ OmahaSeat.tsx + .test.tsx     ← seat rendering 4 hole cards (face-down for AI until showdown)
```

**Top-level:** no `Round.game` change (`'poker'` covers it; `details.variant: 'omaha'`). `PokerVariant` already lists `'omaha'`. No commitlint change. `PokerVariantModal` already renders a greyed "Omaha" card — PR D flips it active + adds the `/play/poker/omaha` route.

**No new ADR.** Fully within established conventions.

---

## 4. Omaha logic + machine

### `omahaLogic.ts` (pure) — mirrors `holdem/holdemLogic.ts`

- `dealHand(seed, numSeats): { holeCards: Card[][]; board: Card[] }` — **4 cards per seat** (round-robin from the seeded deck) + 5 community cards, same burn pattern as Hold'em. Deterministic by seed.
- `nextActiveSeat(seats, from)` — next clockwise active seat (reused/duplicated from Hold'em).
- `resolveShowdown({ board, seats })` → `Record<seatId, awarded>` — identical to Hold'em's **except** each live hand is evaluated via `evaluateFrom(holeCards, board, 'omaha')` (not `evaluateBest5([...hole, ...board])`). `computeSidePots` + split-tie + odd-chip-to-first-winner all reused. Returns the per-seat award map; the page builds `HandResult.revealedHands` carrying each player's 4 hole cards + the omaha-evaluated `HandRank` (so ShowdownReveal can highlight the exact best-5).

### `machine.ts` — near-verbatim clone of `holdem/machine.ts`

- **States:** `idle → posting_blinds → betting (preflop) → advance_street (flop/turn/river) → showdown → award_uncontested → hand_complete → bust_prompt → session_over`. Same as Hold'em.
- **Context:** same shape as Hold'em's `PokerContext` but `SeatState.holeCards` holds **4** cards; `board` holds 5 (revealed by street). Rename types to `OmahaContext` / `OmahaSeatState` for clarity.
- **Init:** XState `input`, same `MachineInput` shape: `{ sessionId, buyIn, tableSize, stakes, aiArchetypes }`.
- **`startHand`:** `omahaLogic.dealHand(seed, tableSize)` → 4 cards each + 5 board; post blinds; first-to-act (heads-up button-is-SB). `street: 'preflop'`. Board stored fully, revealed by `street` like Hold'em.
- **Betting** (closure, blinds, `lastAggressorSeat`/`actedSinceLastRaise`, `AI_ACTION` validation: clamp raise to `[toCall+minRaise, stack]`, over-stack→all-in, illegal-check→call), **street progression**, **side pots**, and **session lifecycle** (REBUY/LEAVE_TABLE/RESEAT_AI/bust_prompt/button rotation/handsPlayed/biggestPotWon): copied **verbatim** from Hold'em, adapted to `OmahaContext`.
- **`showdown`:** `omahaLogic.resolveShowdown({ board, seats })`; build `HandResult` (same shape as Hold'em).
- **Events:** same as Hold'em — `START_HAND`, `PLAYER_ACTION`, `PLAYER_RAISE`, `AI_ACTION`, `REBUY`, `LEAVE_TABLE`, `RESEAT_AI`. (No discard events — Omaha has no draw.)
- **Exports:** `omahaMachine`, `OmahaContext`, `OmahaSeatState`, `HandResult`, `MachineInput`, `OmahaEvent`.

### Determinism

Deck seeded per hand; AI seeded; machine tests feed scripted `AI_ACTION` with fixed seeds. The machine does no async work.

---

## 5. AI — new `decideOmaha`

`_shared/ai/decideOmaha.ts`. Reuses `ARCHETYPES` + the pot-odds gate + raise-sizing + archetype modulation structure from `decide`, but computes Omaha-correct strength. Leaves shipped `decide` (Hold'em + Draw) untouched.

```typescript
export function decideOmaha(ctx: DecisionContext): Decision; // same DecisionContext + Decision types as decide
export function omahaPreflopStrength(holeCards: Card[]): number; // 4-card heuristic, 0-1
export function omahaPostflopStrength(holeCards: Card[], board: Card[]): number; // evaluateFrom 'omaha', 0-1
```

- **`omahaPreflopStrength(4 cards)`** — a heuristic over the 4 hole cards: rewards high pairs, **double-suited** holdings (two suits each appearing twice → two flush draws), **connectedness** (rundowns like 9-8-7-6), and high cards; penalises **danglers** (an unconnected low card) and having **trips/quads in hand** (Omaha blockers — you can only ever use 2 hole cards, so the 3rd/4th of a rank is dead). Normalised 0-1.
- **`omahaPostflopStrength(4 cards, board)`** — `evaluateFrom(holeCards, board, 'omaha')` → normalise `categoryValue` + a draw bonus (Omaha is draw-heavy: nut-flush draws, wraps nudge strength up). Normalised 0-1.
- **`decideOmaha(ctx)`** — branches on `ctx.street`: `'preflop'` → `omahaPreflopStrength(ctx.holeCards)`; otherwise → `omahaPostflopStrength(ctx.holeCards, ctx.board)`. Then runs the **same** archetype modulation as `decide` (vpipThreshold/aggression/bluffFactor/cautiousness, pot-odds fold gate, raise sizing, all-in clamp, seeded `rng`). Never returns an illegal action.
- **No street-mapping trick** (unlike Draw): the page passes the AI's 4 hole cards + the real board + the real `street`, and `decideOmaha` picks the right strength function directly.

---

## 6. UI

Community board + 4 hole cards. Cards reuse `_shared/PlayingCard`.

- **`OmahaSeat.tsx`** (NEW, thin fork of `holdem/Seat`) — renders **4** hole cards (face-down for AI until showdown; yours face-up); otherwise identical to Hold'em's Seat (stack, archetype, dealer/blind markers, acting glow, FOLDED/ALL-IN/BUSTED).
- **`OmahaTable.tsx`** (NEW, thin fork of `holdem/PokerTable`) — same row-based layout; reuses `holdem/CommunityBoard` unchanged; AI `OmahaSeat`s top, your seat (4 cards) + `BettingControls` bottom, `SessionBar` right rail. Wider hole-card slots for 4 cards.
- **Reused by import (no changes):** `holdem/BettingControls`, `holdem/SessionBar`, `holdem/CommunityBoard`, `holdem/stakesConfig`; `_shared/PlayingCard`, `_shared/PokerVariantModal`. `holdem/ShowdownReveal` reused if it renders `handResult.revealedHands` generically (4-card hands + the omaha best-5 highlight); thin-forked into `omaha/` only if it hardcodes 2 hole cards. `SetupPanel` reused with an "Omaha Hold'em" label (thin fork for the heading).
- **`OmahaPage.tsx`** (NEW) — same orchestrator as `HoldemPage`: session-keyed sub-component mounting `omahaMachine` after `placeBet` resolves; wallet bridge (SIT DOWN / REBUY / LEAVE → `settleRound` with `details.variant: 'omaha'`); AI driver `useEffect` calling **`decideOmaha`** with the real `street` + 4 hole cards + board after a seeded thinking delay (`useReducedMotion` → ~0); `START_HAND` / `RESEAT_AI` loops; `beforeunload` best-effort settle. Seed a `mulberry32` per session for AI jitter / reseat (no `Math.random`).

---

## 7. Persistence + integration

- **One `rounds` row per session** (ADR-0041): `game: 'poker'`, `stake: totalBoughtIn`, `payout: finalStack`, `won: finalStack > totalBoughtIn`, `details: { variant: 'omaha', tableSize, stakes, handsPlayed, rebuys, biggestPotWon, sessionId }`.
- **Stats/leaderboard** already aggregate `poker` generically — no aggregation or label changes.
- **`PokerVariantModal`** — flip the existing greyed "Omaha" card to active → `navigate('/play/poker/omaha')`. After this, all three poker variants are active.
- **Routes** — add `/play/poker/omaha` (lazy). `/play/poker` modal host already exists.
- No sidebar/cabinet change (the Poker cabinet already opens the variant modal).

---

## 8. Testing

- **PR A — `decideOmaha` (~25) + `omahaLogic` (~12):**
  - `omahaPreflopStrength`: double-suited connected high cards (e.g. A♠A♥K♠Q♥) > a random unconnected hand; danglers penalised; trips-in-hand penalised vs the same two cards without the dead third.
  - `omahaPostflopStrength`: uses the omaha rule — a hand that would be strong only if 3+ hole cards could be used scores low (e.g. four-of-a-kind in hand is weak); a hand strong under exactly-2+3 scores high.
  - `decideOmaha`: legality (no illegal check / over-stack raise); archetype tendencies (maniac raises more than rock); deterministic per seed; uses preflop vs postflop strength per `street`.
  - `omahaLogic.dealHand`: 4-each + 5 board, all distinct, deterministic. `resolveShowdown`: awards via the exactly-2+3 rule — include a seeded case where the Hold'em-rules winner and the Omaha-rules winner differ; side pots; split.
- **PR B — machine (~45, clone of Hold'em's):** blind posting incl. heads-up button-is-SB; street progression; betting closure (check-around / raise-reraise-call / all-fold); all-in side pots; showdown via omaha; uncontested win; button rotation; bust → bust_prompt; rebuy; leave → session_over. Seeded decks + scripted `AI_ACTION`.
- **PR C — UI (~35):** OmahaSeat renders 4 hole cards (face-down for AI); OmahaTable shows board + 4 hole cards; OmahaPage e2e (fake-indexeddb + wallet hydration + seeded deck + `useReducedMotion` mocked): sit → preflop bet → flop → turn → river → showdown → leave → assert a `rounds` row with `game: 'poker'`, `details.variant: 'omaha'`, `stake === totalBoughtIn`, `payout === finalStack`; assert the showdown used the omaha 2+3 rule (seeded hand where Hold'em vs Omaha winners differ).

**Infra:** seeded `deckFromSeed`; scripted machine events (machine never calls `decideOmaha`); `useReducedMotion` mocked true; fake-indexeddb + wallet hydration for the e2e.

---

## 9. Out of scope

→ append to `masquer-deferred-features`:

- **Pot-Limit betting** (the authentic PLO structure — we chose No-Limit for consistency).
- 5-card / 6-card Omaha.
- Omaha Hi-Lo (split pot for qualifying low hands).
- Equity-aware (simulate-the-runout) AI.
- Sound effects.
- Admin tunability of AI archetypes / stakes (shared candidate across all poker).

---

## 10. Rollout

Four PRs, branches `phase-13c-omaha-pr-{a..d}`:

- **PR A** — `_shared/ai/decideOmaha` + `omaha/omahaLogic` + tests. Pure.
- **PR B** — `omaha/machine` (Hold'em clone with 4-card deal + omaha showdown) + tests + placeholder `OmahaPage` + `/play/poker/omaha` route.
- **PR C** — UI: `OmahaSeat` (4 cards), `OmahaTable` + full `OmahaPage` (wallet + AI driver via `decideOmaha`) + reused Hold'em controls. Playable via direct URL.
- **PR D** — flip the Omaha variant-modal card to active + BUILD_GUIDE §10.8 update + tag `v0.13c-omaha` + GitHub Release + memory snapshot. **Completes the poker trio.**

**No new ADR.** Hold'em + Draw code are not modified.

---

## 11. Open questions

None at spec time. The Omaha hand-evaluation rule (`evaluateFrom(..., 'omaha')`) already exists and is tested. The one new design judgement — the 4-card `omahaPreflopStrength` heuristic — has its shape specified in §5; the implementer may tune the exact weights in PR A so long as the ordering invariants (double-suited-connected > danglers; trips-in-hand penalised) hold.
