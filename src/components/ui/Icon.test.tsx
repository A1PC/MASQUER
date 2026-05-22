import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an svg with an accessible label', () => {
    const { getByRole } = render(<Icon name="Spade" label="spade" size={24} />);
    const el = getByRole('img', { name: 'spade' });
    expect(el.tagName.toLowerCase()).toBe('svg');
  });
  it('is aria-hidden when decorative (no label)', () => {
    const { container } = render(<Icon name="Spade" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
