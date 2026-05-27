import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Board from './Board';
import { ROW_COUNT, pegPosition } from './geometry';

describe('Board', () => {
  it('renders exactly ROW_COUNT × (ROW_COUNT+1) / 2 pegs (triangular)', () => {
    const { container } = render(<Board />);
    const pegs = container.querySelectorAll('[data-peg]');
    const expected = (ROW_COUNT * (ROW_COUNT + 1)) / 2;
    expect(pegs).toHaveLength(expected);
  });

  it('row 0 has 1 peg, row 25 has 26 pegs', () => {
    const { container } = render(<Board />);
    const row0 = container.querySelectorAll('[data-peg][data-row="0"]');
    const row25 = container.querySelectorAll('[data-peg][data-row="25"]');
    expect(row0).toHaveLength(1);
    expect(row25).toHaveLength(26);
  });

  it('every row R contains R+1 pegs with col 0..R', () => {
    const { container } = render(<Board />);
    for (let r = 0; r < ROW_COUNT; r += 1) {
      const rowPegs = container.querySelectorAll(`[data-peg][data-row="${r}"]`);
      expect(rowPegs, `row ${r}`).toHaveLength(r + 1);
      const cols = Array.from(rowPegs).map((el) => Number(el.getAttribute('data-col')));
      for (let c = 0; c <= r; c += 1) {
        expect(cols).toContain(c);
      }
    }
  });

  it('apex peg (row 0 col 0) is positioned at left: 50% top: 0%', () => {
    const { container } = render(<Board />);
    const apex = container.querySelector('[data-peg][data-row="0"][data-col="0"]') as HTMLElement;
    expect(apex).not.toBeNull();
    const apexPos = pegPosition(0, 0);
    expect(apex.style.left).toBe(`${apexPos.x}%`);
    expect(apex.style.top).toBe(`${apexPos.y}%`);
  });

  it('renders children inside the board (e.g. FallingBall overlays)', () => {
    const { container } = render(
      <Board>
        <div data-test-child>hello</div>
      </Board>,
    );
    expect(container.querySelector('[data-test-child]')).not.toBeNull();
  });
});
