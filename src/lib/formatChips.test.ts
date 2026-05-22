import { describe, it, expect } from 'vitest';
import { formatChips } from './formatChips';

describe('formatChips', () => {
  it('uses comma thousands (never full stops)', () => {
    expect(formatChips(1000)).toBe('1,000');
    expect(formatChips(1_000_000)).toBe('1,000,000');
  });
  it('rounds non-integers', () => {
    expect(formatChips(999.7)).toBe('1,000');
  });
  it('handles zero + negatives', () => {
    expect(formatChips(0)).toBe('0');
    expect(formatChips(-250)).toBe('-250');
  });
});
