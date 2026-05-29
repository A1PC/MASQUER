# MASQUER

> _A local, offline, play-money casino._
>
> **v1.0 (Velvet Deco launch) — 2026-05-28.**

A **local, offline, play-money casino** that runs entirely in your browser on a
single machine. No internet, no real money, no remote server — just a polished
**Velvet Deco** casino (old-school Vegas / Monte-Carlo content rendered with
modern web craft) with **13 games**, a shared chip wallet, persistent stats,
a local leaderboard, and a brand-tokened hidden admin dashboard.

> **Play money only.** Chips are simulated. There is no payment processing, no
> crypto, no cash-out, and no online multiplayer. The login system separates
> local profiles for fun — it is **not** a security boundary.

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

MASQUER is a browser-based casino for one machine. You register a local
profile, get a starting stack of **1,000 chips**, and play. Every game settles
into one shared wallet; every completed round is recorded; stats and a
leaderboard aggregate across all local profiles. A daily +50-chip top-up keeps
you in the game.

The visual style is **Velvet Deco**: deep midnight felt, oxblood velvet, brass
hairlines, **gold**-leaf filigree, a Venetian Colombina mask emblem
(`MaskMark`) as the through-line motif. Cinzel-Decorative wordmark / Cinzel
section headings / Montserrat for body and tabular figures. Animations are
tasteful, signature, and **respect `prefers-reduced-motion` everywhere** via
`useEffectiveReducedMotion` (sound is gated on it too).

The single source of truth for the project's design is
[`BUILD_GUIDE.md`](./BUILD_GUIDE.md); the brand reference is
[`docs/brand/MASQUER.md`](./docs/brand/MASQUER.md); the per-game polish
recipe lives in [`docs/PHASE_15_PATTERNS.md`](./docs/PHASE_15_PATTERNS.md).

> **Migrating from a pre-1.0 build?** v1.0 renames the IndexedDB database
> (`localGamble` → `masquer`) and all `localStorage` keys
> (`localGamble.*` → `masquer.*`). Your pre-1.0 profile / rounds / lottery
> tickets do **not** migrate. Register a fresh profile — see
> [`CHANGELOG.md`](./CHANGELOG.md) 1.0.0 "Migration notes".

---

## Games

| Game               | Style       | Highlights                                                                                                                   |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Coin Flip**      | Placeholder | 1:1 payout; the original template game (Phase 2).                                                                            |
| **Blackjack**      | Table       | H17, split-to-4, double-after-split, insurance, 3:2 naturals, 6-deck shoe.                                                   |
| **Roulette**       | Table       | European single-zero wheel, all 10 bet types, decoupled-rotation spin animation.                                             |
| **Slots**          | Reels       | 3-reel single-payline, weighted symbols (~86% RTP), tiered win celebration + jackpot coin shower.                            |
| **Baccarat**       | Table       | All 9 bet zones, persistent 8-deck shoe with cut card, canonical Punto Banco third-card tableau, bead plate + big road.      |
| **Daily Lottery**  | Event       | Pick-5+1, one shared draw per local day at 20:00, 1M jackpot, match-2 free re-entry, backfill on app open.                   |
| **Bingo**          | Competitive | British 90-ball **and** American 75-ball, vs AI computers. Difficulty sets opponent count, pot, latency. Admin-tunable.      |
| **Plinko**         | Arcade      | 20-row board / 21 bins, 4 risk levels, manual + auto-drop (up to 100 balls), coloured balls.                                 |
| **Craps**          | Table       | Full half-table, two dice, come-out/point phases, ~17 bet types via a per-bet resolver registry, ON/OFF puck, table session. |
| **Texas Hold'em**  | Poker       | No-Limit, 2-6 players vs personality-archetype AI, tiered stakes, buy-in/cash-out session with rebuy.                        |
| **Five-Card Draw** | Poker       | No-Limit, single draw round (cap 3 discards), archetype-flavoured discard AI, reuses the shared poker core.                  |
| **Omaha Hold'em**  | Poker       | No-Limit, 4 hole cards, mandatory exactly-2+3 showdown rule, dedicated Omaha AI; completes the poker trio.                   |

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
- **Wallet-bridge-async / machine-pure.** For games with state machines (Blackjack, Roulette, Baccarat, Bingo, Plinko, Craps, Poker), the page component does the async work (`placeBet`, RNG, payout math) and sends fully-resolved events into a synchronous, deterministic XState machine. This keeps machines trivially testable.

See [`docs/adr/`](./docs/adr/) for the **47 architecture decision records**
and [`docs/conventions.md`](./docs/conventions.md) for code conventions.

---

## Running it

### Just want to play? One-double-click launcher for every platform

Run the platform installer once and you get a real desktop shortcut
(`MASQUER.app` on macOS, `MASQUER.lnk` on Windows, an XDG `.desktop` entry
in your Linux app menu). Double-click it any time you want to play — first
run installs deps and builds, subsequent runs reuse the build.

| Platform | One-time install                            |
| -------- | ------------------------------------------- |
| macOS    | `bash scripts/macos/install-shortcut.sh`    |
| Windows  | `pwsh scripts/windows/install-shortcut.ps1` |
| Linux    | `bash scripts/linux/install-shortcut.sh`    |

See [`scripts/README.md`](./scripts/README.md) for the cross-platform
overview, requirements, and per-platform docs (custom port, uninstall,
troubleshooting, icon rendering).

### Dev workflow (manual)

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

As of **v1.0** the suite is **~2,400+ tests** passing.

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
   ├─ craps/                 full-table single-player craps
   └─ poker/
      ├─ _shared/            deck, handEvaluator, sidePots, ai/, PlayingCard, PokerVariantModal
      ├─ holdem/             Texas Hold'em machine + UI
      ├─ five-card-draw/     Five-Card Draw machine + UI
      └─ omaha/              Omaha Hold'em machine + UI
docs/
├─ adr/                      architecture decision records (0001–0047)
├─ brand/MASQUER.md          Velvet Deco brand reference
├─ MANUAL_SMOKE_v1.md        pre-tag manual smoke checklist
├─ PHASE_15_PATTERNS.md      per-game polish recipe (Phase 15)
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

**Latest release: `v1.0` — MASQUER · Velvet Deco launch (2026-05-28).** The
first non-development release. All 14 gameplay phases plus all 16 Phase-15
sub-projects are merged.

**Shipped phases:** Scaffold · Data + Auth · Wallet + Lobby + Game shell ·
Blackjack · Roulette · Slots · Baccarat · Stats + Leaderboard · Admin
Dashboard · Daily Lottery · Bingo (competitive) · Plinko · Texas Hold'em ·
Five-Card Draw · Omaha · Craps · **Polish & Overhaul (16 sub-projects)**.

**Phase 15 highlights:** complete UI/UX overhaul (Velvet Deco), brand rename
to MASQUER, per-game polish (rules modals, brand tokens, dramatic reveals,
sound), admin expansion (per-game admin tabs for all 13 games), lazy-loaded
game routes (main bundle **477 → 222 KB gzipped, −53.5%**), manual smoke
checklist, and 47 ADRs preserved + amended where necessary. Full launch
notes: [`CHANGELOG.md`](./CHANGELOG.md) 1.0.0 + [`BUILD_GUIDE.md` §12 row
15 + v1.0 launch note](./BUILD_GUIDE.md). Per-game recipe:
[`docs/PHASE_15_PATTERNS.md`](./docs/PHASE_15_PATTERNS.md). Pre-tag
verification: [`docs/MANUAL_SMOKE_v1.md`](./docs/MANUAL_SMOKE_v1.md).

## License

This project is unlicensed source code published for personal-use
demonstration. No license is granted to redistribute or build on it. Audio
samples in `src/assets/audio/` are project-authored and released as **CC0**
(public domain dedication) — see
[`src/assets/audio/CREDITS.md`](./src/assets/audio/CREDITS.md).
