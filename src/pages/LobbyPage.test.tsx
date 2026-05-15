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
    localStorage.removeItem('localGamble.session.userId');
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
