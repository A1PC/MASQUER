import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinnersLosersBar from './WinnersLosersBar';

describe('WinnersLosersBar', () => {
  it('renders empty state when given no data', () => {
    render(<WinnersLosersBar winners={[]} losers={[]} />);
    expect(screen.getByText(/no winners or losers yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given at least one entry', () => {
    const { container } = render(
      <WinnersLosersBar
        winners={[{ username: 'alice', totalNetChange: 200 }]}
        losers={[{ username: 'bob', totalNetChange: -150 }]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
