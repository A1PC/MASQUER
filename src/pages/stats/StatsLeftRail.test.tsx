import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StatsLeftRail from './StatsLeftRail';

function renderAt(initial: string, basePath: '/stats' | '/leaderboard' = '/stats') {
  const router = createMemoryRouter(
    [{ path: `${basePath}/*`, element: <StatsLeftRail basePath={basePath} /> }],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('StatsLeftRail', () => {
  it('renders Overview + 7 game tabs', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /blackjack/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /roulette/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /slots/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /baccarat/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /coin flip/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lottery/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bingo/i })).toBeInTheDocument();
  });

  it('renders Bingo tab with correct href', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /bingo/i })).toHaveAttribute('href', '/stats/bingo');
  });

  it('overview link uses base path only', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/stats');
  });

  it('per-game links use slugified game keys', () => {
    renderAt('/stats');
    expect(screen.getByRole('link', { name: /blackjack/i })).toHaveAttribute(
      'href',
      '/stats/blackjack',
    );
    expect(screen.getByRole('link', { name: /coin flip/i })).toHaveAttribute(
      'href',
      '/stats/coin-flip',
    );
  });

  it('marks the active link with aria-current=page', () => {
    renderAt('/stats/roulette');
    expect(screen.getByRole('link', { name: /roulette/i })).toHaveAttribute('aria-current', 'page');
  });

  it('respects basePath="/leaderboard"', () => {
    renderAt('/leaderboard', '/leaderboard');
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByRole('link', { name: /slots/i })).toHaveAttribute(
      'href',
      '/leaderboard/slots',
    );
  });
});
