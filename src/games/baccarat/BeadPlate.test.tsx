import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BeadPlate from './BeadPlate';
import type { BeadCell } from './types';

const cell = (winner: BeadCell['winner'], pp = false, bp = false): BeadCell => ({
  winner,
  playerPair: pp,
  bankerPair: bp,
});

describe('BeadPlate', () => {
  it('renders one bead per cell with the correct color attribute', () => {
    const { container } = render(
      <BeadPlate cells={[cell('player'), cell('banker'), cell('tie')]} />,
    );
    expect(container.querySelectorAll('[data-bead-winner="player"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-bead-winner="banker"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-bead-winner="tie"]')).toHaveLength(1);
  });

  it('marks pair decorations using scoreboard tokens', () => {
    const { container } = render(<BeadPlate cells={[cell('player', true, false)]} />);
    // Player-pair dot uses the scoreboard-player blue token + ivory ring.
    expect(
      container.querySelector('.bg-scoreboard-player.rounded-full.ring-1.ring-ivory'),
    ).toBeInTheDocument();
  });

  it('uses scoreboard tokens for each winner bead', () => {
    const { container } = render(
      <BeadPlate cells={[cell('player'), cell('banker'), cell('tie')]} />,
    );
    expect(container.querySelector('[data-bead-winner="player"]')).toHaveClass(
      'bg-scoreboard-player',
    );
    expect(container.querySelector('[data-bead-winner="banker"]')).toHaveClass(
      'bg-scoreboard-banker',
    );
    expect(container.querySelector('[data-bead-winner="tie"]')).toHaveClass('bg-scoreboard-tie');
  });

  it('truncates to the last (rows × visibleCols) cells', () => {
    const many = Array.from({ length: 200 }, () => cell('player'));
    const { container } = render(<BeadPlate cells={many} />);
    expect(container.querySelectorAll('[data-bead-winner="player"]').length).toBeLessThanOrEqual(
      60,
    );
  });
});
