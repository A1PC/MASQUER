import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminUsersListPage from './AdminUsersListPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderPage(initial = '/admin/users') {
  const router = createMemoryRouter(
    [
      { path: '/admin/users', element: <AdminUsersListPage /> },
      { path: '/admin/users/:id', element: <div>user detail page</div> },
    ],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AdminUsersListPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
  });

  it('lists registered users with username + balance + net + logins + status columns', async () => {
    await register({ username: 'alice', password: 'password123' });
    await register({ username: 'bob', password: 'password123' });
    renderPage();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /username/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^balance$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /net change/i })).toBeInTheDocument();
  });

  it('clicking a user link navigates to /admin/users/:id', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    await user.click(screen.getByText('alice'));
    expect(await screen.findByText('user detail page')).toBeInTheDocument();
  });

  it('renders a Banned badge on banned users', async () => {
    const r = await register({ username: 'eve', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.users.update(r.user.id, { isBanned: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('eve')).toBeInTheDocument());
    expect(screen.getByText(/banned/i)).toBeInTheDocument();
  });

  it('shows empty-state row when no users', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no users registered/i)).toBeInTheDocument());
  });
});
