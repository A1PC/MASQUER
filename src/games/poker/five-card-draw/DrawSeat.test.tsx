import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrawSeat from './DrawSeat';
import type { DrawSeatState } from './machine';

function makeSeat(overrides: Partial<DrawSeatState> = {}): DrawSeatState {
  return {
    seatId: 0,
    occupant: 'you',
    stack: 500,
    holeCards: [],
    committedThisStreet: 0,
    committedThisHand: 0,
    discardCount: -1,
    hasDrawn: false,
    status: 'active',
    ...overrides,
  };
}

const fiveCards: DrawSeatState['holeCards'] = [
  { rank: 14, suit: 'h' },
  { rank: 9, suit: 'd' },
  { rank: 7, suit: 'c' },
  { rank: 4, suit: 's' },
  { rank: 2, suit: 'h' },
];

describe('DrawSeat', () => {
  it('renders YOUR name and stack', () => {
    render(
      <DrawSeat
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
      <DrawSeat
        seat={makeSeat({ seatId: 1, occupant: { archetype: 'shark', name: 'Sharky' } })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('Sharky')).toBeInTheDocument();
    expect(screen.getByText('SHARK')).toBeInTheDocument();
  });

  it('shows 5 card placeholders when holeCards is empty', () => {
    const { container } = render(
      <DrawSeat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    // 5 playing card elements shown as backs/null
    const cards = container.querySelectorAll('[data-playing-card]');
    expect(cards).toHaveLength(5);
  });

  it('shows 5 face-down cards for AI when not showdown', () => {
    const { container } = render(
      <DrawSeat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Rocky' },
          holeCards: fiveCards,
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs).toHaveLength(5);
  });

  it('shows 5 face-up cards for player seat', () => {
    const { container } = render(
      <DrawSeat
        seat={makeSeat({ holeCards: fiveCards })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs).toHaveLength(0);
    // Check that ace of hearts is visible
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
  });

  it('shows drewLabel when provided', () => {
    render(
      <DrawSeat
        seat={makeSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        drewLabel="drew 2"
      />,
    );
    expect(screen.getByText('drew 2')).toBeInTheDocument();
  });

  it('shows "stood pat" drewLabel', () => {
    render(
      <DrawSeat
        seat={makeSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        drewLabel="stood pat"
      />,
    );
    expect(screen.getByText('stood pat')).toBeInTheDocument();
  });

  it('does not show drewLabel when not provided', () => {
    const { container } = render(
      <DrawSeat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    expect(container.querySelector('[data-drew-label]')).toBeNull();
  });

  it('applies data-acting when isActing=true', () => {
    const { container } = render(
      <DrawSeat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.hasAttribute('data-acting')).toBe(true);
  });

  it('does NOT apply data-acting when isActing=false', () => {
    const { container } = render(
      <DrawSeat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.hasAttribute('data-acting')).toBe(false);
  });

  it('shows FOLDED badge when status=folded', () => {
    render(
      <DrawSeat
        seat={makeSeat({ status: 'folded' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('FOLDED')).toBeInTheDocument();
  });

  it('shows ALL-IN badge when status=all-in', () => {
    render(
      <DrawSeat
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
    render(<DrawSeat seat={makeSeat()} isButton isSb={false} isBb={false} isActing={false} />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows SB badge', () => {
    render(<DrawSeat seat={makeSeat()} isButton={false} isSb isBb={false} isActing={false} />);
    expect(screen.getByText('SB')).toBeInTheDocument();
  });

  it('shows BB badge', () => {
    render(<DrawSeat seat={makeSeat()} isButton={false} isSb={false} isBb isActing={false} />);
    expect(screen.getByText('BB')).toBeInTheDocument();
  });

  it('shows face-up cards at showdown (highlightCards=true)', () => {
    const { container } = render(
      <DrawSeat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Rocky' },
          holeCards: fiveCards,
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        highlightCards
      />,
    );
    const backs = container.querySelectorAll('[data-face-down]');
    expect(backs).toHaveLength(0);
  });
});
