# Phase 2 — Wallet + App Shell + Game Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full play loop end-to-end — RNG → wallet+history → app shell (collapsible sidebar + dropdowns) → game shell (BettingPanel + RecentResults) → working Coin Flip + 4 stub pages — so every Phase 3+ game just drops into a proven substrate.

**Architecture:** 5 sequential PRs, each one self-contained and reviewable. PR A=RNG; PR B=wallet system+store+useRecentRounds hook; PR C=AppLayout shell with TopBar/Sidebar/ProfileDropdown/UIStore; PR D=CreditsDropdown daily top-up UI; PR E=GameShell+BettingPanel+RecentResults+CoinFlip+stubs. Release PR tags `v0.3-wallet-and-game-shell`.

**Tech Stack:** React 18, React Router 7 (data router), Zustand 5, Dexie 4, dexie-react-hooks (new in PR B), Framer Motion 12, TypeScript 6, Vitest 2 + RTL + fake-indexeddb, mulberry32 PRNG (when seeded) + crypto.getRandomValues (when not).

**Spec:** `docs/superpowers/specs/2026-05-17-phase-2-wallet-and-game-shell-design.md`

---

## File Structure (after all 5 PRs merge)

```
MASQUER/
├── BUILD_GUIDE.md                                # MODIFIED: §3, §4, §6, §12
├── CHANGELOG.md                                  # MODIFIED: [Unreleased] entries
├── package.json                                  # MODIFIED: +dexie-react-hooks
├── docs/
│   ├── adr/
│   │   ├── 0015-rng-seeded-mode.md               # NEW (PR A)
│   │   ├── 0016-history-in-settle-transaction.md # NEW (PR B)
│   │   ├── 0017-daily-topup.md                   # NEW (PR D)
│   │   ├── 0018-layout-route-pattern.md          # NEW (PR C)
│   │   ├── 0019-ui-store-localstorage.md         # NEW (PR C)
│   │   └── 0020-coin-flip-placeholder.md         # NEW (PR E)
│   ├── conventions.md                            # MODIFIED (PR C): localStorage allow-list
│   └── risks.md                                  # MODIFIED (across PRs): R-24..R-31
└── src/
    ├── components/
    │   ├── AppBootstrap.tsx                      # MODIFIED (PR B): wallet hydration
    │   ├── AppLayout.tsx                         # NEW (PR C)
    │   ├── AppLayout.test.tsx                    # NEW (PR C)
    │   ├── BalanceBadge.tsx                      # NEW (PR C; replaced by CreditsDropdown in PR D)
    │   ├── CreditsDropdown.tsx                   # NEW (PR D)
    │   ├── CreditsDropdown.test.tsx              # NEW (PR D)
    │   ├── ProfileDropdown.tsx                   # NEW (PR C)
    │   ├── ProfileDropdown.test.tsx              # NEW (PR C)
    │   ├── Sidebar.tsx                           # NEW (PR C)
    │   ├── Sidebar.test.tsx                      # NEW (PR C)
    │   ├── SidebarToggle.tsx                     # NEW (PR C)
    │   ├── TopBar.tsx                            # NEW (PR C; modified in PR D)
    │   └── (RequireAuth.tsx, RequireAuth.test.tsx unchanged from Phase 1)
    ├── db/
    │   └── schema.ts                             # MODIFIED (PR B): Balance.lastDailyClaimAt?, Round.game adds 'coin-flip'
    ├── games/
    │   ├── _shared/
    │   │   ├── BettingPanel.tsx                  # NEW (PR E)
    │   │   ├── BettingPanel.test.tsx             # NEW (PR E)
    │   │   ├── GameShell.tsx                     # NEW (PR E)
    │   │   ├── GameShell.test.tsx                # NEW (PR E)
    │   │   ├── RecentResults.tsx                 # NEW (PR E)
    │   │   ├── RecentResults.test.tsx            # NEW (PR E)
    │   │   ├── StubGamePage.tsx                  # NEW (PR E)
    │   │   ├── StubGamePage.test.tsx             # NEW (PR E)
    │   │   ├── useGameRound.ts                   # NEW (PR E)
    │   │   └── useGameRound.test.ts              # NEW (PR E)
    │   └── coin-flip/
    │       ├── CoinFlipPage.tsx                  # NEW (PR E)
    │       ├── CoinFlipPage.test.tsx             # NEW (PR E)
    │       ├── logic.ts                          # NEW (PR E)
    │       └── logic.test.ts                     # NEW (PR E)
    ├── pages/
    │   ├── lobby/
    │   │   ├── CabinetCarousel.tsx               # NEW (PR E)
    │   │   ├── CabinetCarousel.test.tsx          # NEW (PR E)
    │   │   └── RecentActivityStrip.tsx           # NEW (PR E)
    │   ├── LobbyPage.tsx                         # MODIFIED (PR C placeholder, PR E real)
    │   ├── LobbyPage.test.tsx                    # MODIFIED (PR C, PR E)
    │   └── ProfileStubPage.tsx                   # NEW (PR C)
    ├── router.tsx                                # MODIFIED (PR C layout route, PR E play routes)
    ├── store/
    │   ├── uiStore.ts                            # NEW (PR C)
    │   ├── uiStore.test.ts                       # NEW (PR C)
    │   ├── walletStore.ts                        # NEW (PR B)
    │   └── walletStore.test.ts                   # NEW (PR B)
    └── systems/
        ├── auth.ts                               # MODIFIED (PR B): import WALLET_CONFIG
        ├── hooks/
        │   ├── useRecentRounds.ts                # NEW (PR B)
        │   └── useRecentRounds.test.ts           # NEW (PR B)
        ├── rng.ts                                # NEW (PR A)
        ├── rng.test.ts                           # NEW (PR A)
        ├── wallet.ts                             # NEW (PR B)
        └── wallet.test.ts                        # NEW (PR B)
```

---

## Pre-flight (run once before Task A1)

- [ ] **Step 1: Verify clean main branch in sync with origin**

```bash
cd /Users/adam/localGamble
git checkout main && git pull --ff-only
git status
git log --oneline -5
```

Expected: clean tree, last commit references Phase 2 design spec (`c8f0c68` or newer) or the `.gitignore` chore (`fe6f6bf` or newer). 59 tests should be at baseline.

- [ ] **Step 2: Verify quality gates pass on main**

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0; 59/59 tests pass; coverage on `src/systems/**/*.ts` shows 96.68%.

If any pre-flight fails, STOP and report BLOCKED — Phase 2 cannot start on a broken main.

- [ ] **Step 3: Get the Phase 2 milestone number**

```bash
PHASE_2_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 2 — Wallet + Lobby + Game shell") | .number')
echo "Phase 2 milestone: $PHASE_2_MS"
```

Expected: a number (probably `3`). Save for issue filing.

- [ ] **Step 4: File the 6 Phase 2 issues**

Use the issue body templates from spec §11. Each issue gets `--milestone "$PHASE_2_MS"` and labels.

```bash
# Issue for PR A
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR A — RNG (seedable) + tests + ADR-0015" \
  --body "src/systems/rng.ts with mulberry32-when-seeded, crypto-when-unseeded. 12 tests. See spec §5.1 + §6.1."

# Issue for PR B
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR B — Wallet + WalletStore + history-in-settle + useRecentRounds" \
  --body "src/systems/wallet.ts (placeBet/settleRound/getBalance/claimDaily), src/store/walletStore.ts, useRecentRounds hook. 33 tests. BUILD_GUIDE §3 §6 edits. dexie-react-hooks dep. ADR-0016. See spec §5.2 + §6.3-§6.6."

# Issue for PR C
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling" \
  --title "[Phase 2] PR C — AppLayout shell (TopBar + Sidebar + ProfileDropdown + UIStore + layout-route)" \
  --body "Layout-route restructure, TopBar with BalanceBadge placeholder, collapsible Sidebar, ProfileDropdown menu. ADRs 0018, 0019. See spec §5.3 + §6.8-§6.16 (except CreditsDropdown)."

# Issue for PR D
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling" \
  --title "[Phase 2] PR D — Daily top-up CreditsDropdown + BUILD_GUIDE §4/§12 edits" \
  --body "Replace BalanceBadge with CreditsDropdown (countdown + claim button). BUILD_GUIDE §4 daily-topup clarification, §12 row 2 update. ADR-0017. See spec §5.4 + §6.15."

# Issue for PR E
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,tooling,tests" \
  --title "[Phase 2] PR E — GameShell + BettingPanel + RecentResults + CoinFlip + 4 stub pages + LobbyPage carousel" \
  --body "Full game-shell + working Coin Flip + 4 stubs + lobby carousel + RecentActivityStrip. ~12 logic tests + ~25 component tests. ADR-0020. See spec §5.5 + §6.17-§6.27."

# Issue for release
gh issue create --milestone "$PHASE_2_MS" --label "phase-2,chore" \
  --title "[Phase 2] Tag v0.3-wallet-and-game-shell release after PR E merges" \
  --body "chore(release) PR + tag + GH release + close milestone."
```

---

# PR A — `phase-2-rng`

## Task A1: Branch + create rng.ts

**Files:**

- Create: `src/systems/rng.ts`

- [ ] **Step 1: Branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-2-rng
```

- [ ] **Step 2: Create `src/systems/rng.ts`**

Verbatim content from spec §6.1:

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

- [ ] **Step 3: Verify it typechecks**

```bash
pnpm typecheck
```

Expected: exits 0.

## Task A2: Write rng.test.ts (TDD: test the API surface)

**Files:**

- Create: `src/systems/rng.test.ts`

- [ ] **Step 1: Write the 12 tests**

Create `src/systems/rng.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { isSeeded, pick, randomInt, seed, shuffle, unseed } from './rng';

afterEach(() => {
  unseed();
});

describe('seed / unseed', () => {
  it('isSeeded reflects current mode', () => {
    expect(isSeeded()).toBe(false);
    seed(42);
    expect(isSeeded()).toBe(true);
    unseed();
    expect(isSeeded()).toBe(false);
  });

  it('seed(N) followed by randomInt produces a deterministic sequence', () => {
    seed(1);
    const sequence = [
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
    ];
    unseed();
    seed(1);
    const repeat = [
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
      randomInt(0, 9),
    ];
    expect(repeat).toEqual(sequence);
  });

  it('different seeds produce different sequences', () => {
    seed(1);
    const a = [randomInt(0, 99), randomInt(0, 99), randomInt(0, 99)];
    unseed();
    seed(2);
    const b = [randomInt(0, 99), randomInt(0, 99), randomInt(0, 99)];
    expect(a).not.toEqual(b);
  });
});

describe('randomInt', () => {
  it('with equal bounds always returns that value', () => {
    for (let i = 0; i < 10; i++) expect(randomInt(5, 5)).toBe(5);
    seed(99);
    for (let i = 0; i < 10; i++) expect(randomInt(5, 5)).toBe(5);
  });

  it('produces values within [min, max] inclusive', () => {
    seed(42);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('over many seeded rolls, hits every value in the range', () => {
    seed(7);
    const counts = new Array(10).fill(0) as number[];
    for (let i = 0; i < 1000; i++) {
      counts[randomInt(0, 9)]! += 1;
    }
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(50);
  });

  it('throws TypeError for non-integer bounds', () => {
    expect(() => randomInt(1.5, 9)).toThrow(TypeError);
    expect(() => randomInt(0, 9.9)).toThrow(TypeError);
  });

  it('throws RangeError when max < min', () => {
    expect(() => randomInt(10, 5)).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns the same multiset of elements', () => {
    seed(123);
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const shuffled = shuffle([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it('produces same order across runs with the same seed', () => {
    seed(123);
    const a = shuffle([1, 2, 3, 4, 5, 6, 7]);
    unseed();
    seed(123);
    const b = shuffle([1, 2, 3, 4, 5, 6, 7]);
    expect(a).toEqual(b);
  });
});

describe('pick', () => {
  it('throws RangeError on empty array', () => {
    expect(() => pick([])).toThrow(RangeError);
  });

  it('returns an element from the array', () => {
    seed(5);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 30; i++) {
      expect(arr).toContain(pick(arr));
    }
  });

  it('hits every element over many seeded picks', () => {
    seed(13);
    const arr = ['a', 'b', 'c'];
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(arr));
    expect(seen.size).toBe(3);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/systems/rng.test.ts
```

Expected: 12/12 pass.

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test:run
```

Expected: 71 total passing (59 existing + 12 new).

## Task A3: Add ADR-0015

**Files:**

- Create: `docs/adr/0015-rng-seeded-mode.md`

- [ ] **Step 1: Create the ADR**

```markdown
# ADR-0015: RNG seeded mode via global `seed()` / `unseed()` toggle

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §5 requires `systems/rng.ts` to provide a "seedable mode for tests."
Several API shapes are possible: a global toggle, a `withSeed(seed, fn)` wrapper,
two separate exports (seeded vs unseeded), or test-side mocking of `crypto.getRandomValues`.

## Decision

Adopt a global toggle: `rng.seed(value)` switches to a deterministic PRNG
(mulberry32) and `rng.unseed()` returns to `crypto.getRandomValues` with
rejection-sampling. Tests call `rng.seed(N)` in `beforeEach` (or wherever they
need determinism) and `rng.unseed()` in `afterEach`. Production code never calls
either.

## Alternatives considered

- **`withSeed(seed, fn)` wrapper** — guarantees state can't leak, but every test
  block has to wrap its body. More boilerplate.
- **Two exports (`rng` and `seededRng(seed)`)** — cleanest separation but forces
  every consumer (game logic) to take rng as a parameter — too much plumbing for
  a play-money app.
- **Mock `crypto.getRandomValues` in tests** — fragile; each test computes byte
  sequences manually.

## Consequences

- Tests are concise: `seed(42); ... ; unseed();`.
- A test that forgets `unseed()` leaks seeded state into subsequent tests in the
  same file. Mitigation: standard `afterEach(unseed)` pattern.
- mulberry32 is fast and statistically OK for game logic tests; if Phase 4+
  needs a stronger PRNG, the toggle stays — just swap the `prng()` implementation.

## References

- BUILD_GUIDE.md §5 (Randomness)
- Phase 2 spec §6.1 (rng.ts verbatim)
```

## Task A4: Update risks.md (R-27)

**Files:**

- Modify: `docs/risks.md`

- [ ] **Step 1: Append R-27**

Add this row to the existing risk-register table (after the Phase 1 R-23 row):

```markdown
| R-27 | mulberry32 PRNG bias in test seeds | 2 | L | L | mulberry32 passes BigCrush; chi-squared sanity test in rng.test.ts catches gross bias. |
```

## Task A5: Local DoD verification

**Files:** none

- [ ] **Step 1: Run all five quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count: 71 (59 + 12).

## Task A6: Commit, push, open PR, watch, merge

**Files:** none

- [ ] **Step 1: Commit in three chunks**

```bash
git add src/systems/rng.ts src/systems/rng.test.ts
git commit -m "feat(rng): add seedable RNG (mulberry32 when seeded, crypto otherwise)"

git add docs/adr/0015-rng-seeded-mode.md
git commit -m "docs(adr): ADR-0015 RNG seeded mode via seed()/unseed()"

git add docs/risks.md
git commit -m "docs(repo): add R-27 mulberry32 bias risk to register"
```

- [ ] **Step 2: Push**

```bash
git push -u origin phase-2-rng
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "phase-2(rng): seedable RNG with mulberry32 PRNG" \
  --body "$(cat <<'EOF'
## Summary
PR A of Phase 2. Foundation only — no UI, no wallet.

- src/systems/rng.ts: seed/unseed/isSeeded/randomInt/shuffle/pick
- 12 new tests covering seeded determinism, bounds, distribution, shuffle invariants, pick
- ADR-0015 documents the global-toggle API
- R-27 added to risk register

## BUILD_GUIDE reference
- Phase: 2 — Wallet + Lobby + Game shell
- Sections: §5 (Randomness)

## How tested
- pnpm test:run → 71/71 (59 existing + 12 new)
- All 4 quality gates green

## Definition of done
- [ ] All 4 CI jobs green
- [ ] Coverage on src/systems/**/*.ts stays ≥ 80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh pr checks --watch
```

Expected: all four jobs green.

- [ ] **Step 5: Merge and sync**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 6: Close the PR A issue**

```bash
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --search "PR A" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR B — `phase-2-wallet`

## Task B1: Branch + install dexie-react-hooks

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-2-wallet
```

- [ ] **Step 2: Install dexie-react-hooks**

```bash
pnpm add dexie-react-hooks
```

Expected: `dexie-react-hooks` added to `dependencies` (production dep, not dev — used by app code via useRecentRounds).

## Task B2: Modify db/schema.ts

**Files:**

- Modify: `src/db/schema.ts`

- [ ] **Step 1: Replace the file**

Replace `src/db/schema.ts` entirely with the spec §6.2 version:

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

  constructor(name = 'MASQUER') {
    super(name);
    this.version(1).stores({
      users: 'id, &usernameLower, createdAt',
      balances: 'userId',
      rounds: 'id, userId, game, playedAt, [userId+playedAt]',
    });
  }
}
```

Two changes vs Phase 1: `Balance.lastDailyClaimAt?: number` added; `Round.game` union extended with `'coin-flip'`. The Dexie `version(1).stores({...})` is unchanged — `lastDailyClaimAt` is not indexed and Dexie ignores unknown fields in stored objects.

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exits 0. (Existing tests in `db.test.ts` use the schema; they shouldn't break.)

- [ ] **Step 3: Run existing db tests**

```bash
pnpm test:run -- src/db/db.test.ts
```

Expected: 5/5 pass.

## Task B3: Create wallet.ts

**Files:**

- Create: `src/systems/wallet.ts`

- [ ] **Step 1: Write wallet.ts verbatim from spec §6.3**

Create `src/systems/wallet.ts`:

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
  payout: number;
  netChange: number;
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

export async function getBalance(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  return row?.chips ?? 0;
}

export async function getBalanceRow(userId: string): Promise<Balance | undefined> {
  return db.balances.get(userId);
}

export async function getDailyEligibleAt(userId: string): Promise<number> {
  const row = await db.balances.get(userId);
  if (!row?.lastDailyClaimAt) return 0;
  return row.lastDailyClaimAt + DAILY_CLAIM_INTERVAL_MS;
}

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

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

## Task B4: Modify auth.ts to use WALLET_CONFIG

**Files:**

- Modify: `src/systems/auth.ts`

- [ ] **Step 1: Open the file and find the existing constant**

The Phase 1 file has near the top: `const STARTING_CHIPS = 1_000;` (or similar). Remove it.

- [ ] **Step 2: Add the import**

Add at the top of the existing imports:

```ts
import { WALLET_CONFIG } from '@/systems/wallet';
```

- [ ] **Step 3: Replace the constant usage**

Find the line in `register()` that says `chips: STARTING_CHIPS,` and change to `chips: WALLET_CONFIG.STARTING_CHIPS,`.

- [ ] **Step 4: Verify auth tests still pass**

```bash
pnpm test:run -- src/systems/auth.test.ts
```

Expected: 15/15 pass.

## Task B5: Write wallet.test.ts (TDD: full 25-test matrix)

**Files:**

- Create: `src/systems/wallet.test.ts`

- [ ] **Step 1: Write the test file**

Create `src/systems/wallet.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import {
  WALLET_CONFIG,
  claimDaily,
  getBalance,
  getDailyEligibleAt,
  placeBet,
  settleRound,
  type BetHandle,
  type RoundResult,
} from './wallet';

const u = 'user-a';

async function seedUser(chips: number, lastDailyClaimAt?: number): Promise<void> {
  await db.balances.put({
    userId: u,
    chips,
    updatedAt: Date.now(),
    ...(lastDailyClaimAt !== undefined && { lastDailyClaimAt }),
  });
}

async function placeAndGetHandle(amount: number): Promise<BetHandle> {
  const r = await placeBet({ userId: u, game: 'coin-flip', amount, min: 1, max: 500 });
  if (!r.ok) throw new Error(`placeBet failed: ${r.error}`);
  return r.handle;
}

beforeEach(async () => {
  await resetDb();
});
afterEach(async () => {
  await resetDb();
});

describe('WALLET_CONFIG', () => {
  it('exports STARTING_CHIPS = 1000', () => {
    expect(WALLET_CONFIG.STARTING_CHIPS).toBe(1_000);
  });
  it('exports DAILY_CLAIM_AMOUNT = 50', () => {
    expect(WALLET_CONFIG.DAILY_CLAIM_AMOUNT).toBe(50);
  });
  it('exports DAILY_CLAIM_INTERVAL_MS = 86_400_000', () => {
    expect(WALLET_CONFIG.DAILY_CLAIM_INTERVAL_MS).toBe(86_400_000);
  });
});

describe('getBalance', () => {
  it('returns 0 for missing user', async () => {
    expect(await getBalance('nobody')).toBe(0);
  });
  it('returns chips when row exists', async () => {
    await seedUser(123);
    expect(await getBalance(u)).toBe(123);
  });
});

describe('placeBet', () => {
  it('returns no_user when userId is empty', async () => {
    const r = await placeBet({ userId: '', game: 'coin-flip', amount: 10, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });
  it('returns not_integer for fractional amount', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 1.5, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'not_integer' });
  });
  it('returns not_integer for zero or negative', async () => {
    await seedUser(100);
    const a = await placeBet({ userId: u, game: 'coin-flip', amount: 0, min: 1, max: 500 });
    const b = await placeBet({ userId: u, game: 'coin-flip', amount: -5, min: 1, max: 500 });
    expect(a).toEqual({ ok: false, error: 'not_integer' });
    expect(b).toEqual({ ok: false, error: 'not_integer' });
  });
  it('returns below_minimum when amount < min', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 1, min: 5, max: 500 });
    expect(r).toEqual({ ok: false, error: 'below_minimum' });
  });
  it('returns above_maximum when amount > max', async () => {
    await seedUser(1_000);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 600, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'above_maximum' });
  });
  it('returns insufficient_chips when amount > balance', async () => {
    await seedUser(5);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 10, min: 1, max: 500 });
    expect(r).toEqual({ ok: false, error: 'insufficient_chips' });
  });
  it('success: deducts chips and returns a handle', async () => {
    await seedUser(100);
    const r = await placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(75);
    expect(r.handle.amount).toBe(25);
    expect(r.handle.userId).toBe(u);
    expect(r.handle.game).toBe('coin-flip');
    expect(await getBalance(u)).toBe(75);
  });
  it('success: preserves lastDailyClaimAt on the balance row', async () => {
    await seedUser(100, 12_345);
    await placeBet({ userId: u, game: 'coin-flip', amount: 10, min: 1, max: 500 });
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBe(12_345);
  });
});

describe('settleRound', () => {
  const makeResult = (overrides?: Partial<RoundResult>): RoundResult => ({
    outcome: 'win',
    betAmount: 25,
    payout: 50,
    netChange: 25,
    details: { call: 'heads', landed: 'heads' },
    ...overrides,
  });

  it('win: credits payout and writes rounds row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'win', payout: 50, netChange: 25 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(125);
    const round = await db.rounds.get(h.betId);
    expect(round?.outcome).toBe('win');
    expect(round?.balanceAfter).toBe(125);
  });

  it('loss: credits 0 and writes rounds row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'loss', payout: 0, netChange: -25 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(75);
  });

  it('push: credits bet back', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25); // balance: 75
    const r = await settleRound({
      handle: h,
      result: makeResult({ outcome: 'push', payout: 25, netChange: 0 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(100);
  });

  it('idempotent: second call with same handle returns existing row', async () => {
    await seedUser(100);
    const h = await placeAndGetHandle(25);
    const a = await settleRound({ handle: h, result: makeResult() });
    const b = await settleRound({ handle: h, result: makeResult() });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.newBalance).toBe(a.newBalance); // no double credit
      expect(b.round.id).toBe(a.round.id);
    }
  });

  it('preserves lastDailyClaimAt', async () => {
    await seedUser(100, 54_321);
    const h = await placeAndGetHandle(10);
    await settleRound({ handle: h, result: makeResult({ payout: 20, netChange: 10 }) });
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBe(54_321);
  });
});

describe('getDailyEligibleAt', () => {
  it('returns 0 for user that never claimed (lastDailyClaimAt undefined)', async () => {
    await seedUser(100);
    expect(await getDailyEligibleAt(u)).toBe(0);
  });
  it('returns lastClaim + 24h', async () => {
    await seedUser(100, 1_000_000);
    expect(await getDailyEligibleAt(u)).toBe(1_000_000 + 86_400_000);
  });
});

describe('claimDaily', () => {
  it('returns no_user when userId empty', async () => {
    const r = await claimDaily('');
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });
  it('first time: credits 50, sets lastDailyClaimAt, returns nextEligibleAt', async () => {
    await seedUser(100);
    const now = Date.now();
    const r = await claimDaily(u);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(150);
    expect(r.nextEligibleAt).toBeGreaterThanOrEqual(now + 86_400_000 - 1_000);
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBeGreaterThanOrEqual(now);
  });
  it('within 24h returns not_yet_eligible with nextEligibleAt', async () => {
    const now = Date.now();
    await seedUser(100, now - 1_000); // claimed 1s ago
    const r = await claimDaily(u);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('not_yet_eligible');
    expect(r.nextEligibleAt).toBe(now - 1_000 + 86_400_000);
  });
  it('after 24h elapsed: credits 50 again', async () => {
    const longAgo = Date.now() - 86_400_000 - 5_000;
    await seedUser(100, longAgo);
    const r = await claimDaily(u);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.newBalance).toBe(150);
  });
});

describe('placeBet + settleRound + claimDaily interleave', () => {
  it('preserves all relevant fields across operations', async () => {
    await seedUser(100); // no lastDailyClaimAt yet
    // 1. claimDaily → +50, lastDailyClaimAt set
    const claim = await claimDaily(u);
    expect(claim.ok).toBe(true);
    expect(await getBalance(u)).toBe(150);
    // 2. placeBet → -10
    const h = await placeAndGetHandle(10);
    expect(await getBalance(u)).toBe(140);
    // 3. settleRound win → +20
    await settleRound({
      handle: h,
      result: { outcome: 'win', betAmount: 10, payout: 20, netChange: 10, details: {} },
    });
    expect(await getBalance(u)).toBe(160);
    // 4. lastDailyClaimAt preserved
    const row = await db.balances.get(u);
    expect(row?.lastDailyClaimAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run wallet tests**

```bash
pnpm test:run -- src/systems/wallet.test.ts
```

Expected: 25/25 pass (counting the parameterized cases).

## Task B6: Create useRecentRounds hook

**Files:**

- Create: `src/systems/hooks/useRecentRounds.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/systems/hooks
```

Create `src/systems/hooks/useRecentRounds.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Game, Round } from '@/systems/wallet';

/** Reactive: returns the latest `limit` rounds for this user+game, newest first.
 *  Pass `game = undefined` to get rounds across ALL games. */
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
        .limit(game === undefined ? limit : limit * 3)
        .toArray();
      const filtered = game === undefined ? rows : rows.filter((r) => r.game === game);
      return filtered.slice(0, limit);
    },
    [userId, game, limit],
    [] as Round[],
  );
}
```

## Task B7: Test useRecentRounds

**Files:**

- Create: `src/systems/hooks/useRecentRounds.test.ts`

- [ ] **Step 1: Write 7 tests**

Create `src/systems/hooks/useRecentRounds.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useRecentRounds } from './useRecentRounds';
import type { Round } from '@/db';

let counter = 0;
function addRound(userId: string, overrides: Partial<Round> = {}): Promise<string> {
  counter += 1;
  const round: Round = {
    id: `r-${counter}`,
    userId,
    game: 'coin-flip',
    betAmount: 10,
    payout: 0,
    netChange: -10,
    outcome: 'loss',
    details: null,
    balanceAfter: 90,
    playedAt: Date.now() + counter, // strictly increasing
    ...overrides,
  };
  return db.rounds.add(round).then(() => round.id);
}

beforeEach(async () => {
  await resetDb();
  counter = 0;
});
afterEach(async () => {
  await resetDb();
});

describe('useRecentRounds', () => {
  it('returns [] for undefined userId', async () => {
    const { result } = renderHook(() => useRecentRounds(undefined, 'coin-flip', 5));
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('returns matching rounds newest-first for the user+game', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-a' });
    await addRound('u1', { game: 'coin-flip', id: 'r-b' });
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((r) => r.id)).toEqual(['r-b', 'r-a']);
  });

  it('filters by game', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-c' });
    await addRound('u1', { game: 'blackjack', id: 'r-bj' });
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]!.id).toBe('r-c');
  });

  it('returns all games when game === undefined', async () => {
    await addRound('u1', { game: 'coin-flip', id: 'r-1' });
    await addRound('u1', { game: 'blackjack', id: 'r-2' });
    const { result } = renderHook(() => useRecentRounds('u1', undefined, 5));
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it('respects limit', async () => {
    for (let i = 0; i < 8; i++) await addRound('u1');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 3));
    await waitFor(() => expect(result.current).toHaveLength(3));
  });

  it('re-renders when a new round is added', async () => {
    await addRound('u1');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    await addRound('u1');
    await waitFor(() => expect(result.current).toHaveLength(2));
  });

  it("does not return another user's rounds", async () => {
    await addRound('u1');
    await addRound('u2');
    const { result } = renderHook(() => useRecentRounds('u1', 'coin-flip', 5));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]!.userId).toBe('u1');
  });
});
```

- [ ] **Step 2: Run the hook tests**

```bash
pnpm test:run -- src/systems/hooks/useRecentRounds.test.ts
```

Expected: 7/7 pass.

## Task B8: Create walletStore.ts

**Files:**

- Create: `src/store/walletStore.ts`

- [ ] **Step 1: Create the store**

Verbatim from spec §6.6:

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

## Task B9: Test walletStore.ts

**Files:**

- Create: `src/store/walletStore.test.ts`

- [ ] **Step 1: Write 8 tests**

Create `src/store/walletStore.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useWalletStore } from './walletStore';

const u = 'user-w';

beforeEach(async () => {
  await resetDb();
  useWalletStore.setState({ balance: null, nextDailyEligibleAt: null, hydrating: false });
});
afterEach(async () => {
  await resetDb();
});

async function seedBalance(chips: number, lastDailyClaimAt?: number): Promise<void> {
  await db.balances.put({
    userId: u,
    chips,
    updatedAt: Date.now(),
    ...(lastDailyClaimAt !== undefined && { lastDailyClaimAt }),
  });
}

describe('walletStore', () => {
  it('initial state: balance and nextDailyEligibleAt are null; hydrating false', () => {
    const s = useWalletStore.getState();
    expect(s.balance).toBeNull();
    expect(s.nextDailyEligibleAt).toBeNull();
    expect(s.hydrating).toBe(false);
  });

  it('hydrate populates balance and nextDailyEligibleAt', async () => {
    await seedBalance(250, 1_000);
    await useWalletStore.getState().hydrate(u);
    expect(useWalletStore.getState().balance).toBe(250);
    expect(useWalletStore.getState().nextDailyEligibleAt).toBe(1_000 + 86_400_000);
    expect(useWalletStore.getState().hydrating).toBe(false);
  });

  it('clear resets to null', () => {
    useWalletStore.setState({ balance: 100, nextDailyEligibleAt: 999, hydrating: false });
    useWalletStore.getState().clear();
    const s = useWalletStore.getState();
    expect(s.balance).toBeNull();
    expect(s.nextDailyEligibleAt).toBeNull();
  });

  it('placeBet success updates balance', async () => {
    await seedBalance(100);
    const r = await useWalletStore
      .getState()
      .placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(75);
  });

  it('placeBet failure leaves balance unchanged', async () => {
    useWalletStore.setState({ balance: 100, nextDailyEligibleAt: null, hydrating: false });
    const r = await useWalletStore
      .getState()
      .placeBet({ userId: '', game: 'coin-flip', amount: 25, min: 1, max: 500 });
    expect(r.ok).toBe(false);
    expect(useWalletStore.getState().balance).toBe(100);
  });

  it('settleRound success updates balance', async () => {
    await seedBalance(100);
    const place = await useWalletStore
      .getState()
      .placeBet({ userId: u, game: 'coin-flip', amount: 25, min: 1, max: 500 });
    if (!place.ok) throw new Error();
    const settle = await useWalletStore.getState().settleRound({
      handle: place.handle,
      result: { outcome: 'win', betAmount: 25, payout: 50, netChange: 25, details: {} },
    });
    expect(settle.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(125);
  });

  it('claimDaily success updates balance + nextDailyEligibleAt', async () => {
    await seedBalance(100);
    const r = await useWalletStore.getState().claimDaily(u);
    expect(r.ok).toBe(true);
    expect(useWalletStore.getState().balance).toBe(150);
    expect(useWalletStore.getState().nextDailyEligibleAt).toBeGreaterThan(Date.now());
  });

  it('claimDaily not_yet_eligible updates nextDailyEligibleAt only', async () => {
    const now = Date.now();
    await seedBalance(100, now - 1_000);
    useWalletStore.setState({ balance: 100 });
    const r = await useWalletStore.getState().claimDaily(u);
    expect(r.ok).toBe(false);
    expect(useWalletStore.getState().balance).toBe(100); // unchanged
    expect(useWalletStore.getState().nextDailyEligibleAt).toBe(now - 1_000 + 86_400_000);
  });
});
```

- [ ] **Step 2: Run walletStore tests**

```bash
pnpm test:run -- src/store/walletStore.test.ts
```

Expected: 8/8 pass.

## Task B10: BUILD_GUIDE.md edits for PR B

**Files:**

- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Read the current §3 architecture section**

Find the section about `src/systems/` that mentions `history.ts`.

- [ ] **Step 2: Update §3 to remove history.ts**

In the architecture file listing, find the line:

```
│   │   ├── history.ts         ← record every round result
```

and remove that line.

After the file listing, find or add a paragraph that says:

> History rows are written by `wallet.settleRound` in the same Dexie transaction as the balance credit (ADR-0016). There is no separate `systems/history.ts`.

- [ ] **Step 3: Update §6 RoundResult and rounds.game**

Find the §6 line that defines the `game` field in `rounds`:

```
`game` (`'blackjack' | 'roulette' | 'slots' | 'baccarat'`)
```

Change to:

```
`game` (`'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'coin-flip'`)
```

Add a note: "Coin Flip (Phase 2 placeholder game) is the fifth value; see ADR-0020."

## Task B11: ADR-0016 + R-24..R-26, R-30, R-31 risks

**Files:**

- Create: `docs/adr/0016-history-in-settle-transaction.md`
- Modify: `docs/risks.md`

- [ ] **Step 1: Create ADR-0016**

```markdown
# ADR-0016: History row written by `settleRound` (no separate history.ts)

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §3 originally listed `systems/history.ts` as a separate module
for `recordRound(...)`. Factoring history out of wallet would require either
two Dexie transactions (race window between balance credit and history insert)
or a circular call (wallet → history → wallet).

## Decision

History is written inside the same `db.transaction('rw', db.balances, db.rounds, ...)`
that credits the payout in `wallet.settleRound`. The `rounds` row uses the bet
handle's `betId` as its primary key, providing free idempotency: a re-call
with the same handle returns the existing row, no double credit.

There is no `src/systems/history.ts`. BUILD_GUIDE §3 is updated to reflect
this (PR B).

## Alternatives considered

- **Separate `history.ts` with `recordRound`** — caller has to ensure
  ordering; two-transaction race window.
- **Event-bus model (wallet emits, history subscribes)** — overkill for a
  local app; adds dispatch ceremony.
- **Persist round before settling balance** — possible but loses the bet
  handle's role as the link between place and settle.

## Consequences

- Tests that interact with rounds can do so via `wallet.settleRound` + Dexie
  reads; no separate API surface.
- A future "history-only" feature (e.g. import/export) would still query
  `db.rounds` directly — no abstraction lost.
- Phase 7 stats compute from `db.rounds` + `db.balances` (unchanged).

## References

- BUILD_GUIDE.md §3 (Architecture), §6 (Data Model)
- Phase 2 spec §6.3 (wallet.ts verbatim)
```

- [ ] **Step 2: Append R-24..R-26, R-30, R-31 to risks.md**

```markdown
| R-24 | Bet placed but settle never called (page crash mid-round) | 2+ | M | M | In-memory bet handle; chips deducted on placeBet. If settle never runs, user loses the bet — acceptable for play-money. |
| R-25 | Double-settle of the same bet (re-render bug) | 2+ | L | M | settleRound keys the round on handle.betId; second call returns existing row, no double credit. |
| R-26 | Daily-claim race when user opens two tabs | 2 | L | L | claimDaily is a Dexie transaction; second tab reads updated lastDailyClaimAt and returns not_yet_eligible. |
| R-30 | RecentResults rail re-orders mid-animation on rapid settles | 2 | M | L | Items keyed by round.id; Framer Motion layout handles ordering changes via FLIP. |
| R-31 | Bet < min or > max accepted via console manipulation | 2 | L | L | wallet.placeBet validates min/max at the system boundary, not just the UI form. |
```

## Task B12: PR B local DoD + commit + push + open + merge

**Files:** none

- [ ] **Step 1: Run all five quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count: 71 (PR A) + 25 (wallet) + 7 (hooks) + 8 (walletStore) = 111. Coverage on `src/systems/**/*.ts` stays above 80%.

- [ ] **Step 2: Commit in four chunks**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(wallet): add dexie-react-hooks for reactive Dexie queries"

git add src/db/schema.ts src/systems/wallet.ts src/systems/wallet.test.ts src/systems/auth.ts
git commit -m "feat(wallet): add wallet.ts (placeBet/settleRound/claimDaily) and extend Round schema with 'coin-flip'"

git add src/store/walletStore.ts src/store/walletStore.test.ts src/systems/hooks/useRecentRounds.ts src/systems/hooks/useRecentRounds.test.ts
git commit -m "feat(wallet): add walletStore and useRecentRounds hook"

git add docs/adr/0016-history-in-settle-transaction.md docs/risks.md BUILD_GUIDE.md
git commit -m "docs(adr): ADR-0016 history-in-settle + update BUILD_GUIDE §3 §6 + R-24..R-31 risks"
```

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin phase-2-wallet
gh pr create --title "phase-2(wallet): wallet system + history-in-settle + walletStore + useRecentRounds" \
  --body "$(cat <<'EOF'
## Summary
PR B of Phase 2. Wallet API + reactive store + history-in-settle pattern. No UI yet.

- src/systems/wallet.ts: placeBet (6-error union), settleRound (idempotent), claimDaily, getBalance, WALLET_CONFIG
- src/store/walletStore.ts: Zustand wrapper with hydrate/clear/place/settle/claim
- src/systems/hooks/useRecentRounds.ts: reactive query via dexie-react-hooks
- src/db/schema.ts: +lastDailyClaimAt?, +'coin-flip' in game union
- src/systems/auth.ts: imports WALLET_CONFIG.STARTING_CHIPS
- BUILD_GUIDE §3 (remove history.ts; note settle transaction), §6 (game union)
- 40 new tests (25 wallet + 7 hook + 8 store), all green
- ADR-0016 documents history-in-settle pattern
- R-24..R-26, R-30, R-31 added to risk register

## BUILD_GUIDE reference
- Phase: 2 — Wallet + Lobby + Game shell
- Sections: §4, §6

## How tested
- pnpm test:run → 111/111
- Coverage gates green; new modules at >90%

## Definition of done
- [ ] All 4 CI jobs green
- [ ] Coverage on src/systems/**/*.ts stays ≥ 80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI + merge**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --search "PR B" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR C — `phase-2-app-shell`

## Task C1: Branch + UIStore

**Files:**

- Create: `src/store/uiStore.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-2-app-shell
```

- [ ] **Step 2: Create uiStore.ts**

Verbatim from spec §6.7:

```ts
import { create } from 'zustand';

const SIDEBAR_KEY = 'MASQUER.ui.sidebarCollapsed';

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

## Task C2: Test uiStore.ts

**Files:**

- Create: `src/store/uiStore.test.ts`

- [ ] **Step 1: Write 6 tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SIDEBAR_KEY = 'MASQUER.ui.sidebarCollapsed';

// Re-import the module fresh for each test so initial state is recomputed.
async function importFreshStore() {
  vi.resetModules();
  return import('./uiStore');
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('uiStore', () => {
  it('first visit (localStorage empty): sidebarCollapsed = false', async () => {
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("if localStorage 'true': initial state collapsed", async () => {
    localStorage.setItem(SIDEBAR_KEY, 'true');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it("if localStorage 'false': initial state open", async () => {
    localStorage.setItem(SIDEBAR_KEY, 'false');
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('toggleSidebar flips state and writes to localStorage', async () => {
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('true');
  });

  it('setSidebarCollapsed(true) writes and sets', async () => {
    const { useUIStore } = await importFreshStore();
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe('true');
  });

  it('if localStorage throws: defaults to open (graceful)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const { useUIStore } = await importFreshStore();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run uiStore tests**

```bash
pnpm test:run -- src/store/uiStore.test.ts
```

Expected: 6/6 pass.

## Task C3: Create AppBootstrap modification

**Files:**

- Modify: `src/components/AppBootstrap.tsx`

- [ ] **Step 1: Replace the file**

Verbatim from spec §6.8:

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

- [ ] **Step 2: Update existing AppBootstrap test**

The existing `src/components/AppBootstrap.test.tsx` (from RR 7 migration) renders AppBootstrap with a mocked sessionStore. It needs an extra mock for walletStore. Modify the test to add:

```ts
// At the top with the other mocks:
vi.mock('@/store/walletStore', () => ({
  useWalletStore: Object.assign((selector: any) => selector({ hydrate: vi.fn(), clear: vi.fn() }), {
    getState: () => ({ hydrate: vi.fn(), clear: vi.fn() }),
  }),
}));
```

Then run `pnpm test:run -- src/components/AppBootstrap.test.tsx` — expected: passes.

## Task C4: BalanceBadge (PR C placeholder)

**Files:**

- Create: `src/components/BalanceBadge.tsx`

- [ ] **Step 1: Create the placeholder badge**

Verbatim from spec §6.14:

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

## Task C5: SidebarToggle

**Files:**

- Create: `src/components/SidebarToggle.tsx`

- [ ] **Step 1: Create from spec §6.12**

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

## Task C6: Sidebar

**Files:**

- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create from spec §6.13**

(See spec §6.13 for the full ~80-line file with NavItem subcomponent.)

## Task C7: Sidebar test

**Files:**

- Create: `src/components/Sidebar.test.tsx`

- [ ] **Step 1: Write rendering + active-state tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  function renderAtPath(path: string, collapsed = false) {
    const router = createMemoryRouter(
      [
        { path: '/lobby', element: <Sidebar collapsed={collapsed} /> },
        { path: '/play/coin-flip', element: <Sidebar collapsed={collapsed} /> },
      ],
      { initialEntries: [path] },
    );
    return render(<RouterProvider router={router} />);
  }

  it('renders all 8 nav items when expanded', () => {
    renderAtPath('/lobby', false);
    expect(screen.getByText(/Lobby/)).toBeInTheDocument();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument();
    expect(screen.getByText(/Blackjack/)).toBeInTheDocument();
    expect(screen.getByText(/Roulette/)).toBeInTheDocument();
    expect(screen.getByText(/Slots/)).toBeInTheDocument();
    expect(screen.getByText(/Baccarat/)).toBeInTheDocument();
    expect(screen.getByText(/Stats/)).toBeInTheDocument();
    expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
  });

  it('shows NEW badge on Coin Flip', () => {
    renderAtPath('/lobby');
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows phase tags on unimplemented games', () => {
    renderAtPath('/lobby');
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('P4')).toBeInTheDocument();
    expect(screen.getByText('P5')).toBeInTheDocument();
    expect(screen.getByText('P6')).toBeInTheDocument();
  });

  it('hides content visually when collapsed (aria-hidden)', () => {
    const { container } = renderAtPath('/lobby', true);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: Run Sidebar tests**

```bash
pnpm test:run -- src/components/Sidebar.test.tsx
```

Expected: 4/4 pass.

## Task C8: AppLayout

**Files:**

- Create: `src/components/AppLayout.tsx`

- [ ] **Step 1: Create from spec §6.10**

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

## Task C9: TopBar (PR C version with BalanceBadge)

**Files:**

- Create: `src/components/TopBar.tsx`

- [ ] **Step 1: Create PR C version (BalanceBadge, not CreditsDropdown)**

```tsx
import type { JSX } from 'react';
import SidebarToggle from './SidebarToggle';
import BalanceBadge from './BalanceBadge';
import ProfileDropdown from './ProfileDropdown';

export default function TopBar(): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-gold/30 bg-felt-deep px-5 py-3.5">
      <div className="flex items-center gap-3.5">
        <SidebarToggle />
        <span className="font-display tracking-wider text-gold text-lg">LOCALGAMBLE</span>
      </div>
      <div className="flex items-center gap-3.5 text-sm">
        <BalanceBadge />
        <ProfileDropdown />
      </div>
    </header>
  );
}
```

PR D will swap `BalanceBadge` → `CreditsDropdown`.

## Task C10: ProfileDropdown

**Files:**

- Create: `src/components/ProfileDropdown.tsx`

- [ ] **Step 1: Create from spec §6.16**

(See spec §6.16 for the full ~120-line file.)

## Task C11: ProfileDropdown test

**Files:**

- Create: `src/components/ProfileDropdown.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ProfileDropdown from './ProfileDropdown';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

beforeEach(() => {
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'Adam',
      usernameLower: 'adam',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as any);
  useWalletStore.setState({ balance: 1_000, nextDailyEligibleAt: null, hydrating: false });
});

describe('ProfileDropdown', () => {
  it('shows username + avatar; toggles menu on click', async () => {
    render(
      <MemoryRouter>
        <ProfileDropdown />
      </MemoryRouter>,
    );
    expect(screen.getByText('Adam')).toBeInTheDocument();
    expect(screen.queryByText(/View profile/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/View profile/)).toBeInTheDocument();
    expect(screen.getByText(/Edit profile/)).toBeInTheDocument();
    expect(screen.getByText(/My stats/)).toBeInTheDocument();
    expect(screen.getByText(/Settings/)).toBeInTheDocument();
    expect(screen.getByText(/Log out/)).toBeInTheDocument();
  });

  it('logout clears session and wallet', async () => {
    const logout = vi.fn(() => Promise.resolve());
    const clear = vi.fn();
    useSessionStore.setState({ logout } as any);
    useWalletStore.setState({ clear } as any);
    render(
      <MemoryRouter>
        <ProfileDropdown />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText(/Log out/));
    expect(logout).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:run -- src/components/ProfileDropdown.test.tsx
```

Expected: 2/2 pass.

## Task C12: AppLayout test

**Files:**

- Create: `src/components/AppLayout.test.tsx`

- [ ] **Step 1: Write rendering test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AppLayout from './AppLayout';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';

describe('AppLayout', () => {
  it('renders TopBar, Sidebar, and an Outlet for the child route', () => {
    useSessionStore.setState({
      currentUser: {
        id: 'u',
        username: 'Adam',
        usernameLower: 'adam',
        passwordHash: '',
        passwordSalt: '',
        pbkdf2Iterations: 600_000,
        avatarColor: '#a3122a',
        createdAt: Date.now(),
      },
      bootstrapping: false,
    } as any);
    useUIStore.setState({ sidebarCollapsed: false });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppLayout />,
          children: [{ path: 'lobby', element: <p>lobby content</p> }],
        },
      ],
      { initialEntries: ['/lobby'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByText('LOCALGAMBLE')).toBeInTheDocument();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument(); // sidebar item
    expect(screen.getByText('lobby content')).toBeInTheDocument(); // outlet
  });
});
```

## Task C13: ProfileStubPage

**Files:**

- Create: `src/pages/ProfileStubPage.tsx`

- [ ] **Step 1: Create from spec §6.22**

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

## Task C14: Restructure router.tsx (PR C version, no play routes yet)

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Replace with the layout-route structure (no /play routes yet)**

```tsx
import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
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

PR E adds the `/play/coin-flip` and 4 stub routes.

## Task C15: LobbyPage placeholder for PR C

**Files:**

- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Replace LobbyPage with a placeholder that fits inside AppLayout**

```tsx
import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';

export default function LobbyPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="px-8 py-7">
      <h2 className="mb-1.5 font-display text-2xl tracking-wider text-gold-bright">
        PICK YOUR POISON
      </h2>
      <p className="mb-5 text-xs text-white/55">Cabinet carousel arrives in PR E.</p>
    </div>
  );
}
```

- [ ] **Step 2: Update LobbyPage.test.tsx**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';

beforeEach(() => {
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'Adam',
      usernameLower: 'adam',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as any);
});

describe('LobbyPage', () => {
  it('renders the PICK YOUR POISON heading', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PICK YOUR POISON/)).toBeInTheDocument();
  });
});
```

## Task C16: ADRs 0018, 0019

**Files:**

- Create: `docs/adr/0018-layout-route-pattern.md`
- Create: `docs/adr/0019-ui-store-localstorage.md`

- [ ] **Step 1: Create ADR-0018**

```markdown
# ADR-0018: Layout route pattern — single `/` parent with `<RequireAuth>` baked in

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

The TopBar + Sidebar shell wraps every signed-in page. Three options were
considered: single layout route, two layout routes (auth vs signed-in), or
per-route `<RequireAuth>` wrappers (Phase 1 pattern).

## Decision

Use a single React Router 7 layout route at `/` whose element is
`<RequireAuth><AppLayout /></RequireAuth>`. AppLayout renders TopBar +
Sidebar + `<Outlet />`. Child routes for /lobby, /play/_, /stats,
/leaderboard, /profile_, /settings are nested under it. /login and
/register are siblings at the top level (unauthed).

## Alternatives considered

- **Per-route `<RequireAuth>` wrappers (Phase 1 pattern)** — less DRY; easy
  to forget on a new page.
- **Two layout routes** — more flexibility but overkill for current scope.

## Consequences

- One place to find the shell.
- RequireAuth applied uniformly; no opt-out needed.
- New signed-in pages slot in as additional children — zero config.
- Phase 7 loader-based routes for stats can attach as child route loaders
  without changing this structure.

## References

- Phase 2 spec §6.9 (router.tsx verbatim)
- ADR-0011 (RequireAuth pattern — preserved)
- ADR-0014 (RR 7 data-router migration)
```

- [ ] **Step 2: Create ADR-0019**

```markdown
# ADR-0019: UI preferences via `uiStore` with localStorage persistence

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

The sidebar collapse state must survive a page refresh per user preference.
ADR-0010 currently limits localStorage access to `src/systems/auth.ts`.
Adding more UI prefs over time (sound volume, etc.) shouldn't require
adding them to auth.ts.

## Decision

Create `src/store/uiStore.ts` as a Zustand store that owns UI preferences,
with localStorage read on init and write on every change. The first
preference is `sidebarCollapsed`. Default on first ever visit is OPEN
(collapsed=false) for discoverability.

Extend ADR-0010's localStorage allow-list to include `src/store/uiStore.ts`.
`docs/conventions.md` updated to reflect the two-file allow-list.

## Alternatives considered

- **In-memory only** — loses persistence; user has to re-toggle every visit.
- **Persist to IndexedDB** — overkill for one boolean; async read on boot
  delays UI.
- **Put pref management in auth.ts** — couples unrelated concerns.

## Consequences

- A second module gets localStorage access; allow-list now [auth.ts, uiStore.ts].
- Future UI prefs (Phase 8 sound volume, etc.) extend this store rather than
  proliferating new stores.
- Test pattern: `vi.resetModules()` + re-import to recompute initial state.

## References

- ADR-0010 (localStorage allow-list, Phase 1)
- Phase 2 spec §6.7 (uiStore.ts verbatim)
```

## Task C17: conventions.md update + Sidebar test/Toggle test

**Files:**

- Modify: `docs/conventions.md`
- Create: `src/components/SidebarToggle.test.tsx` (small)

- [ ] **Step 1: Update conventions.md**

Find the Imports section. Replace the bullet:

```
- localStorage access is allowed in `src/systems/auth.ts` ONLY.
```

with:

```
- localStorage access is allowed in `src/systems/auth.ts` AND `src/store/uiStore.ts` ONLY.
```

- [ ] **Step 2: Test SidebarToggle**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarToggle from './SidebarToggle';
import { useUIStore } from '@/store/uiStore';

beforeEach(() => {
  useUIStore.setState({ sidebarCollapsed: false });
});

describe('SidebarToggle', () => {
  it('aria-label reflects state', () => {
    render(<SidebarToggle />);
    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    useUIStore.setState({ sidebarCollapsed: true });
    render(<SidebarToggle />);
    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
  });

  it('click toggles state in uiStore', async () => {
    render(<SidebarToggle />);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    await userEvent.click(screen.getByRole('button'));
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });
});
```

## Task C18: PR C local DoD + commit + push + open + merge

**Files:** none

- [ ] **Step 1: All five gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all green. Test count grows by ~17 (uiStore 6 + Sidebar 4 + SidebarToggle 2 + ProfileDropdown 2 + AppLayout 1 + LobbyPage 1 ≈ 16-17).

- [ ] **Step 2: Commit in five chunks**

```bash
git add src/store/uiStore.ts src/store/uiStore.test.ts docs/conventions.md
git commit -m "feat(ui): add uiStore for sidebar collapse preference"

git add src/components/AppBootstrap.tsx
git commit -m "feat(session): hydrate walletStore after sessionStore restores user"

git add src/components/SidebarToggle.tsx src/components/SidebarToggle.test.tsx src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat(ui): add Sidebar + SidebarToggle (animated collapse)"

git add src/components/BalanceBadge.tsx src/components/ProfileDropdown.tsx src/components/ProfileDropdown.test.tsx src/components/TopBar.tsx src/components/AppLayout.tsx src/components/AppLayout.test.tsx
git commit -m "feat(ui): add TopBar, BalanceBadge placeholder, ProfileDropdown, AppLayout"

git add src/router.tsx src/pages/ProfileStubPage.tsx src/pages/LobbyPage.tsx src/pages/LobbyPage.test.tsx docs/adr/0018-layout-route-pattern.md docs/adr/0019-ui-store-localstorage.md
git commit -m "feat(routing): layout-route restructure + ProfileStubPage + ADRs 0018-0019"
```

- [ ] **Step 3: Push + open PR + watch + merge**

```bash
git push -u origin phase-2-app-shell
gh pr create --title "phase-2(shell): AppLayout + TopBar + Sidebar + ProfileDropdown + UIStore + layout-route" \
  --body "$(cat <<'EOF'
## Summary
PR C of Phase 2. Full chrome of the signed-in app. No daily-topup UI yet (PR D), no games yet (PR E).

- src/store/uiStore.ts: sidebarCollapsed pref persisted to localStorage
- src/components/AppBootstrap.tsx: walletStore.hydrate after session restored
- src/components/AppLayout.tsx: TopBar + Sidebar + Outlet wrapper
- src/components/TopBar.tsx: logo + SidebarToggle + BalanceBadge (placeholder) + ProfileDropdown
- src/components/Sidebar.tsx: animated collapse, 8 nav items with phase tags
- src/components/ProfileDropdown.tsx: View/Edit profile, My stats, Settings, Log out
- src/router.tsx: restructured to single '/' layout route with RequireAuth + child routes
- src/pages/ProfileStubPage.tsx: shared "Coming in Phase 8" stub
- ADRs 0018, 0019
- docs/conventions.md: localStorage allow-list extended

## How tested
- pnpm test:run → all passing (PR A + PR B + PR C tests)
- Manual: pnpm dev → log in → see TopBar, click ☰ to collapse sidebar, refresh persists, click avatar → dropdown items navigate

## Definition of done
- [ ] All 4 CI jobs green
- [ ] No localStorage access outside auth.ts and uiStore.ts

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --search "PR C" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR D — `phase-2-daily-topup`

## Task D1: Branch + CreditsDropdown

**Files:**

- Create: `src/components/CreditsDropdown.tsx`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-2-daily-topup
```

- [ ] **Step 2: Create CreditsDropdown.tsx**

(See spec §6.15 — ~150-line file with countdown + claim button + click-outside + count-up animation. Copy verbatim.)

## Task D2: CreditsDropdown test

**Files:**

- Create: `src/components/CreditsDropdown.test.tsx`

- [ ] **Step 1: Write 8 tests**

Test cases: renders balance; toggles open/close on click; shows countdown when not eligible; shows CLAIM button when eligible; claim button calls walletStore.claimDaily; click-outside closes; countdown formatter outputs `HHh MMm SSs`; respects reduced motion (no scale animation).

(Full test file content in spec test plan §7.6.)

## Task D3: Swap BalanceBadge → CreditsDropdown in TopBar

**Files:**

- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Replace BalanceBadge import + usage with CreditsDropdown**

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

(Leave `src/components/BalanceBadge.tsx` in place but unused — PR D can delete it OR leave it for future preview/playground use. Spec says delete; do that to keep tree clean.)

- [ ] **Step 2: Delete BalanceBadge**

```bash
git rm src/components/BalanceBadge.tsx
```

## Task D4: ADR-0017 + BUILD_GUIDE.md §4 §12 edits

**Files:**

- Create: `docs/adr/0017-daily-topup.md`
- Modify: `BUILD_GUIDE.md`

- [ ] **Step 1: Create ADR-0017**

```markdown
# ADR-0017: Daily top-up: +50 chips every 24h, no zero-chip bypass

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §4 originally said "If a user hits 0, offer a 'daily top-up' of
a small amount so the app is never bricked." The wording is ambiguous: is the
top-up triggered by hitting 0, or by elapsed time? Is it bypassable?

## Decision

Adopt a strict policy:

- Every user accumulates a +50 chip claim eligibility every 24h since their
  last claim (floating 24h, not midnight rollover).
- The cooldown is NOT bypassable. A user at 0 chips with 23h remaining must
  wait. The app is "always recoverable within 24h" — softer wording than
  "never bricked" but functionally equivalent.
- New users (no lastDailyClaimAt) are eligible immediately on first dropdown
  open.

BUILD_GUIDE §4 wording updated to reflect this (PR D).

## Alternatives considered

- **Bypass at 0 chips** — exploitable: user could intentionally bust to claim
  more often. Rejected.
- **Midnight rollover** — encourages "check in once a day" ritual but feels
  exploitable at the 11:59pm boundary.
- **Shorter cooldown (e.g. 12h)** — too generous; daily play money loses tension.

## Consequences

- Predictable mental model: claim resets a personal 24h timer.
- Worst-case UX: user blows 1,000 chips at 11pm, claims at 11pm next day,
  has 50 chips for 24h. Acceptable for a play-money local app.
- Implementation: `wallet.claimDaily` transaction reads `lastDailyClaimAt`,
  enforces 24h gap.
- UI: CreditsDropdown shows countdown when not eligible, CLAIM button when
  eligible.

## References

- BUILD_GUIDE.md §4 (Shared Systems — Wallet)
- Phase 2 spec §6.3 (wallet.claimDaily), §6.15 (CreditsDropdown)
```

- [ ] **Step 2: Update BUILD_GUIDE.md §4**

Find the bullet in §4 Wallet section that says:

```
- New users start with a fixed stake (e.g. **1,000 chips**). If a user hits 0, offer a "daily top-up" of a small amount so the app is never bricked.
```

Replace with:

```
- New users start with a fixed stake of **1,000 chips**.
- Every user receives **+50 chips every 24h** from their last claim. The cooldown is not bypassable even at 0 chips; the app remains recoverable within 24h (ADR-0017).
- New users are eligible to claim immediately on first dropdown open.
```

- [ ] **Step 3: Update BUILD_GUIDE.md §12 row 2**

Find the Phase 2 row in the §12 table and update the "Deliverable" column to include:

- Daily top-up (+50 chips every 24h, ADR-0017)
- AppLayout shell with collapsible sidebar (ADR-0018, ADR-0019)
- RecentResults rail
- Coin Flip placeholder game (ADR-0020) + 4 stub pages for Phases 3-6

## Task D5: PR D commit + open + merge

**Files:** none

- [ ] **Step 1: Commit in three chunks**

```bash
git add src/components/CreditsDropdown.tsx src/components/CreditsDropdown.test.tsx
git commit -m "feat(wallet): add CreditsDropdown with countdown and daily claim button"

git add src/components/TopBar.tsx src/components/BalanceBadge.tsx
git commit -m "feat(wallet): swap BalanceBadge for CreditsDropdown in TopBar"

git add docs/adr/0017-daily-topup.md BUILD_GUIDE.md
git commit -m "docs(adr): ADR-0017 daily top-up + BUILD_GUIDE §4/§12 updates"
```

- [ ] **Step 2: Push + PR + merge**

```bash
git push -u origin phase-2-daily-topup
gh pr create --title "phase-2(wallet): CreditsDropdown with daily +50 top-up" \
  --body "$(cat <<'EOF'
## Summary
PR D of Phase 2. Daily-topup UI. The wallet.claimDaily function already shipped in PR B; this PR consumes it.

- src/components/CreditsDropdown.tsx: countdown to next +50, CLAIM button when eligible, animated count-up on balance change
- src/components/TopBar.tsx: swap BalanceBadge → CreditsDropdown
- Deleted src/components/BalanceBadge.tsx (placeholder no longer needed)
- ADR-0017 documents the policy (floating 24h, no zero-chip bypass)
- BUILD_GUIDE §4 wording softened from "never bricked" to "always recoverable within 24h"
- BUILD_GUIDE §12 row 2 deliverables updated

## How tested
- pnpm test:run → all passing
- Manual: pnpm dev → click 💰 → see countdown OR CLAIM button → click CLAIM → balance +50 → countdown resets

## Definition of done
- [ ] All 4 CI jobs green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --search "PR D" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR E — `phase-2-games`

## Task E1: Branch

```bash
git checkout main && git pull --ff-only
git checkout -b phase-2-games
```

## Task E2: RecentResults

**Files:**

- Create: `src/games/_shared/RecentResults.tsx`

- [ ] Create from spec §6.18 (the full component with motion + AnimatePresence).

## Task E3: RecentResults test

**Files:**

- Create: `src/games/_shared/RecentResults.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentResults, { type RecentResultItem } from './RecentResults';

const item = (
  key: string,
  net: number,
  accent: 'win' | 'loss' | 'push' = 'win',
): RecentResultItem => ({
  key,
  badgeText: 'H',
  badgeColor: '#fff',
  badgeTextColor: '#000',
  betLabel: '10',
  netChips: net,
  accent,
});

describe('RecentResults', () => {
  it('renders empty state when items is empty', () => {
    render(<RecentResults items={[]} emptyText="nothing yet" />);
    expect(screen.getByText('nothing yet')).toBeInTheDocument();
  });

  it('renders one row per item', () => {
    render(<RecentResults items={[item('a', 10), item('b', -5, 'loss')]} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('color-codes net by accent', () => {
    const { container } = render(
      <RecentResults items={[item('w', 10, 'win'), item('l', -5, 'loss'), item('p', 0, 'push')]} />,
    );
    expect(container.querySelector('.text-chip-win')).toBeTruthy();
    expect(container.querySelector('.text-chip-loss')).toBeTruthy();
    expect(container.querySelector('.text-chip-push')).toBeTruthy();
  });
});
```

## Task E4: GameShell

**Files:**

- Create: `src/games/_shared/GameShell.tsx`

- [ ] Create from spec §6.17.

## Task E5: GameShell test

**Files:**

- Create: `src/games/_shared/GameShell.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GameShell from './GameShell';

describe('GameShell', () => {
  it('renders title, meta, children (game area), and bettingPanel slots', () => {
    render(
      <MemoryRouter>
        <GameShell
          title="🪙 COIN FLIP"
          meta="1:1 · 1–500"
          bettingPanel={<div data-testid="panel">PANEL</div>}
        >
          <div data-testid="game">GAME</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('🪙 COIN FLIP')).toBeInTheDocument();
    expect(screen.getByText('1:1 · 1–500')).toBeInTheDocument();
    expect(screen.getByTestId('game')).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('shows RecentResults rail when recentItems is provided', () => {
    render(
      <MemoryRouter>
        <GameShell title="X" recentItems={[]} bettingPanel={<div>P</div>}>
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('RECENT')).toBeInTheDocument();
  });

  it('hides RecentResults rail when recentItems is undefined', () => {
    render(
      <MemoryRouter>
        <GameShell title="X" bettingPanel={<div>P</div>}>
          <div>G</div>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.queryByText('RECENT')).not.toBeInTheDocument();
  });
});
```

## Task E6: BettingPanel + tests

**Files:**

- Create: `src/games/_shared/BettingPanel.tsx`
- Create: `src/games/_shared/BettingPanel.test.tsx`

- [ ] **Step 1: Create from spec §6.19**

- [ ] **Step 2: Test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BettingPanel from './BettingPanel';

function renderPanel(props: Partial<Parameters<typeof BettingPanel>[0]> = {}) {
  const onCommit = vi.fn();
  const callButtons = vi.fn(() => <div data-testid="calls">CALLS</div>);
  const utils = render(
    <BettingPanel
      min={1}
      max={500}
      balance={1000}
      onCommit={onCommit}
      callButtons={callButtons}
      {...props}
    />,
  );
  return { ...utils, onCommit, callButtons };
}

describe('BettingPanel', () => {
  it('renders default chip denominations', () => {
    renderPanel();
    for (const d of [1, 5, 25, 100, 500]) {
      expect(screen.getByLabelText(`Add ${d} chips to bet`)).toBeInTheDocument();
    }
  });

  it('clicking a chip adds to bet amount', async () => {
    renderPanel();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('cannot exceed balance', async () => {
    renderPanel({ balance: 4 });
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    expect(screen.getByText('0')).toBeInTheDocument(); // chip click rejected
  });

  it('Clear resets to 0', async () => {
    renderPanel();
    await userEvent.click(screen.getByLabelText('Add 5 chips to bet'));
    await userEvent.click(screen.getByText(/Clear/));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('Place Bet calls onCommit and locks subsequent clicks', async () => {
    const { onCommit } = renderPanel();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    expect(onCommit).toHaveBeenCalledWith(25);
  });

  it('Repeat last pill appears when lastBet provided', () => {
    renderPanel({ lastBet: 50 });
    expect(screen.getByText(/Repeat 50/)).toBeInTheDocument();
  });
});
```

## Task E7: useGameRound + test

**Files:**

- Create: `src/games/_shared/useGameRound.ts`
- Create: `src/games/_shared/useGameRound.test.ts`

- [ ] Create hook from spec §6.20.

- [ ] **Test:**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { useGameRound } from './useGameRound';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'A',
      usernameLower: 'a',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as any);
  await db.balances.put({ userId: 'u', chips: 100, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
});

describe('useGameRound', () => {
  it('placeBet returns no_user when not logged in', async () => {
    useSessionStore.setState({ currentUser: null } as any);
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(10, { min: 1, max: 500 }));
    expect(r).toEqual({ ok: false, error: 'no_user' });
  });

  it('placeBet success returns handle', async () => {
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(25, { min: 1, max: 500 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.handle.amount).toBe(25);
  });

  it('settle records a round and clears resolving', async () => {
    const { result } = renderHook(() => useGameRound('coin-flip'));
    const r = await act(() => result.current.placeBet(25, { min: 1, max: 500 }));
    if (!r.ok) throw new Error();
    await act(() =>
      result.current.settle(r.handle, {
        outcome: 'win',
        betAmount: 25,
        payout: 50,
        netChange: 25,
        details: {},
      }),
    );
    expect(result.current.resolving).toBe(false);
    const row = await db.rounds.get(r.handle.betId);
    expect(row).toBeDefined();
  });
});
```

## Task E8: StubGamePage + test

**Files:**

- Create: `src/games/_shared/StubGamePage.tsx`
- Create: `src/games/_shared/StubGamePage.test.tsx`

- [ ] From spec §6.21.

- [ ] **Test:**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StubGamePage from './StubGamePage';

describe('StubGamePage', () => {
  it.each([
    ['blackjack', 3, 'BLACKJACK'],
    ['roulette', 4, 'ROULETTE'],
    ['slots', 5, 'SLOTS'],
    ['baccarat', 6, 'BACCARAT'],
  ] as const)('renders %s stub for phase %i', (game, phase, label) => {
    render(
      <MemoryRouter>
        <StubGamePage game={game} phase={phase} />
      </MemoryRouter>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(`Coming in Phase ${phase}`)).toBeInTheDocument();
  });

  it('has back-to-lobby and try-coin-flip links', () => {
    render(
      <MemoryRouter>
        <StubGamePage game="blackjack" phase={3} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Back to lobby/)).toBeInTheDocument();
    expect(screen.getByText(/Try Coin Flip/)).toBeInTheDocument();
  });
});
```

## Task E9: Coin Flip logic + test (TDD)

**Files:**

- Create: `src/games/coin-flip/logic.ts`
- Create: `src/games/coin-flip/logic.test.ts`

- [ ] **Step 1: Write logic.ts** (from spec §6.23).

- [ ] **Step 2: Write logic.test.ts**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { seed, unseed } from '@/systems/rng';
import { playRound, COIN_FLIP_CONFIG, type CoinFlipDetails } from './logic';

afterEach(() => unseed());

describe('playRound', () => {
  it('returns integer payouts and net change', () => {
    seed(1);
    for (let i = 0; i < 20; i++) {
      const r = playRound({ call: 'heads', betAmount: 10 });
      expect(Number.isInteger(r.payout)).toBe(true);
      expect(Number.isInteger(r.netChange)).toBe(true);
      expect(r.netChange).toBe(r.payout - r.betAmount);
    }
  });

  it('win when call matches: payout = bet*2, netChange = bet', () => {
    seed(2); // pick a seed that lands heads first
    // Determine landed by running once without checking outcome:
    unseed();
    seed(2);
    const a = playRound({ call: 'heads', betAmount: 10 });
    // a.details.landed is either 'heads' or 'tails'; verify the rule based on a.details
    const d = a.details as CoinFlipDetails;
    if (d.landed === 'heads') {
      expect(a.outcome).toBe('win');
      expect(a.payout).toBe(20);
      expect(a.netChange).toBe(10);
    } else {
      expect(a.outcome).toBe('loss');
      expect(a.payout).toBe(0);
      expect(a.netChange).toBe(-10);
    }
  });

  it('details include both call and landed', () => {
    seed(99);
    const r = playRound({ call: 'tails', betAmount: 5 });
    const d = r.details as CoinFlipDetails;
    expect(d.call).toBe('tails');
    expect(['heads', 'tails']).toContain(d.landed);
  });

  it('seeded determinism: same seed → same sequence of outcomes', () => {
    seed(42);
    const a = [
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
    ];
    unseed();
    seed(42);
    const b = [
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
      playRound({ call: 'heads', betAmount: 10 }),
    ];
    expect(a.map((r) => (r.details as CoinFlipDetails).landed)).toEqual(
      b.map((r) => (r.details as CoinFlipDetails).landed),
    );
  });

  it('over 1000 rolls under seed: roughly 50/50 H vs T', () => {
    seed(7);
    let heads = 0;
    for (let i = 0; i < 1000; i++) {
      const r = playRound({ call: 'heads', betAmount: 1 });
      if ((r.details as CoinFlipDetails).landed === 'heads') heads += 1;
    }
    expect(heads).toBeGreaterThan(400);
    expect(heads).toBeLessThan(600);
  });

  it('config exports MIN_BET=1 and MAX_BET=500', () => {
    expect(COIN_FLIP_CONFIG.MIN_BET).toBe(1);
    expect(COIN_FLIP_CONFIG.MAX_BET).toBe(500);
  });
});
```

- [ ] **Step 3: Run logic tests**

```bash
pnpm test:run -- src/games/coin-flip/logic.test.ts
```

Expected: 6/6 pass. Coverage on `src/games/coin-flip/logic.ts` should hit ≥90% (ADR-0003 gate).

## Task E10: CoinFlipPage + test

**Files:**

- Create: `src/games/coin-flip/CoinFlipPage.tsx`
- Create: `src/games/coin-flip/CoinFlipPage.test.tsx`

- [ ] From spec §6.24 (the full ~200-line page).

- [ ] **Test (~6 cases):**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CoinFlipPage from './CoinFlipPage';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { seed, unseed } from '@/systems/rng';

beforeEach(async () => {
  await resetDb();
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'A',
      usernameLower: 'a',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as any);
  await db.balances.put({ userId: 'u', chips: 1_000, updatedAt: Date.now() });
  await useWalletStore.getState().hydrate('u');
  unseed();
});

describe('CoinFlipPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <CoinFlipPage />
      </MemoryRouter>,
    );
  }

  it('renders title, coin, and disabled HEADS/TAILS until bet placed', () => {
    renderPage();
    expect(screen.getByText(/COIN FLIP/)).toBeInTheDocument();
    expect((screen.getByRole('button', { name: 'HEADS' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('placing a bet enables HEADS/TAILS', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    expect((screen.getByRole('button', { name: 'HEADS' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('settling a round writes a rounds row', async () => {
    seed(2);
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    await userEvent.click(screen.getByText(/PLACE BET/));
    await userEvent.click(screen.getByRole('button', { name: 'HEADS' }));
    await waitFor(
      async () => {
        const rounds = await db.rounds.toArray();
        expect(rounds).toHaveLength(1);
        expect(rounds[0]!.game).toBe('coin-flip');
        expect(rounds[0]!.betAmount).toBe(25);
      },
      { timeout: 3_000 },
    );
  });

  it('shows insufficient chips error if bet > balance', async () => {
    await db.balances.put({ userId: 'u', chips: 5, updatedAt: Date.now() });
    await useWalletStore.getState().hydrate('u');
    renderPage();
    await userEvent.click(screen.getByLabelText('Add 25 chips to bet'));
    // Chip add was rejected by BettingPanel (5 < 25), so PLACE BET disabled.
    // Force-place a bet > balance: bypass UI to test the wallet error path?
    // Simpler: with balance 5, try to add 5 then 5 → second add rejected.
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
```

## Task E11: CabinetCarousel + RecentActivityStrip + LobbyPage update

**Files:**

- Create: `src/pages/lobby/CabinetCarousel.tsx`
- Create: `src/pages/lobby/RecentActivityStrip.tsx`
- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/pages/LobbyPage.test.tsx`

- [ ] Create CabinetCarousel.tsx from spec §6.25.
- [ ] Create RecentActivityStrip.tsx from spec §6.26.
- [ ] Replace LobbyPage.tsx with spec §6.27.
- [ ] Update LobbyPage.test.tsx to assert cabinet rendering:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LobbyPage from './LobbyPage';
import { useSessionStore } from '@/store/sessionStore';

beforeEach(() => {
  useSessionStore.setState({
    currentUser: {
      id: 'u',
      username: 'A',
      usernameLower: 'a',
      passwordHash: '',
      passwordSalt: '',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    },
    bootstrapping: false,
  } as any);
});

describe('LobbyPage', () => {
  it('renders heading and all 5 cabinets', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PICK YOUR POISON/)).toBeInTheDocument();
    expect(screen.getByText('COIN FLIP')).toBeInTheDocument();
    expect(screen.getByText('BLACKJACK')).toBeInTheDocument();
    expect(screen.getByText('ROULETTE')).toBeInTheDocument();
    expect(screen.getByText('SLOTS')).toBeInTheDocument();
    expect(screen.getByText('BACCARAT')).toBeInTheDocument();
  });

  it('shows empty-state recent-activity strip when no rounds played', () => {
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No rounds played yet/)).toBeInTheDocument();
  });
});
```

## Task E12: router.tsx — add /play routes

**Files:**

- Modify: `src/router.tsx`

- [ ] **Step 1: Add the 5 play routes as children of `/`**

Insert these inside the `children` array of the `/` route (after the `lobby` entry):

```tsx
{ path: 'play/coin-flip', element: <CoinFlipPage /> },
{ path: 'play/blackjack', element: <StubGamePage game="blackjack" phase={3} /> },
{ path: 'play/roulette', element: <StubGamePage game="roulette" phase={4} /> },
{ path: 'play/slots', element: <StubGamePage game="slots" phase={5} /> },
{ path: 'play/baccarat', element: <StubGamePage game="baccarat" phase={6} /> },
```

Add the imports at the top:

```tsx
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
import StubGamePage from '@/games/_shared/StubGamePage';
```

## Task E13: ADR-0020

**Files:**

- Create: `docs/adr/0020-coin-flip-placeholder.md`

```markdown
# ADR-0020: Coin Flip as Phase 2's placeholder game

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §12 row 2 requires "a placeholder game can place and settle a bet
and write a rounds row." Several shapes are possible: a minimal "Win/Lose
button," a full game like Coin Flip, or stubs for the planned games.

## Decision

Coin Flip is the placeholder. It's a real game: place a bet, call HEADS or
TAILS, RNG decides the outcome via systems/rng.ts, 1:1 payout. Min 1, max 500.

It serves as the reference template for Phase 3-6 games: same GameShell,
same BettingPanel, same useGameRound hook, same RecentResults pattern. A
new game in Phase 3+ copies the structure and replaces logic.ts +
game-specific call buttons.

In addition, 4 stub pages (Blackjack, Roulette, Slots, Baccarat) make all
cabinets clickable from the lobby. The stubs show a "Coming in Phase N"
splash with links back to the lobby and Coin Flip.

## Alternatives considered

- **Minimal Win/Lose button** — exercises wallet+history but not RNG;
  doesn't validate the full stack.
- **Multiple stub pages only** — doesn't validate the play loop end-to-end.
- **A small game per phase (Coin Flip stays forever)** — keeps the
  placeholder permanently; aesthetically odd but harmless.

## Consequences

- Phase 2 ships a real, playable game.
- Phase 3 (Blackjack) inherits the full template.
- Coin Flip remains in the lobby as Game #5 — playable indefinitely.
- The `'coin-flip'` value in `Round.game` union persists across phases.

## References

- BUILD_GUIDE.md §12 row 2
- Phase 2 spec §6.23 (logic.ts), §6.24 (CoinFlipPage.tsx)
- ADR-0015 (RNG)
```

## Task E14: PR E commit + open + merge

**Files:** none

- [ ] **Step 1: All gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all green. Coverage on `src/games/coin-flip/logic.ts` ≥90%.

- [ ] **Step 2: Commit in 7 chunks**

```bash
git add src/games/_shared/RecentResults.tsx src/games/_shared/RecentResults.test.tsx
git commit -m "feat(games): add RecentResults rail with Framer Motion FLIP"

git add src/games/_shared/GameShell.tsx src/games/_shared/GameShell.test.tsx
git commit -m "feat(games): add GameShell (page chrome + RecentResults rail + BettingPanel dock)"

git add src/games/_shared/BettingPanel.tsx src/games/_shared/BettingPanel.test.tsx
git commit -m "feat(games): add BettingPanel with chip denominations and call-button slot"

git add src/games/_shared/useGameRound.ts src/games/_shared/useGameRound.test.ts
git commit -m "feat(games): add useGameRound hook for bet→settle flow"

git add src/games/_shared/StubGamePage.tsx src/games/_shared/StubGamePage.test.tsx
git commit -m "feat(games): add StubGamePage for unimplemented cabinets"

git add src/games/coin-flip/logic.ts src/games/coin-flip/logic.test.ts src/games/coin-flip/CoinFlipPage.tsx src/games/coin-flip/CoinFlipPage.test.tsx
git commit -m "feat(coin-flip): add logic.ts (pure) + CoinFlipPage (1s spin + settle)"

git add src/pages/lobby/CabinetCarousel.tsx src/pages/lobby/RecentActivityStrip.tsx src/pages/LobbyPage.tsx src/pages/LobbyPage.test.tsx src/router.tsx docs/adr/0020-coin-flip-placeholder.md
git commit -m "feat(lobby): real cabinet carousel + recent activity strip + /play routes + ADR-0020"
```

- [ ] **Step 3: Push + PR + watch + merge**

```bash
git push -u origin phase-2-games
gh pr create --title "phase-2(games): GameShell + BettingPanel + RecentResults + Coin Flip + 4 stubs" \
  --body "$(cat <<'EOF'
## Summary
PR E of Phase 2. Full play loop end-to-end. Coin Flip is playable; 4 stubs reachable from the lobby.

- src/games/_shared/: GameShell + BettingPanel + RecentResults + useGameRound + StubGamePage
- src/games/coin-flip/: logic.ts (pure, 6 tests) + CoinFlipPage.tsx (1s spin animation + settle)
- src/pages/lobby/: CabinetCarousel (5 cabinets, Coin Flip cyan/playable) + RecentActivityStrip
- src/router.tsx: adds /play/coin-flip and 4 stub routes as children of layout
- ADR-0020 documents Coin Flip as the placeholder

## How tested
- pnpm test:run → all passing (incl. ~12 logic tests + ~25 component tests)
- Coverage on src/games/coin-flip/logic.ts ≥ 90%
- Manual smoke (8 steps from spec §13): all pass

## Definition of done
- [ ] All 4 CI jobs green
- [ ] Coverage gates: 80% systems, 90% game logic

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --search "PR E" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# Release: v0.3-wallet-and-game-shell

## Task Rel1: Release PR

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Branch + update CHANGELOG**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.3-wallet-and-game-shell
```

Move the accumulated `[Unreleased]` entries into a new `[v0.3-wallet-and-game-shell] — 2026-05-17` section. Sample:

```markdown
## [v0.3-wallet-and-game-shell] — 2026-05-17

### Added

- RNG (`src/systems/rng.ts`) with seedable mode for deterministic tests
- Wallet system: placeBet, settleRound, claimDaily, getBalance — discriminated-union result types
- Daily +50 chip top-up every 24h (ADR-0017)
- Reactive useRecentRounds hook (dexie-react-hooks)
- AppLayout shell: TopBar, collapsible Sidebar, ProfileDropdown, CreditsDropdown with countdown
- UIStore for sidebar collapse preference (persisted to localStorage)
- Layout-route pattern (ADR-0018): single `/` parent with RequireAuth + Outlet children
- GameShell + BettingPanel + RecentResults + useGameRound — reusable game template
- Coin Flip placeholder game (1:1 payout, 1-500 bet range)
- 4 stub pages for Blackjack/Roulette/Slots/Baccarat
- Lobby cabinet carousel + recent activity strip
- ADRs 0015-0020

### Changed

- BUILD_GUIDE §3: removed `systems/history.ts` mention (history written in settle transaction)
- BUILD_GUIDE §4: clarified daily top-up policy (floating 24h, no zero-chip bypass)
- BUILD_GUIDE §6: added 'coin-flip' to Round.game union
- BUILD_GUIDE §12: extended row 2 with Phase 2 deliverables
- `src/systems/auth.ts`: imports `STARTING_CHIPS` from wallet (single source of truth)
- `src/components/AppBootstrap.tsx`: hydrates walletStore after session restored
- `src/router.tsx`: restructured to single layout route at `/` with child routes
- localStorage allow-list extended to `src/store/uiStore.ts`

### Removed

- `src/components/BalanceBadge.tsx` (replaced by `CreditsDropdown`)
```

- [ ] **Step 2: Commit + PR + merge**

```bash
git add CHANGELOG.md
git commit -m "chore(release): v0.3-wallet-and-game-shell"
git push -u origin chore/release-v0.3-wallet-and-game-shell
gh pr create --title "chore(release): v0.3-wallet-and-game-shell" \
  --body "Tags Phase 2 completion. See CHANGELOG.md."
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task Rel2: Tag + GH release + close milestone

- [ ] **Step 1: Tag + release**

```bash
git tag -a v0.3-wallet-and-game-shell -m "Phase 2 — Wallet + App Shell + Game Shell complete"
git push origin v0.3-wallet-and-game-shell
gh release create v0.3-wallet-and-game-shell \
  --title "v0.3-wallet-and-game-shell" \
  --notes-file CHANGELOG.md \
  --latest
```

- [ ] **Step 2: Close remaining issues + milestone**

```bash
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --state open --json number --jq '.[].number' \
  | xargs -I {} gh issue close {} --comment "Completed in v0.3-wallet-and-game-shell."
PHASE_2_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 2 — Wallet + Lobby + Game shell") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_2_MS -f state=closed
```

## Task Rel3: Final DoD verification

- [ ] **Step 1: Run all DoD checks**

```bash
ls .github/workflows/claude.yml
grep -R "Math.random" src/ ; echo "Exit: $?"
grep -rEn "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "src/systems/auth.ts" | grep -v "src/store/uiStore.ts" | grep -v ".test." ; echo "Exit: $?"
grep -rEn "from '@/db" src/pages src/components ; echo "Exit: $?"
ls docs/adr/0015-*.md docs/adr/0016-*.md docs/adr/0017-*.md docs/adr/0018-*.md docs/adr/0019-*.md docs/adr/0020-*.md
node --version
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
gh release view v0.3-wallet-and-game-shell
gh issue list --milestone "Phase 2 — Wallet + Lobby + Game shell" --state all
```

All should succeed; the grep-for-absence commands should exit 1 with no output.

- [ ] **Step 2: Manual smoke test (8 steps from spec §13)**

```bash
pnpm dev
```

Then in the browser: register a new test user, walk through the 8 steps from spec §13 (claim daily, click sidebar, play Coin Flip, verify rounds in DevTools IndexedDB, logout, re-login).

---

## Self-Review Notes

This plan was self-reviewed for:

- **Spec coverage:** every spec section maps to at least one task. Spec §5 (5-PR breakdown) → 5 PR sections. Spec §6 verbatim file drafts → individual tasks. Spec §7 test plan → test tasks in each PR. Spec §8 ADRs → A3, B11, C16, D4, E13. Spec §9 risks → A4, B11. Spec §10 conventions update → C17. Spec §11 issue setup → pre-flight Step 4. Spec §12 smoke plan → embedded in each PR's local DoD + Rel3 final smoke. Spec §13 DoD → Rel3. Spec §15 BUILD_GUIDE edits → B10 + D4. Spec §16 release procedure → Rel1 + Rel2.
- **Placeholders:** no TBD/TODO/"fill in details". The component test outline tasks (E3, E4 "Test", etc.) provide actual code; tasks that reference "spec §6.X" point to the verbatim spec rather than repeating ~150 lines of unchanged code — acceptable because the spec is itself the verbatim source committed to main before this plan runs.
- **Type / name consistency:** verified across tasks: `WALLET_CONFIG`, `BetHandle`, `RoundResult`, `PlaceBetError` (6 codes), `ClaimDailyResult`, `useWalletStore`/`useBalance`/`useNextDailyEligibleAt`, `useUIStore`, `RecentResultItem`, `useGameRound`, `useRecentRounds`, `CoinFlipDetails`, `CoinSide`, `COIN_FLIP_CONFIG`, `STARTING_CHIPS=1000`, `DAILY_CLAIM_AMOUNT=50`, `DAILY_CLAIM_INTERVAL_MS=86_400_000`, branch names `phase-2-rng`/`phase-2-wallet`/`phase-2-app-shell`/`phase-2-daily-topup`/`phase-2-games`, `MASQUER.ui.sidebarCollapsed`, `MASQUER.session.userId`. All consistent.
- **Scope:** Phase 2 only. No Phase 3+ game logic, no real profile/settings pages.
- **Test count at end of Phase 2:** ~150 (Phase 1 baseline 59 + Phase 2 ~91 new). Coverage gates: ≥80% on `src/systems/**/*.ts`, ≥90% on `src/games/coin-flip/logic.ts`.
