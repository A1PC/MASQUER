import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Paytable from './Paytable';
import { SLOTS_PAYTABLE } from './config';

describe('<Paytable /> winning highlight', () => {
  it('marks the matching row with data-winning="true" when winningKey is set', () => {
    render(<Paytable winningKey="seven-seven-seven" />);
    const row = document.querySelector('[data-payout-key="seven-seven-seven"]');
    expect(row!.getAttribute('data-winning')).toBe('true');
  });

  it('non-matching rows do NOT get data-winning', () => {
    render(<Paytable winningKey="lemon-lemon-lemon" />);
    expect(
      document.querySelector('[data-payout-key="seven-seven-seven"]')!.getAttribute('data-winning'),
    ).toBeNull();
    expect(
      document.querySelector('[data-payout-key="bar-bar-bar"]')!.getAttribute('data-winning'),
    ).toBeNull();
  });

  it('when winningKey is null / undefined, no row has data-winning', () => {
    render(<Paytable />);
    expect(document.querySelectorAll('[data-winning="true"]')).toHaveLength(0);
  });

  it('two-cherry can be highlighted', () => {
    render(<Paytable winningKey="two-cherry" />);
    expect(
      document.querySelector('[data-payout-key="two-cherry"]')!.getAttribute('data-winning'),
    ).toBe('true');
  });
});

describe('<Paytable />', () => {
  it('renders all 6 payout rows', () => {
    render(<Paytable />);
    expect(document.querySelectorAll('[data-payout-key]')).toHaveLength(6);
  });

  it.each([
    'seven-seven-seven',
    'bar-bar-bar',
    'bell-bell-bell',
    'lemon-lemon-lemon',
    'cherry-cherry-cherry',
    'two-cherry',
  ] as const)('row %s exists with correct multiple', (key) => {
    render(<Paytable />);
    const row = document.querySelector(`[data-payout-key="${key}"]`);
    expect(row).toBeInTheDocument();
    expect(row!.textContent).toContain(`${SLOTS_PAYTABLE[key]}`);
  });

  it('rows are sorted payout-descending (7-7-7 first, two-cherry last)', () => {
    render(<Paytable />);
    const rows = Array.from(document.querySelectorAll('[data-payout-key]'));
    expect(rows[0]!.getAttribute('data-payout-key')).toBe('seven-seven-seven');
    expect(rows[rows.length - 1]!.getAttribute('data-payout-key')).toBe('two-cherry');
  });

  it('renders a heading like "PAYOUT TABLE"', () => {
    render(<Paytable />);
    expect(screen.getByText(/payout table/i)).toBeInTheDocument();
  });
});
