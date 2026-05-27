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

  it('renders AI mask name (NOT archetype label)', () => {
    render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Bauta' },
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('Bauta')).toBeInTheDocument();
    // Archetype label must NOT be visible.
    expect(screen.queryByText('ROCK')).toBeNull();
    expect(screen.queryByText('Rock')).toBeNull();
  });

  it('renders a MaskAvatar for AI seats', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'shark', name: 'Colombina' },
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(container.querySelector('[data-mask-avatar]')).toBeInTheDocument();
    const avatar = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(avatar.getAttribute('data-mask-name')).toBe('Colombina');
  });

  it('does NOT render a MaskAvatar for the player seat', () => {
    const { container } = render(
      <Seat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    expect(container.querySelector('[data-mask-avatar]')).toBeNull();
  });

  it('shows face-down cards for AI', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'maniac', name: 'Volto' },
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

  it('MaskAvatar gets active glow when seat isActing', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'shark', name: 'Pierrot' },
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing
      />,
    );
    const avatar = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(avatar.className).toContain('ring-2');
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

  it('uses brand tokens (brass / velvet / ivory) on the container', () => {
    const { container } = render(
      <Seat seat={makeSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.className).toContain('border-brass');
    expect(el.className).toContain('bg-velvet-deep');
  });

  it('does not leak hand-category badge during play (no handRank prop)', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Bauta' },
          holeCards: [
            { rank: 14, suit: 'h' },
            { rank: 13, suit: 's' },
          ],
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(container.querySelector('[data-seat-hand-category]')).toBeNull();
  });

  it('revealHoleCards + handRank renders the hand-category badge', () => {
    const { container } = render(
      <Seat
        seat={makeSeat({
          seatId: 1,
          occupant: { archetype: 'rock', name: 'Bauta' },
          holeCards: [
            { rank: 14, suit: 'h' },
            { rank: 13, suit: 's' },
          ],
        })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        revealHoleCards
        handRank={{
          category: 'pair',
          categoryValue: 1,
          tiebreakers: [14, 13, 12, 11, 10],
          best5: [],
        }}
      />,
    );
    const badge = container.querySelector('[data-seat-hand-category="pair"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Pair');
  });
});
