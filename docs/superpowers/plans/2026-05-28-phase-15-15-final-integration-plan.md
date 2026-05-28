# Phase 15 #15 — Final Integration & Launch Polish (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`. One fresh implementer subagent per PR; the controller (current Claude session) reviews diffs, watches CI, and merges squash + delete on green. **Subagents MUST NOT merge.** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the MASQUER overhaul with a comprehensive audit + per-game polish + perf split + manual smoke checklist + v1.0 tag prep — 18 PRs in release order, ending with the repo staged for the `v1.0` tag.

**Architecture:** Single sub-project, 18 PRs. PR A (read-only audit) produces a punch list that drives the next 14 PRs (B + G1–G13). PR C (perf) and PR D (smoke checklist) follow. PR E ships the closing chore. All PRs branch off the latest `main`. The controller pulls between every PR so each subagent sees fresh state.

**Tech stack:** React 18 + React Router 7 + Vite 5 + TypeScript 5 strict (`exactOptionalPropertyTypes`) + Tailwind 3 (tokens only) + Framer Motion 12 + Vitest 2 + Playwright (controller-side smoke).

**Sequencing:** **Sequential pacing.** User issues an explicit "start next" prompt between PRs (per `feedback_phase15_game_sub_project_order`). The controller never auto-dispatches the next PR.

---

## Pre-flight (run once before PR A)

- [ ] **Step 1: Verify clean main**
  ```bash
  git checkout main && git pull --ff-only
  git status   # must be clean
  ```
- [ ] **Step 2: Verify baseline DoD on main is green**
  ```bash
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm exec prettier --check .
  ```
  Any failure here is a pre-existing flake — handle as a tiny separate PR before proceeding (this is the same pattern that cleared the coin-flip flake before #305 and the blackjack flake will likely need before PR G2).
- [ ] **Step 3: Snapshot baseline bundle size for PR C comparison**
  ```bash
  pnpm build 2>&1 | tee /tmp/baseline-bundle.txt
  ```
  Save the entry-chunk gzipped size. Used by PR C's DoD to verify the ≤ 350 KB budget and the ≥ 20 % drop target.

---

## PR A — Cross-screen consistency audit (read-only)

**Branch:** `phase-15-15-pr-a-audit`

**Files:**

- Create: `docs/superpowers/specs/2026-05-28-phase-15-15-audit.md`
- Modify: none

**Subagent:** `general-purpose`, fresh instance. Worktree isolation NOT needed (docs-only).

**Verbatim brief to subagent (copy-paste):**

```text
Run a read-only consistency audit of localGamble in preparation for v1.0
launch. Produce the audit doc at the path below. NO code changes. NO test
changes.

Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §4.
Use Playwright at 1440×900 to visually inspect every route after starting
`pnpm dev` in a background task. Use grep / Read to inspect components for
drift. Apply the rubric in §4.3 (design-system drift, interaction & a11y,
empty/zero states, micro-copy, per-game cold-look).

Produce the doc at docs/superpowers/specs/2026-05-28-phase-15-15-audit.md
with the EXACT structure shown in §4.2 of the spec. Populate:
  - §1 Cross-cutting findings (§1.1 ui primitives, §1.2 app shell, §1.3 admin
    chrome, §1.4 auth surfaces, §1.5 lobby/stats/leaderboard/settings/profile).
  - §2 Per-game findings (one subsection per game, 2.1 through 2.13).
  - §3 Empty/zero-state matrix (per-page table).
  - §4 Summary (counts by severity, cross-cutting count, per-game count).

Every finding follows the shape: `- [P1|P2|P3] <surface> · <finding> · <fix>`.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b phase-15-15-pr-a-audit

Open the PR with title:
  "phase-15(#15) PR A: cross-screen consistency audit"

PR body: explain this is a docs-only audit; findings drive PRs B and G1–G13.
DoD: `pnpm exec prettier --check .` must pass for the new markdown file.
DO NOT modify any *.ts / *.tsx / *.css / package.json. DO NOT merge.
```

**Controller workflow:**

- [ ] **A.1: Dispatch the subagent** with the verbatim brief above.
- [ ] **A.2: When subagent returns**, fetch the PR # and skim the audit doc end-to-end. Score it against §4.3 of the spec: does it cover every rubric category? If a category is missing, comment on the PR and ask the subagent to extend (do NOT re-dispatch a fresh subagent unless the gap is large).
- [ ] **A.3: Watch CI.** Only `Meta files` and `Prettier` should run (docs-only). If anything else runs and fails, the subagent touched code it shouldn't have — revert and re-dispatch.
- [ ] **A.4: User review gate** — link the PR to the user and wait for explicit approval. The audit findings drive 14 downstream PRs, so the user reviewing them now is high-leverage.
- [ ] **A.5: Merge once approved** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **A.6: Pull main** — `git checkout main && git pull --ff-only`.

---

## PR B — Cross-cutting audit fixes

**Branch:** `phase-15-15-pr-b-cross-cutting`

**Files (surfaces; exact files depend on audit findings):**

- Modify: `src/components/ui/**/*.tsx` (70 primitive files — Button, Card, Field, Input, Modal, Toast, EmptyState, Chip, Badge, Checkbox, Divider, DropdownMenu, Icon, etc.)
- Modify: `src/components/AppLayout.tsx`, `src/components/TopBar.tsx`, `src/components/Sidebar.tsx`, `src/components/SidebarItem.tsx`
- Modify: `src/components/RequireAuth.tsx`, `src/components/RequireAdmin.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx` + any admin chrome under `src/components/admin/`
- Modify: `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/BannedOverlay.tsx`
- Modify: `src/pages/LobbyPage.tsx`, `src/pages/stats/*.tsx`, `src/pages/leaderboard/*.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/ProfilePage.tsx`
- Modify: `src/components/ui/*.stories.tsx` where component API changes
- Modify: `src/components/ui/*.test.tsx` where component API changes
- DO NOT touch: anything under `src/games/**` (those are PRs G1–G13)

**Subagent:** `general-purpose`, fresh instance.

**Verbatim brief to subagent:**

```text
Implement PR B of Phase 15 sub-project #15 per the design spec at
docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §5.

Findings to address: docs/superpowers/specs/2026-05-28-phase-15-15-audit.md §1
(the entire "Cross-cutting findings" section — §1.1 through §1.5).

Apply EVERY P1 and P2 finding. P3s are optional in this PR. For findings that
need a design-spec consultation you can't resolve (e.g. "this empty state
needs a new illustration"), leave a `// TODO(#15-followup): <one-line>` marker
in the relevant code and call it out in the PR body's "Deferred" section.

Constraints (HARD):
  - DO NOT touch any file under src/games/** — those are reserved for G1–G13.
  - DO NOT add new shared components; mark TODO and continue.
  - DO NOT modify CLAUDE.md.
  - DO NOT modify BUILD_GUIDE.md (PR E does that).
  - DO NOT modify any ADR.
  - DO NOT modify any *.ts logic file under src/systems/ unless the audit
    flagged it as cross-cutting AND the change is presentational only.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b phase-15-15-pr-b-cross-cutting

Update story files in src/**/*.stories.tsx when a component's API surface
changes. Update component tests when a component's API surface changes.

After implementation, run the full DoD locally:
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .

Then start `pnpm dev` in a background task and use Playwright at 1440×900 to
capture screenshots of every shell-level surface:
  - Lobby (/lobby)
  - Stats overview (/stats)
  - Leaderboard overview (/leaderboard)
  - Settings (/settings)
  - Profile (/profile)
  - Login (/login)
  - Banned overlay (sign in as a banned user — admin must ban one first)
  - Admin overview (/admin)
  - Admin Users (/admin/users)

Attach all screenshots to the PR body under a "States walkthrough" heading.

Open the PR with title shape (≤ 100 chars):
  "phase-15(#15) PR B: cross-cutting audit fixes — <summary>"

Where <summary> is a short list like "ui drift + focus rings + empty states".

DO NOT merge.
```

**Controller workflow:**

- [ ] **B.1: Dispatch** the subagent with the verbatim brief.
- [ ] **B.2: Review the diff** — `gh pr diff <#>`. Spot-check for:
  - No file under `src/games/**` touched (`git diff main -- src/games/ | wc -l` should be 0).
  - No ADR touched.
  - Hard-coded hex codes have been replaced with tokens (search the diff for `#[0-9a-fA-F]{3,8}`).
  - Every P1 in audit §1 either has a fix in the diff OR has a `// TODO(#15-followup):` marker.
- [ ] **B.3: Watch CI**. If the blackjack flake fires (per the history with #304 / #305), peel off a tiny fix PR using the same `waitFor` pattern that fixed coin-flip in PR #306, merge, rebase B onto main, force-push.
- [ ] **B.4: Merge on green** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **B.5: Pull main** — `git checkout main && git pull --ff-only`.
- [ ] **B.6: Run baseline DoD** to catch any cross-game regression — `pnpm lint && pnpm typecheck && pnpm exec vitest run`.

---

## PRs G1–G13 — Per-game cold-look polish

These 13 PRs all follow the same controller workflow + subagent brief template, parameterised on the game. They run **sequentially in release order**, one per "start next" prompt from the user.

### Shared per-game subagent brief template

Replace `<N>`, `<game>`, `<branch>`, `<commit-scope>`, `<game-files-root>`, and `<audit-section-number>` per the table in spec §6.2.

```text
Implement PR G<N> of Phase 15 sub-project #15 — cold-look polish for <game>.

Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §6.
Audit findings for this game: docs/superpowers/specs/2026-05-28-phase-15-15-audit.md §2.<N>.

Follow the cold-look protocol in spec §6.3:
  Step 1: Read your audit subsection. That's the seed punch list.
  Step 2: Start `pnpm dev` in a background task. Open Playwright at 1440×900.
          Walk every state of the game:
            - Empty / pre-bet state
            - Bet placed / in-progress state
            - Mid-game decision state(s)
            - Settle / outcome state (win / loss / push / jackpot tier)
            - Banned-user state (admin must ban a test user first)
            - Zero-chip state (admin must drain a test user first)
            - Mid-round refresh (where applicable — e.g. blackjack, craps)
          Screenshot each. Collect into the PR body under "States walkthrough".
  Step 3: Apply the rubric:
            VISUAL — spacing, alignment, contrast, animation feel.
            INTERACTION — button states, focus rings, micro-copy, kbd nav,
                          touch targets ≥ 44 px.
            SMALL UX WINS — missing affordances, friction fixes, small bugs
                            that DON'T touch game logic.
          Anything that fails the rubric is a finding.
  Step 4: Apply fixes. ADDITIVE CONSTRAINT — DO NOT touch:
            - Any *.ts file under <game-files-root>/ that isn't *.tsx.
              (logic files, machines, _shared/ pure modules stay byte-stable)
            - Any *.test.ts file for logic (UI .test.tsx files MAY be updated).
            - Any ADR.
            - Any file in src/systems/ unless the change is presentational
              only and clearly required.
  Step 5: Run full DoD:
            pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .

Update story files (`*.stories.tsx`) when component API changes.
Update UI tests (`*.test.tsx`) when component behaviour changes; never
weaken a logic test.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b <branch>

Open the PR with title shape (≤ 100 chars):
  "phase-15(#15.g<N>) <commit-scope>: cold-look polish — <one-line summary>"

Examples of the summary suffix:
  "focus ring on flip-side, settle-state aria-live"
  "empty-tickets state, balance label sentence-case"

PR body: include the audit-subsection punch list as a checkbox list and tick
each item as fixed; add a "Deferred" section if any P3s remain; attach the
walkthrough screenshots.

DO NOT merge.
```

### Per-game PR parameters

| PR  | N   | game           | branch                          | commit-scope | game-files-root                   | audit-section |
| --- | --- | -------------- | ------------------------------- | ------------ | --------------------------------- | ------------- |
| G1  | 1   | Coin-flip      | `phase-15-15-g1-coin-flip`      | `coin-flip`  | `src/games/coin-flip/`            | §2.1          |
| G2  | 2   | Blackjack      | `phase-15-15-g2-blackjack`      | `blackjack`  | `src/games/blackjack/`            | §2.2          |
| G3  | 3   | Roulette       | `phase-15-15-g3-roulette`       | `roulette`   | `src/games/roulette/`             | §2.3          |
| G4  | 4   | Slots          | `phase-15-15-g4-slots`          | `slots`      | `src/games/slots/`                | §2.4          |
| G5  | 5   | Baccarat       | `phase-15-15-g5-baccarat`       | `baccarat`   | `src/games/baccarat/`             | §2.5          |
| G6  | 6   | Lottery        | `phase-15-15-g6-lottery`        | `lottery`    | `src/pages/lottery/`              | §2.6          |
| G7  | 7   | Bingo British  | `phase-15-15-g7-bingo-british`  | `bingo`      | `src/games/bingo/british/`        | §2.7          |
| G8  | 8   | Bingo American | `phase-15-15-g8-bingo-american` | `bingo`      | `src/games/bingo/american/`       | §2.8          |
| G9  | 9   | Plinko         | `phase-15-15-g9-plinko`         | `plinko`     | `src/games/plinko/`               | §2.9          |
| G10 | 10  | Hold'em        | `phase-15-15-g10-holdem`        | `poker`      | `src/games/poker/holdem/`         | §2.10         |
| G11 | 11  | Five-Card Draw | `phase-15-15-g11-five-card`     | `poker`      | `src/games/poker/five-card-draw/` | §2.11         |
| G12 | 12  | Omaha          | `phase-15-15-g12-omaha`         | `poker`      | `src/games/poker/omaha/`          | §2.12         |
| G13 | 13  | Craps          | `phase-15-15-g13-craps`         | `craps`      | `src/games/craps/`                | §2.13         |

> **Note on Lottery (G6):** Lottery is a top-level page (ADR-0040), not under `src/games/`. The additive constraint for G6 applies to `src/systems/lottery.ts`, `src/systems/lottery-unread.ts`, and `src/pages/lottery/useLotteryCart.ts` — those are logic and stay byte-stable; presentational components like `LotteryPage.tsx`, `HeroSection.tsx`, `YourTicketsSlide.tsx`, `HistorySlide.tsx`, `NumberGrid.tsx`, `TicketCart.tsx`, `FavoritesDropdown.tsx`, `DrawAnimationModal.tsx`, `LotteryRules.tsx` are in scope.

> **Note on Bingo British/American (G7/G8):** Shared bingo components under `src/games/bingo/_shared/` (if any) may be touched by EITHER G7 or G8 but not both. Whichever runs second must not regress the first. The audit subsection §2.7 vs §2.8 must distinguish "British-only" vs "shared" findings.

> **Note on Poker trio (G10/G11/G12):** Shared poker chrome (`src/games/poker/_shared/`) was already swept in #12.v1. Per-game PRs G10–G12 focus on each variant's page-specific surfaces; any shared-poker finding belongs in G10 (lock the language) with G11/G12 inheriting.

### Per-game controller workflow (run once per G-PR, in release order, on user "start next" prompt)

- [ ] **G<N>.1: User prompts "start next"** (or names the game directly).
- [ ] **G<N>.2: Verify main is current** — `git checkout main && git pull --ff-only`.
- [ ] **G<N>.3: Dispatch subagent** with the templated brief above, substituting `<N>`, `<game>`, etc. from the per-game parameter table.
- [ ] **G<N>.4: Review the diff** when subagent returns:
  ```bash
  gh pr diff <#> -- '<game-files-root>**/*.ts' ':!<game-files-root>**/*.tsx' ':!<game-files-root>**/*.test.tsx'
  ```
  Output should be **empty** — non-tsx logic byte-stable. If non-empty, the subagent broke the additive constraint; revert and re-dispatch with a tighter brief.
- [ ] **G<N>.5: Verify walkthrough screenshots are attached** to the PR body. If missing, comment + ask subagent.
- [ ] **G<N>.6: Watch CI**. Handle pre-existing flakes as separate tiny PRs (see PR B.3).
- [ ] **G<N>.7: Merge on green** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **G<N>.8: Pull main + run baseline DoD** to catch cross-game regression:
  ```bash
  git checkout main && git pull --ff-only
  pnpm exec vitest run
  ```
- [ ] **G<N>.9: Report to user** the PR # + a 1-sentence summary; wait for next "start next" prompt before dispatching G<N+1>.

---

## PR C — React.lazy per-game bundle splitting (consolidation + cleanup)

**Branch:** `phase-15-15-pr-c-lazy`

**Important context (controller knows; subagent will be told):** Most lazy splitting is already done in `src/router.tsx`. This PR is **mostly a consolidation + cleanup task**, NOT a from-scratch migration. Current state:

- ✅ Already lazy: `LotteryPage`, `BingoPage`, `PlinkoPage`, `CrapsPage`, `HoldemPage`, `FiveCardDrawPage`, `OmahaPage`, `PokerLobbyPage`, `StatsPage`, `LeaderboardPage`, all admin routes.
- ❌ Still eager: `LoginPage`, `RegisterPage`, `LobbyPage`, `ProfilePage`, `SettingsPage`, `CoinFlipPage`, `BlackjackPage`, `RoulettePage`, `SlotsPage`, `BaccaratPage`.
- ❌ Suspense fallbacks are inlined 7 times (each ~10 lines) with `bg-felt-deep` (stale token) + `min-h-screen` (memory: `feedback_localgamble_min_h_screen_in_pages` says page roots under AppLayout must use `h-full`).

**Files:**

- Create: `src/components/RouteFallback.tsx` (new shared fallback component)
- Create: `src/components/RouteFallback.stories.tsx`
- Create: `src/components/RouteFallback.test.tsx`
- Create: `src/router/usePrefetchOnHover.ts` (new hook for sidebar prefetch hints) — note: `src/router/` doesn't exist yet, create it
- Create: `src/router/usePrefetchOnHover.test.ts`
- Modify: `src/router.tsx` (convert 5 remaining eager game imports to `lazy()`; replace 7 inline Suspense fallbacks with `<RouteFallback />`)
- Modify: `src/components/Sidebar.tsx` (wire `usePrefetchOnHover` onto each sidebar Link to a lazy route)
- Modify: `src/components/Sidebar.test.tsx` (test the prefetch hint emission)

**Subagent:** `general-purpose`, fresh instance.

**Verbatim brief to subagent:**

```text
Implement PR C of Phase 15 sub-project #15 — React.lazy per-game bundle
splitting consolidation. Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §7.

CURRENT STATE (read this before changing anything):
  - Most lazy splitting is already done in src/router.tsx. This PR is a
    consolidation + cleanup task, NOT a from-scratch migration.
  - Already lazy: LotteryPage, BingoPage, PlinkoPage, CrapsPage, HoldemPage,
    FiveCardDrawPage, OmahaPage, PokerLobbyPage, StatsPage,
    StatsOverviewPage, StatsPerGamePage, LeaderboardPage,
    LeaderboardOverviewPage, LeaderboardPerGamePage, all admin routes.
  - Still eagerly imported (top of src/router.tsx, lines ~8–17):
    LoginPage, RegisterPage, LobbyPage, ProfilePage, SettingsPage,
    CoinFlipPage, BlackjackPage, RoulettePage, SlotsPage, BaccaratPage.
  - Suspense fallbacks are inlined 7 times with stale tokens:
    `bg-felt-deep` (should be `bg-velvet-deep`) and `min-h-screen` (memory
    feedback-localgamble-min-h-screen-in-pages says page roots under AppLayout
    must use `h-full`, not `min-h-screen`).

WHAT TO DO:

Step 1. Create src/components/RouteFallback.tsx — a brand-matching loading
  fallback that honors useEffectiveReducedMotion:
  - bg-velvet-deep, text-ivory/40
  - h-full (NOT min-h-screen) so it works inside AppLayout
  - Centered: small brass-tinted spinner above an "Loading…" line
    (or a static glow circle under reduced-motion)
  - Optional `label` prop (default "Loading…") so callers can say
    "Loading admin…" / "Loading stats…" etc. without rebuilding the chrome
  - data-route-fallback attribute for testing
  - Export default function. JSX.Element return.
  Add src/components/RouteFallback.stories.tsx (default, reduced-motion,
  labelled variants) and src/components/RouteFallback.test.tsx
  (renders fallback, respects label, has data-route-fallback).

Step 2. Create src/router/usePrefetchOnHover.ts — a tiny hook that returns
  onMouseEnter / onFocus handlers which call a module-level Map<string,
  () => Promise<unknown>> of prefetcher fns. The factory accepts a key string
  (e.g. 'coin-flip') and resolves to a no-op when the chunk is already in
  flight. Implementation sketch:

    const inflight = new Set<string>();
    const prefetchers = new Map<string, () => Promise<unknown>>();

    export function registerPrefetcher(key: string, fn: () => Promise<unknown>) {
      prefetchers.set(key, fn);
    }

    export function usePrefetchOnHover(key: string) {
      return useMemo(() => {
        const prefetch = () => {
          if (inflight.has(key)) return;
          const fn = prefetchers.get(key);
          if (!fn) return;
          inflight.add(key);
          fn().catch(() => inflight.delete(key));
        };
        return { onMouseEnter: prefetch, onFocus: prefetch };
      }, [key]);
    }

  Add src/router/usePrefetchOnHover.test.ts — assert that:
    - The handler is a no-op if no prefetcher registered for the key.
    - The first invocation calls the prefetcher; subsequent invocations don't.
    - onFocus and onMouseEnter both work.

Step 3. Update src/router.tsx:
  3a. Convert these 5 eager game imports to lazy():
        CoinFlipPage, BlackjackPage, RoulettePage, SlotsPage, BaccaratPage
  3b. While you're there, also convert these (small but eager):
        LoginPage, RegisterPage, LobbyPage, ProfilePage, SettingsPage
      These aren't part of the spec's "per-game" rule but they're tiny,
      eagerly-loaded, and dropping them out of the main chunk is free.
  3c. Replace the 7 inline Suspense fallbacks (statsFallback, adminFallback,
      and the five inline `<div>` fallbacks) with `<RouteFallback />`
      (admin fallback gets label="Loading admin…", stats fallback gets
      label="Loading stats…", game fallbacks get label="Loading <game>…").
  3d. Inline statsFallback + adminFallback consts can be deleted.
  3e. For each game route, wrap the lazy element in `<Suspense fallback=
      {<RouteFallback label="..." />}>` exactly as the existing lazy poker /
      bingo / plinko / craps routes already do.
  3f. After each lazy(): call registerPrefetcher with that route's key. e.g.:

        const CoinFlipPage = lazy(() => import('@/games/coin-flip/CoinFlipPage'));
        registerPrefetcher('coin-flip', () => import('@/games/coin-flip/CoinFlipPage'));

      The import path must be IDENTICAL to the lazy() call so Vite dedupes.

Step 4. Update src/components/Sidebar.tsx:
  4a. Import usePrefetchOnHover.
  4b. For each sidebar Link to a lazy game route, call
      usePrefetchOnHover(<key>) and spread the returned handlers onto the
      Link (`<Link {...prefetchHandlers} ...>`).
  4c. Keys must match the registerPrefetcher() keys in router.tsx exactly.
  4d. Update src/components/Sidebar.test.tsx if hover-triggered prefetch is
      observable from the test (it usually isn't — the registered fn is
      module-private; a simple spy on the handler call shape is enough).

Step 5. Run full DoD:
  pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .

  Capture the build output for the PR body. Note the entry chunk size (the
  one labelled like `dist/assets/index-<hash>.js`). Compare with
  /tmp/baseline-bundle.txt (captured during pre-flight) and quote both
  numbers in the PR body. Target: entry chunk ≤ 350 KB gzipped, and ≥ 20 %
  drop vs baseline.

Step 6. Smoke each game route manually with Playwright at 1440×900:
  - Clear cache / use a private context.
  - Navigate to /lobby. Observe sidebar.
  - Hover each game tile in the sidebar. (DevTools Network tab — confirm
    a prefetch fires per hover.)
  - Click each game. Confirm RouteFallback flashes (no white-flash, no
    layout jank), then the game renders.
  Attach a Network-tab screenshot + a fallback screenshot to the PR body.

Constraints:
  - DO NOT touch any file under src/games/** (no game-internal changes here).
  - DO NOT change route paths or route children — only the element bindings.
  - DO NOT add new route segments.
  - DO NOT modify CLAUDE.md / BUILD_GUIDE.md / any ADR.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b phase-15-15-pr-c-lazy

Open the PR with title (≤ 100 chars):
  "phase-15(#15) PR C: React.lazy consolidation + RouteFallback + prefetch-on-hover"

DO NOT merge.
```

**Controller workflow:**

- [ ] **C.1: Dispatch** the subagent with the verbatim brief.
- [ ] **C.2: Review the diff** — focus on `src/router.tsx`:
  - All 10 lazy promotions made.
  - All 7 inline fallbacks replaced with `<RouteFallback />`.
  - `bg-felt-deep` no longer appears in router.tsx (`git diff main -- src/router.tsx | grep felt-deep` should be empty).
  - `min-h-screen` no longer appears in the fallbacks (use `h-full`).
- [ ] **C.3: Verify bundle budget** — read the PR body, confirm the captured numbers show entry chunk ≤ 350 KB gzipped + ≥ 20% drop.
- [ ] **C.4: Verify smoke screenshots attached.**
- [ ] **C.5: Watch CI**.
- [ ] **C.6: Merge on green** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **C.7: Pull main**.

---

## PR D — Manual smoke checklist + leftovers

**Branch:** `phase-15-15-pr-d-smoke`

**Files:**

- Create: `docs/MANUAL_SMOKE_v1.md` (canonical smoke checklist; structure pre-defined in spec §8.2)
- Modify: any leftover P1/P2 code surfaces surfaced while authoring the checklist (rare but allowed)

**Subagent:** `general-purpose`, fresh instance.

**Verbatim brief to subagent:**

```text
Implement PR D of Phase 15 sub-project #15 — manual smoke checklist.
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §8.

Deliverable 1: docs/MANUAL_SMOKE_v1.md with the EXACT structure shown in spec
§8.2. Populate:
  - §0 Reset (private-window OR admin DANGER ZONE wipe + verify fresh state)
  - §1 Auth surfaces (register, login, logout, restore, banned, reserved name)
  - §2 Shell (TopBar credits, sidebar collapse, lobby cabinet, settings volume
    + persist, profile avatar + username uniqueness)
  - §3 Per-game (one §3.x subsection per game; for each game write the GOLDEN
    PATH + 3–5 edge cases. Use the audit doc's §2.x for edges to include.)
  - §4 Admin (overview KPIs, leaderboard tabs, users ban/unban/adjust,
    DANGER ZONE confirm, per-game admin pages, DateRangeFilter, sessions
    search/filter/paginate, audit search/filter/paginate)
  - §5 Empty / zero states (fresh DB matrix, no rounds, zero chips per game,
    banned user, lottery pre-draw without past draws)
  - §6 A11y spot checks (focus rings, VoiceOver chip counts, reduced-motion)
  - §7 Sound (volume slider, mute persistence, no autoplay-blocked noise)
  - §8 Build / perf (pnpm build, main chunk ≤ 350 KB, cold-load each game,
    pnpm build-storybook)
  - §9 Sign-off (all P1/P2 ticked, no console errors, tag-ready)

Every checkbox item must be concrete and observable. Do NOT write vague
"verify it works"; write "place a 25-chip bet on heads → flip → result row
in /stats → balance updated in TopBar".

Methodology: WALK every section through Playwright at 1440×900 yourself while
writing. This catches any leftover paper cuts. If you find a P1 or P2 issue
that wasn't already in the audit (or that survived PRs B / G1–G13), FIX IT
IN THIS PR — keep the code change as small and surgical as possible.

For Step 7 (sound section), assume the audio engine is available (it
auto-plays on first user gesture — the smoke step is "click any button to
unlock audio, then verify volume slider affects subsequent sounds").

Constraints:
  - DO NOT touch BUILD_GUIDE.md (PR E does that).
  - DO NOT touch CLAUDE.md.
  - DO NOT touch any ADR.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b phase-15-15-pr-d-smoke

DoD:
  - docs/MANUAL_SMOKE_v1.md exists with all 10 sections populated.
  - Every "[ ]" item is concrete + observable.
  - pnpm exec prettier --check . passes.
  - If code was changed for leftovers, full DoD passes:
      pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .

Open PR with title (≤ 100 chars):
  "phase-15(#15) PR D: manual smoke checklist v1.0 + leftover polish"

DO NOT merge.
```

**Controller workflow:**

- [ ] **D.1: Dispatch** subagent.
- [ ] **D.2: Review the checklist** for completeness against the spec §8.2 skeleton — every section present, every game has a §3.x subsection with at least 1 golden + 3 edges.
- [ ] **D.3: Spot-check 3 random checklist items** — each must be specific enough that a stranger could run it.
- [ ] **D.4: Watch CI** (may include code if leftover fixes landed).
- [ ] **D.5: Merge** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **D.6: Pull main**.

---

## PR E — Closing pass / v1.0 tag prep

**Branch:** `phase-15-15-pr-e-close`

**Files:**

- Modify: `BUILD_GUIDE.md` (Phase 15 progress block → #15 ✅ Done; add v1.0 header)
- Modify: `docs/adr/*.md` ONLY where stale relative to shipped state — add a "Status: Superseded by …" footer or an "Amendments" section; do NOT rewrite ADR bodies
- Modify: `package.json` (`"version": "1.0.0"`)
- Create or modify: `CHANGELOG.md` (prepend `## 1.0.0 — 2026-05-XX (MASQUER · v1.0)` section)
- Modify: `README.md` (add a "v1.0 launch (2026-05-XX)" sentence at the top — only if a README exists)

**Subagent:** `general-purpose`, fresh instance.

**Verbatim brief to subagent:**

```text
Implement PR E of Phase 15 sub-project #15 — closing pass.
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §9.

NO code changes in src/. ADMIN-ONLY changes:

Step 1. BUILD_GUIDE.md updates:
  1a. In the Phase 15 progress block (search for "10 of 16 shipped" or the
      current count), update sub-project #15 status to "✅ Done".
  1b. Bump the overall count from "X of 16 shipped" to "16 of 16 shipped".
  1c. Append a "v1.0 (2026-05-XX)" header section near the bottom of the
      Phase 15 area summarising the overhaul:
        - All 14 gameplay phases shipped pre-overhaul.
        - MASQUER · Velvet Deco design system covers every surface.
        - Per-game React.lazy bundle splitting; main chunk ≤ 350 KB gzipped.
        - Comprehensive admin layer.
        - Manual smoke checklist captured at docs/MANUAL_SMOKE_v1.md.

Step 2. ADR housekeeping. SCAN docs/adr/ for any ADR whose subject is
  superseded by a Phase 15 sub-project (e.g. an ADR about pre-MASQUER
  components or a pattern that's been replaced). For each:
    - If the ADR is fully superseded, add a footer line at the bottom:
        "**Status:** Superseded by Phase 15 #<N> (<link to spec>)."
    - If the ADR's intent is still load-bearing but specifics drifted, add
      an "## Amendments" section listing the changes (one bullet per change,
      one-line each, referencing the Phase 15 sub-project).
  Do NOT rewrite ADR bodies. Do NOT remove ADRs. Do NOT renumber.

Step 3. Bump package.json "version" from current to "1.0.0". Don't change
  any other field.

Step 4. CHANGELOG.md:
  4a. If CHANGELOG.md doesn't exist, create it with this top:
        # Changelog
        ## 1.0.0 — 2026-05-XX (MASQUER · v1.0)
        ...summary bullets...
  4b. If it exists, prepend the 1.0.0 section above any prior entries.
  4c. Summary bullets must cover:
        - "All 14 gameplay phases shipped (coin-flip → craps)."
        - "MASQUER · Velvet Deco design system across every surface."
        - "Per-game React.lazy bundle splitting; main chunk ≤ 350 KB gzipped."
        - "Comprehensive admin layer: per-game analytics, cross-game
          leaderboards, user management, DANGER ZONE wipe."
        - "Banned-user overlay; lottery hero seen-state + match highlighting."
        - "Manual smoke checklist at docs/MANUAL_SMOKE_v1.md."
        - Link to the umbrella spec + this sub-project's spec.

Step 5. README.md polish (ONLY if README.md exists):
  - Add a single sentence near the top: "v1.0 launch (2026-05-XX) — MASQUER
    overhaul complete; see CHANGELOG.md."
  - Do NOT restructure or rewrite the README.

Step 6. ABSOLUTELY DO NOT create, modify, or push any git tag. The PR body
  MUST include the exact commands the user runs AFTER merging + running
  the smoke checklist:

    git fetch origin main
    git tag -a v1.0 -m "localGamble v1.0 — MASQUER · Velvet Deco launch" origin/main
    git push origin v1.0

  Phrase the PR body so the user understands the tag is staged, not pushed.

Constraints:
  - DO NOT modify any file under src/.
  - DO NOT add tests (chore PR).
  - DO NOT add new ADRs.
  - DO NOT modify CLAUDE.md.

Branch off latest main:
  git checkout main && git pull --ff-only
  git checkout -b phase-15-15-pr-e-close

DoD: pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .

Open PR with title (≤ 100 chars):
  "phase-15(#15) PR E: closing pass — BUILD_GUIDE + CHANGELOG + v1.0 prep"

DO NOT merge.
```

**Controller workflow:**

- [ ] **E.1: Dispatch** subagent.
- [ ] **E.2: Review the diff** — confirm:
  - No file under `src/` touched (`git diff main -- src/ | wc -l` should be 0).
  - `package.json` "version" is exactly `"1.0.0"`.
  - CHANGELOG.md exists with a `## 1.0.0` section at the top.
  - BUILD_GUIDE.md Phase 15 progress shows 16/16.
  - No `git tag` invocation anywhere.
  - PR body includes the tag commands verbatim.
- [ ] **E.3: Watch CI**.
- [ ] **E.4: Merge on green** — `gh pr merge <#> --squash --delete-branch`.
- [ ] **E.5: Pull main**.

---

## Post-PR-E — user-driven launch

After PR E merges, the controller's autonomous work is **done**. The user runs:

- [ ] **Launch.1: Smoke** — open `docs/MANUAL_SMOKE_v1.md` and tick through every item. Any P1 failure → reopen as a fix PR, merge, then re-smoke. Any P2 failure → fix or note as v1.0.1 follow-up at user's discretion.
- [ ] **Launch.2: Tag v1.0** — once §9 sign-off is ticked, run the commands from PR E's body:

  ```bash
  git fetch origin main
  git tag -a v1.0 -m "localGamble v1.0 — MASQUER · Velvet Deco launch" origin/main
  git push origin v1.0
  ```

- [ ] **Launch.3: Update memory** — controller updates `project_localgamble_status.md` (v1.0 shipped + date + tag).

---

## Risks & mitigations (carried from spec §12 + plan additions)

| Risk                                                                            | Mitigation                                                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit produces 100+ items; per-game PRs balloon                                 | Severity rank everything; per-game PRs ONLY address P1+P2; P3s deferred to `// TODO(#15-followup):`                                                       |
| Per-game subagent breaks the additive constraint                                | G<N>.4 diff check explicitly greps non-tsx files under the game root; revert + re-dispatch with a tighter brief                                           |
| PR C breaks a vitest test that mounted a route synchronously                    | RouteFallback is a tiny static `<div>` so `findByRole` works; if any test still breaks, fix in the same PR with `await screen.findByRole(...)` pattern    |
| Pre-existing CI flakes (chip.place timing on coin-flip / blackjack)             | Peel off into tiny test-only PRs as we hit them (the pattern from PR #306). Don't let flakes block #15 PRs                                                |
| Subagent attempts to merge despite instruction                                  | Standing rule + verbatim "DO NOT merge" in every brief; controller is the only merger                                                                     |
| Audit subsection for a game is too thin → that game's PR has nothing to work on | Cold-look protocol §6.3 Step 2 still produces findings (the audit is a seed, not a ceiling); subagent's own walkthrough catches more                      |
| PR E ADR housekeeping mis-classifies an ADR as superseded                       | Subagent annotates with one-line rationale; controller reviews ADR-by-ADR in E.2; reverts any false positive                                              |
| Bundle budget (≤ 350 KB gzipped) not met after PR C                             | Profile the entry chunk via `vite-bundle-visualizer` (already a devDep — verify) to find what's still in the entry; defer fix to a follow-up PR if needed |

---

## Self-review

**Spec coverage check** (every spec §X.Y has a matching step in this plan):

- ✅ Spec §4 (PR A) → "PR A" section above with verbatim brief + 6 controller steps
- ✅ Spec §5 (PR B) → "PR B" section with verbatim brief + 6 controller steps; surfaces list mirrors §5.2
- ✅ Spec §6 (PRs G1–G13) → shared template + parameter table + per-game workflow; the 3 special notes (Lottery, Bingo, Poker) preserved
- ✅ Spec §7 (PR C) → "PR C" section; updated with the discovery that lazy-splitting is already mostly done (more accurate than the spec's "from-scratch migration" framing)
- ✅ Spec §8 (PR D) → "PR D" section with verbatim brief + 6 controller steps
- ✅ Spec §9 (PR E) → "PR E" section with verbatim brief + 5 controller steps + post-PR-E launch flow
- ✅ Spec §10 (subagent execution & control plane) → integrated into every PR's controller workflow + the standing "subagents MUST NOT merge" rule in the header
- ✅ Spec §11 (testing & DoD) → restated in every per-PR DoD; baseline DoD re-run captured in pre-flight + after PR B + after every G-PR + after PR E
- ✅ Spec §12 (risks) → carried forward + plan-specific additions (e.g. router test compatibility)
- ✅ Spec §13 (open questions = none) → matches plan
- ✅ Spec §14 (exit criteria) → matches Post-PR-E launch section

**Placeholder scan:** No `TBD` / `TODO` / `FIXME` outside the intentional `// TODO(#15-followup):` markers prescribed in the spec.

**Type consistency:** Branch names match spec §3 table. Commit scopes match spec §3.2. Audit section numbers match spec §4.2.

**Spec-only correction:** Spec §7 implied a from-scratch lazy migration; reality is most routes are already lazy. PR C is therefore a consolidation task. The plan reflects the actual current state of `src/router.tsx`.

---

## Execution handoff

Plan complete. Execution mode is **subagent-driven-development** (per the header and per the user's standing preference from `feedback_phase15_game_sub_project_order`). Sequential pacing — controller waits for explicit "start next" from the user between PRs.

Next action: once the spec PR (#308) merges, the controller runs the pre-flight checklist, then awaits the user's "start PR A" prompt.
