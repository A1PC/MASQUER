import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminSessionsPage from './AdminSessionsPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/admin/sessions', element: <AdminSessionsPage /> },
      { path: '/admin/users/:id', element: <div>user detail</div> },
    ],
    { initialEntries: ['/admin/sessions'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AdminSessionsPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders empty-state when no sessions exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no sessions/i)).toBeInTheDocument());
  });

  it('lists sessions newest-first with username + duration + status', async () => {
    const a = await register({ username: 'alice', password: 'password123' });
    if (!a.ok) throw new Error('register failed');
    await db.sessions.bulkAdd([
      { id: 's-1', userId: a.user.id, loginAt: 1000, logoutAt: 5000, durationMs: 4000 },
      { id: 's-2', userId: a.user.id, loginAt: 10_000, logoutAt: null, durationMs: null },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('alice').length).toBeGreaterThan(0));
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText('4s')).toBeInTheDocument();
  });
});
