import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipSelector from './ChipSelector';
import { CHIP_DENOMINATIONS } from './config';

describe('ChipSelector', () => {
  it('renders one button per denomination as radio role', () => {
    render(<ChipSelector value={25} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(CHIP_DENOMINATIONS.length);
  });

  it('marks the current value as checked', () => {
    render(<ChipSelector value={100} onChange={() => {}} />);
    const checked = screen.getByRole('radio', { name: /chip 100/i });
    expect(checked).toHaveAttribute('aria-checked', 'true');
    const unchecked = screen.getByRole('radio', { name: /chip 25/i });
    expect(unchecked).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a chip calls onChange with that denomination', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipSelector value={25} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /chip 500/i }));
    expect(onChange).toHaveBeenCalledWith(500);
  });

  it('1K label is used for 1000 (no substring collision with 100)', () => {
    render(<ChipSelector value={25} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /chip 1K/i })).toBeInTheDocument();
  });

  it('disabled blocks clicks', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipSelector value={25} onChange={onChange} disabled />);
    await user.click(screen.getByRole('radio', { name: /chip 100/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
