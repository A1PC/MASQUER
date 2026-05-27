import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';
import { BET_MAX, AUTO_BALLS_MAX } from './logic';

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
    expect(screen.getByRole('button', { name: /START AUTO \(10.*×.*50/ })).toBeInTheDocument();
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

  it('bet input clamps to [10, BET_MAX = 1,000,000]', () => {
    const onBetChange = vi.fn();
    render(<SetupPanel {...defaultProps} onBetChange={onBetChange} />);
    const input = screen.getByDisplayValue('50');
    // Use fireEvent to set the full value at once on a controlled input.
    fireEvent.change(input, { target: { value: '99999999' } });
    expect(onBetChange).toHaveBeenLastCalledWith(BET_MAX);
    fireEvent.change(input, { target: { value: '1' } });
    expect(onBetChange).toHaveBeenLastCalledWith(10); // clamp to BET_MIN
  });

  it('MAX bet button jumps to BET_MAX', async () => {
    const onBetChange = vi.fn();
    render(<SetupPanel {...defaultProps} onBetChange={onBetChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^MAX$/ }));
    expect(onBetChange).toHaveBeenLastCalledWith(BET_MAX);
  });

  it('auto-balls input clamps to [1, AUTO_BALLS_MAX = 1,000]', () => {
    const onAutoBallsChange = vi.fn();
    render(<SetupPanel {...defaultProps} mode="auto" onAutoBallsChange={onAutoBallsChange} />);
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '99999' } });
    expect(onAutoBallsChange).toHaveBeenLastCalledWith(AUTO_BALLS_MAX);
  });

  it('renders the bet range hint (1,000,000) in BET PER BALL section', () => {
    render(<SetupPanel {...defaultProps} />);
    expect(screen.getByText(/1,000,000 chips/)).toBeInTheDocument();
  });

  it('renders the auto-balls max hint (1,000) in BALLS section', () => {
    render(<SetupPanel {...defaultProps} mode="auto" />);
    expect(screen.getByText(/max 1,000/)).toBeInTheDocument();
  });
});
