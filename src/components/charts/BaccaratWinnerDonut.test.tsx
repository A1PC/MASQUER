import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BaccaratWinnerDonut, { BaccaratDonutTooltip } from './BaccaratWinnerDonut';
import type { BaccaratWinnerCount } from '@/systems/stats';

function fixture(): BaccaratWinnerCount[] {
  return [
    { winner: 'player', count: 18 },
    { winner: 'banker', count: 22 },
    { winner: 'tie', count: 4 },
  ];
}

describe('BaccaratWinnerDonut', () => {
  it('renders a Recharts container + donut wrapper', () => {
    const { container } = render(<BaccaratWinnerDonut data={fixture()} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(container.querySelector('[data-baccarat-winner-donut]')).toBeInTheDocument();
  });
});

describe('BaccaratWinnerDonut > BaccaratDonutTooltip', () => {
  function tooltipPayload(point: BaccaratWinnerCount) {
    return [{ value: point.count, name: 'count', dataKey: 'count', payload: point }];
  }

  it('returns null when inactive', () => {
    const { container } = render(
      <BaccaratDonutTooltip active={false} payload={tooltipPayload(fixture()[0]!)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the tooltip with brand chrome + label/count', () => {
    render(<BaccaratDonutTooltip active payload={tooltipPayload(fixture()[1]!)} />);
    expect(screen.getByText(/^banker$/i)).toBeInTheDocument();
    expect(screen.getByText(/22 rounds/i)).toBeInTheDocument();
  });

  it('uses singular "round" when count is 1', () => {
    const point: BaccaratWinnerCount = { winner: 'tie', count: 1 };
    render(<BaccaratDonutTooltip active payload={tooltipPayload(point)} />);
    expect(screen.getByText(/1 round$/i)).toBeInTheDocument();
  });
});
