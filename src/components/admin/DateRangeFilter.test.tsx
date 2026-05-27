import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import DateRangeFilter, { rangeToSinceMs, type RangePreset } from './DateRangeFilter';

/** Tiny harness so we can drive the controlled filter from tests without
 *  duplicating the useState dance in every case. */
function Harness({
  initial = 'all',
  storageKey,
}: {
  initial?: RangePreset;
  storageKey?: string;
}): JSX.Element {
  const [v, setV] = useState<RangePreset>(initial);
  return (
    <div>
      <DateRangeFilter value={v} onChange={setV} {...(storageKey ? { storageKey } : {})} />
      <span data-testid="current-value">{v}</span>
    </div>
  );
}

describe('DateRangeFilter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the four preset buttons with data-range attrs', () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-date-range-filter]')).not.toBeNull();
    expect(container.querySelector('[data-range="7d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="30d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="90d"]')).not.toBeNull();
    expect(container.querySelector('[data-range="all"]')).not.toBeNull();
  });

  it('fires onChange when a tab is clicked', () => {
    const { container } = render(<Harness />);
    const btn = container.querySelector('[data-range="7d"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(screen.getByTestId('current-value').textContent).toBe('7d');
  });

  it('marks the active tab via aria-selected', () => {
    const { container } = render(<Harness initial="30d" />);
    const active = container.querySelector('[data-range="30d"]') as HTMLButtonElement;
    expect(active.getAttribute('aria-selected')).toBe('true');
    const inactive = container.querySelector('[data-range="7d"]') as HTMLButtonElement;
    expect(inactive.getAttribute('aria-selected')).toBe('false');
  });

  it('hydrates from localStorage when storageKey is provided', () => {
    localStorage.setItem('admin.test.range', '90d');
    render(<Harness storageKey="admin.test.range" />);
    expect(screen.getByTestId('current-value').textContent).toBe('90d');
  });

  it('ignores a corrupt localStorage value and keeps the initial', () => {
    localStorage.setItem('admin.test.range', 'banana');
    render(<Harness initial="7d" storageKey="admin.test.range" />);
    expect(screen.getByTestId('current-value').textContent).toBe('7d');
  });

  it('persists the new value to localStorage on change', () => {
    const { container } = render(<Harness storageKey="admin.test.range" />);
    fireEvent.click(container.querySelector('[data-range="30d"]') as HTMLButtonElement);
    expect(localStorage.getItem('admin.test.range')).toBe('30d');
  });

  it('does not touch localStorage when storageKey is omitted', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { container } = render(<Harness />);
    fireEvent.click(container.querySelector('[data-range="7d"]') as HTMLButtonElement);
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });
});

describe('rangeToSinceMs', () => {
  const DAY_MS = 86_400_000;

  it('returns undefined for the "all" preset', () => {
    expect(rangeToSinceMs('all')).toBeUndefined();
  });

  it.each<[RangePreset, number]>([
    ['7d', 7],
    ['30d', 30],
    ['90d', 90],
  ])('returns Date.now() - %s*86_400_000 within 1s tolerance for "%s"', (preset, days) => {
    const now = Date.now();
    const got = rangeToSinceMs(preset);
    expect(got).toBeDefined();
    const expected = now - days * DAY_MS;
    expect(Math.abs((got as number) - expected)).toBeLessThan(1_000);
  });
});
