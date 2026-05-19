import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BetSizeHistogram from './BetSizeHistogram';

describe('BetSizeHistogram', () => {
  it('renders empty state when no data', () => {
    render(<BetSizeHistogram data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders chart with bin count', () => {
    const { container } = render(
      <BetSizeHistogram
        data={[
          { binMin: 0, binMax: 20, count: 5 },
          { binMin: 20, binMax: 40, count: 3 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
