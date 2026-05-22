import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MaskMark from './MaskMark';

describe('MaskMark', () => {
  it('renders an accessible svg sized by `size`', () => {
    const { getByRole } = render(<MaskMark size={120} />);
    const svg = getByRole('img', { name: /masquer/i });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('120');
  });
  it('full variant includes filigree detail; simple variant omits it', () => {
    const full = render(<MaskMark variant="full" />);
    const simple = render(<MaskMark variant="simple" />);
    expect(full.container.querySelectorAll('[data-detail="filigree"]').length).toBeGreaterThan(0);
    expect(simple.container.querySelectorAll('[data-detail="filigree"]').length).toBe(0);
  });
});
