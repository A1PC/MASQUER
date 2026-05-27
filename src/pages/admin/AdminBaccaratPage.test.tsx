import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AdminBaccaratPage from './AdminBaccaratPage';
import { resetDb } from '@/test/db-helpers';
import { db } from '@/db';
import type { HandTotal, Winner } from '@/games/baccarat/types';

/** Mirrors the FLATTENED shape baccarat actually writes to rounds.details
 *  (see BaccaratPage.persistRound). The in-memory `RoundResult` from
 *  baccarat/types.ts uses nested `player.total` / `banker.total`, but the
 *  persisted shape spreads them. AdminBaccaratPage + stats.ts both read
 *  the flat shape; this test seeds the flat shape too. */
interface PersistedBaccaratDetails {
  readonly winner: Winner;
  readonly margin: number;
  readonly playerTotal: HandTotal;
  readonly bankerTotal: HandTotal;
  readonly playerPair: boolean;
  readonly bankerPair: boolean;
  readonly winnerNatural: boolean;
  readonly bothNatural: boolean;
  readonly totalCards: number;
}

function baccaratDetails(opts: {
  winner: Winner;
  playerTotal: HandTotal;
  bankerTotal: HandTotal;
  playerCards: number;
  bankerCards: number;
  margin: number;
  winnerNatural: boolean;
  bothNatural: boolean;
  playerPair: boolean;
  bankerPair: boolean;
}): PersistedBaccaratDetails {
  return {
    winner: opts.winner,
    margin: opts.margin,
    playerTotal: opts.playerTotal,
    bankerTotal: opts.bankerTotal,
    winnerNatural: opts.winnerNatural,
    bothNatural: opts.bothNatural,
    playerPair: opts.playerPair,
    bankerPair: opts.bankerPair,
    totalCards: opts.playerCards + opts.bankerCards,
  };
}

async function seedRow(opts: {
  id: string;
  details: PersistedBaccaratDetails;
  betAmount: number;
  payoutChips: number;
  playedAt: number;
}): Promise<void> {
  const netChange = opts.payoutChips - opts.betAmount;
  const outcome: 'win' | 'loss' | 'push' = netChange > 0 ? 'win' : netChange < 0 ? 'loss' : 'push';
  await db.rounds.add({
    id: opts.id,
    userId: 'u-1',
    game: 'baccarat',
    betAmount: opts.betAmount,
    payout: opts.payoutChips,
    netChange,
    outcome,
    details: opts.details,
    balanceAfter: 1000,
    playedAt: opts.playedAt,
  });
}

describe('AdminBaccaratPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('admin.baccarat.range');
  });

  it('renders the four top stat-card labels even when there is no data', async () => {
    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText(/rounds played \(all-time\)/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/house net chips/i)).toBeInTheDocument();
    expect(screen.getByText(/actual rtp/i)).toBeInTheDocument();
    expect(screen.getByText(/naturals %/i)).toBeInTheDocument();
    expect(screen.getByText(/no baccarat rounds recorded yet/i)).toBeInTheDocument();
  });

  it('renders roundsPlayed count after rows are added', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 6,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: true,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 100,
      payoutChips: 200,
      playedAt: 1_000,
    });
    await seedRow({
      id: 'b-2',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 4,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 3,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 100,
      payoutChips: 0,
      playedAt: 2_000,
    });

    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );

    const card = await waitFor(() => {
      const label = screen.getByText(/rounds played \(all-time\)/i);
      const c = label.closest('[data-tone]');
      expect(c).not.toBeNull();
      const valueNode = within(c as HTMLElement).getByText('2');
      expect(valueNode).toBeInTheDocument();
      return c as HTMLElement;
    });
    expect(card).toBeInTheDocument();
  });

  it('renders the actual RTP card derived from totalPaid / totalWagered', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 6,
        bankerTotal: 4,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 100,
      payoutChips: 95,
      playedAt: 1_000,
    });
    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/actual rtp/i)).toBeInTheDocument());
    // 95 / 100 = 95.0%
    expect(await screen.findByText(/95\.0%/)).toBeInTheDocument();
  });

  it('renders the house-net card with positive tone when house is ahead', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 3,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 4,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 100,
      payoutChips: 0,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="positive"]')).toBeInTheDocument();
    });
    const positive = container.querySelector('[data-tone="positive"]') as HTMLElement;
    expect(positive.textContent).toContain('+100');
    expect(positive.textContent?.toLowerCase()).toContain('house ahead');
  });

  it('renders the house-net card with negative tone when house is behind', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'tie',
        playerTotal: 8,
        bankerTotal: 8,
        playerCards: 2,
        bankerCards: 2,
        margin: 0,
        winnerNatural: true,
        bothNatural: true,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 90,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
    });
    const negative = container.querySelector('[data-tone="negative"]') as HTMLElement;
    expect(negative.textContent).toContain('-80');
    expect(negative.textContent?.toLowerCase()).toContain('house behind');
  });

  it('renders the naturals percentage from naturalWins / roundsPlayed', async () => {
    // 1 natural + 1 non-natural → 50.0%
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 8,
        bankerTotal: 6,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: true,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 1,
    });
    await seedRow({
      id: 'b-2',
      details: baccaratDetails({
        winner: 'banker',
        playerTotal: 4,
        bankerTotal: 7,
        playerCards: 2,
        bankerCards: 2,
        margin: 3,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 0,
      playedAt: 2,
    });
    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const label = screen.getByText(/naturals %/i);
      const card = label.closest('[data-tone]');
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText(/50\.0%/)).toBeInTheDocument();
    });
  });

  it('renders the side-bet hit rates panel with all four mini-bars', async () => {
    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/side-bet hit rates/i)).toBeInTheDocument());
    expect(screen.getByText(/pairs \(player \+ banker\)/i)).toBeInTheDocument();
    expect(screen.getByText(/big \(5–6 cards\)/i)).toBeInTheDocument();
    expect(screen.getByText(/small \(4 cards\)/i)).toBeInTheDocument();
    expect(screen.getByText(/dragons \(player \+ banker\)/i)).toBeInTheDocument();
  });

  it('renders the longest streaks panel with all three streak cells', async () => {
    render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/longest streaks/i)).toBeInTheDocument());
    // Use [data-streak] selectors to disambiguate from winner badges in the
    // recent-rounds table.
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-streak="Player"]')).toBeInTheDocument();
    expect(container.querySelector('[data-streak="Banker"]')).toBeInTheDocument();
    expect(container.querySelector('[data-streak="Tie"]')).toBeInTheDocument();
  });

  it('renders the recent rounds table when rounds exist with winner badge + side-bet badges', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 7,
        bankerTotal: 3,
        playerCards: 2,
        bankerCards: 3,
        margin: 4,
        winnerNatural: false, // dragon
        bothNatural: false,
        playerPair: true,
        bankerPair: false,
      }),
      betAmount: 50,
      payoutChips: 100,
      playedAt: 1_000,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/recent rounds \(last 20\)/i)).toBeInTheDocument());
    // Winner badge — disambiguated by data-winner since "Player" also
    // appears in the streaks panel as a label.
    const winnerBadge = await waitFor(() => {
      const el = container.querySelector('[data-winner="player"]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(winnerBadge.textContent?.toLowerCase()).toContain('player');
    // Totals cell — P 7 / B 3.
    expect(await screen.findByText(/P 7 \/ B 3/i)).toBeInTheDocument();
    // Side-bet badges — player pair, big, dragon.
    expect(container.querySelector('[data-side-bet="player-pair"]')).toBeInTheDocument();
    expect(container.querySelector('[data-side-bet="big"]')).toBeInTheDocument();
    expect(container.querySelector('[data-side-bet="dragon"]')).toBeInTheDocument();
    expect(container.querySelector('[data-side-bet="small"]')).toBeNull();
  });

  it('renders the winner-distribution chart wrapper once data exists', async () => {
    await seedRow({
      id: 'b-1',
      details: baccaratDetails({
        winner: 'player',
        playerTotal: 6,
        bankerTotal: 4,
        playerCards: 2,
        bankerCards: 2,
        margin: 2,
        winnerNatural: false,
        bothNatural: false,
        playerPair: false,
        bankerPair: false,
      }),
      betAmount: 10,
      payoutChips: 20,
      playedAt: 1,
    });
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
  });

  // Phase 15 #14 PR B — shared DateRangeFilter integration.
  it('renders the shared <DateRangeFilter> with the four preset tabs', async () => {
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    });
    expect(container.querySelector('[data-range="7d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="30d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="90d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="all"]')).not.toBeNull();
  });

  it('marks the clicked preset tab as aria-selected', async () => {
    localStorage.removeItem('admin.baccarat.range');
    const { container } = render(
      <MemoryRouter>
        <AdminBaccaratPage />
      </MemoryRouter>,
    );
    const btn = await waitFor(() => {
      const b = container.querySelector('[data-range="7d"]');
      expect(b).not.toBeNull();
      return b as HTMLButtonElement;
    });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn.getAttribute('aria-selected')).toBe('true');
    });
    expect(localStorage.getItem('admin.baccarat.range')).toBe('7d');
  });
});
