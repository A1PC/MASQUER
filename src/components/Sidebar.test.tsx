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

  it('shows NEW badge on Coin Flip', () => {
    renderAtPath('/lobby');
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows phase tags on unimplemented games', () => {
    renderAtPath('/lobby');
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('P4')).toBeInTheDocument();
    expect(screen.getByText('P5')).toBeInTheDocument();
    expect(screen.getByText('P6')).toBeInTheDocument();
  });

  it('hides content visually when collapsed (aria-hidden)', () => {
    const { container } = renderAtPath('/lobby', true);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
  });
});
