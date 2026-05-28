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
    localStorage.removeItem('masquer.session.userId');
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
