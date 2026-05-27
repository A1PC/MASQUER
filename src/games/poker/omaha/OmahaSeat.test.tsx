import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OmahaSeat from './OmahaSeat';
import type { OmahaSeatState } from './machine';
import type { Card } from '../_shared/types';

const FOUR_CARDS: Card[] = [
  { rank: 14, suit: 's' },
  { rank: 13, suit: 'h' },
  { rank: 12, suit: 'd' },
  { rank: 11, suit: 'c' },
];

function makeAiSeat(overrides: Partial<OmahaSeatState> = {}): OmahaSeatState {
  return {
    seatId: 1,
    occupant: { archetype: 'rock', name: 'Bauta' },
    stack: 3_200,
    holeCards: FOUR_CARDS,
    committedThisStreet: 0,
    committedThisHand: 0,
    status: 'active',
    ...overrides,
  };
}

function makePlayerSeat(overrides: Partial<OmahaSeatState> = {}): OmahaSeatState {
  return {
    seatId: 0,
    occupant: 'you',
    stack: 4_000,
    holeCards: FOUR_CARDS,
    committedThisStreet: 0,
    committedThisHand: 0,
    status: 'active',
    ...overrides,
  };
}

describe('OmahaSeat', () => {
  it('renders data-seat attribute for player seat', () => {
    render(
      <OmahaSeat
        seat={makePlayerSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        position="bottom"
      />,
    );
    const container = document.querySelector('[data-seat="0"]');
    expect(container).toBeInTheDocument();
  });

  it('renders data-seat attribute for AI seat', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    expect(document.querySelector('[data-seat="1"]')).toBeInTheDocument();
  });

  it('renders 4 PlayingCard elements when 4 hole cards are provided', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    const cards = document.querySelectorAll('[data-playing-card]');
    expect(cards.length).toBe(4);
  });

  it('renders 4 placeholder PlayingCard elements when no cards dealt', () => {
    const seat = makeAiSeat({ holeCards: [] });
    render(<OmahaSeat seat={seat} isButton={false} isSb={false} isBb={false} isActing={false} />);
    // 4 null PlayingCard slots render as card backs (data-playing-card)
    const cards = document.querySelectorAll('[data-playing-card]');
    expect(cards.length).toBe(4);
  });

  it('AI cards are face-down (data-face-down present)', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    const faceDown = document.querySelectorAll('[data-face-down]');
    expect(faceDown.length).toBe(4);
  });

  it('player cards are face-up (no data-face-down)', () => {
    render(
      <OmahaSeat
        seat={makePlayerSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        position="bottom"
      />,
    );
    const faceDown = document.querySelectorAll('[data-face-down]');
    expect(faceDown.length).toBe(0);
  });

  it('renders AI mask name (NOT archetype label)', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat({ occupant: { archetype: 'rock', name: 'Bauta' } })}
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
    expect(screen.queryByText('SHARK')).toBeNull();
    expect(screen.queryByText('MANIAC')).toBeNull();
    expect(screen.queryByText('STATION')).toBeNull();
  });

  it('renders a MaskAvatar for AI seats', () => {
    const { container } = render(
      <OmahaSeat
        seat={makeAiSeat({ occupant: { archetype: 'shark', name: 'Colombina' } })}
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
      <OmahaSeat
        seat={makePlayerSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        position="bottom"
      />,
    );
    expect(container.querySelector('[data-mask-avatar]')).toBeNull();
  });

  it('MaskAvatar gets active glow when seat isActing', () => {
    const { container } = render(
      <OmahaSeat
        seat={makeAiSeat({ occupant: { archetype: 'shark', name: 'Pierrot' } })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing
      />,
    );
    const avatar = container.querySelector('[data-mask-avatar]') as HTMLElement;
    expect(avatar.className).toContain('ring-2');
  });

  it('uses brand tokens (brass / velvet / ivory) on the container', () => {
    const { container } = render(
      <OmahaSeat
        seat={makePlayerSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        position="bottom"
      />,
    );
    const el = container.querySelector('[data-seat="0"]') as HTMLElement;
    expect(el.className).toContain('border-brass');
    expect(el.className).toContain('bg-velvet-deep');
  });

  it('shows stack formatted with thousands separator', () => {
    const seat = makeAiSeat({ stack: 3_200 });
    render(<OmahaSeat seat={seat} isButton={false} isSb={false} isBb={false} isActing={false} />);
    const stackEl = document.querySelector('[data-seat-stack]');
    expect(stackEl?.textContent).toBe('3,200');
  });

  it('shows dealer badge when isButton', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={true} isSb={false} isBb={false} isActing={false} />,
    );
    expect(document.querySelector('[data-button-badge]')).toBeInTheDocument();
  });

  it('shows SB badge when isSb', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={true} isBb={false} isActing={false} />,
    );
    expect(document.querySelector('[data-sb-badge]')).toBeInTheDocument();
  });

  it('shows BB badge when isBb', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={true} isActing={false} />,
    );
    expect(document.querySelector('[data-bb-badge]')).toBeInTheDocument();
  });

  it('applies data-acting attribute when isActing', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={true} />,
    );
    expect(document.querySelector('[data-acting]')).toBeInTheDocument();
  });

  it('does NOT apply data-acting when not acting', () => {
    render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    expect(document.querySelector('[data-acting]')).not.toBeInTheDocument();
  });

  it('shows ALL-IN badge when status is all-in', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat({ status: 'all-in' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(document.querySelector('[data-allin-badge]')).toBeInTheDocument();
  });

  it('shows FOLDED badge when status is folded', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat({ status: 'folded' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(document.querySelector('[data-folded-badge]')).toBeInTheDocument();
  });

  it('shows BUSTED badge when status is busted', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat({ status: 'busted' })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(document.querySelector('[data-busted-badge]')).toBeInTheDocument();
  });

  it('shows YOU as the player name', () => {
    render(
      <OmahaSeat
        seat={makePlayerSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        position="bottom"
      />,
    );
    const nameEl = document.querySelector('[data-seat-name]');
    expect(nameEl?.textContent).toBe('YOU');
  });

  it('highlightCards=true shows face-up cards for AI seat', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        highlightCards={true}
      />,
    );
    // When highlightCards=true, showFaceUp=true → no face-down cards
    const faceDown = document.querySelectorAll('[data-face-down]');
    expect(faceDown.length).toBe(0);
  });

  it('revealHoleCards=true shows AI cards face-up without highlight', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat()}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
        revealHoleCards
      />,
    );
    const faceDown = document.querySelectorAll('[data-face-down]');
    expect(faceDown.length).toBe(0);
  });

  it('does not leak hand-category badge during play (no handRank prop)', () => {
    const { container } = render(
      <OmahaSeat seat={makeAiSeat()} isButton={false} isSb={false} isBb={false} isActing={false} />,
    );
    expect(container.querySelector('[data-seat-hand-category]')).toBeNull();
  });

  it('revealHoleCards + handRank renders the hand-category badge', () => {
    const { container } = render(
      <OmahaSeat
        seat={makeAiSeat()}
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
