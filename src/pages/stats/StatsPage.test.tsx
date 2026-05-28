import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import StatsPage from './StatsPage';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/stats',
        element: <StatsPage />,
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

describe('StatsPage', () => {
  it('renders root with h-full + data-stats-page (no min-h-screen)', () => {
    const { container } = renderAt('/stats');
    const root = container.querySelector('[data-stats-page]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('h-full');
    expect(root?.className).not.toContain('min-h-screen');
  });

  it('renders the OVERVIEW heading at the index route', () => {
    renderAt('/stats');
    expect(screen.getByRole('heading', { name: /STATS · OVERVIEW/ })).toBeInTheDocument();
  });

  it('renders the per-game heading when game param present', () => {
    renderAt('/stats/blackjack');
    expect(screen.getByRole('heading', { name: /STATS · BLACKJACK/ })).toBeInTheDocument();
  });

  it('renders the main scroll area with data-stats-main', () => {
    const { container } = renderAt('/stats');
    expect(container.querySelector('[data-stats-main]')).not.toBeNull();
  });
});
