import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GameGrid from './GameGrid';
import { db } from '@/db';

const ROUTE_LABELS: Array<[string, string]> = [
  ['Coin Flip', '/play/coin-flip'],
  ['Blackjack', '/play/blackjack'],
  ['Roulette', '/play/roulette'],
  ['Slots', '/play/slots'],
  ['Baccarat', '/play/baccarat'],
  ['Plinko', '/play/plinko'],
  ['Craps', '/play/craps'],
];

beforeEach(async () => {
  await db.lotteryTickets.clear();
  await db.lotteryLines.clear();
});

describe('GameGrid', () => {
  it('renders a linked cabinet (with icon) for every routed game', () => {
    render(
      <MemoryRouter>
        <GameGrid userId="u" />
      </MemoryRouter>,
    );
    for (const [label, href] of ROUTE_LABELS) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') });
      expect(link).toHaveAttribute('href', href);
      expect(link.querySelector('svg')).toBeInTheDocument();
    }
  });

  it('renders poker and bingo as buttons (variant modals)', () => {
    render(
      <MemoryRouter>
        <GameGrid userId="u" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /poker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bingo/i })).toBeInTheDocument();
  });

  it('shows the lottery prompt when the user has no tickets today', async () => {
    render(
      <MemoryRouter>
        <GameGrid userId="u" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /lottery.*buy a ticket/i })).toBeInTheDocument(),
    );
  });

  it('shows ticket and line counts on the lottery cabinet when tickets exist', async () => {
    const today = new Date();
    const drawId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await db.lotteryTickets.add({
      id: 'tk-1',
      userId: 'u',
      drawId,
      purchasedAt: Date.now(),
      totalCost: 20,
      lineCount: 2,
    });
    await db.lotteryLines.bulkAdd([
      {
        id: 'ln-1',
        ticketId: 'tk-1',
        userId: 'u',
        drawId,
        mainNumbers: [1, 2, 3, 4, 5],
        bonusNumber: 1,
        isLuckyDip: false,
        isFreeReentry: false,
        settled: false,
        matchTier: null,
        payout: 0,
      },
      {
        id: 'ln-2',
        ticketId: 'tk-1',
        userId: 'u',
        drawId,
        mainNumbers: [6, 7, 8, 9, 10],
        bonusNumber: 2,
        isLuckyDip: false,
        isFreeReentry: false,
        settled: false,
        matchTier: null,
        payout: 0,
      },
    ]);
    render(
      <MemoryRouter>
        <GameGrid userId="u" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /1 ticket.*2 lines/i })).toBeInTheDocument(),
    );
  });
});
