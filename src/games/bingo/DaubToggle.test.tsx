import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DaubToggle from './DaubToggle';

describe('DaubToggle', () => {
  it('renders auto label', () => {
    render(<DaubToggle mode="auto" onToggle={vi.fn()} />);
    expect(screen.getByText('AUTO')).toBeInTheDocument();
  });

  it('fires onToggle when clicked', async () => {
    const onToggle = vi.fn();
    render(<DaubToggle mode="auto" onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('disabled state renders MANUAL (locked) and is not a button', () => {
    render(<DaubToggle mode="manual" onToggle={vi.fn()} disabled disabledReason="Hard locked" />);
    expect(screen.getByText(/MANUAL \(locked\)/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
