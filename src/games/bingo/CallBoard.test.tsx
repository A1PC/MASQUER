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
});
