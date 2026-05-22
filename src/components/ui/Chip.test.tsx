import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders the denomination value', () => {
    const { getByText } = render(<Chip value={100} />);
    expect(getByText('100')).toBeInTheDocument();
  });
  it('renders the mask emblem svg when emblem is set', () => {
    const { container } = render(<Chip emblem surface="felt" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
  it('applies the surface class', () => {
    const { container } = render(<Chip value={500} surface="emerald" />);
    expect(container.firstElementChild?.className).toContain('bg-jewel-emerald');
  });
  it('applies the dashed gold edge', () => {
    const { container } = render(<Chip value={25} />);
    expect(container.firstElementChild?.className).toContain('border-dashed');
  });
});
