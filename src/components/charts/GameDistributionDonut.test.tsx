import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameDistributionDonut from './GameDistributionDonut';

describe('GameDistributionDonut', () => {
  it('renders empty state when given no data', () => {
    render(<GameDistributionDonut data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given at least one game', () => {
    const { container } = render(
      <GameDistributionDonut
        data={[
          { game: 'blackjack', rounds: 3, netChange: 200 },
          { game: 'roulette', rounds: 1, netChange: -100 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
