import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShowdownReveal from './ShowdownReveal';
import type { HandResult, SeatState } from './machine';

function makeSeat(seatId: number, name: string): SeatState {
  return {
    seatId,
    occupant: seatId === 0 ? 'you' : { archetype: 'rock', name },
    stack: 500,
    holeCards: [],
    committedThisStreet: 0,
    committedThisHand: 0,
    status: 'active',
  };
}

const SEATS: SeatState[] = [makeSeat(0, 'YOU'), makeSeat(1, 'Rocky')];

describe('ShowdownReveal', () => {
  it('renders winner category text', () => {
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 200 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [
            { rank: 14, suit: 's' },
            { rank: 13, suit: 's' },
          ],
          handRank: {
            category: 'pair',
            categoryValue: 1,
            tiebreakers: [14],
            best5: [],
          },
        },
      ],
    };
    render(<ShowdownReveal handResult={result} seats={SEATS} />);
    expect(screen.getByText(/WINS!/)).toBeInTheDocument();
    expect(screen.getByText('Pair')).toBeInTheDocument();
  });

  it('highlights best-5 cards for the winner', () => {
    const winCard = { rank: 14 as const, suit: 's' as const };
    const otherCard = { rank: 2 as const, suit: 'c' as const };
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 200 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [winCard, otherCard],
          handRank: {
            category: 'pair',
            categoryValue: 1,
            tiebreakers: [14],
            best5: [winCard],
          },
        },
      ],
    };
    const { container } = render(<ShowdownReveal handResult={result} seats={SEATS} />);
    // winCard should be highlighted
    const highlighted = container.querySelectorAll('[data-highlight]');
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
  });

  it('shows SPLIT POT when multiple winners', () => {
    const result: HandResult = {
      winners: [
        { seatId: 0, awarded: 100 },
        { seatId: 1, awarded: 100 },
      ],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [
            { rank: 7, suit: 's' },
            { rank: 7, suit: 'h' },
          ],
        },
        {
          seatId: 1,
          holeCards: [
            { rank: 7, suit: 'd' },
            { rank: 7, suit: 'c' },
          ],
        },
      ],
    };
    render(<ShowdownReveal handResult={result} seats={SEATS} />);
    expect(screen.getByText('SPLIT POT!')).toBeInTheDocument();
  });

  it('renders revealed AI hole cards face-up', () => {
    const result: HandResult = {
      winners: [{ seatId: 1, awarded: 300 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 1,
          holeCards: [
            { rank: 10, suit: 's' },
            { rank: 10, suit: 'h' },
          ],
          handRank: {
            category: 'pair',
            categoryValue: 1,
            tiebreakers: [10],
            best5: [],
          },
        },
      ],
    };
    const { container } = render(<ShowdownReveal handResult={result} seats={SEATS} />);
    // face-down backs should NOT appear for revealed hands
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs.length).toBe(0);
  });

  it('shows awarded amount for winner', () => {
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 750 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [
            { rank: 14, suit: 's' },
            { rank: 14, suit: 'h' },
          ],
        },
      ],
    };
    render(<ShowdownReveal handResult={result} seats={SEATS} />);
    expect(screen.getByText(/\+750/)).toBeInTheDocument();
  });
});
