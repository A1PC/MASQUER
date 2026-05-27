import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminLeaderboardPage from './AdminLeaderboardPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import { register } from '@/systems/auth';

const SESSION_KEY = 'localGamble.session.userId';

/**
 * Seeds 3 users × 5 rounds across 3 games — small enough to keep the test
 * predictable, big enough to exercise each tab's column rendering.
 */
async function seedFixture(): Promise<void> {
  await resetDb();
  localStorage.removeItem(SESSION_KEY);
  const a = await register({ username: 'alice', password: 'password123' });
  const b = await register({ username: 'bob', password: 'password123' });
  const c = await register({ username: 'carol', password: 'password123' });
  if (!a.ok || !b.ok || !c.ok) throw new Error('register failed');

  await db.rounds.bulkAdd([
    // alice — 2 wins (BJ, Slots)
    {
      id: 'a-1',
      userId: a.user.id,
      game: 'blackjack',
      betAmount: 100,
      payout: 200,
      netChange: 100,
      outcome: 'win',
      details: {},
      balanceAfter: 1100,
      playedAt: 1000,
    },
    {
      id: 'a-2',
      userId: a.user.id,
      game: 'slots',
      betAmount: 50,
      payout: 100,
      netChange: 50,
      outcome: 'win',
      details: {},
      balanceAfter: 1150,
      playedAt: 2000,
    },
    // bob — 2 losses
    {
      id: 'b-1',
      userId: b.user.id,
      game: 'roulette',
      betAmount: 80,
      payout: 0,
      netChange: -80,
      outcome: 'loss',
      details: {},
      balanceAfter: 920,
      playedAt: 1500,
    },
    {
      id: 'b-2',
      userId: b.user.id,
      game: 'slots',
      betAmount: 40,
      payout: 0,
      netChange: -40,
      outcome: 'loss',
      details: {},
      balanceAfter: 880,
      playedAt: 2500,
    },
    // carol — 1 big win + 1 loss
    {
      id: 'c-1',
      userId: c.user.id,
      game: 'slots',
      betAmount: 500,
      payout: 1500,
      netChange: 1000,
      outcome: 'win',
      details: {},
      balanceAfter: 2000,
      playedAt: 3000,
    },
    {
      id: 'c-2',
      userId: c.user.id,
      game: 'roulette',
      betAmount: 200,
      payout: 0,
      netChange: -200,
      outcome: 'loss',
      details: {},
      balanceAfter: 1800,
      playedAt: 4000,
    },
  ]);
}

describe('AdminLeaderboardPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem(SESSION_KEY);
    // Per-tab range storage keys land in localStorage — clear them so each
    // test starts from the default `'all'` preset.
    for (const t of ['winners', 'volume', 'single-win', 'streak'] as const) {
      localStorage.removeItem(`admin.leaderboard.${t}.range`);
    }
  });

  it('renders the page heading and four tab buttons', async () => {
    render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('tab', { name: /top winners/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /top by volume/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /biggest single win/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /longest win streak/i })).toBeInTheDocument();
  });

  it('selects Top winners by default and renders empty-state with no data', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const winnersTab = screen.getByRole('tab', { name: /top winners/i });
      expect(winnersTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(container.querySelector('[data-leaderboard-empty]')).toBeInTheDocument();
    expect(container.querySelector('[data-leaderboard-winners]')).toBeNull();
  });

  it('renders the winners table with rows when rounds exist', async () => {
    await seedFixture();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument();
    });
    const table = container.querySelector('[data-leaderboard-winners]') as HTMLElement;
    // Rank 1: carol (+800 net), rank 2: alice (+150 net), rank 3: bob (-120 net)
    expect(within(table).getByText('carol')).toBeInTheDocument();
    expect(within(table).getByText('alice')).toBeInTheDocument();
    expect(within(table).getByText('bob')).toBeInTheDocument();
    expect(within(table).getByText(/^\+800$/)).toBeInTheDocument();
    expect(within(table).getByText(/^\+150$/)).toBeInTheDocument();
    expect(within(table).getByText(/^-120$/)).toBeInTheDocument();
  });

  it('switches to Top by volume tab on click', async () => {
    await seedFixture();
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('tab', { name: /top by volume/i }));
    await waitFor(() => {
      const volumeTab = screen.getByRole('tab', { name: /top by volume/i });
      expect(volumeTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(container.querySelector('[data-leaderboard-volume]')).toBeInTheDocument();
    expect(container.querySelector('[data-leaderboard-winners]')).toBeNull();
  });

  it('switches to Biggest single win tab and shows the largest wins first', async () => {
    await seedFixture();
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('tab', { name: /biggest single win/i }));
    await waitFor(() => {
      expect(container.querySelector('[data-leaderboard-single-win]')).toBeInTheDocument();
    });
    const table = container.querySelector('[data-leaderboard-single-win]') as HTMLElement;
    // Three positive-netChange rounds total: carol +1000, alice +100, alice +50.
    const rows = within(table).getAllByRole('row');
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText('carol')).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/^\+1,?000$/)).toBeInTheDocument();
  });

  it('switches to Longest win streak tab', async () => {
    await seedFixture();
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('tab', { name: /longest win streak/i }));
    await waitFor(() => {
      expect(container.querySelector('[data-leaderboard-streak]')).toBeInTheDocument();
    });
    const table = container.querySelector('[data-leaderboard-streak]') as HTMLElement;
    // alice: 2-streak (BJ → Slots); carol: 1-streak; bob: 0 (omitted)
    expect(within(table).getByText('alice')).toBeInTheDocument();
    expect(within(table).getByText('carol')).toBeInTheDocument();
    expect(within(table).queryByText('bob')).toBeNull();
  });

  it('renders empty-state on Longest win streak when no positive-netChange rounds', async () => {
    // Seed only losses → no streaks at all.
    const u = await register({ username: 'unlucky', password: 'password123' });
    if (!u.ok) throw new Error('register failed');
    await db.rounds.add({
      id: 'l-1',
      userId: u.user.id,
      game: 'roulette',
      betAmount: 100,
      payout: 0,
      netChange: -100,
      outcome: 'loss',
      details: {},
      balanceAfter: 900,
      playedAt: 1000,
    });
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('tab', { name: /longest win streak/i }));
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /longest win streak/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
    expect(container.querySelector('[data-leaderboard-empty]')).toBeInTheDocument();
    expect(container.querySelector('[data-leaderboard-streak]')).toBeNull();
  });

  it('uses MASQUER brand tokens on the page chrome', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-admin-leaderboard]')).not.toBeNull());
    const heading = screen.getByRole('heading', { name: /leaderboard/i });
    expect(heading.className).toContain('font-display');
    expect(heading.className).toContain('text-gold-bright');
  });

  // PR D follow-up — DateRangeFilter wired into AdminLeaderboardPage.
  it('renders the date-range filter strip', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('[data-admin-leaderboard]')).not.toBeNull());
    expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    // All four preset tabs present, default `'all'` selected.
    const all = container.querySelector('[data-range="all"]') as HTMLButtonElement;
    expect(all.getAttribute('aria-selected')).toBe('true');
  });

  it('threads sinceMs into the aggregators — switching to 7d empties the seeded fixture (epoch playedAt)', async () => {
    await seedFixture();
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    // Default range = 'all' → carol/alice/bob all visible on Top winners.
    await waitFor(() => {
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument();
    });
    expect(
      within(container.querySelector('[data-leaderboard-winners]') as HTMLElement).getByText(
        'carol',
      ),
    ).toBeInTheDocument();

    // Switch to 7d → fixture playedAt values are tiny epoch ms (1000–4000),
    // far below `Date.now() - 7 days` so every aggregator returns 0 rows.
    const sevenDay = container.querySelector('[data-range="7d"]') as HTMLButtonElement;
    await user.click(sevenDay);

    await waitFor(() => {
      expect(container.querySelector('[data-leaderboard-empty]')).toBeInTheDocument();
      expect(container.querySelector('[data-leaderboard-winners]')).toBeNull();
    });
  });

  it('persists the active range per tab via localStorage', async () => {
    await seedFixture();
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AdminLeaderboardPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-leaderboard-winners]')).toBeInTheDocument(),
    );
    const thirty = container.querySelector('[data-range="30d"]') as HTMLButtonElement;
    await user.click(thirty);
    await waitFor(() => {
      expect(localStorage.getItem('admin.leaderboard.winners.range')).toBe('30d');
    });
    // Switching tabs uses a new storage key — old one stays as it was.
    await user.click(screen.getByRole('tab', { name: /top by volume/i }));
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /top by volume/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
    expect(localStorage.getItem('admin.leaderboard.winners.range')).toBe('30d');
  });
});
