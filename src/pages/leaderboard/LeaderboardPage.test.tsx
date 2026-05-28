import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import LeaderboardPage from './LeaderboardPage';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/leaderboard',
        element: <LeaderboardPage />,
        children: [
          { index: true, element: <div data-testid="outlet" /> },
          { path: ':game', element: <div data-testid="outlet" /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('LeaderboardPage', () => {
  it('renders root with h-full + data-leaderboard-page (no min-h-screen)', () => {
    const { container } = renderAt('/leaderboard');
    const root = container.querySelector('[data-leaderboard-page]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('h-full');
    expect(root?.className).not.toContain('min-h-screen');
  });

  it('renders the OVERVIEW heading at the index route', () => {
    renderAt('/leaderboard');
    expect(screen.getByRole('heading', { name: /LEADERBOARD · OVERVIEW/ })).toBeInTheDocument();
  });

  it('renders the per-game heading when game param present', () => {
    renderAt('/leaderboard/poker');
    expect(screen.getByRole('heading', { name: /LEADERBOARD · POKER/ })).toBeInTheDocument();
  });

  it('renders the main scroll area with data-leaderboard-main', () => {
    const { container } = renderAt('/leaderboard');
    expect(container.querySelector('[data-leaderboard-main]')).not.toBeNull();
  });
});
