import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipSelector from './ChipSelector';
import { CHIP_DENOMINATIONS } from './config';

describe('ChipSelector', () => {
  it('renders one shared ChipDenominationButton per denomination', () => {
    render(<ChipSelector value={25} onChange={() => {}} />);
    // Each chip is a single <button> (no role="radio" wrapper) sharing
    // the canonical 44 × 44 px shared component.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(CHIP_DENOMINATIONS.length);
  });

  it('exposes data-chip + data-selected for the current value', () => {
    const { container } = render(<ChipSelector value={100} onChange={() => {}} />);
    const selected = container.querySelector('button[data-chip="100"]');
    const unselected = container.querySelector('button[data-chip="25"]');
    expect(selected?.getAttribute('data-selected')).toBe('true');
    expect(unselected?.getAttribute('data-selected')).toBe('false');
  });

  it('uses aria-pressed on each chip for the selection state', () => {
    render(<ChipSelector value={100} onChange={() => {}} />);
    const selected = screen.getByRole('button', { name: /select 100-chip/i });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    const unselected = screen.getByRole('button', { name: /select 25-chip/i });
    expect(unselected).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a chip calls onChange with that denomination', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipSelector value={25} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /select 500-chip/i }));
    expect(onChange).toHaveBeenCalledWith(500);
  });

  it('1K label is used for 1000 (no substring collision with 100)', () => {
    render(<ChipSelector value={25} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /select 1K-chip/i })).toBeInTheDocument();
  });

  it('disabled blocks clicks', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChipSelector value={25} onChange={onChange} disabled />);
    await user.click(screen.getByRole('button', { name: /select 100-chip/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
