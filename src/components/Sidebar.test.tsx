import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  function renderAtPath(path: string, collapsed = false) {
    const router = createMemoryRouter(
      [
        { path: '/lobby', element: <Sidebar collapsed={collapsed} /> },
        { path: '/play/coin-flip', element: <Sidebar collapsed={collapsed} /> },
      ],
      { initialEntries: [path] },
    );
    return render(<RouterProvider router={router} />);
  }

  it('renders all 8 nav items when expanded', () => {
    renderAtPath('/lobby', false);
    expect(screen.getByText(/Lobby/)).toBeInTheDocument();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument();
    expect(screen.getByText(/Blackjack/)).toBeInTheDocument();
    expect(screen.getByText(/Roulette/)).toBeInTheDocument();
    expect(screen.getByText(/Slots/)).toBeInTheDocument();
    expect(screen.getByText(/Baccarat/)).toBeInTheDocument();
    expect(screen.getByText(/Stats/)).toBeInTheDocument();
    expect(screen.getByText(/Leaderboard/)).toBeInTheDocument();
  });

  it('shows NEW badge on Baccarat (most recent ship)', () => {
    renderAtPath('/lobby');
    const badge = screen.getByText('NEW');
    expect(badge).toBeInTheDocument();
    // Badge sits in the Baccarat row.
    expect(badge.closest('a')).toHaveAttribute('href', '/play/baccarat');
  });

  it('does not show any stale phase tags (all games shipped)', () => {
    renderAtPath('/lobby');
    expect(screen.queryByText('P3')).not.toBeInTheDocument();
    expect(screen.queryByText('P4')).not.toBeInTheDocument();
    expect(screen.queryByText('P5')).not.toBeInTheDocument();
    expect(screen.queryByText('P6')).not.toBeInTheDocument();
  });

  it('hides content visually when collapsed (aria-hidden)', () => {
    const { container } = renderAtPath('/lobby', true);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
  });
});
