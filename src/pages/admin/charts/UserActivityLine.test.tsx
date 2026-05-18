import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserActivityLine from './UserActivityLine';

describe('UserActivityLine', () => {
  it('renders empty state when given no data', () => {
    render(<UserActivityLine data={[]} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('renders a chart when given data', () => {
    const { container } = render(
      <UserActivityLine
        data={[
          { dayStartMs: 1000, netChange: 100 },
          { dayStartMs: 86_400_000 + 1000, netChange: -25 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
