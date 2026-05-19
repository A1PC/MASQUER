import { describe, expect, it } from 'vitest';
import {
  formatChips,
  formatSignedChips,
  formatPercent,
  formatDuration,
  formatDate,
} from './formatters';

describe('formatChips', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [1234, '1,234'],
    [1_000_000, '1,000,000'],
  ])('%i → %s', (n, expected) => {
    expect(formatChips(n)).toBe(expected);
  });

  it('rounds non-integer input', () => {
    expect(formatChips(1234.7)).toBe('1,235');
  });
});

describe('formatSignedChips', () => {
  it.each([
    [0, '0'],
    [100, '+100'],
    [-50, '-50'],
    [1234, '+1,234'],
    [-1234, '-1,234'],
  ])('%i → %s', (n, expected) => {
    expect(formatSignedChips(n)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('null → "—"', () => expect(formatPercent(null)).toBe('—'));
  it('98.234 → "98.2%"', () => expect(formatPercent(98.234)).toBe('98.2%'));
  it('0 → "0.0%"', () => expect(formatPercent(0)).toBe('0.0%'));
  it('100 → "100.0%"', () => expect(formatPercent(100)).toBe('100.0%'));
});

describe('formatDuration', () => {
  it('0 → "0s"', () => expect(formatDuration(0)).toBe('0s'));
  it('500 → "0s"', () => expect(formatDuration(500)).toBe('0s'));
  it('5000 → "5s"', () => expect(formatDuration(5000)).toBe('5s'));
  it('65_000 → "1m 5s"', () => expect(formatDuration(65_000)).toBe('1m 5s'));
  it('3725_000 → "1h 2m"', () => expect(formatDuration(3_725_000)).toBe('1h 2m'));
});

describe('formatDate', () => {
  it('null → "—"', () => expect(formatDate(null)).toBe('—'));
  it('epoch 0 → "1970-01-01"', () => expect(formatDate(0)).toBe('1970-01-01'));
});
