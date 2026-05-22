import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its label', () => {
    const { getByText } = render(<Badge tone="win">Win +250</Badge>);
    expect(getByText('Win +250')).toBeInTheDocument();
  });
  it('applies the win tone classes', () => {
    const { getByText } = render(<Badge tone="win">Win</Badge>);
    expect(getByText('Win').className).toContain('text-gold');
  });
  it('applies the loss tone classes', () => {
    const { getByText } = render(<Badge tone="loss">Loss</Badge>);
    expect(getByText('Loss').className).toContain('bg-loss/30');
  });
  it('applies the neutral tone classes', () => {
    const { getByText } = render(<Badge tone="neutral">Push</Badge>);
    expect(getByText('Push').className).toContain('text-brass');
  });
  it('renders a leading icon when provided', () => {
    const { container } = render(
      <Badge tone="win" icon="TrendingUp">
        Win
      </Badge>,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
