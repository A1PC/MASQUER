import { beforeAll, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu } from './DropdownMenu';

// jsdom lacks the pointer-capture APIs Radix relies on; stub them locally.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto['hasPointerCapture'] ??= (): boolean => false;
  proto['setPointerCapture'] ??= (): void => {};
  proto['releasePointerCapture'] ??= (): void => {};
  proto['scrollIntoView'] ??= (): void => {};
});

function Menu({ onCashOut }: { onCashOut: () => void }): React.ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Table</DropdownMenu.Label>
        <DropdownMenu.Item onSelect={onCashOut}>Cash out</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>Settings</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('opens and fires the item handler on click', async () => {
    const user = userEvent.setup();
    const onCashOut = vi.fn();
    render(<Menu onCashOut={onCashOut} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await screen.findByRole('menu');
    await user.click(screen.getByRole('menuitem', { name: 'Cash out' }));
    expect(onCashOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('navigates items with the keyboard', async () => {
    const user = userEvent.setup();
    const onCashOut = vi.fn();
    render(<Menu onCashOut={onCashOut} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await screen.findByRole('menu');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onCashOut).toHaveBeenCalledOnce();
  });
});
