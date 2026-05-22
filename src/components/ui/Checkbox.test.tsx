import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('toggles its checked state on click', () => {
    const { getByRole } = render(<Checkbox aria-label="Agree" />);
    const el = getByRole('checkbox');
    expect(el).toHaveAttribute('data-state', 'unchecked');
    fireEvent.click(el);
    expect(el).toHaveAttribute('data-state', 'checked');
  });
  it('toggles with the keyboard (space)', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { getByRole } = render(<Checkbox aria-label="Agree" onCheckedChange={onCheckedChange} />);
    getByRole('checkbox').focus();
    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalled();
  });
  it('respects the controlled checked prop', () => {
    const { getByRole } = render(<Checkbox aria-label="Agree" checked onCheckedChange={vi.fn()} />);
    expect(getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
  });
});
