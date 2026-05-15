# Phase 0 — Scaffold + Project Meta-Setup — Design Spec

- **Status:** Approved (2026-05-15)
- **Author:** @adamzspare (with Claude Opus 4.7)
- **Phase:** 0 of 9 (BUILD_GUIDE.md §12)
- **Supersedes:** —
- **Related ADRs:** 0001–0007 (created as part of this phase)
- **Implementation plan:** `docs/superpowers/plans/2026-05-15-phase-0-scaffold-plan.md` (to be written next)

---

## 1. Goal

Establish the complete development substrate for `localGamble` — a local, offline,
play-money casino app — so that every subsequent phase (Auth → Wallet → four games
→ Stats → Polish) lands into a repository with consistent rules, working CI,
enforced conventions, tracking, and a runnable Vite + React + TypeScript shell.

Phase 0 produces zero user-facing features. Its deliverable is the _contract_
that all later phases run inside.

## 2. Non-goals (explicitly out of scope for Phase 0)

- No Dexie database or schema (Phase 1).
- No auth, password hashing, login forms (Phase 1).
- No wallet, betting logic, starting stake (Phase 2).
- No game logic of any kind (Phases 3–6).
- No styling beyond color tokens — pages remain placeholders (Phase 8).
- No animation libraries imported (added when first used).
- No sound system (Phase 8).
- No Electron/Tauri wrap (Phase 9).
- No GitHub branch protection rules (per ADR-0005).
- No CODEOWNERS file (solo dev).
- No deployment / hosting (the app is local-only — BUILD_GUIDE §1).

If any of these creep into a Phase 0 PR, the reviewer rejects it.

## 3. Decisions made

| #   | Decision                                                                                       | Rationale                                                                       | ADR  |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---- |
| 1   | Tech stack: TypeScript + React 18 + Vite + Tailwind + Zustand + Dexie + Framer Motion          | Per BUILD_GUIDE §2                                                              | 0001 |
| 2   | Package manager: pnpm 9; Node 20 LTS                                                           | Fast, strict, future-proof to April 2026 LTS support                            | 0002 |
| 3   | CI strictness: lint + typecheck + test + build + coverage on every PR                          | BUILD_GUIDE §14 calls money math "thorough"-priority; coverage gate enforces it | 0003 |
| 4   | PR strategy for Phase 0: three PRs (meta → scaffold → tooling)                                 | Smallest reviewable units; each PR's CI passes against itself                   | 0004 |
| 5   | Branch protection: none — convention-based discipline only                                     | Solo dev; reverts are easy; BUILD_GUIDE §13 already states the rule             | 0005 |
| 6   | Pre-commit hooks: Husky + lint-staged (format + lint changed files only, no test)              | Catches ~90% of CI failures locally with negligible overhead                    | 0006 |
| 7   | Project tracking: GitHub Milestones (one per phase) + Issues (per sub-task), no Projects board | Native, lightweight, links PR → milestone → BUILD_GUIDE phase                   | 0007 |

## 4. Architecture overview

Phase 0 produces three layers of artifacts:

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 3: APPLICATION SHELL                                  │
│  Vite + React 18 + TS + React Router + Tailwind + Vitest     │
│  Folder skeleton from BUILD_GUIDE §3 with .gitkeep           │
│  Placeholder pages, no features                              │
└──────────────────────────────────────────────────────────────┘
                             ▲
                             │ enforced by
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2: QUALITY GATES                                      │
│  ESLint (no Math.random, no DB/store from games),            │
│  Prettier, EditorConfig, TS strict, Husky + lint-staged,     │
│  Vitest + coverage thresholds (90% game logic, 80% systems)  │
└──────────────────────────────────────────────────────────────┘
                             ▲
                             │ verified by
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1: PROCESS LAYER                                      │
│  CLAUDE.md hard rules, CONTRIBUTING.md conventions,          │
│  Conventional Commits + commitlint, PR + Issue templates,    │
│  GitHub Actions CI, Milestones + Issues, Dependabot,         │
│  ADRs, risk register, dev-setup docs                         │
└──────────────────────────────────────────────────────────────┘
```

Each layer is added by exactly one PR, in order, so each PR's CI tests against
its own additions.

## 5. PR sequence

### PR #1 — Meta infrastructure (no app code)

**Branch:** `phase-0-meta`
**Goal:** Establish rules, tracking, and a minimal CI gate before any code lands.

**Files added:**

```
CLAUDE.md
CONTRIBUTING.md
README.md                              (replaces stub)
CHANGELOG.md
.gitignore
.nvmrc                                 (contents: 20)
.markdownlint.json
commitlint.config.js
.github/
  workflows/
    ci.yml                             (v1: meta job — actionlint, markdownlint, commitlint)
    claude.yml                         (already in place — moved by user 2026-05-15 outside this PR sequence)
  PULL_REQUEST_TEMPLATE.md
  ISSUE_TEMPLATE/phase-task.md
  ISSUE_TEMPLATE/bug.md
  ISSUE_TEMPLATE/design-question.md
  ISSUE_TEMPLATE/config.yml
  dependabot.yml
docs/
  conventions.md
  dev-setup.md
  risks.md
  adr/_template.md
  adr/0001-tech-stack.md
  adr/0002-package-manager-and-node.md
  adr/0003-ci-strictness.md
  adr/0004-pr-strategy-phase-0.md
  adr/0005-no-branch-protection.md
  adr/0006-pre-commit-hooks.md
  adr/0007-tracking-via-milestones.md
  superpowers/specs/.gitkeep
  superpowers/plans/.gitkeep
```

**GitHub-side actions (via `gh` CLI, scripted, idempotent):**

- 9 milestones created (Phase 0–9 with descriptions referencing BUILD_GUIDE §s).
- 16 Phase 0 issues filed under `Phase 0 — Scaffold` milestone, labeled `phase-0`.
- Labels created: `phase-0` … `phase-9`, `bug`, `design`, `chore`, `tooling`,
  `docs`, `tests`, `blocked`, `needs-spec`, `ready-for-review`.

**Already handled outside this PR sequence (recorded for traceability):**

- ✅ Moved `claude.yml` from repo root to `.github/workflows/claude.yml`
  (commits `e605142` and `76eec09`, 2026-05-15).
- ✅ Added `ANTHROPIC_API_KEY` repo secret in Settings → Secrets and
  variables → Actions (manual; not git-trackable).
- ✅ Removed unintentional `.github/workflows/blank.yml` GitHub starter
  template via `chore(ci): remove unintentional blank.yml workflow` PR
  (2026-05-15) — would have collided with our `ci.yml` workflow name.

### PR #2 — Vite scaffold + folder skeleton

**Branch:** `phase-0-scaffold`
**Goal:** Working `pnpm dev` and `pnpm build`. No features.

**Files added:**

```
package.json                            (deps: react, react-dom, react-router-dom)
pnpm-lock.yaml
vite.config.ts
tsconfig.json
tsconfig.app.json                       (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
tsconfig.node.json
index.html
src/main.tsx
src/App.tsx                             (React Router shell)
src/pages/LoginPage.tsx                 (placeholder)
src/pages/RegisterPage.tsx              (placeholder)
src/pages/LobbyPage.tsx                 (placeholder)
src/pages/StatsPage.tsx                 (placeholder)
src/pages/LeaderboardPage.tsx           (placeholder)
src/theme/.gitkeep
src/db/.gitkeep
src/store/.gitkeep
src/systems/.gitkeep
src/components/.gitkeep
src/games/_shared/.gitkeep
src/games/blackjack/.gitkeep
src/games/roulette/.gitkeep
src/games/slots/.gitkeep
src/games/baccarat/.gitkeep
```

**CI extension (in this PR):** `ci.yml` gains an `install · typecheck · build`
job. The `meta` job from PR #1 still runs as a prerequisite.

### PR #3 — Tooling: Tailwind, ESLint, Prettier, Vitest, Husky

**Branch:** `phase-0-tooling`
**Goal:** Quality gates fully wired. Sanity test passes. `v0.1-scaffold` ready.

**Files added or modified:**

```
package.json                            (modified: lint/format/test scripts, lint-staged config, new dev deps)
tailwind.config.ts
postcss.config.js
src/index.css                           (Tailwind directives + base styles)
src/main.tsx                            (modified: import '@/index.css')
src/theme/tokens.ts                     (TS view of color tokens)
eslint.config.js                        (flat config; bans Math.random, bans @/db & @/store from games)
.prettierrc
.prettierignore
.editorconfig
vitest.config.ts                        (jsdom + coverage thresholds scoped to game logic + systems)
src/test/setup.ts                       (jest-dom matchers)
src/App.test.tsx                        (sanity test: lobby renders)
.husky/pre-commit                       (runs pnpm exec lint-staged)
.vscode/extensions.json                 (recommended extensions)
```

**CI extension (in this PR):** `ci.yml` gains `lint` and `test` jobs. Final
job graph: `meta` → fan out to `lint`, `test`, `build`. All four required for
merge (convention-enforced; not blocked by branch protection per ADR-0005).

**Release:** After merge, a follow-up `chore(release): v0.1-scaffold` PR adds
the CHANGELOG entry; tag is then created on `main`.

## 6. File contents — verbatim drafts

### 6.1 `CLAUDE.md`

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

### 6.2 `CONTRIBUTING.md`

````markdown
# Contributing to localGamble

## Local setup

Requirements: Node 20 LTS (see `.nvmrc`), pnpm 9+.

```bash
nvm use            # picks up .nvmrc
corepack enable    # enables pnpm via Node's bundled corepack
pnpm install
pnpm dev           # http://localhost:5173
```
````

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

````

### 6.3 `.github/PULL_REQUEST_TEMPLATE.md`

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
````

### 6.4 Issue templates

**`.github/ISSUE_TEMPLATE/phase-task.md`**

```markdown
---
name: Phase task
about: A unit of work within a BUILD_GUIDE phase
title: '[Phase N] <short title>'
labels: ['phase-N']
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

**`.github/ISSUE_TEMPLATE/bug.md`**

```markdown
---
name: Bug
about: Something is wrong
title: 'bug: <short title>'
labels: ['bug']
---

## What's broken

## Steps to reproduce

1.
2.

## Expected

## Actual

## Environment (browser, profile)
```

**`.github/ISSUE_TEMPLATE/design-question.md`**

```markdown
---
name: Design question
about: Open question that needs a decision before implementation
title: 'design: <short title>'
labels: ['design']
---

## The question

## Options considered

## Constraints from BUILD_GUIDE

## Recommendation (if any)
```

**`.github/ISSUE_TEMPLATE/config.yml`**

```yaml
blank_issues_enabled: false
```

### 6.5 `.gitignore`

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

### 6.6 `.nvmrc`

```
20
```

### 6.7 `README.md` (replacement)

````markdown
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

| Command          | Purpose                            |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start Vite dev server              |
| `pnpm build`     | Production build                   |
| `pnpm preview`   | Serve the production build locally |
| `pnpm lint`      | ESLint check                       |
| `pnpm typecheck` | `tsc --noEmit`                     |
| `pnpm test`      | Vitest in watch mode               |
| `pnpm test:run`  | Vitest single run with coverage    |
| `pnpm format`    | Prettier write                     |

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
````

### 6.8 `.markdownlint.json`

```json
{
  "default": true,
  "MD013": false,
  "MD033": false,
  "MD041": false
}
```

### 6.9 `commitlint.config.js`

```js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'blackjack',
        'roulette',
        'slots',
        'baccarat',
        'wallet',
        'auth',
        'rng',
        'history',
        'stats',
        'leaderboard',
        'theme',
        'db',
        'session',
        'lobby',
        'ci',
        'build-guide',
        'deps',
        'release',
        'repo',
      ],
    ],
    'subject-case': [0],
  },
};
```

### 6.10 `.github/workflows/ci.yml` — final state (after PR #3)

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

CI evolves across the three PRs:

- **PR #1** ships only the `meta` job.
- **PR #2** adds the `build` job (without coverage upload yet).
- **PR #3** adds `lint` and `test` jobs and finalizes `build`.

### 6.11 `.github/dependabot.yml`

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
        patterns: ['react', 'react-dom', 'react-router-dom']
```

### 6.12 `package.json` — final state (after PR #3)

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

### 6.13 `vite.config.ts`

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

### 6.14 `tsconfig.json`

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

### 6.15 `tsconfig.app.json`

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

### 6.16 `tsconfig.node.json`

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

### 6.17 `index.html`

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

### 6.18 `src/main.tsx`

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

### 6.19 `src/App.tsx`

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

### 6.20 `src/pages/<Name>Page.tsx` (5 placeholder files, same shape)

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

(Same template for `LoginPage`, `RegisterPage`, `StatsPage`, `LeaderboardPage`.)

### 6.21 `tailwind.config.ts`

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

### 6.22 `postcss.config.js`

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

### 6.23 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body,
  #root {
    height: 100%;
  }
  body {
    @apply bg-felt-deep text-white font-body antialiased;
  }
  h1,
  h2,
  h3 {
    @apply font-display tracking-wide;
  }
}
```

### 6.24 `src/theme/tokens.ts`

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

### 6.25 `eslint.config.js`

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
          message: 'Math.random is banned. Use src/systems/rng.ts (BUILD_GUIDE §5).',
        },
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
            {
              group: ['@/db/*', '@/db'],
              message:
                'Games must not touch the DB directly. Go through src/systems/* (BUILD_GUIDE §3).',
            },
            {
              group: ['@/store/*', '@/store'],
              message:
                'Games must not touch stores directly. Go through src/systems/* (BUILD_GUIDE §3).',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
```

### 6.26 `.prettierrc`

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

### 6.27 `.prettierignore`

```
dist
coverage
node_modules
pnpm-lock.yaml
```

### 6.28 `.editorconfig`

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

### 6.29 `vitest.config.ts`

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

### 6.30 `src/test/setup.ts`

```ts
import '@testing-library/jest-dom/vitest';
```

### 6.31 `src/App.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

it('renders the lobby placeholder by default', () => {
  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: /lobby/i })).toBeInTheDocument();
});
```

### 6.32 `.husky/pre-commit`

```sh
pnpm exec lint-staged
```

### 6.33 `.vscode/extensions.json`

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

### 6.34 `CHANGELOG.md` (initial)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

## [v0.1-scaffold] — <release date>

### Added

- Repo infrastructure: CLAUDE.md, CONTRIBUTING.md, conventions, ADRs, risks
- GitHub: PR + issue templates, 9 phase milestones, labels, Dependabot
- CI: actionlint + markdownlint + commitlint → install + typecheck + build → lint + test + coverage
- Vite + React 18 + TypeScript scaffold with React Router
- Folder skeleton per BUILD_GUIDE §3 (theme, db, store, systems, components, pages, games)
- Tailwind v3 with retro Vegas color tokens
- ESLint flat config with Math.random ban and games-import sandboxing
- Prettier + EditorConfig + Husky + lint-staged
- Vitest + RTL + jsdom + coverage thresholds for game logic
- Sanity test for App routing
- Moved claude.yml to .github/workflows/
```

### 6.35 `docs/adr/_template.md`

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

### 6.36 Sample ADR — `docs/adr/0002-package-manager-and-node.md`

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

## 7. Code conventions (`docs/conventions.md`)

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

## 8. Dev environment setup (`docs/dev-setup.md`)

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

| Symptom                                        | Cause                       | Fix                                                                |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| `corepack: command not found`                  | Old Node                    | Upgrade to Node 20+                                                |
| `pnpm install` hangs at registry               | Network / proxy             | `pnpm config get registry`; reset to `https://registry.npmjs.org/` |
| Dev server port 5173 busy                      | Another Vite running        | `lsof -i :5173`; kill or change `vite.config.ts` port              |
| ESLint complains about every file              | Wrong Node / pnpm version   | `nvm use && corepack enable && pnpm install`                       |
| Husky hook didn't fire on commit               | `prepare` script didn't run | `pnpm install` re-runs it; or `pnpm exec husky` manually           |
| IndexedDB shows stale data after schema change | Old DB version              | DevTools → Application → IndexedDB → delete `localGamble`          |

## Browser support matrix

Targeted: latest stable **Chrome** and **Firefox** on desktop.
Out of scope: Safari (untested in MVP), all mobile browsers, anything
< 1024px viewport.
Why: this is a personal-machine app; one of two browsers is sufficient.
The build targets `>0.5%, last 2 versions, not dead, not op_mini all`
(default Vite preset).
````

## 9. Architecture Decision Records

Created in PR #1, each as a separate file under `docs/adr/`:

| ID   | Title                                                              | Status   |
| ---- | ------------------------------------------------------------------ | -------- |
| 0001 | Tech stack: TS + React 18 + Vite + Tailwind + Zustand + Dexie      | Accepted |
| 0002 | Package manager and Node: pnpm 9 + Node 20 LTS                     | Accepted |
| 0003 | CI strictness: lint + typecheck + test + build + coverage          | Accepted |
| 0004 | PR strategy for Phase 0: three PRs (meta → scaffold → tooling)     | Accepted |
| 0005 | No GitHub branch protection — convention-based discipline          | Accepted |
| 0006 | Pre-commit hooks: Husky + lint-staged (format + lint changed only) | Accepted |
| 0007 | Project tracking: Milestones + Issues, no GH Projects board        | Accepted |

ADR template stored at `docs/adr/_template.md` (status / context / decision /
alternatives / consequences / references). ADRs are append-only; reversals
are written as new ADRs that supersede.

## 10. Risk register (`docs/risks.md`)

Living document, reviewed at the start of each phase. Initial entries:

| ID   | Risk                                                | Phase   | L   | I   | Mitigation                                                                                                     |
| ---- | --------------------------------------------------- | ------- | --- | --- | -------------------------------------------------------------------------------------------------------------- |
| R-01 | IndexedDB schema migration breaks existing balances | 1+      | M   | H   | Dexie `version().upgrade()` from day one; smoke test before merge                                              |
| R-02 | RNG bias in payouts                                 | 2+      | L   | H   | Centralized `systems/rng.ts` w/ rejection sampling; ESLint bans Math.random; chi-squared test added in Phase 2 |
| R-03 | Float chip math causes balance bugs                 | 2+      | M   | H   | Integer-only at boundaries; ESLint forbids `parseFloat` in wallet/logic; tests assert `Number.isInteger`       |
| R-04 | Game directly mutates balance/store                 | 3–6     | M   | H   | ESLint blocks `@/db` and `@/store` imports under `src/games/**`                                                |
| R-05 | Animation outpaces logic outcome                    | 3–6     | M   | M   | Outcome decided first; animation reads outcome (documented in `_shared/useGameRound`)                          |
| R-06 | Baccarat third-card tableau wrong                   | 6       | M   | M   | Implement verbatim from cited source; exhaustive truth-table test                                              |
| R-07 | Roulette payout off-by-one                          | 4       | M   | M   | Document "X to 1" convention in `payouts.ts`; tests assert payout AND netChange                                |
| R-08 | Slots paytable un-fun (wrong RTP)                   | 5, 8    | H   | L   | Paytable in single config; "expected RTP simulator" test (10M spins)                                           |
| R-09 | Hex literals leak into components                   | 8+      | M   | L   | ESLint rule (Phase 8) flagging hex in `*.tsx` outside `theme/`; review checklist                               |
| R-10 | Tests pass, prod build broken                       | All     | L   | M   | `pnpm build` is required CI check                                                                              |
| R-11 | Lockfile drift                                      | All     | L   | M   | `--frozen-lockfile` in CI; `packageManager` pinned                                                             |
| R-12 | Husky bypassed via `--no-verify`                    | All     | M   | L   | CI is the enforcing layer; PR template asks                                                                    |
| R-13 | Dependency vulnerabilities accumulate               | Ongoing | M   | L   | Dependabot weekly (PR #1)                                                                                      |
| R-14 | Phase creep — future-phase features in early PRs    | All     | H   | M   | CLAUDE.md rule #1; PR template phase ref; reviewer rejects                                                     |
| R-15 | Solo-dev rubber-stamps own PRs                      | All     | H   | L   | PR self-review checklist; CI must be green; squash-merge                                                       |

## 11. GitHub project setup

### Milestones (created via `gh api`)

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

### Phase 0 issues (15 total, all attached to "Phase 0 — Scaffold")

PR #1 work (4 issues):

1. `[Phase 0] PR #1 — Repo meta: CLAUDE.md, CONTRIBUTING.md, gitignore, nvmrc, README, CHANGELOG`
2. `[Phase 0] PR #1 — GitHub templates (PR template, 3 issue templates)`
3. `[Phase 0] PR #1 — CI workflow v1: actionlint + markdownlint + commitlint`
4. `[Phase 0] PR #1 — Create 9 phase milestones + labels via gh; enable Dependabot`

PR #2 work (4 issues): 5. `[Phase 0] PR #2 — Vite + React 18 + TS + React Router scaffold` 6. `[Phase 0] PR #2 — Folder skeleton (.gitkeep) per BUILD_GUIDE §3` 7. `[Phase 0] PR #2 — Placeholder routes/pages and routing shell` 8. `[Phase 0] PR #2 — CI workflow v2: install + typecheck + build`

PR #3 work (6 issues): 9. `[Phase 0] PR #3 — Tailwind v3 + theme tokens + index.css` 10. `[Phase 0] PR #3 — ESLint flat config (incl. Math.random + games-import bans)` 11. `[Phase 0] PR #3 — Prettier + EditorConfig + format script` 12. `[Phase 0] PR #3 — Vitest + RTL + jsdom + coverage thresholds` 13. `[Phase 0] PR #3 — Husky + lint-staged pre-commit hook` 14. `[Phase 0] PR #3 — Sanity test (App.test.tsx) passing`

Closeout (1 issue): 15. `[Phase 0] Tag v0.1-scaffold release after PR #3 merges`

Manual one-time steps (no issue needed; status tracked here):

- ✅ `claude.yml` moved to `.github/workflows/` (done 2026-05-15).
- ✅ `ANTHROPIC_API_KEY` repo secret added (done 2026-05-15).
- ✅ `blank.yml` placeholder removed via separate chore PR (done 2026-05-15).

### Labels

`phase-0` (gray) … `phase-9` (each a distinct color), plus `bug` (red),
`design` (purple), `chore` (gray), `tooling` (blue), `docs` (cyan),
`tests` (green), `blocked` (black), `needs-spec` (yellow),
`ready-for-review` (green).

## 12. Manual smoke test plan per PR

### PR #1

1. New Issue picker → 3 templates appear, blank disabled.
2. New PR form shows the PR template.
3. Milestones page → 9 milestones visible.
4. Labels page → all `phase-*` and category labels visible.
5. Push commit `wip: stuff` on throwaway branch → commitlint fails. Fix → passes.
6. Edit a markdown file with a known violation → markdownlint flags.

### PR #2

1. Fresh clone → `nvm use && corepack enable && pnpm install --frozen-lockfile`.
2. `pnpm dev` → open `http://localhost:5173` → `/` redirects to `/lobby`, "Lobby" heading visible.
3. Visit `/login`, `/register`, `/lobby`, `/stats`, `/leaderboard` — each placeholder renders.
4. Unknown route `/foo` → redirects to `/lobby`.
5. `pnpm build` → `dist/` exists. **Record total bundle size in PR description (Phase 0 baseline).**
6. `pnpm preview` → built bundle serves correctly.
7. `pnpm typecheck` → green.

### PR #3

1. `pnpm install` → all new dev deps installed.
2. `pnpm lint` → green.
3. Add `const x = Math.random();` to a temp file → `pnpm lint` fails with the BUILD_GUIDE §5 message → remove → green.
4. In `src/games/blackjack/scratch.ts` add `import { db } from '@/db'` → `pnpm lint` fails with the games-import ban → remove → green.
5. `pnpm test:run` → sanity test passes; coverage report at `coverage/index.html`.
6. `git add` + `git commit` → Husky → lint-staged formats + lints staged files only.
7. `git commit --no-verify` → succeeds (we don't block bypass).
8. Add `<div className="bg-felt text-gold">` to a placeholder page → renders with right colors.

## 13. Definition of Done — Phase 0

Phase 0 is complete when **every** box below is checked. This is the
merge-gate for the `v0.1-scaffold` tag.

**Repository state**

- [ ] All files in PR #1, #2, #3 inventories exist on `main`
- [ ] `claude.yml` is at `.github/workflows/claude.yml`
- [ ] `grep -R "Math.random" src/` returns zero hits
- [ ] No `.tsx` file outside `src/theme/` contains a hex color literal
- [ ] `BUILD_GUIDE.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/conventions.md`,
      `docs/risks.md`, `docs/dev-setup.md`, `docs/adr/0001..0007*.md` present

**Tooling state**

- [ ] `nvm use` selects Node 20.x
- [ ] `corepack enable && pnpm --version` shows pnpm 9.x
- [ ] `pnpm install --frozen-lockfile` succeeds <60s on clean clone
- [ ] `pnpm dev` serves `http://localhost:5173`; `/lobby` placeholder renders
- [ ] `pnpm build` produces `dist/`; total size recorded
- [ ] `pnpm preview` serves the bundle
- [ ] `pnpm lint` exits 0 with no warnings
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test:run` exits 0; sanity test passes
- [ ] `pnpm format:check` exits 0
- [ ] Touching a `.ts` file → `git commit` triggers Husky → lint-staged runs
- [ ] Committing a file with `Math.random()` → ESLint blocks via lint-staged

**GitHub state**

- [ ] All 9 milestones exist with descriptions
- [ ] All 15 Phase 0 issues exist, attached to milestone, labeled `phase-0`
- [ ] All `phase-N` and category labels exist
- [ ] PR template renders on new PR
- [ ] All three issue templates appear; blank disabled
- [ ] Dependabot active
- [ ] Tag `v0.1-scaffold` exists, points to PR #3 merge commit

**CI state**

- [ ] CI runs on every push and PR to `main`
- [ ] All four jobs (`meta`, `lint`, `test`, `build`) green on PR #3 merge
- [ ] A deliberate-failure run is documented (introduce Math.random → CI fails → revert)
- [ ] `claude.yml` workflow visible in Actions tab

## 14. Rollback procedures

- **Bad merge to `main`:** revert via PR (`git revert -m 1`), do not force-push.
- **Bad release tag:** add a follow-up tag (`v0.1.1-scaffold`) that supersedes; mark old in CHANGELOG.
- **Dev IndexedDB corrupted:** DevTools → Application → IndexedDB → delete `localGamble`; document in issue.
- **CI stuck red transiently:** re-run failed jobs; if persistent non-code cause, file `chore(ci):` PR with workaround.
- **Lockfile drift:** `pnpm install` regenerates; if still broken, `rm pnpm-lock.yaml node_modules -rf && pnpm install`.

## 15. Release procedure

After PR #3 merges:

```bash
git checkout main && git pull
git checkout -b chore/release-v0.1-scaffold
# Update CHANGELOG.md (move Unreleased → v0.1-scaffold with date)
git add CHANGELOG.md
git commit -m "chore(release): v0.1-scaffold"
gh pr create --title "chore(release): v0.1-scaffold" \
  --body "Tags Phase 0 completion. See CHANGELOG.md."
# After merge:
git checkout main && git pull
git tag -a v0.1-scaffold -m "Phase 0 — Scaffold complete"
git push origin v0.1-scaffold
gh release create v0.1-scaffold --title "v0.1-scaffold" \
  --notes-file CHANGELOG.md --latest
```

## 16. Handoff to Phase 1

Once `v0.1-scaffold` is tagged, the next session starts a fresh
brainstorming round for Phase 1 (Data + Auth). The handoff package:

1. This spec + the Phase 0 implementation plan (committed)
2. BUILD_GUIDE.md §6 (Data Model) and §7 (Accounts) as Phase 1 input spec
3. The `Phase 1 — Data + Auth` milestone, ready to be populated with Phase 1 sub-task issues during that brainstorm
4. Any new ADRs added during Phase 0 implementation

Phase 1 brainstorming asks its own clarifying questions
(Dexie migration strategy, PBKDF2 iteration count, "remember me" UX, etc.)
and produces its own spec → plan → execution cycle.

## 17. Open questions

None blocking. To decide later (not blockers for Phase 0 completion):

- Whether to add a `CHANGELOG.md` automation tool (`changesets`, `release-please`) — defer until Phase 9.
- Whether to enable GitHub branch protection later — revisit if collaborators join.
- Whether to add a `CODEOWNERS` file — revisit if collaborators join.
- Whether to publish a GitHub Pages preview of the built bundle — defer until there's something worth previewing (post-Phase 3).

---

_End of Phase 0 spec. The next artifact is the implementation plan
(`docs/superpowers/plans/2026-05-15-phase-0-scaffold-plan.md`), produced by
the writing-plans skill._
