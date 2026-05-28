import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/components/ui';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import * as auth from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import ProfilePage from './ProfilePage';

async function seedUser(username = 'adam') {
  const res = await auth.register({ username, password: 'password123' });
  if (!res.ok) throw new Error('seed failed');
  useSessionStore.setState({ currentUser: res.user, bootstrapping: false });
  return res.user;
}

function renderProfile(initialEntry = '/profile') {
  return renderWithRouter(
    [
      {
        path: '/profile',
        element: (
          <ToastProvider>
            <ProfilePage />
          </ToastProvider>
        ),
      },
      {
        path: '/profile/edit',
        element: (
          <ToastProvider>
            <ProfilePage edit />
          </ToastProvider>
        ),
      },
    ],
    { initialEntry },
  );
}

describe('ProfilePage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
    useSessionStore.setState({ currentUser: null, bootstrapping: false });
    useWalletStore.setState({ balance: 1234, nextDailyEligibleAt: null, hydrating: false });
  });

  it('view shows username, joined date, balance and stats', async () => {
    await seedUser('adam');
    renderProfile();
    expect(screen.getByRole('heading', { name: 'adam' })).toBeInTheDocument();
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Rounds')).toBeInTheDocument();
  });

  it('edit + save updates the username and reflects it in the view', async () => {
    const user = await seedUser('adam');
    renderProfile('/profile/edit');
    const input = screen.getByLabelText(/username/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'newname');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Navigates back to the view with the new name.
    expect(await screen.findByRole('heading', { name: 'newname' })).toBeInTheDocument();
    const row = await db.users.get(user.id);
    expect(row?.username).toBe('newname');
    expect(useSessionStore.getState().currentUser?.username).toBe('newname');
  });

  it('surfaces an error when the username is already taken', async () => {
    await auth.register({ username: 'taken', password: 'password123' });
    await seedUser('adam');
    renderProfile('/profile/edit');
    const input = screen.getByLabelText(/username/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'taken');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();
  });

  it('updates the avatar colour via the picker', async () => {
    const user = await seedUser('adam');
    const target = '#3df0ff';
    renderProfile('/profile/edit');
    await userEvent.click(screen.getByRole('radio', { name: target }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await screen.findByRole('heading', { name: 'adam' });
    const row = await db.users.get(user.id);
    expect(row?.avatarColor).toBe(target);
  });

  it('cancel reverts without saving', async () => {
    const user = await seedUser('adam');
    renderProfile('/profile/edit');
    const input = screen.getByLabelText(/username/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'discarded');
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(await screen.findByRole('heading', { name: 'adam' })).toBeInTheDocument();
    const row = await db.users.get(user.id);
    expect(row?.username).toBe('adam');
  });
});
