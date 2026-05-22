import type { JSX } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup, RadioGroupItem } from './RadioGroup';

function Group(props: React.ComponentProps<typeof RadioGroup>): JSX.Element {
  return (
    <RadioGroup aria-label="Stake" {...props}>
      <RadioGroupItem value="low" aria-label="Low" />
      <RadioGroupItem value="mid" aria-label="Mid" />
      <RadioGroupItem value="high" aria-label="High" />
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('selects an item on click', () => {
    const onValueChange = vi.fn();
    render(<Group onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mid' }));
    expect(onValueChange).toHaveBeenCalledWith('mid');
    expect(screen.getByRole('radio', { name: 'Mid' })).toHaveAttribute('data-state', 'checked');
  });
  it('moves focus with arrow keys and selects via space', async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.tab(); // focus enters the group on the first item
    expect(screen.getByRole('radio', { name: 'Low' })).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // roving focus moves to the next item
    expect(screen.getByRole('radio', { name: 'Mid' })).toHaveFocus();
    await user.keyboard(' '); // space selects the focused item
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Mid' })).toHaveAttribute('data-state', 'checked'),
    );
  });
  it('renders the controlled value as checked', () => {
    render(<Group value="high" onValueChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'High' })).toHaveAttribute('data-state', 'checked');
  });
});
