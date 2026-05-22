import type { JSX } from 'react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Select } from './Select';

// jsdom lacks the pointer/scroll APIs Radix Select relies on; stub them here so
// we avoid touching the shared test setup (PR is scoped to src/components/ui).
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto['hasPointerCapture'] ??= (): boolean => false;
  proto['setPointerCapture'] ??= (): void => {};
  proto['releasePointerCapture'] ??= (): void => {};
  proto['scrollIntoView'] ??= (): void => {};
});

function Picker(props: React.ComponentProps<typeof Select>): JSX.Element {
  return (
    <Select {...props}>
      <Select.Trigger aria-label="Table tier">
        <Select.Value placeholder="Choose a tier" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="low">Low</Select.Item>
        <Select.Item value="mid">Mid</Select.Item>
        <Select.Item value="high">High</Select.Item>
      </Select.Content>
    </Select>
  );
}

describe('Select', () => {
  it('opens on click and selects an item', async () => {
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Table tier' }));
    const mid = await screen.findByRole('option', { name: 'Mid' });
    fireEvent.click(mid);
    expect(onValueChange).toHaveBeenCalledWith('mid');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Table tier' })).toHaveTextContent('Mid'),
    );
  });

  it('renders the controlled value', () => {
    render(<Picker value="high" onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Table tier' })).toHaveTextContent('High');
  });

  it('selects via keyboard navigation', async () => {
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Table tier' });
    fireEvent.click(trigger);
    await screen.findByRole('listbox');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalled();
  });
});
