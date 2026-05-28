# Phase 6 — Baccarat (design spec)

**Status:** Approved 2026-05-18.
**Owner:** Developer.
**Implements:** BUILD_GUIDE §8.4.
**Related:** ADR-0016 (every round writes one row via wallet.settleRound), ADR-0028 (multi-handle wallet pattern), ADR-0033 (tiered win celebration).

## 1. Goal

Ship a fully playable Baccarat table with all three main bets plus six common side bets, a persistent 8-deck shoe with cut card, the canonical big-road scoreboard, and a theatrical card-reveal sequence — end-to-end, tagged `v0.7-baccarat`.

## 2. In scope

- Player / Banker / Tie main bets.
- Side bets: Player Pair, Banker Pair, Big, Small, Player Dragon, Banker Dragon. Nine bet zones total.
- Authentic third-card drawing tableau (the fixed Baccarat table) implemented in `logic.ts` with exhaustive unit tests.
- Persistent 8-deck shoe with cut card and reshuffle, plus a visible shoe-depth indicator.
- Theatrical card reveal: corner-peek then slow flip, ~600ms per card, ~5–6s per round. Reduced-motion fallback: instant.
- Tier-mapped celebration (reuses ADR-0033 from Slots).
- Bead plate + big road scoreboard replacing the default RecentResults rail for this game.
- XState v5 round state machine, deferred multi-handle wallet placement (matches Roulette pattern).

## 3. Out of scope

- Squeeze / Dragon Tail / Mini-Baccarat / EZ Baccarat variants.
- Side bets beyond the six listed: no Royal 9, no Lucky 6, no Panda 8.
- Derived scoreboard roads (Big Eye Boy, Small Road, Cockroach Road). Just bead plate + big road.
- Live multiplayer / multi-seat / shared-table feel.
- Card-counting tooltips or "edge sorting" indicators.
- Custom shoe configuration (deck count, cut depth) — fixed at 8 decks and a randomly-placed cut card.

## 4. Rules

### 4.1 Card values

- Ace = 1.
- 2 through 9 = face value.
- 10, J, Q, K = 0.
- Hand total = **ones digit** of the sum (e.g. 7 + 8 = 15 → total 5).

### 4.2 Dealing sequence

1. Deal Player card 1.
2. Deal Banker card 1.
3. Deal Player card 2.
4. Deal Banker card 2.
5. Compute initial totals.
6. **If either side is "natural" (8 or 9):** round ends immediately. No third card for anyone.
7. Otherwise apply the third-card tableau (§4.3).

### 4.3 Third-card drawing tableau (canonical)

**Player third-card rule (decided first):**

- Player draws a third card iff Player's two-card total is 0, 1, 2, 3, 4, or 5.
- Player stands iff Player's two-card total is 6 or 7.
- (Natural 8 or 9 was already handled in §4.2 step 6.)

**Banker third-card rule (decided after Player's action is known):**

| Banker total (2 cards) | If Player did NOT draw a third (stood on 6/7) | If Player drew a third card with value:   |
| ---------------------- | --------------------------------------------- | ----------------------------------------- |
| 0, 1, 2                | Draw                                          | Draw                                      |
| 3                      | Draw                                          | Draw on all except Player's third = 8     |
| 4                      | Draw                                          | Draw on Player's third = 2, 3, 4, 5, 6, 7 |
| 5                      | Stand                                         | Draw on Player's third = 4, 5, 6, 7       |
| 6                      | Stand                                         | Draw on Player's third = 6 or 7           |
| 7                      | Stand                                         | Stand                                     |

(Naturals are pre-empted in §4.2.)

The third-card value table above is the **canonical Baccarat tableau** — implement it exactly. Tests pin every (banker_total, player_third) cell.

### 4.4 Resolving the round

- Whichever side has the higher final total wins.
- Equal totals = Tie.
- **Player win** pays Player bets 1:1. Banker bets lose. Tie bets lose.
- **Banker win** pays Banker bets `1:1 − 5% commission` (commission = `floor(winnings * 0.05)`). Player bets lose. Tie bets lose.
- **Tie** pays Tie bets 8:1. Player and Banker bets **push** (returned unchanged).

### 4.5 Side bets

- **Player Pair / Banker Pair (11:1)** — fires when that side's first two cards are the same rank (e.g. two 7s, or 10♣+J♦? **No** — pairs are rank-only, so 10 and J do NOT pair). Independent of who wins.
- **Big (`floor(bet * 0.54)`:1)** — wins when a total of 5 or 6 cards are drawn (either side drew a third).
- **Small (`floor(bet * 1.5)`:1)** — wins when exactly 4 cards are drawn (neither side drew a third).
- **Player Dragon / Banker Dragon** — pays on the winning side based on margin of victory. The losing side's Dragon loses. On a tie, both Dragons push.

  | Win condition (for that side)                                        | Payout |
  | -------------------------------------------------------------------- | ------ |
  | Natural (2-card 8 or 9) winning                                      | 1:1    |
  | Non-natural win by 4                                                 | 1:1    |
  | Non-natural win by 5                                                 | 2:1    |
  | Non-natural win by 6                                                 | 4:1    |
  | Non-natural win by 7                                                 | 6:1    |
  | Non-natural win by 8                                                 | 10:1   |
  | Non-natural win by 9                                                 | 30:1   |
  | Non-natural win by 1, 2, 3                                           | LOSS   |
  | Natural tie (both sides natural 8 or 9)                              | PUSH   |
  | Win by less than 4 with a natural beats non-natural? See note below. |        |

  Note: "Natural" refers to the winning side having an unaided 8 or 9. If both sides go natural and tie, the Dragon pushes (returned). Otherwise the loser's Dragon loses.

## 5. Shoe model

- 8 decks of 52 cards (416 cards total) shuffled with `src/systems/rng.ts`.
- A cut card is randomly inserted between position 14 and 28 from the end of the shoe (uniform random — exact range to be pinned in `logic.ts`).
- Each round draws cards from the front of the shoe.
- After a round completes, if the cut card has been passed, the next round will reshuffle a fresh 8-deck shoe (one-round delay matches casino practice).
- A small shoe-depth UI element shows ~"125 cards left" (or similar) and switches to a "CUT — reshuffling next round" banner once the cut card is passed.
- After a fresh reshuffle, a brief "FRESH SHOE" banner shows for ~1s.

## 6. Bet limits

| Zone          | Min | Max  |
| ------------- | --- | ---- |
| Player        | 5   | 2000 |
| Banker        | 5   | 2000 |
| Tie           | 5   | 2000 |
| Player Pair   | 5   | 1000 |
| Banker Pair   | 5   | 1000 |
| Big           | 5   | 1000 |
| Small         | 5   | 1000 |
| Player Dragon | 5   | 1000 |
| Banker Dragon | 5   | 1000 |

Player can place chips on any combination of zones (none, some, or all nine). Sum of all bets must be ≤ current balance at DEAL time.

## 7. Round flow

```
[betting] ─DEAL→ [dealing P1/B1/P2/B2 + theatrical reveal] ─naturals?→
   ├─yes─→ [settling] ─→ [showing result 2s] ─→ [betting]
   └─no──→ [player third?] ─yes→ [reveal P3] ─→ [banker third?]
                              └─no→ [banker third?]
                                       ├─yes─→ [reveal B3] ─→ [settling] …
                                       └─no──→ [settling] …
```

### 7.1 Bet placement model

**Deferred** (matches Roulette pattern):

1. Player clicks chips onto zones during the `betting` state. Chips appear on the felt; balance is **not yet** debited.
2. When player clicks DEAL, the machine fires a single `PLACE_ALL_BETS` event that calls `walletStore.placeBet` once per non-empty zone (N handles total).
3. If any `placeBet` rejects (insufficient funds — should be impossible because we check sum first, but defensive), the machine reverses any already-placed handles via `walletStore.refundBet`-style push (the same pattern used in Roulette PR #94 for partial-spin-abort) and stays in `betting`.
4. On successful placement, transitions to `dealing`.

### 7.2 Card reveal pacing (theatrical)

| Step                         | Duration | Notes                                              |
| ---------------------------- | -------- | -------------------------------------------------- |
| Card slides in face-down     | 200ms    | Slight rotation on entry                           |
| Corner peek                  | 150ms    | A small triangle of the card's face shows          |
| Full flip                    | 250ms    | Standard 3D flip via Framer Motion                 |
| Pause before next card       | 150ms    | Lets the player read each card                     |
| Pause before computing total | 400ms    | After the 4th card                                 |
| Pause before third cards     | 800ms    | If applicable; "DRAW" pill animates in on the side |

Total round (no third cards, 4-card naturals path): ~3.0s.
Total round (with third cards on both sides): ~5.0s.

**Reduced-motion fallback:** all cards appear instantly face-up. Totals shown immediately. Banner shows for 1s before next betting state.

### 7.3 State machine outline

```
states:
  betting        // player places chips
  placingBets    // PLACE_ALL_BETS fires; walletStore.placeBet x N
  dealing        // initial 4-card reveal sequence (theatrical)
  evaluatingPair // computes pair / natural — pure-logic, instant
  playerThird    // reveals Player's third card if drawn
  bankerThird    // reveals Banker's third card if drawn
  settling       // walletStore.settleRound called once with aggregated result
  showingResult  // outcome banner + celebration tier; 2s timeout
context:
  bets: { player, banker, tie, playerPair, bankerPair, big, small, playerDragon, bankerDragon } — chip amounts (default 0)
  betHandleIds: { ...same shape, optional string }
  shoe: ShoeState
  hands: { player: Card[], banker: Card[] }
  roundResult: RoundResult | null
  roundCount: number  // for BettingPanel key remount, see Slots pattern
```

`betting → placingBets`: triggered by `DEAL` event when total bet sum > 0.
`placingBets → betting`: on any placeBet rejection (refund handles already placed).
`placingBets → dealing`: on successful placement of all handles.
`dealing → evaluatingPair`: after all 4 reveal animations resolve.
`evaluatingPair → settling` if natural; else `evaluatingPair → playerThird`.
`playerThird → bankerThird`: always (either reveals a card or no-op).
`bankerThird → settling`: always.
`settling → showingResult`: synchronous.
`showingResult → betting`: after 2s timeout. Auto-clears losing-zone chips; leaves winning-zone chips on the felt.

## 8. Table layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header (← lobby · 🎴 BACCARAT · 8-deck shoe · 1k chips)    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐                                ┌─────────┐ │
│ │  PLAYER · 6 │  ┌────────────┐  ┌────────────┐│  bead   │ │
│ │             │  │   ♣ 9      │  │   ♦ 7      ││  plate  │ │
│ │             │  │            │  │            ││ + big   │ │
│ │             │  └────────────┘  └────────────┘│  road   │ │
│ └─────────────┘                                │         │ │
│ ┌─────────────┐                                │         │ │
│ │ BANKER · 5  │  ┌────────────┐  ┌────────────┐│         │ │
│ │             │  │   ♠ K      │  │   ♥ 5      ││         │ │
│ │             │  │            │  │            ││         │ │
│ │             │  └────────────┘  └────────────┘│         │ │
│ └─────────────┘                                └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────────┐ ┌──────────┐                 │
│ │  P PAIR  │ │  BIG / SMALL │ │  B PAIR  │   (pairs row)   │
│ │   11:1   │ │ 0.54:1/1.5:1 │ │   11:1   │                 │
│ └──────────┘ └──────────────┘ └──────────┘                 │
│ ┌────────────┐ ┌──────────┐ ┌────────────┐                 │
│ │   PLAYER   │ │   TIE    │ │   BANKER   │   (main row)    │
│ │    1:1     │ │   8:1    │ │  1:1 −5%   │                 │
│ └────────────┘ └──────────┘ └────────────┘                 │
│ ┌─────────────────┐         ┌─────────────────┐             │
│ │   P DRAGON      │         │   B DRAGON      │ (dragon row)│
│ │   up to 30:1    │         │   up to 30:1    │             │
│ └─────────────────┘         └─────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│  BETTING PANEL (chip denoms + balance + DEAL button + shoe) │
└─────────────────────────────────────────────────────────────┘
```

- The "Big/Small" zone in the pairs-row middle is actually a **single component** that splits into two halves visually (left = Small, right = Big). Clicking on the half places a chip on that specific side. This keeps the symmetric layout without forcing two narrow zones.
- Card area sits at the top with Player on the left, Banker on the right. Cards reuse Phase 3's `Card` component (Times-serif pip + neon glow + gold inset border).
- Bead plate + big road replace the standard `RecentResults` rail on the right side. Both grids are scrollable horizontally if they overflow.
- The bottom BettingPanel slot also hosts a small "Shoe: 125 cards · cut in 12" indicator.

## 9. Scoreboard

### 9.1 Bead plate

Standard 6-row × N-column grid; each round drops a colored dot into the next cell, column-first then wrapping to the next column.

| Color | Outcome    |
| ----- | ---------- |
| Red   | Player win |
| Blue  | Banker win |
| Green | Tie        |

Marks (decorations on the bead):

- Small red dot in upper-left corner = Player Pair fired.
- Small blue dot in upper-right corner = Banker Pair fired.

### 9.2 Big road

Standard Baccarat big-road: 6-row × N-column grid. The pen "walks":

- Each new outcome of the **same type** as the previous (Player/Banker) drops down one cell in the same column.
- A change of outcome moves to the **top of the next column**.
- A Tie does NOT start a new column — it overlays a small green diagonal slash on the most recent cell.
- Multiple Ties stack as a number in the corner of that cell.

`getBigRoad(rounds: Round[]) → BigRoadCell[][]` is a pure function in `src/games/baccarat/logic.ts`, fully unit-tested.

### 9.3 Capacity

Both grids cap at the last 60 rounds (10 visible columns of 6 in big road; horizontal scroll for older). Anything older drops off silently.

## 10. Celebration tiers

Reuses ADR-0033 (`winTierOf`-style mapping).

| Win type                                  | Tier      | Visual                                             |
| ----------------------------------------- | --------- | -------------------------------------------------- |
| Loss                                      | `none`    | banner only                                        |
| Player or Banker win (no pair, no dragon) | `small`   | banner + soft gold glow on winning hand            |
| Tie win OR Pair fires OR Natural 9        | `medium`  | golden burst                                       |
| Dragon Bonus 30:1 (margin-of-9 win)       | `jackpot` | magenta tint + coin shower (matches Slots jackpot) |

Tier is the **highest** firing tier across all winning bets in the round.

## 11. Architecture & file map

New files:

```
src/games/baccarat/
├─ BaccaratPage.tsx              # Wires everything; mounts XState
├─ logic.ts                      # Pure: shoe ops, hand totals, third-card tableau, payouts
├─ logic.test.ts                 # Exhaustive tests
├─ machine.ts                    # XState v5 round machine
├─ machine.test.ts               # Machine state-transition tests
├─ types.ts                      # Card, Hand, ShoeState, Bet, RoundResult, BigRoadCell
├─ config.ts                     # MIN/MAX bet maps, payout ratios, reveal timing
├─ CardView.tsx                  # Reuses Phase 3 visual; adds corner-peek + flip animations
├─ HandView.tsx                  # Player / Banker hand container
├─ BetZone.tsx                   # Generic zone — chip stack overlay + click-to-bet
├─ BetArea.tsx                   # Composes the 9 zones into the layout from §8
├─ BigSmallZone.tsx              # Special split-half zone
├─ ShoeIndicator.tsx             # "125 cards · cut in 12"
├─ BeadPlate.tsx                 # Scoreboard grid 1
├─ BigRoad.tsx                   # Scoreboard grid 2
├─ Scoreboard.tsx                # Composes both above
├─ WinCelebration.tsx            # Tier-mapped overlay (mirrors Slots WinCelebration)
└─ symbols.ts                    # Suit + rank constants (or reuse Phase 3 if available)
```

Modified:

- `src/router.tsx` — replace the `StubGamePage game="baccarat" phase={6}` stub with `<BaccaratPage />`.
- `src/pages/LobbyPage.tsx` — flip the Baccarat card from "coming soon" to playable, if it isn't already.
- `BUILD_GUIDE.md` §12 — mark Phase 6 ✅ (in PR F of this phase).
- `commitlint.config.js` — add `baccarat` scope if it isn't already in the allowlist (check during PR A).

## 12. Tests

### 12.1 logic.ts (full coverage required, ≥ 90% lines)

- `handTotal()` — every two-card combination (52 × 52) yields the right ones-digit total. Spot-check the 7+8=15→5 case.
- `isPair()` — same rank yields true; same-value-different-rank (10 + J) yields false; same suit different rank false.
- `playerDrawsThird(playerTotal)` — true for 0–5, false for 6–7. Naturals handled upstream.
- `bankerDrawsThird(bankerTotal, playerThird?)` — pin every cell of the §4.3 table. 7 banker totals × (player_third absent + 10 possible player_third values) = 77 cells. All explicit.
- `resolveRound()` — given two hands, returns winner + margin + which side(s) have naturals + which side(s) have pairs.
- `computePayouts()` — given bets + round result, returns the integer chip change for every zone, with banker commission floor-rounded, Big/Small floor-rounded, Dragon ladder applied.
- Shoe ops: `shuffleShoe(rng)` returns a 416-element array; `drawFromShoe(shoe)` returns a card + next shoe; `cutCardPassed(shoe, initialSize)` returns boolean; tests cover happy path + shoe-exhausted edge cases.
- `getBigRoad(rounds)` — walked-pen behavior: same-outcome drops down; change starts new column; Tie overlays slash on current cell; multiple ties stack count. Test a known sequence vs an expected grid.

### 12.2 machine.test.ts

- All happy paths: 4-card natural; 4-card non-natural with no thirds; 5-card (Player draws); 5-card (Banker draws); 6-card (both draw).
- DEAL with zero total bet is a no-op.
- DEAL with sum > balance is rejected (refund-via-push behavior asserted).
- Reduced-motion mode skips the staggered reveal: `dealing` resolves immediately.

### 12.3 BaccaratPage integration test (RTL + fake-indexeddb)

- Register a user, mount the page, place bets on Player + Banker Pair + Tie, press DEAL, wait for round to resolve, assert: balance debited then settled correctly; one `rounds` row written with `game: 'baccarat'` and `details` containing both hands + per-zone payouts.
- Snapshot the bead plate + big road after 5 known rounds.

### 12.4 BUILD_GUIDE / DoD per PR

Each PR runs `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` clean.

## 13. ADRs to write

- **ADR-0036 — Baccarat third-card tableau (canonical implementation choice)** — document that we implement the exact standard tableau, why we chose not to support alternate variants (EZ Baccarat, etc.), and the integer-rounding rules for banker commission and Big/Small.
- **ADR-0037 — Persistent 8-deck shoe with cut card** — document the shoe model, cut-card placement range, and the one-round delay between cut-pass and reshuffle. Justify why we didn't go infinite-deck despite the negligible counting effect.

## 14. PR sequencing (6 PRs)

Mirrors Phase 4 / Phase 9 structure: each PR ships a vertical slice, branches off `main`, opens, CI greens, merges, branches next off the freshly-merged `main`.

| PR  | Branch                                 | Scope                                                                                                                                           |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `phase-6-baccarat-pr-a-logic`          | `logic.ts` + `logic.test.ts` + `types.ts` + `config.ts`. Third-card tableau exhaustively tested. ADR-0036, ADR-0037. Commitlint `baccarat`.     |
| B   | `phase-6-baccarat-pr-b-shoe-machine`   | Shoe ops in logic; XState machine + machine.test.ts. No UI.                                                                                     |
| C   | `phase-6-baccarat-pr-c-card-area`      | `CardView` (corner-peek + flip), `HandView`, dealing reveal animation. Static test page or storybook stub.                                      |
| D   | `phase-6-baccarat-pr-d-bet-area`       | `BetZone`, `BigSmallZone`, `BetArea`, `ShoeIndicator`. Chips clickable. No machine integration yet.                                             |
| E   | `phase-6-baccarat-pr-e-page-and-board` | `BaccaratPage` mounting machine + bet area + card area; `BeadPlate`, `BigRoad`, `Scoreboard`; `WinCelebration`; integration test. Wires router. |
| F   | `chore/release-v0.7-baccarat`          | BUILD_GUIDE §12 ✅; tag `v0.7-baccarat`; GitHub Release.                                                                                        |

Estimated total tasks: ~50.

## 15. Definition of done (phase-level)

After PR E merges, before PR F is opened:

- Manual smoke (in `pnpm dev`):
  - Register a user; verify Baccarat is now playable in the lobby.
  - Place 5 chips on each of the 9 zones. Total bet: 45 chips. Press DEAL.
  - Cards reveal theatrically. Outcome banner shows. Balance settled correctly.
  - Repeat 10+ rounds. Verify bead plate and big road populate correctly.
  - Watch for a cut-card crossing — shoe-depth indicator switches to "CUT — reshuffling next round". Next round shows "FRESH SHOE" banner briefly.
  - Place a 1000-chip bet on Banker; verify commission applied correctly on win (`floor(1000 * 0.05) = 50` chips taken, net win `950`).
  - Place a Dragon bet and observe a margin-of-9 win — magenta jackpot celebration fires.
  - Toggle reduced motion (OS setting). Verify cards appear instantly and animations are suppressed.
- All 4 CI checks green on PRs A through E.
- ~50 new tests passing.
- Bundle: main bundle delta < 30 kB. Baccarat-specific code lives entirely under `src/games/baccarat/`.

## 16. Risks

- **Third-card tableau bugs** — the table is small but the logic is dense. Mitigation: exhaustive cell-by-cell tests in `logic.test.ts` BEFORE building any UI.
- **Big-road rendering off-by-one** — the walked-pen logic for the big road has a few subtle wrap-on-tie / wrap-on-stack cases. Mitigation: snapshot tests against known sequences from canonical Baccarat-history examples.
- **Theatrical reveal feels slow with many bets settled** — once players have a feel, 5–6 seconds per round can feel sluggish. Mitigation: ship the spec timing first; if it feels slow in manual smoke, tune the pauses (don't redesign the model).
- **Commission rounding surprises** — `floor(winnings * 0.05)` favors the player on small bets. Possible "why didn't I lose any commission?" confusion. Mitigation: small "(commission: 0 chips)" label on settlement when applicable.
- **Pair definition (rank vs face-value)** — 10/J/Q/K all have face value 0 but only pair when they share rank. Easy bug. Mitigation: explicit test cases in `logic.test.ts` for the "10 + J ≠ pair" case.
- **Shoe state ↔ persistence** — the shoe lives in machine context, not Dexie. Tab reload starts a fresh shoe. This is acceptable for local play-money but documented.

## 17. Open questions

None remaining at design time. (If any surface during implementation, raise inline rather than silently picking.)
