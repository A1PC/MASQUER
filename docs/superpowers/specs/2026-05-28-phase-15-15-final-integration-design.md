# Phase 15 #15 — Final Integration & Launch Polish (Design Spec)

> **Status:** Draft for user review.
> **Date:** 2026-05-28.
> **Sub-project:** #15 (final) of Phase 15 — MASQUER overhaul.
> **Inherits:** All shared principles from `docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md` §4 and the per-game polish recipe in `docs/PHASE_15_PATTERNS.md`.
> **Completion target:** Tag `v1.0` on the closing-pass merge commit (PR E).

---

## 1. Goal

Close out the Phase 15 MASQUER overhaul with a comprehensive launch-prep sweep that:

1. **Audits** every screen and surface for design-system consistency, micro-copy quality, focus/keyboard hygiene, and empty/zero-state coverage, producing a written punch list.
2. **Fixes** every audit finding — cross-cutting issues in one PR, then a dedicated cold-look polish PR per game (13 games), applying the rubric **visual + interaction + small UX wins, no game-logic changes**.
3. **Improves cold-start performance** by introducing per-game `React.lazy` bundle splitting (deferred from Phase 9).
4. **Produces a manual smoke-test checklist** the user runs themselves before tagging, covering every game + admin + zero/empty-state combinations.
5. **Tags `v1.0`** on the closing-pass merge commit once the smoke checklist passes.

Outcome: localGamble feels like one designed product end-to-end, the main JS bundle no longer ships every game upfront, every empty state is intentional, and we have a written launch checklist captured in-repo for future releases.

---

## 2. Scope

### 2.1 In scope

- Cross-screen design-system consistency audit (read-only, produces an audit doc).
- Cross-cutting fixes (shared `src/components/ui/*`, app shell — TopBar/Sidebar/AppLayout, admin chrome — AdminLayout/sidebar).
- Per-game cold-look polish (13 games, one PR each, visual + interaction + small UX wins per locked rubric).
- Per-game and heavy-admin route `React.lazy` + `<Suspense>` splitting; main bundle size budget snapshot in build output.
- Manual smoke-test checklist authoring (per-game + per-admin + zero-state matrix).
- Closing pass: BUILD_GUIDE Phase 15 progress update, ADR housekeeping (only if any ADR is out of date relative to shipped state), `package.json` version bump to `1.0.0`, annotated git tag `v1.0`.

### 2.2 Out of scope (explicitly deferred)

- **Game-logic changes.** All `logic.ts` / `machine.ts` / `_shared/*` pure modules under `src/games/**` and all existing ADRs (0001–0047) are byte-stable through this sub-project.
- **New features from the deferred-features docket** (subscription tickets, admin tuning consoles for plinko/poker, ball-trail effects, etc.). User explicitly chose "Polish only (per the umbrella spec)" for #15.
- **CLAUDE.md edits.** User-owned per the existing rule.
- **Brand re-design.** `project_localgamble_rebrand` is its own deferred chore — name/logo/palette stay as-is for v1.0.
- **Cross-tab sync, multi-user prize pools, real-money paths.** Not in scope for this app's design.

---

## 3. PR roadmap (18 PRs)

All PRs follow `subagent-driven-development`: one fresh implementer subagent per PR; the controller (Claude session) reviews and merges on CI green. Sequential pacing — wait for explicit "start next" before moving from one to the next, per `feedback_phase15_game_sub_project_order`.

| #   | PR                                   | Type         | Branch                           |
| --- | ------------------------------------ | ------------ | -------------------------------- |
| A   | Cross-screen consistency audit       | docs-only    | `phase-15-15-pr-a-audit`         |
| B   | Cross-cutting audit fixes            | code         | `phase-15-15-pr-b-cross-cutting` |
| G1  | Coin-flip polish                     | code         | `phase-15-15-g1-coin-flip`       |
| G2  | Blackjack polish                     | code         | `phase-15-15-g2-blackjack`       |
| G3  | Roulette polish                      | code         | `phase-15-15-g3-roulette`        |
| G4  | Slots polish                         | code         | `phase-15-15-g4-slots`           |
| G5  | Baccarat polish                      | code         | `phase-15-15-g5-baccarat`        |
| G6  | Lottery polish                       | code         | `phase-15-15-g6-lottery`         |
| G7  | Bingo British polish                 | code         | `phase-15-15-g7-bingo-british`   |
| G8  | Bingo American polish                | code         | `phase-15-15-g8-bingo-american`  |
| G9  | Plinko polish                        | code         | `phase-15-15-g9-plinko`          |
| G10 | Hold'em polish                       | code         | `phase-15-15-g10-holdem`         |
| G11 | Five-Card Draw polish                | code         | `phase-15-15-g11-five-card`      |
| G12 | Omaha polish                         | code         | `phase-15-15-g12-omaha`          |
| G13 | Craps polish                         | code         | `phase-15-15-g13-craps`          |
| C   | React.lazy per-game bundle splitting | code (perf)  | `phase-15-15-pr-c-lazy`          |
| D   | Manual smoke checklist + leftovers   | docs + code  | `phase-15-15-pr-d-smoke`         |
| E   | Closing pass / v1.0 tag prep         | docs + chore | `phase-15-15-pr-e-close`         |

### 3.1 Ordering rationale

- **Audit first (PR A)** so per-game PRs have a concrete punch list rather than a vague "look at it cold" — the rubric is "fix what's in your audit subsection + anything else you notice while there."
- **Cross-cutting (PR B) before per-game** so shared-component changes (e.g. a `<Button>` focus-ring tweak) flow through to every game's polish PR for free.
- **React.lazy (PR C) after all per-game PRs** so visual fixes are stable before we wrap each game in a `Suspense` boundary. Avoids the "fixed something but the lazy split broke it" diagnosis path.
- **Smoke + close at the end** as the final go/no-go.

### 3.2 Commit-scope mapping (commitlint)

Per `reference_localgamble_commitlint_scopes` and `feedback_localgamble_commitlint_scope_additions` — DO NOT expand the enum. Use the closest existing scope:

- PR A → `docs(build-guide)` (or `chore` if appropriate — see §10)
- PR B → `chore` for cross-cutting + `ui` if changes are mostly in `src/components/ui`
- PR G1 → `coin-flip`; G2 → `blackjack`; G3 → `roulette`; G4 → `slots`; G5 → `baccarat`; G6 → `lottery`; G7 → `bingo`; G8 → `bingo`; G9 → `plinko`; G10/G11/G12 → `poker`; G13 → `craps`.
- PR C → `chore` (cross-cutting perf work)
- PR D → `docs` for the checklist, `chore` for leftovers
- PR E → `chore` for version bump + tag

Subject ≤ 100 chars (commitlint header-max-length, per `feedback_localgamble_commit_subject_limit`).

---

## 4. PR A — Cross-screen consistency audit (read-only)

### 4.1 Purpose

Produce the punch list that drives every fix PR below. Single deliverable: a written audit doc committed to the repo. **No code changes** in this PR — making it a docs-only audit lets the user review the findings before committing time to fixes.

### 4.2 Deliverable

`docs/superpowers/specs/2026-05-28-phase-15-15-audit.md` with the structure:

```markdown
# Phase 15 #15 — Consistency Audit

> Read-only audit produced as PR A of sub-project #15.
> Findings listed here drive PR B (cross-cutting) and PRs G1–G13 (per-game).
> Format: Severity · Surface · Finding · Suggested fix.

## Conventions

- **Severity P1:** breaks the design language or usability (e.g. wrong color token, missing focus ring on interactive element, empty state shows nothing).
- **Severity P2:** noticeable polish gap (e.g. off-by-1 spacing, inconsistent micro-copy capitalisation, missing aria-label on icon-only button).
- **Severity P3:** nice-to-have (e.g. tighter animation curve, slightly better empty-state copy).

## 1. Cross-cutting findings

### 1.1 Shared UI components (src/components/ui/\*)

- [P?] Component · Finding · Fix
  ...

### 1.2 App shell (TopBar / Sidebar / AppLayout / RequireAuth / RequireAdmin)

...

### 1.3 Admin chrome (AdminLayout / admin sidebar)

...

### 1.4 Auth surfaces (LoginPage / RegisterPage / BannedOverlay)

...

### 1.5 Lobby + Stats + Leaderboard + Settings + Profile pages

...

## 2. Per-game findings

### 2.1 Coin-flip

- [P?] Surface · Finding · Fix
  ...

### 2.2 Blackjack

...

### 2.3 Roulette

...

### 2.4 Slots

...

### 2.5 Baccarat

...

### 2.6 Lottery

...

### 2.7 Bingo British

...

### 2.8 Bingo American

...

### 2.9 Plinko

...

### 2.10 Hold'em

...

### 2.11 Five-Card Draw

...

### 2.12 Omaha

...

### 2.13 Craps

...

## 3. Empty/zero-state matrix

Per-page table of "what does this show when there's no data / no user / no chips / banned user". Findings rolled into Per-game and Cross-cutting sections above; the matrix lives here for the smoke checklist (PR D) to consume.

## 4. Summary

- Total findings by severity (P1/P2/P3).
- Cross-cutting count.
- Per-game count.
- Notes about anything explicitly deferred to a follow-up (i.e. NOT folded into #15).
```

### 4.3 Audit rubric (what to look for)

The audit subagent runs through every screen with Playwright + manual reads, looking for:

**Design-system drift (P1/P2)**

- Hard-coded hex / rgb in components (CLAUDE.md rule says tokens only) — grep for `#[0-9a-fA-F]{3,8}` in `src/**/*.tsx` excluding `src/theme/`.
- Color tokens used inconsistently (e.g. `text-gold` vs `text-gold-bright` for the same role).
- Spacing scale drift (any literal `p-7` `p-9` etc. that don't fit the 4pt/8pt scale).
- Border-radius drift (rounded-md vs rounded-lg vs rounded-xl with no clear tier).
- Font drift (any `font-mono` outside data tables, any `font-sans` overriding `font-body`).

**Interaction & a11y (P1/P2)**

- Buttons missing `focus-visible:ring-...` (must have visible focus state).
- Interactive elements missing accessible name (icon-only buttons without `aria-label`).
- `<button type="button">` vs missing type (default `submit` inside forms is a footgun).
- Disabled state visually distinct (opacity 0.4–0.6 + `aria-disabled`).
- Touch target size ≥ 44×44px on every clickable.
- `role` / `aria-*` usage matches semantics (e.g. modals have `role="dialog"` + `aria-modal`).
- Reduced-motion fallback present wherever Framer Motion animations run.

**Empty/zero states (P1)**

- Every list / table / chart has an empty-state message.
- Per-page audit of "what shows on first launch (no users, no rounds)?" — currently scattered, often a blank panel.
- Zero-chip wallet states across every game (Place-Bet disabled with explanatory text).
- Banned-user state surfaces a clear path (only LOG OUT, no game UI).

**Micro-copy & i18n (P2/P3)**

- Consistency of capitalisation in display-font headlines (MASQUER convention: uppercase wide-letter-spaced).
- Consistency of sentence case in body copy.
- Sentence-ending punctuation consistency.
- Plural handling (1 line vs 2 lines, 1 chip vs 2 chips).
- Currency symbol absent (this is play-money chips — never use `$`).
- Number formatting: tabular-nums on all data + `Number#toLocaleString` for thousands separators.

**Per-game cold-look** (PR G1–G13 will deepen this — PR A just notes obvious gaps)

- Hero region visually distinct from controls.
- LobbyButton + OddsInfoBox + RulesButton present and styled per pattern.
- Sound integration calls through `useSound` (no embedded `<audio>` tags).
- `useEffectiveReducedMotion` honored on every animated surface.
- Game uses tokens-only color palette (no inline styles with raw colors).

### 4.4 Audit subagent brief (verbatim, to be passed)

```text
Run a read-only consistency audit of localGamble in preparation for v1.0 launch.
Produce the audit doc at the exact path below. NO code changes. NO tests changes.
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §4.
Use Playwright at 1440×900 to visually inspect every route after starting `pnpm dev`.
Use grep / Read to inspect components for drift. Use the rubric in §4.3.
Produce the doc with the EXACT structure shown in §4.2.
Open the PR with the title "phase-15(#15) PR A: cross-screen consistency audit".
Body explains: this is a docs-only audit; findings drive PRs B and G1–G13.
DoD: `pnpm exec prettier --check .` must pass for the new markdown file.
```

### 4.5 PR A DoD

- New file at `docs/superpowers/specs/2026-05-28-phase-15-15-audit.md`.
- Findings non-empty for at least: cross-cutting, every per-game subsection, the empty-state matrix.
- All entries follow the `[severity] surface · finding · suggested fix` shape.
- `pnpm exec prettier --check .` passes.
- No `*.ts` / `*.tsx` / `*.css` files modified.

---

## 5. PR B — Cross-cutting audit fixes

### 5.1 Purpose

Apply every finding from §1 (Cross-cutting findings) of the audit doc. Touches shared infrastructure that ripples through every game; doing this first means per-game PRs don't have to re-fix the same things.

### 5.2 Surfaces

- `src/components/ui/*` (Button, Card, Field, Input, Modal, Toast, etc. — every primitive in the design system).
- `src/components/AppLayout.tsx`, `src/components/TopBar.tsx`, `src/components/Sidebar.tsx`, `src/components/SidebarItem.tsx`, `src/components/RequireAuth.tsx`, `src/components/RequireAdmin.tsx`.
- `src/components/admin/AdminLayout.tsx` + admin sidebar / topbar.
- `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/BannedOverlay.tsx`.
- `src/pages/LobbyPage.tsx`, `src/pages/StatsPage.tsx`, `src/pages/LeaderboardPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/ProfilePage.tsx`.

### 5.3 Constraints

- No changes to `src/games/**` (those belong in PR G1–G13).
- No new features. Only fixes from the audit's cross-cutting section. If the audit subagent notes a finding that needs design-spec consultation (e.g. "this empty state needs a new illustration"), defer it as a comment + leave a `// TODO(#15-followup):` marker.
- No new shared components. If a fix requires a new primitive (rare), open a follow-up issue and defer.

### 5.4 PR B DoD

- Every P1 finding in §1 of the audit is addressed or has a `// TODO(#15-followup):` comment with a one-line rationale.
- Every P2 finding in §1 is addressed (or marked TODO with rationale).
- Story files in `src/**/*.stories.tsx` updated where component API surface changed.
- `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .` all green.
- Screenshot via Playwright at 1440×900 of every shell-level surface attached to the PR body (Lobby, Stats, Leaderboard, Settings, Login, Banned overlay).

### 5.5 PR B subagent brief (template)

```text
Implement PR B of Phase 15 sub-project #15 per the design spec at
docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §5.
Findings to address are listed in docs/superpowers/specs/2026-05-28-phase-15-15-audit.md §1.
Apply every P1 and P2 cross-cutting finding. P3s are optional in this PR.
DO NOT touch any file under src/games/** — those are reserved for PRs G1–G13.
DO NOT add new shared components; mark with TODO(#15-followup) and continue.
After implementing, run the full DoD locally. Then start `pnpm dev` and use
Playwright at 1440×900 to capture screenshots of every shell-level surface
(Lobby, Stats, Leaderboard, Settings, Login page, Banned overlay) and attach
them to the PR body. Open the PR with title
"phase-15(#15) PR B: cross-cutting audit fixes".
```

---

## 6. PRs G1–G13 — Per-game cold-look polish

### 6.1 Purpose

One dedicated PR per game. Each one applies the locked rubric (**visual + interaction + small UX wins, no game-logic changes**) starting from that game's audit subsection plus anything the subagent notices while sweeping the game cold.

### 6.2 Game roster + commit scope

Order matches release order (matches `feedback_phase15_game_sub_project_order` convention).

| #   | Game           | Branch                          | Commit scope | Files-under-microscope (primary)                                                       |
| --- | -------------- | ------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| G1  | Coin-flip      | `phase-15-15-g1-coin-flip`      | `coin-flip`  | `src/games/coin-flip/CoinFlipPage.tsx` + components                                    |
| G2  | Blackjack      | `phase-15-15-g2-blackjack`      | `blackjack`  | `src/games/blackjack/BlackjackPage.tsx` + Velvet Duel components                       |
| G3  | Roulette       | `phase-15-15-g3-roulette`       | `roulette`   | `src/games/roulette/RoulettePage.tsx` + WheelView + BettingLayout                      |
| G4  | Slots          | `phase-15-15-g4-slots`          | `slots`      | `src/games/slots/SlotsPage.tsx` + reel/symbol components                               |
| G5  | Baccarat       | `phase-15-15-g5-baccarat`       | `baccarat`   | `src/games/baccarat/BaccaratPage.tsx` + components                                     |
| G6  | Lottery        | `phase-15-15-g6-lottery`        | `lottery`    | `src/pages/lottery/*` (lottery is a top-level page per ADR-0040, not under src/games/) |
| G7  | Bingo British  | `phase-15-15-g7-bingo-british`  | `bingo`      | `src/games/bingo/british/*` + shared bingo components                                  |
| G8  | Bingo American | `phase-15-15-g8-bingo-american` | `bingo`      | `src/games/bingo/american/*`                                                           |
| G9  | Plinko         | `phase-15-15-g9-plinko`         | `plinko`     | `src/games/plinko/PlinkoPage.tsx` + peg/ball components                                |
| G10 | Hold'em        | `phase-15-15-g10-holdem`        | `poker`      | `src/games/poker/holdem/HoldemPage.tsx` + shared poker components                      |
| G11 | Five-Card Draw | `phase-15-15-g11-five-card`     | `poker`      | `src/games/poker/five-card-draw/FiveCardDrawPage.tsx` + variant components             |
| G12 | Omaha          | `phase-15-15-g12-omaha`         | `poker`      | `src/games/poker/omaha/OmahaPage.tsx` + variant components                             |
| G13 | Craps          | `phase-15-15-g13-craps`         | `craps`      | `src/games/craps/CrapsPage.tsx` + table layout                                         |

### 6.3 Cold-look protocol (every per-game PR)

The implementer subagent for each G-PR follows this protocol:

**Step 1 — Read the audit subsection for this game.** Punch list comes from there.

**Step 2 — Start the dev server, open the game in Playwright at 1440×900.** Walk through every state of the game:

- Empty / pre-bet state.
- Bet placed / in-progress state.
- Mid-game decision states (e.g. Hit/Stand on blackjack, draw/keep on five-card-draw).
- Settle / outcome state (win, loss, push, jackpot).
- Edge cases the rubric specifies (banned user, zero chips, mid-round refresh).

For each state, screenshot. The PR body collects all screenshots in a single section "States walkthrough".

**Step 3 — Apply the rubric. Anything that fails the rubric is a finding.**

Rubric (locked by user):

- **Visual fit-and-finish** — spacing/alignment/contrast/animation feel.
- **Interaction polish** — button states (hover/active/disabled), focus rings, micro-copy, keyboard navigation, touch targets ≥ 44px.
- **Small UX wins** — missing affordances, friction fixes (e.g. a button that should be primary tier but is secondary), small bugs surfaced during the walkthrough that DON'T touch game logic. Examples that qualify: missing tooltip on an arcane button, focus going to the wrong element after settle, inconsistent button order (Cancel/Confirm reversed across modals), bet-input not autofocusing.

**Step 4 — Apply fixes.** Per the additive constraint, NO changes to:

- Any `*.ts` file under `src/games/<game>/` that isn't a `.tsx` (i.e. logic / machines / pure modules).
- Any test under `src/games/<game>/**/*.test.ts` for logic (UI tests may be updated).
- Any ADR (existing).
- Any shared logic in `src/systems/**` (presentational fixes only; if a system needs changing, defer).

**Step 5 — Run the DoD locally.**

**Step 6 — Open the PR with the standardised title shape:**

`phase-15(#15.<gameId>) <commit-scope>: cold-look polish — <one-line summary>`

Examples:

- `phase-15(#15.g1) coin-flip: cold-look polish — focus ring on flip-side, settle-state aria-live`
- `phase-15(#15.g6) lottery: cold-look polish — empty-tickets state, balance label sentence-case`

### 6.4 Per-game PR DoD

- Every P1 finding for this game in the audit (§2.x) is addressed or commented with `// TODO(#15-followup):` + rationale.
- Every P2 finding for this game is addressed.
- Walkthrough screenshots (every state listed in Step 2) attached to the PR body.
- Story files updated if changed components have stories.
- All game-logic tests still pass byte-stable (no diffs in `*.test.ts` files outside UI-test files).
- Full DoD green: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .`.

### 6.5 Per-game PR subagent brief (template)

```text
Implement PR G<N> of Phase 15 sub-project #15 (cold-look polish for <game>).
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §6.
Audit findings: docs/superpowers/specs/2026-05-28-phase-15-15-audit.md §2.<N>.
Follow the cold-look protocol (§6.3) — including the Playwright walkthrough.
Apply the rubric: visual + interaction + small UX wins. NO game-logic changes.
Additive constraint: do not modify any pure-logic file (*.ts) under
src/games/<game>/ — only *.tsx, stories, and UI tests are in scope.
Run full DoD after implementation. Open the PR with title shape:
phase-15(#15.g<N>) <scope>: cold-look polish — <summary ≤ 100 chars total>.
Attach walkthrough screenshots (every state per §6.3 Step 2) to PR body.
```

---

## 7. PR C — React.lazy per-game bundle splitting

### 7.1 Purpose

Fold in the deferred-from-Phase-9 perf work. Cold-start should not download every game's JS upfront. Each game route — and any heavy admin route — becomes a `React.lazy()` import behind a `<Suspense>` boundary with a brand-matching fallback.

### 7.2 Migration recipe

For every game route in `src/App.tsx` (or equivalent router config):

```tsx
// Before:
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
// ...
<Route path="coin-flip" element={<CoinFlipPage />} />;

// After:
const CoinFlipPage = React.lazy(() => import('@/games/coin-flip/CoinFlipPage'));
// ...
<Route
  path="coin-flip"
  element={
    <React.Suspense fallback={<GameRouteFallback />}>
      <CoinFlipPage />
    </React.Suspense>
  }
/>;
```

`GameRouteFallback` is a new shared component at `src/components/GameRouteFallback.tsx` — a velvet-deep background with a centered brass spinner + "Loading…" micro-copy. Honors `useEffectiveReducedMotion` (spinner becomes a static glow on reduced-motion).

### 7.3 Heavy admin routes

Lazy-split these admin routes (each is several hundred KB+ when fully populated):

- `/admin/leaderboard` (cross-game aggregator)
- `/admin/overview` (sparklines + KPIs)
- Per-game admin routes — `/admin/<game>` for every game.

Re-use `GameRouteFallback` (rename to `RouteFallback` if scope expands). One shared fallback for both game + admin routes.

### 7.4 Constraints

- Lazy splitting only on routes — no per-component lazy in this PR (deferrable to a follow-up).
- `<Suspense>` fallback render must match the post-load shell visually so there's no layout jank during chunk download.
- `prefetch="intent"` hints on `<Link>` navigation to game routes — adds `<link rel="prefetch">` so hovering a sidebar item begins the chunk download. Implementation: a small `usePrefetchOnHover` hook in `src/router/`.

### 7.5 PR C DoD

- Every game route lazy-imported behind `<Suspense>`.
- Every per-game admin route lazy-imported.
- New shared `RouteFallback` component + its stories.
- `pnpm build` output shows split chunks per game (verify by inspecting the build report; budget snapshot captured to PR body).
- Main bundle (the entry chunk) ≤ 80% of its pre-PR-C size. Hard budget: ≤ 350 KB gzipped. (Snapshot the actual numbers in the PR body.)
- `pnpm exec vitest run` passes — every page test that mounts a lazy route must handle the Suspense fallback (the existing test pattern using `MemoryRouter` keeps working because Vitest's React runs sync; if any test breaks, fix it with `await screen.findByRole(...)` instead of synchronous queries).
- Manual smoke: load every game route cold (clear cache) and observe the fallback flicker — no white-flash, no layout jank.

### 7.6 PR C subagent brief (template)

```text
Implement PR C of Phase 15 sub-project #15 — React.lazy per-game bundle
splitting. Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §7.
Follow §7.2 (migration recipe) and §7.3 (heavy admin routes).
Create the shared RouteFallback at src/components/RouteFallback.tsx + stories.
Add usePrefetchOnHover hook in src/router/ and apply it to sidebar Links.
Verify the main bundle drops ≥ 20% (capture before/after gzipped sizes in PR
body). DoD per §7.5. Open PR with title
"phase-15(#15) PR C: React.lazy per-game + heavy-admin bundle splitting".
```

---

## 8. PR D — Manual smoke checklist + leftovers

### 8.1 Purpose

Write the canonical manual smoke-test checklist for v1.0 and beyond. Catches any leftover paper cuts surfaced while authoring the checklist.

### 8.2 Deliverables

**File 1: `docs/MANUAL_SMOKE_v1.md`** — exhaustive checklist with checkbox markdown items, structured as:

```markdown
# localGamble — Manual Smoke Checklist (v1.0)

> Run before every release tag. Update with any new flow that ships afterwards.

## 0. Reset

- [ ] Open in private window OR run admin DANGER ZONE wipe
- [ ] Verify fresh-DB state: login screen renders, no balance/stats data

## 1. Auth surfaces

- [ ] Register a new user → routed to /lobby with 1000 chips
- [ ] Logout → routed to /login
- [ ] Re-login → state restored
- [ ] Login with wrong password → "invalid credentials" inline error
- [ ] Login as admin (admin/admin12345) → routed to /admin
- [ ] Admin → ban a user → that user logs in → BANNED overlay shows; LOG OUT works
- [ ] Reserved-username "admin" cannot be registered

## 2. Shell

- [ ] TopBar credits update on every chip-changing action
- [ ] Sidebar collapse persists across reload
- [ ] Lobby cabinet renders every game tile
- [ ] /settings volume slider mutes / unmutes; persists across reload
- [ ] /profile avatar color persists; username change validates uniqueness

## 3. Per-game (golden path + edge)

### 3.1 Coin-flip

- [ ] Bet 25 → flip → result → rounds row written → balance updated
- [ ] Two wins in a row → streak badge appears
- [ ] Zero chips → place-bet disabled with explanatory micro-copy
      ...

### 3.2 Blackjack

- [ ] Bet → DEAL → Hit / Stand → settle → rounds row
- [ ] Split → two hands → resolve each
- [ ] 5-card Charlie → 3:2 payout
- [ ] Player ace-1-or-11 prompt fires when relevant
      ...

### 3.3 Roulette / 3.4 Slots / 3.5 Baccarat / 3.6 Lottery / 3.7 Bingo BR / 3.8 Bingo US / 3.9 Plinko / 3.10 Hold'em / 3.11 Draw / 3.12 Omaha / 3.13 Craps

... (one section per game, golden path + 3-5 edge cases each)

## 4. Admin

- [ ] /admin/overview KPIs render + sparkline + recent adjustments
- [ ] /admin/leaderboard all 4 tabs (winners/volume/biggest/streaks) render
- [ ] /admin/users → ban/unban, adjust credits, view drill-down
- [ ] /admin/users → DANGER ZONE → CANCEL doesn't wipe
- [ ] /admin/<each game> → KPIs + charts render
- [ ] DateRangeFilter on every admin page persists per-page
- [ ] /admin/sessions search + filter + pagination
- [ ] /admin/audit search + filter + pagination

## 5. Empty / zero states

- [ ] Fresh DB / new user — every page renders an intentional empty state
- [ ] No rounds yet — Stats and Leaderboard both show empty states (not 404 / not blank)
- [ ] Zero chips — every game's Place-Bet disabled with explanatory micro-copy
- [ ] Banned user — BannedOverlay covers every route
- [ ] Lottery: no draws yet — Hero renders pre-draw countdown without a "last draw" strip

## 6. A11y spot checks

- [ ] Tab through Lobby + 2 games + Admin — focus rings visible everywhere
- [ ] VoiceOver: read a chip count → tabular-nums announced sensibly
- [ ] prefers-reduced-motion ON → animations collapse to instant on every game

## 7. Sound

- [ ] Volume slider in Settings affects every sound
- [ ] Mute persists across reload
- [ ] No autoplay-blocked-noise on first load

## 8. Build / perf

- [ ] `pnpm build` succeeds
- [ ] Main chunk ≤ 350 KB gzipped
- [ ] Cold-load each game route → no white flash, RouteFallback visible
- [ ] `pnpm build-storybook` succeeds

## 9. Sign-off

- [ ] All P1 / P2 items above ticked
- [ ] No new console errors during the run
- [ ] Ready to tag v1.0
```

**File 2: any code leftovers** — if writing the checklist surfaces a P1/P2 issue that should be fixed before tagging, fix it inline in this PR (one PR is allowed to make code changes even though its core deliverable is the checklist).

### 8.3 PR D DoD

- New `docs/MANUAL_SMOKE_v1.md` with all sections from §8.2 populated.
- Every "[ ]" item is concrete and observable (no vague "verify it works").
- `pnpm exec prettier --check .` passes.
- Any leftover code changes pass full DoD.

### 8.4 PR D subagent brief

```text
Implement PR D of Phase 15 sub-project #15 — manual smoke checklist.
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §8.
Write docs/MANUAL_SMOKE_v1.md with the EXACT structure shown in §8.2. Populate
every per-game section with the golden path + 3–5 edge cases per game; cross-
reference each game's audit subsection to derive the edges. While writing,
walk every section through Playwright at 1440×900 yourself. If you find a P1/P2
issue not yet covered, fix it in this PR. Open PR with title
"phase-15(#15) PR D: manual smoke checklist v1.0 + leftovers".
```

---

## 9. PR E — Closing pass / v1.0 tag prep

### 9.1 Purpose

Final administrative pass that prepares the repo for the v1.0 launch tag. **No feature changes.** Mechanical only.

### 9.2 Changes

1. **`BUILD_GUIDE.md`** — update the Phase 15 progress block to show #15 ✅ Done. Add a "v1.0 (2026-05-XX)" header summarising the overhaul.
2. **ADR housekeeping** — scan `docs/adr/*.md` for any ADR that's stale relative to shipped state (e.g. an ADR that describes a pre-MASQUER component). For each: add a status footer "Superseded by Phase 15 #N" with the link, OR add an "Amendments" section if the ADR's intent is still load-bearing. Do NOT rewrite ADRs.
3. **`package.json`** — bump `"version"` from current to `"1.0.0"`.
4. **`CHANGELOG.md`** — create or append a `## 1.0.0 — 2026-05-XX (MASQUER · v1.0)` section summarising:
   - "All 14 gameplay phases shipped."
   - "MASQUER · Velvet Deco design system covers every surface."
   - "Per-game React.lazy bundle splitting; main chunk ≤ 350 KB gzipped."
   - "Comprehensive admin layer: per-game analytics, cross-game leaderboards, user management."
   - "Full manual smoke checklist captured in `docs/MANUAL_SMOKE_v1.md`."
5. **README polish** (if applicable) — keep current content, add a "v1.0 launch (2026-05-XX)" sentence at the top.
6. **Annotated git tag `v1.0`** on the merge commit — but DO NOT push the tag until the user explicitly runs the smoke checklist and confirms.

### 9.3 Constraints

- No code in `src/**` changes.
- No tests added (this is a chore PR).
- No new ADRs.

### 9.4 PR E DoD

- BUILD_GUIDE updated.
- ADR housekeeping commits with one paragraph per ADR touched.
- package.json version = 1.0.0.
- CHANGELOG.md updated.
- `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .` all green.
- Tag is staged locally but NOT pushed; PR body includes the exact commands the user runs after merging to push the tag:

  ```bash
  git fetch origin main
  git tag -a v1.0 -m "localGamble v1.0 — MASQUER · Velvet Deco launch" origin/main
  git push origin v1.0
  ```

### 9.5 PR E subagent brief

```text
Implement PR E of Phase 15 sub-project #15 — closing pass.
Spec: docs/superpowers/specs/2026-05-28-phase-15-15-final-integration-design.md §9.
NO code changes in src/. Only:
- Update BUILD_GUIDE.md Phase 15 progress + add v1.0 header.
- ADR housekeeping per §9.2 step 2.
- Bump package.json to "1.0.0".
- Create or append CHANGELOG.md per §9.2 step 4.
- README sentence per §9.2 step 5.
- DO NOT create or push any git tag. PR body explains the user runs the
  tag commands manually after merging + running the smoke checklist.
Open PR with title "phase-15(#15) PR E: closing pass + v1.0 prep".
```

---

## 10. Subagent execution & control plane

### 10.1 Subagent-driven development

Per `superpowers:subagent-driven-development`:

- One fresh implementer subagent per PR. No subagent carries state from a previous PR.
- Each subagent's brief is the verbatim block shown above for that PR (§4.4, §5.5, §6.5, §7.6, §8.4, §9.5).
- The controller (Claude session) reviews the diff before pushing, runs CI, merges squash + delete on green.
- Subagents must NOT merge. (Standing rule.)

### 10.2 Pacing

Sequential — wait for explicit "start next" from the user before dispatching the next PR's subagent. Per `feedback_phase15_game_sub_project_order`.

### 10.3 Failure handling

- If a subagent's PR fails CI: triage. If the failure is a pre-existing flake (e.g. the recent coin-flip / blackjack `chip.place` waitFor patterns), tackle as a separate tiny PR before re-running the failing one.
- If a subagent's PR misses a finding from the audit: comment on the PR + dispatch a follow-up fix (do NOT amend the merged PR).
- If a subagent goes off-spec (e.g. expands scope into game-logic): controller reverts and re-dispatches with a tighter brief.

### 10.4 Branch hygiene

- Every PR branches off the latest `main`.
- After merge, `git checkout main && git pull --ff-only`. Next PR branches off the freshly-pulled main so the audit doc + PR B fixes are visible to PR G1 onward.

---

## 11. Testing & DoD (sub-project-wide)

### 11.1 Per-PR DoD

Every code PR (B, G1–G13, C, D-with-code-leftovers): `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build && pnpm build-storybook && pnpm exec prettier --check .` must pass.

Docs-only PRs (A, E, D-without-code-leftovers): `pnpm exec prettier --check .` must pass.

### 11.2 Invariants that must hold across the sub-project

- Every pure-logic file (`src/games/**/*.ts` excluding `*.tsx` and `*.test.ts` for UI tests) is byte-stable through G1–G13.
- ADRs 0001–0047 unchanged (PR E may add status footers only, not edits to ADR bodies).
- `BUILD_GUIDE.md` only edited in PR A (if needed for cross-reference) and PR E.
- `CLAUDE.md` never edited.

### 11.3 Cross-PR regression check

After each per-game PR merges, the controller runs the full vitest suite locally before dispatching the next subagent. Catches accidental cross-test contamination.

---

## 12. Risks & mitigations

| Risk                                                                             | Mitigation                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit (PR A) finds 100+ items and per-game PRs balloon                           | Severity-rank everything; per-game PRs MUST address P1+P2 only; P3 may be marked `// TODO(#15-followup):` for future polish PRs                   |
| React.lazy (PR C) breaks a vitest test that mounted a route synchronously        | Per §7.5 explicit DoD line: any breaking test must be converted to `findByRole` pattern; document the new test idiom in the PR body               |
| Per-game subagent makes a game-logic change despite the constraint               | §6.3 Step 4 + §10.3 — controller reverts and re-dispatches with tighter brief; CI catches a logic test diff because logic tests should not change |
| Cross-cutting fixes in PR B accidentally regress a game's existing visual design | Visual regression caught by per-game subagent's Playwright walkthrough in their own PR; or by manual smoke (PR D)                                 |
| Long subagent queue burns user time waiting between PRs                          | Sequential pacing is the user's explicit preference; cadence determined by user prompts                                                           |
| Pre-existing CI flakes (e.g. chip.place timing) keep blocking PRs                | Handle each as a tiny separate test-only PR as we hit them; the recent coin-flip waitFor fix already cleared one such class                       |
| The audit subagent (PR A) misses entire categories of finding                    | The audit doc is reviewed by the user before PR B starts; user can request a re-audit of specific surfaces                                        |
| Tagging v1.0 prematurely (before smoke passes)                                   | §9.4 — tag commands documented but NOT executed inside PR E; user runs them themselves after smoke passes                                         |

---

## 13. Open questions

None — scope, decomposition, rubric, and tagging policy are all locked via the brainstorming AskUserQuestion exchange on 2026-05-28.

---

## 14. Acceptance / exit criteria for #15

- ✅ All 18 PRs (A, B, G1–G13, C, D, E) merged to main.
- ✅ Audit doc + smoke checklist both committed.
- ✅ Main bundle ≤ 350 KB gzipped.
- ✅ Every page renders an intentional empty state (per audit + smoke).
- ✅ `package.json` shows `"version": "1.0.0"`.
- ✅ User runs `docs/MANUAL_SMOKE_v1.md` end-to-end and ticks every item.
- ✅ User pushes the `v1.0` annotated tag.

When all the above are true, Phase 15 is complete and localGamble has shipped v1.0.

---

## 15. References

- `docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md` (umbrella spec; this sub-project closes it).
- `docs/PHASE_15_PATTERNS.md` (per-game polish recipe; per-game PRs inherit).
- `CLAUDE.md` (hard rules — phase discipline, sandbox, logic-before-UI, integer money, RNG, rounds-row invariant, DoD).
- `BUILD_GUIDE.md` (master spec; PR E updates the Phase 15 progress block).
- Memories referenced (per the `~/.claude` index):
  - `feedback_planning_depth` — exhaustive upfront planning.
  - `feedback_phase15_game_sub_project_order` — sequential per-game release order; wait for "start next" prompt.
  - `feedback_localgamble_commit_subject_limit` — commit subject ≤ 100 chars.
  - `feedback_localgamble_commitlint_scope_additions` — don't expand the enum.
  - `feedback_localgamble_min_h_screen_in_pages` — page roots under AppLayout use `h-full`, not `min-h-screen`.
  - `feedback_localgamble_screenshot_before_pushing_ui` — Playwright screenshot before pushing visual changes.
  - `reference_localgamble_commitlint_scopes` — allowed enum.
  - `project_localgamble_status` — Phase 15 status snapshot.
  - `project_localgamble_design_philosophy` — old-school Vegas + modern-web execution.
  - `project_localgamble_rebrand` — brand redesign deferred; do NOT do it in #15.
  - `project_localgamble_deferred_features` — feature docket; explicitly out-of-scope for #15.
