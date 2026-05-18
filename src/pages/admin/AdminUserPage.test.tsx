import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminUserPage from './AdminUserPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderAt(userId: string) {
  const router = createMemoryRouter([{ path: '/admin/users/:id', element: <AdminUserPage /> }], {
    initialEntries: [`/admin/users/${userId}`],
  });
  return render(<RouterProvider router={router} />);
}

describe('AdminUserPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders username + stats + ban + adjust buttons for an existing user', async () => {
    const r = await register({ username: 'alice', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.rounds.add({
      id: 'r-1',
      userId: r.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    });

    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText(/balance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ban$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adjust credits/i })).toBeInTheDocument();
  });

  it('Ban button flips isBanned to true and the button switches to Unban', async () => {
    const r = await register({ username: 'bob', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const user = userEvent.setup();
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^ban$/i }));
    await waitFor(async () => {
      const u = await db.users.get(r.user.id);
      expect(u?.isBanned).toBe(true);
    });
    expect(await screen.findByRole('button', { name: /unban/i })).toBeInTheDocument();
  });

  it('opens the Adjust Credits modal when clicking the button', async () => {
    const r = await register({ username: 'carol', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    const user = userEvent.setup();
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText('carol')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /adjust credits/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows "user not found" if the id does not exist', async () => {
    renderAt('ghost-id');
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });

  it('shows per-user adjustment history when rows exist', async () => {
    const r = await register({ username: 'dave', password: 'password123' });
    if (!r.ok) throw new Error('register failed');
    await db.adjustments.add({
      id: 'adj-1',
      userId: r.user.id,
      amount: 500,
      reason: 'test grant',
      adjustedAt: 1234,
    });
    renderAt(r.user.id);
    await waitFor(() => expect(screen.getByText(/test grant/i)).toBeInTheDocument());
    expect(screen.getByText('+500')).toBeInTheDocument();
  });
});
