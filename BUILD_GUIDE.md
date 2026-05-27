# Casino App — Complete Build Guide

> This document is the single source of truth for the project. Keep it in the repo root.
> Hand it to Claude Code one **phase** at a time (see "How to Direct Claude Code" at the end).
> As decisions evolve, update this file first — code follows the spec, not the other way around.

---

## 1. Project Overview

A **local, offline, play-money casino app** that runs in the browser on your own machine. No internet, no real money, no remote server. Multiple local user profiles can register and log in, play games, build a chip balance, and compete on a local leaderboard.

**Games:** Coin Flip, Blackjack, Roulette, Slots, Baccarat, Bingo (competitive British + American), Plinko, Texas Hold'em + Five-Card Draw + Omaha Hold'em (poker), Craps, plus a Daily Lottery.
**Core systems:** local accounts (register/login), persistent chip wallet, betting & payout engine, stats & game history, leaderboard, a hidden admin dashboard, and a clock-driven daily lottery.
**Visual style:** Retro Vegas — neon, deep reds, golds, classic signage feel.

### Goals

- A polished, genuinely fun single-machine casino with a full lineup of games.
- Every game plugs into one shared wallet and one shared stats system.
- Clean, well-organized code so new games can be added by copying a pattern.

### Non-Goals (explicitly out of scope)

- **No real money.** Chips are simulated. Do not add payment processing, crypto, or cash-out.
- **No remote server / no online multiplayer.** Everything is local to the machine.
- **No real authentication security guarantees.** The login system is a convenience layer for separating local profiles, not a security boundary. (We still hash passwords — see §7 — but this is not protecting against a determined attacker with disk access.)
- No mobile app, no native desktop packaging in the MVP (can revisit later with Electron/Tauri).

---

## 2. Tech Stack

| Layer                   | Choice                                 | Why                                                                                                                   |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Language                | **TypeScript**                         | Type-checking catches bugs before runtime and makes Claude Code's output more reliable.                               |
| UI framework            | **React 18**                           | Component model fits games well (a reel, a card, a bet chip). Best-documented option.                                 |
| Build tool / dev server | **Vite**                               | Instant hot-reload. Save a file, browser updates. Zero-config.                                                        |
| Styling                 | **Tailwind CSS**                       | Fast styling without separate CSS files.                                                                              |
| Animation               | **Framer Motion**                      | Smooth reel spins, card deals, chip movement, wheel rotation.                                                         |
| State management        | **Zustand**                            | Tiny, simple global store for wallet, session, and game state.                                                        |
| Persistence             | **IndexedDB** via **Dexie.js**         | Stores user profiles, balances, game history, leaderboard. More robust than localStorage for structured/growing data. |
| Password hashing        | **Web Crypto API** (PBKDF2)            | Built into the browser; no dependency needed.                                                                         |
| Routing                 | **React Router**                       | Navigation between login, lobby, and each game.                                                                       |
| Testing                 | **Vitest** + **React Testing Library** | Vitest pairs natively with Vite. Used heavily for game-logic unit tests.                                              |
| Linting / formatting    | **ESLint** + **Prettier**              | Keeps the codebase consistent across many Claude Code sessions.                                                       |

**Why not C / C++:** This app does almost no performance-critical computation. C/C++ would mean manual memory management, a compile step on every change, and hand-wiring a graphics library — all cost, no benefit. The browser is already the best 2D animation environment available. TypeScript + React is the correct tool.

**Why a local web app and not a native desktop app:** A native app (Electron/Tauri) is the _same web code_ wrapped in a window. It adds packaging complexity with no gameplay benefit during development. Build the web app first; wrap it later if you want a double-clickable `.app`/`.exe`.

---

## 3. Architecture & Project Structure

The guiding principle: **shared systems live in one place; each game is self-contained and plugs into them.**

```
casino-app/
├─ BUILD_GUIDE.md            ← this file
├─ README.md                 ← short: how to run the project
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ tailwind.config.js
├─ .eslintrc / .prettierrc
├─ index.html
└─ src/
   ├─ main.tsx               ← app entry
   ├─ App.tsx                ← router + layout shell
   ├─ theme/                 ← Retro Vegas design tokens, fonts, colors
   ├─ db/
   │   ├─ schema.ts          ← Dexie database definition (see §6)
   │   └─ index.ts           ← db instance + typed helpers
   ├─ store/
   │   ├─ sessionStore.ts    ← who is logged in
   │   └─ walletStore.ts     ← current balance, bet in progress
   ├─ systems/
   │   ├─ auth.ts            ← register, login, logout, password hashing
   │   ├─ wallet.ts          ← debit/credit, balance reads, persistence
   │   ├─ rng.ts             ← single random source (see §5)
   │   ├─ payouts.ts         ← shared payout helpers
   │   └─ stats.ts           ← derive player stats + leaderboard
   ├─ components/            ← shared UI: Button, ChipStack, Modal, BalanceBadge…
   ├─ pages/
   │   ├─ LoginPage.tsx
   │   ├─ RegisterPage.tsx
   │   ├─ LobbyPage.tsx      ← pick a game; shows balance + quick stats
   │   ├─ StatsPage.tsx
   │   └─ LeaderboardPage.tsx
   └─ games/
      ├─ _shared/            ← GameShell, BettingPanel, useGameRound hook
      ├─ blackjack/
      │   ├─ BlackjackPage.tsx
      │   ├─ logic.ts        ← pure functions: deal, hit, dealer play, settle
      │   └─ logic.test.ts
      ├─ roulette/
      ├─ slots/
      └─ baccarat/
```

**The contract every game must follow:**

1. A game **never** touches the database or wallet store directly. It calls `systems/wallet.ts` (`placeBet`, `settleRound`). History rows are written by `wallet.settleRound` in the same Dexie transaction as the balance credit (ADR-0016). There is no separate `systems/history.ts`.
2. All game **rules and odds** live in that game's `logic.ts` as **pure functions** (no React, no I/O) so they can be unit-tested in isolation.
3. The game's React components only handle display, animation, and user input — they call into `logic.ts` for outcomes.
4. Every game round produces a standard **RoundResult** object (see §6) that the history and stats systems understand.

This is the single most important architectural rule. If Claude Code follows it, adding game #5 later is a copy-paste-and-modify job.

---

## 4. Shared Systems

### Wallet

- One wallet per user profile. Balance is an integer number of chips (no floats — avoids rounding bugs).
- `placeBet(amount)` — validates the user has the chips, deducts them, returns a bet handle. Rejects bets above balance or below table minimum.
- `settleRound(result)` — credits winnings (if any) based on the RoundResult, persists the new balance to IndexedDB.
- New users start with a fixed stake of **1,000 chips**.
- Every user receives **+50 chips every 24h** from their last claim. The cooldown is not bypassable even at 0 chips; the app remains recoverable within 24h (ADR-0017).
- New users are eligible to claim immediately on first dropdown open.
- Every balance change is written to IndexedDB immediately so a refresh or crash never loses chips.

### Betting flow (same for every game)

1. User is in a game, sees `BettingPanel` with chip denominations.
2. User composes a bet → `placeBet()` locks the chips.
3. Game plays out (cards/wheel/reels).
4. `logic.ts` computes the `RoundResult`.
5. `settleRound()` credits winnings and writes the history row atomically (ADR-0016); stats update.

### RNG — see §5.

### History & Stats — see §9.

### Leaderboard — see §10.

---

## 5. Randomness

For a play-money app, the browser's crypto-quality randomness is more than enough. **Centralize it** so it's never reimplemented per game and can be swapped or seeded for testing.

`systems/rng.ts` exposes:

- `randomInt(minInclusive, maxInclusive)` — built on `crypto.getRandomValues`, with rejection sampling to avoid modulo bias.
- `shuffle(array)` — Fisher–Yates shuffle, used for card decks.
- `pick(array)` — uniform random element.
- A **seedable mode** for tests: when a seed is set, use a deterministic PRNG so game-logic tests are repeatable.

Rules: no game file may call `Math.random()` directly. ESLint should be configured to flag `Math.random`.

---

## 6. Data Model (IndexedDB via Dexie)

Four tables. All IDs are UUIDs unless noted.

**`users`**

- `id`, `username` (unique), `passwordHash`, `passwordSalt`, `createdAt`, `avatarColor`.

**`balances`**

- `userId` (primary key), `chips` (integer), `updatedAt`.
- Kept separate from `users` so balance writes are cheap and frequent.

**`rounds`** — one row per completed game round (the history log)

- `id`, `userId`, `game` (`'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip'`), `betAmount`, `payout` (total returned, 0 on loss), `netChange` (`payout - betAmount`), `outcome` (`'win' | 'loss' | 'push'`), `details` (game-specific JSON: the hand, the winning number, the reel symbols…), `balanceAfter`, `playedAt`. Coin Flip (Phase 2 placeholder game) is the fifth value; see ADR-0020.

**`RoundResult`** (the in-memory object a game's `logic.ts` returns; gets written into `rounds`)

- `{ outcome, betAmount, payout, netChange, details }`

Stats and the leaderboard are **derived** from the `rounds` and `balances` tables — they are not stored separately, so they can never drift out of sync. Cache derived values in memory if performance ever needs it, but the tables are the source of truth.

Include a `schemaVersion` and a Dexie upgrade path from day one, so later changes don't wipe user data.

---

## 7. Accounts: Register & Login

This is a **local** auth system — it separates profiles on one machine. It is not defending a network boundary, but we still never store plaintext passwords.

**Register**

- Form: username + password (+ confirm password).
- Validate: username unique (case-insensitive), 3–20 chars; password min length (e.g. 8).
- Generate a random salt, derive `passwordHash` with **PBKDF2** (Web Crypto, e.g. 100k+ iterations, SHA-256).
- Create the `users` row, create a `balances` row with the starting stake (1,000 chips), assign a random `avatarColor`.
- Log the user straight in.

**Login**

- Look up username, re-derive the hash with the stored salt, constant-time compare.
- On success, set `sessionStore` to that user.

**Logout**

- Clear `sessionStore`, return to the login page.

**Session persistence**

- Remember the last logged-in user across refreshes (store just the `userId`, not credentials). On app load, if a remembered user exists, skip to the lobby; otherwise show login.

**Route guarding**

- All game/lobby/stats/leaderboard routes require a session. Unauthenticated users are redirected to `/login`.

---

## 8. Game Specifications

Each game's `logic.ts` is pure and unit-tested. Each game returns a standard `RoundResult`. Payouts below are stated as **"X to 1"** meaning a winning bet of N returns N×X in winnings **plus** the original N stake back, unless noted.

### 8.1 Blackjack — build first

**Why first:** real game logic (hand values, dealer rules, multiple outcomes) but no animation required to be playable. It forces the wallet/betting/history plumbing to be built correctly.

- Standard 52-card deck; use a 6-deck shoe, reshuffle when depleted past a cut card.
- Card values: 2–10 face value; J/Q/K = 10; Ace = 1 or 11 (whichever is best for the hand).
- Player places a bet, gets two cards face up; dealer gets one up, one down.
- Player actions: **Hit**, **Stand**, **Double Down** (double bet, take exactly one card), **Split** (up to 4 total hands; standard split-Aces rule: one card each, no resplit aces, no double on split aces; ADR-0022). DAS (double after split) allowed.
- **Insurance** (when dealer's up-card is Ace, before dealer peeks): bet is half the main bet, pays 2:1 if dealer has natural blackjack (ADR-0023).
- Dealer plays after the player: hits until 17 or higher. **Dealer hits on soft 17 (H17)** (ADR-0021). House edge ~0.2% higher than S17 in exchange for closer Vegas Strip parity.
- Outcomes & payouts:
  - Player blackjack (natural 21 on first two cards): **3 to 2**. For odd bets, bet is rounded UP to nearest even before applying 3:2 (winnings = Math.ceil(bet/2) × 3; ADR-0025).
  - Player win (higher total without busting): **1 to 1**.
  - Push (equal totals): bet returned, `outcome: 'push'`.
  - Player bust or lower total: loss.
- `details` JSON records both hands and the actions taken.

#### 8.1.1 Velvet Duel variant (Phase 15)

Phase 15 layers a deliberate gameplay drama on top of the Phase-3 baseline, recorded in **ADR-0045**. All Phase-3 mechanics (split-to-4, DAS, double, insurance, surrender, H17, natural 3:2, the seeded 6-deck shoe, integer money, one-row-per-round) are preserved unchanged; the variant only **adds** rules.

- **Dealer interleaves card-by-card.** After every player `Hit`, `Double`, or first card dealt to a new split hand, the dealer's hole flips face-up (idempotent) and the dealer draws exactly one additional face-up card. Alternation stops the moment the dealer reaches the H17 stand threshold; if alternation never fires, the dealer plays out his hand normally after the player is done. `STAND` does not trigger an alternation tick.
- **Min-stand-14.** The player must `Hit` on any total below 14. The XState `STAND` guard rejects illegal stands; the page UI mirrors the restriction with a disabled `Stand` button and a "Must Hit on totals below 14" helper line.
- **Player chooses each Ace's value (1 or 11).** Whenever a player Ace is dealt (opening deal, Hit, Double, or split-second-card), the machine emits an `ACE_PROMPT` with an `allowEleven` flag. The flag is `false` (and the Ace auto-locks at 1 with no prompt) iff 11 would push the hand above 21; otherwise the player resolves via `CHOOSE_ACE`. Multiple Aces prompt sequentially in deal order; `handTotal()` honours locked Ace values verbatim and never demotes a locked-11. Dealer Aces never prompt and retain classic soft-auto behaviour.
- **5-Card Charlie 3:2 bonus.** A winning hand that contains 5 or more cards pays `floor(bet * 2.5)` (stake + 1.5× winnings) instead of the standard 1:1. Applies only on `player-win` (no bonus on push, loss, or bust) and is mutually exclusive with the natural-blackjack 3:2 (a natural is exactly 2 cards). On split hands, the bonus is evaluated per hand independently. `BlackjackRoundDetails.hands[]` carries a per-hand `fiveCardCharlie` flag for stats / Recent Results surfacing.
- **Bust ends the Velvet Duel alternation:** player bust on HIT skips the dealer interleave for that hand; dealer bust during an interleave draw settles all live player hands immediately as wins.

See [ADR-0045](docs/adr/0045-blackjack-velvet-duel-variant.md) for the full decision record (rationale, alternatives considered, consequences).

### 8.2 Roulette

- **European wheel** (single zero, 37 pockets: 0 and 1–36). House edge stays fair-ish and the table is simpler than American.
- Player can place multiple bets in one round. Bet types and payouts:

| Bet                       | Covers               | Payout  |
| ------------------------- | -------------------- | ------- |
| Straight up               | 1 number             | 35 to 1 |
| Split                     | 2 adjacent numbers   | 17 to 1 |
| Street                    | 3 numbers (a row)    | 11 to 1 |
| Corner                    | 4 numbers            | 8 to 1  |
| Six line                  | 6 numbers            | 5 to 1  |
| Column                    | 12 numbers           | 2 to 1  |
| Dozen                     | 1–12 / 13–24 / 25–36 | 2 to 1  |
| Red / Black               | 18 numbers           | 1 to 1  |
| Odd / Even                | 18 numbers           | 1 to 1  |
| Low / High (1–18 / 19–36) | 18 numbers           | 1 to 1  |

- 0 loses all even-money and outside bets (no "en prison" rule in MVP — keep it simple).
- Spin: `rng.randomInt(0, 36)`. The wheel animation is cosmetic; the result is decided by the RNG, then the wheel animates to land on it.
- `details` records every bet placed and the winning number.

#### Phase 15 #6 amendments (2026-05-25)

- **No 10-position cap.** Players may place unlimited bet positions per round, each up to `MAX_BET` (1000). Total stake is bounded by the player's chip balance. See ADR-0030 amendment.
- **Auto-spin betting windows.** The wheel auto-spins 30 s after entering the page, then 10 s between rounds. The `SPIN NOW` button skips the current window. Zero-bet auto-spins run (cosmetic) but write no `rounds` row. See ADR-0046.
- **Ball lands on pocket centre.** The ball's final viewport angle is `(idx + 0.5) * (360 / 37)` so it visually settles on the centre of the winning pocket, not its leading edge. See ADR-0031 amendment.

### 8.3 Slots

- Start with a **3-reel, single-payline** machine. (Multi-line can come later.)
- Define a **symbol set** with weights, e.g.: Cherry, Lemon, Bell, Bar, Seven, (and a Wild later). Rarer symbols = higher payout.
- Each reel is a weighted random pick from the symbol set via `rng`.
- **Paytable** (three-of-a-kind on the payline), example — tune these so the return-to-player feels fun but not infinite:

| Combination              | Payout (× bet) |
| ------------------------ | -------------- |
| 3× Seven                 | 50             |
| 3× Bar                   | 20             |
| 3× Bell                  | 12             |
| 3× Lemon                 | 8              |
| 3× Cherry                | 5              |
| 2× Cherry (any position) | 2              |

- The reel-spin animation is cosmetic; the outcome is decided by RNG first.
- Keep the symbol weights and paytable in a single config object so they're easy to tune.
- `details` records the final symbols and the line evaluated.

### 8.4 Baccarat

- Player bets on **Player**, **Banker**, or **Tie** (not on their own hand — that's how baccarat works).
- Standard 8-deck shoe. Card values: Ace = 1, 2–9 face value, 10/J/Q/K = 0. Hand total is the **ones digit** of the sum (e.g. 7 + 8 = 15 → 5).
- Deal two cards each to Player and Banker; apply the **third-card drawing rules** (the fixed baccarat tableau — implement it exactly; document the table in `logic.ts`).
- Payouts:
  - **Player** wins: 1 to 1.
  - **Banker** wins: 1 to 1, minus a **5% commission** on the winnings (standard).
  - **Tie**: 8 to 1 (bets on Player/Banker push on a tie).
- `details` records both hands and the bet placed.

---

## 9. Stats & Game History

History is the `rounds` table; stats are **derived** from it (and from `balances`). Nothing here is stored redundantly.

**Per-player stats (StatsPage):**

- Current balance, all-time net (sum of `netChange`), biggest single win, biggest single loss.
- Total rounds played, win rate, per-game breakdown (rounds played + net per game).
- Current win/loss streak.
- A recent-rounds table (paginated): game, bet, outcome, net, balance after, timestamp.
- Optional: a simple balance-over-time line chart (Chart.js or a tiny SVG).

**History rules:**

- Every completed round writes exactly one `rounds` row, via `systems/history.ts`. Games must not skip this.
- History is per-user and never deleted automatically (add a manual "clear history" action if desired).

---

## 10. Leaderboard

A page ranking all local profiles on the machine. Toggle between boards:

- **Richest** — highest current `chips`.
- **Biggest winners** — highest all-time net positive.
- **Biggest losers** — lowest all-time net (most underwater) — leans into the "winners and losers" idea you asked for.
- **Most active** — most rounds played.
- Optional: **biggest single win** across everyone.

Each row: avatar color + username, the ranked metric, and a couple of secondary stats. Highlight the currently logged-in user's row. All values derived live from `balances` + `rounds`.

---

## 10.5 Daily Lottery

Pick-6+1 daily lottery (UK National Lottery shape); one shared draw per local
calendar day. See ADR-0040 for the "lottery as a system, not games-sandbox
citizen" decision.

- **Pools:** 6 main from 1–50 + 1 bonus from 1–10 (15,890,700 combinations).
- **Ticket model:** 5 chips per line; a ticket can hold multiple lines
  (manual and/or lucky-dip); unlimited tickets per draw (wallet-capped).
- **Lucky dip:** numbers generated at purchase time, ensuring within-ticket
  uniqueness.
- **Free re-entry:** match-2 grants a free ticket for the next draw
  (auto-generated lucky-dip line; value tracks `LINE_COST` = 5 chips).
- **Payout tiers** (per UK National Lottery shape):

  | Player matched | Tier      | Payout (chips)               |
  | -------------- | --------- | ---------------------------- |
  | 6 main         | `6`       | 20,000,000 (jackpot)         |
  | 5 main + bonus | `5+bonus` | 1,000,000                    |
  | 5 main only    | `5`       | 1,750                        |
  | 4 main         | `4`       | 150                          |
  | 3 main         | `3`       | 30                           |
  | 2 main         | `2`       | free re-entry (5-chip value) |
  | 0 / 1 main     | —         | 0                            |

  RTP ≈ 84%. House edge ≈ 16%. Bonus number matters only for the `5+bonus`
  tier; `4` / `3` / `2` tiers ignore the bonus (UK Lottery semantics).

- **Draw timing:** strict 20:00 local daily; backfills on app open if missed.
- **Integration:** every settled line writes a `rounds` row, so /stats and
  /leaderboard pick lottery up automatically.
- **Admin:** /admin/lottery shows 4 stat cards (tickets sold today, revenue,
  payout, profit), 2 frequency bar charts (main + bonus pool), and a
  recent-draws table.
- **History migration:** when the schema bumps to add lottery's Pick-6 shape
  (Phase 15 #9), the four lottery tables (`lotteryDraws`, `lotteryTickets`,
  `lotteryLines`, `lotteryFavorites`) are wiped — the old Pick-5 line shape
  can't be revalidated against the new Pick-6 rules. `rounds` rows for past
  lottery wins stay (no impact on game-history aggregates).

Design specs: `docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md`
(initial Pick-5+1) + `docs/superpowers/specs/2026-05-26-phase-15-9-lottery-design.md`
(Phase 15 #9 reskin + Pick-6+1 + UK tiers).

---

## 10.6 Bingo

Competitive bingo — race AI opponents to BINGO. Two variants: British 90-ball 3×9 and American 75-ball 5×5. Variant chosen via modal from lobby cabinet click.

- **Setup:** difficulty (Easy/Medium/Hard) sets CPU count (2/5/9), pot multiplier (×2/×4/×8), CPU reaction latency (slow/fast/instant), and whether daub mode is auto or forced manual (Hard locks manual). Speed picker (Slow/Normal/Fast) sets call interval. User always has exactly 1 card.
- **Cards:** British 3×9 with 15 filled cells. American 5×5 with 24 filled cells + free centre (auto-daubed).
- **Win tiers:** British line → two-line → full house. American line (row/col/diag) → four-corners → blackout. Tier labels live in `VARIANTS[variant]`.
- **Bonuses (paid to user only if user's card claims tier first):** Line 10 chips, Two-line/Four-corners 20 chips. Accumulated in machine context, paid in final `settleRound` payout.
- **Pot:** stake × multiplier. Easy 100 / Medium 200 / Hard 400 chips. User wins → user gets pot. Computer wins (any tier3 by any CPU) → house keeps pot. Bonuses earned along the way are preserved on loss.
- **CPU AI:** statistical only. Each CPU rolls a fixed latency at game start (within the difficulty's range). Latency expires → CPU evaluates card → claims any new tiers. Tie-breaks: same-latency CPUs use lower index; 0ms user vs 0ms CPU is RNG'd.
- **Coloured balls:** UK 9-decile palette for British (1-9 white, 10-19 red, ..., 80-90 grey). US 5-column palette for American (B red / I blue / N yellow / G green / O purple).
- **Settle:** one `rounds` row per game with `game: 'bingo'` and `details: { variant, difficulty, speed, daubMode, finalCallCount, cpuCount, userTier1/2/3, cpuTier3Winner, bonusesEarned, pot }`.
- **Integration:** sidebar, lobby cabinet (opens variant modal), /stats per-game tab, /leaderboard per-game tab all wired.

Design spec: `docs/superpowers/specs/2026-05-19-phase-11.5-bingo-competitive-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-19-phase-11.5-bingo-competitive-plan.md`.

**Admin tuning:** the `/admin/bingo` page exposes per-difficulty overrides for `cpuCount`, `potMultiplier`, `cpuLatencyMs`, and `forceManual`. Empty overrides fall back to the code defaults shown above. Changes persist via Dexie (v4 schema, `bingoConfig` table) and apply to the next game started.

---

## 10.7 Plinko

Modern-casino-style Plinko. Triangular peg pyramid (26 rows × R+1 pegs each, base = 26 pegs), 27 bins, four risk levels. Amended in Phase 15 #11 — see ADR-0047 for the geometry rebuild + RTP retune.

- **Board:** triangular peg pyramid — row R has R+1 pegs; row 0 = 1 peg at the apex, row 25 = 26 pegs at the base. 27 buckets sit immediately below the bottom peg row, each bucket centred on a peg gap. Pyramid fills ~70-80vh of the viewport. Drop point centred. No player aim.
- **Risk levels:** Safe / Low / Medium / High — same board, different multiplier curves. RTP ~95-98% across all risk levels under `Binomial(26, 0.5)`.
- **Bet:** 10–**1,000,000** chips per ball. Manual mode = 1 ball per click (150 ms cooldown to prevent stack-clicking). Auto mode = 1–**1,000** balls at intervals 250 / 500 / 1000 ms.
- **Math:** deterministic Binomial(26, 0.5) walk via mulberry32. Bin = sum of R-moves. Centre bin (13) most likely (~15.5%); edges (0, 26) ~1 per ~67 million.
- **Payouts:** integer floor(stake × multiplier). Approx edge multipliers (per ADR-0047): Safe 45×, Low 700×, Medium 6,000×, High 60,000×. Centre-bin multipliers are sub-1 (loss territory) on every risk. Max single-ball win at 1M stake, High edge = 60B chips (play-money, no real-world cap).
- **Bonuses:** none. Each ball settles standalone — `won` if `payout > stake`.
- **Settle:** one `rounds` row per ball via `wallet.settleRound`. Each row carries `details = { risk, bin, multiplier, sessionId }`. Manual = new sessionId per click; Auto = shared sessionId across all balls in the session.
- **Animation:** Framer Motion keyframes per row (~75ms/row, ~2s total per ball) tracing the actual RNG path — final-frame x equals `binCentreX(bin)` (test-pinned invariant). Per-row peg-squash on impact. Multiple balls in flight simultaneously during auto. `useReducedMotion` collapses to instant placement. Tier-3 edge-bin celebration (coin shower + screen shake + jackpot stinger) on High-risk edge hits.
- **Sound:** `chip.place` on bet · `ball.drop` on spawn · `peg.ping` per bounce (debounced 30 ms across all in-flight balls) · `win.small / .medium / .jackpot` on landing (gated on `payout/stake`) · `loss` when `payout < stake`.
- **Integration:** sidebar, lobby cabinet, /stats per-game tab, /leaderboard per-game tab all wired. `/admin/plinko` analytics page ships in Phase 15 #11 PR B.

Design spec: `docs/superpowers/specs/2026-05-20-phase-12-plinko-design.md` (Phase 12 baseline) + `docs/superpowers/specs/2026-05-27-phase-15-11-plinko-design.md` (Phase 15 polish). Implementation plans: `docs/superpowers/plans/2026-05-20-phase-12-plinko-plan.md` + `docs/superpowers/plans/2026-05-27-phase-15-11-plinko-plan.md`. ADR: `docs/adr/0047-plinko-peg-geometry.md`.

---

## 10.8 Poker — Texas Hold'em + Five-Card Draw + Omaha Hold'em

The poker section offers three fully playable variants via the `PokerVariantModal` lobby chooser. All three are active; no COMING SOON cards remain.

### Texas Hold'em (Phase 13a)

No-Limit Texas Hold'em. Configurable 2–6 players (1 human + up to 5 AI archetypes). Three tiered stake levels: Low (blinds 10/20), Mid (50/100), High (250/500). Buy-in at session start, cash-out or rebuy between hands. Full NLHE hand lifecycle: post blinds → deal hole cards → preflop/flop/turn/river betting rounds → showdown. Side pots calculated correctly for all-in scenarios.

Design spec: `docs/superpowers/specs/2026-05-20-phase-13a-texas-holdem-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-20-phase-13a-texas-holdem-plan.md`.

### Five-Card Draw (Phase 13b)

No-Limit Five-Card Draw. Configurable 2–6 players (1 human + up to 5 AI archetypes). Same tiered stakes as Hold'em. Single draw round (cap 3 discards per player). Archetype-flavoured discard AI (`decideDiscard` in `_shared/ai/`) — each archetype discards according to its risk profile. Shares the entire `poker/_shared/` core (deck, hand evaluator, side pots, AI archetypes, betting engine) with Hold'em — zero duplication. Route: `/play/poker/five-card-draw`.

Design spec: `docs/superpowers/specs/2026-05-21-phase-13b-five-card-draw-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-21-phase-13b-five-card-draw-plan.md`.

### Omaha Hold'em (Phase 13c)

No-Limit Omaha Hold'em. Configurable 2–6 players (1 human + up to 5 AI archetypes). Same tiered stakes as Hold'em. Each player receives **4 hole cards**; the mandatory showdown rule requires using **exactly 2 hole cards + exactly 3 community cards** (enforced in `evaluateFrom('omaha')`). Archetype-flavoured Omaha AI (`decideOmaha` in `_shared/ai/`) evaluates all C(4,2)×C(5,3) = 60 combinations to pick the best made hand. Reuses the entire `poker/_shared/` core — zero duplication beyond the hand-evaluation specialisation. Route: `/play/poker/omaha`.

Design spec: `docs/superpowers/specs/2026-05-21-phase-13c-omaha-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-21-phase-13c-omaha-plan.md`.

### Shared infrastructure

- **AI archetypes:** four distinct styles (Tight-Passive, Loose-Aggressive, Calling Station, Bluffer). Each responds to pot odds, hand strength, position, and stack depth across all three variants.
- **Shared `_shared/` infrastructure:** `deck.ts`, `handEvaluator.ts`, `sidePots.ts`, `ai/` reused by all three variants — zero duplication. The poker trio (13a/b/c) validated that a new variant can ship as a near-clone in 4 PRs.
- **Variant chooser:** `PokerVariantModal` opens from the lobby cabinet and `/play/poker` route. All three variants (Texas Hold'em, Five-Card Draw, Omaha Hold'em) are active with no COMING SOON badges.
- **Cards:** visual design matches Blackjack and Baccarat (same card component family).
- **Integration:** sidebar (♠️ Poker → `/play/poker`), lobby cabinet (opens modal), `/stats/poker` per-game tab, `/leaderboard/poker` per-game tab, `Round.game` enum includes `'poker'`.
- **ADR:** ADR-0041.

### Phase 15 #12.v1 polish amendments (2026-05-27)

Phase 15 sub-project #12.v1 ships the standard MASQUER polish recipe for Texas Hold'em plus shared chrome that #12.v2 Five-Card Draw and #12.v3 Omaha inherit for free. Pure gameplay logic (`holdemLogic.ts`, `machine.ts`, `_shared/handEvaluator.ts`, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide}.ts`) is byte-stable; the changes are presentational + additive.

- **Unified card visuals:** every poker import of `_shared/PlayingCard` now renders through a thin adapter that converts poker's rank (Ace=14) to the brand `@/components/brand/PlayingCard` (Ace=1). All three variants inherit the unified MASQUER porcelain card visual without per-import changes.
- **Venetian masquerade names:** new `_shared/maskNames.ts` (`Bauta`, `Colombina`, `Volto`, `Moretta`, `Arlecchino`, `Pantalone`, `Pulcinella`, `Brighella`, `Pierrot`, `Dottore`, `Capitano`, `Zanni`) hides the AI archetype from the UI. `decide()` still receives the real archetype internally — only the displayed name changes. Deterministic per session via `assignMaskName(rng, tableSize)`.
- **MASQUER chrome shell:** `MASQUER · Hold'em` title + LobbyButton + variant-aware `PokerOddsHeader` + `RulesButton` opening a variant-aware `PokerRulesModal`. Root drops `min-h-screen` for `flex h-full flex-col`.
- **Dramatic showdown stagger:** `ShowdownReveal` reveals seats left-to-right at 250 ms intervals; the winning seat receives a 600 ms gold-glow ring + `win.{tier}` (or `loss`) stinger. Auto-next-hand timer now gates on `ShowdownReveal.onRevealComplete` so the next deal never starts mid-reveal. Reduced-motion users get an instant batched reveal + single sound.
- **Sound:** `chip.place` on every committed bet / call / raise / rebuy / blind post; `card.deal` on hole-card deal + each board card (flop = 3 staggered, turn / river = 1 each) + each showdown flip; `win.{tier}` / `loss` stinger on hand completion. All gated on `useEffectiveReducedMotion`.
- **Brand-token pass:** PokerTable / Seat / CommunityBoard / BettingControls / SessionBar / SetupPanel / PokerLobbyPage / PokerVariantModal all repainted with `bg-felt-table`, `bg-velvet-deep`, `border-brass`, `text-ivory`, `text-gold-bright`. Brass slider thumb on raise control.
- **`/admin/poker`** ships separately in PR B with 4 StatCards + variant tabs (`All` / `Hold'em` / `Five-Card Draw` / `Omaha`) + hero stacked-bar chart + biggest-pots panel + recent sessions table. Additive aggregations only — no schema migration.

Design spec: `docs/superpowers/specs/2026-05-27-phase-15-12-v1-holdem-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-27-phase-15-12-v1-holdem-plan.md`.

### Phase 15 #12.v2 polish amendments (2026-05-27)

Phase 15 sub-project #12.v2 applies the MASQUER polish recipe to Five-Card Draw, inheriting the shared chrome shipped in #12.v1 (MasquerCard adapter, mask names, MaskAvatar, PokerOddsHeader, PokerRulesModal, brand-token pairings, 3s outcome banner, 15s leave-grace, post-hand AI reveal). Pure logic (`drawLogic.ts`, `machine.ts`, `_shared/handEvaluator.ts`, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide,decideDiscard}.ts`) is byte-stable; changes are presentational + additive. `FiveCardDrawPage` chrome now mirrors `HoldemPage` (LobbyButton + variant odds + rules + h-full page root). `DrawTable` adopts the brass-edged felt backdrop + `isPostHand` reveal threading. `DrawSeat` adopts `MaskAvatar` + brand tokens + `revealHoleCards` + `handRank` props while preserving the Draw-specific `drewLabel`. `DiscardControls` repainted with brand tokens + `ring-gold-bright` selection + brass-bordered DRAW/STAND PAT button. `PokerRulesModal` Draw variant body now ships the full rules block (Object · Hand Rankings · Blinds · Draw Phase · Betting Rounds · Showdown · Table). Sound taxonomy mirrors Hold'em: `chip.place` on blinds + every player commit; `card.deal` stagger on initial 5-card deal + draw replacements; `win.{tier}` / `loss` stinger on hand completion. Single PR (`phase-15-12-v2-draw`).

Design spec: `docs/superpowers/specs/2026-05-27-phase-15-12-v2-five-card-draw-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-27-phase-15-12-v2-five-card-draw-plan.md`.

### Phase 15 #12.v3 polish amendments (2026-05-27)

Phase 15 sub-project #12.v3 applies the MASQUER polish recipe to Omaha, inheriting the shared chrome shipped in #12.v1 (MasquerCard adapter, mask names, MaskAvatar, PokerOddsHeader, PokerRulesModal, brand-token pairings, 3s outcome banner, 15s leave-grace, post-hand AI reveal). Closes the poker trio. Pure logic (`omahaLogic.ts`, `machine.ts`, `_shared/handEvaluator.ts` incl. the `'omaha'` rule branch, `_shared/sidePots.ts`, `_shared/deck.ts`, `_shared/ai/{archetypes,decide,decideOmaha}.ts`) is byte-stable; changes are presentational + additive. `OmahaPage` chrome now mirrors `HoldemPage` (LobbyButton + variant odds + rules + h-full page root + mask plumbing via `assignMaskName` + sound + grace overlay + fallback grace trigger from idle). `OmahaTable` adopts the brass-edged felt backdrop + `isPostHand` reveal threading; the post-hand hand-rank computation uses `evaluateFrom(seat.holeCards, board, 'omaha')` — the 2+3 rule (exactly 2 of 4 hole + exactly 3 of 5 board) is load-bearing, never `evaluateBest5([...holeCards, ...board])` which would allow illegal 0/1/3/4-hole hands. `OmahaSeat` adopts `MaskAvatar` + brand tokens + `revealHoleCards` + `handRank` props while preserving the 4-card layout (`cardSize: 'mini'` at top positions). `PokerRulesModal` Omaha variant body now ships the full rules block (Object · Hand Rankings · Blinds · Betting Rounds · Showdown · Table) with the 2+3 rule called out in the Object section. Sound taxonomy mirrors Hold'em + Draw: `chip.place` on blinds + every player commit; `card.deal` stagger on per-seat 4-card initial deal (80 ms per seat, coalesces to ~12/sec at 6-max) + flop (3 staggered) + turn/river; `win.{tier}` / `loss` stinger on hand completion. Single PR (`phase-15-12-v3-omaha`).

Design spec: `docs/superpowers/specs/2026-05-27-phase-15-12-v3-omaha-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-27-phase-15-12-v3-omaha-plan.md`.

---

## 10.9 Craps

Full-table single-player Craps. Two dice, come-out/point phases, and a comprehensive bet set covering every standard craps position.

### Bet set

- **Line bets:** Pass Line, Don't Pass (bar 12), Come, Don't Come. Even-money 1:1 payouts.
- **Odds:** Pass Odds and Don't Odds (true-odds, zero-house-edge); 3× max odds multiplier per tier. Odds bets are off on the come-out by default.
- **Place bets:** Place 4/5/6/8/9/10 — 9:5 (4/10), 7:5 (5/9), 7:6 (6/8). Off on come-out.
- **Field:** wins on 2/3/4/9/10/11/12, loses on 5/6/7/8. 2 pays 2:1 (`multiplier: 2`); 12 pays 3:1 (`multiplier: 3`); others pay 1:1. Always working.
- **Hardways:** Hard 4/6/8/10 — 7:1 (hard 4/10) / 9:1 (hard 6/8). Win only if both dice are equal; lose on easy or 7. Off on come-out.
- **One-roll props:** Any 7 (4:1), Any Craps (7:1), 2/Aces (30:1), 3 (15:1), 11/Yo (15:1), 12/Boxcars (30:1).
- **Composite:** Horn (stake split four ways across 2/3/11/12; exact integer `winnings` override computed from quarter-stake); C&E (half on Any Craps, half on 11).

### Architecture

- **Resolver registry (`bets.ts`):** each `BetType` implements `canPlace`, `isWorking`, `resolve`, and `payout`. `resolveRoll` iterates active bets, applies working/off rules, and aggregates `netReturned` for the roll. Roll-dependent payouts (Field 2×/3×, Horn, C&E) use the `multiplier`/`winnings` override on `BetOutcome`; fixed-odds bets return plain `{ kind: 'win' }` and `resolveRoll` calls `payout()`. See ADR-0042.
- **Machine (`machine.ts`):** XState v5 — states `idle → table → settling → session_over`. `SIT_DOWN` initialises context from `input` (sessionId, buyIn, stakes tier). `PLACE_BET`/`REMOVE_BET` validate and debit/credit bankroll. `ROLL` (sent from the page with a pre-computed `Roll`) runs `resolveRoll`, updates bankroll, relocates come-bet `move` outcomes, handles point transitions (come-out 4–10 sets point; point roll = point → back to come-out; 7-out → come-out). `REBUY` and `LEAVE_TABLE` complete the session lifecycle.
- **Page (`CrapsPage.tsx`):** mirrors `HoldemPage` — session-keyed sub-component, wallet bridge (`placeBet` buy-in / `settleRound` on leave), ROLL button triggers `rngFromSeed(sessionId + rollNumber)` → `rollDice` → machine `ROLL` event. `beforeunload` settle guard.
- **Session wallet:** table-session bankroll (ADR-0041). Three tiers: Low (min 10, buy-in 200–1000), Mid (min 50, buy-in 1000–5000), High (min 250, buy-in 5000–25000). All amounts integers.

### UI components

`CrapsTable` (authentic half-table layout), `BetSpot` (stacked chips, dim when `!canPlace`), `Dice` (tumble animation via Framer Motion, `useReducedMotion` collapses to instant), `PointPuck` (ON white / OFF black over point number), `ChipTray`, `PropositionDrawer` (collapsible centre box), `SessionBar`, `SetupPanel`.

### Integration

- Sidebar: 🎲 Craps → `/play/craps`.
- Lobby cabinet: direct `Link` to `/play/craps` (no variant modal).
- Stats: `/stats/craps` per-game tab.
- Leaderboard: `/leaderboard/craps` per-game tab.
- `Round.game` enum includes `'craps'`.
- **ADR:** ADR-0042.

Design spec: `docs/superpowers/specs/2026-05-22-phase-14-craps-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-22-phase-14-craps-plan.md`.

---

## 11. UI / UX — Retro Vegas

**Mood:** neon signage, deep velvet reds, gold trim, dark felt-green backgrounds, chunky retro display fonts for headings, clean readable sans-serif for body and numbers.

- **Color tokens** (define in `theme/`, use everywhere — no hardcoded hex in components):
  - Background: near-black / dark felt green.
  - Primary: deep casino red. Accent: warm gold. Highlight: neon cyan or magenta for "win" moments.
  - Win = gold/green glow; loss = muted; push = neutral.
- **Layout:** persistent top bar with the Retro Vegas logo, current balance badge (always visible), username + logout. Lobby is a grid of game "cabinets." Each game page has the game area centered, `BettingPanel` docked at the bottom.
- **Feedback:** every chip change animates (count up/down). Wins get a neon flash; big wins get something extra. Keep it tasteful, not seizure-inducing.
- **Responsive:** target desktop browser window; make it not break down to ~1024px wide. Mobile is out of scope.
- **Accessibility:** real buttons, keyboard-operable, sufficient contrast despite the dark theme.
- **Sound:** deferred to the polish phase (§12, Phase 7). Architect a tiny `useSound` hook stub now so adding it later doesn't require touching game code.

---

## 12. Build Order — Phased Roadmap

Build in this order. **Do not start a phase until the previous one runs and its tests pass.** Each phase is one or more PRs.

| Phase                              | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Definition of done                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **0. Scaffold**                    | Vite + React + TS + Tailwind + ESLint/Prettier + Vitest set up. Routing shell. Empty pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `npm run dev` serves the app; `npm test` runs; lint passes.                                                                  |
| **1. Data + Auth**                 | Dexie schema, `systems/auth.ts`, Register/Login/Logout, session persistence, route guards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Can register a user, log out, log back in; refresh keeps you logged in; password is hashed in the DB.                        |
| **2. Wallet + Lobby + Game shell** | `walletStore`, `systems/wallet.ts`, starting stake, `LobbyPage`, `_shared/GameShell` + `BettingPanel`, `systems/rng.ts`. Daily top-up (+50 chips every 24h, ADR-0017). AppLayout shell with collapsible sidebar (ADR-0018, ADR-0019). RecentResults rail. Coin Flip placeholder game (ADR-0020) + 4 stub pages for Phases 3-6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | New user has 1,000 chips; lobby shows balance; a placeholder game can place and settle a bet and write a `rounds` row.       |
| **3. Blackjack**                   | Full Blackjack: `logic.ts` (pure, tested) + UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Playable end-to-end; wallet updates; rounds logged; `logic.test.ts` covers blackjack, bust, push, dealer rules, double down. |
| **4. Roulette**                    | Full Roulette with all bet types from §8.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Playable; all payouts correct; multiple bets per round; tested.                                                              |
| **5. Slots**                       | 3-reel single-line slots with config-driven paytable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Playable; paytable correct; tested.                                                                                          |
| **6. Baccarat** ✅                 | Full Baccarat with all 9 bet zones (P / B / T + 2 Pairs + Big/Small + 2 Dragons), persistent 8-deck shoe with cut card, canonical third-card tableau, bead plate + big road scoreboard, theatrical card reveal, tier-mapped celebration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Shipped 2026-05-18 — see `v0.7-baccarat`. ADR-0036, ADR-0037.                                                                |
| **7. Stats + Leaderboard** ✅      | `systems/stats.ts` (9 new aggregations), StatsPage with left-rail nav (overview + 5 game tabs), 16 stat cards per scope, Cards ↔ Graphs toggle. LeaderboardPage with 20 boards (5 overview + 3 × 5 per-game), Me/All toggle, banned-user exclusion. Shared Recharts chunk between player + admin (ADR-0039).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Shipped 2026-05-19 — see `v0.8-stats-leaderboard`. ADR-0038, ADR-0039.                                                       |
| **8. Polish**                      | Animations pass, sound effects, Retro Vegas styling refinement, empty/zero-balance states, daily top-up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | App feels finished; no broken states; design tokens used throughout.                                                         |
| **9. Admin Dashboard** ✅          | Hidden `/admin/*` with hardcoded admin login. Cross-cutting tracking: sessions, gameVisits, loginCount, soft ban, audit-trailed credit adjustments. Overview + Users list + per-user drill-in + Adjustments log + Sessions log. Recharts lazy-loaded (admin chunk only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Shipped 2026-05-18 — see `v0.9-admin-dashboard`. ADR-0034, ADR-0035.                                                         |
| **10. Daily Lottery** ✅           | `systems/lottery.ts` (Pick-5+1 draw + buyTicket + settleMissedDraws + favorites + admin queries), Dexie v3 (4 new tables, additive), LotteryPage with NumberGrid + TicketCart + FavoritesDropdown + HERO countdown ↔ winning balls + HistorySlide, DrawAnimationModal (purchase + draw reveal), Sidebar 🎟️ LOTTERY + 🔴 unread dot, LobbyPage tile, AdminLotteryPage (4 stat cards + 2 frequency charts + recent draws). Strict 20:00 local daily draw with backfill on app open. 1M jackpot, ≈43% RTP, match-2 free re-entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Shipped 2026-05-19 — see `v0.10-lottery`. ADR-0040.                                                                          |
| **11. Bingo (Competitive)** ✅     | Competitive bingo vs AI computers. Two variants: British 90-ball 3×9 + American 75-ball 5×5 (lobby modal picker). Easy/Medium/Hard (2/5/9 CPUs + pot ×2/×4/×8 + latency tuning + Hard locks manual). 1 user card per game. Line/two-line/4-corners bonuses to first claimant. Tier3 winner takes pot. Coloured balls (UK 9-decile + US 5-column palettes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Shipped 2026-05-19 — see `v0.11.5-bingo-competitive`.                                                                        |
| **12. Plinko** ✅                  | Modern-casino-style Plinko. Fixed 20-row peg board / 21 bins. 4 risk levels (Safe/Low/Med/High) — same board, different multiplier curves (Safe edge 16x → High edge 5000x). Bet 10–5000 chips per ball. Manual + Auto (1–100 balls, intervals 250/500/1000 ms). Deterministic Binomial(20, 0.5) RNG; Framer Motion keyframe path animation per ball. One `rounds` row per ball via `wallet.settleRound`. ~95-100% RTP across risk levels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Shipped 2026-05-20 — see `v0.12-plinko`.                                                                                     |
| **13a. Poker — Texas Hold'em** ✅  | No-Limit Texas Hold'em. Configurable 2–6 players (1 human + AI). Tiered stakes (Low 10/20, Mid 50/100, High 250/500). Buy-in/cash-out sessions with rebuys. 4-archetype AI (Tight-Passive, Loose-Aggressive, Calling Station, Bluffer). Full side-pot handling. Shared `_shared/` infra (deck/handEvaluator/sidePots/ai) reused by 13b/13c. PokerVariantModal lobby chooser (Hold'em active; Draw + Omaha COMING SOON). Sidebar + lobby cabinet + stats/leaderboard tabs wired.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Shipped 2026-05-21 — see `v0.13a-texas-holdem`. ADR-0041.                                                                    |
| **13b. Poker — Five-Card Draw** ✅ | No-Limit Five-Card Draw. 2–6 players, same tiered stakes as Hold'em. Single draw round (cap 3 discards). Archetype-flavoured discard AI (`decideDiscard`). Reuses entire `poker/_shared/` core (deck/handEvaluator/sidePots/ai/betting) — zero duplication. PokerVariantModal updated: Five-Card Draw active (→ `/play/poker/five-card-draw`). Implemented in 4 PRs (A: discard AI + draw logic; B: draw machine; C: draw UI; D: variant activation + BUILD_GUIDE).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Shipped 2026-05-21 — see `v0.13b-five-card-draw`.                                                                            |
| **13c. Poker — Omaha Hold'em** ✅  | No-Limit Omaha Hold'em. 2–6 players, same tiered stakes as Hold'em. 4 hole cards per player; mandatory exactly-2+3 showdown rule (`evaluateFrom('omaha')`). Archetype-flavoured Omaha AI (`decideOmaha`) evaluates all 60 hole/board combos. Reuses entire `poker/_shared/` core — zero duplication. PokerVariantModal updated: all three variants active, no COMING SOON badges remain. Completes the poker trio (13a/b/c). Implemented in 4 PRs (A: decideOmaha + omaha logic; B: Omaha machine + route; C: Omaha UI; D: variant activation + BUILD_GUIDE).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Shipped 2026-05-21 — see `v0.13c-omaha`. Poker trio complete.                                                                |
| **14. Craps** ✅                   | Full-table single-player Craps. Two dice, come-out/point phases, complete bet set (Pass/Don't Pass/Come/Don't Come + odds + Place 4–10 + Field + Hardways 4/6/8/10 + one-roll props + Horn + C&E). Per-bet resolver registry (`BET_TYPES` in `bets.ts`) with `canPlace`/`isWorking`/`resolve`/`payout`. XState v5 machine drives phases + placement validation + session lifecycle. Table-session wallet reusing ADR-0041. Implemented in 5 PRs (A: dice + resolvers; B: place/field/props; C: machine + ADR-0042; D: full table UI; E: enum + nav + BUILD_GUIDE). This completes all gameplay phases — only Phase 15 Polish remains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Shipped 2026-05-22 — see `v0.14-craps`. ADR-0042.                                                                            |
| **15. Polish & Overhaul** 🚧       | Complete UI/UX overhaul (rebranded **MASQUER · Velvet Deco**) + per-game polish + admin expansion. Decomposed into 16 sub-projects, **10 of 16 shipped** as of 2026-05-26. Foundation #0 Brand · #1 Design-system (25 primitives) · #2 Motion & Sound · #3 Shell & navigation all merged. Per-game upgrades shipped in release order: #4 Coin-flip ✅ · #5 Blackjack ✅ (Velvet Duel variant + ADR-0045) · #6 Roulette ✅ (auto-spin betting windows + ADR-0046) · #7 Slots ✅ (SVG symbols + sticky bet + admin) · #8 Baccarat ✅ · #9 Lottery ✅ (Pick-6+1 UK tier table) · #10.v1 British Bingo ✅ · #10.v2 American Bingo ✅. Each sub-project follows the per-game polish recipe captured in `docs/PHASE_15_PATTERNS.md` (MASQUER title + LobbyButton + OddsInfoBox + RulesModal + brand tokens + useSound + scrollable modals + dramatic reveal animations + admin stats panel). Remaining: #11 Plinko (next) → #12.v1–v3 Poker trio → #13 Craps → #14 Admin overhaul → #15 Final integration. Tokens-only Tailwind; shared Framer-Motion variant library + `useSound` + `useEffectiveReducedMotion` honored everywhere. Game logic + ADRs preserved (presentational + additive only). Full plan: `docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md`. | App feels like one designed product; design tokens used throughout; no broken states; all game logic + ADRs intact.          |

---

## 13. Git & GitHub Workflow

You're using GitHub for version control — keep the history clean so PRs are reviewable.

- **Branching:** `main` always runs. Branch per phase/feature: `phase-3-blackjack`, `fix/roulette-corner-payout`, etc. Never commit directly to `main`.
- **One PR per phase** (or per logical chunk within a big phase). A PR should be small enough to actually review.
- **Commit messages:** imperative mood, scoped — `feat(blackjack): add dealer soft-17 logic`, `fix(wallet): reject bets above balance`, `test(roulette): cover corner bet payout`, `chore: set up eslint`.
- **PR description template:** what changed, which phase/section of BUILD_GUIDE it implements, how it was tested, screenshots for UI.
- **Definition of done before merge:** `npm run lint`, `npm test`, and `npm run build` all pass; the phase's "definition of done" (§12) is met; you've clicked through it manually.
- Add a basic **GitHub Actions** workflow in Phase 0 that runs lint + test + build on every PR, so regressions get caught automatically.
- `.gitignore` must cover `node_modules`, `dist`, local env files.
- Tag a release at the end of each phase (`v0.1-auth`, `v0.2-blackjack`…) so you can always roll back.

---

## 14. Testing Strategy

- **Game logic is the priority for tests.** Every `games/*/logic.ts` must have a `logic.test.ts` covering: each outcome type, each payout, edge cases (blackjack push, roulette 0, slots two-cherry, baccarat third-card branches, ties).
- Use the **seedable RNG** (§5) so logic tests are deterministic.
- Lighter component tests for the auth forms and betting panel (can place/clear bets, validation fires).
- A couple of integration-style tests: register → place bet → settle → balance and `rounds` row are both correct.
- Don't chase 100% coverage on UI; **do** be thorough on money math and odds.

---

## 15. How to Direct Claude Code

This is the part that makes the project actually work.

1. **Put this file in the repo** as `BUILD_GUIDE.md` and commit it first.
2. **Add a `CLAUDE.md`** in the repo root (Claude Code reads it automatically every session). Keep it short — point to this guide and state the hard rules:
   - "Read `BUILD_GUIDE.md` before working. Implement only the phase I name."
   - "Games never touch the DB or wallet store directly — only through `systems/`."
   - "All game rules go in pure, tested `logic.ts` files."
   - "No `Math.random()` — use `systems/rng.ts`."
   - "Run lint + tests before saying a task is done."
3. **Work one phase at a time.** Start each session with a prompt like:
   > "We're on Phase 3 (Blackjack) from BUILD_GUIDE.md §8.1 and §12. The previous phases are merged and working. Implement Blackjack: pure tested `logic.ts` first, then the UI, wired through `systems/wallet.ts` and `systems/history.ts`. Show me the logic and tests before building UI."
4. **Make it show you the plan first** on anything non-trivial — review the approach before it writes a pile of code.
5. **Logic before UI, every time.** Get `logic.ts` + passing tests, review them, _then_ let it build the React components.
6. **One PR per phase.** Have Claude Code create the branch, and review the diff before merging.
7. **When something's wrong, fix the spec.** If a rule or payout changes, update this file first, commit it, then ask Claude Code to implement the change. The doc stays the source of truth.
8. **Keep sessions focused.** Don't ask for Blackjack and the leaderboard in one session — context stays cleaner and PRs stay reviewable.

### Suggested first prompt to Claude Code

> "Read `BUILD_GUIDE.md`. We're starting Phase 0 (Scaffold). Set up a Vite + React + TypeScript project with Tailwind, ESLint, Prettier, Vitest, and React Router, matching the structure in §3. Create the empty pages and routing shell. Add a GitHub Actions workflow that runs lint, test, and build. Don't implement any features yet. Show me the file tree and `package.json` when done."

---

## 16. Open Questions / Future Decisions

These don't block the build — revisit as you go:

- Exact starting stake and daily top-up amounts (tune for fun).
- Slots: when to add multi-line / a Wild symbol.
- Blackjack: whether to include Split and Insurance in MVP or defer.
- Whether to add Video Poker / Craps later (left out of current scope by choice).
- Desktop packaging (Electron vs Tauri) if you want a double-clickable app.
- Whether to add a settings page (reset profile, clear history, sound volume).

---

_End of build guide. Keep this file updated — it is the contract._
