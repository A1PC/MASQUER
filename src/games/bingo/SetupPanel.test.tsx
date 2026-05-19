import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';

describe('SetupPanel', () => {
  it('renders 4 card-count buttons + 3 speed buttons', () => {
    render(
      <SetupPanel
        cardCount={1}
        speed="normal"
        balance={1000}
        onCardCountChange={() => {}}
        onSpeedChange={() => {}}
        onBuyAndStart={() => {}}
      />,
    );
    expect(screen.getAllByRole('radio', { name: /^[1234]$/ })).toHaveLength(4);
    expect(screen.getAllByRole('radio', { name: /slow|normal|fast/i })).toHaveLength(3);
  });

  it('marks the current card-count as aria-checked', () => {
    render(
      <SetupPanel
        cardCount={3}
        speed="normal"
        balance={1000}
        onCardCountChange={() => {}}
        onSpeedChange={() => {}}
        onBuyAndStart={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: '3' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows cost = cardCount × 50', () => {
    render(
      <SetupPanel
        cardCount={3}
        speed="normal"
        balance={1000}
        onCardCountChange={() => {}}
        onSpeedChange={() => {}}
        onBuyAndStart={() => {}}
      />,
    );
    expect(screen.getByText('150 chips')).toBeInTheDocument();
  });

  it('disables BUY when balance < cost', () => {
    render(
      <SetupPanel
        cardCount={4}
        speed="normal"
        balance={100}
        onCardCountChange={() => {}}
        onSpeedChange={() => {}}
        onBuyAndStart={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /buy & start/i })).toBeDisabled();
    expect(screen.getByText(/not enough chips/i)).toBeInTheDocument();
  });

  it('fires onCardCountChange + onSpeedChange + onBuyAndStart', async () => {
    const user = userEvent.setup();
    const onCardCountChange = vi.fn();
    const onSpeedChange = vi.fn();
    const onBuyAndStart = vi.fn();
    render(
      <SetupPanel
        cardCount={1}
        speed="normal"
        balance={1000}
        onCardCountChange={onCardCountChange}
        onSpeedChange={onSpeedChange}
        onBuyAndStart={onBuyAndStart}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '3' }));
    expect(onCardCountChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('radio', { name: /fast/i }));
    expect(onSpeedChange).toHaveBeenCalledWith('fast');
    await user.click(screen.getByRole('button', { name: /buy & start/i }));
    expect(onBuyAndStart).toHaveBeenCalledOnce();
  });
});
