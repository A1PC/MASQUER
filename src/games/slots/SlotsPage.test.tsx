import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SlotsPage from './SlotsPage';
import { seed, unseed } from '@/systems/rng';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { db } from '@/db';
import type { User } from '@/db/schema';

const TEST_USER: User = {
  id: 'u-test',
  username: 'tester',
  usernameLower: 'tester',
  passwordHash: 'x',
  passwordSalt: 'y',
  pbkdf2Iterations: 600000,
  avatarColor: '#3df0ff',
  createdAt: 0,
};

async function resetDb() {
  await db.balances.clear();
  await db.rounds.clear();
  await db.users.clear();
}

async function hydrateUser(balance = 500) {
  await db.users.put(TEST_USER);
  await db.balances.put({ userId: TEST_USER.id, chips: balance, updatedAt: Date.now() });
  useSessionStore.setState({ currentUser: TEST_USER } as never);
  await useWalletStore.getState().hydrate(TEST_USER.id);
}

describe('<SlotsPage /> skeleton', () => {
  beforeEach(async () => {
    seed(1);
    await resetDb();
    await hydrateUser(500);
  });
  afterEach(() => unseed());

  it('renders the SLOTS title, paytable, and 3 reels', async () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/SLOTS/i)).toBeInTheDocument();
    expect(screen.getByText(/PAYOUT TABLE/i)).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-reel-index="2"]')).toBeInTheDocument();
  });

  it('Spin button is disabled when bet is 0', () => {
    render(
      <MemoryRouter>
        <SlotsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /^spin$/i })).toBeDisabled();
  });
});
