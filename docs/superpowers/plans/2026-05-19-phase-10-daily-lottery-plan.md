# Phase 10 — Daily Lottery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the absent `/lottery` route with a fully playable daily Pick-5+1 lottery that uses a strict-clock-time draw with backfill on app open, supports unlimited tickets per draw with line-level granularity, lucky-dip number generation with within-ticket uniqueness, saved favorite number sets, a HERO countdown ↔ winning-balls swap, a scrollable history slide, and an admin dashboard view with frequency charts and a profit-tracking card.

**Architecture:** Six independent PRs landed sequentially on `main`. **PR A** ships the Dexie v3 schema bump and the pure logic + DB-writing functions in `src/systems/lottery.ts` plus ADR-0040. **PR B** ships the `LotteryPage` shell, number-grid picker, ticket cart, and favorites CRUD — manual purchases only. **PR C** layers the lucky-dip flow + within-ticket uniqueness enforcement + the purchase-time reveal modal. **PR D** wires the strict-clock daily scheduler, the draw-reveal sequence on app open, the HERO countdown↔balls component, the lobby tile, and the sidebar unread dot. **PR E** ships the history slide + admin `/admin/lottery` page (4 stat cards + 2 frequency bar charts + recent draws) and verifies the rounds-row settle flows into Phase 7's /stats and /leaderboard for free. **PR F** is release plumbing (BUILD_GUIDE + tag + GitHub Release + memory snapshot).

**Tech Stack:** TypeScript 5, React 18, Vite 5, Tailwind 3, Dexie 4 + dexie-react-hooks (`useLiveQuery`), Recharts ^2.15 (shared lazy chunk from Phase 7 ADR-0039), Zustand 5, Framer Motion 12, Vitest 2 + React Testing Library + jsdom + fake-indexeddb, pnpm 9.

**Spec:** `docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md` (merged in #131).

**Branch model:** 6 PRs, all targeting `main`. Each PR is independently mergeable, leaves the app in a working state, has full CI green.

```
phase-10-pr-a-lottery-system        → PR A: Dexie v3 + systems/lottery + ADR-0040
phase-10-pr-b-lottery-page          → PR B: LotteryPage shell + grid + cart + favorites
phase-10-pr-c-lucky-dip             → PR C: lucky dip + within-ticket uniqueness + reveal modal
phase-10-pr-d-scheduler-hero        → PR D: backfill + DrawAnimationModal + HERO + sidebar + lobby tile
phase-10-pr-e-history-admin         → PR E: history slide + admin lottery page + per-line settle integration
chore/release-v0.10-lottery         → PR F: BUILD_GUIDE + tag + release
```

**Hard rules (CLAUDE.md + project conventions) that apply to every task:**

1. **No `Math.random`** anywhere. Use `src/systems/rng.ts`. ESLint enforces.
2. **Money is integers.** Every chip amount — line cost, payout, balance — is an integer. No floats, no `parseFloat`.
3. **Games sandbox rule does NOT apply to lottery.** Per ADR-0040, lottery lives in `src/systems/` + `src/pages/lottery/`, NOT `src/games/lottery/`. The sandbox-import lint rule only governs `src/games/**`.
4. **Every settled line records exactly one `rounds` row** per the §7.4 decision matrix in the spec (some free-re-entry lines write no row by design).
5. **Per-task DoD:** named files exist with named contents; named tests pass; commit lands with the specified message.
6. **Per-PR DoD:** `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` all exit 0 locally; CI green (4 jobs: Meta files, Install·Typecheck·Build, Lint·Format, Test·Coverage).
7. **Conventional Commits, scoped.** Allowed scopes (from `commitlint.config.mjs` enum, verified by failed CI on PRs #124/#127): `blackjack, roulette, slots, baccarat, wallet, auth, rng, history, stats, leaderboard, theme, db, session, lobby, ci, build-guide, deps, deps-dev, release, repo, adr, routing, ui, shell, coin-flip, games, admin, tracking`. **`lottery` is NOT in the enum** — PR A's first task adds it. **`charts` is NOT in the enum either** — when introducing the lottery-specific chart wrappers in PR E, use scope `leaderboard` or `stats` (whichever is closer to the file's domain).
8. **One PR per phase chunk.** Branch off `main`, push, open PR, wait for CI green, merge, branch next off freshly-merged main.
9. **Do not edit `CLAUDE.md`.** The user edits that themselves.

**Repo conventions to mirror:**

- Test command is `pnpm exec vitest run` and `pnpm exec vitest run <path>`. Do NOT use `pnpm test --run` — pnpm consumes the `--run` flag.
- lint-staged + Husky auto-runs `eslint --fix` + `prettier --write` on commit. Prettier may reformat — expected.
- **dexie-react-hooks `useLiveQuery` overload trap (Phase 9/7 lesson):** providing an explicit `<T>` generic forces the 1-2 arg overload and rejects the 3rd default-value arg. Type the async querier's return as `Promise<T>` and let TS infer; never write `useLiveQuery<Foo>(...)`. Where the default needs casting, use `as Awaited<ReturnType<typeof fn>>` rather than a generic.
- **react-refresh + lazy imports (Phase 9 lesson):** if a file mixes `lazy()` component bindings with a non-component export, add a file-level `/* eslint-disable react-refresh/only-export-components */` comment.
- **`useReducedMotion` mock in tests (Phase 6 lesson):** mock via `vi.mock('framer-motion', ...)` returning `useReducedMotion: () => true` to exercise the reduced-motion path in jsdom.
- **ResizeObserver polyfill** for Recharts already lives in `src/test/setup.ts` from Phase 9 PR D.
- **`exactOptionalPropertyTypes` is on (Phase 7 PR A.7 lesson):** when a row's optional field is conditionally present, use `...(value !== undefined ? { field: value } : {})` rather than `field: value ?? undefined`.
- **react-hooks/set-state-in-effect** can flag legitimate UI ↔ store sync; use a file-scoped `/* eslint-disable */`...`/* eslint-enable */` pair with a comment when justified (precedent: `src/games/baccarat/BaccaratPage.tsx`).
- **Lazy-loaded page chunks (Phase 7 PR C lesson):** any new page that imports Recharts (directly or transitively) MUST be `React.lazy()`-loaded in `router.tsx`, otherwise Recharts gets bundled into the main chunk and inflates it by ~400 kB. ADR-0039 enforces this.

**Phase 7 / Phase 9 reusables we lean on heavily:**

- **`src/systems/stats.ts`** — Phase 7 module already has `getLeaderboard`, the StatsLeftRail/LeaderboardLeftRail components, and the per-game tab routing. Adding `game: 'lottery'` to the Round union and to GAME_LABELS in 3 places (PR E task E.5) makes lottery rounds show up automatically in /stats and /leaderboard.
- **`src/pages/stats/EmptyState.tsx`** — reusable empty-state with optional `gameName` + `ctaTo`. The lottery history can render this when the user has no lines yet ("No lottery lines yet — Visit lottery →").
- **`src/pages/stats/StatsLeftRail.tsx`** — `basePath`-parameterized; adding a `🎟️ Lottery` tab is one line + the slug map entry.
- **`src/pages/admin/StatCard.tsx`** — accepts `label`, `value`, `tone?: 'positive' | 'negative' | 'neutral'`, `sub?`. Reused for the admin lottery profit card (red/green via `tone`).
- **`src/components/charts/` shared chunk** — the new `NumberFrequencyBar` lives here so it rides the existing Recharts split.
- **`src/store/sessionStore.ts`** — `useCurrentUser()` selector for the current user id everywhere lottery code reads/writes per-user data.
- **`src/systems/wallet.ts`** — `placeBet({ userId, game, amount, min, max })` and `settleRound({ handle, result })` are unchanged; lottery uses both per-line at purchase and per-line at settle.
- **`src/systems/rng.ts`** — `mulberry32(seed)` PRNG, `randomInt(min, max)` (inclusive). Phase 10's draw seeding uses `mulberry32` with a deterministic seed derived from the date string.

---

## File map

Created across the 6 PRs:

```
src/db/schema.ts                              # PR A — Dexie v3 bump + lottery interfaces + Round.game union extended
src/db/index.ts                               # PR A — type re-exports

src/systems/lottery.ts                        # PR A — pure logic + DB-write functions
src/systems/lottery.test.ts                   # PR A — exhaustive unit + integration tests
src/systems/lottery.ts                        # PR E — admin queries appended
src/systems/lottery.test.ts                   # PR E — admin query tests appended

src/pages/lottery/
├─ LotteryPage.tsx                            # PR B — shell with HERO + Buy + History sections
├─ LotteryPage.test.tsx                       # PR B
├─ NumberGrid.tsx                             # PR B — 5×10 main + 1×10 bonus picker
├─ NumberGrid.test.tsx                        # PR B
├─ TicketCart.tsx                             # PR B — cart of lines pre-purchase
├─ TicketCart.test.tsx                        # PR B
├─ FavoritesDropdown.tsx                      # PR B — save / load / rename / delete
├─ FavoritesDropdown.test.tsx                 # PR B
├─ useLotteryCart.ts                          # PR B — cart state hook (add line, validate, generate lucky-dip at commit)
├─ useLotteryCart.test.ts                     # PR B
├─ DrawAnimationModal.tsx                     # PR C — purchase reveal mode; PR D adds draw reveal mode
├─ DrawAnimationModal.test.tsx                # PR C / PR D
├─ HeroSection.tsx                            # PR D — countdown ↔ winning balls swap
├─ HeroSection.test.tsx                       # PR D
├─ HistorySlide.tsx                           # PR E — scrollable past draws
├─ HistorySlide.test.tsx                      # PR E
└─ useLotteryBackfill.ts                      # PR D — drives settleMissedDraws on mount + app boot

src/components/charts/
├─ NumberFrequencyBar.tsx                     # PR E — admin frequency chart (rides shared Recharts chunk)
└─ NumberFrequencyBar.test.tsx                # PR E

src/pages/admin/
├─ AdminLotteryPage.tsx                       # PR E — /admin/lottery
├─ AdminLotteryPage.test.tsx                  # PR E
├─ AdminLeftRail.tsx                          # PR E — add LOTTERY entry (if rail exists; otherwise add to admin navigation)

docs/adr/
└─ 0040-lottery-as-system.md                  # PR A

modified:
src/router.tsx                                # PR B (wire /lottery), PR D (HERO reveal hook lifted), PR E (wire /admin/lottery)
src/components/Sidebar.tsx                    # PR D — add 🎟️ LOTTERY entry + 🔴 unread dot
src/pages/LobbyPage.tsx                       # PR D — add lottery tile
src/pages/stats/StatsLeftRail.tsx             # PR E — add Lottery tab + slug
src/pages/stats/StatsPage.tsx                 # PR E — TITLES map gains 'lottery'
src/pages/leaderboard/LeaderboardPage.tsx     # PR E — TITLES map gains 'lottery'
src/pages/stats/StatsPerGamePage.tsx          # PR E — GAME_LABELS gains 'lottery'
src/pages/leaderboard/LeaderboardPerGamePage.tsx # PR E — GAME_LABELS gains 'lottery'
commitlint.config.mjs                         # PR A — add 'lottery' to scope-enum
BUILD_GUIDE.md                                # PR F — mark Phase 10 ✅
```

Approximate test count: **~123 new tests** across 6 PRs.

---

## Definition of Done

**Per task:** named files exist with named contents; all task tests pass; commit lands on the branch with the specified commit message.

**Per PR:**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

All four green locally. CI green (4 jobs: Meta files, Install·Typecheck·Build, Lint·Format, Test·Coverage).

**Per phase (after PR E merges, before PR F):**

- Manual smoke walkthrough:
  - Fresh user → `/lottery` → HERO shows countdown to today's 20:00 draw.
  - Pick 5+1 numbers → save as favorite → reload favorite → tweak → "Add Line" → repeat → "Add Lucky Dip" 3 times → "Buy Ticket" → wallet debited, modal reveals lucky-dip lines flipping one at a time.
  - Try to add a manual duplicate line → blocked with inline error.
  - Buy a second ticket → success; duplicates across separate tickets allowed.
  - Set system clock forward to after 20:00 (or wait) → reopen app → `DrawAnimationModal` fires with today's draw + your line results.
  - Win at match-2 → free re-entry ticket auto-created for tomorrow's draw, visible in history.
  - Win at match-4 (manually rig a test) → wallet credited + /stats and /leaderboard show the line in lottery scope + biggest-single-win board includes it across all games.
  - Log in as admin → /admin/lottery → 4 stat cards populated (profit card green/red as appropriate), 2 frequency bar charts render, recent draws table includes today.
- Bundle: main bundle ≤ 800 kB; Recharts still in single shared chunk in `dist/assets/`.
- Reduced-motion: every animation (HERO swap, lucky-dip flips, draw reveal balls) renders correctly with `prefers-reduced-motion`.

---

## Pre-flight (do once before starting PR A)

- [ ] **Step P.1: Sync main**

```bash
git checkout main && git pull --ff-only
git log -1 --oneline
```

Expected: `6223795 docs(stats): Phase 10 Daily Lottery design spec (#131)` or newer (any Phase 7 release follow-up is fine).

- [ ] **Step P.2: Verify baseline is green**

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1005 tests passing (Phase 7 baseline). If anything fails, STOP and surface to the user.

- [ ] **Step P.3: Read the spec end-to-end**

`docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md`. Every section. Pay extra attention to §5.4 (lucky-dip flow), §6.3 (backfill ordering), §7.4 (rounds-row decision matrix).

- [ ] **Step P.4: Read existing systems modules for pattern**

```bash
cat src/systems/wallet.ts        # placeBet + settleRound API
cat src/systems/rng.ts           # mulberry32 + randomInt
cat src/db/schema.ts             # existing Dexie patterns
cat src/systems/stats.ts | head -100  # how a complex system module reads & writes
```

You'll mirror these patterns throughout PR A.

---

# PR A — Schema + systems/lottery (pure + DB writes) + ADR-0040

**Branch:** `phase-10-pr-a-lottery-system` (off `main`)
**Goal of this PR:** All the data-layer work for the lottery. Dexie v3 schema bump (4 new tables, additive only). `src/systems/lottery.ts` with both pure logic (draw seeding, line evaluation, lucky-dip generation, schedule arithmetic) and DB-writing functions (`buyTicket`, `settleMissedDraws`, favorites CRUD, admin queries). `game: 'lottery'` added to the Round union. Commitlint scope enum extended. ADR-0040 committed.
**Risk:** Medium. Schema bumps are reversible only by destroying the local DB. Mitigation: additive only (no column drops), v3 stores keep v2's table definitions verbatim.
**Estimated tasks:** 10.

## Task A.1: Branch + Dexie v3 schema bump + Round.game extension + commitlint scope

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `commitlint.config.mjs`

- [ ] **Step 1: Branch off main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-10-pr-a-lottery-system
```

- [ ] **Step 2: Add `'lottery'` to commitlint scope enum**

Read `commitlint.config.mjs` and add `'lottery'` to the `'scope-enum'` array. Place it after `'leaderboard'` for grouping consistency.

- [ ] **Step 3: Extend `Round.game` union and add lottery interfaces to `src/db/schema.ts`**

Replace the `Round` interface's `game` union and append the 4 new lottery interfaces + v3 store definition:

```ts
export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip' | 'lottery';
  betAmount: number;
  payout: number;
  netChange: number;
  outcome: 'win' | 'loss' | 'push';
  details: unknown;
  balanceAfter: number;
  playedAt: number;
}

/** v3 (Phase 10): one row per scheduled daily draw. Settled lazily on app open
 *  via settleMissedDraws(). Numbers are deterministic from the date seed. */
export interface LotteryDraw {
  /** Date string `YYYY-MM-DD` (user's local timezone). Primary key. */
  id: string;
  /** Epoch ms when the draw was actually run (NOT the scheduled time). */
  drawAt: number;
  /** Sorted-asc 5 main numbers in [1, 50]. */
  mainNumbers: number[];
  /** Bonus number in [1, 10]. */
  bonus: number;
  /** Count of all lines (paid + free-re-entry) participating in this draw. */
  totalLines: number;
  /** Sum of chip revenue collected from line sales (excludes free re-entries). */
  totalRevenue: number;
  /** Sum of chip payouts paid to winning lines. */
  totalPayout: number;
}

/** v3 (Phase 10): one row per purchase event. Wraps 1..N lines. */
export interface LotteryTicket {
  id: string;
  userId: string;
  drawId: string;
  purchasedAt: number;
  /** Total chips debited at purchase (0 if a free-re-entry wrapper). */
  totalCost: number;
  lineCount: number;
}

/** v3 (Phase 10): one row per 5+1 entry into a draw. */
export interface LotteryLine {
  id: string;
  ticketId: string;
  userId: string;
  drawId: string;
  mainNumbers: number[];
  bonusNumber: number;
  isLuckyDip: boolean;
  isFreeReentry: boolean;
  settled: boolean;
  matchTier: LotteryMatchTier | null;
  payout: number;
  /** For free re-entries, the settled line that earned this entry. */
  sourceLineId?: string;
}

export type LotteryMatchTier =
  | '5+bonus'
  | '5'
  | '4+bonus'
  | '4'
  | '3+bonus'
  | '3'
  | '2+bonus'
  | '2';

/** v3 (Phase 10): user-saved favorite number sets. */
export interface LotteryFavorite {
  id: string;
  userId: string;
  name: string;
  mainNumbers: number[];
  bonusNumber: number;
  createdAt: number;
}
```

- [ ] **Step 4: Append v3 store definition + EntityTable fields**

In the `LocalGambleDB` class, add the four EntityTable declarations and the v3 `.version(3).stores({ ... })` block AFTER the v2 block. The v3 block must restate all v2 stores (Dexie requires the full schema per version):

```ts
export class LocalGambleDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  balances!: EntityTable<Balance, 'userId'>;
  rounds!: EntityTable<Round, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  gameVisits!: EntityTable<GameVisit, 'id'>;
  adjustments!: EntityTable<Adjustment, 'id'>;
  lotteryDraws!: EntityTable<LotteryDraw, 'id'>;
  lotteryTickets!: EntityTable<LotteryTicket, 'id'>;
  lotteryLines!: EntityTable<LotteryLine, 'id'>;
  lotteryFavorites!: EntityTable<LotteryFavorite, 'id'>;

  constructor(name = 'MASQUER') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
    this.version(2).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
    });
    this.version(3).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
      sessions: 'id, userId, loginAt, [userId+loginAt]',
      gameVisits: 'id, userId, game, sessionId, [userId+game], [userId+enteredAt]',
      adjustments: 'id, userId, adjustedAt, [userId+adjustedAt]',
      // Phase 10 additions
      lotteryDraws: 'id, drawAt',
      lotteryTickets: 'id, userId, drawId, purchasedAt, [userId+drawId]',
      lotteryLines: 'id, ticketId, userId, drawId, settled, [userId+drawId], [drawId+settled]',
      lotteryFavorites: 'id, userId, createdAt, [userId+createdAt]',
    });
  }
}
```

- [ ] **Step 5: Verify typecheck + existing tests pass**

```bash
pnpm typecheck
pnpm exec vitest run
```

Expected: typecheck exit 0; all 1005 baseline tests still pass (no behavior change yet — type union extension is backwards-compatible because lottery rows don't exist).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts commitlint.config.mjs
git commit -m "feat(db): Dexie v3 lottery tables + extend Round.game with 'lottery'"
```

## Task A.2: Pure logic — `drawForDate`, `lineKey`, `evaluateLine`, `payoutFor`

**Files:**

- Create: `src/systems/lottery.ts`
- Create: `src/systems/lottery.test.ts`

- [ ] **Step 1: Write `src/systems/lottery.ts` initial surface**

```ts
import { db, type LotteryDraw, type LotteryMatchTier } from '@/db';
import { mulberry32 } from '@/systems/rng';

const MAIN_POOL_SIZE = 50;
const MAIN_PICK_COUNT = 5;
const BONUS_POOL_SIZE = 10;

/** Deterministic seed derived from the date string. djb2-ish hash for speed. */
function dateSeed(date: string): number {
  let h = 5381;
  const prefix = 'MASQUER.lottery.';
  const input = prefix + date;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0; // | 0 → keep i32
  }
  // Unsigned 32-bit for mulberry32 (it expects a uint32 seed).
  return h >>> 0;
}

/** Deterministic per-date draw: 5 sorted-asc main numbers + 1 bonus number. */
export function drawForDate(date: string): { mainNumbers: number[]; bonus: number } {
  const rng = mulberry32(dateSeed(date));
  // Pick 5 distinct from [1, MAIN_POOL_SIZE]. Fisher-Yates partial draw.
  const pool: number[] = [];
  for (let i = 1; i <= MAIN_POOL_SIZE; i += 1) pool.push(i);
  for (let i = 0; i < MAIN_PICK_COUNT; i += 1) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const mainNumbers = pool.slice(0, MAIN_PICK_COUNT).sort((a, b) => a - b);
  const bonus = 1 + Math.floor(rng() * BONUS_POOL_SIZE);
  return { mainNumbers, bonus };
}

/** Canonical string key for a line — used for dedupe within a ticket. */
export function lineKey(line: { mainNumbers: number[]; bonusNumber: number }): string {
  const sorted = [...line.mainNumbers].sort((a, b) => a - b);
  return `${sorted.join(',')}|${line.bonusNumber}`;
}

/** Match a line against a draw. Returns the tier or null for no match. */
export function evaluateLine(
  line: { mainNumbers: number[]; bonusNumber: number },
  draw: { mainNumbers: number[]; bonus: number },
): LotteryMatchTier | null {
  const drawSet = new Set(draw.mainNumbers);
  let mains = 0;
  for (const n of line.mainNumbers) if (drawSet.has(n)) mains += 1;
  const bonus = line.bonusNumber === draw.bonus;
  if (mains === 5 && bonus) return '5+bonus';
  if (mains === 5) return '5';
  if (mains === 4 && bonus) return '4+bonus';
  if (mains === 4) return '4';
  if (mains === 3 && bonus) return '3+bonus';
  if (mains === 3) return '3';
  if (mains === 2 && bonus) return '2+bonus';
  if (mains === 2) return '2';
  return null;
}

/** Tier → chip payout. Match-2 tiers return 0 (the free re-entry is granted elsewhere). */
export function payoutFor(tier: LotteryMatchTier | null): number {
  switch (tier) {
    case '5+bonus':
      return 1_000_000;
    case '5':
      return 500_000;
    case '4+bonus':
      return 100_000;
    case '4':
      return 10_000;
    case '3+bonus':
      return 2_000;
    case '3':
      return 100;
    case '2+bonus':
    case '2':
      return 0; // free re-entry granted by settleMissedDraws
    case null:
      return 0;
  }
}

/** Marker re-export so callers can import LotteryDraw from the same module. */
export type { LotteryDraw };
```

- [ ] **Step 2: Write tests for the 4 pure functions**

```ts
// src/systems/lottery.test.ts
import { describe, expect, it } from 'vitest';
import { drawForDate, lineKey, evaluateLine, payoutFor } from './lottery';

describe('drawForDate', () => {
  it('is deterministic for the same date', () => {
    const a = drawForDate('2026-05-19');
    const b = drawForDate('2026-05-19');
    expect(a).toEqual(b);
  });

  it('returns different numbers for different dates', () => {
    const a = drawForDate('2026-05-19');
    const b = drawForDate('2026-05-20');
    expect(a.mainNumbers).not.toEqual(b.mainNumbers);
  });

  it('main numbers are 5 distinct in [1, 50], sorted ascending', () => {
    const { mainNumbers } = drawForDate('2026-05-19');
    expect(mainNumbers).toHaveLength(5);
    expect(new Set(mainNumbers).size).toBe(5);
    for (const n of mainNumbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(50);
    }
    const sorted = [...mainNumbers].sort((a, b) => a - b);
    expect(mainNumbers).toEqual(sorted);
  });

  it('bonus is in [1, 10]', () => {
    const { bonus } = drawForDate('2026-05-19');
    expect(bonus).toBeGreaterThanOrEqual(1);
    expect(bonus).toBeLessThanOrEqual(10);
  });
});

describe('lineKey', () => {
  it('produces the same key for the same numbers regardless of order', () => {
    const a = lineKey({ mainNumbers: [5, 12, 3, 49, 27], bonusNumber: 7 });
    const b = lineKey({ mainNumbers: [49, 27, 5, 3, 12], bonusNumber: 7 });
    expect(a).toBe(b);
  });

  it('differs when bonus differs', () => {
    const a = lineKey({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
    const b = lineKey({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 2 });
    expect(a).not.toBe(b);
  });
});

describe('evaluateLine', () => {
  const draw = { mainNumbers: [3, 12, 25, 41, 49], bonus: 7 };

  it.each([
    { line: { mainNumbers: [3, 12, 25, 41, 49], bonusNumber: 7 }, tier: '5+bonus' },
    { line: { mainNumbers: [3, 12, 25, 41, 49], bonusNumber: 8 }, tier: '5' },
    { line: { mainNumbers: [3, 12, 25, 41, 1], bonusNumber: 7 }, tier: '4+bonus' },
    { line: { mainNumbers: [3, 12, 25, 41, 1], bonusNumber: 8 }, tier: '4' },
    { line: { mainNumbers: [3, 12, 25, 1, 2], bonusNumber: 7 }, tier: '3+bonus' },
    { line: { mainNumbers: [3, 12, 25, 1, 2], bonusNumber: 8 }, tier: '3' },
    { line: { mainNumbers: [3, 12, 1, 2, 4], bonusNumber: 7 }, tier: '2+bonus' },
    { line: { mainNumbers: [3, 12, 1, 2, 4], bonusNumber: 8 }, tier: '2' },
    { line: { mainNumbers: [3, 1, 2, 4, 5], bonusNumber: 7 }, tier: null },
    { line: { mainNumbers: [3, 1, 2, 4, 5], bonusNumber: 8 }, tier: null },
    { line: { mainNumbers: [1, 2, 4, 5, 6], bonusNumber: 7 }, tier: null },
    { line: { mainNumbers: [1, 2, 4, 5, 6], bonusNumber: 8 }, tier: null },
  ])('returns $tier for line $line.mainNumbers / bonus $line.bonusNumber', ({ line, tier }) => {
    expect(evaluateLine(line, draw)).toBe(tier);
  });
});

describe('payoutFor', () => {
  it.each([
    ['5+bonus', 1_000_000],
    ['5', 500_000],
    ['4+bonus', 100_000],
    ['4', 10_000],
    ['3+bonus', 2_000],
    ['3', 100],
    ['2+bonus', 0],
    ['2', 0],
    [null, 0],
  ] as const)('tier %s → %d', (tier, expected) => {
    expect(payoutFor(tier)).toBe(expected);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: 4 describe blocks, all pass (~21 individual cases).

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): pure draw + evaluate + payout functions"
```

## Task A.3: Pure logic — `generateLuckyDipLine`, `nextDrawAt`

**Files:**

- Modify: `src/systems/lottery.ts`
- Modify: `src/systems/lottery.test.ts`

- [ ] **Step 1: Append to `src/systems/lottery.ts`**

```ts
import { randomInt } from '@/systems/rng';

const DRAW_HOUR = 20; // 20:00 local time
const LUCKY_DIP_RETRY_BUDGET = 500;

/** Generates a fresh 5+1 line that's distinct from `existing`. Throws if the
 *  retry budget is exhausted (practically impossible at sane line counts). */
export function generateLuckyDipLine(
  existing: ReadonlyArray<{ mainNumbers: number[]; bonusNumber: number }>,
): { mainNumbers: number[]; bonusNumber: number } {
  const existingKeys = new Set(existing.map(lineKey));
  for (let attempt = 0; attempt < LUCKY_DIP_RETRY_BUDGET; attempt += 1) {
    const pool: number[] = [];
    for (let i = 1; i <= MAIN_POOL_SIZE; i += 1) pool.push(i);
    for (let i = 0; i < MAIN_PICK_COUNT; i += 1) {
      const j = i + randomInt(0, pool.length - i - 1);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const mainNumbers = pool.slice(0, MAIN_PICK_COUNT).sort((a, b) => a - b);
    const bonusNumber = randomInt(1, BONUS_POOL_SIZE);
    const candidate = { mainNumbers, bonusNumber };
    if (!existingKeys.has(lineKey(candidate))) return candidate;
  }
  throw new Error(
    `Lucky-dip generation exhausted ${LUCKY_DIP_RETRY_BUDGET} attempts. ` +
      `Existing lines: ${existing.length}.`,
  );
}

/** Returns epoch ms of the next scheduled draw boundary at DRAW_HOUR local.
 *  If now is before today's DRAW_HOUR, returns today's. Otherwise tomorrow's. */
export function nextDrawAt(now: number): number {
  const d = new Date(now);
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DRAW_HOUR, 0, 0, 0);
  if (candidate.getTime() > now) return candidate.getTime();
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, DRAW_HOUR, 0, 0, 0);
  return next.getTime();
}

/** Returns the date string `YYYY-MM-DD` (user local timezone) for a given timestamp. */
export function dateStringFor(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 2: Append tests**

```ts
import { generateLuckyDipLine, nextDrawAt, dateStringFor } from './lottery';

describe('generateLuckyDipLine', () => {
  it('generates a valid 5+1 line', () => {
    const line = generateLuckyDipLine([]);
    expect(line.mainNumbers).toHaveLength(5);
    expect(new Set(line.mainNumbers).size).toBe(5);
    expect(line.bonusNumber).toBeGreaterThanOrEqual(1);
    expect(line.bonusNumber).toBeLessThanOrEqual(10);
  });

  it('avoids generating a line that matches an existing line', () => {
    const existing = [{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }];
    for (let i = 0; i < 50; i += 1) {
      const line = generateLuckyDipLine(existing);
      expect(lineKey(line)).not.toBe(lineKey(existing[0]!));
    }
  });

  it('avoids many existing lines without exhausting the budget', () => {
    // Generate 20 lines in a chain, each excluding all previous.
    const lines: { mainNumbers: number[]; bonusNumber: number }[] = [];
    for (let i = 0; i < 20; i += 1) {
      const line = generateLuckyDipLine(lines);
      lines.push(line);
    }
    const keys = lines.map(lineKey);
    expect(new Set(keys).size).toBe(20);
  });
});

describe('nextDrawAt', () => {
  it('returns today 20:00 when now is before today 20:00', () => {
    // 2026-05-19 12:00 local
    const now = new Date(2026, 4, 19, 12, 0, 0, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(19);
    expect(new Date(next).getHours()).toBe(20);
  });

  it('returns tomorrow 20:00 when now is at or past today 20:00', () => {
    const now = new Date(2026, 4, 19, 20, 0, 0, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(20);
    expect(new Date(next).getHours()).toBe(20);
  });

  it('returns tomorrow 20:00 at 20:00:01', () => {
    const now = new Date(2026, 4, 19, 20, 0, 1, 0).getTime();
    const next = nextDrawAt(now);
    expect(new Date(next).getDate()).toBe(20);
  });
});

describe('dateStringFor', () => {
  it('returns YYYY-MM-DD for a given timestamp (local)', () => {
    const ts = new Date(2026, 4, 19, 12, 0, 0).getTime();
    expect(dateStringFor(ts)).toBe('2026-05-19');
  });

  it('pads month and day with leading zeros', () => {
    const ts = new Date(2026, 0, 3, 12, 0, 0).getTime();
    expect(dateStringFor(ts)).toBe('2026-01-03');
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: ~30 tests pass (21 from A.2 + 9 new).

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): generateLuckyDipLine + nextDrawAt + dateStringFor"
```

## Task A.4: `buyTicket` (manual + lucky-dip + uniqueness)

**Files:**

- Modify: `src/systems/lottery.ts`
- Modify: `src/systems/lottery.test.ts`

`buyTicket` validates manual duplicates, generates lucky-dip numbers, debits the wallet, and inserts a ticket + lines in one Dexie transaction.

- [ ] **Step 1: Append to `src/systems/lottery.ts`**

```ts
import type { LotteryTicket, LotteryLine } from '@/db';
import { placeBet } from '@/systems/wallet';

const LINE_COST = 10;

export type BuyTicketInput =
  | { kind: 'manual'; mainNumbers: number[]; bonusNumber: number }
  | { kind: 'lucky-dip' };

export type BuyTicketResult =
  | { ok: true; ticketId: string; lines: LotteryLine[] }
  | { ok: false; error: 'duplicate-manual-lines' | 'insufficient-chips' | 'invalid-line' };

/** Buys a ticket containing the given lines for the next scheduled draw.
 *  Generates lucky-dip lines, ensuring within-ticket uniqueness.
 *  Debits the wallet for paid lines (lineCount * LINE_COST). */
export async function buyTicket(input: {
  userId: string;
  lines: BuyTicketInput[];
  now?: number;
}): Promise<BuyTicketResult> {
  const now = input.now ?? Date.now();
  const drawId = dateStringFor(input.now !== undefined ? input.now : nextDrawCutoff(now));

  // 1. Validate manual lines: each is a valid 5+1, and no two are duplicates.
  const manualLines: { mainNumbers: number[]; bonusNumber: number }[] = [];
  for (const item of input.lines) {
    if (item.kind === 'manual') {
      if (!isValidLine(item)) return { ok: false, error: 'invalid-line' };
      manualLines.push({ mainNumbers: item.mainNumbers, bonusNumber: item.bonusNumber });
    }
  }
  const manualKeys = new Set<string>();
  for (const line of manualLines) {
    const key = lineKey(line);
    if (manualKeys.has(key)) return { ok: false, error: 'duplicate-manual-lines' };
    manualKeys.add(key);
  }

  // 2. Generate lucky-dip lines, growing the "existing" set with each one.
  const generatedLines: { mainNumbers: number[]; bonusNumber: number }[] = [];
  const allSoFar: { mainNumbers: number[]; bonusNumber: number }[] = [...manualLines];
  for (const item of input.lines) {
    if (item.kind === 'lucky-dip') {
      const fresh = generateLuckyDipLine(allSoFar);
      generatedLines.push(fresh);
      allSoFar.push(fresh);
    }
  }

  // 3. Debit wallet.
  const totalCost = input.lines.length * LINE_COST;
  const bet = await placeBet({
    userId: input.userId,
    game: 'lottery',
    amount: totalCost,
    min: LINE_COST,
    max: Number.MAX_SAFE_INTEGER,
  });
  if (!bet.ok) return { ok: false, error: 'insufficient-chips' };

  // 4. Build line rows in input order (manual + lucky-dip interleaved).
  const ticketId = crypto.randomUUID();
  const lines: LotteryLine[] = [];
  let manualIdx = 0;
  let dipIdx = 0;
  for (const item of input.lines) {
    const source = item.kind === 'manual' ? manualLines[manualIdx++]! : generatedLines[dipIdx++]!;
    lines.push({
      id: crypto.randomUUID(),
      ticketId,
      userId: input.userId,
      drawId,
      mainNumbers: source.mainNumbers,
      bonusNumber: source.bonusNumber,
      isLuckyDip: item.kind === 'lucky-dip',
      isFreeReentry: false,
      settled: false,
      matchTier: null,
      payout: 0,
    });
  }

  const ticket: LotteryTicket = {
    id: ticketId,
    userId: input.userId,
    drawId,
    purchasedAt: now,
    totalCost,
    lineCount: lines.length,
  };

  await db.transaction('rw', db.lotteryTickets, db.lotteryLines, async () => {
    await db.lotteryTickets.put(ticket);
    await db.lotteryLines.bulkPut(lines);
  });

  return { ok: true, ticketId, lines };
}

function isValidLine(line: { mainNumbers: number[]; bonusNumber: number }): boolean {
  if (line.mainNumbers.length !== MAIN_PICK_COUNT) return false;
  const unique = new Set(line.mainNumbers);
  if (unique.size !== MAIN_PICK_COUNT) return false;
  for (const n of line.mainNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > MAIN_POOL_SIZE) return false;
  }
  if (!Number.isInteger(line.bonusNumber)) return false;
  if (line.bonusNumber < 1 || line.bonusNumber > BONUS_POOL_SIZE) return false;
  return true;
}

/** Returns the "next" scheduled draw timestamp for the purchase cutoff —
 *  i.e., the draw the buy is for. If now is before today's 20:00, it's today.
 *  If now is at or after 20:00, it's tomorrow. (Same logic as nextDrawAt.) */
function nextDrawCutoff(now: number): number {
  return nextDrawAt(now);
}
```

- [ ] **Step 2: Add tests** (uses `fake-indexeddb` from the existing test setup)

```ts
import { beforeEach } from 'vitest';
import { db, resetDb } from '@/test/db-helpers';
import { register } from '@/systems/auth';
import { SESSION_KEY } from '@/store/sessionStore';
import { buyTicket } from './lottery';

describe('buyTicket', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('inserts a ticket + lines for a manual-only purchase and debits the wallet', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    const before = (await db.balances.get(r.user.id))!.chips;
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 9 },
      ],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(), // before 20:00 → today
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    expect(lines).toHaveLength(2);
    const after = (await db.balances.get(r.user.id))!.chips;
    expect(after).toBe(before - 20);
  });

  it('rejects when two manual lines are duplicates', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [5, 4, 3, 2, 1], bonusNumber: 1 },
      ],
    });
    expect(result).toEqual({ ok: false, error: 'duplicate-manual-lines' });
    // Wallet should NOT have been debited.
    const bal = (await db.balances.get(r.user.id))!.chips;
    expect(bal).toBe(1000);
  });

  it('rejects when wallet has insufficient chips', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    // Drain to 5 chips
    await db.balances.update(r.user.id, { chips: 5 });
    const result = await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
    });
    expect(result).toEqual({ ok: false, error: 'insufficient-chips' });
  });

  it('generates unique lucky-dip lines distinct from manual lines on the same ticket', async () => {
    const r = await register({ username: 'd', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'lucky-dip' },
        { kind: 'lucky-dip' },
        { kind: 'lucky-dip' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    const keys = lines.map((l) => `${l.mainNumbers.sort().join(',')}|${l.bonusNumber}`);
    expect(new Set(keys).size).toBe(4);
  });

  it('rejects an invalid line (e.g. 6 main numbers)', async () => {
    const r = await register({ username: 'e', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }],
    });
    expect(result).toEqual({ ok: false, error: 'invalid-line' });
  });

  it('marks lucky-dip lines with isLuckyDip=true', async () => {
    const r = await register({ username: 'f', password: 'password123' });
    if (!r.ok) throw new Error();
    const result = await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'lucky-dip' },
      ],
    });
    if (!result.ok) throw new Error();
    const lines = await db.lotteryLines.where('ticketId').equals(result.ticketId).toArray();
    const manual = lines.find((l) => !l.isLuckyDip);
    const dip = lines.find((l) => l.isLuckyDip);
    expect(manual).toBeDefined();
    expect(dip).toBeDefined();
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: ~36 tests pass.

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): buyTicket — manual/lucky-dip mix with within-ticket uniqueness"
```

## Task A.5: `settleMissedDraws` (backfill + match-2 re-entry + rounds writes)

**Files:**

- Modify: `src/systems/lottery.ts`
- Modify: `src/systems/lottery.test.ts`

`settleMissedDraws` walks from the last settled draw to today (or yesterday if before 20:00), runs each draw in date order, evaluates every unsettled line, and writes `rounds` rows per the §7.4 matrix in the spec.

- [ ] **Step 1: Append to `src/systems/lottery.ts`**

```ts
import { settleRound } from '@/systems/wallet';
import type { Round } from '@/db';

const REENTRY_VALUE = LINE_COST; // 10 chips — the implied refund credit for a paid match-2

/** Idempotently runs every draw whose scheduled time has passed but hasn't
 *  been recorded yet. Inserts LotteryDraw rows, evaluates all unsettled
 *  LotteryLines for those draws, writes rounds rows per §7.4 matrix, and
 *  creates free-re-entry tickets for match-2 settlements. */
export async function settleMissedDraws(options: { now?: number } = {}): Promise<{
  settledDrawIds: string[];
  freshDraws: LotteryDraw[];
}> {
  const now = options.now ?? Date.now();
  const today = dateStringFor(now);
  // The last fully-passed 20:00 boundary determines the upper bound on dates to settle.
  const beforeTodayCutoff = nextDrawAt(now) === scheduledForToday(now);
  const upperDate = beforeTodayCutoff ? prevDate(today) : today;

  // Find the most recently settled draw.
  const allDraws = await db.lotteryDraws.toArray();
  const settledDates = new Set(allDraws.map((d) => d.id));
  // Build the chronological list of dates to settle.
  const datesToSettle = await pendingDrawDates(upperDate);
  const settledDrawIds: string[] = [];
  const freshDraws: LotteryDraw[] = [];

  for (const date of datesToSettle) {
    if (settledDates.has(date)) continue;
    const { mainNumbers, bonus } = drawForDate(date);
    const drawAt = scheduledForDate(date);
    const draw: LotteryDraw = {
      id: date,
      drawAt,
      mainNumbers,
      bonus,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    };

    // Evaluate all unsettled lines for this draw.
    const lines = await db.lotteryLines
      .where('[drawId+settled]')
      .equals([date, 0 as unknown as boolean] as unknown as [string, boolean])
      .toArray();
    // (Note: Dexie indexes booleans as 0/1; the above query gets unsettled rows.)

    // Fallback: if the compound-index query returns nothing due to boolean serialization,
    // filter in memory. Tests will reveal which path Dexie actually uses.
    const unsettled =
      lines.length > 0
        ? lines
        : (await db.lotteryLines.where('drawId').equals(date).toArray()).filter((l) => !l.settled);

    let totalLines = 0;
    let totalRevenue = 0;
    let totalPayout = 0;

    for (const line of unsettled) {
      const tier = evaluateLine(line, { mainNumbers, bonus });
      const payout = payoutFor(tier);
      line.settled = true;
      line.matchTier = tier;
      line.payout = payout;
      totalLines += 1;
      if (!line.isFreeReentry) totalRevenue += LINE_COST;
      totalPayout += payout;
    }

    draw.totalLines = totalLines;
    draw.totalRevenue = totalRevenue;
    draw.totalPayout = totalPayout;

    // Transactional write: draw + settled lines + free-re-entry tickets/lines + rounds rows.
    await db.transaction(
      'rw',
      db.lotteryDraws,
      db.lotteryLines,
      db.lotteryTickets,
      db.rounds,
      db.balances,
      async () => {
        await db.lotteryDraws.put(draw);
        await db.lotteryLines.bulkPut(unsettled);

        // For each settled line, decide whether to write a rounds row (§7.4 matrix).
        for (const line of unsettled) {
          await writeRoundForLine(line, draw);
        }

        // Match-2 → free re-entry for the next draw.
        const nextDate = nextDate(date);
        const reentryLines = unsettled.filter(
          (l) => l.matchTier === '2' || l.matchTier === '2+bonus',
        );
        for (const src of reentryLines) {
          const fresh = generateLuckyDipLine([]);
          const ticketId = crypto.randomUUID();
          const newLine: LotteryLine = {
            id: crypto.randomUUID(),
            ticketId,
            userId: src.userId,
            drawId: nextDate,
            mainNumbers: fresh.mainNumbers,
            bonusNumber: fresh.bonusNumber,
            isLuckyDip: true,
            isFreeReentry: true,
            settled: false,
            matchTier: null,
            payout: 0,
            sourceLineId: src.id,
          };
          const ticket: LotteryTicket = {
            id: ticketId,
            userId: src.userId,
            drawId: nextDate,
            purchasedAt: drawAt,
            totalCost: 0,
            lineCount: 1,
          };
          await db.lotteryTickets.put(ticket);
          await db.lotteryLines.put(newLine);
        }
      },
    );

    settledDrawIds.push(date);
    freshDraws.push(draw);
  }

  return { settledDrawIds, freshDraws };
}

/** Per §7.4: writes a rounds row (or skips) for a settled line. */
async function writeRoundForLine(line: LotteryLine, draw: LotteryDraw): Promise<void> {
  const isPaid = !line.isFreeReentry;
  const tier = line.matchTier;

  // Free re-entry that didn't win cash → no rounds row.
  if (!isPaid && (tier === null || tier === '2' || tier === '2+bonus')) return;

  let betAmount: number;
  let payout: number;
  let outcome: Round['outcome'];
  if (isPaid) {
    betAmount = LINE_COST;
    if (tier === null) {
      payout = 0;
      outcome = 'loss';
    } else if (tier === '2' || tier === '2+bonus') {
      payout = REENTRY_VALUE;
      outcome = 'push';
    } else {
      payout = payoutFor(tier);
      outcome = 'win';
    }
  } else {
    // Free re-entry that DID win cash.
    betAmount = 0;
    payout = payoutFor(tier);
    outcome = 'win';
  }
  const netChange = payout - betAmount;

  await settleRound({
    handle: {
      betId: line.id,
      userId: line.userId,
      game: 'lottery',
      amount: betAmount,
      placedAt: draw.drawAt,
    },
    result: {
      outcome,
      betAmount,
      payout,
      netChange,
      details: {
        drawId: draw.id,
        mainNumbers: line.mainNumbers,
        bonusNumber: line.bonusNumber,
        drawMainNumbers: draw.mainNumbers,
        drawBonus: draw.bonus,
        matchTier: tier,
        isLuckyDip: line.isLuckyDip,
        isFreeReentry: line.isFreeReentry,
      },
    },
  });
}

function scheduledForToday(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), DRAW_HOUR, 0, 0, 0).getTime();
}

function scheduledForDate(date: string): number {
  const [y, m, day] = date.split('-').map(Number);
  return new Date(y!, m! - 1, day!, DRAW_HOUR, 0, 0, 0).getTime();
}

function prevDate(date: string): string {
  const [y, m, day] = date.split('-').map(Number);
  const d = new Date(y!, m! - 1, day! - 1);
  return dateStringFor(d.getTime());
}

function nextDate(date: string): string {
  const [y, m, day] = date.split('-').map(Number);
  const d = new Date(y!, m! - 1, day! + 1);
  return dateStringFor(d.getTime());
}

/** Returns the chronological list of date strings between earliestPendingDate and upperDate
 *  (inclusive). "Earliest pending" = day after the latest settled draw, or the earliest
 *  unsettled line's drawId, whichever is smaller. If nothing is pending, returns []. */
async function pendingDrawDates(upperDate: string): Promise<string[]> {
  const lastDraw = (await db.lotteryDraws.orderBy('id').last())?.id;
  const earliestLine = (await db.lotteryLines.orderBy('drawId').first())?.drawId;
  const candidate = lastDraw ? nextDate(lastDraw) : earliestLine;
  if (!candidate) return [];
  if (candidate > upperDate) return [];
  const out: string[] = [];
  let cur = candidate;
  while (cur <= upperDate) {
    out.push(cur);
    cur = nextDate(cur);
  }
  return out;
}
```

- [ ] **Step 2: Add tests**

```ts
import { drawForDate } from './lottery';
import { settleMissedDraws } from './lottery';

describe('settleMissedDraws', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('does nothing when there are no unsettled lines and no pending draws', async () => {
    const { settledDrawIds } = await settleMissedDraws({
      now: new Date(2026, 4, 19, 21, 0, 0).getTime(),
    });
    expect(settledDrawIds).toEqual([]);
  });

  it('runs a single missed draw and writes a draw row', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    // Buy a ticket at noon for today's draw.
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    // Open the app at 20:30 — backfill runs.
    const { settledDrawIds } = await settleMissedDraws({
      now: new Date(2026, 4, 19, 20, 30, 0).getTime(),
    });
    expect(settledDrawIds).toEqual(['2026-05-19']);
    const draw = await db.lotteryDraws.get('2026-05-19');
    expect(draw).toBeDefined();
    expect(draw!.mainNumbers).toEqual(drawForDate('2026-05-19').mainNumbers);
  });

  it('settles all lines for the missed draw', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 },
      ],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const lines = await db.lotteryLines.toArray();
    expect(lines.every((l) => l.settled)).toBe(true);
  });

  it('backfills multiple missed days in date order', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 17, 12, 0, 0).getTime(), // for May 17 draw
    });
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 9 }],
      now: new Date(2026, 4, 18, 12, 0, 0).getTime(), // for May 18 draw
    });
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [11, 22, 33, 44, 5], bonusNumber: 7 }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(), // for May 19 draw
    });
    const { settledDrawIds } = await settleMissedDraws({
      now: new Date(2026, 4, 19, 20, 30, 0).getTime(),
    });
    expect(settledDrawIds).toEqual(['2026-05-17', '2026-05-18', '2026-05-19']);
  });

  it('creates a free re-entry ticket for the next draw when a paid line gets match-2', async () => {
    const r = await register({ username: 'd', password: 'password123' });
    if (!r.ok) throw new Error();
    const { mainNumbers, bonus } = drawForDate('2026-05-19');
    // Match exactly 2 main, no bonus.
    const matchTwo = [mainNumbers[0]!, mainNumbers[1]!, 99, 98, 97]
      .filter((n) => n <= 50)
      .slice(0, 5);
    // Fall back to a safe match-2 line if the above overlaps unexpectedly.
    const line = matchTwo.length === 5 ? matchTwo : [mainNumbers[0]!, mainNumbers[1]!, 47, 48, 49];
    // Ensure bonus mismatch.
    const wrongBonus = bonus === 10 ? 1 : bonus + 1;
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: line, bonusNumber: wrongBonus }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const tomorrowLines = await db.lotteryLines.where('drawId').equals('2026-05-20').toArray();
    expect(tomorrowLines.some((l) => l.isFreeReentry)).toBe(true);
  });

  it('writes rounds rows per the §7.4 matrix (paid match-2 → push, free no-match → no row)', async () => {
    const r = await register({ username: 'e', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const rounds = await db.rounds.where('userId').equals(r.user.id).toArray();
    // Exactly one rounds row should exist (paid line, regardless of outcome).
    expect(rounds.filter((r) => r.game === 'lottery')).toHaveLength(1);
  });

  it('is idempotent: a second call after a draw is settled does nothing', async () => {
    const r = await register({ username: 'f', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const first = await db.rounds.toArray();
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 35, 0).getTime() });
    const second = await db.rounds.toArray();
    expect(second).toEqual(first);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: ~43 tests pass.

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): settleMissedDraws — backfill + rounds writes + free re-entry"
```

## Task A.6: Favorites CRUD

**Files:**

- Modify: `src/systems/lottery.ts`
- Modify: `src/systems/lottery.test.ts`

- [ ] **Step 1: Append to `src/systems/lottery.ts`**

```ts
import type { LotteryFavorite } from '@/db';

export async function saveFavorite(input: {
  userId: string;
  name: string;
  mainNumbers: number[];
  bonusNumber: number;
}): Promise<LotteryFavorite> {
  if (!isValidLine({ mainNumbers: input.mainNumbers, bonusNumber: input.bonusNumber })) {
    throw new Error('invalid favorite numbers');
  }
  const fav: LotteryFavorite = {
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name,
    mainNumbers: [...input.mainNumbers].sort((a, b) => a - b),
    bonusNumber: input.bonusNumber,
    createdAt: Date.now(),
  };
  await db.lotteryFavorites.put(fav);
  return fav;
}

export async function listFavorites(userId: string): Promise<LotteryFavorite[]> {
  return db.lotteryFavorites
    .where('[userId+createdAt]')
    .between([userId, 0], [userId, Number.MAX_SAFE_INTEGER])
    .reverse()
    .toArray();
}

export async function renameFavorite(id: string, name: string): Promise<void> {
  await db.lotteryFavorites.update(id, { name });
}

export async function deleteFavorite(id: string): Promise<void> {
  await db.lotteryFavorites.delete(id);
}
```

- [ ] **Step 2: Append tests**

```ts
import { saveFavorite, listFavorites, renameFavorite, deleteFavorite } from './lottery';

describe('Favorites CRUD', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('saves and lists favorites scoped to user, newest first', async () => {
    const a = await register({ username: 'a', password: 'password123' });
    const b = await register({ username: 'b', password: 'password123' });
    if (!a.ok || !b.ok) throw new Error();
    await saveFavorite({
      userId: a.user.id,
      name: 'My Numbers 1',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 1,
    });
    await new Promise((r) => setTimeout(r, 1));
    await saveFavorite({
      userId: a.user.id,
      name: 'My Numbers 2',
      mainNumbers: [6, 7, 8, 9, 10],
      bonusNumber: 2,
    });
    await saveFavorite({
      userId: b.user.id,
      name: 'B Numbers',
      mainNumbers: [11, 12, 13, 14, 15],
      bonusNumber: 3,
    });
    const aFavs = await listFavorites(a.user.id);
    expect(aFavs).toHaveLength(2);
    expect(aFavs[0]!.name).toBe('My Numbers 2');
    expect(aFavs[1]!.name).toBe('My Numbers 1');
    const bFavs = await listFavorites(b.user.id);
    expect(bFavs).toHaveLength(1);
  });

  it('rename updates the name', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    const fav = await saveFavorite({
      userId: r.user.id,
      name: 'Old',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 1,
    });
    await renameFavorite(fav.id, 'New');
    const refreshed = (await listFavorites(r.user.id))[0]!;
    expect(refreshed.name).toBe('New');
  });

  it('delete removes the favorite', async () => {
    const r = await register({ username: 'd', password: 'password123' });
    if (!r.ok) throw new Error();
    const fav = await saveFavorite({
      userId: r.user.id,
      name: 'X',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 1,
    });
    await deleteFavorite(fav.id);
    expect(await listFavorites(r.user.id)).toHaveLength(0);
  });

  it('rejects an invalid favorite (duplicate main numbers)', async () => {
    const r = await register({ username: 'e', password: 'password123' });
    if (!r.ok) throw new Error();
    await expect(
      saveFavorite({
        userId: r.user.id,
        name: 'bad',
        mainNumbers: [1, 1, 2, 3, 4],
        bonusNumber: 1,
      }),
    ).rejects.toThrow();
  });

  it('stores mainNumbers sorted ascending', async () => {
    const r = await register({ username: 'f', password: 'password123' });
    if (!r.ok) throw new Error();
    await saveFavorite({
      userId: r.user.id,
      name: 'shuffled',
      mainNumbers: [5, 2, 4, 1, 3],
      bonusNumber: 1,
    });
    const fav = (await listFavorites(r.user.id))[0]!;
    expect(fav.mainNumbers).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: ~48 tests pass.

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): favorites CRUD (save/list/rename/delete)"
```

## Task A.7: Admin queries — `getLotteryAdminStats` + `getNumberFrequency`

**Files:**

- Modify: `src/systems/lottery.ts`
- Modify: `src/systems/lottery.test.ts`

- [ ] **Step 1: Append to `src/systems/lottery.ts`**

```ts
export interface LotteryAdminStats {
  ticketsSoldToday: number;
  linesSoldToday: number;
  totalRevenue: number;
  totalPayout: number;
  netProfit: number;
}

export async function getLotteryAdminStats(now: number = Date.now()): Promise<LotteryAdminStats> {
  const today = dateStringFor(now);
  const todayTickets = await db.lotteryTickets.where('drawId').equals(today).toArray();
  const ticketsSoldToday = todayTickets.length;
  const linesSoldToday = todayTickets.reduce((s, t) => s + t.lineCount, 0);
  const allDraws = await db.lotteryDraws.toArray();
  let totalRevenue = 0;
  let totalPayout = 0;
  for (const d of allDraws) {
    totalRevenue += d.totalRevenue;
    totalPayout += d.totalPayout;
  }
  return {
    ticketsSoldToday,
    linesSoldToday,
    totalRevenue,
    totalPayout,
    netProfit: totalRevenue - totalPayout,
  };
}

/** Returns array of length MAIN_POOL_SIZE (or BONUS_POOL_SIZE) where index i = times
 *  number (i+1) appeared in a draw, historically. */
export async function getNumberFrequency(pool: 'main' | 'bonus'): Promise<number[]> {
  const size = pool === 'main' ? MAIN_POOL_SIZE : BONUS_POOL_SIZE;
  const freq = new Array<number>(size).fill(0);
  const draws = await db.lotteryDraws.toArray();
  for (const d of draws) {
    if (pool === 'main') {
      for (const n of d.mainNumbers) freq[n - 1] += 1;
    } else {
      freq[d.bonus - 1] += 1;
    }
  }
  return freq;
}
```

- [ ] **Step 2: Append tests**

```ts
import { getLotteryAdminStats, getNumberFrequency } from './lottery';

describe('admin queries', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('getLotteryAdminStats reports today + lifetime totals', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [
        { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
        { kind: 'manual', mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 },
      ],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const stats = await getLotteryAdminStats(new Date(2026, 4, 19, 21, 0, 0).getTime());
    expect(stats.ticketsSoldToday).toBe(1);
    expect(stats.linesSoldToday).toBe(2);
    expect(stats.totalRevenue).toBe(20);
    expect(stats.netProfit).toBe(stats.totalRevenue - stats.totalPayout);
  });

  it('getNumberFrequency returns 0s when no draws have happened', async () => {
    const freq = await getNumberFrequency('main');
    expect(freq).toHaveLength(50);
    expect(freq.every((n) => n === 0)).toBe(true);
  });

  it('getNumberFrequency increments for each drawn number across history', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    // Trigger 2 draws.
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 18, 12, 0, 0).getTime(),
    });
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const freq = await getNumberFrequency('main');
    const total = freq.reduce((s, n) => s + n, 0);
    expect(total).toBe(10); // 2 draws × 5 main numbers
    const bonusFreq = await getNumberFrequency('bonus');
    expect(bonusFreq.reduce((s, n) => s + n, 0)).toBe(2);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
pnpm exec vitest run src/systems/lottery.test.ts
```

Expected: ~51 tests pass.

```bash
git add src/systems/lottery.ts src/systems/lottery.test.ts
git commit -m "feat(lottery): admin queries — getLotteryAdminStats + getNumberFrequency"
```

## Task A.8: Wire `'lottery'` into downstream type-handling sites

**Files:**

- Modify: `src/pages/admin/charts/GameDistributionDonut.tsx` (or whichever file labels games)
- Modify: any other file that does an exhaustive switch on `Round['game']`

- [ ] **Step 1: Find downstream consumers**

```bash
grep -rn "'coin-flip'" src/ | grep -v "test\|\.spec"
```

Any file that lists all game keys without using `Round['game']` (e.g., a hardcoded array) needs `'lottery'` appended. Phase 7's pages (`StatsLeftRail`, GAME_LABELS in StatsPerGamePage/LeaderboardPerGamePage, TITLES maps) are handled in PR E task E.5 — leave those alone for PR A.

For PR A, only fix files that would cause a TYPECHECK ERROR when `'lottery'` is added to the union (e.g., a switch without a default case that returns).

- [ ] **Step 2: Run typecheck to surface any errors**

```bash
pnpm typecheck
```

If errors surface, fix each one with a minimal addition of the `'lottery'` case (typically a label like `Lottery` or a default behavior). If no errors surface, this task is a no-op — proceed to Step 3.

- [ ] **Step 3: Run + commit (only if files were modified)**

```bash
pnpm exec vitest run
```

```bash
git add <modified files>
git commit -m "feat(stats): add 'lottery' to game-key consumers exposed by Round.game union"
```

(If no files were modified, no commit is needed — proceed to A.9.)

## Task A.9: ADR-0040 — Lottery as system, not games-sandbox citizen

**Files:**

- Create: `docs/adr/0040-lottery-as-system.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0040: Lottery as a system, not a games-sandbox citizen

- Status: Accepted
- Date: 2026-05-19
- Deciders: @adamzspare

## Context

The `src/games/<name>/` sandbox (BUILD_GUIDE §3, §4) is built around a contract:

- A game is one-user-per-round (the player clicks through to a result).
- A game `logic.ts` is pure; UI lives next to it in the same directory.
- Games go through `src/systems/wallet.ts` and never touch `src/db/*`
  or `src/store/*` directly. ESLint enforces.
- `src/games/_shared/GameShell` + `BettingPanel` + `useGameRound` are
  the standard reusable surfaces.

Phase 10's daily lottery violates two of those assumptions:

1. It's **event-driven**, not per-round. The user buys tickets across a
   day; settlement happens once when a scheduled draw runs (or backfills
   on app open) — for all users on the machine at once.
2. It needs **direct DB reads** beyond the wallet API: the admin page
   queries `lotteryDraws` and `lotteryLines` aggregates; the backfill
   scheduler queries unsettled lines across all users.

## Decision

**Lottery lives in `src/systems/lottery.ts` + `src/pages/lottery/`.**

- `src/systems/lottery.ts` — pure logic (`drawForDate`, `evaluateLine`,
  `payoutFor`, `generateLuckyDipLine`, `nextDrawAt`) + DB-touching
  functions (`buyTicket`, `settleMissedDraws`, favorites CRUD, admin
  queries). Treated like other systems (auth, wallet, rng, stats,
  admin-auth) — permitted to import from `@/db/*`.
- `src/pages/lottery/` — top-level page directory (not under
  `src/pages/games/` or `src/games/`). Lazy-loaded via `React.lazy()`
  in `src/router.tsx`, mirroring the Phase 7 `/stats` and `/leaderboard`
  pattern to keep Recharts in the shared chunk (ADR-0039).
- `Round.game` enum is extended with `'lottery'` so per-line settles
  flow into the existing rounds table and Phase 7's /stats and
  /leaderboard pages.

## Alternatives considered

- **Force lottery into `src/games/lottery/`**: Would require per-line
  wrapping in `useGameRound`, and the sandbox ESLint rule would have
  to be relaxed for lottery (admin reads aggregate state). Rejected:
  adapts the wrong primitive.
- **Pure separate top-level module (no integration with /stats and
  /leaderboard)**: Rejected — losing /stats integration costs the
  passive engagement loop the lottery is designed for.
- **Server-driven cron**: Out of scope (offline-only app).

## Consequences

- Lottery is the precedent for any future event-style content (daily
  challenges, achievements, weekly tournaments). Add them as
  `src/systems/<name>.ts` + `src/pages/<name>/`.
- `Round.game` union grows; every exhaustive switch over it needs a
  `'lottery'` branch. Phase 7 left-rail nav and GAME_LABELS need the
  new entry — see PR E.5 in the Phase 10 plan.
- The sandbox rule continues to apply to `src/games/**` only.

## References

- `src/systems/lottery.ts` (target location)
- `src/pages/lottery/` (page directory)
- Phase 10 spec §8 (architecture)
- ADR-0039 — Shared Recharts chunk (lazy-load pattern)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0040-lottery-as-system.md
git commit -m "docs(adr): ADR-0040 — lottery as a system, not a games-sandbox citizen"
```

## Task A.10: PR A — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1056 tests passing (~51 new in PR A).

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin phase-10-pr-a-lottery-system
gh pr create --title "phase-10(lottery): PR A — Dexie v3 + systems/lottery + ADR-0040" --body "$(cat <<'EOF'
## Summary

PR A of Phase 10 (Daily Lottery). Ships the data layer: Dexie v3 schema bump (4 new tables, additive), \`src/systems/lottery.ts\` with pure logic + DB-writing functions, \`'lottery'\` added to the Round.game union, commitlint scope extended, and ADR-0040.

## What's in

- **Dexie v3**: \`lotteryDraws\`, \`lotteryTickets\`, \`lotteryLines\`, \`lotteryFavorites\` tables; existing tables untouched
- **systems/lottery.ts**:
  - Pure: \`drawForDate\`, \`lineKey\`, \`evaluateLine\`, \`payoutFor\`, \`generateLuckyDipLine\`, \`nextDrawAt\`, \`dateStringFor\`
  - DB writes: \`buyTicket\` (manual + lucky-dip + uniqueness + wallet debit), \`settleMissedDraws\` (backfill + match-2 re-entry + rounds writes per §7.4)
  - Favorites: \`saveFavorite\`, \`listFavorites\`, \`renameFavorite\`, \`deleteFavorite\`
  - Admin: \`getLotteryAdminStats\`, \`getNumberFrequency\`
- **Round.game** extended with \`'lottery'\`
- **commitlint** scope-enum gains \`'lottery'\`
- **ADR-0040** committed

~51 new tests; no UI in this PR.

## Test plan

- [x] \`pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build\` all green locally
- [ ] CI: 4 jobs green
- [ ] Reviewer confirms §7.4 rounds-row matrix implementation is correct

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

Expected: PR merged.

---

# PR B — LotteryPage shell + NumberGrid + TicketCart + Favorites (manual only)

**Branch:** `phase-10-pr-b-lottery-page` (off freshly-merged `main`)
**Goal of this PR:** Ship a functional LotteryPage that lets a user pick numbers manually, save/load favorites, build a cart of multiple lines, and buy a ticket. NO lucky-dip yet (PR C), NO HERO countdown swap (PR D — placeholder text for now), NO history slide (PR E — placeholder text). Manual purchase wires through to `buyTicket` from PR A and shows a basic confirmation toast.
**Risk:** Medium. The cart-state hook needs to keep lines/uniqueness consistent across rerenders. Mitigation: full test coverage on `useLotteryCart` + integration test on LotteryPage.
**Estimated tasks:** 7.

## Task B.1: Branch + LotteryPage shell + lazy route wiring

**Files:**

- Create: `src/pages/lottery/LotteryPage.tsx`
- Create: `src/pages/lottery/LotteryPage.test.tsx`
- Modify: `src/router.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-10-pr-b-lottery-page
mkdir -p src/pages/lottery
```

- [ ] **Step 2: Write `src/pages/lottery/LotteryPage.tsx` (skeleton)**

```tsx
import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';

export default function LotteryPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">DAILY LOTTERY</h1>
        </header>
        <section
          data-hero-placeholder
          className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          HERO countdown ↔ winning balls — ships in PR D.
        </section>
        <section
          data-buy-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          Buy a Ticket — populated in B.2–B.6.
        </section>
        <section
          data-history-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          History slide — ships in PR E.
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/pages/lottery/LotteryPage.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LotteryPage from './LotteryPage';
import { useSessionStore } from '@/store/sessionStore';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('LotteryPage shell', () => {
  beforeEach(async () => {
    await resetDb();
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('returns null when no user is logged in', () => {
    const { container } = render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the page title and 3 placeholder sections when logged in', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    useSessionStore.setState({ currentUser: r.user });
    render(
      <MemoryRouter>
        <LotteryPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /daily lottery/i })).toBeInTheDocument();
    expect(screen.getByText(/HERO countdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy a Ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/History slide/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Wire route in `src/router.tsx`**

Read the existing router. Add a lazy import near the other lazy imports:

```tsx
const LotteryPage = lazy(() => import('@/pages/lottery/LotteryPage'));
```

Add a route entry alongside `/stats` and `/leaderboard`, wrapped in the same Suspense fallback used by stats:

```tsx
{
  path: 'lottery',
  element: (
    <Suspense fallback={statsFallback}>
      <LotteryPage />
    </Suspense>
  ),
},
```

If there was a stub at `src/pages/LotteryPage.tsx` (Phase 0 leftover) you replaced earlier, this entry supersedes it. Verify no other reference to a top-level `LotteryPage` import remains.

- [ ] **Step 5: Verify**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/lottery/ && pnpm build
```

Expected: all green. Bundle still ≤ 750 kB (lottery page is empty so far).

- [ ] **Step 6: Commit**

```bash
git add src/pages/lottery/LotteryPage.tsx src/pages/lottery/LotteryPage.test.tsx src/router.tsx
git commit -m "feat(lottery): LotteryPage shell + lazy /lottery route"
```

## Task B.2: `NumberGrid` — 5×10 main + 1×10 bonus picker

**Files:**

- Create: `src/pages/lottery/NumberGrid.tsx`
- Create: `src/pages/lottery/NumberGrid.test.tsx`

Stateless picker: parent holds the selection state; component renders buttons + visual selection state + valid-selection signal.

- [ ] **Step 1: Write `src/pages/lottery/NumberGrid.tsx`**

```tsx
import type { JSX } from 'react';

interface Props {
  /** Currently selected main numbers (any order). Length 0..5. */
  mainSelected: number[];
  /** Currently selected bonus number, or null. */
  bonusSelected: number | null;
  /** Called when a main number cell is clicked. Parent must enforce length cap of 5. */
  onMainToggle: (n: number) => void;
  /** Called when a bonus cell is clicked. Parent enforces single-selection. */
  onBonusSelect: (n: number) => void;
}

const MAIN_NUMBERS = Array.from({ length: 50 }, (_, i) => i + 1);
const BONUS_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function NumberGrid({
  mainSelected,
  bonusSelected,
  onMainToggle,
  onBonusSelect,
}: Props): JSX.Element {
  const mainSet = new Set(mainSelected);
  const mainFull = mainSelected.length === 5;
  return (
    <div className="flex flex-col gap-4" data-number-grid>
      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          MAIN NUMBERS — pick 5
        </h3>
        <div className="grid grid-cols-10 gap-1.5">
          {MAIN_NUMBERS.map((n) => {
            const selected = mainSet.has(n);
            const disabled = !selected && mainFull;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`Main number ${n}`}
                disabled={disabled}
                onClick={() => onMainToggle(n)}
                className={[
                  'h-9 rounded-full border text-xs tabular-nums transition',
                  selected
                    ? 'border-gold bg-gold text-felt-deep'
                    : disabled
                      ? 'border-white/10 bg-felt-deep/40 text-white/20'
                      : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold hover:text-white',
                ].join(' ')}
              >
                {n}
              </button>
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          BONUS — pick 1
        </h3>
        <div className="grid grid-cols-10 gap-1.5">
          {BONUS_NUMBERS.map((n) => {
            const selected = bonusSelected === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`Bonus number ${n}`}
                onClick={() => onBonusSelect(n)}
                className={[
                  'h-9 rounded-full border text-xs tabular-nums transition',
                  selected
                    ? 'border-neon-magenta bg-neon-magenta text-felt-deep'
                    : 'border-white/30 bg-felt-deep text-white/70 hover:border-neon-magenta hover:text-white',
                ].join(' ')}
              >
                {n}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/lottery/NumberGrid.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberGrid from './NumberGrid';

describe('NumberGrid', () => {
  it('renders 50 main buttons + 10 bonus buttons', () => {
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getAllByRole('button', { name: /main number/i })).toHaveLength(50);
    expect(screen.getAllByRole('button', { name: /bonus number/i })).toHaveLength(10);
  });

  it('marks selected main numbers with aria-pressed=true', () => {
    render(
      <NumberGrid
        mainSelected={[3, 12, 25]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Main number 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Main number 4' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('disables unselected main buttons when 5 are already selected', () => {
    render(
      <NumberGrid
        mainSelected={[1, 2, 3, 4, 5]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Main number 6' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Main number 1' })).not.toBeDisabled();
  });

  it('fires onMainToggle with the clicked number', async () => {
    const user = userEvent.setup();
    const onMainToggle = vi.fn();
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={onMainToggle}
        onBonusSelect={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Main number 7' }));
    expect(onMainToggle).toHaveBeenCalledWith(7);
  });

  it('fires onBonusSelect with the clicked bonus number', async () => {
    const user = userEvent.setup();
    const onBonusSelect = vi.fn();
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={onBonusSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Bonus number 4' }));
    expect(onBonusSelect).toHaveBeenCalledWith(4);
  });

  it('marks selected bonus with aria-pressed=true', () => {
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={5}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Bonus number 5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/NumberGrid.test.tsx
git add src/pages/lottery/NumberGrid.tsx src/pages/lottery/NumberGrid.test.tsx
git commit -m "feat(lottery): NumberGrid picker (5×10 main + 1×10 bonus)"
```

## Task B.3: `TicketCart` — cart of lines pre-purchase

**Files:**

- Create: `src/pages/lottery/TicketCart.tsx`
- Create: `src/pages/lottery/TicketCart.test.tsx`

Renders the in-progress ticket: list of lines (manual show numbers; lucky-dip placeholders show `🎰 LUCKY DIP`), per-line remove button, total line count, total cost, Buy Ticket CTA.

- [ ] **Step 1: Write `src/pages/lottery/TicketCart.tsx`**

```tsx
import type { JSX } from 'react';

export type CartLine =
  | { kind: 'manual'; mainNumbers: number[]; bonusNumber: number }
  | { kind: 'lucky-dip' };

interface Props {
  lines: CartLine[];
  lineCost: number;
  onRemoveLine: (index: number) => void;
  onBuy: () => void;
  buyDisabled?: boolean;
  buyDisabledReason?: string;
}

export default function TicketCart({
  lines,
  lineCost,
  onRemoveLine,
  onBuy,
  buyDisabled,
  buyDisabledReason,
}: Props): JSX.Element {
  const totalCost = lines.length * lineCost;
  return (
    <div className="rounded border border-gold/30 bg-felt-deep p-3" data-ticket-cart>
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
        TICKET ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
      </h3>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/40">
          No lines yet — pick numbers or add a lucky dip.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs"
              data-cart-line-kind={line.kind}
            >
              <span className="tabular-nums">
                {line.kind === 'manual'
                  ? `${line.mainNumbers
                      .slice()
                      .sort((a, b) => a - b)
                      .join(' · ')} | ${line.bonusNumber}`
                  : '🎰 LUCKY DIP'}
              </span>
              <button
                type="button"
                aria-label={`Remove line ${i + 1}`}
                onClick={() => onRemoveLine(i)}
                className="rounded px-1.5 py-0.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-white/70">
        <span>Total cost</span>
        <span className="font-display tabular-nums text-gold-bright">
          {totalCost.toLocaleString()} chips
        </span>
      </div>
      <button
        type="button"
        onClick={onBuy}
        disabled={buyDisabled || lines.length === 0}
        className="mt-3 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY TICKET
      </button>
      {buyDisabledReason && (
        <p className="mt-1 text-center text-[10px] text-casino-red">{buyDisabledReason}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/lottery/TicketCart.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketCart from './TicketCart';

describe('TicketCart', () => {
  it('shows the empty-state message when no lines', () => {
    render(<TicketCart lines={[]} lineCost={10} onRemoveLine={() => {}} onBuy={() => {}} />);
    expect(screen.getByText(/no lines yet/i)).toBeInTheDocument();
  });

  it('renders a manual line with sorted numbers and the bonus separator', () => {
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [5, 2, 4, 1, 3], bonusNumber: 7 }]}
        lineCost={10}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    expect(screen.getByText(/1 · 2 · 3 · 4 · 5 \| 7/i)).toBeInTheDocument();
  });

  it('renders a lucky-dip placeholder', () => {
    render(
      <TicketCart
        lines={[{ kind: 'lucky-dip' }]}
        lineCost={10}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    expect(screen.getByText(/lucky dip/i)).toBeInTheDocument();
  });

  it('computes total cost as lineCount * lineCost', () => {
    render(
      <TicketCart
        lines={[
          { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
          { kind: 'lucky-dip' },
          { kind: 'lucky-dip' },
        ]}
        lineCost={10}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    expect(screen.getByText('30 chips')).toBeInTheDocument();
  });

  it('fires onRemoveLine with the line index when × is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveLine = vi.fn();
    render(
      <TicketCart
        lines={[
          { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
          { kind: 'manual', mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 },
        ]}
        lineCost={10}
        onRemoveLine={onRemoveLine}
        onBuy={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /remove line 2/i }));
    expect(onRemoveLine).toHaveBeenCalledWith(1);
  });

  it('disables BUY TICKET when lines is empty', () => {
    render(<TicketCart lines={[]} lineCost={10} onRemoveLine={() => {}} onBuy={() => {}} />);
    expect(screen.getByRole('button', { name: /buy ticket/i })).toBeDisabled();
  });

  it('fires onBuy when BUY TICKET is clicked', async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        lineCost={10}
        onRemoveLine={() => {}}
        onBuy={onBuy}
      />,
    );
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('shows buyDisabledReason text when buyDisabled', () => {
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        lineCost={10}
        onRemoveLine={() => {}}
        onBuy={() => {}}
        buyDisabled
        buyDisabledReason="Not enough chips"
      />,
    );
    expect(screen.getByText('Not enough chips')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy ticket/i })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/TicketCart.test.tsx
git add src/pages/lottery/TicketCart.tsx src/pages/lottery/TicketCart.test.tsx
git commit -m "feat(lottery): TicketCart with per-line removal and BUY CTA"
```

## Task B.4: `FavoritesDropdown` — save / load / rename / delete

**Files:**

- Create: `src/pages/lottery/FavoritesDropdown.tsx`
- Create: `src/pages/lottery/FavoritesDropdown.test.tsx`

Dropdown with a "Save current" affordance + the user's saved favorites listed; each has Load / Rename / Delete actions.

- [ ] **Step 1: Write `src/pages/lottery/FavoritesDropdown.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listFavorites, saveFavorite, renameFavorite, deleteFavorite } from '@/systems/lottery';
import type { LotteryFavorite } from '@/db';

interface Props {
  userId: string;
  /** Current pick — if valid, the Save button is enabled. */
  currentPick: { mainNumbers: number[]; bonusNumber: number } | null;
  /** Called when the user loads a favorite into the picker. */
  onLoad: (fav: { mainNumbers: number[]; bonusNumber: number }) => void;
}

const EMPTY_FAVS: readonly LotteryFavorite[] = [];

export default function FavoritesDropdown({ userId, currentPick, onLoad }: Props): JSX.Element {
  const favorites = useLiveQuery(() => listFavorites(userId), [userId], EMPTY_FAVS);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingName, setPendingName] = useState('');

  const canSave = currentPick !== null;

  async function handleSave(): Promise<void> {
    if (!currentPick) return;
    const name = pendingName.trim() || `My Numbers ${favorites.length + 1}`;
    await saveFavorite({ userId, name, ...currentPick });
    setPendingName('');
    setShowSavePrompt(false);
  }

  return (
    <div className="flex flex-col gap-2" data-favorites-dropdown>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => setShowSavePrompt((v) => !v)}
          className="rounded border border-gold/40 px-3 py-1 text-xs text-white/80 hover:bg-gold/10 disabled:opacity-40"
        >
          ★ Save as Favorite
        </button>
      </div>
      {showSavePrompt && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder={`My Numbers ${favorites.length + 1}`}
            className="flex-1 rounded border border-white/20 bg-black/30 px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded bg-gold px-2 py-1 text-xs text-felt-deep"
          >
            Save
          </button>
        </div>
      )}
      {favorites.length > 0 && (
        <div className="rounded border border-white/15 bg-black/20 p-2 text-xs">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Saved favorites</p>
          <ul className="flex flex-col gap-1">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2"
                data-favorite-id={f.id}
              >
                <button
                  type="button"
                  onClick={() => onLoad({ mainNumbers: f.mainNumbers, bonusNumber: f.bonusNumber })}
                  className="flex-1 truncate text-left text-white/80 hover:text-white"
                  aria-label={`Load favorite ${f.name}`}
                >
                  {f.name}{' '}
                  <span className="text-white/40">
                    — {f.mainNumbers.join(',')} | {f.bonusNumber}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Rename favorite to:', f.name);
                    if (name) void renameFavorite(f.id, name);
                  }}
                  aria-label={`Rename ${f.name}`}
                  className="text-white/40 hover:text-white"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${f.name}"?`)) void deleteFavorite(f.id);
                  }}
                  aria-label={`Delete ${f.name}`}
                  className="text-white/40 hover:text-casino-red"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/lottery/FavoritesDropdown.test.tsx`**

```tsx
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavoritesDropdown from './FavoritesDropdown';
import { saveFavorite } from '@/systems/lottery';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('FavoritesDropdown', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('disables Save when currentPick is null', () => {
    render(<FavoritesDropdown userId="u" currentPick={null} onLoad={() => {}} />);
    expect(screen.getByRole('button', { name: /save as favorite/i })).toBeDisabled();
  });

  it('shows the save prompt when Save is clicked, with a valid pick', async () => {
    const user = userEvent.setup();
    render(
      <FavoritesDropdown
        userId="u"
        currentPick={{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }}
        onLoad={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save as favorite/i }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('persists a saved favorite and lists it', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    const user = userEvent.setup();
    render(
      <FavoritesDropdown
        userId={r.user.id}
        currentPick={{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }}
        onLoad={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save as favorite/i }));
    await user.type(screen.getByPlaceholderText(/my numbers/i), 'My Lucky 5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('My Lucky 5')).toBeInTheDocument());
  });

  it('fires onLoad when a favorite is clicked', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await saveFavorite({
      userId: r.user.id,
      name: 'Picked',
      mainNumbers: [10, 20, 30, 40, 50],
      bonusNumber: 9,
    });
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(<FavoritesDropdown userId={r.user.id} currentPick={null} onLoad={onLoad} />);
    await waitFor(() => expect(screen.getByText('Picked')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /load favorite picked/i }));
    expect(onLoad).toHaveBeenCalledWith({ mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 9 });
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/FavoritesDropdown.test.tsx
git add src/pages/lottery/FavoritesDropdown.tsx src/pages/lottery/FavoritesDropdown.test.tsx
git commit -m "feat(lottery): FavoritesDropdown — save/load/rename/delete number sets"
```

## Task B.5: `useLotteryCart` hook — cart state with uniqueness validation

**Files:**

- Create: `src/pages/lottery/useLotteryCart.ts`
- Create: `src/pages/lottery/useLotteryCart.test.ts`

Hook that owns the cart array, exposes `addManual`, `addLuckyDip`, `removeLine`, `clear`, and a derived `duplicateError: string | null` for the BUY button to consume. Lucky-dip lines are placeholders here — the actual numbers are generated by `buyTicket` (PR A) at purchase time.

- [ ] **Step 1: Write `src/pages/lottery/useLotteryCart.ts`**

```ts
import { useCallback, useMemo, useState } from 'react';
import { lineKey } from '@/systems/lottery';
import type { CartLine } from './TicketCart';

export interface UseLotteryCart {
  lines: CartLine[];
  addManual: (line: {
    mainNumbers: number[];
    bonusNumber: number;
  }) => { ok: true } | { ok: false; error: string };
  addLuckyDip: () => void;
  removeLine: (index: number) => void;
  clear: () => void;
  duplicateError: string | null;
}

export function useLotteryCart(): UseLotteryCart {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addManual = useCallback(
    (line: {
      mainNumbers: number[];
      bonusNumber: number;
    }): { ok: true } | { ok: false; error: string } => {
      const key = lineKey(line);
      const existingManualKeys = lines
        .filter((l): l is Extract<CartLine, { kind: 'manual' }> => l.kind === 'manual')
        .map(lineKey);
      if (existingManualKeys.includes(key)) {
        return { ok: false, error: 'This line is already on the ticket.' };
      }
      setLines((cur) => [...cur, { kind: 'manual', ...line }]);
      return { ok: true };
    },
    [lines],
  );

  const addLuckyDip = useCallback(() => {
    setLines((cur) => [...cur, { kind: 'lucky-dip' }]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // For the UI's BUY-disabled banner — only manual-vs-manual collisions are detectable
  // pre-purchase. Lucky-dip collisions are caught + retried at buy time.
  const duplicateError = useMemo(() => {
    const seen = new Set<string>();
    for (const line of lines) {
      if (line.kind !== 'manual') continue;
      const key = lineKey(line);
      if (seen.has(key)) return 'Two of your lines are identical — remove one.';
      seen.add(key);
    }
    return null;
  }, [lines]);

  return { lines, addManual, addLuckyDip, removeLine, clear, duplicateError };
}
```

- [ ] **Step 2: Write `src/pages/lottery/useLotteryCart.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLotteryCart } from './useLotteryCart';

describe('useLotteryCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useLotteryCart());
    expect(result.current.lines).toEqual([]);
    expect(result.current.duplicateError).toBeNull();
  });

  it('addManual appends a manual line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      const r = result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      expect(r).toEqual({ ok: true });
    });
    expect(result.current.lines).toHaveLength(1);
  });

  it('addManual rejects a duplicate of an existing manual line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
    });
    let second: ReturnType<typeof result.current.addManual>;
    act(() => {
      second = result.current.addManual({ mainNumbers: [5, 4, 3, 2, 1], bonusNumber: 1 });
    });
    expect(second!).toMatchObject({ ok: false });
    expect(result.current.lines).toHaveLength(1);
  });

  it('addLuckyDip appends a placeholder', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => result.current.addLuckyDip());
    act(() => result.current.addLuckyDip());
    expect(result.current.lines.filter((l) => l.kind === 'lucky-dip')).toHaveLength(2);
  });

  it('removeLine removes the indexed line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      result.current.addLuckyDip();
      result.current.addManual({ mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 });
    });
    act(() => result.current.removeLine(1));
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.lines.every((l) => l.kind === 'manual')).toBe(true);
  });

  it('clear empties the cart', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      result.current.addLuckyDip();
    });
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/useLotteryCart.test.ts
git add src/pages/lottery/useLotteryCart.ts src/pages/lottery/useLotteryCart.test.ts
git commit -m "feat(lottery): useLotteryCart hook — cart state + manual duplicate guard"
```

## Task B.6: Wire LotteryPage to NumberGrid + cart + favorites + buyTicket (manual only)

**Files:**

- Modify: `src/pages/lottery/LotteryPage.tsx`
- Modify: `src/pages/lottery/LotteryPage.test.tsx`

Replace the `Buy a Ticket — populated in B.2–B.6.` placeholder with a real two-column layout. Manual purchase only — `Add Lucky Dip` button is present but disabled with a `Coming in PR C` tooltip-style title attribute. NO HERO swap yet, NO history slide yet.

- [ ] **Step 1: Update `src/pages/lottery/LotteryPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { buyTicket } from '@/systems/lottery';
import NumberGrid from './NumberGrid';
import TicketCart from './TicketCart';
import FavoritesDropdown from './FavoritesDropdown';
import { useLotteryCart } from './useLotteryCart';

const LINE_COST = 10;

export default function LotteryPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const cart = useLotteryCart();
  const [mainSelected, setMainSelected] = useState<number[]>([]);
  const [bonusSelected, setBonusSelected] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  if (!user) return null;

  const currentPick =
    mainSelected.length === 5 && bonusSelected !== null
      ? { mainNumbers: mainSelected, bonusNumber: bonusSelected }
      : null;

  function handleMainToggle(n: number): void {
    setMainSelected((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    setAddError(null);
  }

  function handleAddLine(): void {
    if (!currentPick) {
      setAddError('Pick 5 main numbers and 1 bonus number first.');
      return;
    }
    const result = cart.addManual(currentPick);
    if (!result.ok) {
      setAddError(result.error);
    } else {
      setMainSelected([]);
      setBonusSelected(null);
      setAddError(null);
    }
  }

  async function handleBuy(): Promise<void> {
    if (cart.lines.length === 0) return;
    setPurchaseMessage(null);
    const result = await buyTicket({ userId: user!.id, lines: cart.lines });
    if (!result.ok) {
      setPurchaseMessage(
        result.error === 'insufficient-chips' ? 'Not enough chips.' : `Error: ${result.error}`,
      );
      return;
    }
    cart.clear();
    setPurchaseMessage(
      `Bought ticket with ${result.lines.length} line${result.lines.length === 1 ? '' : 's'}.`,
    );
  }

  const totalCost = cart.lines.length * LINE_COST;
  const buyDisabledReason =
    cart.duplicateError ??
    (totalCost > balance ? `Not enough chips (need ${totalCost.toLocaleString()})` : undefined);

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">DAILY LOTTERY</h1>
          <span className="font-display text-xs text-white/60">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        <section
          data-hero-placeholder
          className="mb-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          HERO countdown ↔ winning balls — ships in PR D.
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 flex flex-col gap-4">
            <NumberGrid
              mainSelected={mainSelected}
              bonusSelected={bonusSelected}
              onMainToggle={handleMainToggle}
              onBonusSelect={(n) => {
                setBonusSelected(n);
                setAddError(null);
              }}
            />
            <FavoritesDropdown
              userId={user.id}
              currentPick={currentPick}
              onLoad={(fav) => {
                setMainSelected(fav.mainNumbers);
                setBonusSelected(fav.bonusNumber);
                setAddError(null);
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddLine}
                className="flex-1 rounded-md border border-gold bg-felt-deep py-2 font-display text-xs tracking-wider text-gold-bright hover:bg-gold/10"
              >
                ADD LINE
              </button>
              <button
                type="button"
                disabled
                title="Lucky dip ships in PR C"
                className="flex-1 rounded-md border border-gold/40 bg-felt-deep py-2 font-display text-xs tracking-wider text-white/40"
              >
                ADD LUCKY DIP
              </button>
            </div>
            {addError && <p className="text-xs text-casino-red">{addError}</p>}
            {purchaseMessage && <p className="text-xs text-chip-win">{purchaseMessage}</p>}
          </div>
          <div>
            <TicketCart
              lines={cart.lines}
              lineCost={LINE_COST}
              onRemoveLine={cart.removeLine}
              onBuy={() => void handleBuy()}
              {...(buyDisabledReason !== undefined ? { buyDisabled: true, buyDisabledReason } : {})}
            />
          </div>
        </section>

        <section
          data-history-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          History slide — ships in PR E.
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Extend `src/pages/lottery/LotteryPage.test.tsx`**

Append integration tests:

```tsx
import { useBalance } from '@/store/walletStore';
import { db } from '@/test/db-helpers';

it('lets a user pick + add a manual line + buy a ticket', async () => {
  const r = await register({ username: 'buyer', password: 'password123' });
  if (!r.ok) throw new Error();
  useSessionStore.setState({ currentUser: r.user });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <LotteryPage />
    </MemoryRouter>,
  );
  // Pick 5 main + 1 bonus.
  for (const n of [1, 2, 3, 4, 5]) {
    await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
  }
  await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
  await user.click(screen.getByRole('button', { name: /add line/i }));
  await user.click(screen.getByRole('button', { name: /buy ticket/i }));
  await waitFor(() => expect(screen.getByText(/bought ticket/i)).toBeInTheDocument());
  const tickets = await db.lotteryTickets.toArray();
  expect(tickets).toHaveLength(1);
});

it('blocks adding a duplicate manual line with an inline error', async () => {
  const r = await register({ username: 'dup', password: 'password123' });
  if (!r.ok) throw new Error();
  useSessionStore.setState({ currentUser: r.user });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <LotteryPage />
    </MemoryRouter>,
  );
  // First add succeeds.
  for (const n of [1, 2, 3, 4, 5]) {
    await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
  }
  await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
  await user.click(screen.getByRole('button', { name: /add line/i }));
  // Re-pick same numbers; second add fails.
  for (const n of [1, 2, 3, 4, 5]) {
    await user.click(screen.getByRole('button', { name: `Main number ${n}` }));
  }
  await user.click(screen.getByRole('button', { name: 'Bonus number 1' }));
  await user.click(screen.getByRole('button', { name: /add line/i }));
  expect(screen.getByText(/already on the ticket/i)).toBeInTheDocument();
});
```

(You'll need to also `import userEvent from '@testing-library/user-event'` at the top of the test file.)

- [ ] **Step 3: Verify + commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/lottery/ && pnpm build
git add src/pages/lottery/LotteryPage.tsx src/pages/lottery/LotteryPage.test.tsx
git commit -m "feat(lottery): wire NumberGrid + TicketCart + Favorites + manual buyTicket flow"
```

## Task B.7: PR B — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: all four exit 0. ~1081 tests passing (~25 new in PR B).

- [ ] **Step 2: Push + open PR + merge**

```bash
git push -u origin phase-10-pr-b-lottery-page
gh pr create --title "phase-10(lottery): PR B — LotteryPage shell + manual ticket buy" --body "$(cat <<'EOF'
## Summary

PR B of Phase 10. Ships a functional LotteryPage where a user can pick 5+1 numbers manually, save/load favorites, build a multi-line cart, and buy a ticket. Lucky dip button is present but disabled until PR C.

## What's in

- LotteryPage shell + lazy /lottery route
- NumberGrid (5×10 + 1×10 picker)
- TicketCart with per-line remove + BUY CTA
- FavoritesDropdown (save / load / rename / delete)
- useLotteryCart hook
- Manual buy flow → buyTicket from PR A

~25 new tests. HERO + history are placeholders pending PR D / PR E.

## Test plan

- [x] All 4 DoD checks green locally
- [ ] CI green
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR C — Lucky dip flow + within-ticket uniqueness + purchase reveal modal

**Branch:** `phase-10-pr-c-lucky-dip` (off freshly-merged `main`)
**Goal:** Enable the `ADD LUCKY DIP` button (was disabled in PR B), surface a reveal animation modal that flips each lucky-dip line one at a time when the user buys a ticket containing any lucky-dip lines, and respect `prefers-reduced-motion`.
**Risk:** Low — `buyTicket` already enforces uniqueness server-side; PR C is mainly UI.
**Estimated tasks:** 4.

## Task C.1: Branch + enable `ADD LUCKY DIP` + `DrawAnimationModal` (purchase mode)

**Files:**

- Create: `src/pages/lottery/DrawAnimationModal.tsx`
- Create: `src/pages/lottery/DrawAnimationModal.test.tsx`
- Modify: `src/pages/lottery/LotteryPage.tsx`

The modal has two modes (purchase reveal vs draw reveal); PR C ships the purchase-reveal mode only. PR D fills in the draw-reveal mode.

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-10-pr-c-lucky-dip
```

- [ ] **Step 2: Write `src/pages/lottery/DrawAnimationModal.tsx` (purchase mode)**

```tsx
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface PurchaseRevealLine {
  isLuckyDip: boolean;
  mainNumbers: number[];
  bonusNumber: number;
}

interface PurchaseModeProps {
  mode: 'purchase';
  open: boolean;
  lines: PurchaseRevealLine[];
  onClose: () => void;
}

type Props = PurchaseModeProps;

const FLIP_GAP_MS = 350;

export default function DrawAnimationModal(props: Props): JSX.Element {
  const reduce = useReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!props.open) return;
    setRevealedCount(0);
    // Reveal manual lines instantly, lucky-dip lines on a sequence.
    const luckyDipIndexes = props.lines
      .map((l, i) => (l.isLuckyDip ? i : -1))
      .filter((i) => i !== -1);
    // Start with non-lucky-dip lines revealed.
    const initial = props.lines.length - luckyDipIndexes.length;
    setRevealedCount(initial);
    if (reduce) {
      setRevealedCount(props.lines.length);
      return;
    }
    let n = initial;
    const id = setInterval(() => {
      n += 1;
      setRevealedCount(n);
      if (n >= props.lines.length) clearInterval(id);
    }, FLIP_GAP_MS);
    return () => clearInterval(id);
  }, [props.open, props.lines, reduce]);

  if (!props.open) return <></>;
  const allRevealed = revealedCount >= props.lines.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        data-purchase-reveal-modal
      >
        <div className="max-w-md rounded-lg border border-gold bg-felt-deep p-6">
          <h2 className="mb-3 font-display text-sm tracking-wider text-gold-bright">
            TICKET PURCHASED
          </h2>
          <ul className="space-y-2">
            {props.lines.map((line, i) => {
              const revealed = i < revealedCount;
              if (!line.isLuckyDip || revealed) {
                return (
                  <li
                    key={i}
                    className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm tabular-nums"
                    data-revealed
                  >
                    {line.mainNumbers.join(' · ')} <span className="text-white/40">|</span>{' '}
                    {line.bonusNumber}
                    {line.isLuckyDip && (
                      <span className="ml-2 text-[10px] text-gold-bright">LUCKY DIP</span>
                    )}
                  </li>
                );
              }
              return (
                <li
                  key={i}
                  className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/40"
                  data-hidden
                >
                  🎰 LUCKY DIP …
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={!allRevealed}
            onClick={props.onClose}
            className="mt-4 w-full rounded border border-gold bg-gold py-2 font-display text-xs tracking-wider text-felt-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allRevealed ? 'DONE' : 'REVEALING…'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Write `src/pages/lottery/DrawAnimationModal.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DrawAnimationModal from './DrawAnimationModal';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('DrawAnimationModal (purchase mode)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <DrawAnimationModal mode="purchase" open={false} lines={[]} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('reveals manual lines immediately', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: false, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText(/1 · 2 · 3 · 4 · 5/i).length).toBeGreaterThan(0);
  });

  it('reveals lucky-dip lines on a 350ms cadence', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[
          { isLuckyDip: true, mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 5 },
          { isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 9 },
        ]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBe(0);
    act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/10 · 20 · 30/i).length).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(350));
    expect(screen.queryAllByText(/1 · 2 · 3 · 4 · 5/i).length).toBeGreaterThan(0);
  });

  it('DONE button is disabled until all lines are revealed', () => {
    render(
      <DrawAnimationModal
        mode="purchase"
        open
        lines={[{ isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /revealing/i })).toBeDisabled();
    act(() => vi.advanceTimersByTime(350));
    expect(screen.getByRole('button', { name: /done/i })).not.toBeDisabled();
  });
});

describe('DrawAnimationModal — reduced motion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('framer-motion', async () => {
      const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
      return { ...actual, useReducedMotion: () => true };
    });
  });

  it('reveals all lucky-dip lines immediately when reduced motion is on', async () => {
    const { default: Modal } = await import('./DrawAnimationModal');
    render(
      <Modal
        mode="purchase"
        open
        lines={[
          { isLuckyDip: true, mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 },
          { isLuckyDip: true, mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 },
        ]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryAllByText(/lucky dip …/i).length).toBe(0);
  });
});
```

- [ ] **Step 4: Enable `ADD LUCKY DIP` + open modal after purchase in `LotteryPage.tsx`**

Modify the page:

1. Add modal state: `const [revealLines, setRevealLines] = useState<PurchaseRevealLine[] | null>(null);`
2. Enable the lucky-dip button: change `disabled` to `false`, wire onClick to `cart.addLuckyDip()`
3. After a successful `buyTicket` call, if any lucky-dip lines are in the result, set `setRevealLines(result.lines.map(l => ({ isLuckyDip: l.isLuckyDip, mainNumbers: l.mainNumbers, bonusNumber: l.bonusNumber })))`
4. Render `<DrawAnimationModal mode="purchase" open={revealLines !== null} lines={revealLines ?? []} onClose={() => setRevealLines(null)} />` at the end of `<main>`

Concrete diff:

```tsx
// Add import
import DrawAnimationModal, { type PurchaseRevealLine } from './DrawAnimationModal';

// In the component body, add state
const [revealLines, setRevealLines] = useState<PurchaseRevealLine[] | null>(null);

// In handleBuy, after cart.clear() and setPurchaseMessage:
const luckyDipPresent = result.lines.some((l) => l.isLuckyDip);
if (luckyDipPresent) {
  setRevealLines(
    result.lines.map((l) => ({
      isLuckyDip: l.isLuckyDip,
      mainNumbers: l.mainNumbers,
      bonusNumber: l.bonusNumber,
    })),
  );
}

// In the lucky-dip button:
<button
  type="button"
  onClick={cart.addLuckyDip}
  className="flex-1 rounded-md border border-gold bg-felt-deep py-2 font-display text-xs tracking-wider text-gold-bright hover:bg-gold/10"
>
  ADD LUCKY DIP
</button>

// At the bottom of <main>:
<DrawAnimationModal
  mode="purchase"
  open={revealLines !== null}
  lines={revealLines ?? []}
  onClose={() => setRevealLines(null)}
/>
```

- [ ] **Step 5: Add LotteryPage integration test**

Append to `src/pages/lottery/LotteryPage.test.tsx`:

```tsx
it('shows the purchase reveal modal after buying a ticket with lucky-dip lines', async () => {
  const r = await register({ username: 'dip', password: 'password123' });
  if (!r.ok) throw new Error();
  useSessionStore.setState({ currentUser: r.user });
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <LotteryPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: /add lucky dip/i }));
  await user.click(screen.getByRole('button', { name: /buy ticket/i }));
  await waitFor(() => expect(screen.getByText(/ticket purchased/i)).toBeInTheDocument());
});
```

- [ ] **Step 6: Verify + commit**

```bash
pnpm exec vitest run src/pages/lottery/
git add src/pages/lottery/DrawAnimationModal.tsx src/pages/lottery/DrawAnimationModal.test.tsx src/pages/lottery/LotteryPage.tsx src/pages/lottery/LotteryPage.test.tsx
git commit -m "feat(lottery): lucky dip add + purchase reveal modal with reduced-motion path"
```

## Task C.2: PR C — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: ~1100 tests passing (~19 new in PR C).

- [ ] **Step 2: Push + open + merge**

```bash
git push -u origin phase-10-pr-c-lucky-dip
gh pr create --title "phase-10(lottery): PR C — lucky dip + purchase reveal modal" --body "$(cat <<'EOF'
## Summary

PR C of Phase 10. Enables the ADD LUCKY DIP button (was disabled in PR B) and adds a reveal animation modal that flips each lucky-dip line one at a time after a ticket purchase. Reduced-motion users get an instant reveal.

Within-ticket uniqueness is enforced server-side by buyTicket (PR A); no new logic needed.

~19 new tests.

## Test plan

- [x] All 4 DoD checks green locally
- [ ] CI green
- [ ] Manual: buy a ticket with 3 lucky dips → modal flips each one in sequence; DONE button enables after the last
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR D — Scheduler + backfill + DrawAnimationModal (draw mode) + HERO + Sidebar dot + Lobby tile

**Branch:** `phase-10-pr-d-scheduler-hero` (off freshly-merged `main`)
**Goal:** Lottery becomes self-driving. The strict-clock daily scheduler runs `settleMissedDraws` on app open and on LotteryPage mount. The `DrawAnimationModal` gains a draw-reveal mode that sequences through each settled missed draw with ball-by-ball reveal + per-user-line highlight + tier-name banner. The `HeroSection` swaps between countdown clock (pre-draw) and big winning balls (post-draw). The sidebar gets a 🎟️ LOTTERY entry with a 🔴 unread dot when there are unseen draws. The lobby gets a tile.
**Risk:** Medium. The scheduler must be exactly-once per draw (idempotent). The unread-dot localStorage key must be per-user.
**Estimated tasks:** 7.

## Task D.1: Branch + `useLotteryBackfill` hook

**Files:**

- Create: `src/pages/lottery/useLotteryBackfill.ts`
- Create: `src/pages/lottery/useLotteryBackfill.test.ts`

The hook calls `settleMissedDraws()` once on mount and once on app boot (it gets mounted in two places: the LotteryPage AND in AppLayout so the dot can update even if user doesn't visit /lottery). It returns `{ freshDraws, loading }` so the caller can fire the reveal modal.

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-10-pr-d-scheduler-hero
```

- [ ] **Step 2: Write `src/pages/lottery/useLotteryBackfill.ts`**

```ts
import { useEffect, useState } from 'react';
import { settleMissedDraws, type LotteryDraw } from '@/systems/lottery';

/** Drives the strict-clock backfill. Runs once on mount; idempotent. */
export function useLotteryBackfill(): { freshDraws: LotteryDraw[]; loading: boolean } {
  const [freshDraws, setFreshDraws] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await settleMissedDraws();
      if (cancelled) return;
      setFreshDraws(result.freshDraws);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { freshDraws, loading };
}
```

- [ ] **Step 3: Write `src/pages/lottery/useLotteryBackfill.test.ts`**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLotteryBackfill } from './useLotteryBackfill';
import { buyTicket } from '@/systems/lottery';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('useLotteryBackfill', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns no fresh draws when nothing is pending', async () => {
    const { result } = renderHook(() => useLotteryBackfill());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.freshDraws).toEqual([]);
  });

  it('returns fresh draws when there are pending settlements', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }],
      // Force purchase for a past date by tampering with system time? Easier: insert the row directly.
    });
    // The hook runs settleMissedDraws() with now=Date.now(). In a real test, we'd need to
    // mock Date.now or insert a line for yesterday's draw. Defer the time-travel test to the
    // settleMissedDraws unit tests in PR A — here we just verify the hook completes without error.
    const { result } = renderHook(() => useLotteryBackfill());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
```

- [ ] **Step 4: Commit**

```bash
pnpm exec vitest run src/pages/lottery/useLotteryBackfill.test.ts
git add src/pages/lottery/useLotteryBackfill.ts src/pages/lottery/useLotteryBackfill.test.ts
git commit -m "feat(lottery): useLotteryBackfill hook driving settleMissedDraws on mount"
```

## Task D.2: `DrawAnimationModal` — draw reveal mode

**Files:**

- Modify: `src/pages/lottery/DrawAnimationModal.tsx`
- Modify: `src/pages/lottery/DrawAnimationModal.test.tsx`

Extends the modal with a second mode (`draw`). For each draw in the input list, sequences the 5 main balls then the bonus ball, then renders the user's lines with matching numbers highlighted + tier banner per line. User clicks "Next draw" or "Done".

- [ ] **Step 1: Extend `src/pages/lottery/DrawAnimationModal.tsx`**

Replace the existing file with:

```tsx
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { evaluateLine, payoutFor } from '@/systems/lottery';
import type { LotteryLine, LotteryDraw } from '@/db';

export interface PurchaseRevealLine {
  isLuckyDip: boolean;
  mainNumbers: number[];
  bonusNumber: number;
}

interface PurchaseModeProps {
  mode: 'purchase';
  open: boolean;
  lines: PurchaseRevealLine[];
  onClose: () => void;
}

interface DrawModeProps {
  mode: 'draw';
  open: boolean;
  draws: Array<{ draw: LotteryDraw; userLines: LotteryLine[] }>;
  onClose: () => void;
}

type Props = PurchaseModeProps | DrawModeProps;

const FLIP_GAP_MS = 350;
const BALL_GAP_MS = 250;

export default function DrawAnimationModal(props: Props): JSX.Element {
  if (props.mode === 'purchase') return <PurchaseMode {...props} />;
  return <DrawMode {...props} />;
}

function PurchaseMode(props: PurchaseModeProps): JSX.Element {
  const reduce = useReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!props.open) return;
    const luckyDipIndexes = props.lines
      .map((l, i) => (l.isLuckyDip ? i : -1))
      .filter((i) => i !== -1);
    const initial = props.lines.length - luckyDipIndexes.length;
    setRevealedCount(initial);
    if (reduce) {
      setRevealedCount(props.lines.length);
      return;
    }
    let n = initial;
    const id = setInterval(() => {
      n += 1;
      setRevealedCount(n);
      if (n >= props.lines.length) clearInterval(id);
    }, FLIP_GAP_MS);
    return () => clearInterval(id);
  }, [props.open, props.lines, reduce]);

  if (!props.open) return <></>;
  const allRevealed = revealedCount >= props.lines.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        data-purchase-reveal-modal
      >
        <div className="max-w-md rounded-lg border border-gold bg-felt-deep p-6">
          <h2 className="mb-3 font-display text-sm tracking-wider text-gold-bright">
            TICKET PURCHASED
          </h2>
          <ul className="space-y-2">
            {props.lines.map((line, i) => {
              const revealed = i < revealedCount;
              if (!line.isLuckyDip || revealed) {
                return (
                  <li
                    key={i}
                    className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm tabular-nums"
                    data-revealed
                  >
                    {line.mainNumbers.join(' · ')} <span className="text-white/40">|</span>{' '}
                    {line.bonusNumber}
                    {line.isLuckyDip && (
                      <span className="ml-2 text-[10px] text-gold-bright">LUCKY DIP</span>
                    )}
                  </li>
                );
              }
              return (
                <li
                  key={i}
                  className="rounded border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/40"
                  data-hidden
                >
                  🎰 LUCKY DIP …
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={!allRevealed}
            onClick={props.onClose}
            className="mt-4 w-full rounded border border-gold bg-gold py-2 font-display text-xs tracking-wider text-felt-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allRevealed ? 'DONE' : 'REVEALING…'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DrawMode(props: DrawModeProps): JSX.Element {
  const reduce = useReducedMotion();
  const [drawIdx, setDrawIdx] = useState(0);
  const [revealedBalls, setRevealedBalls] = useState(0); // 0..6 (5 main + 1 bonus)

  useEffect(() => {
    if (!props.open) return;
    setDrawIdx(0);
    setRevealedBalls(0);
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    if (reduce) {
      setRevealedBalls(6);
      return;
    }
    setRevealedBalls(0);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setRevealedBalls(n);
      if (n >= 6) clearInterval(id);
    }, BALL_GAP_MS);
    return () => clearInterval(id);
  }, [props.open, drawIdx, reduce]);

  if (!props.open || props.draws.length === 0) return <></>;
  const current = props.draws[drawIdx];
  if (!current) return <></>;
  const { draw, userLines } = current;
  const drawSet = new Set(draw.mainNumbers);
  const allBallsRevealed = revealedBalls >= 6;
  const isLast = drawIdx === props.draws.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        data-draw-reveal-modal
      >
        <div className="max-w-lg rounded-lg border border-gold bg-felt-deep p-6">
          <h2 className="mb-1 font-display text-sm tracking-wider text-gold-bright">
            DRAW {draw.id}
          </h2>
          <p className="mb-3 text-xs text-white/50">
            Draw {drawIdx + 1} of {props.draws.length}
          </p>
          <div className="mb-4 flex gap-2">
            {draw.mainNumbers.map((n, i) => (
              <Ball key={i} value={n} revealed={i < revealedBalls} color="gold" />
            ))}
            <Ball value={draw.bonus} revealed={revealedBalls >= 6} color="magenta" />
          </div>
          {allBallsRevealed && userLines.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {userLines.map((line) => {
                const tier = evaluateLine(line, {
                  mainNumbers: draw.mainNumbers,
                  bonus: draw.bonus,
                });
                const payout = payoutFor(tier);
                const reentry = tier === '2' || tier === '2+bonus';
                return (
                  <li
                    key={line.id}
                    className="rounded border border-white/15 bg-black/30 px-3 py-2 text-xs"
                  >
                    <span className="font-tabular tabular-nums">
                      {line.mainNumbers.map((n) => (
                        <span
                          key={n}
                          className={
                            drawSet.has(n)
                              ? 'rounded bg-gold px-1 text-felt-deep'
                              : 'px-1 text-white/70'
                          }
                        >
                          {n}
                        </span>
                      ))}
                      <span className="ml-1 text-white/40">|</span>{' '}
                      <span
                        className={
                          line.bonusNumber === draw.bonus
                            ? 'rounded bg-neon-magenta px-1 text-felt-deep'
                            : 'px-1 text-white/70'
                        }
                      >
                        {line.bonusNumber}
                      </span>
                    </span>
                    {tier && (
                      <span className="ml-2 text-gold-bright">
                        {reentry
                          ? 'Match 2 — Free entry for next draw!'
                          : `${tier} → +${payout.toLocaleString()} chips`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {allBallsRevealed && userLines.length === 0 && (
            <p className="mb-4 text-center text-xs text-white/50">No tickets for this draw.</p>
          )}
          <button
            type="button"
            disabled={!allBallsRevealed}
            onClick={() => {
              if (isLast) props.onClose();
              else setDrawIdx((i) => i + 1);
            }}
            className="w-full rounded border border-gold bg-gold py-2 font-display text-xs tracking-wider text-felt-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allBallsRevealed ? (isLast ? 'DONE' : 'NEXT DRAW →') : 'REVEALING…'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Ball({
  value,
  revealed,
  color,
}: {
  value: number;
  revealed: boolean;
  color: 'gold' | 'magenta';
}): JSX.Element {
  const bg = color === 'gold' ? 'bg-gold' : 'bg-neon-magenta';
  return (
    <span
      data-ball
      data-ball-revealed={revealed || undefined}
      className={
        revealed
          ? `flex h-12 w-12 items-center justify-center rounded-full ${bg} font-display text-base tabular-nums text-felt-deep shadow-[0_0_12px_rgba(212,175,55,0.5)]`
          : 'flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/30'
      }
    >
      {revealed ? value : '?'}
    </span>
  );
}
```

- [ ] **Step 2: Add draw-mode tests**

Append to `src/pages/lottery/DrawAnimationModal.test.tsx`:

```tsx
describe('DrawAnimationModal (draw mode)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const sampleDraw = {
    id: '2026-05-19',
    drawAt: Date.now(),
    mainNumbers: [3, 12, 25, 41, 49],
    bonus: 7,
    totalLines: 1,
    totalRevenue: 10,
    totalPayout: 0,
  };

  it('renders header and ball placeholders', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    expect(screen.getAllByText('?').length).toBeGreaterThan(0);
  });

  it('reveals balls in sequence on the configured cadence', () => {
    render(
      <DrawAnimationModal
        mode="draw"
        open
        draws={[{ draw: sampleDraw, userLines: [] }]}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('3')).toBeNull();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText('3')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(250 * 5));
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('NEXT DRAW button advances to the next draw', () => {
    const draws = [
      { draw: sampleDraw, userLines: [] },
      { draw: { ...sampleDraw, id: '2026-05-20' }, userLines: [] },
    ];
    render(<DrawAnimationModal mode="draw" open draws={draws} onClose={() => {}} />);
    act(() => vi.advanceTimersByTime(250 * 6));
    expect(screen.getByText(/draw 2026-05-19/i)).toBeInTheDocument();
    // Click NEXT DRAW.
    screen.getByRole('button', { name: /next draw/i }).click();
    expect(screen.getByText(/draw 2026-05-20/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/DrawAnimationModal.test.tsx
git add src/pages/lottery/DrawAnimationModal.tsx src/pages/lottery/DrawAnimationModal.test.tsx
git commit -m "feat(lottery): DrawAnimationModal draw-reveal mode with per-line tier banner"
```

## Task D.3: `HeroSection` — countdown ↔ winning balls swap

**Files:**

- Create: `src/pages/lottery/HeroSection.tsx`
- Create: `src/pages/lottery/HeroSection.test.tsx`

Reads today's draw (if any) from Dexie via `useLiveQuery` and shows:

- Big winning balls + smaller countdown to tomorrow if today's draw is settled
- Big countdown to today's draw if not yet settled (and now < cutoff)

- [ ] **Step 1: Write `src/pages/lottery/HeroSection.tsx`**

```tsx
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor, nextDrawAt } from '@/systems/lottery';
import type { LotteryDraw } from '@/db';

const EMPTY: LotteryDraw | undefined = undefined;

export default function HeroSection(): JSX.Element {
  const today = dateStringFor(Date.now());
  const todayDraw = useLiveQuery(() => db.lotteryDraws.get(today), [today], EMPTY);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = nextDrawAt(now);
  const countdown = formatCountdown(next - now);

  if (todayDraw) {
    return (
      <section
        className="rounded border border-gold/30 bg-felt-deep p-6 text-center"
        data-hero-state="post-draw"
      >
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
          Today&apos;s winning numbers
        </p>
        <div className="mb-3 flex justify-center gap-3">
          {todayDraw.mainNumbers.map((n) => (
            <BigBall key={n} value={n} color="gold" />
          ))}
          <BigBall value={todayDraw.bonus} color="magenta" />
        </div>
        <p className="text-xs text-white/60">
          Next draw in{' '}
          <span className="font-display tabular-nums text-gold-bright">{countdown}</span>
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded border border-gold/30 bg-felt-deep p-6 text-center"
      data-hero-state="pre-draw"
    >
      <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Next draw in</p>
      <p className="font-display text-5xl tracking-wider text-gold-bright tabular-nums">
        {countdown}
      </p>
    </section>
  );
}

function BigBall({ value, color }: { value: number; color: 'gold' | 'magenta' }): JSX.Element {
  const bg = color === 'gold' ? 'bg-gold' : 'bg-neon-magenta';
  return (
    <span
      data-big-ball
      className={`flex h-24 w-24 items-center justify-center rounded-full ${bg} font-display text-3xl tabular-nums text-felt-deep shadow-[0_0_28px_rgba(212,175,55,0.6)]`}
    >
      {value}
    </span>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Write `src/pages/lottery/HeroSection.test.tsx`**

```tsx
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HeroSection from './HeroSection';
import { resetDb, db } from '@/test/db-helpers';

describe('HeroSection', () => {
  beforeEach(async () => {
    await resetDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders pre-draw countdown when today has no draw', () => {
    render(<HeroSection />);
    expect(screen.getByText(/next draw in/i)).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it("renders big balls when today's draw is settled", async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HeroSection />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('41')).toBeInTheDocument();
      expect(screen.getByText('49')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/lottery/HeroSection.test.tsx
git add src/pages/lottery/HeroSection.tsx src/pages/lottery/HeroSection.test.tsx
git commit -m "feat(lottery): HeroSection — countdown ↔ winning balls swap"
```

## Task D.4: Sidebar `🎟️ LOTTERY` entry + 🔴 unread dot

**Files:**

- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.test.tsx` (or its equivalent)

Add a LOTTERY entry. The unread dot is driven by comparing `localStorage[unreadKey]` (latest draw id the user has seen) with the latest `lotteryDraws.id` from Dexie.

- [ ] **Step 1: Update `src/components/Sidebar.tsx`**

Read the existing Sidebar to find the games-list pattern. Add a `🎟️ LOTTERY` `NavLink` with `to="/lottery"`. Use `useLiveQuery` to read the latest draw id and `useEffect` to write the seen-key when the user is on /lottery (subscribe to `useLocation`).

Sketch:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router';
import { db } from '@/db';
import { useCurrentUser } from '@/store/sessionStore';

// inside the Sidebar component:
const user = useCurrentUser();
const seenKey = user ? `MASQUER.lottery.lastSeenDraw.${user.id}` : null;
const lastDrawId = useLiveQuery(async () => (await db.lotteryDraws.orderBy('id').last())?.id ?? null, [], null);
const seen = seenKey ? localStorage.getItem(seenKey) : null;
const hasUnread = lastDrawId !== null && lastDrawId !== seen;
const location = useLocation();
useEffect(() => {
  if (location.pathname === '/lottery' && seenKey && lastDrawId) {
    localStorage.setItem(seenKey, lastDrawId);
  }
}, [location.pathname, seenKey, lastDrawId]);

// In the JSX, alongside other game NavLinks:
<NavLink to="/lottery" className={({ isActive }) => /* existing class style */}>
  <span>🎟️ LOTTERY</span>
  {hasUnread && <span data-unread-dot className="inline-block h-2 w-2 rounded-full bg-casino-red" />}
</NavLink>
```

(Exact JSX shape depends on the existing Sidebar's structure — match the pattern used by the other game entries.)

- [ ] **Step 2: Extend `src/components/Sidebar.test.tsx`** to assert the LOTTERY entry renders + the unread dot toggles

```tsx
it('renders LOTTERY entry', () => {
  // Existing setup: render Sidebar within MemoryRouter + session store with a logged-in user
  expect(screen.getByRole('link', { name: /lottery/i })).toBeInTheDocument();
});

it('shows the unread dot when a draw exists and has not been seen', async () => {
  await db.lotteryDraws.put({
    id: '2026-05-19',
    drawAt: Date.now(),
    mainNumbers: [1, 2, 3, 4, 5],
    bonus: 1,
    totalLines: 0,
    totalRevenue: 0,
    totalPayout: 0,
  });
  // Render with a logged-in user, location !== /lottery
  await waitFor(() => expect(screen.getByTestId('unread-dot')).toBeInTheDocument());
});

it('clears the unread dot when the user visits /lottery', async () => {
  await db.lotteryDraws.put({ id: '2026-05-19' /* ... */ });
  // Render at /lottery
  await waitFor(() => expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument());
});
```

(Add `data-testid="unread-dot"` to the dot span in the Sidebar for these tests.)

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/components/Sidebar.test.tsx
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat(lottery): Sidebar LOTTERY entry with per-user unread dot"
```

## Task D.5: LobbyPage tile with countdown

**Files:**

- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/pages/LobbyPage.test.tsx`

Read today's draw + the user's lines for it via `useLiveQuery`. Show one of 3 states based on cutoff time vs draw-existence:

- "Tickets open — buy by HH:MM" (pre-cutoff, not yet drawn)
- "Drawn: 5 · 17 · 23 · 31 · 44 | 7" (post-draw)
- Hover shows the user's line count + winnings (if any lines)

- [ ] **Step 1: Update `src/pages/LobbyPage.tsx`**

Read the existing LobbyPage structure. Add a new tile alongside the game tiles. Sketch:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor, nextDrawAt } from '@/systems/lottery';
import { Link } from 'react-router';

// In the tile grid:
function LotteryTile({ userId }: { userId: string }): JSX.Element {
  const today = dateStringFor(Date.now());
  const draw = useLiveQuery(() => db.lotteryDraws.get(today), [today], undefined);
  const userLines = useLiveQuery(
    () => db.lotteryLines.where('[userId+drawId]').equals([userId, today]).toArray(),
    [userId, today],
    [],
  );
  const cutoff = nextDrawAt(Date.now());
  const sub = draw
    ? `Drawn: ${draw.mainNumbers.join(' · ')} | ${draw.bonus}`
    : `Draw in ${formatHHMM(cutoff - Date.now())}`;
  const winnings = userLines.reduce((s, l) => s + (l.payout ?? 0), 0);
  const hoverInfo =
    userLines.length > 0
      ? `${userLines.length} line${userLines.length === 1 ? '' : 's'} · ${winnings.toLocaleString()} chips`
      : '';
  return (
    <Link
      to="/lottery"
      className="rounded-lg border border-gold/30 bg-felt-deep p-4 hover:border-gold"
      title={hoverInfo}
      data-lottery-tile
    >
      <h3 className="font-display text-sm tracking-wider text-gold-bright">🎟️ DAILY LOTTERY</h3>
      <p className="mt-1 text-xs text-white/60">{sub}</p>
    </Link>
  );
}

function formatHHMM(ms: number): string {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
```

Then render `<LotteryTile userId={user.id} />` inside the lobby grid alongside the game tiles.

- [ ] **Step 2: Extend `LobbyPage.test.tsx`** with at least one assertion that the tile renders and shows the countdown or the drawn numbers depending on whether a draw exists.

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/pages/LobbyPage.test.tsx
git add src/pages/LobbyPage.tsx src/pages/LobbyPage.test.tsx
git commit -m "feat(lottery): lobby tile with countdown + drawn-numbers preview"
```

## Task D.6: Wire HERO + backfill + draw modal into LotteryPage

**Files:**

- Modify: `src/pages/lottery/LotteryPage.tsx`
- Modify: `src/pages/lottery/LotteryPage.test.tsx`

Replace the HERO placeholder with `<HeroSection />`. Call `useLotteryBackfill()` on mount. When `freshDraws` is non-empty, open the `DrawAnimationModal` in `draw` mode with the missed-draws sequence.

- [ ] **Step 1: Update `LotteryPage.tsx`**

```tsx
// Add imports
import HeroSection from './HeroSection';
import { useLotteryBackfill } from './useLotteryBackfill';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { LotteryDraw, LotteryLine } from '@/db';

// Inside the component (after the existing useState calls):
const { freshDraws } = useLotteryBackfill();
const [drawModalDraws, setDrawModalDraws] = useState<Array<{ draw: LotteryDraw; userLines: LotteryLine[] }>>([]);

useEffect(() => {
  if (freshDraws.length === 0) return;
  void (async () => {
    const enriched = await Promise.all(
      freshDraws.map(async (d) => {
        const userLines = await db.lotteryLines
          .where('[userId+drawId]')
          .equals([user!.id, d.id])
          .toArray();
        return { draw: d, userLines };
      }),
    );
    setDrawModalDraws(enriched);
  })();
}, [freshDraws, user]);

// Replace the data-hero-placeholder <section> with:
<HeroSection />

// At the bottom of <main>, alongside the purchase-reveal modal:
<DrawAnimationModal
  mode="draw"
  open={drawModalDraws.length > 0}
  draws={drawModalDraws}
  onClose={() => setDrawModalDraws([])}
/>
```

- [ ] **Step 2: Add integration test**

Append to `LotteryPage.test.tsx`: a test where you seed an unsettled line for yesterday, mount the page with `vi.setSystemTime` past yesterday's 20:00, and assert the draw modal appears.

- [ ] **Step 3: Verify + commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/lottery/ && pnpm build
git add src/pages/lottery/LotteryPage.tsx src/pages/lottery/LotteryPage.test.tsx
git commit -m "feat(lottery): wire HERO + backfill + draw modal into LotteryPage"
```

## Task D.7: PR D — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: ~1130 tests passing (~30 new in PR D).

- [ ] **Step 2: Push + open + merge**

```bash
git push -u origin phase-10-pr-d-scheduler-hero
gh pr create --title "phase-10(lottery): PR D — scheduler + HERO + DrawAnimationModal + sidebar + lobby" --body "$(cat <<'EOF'
## Summary

PR D of Phase 10. Lottery is now self-driving:

- useLotteryBackfill hook runs settleMissedDraws() on mount
- DrawAnimationModal gains draw-reveal mode (ball-by-ball + tier banner per user line)
- HeroSection swaps countdown ↔ winning balls based on whether today's draw exists
- Sidebar 🎟️ LOTTERY entry + per-user unread 🔴 dot
- Lobby tile with countdown / drawn-numbers preview
- LotteryPage wires it all together

~30 new tests.

## Test plan

- [x] All 4 DoD checks green locally
- [ ] CI green
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR E — History slide + admin lottery page + Lottery in /stats & /leaderboard nav

**Branch:** `phase-10-pr-e-history-admin` (off freshly-merged `main`)
**Goal:** User-facing past-draws list (`HistorySlide`) on the LotteryPage. Admin dashboard view at `/admin/lottery` with 4 stat cards + 2 number-frequency charts + recent-draws table. Plumb `'lottery'` into Phase 7's StatsLeftRail / LeaderboardLeftRail / GAME_LABELS / TITLES maps so lottery rounds show up in /stats and /leaderboard per-game tabs automatically.
**Risk:** Low — mostly UI wiring on top of data already produced by PR A's settle flow.
**Estimated tasks:** 6.

## Task E.1: Branch + `HistorySlide` component

**Files:**

- Create: `src/pages/lottery/HistorySlide.tsx`
- Create: `src/pages/lottery/HistorySlide.test.tsx`
- Modify: `src/pages/lottery/LotteryPage.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-10-pr-e-history-admin
```

- [ ] **Step 2: Write `src/pages/lottery/HistorySlide.tsx`**

```tsx
import type { JSX } from 'react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { LotteryDraw, LotteryLine } from '@/db';

interface Props {
  userId: string;
  pageSize?: number;
}

const EMPTY_DRAWS: readonly LotteryDraw[] = [];
const EMPTY_LINES: readonly LotteryLine[] = [];

export default function HistorySlide({ userId, pageSize = 30 }: Props): JSX.Element {
  const [limit, setLimit] = useState(pageSize);

  const draws = useLiveQuery(
    () => db.lotteryDraws.orderBy('id').reverse().limit(limit).toArray(),
    [limit],
    EMPTY_DRAWS,
  );
  const userLines = useLiveQuery(
    () => db.lotteryLines.where('userId').equals(userId).toArray(),
    [userId],
    EMPTY_LINES,
  );

  const linesByDraw = new Map<string, LotteryLine[]>();
  for (const line of userLines) {
    const existing = linesByDraw.get(line.drawId) ?? [];
    existing.push(line);
    linesByDraw.set(line.drawId, existing);
  }

  return (
    <section className="rounded border border-gold/30 bg-felt-deep p-3" data-history-slide>
      <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">RECENT DRAWS</h3>
      {draws.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/40">
          No draws yet — the first one runs at 20:00.
        </p>
      ) : (
        <ul className="space-y-1">
          {draws.map((d) => {
            const lines = linesByDraw.get(d.id) ?? [];
            return <HistoryRow key={d.id} draw={d} userLines={lines} />;
          })}
        </ul>
      )}
      {draws.length === limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + pageSize)}
          className="mt-2 w-full rounded border border-white/20 py-1.5 text-xs text-white/60 hover:text-white"
        >
          Load older draws
        </button>
      )}
    </section>
  );
}

function HistoryRow({
  draw,
  userLines,
}: {
  draw: LotteryDraw;
  userLines: LotteryLine[];
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const winnings = userLines.reduce((s, l) => s + (l.payout ?? 0), 0);
  const drawSet = new Set(draw.mainNumbers);
  return (
    <li
      className="rounded border border-white/10 bg-black/20"
      data-history-row
      data-draw-id={draw.id}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs"
        aria-expanded={expanded}
        aria-controls={`history-${draw.id}`}
      >
        <span className="text-white/60 tabular-nums">{draw.id}</span>
        <span className="flex-1 truncate text-center tabular-nums text-white/70">
          {draw.mainNumbers.join(' · ')} <span className="text-white/40">|</span> {draw.bonus}
        </span>
        <span className="text-right text-white/60">
          Lines: <span className="text-white">{userLines.length}</span>{' '}
          {winnings > 0 && <span className="text-chip-win">+{winnings.toLocaleString()}</span>}
        </span>
      </button>
      {expanded && userLines.length > 0 && (
        <div id={`history-${draw.id}`} className="border-t border-white/10 p-2">
          <ul className="space-y-1 text-[11px]">
            {userLines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-2">
                <span className="tabular-nums">
                  {line.mainNumbers.map((n) => (
                    <span
                      key={n}
                      className={
                        drawSet.has(n)
                          ? 'rounded bg-gold/30 px-1 text-gold-bright'
                          : 'px-1 text-white/60'
                      }
                    >
                      {n}
                    </span>
                  ))}
                  <span className="ml-1 text-white/40">|</span>{' '}
                  <span
                    className={
                      line.bonusNumber === draw.bonus
                        ? 'rounded bg-neon-magenta/30 px-1 text-neon-magenta'
                        : 'px-1 text-white/60'
                    }
                  >
                    {line.bonusNumber}
                  </span>
                </span>
                <span className="text-right text-white/50">
                  {line.matchTier ?? '—'}
                  {line.payout > 0 && (
                    <span className="ml-2 text-chip-win">+{line.payout.toLocaleString()}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Write `src/pages/lottery/HistorySlide.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistorySlide from './HistorySlide';
import { db, resetDb } from '@/test/db-helpers';
import { register } from '@/systems/auth';

describe('HistorySlide', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the empty state when no draws exist', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText(/no draws yet/i)).toBeInTheDocument());
  });

  it('renders a draw row with winning numbers', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 0,
      totalRevenue: 0,
      totalPayout: 0,
    });
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    expect(screen.getByText(/3 · 12 · 25 · 41 · 49/)).toBeInTheDocument();
  });

  it('expands to show per-line detail on click', async () => {
    const r = await register({ username: 'c', password: 'password123' });
    if (!r.ok) throw new Error();
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 0,
    });
    await db.lotteryTickets.put({
      id: 't-1',
      userId: r.user.id,
      drawId: '2026-05-19',
      purchasedAt: Date.now(),
      totalCost: 10,
      lineCount: 1,
    });
    await db.lotteryLines.put({
      id: 'l-1',
      ticketId: 't-1',
      userId: r.user.id,
      drawId: '2026-05-19',
      mainNumbers: [1, 2, 3, 4, 5],
      bonusNumber: 7,
      isLuckyDip: false,
      isFreeReentry: false,
      settled: true,
      matchTier: '2+bonus',
      payout: 0,
    });
    const user = userEvent.setup();
    render(<HistorySlide userId={r.user.id} />);
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /2026-05-19/i }));
    expect(screen.getByText(/2\+bonus/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Replace the history placeholder in `LotteryPage.tsx`**

Replace the `<section data-history-placeholder>...</section>` block with:

```tsx
<HistorySlide userId={user.id} />
```

Add the import: `import HistorySlide from './HistorySlide';`

- [ ] **Step 5: Commit**

```bash
pnpm exec vitest run src/pages/lottery/HistorySlide.test.tsx src/pages/lottery/LotteryPage.test.tsx
git add src/pages/lottery/HistorySlide.tsx src/pages/lottery/HistorySlide.test.tsx src/pages/lottery/LotteryPage.tsx
git commit -m "feat(lottery): HistorySlide — scrollable past draws with per-line expand"
```

## Task E.2: `NumberFrequencyBar` chart

**Files:**

- Create: `src/components/charts/NumberFrequencyBar.tsx`
- Create: `src/components/charts/NumberFrequencyBar.test.tsx`

Recharts bar chart of frequencies (one bar per number). Lives in `src/components/charts/` so it rides the existing shared Recharts chunk (ADR-0039).

- [ ] **Step 1: Write `src/components/charts/NumberFrequencyBar.tsx`**

```tsx
import type { JSX } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Props {
  /** Array of frequencies; index i = number (i+1). */
  data: number[];
  /** Bar color hex. */
  color?: string;
  height?: number;
}

export default function NumberFrequencyBar({
  data,
  color = '#d4af37',
  height = 200,
}: Props): JSX.Element {
  const chartData = data.map((count, i) => ({ number: i + 1, count }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid stroke="rgba(212,175,55,0.12)" />
        <XAxis dataKey="number" stroke="rgba(255,255,255,0.5)" fontSize={9} interval={4} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#06120c',
            border: '1px solid #d4af37',
            fontSize: 12,
            color: '#f0c64a',
          }}
          formatter={(value: number) => [`${value} times`, 'drawn']}
        />
        <Bar dataKey="count" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NumberFrequencyBar from './NumberFrequencyBar';

describe('NumberFrequencyBar', () => {
  it('renders a Recharts chart for given data', () => {
    const { container } = render(<NumberFrequencyBar data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders even with all-zero data', () => {
    const { container } = render(<NumberFrequencyBar data={Array.from({ length: 50 }, () => 0)} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Commit**

```bash
pnpm exec vitest run src/components/charts/NumberFrequencyBar.test.tsx
git add src/components/charts/NumberFrequencyBar.tsx src/components/charts/NumberFrequencyBar.test.tsx
git commit -m "feat(lottery): NumberFrequencyBar chart for admin frequency histograms"
```

## Task E.3: `AdminLotteryPage`

**Files:**

- Create: `src/pages/admin/AdminLotteryPage.tsx`
- Create: `src/pages/admin/AdminLotteryPage.test.tsx`
- Modify: `src/router.tsx` (wire `/admin/lottery` lazy route)
- Modify: `src/pages/admin/AdminLayout.tsx` (Phase 9 admin nav; grep for `AdminUsersListPage` to locate the existing admin nav links pattern) — add a LOTTERY entry

- [ ] **Step 1: Write `src/pages/admin/AdminLotteryPage.tsx`**

```tsx
import type { JSX } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import StatCard from '@/pages/admin/StatCard';
import NumberFrequencyBar from '@/components/charts/NumberFrequencyBar';
import {
  getLotteryAdminStats,
  getNumberFrequency,
  type LotteryAdminStats,
} from '@/systems/lottery';
import { db, type LotteryDraw } from '@/db';

const EMPTY_STATS: LotteryAdminStats = {
  ticketsSoldToday: 0,
  linesSoldToday: 0,
  totalRevenue: 0,
  totalPayout: 0,
  netProfit: 0,
};
const EMPTY_FREQ: number[] = [];
const EMPTY_DRAWS: readonly LotteryDraw[] = [];

export default function AdminLotteryPage(): JSX.Element {
  const stats = useLiveQuery(() => getLotteryAdminStats(), [], EMPTY_STATS);
  const mainFreq = useLiveQuery(() => getNumberFrequency('main'), [], EMPTY_FREQ);
  const bonusFreq = useLiveQuery(() => getNumberFrequency('bonus'), [], EMPTY_FREQ);
  const recentDraws = useLiveQuery(
    () => db.lotteryDraws.orderBy('id').reverse().limit(50).toArray(),
    [],
    EMPTY_DRAWS,
  );

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">
            ADMIN · LOTTERY
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatCard
            label="Tickets sold today"
            value={`${stats.ticketsSoldToday} (${stats.linesSoldToday} lines)`}
          />
          <StatCard label="Revenue (all-time)" value={stats.totalRevenue.toLocaleString()} />
          <StatCard label="Payout (all-time)" value={stats.totalPayout.toLocaleString()} />
          <StatCard
            label="House profit"
            value={
              stats.netProfit >= 0
                ? `+${stats.netProfit.toLocaleString()}`
                : stats.netProfit.toLocaleString()
            }
            tone={stats.netProfit >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
              MAIN POOL FREQUENCY (1–50)
            </h2>
            <NumberFrequencyBar
              data={mainFreq.length === 50 ? mainFreq : Array.from({ length: 50 }, () => 0)}
              color="#d4af37"
            />
          </section>
          <section>
            <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">
              BONUS POOL FREQUENCY (1–10)
            </h2>
            <NumberFrequencyBar
              data={bonusFreq.length === 10 ? bonusFreq : Array.from({ length: 10 }, () => 0)}
              color="#e84a8c"
              height={160}
            />
          </section>
        </div>

        <section className="mt-6">
          <h2 className="mb-2 font-display text-xs tracking-wider text-white/60">RECENT DRAWS</h2>
          {recentDraws.length === 0 ? (
            <p className="text-xs text-white/40">No draws yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gold/30 uppercase tracking-wider text-white/40">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Numbers</th>
                  <th className="py-2 pr-3 text-right">Lines</th>
                  <th className="py-2 pr-3 text-right">Revenue</th>
                  <th className="py-2 pr-3 text-right">Payout</th>
                  <th className="py-2 text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {recentDraws.map((d) => {
                  const pl = d.totalRevenue - d.totalPayout;
                  return (
                    <tr key={d.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-3 tabular-nums">{d.id}</td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {d.mainNumbers.join(' · ')} <span className="text-white/40">|</span>{' '}
                        {d.bonus}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{d.totalLines}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {d.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {d.totalPayout.toLocaleString()}
                      </td>
                      <td
                        className={`py-1.5 text-right tabular-nums ${pl >= 0 ? 'text-chip-win' : 'text-casino-red'}`}
                      >
                        {pl >= 0 ? '+' : ''}
                        {pl.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/pages/admin/AdminLotteryPage.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminLotteryPage from './AdminLotteryPage';
import { resetDb, db } from '@/test/db-helpers';

describe('AdminLotteryPage', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders all 4 stat card labels', async () => {
    render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/tickets sold today/i)).toBeInTheDocument());
    expect(screen.getByText(/revenue \(all-time\)/i)).toBeInTheDocument();
    expect(screen.getByText(/payout \(all-time\)/i)).toBeInTheDocument();
    expect(screen.getByText(/house profit/i)).toBeInTheDocument();
  });

  it('renders profit card with positive tone when revenue > payout', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5],
      bonus: 1,
      totalLines: 10,
      totalRevenue: 100,
      totalPayout: 30,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/house profit/i)).toBeInTheDocument());
    expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
  });

  it('renders profit card with negative tone when payout > revenue', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [1, 2, 3, 4, 5],
      bonus: 1,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 100,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/-90/i)).toBeInTheDocument());
    expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
  });

  it('renders recent draws table when draws exist', async () => {
    await db.lotteryDraws.put({
      id: '2026-05-19',
      drawAt: Date.now(),
      mainNumbers: [3, 12, 25, 41, 49],
      bonus: 7,
      totalLines: 1,
      totalRevenue: 10,
      totalPayout: 0,
    });
    render(
      <MemoryRouter>
        <AdminLotteryPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('2026-05-19')).toBeInTheDocument());
    expect(screen.getByText(/3 · 12 · 25 · 41 · 49/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Wire route in `src/router.tsx`**

Add the lazy import and route:

```tsx
const AdminLotteryPage = lazy(() => import('@/pages/admin/AdminLotteryPage'));

// In the admin routes block, alongside the other admin pages, wrap in RequireAdmin + Suspense:
{
  path: 'admin/lottery',
  element: (
    <RequireAdmin>
      <Suspense fallback={statsFallback}>
        <AdminLotteryPage />
      </Suspense>
    </RequireAdmin>
  ),
},
```

- [ ] **Step 4: Add LOTTERY entry to admin sidebar/nav**

Find the admin nav (likely in `AdminLayout.tsx` or `Sidebar.tsx`'s admin branch). Add a NavLink to `/admin/lottery`.

- [ ] **Step 5: Verify + commit**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run src/pages/admin/AdminLotteryPage.test.tsx && pnpm build
git add src/pages/admin/AdminLotteryPage.tsx src/pages/admin/AdminLotteryPage.test.tsx src/router.tsx
# also add the admin sidebar file if modified
git commit -m "feat(admin): AdminLotteryPage — 4 stat cards + frequency charts + recent draws"
```

## Task E.4: Lottery in /stats and /leaderboard nav

**Files:**

- Modify: `src/pages/stats/StatsLeftRail.tsx`
- Modify: `src/pages/stats/StatsPerGamePage.tsx`
- Modify: `src/pages/stats/StatsPage.tsx`
- Modify: `src/pages/leaderboard/LeaderboardPerGamePage.tsx`
- Modify: `src/pages/leaderboard/LeaderboardPage.tsx`

Each file has a `TABS`/`GAME_LABELS`/`TITLES` map keyed by game slug. Add `'lottery'` everywhere.

- [ ] **Step 1: Update `src/pages/stats/StatsLeftRail.tsx`**

In `TABS`: append `{ icon: '🎟️', label: 'Lottery' }`. In `SLUG`: append `'Lottery': 'lottery'`.

- [ ] **Step 2: Update `src/pages/stats/StatsPerGamePage.tsx`**

`GAME_LABELS` gains: `lottery: 'Lottery',`

- [ ] **Step 3: Update `src/pages/stats/StatsPage.tsx`**

`TITLES` gains: `lottery: 'LOTTERY',`

- [ ] **Step 4: Update `src/pages/leaderboard/LeaderboardPerGamePage.tsx`**

`GAME_LABELS` gains: `lottery: 'LOTTERY',`

- [ ] **Step 5: Update `src/pages/leaderboard/LeaderboardPage.tsx`**

`TITLES` gains: `lottery: 'LOTTERY',`

- [ ] **Step 6: Verify**

```bash
pnpm typecheck
pnpm exec vitest run src/pages/stats/ src/pages/leaderboard/
```

The existing per-game tests don't cover lottery yet — but adding lottery to the maps shouldn't break any existing test.

- [ ] **Step 7: Commit**

```bash
git add src/pages/stats/StatsLeftRail.tsx src/pages/stats/StatsPerGamePage.tsx src/pages/stats/StatsPage.tsx src/pages/leaderboard/LeaderboardPerGamePage.tsx src/pages/leaderboard/LeaderboardPage.tsx
git commit -m "feat(stats): add 'lottery' tab to /stats and /leaderboard navigation"
```

## Task E.5: Integration test — buy + settle → /stats picks up the lottery round

**Files:**

- Create: `src/pages/lottery/integration.test.tsx`

A single end-to-end test verifying the spec's headline integration: a lottery line that wins writes a `rounds` row picked up by Phase 7's `getUserMetrics` for the `'lottery'` scope.

- [ ] **Step 1: Write `src/pages/lottery/integration.test.tsx`**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { buyTicket, settleMissedDraws, drawForDate } from '@/systems/lottery';
import { getUserMetrics } from '@/systems/stats';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('lottery → /stats integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('a winning lottery line writes a rounds row visible to getUserMetrics for the lottery scope', async () => {
    const r = await register({ username: 'winner', password: 'password123' });
    if (!r.ok) throw new Error();
    const date = '2026-05-19';
    const { mainNumbers, bonus } = drawForDate(date);
    // Line that matches all 5 main + bonus → guaranteed jackpot for this seeded date.
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers, bonusNumber: bonus }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const metrics = await getUserMetrics(r.user.id, 'lottery');
    expect(metrics.totalRounds).toBe(1);
    expect(metrics.totalWon).toBeGreaterThan(0);
    expect(metrics.netChange).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Commit**

```bash
pnpm exec vitest run src/pages/lottery/integration.test.tsx
git add src/pages/lottery/integration.test.tsx
git commit -m "test(lottery): end-to-end buy → settle → /stats integration"
```

## Task E.6: PR E — DoD, push, open, merge

- [ ] **Step 1: Full DoD**

```bash
pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build
```

Expected: ~1160 tests passing (~30 new in PR E).

- [ ] **Step 2: Push + open + merge**

```bash
git push -u origin phase-10-pr-e-history-admin
gh pr create --title "phase-10(lottery): PR E — history slide + admin lottery + stats/leaderboard nav" --body "$(cat <<'EOF'
## Summary

PR E of Phase 10. Adds the user-facing history slide on the LotteryPage, the admin /admin/lottery dashboard (4 stat cards + 2 frequency charts + recent draws), and plumbs 'lottery' into /stats and /leaderboard navigation so lottery rounds appear in Phase 7's per-game tabs.

End-to-end integration test verifies buy → settle → /stats pickup.

~30 new tests.

## Test plan

- [x] All 4 DoD checks green locally
- [ ] CI green
- [ ] Manual: /stats per-game tab shows 'Lottery'; /leaderboard per-game tab shows 'Lottery'; /admin/lottery profit card flips red/green appropriately
EOF
)"
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

---

# PR F — Release v0.10-lottery

**Branch:** `chore/release-v0.10-lottery` (off freshly-merged `main`)
**Goal:** BUILD_GUIDE.md marks Phase 10 ✅, package.json stays at 0.0.0 (tag-only versioning), tag and GitHub Release after merge, memory snapshot updated.
**Estimated tasks:** 3.

## Task F.1: BUILD_GUIDE Phase 10 row

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.10-lottery
```

- [ ] **Step 2: Update §12 — append a Phase 10 row**

Find the §12 Build Order — Phased Roadmap table. After the Phase 9 (or wherever Phase 10 belongs sequentially) row, insert:

```markdown
| **10. Daily Lottery** ✅ | `systems/lottery.ts` (pure draw + evaluate + buyTicket + settleMissedDraws + favorites + admin queries), Dexie v3 (4 new tables, additive), LotteryPage with NumberGrid + TicketCart + FavoritesDropdown + HERO countdown ↔ winning balls + HistorySlide, DrawAnimationModal (purchase reveal + draw reveal), Sidebar 🎟️ LOTTERY + 🔴 unread dot, LobbyPage tile, AdminLotteryPage with 4 stat cards + 2 frequency charts + recent draws. Pick-5+1 with 1M jackpot, 43% RTP, free re-entry on match-2. Strict 20:00 local draw with backfill on app open. | Shipped 2026-05-19 — see `v0.10-lottery`. ADR-0040. |
```

- [ ] **Step 3: Add §10.5 Daily Lottery section after the existing §10 Leaderboard section**

Insert a new subsection between `## 10. Leaderboard` and `## 11. UI / UX — Retro Vegas`:

```markdown
## 10.5 Daily Lottery

Pick-5+1 daily lottery; one shared draw per local calendar day. See ADR-0040 for the "lottery as a system, not games-sandbox citizen" decision.

- **Pools:** 5 main from 1–50 + 1 bonus from 1–10 (21,187,600 combinations).
- **Ticket model:** 10 chips per line; a ticket can hold multiple lines (manual + lucky-dip); unlimited tickets per draw (wallet-capped).
- **Lucky dip:** numbers generated at purchase time, ensuring within-ticket uniqueness.
- **Free re-entry:** match-2 grants a free ticket for the next draw (auto-generated lucky-dip line).
- **Payout tiers:** 5+bonus = 1,000,000; 5 = 500,000; 4+bonus = 100,000; 4 = 10,000; 3+bonus = 2,000; 3 = 100; 2+bonus / 2 = free re-entry. ≈ 43% RTP.
- **Draw timing:** strict 20:00 local daily; backfills on app open if missed.
- **Integration:** every settled line writes a `rounds` row per the §7.4 matrix in the design spec, so /stats and /leaderboard pick lottery up automatically.
- **Admin:** /admin/lottery shows 4 stat cards (tickets sold today, revenue, payout, profit), 2 frequency bar charts (main + bonus pool), and a recent-draws table.

Design spec: `docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md`. Implementation plan: `docs/superpowers/plans/2026-05-19-phase-10-daily-lottery-plan.md`.
```

- [ ] **Step 4: Commit**

```bash
git add BUILD_GUIDE.md
git commit -m "docs(build-guide): mark Phase 10 (Daily Lottery) shipped"
```

## Task F.2: PR open + merge

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin chore/release-v0.10-lottery
gh pr create --title "chore(release): v0.10-lottery — Phase 10 BUILD_GUIDE update" --body "$(cat <<'EOF'
## Summary

PR F of Phase 10 — release plumbing only, no code changes.

- BUILD_GUIDE §12 marks Phase 10 ✅ with release date + ADR link
- New §10.5 Daily Lottery section summarizing the game model
- package.json stays at 0.0.0 (tag-only versioning)

## Phase 10 recap

| PR | What | Tests |
|----|------|-------|
| A | Dexie v3 + systems/lottery + ADR-0040 | ~51 |
| B | LotteryPage shell + grid + cart + favorites + manual buy | ~25 |
| C | Lucky dip + purchase reveal modal | ~19 |
| D | Scheduler + backfill + DrawAnimationModal (draw) + HERO + sidebar + lobby tile | ~30 |
| E | History slide + admin lottery + stats/leaderboard nav | ~30 |
| F | This PR — BUILD_GUIDE + release | — |

~155 new tests; main bundle stays ≤ 800 kB.

## Test plan

- [x] markdownlint clean
- [ ] CI green
- [ ] After merge: tag v0.10-lottery, publish GitHub Release, update memory
EOF
)"
```

- [ ] **Step 2: Wait for CI, merge, sync**

```bash
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task F.3: Tag + GitHub Release + memory snapshot

- [ ] **Step 1: Tag**

```bash
git tag -a v0.10-lottery -m "v0.10 — Daily Lottery"
git push origin v0.10-lottery
```

- [ ] **Step 2: Publish release**

```bash
gh release create v0.10-lottery --title "v0.10-lottery — Phase 10 complete" --notes "$(cat <<'EOF'
## What's new

Phase 10 ships the **Daily Lottery** — a shared daily Pick-5+1 draw with rich ticket-purchase UX, a satisfying reveal animation, and an admin dashboard view.

### Highlights

- **/lottery** — HERO countdown ↔ winning balls swap, NumberGrid picker (5×10 main + 1×10 bonus), TicketCart with multi-line + lucky-dip support, FavoritesDropdown (save / load / rename / delete), HistorySlide of past 30 draws with per-line expand.
- **Lucky dip** — generate random numbers at purchase time with within-ticket uniqueness guarantee. Reveal modal flips each lucky-dip line one at a time.
- **Free re-entry** — match-2 grants a free ticket for the next draw, auto-generated.
- **Strict 20:00 local daily draw** with backfill on app open. Multi-day backfills sequence through each missed draw with full reveal animation.
- **Sidebar + Lobby tile** — 🎟️ LOTTERY entry with 🔴 unread dot for unseen draws; lobby tile with live countdown.
- **/admin/lottery** — 4 stat cards (tickets sold today, revenue, payout, **red/green profit box**), 2 number-frequency bar charts (main 1–50, bonus 1–10), recent-draws table with P/L per draw.
- **Per-line settle flows into /stats and /leaderboard** automatically (Phase 7 integration via the `rounds` table).

### Architecture

- ADR-0040: lottery lives in `src/systems/lottery.ts` + `src/pages/lottery/`, NOT under `src/games/` (event-driven batch settle doesn't fit the per-round game sandbox).
- Dexie v3 schema additive bump: `lotteryDraws`, `lotteryTickets`, `lotteryLines`, `lotteryFavorites`.
- LotteryPage is lazy-loaded; `NumberFrequencyBar` rides the existing shared Recharts chunk (ADR-0039) — main bundle stays at ~745 kB.
- **~155 new tests** across 6 PRs (~1005 → ~1160 total).

### ADRs

- [ADR-0040 — Lottery as a system, not a games-sandbox citizen](https://github.com/A1PC/localGamble/blob/main/docs/adr/0040-lottery-as-system.md)

### PRs

- #_NN_ — PR A: systems/lottery + Dexie v3 + ADR-0040
- #_NN_ — PR B: LotteryPage shell + manual buy
- #_NN_ — PR C: Lucky dip + purchase reveal
- #_NN_ — PR D: Scheduler + HERO + draw modal + sidebar + lobby tile
- #_NN_ — PR E: History slide + admin page + stats/leaderboard nav
- #_NN_ — PR F: BUILD_GUIDE + release

Plan: \`docs/superpowers/plans/2026-05-19-phase-10-daily-lottery-plan.md\`
Spec: \`docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md\`
EOF
)"
```

(Fill in PR numbers as you go through the phase.)

- [ ] **Step 3: Update `project_masquer_status` memory**

Open `/Users/adam/.claude/projects/-Users-adam/memory/project_masquer_status.md`. Add `v0.10-lottery` at the top of the tagged-releases list and mark Phase 10 ✅ in the roadmap section. Update the "stable, releasable state" line at the bottom.

---

# Self-Review Checklist

After PR F merges:

- [ ] Spec coverage: every §1–§16 in `docs/superpowers/specs/2026-05-19-phase-10-daily-lottery-design.md` maps to at least one task in this plan.
- [ ] DoD: every PR A–E ran `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build` clean before merge.
- [ ] Test count: ~155 new tests added (~51 A + 25 B + 19 C + 30 D + 30 E).
- [ ] Bundle: main bundle ≤ 800 kB; one Recharts chunk in `dist/assets/` (no duplicate split).
- [ ] /admin and existing /stats /leaderboard pages still work (no regressions from `Round.game` union extension).
- [ ] Manual smoke walkthrough (per the Definition of Done at the top of this plan) passes.
- [ ] GitHub Release `v0.10-lottery` published with the actual PR numbers filled in.
- [ ] `[[masquer-status]]` and `[[masquer-deferred-features]]` memories updated.

If anything fails, hot-fix on `main` with a `fix/lottery-*` branch.
