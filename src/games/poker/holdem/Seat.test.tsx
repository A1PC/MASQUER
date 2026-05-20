import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Seat from './Seat';
import type { SeatState } from './machine';

function makeSeat(overrides: Partial<SeatState> = {}): SeatState {
  return {
    seatId: 0,
    occupant: 'you',
    stack: 500,
    holeCards: [],
    committedThisStreet: 0,
    committedThisHand: 0,
    status: 'active',
    ...overrides,
  };
}

describe('Seat', () => {
  it('renders YOUR stack and name', () => {
    render(
      <Seat
        seat={makeSeat({ stack: 800 })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('renders AI name and archetype', () => {
    render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Rocky' },
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('Rocky')).toBeInTheDocument();
    expect(screen.getByText('ROCK')).toBeInTheDocument();
  });

  it('shows face-down cards for AI (non-highlighted)', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'maniac', name: 'Mo' },
          holeCards: [
            { rank: 14, suit: 's' },
            { rank: 13, suit: 'h' },
          ],
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs.length).toBe(2);
  });

  it('shows face-up cards for the player seat', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 0,
          occupant: 'you',
          holeCards: [
            { rank: 14, suit: 's' },
            { rank: 13, suit: 'h' },
          ],
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs.length).toBe(0);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
  });

  it('applies data-acting attribute when isActing=true', () => {
    const { container } = render(
      <Seat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.hasAttribute('data-acting')).toBe(true);
  });

  it('does NOT apply data-acting when not acting', () => {
    const { container } = render(
      <Seat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.hasAttribute('data-acting')).toBe(false);
  });

  it('shows FOLDED badge when status=folded', () => {
    render(
      <Seat
        seat={makeSeat({ status: 'folded' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByTestId !== undefined);
    expect(screen.getByText('FOLDED')).toBeInTheDocument();
  });

  it('shows ALL-IN badge when status=all-in', () => {
    render(
      <Seat
        seat={makeSeat({ status: 'all-in' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('ALL-IN')).toBeInTheDocument();
  });

  it('shows dealer badge when isButton=true', () => {
    render(<Seat seat={makeSeat()} isButton isSb={false} isBb={false} isActing={false} />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });
});
