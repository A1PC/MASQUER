# React Router 7 Upgrade — Design Spec

- **Status:** Approved (2026-05-15)
- **Author:** Developer (with Claude Opus 4.7)
- **Type:** Chore (dependency upgrade with architectural migration)
- **Related ADRs:** 0014 (created as part of this chore)
- **Implementation plan:** `docs/superpowers/plans/2026-05-15-react-router-7-upgrade-plan.md` (to be written next)
- **Depends on:** TypeScript 6 upgrade (must merge first)

---

## 1. Goal

Migrate from `react-router-dom` 6.30 to `react-router` 7.x, adopt the data-router pattern (`createBrowserRouter` + `RouterProvider`), and rename all imports from `react-router-dom` to `react-router`.

The previous Dependabot attempt (PR #42, closed) deferred this because v7 has breaking-change surface that needs deliberate handling. This spec is that handling.

This is a chore, not a feature. No version tag, no GitHub release. CHANGELOG entry under `[Unreleased]`.

## 2. Non-goals

- Adding loaders or actions to routes (data-fetching idioms). Possible later for Phase 7 stats / Phase 2 lobby balance fetch — not now.
- Switching to `react-router/dom` lazy mode or framework mode (Remix-style).
- Adding nested routes / layout routes beyond the existing flat structure.
- Renaming hooks (`useNavigate`, `useLocation`, etc. — these are unchanged in v7).
- Touching anything outside `src/router.ts`, `src/main.tsx`, `src/components/AppBootstrap.tsx`, `src/components/RequireAuth.{tsx,test.tsx}`, `src/pages/*.{tsx,test.tsx}`, and the deleted `src/App.{tsx,test.tsx}`.

## 3. Decisions made

| #   | Decision                                                                                                                                                    | Rationale                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Adopt `createBrowserRouter` + `RouterProvider` (data router pattern)                                                                                        | User-confirmed; aligns with v7 idiom; prepares for loader-based data fetching in later phases.                           |
| 2   | Bootstrap call + Loading splash live in a new `<AppBootstrap>` wrapper above `<RouterProvider>`                                                             | Simplest migration path; preserves existing bootstrap semantics; defers loader idioms to a later upgrade. ADR-0014.      |
| 3   | Rename all `react-router-dom` imports to `react-router`                                                                                                     | RR 7 made `-dom` an alias; new code should import from `react-router`. One-time sweep across 11 files.                   |
| 4   | Test refactor: switch from `<MemoryRouter><Routes>...</Routes></MemoryRouter>` to `createMemoryRouter([...])` + `<RouterProvider router={...} />`           | Required for v7 data-router tests. Add a small `src/test/router-helpers.tsx` so test files don't repeat the boilerplate. |
| 5   | `src/App.tsx` is deleted; its responsibilities split into `src/router.ts` (route table) and `src/components/AppBootstrap.tsx` (boot state + Loading splash) | Cleaner separation of concerns. App.tsx had been doing two unrelated jobs.                                               |
| 6   | Single PR `chore/react-router-7-upgrade`                                                                                                                    | The change is cohesive — a partial upgrade would leave the app in an unrunnable state.                                   |
| 7   | No release tag                                                                                                                                              | Chore. CHANGELOG `[Unreleased]` entry only.                                                                              |

## 4. Architectural change

### Before (current Phase 1 state)

```
src/main.tsx
└─ <BrowserRouter>
   └─ <App />                               ← bootstrap + Loading + <Routes>
```

`src/App.tsx` does THREE things:

1. Calls `bootstrap()` in a useEffect.
2. Renders the Loading splash while `bootstrapping` is true.
3. Renders the `<Routes>` table once bootstrap completes.

### After

```
src/main.tsx
└─ <AppBootstrap>                            ← bootstrap + Loading
   └─ <RouterProvider router={router} />     ← route resolution
                          ↑
                 src/router.ts
                 export const router = createBrowserRouter([...])
```

Three clearly-bounded pieces:

- `src/main.tsx` — composition root. Does not hold app state.
- `src/components/AppBootstrap.tsx` — owns the boot lifecycle. Mounts its child only after bootstrap completes.
- `src/router.ts` — owns the route table. Pure data; no React state.

## 5. File changes

### 5.1 Files added

- `src/router.ts`
- `src/components/AppBootstrap.tsx`
- `src/components/AppBootstrap.test.tsx` (replaces `src/App.test.tsx`)
- `src/test/router-helpers.tsx`
- `docs/adr/0014-react-router-7-data-router.md`

### 5.2 Files deleted

- `src/App.tsx` (responsibilities moved to `router.ts` + `AppBootstrap.tsx`)
- `src/App.test.tsx` (replaced by `AppBootstrap.test.tsx`)

### 5.3 Files modified

| File                                  | Change                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `package.json`                        | Replace `"react-router-dom": "^6.27.0"` with `"react-router": "^7.0.0"`        |
| `pnpm-lock.yaml`                      | Auto-regenerated                                                               |
| `src/main.tsx`                        | Renders `<AppBootstrap><RouterProvider router={router} /></AppBootstrap>`      |
| `src/components/RequireAuth.tsx`      | Import from `'react-router'` instead of `'react-router-dom'`. Logic unchanged. |
| `src/components/RequireAuth.test.tsx` | Use `createMemoryRouter` via `renderWithRouter` helper                         |
| `src/pages/LoginPage.tsx`             | Import from `'react-router'`                                                   |
| `src/pages/RegisterPage.tsx`          | Import from `'react-router'`                                                   |
| `src/pages/LobbyPage.tsx`             | Import from `'react-router'`                                                   |
| `src/pages/LoginPage.test.tsx`        | Use `renderWithRouter` helper                                                  |
| `src/pages/RegisterPage.test.tsx`     | Use `renderWithRouter` helper                                                  |
| `src/pages/LobbyPage.test.tsx`        | Use `renderWithRouter` helper                                                  |

### 5.4 Verbatim drafts

#### `src/router.ts`

```ts
import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/lobby" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/lobby', element: <RequireAuth><LobbyPage /></RequireAuth> },
  { path: '/stats', element: <RequireAuth><StatsPage /></RequireAuth> },
  { path: '/leaderboard', element: <RequireAuth><LeaderboardPage /></RequireAuth> },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
```

_(File extension: `.tsx` if your build/lint setup requires JSX in `.ts` to be `.tsx`. With Vite + React JSX preset, `.ts` typically does NOT accept JSX. Use `.tsx`.)_

Renamed: **`src/router.tsx`** (not `.ts`) — JSX inside.

#### `src/components/AppBootstrap.tsx`

```tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';

interface Props {
  children: ReactNode;
}

export default function AppBootstrap({ children }: Props): JSX.Element {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
```

#### `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppBootstrap from '@/components/AppBootstrap';
import { router } from '@/router';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap>
      <RouterProvider router={router} />
    </AppBootstrap>
  </StrictMode>,
);
```

#### `src/test/router-helpers.tsx`

```tsx
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';

/**
 * Render a set of routes inside a memory router for tests.
 *
 *   renderWithRouter(
 *     [
 *       { path: '/login', element: <LoginPage /> },
 *       { path: '/lobby', element: <p>lobby</p> },
 *     ],
 *     { initialEntry: '/login' },
 *   );
 */
export function renderWithRouter(
  routes: RouteObject[],
  options: { initialEntry?: string } = {},
): ReturnType<typeof render> {
  const router = createMemoryRouter(routes, {
    initialEntries: [options.initialEntry ?? '/'],
  });
  return render(<RouterProvider router={router} />);
}
```

#### `src/components/AppBootstrap.test.tsx` (replaces `src/App.test.tsx`)

```tsx
import { beforeEach, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import AppBootstrap from './AppBootstrap';
import RequireAuth from './RequireAuth';
import LoginPage from '@/pages/LoginPage';
import LobbyPage from '@/pages/LobbyPage';

const SESSION_KEY = 'MASQUER.session.userId';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: true });
}

beforeEach(async () => {
  await resetDb();
  localStorage.removeItem(SESSION_KEY);
  resetStore();
});

it('redirects to /login when no session is active', async () => {
  renderWithRouter(
    [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/lobby',
        element: (
          <RequireAuth>
            <LobbyPage />
          </RequireAuth>
        ),
      },
    ],
    { initialEntry: '/lobby' },
  );

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

it('renders /lobby when a user is logged in', async () => {
  await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
  resetStore();
  const users = await db.users.toArray();
  localStorage.setItem(SESSION_KEY, users[0]!.id);

  // Wrap in AppBootstrap so the boot lifecycle runs and restores the session.
  // (renderWithRouter mounts the router directly; for this test we need the
  // wrapper around it.)
  const { container } = renderWithRouter(
    [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/lobby',
        element: (
          <RequireAuth>
            <LobbyPage />
          </RequireAuth>
        ),
      },
    ],
    { initialEntry: '/lobby' },
  );
  // AppBootstrap wraps the router in production; in test we render the router
  // alone but trigger bootstrap manually so currentUser is populated.
  await useSessionStore.getState().bootstrap();
  void container;

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
  });
});
```

_(The second test illustrates a wrinkle: AppBootstrap blocks rendering until bootstrap finishes. For tests, we either explicitly mount AppBootstrap around the router OR pre-trigger bootstrap manually. The plan will pick whichever is cleaner.)_

#### Page test pattern (e.g., `src/pages/LoginPage.test.tsx` excerpt)

```tsx
import { renderWithRouter } from '@/test/router-helpers';
import LoginPage from './LoginPage';

function renderLogin() {
  return renderWithRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/lobby', element: <p>lobby page</p> },
    ],
    { initialEntry: '/login' },
  );
}
```

Replaces the prior `<MemoryRouter><Routes>...</Routes></MemoryRouter>` block. Same coverage.

### 5.5 ADR-0014

`docs/adr/0014-react-router-7-data-router.md`:

```markdown
# ADR-0014: React Router 7 — data router pattern with AppBootstrap wrapper

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

Dependabot opened a PR (#42, closed) bumping `react-router-dom` from 6.x to
7.x. RR 7 promotes the data-router API (`createBrowserRouter` +
`RouterProvider`) and rebrands the `-dom` package as `react-router`. We
deferred the upgrade pending a deliberate migration plan.

## Decision

1. Adopt the data-router API: define routes as a `RouteObject[]` and mount
   them via `<RouterProvider router={router} />`.
2. Move bootstrap-on-app-start into a new `<AppBootstrap>` wrapper that
   sits ABOVE `<RouterProvider>` in `main.tsx`. AppBootstrap renders its
   child only after bootstrap resolves.
3. Rename all imports from `react-router-dom` to `react-router`.
4. Delete `src/App.tsx`; route table moves to `src/router.tsx`.
5. Tests use a small `renderWithRouter([...routes], {initialEntry})` helper
   wrapping `createMemoryRouter` + `RouterProvider`.

## Alternatives considered

- **Stay on RR 6**: postpones the work; v6 is in maintenance mode.
- **Minimal compat upgrade (keep `<BrowserRouter>` + `<Routes>`)**: less
  invasive but doesn't unlock the loader/action APIs we'll want for Phase 7
  stats and Phase 2 lobby balance fetching. If we're touching it, do it
  right.
- **Bootstrap as a root route loader**: more idiomatic v7, but introduces
  loader and HydrateFallback concepts we don't otherwise need yet. Defer
  to Phase 8 polish or whenever a route legitimately needs a loader.

## Consequences

- One-time refactor of 11 files (mostly test files).
- `src/App.tsx` is deleted; its job split between `router.tsx` (route data)
  and `AppBootstrap.tsx` (boot state). Each file now does one thing.
- Future routes that need data fetching can adopt loaders without further
  architectural change.
- `react-router-dom` import alias stays available, but new imports use
  `react-router` per RR 7 guidance.

## References

- React Router 7 migration docs.
- ADR-0011 (RequireAuth pattern — preserved).
- Phase 1 spec sections 6.10, 6.11 (current routing setup being replaced).
```

## 6. Test plan

No new test cases — existing 59 tests must still pass after the migration. The test files change shape (use `renderWithRouter`) but assertions are unchanged.

| Check                            | Expected                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | succeeds                                                                                            |
| `pnpm typecheck`                 | exits 0                                                                                             |
| `pnpm lint`                      | exits 0                                                                                             |
| `pnpm test:run`                  | 59/59 tests pass; coverage on `src/systems/**/*.ts` ≥ 80% (unchanged)                               |
| `pnpm build`                     | exits 0; bundle size in PR description (expect roughly the same as Phase 1: ~363 kB JS / ~7 kB CSS) |
| `pnpm format:check`              | exits 0                                                                                             |

**Manual smoke test (post-merge):** the Phase 1 12-step smoke test, abbreviated:

1. `pnpm dev` → `/` → `/lobby` → redirects to `/login`
2. Register new user → `/lobby`
3. Refresh → "Loading…" → `/lobby`
4. Logout → `/login`
5. Visit `/lobby` directly → `/login`
6. Login → `/lobby`

If any step fails, that's a regression — fix before considering the chore complete.

## 7. PR plan

### Single PR — `chore/react-router-7-upgrade`

**Branch:** from `main` (post-TS-6 merge).

**Commits (logical chunks):**

1. `chore(deps): bump react-router-dom 6.30 to react-router 7.x` — package.json + lockfile.
2. `feat(routing): add router.tsx (createBrowserRouter route table)` — new file.
3. `feat(routing): add AppBootstrap component` — new wrapper.
4. `feat(routing): wire RouterProvider in main.tsx and delete App.tsx` — main.tsx update + App.tsx deletion + AppBootstrap.test.tsx (replaces App.test.tsx).
5. `test(routing): add renderWithRouter helper and migrate test files` — test/router-helpers.tsx + RequireAuth.test, LoginPage.test, RegisterPage.test, LobbyPage.test updates.
6. `refactor(routing): rename react-router-dom imports to react-router` — sweep across RequireAuth.tsx, LoginPage.tsx, RegisterPage.tsx, LobbyPage.tsx (the test files already imported from react-router via the helper, so they may not need changes here).
7. `docs(adr): ADR-0014 react-router 7 data router migration` — ADR file.

CHANGELOG `[Unreleased]` addition:

```markdown
### Changed

- React Router upgraded from `react-router-dom` 6.30 to `react-router` 7.x.
- Adopted data-router pattern: routes defined in `src/router.tsx` via
  `createBrowserRouter`; mounted via `<RouterProvider>` in `main.tsx`.
- Bootstrap call + Loading splash extracted to `src/components/AppBootstrap.tsx`
  (replaces `src/App.tsx`).
- Tests use `renderWithRouter` helper wrapping `createMemoryRouter`. ADR-0014.
```

**CI:** all 4 jobs must pass before merge.

## 8. Definition of Done

- [ ] `package.json` has `"react-router": "^7.x.y"`; no `"react-router-dom"` entry.
- [ ] `src/App.tsx` does not exist; `src/App.test.tsx` does not exist.
- [ ] `src/router.tsx` exists and exports the `router` constant.
- [ ] `src/components/AppBootstrap.tsx` exists and renders Loading splash + children.
- [ ] `src/main.tsx` renders `<AppBootstrap><RouterProvider router={router} /></AppBootstrap>`.
- [ ] `grep -rn "react-router-dom" src/` returns zero hits.
- [ ] `pnpm test:run` → 59/59 pass.
- [ ] All four CI jobs pass on the PR.
- [ ] PR merged via `--squash --delete-branch`.
- [ ] ADR-0014 present and Accepted.
- [ ] CHANGELOG `[Unreleased]` mentions the migration.
- [ ] Manual smoke test (6 steps in §6) passes in `pnpm dev`.

## 9. Rollback procedure

If a regression is found post-merge:

```bash
git revert <merge-commit> -m 1
git push origin main
```

The lockfile reverts to `react-router-dom` 6.30; `pnpm install --frozen-lockfile` returns the workspace to the prior architecture.

If the regression is small and isolatable, prefer a forward-fix PR over a revert.

## 10. Handoff

Once merged, both follow-ups from the post-Phase-1 cleanup are complete. Phase 2 (Wallet + Lobby + Game shell) can begin its own brainstorming cycle from a clean `main` with TS 6 + RR 7 already in place.

The data-router architecture means future Phase 7 stats routes can adopt loaders without further structural change — file an ADR amendment if/when that happens.

---

_End of React Router 7 upgrade spec._
