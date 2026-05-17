import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipSelector from './ChipSelector';
import { ROULETTE_CONFIG } from './config';

describe('<ChipSelector />', () => {
  it('renders all 6 denominations as buttons in order', () => {
    render(<ChipSelector value={5} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const d = ROULETTE_CONFIG.CHIP_DENOMINATIONS[i]!;
      expect(buttons[i]!.getAttribute('data-chip')).toBe(String(d));
    }
  });

  it('the selected chip has data-selected="true"', () => {
    render(<ChipSelector value={100} onChange={() => {}} />);
    const selected = document.querySelector('[data-selected="true"]');
    expect(selected!.getAttribute('data-chip')).toBe('100');
  });

  it('clicking a chip calls onChange with its denomination', async () => {
    const onChange = vi.fn();
    render(<ChipSelector value={5} onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /250/i }));
    expect(onChange).toHaveBeenCalledWith(250);
  });

  it('when disabled, no click triggers onChange', async () => {
    const onChange = vi.fn();
    render(<ChipSelector value={5} onChange={onChange} disabled />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /100/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
