# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

### Changed

- TypeScript bumped from 5.6 to 6.x. Dropped `baseUrl` from `tsconfig.app.json` (TS 6 raises TS5101). `paths` alias resolves the same way without it. ADR-0013.
- React Router upgraded from `react-router-dom` 6.30 to `react-router` 7.x.
- Adopted data-router pattern: routes defined in `src/router.tsx` via `createBrowserRouter`; mounted via `<RouterProvider>` in `main.tsx`.
- Bootstrap call + Loading splash extracted to `src/components/AppBootstrap.tsx` (replaces `src/App.tsx`).
- Tests use `renderWithRouter` helper wrapping `createMemoryRouter`. ADR-0014.

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
