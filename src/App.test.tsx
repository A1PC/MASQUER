import { beforeEach, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: true });
}

beforeEach(async () => {
  await resetDb();
  localStorage.removeItem('localGamble.session.userId');
  resetStore();
});

it('redirects to /login when no session is active', async () => {
  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

it('renders /lobby when a user is logged in', async () => {
  await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
  resetStore();
  // Set the localStorage session so bootstrap() restores the user
  const user = await import('@/db').then(({ db }) => db.users.toArray());
  localStorage.setItem('localGamble.session.userId', user[0]!.id);

  render(
    <MemoryRouter initialEntries={['/lobby']}>
      <App />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /welcome, adam/i })).toBeInTheDocument();
  });
});
