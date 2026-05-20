import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';

const defaultProps = {
  risk: 'low' as const,
  bet: 50,
  mode: 'manual' as const,
  autoBalls: 10,
  autoInterval: 'normal' as const,
  balance: 5000,
  onRiskChange: vi.fn(),
  onBetChange: vi.fn(),
  onModeChange: vi.fn(),
  onAutoBallsChange: vi.fn(),
  onAutoIntervalChange: vi.fn(),
  onDrop: vi.fn(),
  onStartAuto: vi.fn(),
};

describe('SetupPanel', () => {
  it('manual mode shows DROP button with bet amount', () => {
    render(<SetupPanel {...defaultProps} bet={75} mode="manual" />);
    expect(screen.getByRole('button', { name: /DROP \(75\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /START AUTO/ })).toBeNull();
  });

  it('auto mode shows START AUTO with total commit', () => {
    render(<SetupPanel {...defaultProps} mode="auto" bet={50} autoBalls={10} />);
    expect(screen.getByRole('button', { name: /START AUTO \(10 × 50/ })).toBeInTheDocument();
  });

  it('auto mode reveals balls input + interval picker', () => {
    render(<SetupPanel {...defaultProps} mode="auto" />);
    expect(screen.getByLabelText(/Auto interval/i)).toBeInTheDocument();
  });

  it('DROP disabled when balance < bet', () => {
    render(<SetupPanel {...defaultProps} balance={5} bet={50} />);
    expect(screen.getByRole('button', { name: /DROP/ })).toBeDisabled();
  });

  it('clicking risk pill fires onRiskChange', async () => {
    const onRiskChange = vi.fn();
    render(<SetupPanel {...defaultProps} onRiskChange={onRiskChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /HIGH/ }));
    expect(onRiskChange).toHaveBeenCalledWith('high');
  });

  it('bet input clamps to [10, 5000]', () => {
    const onBetChange = vi.fn();
    render(<SetupPanel {...defaultProps} onBetChange={onBetChange} />);
    const input = screen.getByDisplayValue('50');
    // Use fireEvent to set the full value at once on a controlled input.
    fireEvent.change(input, { target: { value: '99999' } });
    expect(onBetChange).toHaveBeenLastCalledWith(5000);
    fireEvent.change(input, { target: { value: '1' } });
    expect(onBetChange).toHaveBeenLastCalledWith(10); // clamp to BET_MIN
  });
});
