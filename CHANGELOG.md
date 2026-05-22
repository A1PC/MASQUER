# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

**Phase 15 (Polish & Overhaul) — in progress.** A complete UI/UX overhaul across every screen plus real animation and sound, per-game feature additions, an expanded + re-skinned admin area, and a final brand rename. Decomposed into 18 dependency-ordered sub-projects (foundation: brand → design system → motion/sound infra → shell; then per-game upgrades incl. the poker trio, admin overhaul + expansion, and a closing integration pass), each with its own spec → plan → PRs cycle. See `docs/superpowers/specs/2026-05-22-phase-15-umbrella-roadmap-design.md` for the full plan and shared principles.

## [v0.14-craps] — 2026-05-22

Full-table single-player Craps — completing all 14 gameplay phases. Built in 5 PRs.

### Added

- **Craps**: two-dice come-out / point game with the complete authentic bet set (~17 bet types) for tiered tables (Low / Mid / High)
- **Per-bet resolver registry** (`BET_TYPES`): each bet declares `canPlace` / `isWorking` / `resolve` / `payout`. **ADR-0042** documents the registry + working-bet rules
- Line & odds: Pass / Don't Pass (bar 12), Come / Don't Come (travelling come points), Pass/Don't true-odds (2:1 · 3:2 · 6:5 / lay equivalents), odds off on the come-out
- Place (9:5 · 7:5 · 7:6, off on come-out), Field (1:1, 2× on 2, 3× on 12), Hardways (7:1 / 9:1, win-hard / lose-easy-or-7)
- Proposition / centre bets: Any 7, Any Craps, 2/3/11/12, Horn, C&E — composite bets compute exact integer winnings
- Table-session wallet: buy-in bankroll, rebuys, one `rounds` row settled on leave (reuses ADR-0041)
- Authentic half-table UI: place row with ON/OFF puck, COME band, FIELD strip, Pass/Don't line with odds, collapsible proposition drawer, tumbling dice (respects `prefers-reduced-motion`), roulette-style chip tray
- XState machine + session; enum + nav + BUILD_GUIDE §10.9
- 5 PRs (#190–#194); **+135 tests** (1833 → 1968)

## [v0.13c-omaha] — 2026-05-22

No-Limit Omaha Hold'em — the third and final poker variant, completing the poker trio. Built as a near-clone of Hold'em in 4 PRs, reusing the entire `poker/_shared/` core.

### Added

- **No-Limit Omaha Hold'em**: configurable 2-6 players (you + 1-5 AI), tiered stakes, buy-in/cash-out session with rebuy — all inherited from Hold'em
- **4 hole cards** per player (vs Hold'em's 2), with the mandatory exactly-2-hole + exactly-3-board showdown rule enforced by `evaluateFrom(..., 'omaha')` (built and tested back in 13a)
- **New `decideOmaha` AI**: a 4-card preflop strength heuristic (rewards high pairs, double-suited, connectedness; penalises danglers + dead trips/quads-in-hand) plus omaha-rule postflop strength, reusing the archetype / pot-odds / raise-sizing structure; AI sees the real street + 4 hole cards + board
- Community board + flop/turn/river, blinds, side pots, split pots — the full Hold'em machinery, cloned
- UI: `OmahaSeat` (4 cards), `OmahaTable`, `OmahaPage`; the lobby variant modal now offers all three poker variants (no "coming soon" cards remain)
- 4 PRs (#179–#182); **+95 tests** (1738 → 1833). No new ADR

### Changed

- Reused untouched: the shared core + Hold'em's `CommunityBoard` / `BettingControls` / `SessionBar` / `ShowdownReveal` / `stakesConfig`; Hold'em + Five-Card Draw code was not modified

## [v0.13b-five-card-draw] — 2026-05-21

No-Limit Five-Card Draw — the second poker variant, built on the shared `poker/_shared/` core from 13a in 4 PRs (vs Hold'em's 6), validating the shared-infrastructure split.

### Added

- **No-Limit Five-Card Draw**: configurable 2-6 players (you + 1-5 AI), tiered stakes, buy-in/cash-out session with rebuy — all inherited from Hold'em
- **The draw**: single draw round — pre-draw bet → discard 0-3 cards and redraw → post-draw bet → showdown; tap-to-discard UI (cap 3, default stand pat); no community board
- **AI discard strategy** (`decideDiscard`): stand pat on a straight or better; keep pairs / trips / 4-flush / 4-straight and draw the rest; archetype-flavoured (Maniac sometimes bluff-stands-pat, Rock plays textbook) and seeded
- Betting AI reuses Hold'em's `decide`, mapped so it judges the full 5-card hand via `evaluateBest5`
- UI: `DiscardControls`, `DrawSeat`, `DrawTable`, `FiveCardDrawPage`; lobby variant modal now offers Texas Hold'em and Five-Card Draw (Omaha still "coming soon")
- 4 PRs (#173–#176); **+187 tests** (1537 → 1724). No new ADR

### Changed

- Shared infra reused untouched: deck, hand evaluator, side pots, AI archetypes, `PlayingCard`, the buy-in/cash-out session (ADR-0041), and Hold'em's `BettingControls` / `SessionBar` / `ShowdownReveal`; Hold'em code was not modified

## [v0.13a-texas-holdem] — 2026-05-21

The heaviest phase yet (6 PRs): No-Limit Texas Hold'em plus the reusable poker infrastructure that Five-Card Draw and Omaha will build on.

### Added

- **Shared poker core** (`src/games/poker/_shared/`): seeded `deck`; `handEvaluator` (brute-force best-5-of-7 over 21 combos, `compareHands`, `evaluateFrom` with an `'omaha'` 2-hole+3-board path ready for 13c); `sidePots` (layered all-in pot computation)
- **AI engine** (`_shared/ai/`): 4 personality archetypes (Rock / Calling Station / Maniac / Shark) over a shared seeded decision engine (hand strength + pot odds + position + bluff). AI sees only its own cards + the board — a fair opponent
- **No-Limit Texas Hold'em** (`poker/holdem/`): configurable 2-6 players (you + 1-5 AI), tiered stakes (Low 10/20, Mid 50/100, High 250/500), full betting (fold/check/call/raise slider + ½/¾/pot/all-in), all-in side pots, split pots, heads-up button-is-SB handling
- **Buy-in / cash-out session**: persistent stack across hands, rebuy on your bust, re-seat fresh AI on AI bust. One `rounds` row per session (stake = total bought-in, payout = final stack)
- XState v5 hand+session machine; `holdemLogic` (dealHand / nextActiveSeat / resolveShowdown)
- UI: row-based `PokerTable`, `Seat`, `CommunityBoard`, No-Limit `BettingControls`, `SetupPanel`, `SessionBar`, `ShowdownReveal`; `PlayingCard` ports the blackjack/baccarat card visual (shared by all poker variants)
- `PokerVariantModal` at `/play/poker` (Hold'em active; Five-Card Draw + Omaha "coming soon"); sidebar + lobby cabinet + stats/leaderboard nav
- ADR-0041 (poker buy-in/cash-out session wallet model — first game where wallet debits aren't 1:1 with the rounds row)
- 5 implementation PRs (#164–#168); **+272 tests** (1300 → 1572)

### Changed

- `Round.game` union extended with `'poker'`; BUILD_GUIDE §10.8 added

### Fixed

- Flaky `AdminLotteryPage` "negative tone" test (#169): scoped the assertion to the profit card's `data-tone="negative"` (the value "-90" also rendered in the recent-draws P/L column, two independent `useLiveQuery` subscriptions caused intermittent "multiple elements" in CI)

## [v0.12-plinko] — 2026-05-20

### Added

- **Plinko**: fixed 20-row peg board / 21 bins, no player aim; deterministic Binomial(20, 0.5) ball walk via seeded `dropBall`
- 4 risk levels (Safe / Low / Medium / High) — same probabilities, different symmetric multiplier curves (edge multipliers 16x / 110x / 420x / 5000x; centre bins < 1x). RTP ≈ 95.3–97.9%
- Bet 10–5000 chips/ball; Manual mode (1 ball/click) + Auto mode (1–100 balls at 250/500/1000ms)
- Multiple balls in flight simultaneously via `inFlightBalls[]`; Framer Motion keyframe-array animation per row
- `HistoryStrip` (rolling last 5), `EndScreen` auto-session summary, coloured bins by multiplier tier
- One `rounds` row per ball (`details`: risk / bin / multiplier / sessionId); sessionId groups an auto session
- 4 PRs (#158–#161); **+78 tests** (1300 total)

### Fixed

- CPU scheduler bug carried over from Bingo era patterns: stabilised flaky bingo CPU-race test (#157) using `vi.advanceTimersByTimeAsync`

## [v0.11.5-bingo-competitive] — 2026-05-19

Replaced solo bingo with competitive vs-AI gameplay immediately after shipping it.

### Added

- **Competitive Bingo** vs AI computers; two variants picked via `BingoVariantModal`: British 90-ball 3×9 + American 75-ball 5×5 (free centre)
- Difficulty (Easy 2 / Medium 5 / Hard 9 CPUs) sets opponent count, pot multiplier (×2/×4/×8), CPU reaction latency, and forces manual daub on Hard
- Per-CPU latency rolled at game start; tie-breaks favour lower index; 0ms-vs-0ms RNG'd
- Line + two-line/four-corners bonuses (10/20 chips) paid only when the user claims a tier first; full-house/blackout winner takes the pot
- `cpuScheduler` XState `fromCallback` actor scheduling per-CPU evaluations; global `claimedTiers` race semantics; `bonusesEarned` accumulator paid in the final settle
- Coloured balls (UK 9-decile + US 5-column palettes)
- `/admin/bingo` page: per-difficulty overrides for cpuCount / potMultiplier / latency / forceManual, persisted via Dexie v4
- 4 PRs (#149–#152) + admin-config PR; **+82 tests** (1265 total)

### Changed

- Solo bingo (`v0.11-bingo`) superseded; the variant-as-config pattern (one `VARIANTS` object) drives card generation, evaluators, ball palette, and labels

## [v0.11-bingo] — 2026-05-19

Superseded the same day by `v0.11.5-bingo-competitive`.

### Added

- Solo 90-ball British bingo (1–4 cards, line / two-line / full-house / fast-full-house tiers), seeded card generation + call sequence, auto/manual daub, animated win banners, EndScreen breakdown
- Sidebar + lobby cabinet + stats/leaderboard nav; `commitlint` scope `bingo`
- 5 PRs (#142–#146)

## [v0.10-lottery] — 2026-05-19

### Added

- **Daily Lottery**: Pick-5+1, one shared draw per local calendar day at 20:00 with backfill on app open
- `systems/lottery.ts` (pure draw + evaluator + lucky-dip + `buyTicket` + idempotent `settleMissedDraws` + favourites + admin queries); Dexie v3 (4 additive tables)
- LotteryPage (NumberGrid + TicketCart + Favourites + HERO countdown ↔ winning balls + history), DrawAnimationModal (purchase + draw reveal)
- Sidebar entry + per-user unread dot; lobby tile with live countdown; AdminLotteryPage (stat cards + frequency charts + recent draws)
- 1M jackpot, ≈43% RTP, match-2 free re-entry
- ADR-0040 (lottery as a system, not a games-sandbox citizen); 6 PRs (#133–#138); **+126 tests**

## [v0.9-admin-dashboard] — 2026-05-18

Shipped out of numeric sequence (before Baccarat/Stats).

### Added

- Hidden `/admin/*` with hardcoded `admin` / `admin12345` login (UI convenience, not a security boundary)
- Dexie v2 (additive): `sessions`, `gameVisits`, `adjustments` tables + `isBanned` / `loginCount` / `lastLoginAt` on `users`
- Pages: Overview (stat cards + Recharts), Users list, per-user drill-in with ban/adjust, Adjustments audit log, Sessions log
- Recharts lazy-loaded into an admin-only chunk (main bundle unchanged)
- ADRs 0034 (admin auth model), 0035 (tracking schema); 6 PRs (#107–#112); **+107 tests**

## [v0.8-stats-leaderboard] — 2026-05-19

### Added

- `systems/stats.ts` shared aggregation module (9 new aggregations) promoted from admin queries (ADR-0038)
- StatsPage with left-rail nav (overview + per-game tabs), responsive stat-card grid, Cards ↔ Graphs toggle persisted to localStorage
- LeaderboardPage with overview + per-game boards, Me/All toggle, banned-user exclusion
- Shared charts in `components/charts/`; Recharts in one lazy chunk reused by player + admin (ADR-0039)
- 6 PRs (#125–#130); **+102 tests** (1005 total)

## [v0.7-baccarat] — 2026-05-18

Shipped after Phase 9 (Admin) chronologically.

### Added

- Full Baccarat: all 9 bet zones (Player / Banker / Tie + 2 Pairs + Big/Small + 2 Dragons)
- Persistent 8-deck shoe with cut card; canonical Punto Banco third-card tableau (134 cell-by-cell tests)
- Bead plate + big road scoreboard (walked-pen + tie overlay); theatrical card reveal; tier-mapped celebration
- Banker commission + Big/Small payouts floor-rounded (ADR-0036)
- ADRs 0036 (third-card tableau + floor rounding), 0037 (persistent shoe + cut card); 6 PRs (#115–#120); **+226 tests**

## [v0.6-slots] — 2026-05-18

### Added

- 3-reel single-payline slots; weighted symbols (Cherry / Lemon / Bell / BAR / Seven) at ~86% RTP via a cumulative-weight table
- Sequential reel stops with suspense gaps; tiered win celebration with jackpot coin shower
- ADRs 0032 (symbol weights + RTP), 0033 (tiered win celebration); 98.92% logic coverage; **553 tests**

## [v0.5-roulette] — 2026-05-18

### Added

- European single-zero wheel; all 10 bet types from BUILD_GUIDE §8.2; up to 10 bet positions per round
- XState v5 round machine; deferred-placeBet wallet model (chips move on SPIN, refund-via-push on partial abort)
- Decoupled-rotation spin animation (independent CSS rotations equal mod 360); dev-only state-wipe button
- ADRs 0029 (European wheel order), 0030 (bet position model), 0031 (spin animation contract); **471 tests**

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
