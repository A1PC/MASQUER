import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminCrapsPage from './AdminCrapsPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { CrapsTier } from '@/systems/stats';

/** Mirrors the FLATTENED shape CrapsPage actually writes to rounds.details
 *  (see CrapsPage's `doSettle`). Re-declared here to keep the test
 *  decoupled from any internal types. */
interface PersistedCrapsDetails {
  readonly tier: CrapsTier;
  readonly rollsPlayed: number;
  readonly rebuys: number;
  readonly biggestRollWin: number;
  readonly sessionId: string;
  readonly betTypeWagered?: Record<string, number>;
}

async function seedRow(opts: {
  id: string;
  tier: CrapsTier;
  betAmount: number;
  payoutChips: number;
  rollsPlayed: number;
  biggestRollWin: number;
  playedAt: number;
  rebuys?: number;
  betTypeWagered?: Record<string, number>;
}): Promise<void> {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  const details: PersistedCrapsDetails = {
    tier: opts.tier,
    rollsPlayed: opts.rollsPlayed,
    rebuys: opts.rebuys ?? 0,
    biggestRollWin: opts.biggestRollWin,
    sessionId: `craps-${opts.id}`,
    ...(opts.betTypeWagered !== undefined ? { betTypeWagered: opts.betTypeWagered } : {}),
  };
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'craps',
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminCrapsPage', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    // Scope to the StatCard label class to avoid colliding with the empty-state
    // chart copy which also contains the phrase "sessions played".
    await waitFor(() => expect(screen.getByText(/^sessions played$/i)).toBeInTheDocument());
    expect(screen.getByText(/^total rolls$/i)).toBeInTheDocument();
    expect(screen.getByText(/^house net chips$/i)).toBeInTheDocument();
    expect(screen.getByText(/^actual rtp$/i)).toBeInTheDocument();
  });

  it('renders the bet-type frequency empty-state placeholder with no data', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-craps-bet-type-empty]')).toBeInTheDocument();
    });
    // Recharts wrapper MUST NOT render in the empty-state.
    expect(container.querySelector('.recharts-responsive-container')).toBeNull();
  });

  it('renders the sessions / total-rolls cards summing across all tiers', async () => {
    await seedRow({
      id: 'c-1',
      tier: 'low',
      betAmount: 500,
      payoutChips: 800,
      rollsPlayed: 10,
      biggestRollWin: 200,
      playedAt: 1_000,
      betTypeWagered: { pass: 200, field: 100 },
    });
    await seedRow({
      id: 'c-2',
      tier: 'mid',
      betAmount: 1_000,
      payoutChips: 700,
      rollsPlayed: 14,
      biggestRollWin: 150,
      playedAt: 2_000,
      betTypeWagered: { pass: 400 },
    });
    render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const sessionsLabel = screen.getByText(/^sessions played$/i);
      const card = sessionsLabel.closest('[data-tone]');
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText('2')).toBeInTheDocument();
    });
    const rollsLabel = screen.getByText(/^total rolls$/i);
    const rollsCard = rollsLabel.closest('[data-tone]');
    expect(rollsCard).not.toBeNull();
    expect(within(rollsCard as HTMLElement).getByText('24')).toBeInTheDocument();
  });

  it('renders the house-net card with positive tone when house is ahead', async () => {
    // 500 wagered · 100 paid → house +400.
    await seedRow({
      id: 'c-1',
      tier: 'low',
      betAmount: 500,
      payoutChips: 100,
      rollsPlayed: 5,
      biggestRollWin: 0,
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+400');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the house-net card with negative tone when house is behind', async () => {
    // 500 wagered · 900 paid → house -400.
    await seedRow({
      id: 'c-1',
      tier: 'low',
      betAmount: 500,
      payoutChips: 900,
      rollsPlayed: 5,
      biggestRollWin: 400,
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-400');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('renders the bet-type frequency chart once a session carries betTypeWagered', async () => {
    await seedRow({
      id: 'c-1',
      tier: 'low',
      betAmount: 500,
      payoutChips: 800,
      rollsPlayed: 10,
      biggestRollWin: 300,
      playedAt: 1_000,
      betTypeWagered: { pass: 300, field: 100 },
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
    // Empty-state placeholder must NOT render when the field is present.
    expect(container.querySelector('[data-craps-bet-type-empty]')).toBeNull();
  });

  it('keeps the bet-type empty-state when sessions exist but none carry betTypeWagered', async () => {
    // Pre-PR-A legacy session — no betTypeWagered field.
    await seedRow({
      id: 'c-legacy',
      tier: 'low',
      betAmount: 500,
      payoutChips: 800,
      rollsPlayed: 10,
      biggestRollWin: 300,
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      // Headline stats reflect the row…
      const sessionsLabel = screen.getByText(/^sessions played$/i);
      const card = sessionsLabel.closest('[data-tone]');
      expect(within(card as HTMLElement).getByText('1')).toBeInTheDocument();
    });
    // …but the chart still shows the empty-state placeholder.
    expect(container.querySelector('[data-craps-bet-type-empty]')).toBeInTheDocument();
    expect(container.querySelector('.recharts-responsive-container')).toBeNull();
  });

  it('renders the biggest sessions panel sorted by net desc', async () => {
    await seedRow({
      id: 'c-small',
      tier: 'low',
      betAmount: 500,
      payoutChips: 700,
      rollsPlayed: 5,
      biggestRollWin: 100,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'c-big',
      tier: 'high',
      betAmount: 2_000,
      payoutChips: 3_500,
      rollsPlayed: 8,
      biggestRollWin: 800,
      playedAt: 2_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-biggest-sessions] tbody tr');
      expect(rows.length).toBe(2);
    });
    const rows = container.querySelectorAll('[data-biggest-sessions] tbody tr');
    // +1,500 (high tier) should be the first row.
    expect(rows[0]!.textContent).toContain('1,500');
    expect(rows[0]!.textContent).toContain('High');
    expect(rows[1]!.textContent).toContain('200');
    expect(rows[1]!.textContent).toContain('Low');
  });

  it('orders the recent-sessions table newest first via playedAt desc', async () => {
    // Insert in ascending playedAt order; the page must sort desc.
    await seedRow({
      id: 'c-OLD',
      tier: 'low',
      betAmount: 500,
      payoutChips: 600,
      rollsPlayed: 5,
      biggestRollWin: 100,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'c-NEW',
      tier: 'high',
      betAmount: 2_000,
      payoutChips: 3_500,
      rollsPlayed: 8,
      biggestRollWin: 800,
      playedAt: 9_999_999,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
      expect(rows.length).toBe(2);
    });
    const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
    // Newer row first — High tier in row 0.
    expect(rows[0]!.textContent).toContain('High');
    expect(rows[1]!.textContent).toContain('Low');
  });

  it('caps the recent-sessions table at 20 rows even when many sessions exist', async () => {
    // Seed 25 sessions — table should only render 20.
    for (let i = 0; i < 25; i += 1) {
      await seedRow({
        id: `c-${i}`,
        tier: 'low',
        betAmount: 500,
        payoutChips: 500,
        rollsPlayed: 5,
        biggestRollWin: 0,
        playedAt: 1_000 + i,
      });
    }
    const { container } = render(
      <MemoryRouter>
        <AdminCrapsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const rows = container.querySelectorAll('[data-recent-sessions] tbody tr');
      expect(rows.length).toBe(20);
    });
  });
});
