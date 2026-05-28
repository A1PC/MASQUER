# Code conventions

This is the in-repo coding standard for MASQUER. It mirrors what CI enforces
(`pnpm lint`, `pnpm typecheck`, ESLint rules) plus a handful of conventions
that are reviewer-enforced. Last refreshed at v1.0 (2026-05-28).

## Imports

- Use the `@/` alias for everything under `src/`. No deep relative paths
  (`../../../`).
- Type-only imports MUST use `import type`. Enforced by ESLint.
- Within `src/games/**`: no imports from `src/db` or `src/store`. Use
  `src/systems/*` only. Enforced by ESLint.
- localStorage access is allowed in `src/systems/auth.ts`,
  `src/systems/admin-auth.ts`, `src/systems/lottery-unread.ts`,
  `src/systems/lottery.ts`, and `src/store/uiStore.ts` ONLY. All keys live
  under the `masquer.*` prefix (renamed from `localGamble.*` at v1.0).

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
- Component tests use React Testing Library. Prefer role/text queries.
- **Scope assertions.** Never assert with a global `getByText(/value/)` for a
  value that can legitimately appear in more than one component on the page —
  it intermittently matches multiple elements and flakes in CI. Scope to a
  container (`within(card)`) or a `data-*` attribute (lesson from #169).
- For XState machines, feed scripted events with fixed seeds; the machine does
  no async work itself. For fake-timer + `invoke`/`sendBack` tests, use
  `await vi.advanceTimersByTimeAsync(ms)` (microtask delivery; lesson from #157).
- One assertion concept per test. Use `describe` to group.

## Styling

- **Tokens only — no hard-coded hex** in components. Colors, type, and
  spacing come from `src/theme/tokens.ts` + the tailwind config. Acceptable
  exceptions: variant-intrinsic colours (e.g. Bingo's 5-column BINGO
  palette, lottery ball-pool colours) and the SVG mask emblem — comment why
  the literal is there.
- Tailwind utilities only. No `style={{...}}` for colors/spacing.
- Theme colors must reference Tailwind brand tokens (e.g. `bg-felt-table`,
  `text-gold`, `border-brass`, `text-ivory`), never hex literals.
- Animations: prefer Framer Motion for anything beyond a CSS transition;
  reuse the shared variant library rather than bespoke transitions.
- Every animated surface MUST gate on `useEffectiveReducedMotion` from
  `@/motion/useEffectiveReducedMotion` and provide an instant /
  eased-down fallback. No exceptions.

## Sound

- The hook `useSound` (`src/systems/sound/useSound.ts`) is the **only**
  sound integration point — never embed `<audio>` directly. Volume + mute
  live in the Settings page and persist (`masquer.ui.*` localStorage keys).
- Reduced-motion users hear no audio (sound is gated on
  `useEffectiveReducedMotion`).

## Money

- All chip amounts are `number` type but always integers. Never floats.
- A wallet function MUST validate non-negative integers at boundaries.

## Game patterns (established across phases)

- **Wallet-bridge-async / machine-pure.** The page component does all async work
  (`placeBet`, RNG, payout math) and sends fully-resolved events into a
  synchronous XState machine. Machines stay deterministic + trivially testable.
- **Variant-as-config.** When a game has closely-related variants (e.g. Bingo's
  British/American), drive them from one `VARIANTS` config object that functions
  take as a parameter — avoid duplicating per-variant files. Poker is the
  exception: variants get sibling directories under `poker/` because they differ
  structurally, but they share `poker/_shared/`.
- **One round, one row.** Every settled round writes exactly one `rounds` row via
  `wallet.settleRound` (ADR-0016). The poker buy-in/cash-out session is the
  documented exception (ADR-0041): one row per session, with multiple `placeBet`
  debits (buy-in + rebuys) accumulating into the session's stake. Craps follows
  the same session pattern (ADR-0042-adjacent).
- **Seeded RNG everywhere.** Inline `mulberry32` + `stringSeed` in a game's pure
  module when it needs determinism without importing a system; never `Math.random`.
- **Page roots under `AppLayout` use `h-full`, not `min-h-screen`** — TopBar
  above main makes 100vh always overflow (user memory
  `feedback-localgamble-min-h-screen-in-pages`).
- **Lazy-load game routes via React Router's `lazy` option.** Each game's
  `<GamePage>` is loaded on demand with a shared `<RouteFallback>` and an
  idle-time prefetch hint fired after auth. Main bundle is budgeted at
  ~222 KB gzipped post-v1.0 (down from 477 KB pre-PR-C).

## Commits and branches

- Conventional Commits. Enforced by commitlint in CI.
- One topic per commit. Squash-merge on PR.
- Branch names: `phase-N-short-name`, `fix/area-x`, `chore/x`, `docs/x`.
