import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders an accessible loading mask', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('img', { name: /loading/i })).toBeInTheDocument();
  });
  it('disables animation under reduced motion', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[class*="motion-reduce:animate-none"]')).not.toBeNull();
  });
});
