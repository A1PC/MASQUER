import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TopPlayersPanel from './TopPlayersPanel';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

async function seedUser(id: string, username: string): Promise<void> {
  await db.users.add({
    id,
    username,
    usernameLower: username.toLowerCase(),
    passwordHash: 'x',
    passwordSalt: 'x',
    pbkdf2Iterations: 1,
    avatarColor: '#fff',
    createdAt: 0,
  });
}

async function seedRound(opts: {
  id: string;
  userId: string;
  game: 'blackjack' | 'slots' | 'coin-flip';
  bet: number;
  payout: number;
  playedAt: number;
}): Promise<void> {
  const netChange = opts.payout - opts.bet;
  await db.rounds.add({
    id: opts.id,
    userId: opts.userId,
    game: opts.game,
    betAmount: opts.bet,
    payout: opts.payout,
    netChange,
    outcome: netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push',
    details: {},
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('TopPlayersPanel', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the TOP PLAYERS heading and empty state when no rounds', async () => {
    render(
      <MemoryRouter>
        <TopPlayersPanel game="blackjack" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/top players/i)).toBeInTheDocument());
    expect(screen.getByText(/no players yet/i)).toBeInTheDocument();
  });

  it('renders rows for the requested game sorted by net chips desc', async () => {
    await seedUser('u-a', 'alice');
    await seedUser('u-b', 'bob');
    // alice: +100 (BJ win) + 50 (BJ win) = +150 net, biggest +100
    await seedRound({
      id: 'r-1',
      userId: 'u-a',
      game: 'blackjack',
      bet: 100,
      payout: 200,
      playedAt: 1000,
    });
    await seedRound({
      id: 'r-2',
      userId: 'u-a',
      game: 'blackjack',
      bet: 50,
      payout: 100,
      playedAt: 2000,
    });
    // bob: +300 (BJ win) - 50 (BJ loss) = +250 net, biggest +300
    await seedRound({
      id: 'r-3',
      userId: 'u-b',
      game: 'blackjack',
      bet: 100,
      payout: 400,
      playedAt: 3000,
    });
    await seedRound({
      id: 'r-4',
      userId: 'u-b',
      game: 'blackjack',
      bet: 50,
      payout: 0,
      playedAt: 4000,
    });

    const { container } = render(
      <MemoryRouter>
        <TopPlayersPanel game="blackjack" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-top-players-table]')).not.toBeNull());
    const rows = container.querySelectorAll('[data-top-players-row]');
    expect(rows).toHaveLength(2);
    // Bob first (+250), Alice second (+150).
    expect(rows[0]!.textContent).toContain('bob');
    expect(rows[1]!.textContent).toContain('alice');
  });

  it('renders user links pointing to /admin/users/:id', async () => {
    await seedUser('u-a', 'alice');
    await seedRound({
      id: 'r-1',
      userId: 'u-a',
      game: 'slots',
      bet: 100,
      payout: 200,
      playedAt: 1000,
    });
    const { container } = render(
      <MemoryRouter>
        <TopPlayersPanel game="slots" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-top-players-link="u-a"]')).not.toBeNull(),
    );
    const link = container.querySelector('[data-top-players-link="u-a"]');
    expect(link?.getAttribute('href')).toBe('/admin/users/u-a');
  });

  it('exposes the panel via data-top-players-panel="<game>"', async () => {
    const { container } = render(
      <MemoryRouter>
        <TopPlayersPanel game="coin-flip" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-top-players-panel="coin-flip"]')).not.toBeNull(),
    );
  });

  it('falls back to <deleted> when a user row no longer exists', async () => {
    await seedRound({
      id: 'r-1',
      userId: 'ghost',
      game: 'blackjack',
      bet: 100,
      payout: 200,
      playedAt: 1000,
    });
    render(
      <MemoryRouter>
        <TopPlayersPanel game="blackjack" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('<deleted>')).toBeInTheDocument());
  });

  it('renders brand-tokened chrome (velvet-deep + brass border)', async () => {
    const { container } = render(
      <MemoryRouter>
        <TopPlayersPanel game="blackjack" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/top players/i)).toBeInTheDocument());
    const panel = container.querySelector('[data-top-players-panel="blackjack"] > div');
    expect(panel?.className).toContain('bg-velvet-deep');
    expect(panel?.className).toContain('border-brass/60');
  });
});
