import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DIFFICULTY, BUY_IN } from './logic';
import SetupPanel from './SetupPanel';

const defaultResolvedConfigs = {
  easy: DIFFICULTY.easy,
  medium: DIFFICULTY.medium,
  hard: DIFFICULTY.hard,
};

const defaultProps = {
  variant: 'british' as const,
  difficulty: 'easy' as const,
  speed: 'normal' as const,
  daubMode: 'auto' as const,
  balance: 5000,
  resolvedConfigs: defaultResolvedConfigs,
  onDifficultyChange: vi.fn(),
  onSpeedChange: vi.fn(),
  onDaubModeChange: vi.fn(),
  onBuyAndStart: vi.fn(),
};

describe('SetupPanel', () => {
  it('renders variant header', () => {
    render(<SetupPanel {...defaultProps} variant="british" />);
    expect(screen.getByText(/British 90-Ball/)).toBeInTheDocument();
  });

  it('renders american header', () => {
    render(<SetupPanel {...defaultProps} variant="american" />);
    expect(screen.getByText(/American 75-Ball/)).toBeInTheDocument();
  });

  it('shows pot for selected difficulty using resolvedConfigs', () => {
    render(<SetupPanel {...defaultProps} difficulty="hard" />);
    expect(screen.getByText(/Win up to/)).toBeInTheDocument();
    // Hard default: 50 * 8 = 400
    expect(screen.getAllByText(/400/).length).toBeGreaterThan(0);
  });

  it('shows overridden pot when resolvedConfigs differs from default', () => {
    const overridden = {
      ...defaultResolvedConfigs,
      easy: { ...DIFFICULTY.easy, potMultiplier: 20 },
    };
    render(<SetupPanel {...defaultProps} difficulty="easy" resolvedConfigs={overridden} />);
    // 50 * 20 = 1000
    expect(screen.getAllByText(/1000/).length).toBeGreaterThan(0);
  });

  it('shows overridden cpuCount in difficulty card', () => {
    const overridden = {
      ...defaultResolvedConfigs,
      easy: { ...DIFFICULTY.easy, cpuCount: 25 },
    };
    render(<SetupPanel {...defaultProps} difficulty="easy" resolvedConfigs={overridden} />);
    expect(screen.getByText(/25 CPUs/i)).toBeInTheDocument();
  });

  it('Hard difficulty locks AUTO daub button as disabled', () => {
    render(<SetupPanel {...defaultProps} difficulty="hard" />);
    const autoBtn = screen.getByRole('radio', { name: /AUTO/i });
    expect(autoBtn).toBeDisabled();
    expect(screen.getByText(/requires manual daub/i)).toBeInTheDocument();
  });

  it('forceManual override on easy difficulty locks AUTO daub button', () => {
    const overridden = {
      ...defaultResolvedConfigs,
      easy: { ...DIFFICULTY.easy, forceManual: true },
    };
    render(<SetupPanel {...defaultProps} difficulty="easy" resolvedConfigs={overridden} />);
    const autoBtn = screen.getByRole('radio', { name: /AUTO/i });
    expect(autoBtn).toBeDisabled();
  });

  it('clicking difficulty fires onDifficultyChange', async () => {
    const onDifficultyChange = vi.fn();
    render(<SetupPanel {...defaultProps} onDifficultyChange={onDifficultyChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /MEDIUM/ }));
    expect(onDifficultyChange).toHaveBeenCalledWith('medium');
  });

  it('BUY & PLAY disabled when balance < BUY_IN', () => {
    render(<SetupPanel {...defaultProps} balance={10} />);
    expect(screen.getByRole('button', { name: /BUY & PLAY/ })).toBeDisabled();
  });

  it('shows buy-in amount', () => {
    render(<SetupPanel {...defaultProps} />);
    expect(screen.getByText(`${BUY_IN} chips`)).toBeInTheDocument();
  });
});
