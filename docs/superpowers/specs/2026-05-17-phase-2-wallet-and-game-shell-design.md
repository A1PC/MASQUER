# Phase 2 — Wallet + App Shell + Game Shell — Design Spec

- **Status:** Approved (2026-05-17)
- **Author:** @adamzspare (with Claude Opus 4.7)
- **Phase:** 2 of 9 (BUILD_GUIDE.md §12)
- **Related ADRs:** 0015–0020 (created as part of this phase)
- **Implementation plan:** `docs/superpowers/plans/2026-05-17-phase-2-wallet-and-game-shell-plan.md` (to be written next)

---

## 1. Goal

Build the full play loop end-to-end so that every later phase just adds a new game on top of established machinery. By the end of Phase 2:

- A user can place a bet, see an RNG-driven outcome, settle the round, and watch their balance + a recent-results rail update — all backed by IndexedDB and animated with Framer Motion.
- The app has a real chrome (top bar, collapsible sidebar, profile + credits dropdowns) wrapping every signed-in page via a single layout route.
- A working **Coin Flip** placeholder game proves the flow.
- Four stub pages (Blackjack, Roulette, Slots, Baccarat) let the user click every cabinet from the lobby; each shows a "Coming in Phase N" splash.
- A **daily +50 chip** top-up keeps the app from going dead-broke; users see a 24h countdown in a credits dropdown.

Phase 2 is complete when BUILD_GUIDE §12 row 2 plus the Phase 2 extensions in §13 of this spec are met.

## 2. Non-goals

- Real Blackjack / Roulette / Slots / Baccarat game logic — Phases 3–6.
- Stats and leaderboard pages with real content — Phase 7. Phase 2 leaves them as Phase 1 placeholder pages, accessible via sidebar.
- A real profile page or settings page. The avatar dropdown's "View profile / Edit profile / Settings" items route to a single shared "Coming in Phase 8" placeholder page.
- Avatar customization beyond the Phase 1 random-palette pick — Phase 8.
- Sound effects on dropdowns, betting, win/loss — Phase 8.
- Bet-tracking persistence across page refresh (a bet placed but never settled is lost — chips deducted, no row in `rounds`). Acceptable per BUILD_GUIDE §1 non-goals (no remote server, no recovery guarantees beyond IndexedDB).
- The site renaming and full brand pass (logo, color refresh, typography review) — a dedicated chore before Phase 8.
- Multi-tab session sync — Phase 8 if at all.
- Real "View profile / Edit profile / Settings" pages — Phase 8.

## 3. Decisions made

| #   | Decision                                                                                                                                                       | Rationale                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Placeholder game = **Coin Flip** (real, end-to-end) + 4 stub pages for the real games                                                                          | Coin Flip exercises the full RNG → wallet → history → RecentResults flow; the 4 stubs let the user click every cabinet from the lobby.        |
| 2   | RNG seeding API: global `rng.seed(value)` / `rng.unseed()` toggle                                                                                              | Simplest test ergonomics; production code never calls them. mulberry32 PRNG underneath when seeded.                                           |
| 3   | Wallet error union: `insufficient_chips`, `below_minimum`, `above_maximum`, `not_integer`, `no_user`, `unknown`                                                | All six codes; belt-and-suspenders at the system boundary.                                                                                    |
| 4   | Lobby shell = collapsible sidebar (left) + horizontal cabinet carousel (center) + RecentResults rail (right, in-game only)                                     | Hybrid of two layout brainstorm options; sidebar gives fast game-switching, carousel showcases the cabinets.                                  |
| 5   | Daily top-up: **+50 chips every floating 24h** since last claim, no zero-chip bypass                                                                           | Strict cooldown is unexploitable. BUILD_GUIDE §4's "never bricked" wording softened to "always recoverable within 24h" via spec edit in PR D. |
| 6   | Layout route: single parent at `/` with `<RequireAuth>` baked in; children via `<Outlet />`                                                                    | Cleanest RR 7 idiom; one place for the shell; uniform auth-gating. ADR-0018.                                                                  |
| 7   | Sidebar collapse state: persisted to `localStorage` (`localGamble.ui.sidebarCollapsed`); default **OPEN** on first ever visit                                  | Discoverability for new users + remembers preference. ADR-0019 extends ADR-0010's localStorage allow-list.                                    |
| 8   | **5-PR sequence:** RNG → Wallet+History+Store → AppShell → Daily top-up → GameShell+CoinFlip+stubs                                                             | Tightest reviewable units. Each PR has one clear concern.                                                                                     |
| 9   | Design philosophy: old-school Vegas content rendered with modern web execution (centered scaling, Framer Motion transitions, respect `prefers-reduced-motion`) | Established in brainstorm; recorded in project memory; carries into Phase 3+.                                                                 |
| 10  | History is written by `settleRound` inside the same Dexie transaction as the balance credit; no separate `systems/history.ts` file                             | Avoids a race window or circular calls. BUILD_GUIDE §3 needs an edit (PR B) to reflect this. ADR-0016.                                        |
| 11  | `'coin-flip'` added to the `Round['game']` union                                                                                                               | TS-level addition only; Dexie schema is unaffected. BUILD_GUIDE §6 needs an edit (PR B).                                                      |
| 12  | New dep `dexie-react-hooks` for `useLiveQuery` (reactive Dexie reads)                                                                                          | Already implied by ADR-0001's stack; install lands in PR B.                                                                                   |

## 4. Architecture overview

### 4.1 Layer diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI LAYER (src/pages/, src/components/, src/games/)                  │
│                                                                      │
│  src/main.tsx → <AppBootstrap><RouterProvider router={router}/>...   │
│                                                                      │
│  Layout route at "/":                                                │
│    <RequireAuth>                                                     │
│      <AppLayout>                  ← TopBar + Sidebar + <Outlet/>     │
│        ├─ TopBar (logo, ☰ toggle, CreditsDropdown, ProfileDropdown)  │
│        ├─ Sidebar (collapsible, 6 nav items)                         │
│        └─ Outlet (page-specific):                                    │
│            • LobbyPage      (CabinetCarousel + RecentActivityStrip)  │
│            • CoinFlipPage   (GameShell + Coin + BettingPanel + Rail) │
│            • StubGamePage×4 (Blackjack/Roulette/Slots/Baccarat)      │
│            • StatsPage / LeaderboardPage (Phase 1 placeholders)      │
│            • ProfileStubPage (shared by Profile/Edit/Settings)       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ subscribes + calls
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STATE LAYER (src/store/)                                            │
│  sessionStore   — current user (Phase 1)                             │
│  walletStore    — balance + nextDailyEligibleAt (Phase 2)            │
│  uiStore        — sidebarCollapsed (Phase 2, persisted)              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ delegates I/O to
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  SYSTEMS LAYER (src/systems/)                                        │
│  auth.ts         — register/login/logout/restoreSession (Phase 1)    │
│  wallet.ts       — placeBet/settleRound/getBalance/claimDaily +      │
│                    DAILY_CLAIM_AMOUNT, STARTING_CHIPS (Phase 2)      │
│  rng.ts          — seed/unseed/randomInt/shuffle/pick (Phase 2)      │
│  hooks/useRecentRounds.ts (Phase 2)                                  │
│  crypto.ts, avatar.ts, auth-schemas.ts (Phase 1)                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ persists via
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DATA LAYER (src/db/)                                                │
│  schema.ts: User, Balance (+lastDailyClaimAt?), Round                │
│            (game union extended with 'coin-flip')                    │
│  + localStorage (auth.ts + uiStore.ts only)                          │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Invariants enforced

- UI never touches `src/db` or `localStorage` directly. The only exceptions to localStorage are `src/systems/auth.ts` (session key, Phase 1) and `src/store/uiStore.ts` (sidebar preference, Phase 2). Convention enforced by code review + ADR.
- Game code (`src/games/**`) only imports from `src/systems/*` and `src/games/_shared/*`. ESLint already enforces the `@/db` / `@/store` import ban under `src/games/**` (Phase 0).
- `placeBet` is the only path that decrements `balances.chips`. `settleRound` is the only path that credits a payout AND writes a `rounds` row (in one transaction).
- All chip amounts are integers. Wallet validates at the boundary.
- All randomness flows through `src/systems/rng.ts`. ESLint bans `Math.random` (Phase 0).

## 5. PR sequence

### 5.1 PR A — `phase-2-rng` (foundation, no UI)

**Goal:** Working RNG with seeded mode for tests. No other code touched.

**Files added:**

```
src/systems/rng.ts                         ~80 lines
src/systems/rng.test.ts                    ~160 lines (12 tests)
docs/adr/0015-rng-seeded-mode.md
```

**Files modified:**

```
docs/risks.md                              # add R-27
```

### 5.2 PR B — `phase-2-wallet` (money math + history + store, no UI)

**Goal:** Wallet API, walletStore, daily top-up function (UI in PR D), useRecentRounds hook. No UI changes.

**Files added:**

```
src/systems/wallet.ts                      ~200 lines
src/systems/wallet.test.ts                 ~280 lines (~25 tests)
src/store/walletStore.ts                   ~80 lines
src/store/walletStore.test.ts              ~80 lines
src/systems/hooks/useRecentRounds.ts       ~30 lines
src/systems/hooks/useRecentRounds.test.ts  ~60 lines
docs/adr/0016-history-in-settle-transaction.md
```

**Files modified:**

```
src/db/schema.ts        # Balance.lastDailyClaimAt? added; Round.game union adds 'coin-flip'
src/systems/auth.ts     # STARTING_CHIPS imported from wallet (single line)
package.json            # +dexie-react-hooks
BUILD_GUIDE.md          # §3 remove history.ts mention; §6 add 'coin-flip'
docs/risks.md           # +R-24..R-26, R-30, R-31
```

### 5.3 PR C — `phase-2-app-shell` (chrome, no daily top-up, no games)

**Goal:** AppLayout + TopBar + Sidebar + ProfileDropdown + UIStore + layout-route restructure. Balance shown as a plain badge (CreditsDropdown lands in PR D).

**Files added:**

```
src/store/uiStore.ts                       ~40 lines
src/store/uiStore.test.ts                  ~40 lines
src/components/AppLayout.tsx               ~25 lines
src/components/AppLayout.test.tsx          ~40 lines
src/components/TopBar.tsx                  ~25 lines
src/components/SidebarToggle.tsx           ~30 lines
src/components/Sidebar.tsx                 ~80 lines
src/components/Sidebar.test.tsx            ~70 lines
src/components/BalanceBadge.tsx            ~20 lines (placeholder; PR D replaces with CreditsDropdown)
src/components/ProfileDropdown.tsx         ~120 lines
src/components/ProfileDropdown.test.tsx    ~80 lines
src/pages/ProfileStubPage.tsx              ~30 lines
docs/adr/0018-layout-route-pattern.md
docs/adr/0019-ui-store-localstorage.md
```

**Files modified:**

```
src/router.tsx                # restructured: layout route at '/'; nested children
src/components/AppBootstrap.tsx  # after sessionStore.bootstrap resolves, walletStore.hydrate(user.id) before rendering
src/pages/LobbyPage.tsx       # replaces Phase 1 welcome with a placeholder "TODO carousel" until PR E
src/pages/LobbyPage.test.tsx  # update for new lobby content
docs/conventions.md           # localStorage allow-list extended to src/store/uiStore.ts
```

### 5.4 PR D — `phase-2-daily-topup` (claimDaily UI)

**Goal:** CreditsDropdown with countdown + claim button. Wallet's `claimDaily` already shipped in PR B.

**Files added:**

```
src/components/CreditsDropdown.tsx         ~150 lines
src/components/CreditsDropdown.test.tsx    ~120 lines (~10 tests)
docs/adr/0017-daily-topup.md
```

**Files modified:**

```
src/components/TopBar.tsx     # swap BalanceBadge → CreditsDropdown
BUILD_GUIDE.md                # §4 daily top-up clarification; §12 row 2 Phase 2 DoD updates
```

### 5.5 PR E — `phase-2-games` (GameShell + BettingPanel + RecentResults + Coin Flip + stubs)

**Goal:** Full game loop. Coin Flip works end-to-end; 4 stub pages reachable via lobby cabinets.

**Files added:**

```
src/games/_shared/GameShell.tsx              ~80 lines
src/games/_shared/GameShell.test.tsx         ~60 lines
src/games/_shared/BettingPanel.tsx           ~150 lines
src/games/_shared/BettingPanel.test.tsx      ~150 lines
src/games/_shared/RecentResults.tsx          ~80 lines
src/games/_shared/RecentResults.test.tsx     ~80 lines
src/games/_shared/useGameRound.ts            ~50 lines
src/games/_shared/useGameRound.test.ts       ~70 lines
src/games/_shared/StubGamePage.tsx           ~40 lines
src/games/coin-flip/logic.ts                 ~40 lines
src/games/coin-flip/logic.test.ts            ~120 lines (~10 tests)
src/games/coin-flip/CoinFlipPage.tsx         ~200 lines
src/games/coin-flip/CoinFlipPage.test.tsx    ~150 lines
src/pages/lobby/CabinetCarousel.tsx          ~80 lines
src/pages/lobby/RecentActivityStrip.tsx      ~40 lines
docs/adr/0020-coin-flip-placeholder.md
```

**Files modified:**

```
src/router.tsx                # add /play/coin-flip and the 4 stub routes as children of the layout
src/pages/LobbyPage.tsx       # replace PR C placeholder with real CabinetCarousel + RecentActivityStrip
src/pages/LobbyPage.test.tsx  # update for cabinet rendering
```

After PR E merges: a `chore(release): v0.3-wallet-and-game-shell` PR adds the CHANGELOG entry; tag pushed; GitHub release created.

## 6. File contents — verbatim drafts

The drafts in this section are the authoritative source. The implementation plan derives its task content from them.

### 6.1 `src/systems/rng.ts`

```ts
let seededState: number | null = null;

/** Set a deterministic seed for tests. Production code never calls this. */
export function seed(value: number): void {
  seededState = value >>> 0;
}

/** Return to crypto.getRandomValues. */
export function unseed(): void {
  seededState = null;
}

/** True if the RNG is currently in seeded (deterministic) mode. */
export function isSeeded(): boolean {
  return seededState !== null;
}

/** Returns a uniformly-distributed integer in [min, max], both inclusive. */
export function randomInt(minInclusive: number, maxInclusive: number): number {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
    throw new TypeError('randomInt requires integer bounds');
  }
  if (maxInclusive < minInclusive) {
    throw new RangeError('randomInt: max must be >= min');
  }
  const range = maxInclusive - minInclusive + 1;
  return minInclusive + boundedRandom(range);
}

/** Fisher–Yates shuffle (in-place). Returns the same array for chaining. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Uniform random element. Throws if the array is empty. */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new RangeError('pick: array is empty');
  return arr[randomInt(0, arr.length - 1)]!;
}

// --- internals ---------------------------------------------------------------

function boundedRandom(range: number): number {
  if (seededState !== null) {
    return Math.floor(prng() * range);
  }
  // Crypto path with rejection sampling to avoid modulo bias.
  const maxUint32 = 0xff_ff_ff_ff;
  const cutoff = maxUint32 - (maxUint32 % range);
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const n = buf[0]!;
    if (n < cutoff) return n % range;
  }
}

/** mulberry32 — fast, deterministic, statistically OK for tests. */
function prng(): number {
  let s = seededState!;
  s = (s + 0x6d_2b_79_f5) >>> 0;
  seededState = s;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}
```

### 6.2 `src/db/schema.ts` (modified — added field + extended union)

```ts
import Dexie, { type EntityTable } from 'dexie';

export interface User {
  id: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  pbkdf2Iterations: number;
  avatarColor: string;
  createdAt: number;
}

export interface Balance {
  userId: string;
  chips: number;
  updatedAt: number;
  /** Timestamp of last daily +50 claim. undefined for users created before this
   *  field existed (treated as "never claimed → eligible immediately"). */
  lastDailyClaimAt?: number;
}

export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: unknown;
  balanceAfter: number;
  playedAt: number;
}

export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;

  constructor(name = 'localGamble') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
  }
}
```

(No Dexie version bump — `lastDailyClaimAt` is not indexed and Dexie stores any object; existing rows simply lack the field.)

### 6.3 `src/systems/wallet.ts`

```ts
import { db } from '@/db';
import type { Balance, Round } from '@/db';

const STARTING_CHIPS = 1_000;
const DAILY_CLAIM_AMOUNT = 50;
const DAILY_CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export const WALLET_CONFIG = {
  STARTING_CHIPS,
  DAILY_CLAIM_AMOUNT,
  DAILY_CLAIM_INTERVAL_MS,
} as const;

export type Game = Round['game'];
export type Outcome = Round['outcome'];

export interface BetHandle {
  betId: string;
  userId: string;
  game: Game;
  amount: number;
  placedAt: number;
}

export interface RoundResult {
  outcome: Outcome;
  betAmount: number;
  /** Total chips returned to player (0 on loss; betAmount on push; betAmount + winnings on win). */
  payout: number;
  /** payout - betAmount. */
  netChange: number;
  /** Game-specific JSON payload, persisted to rounds.details. */
  details: unknown;
}

export type PlaceBetError =
  | 'insufficient_chips'
  | 'below_minimum'
  | 'above_maximum'
  | 'not_integer'
  | 'no_user'
  | 'unknown';

export type PlaceBetResult =
  | { ok: true; handle: BetHandle; newBalance: number }
  | { ok: false; error: PlaceBetError };

export type SettleResult =
  | { ok: true; newBalance: number; round: Round }
  | { ok: false; error: 'unknown' };

export type ClaimDailyError = 'no_user' | 'not_yet_eligible' | 'unknown';
export type ClaimDailyResult =
  | { ok: true; newBalance: number; nextEligibleAt: number }
  | { ok: false; error: ClaimDailyError; nextEligibleAt?: number };

// --- balance reads ----------------------------------------------------------

export async function getBalance(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  return row?.chips ?? 0;
}

export async function getBalanceRow(userId: string): Promise<Balance | undefined> {
  return db.balances.get(userId);
}

/** Returns timestamp at which the user can next claim. 0 = eligible now. */
export async function getDailyEligibleAt(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  if (!row?.lastDailyClaimAt) return 0;
  return row.lastDailyClaimAt + DAILY_CLAIM_INTERVAL_MS;
}

// --- place bet --------------------------------------------------------------

export async function placeBet(input: {
  userId: string;
  game: Game;
  amount: number;
  min: number;
  max: number;
}): Promise<PlaceBetResult> {
  if (!input.userId) return { ok: false, error: 'no_user' };
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'not_integer' };
  }
  if (input.amount < input.min) return { ok: false, error: 'below_minimum' };
  if (input.amount > input.max) return { ok: false, error: 'above_maximum' };

  try {
    const newBalance = await db.transaction('rw', db.balances, async () => {
      const row = await db.balances.get(input.userId);
      const current = row?.chips ?? 0;
      if (current < input.amount) throw new InsufficientChipsError();
      const after = current - input.amount;
      await db.balances.put({
        userId: input.userId,
        chips: after,
        updatedAt: Date.now(),
        ...(row?.lastDailyClaimAt !== undefined && {
          lastDailyClaimAt: row.lastDailyClaimAt,
        }),
      });
      return after;
    });
    return {
      ok: true,
      handle: {
        betId: crypto.randomUUID(),
        userId: input.userId,
        game: input.game,
        amount: input.amount,
        placedAt: Date.now(),
      },
      newBalance,
    };
  } catch (e) {
    if (e instanceof InsufficientChipsError) {
      return { ok: false, error: 'insufficient_chips' };
    }
    return { ok: false, error: 'unknown' };
  }
}

class InsufficientChipsError extends Error {}

// --- settle round -----------------------------------------------------------

/** Records the round and credits the payout in a single transaction.
 *  Idempotent: re-calling with the same handle returns the existing row. */
export async function settleRound(input: {
  handle: BetHandle;
  result: RoundResult;
}): Promise<SettleResult> {
  const { handle, result } = input;
  try {
    const { newBalance, round } = await db.transaction('rw', db.balances, db.rounds, async () => {
      const existing = await db.rounds.get(handle.betId);
      if (existing) {
        const row = await db.balances.get(handle.userId);
        return { newBalance: row?.chips ?? 0, round: existing };
      }
      const balanceRow = await db.balances.get(handle.userId);
      const balanceAfter = (balanceRow?.chips ?? 0) + result.payout;
      await db.balances.put({
        userId: handle.userId,
        chips: balanceAfter,
        updatedAt: Date.now(),
        ...(balanceRow?.lastDailyClaimAt !== undefined && {
          lastDailyClaimAt: balanceRow.lastDailyClaimAt,
        }),
      });
      const round: Round = {
        id: handle.betId,
        userId: handle.userId,
        game: handle.game,
        betAmount: result.betAmount,
        payout: result.payout,
        netChange: result.netChange,
        outcome: result.outcome,
        details: result.details,
        balanceAfter,
        playedAt: Date.now(),
      };
      await db.rounds.add(round);
      return { newBalance: balanceAfter, round };
    });
    return { ok: true, newBalance, round };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}

// --- daily top-up ----------------------------------------------------------

export async function claimDaily(userId: string): Promise<ClaimDailyResult> {
  if (!userId) return { ok: false, error: 'no_user' };
  try {
    const result = await db.transaction('rw', db.balances, async () => {
      const row = await db.balances.get(userId);
      const now = Date.now();
      const eligibleAt = row?.lastDailyClaimAt ? row.lastDailyClaimAt + DAILY_CLAIM_INTERVAL_MS : 0;
      if (now < eligibleAt) {
        return { eligible: false as const, nextEligibleAt: eligibleAt };
      }
      const newBalance = (row?.chips ?? 0) + DAILY_CLAIM_AMOUNT;
      await db.balances.put({
        userId,
        chips: newBalance,
        updatedAt: now,
        lastDailyClaimAt: now,
      });
      return {
        eligible: true as const,
        newBalance,
        nextEligibleAt: now + DAILY_CLAIM_INTERVAL_MS,
      };
    });
    if (!result.eligible) {
      return { ok: false, error: 'not_yet_eligible', nextEligibleAt: result.nextEligibleAt };
    }
    return { ok: true, newBalance: result.newBalance, nextEligibleAt: result.nextEligibleAt };
  } catch {
    return { ok: false, error: 'unknown' };
  }
}
```

### 6.4 `src/systems/auth.ts` modification

Add at the top:

```ts
import { WALLET_CONFIG } from '@/systems/wallet';
```

Replace the local `const STARTING_CHIPS = 1000;` with:

```ts
// (constant removed — uses WALLET_CONFIG.STARTING_CHIPS below)
```

In the `register()` function, change:

```ts
chips: STARTING_CHIPS,
```

to:

```ts
chips: WALLET_CONFIG.STARTING_CHIPS,
```

### 6.5 `src/systems/hooks/useRecentRounds.ts`

```ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Game, Round } from '@/systems/wallet';

/** Reactive: returns the latest `limit` rounds for this user+game, newest first.
 *  Pass `game = undefined` to get rounds across ALL games (used by the lobby
 *  recent-activity strip). */
export function useRecentRounds(
  userId: string | undefined,
  game: Game | undefined,
  limit = 12,
): Round[] {
  return useLiveQuery(
    async (): Promise<Round[]> => {
      if (!userId) return [];
      const rows = await db.rounds
        .where('[userId+playedAt]')
        .between([userId, 0], [userId, Number.MAX_SAFE_INTEGER])
        .reverse()
        .limit(game === undefined ? limit : limit * 3) // over-fetch when filtering by game
        .toArray();
      const filtered = game === undefined ? rows : rows.filter((r) => r.game === game);
      return filtered.slice(0, limit);
    },
    [userId, game, limit],
    [] as Round[],
  );
}
```

### 6.6 `src/store/walletStore.ts`

```ts
import { create } from 'zustand';
import * as wallet from '@/systems/wallet';
import type {
  BetHandle,
  ClaimDailyResult,
  PlaceBetResult,
  RoundResult,
  SettleResult,
} from '@/systems/wallet';

interface WalletState {
  balance: number | null;
  nextDailyEligibleAt: number | null;
  hydrating: boolean;

  hydrate: (userId: string) => Promise<void>;
  clear: () => void;
  placeBet: (args: {
    userId: string;
    game: wallet.Game;
    amount: number;
    min: number;
    max: number;
  }) => Promise<PlaceBetResult>;
  settleRound: (args: { handle: BetHandle; result: RoundResult }) => Promise<SettleResult>;
  claimDaily: (userId: string) => Promise<ClaimDailyResult>;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: null,
  nextDailyEligibleAt: null,
  hydrating: false,

  hydrate: async (userId) => {
    set({ hydrating: true });
    const [balance, nextDailyEligibleAt] = await Promise.all([
      wallet.getBalance(userId),
      wallet.getDailyEligibleAt(userId),
    ]);
    set({ balance, nextDailyEligibleAt, hydrating: false });
  },

  clear: () => set({ balance: null, nextDailyEligibleAt: null, hydrating: false }),

  placeBet: async (args) => {
    const result = await wallet.placeBet(args);
    if (result.ok) set({ balance: result.newBalance });
    return result;
  },

  settleRound: async (args) => {
    const result = await wallet.settleRound(args);
    if (result.ok) set({ balance: result.newBalance });
    return result;
  },

  claimDaily: async (userId) => {
    const result = await wallet.claimDaily(userId);
    if (result.ok) {
      set({ balance: result.newBalance, nextDailyEligibleAt: result.nextEligibleAt });
    } else if (result.error === 'not_yet_eligible' && result.nextEligibleAt) {
      set({ nextDailyEligibleAt: result.nextEligibleAt });
    }
    return result;
  },
}));

export const useBalance = (): number | null => useWalletStore((s) => s.balance);
export const useNextDailyEligibleAt = (): number | null =>
  useWalletStore((s) => s.nextDailyEligibleAt);
```

### 6.7 `src/store/uiStore.ts`

```ts
import { create } from 'zustand';

const SIDEBAR_KEY = 'localGamble.ui.sidebarCollapsed';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

function readSidebarPref(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (raw === null) return false; // First visit: default OPEN.
    return raw === 'true';
  } catch {
    return false;
  }
}

function writeSidebarPref(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    /* localStorage unavailable */
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: readSidebarPref(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    writeSidebarPref(next);
    set({ sidebarCollapsed: next });
  },
  setSidebarCollapsed: (collapsed) => {
    writeSidebarPref(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
}));
```

### 6.8 `src/components/AppBootstrap.tsx` (modified)

Phase 1 version called `sessionStore.bootstrap()`. Phase 2 adds a wallet hydrate step after a user is restored:

```tsx
import type { ReactNode } from 'react';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

interface Props {
  children: ReactNode;
}

export default function AppBootstrap({ children }: Props): JSX.Element {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const currentUser = useSessionStore((s) => s.currentUser);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const clearWallet = useWalletStore((s) => s.clear);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (currentUser) void hydrateWallet(currentUser.id);
    else clearWallet();
  }, [currentUser, hydrateWallet, clearWallet]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
```

### 6.9 `src/router.tsx` (modified)

```tsx
import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
import StubGamePage from '@/games/_shared/StubGamePage';
import ProfileStubPage from '@/pages/ProfileStubPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/lobby" replace /> },
      { path: 'lobby', element: <LobbyPage /> },
      { path: 'play/coin-flip', element: <CoinFlipPage /> },
      { path: 'play/blackjack', element: <StubGamePage game="blackjack" phase={3} /> },
      { path: 'play/roulette', element: <StubGamePage game="roulette" phase={4} /> },
      { path: 'play/slots', element: <StubGamePage game="slots" phase={5} /> },
      { path: 'play/baccarat', element: <StubGamePage game="baccarat" phase={6} /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'profile', element: <ProfileStubPage feature="Your profile" /> },
      { path: 'profile/edit', element: <ProfileStubPage feature="Edit profile" /> },
      { path: 'settings', element: <ProfileStubPage feature="Settings" /> },
    ],
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
```

### 6.10 `src/components/AppLayout.tsx`

```tsx
import type { JSX } from 'react';
import { Outlet } from 'react-router';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import { useUIStore } from '@/store/uiStore';

export default function AppLayout(): JSX.Element {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 6.11 `src/components/TopBar.tsx`

```tsx
import type { JSX } from 'react';
import SidebarToggle from './SidebarToggle';
import CreditsDropdown from './CreditsDropdown';
import ProfileDropdown from './ProfileDropdown';

export default function TopBar(): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-gold/30 bg-felt-deep px-5 py-3.5">
      <div className="flex items-center gap-3.5">
        <SidebarToggle />
        <span className="font-display tracking-wider text-gold text-lg">LOCALGAMBLE</span>
      </div>
      <div className="flex items-center gap-3.5 text-sm">
        <CreditsDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
```

In PR C (before CreditsDropdown exists), TopBar imports `BalanceBadge` instead:

```tsx
// PR C-only version
import BalanceBadge from './BalanceBadge';
// ...
<BalanceBadge />;
```

### 6.12 `src/components/SidebarToggle.tsx`

```tsx
import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export default function SidebarToggle(): JSX.Element {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  return (
    <button
      onClick={toggle}
      aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
      className="grid h-9 w-9 place-items-center rounded-md border border-gold/40 text-gold transition-colors hover:bg-gold/10"
    >
      <motion.span
        key={String(collapsed)}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.15 }}
        className="text-lg leading-none"
      >
        {collapsed ? '☰' : '✕'}
      </motion.span>
    </button>
  );
}
```

### 6.13 `src/components/Sidebar.tsx`

```tsx
import type { JSX } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { NavLink } from 'react-router';

interface Props {
  collapsed: boolean;
}

interface NavItemDef {
  to: string;
  icon: string;
  label: string;
  badge?: 'NEW';
  phase?: 'P3' | 'P4' | 'P5' | 'P6';
}

const GAMES: NavItemDef[] = [
  { to: '/lobby', icon: '🏛️', label: 'Lobby' },
  { to: '/play/coin-flip', icon: '🪙', label: 'Coin Flip', badge: 'NEW' },
  { to: '/play/blackjack', icon: '🃏', label: 'Blackjack', phase: 'P3' },
  { to: '/play/roulette', icon: '🎡', label: 'Roulette', phase: 'P4' },
  { to: '/play/slots', icon: '🎰', label: 'Slots', phase: 'P5' },
  { to: '/play/baccarat', icon: '🎴', label: 'Baccarat', phase: 'P6' },
];

const YOU: NavItemDef[] = [
  { to: '/stats', icon: '📊', label: 'Stats' },
  { to: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

export default function Sidebar({ collapsed }: Props): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : 200 }}
      initial={false}
      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="flex-shrink-0 overflow-hidden border-r border-gold/20 bg-felt-deep"
      aria-hidden={collapsed}
    >
      <nav className="w-[200px] py-4">
        <SectionLabel>GAMES</SectionLabel>
        {GAMES.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
        <Divider />
        <SectionLabel>YOU</SectionLabel>
        {YOU.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>
    </motion.aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1 font-display text-[10px] tracking-[1.5px] text-gold">{children}</div>
  );
}

function Divider() {
  return <div className="mx-4 my-3.5 border-t border-gold/20" />;
}

function NavItem({ item }: { item: NavItemDef }) {
  const { to, icon, label, badge, phase } = item;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-2 text-[13px] transition-colors ${
          isActive
            ? 'border-l-[3px] border-gold-bright bg-gold-bright/10 text-gold-bright'
            : phase
              ? 'text-white/55 hover:text-white'
              : 'text-white hover:bg-white/5'
        }`
      }
    >
      <span>
        {icon} {label}
      </span>
      {badge && (
        <span className="rounded-full bg-neon-cyan px-1.5 text-[9px] font-bold text-felt-deep">
          {badge}
        </span>
      )}
      {phase && <span className="text-[10px] opacity-70">{phase}</span>}
    </NavLink>
  );
}
```

### 6.14 `src/components/BalanceBadge.tsx` (PR C placeholder)

```tsx
import type { JSX } from 'react';
import { useBalance } from '@/store/walletStore';

export default function BalanceBadge(): JSX.Element {
  const balance = useBalance() ?? 0;
  return (
    <div className="rounded border border-gold bg-transparent px-3.5 py-1.5 font-mono text-gold-bright">
      💰 {balance.toLocaleString()}
    </div>
  );
}
```

Replaced by CreditsDropdown in PR D.

### 6.15 `src/components/CreditsDropdown.tsx` (PR D)

```tsx
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from 'framer-motion';
import { useBalance, useNextDailyEligibleAt, useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';

export default function CreditsDropdown(): JSX.Element {
  const [open, setOpen] = useState(false);
  const balance = useBalance() ?? 0;
  const eligibleAt = useNextDailyEligibleAt();
  const claim = useWalletStore((s) => s.claimDaily);
  const user = useCurrentUser();
  const reduce = useReducedMotion();

  // Countdown state — recomputed every second while dropdown is open.
  const [remaining, setRemaining] = useState(() => Math.max(0, (eligibleAt ?? 0) - Date.now()));
  useEffect(() => {
    if (!open) return;
    setRemaining(Math.max(0, (eligibleAt ?? 0) - Date.now()));
    const id = setInterval(() => {
      setRemaining(Math.max(0, (eligibleAt ?? 0) - Date.now()));
    }, 1_000);
    return () => clearInterval(id);
  }, [open, eligibleAt]);

  // Click-outside to close.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Animated count-up/down on balance change.
  const display = useMotionValue(balance);
  const rounded = useTransform(display, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(display, balance, {
      duration: reduce ? 0 : 0.6,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [balance, display, reduce]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded border border-gold bg-transparent px-3.5 py-1.5 font-mono text-gold-bright hover:bg-gold/10"
        aria-haspopup="true"
        aria-expanded={open}
      >
        💰 <motion.span>{rounded}</motion.span>
        <span className="text-[9px] opacity-70">{open ? '▴' : '▾'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-10 w-[260px] rounded-lg border border-gold bg-felt p-4 shadow-2xl"
            role="menu"
          >
            <div className="mb-3 flex items-baseline justify-between border-b border-gold/20 pb-2.5">
              <span className="font-display text-[13px] tracking-wider text-gold">YOUR CHIPS</span>
              <span className="font-mono text-lg text-gold-bright">
                <motion.span>{rounded}</motion.span>
              </span>
            </div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-white/60">
              Next daily drop
            </div>
            {remaining > 0 ? (
              <div className="flex items-center justify-between rounded-md border border-neon-cyan/30 bg-felt-deep px-3 py-2.5">
                <span className="font-mono text-lg text-neon-cyan">
                  {formatCountdown(remaining)}
                </span>
                <span className="text-xs font-bold text-chip-win">+50 💰</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (user) void claim(user.id);
                }}
                className="w-full rounded-md bg-chip-win/20 px-3 py-2.5 font-display tracking-wider text-chip-win hover:bg-chip-win/30"
              >
                CLAIM +50 💰
              </button>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              Claim 50 free chips every 24 hours from your last claim.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
```

### 6.16 `src/components/ProfileDropdown.tsx`

```tsx
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

export default function ProfileDropdown(): JSX.Element | null {
  const user = useCurrentUser();
  const logout = useSessionStore((s) => s.logout);
  const clearWallet = useWalletStore((s) => s.clear);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    clearWallet();
    void navigate('/login', { replace: true });
  };

  const go = (to: string) => {
    setOpen(false);
    void navigate(to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border-transparent bg-transparent px-1 py-1 text-sm text-white hover:bg-white/5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          className="inline-block h-7 w-7 rounded-full"
          style={{ backgroundColor: user.avatarColor }}
        />
        {user.username}
        <span className="text-[9px] opacity-70">{open ? '▴' : '▾'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-10 w-[220px] rounded-lg border border-gold bg-felt py-2 shadow-2xl"
            role="menu"
          >
            <div className="border-b border-gold/15 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-8 w-8 rounded-full"
                  style={{ backgroundColor: user.avatarColor }}
                />
                <div>
                  <div className="text-[13px] font-semibold text-white">{user.username}</div>
                  <div className="font-mono text-[11px] text-white/50">
                    Joined {timeAgo(user.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <MenuItem icon="👤" label="View profile" onClick={() => go('/profile')} />
            <MenuItem icon="✏️" label="Edit profile" onClick={() => go('/profile/edit')} />
            <MenuItem icon="📊" label="My stats" onClick={() => go('/stats')} />
            <MenuItem icon="⚙️" label="Settings" onClick={() => go('/settings')} />
            <div className="my-1.5 border-t border-gold/15" />
            <MenuItem icon="🚪" label="Log out" onClick={handleLogout} variant="danger" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] ${
        variant === 'danger' ? 'text-chip-loss' : 'text-white'
      } hover:bg-white/5`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  const days = Math.floor(seconds / 86_400);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 1) return `${minutes} min ago`;
  return 'just now';
}
```

### 6.17 `src/games/_shared/GameShell.tsx`

```tsx
import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router';
import RecentResults, { type RecentResultItem } from './RecentResults';

interface Props {
  title: string;
  meta?: string;
  recentItems?: RecentResultItem[];
  bettingPanel: ReactNode;
  children: ReactNode;
}

export default function GameShell({
  title,
  meta,
  recentItems,
  bettingPanel,
  children,
}: Props): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col items-center px-6 pt-7">
          <div className="mb-4 flex w-full max-w-[520px] items-center justify-between">
            <Link to="/lobby" className="text-xs text-white/60 hover:text-white">
              ← lobby
            </Link>
            <h1 className="font-display text-2xl tracking-wider text-gold-bright">{title}</h1>
            <span className="text-xs text-white/50">{meta}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
        </section>
        {recentItems !== undefined && (
          <aside className="w-[200px] flex-shrink-0 border-l border-gold/20 bg-felt-deep px-3.5 py-5">
            <RecentResults items={recentItems} />
          </aside>
        )}
      </div>
      <div className="border-t-2 border-gold/40 bg-felt-deep px-6 py-4">{bettingPanel}</div>
    </div>
  );
}
```

### 6.18 `src/games/_shared/RecentResults.tsx`

```tsx
import type { JSX } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface RecentResultItem {
  /** Stable key — typically the round.id from Dexie. */
  key: string;
  /** Short badge text (e.g. "H" / "T", "23 R", "🃏"). */
  badgeText: string;
  /** CSS color for the badge background. */
  badgeColor: string;
  /** CSS color for the badge text. */
  badgeTextColor: string;
  /** Bet amount label (e.g. "25"). */
  betLabel: string;
  /** Signed net change in chips (e.g. +25 or -10). */
  netChips: number;
  /** Outcome accent: drives the win/loss/push color on the net text. */
  accent: 'win' | 'loss' | 'push';
}

interface Props {
  items: readonly RecentResultItem[];
  emptyText?: string;
}

export default function RecentResults({ items, emptyText = 'No rounds yet.' }: Props): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <span className="font-display text-[10px] tracking-[1.5px] text-gold">RECENT</span>
        <span className="font-mono text-[10px] text-white/40">last {items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-[11px] text-white/50">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={item.key}
                layout
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: -12 }}
                animate={{ opacity: 1 - index * 0.06, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex items-center justify-between rounded-md bg-white/[0.03] px-2.5 py-2"
              >
                <span className="flex items-center gap-1.5 text-[13px] text-white">
                  <span
                    className="inline-grid h-[18px] w-[18px] place-items-center rounded-full font-display text-[9px] font-bold"
                    style={{ background: item.badgeColor, color: item.badgeTextColor }}
                  >
                    {item.badgeText}
                  </span>
                  <span className="font-mono text-[11px] opacity-70">{item.betLabel}</span>
                </span>
                <span
                  className={`font-mono text-[13px] font-bold ${
                    item.accent === 'win'
                      ? 'text-chip-win'
                      : item.accent === 'loss'
                        ? 'text-chip-loss'
                        : 'text-chip-push'
                  }`}
                >
                  {item.netChips > 0 ? '+' : ''}
                  {item.netChips}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```

### 6.19 `src/games/_shared/BettingPanel.tsx`

```tsx
import type { JSX } from 'react';
import { useState } from 'react';

interface Props {
  min: number;
  max: number;
  balance: number;
  denominations?: readonly number[];
  /** Optional last-bet amount for the "Repeat last" pill. */
  lastBet?: number;
  /** Called when the user wants to commit a bet of the current amount. */
  onCommit: (amount: number) => void;
  /** True when a bet is committed but the round hasn't been settled yet. */
  locked?: boolean;
  /** Render-prop for the game-specific call buttons (HEADS/TAILS, HIT/STAND...). */
  callButtons: (committedAmount: number | null) => JSX.Element;
}

const DEFAULT_DENOMINATIONS = [1, 5, 25, 100, 500] as const;

const CHIP_STYLES: Record<number, { bg: string; border: string; text: string; inner?: string }> = {
  1: { bg: '#fff', border: '#fff', text: '#06120c', inner: '#06120c' },
  5: { bg: '#e85d75', border: '#e85d75', text: '#fff', inner: '#fff' },
  25: { bg: '#27c4d6', border: '#27c4d6', text: '#fff', inner: '#fff' },
  100: { bg: '#3dd17a', border: '#3dd17a', text: '#fff', inner: '#fff' },
  500: { bg: '#1a1a1a', border: '#d4af37', text: '#ffe066' },
};

export default function BettingPanel({
  min,
  max,
  balance,
  denominations = DEFAULT_DENOMINATIONS,
  lastBet,
  onCommit,
  locked = false,
  callButtons,
}: Props): JSX.Element {
  const [amount, setAmount] = useState(0);
  const [committed, setCommitted] = useState<number | null>(null);

  const canAdd = (d: number) => !locked && amount + d <= Math.min(balance, max);
  const onChipClick = (d: number) => {
    if (canAdd(d)) setAmount((a) => a + d);
  };
  const onClear = () => {
    if (!locked) setAmount(0);
  };
  const onRepeat = () => {
    if (lastBet !== undefined && !locked && lastBet <= balance && lastBet <= max) {
      setAmount(lastBet);
    }
  };
  const onCommitClick = () => {
    if (amount < min || amount > max || amount > balance) return;
    onCommit(amount);
    setCommitted(amount);
  };
  // Allow caller to reset committed state when round settles. Exposed via key prop change in CoinFlipPage.

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-wider text-gold">YOUR BET</span>
        <span className="font-mono text-[11px] text-white/50">
          Balance: {balance.toLocaleString()}
        </span>
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-white/50">Add:</span>
        {denominations.map((d) => {
          const styles = CHIP_STYLES[d] ?? CHIP_STYLES[100]!;
          return (
            <button
              key={d}
              onClick={() => onChipClick(d)}
              disabled={!canAdd(d)}
              aria-label={`Add ${d} chips to bet`}
              className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-bold disabled:opacity-40"
              style={{
                background: styles.bg,
                color: styles.text,
                border: `3px solid ${styles.border}`,
                ...(styles.inner ? { boxShadow: `inset 0 0 0 2px ${styles.inner}` } : {}),
              }}
            >
              {d}
            </button>
          );
        })}
        {lastBet !== undefined && lastBet > 0 && !locked && (
          <button
            onClick={onRepeat}
            className="ml-auto rounded-md border border-gold bg-gold/15 px-3 py-2 text-xs text-gold-bright hover:bg-gold/25"
          >
            ↻ Repeat {lastBet}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex flex-1 items-center justify-between rounded-md border border-gold/30 bg-felt px-3.5 py-2.5">
          <span className="text-[11px] text-white/60">Bet amount</span>
          <span className="font-mono text-xl font-bold text-gold-bright">{amount}</span>
        </div>
        <button
          onClick={onClear}
          disabled={amount === 0 || locked}
          className="rounded-md border border-white/20 bg-transparent px-3.5 py-2.5 text-xs text-white/60 hover:bg-white/5 disabled:opacity-40"
        >
          Clear
        </button>
        {committed === null && (
          <button
            onClick={onCommitClick}
            disabled={amount < min || amount > balance}
            className="rounded-md bg-casino-red px-4 py-2.5 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
          >
            PLACE BET
          </button>
        )}
      </div>

      <div>{callButtons(committed)}</div>
    </div>
  );
}
```

### 6.20 `src/games/_shared/useGameRound.ts`

```ts
import { useCallback, useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useCurrentUser } from '@/store/sessionStore';
import type { BetHandle, Game, PlaceBetError, RoundResult } from '@/systems/wallet';

interface PlaceBetSuccess {
  ok: true;
  handle: BetHandle;
}
interface PlaceBetFailure {
  ok: false;
  error: PlaceBetError;
}

export interface UseGameRound {
  placeBet: (
    amount: number,
    opts: { min: number; max: number },
  ) => Promise<PlaceBetSuccess | PlaceBetFailure>;
  settle: (handle: BetHandle, result: RoundResult) => Promise<void>;
  resolving: boolean;
}

export function useGameRound(game: Game): UseGameRound {
  const user = useCurrentUser();
  const place = useWalletStore((s) => s.placeBet);
  const settleStore = useWalletStore((s) => s.settleRound);
  const [resolving, setResolving] = useState(false);

  const placeBet = useCallback<UseGameRound['placeBet']>(
    async (amount, opts) => {
      if (!user) return { ok: false, error: 'no_user' };
      const result = await place({ userId: user.id, game, amount, ...opts });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, handle: result.handle };
    },
    [user, place, game],
  );

  const settle = useCallback<UseGameRound['settle']>(
    async (handle, result) => {
      setResolving(true);
      try {
        await settleStore({ handle, result });
      } finally {
        setResolving(false);
      }
    },
    [settleStore],
  );

  return { placeBet, settle, resolving };
}
```

### 6.21 `src/games/_shared/StubGamePage.tsx`

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';

const GAME_META = {
  blackjack: { name: 'Blackjack', icon: '🃏', tagline: 'Beat the dealer to 21.' },
  roulette: { name: 'Roulette', icon: '🎡', tagline: 'Call the wheel.' },
  slots: { name: 'Slots', icon: '🎰', tagline: 'Spin the reels.' },
  baccarat: { name: 'Baccarat', icon: '🎴', tagline: 'Player, Banker, or Tie.' },
} as const;

interface Props {
  game: keyof typeof GAME_META;
  phase: 3 | 4 | 5 | 6;
}

export default function StubGamePage({ game, phase }: Props): JSX.Element {
  const meta = GAME_META[game];
  return (
    <main className="mx-auto grid min-h-full max-w-2xl place-items-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 text-6xl">{meta.icon}</div>
        <h1 className="mb-2 font-display text-3xl tracking-wider text-gold">
          {meta.name.toUpperCase()}
        </h1>
        <p className="mb-6 text-white/70">{meta.tagline}</p>
        <div className="mb-6 inline-block rounded-full border border-gold/40 bg-felt-deep px-5 py-2 font-mono text-sm text-gold">
          Coming in Phase {phase}
        </div>
        <div className="space-x-4">
          <Link to="/lobby" className="text-gold underline">
            Back to lobby
          </Link>
          <Link to="/play/coin-flip" className="text-neon-cyan underline">
            Try Coin Flip
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
```

### 6.22 `src/pages/ProfileStubPage.tsx`

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router';

interface Props {
  feature: string;
}

export default function ProfileStubPage({ feature }: Props): JSX.Element {
  return (
    <main className="mx-auto grid min-h-full max-w-2xl place-items-center p-8 text-center">
      <div>
        <div className="mb-4 text-6xl">⚙️</div>
        <h1 className="mb-2 font-display text-3xl tracking-wider text-gold">{feature}</h1>
        <p className="mb-6 text-white/70">Coming in Phase 8 (Polish).</p>
        <Link to="/lobby" className="text-gold underline">
          Back to lobby
        </Link>
      </div>
    </main>
  );
}
```

### 6.23 `src/games/coin-flip/logic.ts`

```ts
import { randomInt } from '@/systems/rng';
import type { RoundResult } from '@/systems/wallet';

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipDetails {
  call: CoinSide;
  landed: CoinSide;
}

/** Decides the outcome of a single coin flip round. Pure given RNG state. */
export function playRound(input: { call: CoinSide; betAmount: number }): RoundResult {
  const landed: CoinSide = randomInt(0, 1) === 0 ? 'heads' : 'tails';
  const won = landed === input.call;
  const payout = won ? input.betAmount * 2 : 0; // 1:1 → bet back + winnings
  const details: CoinFlipDetails = { call: input.call, landed };
  return {
    outcome: won ? 'win' : 'loss',
    betAmount: input.betAmount,
    payout,
    netChange: payout - input.betAmount,
    details,
  };
}

export const COIN_FLIP_CONFIG = {
  MIN_BET: 1,
  MAX_BET: 500,
} as const;
```

### 6.24 `src/games/coin-flip/CoinFlipPage.tsx`

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useGameRound } from '@/games/_shared/useGameRound';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { COIN_FLIP_CONFIG, playRound, type CoinFlipDetails, type CoinSide } from './logic';
import type { BetHandle } from '@/systems/wallet';
import type { RecentResultItem } from '@/games/_shared/RecentResults';

export default function CoinFlipPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle, resolving } = useGameRound('coin-flip');
  const rounds = useRecentRounds(user?.id, 'coin-flip', 12);
  const reduce = useReducedMotion();
  const [handle, setHandle] = useState<BetHandle | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [displayFace, setDisplayFace] = useState<CoinSide | '?'>('?');
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [betPanelKey, setBetPanelKey] = useState(0);

  if (!user) return null;

  const onCommit = async (amount: number) => {
    setError(null);
    const result = await placeBet(amount, {
      min: COIN_FLIP_CONFIG.MIN_BET,
      max: COIN_FLIP_CONFIG.MAX_BET,
    });
    if (!result.ok) {
      setError(
        result.error === 'insufficient_chips'
          ? 'Not enough chips.'
          : result.error === 'below_minimum'
            ? `Minimum bet is ${COIN_FLIP_CONFIG.MIN_BET}.`
            : result.error === 'above_maximum'
              ? `Maximum bet is ${COIN_FLIP_CONFIG.MAX_BET}.`
              : 'Something went wrong placing the bet.',
      );
      return;
    }
    setHandle(result.handle);
    setLastBet(amount);
  };

  const onCall = async (call: CoinSide) => {
    if (!handle || flipping) return;
    setFlipping(true);
    setLastNet(null);
    setDisplayFace('?');
    const result = playRound({ call, betAmount: handle.amount });
    // Spin animation duration matches Framer Motion rotation below.
    await new Promise((r) => setTimeout(r, reduce ? 0 : 1_000));
    await settle(handle, result);
    const details = result.details as CoinFlipDetails;
    setDisplayFace(details.landed);
    setLastNet(result.netChange);
    setHandle(null);
    setFlipping(false);
    // Force BettingPanel remount to clear its committed state.
    setBetPanelKey((k) => k + 1);
  };

  const items: RecentResultItem[] = rounds.map((r) => {
    const d = r.details as CoinFlipDetails;
    return {
      key: r.id,
      badgeText: d.landed === 'heads' ? 'H' : 'T',
      badgeColor: d.landed === 'heads' ? 'linear-gradient(135deg,#ffe066,#d4af37)' : '#06120c',
      badgeTextColor: d.landed === 'heads' ? '#6e0a1d' : '#d4af37',
      betLabel: String(r.betAmount),
      netChips: r.netChange,
      accent: r.outcome,
    };
  });

  return (
    <GameShell
      title="🪙 COIN FLIP"
      meta="1:1 · 1–500"
      recentItems={items}
      bettingPanel={
        <BettingPanel
          key={betPanelKey}
          min={COIN_FLIP_CONFIG.MIN_BET}
          max={COIN_FLIP_CONFIG.MAX_BET}
          balance={balance}
          lastBet={lastBet}
          locked={handle !== null || flipping || resolving}
          onCommit={onCommit}
          callButtons={(committedAmount) => (
            <div className="flex gap-2.5">
              <button
                onClick={() => onCall('heads')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1 rounded-md border-2 border-gold bg-casino-red py-3.5 font-display text-base tracking-wider text-white disabled:opacity-40"
              >
                HEADS
              </button>
              <button
                onClick={() => onCall('tails')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1 rounded-md border-2 border-gold bg-casino-red py-3.5 font-display text-base tracking-wider text-white disabled:opacity-40"
              >
                TAILS
              </button>
            </div>
          )}
        />
      }
    >
      <motion.div
        animate={flipping ? { rotateY: [0, 360, 720, 1080] } : { rotateY: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 1, ease: 'easeOut' }}
        className="grid h-[140px] w-[140px] place-items-center rounded-full font-display text-2xl tracking-wider"
        style={{
          background: 'linear-gradient(135deg,#ffe066,#d4af37 60%,#a8801e)',
          color: '#6e0a1d',
          boxShadow:
            '0 0 28px rgba(212,175,55,0.4), inset 0 4px 12px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {flipping ? '?' : displayFace === '?' ? '?' : displayFace.toUpperCase()}
      </motion.div>
      {lastNet !== null && !flipping && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`mt-4 rounded-full border px-5 py-1.5 font-display text-xs tracking-wider ${
            lastNet > 0
              ? 'border-chip-win bg-chip-win/15 text-chip-win'
              : 'border-chip-loss bg-chip-loss/15 text-chip-loss'
          }`}
        >
          {lastNet > 0 ? `✨ +${lastNet}` : `−${Math.abs(lastNet)}`}
        </motion.div>
      )}
      {error && <p className="mt-3 text-sm text-casino-red">{error}</p>}
      {displayFace === '?' && !flipping && lastNet === null && (
        <p className="mt-4 text-sm text-white/70">Place a bet, then call heads or tails.</p>
      )}
    </GameShell>
  );
}
```

### 6.25 `src/pages/lobby/CabinetCarousel.tsx`

```tsx
import type { JSX } from 'react';
import { Link } from 'react-router';

interface Cabinet {
  to: string;
  icon: string;
  label: string;
  status: 'playable' | 'stub';
  phase?: number;
}

const CABINETS: Cabinet[] = [
  { to: '/play/coin-flip', icon: '🪙', label: 'COIN FLIP', status: 'playable' },
  { to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'stub', phase: 3 },
  { to: '/play/roulette', icon: '🎡', label: 'ROULETTE', status: 'stub', phase: 4 },
  { to: '/play/slots', icon: '🎰', label: 'SLOTS', status: 'stub', phase: 5 },
  { to: '/play/baccarat', icon: '🎴', label: 'BACCARAT', status: 'stub', phase: 6 },
];

export default function CabinetCarousel(): JSX.Element {
  return (
    <div className="flex gap-3.5 overflow-x-auto py-1 pb-3">
      {CABINETS.map((c) => (
        <Link
          key={c.to}
          to={c.to}
          className={`flex min-w-[160px] flex-shrink-0 flex-col items-center justify-center rounded-[10px] border-2 border-gold p-6 text-center ${
            c.status === 'playable'
              ? 'bg-gradient-to-br from-neon-cyan to-[#27c4d6] text-felt-deep shadow-[0_0_16px_rgba(61,240,255,0.4)]'
              : 'bg-casino-red-deep text-gold-bright opacity-65 hover:opacity-90'
          }`}
        >
          <div className="text-[34px] leading-none">{c.icon}</div>
          <div className="mt-2.5 font-display text-[15px] tracking-wider">{c.label}</div>
          <div className="mt-1.5 text-[10px]">
            {c.status === 'playable' ? '▶ PLAY NOW' : `Phase ${c.phase} — preview`}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

### 6.26 `src/pages/lobby/RecentActivityStrip.tsx`

```tsx
import type { JSX } from 'react';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';

export default function RecentActivityStrip(): JSX.Element {
  const user = useCurrentUser();
  const rounds = useRecentRounds(user?.id, undefined, 5);
  if (rounds.length === 0) {
    return (
      <div className="mt-5 rounded-md border border-dashed border-gold/30 bg-gold/[0.05] px-4 py-3.5">
        <div className="font-display text-[13px] tracking-wider text-gold">📊 RECENT ACTIVITY</div>
        <div className="mt-1 text-xs text-white/60">No rounds played yet. Try the Coin Flip!</div>
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-md border border-dashed border-gold/30 bg-gold/[0.05] px-4 py-3.5">
      <div className="font-display text-[13px] tracking-wider text-gold">📊 RECENT ACTIVITY</div>
      <ul className="mt-2 space-y-1 text-xs text-white/80">
        {rounds.map((r) => (
          <li key={r.id} className="flex justify-between font-mono">
            <span>
              {r.game} · bet {r.betAmount}
            </span>
            <span
              className={
                r.outcome === 'win'
                  ? 'text-chip-win'
                  : r.outcome === 'loss'
                    ? 'text-chip-loss'
                    : 'text-chip-push'
              }
            >
              {r.netChange > 0 ? '+' : ''}
              {r.netChange}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 6.27 `src/pages/LobbyPage.tsx` (modified)

```tsx
import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import CabinetCarousel from './lobby/CabinetCarousel';
import RecentActivityStrip from './lobby/RecentActivityStrip';

export default function LobbyPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="px-8 py-7">
      <h2 className="mb-1.5 font-display text-2xl tracking-wider text-gold-bright">
        PICK YOUR POISON
      </h2>
      <p className="mb-5 text-xs text-white/55">Click a cabinet to play.</p>
      <CabinetCarousel />
      <RecentActivityStrip />
    </div>
  );
}
```

## 7. Test plan

### 7.1 RNG (`src/systems/rng.test.ts`)

| #   | Test                                                                                    |
| --- | --------------------------------------------------------------------------------------- |
| 1   | `seed(1)` then `randomInt(0,9)` 5× produces a deterministic sequence (recorded in test) |
| 2   | Same seed produces same sequence on a fresh `seed(N)` call                              |
| 3   | `unseed()` restores crypto path (validated by sequence diverging across runs)           |
| 4   | `isSeeded()` reflects current mode                                                      |
| 5   | `randomInt(5, 5)` always returns 5 (both inclusive)                                     |
| 6   | `randomInt(0, 9)` over 1000 seeded rolls hits every value at least 50×                  |
| 7   | `randomInt(1.5, 9)` throws TypeError                                                    |
| 8   | `randomInt(10, 5)` throws RangeError                                                    |
| 9   | `shuffle([1,2,3,4,5])` returns a permutation (same multiset)                            |
| 10  | `shuffle` with seed produces same order across runs                                     |
| 11  | `pick([])` throws RangeError                                                            |
| 12  | `pick(arr)` returns an element of arr; over 100 seeded picks of [a,b,c], each appears   |

### 7.2 Wallet (`src/systems/wallet.test.ts`)

| #   | Test                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `getBalance(missing)` returns 0                                                                            |
| 2   | `placeBet` with no userId returns `no_user`                                                                |
| 3   | `placeBet` non-integer returns `not_integer`                                                               |
| 4   | `placeBet` negative returns `not_integer`                                                                  |
| 5   | `placeBet` below min returns `below_minimum`                                                               |
| 6   | `placeBet` above max returns `above_maximum`                                                               |
| 7   | `placeBet` exceeding balance returns `insufficient_chips`                                                  |
| 8   | `placeBet` success deducts chips; returns handle + new balance                                             |
| 9   | `placeBet` preserves `lastDailyClaimAt` on the balance row                                                 |
| 10  | `settleRound` win credits payout; writes rounds row                                                        |
| 11  | `settleRound` loss credits 0; writes rounds row                                                            |
| 12  | `settleRound` push credits bet back; writes rounds row                                                     |
| 13  | `settleRound` idempotency: second call with same handle returns existing row, no double credit             |
| 14  | `settleRound` preserves `lastDailyClaimAt`                                                                 |
| 15  | `getDailyEligibleAt` returns 0 for never-claimed user (lastDailyClaimAt undefined)                         |
| 16  | `getDailyEligibleAt` returns lastClaim + 24h                                                               |
| 17  | `claimDaily` no-userId returns `no_user`                                                                   |
| 18  | `claimDaily` first time: credits 50, sets lastDailyClaimAt, returns nextEligibleAt                         |
| 19  | `claimDaily` within 24h returns `not_yet_eligible` with nextEligibleAt set                                 |
| 20  | `claimDaily` after 24h elapsed: credits 50 again                                                           |
| 21  | `claimDaily` and `placeBet` and `settleRound` interleave correctly (all three preserve the others' fields) |
| 22  | Two concurrent `claimDaily` calls: only one credits (transaction isolation)                                |
| 23  | `WALLET_CONFIG.STARTING_CHIPS` exported as 1000                                                            |
| 24  | `WALLET_CONFIG.DAILY_CLAIM_AMOUNT` exported as 50                                                          |
| 25  | `WALLET_CONFIG.DAILY_CLAIM_INTERVAL_MS` exported as 86_400_000                                             |

### 7.3 WalletStore (`src/store/walletStore.test.ts`)

| #   | Test                                                                 |
| --- | -------------------------------------------------------------------- |
| 1   | Initial state: balance/nextDailyEligibleAt are null; hydrating false |
| 2   | `hydrate` sets balance + nextDailyEligibleAt for an existing user    |
| 3   | `clear` resets to null                                               |
| 4   | `placeBet` success updates balance in store                          |
| 5   | `placeBet` failure leaves balance unchanged                          |
| 6   | `settleRound` success updates balance                                |
| 7   | `claimDaily` success updates balance + nextDailyEligibleAt           |
| 8   | `claimDaily` `not_yet_eligible` updates nextDailyEligibleAt only     |

### 7.4 useRecentRounds (`src/systems/hooks/useRecentRounds.test.ts`)

Renders a small consumer component, writes rounds via `db.rounds.add`, asserts reactive updates.

| #   | Test                                                           |
| --- | -------------------------------------------------------------- |
| 1   | Empty: returns []                                              |
| 2   | Single user, single game: returns matching rounds newest-first |
| 3   | Filters by `game` correctly                                    |
| 4   | Returns all games when `game === undefined`                    |
| 5   | Respects `limit`                                               |
| 6   | Re-renders when a new round is added                           |
| 7   | Does not return another user's rounds                          |

### 7.5 UIStore (`src/store/uiStore.test.ts`)

| #   | Test                                                                    |
| --- | ----------------------------------------------------------------------- |
| 1   | First visit (localStorage empty) defaults to `sidebarCollapsed = false` |
| 2   | If localStorage has 'true', initial is collapsed                        |
| 3   | If localStorage has 'false', initial is open                            |
| 4   | `toggleSidebar` flips and writes to localStorage                        |
| 5   | `setSidebarCollapsed(true)` writes and sets                             |
| 6   | If localStorage throws, defaults to open (graceful)                     |

### 7.6 Components

| File                            | Tests                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `AppLayout.test.tsx`            | Renders TopBar + Sidebar + Outlet; respects sidebar state                                                                              |
| `Sidebar.test.tsx`              | All 8 nav items render; collapse animation triggers; active state visible on current route                                             |
| `SidebarToggle.test.tsx`        | Toggles uiStore on click; aria-label updates                                                                                           |
| `BalanceBadge.test.tsx`         | Shows balance from walletStore (PR C)                                                                                                  |
| `CreditsDropdown.test.tsx`      | Toggles open/close; countdown formats correctly; CLAIM button when eligible; click-outside closes                                      |
| `ProfileDropdown.test.tsx`      | Toggles open/close; menu items navigate; Log out triggers session.logout + walletStore.clear; "Joined X ago" formats correctly         |
| `GameShell.test.tsx`            | Renders children in center; bettingPanel docked bottom; recentItems prop renders the rail                                              |
| `BettingPanel.test.tsx`         | Chip clicks add to amount; can't exceed balance; Clear resets; Place Bet commits; locked disables interactions; Repeat-last pill works |
| `RecentResults.test.tsx`        | Renders items; empty text shown when empty; new key triggers AnimatePresence enter (via testing-library snapshot of motion props)      |
| `StubGamePage.test.tsx`         | Renders meta for each game; "Coming in Phase N" text; back link goes to /lobby                                                         |
| `ProfileStubPage.test.tsx`      | Shows feature name + back link                                                                                                         |
| `CabinetCarousel.test.tsx`      | All 5 cabinets render; Coin Flip has "PLAY NOW" styling; others have "Phase N — preview"                                               |
| `RecentActivityStrip.test.tsx`  | Empty state; renders rounds from useRecentRounds                                                                                       |
| `LobbyPage.test.tsx` (modified) | Updated to expect new title + cabinet carousel                                                                                         |

### 7.7 Game logic & page

| File                              | Tests                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coin-flip/logic.test.ts`         | seed determinism, 10 tests: payout for win/loss, netChange consistency, details populated, calls match seeded RNG, integer payouts (no floats)                       |
| `coin-flip/CoinFlipPage.test.tsx` | renders shell + coin + buttons; PLACE BET commits via wallet; HEADS/TAILS settle and update balance; RecentResults rail updates; error message on insufficient chips |

Total new test count expected at end of Phase 2: ~150 tests (Phase 1 had 59; Phase 2 adds RNG×12 + Wallet×25 + WalletStore×8 + useRecentRounds×7 + UIStore×6 + components×~50 + game×~12 = ~120, plus refactors of Phase 1 component tests that touch wallet hydration).

## 8. ADRs introduced in Phase 2

| ID   | Title                                                                                                                | PR  |
| ---- | -------------------------------------------------------------------------------------------------------------------- | --- |
| 0015 | RNG seeded mode via global `seed()` / `unseed()` toggle                                                              | A   |
| 0016 | History row written by `settleRound`; no separate `systems/history.ts` (supersedes BUILD_GUIDE §3 architecture note) | B   |
| 0017 | Daily top-up: +50 chips every floating 24h; no zero-chip bypass; supersedes BUILD_GUIDE §4 "never bricked" wording   | D   |
| 0018 | Layout route pattern: single `/` parent with `<RequireAuth>` baked in; children via `<Outlet />`                     | C   |
| 0019 | UI preferences via `uiStore` with localStorage persistence; extends ADR-0010 allow-list                              | C   |
| 0020 | Coin Flip as Phase 2's placeholder game; reference template for Phase 3+ games                                       | E   |

Each ADR follows `docs/adr/_template.md`. Content drafted alongside the PR it lands in.

## 9. Risk register additions

Append to `docs/risks.md`:

| ID   | Risk                                                              | Phase | L   | I   | Mitigation                                                                                                              |
| ---- | ----------------------------------------------------------------- | ----- | --- | --- | ----------------------------------------------------------------------------------------------------------------------- |
| R-24 | Bet placed but settle never called (page crash mid-round)         | 2+    | M   | M   | In-memory bet handle; chips deducted on placeBet. If settle never runs, user loses the bet — acceptable for play-money. |
| R-25 | Double-settle of the same bet (re-render bug)                     | 2+    | L   | M   | `settleRound` keys the round on `handle.betId`; second call returns existing row, no double credit.                     |
| R-26 | Daily-claim race when user opens two tabs                         | 2     | L   | L   | `claimDaily` is a Dexie transaction; second tab reads updated lastDailyClaimAt and returns `not_yet_eligible`.          |
| R-27 | mulberry32 PRNG bias in test seeds                                | 2     | L   | L   | mulberry32 passes BigCrush; chi-squared sanity test in `rng.test.ts`.                                                   |
| R-28 | Countdown display drifts (setInterval throttled in inactive tabs) | 2     | M   | L   | Countdown computed from `eligibleAt - Date.now()` each tick; drift self-corrects when tab returns to foreground.        |
| R-29 | Sidebar localStorage value tampered to non-boolean                | 2     | L   | L   | Parser accepts only literal `'true'`; everything else (including null) means false.                                     |
| R-30 | RecentResults rail re-orders mid-animation on rapid settles       | 2     | M   | L   | Items keyed by `round.id`; Framer Motion `layout` handles ordering changes via FLIP.                                    |
| R-31 | Bet < min or > max accepted via console manipulation              | 2     | L   | L   | wallet.placeBet validates min/max at the system boundary, not just the UI form.                                         |

## 10. Conventions update

Append to `docs/conventions.md` under the existing "Imports" section:

```markdown
- localStorage access is allowed in `src/systems/auth.ts` AND `src/store/uiStore.ts` ONLY. Other code that needs persistence should use Dexie via src/db/.
```

(This replaces the Phase 1 single-file allow-list.)

## 11. GitHub project setup

Phase 2 milestone already exists from Phase 0 setup (milestone #3). Create 5 issues:

```bash
PHASE_2_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 2 — Wallet + Lobby + Game shell") | .number')

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR A — RNG (seedable) + tests + ADR-0015" \
  --body "src/systems/rng.ts with mulberry32-when-seeded, crypto-when-unseeded. 12 tests. See spec §5.1 + §6.1."

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR B — Wallet + WalletStore + history-in-settle + useRecentRounds" \
  --body "src/systems/wallet.ts (placeBet/settleRound/getBalance/claimDaily), src/store/walletStore.ts, useRecentRounds hook. 33 tests. BUILD_GUIDE §3 §6 edits. dexie-react-hooks dep. ADR-0016. See spec §5.2 + §6.3-§6.6."

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling" \
  --title "[Phase 2] PR C — AppLayout shell (TopBar + Sidebar + ProfileDropdown + UIStore + layout-route)" \
  --body "Layout-route restructure, TopBar with BalanceBadge placeholder, collapsible Sidebar, ProfileDropdown menu. ADRs 0018, 0019. See spec §5.3 + §6.8-§6.16 (except CreditsDropdown)."

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling" \
  --title "[Phase 2] PR D — Daily top-up CreditsDropdown + BUILD_GUIDE §4/§12 edits" \
  --body "Replace BalanceBadge with CreditsDropdown (countdown + claim button). BUILD_GUIDE §4 daily-topup clarification, §12 row 2 update. ADR-0017. See spec §5.4 + §6.15."

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR E — GameShell + BettingPanel + RecentResults + CoinFlip + 4 stub pages + LobbyPage carousel" \
  --body "Full game-shell + working Coin Flip + 4 stubs + lobby carousel + RecentActivityStrip. ~12 logic tests + ~25 component tests. ADR-0020. See spec §5.5 + §6.17-§6.27."

gh issue create --milestone "$PHASE_2_MS" --label "phase-2,chore" \
  --title "[Phase 2] Tag v0.3-wallet-and-game-shell release after PR E merges" \
  --body "chore(release) PR + tag + GH release + close milestone."
```

## 12. Manual smoke test plan per PR

### PR A

- `pnpm test:run` — 12 new RNG tests pass.
- No UI behavior changes.

### PR B

- `pnpm test:run` — all new wallet/store/hook tests pass.
- Login as existing user; in DevTools console: `import('@/store/walletStore').then(m => m.useWalletStore.getState().hydrate('YOUR_USER_ID'))` and inspect state. Balance loaded from Phase 1 data.
- No UI changes visible to user.

### PR C

- `pnpm dev` → login → land on `/lobby` (now inside AppLayout shell with TopBar + Sidebar).
- Top bar shows logo, ☰ toggle, balance badge (no dropdown yet), avatar+name.
- Click avatar → ProfileDropdown opens; click View profile / Edit profile / My stats / Settings → each navigates to `/profile`, `/profile/edit`, `/stats` (Phase 1 placeholder), `/settings`.
- Click Log out → returns to `/login`, walletStore cleared.
- Click ☰ → sidebar collapses smoothly; click again → opens. Refresh → preference preserved.
- First-ever-visit user (clear localStorage `localGamble.ui.sidebarCollapsed`) → sidebar starts OPEN.

### PR D

- Top bar balance is now CreditsDropdown (▾ caret).
- Click → dropdown shows balance + 24h-ish countdown OR CLAIM button if eligible.
- Click CLAIM → balance increases by 50; countdown resets to ~23h 59m 59s.
- Refresh → countdown picks up where it left off.

### PR E (full Phase 2 acceptance smoke per §13)

The 8-step smoke from spec §13 runs after PR E:

1. Register new user `Bea` → `/lobby` with `💰 1,000`.
2. Click `💰` → dropdown shows balance + CLAIM button (because lastDailyClaimAt undefined → eligibleAt=0 → immediate). Click CLAIM → balance 1,050 → countdown starts at 23h 59m 59s.
3. Click ☰ → sidebar collapses; click again → opens.
4. Click `🪙 Coin Flip` cabinet → `/play/coin-flip`.
5. Click chip 25 → bet 25 → click PLACE BET → HEADS/TAILS enable. Click HEADS → coin spins 1s → settles → balance updates → RecentResults rail gains an entry at top with slide animation.
6. Click 5 twice → bet 10 → click TAILS → another round. Confirm multiple rounds populate the rail with smooth animations; oldest entries fade.
7. DevTools → IndexedDB → `rounds` table has rows for every played round (`game='coin-flip'`, populated `details: {call, landed}`).
8. Click avatar → Log out → `/login`. Re-login → balance restores, RecentResults rail re-populates from Dexie.

## 13. Definition of Done — Phase 2

**Repository state**

- [ ] All files in §5 (5-PR inventory) on `main`
- [ ] `grep -R "Math.random" src/` returns zero hits
- [ ] No file outside `src/systems/auth.ts` and `src/store/uiStore.ts` calls `localStorage.*`
- [ ] No file in `src/pages/**` or `src/components/**` directly imports from `src/db/**`
- [ ] BUILD_GUIDE.md §3, §4, §6, §12 updated per §15 of this spec

**Tooling state**

- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm dev` serves; the 8-step PR E smoke passes
- [ ] `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check` all exit 0
- [ ] Coverage ≥ 80% on `src/systems/**/*.ts`; ≥ 90% on `src/games/coin-flip/logic.ts`
- [ ] Bundle size recorded in PR E description

**Functional state (BUILD_GUIDE §12 row 2 + extensions)**

- [ ] New user has 1,000 chips at registration
- [ ] Lobby shows balance via clickable badge with countdown dropdown
- [ ] Coin Flip end-to-end: bet → call → spin → settle → balance updates → rounds row → RecentResults rail
- [ ] Daily top-up claimable when timer expires; not claimable before
- [ ] Sidebar collapse/expand works; preference persists across refresh
- [ ] Profile dropdown menu items navigate; Log out works
- [ ] All 4 game cabinets in lobby route to stub pages
- [ ] `prefers-reduced-motion: reduce` disables Framer Motion transitions

**GitHub state**

- [ ] All 6 Phase 2 issues closed
- [ ] Tag `v0.3-wallet-and-game-shell` exists and is the latest release
- [ ] Phase 2 milestone closed
- [ ] CHANGELOG `[v0.3-wallet-and-game-shell]` entry added

**ADR state**

- [ ] ADRs 0015–0020 present and Accepted

## 14. Rollback procedure

- **Bad merge to main:** revert via PR (`git revert -m 1`).
- **Dev IndexedDB corrupted from wallet bugs:** DevTools → Application → IndexedDB → delete `localGamble` → reload. User loses local data; re-register.
- **CreditsDropdown countdown stuck/broken:** likely tab-throttling related; refresh fixes. Phase 8 may add a visibility-change listener if frequent.
- **Coin Flip outcome bias detected after seeding:** unlikely — `rng.test.ts` chi-squared catches it. If hit in production, replace mulberry32 with a better PRNG (xoshiro128\*\*) — same API.

## 15. BUILD_GUIDE.md edits required

| Edit                                                                                                                                                                                                                                                 | Where | PR   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- |
| Remove `systems/history.ts` from §3 architecture list; add note "History rows are written by `wallet.settleRound` in the same Dexie transaction as the balance credit (ADR-0016)."                                                                   | §3    | PR B |
| Add `'coin-flip'` to game union in §6 RoundResult interface and `rounds.game` enum                                                                                                                                                                   | §6    | PR B |
| Replace §4 daily top-up wording: "If a user hits 0, offer a 'daily top-up'..." → "Every user receives +50 chips every 24h from their last claim. The cooldown is not bypassable even at 0 chips; the app remains recoverable within 24h (ADR-0017)." | §4    | PR D |
| Update §12 row 2 (Phase 2 Deliverable column): add "+ daily top-up, +AppLayout shell with collapsible sidebar, +RecentResults rail, +Coin Flip placeholder + 4 stub game pages"                                                                      | §12   | PR D |

Each edit is committed in the PR most naturally associated with it.

## 16. Release procedure

After PR E merges:

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.3-wallet-and-game-shell
# Update CHANGELOG.md: move [Unreleased] entries → [v0.3-wallet-and-game-shell] with date
git add CHANGELOG.md
git commit -m "chore(release): v0.3-wallet-and-game-shell"
gh pr create --title "chore(release): v0.3-wallet-and-game-shell" \
  --body "Tags Phase 2 completion. See CHANGELOG.md."
# After CI green + merge:
git checkout main && git pull --ff-only
git tag -a v0.3-wallet-and-game-shell -m "Phase 2 — Wallet + App Shell + Game Shell complete"
git push origin v0.3-wallet-and-game-shell
gh release create v0.3-wallet-and-game-shell --title "v0.3-wallet-and-game-shell" \
  --notes-file CHANGELOG.md --latest
gh issue close $(gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --state open --json number --jq '.[].number')
PHASE_2_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 2 — Wallet + Lobby + Game shell") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_2_MS -f state=closed
```

## 17. Handoff to Phase 3

Once `v0.3-wallet-and-game-shell` is tagged, Phase 3 (Blackjack) gets a fully prepared substrate:

1. **Game template ready:** `src/games/coin-flip/` is the reference. Phase 3 mirrors it: `src/games/blackjack/logic.ts` (pure) + `src/games/blackjack/BlackjackPage.tsx` (uses GameShell + BettingPanel + useGameRound + useRecentRounds).
2. **Cabinet upgrade:** in `CabinetCarousel.tsx`, change Blackjack's `status` from `'stub'` to `'playable'`, drop the phase tag. In `router.tsx`, replace the StubGamePage element with the real `BlackjackPage`.
3. **Lobby badge update:** Add NEW badge to Blackjack in `Sidebar.tsx` and update Coin Flip to not-NEW.
4. **No router changes:** Blackjack's route already exists as a stub.
5. **No layout work:** Blackjack's UI just slots into the existing GameShell pattern.

Phase 3 brainstorming asks game-specific questions (deck count, soft-17 rule, double-down handling, split-or-defer, payout details — already covered in BUILD_GUIDE §8.1) and produces its own spec/plan/execution cycle.

## 18. Open questions

None blocking. To revisit later:

- Should the CoinFlipPage spin animation reflect the actual landed side (rotating to stop on H/T)? Currently it rotates and the face just changes at the end. Phase 8 polish.
- Should claim cooldown reset to "midnight" instead of floating 24h to encourage daily-ritual habits? Currently no — floating 24h locked in.
- Should the lobby surface a "claim daily" CTA inline when eligible (in addition to the badge dropdown)? Phase 8 polish.
- Real "Edit profile" / "Settings" pages — Phase 8.

---

_End of Phase 2 spec. The next artifact is the implementation plan
(`docs/superpowers/plans/2026-05-17-phase-2-wallet-and-game-shell-plan.md`),
produced by the writing-plans skill after user review of this spec._
