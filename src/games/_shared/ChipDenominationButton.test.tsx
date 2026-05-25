import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChipDenominationButton from './ChipDenominationButton';
import { CHIP_STYLES, chipLabel } from './chipStyles';

describe('chipLabel', () => {
  it('formats sub-thousand denominations as integers', () => {
    expect(chipLabel(1)).toBe('1');
    expect(chipLabel(5)).toBe('5');
    expect(chipLabel(250)).toBe('250');
  });

  it('formats >=1000 denominations as a K-shortened label', () => {
    expect(chipLabel(1000)).toBe('1K');
    expect(chipLabel(5000)).toBe('5K');
  });
});

describe('CHIP_STYLES', () => {
  it('defines a style for every canonical denomination', () => {
    for (const d of [1, 5, 25, 100, 250, 500, 1000]) {
      expect(CHIP_STYLES[d]).toBeDefined();
    }
  });
});

describe('<ChipDenominationButton />', () => {
  it('renders the chip label and exposes a default aria-label', () => {
    render(<ChipDenominationButton denomination={25} />);
    const btn = screen.getByRole('button', { name: /chip 25/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('25');
    expect(btn.getAttribute('data-chip')).toBe('25');
  });

  it('shortens 1000 to 1K on the chip face', () => {
    render(<ChipDenominationButton denomination={1000} />);
    expect(screen.getByRole('button')).toHaveTextContent('1K');
  });

  it('honours a custom ariaLabel and ariaPressed', () => {
    render(
      <ChipDenominationButton denomination={5} ariaLabel="Select 5-chip" ariaPressed selected />,
    );
    const btn = screen.getByRole('button', { name: /select 5-chip/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.getAttribute('data-selected')).toBe('true');
  });

  it('invokes onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ChipDenominationButton denomination={5} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<ChipDenominationButton denomination={5} onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the selected ring class when selected=true', () => {
    render(<ChipDenominationButton denomination={100} selected />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ring-gold-bright');
    expect(btn.className).toContain('scale-110');
  });
});
