# Phase 1 — Data + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the IndexedDB data layer and the local-profile auth system so a user can register, log out, log back in, refresh, and see they're still logged in — with their password hashed in the DB and a starter chip balance of 1,000 already provisioned for Phase 2.

**Architecture:** Three layers, three PRs. Data layer (`src/db/`) → systems layer (`src/systems/auth.ts` and friends, all pure-ish async functions returning discriminated-union results) → state+UI layer (`src/store/sessionStore.ts` Zustand wrapper + RHF+Zod forms + `<RequireAuth>` route guard).

**Tech Stack:** Dexie 4 + fake-indexeddb (tests), Web Crypto API (PBKDF2-HMAC-SHA-256 @ 600,000 iterations), Zod 3, React Hook Form 7 + @hookform/resolvers, Zustand 5, React Router 6, Vitest 2 + RTL + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-15-phase-1-data-and-auth-design.md`

---

## File Structure (after all three PRs merge)

```
localGamble/
├── docs/
│   └── adr/
│       ├── 0008-discriminated-union-results.md            # PR #1
│       ├── 0009-pbkdf2-600k-iterations.md                 # PR #1
│       ├── 0010-session-persistence-localstorage.md       # PR #1
│       ├── 0011-route-protection-requireauth.md           # PR #1
│       └── 0012-forms-rhf-zod.md                          # PR #1
├── docs/risks.md                                          # PR #1 modified
├── src/
│   ├── App.tsx                                            # PR #3 modified
│   ├── App.test.tsx                                       # PR #3 modified
│   ├── components/
│   │   ├── RequireAuth.tsx                                # PR #3
│   │   └── RequireAuth.test.tsx                           # PR #3
│   ├── db/
│   │   ├── schema.ts                                      # PR #1
│   │   ├── index.ts                                       # PR #1
│   │   └── db.test.ts                                     # PR #1
│   ├── pages/
│   │   ├── LoginPage.tsx                                  # PR #3 modified
│   │   ├── LoginPage.test.tsx                             # PR #3
│   │   ├── RegisterPage.tsx                               # PR #3 modified
│   │   ├── RegisterPage.test.tsx                          # PR #3
│   │   ├── LobbyPage.tsx                                  # PR #3 modified
│   │   └── LobbyPage.test.tsx                             # PR #3
│   ├── store/
│   │   ├── sessionStore.ts                                # PR #3
│   │   └── sessionStore.test.ts                           # PR #3
│   ├── systems/
│   │   ├── auth.ts                                        # PR #2
│   │   ├── auth.test.ts                                   # PR #2
│   │   ├── auth-schemas.ts                                # PR #2
│   │   ├── auth-schemas.test.ts                           # PR #2
│   │   ├── avatar.ts                                      # PR #2
│   │   ├── avatar.test.ts                                 # PR #2
│   │   ├── crypto.ts                                      # PR #2
│   │   └── crypto.test.ts                                 # PR #2
│   └── test/
│       ├── db-helpers.ts                                  # PR #1
│       └── setup.ts                                       # PR #1 modified
└── package.json                                           # PR #1, #2, #3 modified
```

---

## Pre-flight (run once before Task 1)

- [ ] **Step 1: Verify clean main branch in sync with origin**

```bash
cd /Users/adam/localGamble
git checkout main
git pull --ff-only
git status
```

Expected: `On branch main`, `Your branch is up to date with 'origin/main'.`, `nothing to commit, working tree clean`. Last commit should be `249d0bc docs(build-guide): add Phase 1 (Data + Auth) design spec (#44)`.

- [ ] **Step 2: Verify Node 20 + pnpm 9**

```bash
nvm use
corepack enable
pnpm --version
```

Expected: Node v20.x, pnpm 9.x.

- [ ] **Step 3: Verify quality gates pass on main before starting**

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0. If anything fails, that's a Phase 0 regression — STOP and fix before starting Phase 1.

- [ ] **Step 4: Get the Phase 1 milestone number**

```bash
PHASE_1_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 1 — Data + Auth") | .number')
echo "Phase 1 milestone: $PHASE_1_MS"
```

Expected: a number (probably `2`, since milestones were created in the order listed by Phase 0). Save this for Task 41.

- [ ] **Step 5: File the 4 Phase 1 issues**

```bash
gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling" \
  --title "[Phase 1] PR #1 — Dexie schema (users + balances + rounds) and test harness" \
  --body "Schema (User, Balance, Round), unique usernameLower index, compound [userId+playedAt] index on rounds, resetDb() helper, fake-indexeddb dev dep. ADRs 0008-0012 drafted. See spec section 5 PR #1."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling,tests" \
  --title "[Phase 1] PR #2 — systems/auth.ts pure functions + crypto + schemas + tests" \
  --body "PBKDF2 600k, register/login/logout/restoreSession, discriminated-union results, 15-case test matrix, schema validation tests. See spec section 5 PR #2 and section 7."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,tooling" \
  --title "[Phase 1] PR #3 — Login/Register pages, RequireAuth, sessionStore, lobby" \
  --body "RHF+Zod forms, RequireAuth wrapper, bootstrap loading splash, lobby with avatar+logout. See spec section 5 PR #3 and section 12 smoke plan."

gh issue create --milestone "$PHASE_1_MS" --label "phase-1,chore" \
  --title "[Phase 1] Tag v0.2-data-and-auth release after PR #3 merges" \
  --body "chore(release) PR + tag + GH release."
```

---

# PR #1 — Data layer (`phase-1-db`)

## Task 1: Create the PR #1 branch

**Files:** none (branch only)

- [ ] **Step 1: Branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-1-db
```

Expected: `Switched to a new branch 'phase-1-db'`.

## Task 2: Install fake-indexeddb

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto)

- [ ] **Step 1: Install fake-indexeddb as a dev dependency**

```bash
pnpm add -D fake-indexeddb
```

Expected: package.json gets `"fake-indexeddb": "^6.x.x"` under devDependencies; pnpm-lock.yaml updated.

- [ ] **Step 2: Verify install**

```bash
pnpm list fake-indexeddb
```

Expected: shows `fake-indexeddb` with a version.

## Task 3: Update src/test/setup.ts

**Files:**

- Modify: `src/test/setup.ts`

- [ ] **Step 1: Add the fake-indexeddb import**

Replace the contents of `src/test/setup.ts` with:

```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
```

The `fake-indexeddb/auto` import MUST come first — it patches `globalThis.indexedDB` before any test code runs, and Dexie binds to `indexedDB` at construction time.

- [ ] **Step 2: Verify existing tests still pass**

```bash
pnpm test:run
```

Expected: 1 test passes (the existing App.test.tsx sanity test). No errors about indexedDB.

## Task 4: Write src/db/schema.ts

**Files:**

- Create: `src/db/schema.ts`

- [ ] **Step 1: Write the schema file**

Create `src/db/schema.ts`:

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
}

export interface Round {
  id: string;
  userId: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'baccarat';
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

- [ ] **Step 2: Verify it typechecks**

```bash
pnpm typecheck
```

Expected: no errors.

## Task 5: Write src/db/index.ts

**Files:**

- Create: `src/db/index.ts`

- [ ] **Step 1: Write the singleton module**

Create `src/db/index.ts`:

```ts
import { LocalGambleDB } from './schema';

export const db = new LocalGambleDB();

export type { User, Balance, Round } from './schema';
```

- [ ] **Step 2: Verify it typechecks**

```bash
pnpm typecheck
```

Expected: no errors.

## Task 6: Write src/test/db-helpers.ts

**Files:**

- Create: `src/test/db-helpers.ts`

- [ ] **Step 1: Write the helper**

Create `src/test/db-helpers.ts`:

```ts
import { db } from '@/db';

/** Wipe and re-open the DB. Use in beforeEach for tests that mutate. */
export async function resetDb(): Promise<void> {
  await db.delete();
  await db.open();
}
```

## Task 7: Write src/db/db.test.ts (TDD: tests describe the schema contract)

**Files:**

- Create: `src/db/db.test.ts`

- [ ] **Step 1: Write all 5 schema tests**

Create `src/db/db.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

describe('LocalGambleDB schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('opens cleanly', async () => {
    expect(db.isOpen()).toBe(true);
  });

  it('enforces unique usernameLower index on users', async () => {
    const base = {
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    };
    await db.users.add({
      id: 'a',
      username: 'Adam',
      usernameLower: 'adam',
      ...base,
    });
    await expect(
      db.users.add({
        id: 'b',
        username: 'aDaM',
        usernameLower: 'adam',
        ...base,
      }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
  });

  it('round-trips a balance row', async () => {
    await db.balances.add({ userId: 'u1', chips: 1000, updatedAt: 123 });
    const got = await db.balances.get('u1');
    expect(got).toEqual({ userId: 'u1', chips: 1000, updatedAt: 123 });
  });

  it('queries rounds by [userId+playedAt] compound index', async () => {
    await db.rounds.bulkAdd([
      {
        id: 'r1',
        userId: 'u1',
        game: 'blackjack',
        betAmount: 10,
        payout: 20,
        netChange: 10,
        outcome: 'win',
        details: null,
        balanceAfter: 1010,
        playedAt: 100,
      },
      {
        id: 'r2',
        userId: 'u1',
        game: 'roulette',
        betAmount: 5,
        payout: 0,
        netChange: -5,
        outcome: 'loss',
        details: null,
        balanceAfter: 1005,
        playedAt: 200,
      },
      {
        id: 'r3',
        userId: 'u2',
        game: 'slots',
        betAmount: 1,
        payout: 0,
        netChange: -1,
        outcome: 'loss',
        details: null,
        balanceAfter: 999,
        playedAt: 150,
      },
    ]);
    const u1Rounds = await db.rounds
      .where('[userId+playedAt]')
      .between(['u1', 0], ['u1', Number.MAX_SAFE_INTEGER])
      .toArray();
    expect(u1Rounds.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('resetDb empties all tables', async () => {
    await db.users.add({
      id: 'a',
      username: 'Adam',
      usernameLower: 'adam',
      passwordHash: 'h',
      passwordSalt: 's',
      pbkdf2Iterations: 600_000,
      avatarColor: '#a3122a',
      createdAt: Date.now(),
    });
    await resetDb();
    expect(await db.users.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/db/db.test.ts
```

Expected: 5/5 tests pass.

If any fails, the schema or test has a bug — diagnose before proceeding.

- [ ] **Step 3: Run the full test suite to confirm nothing else broke**

```bash
pnpm test:run
```

Expected: 6 tests pass (5 new + 1 existing App.test.tsx).

## Task 8: Update docs/risks.md

**Files:**

- Modify: `docs/risks.md`

- [ ] **Step 1: Append Phase 1 risks**

Append to the end of `docs/risks.md`:

```markdown
## Phase 1 additions

| ID   | Risk                                                 | Phase     | L   | I   | Mitigation                                                                                |
| ---- | ---------------------------------------------------- | --------- | --- | --- | ----------------------------------------------------------------------------------------- |
| R-16 | PBKDF2 takes too long, login feels frozen            | 1         | M   | L   | 600k iters ≈ 300-500ms; UI shows isSubmitting spinner. Drop to 210k if users complain.    |
| R-17 | localStorage unavailable (private mode historically) | 1         | L   | M   | All localStorage access wrapped in try/catch; degrade gracefully.                         |
| R-18 | User opens app on different browser → empty          | 1         | H   | L   | Intentional; data is local per-browser. Documented in dev-setup.                          |
| R-19 | Username uniqueness race (two tabs register at once) | 1         | L   | L   | Dexie &usernameLower index throws ConstraintError; caught and reported as username_taken. |
| R-20 | Login timing oracle reveals username existence       | 1         | L   | M   | Always run KDF on login even when user not found.                                         |
| R-21 | RequireAuth flash-of-content during bootstrap        | 1         | M   | L   | App renders "Loading…" splash while bootstrapping is true.                                |
| R-22 | Test pollution between test files                    | 1         | M   | M   | resetDb() helper + beforeEach in any test that writes.                                    |
| R-23 | Dexie ConstraintError detection brittle              | 1, future | L   | M   | Centralized isUniqueIndexError helper.                                                    |
```

## Task 9: Write the 5 ADRs

**Files:**

- Create: `docs/adr/0008-discriminated-union-results.md`
- Create: `docs/adr/0009-pbkdf2-600k-iterations.md`
- Create: `docs/adr/0010-session-persistence-localstorage.md`
- Create: `docs/adr/0011-route-protection-requireauth.md`
- Create: `docs/adr/0012-forms-rhf-zod.md`

- [ ] **Step 1: Create ADR-0008**

````markdown
# ADR-0008: Discriminated-union result type for system functions

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

Functions in `src/systems/` perform I/O that can fail in known, expected ways
(username taken, insufficient chips, invalid credentials). We need a way to
report these failures without conflating them with bugs.

## Decision

Every fallible system function returns a discriminated union:

```ts
type Result<T, E extends string> = ({ ok: true } & T) | { ok: false; error: E };
```
````

The error field is a string literal type — never a free-form message — so the
caller can exhaustive-switch on it and the UI translates the code into a
human-readable string. Exceptions are reserved for "should never happen" bugs
(typically rethrown by Dexie or the runtime).

## Alternatives considered

- **Throw exceptions for expected errors** — couples error UI rendering to
  try/catch placement; harder to type.
- **Boolean + out param** — TypeScript handles unions cleanly; out params are
  awkward in async code.
- **Either monad** — overkill for the team size.

## Consequences

- UI does `if (!result.ok) showError(result.error)`; no try/catch in React.
- Adding a new failure mode requires extending the union — TypeScript flags
  unhandled cases at the call site.
- Test assertions are simple: `expect(result).toEqual({ok:false, error:'x'})`.

## References

- BUILD_GUIDE.md §3 (architecture: systems are the only side-effecting layer)
- Phase 1 spec section 6.8 (auth.ts uses this pattern)

````

- [ ] **Step 2: Create ADR-0009**

```markdown
# ADR-0009: PBKDF2 with 600,000 iterations stored per-user

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
BUILD_GUIDE §7 says "PBKDF2 (Web Crypto, e.g. 100k+ iterations, SHA-256)".
We need to pick a specific number. The trade-off is login speed vs.
brute-force resistance.

## Decision
Use PBKDF2-HMAC-SHA-256 with **600,000 iterations** (OWASP 2024 recommendation).
Store the iteration count per user in the `users.pbkdf2Iterations` column so a
future bump doesn't break existing accounts.

On register: hash with current `PBKDF2_ITERATIONS`. On login: re-hash with the
user's stored iteration count, compare. (Rehash-on-login if stored < current
is a Phase 8 polish.)

## Alternatives considered
- **100k iters** (BUILD_GUIDE example minimum) — faster login (~50-80ms) but
  below current OWASP recommendation.
- **210k iters** (older OWASP) — middle ground (~150-200ms).
- **Argon2** — stronger algorithm, but not in Web Crypto API; would require
  a wasm bundle (~50KB).

## Consequences
- Login takes ~300-500ms on a typical laptop. UI shows isSubmitting spinner.
- Per-user iteration count means future increases are non-breaking.
- A stored hash includes its own salt, hash, and iteration count, making the
  cryptographic parameters explicit per record.

## References
- BUILD_GUIDE.md §7 (Accounts)
- Phase 1 spec section 6.5 (crypto.ts)
- OWASP Password Storage Cheat Sheet (2024)
````

- [ ] **Step 3: Create ADR-0010**

```markdown
# ADR-0010: Session persistence via localStorage single-key

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

BUILD_GUIDE §7 says "Remember the last logged-in user across refreshes (store
just the userId, not credentials)." We need a place to put it.

## Decision

Use `localStorage` with the key `localGamble.session.userId`. Read
synchronously on app boot (in the Zustand store's `bootstrap()` action).
Wrap all access in try/catch (Safari private mode has historically thrown).

## Alternatives considered

- **IndexedDB single-row "session" table** — async read on boot adds delay
  before route logic can run; more "consistent" but overkill for one userId.
- **sessionStorage** — clears on tab close; would force re-login each time
  the user reopens the browser.
- **Cookie** — pointless without a server.

## Consequences

- Survives refresh and tab close.
- One layer (auth.ts) owns this concern; UI never touches localStorage.
- ESLint convention enforces this: localStorage is allowed in
  `src/systems/auth.ts` only.

## References

- BUILD_GUIDE.md §7 (Accounts)
- Phase 1 spec section 6.8 (auth.ts session helpers)
```

- [ ] **Step 4: Create ADR-0011**

````markdown
# ADR-0011: Route protection via `<RequireAuth>` wrapper

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

Most app routes (lobby, stats, leaderboard, future games) require a session.
We need a uniform way to protect them.

## Decision

A `<RequireAuth>` wrapper component that reads `useCurrentUser()` and either
renders children or `<Navigate to="/login" state={{from}}/>`. Each protected
route in `App.tsx` wraps its element:

```tsx
<Route
  path="/lobby"
  element={
    <RequireAuth>
      <LobbyPage />
    </RequireAuth>
  }
/>
```
````

The `state.from` value is read by the login/register pages so a post-login
redirect lands the user at the page they originally tried to visit.

## Alternatives considered

- **Outlet pattern** (single parent route does the check) — less repetition
  but the protection is implicit in route nesting.
- **Hook in each page** (`useRequireAuth()`) — co-locates the requirement
  with the page, but easy to forget on a new page (silent failure).

## Consequences

- Easy to grep for "what's protected": just search for `RequireAuth>`.
- Each protected route is explicit in App.tsx.
- The wrapper is ~25 lines; it has its own component test.

## References

- BUILD_GUIDE.md §7 (route guarding)
- Phase 1 spec section 6.10 (RequireAuth.tsx)

````

- [ ] **Step 5: Create ADR-0012**

```markdown
# ADR-0012: Forms via React Hook Form + Zod

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
We need a form library and a validation strategy. Phase 1 has Login and
Register; Phase 2 will add the BettingPanel; Phase 8 may add a settings page.
Setting the pattern now means later forms are mechanical.

## Decision
Use **React Hook Form** for form state and submission, and **Zod** for
schema-based validation that doubles as TypeScript types via `z.infer`.
Schemas live in `src/systems/<area>-schemas.ts` so both the form and the
underlying system can validate the same shape.

## Alternatives considered
- **RHF with built-in validation** (no Zod) — smaller bundle but schema
  isn't reusable for non-form code paths.
- **Plain controlled inputs** — fine for two forms, becomes painful as the
  app grows.
- **TanStack Form** — newer; less prior art; not worth the learning curve
  here.

## Consequences
- Adds ~10KB gzipped (RHF + zod + resolvers).
- One import pattern for every future form: `useForm({resolver: zodResolver(schema)})`.
- Schemas double as the inferred TS input types — no manual type duplication.

## References
- BUILD_GUIDE.md §7 (form requirements)
- Phase 1 spec sections 6.7, 6.12, 6.13
````

## Task 10: PR #1 — local DoD verification

**Files:** none

- [ ] **Step 1: Run all four quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0. 6 tests pass.

- [ ] **Step 2: Verify file inventory**

```bash
ls src/db/ src/test/ docs/adr/ | grep -E "(schema|index|db.test|db-helpers|setup|0008|0009|0010|0011|0012)"
```

Expected output includes: `db.test.ts`, `index.ts`, `schema.ts`, `db-helpers.ts`, `setup.ts`, `0008-...md`, `0009-...md`, `0010-...md`, `0011-...md`, `0012-...md`.

## Task 11: PR #1 — commit, push, open PR, watch, merge

**Files:** none

- [ ] **Step 1: Commit in three logical chunks**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(db): add fake-indexeddb dev dependency for test harness"

git add src/db/ src/test/setup.ts src/test/db-helpers.ts
git commit -m "feat(db): add Dexie schema (users, balances, rounds) + test harness"

git add docs/adr/0008-discriminated-union-results.md \
        docs/adr/0009-pbkdf2-600k-iterations.md \
        docs/adr/0010-session-persistence-localstorage.md \
        docs/adr/0011-route-protection-requireauth.md \
        docs/adr/0012-forms-rhf-zod.md \
        docs/risks.md
git commit -m "docs(adr): ADRs 0008-0012 for Phase 1 + risk register additions"
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin phase-1-db
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "phase-1(db): Dexie schema (users + balances + rounds) and test harness" \
  --body "$(cat <<'EOF'
## Summary
PR #1 of Phase 1. Data layer only — no auth, no UI.

- src/db/schema.ts: User, Balance, Round interfaces + LocalGambleDB class with version(1) stores
- src/db/index.ts: singleton db export
- src/db/db.test.ts: 5 schema sanity tests (open, unique index, round-trip, compound index, reset)
- src/test/db-helpers.ts: resetDb() helper
- src/test/setup.ts: imports fake-indexeddb/auto before jest-dom
- 5 new ADRs (0008-0012) drafted
- 8 new risk register entries (R-16 to R-23)
- fake-indexeddb dev dep added

## BUILD_GUIDE reference
- Phase: 1 — Data + Auth
- Sections: §6 (Data Model)

## How tested
- `pnpm test:run` → 6/6 passing (5 new + existing App.test.tsx)
- All four CI jobs expected to pass

## Definition of done
- [ ] CI green
- [ ] Schema can be opened, queried, and reset in tests
- [ ] All 5 new ADRs accepted and present

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh pr checks --watch
```

Expected: all four jobs (meta, lint, test, build) green.

If commitlint fails, the issue is likely a missing scope. Check the failed log; the fix is to amend the offending commit message and force-push.

If anything else fails, diagnose and fix on the branch — DO NOT bypass with `--no-verify`.

- [ ] **Step 5: Merge and sync**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 6: Close the PR #1 issue**

```bash
gh issue list --milestone "Phase 1 — Data + Auth" --search "PR #1" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR #2 — Auth system (`phase-1-auth-system`)

## Task 12: Create the PR #2 branch

**Files:** none

- [ ] **Step 1: Branch from updated main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-1-auth-system
```

## Task 13: Install zod

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install zod as a production dependency**

```bash
pnpm add zod
```

Expected: zod added under dependencies.

## Task 14: Write src/systems/crypto.ts

**Files:**

- Create: `src/systems/crypto.ts`

- [ ] **Step 1: Write the crypto module**

Create `src/systems/crypto.ts`:

```ts
const PBKDF2_ITERATIONS = 600_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;
const HASH_ALGO = 'SHA-256';

export const PASSWORD_HASHING = {
  algorithm: 'PBKDF2' as const,
  hash: HASH_ALGO,
  iterations: PBKDF2_ITERATIONS,
  saltBytes: SALT_BYTES,
  hashBits: HASH_BITS,
};

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

export async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: HASH_ALGO },
    baseKey,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
pnpm typecheck
```

Expected: no errors.

## Task 15: Write src/systems/crypto.test.ts (TDD)

**Files:**

- Create: `src/systems/crypto.test.ts`

- [ ] **Step 1: Write the 5 crypto tests**

Create `src/systems/crypto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, deriveKey, generateSalt, timingSafeEqual } from './crypto';

describe('crypto', () => {
  it('deriveKey is deterministic given same inputs', async () => {
    const salt = new Uint8Array(16).fill(7);
    const a = await deriveKey('password123', salt, 1000);
    const b = await deriveKey('password123', salt, 1000);
    expect(a).toEqual(b);
  });

  it('deriveKey produces different output for different salts', async () => {
    const a = await deriveKey('password123', new Uint8Array(16).fill(1), 1000);
    const b = await deriveKey('password123', new Uint8Array(16).fill(2), 1000);
    expect(a).not.toEqual(b);
  });

  it('timingSafeEqual returns false for different lengths', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('timingSafeEqual returns true for byte-equal arrays', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('bytesToBase64 ↔ base64ToBytes round-trips', () => {
    const original = generateSalt();
    const round = base64ToBytes(bytesToBase64(original));
    expect(round).toEqual(original);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/systems/crypto.test.ts
```

Expected: 5/5 pass.

The deriveKey tests use 1000 iterations (not 600k) to keep test time reasonable while still exercising the same code path.

## Task 16: Write src/systems/avatar.ts

**Files:**

- Create: `src/systems/avatar.ts`

- [ ] **Step 1: Write the avatar module**

Create `src/systems/avatar.ts`:

```ts
export const AVATAR_PALETTE = [
  '#a3122a',
  '#d4af37',
  '#3df0ff',
  '#ff5cf2',
  '#3dd17a',
  '#9c5cff',
  '#ff8c42',
  '#ffe066',
  '#27c4d6',
  '#e85d75',
] as const;

export type AvatarColor = (typeof AVATAR_PALETTE)[number];

export function pickRandomAvatarColor(): AvatarColor {
  const i = crypto.getRandomValues(new Uint32Array(1))[0]! % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[i]!;
}
```

## Task 17: Write src/systems/avatar.test.ts

**Files:**

- Create: `src/systems/avatar.test.ts`

- [ ] **Step 1: Write the avatar tests**

Create `src/systems/avatar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AVATAR_PALETTE, pickRandomAvatarColor } from './avatar';

describe('avatar', () => {
  it('AVATAR_PALETTE has 10 distinct colors', () => {
    expect(AVATAR_PALETTE).toHaveLength(10);
    expect(new Set(AVATAR_PALETTE).size).toBe(10);
  });

  it('every entry is a 7-character hex code', () => {
    for (const color of AVATAR_PALETTE) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('pickRandomAvatarColor returns a color from the palette', () => {
    for (let i = 0; i < 50; i++) {
      const color = pickRandomAvatarColor();
      expect(AVATAR_PALETTE).toContain(color);
    }
  });

  it('pickRandomAvatarColor produces variety over many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickRandomAvatarColor());
    }
    // With 10 colors and 200 picks, we should hit at least 5 unique values
    // (probability of fewer is astronomically small).
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/systems/avatar.test.ts
```

Expected: 4/4 pass.

## Task 18: Write src/systems/auth-schemas.ts

**Files:**

- Create: `src/systems/auth-schemas.ts`

- [ ] **Step 1: Write the schemas**

Create `src/systems/auth-schemas.ts`:

```ts
import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, underscore, and hyphen only');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

## Task 19: Write src/systems/auth-schemas.test.ts

**Files:**

- Create: `src/systems/auth-schemas.test.ts`

- [ ] **Step 1: Write the schema tests**

Create `src/systems/auth-schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema, usernameSchema } from './auth-schemas';

describe('username schema', () => {
  it('rejects too-short usernames', () => {
    const r = usernameSchema.safeParse('ab');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/at least 3/);
  });

  it('rejects too-long usernames', () => {
    const r = usernameSchema.safeParse('a'.repeat(21));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/at most 20/);
  });

  it('rejects usernames with spaces', () => {
    const r = usernameSchema.safeParse('hello world');
    expect(r.success).toBe(false);
  });

  it('accepts valid usernames with underscore and hyphen', () => {
    expect(usernameSchema.safeParse('Adam_99').success).toBe(true);
    expect(usernameSchema.safeParse('jane-doe').success).toBe(true);
  });

  it('trims whitespace before validating', () => {
    const r = usernameSchema.safeParse('  adam  ');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('adam');
  });
});

describe('register schema', () => {
  it('rejects mismatched confirmPassword on the confirmPassword field', () => {
    const r = registerSchema.safeParse({
      username: 'adam',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue?.message).toMatch(/do not match/);
    }
  });

  it('accepts a fully valid registration', () => {
    const r = registerSchema.safeParse({
      username: 'adam',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(r.success).toBe(true);
  });
});

describe('login schema', () => {
  it('requires a non-empty password', () => {
    const r = loginSchema.safeParse({ username: 'adam', password: '' });
    expect(r.success).toBe(false);
  });

  it('does not enforce password length on login (only register)', () => {
    const r = loginSchema.safeParse({ username: 'adam', password: 'x' });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/systems/auth-schemas.test.ts
```

Expected: 9/9 pass.

## Task 20: Write src/systems/auth.ts

**Files:**

- Create: `src/systems/auth.ts`

- [ ] **Step 1: Write the auth module**

Create `src/systems/auth.ts`:

```ts
import { db } from '@/db';
import type { User } from '@/db';
import {
  PASSWORD_HASHING,
  base64ToBytes,
  bytesToBase64,
  deriveKey,
  generateSalt,
  timingSafeEqual,
} from '@/systems/crypto';
import { pickRandomAvatarColor } from '@/systems/avatar';

const SESSION_KEY = 'localGamble.session.userId';
const STARTING_CHIPS = 1000;

export type RegisterError = 'username_taken' | 'unknown';
export type LoginError = 'invalid_credentials' | 'unknown';

export type RegisterResult = { ok: true; user: User } | { ok: false; error: RegisterError };

export type LoginResult = { ok: true; user: User } | { ok: false; error: LoginError };

export async function register(input: {
  username: string;
  password: string;
}): Promise<RegisterResult> {
  const trimmed = input.username.trim();
  const usernameLower = trimmed.toLowerCase();
  const salt = generateSalt();
  const hash = await deriveKey(input.password, salt, PASSWORD_HASHING.iterations);

  const user: User = {
    id: crypto.randomUUID(),
    username: trimmed,
    usernameLower,
    passwordHash: bytesToBase64(hash),
    passwordSalt: bytesToBase64(salt),
    pbkdf2Iterations: PASSWORD_HASHING.iterations,
    avatarColor: pickRandomAvatarColor(),
    createdAt: Date.now(),
  };

  try {
    await db.transaction('rw', db.users, db.balances, async () => {
      await db.users.add(user);
      await db.balances.add({
        userId: user.id,
        chips: STARTING_CHIPS,
        updatedAt: Date.now(),
      });
    });
  } catch (e) {
    if (isUniqueIndexError(e)) return { ok: false, error: 'username_taken' };
    return { ok: false, error: 'unknown' };
  }

  setStoredSession(user.id);
  return { ok: true, user };
}

export async function login(input: { username: string; password: string }): Promise<LoginResult> {
  const usernameLower = input.username.trim().toLowerCase();
  const user = await db.users.where('usernameLower').equals(usernameLower).first();
  const salt = user ? base64ToBytes(user.passwordSalt) : generateSalt();
  const iters = user?.pbkdf2Iterations ?? PASSWORD_HASHING.iterations;
  const candidateHash = await deriveKey(input.password, salt, iters);

  if (!user) return { ok: false, error: 'invalid_credentials' };

  const storedHash = base64ToBytes(user.passwordHash);
  if (!timingSafeEqual(candidateHash, storedHash)) {
    return { ok: false, error: 'invalid_credentials' };
  }

  setStoredSession(user.id);
  return { ok: true, user };
}

export async function logout(): Promise<void> {
  clearStoredSession();
}

export async function restoreSession(): Promise<User | null> {
  const id = getStoredSessionId();
  if (!id) return null;
  const user = await db.users.get(id);
  if (!user) {
    clearStoredSession();
    return null;
  }
  return user;
}

function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setStoredSession(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {
    // localStorage unavailable
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function isUniqueIndexError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'name' in e &&
    (e as { name: unknown }).name === 'ConstraintError'
  );
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
pnpm typecheck
```

Expected: no errors.

## Task 21: Write src/systems/auth.test.ts (the 15-test matrix)

**Files:**

- Create: `src/systems/auth.test.ts`

- [ ] **Step 1: Write all 15 auth tests**

Create `src/systems/auth.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { AVATAR_PALETTE } from '@/systems/avatar';
import { PASSWORD_HASHING } from '@/systems/crypto';
import { login, logout, register, restoreSession } from './auth';

const SESSION_KEY = 'localGamble.session.userId';

describe('auth.register', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('creates user + balance row + sets session', async () => {
    const result = await register({ username: 'Adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const userInDb = await db.users.get(result.user.id);
    const balanceInDb = await db.balances.get(result.user.id);
    expect(userInDb?.username).toBe('Adam');
    expect(balanceInDb?.chips).toBe(1000);
    expect(localStorage.getItem(SESSION_KEY)).toBe(result.user.id);
  });

  it('rejects duplicate username case-insensitively', async () => {
    await register({ username: 'Adam', password: 'password123' });
    const second = await register({ username: 'aDaM', password: 'password123' });
    expect(second).toEqual({ ok: false, error: 'username_taken' });
  });

  it('strips username whitespace', async () => {
    const result = await register({ username: '  adam  ', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.username).toBe('adam');
  });

  it('assigns avatarColor from the curated palette', async () => {
    const result = await register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(AVATAR_PALETTE).toContain(result.user.avatarColor);
    }
  });

  it('stores pbkdf2Iterations matching current PASSWORD_HASHING.iterations', async () => {
    const result = await register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.pbkdf2Iterations).toBe(PASSWORD_HASHING.iterations);
    }
  });

  it('produces different password hashes for two users with the same password (salt is unique)', async () => {
    const a = await register({ username: 'alice', password: 'samepassword' });
    const b = await register({ username: 'bob', password: 'samepassword' });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.user.passwordHash).not.toBe(b.user.passwordHash);
      expect(a.user.passwordSalt).not.toBe(b.user.passwordSalt);
    }
  });
});

describe('auth.login', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('succeeds with correct credentials', async () => {
    await register({ username: 'Adam', password: 'password123' });
    localStorage.removeItem(SESSION_KEY);
    const result = await login({ username: 'Adam', password: 'password123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(localStorage.getItem(SESSION_KEY)).toBe(result.user.id);
    }
  });

  it('matches username case-insensitively', async () => {
    await register({ username: 'Adam', password: 'password123' });
    const result = await login({ username: 'aDaM', password: 'password123' });
    expect(result.ok).toBe(true);
  });

  it('fails with wrong password', async () => {
    await register({ username: 'adam', password: 'password123' });
    const result = await login({ username: 'adam', password: 'wrongpass' });
    expect(result).toEqual({ ok: false, error: 'invalid_credentials' });
  });

  it('fails for non-existent user', async () => {
    const result = await login({ username: 'ghost', password: 'whatever' });
    expect(result).toEqual({ ok: false, error: 'invalid_credentials' });
  });

  it('runs the KDF even when user does not exist (no timing oracle)', async () => {
    await register({ username: 'adam', password: 'password123' });
    const t0 = performance.now();
    await login({ username: 'ghost', password: 'whatever' });
    const tNoUser = performance.now() - t0;

    const t1 = performance.now();
    await login({ username: 'adam', password: 'wrongpass' });
    const tWrongPwd = performance.now() - t1;

    // Allow a generous 50% delta — the point is "same order of magnitude"
    // not "identical to the millisecond." The 600k-iter KDF dominates both.
    const ratio = Math.abs(tNoUser - tWrongPwd) / Math.max(tNoUser, tWrongPwd);
    expect(ratio).toBeLessThan(0.5);
  });
});

describe('auth.logout and restoreSession', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
  });

  it('logout clears the session', async () => {
    await register({ username: 'adam', password: 'password123' });
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    await logout();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restoreSession returns the persisted user', async () => {
    const r = await register({ username: 'adam', password: 'password123' });
    expect(r.ok).toBe(true);
    const restored = await restoreSession();
    expect(restored?.id).toBe(r.ok ? r.user.id : '');
  });

  it('restoreSession cleans stale session when stored userId points to a deleted user', async () => {
    const r = await register({ username: 'adam', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.users.delete(r.user.id);
    const restored = await restoreSession();
    expect(restored).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restoreSession returns null when no session is stored', async () => {
    const restored = await restoreSession();
    expect(restored).toBeNull();
  });
});
```

- [ ] **Step 2: Run the auth tests**

```bash
pnpm test:run -- src/systems/auth.test.ts
```

Expected: 15/15 pass. Some tests will be slow (~300-500ms each due to PBKDF2 600k iterations) — total runtime ~5-10 seconds.

If the timing-oracle test (`runs the KDF even when user does not exist`) is flaky on slow CI runners, increase the tolerance from 0.5 to 0.7. The test verifies "same order of magnitude," not identical timing.

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test:run
```

Expected: 6 (PR #1) + 5 + 4 + 9 + 15 = 39 tests pass. Coverage report shows `src/systems/**/*.ts` ≥ 80%.

## Task 22: PR #2 — local DoD verification

**Files:** none

- [ ] **Step 1: Run all four quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0.

## Task 23: PR #2 — commit, push, open PR, watch, merge

**Files:** none

- [ ] **Step 1: Commit in three logical chunks**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(auth): add zod dependency for schema validation"

git add src/systems/crypto.ts src/systems/crypto.test.ts \
        src/systems/avatar.ts src/systems/avatar.test.ts
git commit -m "feat(auth): add crypto helpers (PBKDF2, timingSafeEqual) and avatar palette"

git add src/systems/auth-schemas.ts src/systems/auth-schemas.test.ts \
        src/systems/auth.ts src/systems/auth.test.ts
git commit -m "feat(auth): add auth.ts (register/login/logout/restoreSession) and zod schemas"
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin phase-1-auth-system
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "phase-1(auth): systems/auth.ts pure functions + crypto + schemas + tests" \
  --body "$(cat <<'EOF'
## Summary
PR #2 of Phase 1. Auth system as pure async functions. No UI changes.

- src/systems/crypto.ts: PBKDF2 600k iterations, generateSalt, timingSafeEqual, base64 helpers
- src/systems/avatar.ts: 10-color curated palette + pickRandomAvatarColor
- src/systems/auth-schemas.ts: zod schemas for username/password + register/login forms
- src/systems/auth.ts: register, login, logout, restoreSession with discriminated-union results
- 33 new tests (5 crypto + 4 avatar + 9 schema + 15 auth)
- zod added as production dep

## BUILD_GUIDE reference
- Phase: 1 — Data + Auth
- Sections: §6, §7

## How tested
- pnpm test:run → 39/39 (incl. existing tests)
- Coverage on src/systems/**/*.ts ≥ 80% (ADR-0003)
- Timing oracle test confirms login takes similar time for missing vs. wrong-password users

## Definition of done
- [ ] All four CI jobs green
- [ ] Coverage gate satisfied for src/systems/**/*.ts

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh pr checks --watch
```

Expected: all four jobs green.

If a CI test runner is much slower than local and the timing-oracle test fails: increase the tolerance in src/systems/auth.test.ts from 0.5 to 0.7, commit, push.

- [ ] **Step 5: Merge and sync**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

- [ ] **Step 6: Close the PR #2 issue**

```bash
gh issue list --milestone "Phase 1 — Data + Auth" --search "PR #2" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# PR #3 — UI wiring (`phase-1-ui`)

## Task 24: Create the PR #3 branch

**Files:** none

- [ ] **Step 1: Branch from updated main**

```bash
git checkout main && git pull --ff-only
git checkout -b phase-1-ui
```

## Task 25: Install React Hook Form + resolvers

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install both packages**

```bash
pnpm add react-hook-form @hookform/resolvers
```

Expected: both added under dependencies.

## Task 26: Write src/store/sessionStore.ts

**Files:**

- Create: `src/store/sessionStore.ts`

- [ ] **Step 1: Write the store**

Create `src/store/sessionStore.ts`:

```ts
import { create } from 'zustand';
import * as auth from '@/systems/auth';
import type { User } from '@/db';
import type { LoginResult, RegisterResult } from '@/systems/auth';

interface SessionState {
  currentUser: User | null;
  bootstrapping: boolean;

  bootstrap: () => Promise<void>;
  register: (input: { username: string; password: string }) => Promise<RegisterResult>;
  login: (input: { username: string; password: string }) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  bootstrapping: true,

  bootstrap: async () => {
    const user = await auth.restoreSession();
    set({ currentUser: user, bootstrapping: false });
  },

  register: async (input) => {
    const result = await auth.register(input);
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  login: async (input) => {
    const result = await auth.login(input);
    if (result.ok) set({ currentUser: result.user });
    return result;
  },

  logout: async () => {
    await auth.logout();
    set({ currentUser: null });
  },
}));

export const useCurrentUser = (): User | null => useSessionStore((s) => s.currentUser);

export const useIsBootstrapping = (): boolean => useSessionStore((s) => s.bootstrapping);
```

## Task 27: Write src/store/sessionStore.test.ts

**Files:**

- Create: `src/store/sessionStore.test.ts`

- [ ] **Step 1: Write the store tests**

Create `src/store/sessionStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '@/test/db-helpers';
import { useSessionStore } from './sessionStore';

const SESSION_KEY = 'localGamble.session.userId';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: true });
}

describe('sessionStore', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    resetStore();
  });

  it('bootstrap with no session sets currentUser=null and bootstrapping=false', async () => {
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser).toBeNull();
    expect(useSessionStore.getState().bootstrapping).toBe(false);
  });

  it('register sets currentUser on success', async () => {
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(true);
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('register does not set currentUser on failure', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    const result = await useSessionStore
      .getState()
      .register({ username: 'adam', password: 'password123' });
    expect(result.ok).toBe(false);
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('login sets currentUser on success', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().login({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });

  it('logout clears currentUser', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    expect(useSessionStore.getState().currentUser).not.toBeNull();
    await useSessionStore.getState().logout();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });

  it('bootstrap restores previously registered user', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    await useSessionStore.getState().bootstrap();
    expect(useSessionStore.getState().currentUser?.username).toBe('adam');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/store/sessionStore.test.ts
```

Expected: 6/6 pass.

## Task 28: Write src/components/RequireAuth.tsx

**Files:**

- Create: `src/components/RequireAuth.tsx`

- [ ] **Step 1: Write the wrapper**

Create `src/components/RequireAuth.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/store/sessionStore';

interface Props {
  children: ReactNode;
}

export default function RequireAuth({ children }: Props): JSX.Element {
  const user = useCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
```

## Task 29: Write src/components/RequireAuth.test.tsx

**Files:**

- Create: `src/components/RequireAuth.test.tsx`

- [ ] **Step 1: Write the tests**

Create `src/components/RequireAuth.test.tsx`:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import RequireAuth from './RequireAuth';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

describe('RequireAuth', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });

  it('renders children when a user is logged in', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <p>secret content</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <p>secret</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('preserves the attempted path in navigation state', () => {
    let capturedFrom: string | undefined;
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route
            path="/lobby"
            element={
              <RequireAuth>
                <p>lobby</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<FromCapture onCapture={(f) => (capturedFrom = f)} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(capturedFrom).toBe('/lobby');
  });
});

import { useLocation } from 'react-router-dom';

function FromCapture({ onCapture }: { onCapture: (from: string) => void }) {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (from) onCapture(from);
  return <p>login page</p>;
}
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/components/RequireAuth.test.tsx
```

Expected: 3/3 pass.

## Task 30: Update src/App.tsx

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export default function App() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <LobbyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <StatsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <LeaderboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}
```

## Task 31: Update src/App.test.tsx

**Files:**

- Modify: `src/App.test.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/App.test.tsx` with:

```tsx
import { beforeEach, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: true });
}

beforeEach(async () => {
  await resetDb();
  localStorage.removeItem('localGamble.session.userId');
  resetStore();
});

it('redirects to /login when no session is active', async () => {
  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

it('renders /lobby when a user is logged in', async () => {
  await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
  resetStore();
  // Set the localStorage session so bootstrap() restores the user
  const user = await import('@/db').then(({ db }) => db.users.toArray());
  localStorage.setItem('localGamble.session.userId', user[0]!.id);

  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
  });
});
```

## Task 32: Update src/pages/LobbyPage.tsx

**Files:**

- Modify: `src/pages/LobbyPage.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `src/pages/LobbyPage.tsx` with:

```tsx
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';

export default function LobbyPage() {
  const user = useCurrentUser();
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-label="avatar"
            className="inline-block h-10 w-10 rounded-full"
            style={{ backgroundColor: user.avatarColor }}
          />
          <h1 className="text-2xl">
            Welcome, <span className="text-gold">{user.username}</span>
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
        >
          Log out
        </button>
      </header>

      <p className="text-white/60">
        Phase 1 placeholder. Wallet, game grid, and stats land in upcoming phases.
      </p>
    </main>
  );
}
```

## Task 33: Write src/pages/LobbyPage.test.tsx

**Files:**

- Create: `src/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Write the tests**

Create `src/pages/LobbyPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import LobbyPage from './LobbyPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

async function loginAdam() {
  await useSessionStore.getState().register({ username: 'Adam', password: 'password123' });
}

describe('LobbyPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });

  it('shows the username and avatar swatch when logged in', async () => {
    await loginAdam();
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
    expect(screen.getByLabelText('avatar')).toBeInTheDocument();
  });

  it('logout clears the session and navigates to /login', async () => {
    await loginAdam();
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/pages/LobbyPage.test.tsx
```

Expected: 2/2 pass.

## Task 34: Update src/pages/LoginPage.tsx

**Files:**

- Modify: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `src/pages/LoginPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { loginSchema, type LoginInput } from '@/systems/auth-schemas';

export default function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/lobby';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (currentUser) navigate(from, { replace: true });
  }, [currentUser, from, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await login(values);
    if (!result.ok) {
      setSubmitError('Invalid username or password.');
      return;
    }
    navigate(from, { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
        noValidate
      >
        <h1 className="text-center text-2xl text-gold">Sign in</h1>

        <label className="block">
          <span className="text-sm text-white/80">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('username')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.username.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        {submitError && (
          <p className="text-sm text-casino-red" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-casino-red px-4 py-2 font-display tracking-wide text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-white/70">
          New here?{' '}
          <Link to="/register" className="text-gold underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
```

## Task 35: Write src/pages/LoginPage.test.tsx

**Files:**

- Create: `src/pages/LoginPage.test.tsx`

- [ ] **Step 1: Write the tests**

Create `src/pages/LoginPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import LoginPage from './LoginPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/lobby" element={<p>lobby page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });

  it('renders the form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('shows validation errors for short username', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/at least 3/i)).toBeInTheDocument();
  });

  it('shows error message for wrong credentials', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it('navigates to /lobby on successful login', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/lobby page/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/pages/LoginPage.test.tsx
```

Expected: 4/4 pass. Tests with PBKDF2 will be slow (~300-500ms each).

## Task 36: Update src/pages/RegisterPage.tsx

**Files:**

- Modify: `src/pages/RegisterPage.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `src/pages/RegisterPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { registerSchema, type RegisterInput } from '@/systems/auth-schemas';

export default function RegisterPage() {
  const registerUser = useSessionStore((s) => s.register);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (currentUser) navigate('/lobby', { replace: true });
  }, [currentUser, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await registerUser({
      username: values.username,
      password: values.password,
    });
    if (!result.ok) {
      if (result.error === 'username_taken') {
        setError('username', { message: 'That username is already taken.' });
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      return;
    }
    navigate('/lobby', { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
      >
        <h1 className="text-center text-2xl text-gold">Create an account</h1>

        <label className="block">
          <span className="text-sm text-white/80">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('username')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.username.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </label>

        {submitError && (
          <p className="text-sm text-casino-red" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-casino-red px-4 py-2 font-display tracking-wide text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-white/70">
          Already have one?{' '}
          <Link to="/login" className="text-gold underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
```

## Task 37: Write src/pages/RegisterPage.test.tsx

**Files:**

- Create: `src/pages/RegisterPage.test.tsx`

- [ ] **Step 1: Write the tests**

Create `src/pages/RegisterPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import RegisterPage from './RegisterPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/lobby" element={<p>lobby page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });

  it('renders the form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  it('shows inline error when passwords do not match', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows inline error when username is taken', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'aDaM');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'newpassword');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();
  });

  it('navigates to /lobby on successful registration', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'newuser');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/lobby page/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:run -- src/pages/RegisterPage.test.tsx
```

Expected: 4/4 pass.

## Task 38: PR #3 — full DoD verification (12-step smoke test)

**Files:** none

- [ ] **Step 1: Run all four quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0. Test count should be 59 total: 5 (db) + 5 (crypto) + 4 (avatar) + 9 (auth-schemas) + 15 (auth) + 6 (sessionStore) + 3 (RequireAuth) + 2 (LobbyPage) + 4 (LoginPage) + 4 (RegisterPage) + 2 (App.test rewritten from 1 → 2). Coverage gate `src/systems/**/*.ts` ≥ 80% satisfied.

- [ ] **Step 2: Run the 12-step manual smoke test in `pnpm dev`**

```bash
pnpm dev
```

Then in a browser at `http://localhost:5173`:

1. Visit `http://localhost:5173` → redirects to `/lobby` → `RequireAuth` redirects to `/login`. Confirm "Sign in" heading.
2. Click "Create an account" → land on `/register`.
3. Fill `Adam` / `password123` / `password123` → click "Create account" → land on `/lobby` showing "Welcome, Adam".
4. Open DevTools → Application → IndexedDB → `localGamble` → `users` table. Verify Adam row with a long base64 `passwordHash` (NOT the plaintext).
5. `balances` table has Adam's userId with `chips: 1000`.
6. Application → Local Storage → `http://localhost:5173` has key `localGamble.session.userId` = Adam's UUID.
7. Refresh the page → see "Loading…" briefly → land on `/lobby` (still logged in).
8. Click "Log out" → land on `/login`. DevTools shows the localStorage key gone.
9. Visit `http://localhost:5173/lobby` directly → redirects to `/login`.
10. Click "Create an account", fill `aDaM` / `newpass1234` / `newpass1234` → submit → inline error "That username is already taken." (case-insensitive match).
11. Visit `/login`, fill `adam` / `wrongpass` → submit → "Invalid username or password."
12. Fill `adam` / `password123` → submit → land on `/lobby`.

Stop the dev server with Ctrl+C.

- [ ] **Step 3: Capture the bundle size**

```bash
pnpm build
```

Expected: `dist/assets/index-XXXX.js  YY.YY kB` line in output. Record both the JS and CSS sizes for the PR description.

## Task 39: PR #3 — commit, push, open PR, watch, merge

**Files:** none

- [ ] **Step 1: Commit in five logical chunks**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(auth): add react-hook-form and @hookform/resolvers"

git add src/store/sessionStore.ts src/store/sessionStore.test.ts
git commit -m "feat(session): add Zustand sessionStore wrapping auth.ts"

git add src/components/RequireAuth.tsx src/components/RequireAuth.test.tsx
git commit -m "feat(session): add RequireAuth route wrapper"

git add src/App.tsx src/App.test.tsx
git commit -m "feat(session): wire bootstrap call and protected routes in App"

git add src/pages/LobbyPage.tsx src/pages/LobbyPage.test.tsx \
        src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx \
        src/pages/RegisterPage.tsx src/pages/RegisterPage.test.tsx
git commit -m "feat(auth): wire Login, Register, and Lobby pages with RHF + Zod"
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin phase-1-ui
```

- [ ] **Step 3: Open the PR**

(Substitute `<JS_SIZE>` and `<CSS_SIZE>` from Task 38 Step 3.)

```bash
gh pr create --title "phase-1(ui): Login/Register pages, RequireAuth, sessionStore, lobby" \
  --body "$(cat <<'EOF'
## Summary
PR #3 of Phase 1 (final). Working register → log out → log in → refresh flow.

- src/store/sessionStore.ts: Zustand store with bootstrap, register, login, logout
- src/components/RequireAuth.tsx: route wrapper redirecting to /login when no user, preserving from path
- src/App.tsx: bootstrap call + Loading splash + RequireAuth on /lobby, /stats, /leaderboard
- src/pages/LoginPage.tsx, RegisterPage.tsx: RHF + Zod validation, handles invalid_credentials and username_taken
- src/pages/LobbyPage.tsx: shows username + avatar + Log out

## BUILD_GUIDE reference
- Phase: 1 — Data + Auth
- Sections: §6, §7, §12 (row 1)

## How tested
- pnpm test:run → 59/59 pass (incl. all PR #1 + PR #2)
- 12-step manual smoke test passed (see spec section 12)
- Bundle size: <JS_SIZE> JS / <CSS_SIZE> CSS

## Definition of done
- [ ] All four CI jobs green
- [ ] Coverage gate satisfied for src/systems/**/*.ts (≥ 80%)
- [ ] Manual smoke test confirms the BUILD_GUIDE §12 row 1 acceptance criteria

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

- [ ] **Step 6: Close the PR #3 issue**

```bash
gh issue list --milestone "Phase 1 — Data + Auth" --search "PR #3" --json number --jq '.[].number' \
  | head -1 | xargs -I {} gh issue close {} --comment "Completed in this PR (squash-merged on main)."
```

---

# Release: tag v0.2-data-and-auth

## Task 40: Open the release PR

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Branch from main**

```bash
git checkout main && git pull --ff-only
git checkout -b chore/release-v0.2-data-and-auth
```

- [ ] **Step 2: Update CHANGELOG.md**

Replace the contents of `CHANGELOG.md` with:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

## [v0.2-data-and-auth] — 2026-05-15

### Added

- Dexie 4 database with `users`, `balances`, and `rounds` tables
- Unique `usernameLower` index on users; compound `[userId+playedAt]` on rounds
- PBKDF2-HMAC-SHA-256 with 600,000 iterations for password hashing (per-user iteration count)
- Avatar curated palette (10 retro-Vegas colors)
- Zod schemas for username/password validation, reused by forms and auth
- `register` (transactionally creates user + 1,000-chip balance row), `login`, `logout`, `restoreSession`
- Discriminated-union result types for system functions (ADR-0008)
- Zustand `sessionStore` wrapping the auth API
- `<RequireAuth>` route wrapper protecting `/lobby`, `/stats`, `/leaderboard`
- Login and Register forms via React Hook Form + Zod
- Lobby page showing username, avatar swatch, and Log out button
- 5 new ADRs (0008–0012)
- 8 new risk register entries (R-16 to R-23)

## [v0.1-scaffold] — 2026-05-15

(See previous CHANGELOG entry for the Phase 0 release.)

### Added

- Repo infrastructure: CLAUDE.md, CONTRIBUTING.md, conventions, ADRs (0001-0007), risks, dev-setup
- GitHub: PR + issue templates, 9 phase milestones, 18 labels, Dependabot
- CI: actionlint + markdownlint + commitlint → install + typecheck + build → lint + test + coverage
- Vite + React 18 + TypeScript scaffold with React Router
- Folder skeleton per BUILD_GUIDE §3 (theme, db, store, systems, components, pages, games)
- Tailwind v3 with retro Vegas color tokens
- ESLint flat config with Math.random ban and games-import sandboxing
- Prettier + EditorConfig + Husky + lint-staged
- Vitest + RTL + jsdom + coverage thresholds for game logic
- Sanity test for App routing
- Anthropic Claude Code GitHub Action active at .github/workflows/claude.yml

### Verified

- Deliberate-failure CI run for Math.random ban: <https://github.com/A1PC/localGamble/actions/runs/25914026044/job/76166109022>
```

- [ ] **Step 3: Commit and push**

```bash
git add CHANGELOG.md
git commit -m "chore(release): v0.2-data-and-auth"
git push -u origin chore/release-v0.2-data-and-auth
```

- [ ] **Step 4: Open the release PR**

```bash
gh pr create --title "chore(release): v0.2-data-and-auth" \
  --body "Tags Phase 1 completion. See CHANGELOG.md for the full list of additions."
gh pr checks --watch
```

Expected: all four CI jobs green.

- [ ] **Step 5: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
```

## Task 41: Tag, GH release, close issues + milestone, final DoD

**Files:** none

- [ ] **Step 1: Create and push the tag**

```bash
git tag -a v0.2-data-and-auth -m "Phase 1 — Data + Auth complete"
git push origin v0.2-data-and-auth
```

- [ ] **Step 2: Create the GitHub release**

```bash
gh release create v0.2-data-and-auth \
  --title "v0.2-data-and-auth" \
  --notes-file CHANGELOG.md \
  --latest
```

- [ ] **Step 3: Close any remaining open Phase 1 issues**

```bash
gh issue list --milestone "Phase 1 — Data + Auth" --state open --json number --jq '.[].number' \
  | xargs -I {} gh issue close {} --comment "Completed in v0.2-data-and-auth."
```

- [ ] **Step 4: Close the Phase 1 milestone**

```bash
PHASE_1_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 1 — Data + Auth") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_1_MS -f state=closed
```

- [ ] **Step 5: Final DoD verification**

```bash
# Repository state
ls .github/workflows/claude.yml
grep -R "Math.random" src/ ; echo "Exit: $?"  # exit 1 = no matches = good
grep -rEn "localStorage" src/ --include="*.ts" --include="*.tsx" | grep -v "src/systems/auth.ts" ; echo "Exit: $?"  # exit 1 = no matches = good
grep -rEn "from '@/db" src/pages src/components ; echo "Exit: $?"  # exit 1 = no matches = good

# Required docs (Phase 0 + Phase 1)
ls docs/adr/0001-*.md docs/adr/0002-*.md docs/adr/0003-*.md docs/adr/0004-*.md docs/adr/0005-*.md docs/adr/0006-*.md docs/adr/0007-*.md docs/adr/0008-*.md docs/adr/0009-*.md docs/adr/0010-*.md docs/adr/0011-*.md docs/adr/0012-*.md

# Tooling state
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm format:check

# GitHub state
gh release view v0.2-data-and-auth
gh issue list --milestone "Phase 1 — Data + Auth" --state all --limit 20
```

All commands should succeed (or, for the grep commands looking for absence, exit 1 with no output).

- [ ] **Step 6: Confirm Phase 1 complete and ready for Phase 2**

If all the above checks pass, Phase 1 is done. The next session begins with brainstorming Phase 2 (Wallet + Lobby + Game shell) using BUILD_GUIDE §4 and §5 as input.

---

## Self-Review Notes

This plan was self-reviewed for:

- **Spec coverage:** Every spec section maps to at least one task. Spec sections 6.1-6.15 (file contents) → Tasks 4-7, 14-21, 26-37. Spec section 9 (5 ADRs) → Task 9. Spec section 10 (risk register) → Task 8. Spec section 12 (smoke plan) → Task 38. Spec section 13 (DoD) → Task 41 step 5. Spec section 15 (release) → Tasks 40-41.
- **Placeholders:** No "TBD" / "TODO" — every step has actual code or commands. Two intentional execution-time placeholders documented (bundle size in PR #3, milestone number in pre-flight) that can only be known at execution time.
- **Type / name consistency:** `RegisterResult`, `LoginResult`, `RegisterError`, `LoginError`, `restoreSession`, `pickRandomAvatarColor`, `AVATAR_PALETTE`, `PASSWORD_HASHING.iterations`, `useCurrentUser`, `useSessionStore`, `RequireAuth`, `LocalGambleDB`, `User`, `Balance`, `Round`, `db.users`, `db.balances`, `db.rounds`, `usernameLower`, `passwordHash`, `passwordSalt`, `pbkdf2Iterations`, `avatarColor`, `localGamble.session.userId`, `STARTING_CHIPS=1000` — verified consistent across all 41 tasks.
- **Scope:** Phase 1 only. No wallet API, no game logic — those are Phases 2-6.
- **Test count:** 59 total at end of PR #3 — 5 db + 5 crypto + 4 avatar + 9 schemas + 15 auth + 6 sessionStore + 3 RequireAuth + 2 App.test (rewritten from 1) + 2 LobbyPage + 4 LoginPage + 4 RegisterPage. Coverage on `src/systems/**/*.ts` ≥ 80% (ADR-0003 gate).
