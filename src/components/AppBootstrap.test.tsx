import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RequireAuth from './RequireAuth';
import AppBootstrap from './AppBootstrap';
import LoginPage from '@/pages/LoginPage';
import LobbyPage from '@/pages/LobbyPage';

vi.mock('@/store/walletStore', () => ({
  useWalletStore: Object.assign(
    (
      selector: (s: {
        hydrate: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
      }) => unknown,
    ) => selector({ hydrate: vi.fn(), clear: vi.fn() }),
    {
      getState: () => ({ hydrate: vi.fn(), clear: vi.fn() }),
    },
  ),
}));

const SESSION_KEY = 'localGamble.session.userId';

function resetStore() {
  useSessionStore.setState({
    currentUser: null,
    bootstrapping: false,
    isAdmin: false,
    currentSessionId: null,
  });
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

describe('AppBootstrap — beforeunload session close', () => {
  it('registers a beforeunload listener that closes the active session', async () => {
    await useSessionStore.getState().register({ username: 'nina', password: 'password123' });
    await useSessionStore.getState().logout();
    await useSessionStore.getState().login({ username: 'nina', password: 'password123' });
    const sid = useSessionStore.getState().currentSessionId!;

    render(
      <AppBootstrap>
        <div>child</div>
      </AppBootstrap>,
    );
    await waitFor(() => expect(useSessionStore.getState().bootstrapping).toBe(false));

    window.dispatchEvent(new Event('beforeunload'));
    await new Promise((r) => setTimeout(r, 50));

    const closed = await db.sessions.get(sid);
    expect(closed?.logoutAt).not.toBeNull();
    expect(closed?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('beforeunload is a no-op when no session is active', async () => {
    render(
      <AppBootstrap>
        <div>child</div>
      </AppBootstrap>,
    );
    await waitFor(() => expect(useSessionStore.getState().bootstrapping).toBe(false));
    expect(() => window.dispatchEvent(new Event('beforeunload'))).not.toThrow();
  });
});

it('renders /lobby when a user is logged in', async () => {
  await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
  resetStore();
  const users = await db.users.toArray();
  localStorage.setItem(SESSION_KEY, users[0]!.id);

  // Trigger bootstrap explicitly so currentUser is populated before render.
  await useSessionStore.getState().bootstrap();

  useSessionStore.setState({
    currentUser: (await db.users.get(users[0]!.id)) ?? null,
    bootstrapping: false,
  });

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
    expect(screen.getByText(/PICK YOUR POISON/)).toBeInTheDocument();
  });
});
