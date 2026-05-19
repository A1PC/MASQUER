import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';

const defaultProps = {
  variant: 'british' as const,
  difficulty: 'easy' as const,
  speed: 'normal' as const,
  daubMode: 'auto' as const,
  balance: 5000,
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

  it('shows pot for selected difficulty', () => {
    render(<SetupPanel {...defaultProps} difficulty="hard" />);
    expect(screen.getByText(/Win up to/)).toBeInTheDocument();
    expect(screen.getAllByText(/400/).length).toBeGreaterThan(0);
  });

  it('Hard difficulty locks AUTO daub button as disabled', () => {
    render(<SetupPanel {...defaultProps} difficulty="hard" />);
    const autoBtn = screen.getByRole('radio', { name: /AUTO/i });
    expect(autoBtn).toBeDisabled();
    expect(screen.getByText(/Hard difficulty requires manual daub/i)).toBeInTheDocument();
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
});
