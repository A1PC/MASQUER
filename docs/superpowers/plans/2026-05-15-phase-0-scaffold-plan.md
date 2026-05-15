# Phase 0 — Scaffold + Meta-Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the complete development substrate for `localGamble` — repo conventions, GitHub project tracking, CI pipeline, Vite + React 18 + TypeScript scaffold, and quality tooling — so every subsequent BUILD_GUIDE phase lands into a working environment with enforced rules.

**Architecture:** Three sequential PRs, each adding one layer (PR #1 = process/meta, PR #2 = app scaffold, PR #3 = quality gates), then a release PR that tags `v0.1-scaffold`. CI evolves alongside so each PR's pipeline tests against its own additions.

**Tech Stack:** TypeScript 5.6, React 18.3, Vite 5.4, React Router 6.27, Tailwind 3.4, Zustand 5, Dexie 4, Framer Motion 11, ESLint 9 (flat config), Prettier 3, Vitest 2, Husky 9, lint-staged 15, pnpm 9, Node 20 LTS, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-15-phase-0-scaffold-design.md`

---

## File Structure (after all three PRs merge)

```
localGamble/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   ├── config.yml
│   │   ├── design-question.md
│   │   └── phase-task.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml                    # grows across PRs
│       └── claude.yml                # already in place
├── .husky/
│   └── pre-commit
├── .vscode/
│   └── extensions.json
├── docs/
│   ├── adr/
│   │   ├── _template.md
│   │   ├── 0001-tech-stack.md
│   │   ├── 0002-package-manager-and-node.md
│   │   ├── 0003-ci-strictness.md
│   │   ├── 0004-pr-strategy-phase-0.md
│   │   ├── 0005-no-branch-protection.md
│   │   ├── 0006-pre-commit-hooks.md
│   │   └── 0007-tracking-via-milestones.md
│   ├── conventions.md
│   ├── dev-setup.md
│   ├── risks.md
│   └── superpowers/
│       ├── plans/
│       │   └── 2026-05-15-phase-0-scaffold-plan.md  # this file
│       └── specs/
│           └── 2026-05-15-phase-0-scaffold-design.md
├── src/
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── components/.gitkeep
│   ├── db/.gitkeep
│   ├── games/
│   │   ├── _shared/.gitkeep
│   │   ├── baccarat/.gitkeep
│   │   ├── blackjack/.gitkeep
│   │   ├── roulette/.gitkeep
│   │   └── slots/.gitkeep
│   ├── index.css
│   ├── main.tsx
│   ├── pages/
│   │   ├── LeaderboardPage.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── StatsPage.tsx
│   ├── store/.gitkeep
│   ├── systems/.gitkeep
│   ├── test/setup.ts
│   └── theme/tokens.ts
├── .editorconfig
├── .gitignore
├── .markdownlint.json
├── .nvmrc
├── .prettierignore
├── .prettierrc
├── BUILD_GUIDE.md                    # already in place
├── CHANGELOG.md
├── CLAUDE.md
├── CONTRIBUTING.md
├── README.md                          # replaces stub
├── commitlint.config.js
├── eslint.config.js
├── index.html
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Pre-flight check (do this once before Task 1)

- [ ] **Step 1: Verify your local clone is up-to-date with origin/main**

```bash
cd /Users/adam/localGamble
git checkout main
git pull --ff-only
git status
```
Expected: `On branch main`, `Your branch is up to date with 'origin/main'.`, `nothing to commit, working tree clean`.

- [ ] **Step 2: Verify Node and pnpm are available**

```bash
node --version
corepack enable
which pnpm
```
Expected: Node v20.x. `pnpm` resolves via Corepack. If `node --version` shows < 20, run `nvm install 20 && nvm use 20`.

- [ ] **Step 3: Verify gh CLI is authenticated**

```bash
gh auth status
```
Expected: "Logged in to github.com account ..." with at least `repo` and `workflow` scopes. If not: `gh auth login`.

---

# PR #1 — Meta infrastructure

## Task 1: Create the PR #1 branch

**Files:** none (branch creation only)

- [ ] **Step 1: Create branch from main**

```bash
git checkout main
git pull --ff-only
git checkout -b phase-0-meta
```
Expected: `Switched to a new branch 'phase-0-meta'`.

## Task 2: Add CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md with hard rules**

Create `CLAUDE.md` with the exact content below:

```markdown
# Claude / Agent Instructions for localGamble

You are working in a TypeScript/React/Vite codebase that implements a local,
offline, play-money casino. The single source of truth is `BUILD_GUIDE.md`
in the repo root. Read it before doing anything.

## Hard rules — never violate

1. **Phase discipline.** Implement only the phase the user names. Do not
   pre-build future phases or "while I'm at it" features.
2. **Spec-first changes.** If a rule, payout, or schema must change, update
   `BUILD_GUIDE.md` first, commit it, then implement. Code follows the spec.
3. **Logic before UI.** For every game, write `logic.ts` (pure, no React,
   no I/O) with passing `logic.test.ts` BEFORE writing any React component.
4. **Games are sandboxed.** A file under `src/games/**` may NEVER import from
   `src/db/**` or `src/store/**` directly. Games go through `src/systems/**`
   only. (`placeBet`, `settleRound`, `recordRound` etc.)
5. **One RNG.** No `Math.random()` anywhere. Use `src/systems/rng.ts`. ESLint
   enforces this — do not add `eslint-disable` for it.
6. **Money is integers.** All chip amounts are integers. No floats. No
   `parseFloat`. Rounding bugs at this layer are unacceptable.
7. **Every round is recorded.** Every completed game round writes exactly
   one row to the `rounds` table via `systems/history.ts`. No exceptions.
8. **Definition of done.** Before saying a task is complete, run:
   `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. All four must
   pass. Then click through the affected feature in `pnpm dev`.

## Workflow

- One PR per BUILD_GUIDE phase (or per logical chunk within a large phase).
- Branch naming: `phase-N-short-name` or `fix/area-short-name` or
  `chore/short-name`. Never commit to `main`.
- Commit messages: Conventional Commits — `feat(blackjack): ...`,
  `fix(wallet): ...`, `test(roulette): ...`, `chore: ...`,
  `docs(build-guide): ...`. Imperative mood. Lower-case scope.
- Show your plan before non-trivial implementation work.

## Project map

- `BUILD_GUIDE.md` — master spec, read first
- `docs/superpowers/specs/` — per-phase design specs
- `docs/superpowers/plans/` — per-phase implementation plans
- `docs/adr/` — architecture decision records
- `src/systems/` — shared, side-effecting modules (auth, wallet, rng, history, stats, payouts)
- `src/games/<name>/logic.ts` — pure game rules, fully unit-tested
- `src/games/<name>/*.tsx` — React UI for that game
- `src/db/` — Dexie schema and typed helpers
- `src/store/` — Zustand stores (session, wallet)
- `src/theme/` — design tokens (colors, fonts), no hard-coded hex in components

## When in doubt

Ask before assuming. The cost of a clarifying question is much less than the
cost of building the wrong thing. If `BUILD_GUIDE.md` is silent or
ambiguous, raise it — don't pick silently.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(repo): add CLAUDE.md with agent hard rules"
```
Expected: 1 file changed, ~50 insertions.

## Task 3: Add CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

Create `CONTRIBUTING.md`. Note that the inner `bash` blocks use triple-backticks and the file itself uses normal markdown — copy the content between the leading and trailing markers verbatim.

```markdown
# Contributing to localGamble

## Local setup

Requirements: Node 20 LTS (see `.nvmrc`), pnpm 9+.

```bash
nvm use            # picks up .nvmrc
corepack enable    # enables pnpm via Node's bundled corepack
pnpm install
pnpm dev           # http://localhost:5173
```

## Branch model

- `main` always builds and passes tests. Never commit directly.
- Feature branches:
  - `phase-N-short-name` — implements a phase from BUILD_GUIDE.md §12
  - `fix/area-short-name` — bug fix
  - `chore/short-name` — tooling, deps, docs
- One PR per phase (or per logical chunk if a phase is very large).
- Squash-merge into `main`. Delete branch after merge.

## Commit message format (Conventional Commits)

`<type>(<scope>): <imperative summary>`

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `perf`, `build`, `ci`.

Scopes: `blackjack`, `roulette`, `slots`, `baccarat`, `wallet`, `auth`, `rng`,
`history`, `stats`, `leaderboard`, `theme`, `db`, `ci`, `build-guide`, etc.

Examples:
- `feat(blackjack): add dealer soft-17 logic`
- `fix(wallet): reject bets above balance`
- `test(roulette): cover corner bet payout`
- `chore(ci): cache pnpm store between runs`
- `docs(build-guide): clarify baccarat third-card tableau`

## Definition of done (before opening a PR)

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (and adds tests for new game logic)
- [ ] `pnpm build` passes
- [ ] Manually verified in `pnpm dev`
- [ ] PR description filled out from the template
- [ ] Linked to a GitHub issue or BUILD_GUIDE phase

## PR review

You may self-merge once CI is green. Use the PR description checklist as a
self-review prompt before merging.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs(repo): add CONTRIBUTING.md with branch and commit conventions"
```

## Task 4: Replace README.md and add CHANGELOG.md

**Files:**
- Modify: `README.md` (replaces stub)
- Create: `CHANGELOG.md`

- [ ] **Step 1: Overwrite README.md**

Overwrite `README.md` with:

```markdown
# localGamble

A local, offline, play-money casino app. Single-machine, no real money,
no internet. Browser-based.

See [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) for the full project specification.

## Quick start

```bash
nvm use && corepack enable && pnpm install
pnpm dev
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest in watch mode |
| `pnpm test:run` | Vitest single run with coverage |
| `pnpm format` | Prettier write |

## Documentation map

- `BUILD_GUIDE.md` — master spec
- `CLAUDE.md` — agent hard rules
- `CONTRIBUTING.md` — branch / commit / PR conventions
- `docs/conventions.md` — code conventions
- `docs/dev-setup.md` — environment setup
- `docs/risks.md` — risk register
- `docs/adr/*.md` — architecture decisions
- `docs/superpowers/specs/*.md` — per-phase design specs
- `docs/superpowers/plans/*.md` — per-phase implementation plans

## Project status

Tracked via [Milestones](../../milestones). One milestone per BUILD_GUIDE phase.
```

- [ ] **Step 2: Create CHANGELOG.md**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

### Added
- Repo infrastructure: CLAUDE.md, CONTRIBUTING.md, conventions, ADRs, risks
- GitHub: PR + issue templates, 9 phase milestones, labels, Dependabot
- CI v1: actionlint, markdownlint, commitlint
```

- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs(repo): replace README stub and add CHANGELOG"
```

## Task 5: Add .gitignore and .nvmrc

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Create .gitignore**

```
node_modules
dist
dist-ssr
coverage
.vite
*.local
.env
.env.*
!.env.example
.DS_Store
.idea
.vscode/*
!.vscode/extensions.json
*.log
pnpm-debug.log*
```

- [ ] **Step 2: Create .nvmrc**

```
20
```

(File content is the literal three characters `2`, `0`, newline.)

- [ ] **Step 3: Commit**

```bash
git add .gitignore .nvmrc
git commit -m "chore(repo): add .gitignore and .nvmrc (Node 20)"
```

## Task 6: Add markdownlint config

**Files:**
- Create: `.markdownlint.json`

- [ ] **Step 1: Create .markdownlint.json**

```json
{
  "default": true,
  "MD013": false,
  "MD033": false,
  "MD041": false
}
```

- [ ] **Step 2: Commit**

```bash
git add .markdownlint.json
git commit -m "chore(ci): add markdownlint config (disable line-length, inline HTML, first-line-h1)"
```

## Task 7: Add commitlint config

**Files:**
- Create: `commitlint.config.js`

- [ ] **Step 1: Create commitlint.config.js**

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'blackjack', 'roulette', 'slots', 'baccarat',
      'wallet', 'auth', 'rng', 'history', 'stats', 'leaderboard',
      'theme', 'db', 'session', 'lobby',
      'ci', 'build-guide', 'deps', 'release', 'repo'
    ]],
    'subject-case': [0],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add commitlint.config.js
git commit -m "chore(ci): add commitlint config with scope enum"
```

## Task 8: Add PR template

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p .github
```

Then create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary

<!-- 1-3 bullets: what changed and why -->

## BUILD_GUIDE reference

- Phase: <!-- e.g., Phase 3 — Blackjack -->
- Sections: <!-- e.g., §8.1, §12 -->

## How tested

<!-- - Unit tests added/updated: ... -->
<!-- - Manual verification steps: ... -->

## Screenshots / GIFs (UI changes)

<!-- Drag images here -->

## Definition of done

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Manually verified in dev server
- [ ] Updated BUILD_GUIDE.md if a rule/payout/schema changed
- [ ] No `Math.random()`, no direct DB/store access from games
```

- [ ] **Step 2: Commit**

```bash
git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore(repo): add pull request template"
```

## Task 9: Add issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/phase-task.md`
- Create: `.github/ISSUE_TEMPLATE/bug.md`
- Create: `.github/ISSUE_TEMPLATE/design-question.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 2: Create phase-task.md**

```markdown
---
name: Phase task
about: A unit of work within a BUILD_GUIDE phase
title: "[Phase N] <short title>"
labels: ["phase-N"]
---

## What
<!-- Concrete deliverable -->

## BUILD_GUIDE reference
- Phase:
- Sections:

## Acceptance criteria
- [ ]
- [ ]

## Notes / open questions
```

- [ ] **Step 3: Create bug.md**

```markdown
---
name: Bug
about: Something is wrong
title: "bug: <short title>"
labels: ["bug"]
---

## What's broken
## Steps to reproduce
1.
2.
## Expected
## Actual
## Environment (browser, profile)
```

- [ ] **Step 4: Create design-question.md**

```markdown
---
name: Design question
about: Open question that needs a decision before implementation
title: "design: <short title>"
labels: ["design"]
---

## The question
## Options considered
## Constraints from BUILD_GUIDE
## Recommendation (if any)
```

- [ ] **Step 5: Create config.yml**

```yaml
blank_issues_enabled: false
```

- [ ] **Step 6: Commit**

```bash
git add .github/ISSUE_TEMPLATE/
git commit -m "chore(repo): add 3 issue templates and disable blank issues"
```

## Task 10: Add Dependabot config

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create .github/dependabot.yml**

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 10
    groups:
      dev-dependencies:
        dependency-type: development
      react-stack:
        patterns: ["react", "react-dom", "react-router-dom"]
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore(deps): enable Dependabot for npm and github-actions"
```

## Task 11: Add docs/conventions.md

**Files:**
- Create: `docs/conventions.md`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p docs
```

Then create `docs/conventions.md`:

```markdown
# Code conventions

## Imports
- Use the `@/` alias for everything under `src/`. No deep relative paths
  (`../../../`).
- Type-only imports MUST use `import type`. Enforced by ESLint.
- Within `src/games/**`: no imports from `src/db` or `src/store`. Use
  `src/systems/*` only. Enforced by ESLint.

## File naming
- React components: `PascalCase.tsx` (e.g. `BettingPanel.tsx`)
- Hooks: `useThing.ts` in the consuming feature folder or `src/components/`
- Stores: `<area>Store.ts` (e.g. `walletStore.ts`)
- Systems: lowercase noun (`auth.ts`, `wallet.ts`, `rng.ts`)
- Game pure logic: `logic.ts` + `logic.test.ts` colocated
- Game UI entry: `<Game>Page.tsx` (e.g. `BlackjackPage.tsx`)

## React patterns
- Function components only. No class components.
- Default-export the page-level component; named-export everything else.
- Co-locate component-specific subcomponents in the same file unless they
  exceed ~80 lines, then split.
- Hooks live next to their consumer unless used by 2+ features → promote to
  `src/components/` or `src/systems/`.

## State
- Server-of-truth state (balances, rounds): IndexedDB via Dexie.
- Cross-page UI state (current user, current balance display): Zustand.
- Component-local state: `useState` / `useReducer`.
- Never duplicate Dexie state into Zustand — Zustand reads from systems
  which read from Dexie.

## Pure game logic
- `logic.ts` exports pure functions only. No React. No `Date.now()` (pass
  in if needed). No `Math.random()` (use rng).
- Inputs and outputs are plain TS types. Returns `RoundResult` for the
  settle step.
- Every exported function has at least one unit test. 90%+ coverage on
  `logic.ts` files is required and enforced by Vitest.

## Tests
- Vitest. File pattern: `*.test.ts`, `*.test.tsx`. Co-located with source.
- Use the seeded RNG (`rng.seed(...)`) in any test that consumes
  randomness.
- Component tests use React Testing Library. Query by role/text, never by
  test id unless unavoidable.
- One assertion concept per test. Use `describe` to group.

## Styling
- Tailwind utilities only. No `style={{...}}` for colors/spacing.
- Theme colors must reference Tailwind tokens (`bg-felt`, `text-gold`),
  never hex literals.
- Animations: prefer Framer Motion for anything beyond a CSS transition.

## Money
- All chip amounts are `number` type but always integers. Never floats.
- A wallet function MUST validate non-negative integers at boundaries.

## Commits and branches
- Conventional Commits. Enforced by commitlint in CI.
- One topic per commit. Squash-merge on PR.
- Branch names: `phase-N-short-name`, `fix/area-x`, `chore/x`, `docs/x`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/conventions.md
git commit -m "docs(repo): add code conventions"
```

## Task 12: Add docs/dev-setup.md

**Files:**
- Create: `docs/dev-setup.md`

- [ ] **Step 1: Create docs/dev-setup.md**

Note: contains nested triple-backtick code blocks. Copy verbatim.

````markdown
# Dev environment setup

## First-time setup

1. **Install Node 20** via `nvm`:
   ```bash
   nvm install 20
   nvm use
   ```
2. **Enable pnpm** (ships with Node 20 via Corepack):
   ```bash
   corepack enable
   pnpm --version  # should be 9.x
   ```
3. **Clone and install:**
   ```bash
   git clone https://github.com/A1PC/localGamble.git
   cd localGamble
   pnpm install --frozen-lockfile
   ```
4. **Run the dev server:**
   ```bash
   pnpm dev
   # opens http://localhost:5173
   ```

## Recommended editor: VS Code

Install the workspace-recommended extensions when prompted (see
`.vscode/extensions.json`):
- `dbaeumer.vscode-eslint` — ESLint
- `esbenp.prettier-vscode` — Prettier
- `bradlc.vscode-tailwindcss` — Tailwind IntelliSense
- `vitest.explorer` — Vitest test explorer

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `corepack: command not found` | Old Node | Upgrade to Node 20+ |
| `pnpm install` hangs at registry | Network / proxy | `pnpm config get registry`; reset to `https://registry.npmjs.org/` |
| Dev server port 5173 busy | Another Vite running | `lsof -i :5173`; kill or change `vite.config.ts` port |
| ESLint complains about every file | Wrong Node / pnpm version | `nvm use && corepack enable && pnpm install` |
| Husky hook didn't fire on commit | `prepare` script didn't run | `pnpm install` re-runs it; or `pnpm exec husky` manually |
| IndexedDB shows stale data after schema change | Old DB version | DevTools → Application → IndexedDB → delete `localGamble` |

## Browser support matrix

Targeted: latest stable **Chrome** and **Firefox** on desktop.
Out of scope: Safari (untested in MVP), all mobile browsers, anything
< 1024px viewport.
Why: this is a personal-machine app; one of two browsers is sufficient.
The build targets `>0.5%, last 2 versions, not dead, not op_mini all`
(default Vite preset).
````

- [ ] **Step 2: Commit**

```bash
git add docs/dev-setup.md
git commit -m "docs(repo): add dev environment setup guide"
```

## Task 13: Add docs/risks.md

**Files:**
- Create: `docs/risks.md`

- [ ] **Step 1: Create docs/risks.md**

```markdown
# Risk register

Reviewed at the start of each BUILD_GUIDE phase. Add or update entries as
new risks emerge.

| ID | Risk | Phase | L | I | Mitigation |
|---|---|---|---|---|---|
| R-01 | IndexedDB schema migration breaks existing balances | 1+ | M | H | Dexie `version().upgrade()` from day one; smoke test before merge |
| R-02 | RNG bias in payouts | 2+ | L | H | Centralized `systems/rng.ts` w/ rejection sampling; ESLint bans Math.random; chi-squared test added in Phase 2 |
| R-03 | Float chip math causes balance bugs | 2+ | M | H | Integer-only at boundaries; ESLint forbids `parseFloat` in wallet/logic; tests assert `Number.isInteger` |
| R-04 | Game directly mutates balance/store | 3–6 | M | H | ESLint blocks `@/db` and `@/store` imports under `src/games/**` |
| R-05 | Animation outpaces logic outcome | 3–6 | M | M | Outcome decided first; animation reads outcome (documented in `_shared/useGameRound`) |
| R-06 | Baccarat third-card tableau wrong | 6 | M | M | Implement verbatim from cited source; exhaustive truth-table test |
| R-07 | Roulette payout off-by-one | 4 | M | M | Document "X to 1" convention in `payouts.ts`; tests assert payout AND netChange |
| R-08 | Slots paytable un-fun (wrong RTP) | 5, 8 | H | L | Paytable in single config; "expected RTP simulator" test (10M spins) |
| R-09 | Hex literals leak into components | 8+ | M | L | ESLint rule (Phase 8) flagging hex in `*.tsx` outside `theme/`; review checklist |
| R-10 | Tests pass, prod build broken | All | L | M | `pnpm build` is required CI check |
| R-11 | Lockfile drift | All | L | M | `--frozen-lockfile` in CI; `packageManager` pinned |
| R-12 | Husky bypassed via `--no-verify` | All | M | L | CI is the enforcing layer; PR template asks |
| R-13 | Dependency vulnerabilities accumulate | Ongoing | M | L | Dependabot weekly (PR #1) |
| R-14 | Phase creep — future-phase features in early PRs | All | H | M | CLAUDE.md rule #1; PR template phase ref; reviewer rejects |
| R-15 | Solo-dev rubber-stamps own PRs | All | H | L | PR self-review checklist; CI must be green; squash-merge |

L = Likelihood (L/M/H), I = Impact (L/M/H).
```

- [ ] **Step 2: Commit**

```bash
git add docs/risks.md
git commit -m "docs(repo): add initial risk register"
```

## Task 14: Add ADR template

**Files:**
- Create: `docs/adr/_template.md`

- [ ] **Step 1: Create the directory and template**

```bash
mkdir -p docs/adr
```

Create `docs/adr/_template.md`:

```markdown
# ADR-NNNN: <decision title>

- Status: Proposed | Accepted | Superseded by ADR-XXXX | Deprecated
- Date: YYYY-MM-DD
- Deciders: @<github-handle>

## Context
What is the situation forcing this decision? What constraints apply?

## Decision
What did we decide?

## Alternatives considered
- **Option A** — pros / cons
- **Option B** — pros / cons

## Consequences
What becomes easier? What becomes harder? What did we lock ourselves into?

## References
- Links to BUILD_GUIDE sections, issues, prior ADRs.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/_template.md
git commit -m "docs(adr): add ADR template"
```

## Task 15: Add ADR-0001 (Tech Stack)

**Files:**
- Create: `docs/adr/0001-tech-stack.md`

- [ ] **Step 1: Create ADR-0001**

```markdown
# ADR-0001: Tech stack — TypeScript, React 18, Vite, Tailwind, Zustand, Dexie

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
We need a stack for a single-machine, browser-based, play-money casino app
with four games. The app does almost no performance-critical computation
but needs robust client-side persistence, smooth animation, and a
component model that suits card/wheel/reel UIs.

## Decision
Adopt the stack documented in BUILD_GUIDE.md §2: TypeScript + React 18 +
Vite + Tailwind CSS + Framer Motion + Zustand + Dexie + Web Crypto API +
React Router + Vitest + ESLint + Prettier.

## Alternatives considered
- **Native (C/C++ + game framework)** — manual memory management, compile
  cycle, hand-wired graphics for no gameplay benefit.
- **Vanilla JS + plain DOM** — would slow iteration and forfeit type
  safety; React component model fits this UI well.
- **Electron desktop app first** — same web code wrapped, packaging
  overhead with no gameplay benefit during build.

## Consequences
- TypeScript strictness catches money/payout bugs at compile time.
- React + Vite gives instant hot-reload.
- IndexedDB via Dexie is durable through refreshes/crashes.
- Stack is well-documented enough that AI assistants produce reliable code.
- Locks us into the browser as the runtime — desktop wrap is deferred to
  Phase 9 if ever.

## References
- BUILD_GUIDE.md §2 (Tech Stack)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0001-tech-stack.md
git commit -m "docs(adr): ADR-0001 tech stack"
```

## Task 16: Add ADR-0002 (Package manager and Node)

**Files:**
- Create: `docs/adr/0002-package-manager-and-node.md`

- [ ] **Step 1: Create ADR-0002**

```markdown
# ADR-0002: Package manager (pnpm) and Node version (20 LTS)

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
A large-scale TypeScript project needs a deterministic, fast, well-supported
package manager and a stable Node runtime. The choice affects the lockfile
format, CI cache strategy, contributor onboarding, and how strictly
transitive dependencies are isolated.

## Decision
Use **pnpm 9** as the package manager and **Node 20 LTS** as the runtime.
Pin both: `packageManager: "pnpm@9.12.0"` in `package.json`; `20` in
`.nvmrc`. CI installs with `pnpm install --frozen-lockfile`.

## Alternatives considered
- **npm + Node 20 LTS** — simplest, ships with Node, no learning curve.
  Trade-off: slower installs, looser dependency hoisting that can hide bugs.
- **Bun** — fastest installs, all-in-one. Trade-off: ecosystem still
  maturing, occasional Vite/Vitest plugin friction.
- **Yarn 4 (Berry)** — Plug'n'Play, workspace support. Trade-off: adds
  configuration complexity that this single-package repo doesn't need.

## Consequences
- Faster, smaller `node_modules` (pnpm content-addressable store).
- Stricter dependency boundaries — accidentally importing a transitive dep
  fails immediately rather than working by coincidence.
- Slight onboarding step (`corepack enable`).
- LTS support for Node 20 runs through April 2026, giving roughly a year of
  cushion before a planned upgrade.

## References
- BUILD_GUIDE.md §2 (Tech Stack)
- ADR-0001 (broader stack)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0002-package-manager-and-node.md
git commit -m "docs(adr): ADR-0002 pnpm + Node 20 LTS"
```

## Task 17: Add ADR-0003 (CI strictness)

**Files:**
- Create: `docs/adr/0003-ci-strictness.md`

- [ ] **Step 1: Create ADR-0003**

```markdown
# ADR-0003: CI strictness — lint, typecheck, test+coverage, build

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
A play-money casino is unforgiving about money math. BUILD_GUIDE §14 calls
out that we should be "thorough on money math and odds." We need a CI gate
that prevents money-related bugs from landing.

## Decision
Every PR must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`
(including coverage thresholds), and `pnpm build`. Coverage thresholds:
- `src/games/**/logic.ts`: 90% lines/functions/statements, 85% branches.
- `src/systems/**/*.ts`: 80% lines/functions/statements, 75% branches.
Other code unthresholded for now (UI tests light per BUILD_GUIDE §14).

## Alternatives considered
- **Lint + test only** — fast but allows TS-only and build-only failures
  through.
- **Add bundle-size budget + Lighthouse** — overkill for a local app with
  no perf SLA.
- **No coverage thresholds** — relies on discipline; rejected because
  game-logic regressions are high-impact.

## Consequences
- Slower CI (~3-5 min per PR vs ~1 min minimal).
- Catches almost every regression before merge.
- Tests must accompany every game-logic change (otherwise threshold drops).
- Some CI flakes possible from third-party action versions — pinned where
  practical, monitored via Dependabot.

## References
- BUILD_GUIDE.md §14 (Testing Strategy)
- ADR-0001 (Vitest is part of the stack)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0003-ci-strictness.md
git commit -m "docs(adr): ADR-0003 strict CI with coverage gate"
```

## Task 18: Add ADR-0004 (PR strategy for Phase 0)

**Files:**
- Create: `docs/adr/0004-pr-strategy-phase-0.md`

- [ ] **Step 1: Create ADR-0004**

```markdown
# ADR-0004: PR strategy for Phase 0 — three sequential PRs

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
Phase 0 produces no user-facing features but sets up a lot of
configuration. A single mega-PR is hard to review; over-fragmenting wastes
cycles. The CI workflow itself evolves alongside the code.

## Decision
Three sequential PRs:
1. **Meta infrastructure** (this PR) — CLAUDE.md, CONTRIBUTING, templates,
   conventions, ADRs, risks, CI v1 (file-only checks), Dependabot.
2. **Vite scaffold** — package.json, Vite/TS/Router setup, folder
   skeleton, placeholder pages, CI v2 (adds install + typecheck + build).
3. **Tooling** — Tailwind, ESLint flat config, Prettier, Vitest, Husky,
   sanity test, CI v3 (adds lint + test + coverage).

After PR #3 merges, a separate `chore(release):` PR adds CHANGELOG entry
and tags `v0.1-scaffold`.

## Alternatives considered
- **Single mega-PR** — faster but harder to review and bisect.
- **Three PRs split differently (e.g., bare scaffold, tooling, polish)**
  — leaves the bare scaffold PR in a half-broken intermediate state.

## Consequences
- Each PR's CI tests against its own additions.
- Reviewer cognitive load stays low.
- Slightly more overhead (3 PR descriptions, 3 merges).
- If we discover a wrong call in PR #1 after PR #2 starts, we revert and
  redo — accepted as a low-frequency event.

## References
- BUILD_GUIDE.md §12 (Build Order — Phased Roadmap)
- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0004-pr-strategy-phase-0.md
git commit -m "docs(adr): ADR-0004 three-PR sequence for Phase 0"
```

## Task 19: Add ADR-0005 (No branch protection)

**Files:**
- Create: `docs/adr/0005-no-branch-protection.md`

- [ ] **Step 1: Create ADR-0005**

```markdown
# ADR-0005: No GitHub branch protection — convention-based discipline

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
This is a solo project. BUILD_GUIDE.md §13 already states "never commit
directly to main." Adding GitHub branch protection would enforce that, but
also introduces friction (signing requirements, required reviewers,
required-checks plumbing) and would block emergency direct pushes.

## Decision
Do **not** enable branch protection on `main`. Rely on convention:
- CLAUDE.md hard rules forbid direct main commits.
- CONTRIBUTING.md restates the rule.
- PR template self-review keeps the gate honest.
- A slip past convention is recoverable via `git revert` (PR-based).

## Alternatives considered
- **Require PR + CI pass, allow self-merge** — better hygiene but more
  setup; revisit if collaborators join.
- **Require PR + CI + 1 review** — blocks self-merge entirely; impractical
  solo.
- **Require signed commits** — good security but adds key-management
  friction.

## Consequences
- Possible to bypass the rule under stress; mitigated by squash-merge
  history clarity and the ability to revert.
- Easier to recover if I'm ever locked out of the GitHub UI mid-incident.
- Revisit when a second contributor joins.

## References
- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
- ADR-0007 (tracking via milestones — same lightweight philosophy)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0005-no-branch-protection.md
git commit -m "docs(adr): ADR-0005 no branch protection (convention only)"
```

## Task 20: Add ADR-0006 (Pre-commit hooks)

**Files:**
- Create: `docs/adr/0006-pre-commit-hooks.md`

- [ ] **Step 1: Create ADR-0006**

```markdown
# ADR-0006: Pre-commit hooks — Husky + lint-staged (format + lint changed only)

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
We want fast feedback on lint/format mistakes without slowing every commit.
Running tests on every commit is too slow; running nothing means CI is the
only feedback loop, and a CI failure costs minutes.

## Decision
Use Husky (Git hooks manager) + lint-staged (run linters only on staged
files). The pre-commit hook runs:
- `eslint --fix --max-warnings=0` on staged `*.{ts,tsx,js,jsx}`
- `prettier --write` on staged `*.{ts,tsx,js,jsx,json,md,css,yml,yaml}`

No tests in pre-commit. Tests run in CI.

## Alternatives considered
- **No hooks** — every formatting slip becomes a CI failure.
- **Run tests too** — slow, encourages `--no-verify` bypass habit.
- **Pre-push instead of pre-commit** — useful, but pre-commit catches it
  earlier without much added cost.

## Consequences
- ~1-2 second pre-commit overhead, mostly on first commit after touching
  many files.
- ESLint auto-fix means most violations get corrected silently.
- `--no-verify` still bypasses; CI is the actual enforcement layer.
- Husky's `prepare` script must run after `pnpm install` to install the
  hook — included in `package.json` scripts.

## References
- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
- ADR-0003 (CI strictness — the actual gate)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0006-pre-commit-hooks.md
git commit -m "docs(adr): ADR-0006 pre-commit hooks via Husky + lint-staged"
```

## Task 21: Add ADR-0007 (Tracking via milestones)

**Files:**
- Create: `docs/adr/0007-tracking-via-milestones.md`

- [ ] **Step 1: Create ADR-0007**

```markdown
# ADR-0007: Project tracking — Milestones + Issues, no Projects board

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
BUILD_GUIDE.md has 9 phases with multiple sub-tasks each. We need
visibility into what's done, in flight, and next. Options range from
"nothing" to a full GitHub Projects board with Kanban columns.

## Decision
Use GitHub **Milestones** (one per BUILD_GUIDE phase) and **Issues** (one
per sub-task), with phase labels (`phase-0` … `phase-9`) and category
labels (`bug`, `design`, `chore`, etc.). PRs reference issues to close
them.

Do **not** set up a GitHub Projects board.

## Alternatives considered
- **GitHub Projects (v2) board + Issues** — visual Kanban, but more clicks
  per task. Worth it only if we'd actually look at the board daily.
- **Issues only, no milestones** — loses the "what's the goal of this
  unit of work?" framing.
- **Nothing — just BUILD_GUIDE.md checklist** — zero overhead but no
  per-task visibility, no link from PR → acceptance criteria.

## Consequences
- Milestones page becomes the macro view; issues page becomes the micro.
- PRs can `Closes #N` to auto-close issues.
- One-time scripted setup creates milestones/labels/issues via `gh`.
- Easy to upgrade to Projects board later if we want it.

## References
- BUILD_GUIDE.md §12 (Build Order)
- ADR-0005 (same lightweight philosophy)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0007-tracking-via-milestones.md
git commit -m "docs(adr): ADR-0007 tracking via Milestones + Issues"
```

## Task 22: Add CI workflow v1 (meta job only)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow file**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  meta:
    name: Meta files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate workflow YAML (actionlint)
        uses: reviewdog/action-actionlint@v1
        with:
          reporter: github-check
          fail_on_error: true

      - name: Lint markdown
        uses: DavidAnson/markdownlint-cli2-action@v18
        with:
          globs: '**/*.md'
          config: '.markdownlint.json'

      - name: Lint commit messages (PR only)
        if: github.event_name == 'pull_request'
        uses: wagoid/commitlint-github-action@v6
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(repo): add CI workflow v1 (actionlint + markdownlint + commitlint)"
```

## Task 23: Open PR #1 and verify CI

**Files:** none (GitHub operation)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin phase-0-meta
```

- [ ] **Step 2: Open the PR via gh CLI**

```bash
gh pr create --title "phase-0(meta): repo conventions, GH templates, CI v1, ADRs, risks" \
  --body "$(cat <<'EOF'
## Summary
Layer 1 of Phase 0: process and tracking infrastructure. No app code.

- CLAUDE.md, CONTRIBUTING.md, README.md, CHANGELOG.md
- .gitignore, .nvmrc (Node 20)
- .markdownlint.json, commitlint.config.js
- .github/PULL_REQUEST_TEMPLATE.md, ISSUE_TEMPLATE/{phase-task,bug,design-question,config}
- .github/dependabot.yml
- .github/workflows/ci.yml v1 (meta job only — actionlint, markdownlint, commitlint)
- docs/conventions.md, docs/dev-setup.md, docs/risks.md
- docs/adr/_template.md and ADR-0001..0007

## BUILD_GUIDE reference
- Phase: 0 — Scaffold
- Sections: §3, §13, §14, §15

## How tested
- CI's `meta` job will validate workflow YAML, markdown, and PR commit messages.

## Definition of done
- [ ] CI green
- [ ] All issue templates appear in 'New Issue' picker
- [ ] PR template renders for new PRs
- [ ] Dependabot active in Insights → Dependency graph

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: returns the PR URL.

- [ ] **Step 3: Wait for CI and verify green**

```bash
gh pr checks --watch
```
Expected: `meta` job passes (actionlint, markdownlint, commitlint all green).

If `commitlint` fails on any commit message, fix the offending commit (`git rebase -i origin/main` to reword) and force-push the branch (`git push --force-with-lease`).

- [ ] **Step 4: Self-review and merge**

```bash
gh pr view --web
```

Click through the diff. When satisfied:

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

## Task 24: Create GitHub milestones via gh

**Files:** none (GitHub API operation)

This task and Task 25 modify shared GitHub state. They're idempotent (the API will reject duplicates with a clear error, no harm done) but only run them once.

- [ ] **Step 1: Create the 9 milestones**

Run each command. Each prints a JSON blob on success.

```bash
gh api repos/A1PC/localGamble/milestones -f title="Phase 0 — Scaffold" \
  -f description="Vite/React/TS/Tailwind scaffold + repo infrastructure (CI, templates, conventions). BUILD_GUIDE §12."
gh api repos/A1PC/localGamble/milestones -f title="Phase 1 — Data + Auth" \
  -f description="Dexie schema, auth.ts, register/login/logout, session persistence, route guards. BUILD_GUIDE §6, §7."
gh api repos/A1PC/localGamble/milestones -f title="Phase 2 — Wallet + Lobby + Game shell" \
  -f description="walletStore, wallet.ts, lobby, GameShell, BettingPanel, history.ts, rng.ts. BUILD_GUIDE §4, §5."
gh api repos/A1PC/localGamble/milestones -f title="Phase 3 — Blackjack" \
  -f description="Pure logic + tests, then UI. BUILD_GUIDE §8.1."
gh api repos/A1PC/localGamble/milestones -f title="Phase 4 — Roulette" \
  -f description="All bet types from BUILD_GUIDE §8.2."
gh api repos/A1PC/localGamble/milestones -f title="Phase 5 — Slots" \
  -f description="3-reel single-line, config-driven paytable. BUILD_GUIDE §8.3."
gh api repos/A1PC/localGamble/milestones -f title="Phase 6 — Baccarat" \
  -f description="Including third-card tableau and 5% commission. BUILD_GUIDE §8.4."
gh api repos/A1PC/localGamble/milestones -f title="Phase 7 — Stats + Leaderboard" \
  -f description="stats.ts derives everything from rounds + balances. BUILD_GUIDE §9, §10."
gh api repos/A1PC/localGamble/milestones -f title="Phase 8 — Polish" \
  -f description="Animations, sound, theme refinement, daily top-up. BUILD_GUIDE §11, §12."
gh api repos/A1PC/localGamble/milestones -f title="Phase 9 — Optional" \
  -f description="Electron/Tauri wrap, split, multi-line slots, more games. BUILD_GUIDE §12 (optional)."
```

- [ ] **Step 2: Verify all 9 exist**

```bash
gh api repos/A1PC/localGamble/milestones --jq '.[].title' | wc -l
```
Expected: `10` if you also count the default `v1.0` milestone (if any), otherwise `9`. Use `gh api repos/A1PC/localGamble/milestones --jq '.[].title'` to list and confirm by eye.

## Task 25: Create labels via gh

**Files:** none (GitHub API operation)

- [ ] **Step 1: Create phase labels**

```bash
gh label create "phase-0" --color "B0BEC5" --description "Phase 0 — Scaffold" || true
gh label create "phase-1" --color "90CAF9" --description "Phase 1 — Data + Auth" || true
gh label create "phase-2" --color "80DEEA" --description "Phase 2 — Wallet + Lobby + Game shell" || true
gh label create "phase-3" --color "A5D6A7" --description "Phase 3 — Blackjack" || true
gh label create "phase-4" --color "FFE082" --description "Phase 4 — Roulette" || true
gh label create "phase-5" --color "FFAB91" --description "Phase 5 — Slots" || true
gh label create "phase-6" --color "F48FB1" --description "Phase 6 — Baccarat" || true
gh label create "phase-7" --color "CE93D8" --description "Phase 7 — Stats + Leaderboard" || true
gh label create "phase-8" --color "9FA8DA" --description "Phase 8 — Polish" || true
gh label create "phase-9" --color "B0BEC5" --description "Phase 9 — Optional" || true
```

The trailing `|| true` keeps the script flowing if a label already exists.

- [ ] **Step 2: Create category labels**

```bash
gh label create "bug" --color "D73A4A" --description "Something is wrong" || true
gh label create "design" --color "8B5CF6" --description "Open design question" || true
gh label create "chore" --color "C5DEF5" --description "Tooling, deps, housekeeping" || true
gh label create "tooling" --color "0E8A16" --description "Build/test/lint tooling" || true
gh label create "docs" --color "0075CA" --description "Documentation" || true
gh label create "tests" --color "5319E7" --description "Test additions or fixes" || true
gh label create "blocked" --color "111111" --description "Cannot proceed; depends on something" || true
gh label create "needs-spec" --color "FBCA04" --description "Requires design before implementation" || true
gh label create "ready-for-review" --color "0E8A16" --description "Awaiting review" || true
```

- [ ] **Step 3: Verify**

```bash
gh label list --limit 30
```
Expected: All 19 labels visible.

## Task 26: File the 15 Phase 0 issues

**Files:** none (GitHub API operation)

These issues track the work in this plan. We file them after PR #1 merges so the milestones and labels exist.

- [ ] **Step 1: Get the Phase 0 milestone number**

```bash
PHASE_0_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 0 — Scaffold") | .number')
echo "Phase 0 milestone number: $PHASE_0_MS"
```

- [ ] **Step 2: File all 15 issues**

```bash
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,docs" \
  --title "[Phase 0] PR #1 — Repo meta: CLAUDE.md, CONTRIBUTING.md, gitignore, nvmrc, README, CHANGELOG" \
  --body "Tracked in PR #1. Implements: CLAUDE.md hard rules, CONTRIBUTING.md branch/commit/PR conventions, .gitignore, .nvmrc (Node 20), README replacement, CHANGELOG starter. Spec §6.1–6.7."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,chore" \
  --title "[Phase 0] PR #1 — GitHub templates (PR template, 3 issue templates)" \
  --body "PR template + phase-task/bug/design-question issue templates + config.yml disabling blanks. Spec §6.3, §6.4."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #1 — CI workflow v1: actionlint + markdownlint + commitlint" \
  --body "Initial CI gate before any code lands. Spec §4a, §6.10 (PR #1 state)."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,chore" \
  --title "[Phase 0] PR #1 — Create 9 phase milestones + labels via gh; enable Dependabot" \
  --body "Milestones, labels, dependabot.yml. Spec §11."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #2 — Vite + React 18 + TS + React Router scaffold" \
  --body "package.json, lockfile, vite/tsconfig setup. Spec §6.12–6.16."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,chore" \
  --title "[Phase 0] PR #2 — Folder skeleton (.gitkeep) per BUILD_GUIDE §3" \
  --body "All src/ subdirectories with .gitkeep. Spec §5 (PR #2)."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #2 — Placeholder routes/pages and routing shell" \
  --body "src/main.tsx, src/App.tsx, 5 placeholder pages. Spec §6.18–6.20."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #2 — CI workflow v2: install + typecheck + build" \
  --body "Adds the build job. Spec §4a (PR #2 state)."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #3 — Tailwind v3 + theme tokens + index.css" \
  --body "tailwind.config.ts, postcss.config.js, src/index.css, src/theme/tokens.ts. Spec §6.21–6.24."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #3 — ESLint flat config (incl. Math.random + games-import bans)" \
  --body "Spec §6.25 — bans Math.random globally, bans @/db and @/store imports under src/games/**."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #3 — Prettier + EditorConfig + format script" \
  --body "Spec §6.26–6.28."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling,tests" \
  --title "[Phase 0] PR #3 — Vitest + RTL + jsdom + coverage thresholds" \
  --body "vitest.config.ts with coverage thresholds scoped to game logic + systems. Spec §6.29–6.30."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tooling" \
  --title "[Phase 0] PR #3 — Husky + lint-staged pre-commit hook" \
  --body "Spec §6.32. Format + lint changed files only."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,tests" \
  --title "[Phase 0] PR #3 — Sanity test (App.test.tsx) passing" \
  --body "Verifies routing renders the lobby placeholder. Spec §6.31."
gh issue create --milestone "$PHASE_0_MS" --label "phase-0,chore" \
  --title "[Phase 0] Tag v0.1-scaffold release after PR #3 merges" \
  --body "Per spec §15: chore(release) PR + tag + GH release."
```

- [ ] **Step 3: Verify**

```bash
gh issue list --milestone "Phase 0 — Scaffold" --limit 20
```
Expected: 15 issues listed.

---

# PR #2 — Vite scaffold + folder skeleton

## Task 27: Create the PR #2 branch

**Files:** none

- [ ] **Step 1: Branch from updated main**

```bash
git checkout main
git pull --ff-only
git checkout -b phase-0-scaffold
```

## Task 28: Create package.json

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "localgamble",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Generate the lockfile**

```bash
corepack enable
pnpm install
```
Expected: creates `pnpm-lock.yaml` and `node_modules/`.

## Task 29: Create tsconfig files

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 2: Create tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "useDefineForClassFields": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

## Task 30: Create vite.config.ts and index.html

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`

- [ ] **Step 1: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5173, strictPort: true },
});
```

- [ ] **Step 2: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>localGamble</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Task 31: Create the source folder skeleton

**Files:**
- Create: `src/components/.gitkeep`
- Create: `src/db/.gitkeep`
- Create: `src/games/_shared/.gitkeep`
- Create: `src/games/baccarat/.gitkeep`
- Create: `src/games/blackjack/.gitkeep`
- Create: `src/games/roulette/.gitkeep`
- Create: `src/games/slots/.gitkeep`
- Create: `src/store/.gitkeep`
- Create: `src/systems/.gitkeep`

- [ ] **Step 1: Create empty placeholder files**

```bash
mkdir -p src/components src/db src/store src/systems \
  src/games/_shared src/games/blackjack src/games/roulette \
  src/games/slots src/games/baccarat
touch src/components/.gitkeep src/db/.gitkeep src/store/.gitkeep \
  src/systems/.gitkeep src/games/_shared/.gitkeep \
  src/games/blackjack/.gitkeep src/games/roulette/.gitkeep \
  src/games/slots/.gitkeep src/games/baccarat/.gitkeep
```

(`src/theme/` and `src/test/` are added in PR #3 with real content, so no `.gitkeep` needed yet.)

## Task 32: Create the page placeholders

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/RegisterPage.tsx`
- Create: `src/pages/LobbyPage.tsx`
- Create: `src/pages/StatsPage.tsx`
- Create: `src/pages/LeaderboardPage.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/pages
```

- [ ] **Step 2: Create LobbyPage.tsx**

```tsx
export default function LobbyPage() {
  return (
    <main>
      <h1>Lobby</h1>
      <p>Phase 0 placeholder.</p>
    </main>
  );
}
```

- [ ] **Step 3: Create LoginPage.tsx**

```tsx
export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <p>Phase 0 placeholder.</p>
    </main>
  );
}
```

- [ ] **Step 4: Create RegisterPage.tsx**

```tsx
export default function RegisterPage() {
  return (
    <main>
      <h1>Register</h1>
      <p>Phase 0 placeholder.</p>
    </main>
  );
}
```

- [ ] **Step 5: Create StatsPage.tsx**

```tsx
export default function StatsPage() {
  return (
    <main>
      <h1>Stats</h1>
      <p>Phase 0 placeholder.</p>
    </main>
  );
}
```

- [ ] **Step 6: Create LeaderboardPage.tsx**

```tsx
export default function LeaderboardPage() {
  return (
    <main>
      <h1>Leaderboard</h1>
      <p>Phase 0 placeholder.</p>
    </main>
  );
}
```

## Task 33: Create main.tsx and App.tsx

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create src/App.tsx**

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Create src/main.tsx**

(No `import '@/index.css'` yet — that's added in PR #3.)

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

## Task 34: Verify dev server and build work

**Files:** none (verification only)

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 2: Run dev server (briefly)**

```bash
pnpm dev
```
Expected: prints `VITE v5.4.x  ready in NNN ms` and serves on port 5173. Open `http://localhost:5173` in a browser, see "Lobby" heading. Press Ctrl+C to stop.

- [ ] **Step 3: Run build**

```bash
pnpm build
```
Expected: produces `dist/` directory. **Note the bundle size from the Vite output (e.g., `dist/assets/index-NNNN.js     XXX.XX kB`) — record this in the PR description as the Phase 0 baseline.**

- [ ] **Step 4: Run preview**

```bash
pnpm preview
```
Expected: serves the built bundle on port 4173. Open in browser, verify lobby renders. Stop with Ctrl+C.

## Task 35: Extend CI to v2 (add build job)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update ci.yml to add the build job**

Replace the entire `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  meta:
    name: Meta files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate workflow YAML (actionlint)
        uses: reviewdog/action-actionlint@v1
        with:
          reporter: github-check
          fail_on_error: true

      - name: Lint markdown
        uses: DavidAnson/markdownlint-cli2-action@v18
        with:
          globs: '**/*.md'
          config: '.markdownlint.json'

      - name: Lint commit messages (PR only)
        if: github.event_name == 'pull_request'
        uses: wagoid/commitlint-github-action@v6

  build:
    name: Install · Typecheck · Build
    runs-on: ubuntu-latest
    needs: meta
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build

      - name: Upload dist
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: dist
          retention-days: 7
```

## Task 36: Commit and open PR #2

**Files:** none

- [ ] **Step 1: Commit all PR #2 work in logical chunks**

```bash
# Chunk 1: package + tooling configs
git add package.json pnpm-lock.yaml tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html
git commit -m "feat(repo): add Vite + React 18 + TS scaffold (package.json, tsconfig, vite.config)"

# Chunk 2: source code
git add src/
git commit -m "feat(repo): add routing shell, placeholder pages, and folder skeleton"

# Chunk 3: CI extension
git add .github/workflows/ci.yml
git commit -m "ci(repo): add install + typecheck + build job (CI v2)"
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin phase-0-scaffold
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "phase-0(scaffold): Vite + React 18 + TS + React Router skeleton" \
  --body "$(cat <<'EOF'
## Summary
Layer 2 of Phase 0: working Vite + React 18 + TypeScript scaffold with React Router. No features.

- package.json (pnpm 9, Node 20), pnpm-lock.yaml
- tsconfig (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, @/* alias)
- vite.config.ts (React plugin, @/ alias, port 5173)
- index.html
- src/main.tsx (React Router shell), src/App.tsx (route table)
- 5 placeholder pages (Login, Register, Lobby, Stats, Leaderboard)
- Folder skeleton with .gitkeep per BUILD_GUIDE §3
- CI v2: adds install + typecheck + build job (depends on meta)

## BUILD_GUIDE reference
- Phase: 0 — Scaffold
- Sections: §3 (architecture), §12 (build order)

## How tested
- pnpm typecheck → green
- pnpm dev → http://localhost:5173, /lobby placeholder renders
- pnpm build → produces dist/, bundle size: <FILL IN FROM TASK 34 STEP 3>
- pnpm preview → built bundle serves correctly
- All 6 routes navigated manually, all redirects work, unknown route → /lobby

## Definition of done
- [ ] All CI jobs green (meta + build)
- [ ] Recorded bundle size baseline above
- [ ] Smoke test plan from spec §12 PR #2 completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Before pushing, edit the PR body to fill in the bundle size from Task 34 Step 3.

- [ ] **Step 4: Watch CI and merge**

```bash
gh pr checks --watch
```
Expected: `meta` and `build` both green.

When green, merge:

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

---

# PR #3 — Tooling: Tailwind, ESLint, Prettier, Vitest, Husky

## Task 37: Create the PR #3 branch

**Files:** none

- [ ] **Step 1: Branch from updated main**

```bash
git checkout main
git pull --ff-only
git checkout -b phase-0-tooling
```

## Task 38: Add new dependencies to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Replace package.json with the full version**

```json
{
  "name": "localgamble",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint . --max-warnings=0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:run": "vitest run --coverage",
    "prepare": "husky"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "framer-motion": "^11.11.0",
    "zustand": "^5.0.1",
    "dexie": "^4.0.10"
  },
  "devDependencies": {
    "@eslint/js": "^9.14.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "@vitest/coverage-v8": "^2.1.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.14.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "globals": "^15.12.0",
    "husky": "^9.1.6",
    "jsdom": "^25.0.1",
    "lint-staged": "^15.2.10",
    "postcss": "^8.4.49",
    "prettier": "^3.3.3",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.13.0",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,css,yml,yaml}": ["prettier --write"]
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm install
```
Expected: lockfile updated, ~30 new packages installed. Husky's `prepare` script runs, creating `.husky/`.

## Task 39: Add Tailwind config and styles

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Create: `src/theme/tokens.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: '#0b1f17', deep: '#06120c' },
        casino: { red: '#a3122a', 'red-deep': '#6e0a1d' },
        gold: { DEFAULT: '#d4af37', bright: '#f0c64a' },
        neon: { cyan: '#3df0ff', magenta: '#ff5cf2' },
        chip: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
      },
      fontFamily: {
        display: ['"Bungee"', '"Anton"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(61,240,255,0.6)',
        'neon-magenta': '0 0 12px rgba(255,92,242,0.6)',
        'gold-glow': '0 0 18px rgba(212,175,55,0.55)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Create postcss.config.js**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 3: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root { height: 100%; }
  body { @apply bg-felt-deep text-white font-body antialiased; }
  h1, h2, h3 { @apply font-display tracking-wide; }
}
```

- [ ] **Step 4: Create src/theme/tokens.ts**

```bash
mkdir -p src/theme
```

```ts
export const tokens = {
  color: {
    bg: { base: '#06120c', felt: '#0b1f17' },
    primary: { red: '#a3122a', redDeep: '#6e0a1d' },
    accent: { gold: '#d4af37', goldBright: '#f0c64a' },
    highlight: { cyan: '#3df0ff', magenta: '#ff5cf2' },
    outcome: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
  },
} as const;

export type ThemeTokens = typeof tokens;
```

- [ ] **Step 5: Add CSS import to src/main.tsx**

Modify `src/main.tsx` to add the CSS import. The new file:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify Tailwind works**

```bash
pnpm dev
```
Open `http://localhost:5173`. The body background should be near-black (felt-deep), text white, headings in display font. Stop with Ctrl+C.

## Task 40: Add Prettier config

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`
- Create: `.editorconfig`

- [ ] **Step 1: Create .prettierrc**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 2: Create .prettierignore**

```
dist
coverage
node_modules
pnpm-lock.yaml
```

- [ ] **Step 3: Create .editorconfig**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 4: Run Prettier on the codebase to normalize**

```bash
pnpm format
```
Expected: writes formatted files. Some may show as changed by Prettier — that's expected.

## Task 41: Add ESLint config (TDD: write failing-lint tests first)

**Files:**
- Create: `eslint.config.js`
- Create: `src/_lint-fixtures/math-random.ts` (test fixture, deleted after)
- Create: `src/games/blackjack/_lint-fixtures/db-import.ts` (test fixture, deleted after)

ESLint rules are easier to verify by writing fixture files that should fail, running ESLint, and confirming the right errors fire. Then deleting the fixtures.

- [ ] **Step 1: Create eslint.config.js**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.husky', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { project: ['./tsconfig.app.json', './tsconfig.node.json'] },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'Math.random is banned. Use src/systems/rng.ts (BUILD_GUIDE §5).'
        }
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['src/games/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/db/*', '@/db'], message: 'Games must not touch the DB directly. Go through src/systems/* (BUILD_GUIDE §3).' },
            { group: ['@/store/*', '@/store'], message: 'Games must not touch stores directly. Go through src/systems/* (BUILD_GUIDE §3).' },
          ],
        },
      ],
    },
  },
  prettier,
);
```

- [ ] **Step 2: Create the Math.random fixture (will fail lint)**

```bash
mkdir -p src/_lint-fixtures
```

`src/_lint-fixtures/math-random.ts`:

```ts
export function bad(): number {
  return Math.random();
}
```

- [ ] **Step 3: Run lint and verify the Math.random fixture fails**

```bash
pnpm lint
```
Expected: ERROR mentioning "Math.random is banned. Use src/systems/rng.ts (BUILD_GUIDE §5)." pointing at `src/_lint-fixtures/math-random.ts`.

If the error fires correctly, the rule is wired up.

- [ ] **Step 4: Create the games-import fixture**

```bash
mkdir -p src/games/blackjack/_lint-fixtures
```

`src/games/blackjack/_lint-fixtures/db-import.ts`:

```ts
import type { Anything } from '@/db/schema';

export const x: Anything | undefined = undefined;
```

- [ ] **Step 5: Run lint and verify both fixtures fail**

```bash
pnpm lint
```
Expected: TWO errors —
- "Math.random is banned ..." in `src/_lint-fixtures/math-random.ts`
- "Games must not touch the DB directly ..." in `src/games/blackjack/_lint-fixtures/db-import.ts`

If both fire, both rules are correctly wired.

- [ ] **Step 6: Delete both fixtures**

```bash
rm -rf src/_lint-fixtures src/games/blackjack/_lint-fixtures
```

- [ ] **Step 7: Run lint and verify clean**

```bash
pnpm lint
```
Expected: zero errors, zero warnings.

## Task 42: Add Vitest config and test setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/games/**/logic.ts', 'src/systems/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      thresholds: {
        'src/games/**/logic.ts': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/systems/**/*.ts': { lines: 80, functions: 80, branches: 75, statements: 80 },
      },
    },
  },
});
```

- [ ] **Step 2: Create src/test/setup.ts**

```bash
mkdir -p src/test
```

```ts
import '@testing-library/jest-dom/vitest';
```

## Task 43: Add the sanity test (TDD)

**Files:**
- Create: `src/App.test.tsx`

This is the test that verifies the test harness works.

- [ ] **Step 1: Write the failing test first**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

it('renders the lobby placeholder by default', () => {
  render(<MemoryRouter initialEntries={['/lobby']}><App /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /lobby/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm test:run
```
Expected: 1 test passes. (Note: the App and LobbyPage already exist from PR #2 — this test verifies the test harness, not new behavior.)

If the test fails because of a coverage threshold violation: that's because there are no `src/games/**/logic.ts` or `src/systems/**/*.ts` files yet. The threshold should not fire on missing-but-globbed paths — verify by reading the Vitest output. If it does fire, adjust `vitest.config.ts` thresholds to use `perFile: false` or temporarily comment out the thresholds and add a TODO; this should not block PR #3.

## Task 44: Add Husky pre-commit hook

**Files:**
- Create: `.husky/pre-commit`

- [ ] **Step 1: Create the hook**

The `.husky/` directory was created by `pnpm install` running the `prepare` script. Add the pre-commit hook:

```bash
mkdir -p .husky
```

`.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 3: Verify the hook fires**

Make a trivial change and try to commit:

```bash
echo "" >> README.md
git add README.md
git commit -m "test(repo): verify husky hook fires"
```
Expected: lint-staged runs (you'll see "Running tasks for staged files..." or similar). If it does nothing about the README change (only formats), the commit proceeds.

Then revert that test commit:

```bash
git reset --soft HEAD~1
git restore --staged README.md
git checkout README.md
```

## Task 45: Add VS Code recommended extensions

**Files:**
- Create: `.vscode/extensions.json`

- [ ] **Step 1: Create the file**

```bash
mkdir -p .vscode
```

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer",
    "ms-vsliveshare.vsliveshare"
  ]
}
```

(`.gitignore` already excludes `.vscode/*` except `extensions.json` — verify by `git status .vscode/` showing only `extensions.json`.)

## Task 46: Extend CI to v3 (add lint and test jobs)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace ci.yml with the final version**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  meta:
    name: Meta files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate workflow YAML (actionlint)
        uses: reviewdog/action-actionlint@v1
        with:
          reporter: github-check
          fail_on_error: true

      - name: Lint markdown
        uses: DavidAnson/markdownlint-cli2-action@v18
        with:
          globs: '**/*.md'
          config: '.markdownlint.json'

      - name: Lint commit messages (PR only)
        if: github.event_name == 'pull_request'
        uses: wagoid/commitlint-github-action@v6

  lint:
    name: Lint · Format
    runs-on: ubuntu-latest
    needs: meta
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  test:
    name: Test · Coverage
    runs-on: ubuntu-latest
    needs: meta
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ github.sha }}
          path: coverage
          retention-days: 14

  build:
    name: Install · Typecheck · Build
    runs-on: ubuntu-latest
    needs: meta
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build
      - name: Upload dist
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: dist
          retention-days: 7
```

## Task 47: Run the full Definition-of-Done check locally

**Files:** none

- [ ] **Step 1: Run all four gate commands**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```
Expected: all four exit 0. If any fail, fix before proceeding.

- [ ] **Step 2: Smoke-test the dev server one more time**

```bash
pnpm dev
```
Open `http://localhost:5173`. Verify:
- Background is near-black (Tailwind applied)
- "Lobby" heading uses display font
- Manual nav to /login, /register, /stats, /leaderboard works
- Unknown route /foo → /lobby
- DevTools console: no errors

Stop with Ctrl+C.

## Task 48: Commit and open PR #3

**Files:** none

- [ ] **Step 1: Commit in logical chunks**

```bash
# Chunk 1: package + Tailwind
git add package.json pnpm-lock.yaml tailwind.config.ts postcss.config.js src/index.css src/theme/ src/main.tsx
git commit -m "feat(theme): add Tailwind + retro Vegas tokens"

# Chunk 2: ESLint
git add eslint.config.js
git commit -m "chore(repo): add ESLint flat config (Math.random ban, games-import sandboxing)"

# Chunk 3: Prettier + EditorConfig
git add .prettierrc .prettierignore .editorconfig
git commit -m "chore(repo): add Prettier and EditorConfig"

# Chunk 4: Vitest + sanity test
git add vitest.config.ts src/test/ src/App.test.tsx
git commit -m "test(repo): add Vitest config (jsdom + coverage thresholds) and sanity test"

# Chunk 5: Husky
git add .husky/pre-commit
git commit -m "chore(repo): add Husky pre-commit hook (lint-staged)"

# Chunk 6: VS Code
git add .vscode/extensions.json
git commit -m "chore(repo): recommend VS Code extensions"

# Chunk 7: CI v3
git add .github/workflows/ci.yml
git commit -m "ci(repo): add lint and test jobs (CI v3)"
```

If `pnpm format` modified any other files (for example, normalizing the spec markdown), include those in the most relevant chunk above with a note in the commit message.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin phase-0-tooling
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "phase-0(tooling): Tailwind, ESLint, Prettier, Vitest, Husky" \
  --body "$(cat <<'EOF'
## Summary
Layer 3 of Phase 0: quality gates fully wired.

- Tailwind v3 with retro Vegas tokens (BUILD_GUIDE §11), src/index.css, src/theme/tokens.ts
- ESLint flat config with Math.random ban (no-restricted-syntax) and games-import sandboxing (no-restricted-imports under src/games/**)
- Prettier + .prettierignore + .editorconfig
- Vitest + RTL + jsdom + coverage thresholds (90% game logic, 80% systems)
- Sanity test src/App.test.tsx verifying lobby renders
- Husky + lint-staged pre-commit hook
- .vscode/extensions.json (workspace-recommended extensions)
- CI v3: adds lint and test jobs alongside build

## BUILD_GUIDE reference
- Phase: 0 — Scaffold
- Sections: §3, §5, §11, §14

## How tested
- Verified Math.random ban via fixture file (lint failed with the BUILD_GUIDE §5 message; fixture deleted)
- Verified games-import ban via fixture under src/games/blackjack/ (lint failed with the BUILD_GUIDE §3 message; fixture deleted)
- pnpm lint && pnpm typecheck && pnpm test:run && pnpm build → all four green
- pnpm dev → background dark, headings in display font, all routes navigate correctly

## Definition of done
- [ ] All four CI jobs green (meta + lint + test + build)
- [ ] Coverage report generated and uploaded as artifact
- [ ] Husky hook fires on local commit

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI and merge**

```bash
gh pr checks --watch
```
Expected: all four jobs green.

When green:

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

## Task 49: Deliberate-failure CI test (proof-of-life for the lint rule)

**Files:** ephemeral (will be reverted)

This is the "did the lint rule actually go live in CI" test. The PR opens, fails, gets closed without merging.

- [ ] **Step 1: Create a throwaway branch**

```bash
git checkout main
git pull --ff-only
git checkout -b chore/ci-failure-proof
```

- [ ] **Step 2: Add a Math.random violation**

Create `src/_proof.ts`:

```ts
export function unused(): number {
  return Math.random();
}
```

- [ ] **Step 3: Commit and push**

The Husky hook will block this commit because lint-staged runs ESLint. **For this proof we explicitly bypass it** to test CI:

```bash
git add src/_proof.ts
git commit --no-verify -m "test(ci): deliberate Math.random violation to verify CI blocks it"
git push -u origin chore/ci-failure-proof
```

- [ ] **Step 4: Open a PR and watch it fail**

```bash
gh pr create --title "test(ci): deliberate Math.random violation (DO NOT MERGE)" \
  --body "Proof-of-life for the ESLint Math.random ban in CI. Expected to fail."
gh pr checks --watch
```
Expected: `lint` job fails with the BUILD_GUIDE §5 message. **Record the failed-run URL in the Phase 0 spec or in the closeout commit message — see Task 50.**

- [ ] **Step 5: Close the PR without merging and clean up**

```bash
gh pr close --delete-branch
git checkout main
git branch -D chore/ci-failure-proof
```

---

# Release: tag v0.1-scaffold

## Task 50: Open the release PR

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Branch from main**

```bash
git checkout main
git pull --ff-only
git checkout -b chore/release-v0.1-scaffold
```

- [ ] **Step 2: Update CHANGELOG.md**

Replace the contents of `CHANGELOG.md` with (where `<TODAY>` is today's ISO date, e.g. `2026-05-20`, and `<FAILED_RUN_URL>` is the URL from Task 49):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

## [v0.1-scaffold] — <TODAY>

### Added
- Repo infrastructure: CLAUDE.md, CONTRIBUTING.md, conventions, ADRs, risks, dev-setup
- GitHub: PR + issue templates, 9 phase milestones, labels, Dependabot
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
- Deliberate-failure CI run for Math.random ban: <FAILED_RUN_URL>
```

- [ ] **Step 3: Commit and push**

```bash
git add CHANGELOG.md
git commit -m "chore(release): v0.1-scaffold"
git push -u origin chore/release-v0.1-scaffold
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "chore(release): v0.1-scaffold" \
  --body "Tags Phase 0 completion. See CHANGELOG.md for the full list of additions."
gh pr checks --watch
```
Expected: all four CI jobs green.

- [ ] **Step 5: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only
```

## Task 51: Tag and create the GitHub release

**Files:** none

- [ ] **Step 1: Create and push the tag**

```bash
git tag -a v0.1-scaffold -m "Phase 0 — Scaffold complete"
git push origin v0.1-scaffold
```

- [ ] **Step 2: Create the GitHub release with notes from CHANGELOG**

```bash
gh release create v0.1-scaffold \
  --title "v0.1-scaffold" \
  --notes-file CHANGELOG.md \
  --latest
```
Expected: release URL printed.

- [ ] **Step 3: Close all 15 Phase 0 issues**

If the issues didn't auto-close via PR linking, close them now:

```bash
gh issue list --milestone "Phase 0 — Scaffold" --state open --json number --jq '.[].number' \
  | xargs -I {} gh issue close {} --comment "Completed in v0.1-scaffold."
```

- [ ] **Step 4: Close the Phase 0 milestone**

```bash
PHASE_0_MS=$(gh api repos/A1PC/localGamble/milestones --jq '.[] | select(.title=="Phase 0 — Scaffold") | .number')
gh api -X PATCH repos/A1PC/localGamble/milestones/$PHASE_0_MS -f state=closed
```

## Task 52: Final Definition-of-Done verification

**Files:** none

Walk through the spec's §13 Definition of Done. For each box, run the verification command and tick it off.

- [ ] **Step 1: Repository state**

```bash
# All claude.yml in place (already moved by user)
ls .github/workflows/claude.yml

# No Math.random anywhere
grep -R "Math.random" src/ || echo "OK — no Math.random found"

# No hex literals in .tsx outside src/theme/
grep -rEn "#[0-9a-fA-F]{3,8}" src/ --include="*.tsx" | grep -v "src/theme/" || echo "OK — no stray hex literals"

# Required docs all present
ls BUILD_GUIDE.md CLAUDE.md CONTRIBUTING.md docs/conventions.md docs/risks.md docs/dev-setup.md docs/adr/0001-tech-stack.md docs/adr/0002-package-manager-and-node.md docs/adr/0003-ci-strictness.md docs/adr/0004-pr-strategy-phase-0.md docs/adr/0005-no-branch-protection.md docs/adr/0006-pre-commit-hooks.md docs/adr/0007-tracking-via-milestones.md
```

- [ ] **Step 2: Tooling state**

```bash
nvm use && node --version
corepack enable && pnpm --version
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm format:check
```

All commands should succeed.

- [ ] **Step 3: GitHub state**

```bash
# 9 milestones (the closed Phase 0 included)
gh api repos/A1PC/localGamble/milestones --state all --jq '.[].title'

# All Phase 0 issues closed
gh issue list --milestone "Phase 0 — Scaffold" --state all --limit 20

# Tag exists and points to the release commit
git ls-remote --tags origin | grep v0.1-scaffold
gh release view v0.1-scaffold
```

- [ ] **Step 4: Confirm Phase 0 complete and ready for Phase 1**

If all the above checks pass, Phase 0 is done. The next session begins with brainstorming Phase 1 (Data + Auth) using BUILD_GUIDE §6 + §7 as input.

---

## Self-Review Notes

This plan was self-reviewed for:

- **Spec coverage:** Every artifact listed in spec §5 (PR file inventories), §6 (file contents), §7 (conventions), §8 (dev-setup), §9 (ADRs), §10 (risks), §11 (GitHub setup), §12 (smoke tests), §13 (DoD), §15 (release procedure) maps to a task. The deliberate-failure proof from spec §13 → Task 49.
- **Placeholders:** No "TBD" / "TODO" / "fill in later" — every step contains the actual code or command. Two intentional placeholders for the user to fill in at PR creation time: bundle size in Task 36 step 3, failed-run URL in Task 50 step 2 — these can only be known at execution time.
- **Type consistency:** File names, paths, command names, and config keys match across tasks (e.g., `tsconfig.app.json` not `tsconfig.json` in Task 29 references; `pnpm test:run` consistent throughout; `phase-0-meta` / `phase-0-scaffold` / `phase-0-tooling` branch names consistent).
- **Scope:** Phase 0 only. No Dexie, no auth, no game logic — those are Phase 1+ deliverables tracked separately.
