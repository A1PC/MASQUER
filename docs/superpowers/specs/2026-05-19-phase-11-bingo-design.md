# Phase 11 — Bingo (design spec)

> Single-source design for 90-ball British bingo at `/play/bingo`. Hand to writing-plans next.

## 1. Goal

Add a 90-ball British bingo game at `/play/bingo` as a peer to the existing table games. Per-round single-player; the user buys 1–4 cards, picks a call speed, and watches numbers get called (auto-daub by default, manual toggle available at any time including mid-game). Each card can independently hit three escalating win tiers (1-line / 2-line / full house), with a bonus payout for a fast full house (≤40 balls).

## 2. In scope

- `src/games/bingo/` — fits the games sandbox (per-round single-player, settles via `wallet.settleRound` like blackjack/roulette/slots/baccarat). NOT in `src/systems/` — that pattern is reserved for event-driven content like the lottery (ADR-0040).
- 90-ball British card generation (3×9 grid, 15 filled cells per card, column-banded number ranges)
- Call sequence generation (90 distinct balls in random order, seeded per game)
- Win evaluator (1-line / 2-line / full house, with fast-FH bonus)
- XState v5 machine for game phases (setup → playing → settling → done)
- Multi-card play (up to 4 cards per game)
- Auto-daub default + always-available manual toggle (switchable mid-game)
- Configurable call speed (Slow 3s / Normal 2s / Fast 1s, default Normal)
- Animated win banners per tier per card, with `prefers-reduced-motion` short-circuit
- `Round.game` union extended with `'bingo'`; `bingo` added to the commitlint scope-enum
- Sidebar `🎯 Bingo` entry; CabinetCarousel gains a Bingo cabinet
- `/stats` and `/leaderboard` integration via the `rounds`-row write (GAME_LABELS / TITLES / StatsLeftRail add a Bingo entry — same plumbing as lottery in Phase 10 PR E)

## 3. Out of scope

Moved to `[[localgamble-deferred-features]]` memory for re-evaluation before Phase 15 Polish.

- Multiplayer / shared-call games across local users
- Power-ups / lucky charms / bonus mechanics beyond fast-FH
- Themed cards (holiday variants, seasonal art)
- Sound effects (default Phase 15 polish pass)
- Simulated "other players" (would be fake; degrades trust in payouts)
- Card auto-shuffling between games / persistent "lucky card" save
- Achievements / milestones (separate phase or polish item)

## 4. Game mechanics

### 4.1 Card layout (90-ball British)

Each card is a 3-row × 9-column grid with exactly **15 filled cells** (5 per row, 4 blanks per row). The 5 numbers in each row are randomly assigned positions among the 9 columns.

**Column number ranges:**

| Column | Number range | Pool size |
| ------ | ------------ | --------- |
| 1      | 1–9          | 9         |
| 2      | 10–19        | 10        |
| 3      | 20–29        | 10        |
| 4      | 30–39        | 10        |
| 5      | 40–49        | 10        |
| 6      | 50–59        | 10        |
| 7      | 60–69        | 10        |
| 8      | 70–79        | 10        |
| 9      | 80–90        | 11        |

Total pool: 90. Each card uses 15 numbers (one column may legitimately have 0 numbers per card — distribution is random subject to "exactly 5 per row").

Numbers within each column are sorted ascending top-to-bottom.

Card generation seeded per `cardId` (UUID at purchase time). Determinism enables snapshot tests on card layouts.

### 4.2 Call sequence

90 balls (numbers 1–90) drawn in random order without replacement using the project's `mulberry32` PRNG seeded by `gameId`. The full sequence is generated up front; the UI reveals one ball at a time on the configured cadence.

### 4.3 Win tiers (per card)

Each card can independently achieve all three tiers in a single game:

| Tier           | Condition                                  | Trigger timing                                  |
| -------------- | ------------------------------------------ | ----------------------------------------------- |
| **1-line**     | Any one row fully daubed (5 of 5)          | Fires on the call that completes the first row  |
| **2-line**     | Any two rows fully daubed                  | Fires on the call that completes the second row |
| **Full house** | All three rows fully daubed (all 15 cells) | Fires on the call that completes the third row  |

**Fast full house bonus**: if FH is achieved on or before the **40th** call (`callIndex <= 39` with 0-indexed counting, or the 40th ball overall), the full-house payout is replaced with the fast-FH bonus value. Otherwise the regular FH payout applies.

Win evaluation is **per-card per-call**: after each call, every active card is re-evaluated for any newly achieved tier. A card that has already hit 1-line cannot hit 1-line again (it cumulatively progresses 1→2→FH).

### 4.4 Game end

The game ends the moment **any** active card hits full house. Other cards keep whatever tiers they had already achieved up to that call. Settlement aggregates payouts across all cards.

In the impossible-in-practice case where 90 balls are all called without any card hitting FH: that can only happen if a card has fewer than 15 numbers, which the card generator forbids. Defensive guard: if all 90 balls are called and no FH, settle with whatever wins were earned (no FH payout on any card).

### 4.5 Pricing + payouts

| Item                         | Chips  |
| ---------------------------- | ------ |
| Card cost                    | **50** |
| 1-line                       | 75     |
| 2-line                       | 250    |
| Full house (regular)         | 1,500  |
| Full house (fast, ≤40 balls) | 5,000  |

Up to **4 cards per game** (capped only by wallet balance; soft UI cap at 4). Buy cost = `cardCount × 50`. Each card settles independently; final game payout = sum of all tier payouts across all cards.

**RTP**: roughly 80% on the standard tiers. The fast-FH bonus is rare (~1 in 2,500 games) and pulls realized RTP slightly above that for sessions where it lands.

## 5. Daub mechanic

- **Default mode**: **auto-daub** — numbers mark themselves the instant they're called
- **Manual mode**: numbers do NOT auto-daub when called; the player must click the called cell to daub it. **No time pressure** — clicking happens any time the cell is visible.
- **Toggle**: a "Daub: Auto / Manual" toggle is always visible on the play screen. The user can switch **at any time, including mid-game**.
- **Switching to manual mid-game**: numbers that were already auto-daubed stay daubed. From the toggle moment forward, new calls require manual click.
- **Switching to auto mid-game**: any called-but-un-daubed cells are immediately daubed. New calls auto-daub as normal.
- **Win evaluation always uses the actual daub state** — manual mode players who fail to click in time will not get the win for that tier (they'd need to click before another card's FH ends the game). Win attribution is fair to whatever the daub state is at game-end.

## 6. UX

### 6.1 Setup screen

- **Number of cards** picker: 1 / 2 / 3 / 4 (radio-style)
- **Speed** picker: Slow (3s) / Normal (2s) / Fast (1s) — Normal default
- **Cost preview**: "Total: {N × 50} chips"
- **Balance** display (read-only): "Balance: {chips}"
- **BUY & START** CTA, disabled if balance < cost; tooltip shows reason
- Cancel / Back to lobby button

### 6.2 Play screen layout

```
┌─────────────────────────────────────────┐
│ Header: BINGO · {ball N of 90} · [DAUB:AUTO|MANUAL] │
├─────────────────────────────────────────┤
│ Current ball: BIG ball graphic + N      │
│ Recent calls strip: last 10 balls       │
├─────────────────────────────────────────┤
│ Cards grid (1-4 cards side-by-side)     │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│ │ C1  │ │ C2  │ │ C3  │ │ C4  │         │
│ └─────┘ └─────┘ └─────┘ └─────┘         │
├─────────────────────────────────────────┤
│ Per-card tier indicators (LINE/2-LINE/FH) │
└─────────────────────────────────────────┘
```

- Cards are responsive: 1 card centered; 2-4 cards in a flex/grid layout that fits the viewport
- Daubed cells: gold fill + larger weight number
- Un-daubed called cells in manual mode: pulse with a subtle gold border to indicate "click me"
- Each card has a small tier indicator showing achieved milestones (e.g., `LINE ✓ · 2-LINE — · BINGO —`)

### 6.3 Win banners

When a card hits a tier, an animated banner overlays the card briefly:

- **LINE!** (gold, ~1s)
- **DOUBLE LINE!** (gold + chip-win green, ~1.2s)
- **BINGO!** (full-screen tier celebration — coin shower like Phase 5's slots jackpot; ~2s)
- **FAST BINGO!** (same as BINGO but with neon-magenta tint and longer particle duration; ~2.5s)

`prefers-reduced-motion`: replace all animations with a static banner that fades in/out at 0.2s. Coin shower omitted.

### 6.4 End screen

- Per-card breakdown: card thumbnail + achieved tiers + payout for that card
- Aggregate: "Total won: X chips"
- "Play again" → resets to setup screen
- "Back to lobby" link

## 7. Architecture

### 7.1 Module map

```
src/games/bingo/
├─ logic.ts                     # Pure: generateCard, drawCallSequence, evaluateCard, payoutFor
├─ logic.test.ts
├─ machine.ts                   # XState v5: setup → playing → settling → done
├─ machine.test.ts
├─ BingoPage.tsx                # Shell, wires machine + components
├─ BingoPage.test.tsx
├─ SetupPanel.tsx               # Pre-game card-count + speed picker
├─ SetupPanel.test.tsx
├─ BingoCard.tsx                # Single card render with daub state + tier indicator
├─ BingoCard.test.tsx
├─ CallBoard.tsx                # Current ball + recent-calls strip
├─ CallBoard.test.tsx
├─ DaubToggle.tsx               # Auto/Manual switch
├─ DaubToggle.test.tsx
├─ WinBanner.tsx                # Per-tier animated banner
├─ WinBanner.test.tsx
├─ EndScreen.tsx                # Per-card breakdown + aggregate + play again
├─ EndScreen.test.tsx
└─ useBingoBallCaller.ts        # Interval timer hook driving the call sequence; reads speed from machine

src/db/schema.ts                # Round.game gains 'bingo'
commitlint.config.js            # scope-enum gains 'bingo'
src/router.tsx                  # /play/bingo lazy route (matches other games)
src/components/Sidebar.tsx      # 🎯 Bingo NavLink (title case)
src/pages/lobby/CabinetCarousel.tsx # Bingo cabinet added
src/pages/stats/StatsLeftRail.tsx   # Bingo tab
src/pages/stats/StatsPage.tsx       # TITLES gains 'bingo'
src/pages/stats/StatsPerGamePage.tsx # GAME_LABELS gains 'bingo'
src/pages/leaderboard/LeaderboardPage.tsx       # TITLES gains 'bingo'
src/pages/leaderboard/LeaderboardPerGamePage.tsx # GAME_LABELS gains 'bingo'
BUILD_GUIDE.md                  # Phase 11 row
```

### 7.2 logic.ts surface

```ts
import type { Round } from '@/db';

export type BingoCell = {
  /** Number 1-90, or null for a blank cell. */
  value: number | null;
};

export type BingoCard = {
  id: string;
  /** 3 rows × 9 columns. */
  cells: BingoCell[][];
};

export type BingoTier = '1-line' | '2-line' | 'full-house' | 'fast-full-house';

export type BingoCardState = {
  card: BingoCard;
  /** 3×9 grid of daub state (true if daubed). Blank cells default to false. */
  daubed: boolean[][];
  /** Highest tier achieved so far on this card. */
  achievedTiers: Set<Exclude<BingoTier, 'fast-full-house'>>;
  /** True if FH was achieved on or before the 40th call. */
  fastFullHouse: boolean;
};

/** Generates a 90-ball British card seeded by cardId. */
export function generateCard(cardId: string): BingoCard;

/** Generates the full 90-ball call sequence seeded by gameId. */
export function drawCallSequence(gameId: string): number[];

/** Returns the set of NEW tiers achieved on this card after the given call.
 *  Call with the up-to-date daubed state. */
export function evaluateCardWins(state: BingoCardState, callIndex: number): BingoTier[];

/** Tier → chip payout per card. */
export function payoutFor(tier: BingoTier): number;

export const BINGO_CONFIG = {
  CARD_COST: 50,
  MAX_CARDS_PER_GAME: 4,
  FAST_FH_THRESHOLD: 40, // FH on call <= 40 (1-indexed) → fast bonus
  CALL_SPEEDS: { slow: 3000, normal: 2000, fast: 1000 } as const,
} as const;

export type BingoSpeed = keyof typeof BINGO_CONFIG.CALL_SPEEDS;
```

### 7.3 machine.ts (XState v5)

States:

- **setup** — user picks card count + speed; transitions to `awaiting_bet_handle` on BUY_AND_START
- **awaiting_bet_handle** — wallet.placeBet bridge (BettingPanel-style); transitions to `playing` once bet handle returned
- **playing** — ball caller emits CALL events on the configured cadence; machine updates daub state, fires WIN events for new tiers
- **settling** — first FH triggers transition; wallet.settleRound bridge; aggregate payout computed
- **done** — show EndScreen; PLAY_AGAIN transitions to `setup`

Context:

- `cardCount: number`
- `speed: BingoSpeed`
- `cards: BingoCardState[]`
- `callSequence: number[]`
- `callIndex: number` (number of balls already called)
- `betHandleId: string | null`
- `betAmount: number` (cardCount × CARD_COST)
- `daubMode: 'auto' | 'manual'` (settable mid-game via TOGGLE_DAUB event)
- `wins: Array<{ cardId: string; tier: BingoTier; payout: number }>`
- `gameId: string` (UUID set on entry to setup)

Events:

- `BUY_AND_START` (from setup)
- `BET_PLACED { betHandleId }` (from wallet bridge)
- `CALL` (from useBingoBallCaller)
- `MANUAL_DAUB { cardId; row; col }` (from card click in manual mode)
- `TOGGLE_DAUB` (from DaubToggle)
- `PLAY_AGAIN` (from EndScreen)

### 7.4 Round-row write (BUILD_GUIDE rule 7)

Every completed bingo game writes one `rounds` row via `wallet.settleRound`:

```ts
{
  userId: <current user>,
  game: 'bingo',
  betAmount: cardCount × 50,        // chips paid for cards
  payout: sum of all tier payouts across all cards,
  netChange: payout - betAmount,
  outcome: payout > betAmount ? 'win' : payout === betAmount ? 'push' : 'loss',
  details: {
    cardCount,
    speed,                          // 'slow' | 'normal' | 'fast'
    daubMode,                       // final mode at game end
    finalCallCount,                 // number of balls called before game ended
    fastFullHouse: boolean,
    perCardPayouts: Array<{
      cardId,
      tiers: BingoTier[],
      payout: number,
    }>,
  },
  balanceAfter: <post-settle balance>,
  playedAt: <epoch ms at settle>,
}
```

This satisfies the games-sandbox contract and integrates with /stats and /leaderboard automatically.

### 7.5 New `Game` enum value

`Round.game` union extended with `'bingo'`. Downstream consumers:

- `GAME_LABELS` Records in `StatsPerGamePage` + `LeaderboardPerGamePage` gain `bingo: 'Bingo'` / `bingo: 'BINGO'`
- `TITLES` Records in `StatsPage` + `LeaderboardPage` gain `bingo: 'BINGO'`
- `StatsLeftRail` TABS gains `{ icon: '🎯', label: 'Bingo' }` + SLUG `'Bingo': 'bingo'`
- `Sidebar.tsx` gains a `🎯 Bingo` NavLink in title case (matches Blackjack/Roulette/Lottery convention from the post-polish PR)
- `CabinetCarousel.tsx` gains a Bingo cabinet (peer to other games; same neon-cyan styling)

## 8. Routing

`/play/bingo` — lazy-loaded via `React.lazy()` (matches the other-games pattern in `src/router.tsx`). Wrapped in the existing Suspense fallback used by sibling games.

## 9. Integration with /stats and /leaderboard (Phase 7)

Because every settled game writes a `rounds` row with `game: 'bingo'`:

- `/stats` per-game tab gains a **Bingo** option. Cards show bingo-scoped: rounds played (games), wagered, won, lost, net, RTP, biggest win, longest streak. The "biggest win" can be the chip prize of any FH or fast-FH outcome.
- `/leaderboard` per-game tab gains a **Bingo** option. The 3 boards (best player, biggest single win, most rounds played) work unchanged.
- "Biggest single win" across all games (overview tab) may surface a fast-FH bingo win at 5,000 chips.

No new leaderboard code — Phase 7 plumbing handles it via the rounds-row settle.

## 10. ADRs

No new ADR needed. Bingo follows the existing games-sandbox pattern; no architectural deviation to document. (ADR-0040's contrast — lottery as event-driven exception — already records WHY bingo, blackjack, etc. belong in the sandbox.)

## 11. PR sequencing (5 PRs)

1. **PR A — Logic + types + scope**
   - `Round.game` extends with `'bingo'`
   - commitlint scope-enum gains `'bingo'`
   - `src/games/bingo/logic.ts` (pure): `generateCard`, `drawCallSequence`, `evaluateCardWins`, `payoutFor`, `BINGO_CONFIG`, types
   - Exhaustive unit tests on each function: card structure (5-per-row, column-banded, sorted), call sequence determinism (same gameId → same sequence) + completeness (90 distinct numbers), evaluator (each tier × edge cases), payouts (every tier value, fast-FH bonus)
   - Type fixes for downstream `Round.game` consumers if any (likely just the same minimal-stub pattern from Phase 10 PR A.1)
   - Estimated **~30 tests**

2. **PR B — Setup + buy flow + machine v0**
   - `SetupPanel.tsx` — card count + speed picker + BUY & START
   - `machine.ts` initial states: setup → awaiting_bet_handle → playing
   - `BingoPage.tsx` shell + lazy route wiring + `/play/bingo`
   - Wallet bridge for placeBet
   - At end of PR B: setup screen works, BUY & START debits wallet, transitions to a stubbed playing state (no ball calls yet)
   - Estimated **~20 tests**

3. **PR C — Ball caller + auto-daub + card rendering + game-end + settle**
   - `BingoCard.tsx` — render a single card with daub state
   - `CallBoard.tsx` — current ball + recent calls strip
   - `useBingoBallCaller.ts` — interval hook driving CALL events at the configured speed
   - Machine extended: CALL events update daub state (auto mode), evaluator runs, wins queued
   - Game ends on first FH; settle bridge writes the rounds row; transitions to `done`
   - Stubbed end-screen banner (PR D polishes)
   - Estimated **~30 tests**

4. **PR D — Manual daub + win banners + multi-card layout + nav integration**
   - `DaubToggle.tsx` — auto/manual switch (always visible)
   - Manual-mode card interaction (click to daub called cells)
   - `WinBanner.tsx` — animated tier banners with reduced-motion path
   - `EndScreen.tsx` — per-card breakdown + aggregate + play-again
   - Multi-card responsive layout polish
   - Sidebar + CabinetCarousel get Bingo entries
   - StatsLeftRail / GAME_LABELS / TITLES gain 'bingo'
   - End-to-end integration test: setup → play → settle → /stats picks up the rounds row
   - Estimated **~30 tests**

5. **PR E — Release**
   - BUILD_GUIDE §12 Phase 11 row marked ✅; §10.6 Bingo section
   - Tag `v0.11-bingo`
   - GitHub Release notes
   - Update `[[project_localgamble_status]]` memory

**Total estimate**: **~110 new tests** across 5 PRs.

## 12. Definition of done (phase-level)

After PR D merges (before PR E release):

- Manual smoke walkthrough:
  - Register a fresh user → /play/bingo → setup screen renders
  - Pick 2 cards, Normal speed → BUY & START → wallet debited by 100
  - Cards render; balls auto-call every 2s; called cells auto-daub gold
  - Toggle to Manual mid-game → unselected cells get a pulse hint → click a called cell to daub
  - Toggle back to Auto → un-daubed called cells immediately daub → new calls auto-daub
  - 1-line / 2-line banners fire per card as rows fill
  - First FH triggers BINGO banner; game ends; EndScreen shows per-card breakdown
  - Click "Play again" → returns to setup
  - /stats → per-game tab "Bingo" → shows 1 round played, payout matches end-screen
  - /leaderboard → per-game tab "Bingo" → user appears in the rankings
- Lobby: Bingo cabinet visible in carousel; sidebar shows "🎯 Bingo"
- Bundle: main bundle ≤ 800 kB
- `prefers-reduced-motion`: win banners + ball reveal both respect reduced motion

## 13. Risks + edge cases

- **Speed = 1s + 4 cards**: 4 cards each with 15 cells × ~85 calls × ball-revealed animation = potential render storm. Mitigation: card daub state diff on each call (only the cells with the new number repaint); test with 4 fast-speed cards in dev to confirm smooth.
- **Mid-game daub toggle**: switching modes mid-game must not lose any wins-in-progress. Auto→manual leaves already-daubed cells daubed; manual→auto daubs all called-but-undaubed cells immediately. Test both transitions.
- **Manual-mode "slow clicker"**: if a player is slow to click in manual mode and another card hits FH first, the slow player's earned-but-unclicked wins are forfeit. This is by design (the tier check uses actual daub state). Make sure the EndScreen makes this visible (e.g., greyed-out "missed!" markers).
- **Wallet rejection on BUY & START**: handle gracefully; remain in setup screen with an error message (matches blackjack/roulette pattern).
- **Reload mid-game**: machine state lives in React only (XState in-memory). A reload abandons the in-flight game; the wallet bet was already debited but no rounds row was written. Decision: write a partial settle row on `beforeunload` (push outcome, 0 payout), or accept the loss as a documented edge case. For Phase 11 v1: **accept the loss** with a console warning — matches blackjack's behavior on reload mid-deal. Document for Phase 15 polish.
- **Card with 0 numbers in a column**: card generation must allow this (legal British 90-ball cards can have empty columns). Validate via card-generation tests.

## 14. Test catalogue (estimated ~110 tests)

- **logic.test.ts** (~30 tests)
  - `generateCard`: returns 3×9 grid, exactly 15 non-null cells, 5 per row, column ranges respected, column sort order, determinism by cardId
  - `drawCallSequence`: returns 90 distinct numbers 1-90, deterministic by gameId, different gameIds → different sequences
  - `evaluateCardWins`: each tier × hit / no-hit, fast-FH at exactly call 40 vs call 41, multiple new tiers in one call (rare — 2-line + FH same call if last row complete also completes first row count)
  - `payoutFor`: every tier value
- **machine.test.ts** (~15 tests)
  - State transitions: setup → playing → settling → done
  - PLAY_AGAIN resets to setup with fresh gameId
  - BET_PLACED required before playing begins
  - CALL updates daub + fires WIN events
  - TOGGLE_DAUB mid-game
  - Game ends on first FH
- **UI tests** (~50 tests across components)
  - SetupPanel: card count picker, speed picker, cost preview, disabled BUY when balance insufficient
  - BingoCard: render daubed cells, tier indicator, manual-mode pulse hint, click-to-daub in manual mode
  - CallBoard: current ball + recent strip, ball reveal animation, reduced-motion path
  - DaubToggle: switches mode, switching mid-game daubs/leaves cells per rules
  - WinBanner: each tier banner renders, reduced-motion short-circuit, dismiss after timeout
  - EndScreen: per-card breakdown, aggregate, play-again resets
- **Integration tests** (~15 tests)
  - Full game: setup → buy → play (mocked timers fast-forward) → FH on card → settle → end screen
  - Multi-card game: 2 cards, both hit different tiers, aggregate payout correct
  - Manual-mode game: slow click → tier missed → game-end reflects forfeit
  - Fast FH bonus: rigged call sequence ends with FH on call 40 → fast bonus payout
  - /stats integration: rounds row written matches per-card-breakdown total
