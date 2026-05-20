import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Board from './Board';
import { ROW_COUNT } from './logic';

describe('Board', () => {
  it('renders ROW_COUNT peg rows', () => {
    const { container } = render(<Board />);
    expect(container.querySelectorAll('[data-peg-row]')).toHaveLength(ROW_COUNT);
  });

  it('row 0 has 3 pegs, row 19 has 22 pegs', () => {
    const { container } = render(<Board />);
    const row0 = container.querySelector('[data-peg-row="0"]')!;
    const row19 = container.querySelector('[data-peg-row="19"]')!;
    expect(row0.querySelectorAll('[data-peg]')).toHaveLength(3);
    expect(row19.querySelectorAll('[data-peg]')).toHaveLength(22);
  });

  it('renders children inside the board', () => {
    const { container } = render(
      <Board>
        <div data-test-child>hello</div>
      </Board>,
    );
    expect(container.querySelector('[data-test-child]')).not.toBeNull();
  });
});
