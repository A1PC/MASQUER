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

  it('marks pair decorations', () => {
    const { container } = render(<BeadPlate cells={[cell('player', true, false)]} />);
    expect(container.querySelector('.bg-casino-red.rounded-full.ring-1')).toBeInTheDocument();
  });

  it('truncates to the last (rows × visibleCols) cells', () => {
    const many = Array.from({ length: 200 }, () => cell('player'));
    const { container } = render(<BeadPlate cells={many} />);
    expect(container.querySelectorAll('[data-bead-winner="player"]').length).toBeLessThanOrEqual(
      60,
    );
  });
});
