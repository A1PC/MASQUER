import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('toggles its data-state on click', () => {
    const { getByRole } = render(<Switch aria-label="Sound" />);
    const el = getByRole('switch');
    expect(el).toHaveAttribute('data-state', 'unchecked');
    fireEvent.click(el);
    expect(el).toHaveAttribute('data-state', 'checked');
  });
  it('fires onCheckedChange', () => {
    const onCheckedChange = vi.fn();
    const { getByRole } = render(<Switch aria-label="Sound" onCheckedChange={onCheckedChange} />);
    fireEvent.click(getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
  it('respects the controlled checked prop', () => {
    const { getByRole } = render(<Switch aria-label="Sound" checked onCheckedChange={vi.fn()} />);
    expect(getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });
});
