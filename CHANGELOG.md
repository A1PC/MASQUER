# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

## [v0.4-blackjack] — 2026-05-17

### Added

- Full Blackjack game: H17 rule, Split (up to 4 hands), DAS, Insurance, 3:2 natural blackjack
- 6-deck shoe with 50% penetration cut card; reshuffle automatic
- XState v5 round state machine (9 states with branching transitions)
- Pure logic modules: cards, hand value, dealer rule, settle (with insurance)
- Card visual style: formal Times serif pip pattern + subtle neon glow + gold inset border
- Card back: pinstripe cross-hatch over radial casino-red gradient + "LG" monogram
- DealerArea + PlayerArea + ActionPanel + InsurancePrompt components
- BlackjackPage integrating GameShell + XState machine + Card components
- Lobby cabinet flipped from stub to playable; NEW badge moved from Coin Flip to Blackjack
- 8 new ADRs (0021–0028)
- 9 new risk register entries (R-32 to R-40)
- xstate + @xstate/react dependencies

### Changed

- BUILD_GUIDE §8.1 codifies H17 + split rules + insurance + BJ rounding

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
- TypeScript bumped from 5.6 to 6.x. Dropped `baseUrl` from `tsconfig.app.json` (TS 6 raises TS5101). `paths` alias resolves the same way without it. ADR-0013.
- React Router upgraded from `react-router-dom` 6.30 to `react-router` 7.x.
- Adopted data-router pattern: routes defined in `src/router.tsx` via `createBrowserRouter`; mounted via `<RouterProvider>` in `main.tsx`.
- Bootstrap call + Loading splash extracted to `src/components/AppBootstrap.tsx` (replaces `src/App.tsx`).
- Tests use `renderWithRouter` helper wrapping `createMemoryRouter`. ADR-0014.

### Removed

- `src/components/BalanceBadge.tsx` (replaced by `CreditsDropdown`)

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
