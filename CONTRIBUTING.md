# Contributing to MASQUER

MASQUER shipped as **v1.0** on 2026-05-28. New work continues on `main` post-launch.
This doc captures the conventions the project has used since Phase 0 and the
ones added through Phase 15. The single source of truth for the product spec
is `BUILD_GUIDE.md` (read it first).

## Local setup

Requirements: **Node 20 LTS** (see `.nvmrc`), **pnpm 9+** (via Corepack).

```bash
nvm use            # picks up .nvmrc
corepack enable    # enables pnpm via Node's bundled corepack
pnpm install
pnpm dev           # http://localhost:5173
```

See [`docs/dev-setup.md`](./docs/dev-setup.md) for troubleshooting.

## Branch model

- `main` always builds and passes tests. Never commit directly.
- Feature branches:
  - `phase-N-short-name` — implements a phase from BUILD_GUIDE.md §12
    (e.g. `phase-15-15-pr-e-close`).
  - `fix/area-short-name` — bug fix.
  - `chore/short-name` — tooling, deps, docs.
  - `docs/short-name` — documentation only.
- One PR per phase, or one PR per logical chunk within a large phase. Recent
  phases ship as a lettered series: PR A, PR B, PR C, etc.; per-game polish
  in Phase 15 uses `phase-15-N-…` and `phase-15-N.vM-…` for variant splits.
- Squash-merge into `main`. Delete the branch after merge.
- Use a worktree (or the harness `EnterWorktree`) for any non-trivial change
  to keep your working tree isolated from `main`.

## Development workflow

Each BUILD_GUIDE phase follows a deliberate pipeline (the docs live under
`docs/superpowers/`):

1. **Brainstorm** the design — clarify requirements, weigh 2-3 approaches,
   present a design, get approval. Save the agreed design as a **spec** in
   `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and merge it.
2. **Plan** — break the spec into bite-sized, TDD-friendly tasks with exact
   file paths + code in `docs/superpowers/plans/YYYY-MM-DD-<topic>-plan.md`
   (per the deep-planning preference in user memory). Merge it.
3. **Implement** — execute the plan one PR at a time. Each PR runs the full
   Definition of Done before it opens.
4. **Release** — after the implementation PRs merge, update `CHANGELOG.md`,
   tag the release (pre-v1: `v0.PHASE-name`; from v1.0 onward: SemVer), and
   cut a GitHub Release.

Spec-first rule: if a rule, payout, or schema must change, update
`BUILD_GUIDE.md` first, commit it, then implement — code follows the spec.

## Architecture decisions

Record non-obvious architectural choices as ADRs in
`docs/adr/NNNN-short-title.md` (copy `docs/adr/_template.md`). Number
sequentially. Reference the ADR number in the relevant code comment,
BUILD_GUIDE row, and changelog entry. There are **47 ADRs** as of v1.0
(ADR-0047 = Plinko peg geometry). Superseded ADRs get a `**Status:**`
footer noting the successor; amended ADRs get an `## Amendments` section
rather than a rewrite — the body stays as the historical record.

## Phase 15 overhaul conventions (still apply post-v1.0)

Phase 15 was the complete UI/UX overhaul, polish, per-game feature additions,
admin expansion, and brand rename — decomposed into 16 dependency-ordered
sub-projects. All 16 shipped at v1.0. The umbrella roadmap
(`docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md`) is
the historical source of truth; the per-game recipe lives in
`docs/PHASE_15_PATTERNS.md`. Every new screen / feature post-v1.0 should
continue to follow these rules:

- **Build UI from the shared design-system primitives** — do not hand-roll
  one-off components per screen.
- **Tokens only — no hard-coded hex** in components. Colors, type, and
  spacing come from `src/theme/tokens.ts` + the tailwind config (this is
  already a CLAUDE.md rule; the overhaul made it real).
- **`useSound` is the only sound integration point.** Games call the hook —
  never embed `<audio>` directly. Volume + mute live in the Settings page and
  persist.
- **`prefers-reduced-motion` is honored everywhere** via
  `useEffectiveReducedMotion` — every animated surface has an instant /
  eased-down fallback. Reuse the shared Framer-Motion variant library rather
  than bespoke transitions.

Invariants that must survive forever (do NOT regress):

- **Game logic is untouched by UI work** — pure logic (`*.ts` in
  `src/games/**`), resolvers, machines, and their tests stay green. Feature
  adds get their own logic + tests, TDD'd.
- **Games sandbox preserved** — `src/games/**` never imports `src/db/**` or
  `src/store/**`; wallet access goes through `useGameRound` /
  `src/systems/**`. ESLint enforces.
- **One `rounds` row per game** (ADR-0016; session exceptions ADR-0041 for
  poker + ADR-0042-adjacent for craps table sessions).
- **Money is integers; seeded RNG only** (no `Math.random()`). All 47 ADRs
  remain authoritative and intact.
- **Page roots under `AppLayout` use `h-full`, not `min-h-screen`** —
  TopBar above main makes 100vh always overflow (see user memory
  `feedback-localgamble-min-h-screen-in-pages`).

## Commit message format (Conventional Commits)

`<type>(<scope>): <imperative summary>`

- **Types:** `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `perf`,
  `build`, `ci`. (Per project convention: prefer `chore(release)` for
  release-time bumps, not `release(scope)`.)
- **Subject limit:** **100 characters** — enforced by `commitlint`
  `header-max-length`. Long batch-fix subjects fail Meta files and skip CI.
  Push detail into the body, not the subject.
- **Imperative mood**, lower-case scope.

**Scopes** — the canonical list is enforced by `commitlint.config.js` (see
the `scope-enum` rule). The current allowed enum is:

`blackjack`, `roulette`, `slots`, `baccarat`, `wallet`, `auth`, `rng`,
`history`, `stats`, `leaderboard`, `lottery`, `bingo`, `plinko`, `poker`,
`theme`, `db`, `session`, `lobby`, `ci`, `build-guide`, `deps`, `deps-dev`,
`release`, `repo`, `adr`, `routing`, `ui`, `shell`, `coin-flip`, `games`,
`admin`, `tracking`, `craps`.

Notes:

- `charts` is **NOT** allowed (per user memory
  `reference-localgamble-commitlint-scopes`) — use `stats` for anything
  under `src/systems/stats.ts` or `src/components/charts/`.
- Don't expand the enum for one-off commits. If a diff touches a shared
  subsystem under a game's directory, use the closest existing game scope
  (per `feedback-localgamble-commitlint-scope-additions`).
- When you introduce a new game or area, add its scope to
  `commitlint.config.js` **in the same PR, before the first commit that
  uses it** — the `commit-msg` hook (and CI) will otherwise reject the
  commit. Spec/plan docs for a not-yet-scoped game use `docs(games)`.

**Examples:**

- `feat(poker): add side-pot computation`
- `fix(wallet): reject bets above balance`
- `test(roulette): cover corner bet payout`
- `chore(ci): cache pnpm store between runs`
- `chore(release): bump version to 1.0.0`
- `docs(build-guide): clarify baccarat third-card tableau`

## Testing notes

- **Game logic is the priority** — pure logic modules need thorough unit
  tests; coverage is enforced for `src/games/**/logic.ts`.
- **Seed all randomness** (`rng.seed(...)`, `deckFromSeed`, `mulberry32`) so
  tests are deterministic.
- **Scope component assertions.** Never use a global
  `screen.getByText(/value/)` for a value that can legitimately appear in
  more than one component on the page — it intermittently matches multiple
  elements and flakes in CI. Scope to a container (`within(card)`) or a
  `data-*` attribute (lesson from #169).
- For **XState machines**, feed scripted events with fixed seeds; the
  machine should do no async work itself (the page resolves async + RNG and
  sends pre-resolved events).
- For **fake-timer + `invoke`/`sendBack` tests**, prefer
  `await vi.advanceTimersByTimeAsync(ms)` over the sync variant (microtask
  delivery; lesson from #157).
- **Screenshot before pushing UI fixes.** For visual bug reports, run
  Playwright + the dev server and capture a screenshot first — CSS
  reasoning alone misses real bugs (user memory
  `feedback-localgamble-screenshot-before-pushing-ui`).

## Definition of done (before opening a PR)

The DoD is run by the agent / contributor before opening a PR. Every box must
be green.

- [ ] `pnpm lint` passes (max warnings 0)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm exec vitest run` passes (and adds tests for new logic)
- [ ] `pnpm build` passes
- [ ] `pnpm build-storybook` passes
- [ ] `pnpm exec prettier --check .` clean
- [ ] `npx markdownlint-cli2 --config .markdownlint.json '**/*.md'` clean
- [ ] Manually verified in `pnpm dev`
- [ ] PR description filled out from `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Linked to a GitHub issue or BUILD_GUIDE phase / sub-project

## Where things live

- `BUILD_GUIDE.md` — master spec, the contract.
- `CHANGELOG.md` — release notes (Keep-a-Changelog format; SemVer from v1.0).
- `docs/adr/*.md` — architecture decision records (47 as of v1.0).
- `docs/conventions.md` — code conventions.
- `docs/dev-setup.md` — environment setup + troubleshooting.
- `docs/risks.md` — risk register.
- `docs/brand/MASQUER.md` — Velvet Deco brand reference.
- `docs/PHASE_15_PATTERNS.md` — per-game polish recipe.
- `docs/MANUAL_SMOKE_v1.md` — pre-tag manual smoke checklist.
- `docs/superpowers/specs/*.md` — per-phase design specs (frozen records).
- `docs/superpowers/plans/*.md` — per-phase implementation plans (frozen).
- `~/.claude/projects/-Users-adam/memory/` — user-owned cross-session memory
  (not in the repo).

## PR review

You may self-merge once CI is green. Use the PR description checklist as a
self-review prompt before merging. For non-trivial changes, ask for a
`/review` or `/security-review` pass first.
