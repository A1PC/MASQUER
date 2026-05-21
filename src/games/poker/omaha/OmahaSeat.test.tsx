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
    occupant: { archetype: 'rock', name: 'Rock 1' },
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

  it('shows AI archetype label in uppercase', () => {
    const seat = makeAiSeat();
    render(<OmahaSeat seat={seat} isButton={false} isSb={false} isBb={false} isActing={false} />);
    expect(screen.getByText('ROCK')).toBeInTheDocument();
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

  it('shows AI name', () => {
    render(
      <OmahaSeat
        seat={makeAiSeat({ occupant: { archetype: 'shark', name: 'Shark 2' } })}
        isButton={false}
        isSb={false}
        isBb={false}
        isActing={false}
      />,
    );
    expect(screen.getByText('Shark 2')).toBeInTheDocument();
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
});
