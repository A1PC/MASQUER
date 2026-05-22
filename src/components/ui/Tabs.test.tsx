import type { JSX } from 'react';
import { beforeAll, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

// jsdom lacks the pointer-capture APIs Radix relies on; stub them locally so we
// avoid touching the shared test setup (PR is scoped to src/components/ui).
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto['hasPointerCapture'] ??= (): boolean => false;
  proto['setPointerCapture'] ??= (): void => {};
  proto['releasePointerCapture'] ??= (): void => {};
  proto['scrollIntoView'] ??= (): void => {};
});

function Sample(props: React.ComponentProps<typeof Tabs>): JSX.Element {
  return (
    <Tabs defaultValue="overview" {...props}>
      <Tabs.List aria-label="Tables">
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="blackjack">Blackjack</Tabs.Trigger>
        <Tabs.Trigger value="poker">Poker</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="overview">Overview panel</Tabs.Content>
      <Tabs.Content value="blackjack">Blackjack panel</Tabs.Content>
      <Tabs.Content value="poker">Poker panel</Tabs.Content>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders triggers and shows the default panel', () => {
    render(<Sample />);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview panel')).toBeInTheDocument();
  });

  it('switches content when a trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<Sample />);
    await user.click(screen.getByRole('tab', { name: 'Blackjack' }));
    expect(screen.getByText('Blackjack panel')).toBeInTheDocument();
    expect(screen.queryByText('Overview panel')).not.toBeInTheDocument();
  });

  it('moves the active tab with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Sample />);
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Blackjack' })).toHaveAttribute('aria-selected', 'true');
  });
});
