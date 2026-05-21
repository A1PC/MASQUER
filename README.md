# localGamble

A **local, offline, play-money casino** that runs entirely in your browser on a single machine. No internet, no real money, no remote server — just a polished retro-Vegas casino with a growing lineup of games, a shared chip wallet, persistent stats, and a local leaderboard.

> **Play money only.** Chips are simulated. There is no payment processing, no crypto, no cash-out, and no online multiplayer. The login system separates local profiles for fun — it is **not** a security boundary.

---

## Contents

- [What it is](#what-it-is)
- [Games](#games)
- [Core systems](#core-systems)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Running it](#running-it)
- [Scripts](#scripts)
- [Testing](#testing)
- [Project structure](#project-structure)
- [How the project is built (workflow)](#how-the-project-is-built-workflow)
- [Admin dashboard](#admin-dashboard)
- [Documentation map](#documentation-map)
- [Project status](#project-status)

---

## What it is

localGamble is a browser-based casino for one machine. You register a local profile, get a starting stack of **1,000 chips**, and play. Every game settles into one shared wallet; every completed round is recorded; stats and a leaderboard aggregate across all local profiles. A daily top-up keeps you in the game.

The visual style is **Retro Vegas**: neon signage, deep velvet reds, gold trim, dark felt-green backgrounds, chunky display fonts for headings, clean sans-serif for numbers. Animations are tasteful and respect `prefers-reduced-motion`.

The single source of truth for the project's design is [`BUILD_GUIDE.md`](./BUILD_GUIDE.md).

---

## Games

| Game              | Style       | Highlights                                                                                                              |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Coin Flip**     | Placeholder | 1:1 payout; the original template game (Phase 2).                                                                       |
| **Blackjack**     | Table       | H17, split-to-4, double-after-split, insurance, 3:2 naturals, 6-deck shoe.                                              |
| **Roulette**      | Table       | European single-zero wheel, all 10 bet types, decoupled-rotation spin animation.                                        |
| **Slots**         | Reels       | 3-reel single-payline, weighted symbols (~86% RTP), tiered win celebration + jackpot coin shower.                       |
| **Baccarat**      | Table       | All 9 bet zones, persistent 8-deck shoe with cut card, canonical Punto Banco third-card tableau, bead plate + big road. |
| **Daily Lottery** | Event       | Pick-5+1, one shared draw per local day at 20:00, 1M jackpot, match-2 free re-entry, backfill on app open.              |
| **Bingo**         | Competitive | British 90-ball **and** American 75-ball, vs AI computers. Difficulty sets opponent count, pot, latency. Admin-tunable. |
| **Plinko**        | Arcade      | 20-row board / 21 bins, 4 risk levels, manual + auto-drop (up to 100 balls), coloured balls.                            |
| **Texas Hold'em** | Poker       | No-Limit, 2-6 players vs personality-archetype AI, tiered stakes, buy-in/cash-out session with rebuy.                   |

Five-Card Draw and Omaha (poker variants) are planned and share the poker infrastructure shipped with Hold'em.

---

## Core systems

- **Accounts** — register / login / logout, PBKDF2-hashed passwords, session persisted to `localStorage`.
- **Wallet** — one chip balance per profile; `placeBet` / `settleRound`; every settled round writes exactly one `rounds` row in the same transaction as the balance credit. Daily +50 top-up every 24h.
- **RNG** — a single seeded random source (`src/systems/rng.ts`); `Math.random()` is banned by ESLint so all randomness is deterministic in tests.
- **Stats & history** — aggregations over the `rounds` table; per-game and overview stat cards with a Cards ↔ Graphs toggle.
- **Leaderboard** — overview + per-game boards, Me/All toggle, banned-user exclusion.
- **Admin dashboard** — hidden `/admin/*`: overview, users, per-user drill-in, credit adjustments (audit-trailed), sessions log, lottery admin, and per-difficulty Bingo config.

---

## Tech stack

| Layer              | Choice                                                             |
| ------------------ | ------------------------------------------------------------------ |
| Language           | **TypeScript 5** (strict, `exactOptionalPropertyTypes`)            |
| UI                 | **React 18**                                                       |
| Build / dev server | **Vite 5**                                                         |
| Styling            | **Tailwind CSS 3** (design tokens, no hardcoded hex in components) |
| Animation          | **Framer Motion 12** (respects `prefers-reduced-motion`)           |
| State machines     | **XState v5** + `@xstate/react` (per-round game logic)             |
| Global state       | **Zustand 5** (session, wallet, UI prefs)                          |
| Persistence        | **IndexedDB** via **Dexie 4** + `useLiveQuery`                     |
| Password hashing   | **Web Crypto API** (PBKDF2, 600k iterations)                       |
| Routing            | **React Router 7** (data-router pattern)                           |
| Charts             | **Recharts** (lazy-loaded shared chunk)                            |
| Testing            | **Vitest 2** + React Testing Library + jsdom + fake-indexeddb      |
| Lint / format      | **ESLint** (flat config) + **Prettier**                            |
| Package manager    | **pnpm 9** (via Corepack) on **Node 20**                           |

---

## Architecture

The guiding principle: **shared systems live in one place; each game is self-contained and plugs into them.**

- **Games are sandboxed.** A file under `src/games/**` may never import from `src/db/**` or `src/store/**`. Games go through `src/systems/**` only (`placeBet`, `settleRound`, `rng`). ESLint enforces this.
- **Logic before UI.** Each game has a pure `logic.ts` (no React, no I/O, fully unit-tested) and React components that call into it.
- **One round, one row.** Every completed round writes exactly one `rounds` row via `wallet.settleRound` (ADR-0016). The poker buy-in/cash-out session is the one documented exception (ADR-0041): one row per session, not per hand.
- **Money is integers.** All chip amounts are integers — no floats, no `parseFloat`.
- **Wallet-bridge-async / machine-pure.** For games with state machines (Blackjack, Roulette, Baccarat, Bingo, Plinko, Poker), the page component does the async work (`placeBet`, RNG, payout math) and sends fully-resolved events into a synchronous, deterministic XState machine. This keeps machines trivially testable.

See [`docs/adr/`](./docs/adr/) for the 41 architecture decision records and [`docs/conventions.md`](./docs/conventions.md) for code conventions.

---

## Running it

Requirements: **Node 20 LTS** (see `.nvmrc`) and **pnpm 9+** (via Corepack).

```bash
nvm use            # picks up .nvmrc (Node 20)
corepack enable    # enables the pinned pnpm
pnpm install
pnpm dev           # http://localhost:5173
```

First run: register a profile on the login screen — you start with 1,000 chips. Data is stored per-browser in IndexedDB, so a different browser (or cleared storage) starts fresh.

For full environment notes + troubleshooting, see [`docs/dev-setup.md`](./docs/dev-setup.md).

---

## Scripts

| Command          | Purpose                            |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start the Vite dev server          |
| `pnpm build`     | Production build (`tsc -b` + Vite) |
| `pnpm preview`   | Serve the production build locally |
| `pnpm lint`      | ESLint check (`--max-warnings=0`)  |
| `pnpm typecheck` | `tsc -b --noEmit`                  |
| `pnpm test`      | Vitest in watch mode               |
| `pnpm test:run`  | Vitest single run with coverage    |
| `pnpm format`    | Prettier write                     |

The **Definition of Done** before any merge is: `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build` all green, plus a manual click-through in the browser.

---

## Testing

- **Game logic is the priority.** Every `games/**/logic.ts` (or equivalent pure module) has thorough unit tests covering each outcome, payout, and edge case. Coverage on pure logic is enforced.
- **Determinism via seeded RNG.** Tests that consume randomness seed the RNG (or use `deckFromSeed` / `mulberry32`) so outcomes are reproducible.
- **Component tests** use React Testing Library — query by role/text; scope assertions to a container or `data-*` attribute when a value can appear in multiple places (a global `getByText` for a non-unique value is a flakiness trap).
- **Integration tests** register → bet → settle and assert both balance and the `rounds` row.
- **State machines** are tested by feeding scripted events with fixed seeds (the machine never does async work itself).

As of `v0.13a-texas-holdem` the suite is ~1,572 tests.

---

## Project structure

```
src/
├─ main.tsx                  app entry + RouterProvider
├─ router.tsx                route table (data-router pattern)
├─ theme/                    Retro Vegas design tokens
├─ db/                       Dexie schema + typed helpers
├─ store/                    Zustand stores (session, wallet, UI, bingoConfig)
├─ systems/                  shared side-effecting modules (auth, wallet, rng, stats, lottery, admin-auth)
├─ components/               shared UI (AppLayout, Sidebar, charts, …)
├─ pages/                    top-level pages (login, lobby, stats, leaderboard, admin/*, lottery/*)
└─ games/
   ├─ _shared/               GameShell, BettingPanel, useGameRound, useGameVisit
   ├─ blackjack/  roulette/  slots/  baccarat/  coin-flip/
   ├─ bingo/                 competitive British + American
   ├─ plinko/
   └─ poker/
      ├─ _shared/            deck, handEvaluator, sidePots, ai/, PlayingCard, PokerVariantModal
      └─ holdem/             Texas Hold'em machine + UI
docs/
├─ adr/                      architecture decision records (0001–0041)
├─ conventions.md            code conventions
├─ dev-setup.md              environment setup + troubleshooting
├─ risks.md                  risk register
└─ superpowers/
   ├─ specs/                 per-phase design specs
   └─ plans/                 per-phase implementation plans
```

---

## How the project is built (workflow)

Each BUILD_GUIDE phase follows a deliberate pipeline:

1. **Brainstorm** the design (often with a visual companion for layout questions) → write a **spec** to `docs/superpowers/specs/`.
2. **Plan** the implementation as bite-sized, TDD-friendly tasks → `docs/superpowers/plans/`.
3. **Execute** via subagent-driven development: one focused agent per PR, full Definition-of-Done before each PR opens.
4. **Ship**: spec PR → plan PR → implementation PRs (A, B, C…) → a release PR that tags `v0.PHASE-name`, cuts a GitHub Release, and updates this changelog.

Architecture decisions are recorded as ADRs. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for branch / commit / PR conventions.

---

## Admin dashboard

A hidden admin area lives at `/admin/login`. Credentials are **`admin` / `admin12345`**, hardcoded in source on purpose — this is a UI convenience for a local app, **not** a security boundary. It provides an overview, a users list with per-user drill-in, audit-trailed credit adjustments, a sessions log, lottery analytics, and per-difficulty Bingo configuration.

---

## Documentation map

- [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) — the master spec (read this first)
- [`CHANGELOG.md`](./CHANGELOG.md) — release history by phase
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branch / commit / PR conventions + workflow
- [`CLAUDE.md`](./CLAUDE.md) — hard rules for AI agents working in the repo
- [`docs/conventions.md`](./docs/conventions.md) — code conventions
- [`docs/dev-setup.md`](./docs/dev-setup.md) — environment setup + troubleshooting
- [`docs/risks.md`](./docs/risks.md) — risk register
- [`docs/adr/*.md`](./docs/adr/) — architecture decision records
- [`docs/superpowers/specs/*.md`](./docs/superpowers/specs/) — per-phase design specs
- [`docs/superpowers/plans/*.md`](./docs/superpowers/plans/) — per-phase implementation plans

---

## Project status

Latest release: **`v0.13a-texas-holdem`** (No-Limit Texas Hold'em + shared poker infrastructure).

Shipped phases: Scaffold, Data + Auth, Wallet + Lobby + Game shell, Blackjack, Roulette, Slots, Baccarat, Stats + Leaderboard, Admin Dashboard, Daily Lottery, Bingo (competitive), Plinko, Texas Hold'em.

Next up: **Five-Card Draw** and **Omaha** (reusing the poker infrastructure), then **Craps**, then a final **Polish** pass. See [`BUILD_GUIDE.md` §12](./BUILD_GUIDE.md) for the full roadmap. Progress is also tracked via [Milestones](../../milestones).
