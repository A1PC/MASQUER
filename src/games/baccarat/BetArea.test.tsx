import type { ReactNode } from 'react';
import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetArea from './BetArea';
import { EMPTY_BETS } from './types';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

function render_(node: ReactNode) {
  return render(<>{node}</>);
}

describe('BetArea', () => {
  it('renders all 7 single zones + 2 BigSmall halves = 9 clickable areas', () => {
    render_(<BetArea bets={EMPTY_BETS} onAddChip={() => {}} onClearZone={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('shows zone labels per spec §8', () => {
    render_(<BetArea bets={EMPTY_BETS} onAddChip={() => {}} onClearZone={() => {}} />);
    for (const label of [
      'P PAIR',
      'BIG',
      'SMALL',
      'B PAIR',
      'PLAYER',
      'TIE',
      'BANKER',
      'P DRAGON',
      'B DRAGON',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('clicking PLAYER calls onAddChip with "player"', async () => {
    const onAddChip = vi.fn();
    const user = userEvent.setup();
    render_(<BetArea bets={EMPTY_BETS} onAddChip={onAddChip} onClearZone={() => {}} />);
    await user.click(screen.getByText('PLAYER').closest('button')!);
    expect(onAddChip).toHaveBeenCalledWith('player');
  });

  it('shows chip overlay on a zone when bets[zone] > 0', () => {
    render_(
      <BetArea bets={{ ...EMPTY_BETS, banker: 75 }} onAddChip={() => {}} onClearZone={() => {}} />,
    );
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});
