import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinRateByGameBar from './WinRateByGameBar';

describe('WinRateByGameBar', () => {
  it('renders empty state when no data', () => {
    render(<WinRateByGameBar data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders chart when given data', () => {
    const { container } = render(
      <WinRateByGameBar
        data={[
          { game: 'blackjack', winRate: 48 },
          { game: 'slots', winRate: 22 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
