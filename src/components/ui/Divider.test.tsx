import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from './Divider';

describe('Divider', () => {
  it('renders a plain hairline rule', () => {
    const { container } = render(<Divider />);
    const hr = container.querySelector('hr');
    expect(hr).not.toBeNull();
    expect(hr?.className).toContain('border-brass/30');
  });
  it('renders the diamond ornament when requested', () => {
    const { getByText, getByRole } = render(<Divider ornament />);
    expect(getByRole('separator')).toBeInTheDocument();
    expect(getByText('◆')).toBeInTheDocument();
  });
});
