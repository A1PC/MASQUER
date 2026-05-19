# Casino App — Complete Build Guide

> This document is the single source of truth for the project. Keep it in the repo root.
> Hand it to Claude Code one **phase** at a time (see "How to Direct Claude Code" at the end).
> As decisions evolve, update this file first — code follows the spec, not the other way around.

---

## 1. Project Overview

A **local, offline, play-money casino app** that runs in the browser on your own machine. No internet, no real money, no remote server. Multiple local user profiles can register and log in, play games, build a chip balance, and compete on a local leaderboard.

**Games:** Blackjack, Roulette, Slots, Baccarat, Bingo.
**Core systems:** local accounts (register/login), persistent chip wallet, betting & payout engine, stats & game history, leaderboard.
**Visual style:** Retro Vegas — neon, deep reds, golds, classic signage feel.

### Goals

- A polished, genuinely fun single-machine casino with four working games.
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

Pick-5+1 daily lottery; one shared draw per local calendar day. See ADR-0040 for the "lottery as a system, not games-sandbox citizen" decision.

- **Pools:** 5 main from 1–50 + 1 bonus from 1–10 (21,187,600 combinations).
- **Ticket model:** 10 chips per line; a ticket can hold multiple lines (manual + lucky-dip); unlimited tickets per draw (wallet-capped).
- **Lucky dip:** numbers generated at purchase time, ensuring within-ticket uniqueness.
- **Free re-entry:** match-2 grants a free ticket for the next draw (auto-generated lucky-dip line).
- **Payout tiers:** 5+bonus = 1,000,000; 5 = 500,000; 4+bonus = 100,000; 4 = 10,000; 3+bonus = 2,000; 3 = 100; 2+bonus / 2 = free re-entry. ≈ 43% RTP.
- **Draw timing:** strict 20:00 local daily; backfills on app open if missed.
- **Integration:** every settled line writes a `rounds` row, so /stats and /leaderboard pick lottery up automatically.
- **Admin:** /admin/lottery shows 4 stat cards (tickets sold today, revenue, payout, profit), 2 frequency bar charts (main + bonus pool), and a recent-draws table.

Design spec: `docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-19-phase-10-daily-lottery-plan.md`.

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

| Phase                              | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Definition of done                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **0. Scaffold**                    | Vite + React + TS + Tailwind + ESLint/Prettier + Vitest set up. Routing shell. Empty pages.                                                                                                                                                                                                                                                                                                                                                                                                                                    | `npm run dev` serves the app; `npm test` runs; lint passes.                                                                  |
| **1. Data + Auth**                 | Dexie schema, `systems/auth.ts`, Register/Login/Logout, session persistence, route guards.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Can register a user, log out, log back in; refresh keeps you logged in; password is hashed in the DB.                        |
| **2. Wallet + Lobby + Game shell** | `walletStore`, `systems/wallet.ts`, starting stake, `LobbyPage`, `_shared/GameShell` + `BettingPanel`, `systems/rng.ts`. Daily top-up (+50 chips every 24h, ADR-0017). AppLayout shell with collapsible sidebar (ADR-0018, ADR-0019). RecentResults rail. Coin Flip placeholder game (ADR-0020) + 4 stub pages for Phases 3-6.                                                                                                                                                                                                 | New user has 1,000 chips; lobby shows balance; a placeholder game can place and settle a bet and write a `rounds` row.       |
| **3. Blackjack**                   | Full Blackjack: `logic.ts` (pure, tested) + UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Playable end-to-end; wallet updates; rounds logged; `logic.test.ts` covers blackjack, bust, push, dealer rules, double down. |
| **4. Roulette**                    | Full Roulette with all bet types from §8.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Playable; all payouts correct; multiple bets per round; tested.                                                              |
| **5. Slots**                       | 3-reel single-line slots with config-driven paytable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Playable; paytable correct; tested.                                                                                          |
| **6. Baccarat** ✅                 | Full Baccarat with all 9 bet zones (P / B / T + 2 Pairs + Big/Small + 2 Dragons), persistent 8-deck shoe with cut card, canonical third-card tableau, bead plate + big road scoreboard, theatrical card reveal, tier-mapped celebration.                                                                                                                                                                                                                                                                                       | Shipped 2026-05-18 — see `v0.7-baccarat`. ADR-0036, ADR-0037.                                                                |
| **7. Stats + Leaderboard** ✅      | `systems/stats.ts` (9 new aggregations), StatsPage with left-rail nav (overview + 5 game tabs), 16 stat cards per scope, Cards ↔ Graphs toggle. LeaderboardPage with 20 boards (5 overview + 3 × 5 per-game), Me/All toggle, banned-user exclusion. Shared Recharts chunk between player + admin (ADR-0039).                                                                                                                                                                                                                   | Shipped 2026-05-19 — see `v0.8-stats-leaderboard`. ADR-0038, ADR-0039.                                                       |
| **8. Polish**                      | Animations pass, sound effects, Retro Vegas styling refinement, empty/zero-balance states, daily top-up.                                                                                                                                                                                                                                                                                                                                                                                                                       | App feels finished; no broken states; design tokens used throughout.                                                         |
| **9. Admin Dashboard** ✅          | Hidden `/admin/*` with hardcoded admin login. Cross-cutting tracking: sessions, gameVisits, loginCount, soft ban, audit-trailed credit adjustments. Overview + Users list + per-user drill-in + Adjustments log + Sessions log. Recharts lazy-loaded (admin chunk only).                                                                                                                                                                                                                                                       | Shipped 2026-05-18 — see `v0.9-admin-dashboard`. ADR-0034, ADR-0035.                                                         |
| **10. Daily Lottery** ✅           | `systems/lottery.ts` (Pick-5+1 draw + buyTicket + settleMissedDraws + favorites + admin queries), Dexie v3 (4 new tables, additive), LotteryPage with NumberGrid + TicketCart + FavoritesDropdown + HERO countdown ↔ winning balls + HistorySlide, DrawAnimationModal (purchase + draw reveal), Sidebar 🎟️ LOTTERY + 🔴 unread dot, LobbyPage tile, AdminLotteryPage (4 stat cards + 2 frequency charts + recent draws). Strict 20:00 local daily draw with backfill on app open. 1M jackpot, ≈43% RTP, match-2 free re-entry. | Shipped 2026-05-19 — see `v0.10-lottery`. ADR-0040.                                                                          |
| **11. Bingo (Competitive)** ✅     | Competitive bingo vs AI computers. Two variants: British 90-ball 3×9 + American 75-ball 5×5 (lobby modal picker). Easy/Medium/Hard (2/5/9 CPUs + pot ×2/×4/×8 + latency tuning + Hard locks manual). 1 user card per game. Line/two-line/4-corners bonuses to first claimant. Tier3 winner takes pot. Coloured balls (UK 9-decile + US 5-column palettes).                                                                                                                                                                     | Shipped 2026-05-19 — see `v0.11.5-bingo-competitive`.                                                                        |
| **15. (Optional later)**           | Electron/Tauri desktop wrapper; split hands; multi-line slots; more games. (Old Phase 8 Polish moved to a real Phase 15 after Phases 10-14 game additions ship.)                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                                            |

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
