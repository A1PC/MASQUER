import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import RequireAuth from './RequireAuth';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

describe('RequireAuth', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
    resetStore();
  });

  it('renders children when a user is logged in', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <p>secret content</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <p>secret</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('preserves the attempted path in navigation state', () => {
    let capturedFrom: string | undefined;
    render(
      <MemoryRouter initialEntries={['/lobby']}>
        <Routes>
          <Route
            path="/lobby"
            element={
              <RequireAuth>
                <p>lobby</p>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<FromCapture onCapture={(f) => (capturedFrom = f)} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(capturedFrom).toBe('/lobby');
  });
});

import { useLocation } from 'react-router-dom';

function FromCapture({ onCapture }: { onCapture: (from: string) => void }) {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (from) onCapture(from);
  return <p>login page</p>;
}
