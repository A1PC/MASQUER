import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy classes', () => {
    const skip = false;
    expect(cn('a', skip && 'b', 'c')).toBe('a c');
  });
  it('later tailwind class wins on conflict (tailwind-merge)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
