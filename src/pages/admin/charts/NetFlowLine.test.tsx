import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NetFlowLine from './NetFlowLine';

describe('NetFlowLine', () => {
  it('renders an empty-state when given no data', () => {
    render(<NetFlowLine data={[]} />);
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });

  it('renders a chart container when given data', () => {
    const { container } = render(
      <NetFlowLine
        data={[
          { dayStartMs: 1000, netChange: 100 },
          { dayStartMs: 86_400_000 + 1000, netChange: -50 },
        ]}
      />,
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
