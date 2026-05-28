# React Router 7 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from `react-router-dom` 6.30 to `react-router` 7.x, adopt the data-router pattern (`createBrowserRouter` + `RouterProvider`), extract bootstrap+Loading splash to a new `<AppBootstrap>` wrapper, and rename all imports.

**Architecture:** Single PR `chore/react-router-7-upgrade` from `main` (post-TS-6). Seven planned commits in logical chunks: package bump → router.tsx → AppBootstrap.tsx → main.tsx wiring + delete App.tsx + AppBootstrap.test.tsx → router-helpers + 6 test-file migrations → import sweep → ADR. CHANGELOG `[Unreleased]` entry. No release tag.

**Tech Stack:** react-router 7.x (replaces react-router-dom 6.30).

**Spec:** `docs/superpowers/specs/2026-05-15-react-router-7-upgrade-design.md`

**Depends on:** TypeScript 6 upgrade (`docs/superpowers/plans/2026-05-15-typescript-6-upgrade-plan.md`) merged to main first.

---

## File Structure (after this plan completes)

```
MASQUER/
├── package.json                              # MODIFIED: react-router-dom → react-router
├── pnpm-lock.yaml                            # AUTO-REGENERATED
├── CHANGELOG.md                              # MODIFIED: add to [Unreleased]
├── docs/adr/
│   └── 0014-react-router-7-data-router.md    # NEW
└── src/
    ├── App.tsx                               # DELETED
    ├── App.test.tsx                          # DELETED
    ├── main.tsx                              # MODIFIED
    ├── router.tsx                            # NEW
    ├── components/
    │   ├── AppBootstrap.tsx                  # NEW
    │   ├── AppBootstrap.test.tsx             # NEW (replaces App.test.tsx)
    │   ├── RequireAuth.tsx                   # MODIFIED: import from react-router
    │   └── RequireAuth.test.tsx              # MODIFIED: renderWithRouter
    ├── pages/
    │   ├── LoginPage.tsx                     # MODIFIED: import from react-router
    │   ├── LoginPage.test.tsx                # MODIFIED: renderWithRouter
    │   ├── RegisterPage.tsx                  # MODIFIED: import from react-router
    │   ├── RegisterPage.test.tsx             # MODIFIED: renderWithRouter
    │   ├── LobbyPage.tsx                     # MODIFIED: import from react-router
    │   └── LobbyPage.test.tsx                # MODIFIED: renderWithRouter
    └── test/
        └── router-helpers.tsx                # NEW
```

---

## Pre-flight

- [ ] **Step 1: Verify clean main and TS 6 already merged**

```bash
cd /Users/adam/localGamble
git checkout main && git pull --ff-only
git status
git log --oneline -5
```

Expected: clean tree; one of the recent commits is `chore(typescript): bump to TypeScript 6 (#NN)`. If TS 6 is NOT yet merged, STOP — this plan depends on it.

- [ ] **Step 2: Verify gates pass on main**

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0; 59 tests pass.

---

## Task 1: Branch + bump react-router-dom → react-router

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Branch**

```bash
git checkout -b chore/react-router-7-upgrade
```

- [ ] **Step 2: Remove the old package**

```bash
pnpm remove react-router-dom
```

Expected: package.json no longer has react-router-dom.

- [ ] **Step 3: Add the new package**

```bash
pnpm add react-router@^7
```

Expected: package.json shows `"react-router": "^7.x.y"`.

- [ ] **Step 4: Verify install**

```bash
pnpm list react-router react-router-dom
```

Expected: only `react-router` listed; `react-router-dom` not present.

- [ ] **Step 5: At this point typecheck WILL fail because all source files still import from `react-router-dom`. That's expected — we'll fix in subsequent tasks. Don't run `pnpm typecheck` yet.**

---

## Task 2: Create `src/router.tsx`

**Files:**

- Create: `src/router.tsx`

- [ ] **Step 1: Create the file**

```tsx
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
  {
    path: '/lobby',
    element: (
      <RequireAuth>
        <LobbyPage />
      </RequireAuth>
    ),
  },
  {
    path: '/stats',
    element: (
      <RequireAuth>
        <StatsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/leaderboard',
    element: (
      <RequireAuth>
        <LeaderboardPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
```

The file extension is `.tsx` (JSX inside).

---

## Task 3: Create `src/components/AppBootstrap.tsx`

**Files:**

- Create: `src/components/AppBootstrap.tsx`

- [ ] **Step 1: Create the file**

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

---

## Task 4: Update `src/main.tsx` and delete `src/App.tsx`

**Files:**

- Modify: `src/main.tsx`
- Delete: `src/App.tsx`

- [ ] **Step 1: Replace main.tsx**

Replace the entire contents of `src/main.tsx` with:

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

- [ ] **Step 2: Delete App.tsx**

```bash
git rm src/App.tsx
```

(Keep `src/App.test.tsx` for now — it's deleted in Task 6.)

---

## Task 5: Create `src/test/router-helpers.tsx`

**Files:**

- Create: `src/test/router-helpers.tsx`

- [ ] **Step 1: Create the helper**

```tsx
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

---

## Task 6: Replace `src/App.test.tsx` with `src/components/AppBootstrap.test.tsx`

**Files:**

- Delete: `src/App.test.tsx`
- Create: `src/components/AppBootstrap.test.tsx`

- [ ] **Step 1: Delete App.test.tsx**

```bash
git rm src/App.test.tsx
```

- [ ] **Step 2: Create AppBootstrap.test.tsx**

```tsx
import { beforeEach, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RequireAuth from './RequireAuth';
import LoginPage from '@/pages/LoginPage';
import LobbyPage from '@/pages/LobbyPage';

const SESSION_KEY = 'MASQUER.session.userId';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
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

  // Trigger bootstrap explicitly so currentUser is populated before render.
  await useSessionStore.getState().bootstrap();

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
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
  });
});
```

Note: `bootstrapping: false` in `resetStore()` (different from the original — we don't want AppBootstrap's loading state in these tests since we render the router directly).

---

## Task 7: Update `src/components/RequireAuth.tsx` and its test

**Files:**

- Modify: `src/components/RequireAuth.tsx`
- Modify: `src/components/RequireAuth.test.tsx`

- [ ] **Step 1: Update RequireAuth.tsx**

In `src/components/RequireAuth.tsx`, change the import line from:

```tsx
import { Navigate, useLocation } from 'react-router-dom';
```

to:

```tsx
import { Navigate, useLocation } from 'react-router';
```

No other changes.

- [ ] **Step 2: Replace RequireAuth.test.tsx**

Replace the entire contents of `src/components/RequireAuth.test.tsx` with:

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RequireAuth from './RequireAuth';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function FromCapture({ onCapture }: { onCapture: (from: string) => void }) {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (from) onCapture(from);
  return <p>login page</p>;
}

describe('RequireAuth', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    resetStore();
  });

  it('renders children when a user is logged in', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    renderWithRouter(
      [
        {
          path: '/protected',
          element: (
            <RequireAuth>
              <p>secret content</p>
            </RequireAuth>
          ),
        },
      ],
      { initialEntry: '/protected' },
    );
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    renderWithRouter(
      [
        {
          path: '/protected',
          element: (
            <RequireAuth>
              <p>secret</p>
            </RequireAuth>
          ),
        },
        { path: '/login', element: <p>login page</p> },
      ],
      { initialEntry: '/protected' },
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('preserves the attempted path in navigation state', () => {
    let capturedFrom: string | undefined;
    renderWithRouter(
      [
        {
          path: '/lobby',
          element: (
            <RequireAuth>
              <p>lobby</p>
            </RequireAuth>
          ),
        },
        { path: '/login', element: <FromCapture onCapture={(f) => (capturedFrom = f)} /> },
      ],
      { initialEntry: '/lobby' },
    );
    expect(capturedFrom).toBe('/lobby');
  });
});
```

Differences from the Phase 1 version:

- Import from `react-router` (not `react-router-dom`)
- Use `renderWithRouter` instead of `MemoryRouter` + `Routes` + `Route`
- `useLocation` and `FromCapture` definitions moved to TOP of file (no longer hoisted at the bottom)

---

## Task 8: Update `src/pages/LoginPage.tsx` and its test

**Files:**

- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/LoginPage.test.tsx`

- [ ] **Step 1: Update LoginPage.tsx import**

Change:

```tsx
import { useNavigate, useLocation, Link } from 'react-router-dom';
```

to:

```tsx
import { useNavigate, useLocation, Link } from 'react-router';
```

No other changes.

- [ ] **Step 2: Replace LoginPage.test.tsx**

Replace the entire contents with:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import LoginPage from './LoginPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function renderLogin() {
  return renderWithRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/lobby', element: <p>lobby page</p> },
    ],
    { initialEntry: '/login' },
  );
}

describe('LoginPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    resetStore();
  });

  it('renders the form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('shows validation errors for short username', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/at least 3/i)).toBeInTheDocument();
  });

  it('shows error message for wrong credentials', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it('navigates to /lobby on successful login', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/lobby page/i)).toBeInTheDocument();
  });
});
```

---

## Task 9: Update `src/pages/RegisterPage.tsx` and its test

**Files:**

- Modify: `src/pages/RegisterPage.tsx`
- Modify: `src/pages/RegisterPage.test.tsx`

- [ ] **Step 1: Update RegisterPage.tsx import**

Change:

```tsx
import { useNavigate, Link } from 'react-router-dom';
```

to:

```tsx
import { useNavigate, Link } from 'react-router';
```

- [ ] **Step 2: Replace RegisterPage.test.tsx**

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RegisterPage from './RegisterPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function renderRegister() {
  return renderWithRouter(
    [
      { path: '/register', element: <RegisterPage /> },
      { path: '/lobby', element: <p>lobby page</p> },
    ],
    { initialEntry: '/register' },
  );
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    resetStore();
  });

  it('renders the form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  it('shows inline error when passwords do not match', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows inline error when username is taken', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'aDaM');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'newpassword');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();
  });

  it('navigates to /lobby on successful registration', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'newuser');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/lobby page/i)).toBeInTheDocument();
  });
});
```

---

## Task 10: Update `src/pages/LobbyPage.tsx` and its test

**Files:**

- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/pages/LobbyPage.test.tsx`

- [ ] **Step 1: Update LobbyPage.tsx import**

Change:

```tsx
import { useNavigate } from 'react-router-dom';
```

to:

```tsx
import { useNavigate } from 'react-router';
```

- [ ] **Step 2: Replace LobbyPage.test.tsx**

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import LobbyPage from './LobbyPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

async function loginAdam() {
  await useSessionStore.getState().register({ username: 'Adam', password: 'password123' });
}

describe('LobbyPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('MASQUER.session.userId');
    resetStore();
  });

  it('shows the username and avatar swatch when logged in', async () => {
    await loginAdam();
    renderWithRouter([{ path: '/lobby', element: <LobbyPage /> }], { initialEntry: '/lobby' });
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
    expect(screen.getByLabelText('avatar')).toBeInTheDocument();
  });

  it('logout clears the session and navigates to /login', async () => {
    await loginAdam();
    renderWithRouter(
      [
        { path: '/lobby', element: <LobbyPage /> },
        { path: '/login', element: <p>login page</p> },
      ],
      { initialEntry: '/lobby' },
    );
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });
});
```

---

## Task 11: Verify everything works

**Files:** none

- [ ] **Step 1: Verify no `react-router-dom` references remain**

```bash
grep -rn "react-router-dom" src/
```

Expected: zero matches.

- [ ] **Step 2: Run all four quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count: 59/59 (count is unchanged from Phase 1).

If anything fails, diagnose. Common issues:

- A page or test file still imports from `react-router-dom` — finish the rename.
- The `JSX.Element` return type on AppBootstrap may need to be `import type { JSX } from 'react'` if the global JSX namespace is not available — add the import.
- Vitest test isolation: the `register` call in tests writes to the shared fake-indexeddb. Ensure each test calls `await resetDb()` in `beforeEach` (already done in the templates above).

---

## Task 12: Add ADR-0014

**Files:**

- Create: `docs/adr/0014-react-router-7-data-router.md`

- [ ] **Step 1: Create the ADR**

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

---

## Task 13: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add to `[Unreleased]` Changed section**

If `[Unreleased]` already has a `### Changed` subsection from the TS 6 upgrade, add the bullets there. Otherwise create one.

Result should look like:

```markdown
## [Unreleased]

### Changed

- TypeScript bumped from 5.6 to 6.x. Dropped `baseUrl` from `tsconfig.app.json` (TS 6 raises TS5101). `paths` alias resolves the same way without it. ADR-0013.
- React Router upgraded from `react-router-dom` 6.30 to `react-router` 7.x.
- Adopted data-router pattern: routes defined in `src/router.tsx` via `createBrowserRouter`; mounted via `<RouterProvider>` in `main.tsx`.
- Bootstrap call + Loading splash extracted to `src/components/AppBootstrap.tsx` (replaces `src/App.tsx`).
- Tests use `renderWithRouter` helper wrapping `createMemoryRouter`. ADR-0014.
```

---

## Task 14: Final local DoD verification

**Files:** none

- [ ] **Step 1: Re-run all five quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count: 59/59. Bundle size logged.

- [ ] **Step 2: Verify expected file inventory**

```bash
ls src/router.tsx src/components/AppBootstrap.tsx src/components/AppBootstrap.test.tsx src/test/router-helpers.tsx
ls src/App.tsx src/App.test.tsx 2>&1   # both should error: "No such file"
grep -rn "react-router-dom" src/   # should return no matches
```

- [ ] **Step 3: Capture bundle size**

The `pnpm build` output line `dist/assets/index-XXXX.js  YY.YY kB` — record JS and CSS sizes for the PR description.

---

## Task 15: Commit, push, open PR, watch, merge

**Files:** none

- [ ] **Step 1: Commit in 7 logical chunks**

```bash
# Chunk 1: package bump
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): bump react-router-dom 6.30 to react-router 7.x"

# Chunk 2: new router config
git add src/router.tsx
git commit -m "feat(routing): add router.tsx (createBrowserRouter route table)"

# Chunk 3: new bootstrap wrapper
git add src/components/AppBootstrap.tsx
git commit -m "feat(routing): add AppBootstrap component"

# Chunk 4: main.tsx rewire + delete App.tsx + new AppBootstrap.test.tsx
git add src/main.tsx src/App.tsx src/App.test.tsx src/components/AppBootstrap.test.tsx
git commit -m "feat(routing): wire RouterProvider in main.tsx and delete App.tsx"

# Chunk 5: test helpers + 6 test-file migrations
git add src/test/router-helpers.tsx \
        src/components/RequireAuth.test.tsx \
        src/pages/LoginPage.test.tsx \
        src/pages/RegisterPage.test.tsx \
        src/pages/LobbyPage.test.tsx
git commit -m "test(routing): add renderWithRouter helper and migrate test files"

# Chunk 6: import sweep on production files
git add src/components/RequireAuth.tsx \
        src/pages/LoginPage.tsx \
        src/pages/RegisterPage.tsx \
        src/pages/LobbyPage.tsx
git commit -m "refactor(routing): rename react-router-dom imports to react-router"

# Chunk 7: ADR + CHANGELOG
git add docs/adr/0014-react-router-7-data-router.md CHANGELOG.md
git commit -m "docs(adr): ADR-0014 react-router 7 data router migration"
```

- [ ] **Step 2: Push**

```bash
git push -u origin chore/react-router-7-upgrade
```

- [ ] **Step 3: Open the PR**

Substitute `<JS_SIZE>` and `<CSS_SIZE>` from Task 14 Step 3.

```bash
gh pr create --title "chore(routing): upgrade to react-router 7 (data router migration)" \
  --body "$(cat <<'EOF'
## Summary
Migrates from \`react-router-dom\` 6.30 to \`react-router\` 7.x with the data-router pattern.

- New \`src/router.tsx\` with \`createBrowserRouter([...])\` route table
- New \`src/components/AppBootstrap.tsx\` owns bootstrap + Loading splash
- \`src/main.tsx\` renders \`<AppBootstrap><RouterProvider router={router} /></AppBootstrap>\`
- Deleted \`src/App.tsx\` and \`src/App.test.tsx\` (replaced by \`AppBootstrap.test.tsx\`)
- Sweep: all \`react-router-dom\` imports renamed to \`react-router\` (~11 files)
- New \`src/test/router-helpers.tsx\` with \`renderWithRouter\` helper
- 6 test files migrated to use \`createMemoryRouter\` via the helper
- ADR-0014 + CHANGELOG entry

## How tested
- \`pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check\` all green
- 59/59 tests pass
- Bundle size: <JS_SIZE> JS / <CSS_SIZE> CSS
- \`grep -rn "react-router-dom" src/\` returns no matches

## Manual smoke (post-merge)
1. \`pnpm dev\` → \`/\` → \`/lobby\` → redirects to \`/login\`
2. Register new user → \`/lobby\`
3. Refresh → "Loading…" → \`/lobby\`
4. Logout → \`/login\`
5. Visit \`/lobby\` directly → redirects to \`/login\`
6. Login → \`/lobby\`

## BUILD_GUIDE reference
- Type: chore (dependency upgrade with architectural migration)
- Spec: \`docs/superpowers/specs/2026-05-15-react-router-7-upgrade-design.md\`
- Depends on: TS 6 upgrade (already merged)

## Definition of done
- [ ] All 4 CI jobs green
- [ ] \`react-router-dom\` no longer appears in \`src/\`
- [ ] \`src/App.tsx\` deleted

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI**

```bash
gh pr checks --watch
```

Expected: all four jobs green.

If anything fails, fix on the branch (don't bypass).

- [ ] **Step 5: Merge and sync**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -3
```

Expected: top commit is `chore(routing): upgrade to react-router 7 (#NN)`.

---

## Self-Review Notes

This plan was self-reviewed for:

- **Spec coverage:** every spec section maps to at least one task. Spec section 5.4 verbatim drafts → Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10. Spec section 5.5 ADR → Task 12. Spec section 6 test plan → Task 11 + 14. Spec section 7 PR plan → Task 15. Spec section 8 DoD → Task 14 + 15 step 4. Spec section 9 rollback procedure not duplicated (lives in spec).
- **Placeholders:** no TBD/TODO. Two intentional execution-time placeholders (`<JS_SIZE>` and `<CSS_SIZE>` for bundle output, and `#NN` for the PR number).
- **Type / name consistency:** verified across all 15 tasks: `router.tsx` (not `.ts`), `AppBootstrap`, `renderWithRouter`, `createMemoryRouter`, `RouteObject`, `useCurrentUser`, `useSessionStore`, `bootstrapping: false` in test resets (since AppBootstrap isn't in the test render), `MASQUER.session.userId`. Branch name `chore/react-router-7-upgrade`.
- **Scope:** RR 7 upgrade only. No additional refactors. The plan touches exactly the files listed in spec section 5.
- **Test count:** unchanged at 59 (we delete App.test.tsx with 2 tests, add AppBootstrap.test.tsx with 2 tests; net 0).
