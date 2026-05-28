import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CallBoard from './CallBoard';

describe('CallBoard', () => {
  it('renders current ball + counter for british', () => {
    render(<CallBoard calledSoFar={[5, 23, 77]} callCount={3} variant="british" />);
    expect(screen.getByText('Ball 3 of 90')).toBeInTheDocument();
    expect(screen.getByText('77')).toBeInTheDocument();
  });

  it('renders american with 75 ball cap', () => {
    render(<CallBoard calledSoFar={[5]} callCount={1} variant="american" />);
    expect(screen.getByText('Ball 1 of 75')).toBeInTheDocument();
  });

  it('renders recent balls (up to 10) excluding current', () => {
    const balls = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const { container } = render(
      <CallBoard calledSoFar={balls} callCount={12} variant="british" />,
    );
    const allBalls = container.querySelectorAll('[data-bingo-ball]');
    expect(allBalls.length).toBeLessThanOrEqual(11); // current + up to 10 recent
  });

  it('applies palette to ball based on variant', () => {
    const { container } = render(<CallBoard calledSoFar={[15]} callCount={1} variant="american" />);
    // american 15 = B column = red (JSDOM converts hex to rgb)
    const ball = container.querySelector('[data-ball-value="15"]');
    expect(ball).not.toBeNull();
    // The background should reference the red color (either hex or rgb form)
    const bg = (ball as HTMLElement).style.background;
    expect(bg).toMatch(/ff5050|255,\s*80,\s*80/i);
  });

  it('current ball is wrapped in motion.div with shadow-gold-glow ring', () => {
    const { container } = render(<CallBoard calledSoFar={[42]} callCount={1} variant="british" />);
    // Reduced motion is OFF by default in jsdom — the wrapper should carry
    // the gold-glow utility for the dramatic reveal.
    const wrapper = container.querySelector('[data-current-ball]');
    expect(wrapper).not.toBeNull();
    expect((wrapper as HTMLElement).className).toContain('shadow-gold-glow');
  });

  it('uses brand-token shell (felt-table-deep + brass)', () => {
    const { container } = render(<CallBoard calledSoFar={[1]} callCount={1} variant="british" />);
    const board = container.querySelector('[data-call-board]') as HTMLElement;
    expect(board.className).toContain('bg-felt-table-deep');
    expect(board.className).toContain('border-brass/60');
  });

  it('American hero ball is prefixed with its column letter (B-7, G-52, O-72)', () => {
    // Spread the called list so each test ball lands as the hero (current) one.
    const cases: Array<[number, string]> = [
      [7, 'B-7'],
      [22, 'I-22'],
      [38, 'N-38'],
      [52, 'G-52'],
      [72, 'O-72'],
    ];
    for (const [value, expected] of cases) {
      const { container, unmount } = render(
        <CallBoard calledSoFar={[value]} callCount={1} variant="american" />,
      );
      const hero = container.querySelector('[data-current-ball] [data-bingo-ball]') as HTMLElement;
      expect(hero).not.toBeNull();
      expect(hero.textContent).toBe(expected);
      unmount();
    }
  });

  it('British hero ball stays a bare number (no column letter prefix)', () => {
    const { container } = render(<CallBoard calledSoFar={[77]} callCount={1} variant="british" />);
    const hero = container.querySelector('[data-current-ball] [data-bingo-ball]') as HTMLElement;
    expect(hero.textContent).toBe('77');
    expect(hero.getAttribute('data-ball-letter')).toBeNull();
  });

  it('American recent-ball chips stay bare numbers (letter prefix only on hero)', () => {
    // values 5 (B) + 22 (I); only the hero (22) gets the prefix.
    const { container } = render(
      <CallBoard calledSoFar={[5, 22]} callCount={2} variant="american" />,
    );
    const recent = container.querySelectorAll(
      '[data-bingo-ball]:not([data-current-ball] [data-bingo-ball])',
    );
    // The recent strip should hold the prior call as a bare number.
    const prior = Array.from(recent).find(
      (el) => (el as HTMLElement).getAttribute('data-ball-value') === '5',
    ) as HTMLElement | undefined;
    expect(prior).toBeDefined();
    expect(prior!.textContent).toBe('5');
  });
});
