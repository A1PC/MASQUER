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
