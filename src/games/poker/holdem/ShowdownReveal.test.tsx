import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ShowdownReveal, { STAGGER_MS, WINNER_GLOW_MS } from './ShowdownReveal';
import type { HandResult, SeatState } from './machine';

// Track played sounds across renders for assertion.
const playMock = vi.fn();
vi.mock('@/systems/sound/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

// Default to NOT reduced motion; individual tests can override.
let reduceMotionFlag = false;
vi.mock('@/motion/useEffectiveReducedMotion', () => ({
  useEffectiveReducedMotion: () => reduceMotionFlag,
}));

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

const SEATS: SeatState[] = [makeSeat(0, 'YOU'), makeSeat(1, 'Bauta')];

beforeEach(() => {
  playMock.mockClear();
  reduceMotionFlag = false;
});

describe('ShowdownReveal — chrome + winner banner', () => {
  it('renders winner banner with the winning seat name', () => {
    vi.useFakeTimers();
    reduceMotionFlag = true;
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
          handRank: { category: 'pair', categoryValue: 1, tiebreakers: [14], best5: [] },
        },
      ],
    };
    render(<ShowdownReveal handResult={result} seats={SEATS} winTier="small" />);
    expect(screen.getByText(/YOU WINS!/)).toBeInTheDocument();
    // Reduced-motion path flushes reveal in a 0ms microtask. Advance to fire.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText('Pair')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows SPLIT POT when multiple winners', () => {
    reduceMotionFlag = true;
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
    render(<ShowdownReveal handResult={result} seats={SEATS} winTier="small" />);
    expect(screen.getByText('SPLIT POT!')).toBeInTheDocument();
  });

  it('shows awarded amount for the winner', () => {
    reduceMotionFlag = true;
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
    render(<ShowdownReveal handResult={result} seats={SEATS} winTier="medium" />);
    expect(screen.getByText(/\+750/)).toBeInTheDocument();
  });
});

describe('ShowdownReveal — stagger orchestration (motion path)', () => {
  it('reveals each seat in turn at STAGGER_MS intervals and fires onRevealComplete', () => {
    vi.useFakeTimers();
    const onRevealComplete = vi.fn();
    const result: HandResult = {
      winners: [{ seatId: 1, awarded: 200 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [
            { rank: 14, suit: 's' },
            { rank: 13, suit: 's' },
          ],
        },
        {
          seatId: 1,
          holeCards: [
            { rank: 10, suit: 'h' },
            { rank: 10, suit: 'c' },
          ],
        },
      ],
    };
    const { container } = render(
      <ShowdownReveal
        handResult={result}
        seats={SEATS}
        winTier="loss"
        onRevealComplete={onRevealComplete}
      />,
    );

    // At t=0: no seats revealed (all face-down). 2 seats x 2 cards = 4
    expect(container.querySelectorAll('[data-face-down]').length).toBe(4);

    // At t = STAGGER_MS - 1: seat 0's t=0 reveal has fired but seat 1's
    // t=STAGGER_MS reveal hasn't yet — 2 face-down cards remain (seat 1's).
    act(() => {
      vi.advanceTimersByTime(STAGGER_MS - 1);
    });
    expect(container.querySelectorAll('[data-face-down]').length).toBe(2);
    expect(playMock).toHaveBeenCalledWith('card.deal');

    // After the second stagger tick: seat 1 reveals too.
    act(() => {
      vi.advanceTimersByTime(STAGGER_MS);
    });
    expect(container.querySelectorAll('[data-face-down]').length).toBe(0);

    // Advance 1ms past the totalStagger boundary to fire the glow timer
    // (scheduled at totalStagger = N * STAGGER_MS).
    act(() => {
      vi.advanceTimersByTime(1);
    });
    const winnerSeat = container.querySelector('[data-showdown-winner="true"]');
    expect(winnerSeat).not.toBeNull();
    expect(winnerSeat!.className).toContain('ring-2');

    // win.tier sound (or 'loss' for loss tier)
    expect(playMock).toHaveBeenCalledWith('loss');

    // onRevealComplete fires after WINNER_GLOW_MS
    expect(onRevealComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(WINNER_GLOW_MS);
    });
    expect(onRevealComplete).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('fires win.medium when winTier=medium', () => {
    vi.useFakeTimers();
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 500 }],
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
    render(<ShowdownReveal handResult={result} seats={SEATS} winTier="medium" />);
    act(() => {
      vi.advanceTimersByTime(STAGGER_MS + 1);
    });
    expect(playMock).toHaveBeenCalledWith('win.medium');
    vi.useRealTimers();
  });

  it('fires win.jackpot when winTier=jackpot', () => {
    vi.useFakeTimers();
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 5_000 }],
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
    render(<ShowdownReveal handResult={result} seats={SEATS} winTier="jackpot" />);
    act(() => {
      vi.advanceTimersByTime(STAGGER_MS + 1);
    });
    expect(playMock).toHaveBeenCalledWith('win.jackpot');
    vi.useRealTimers();
  });
});

describe('ShowdownReveal — reduced motion', () => {
  it('reveals all seats in a single batch and fires onRevealComplete', () => {
    vi.useFakeTimers();
    reduceMotionFlag = true;
    const onRevealComplete = vi.fn();
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
        },
        {
          seatId: 1,
          holeCards: [
            { rank: 10, suit: 'h' },
            { rank: 10, suit: 'c' },
          ],
        },
      ],
    };
    const { container } = render(
      <ShowdownReveal
        handResult={result}
        seats={SEATS}
        winTier="small"
        onRevealComplete={onRevealComplete}
      />,
    );

    // Reduced-motion path schedules its batched update in a 0ms microtask.
    // Before flushing, all cards are still face-down.
    expect(container.querySelectorAll('[data-face-down]').length).toBe(4);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    // After flush: all revealed; single batched win.small sound; no per-card
    // card.deal flood; onRevealComplete fires.
    expect(container.querySelectorAll('[data-face-down]').length).toBe(0);
    expect(playMock).toHaveBeenCalledWith('win.small');
    expect(playMock).not.toHaveBeenCalledWith('card.deal');
    expect(onRevealComplete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe('ShowdownReveal — winning hand highlighting (reduced-motion path)', () => {
  it('highlights best-5 cards on the winning seat', () => {
    vi.useFakeTimers();
    reduceMotionFlag = true;
    const winCard = { rank: 14 as const, suit: 's' as const };
    const otherCard = { rank: 2 as const, suit: 'c' as const };
    const result: HandResult = {
      winners: [{ seatId: 0, awarded: 200 }],
      sidePots: [],
      revealedHands: [
        {
          seatId: 0,
          holeCards: [winCard, otherCard],
          handRank: { category: 'pair', categoryValue: 1, tiebreakers: [14], best5: [winCard] },
        },
      ],
    };
    const { container } = render(
      <ShowdownReveal handResult={result} seats={SEATS} winTier="small" />,
    );
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const highlighted = container.querySelectorAll('[data-highlight]');
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });
});
