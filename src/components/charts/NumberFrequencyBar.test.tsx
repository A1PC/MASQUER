import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import NumberFrequencyBar from './NumberFrequencyBar';

describe('NumberFrequencyBar', () => {
  it('renders a Recharts chart for given data', () => {
    const { container } = render(<NumberFrequencyBar data={[1, 2, 3, 4, 5]} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders even with all-zero data', () => {
    const { container } = render(<NumberFrequencyBar data={Array.from({ length: 50 }, () => 0)} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
