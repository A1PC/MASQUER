import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider } from './Tooltip';

function renderTip(): void {
  render(
    <TooltipProvider delayDuration={0}>
      <Tooltip content="House edge: 0.5%">
        <button>Info</button>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip', () => {
  it('shows on keyboard focus with role="tooltip"', async () => {
    const user = userEvent.setup();
    renderTip();
    await act(async () => {
      await user.tab();
    });
    const tip = await screen.findAllByRole('tooltip');
    expect(tip[0]).toHaveTextContent('House edge: 0.5%');
  });

  it('shows on hover', async () => {
    const user = userEvent.setup();
    renderTip();
    await user.hover(screen.getByRole('button', { name: 'Info' }));
    const tip = await screen.findAllByText('House edge: 0.5%');
    expect(tip.length).toBeGreaterThan(0);
  });
});
