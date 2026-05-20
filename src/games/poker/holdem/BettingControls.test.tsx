import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BettingControls from './BettingControls';

function defaultProps(overrides: Partial<Parameters<typeof BettingControls>[0]> = {}) {
  return {
    toCall: 0,
    minRaise: 10,
    stack: 500,
    pot: 100,
    isYourTurn: true,
    onFold: vi.fn(),
    onCheck: vi.fn(),
    onCall: vi.fn(),
    onRaise: vi.fn(),
    ...overrides,
  };
}

describe('BettingControls', () => {
  it('shows CHECK when toCall=0', () => {
    render(<BettingControls {...defaultProps({ toCall: 0 })} />);
    expect(screen.getByRole('button', { name: /CHECK/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CALL/ })).not.toBeInTheDocument();
  });

  it('shows CALL with amount when toCall>0', () => {
    render(<BettingControls {...defaultProps({ toCall: 50 })} />);
    expect(screen.getByRole('button', { name: /CALL 50/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CHECK/ })).not.toBeInTheDocument();
  });

  it('disables all buttons when isYourTurn=false', () => {
    const { container } = render(<BettingControls {...defaultProps({ isYourTurn: false })} />);
    expect(container.querySelector('[data-disabled]')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  it('fires onFold when FOLD clicked', async () => {
    const onFold = vi.fn();
    render(<BettingControls {...defaultProps({ onFold })} />);
    await userEvent.click(screen.getByRole('button', { name: /FOLD/ }));
    expect(onFold).toHaveBeenCalledOnce();
  });

  it('fires onCheck when CHECK clicked', async () => {
    const onCheck = vi.fn();
    render(<BettingControls {...defaultProps({ toCall: 0, onCheck })} />);
    await userEvent.click(screen.getByRole('button', { name: /CHECK/ }));
    expect(onCheck).toHaveBeenCalledOnce();
  });

  it('fires onCall when CALL clicked', async () => {
    const onCall = vi.fn();
    render(<BettingControls {...defaultProps({ toCall: 30, onCall })} />);
    await userEvent.click(screen.getByRole('button', { name: /CALL/ }));
    expect(onCall).toHaveBeenCalledOnce();
  });

  it('fires onRaise with current slider amount', async () => {
    const onRaise = vi.fn();
    render(<BettingControls {...defaultProps({ minRaise: 10, stack: 500, onRaise })} />);
    await userEvent.click(screen.getByRole('button', { name: /RAISE TO/ }));
    expect(onRaise).toHaveBeenCalledOnce();
    const [amount] = onRaise.mock.calls[0]!;
    expect(typeof amount).toBe('number');
    expect(amount).toBeGreaterThanOrEqual(10);
    expect(amount).toBeLessThanOrEqual(500);
  });

  it('clamps slider to [minRaise, stack]', () => {
    render(
      <BettingControls
        {...defaultProps({ minRaise: 20, stack: 100, toCall: 0, isYourTurn: true })}
      />,
    );
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('min')).toBe('20');
    expect(slider.getAttribute('max')).toBe('100');
  });

  it('ALL-IN quick button sets raise amount to stack', () => {
    render(
      <BettingControls
        {...defaultProps({ minRaise: 10, stack: 250, pot: 100, isYourTurn: true })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /ALL-IN/ }));
    const raiseAmountDisplay = screen.getByTestId !== undefined;
    // After clicking ALL-IN, the raise amount display shows 250
    const display = screen.getByText((content, el) => {
      return el?.getAttribute('data-raise-amount') !== null && content.includes('250');
    });
    expect(display).toBeInTheDocument();
    void raiseAmountDisplay;
  });
});
