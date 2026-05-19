import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinLossTimeline from './WinLossTimeline';

describe('WinLossTimeline', () => {
  it('renders empty state when no data', () => {
    render(<WinLossTimeline data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders one tick per data point', () => {
    const { container } = render(
      <WinLossTimeline
        data={[
          { playedAt: 1, outcome: 'win', netChange: 10 },
          { playedAt: 2, outcome: 'loss', netChange: -10 },
          { playedAt: 3, outcome: 'push', netChange: 0 },
        ]}
      />,
    );
    expect(container.querySelectorAll('[aria-label^="Round"]')).toHaveLength(3);
  });
});
