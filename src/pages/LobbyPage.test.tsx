import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
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
    render(
      <MemoryRouter>
        <LobbyPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
    expect(screen.getByLabelText('avatar')).toBeInTheDocument();
  });

  it('logout clears the session and navigates to /login', async () => {
    await loginAdam();
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(useSessionStore.getState().currentUser).toBeNull();
  });
});
