import { beforeEach, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RequireAuth from './RequireAuth';
import LoginPage from '@/pages/LoginPage';
import LobbyPage from '@/pages/LobbyPage';

const SESSION_KEY = 'localGamble.session.userId';

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
