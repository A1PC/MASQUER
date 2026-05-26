import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminSlotsPage from './AdminSlotsPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type {
  PayoutHit,
  SlotsRoundDetails,
  Symbol as SlotsSymbol,
  WinTier,
} from '@/games/slots/types';

function slotsDetails(
  reels: readonly [SlotsSymbol, SlotsSymbol, SlotsSymbol],
  payout: PayoutHit | null,
  bet: number,
  winTier: WinTier,
): SlotsRoundDetails {
  return {
    spin: { reels },
    payout,
    bet,
    winTier,
    config: {
      weights: { cherry: 4, lemon: 5, bell: 3, bar: 2, seven: 1 },
      minBet: 5,
      maxBet: 1_000,
    },
  };
}

async function seedSlotsRow(opts: {
  id: string;
  reels: readonly [SlotsSymbol, SlotsSymbol, SlotsSymbol];
  payout: PayoutHit | null;
  betAmount: number;
  payoutChips: number;
  winTier: WinTier;
  playedAt: number;
}): Promise<void> {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'slots',
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details: slotsDetails(opts.reels, opts.payout, opts.betAmount, opts.winTier),
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminSlotsPage', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/spins run \(all-time\)/i)).toBeInTheDocument());
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/jackpots hit/i)).toBeInTheDocument();
    expect(screen.getByText(/no slots spins recorded yet/i)).toBeInTheDocument();
  });

  it('renders spinsRun count after rows are added', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['cherry', 'lemon', 'bell'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 1_000,
    });
    await seedSlotsRow({
      id: 's-2',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 2_000,
    });

    render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );

    const card = await waitFor(() => {
      const label = screen.getByText(/spins run \(all-time\)/i);
      const c = label.closest('[data-tone]');
      expect(c).not.toBeNull();
      const valueNode = within(c as HTMLElement).getByText('2');
      expect(valueNode).toBeInTheDocument();
      return c as HTMLElement;
    });
    expect(card).toBeInTheDocument();
  });

  it('renders the actual RTP card with target sub-line', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['cherry', 'cherry', 'cherry'],
      payout: { key: 'cherry-cherry-cherry', multiple: 5, winningReelIndices: [0, 1, 2] },
      betAmount: 100,
      payoutChips: 86,
      winTier: 'medium',
      playedAt: 1_000,
    });
    render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/actual rtp/i)).toBeInTheDocument());
    // 86 / 100 = 86.0%
    expect(await screen.findByText(/86\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/target 86%/i)).toBeInTheDocument();
  });

  it('renders the house-net card with negative tone when house is behind', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-490');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('renders the house-net card with positive tone when house is ahead', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['cherry', 'lemon', 'bell'],
      payout: null,
      betAmount: 100,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 1,
    });
    await seedSlotsRow({
      id: 's-2',
      reels: ['bell', 'lemon', 'cherry'],
      payout: null,
      betAmount: 100,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 2,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+200');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the jackpots-hit card from tierCounts.jackpot', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 1,
    });
    await seedSlotsRow({
      id: 's-2',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 2,
    });
    render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const label = screen.getByText(/jackpots hit/i);
      const card = label.closest('[data-tone]');
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText('2')).toBeInTheDocument();
    });
  });

  it('renders the win-tier breakdown panel with all four mini-bars', async () => {
    render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/win-tier breakdown/i)).toBeInTheDocument());
    expect(screen.getByText(/none \(loss\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^small$/i)).toBeInTheDocument();
    expect(screen.getByText(/^medium$/i)).toBeInTheDocument();
    expect(screen.getByText(/^jackpot$/i)).toBeInTheDocument();
  });

  it('renders the recent spins table when rounds exist', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['seven', 'seven', 'seven'],
      payout: { key: 'seven-seven-seven', multiple: 50, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 500,
      winTier: 'jackpot',
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/recent spins \(last 20\)/i)).toBeInTheDocument());
    // The reels label uses '7' for seven — a 3-of-7 row reads as "7 · 7 · 7".
    expect(await screen.findByText(/7 · 7 · 7/)).toBeInTheDocument();
    // Tier badge for the jackpot row — scope via [data-tier] since "Jackpot"
    // also appears as a mini-bar label in the breakdown panel.
    const badge = await waitFor(() => {
      const el = container.querySelector('[data-tier="jackpot"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(badge.textContent?.toLowerCase()).toContain('jackpot');
  });

  it('renders the combination chart wrapper once data exists', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['cherry', 'cherry', 'cherry'],
      payout: { key: 'cherry-cherry-cherry', multiple: 5, winningReelIndices: [0, 1, 2] },
      betAmount: 10,
      payoutChips: 50,
      winTier: 'medium',
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  it('renders the symbol × reel heatmap once data exists', async () => {
    await seedSlotsRow({
      id: 's-1',
      reels: ['cherry', 'lemon', 'bell'],
      payout: null,
      betAmount: 10,
      payoutChips: 0,
      winTier: 'none',
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminSlotsPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        container.querySelector('[data-chart="slots-symbol-reel-heatmap"]'),
      ).toBeInTheDocument();
    });
  });
});
