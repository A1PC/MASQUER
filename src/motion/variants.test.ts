import { describe, it, expect } from 'vitest';
import type { Variants, Variant } from 'framer-motion';
import {
  EASE_OUT,
  EASE_IN,
  fadeIn,
  scaleIn,
  slideUp,
  slideInRight,
  staggerContainer,
  staggerItem,
} from './variants';

/** Pull the `duration` (seconds) out of a variant's inline `transition`. */
function durationOf(variant: Variant | undefined): number | undefined {
  if (!variant || typeof variant === 'function') return undefined;
  const t = variant.transition;
  return typeof t?.duration === 'number' ? t.duration : undefined;
}

const animatedVariants: Array<[string, Variants]> = [
  ['fadeIn', fadeIn],
  ['scaleIn', scaleIn],
  ['slideUp', slideUp],
  ['slideInRight', slideInRight],
];

describe('motion variants', () => {
  it.each(animatedVariants)('%s exposes hidden + visible states', (_name, variant) => {
    expect(variant).toHaveProperty('hidden');
    expect(variant).toHaveProperty('visible');
  });

  it.each(animatedVariants)('%s exits faster than it enters', (_name, variant) => {
    const enter = durationOf(variant.visible);
    const exit = durationOf(variant.exit);
    expect(enter).toBeDefined();
    expect(exit).toBeDefined();
    // The "exit faster" rule: exit should be shorter than enter (~70%).
    expect(exit as number).toBeLessThan(enter as number);
  });

  it('shared easing tokens stay within the 150–300ms enter / shorter exit window', () => {
    expect(EASE_OUT.duration).toBeGreaterThanOrEqual(0.15);
    expect(EASE_OUT.duration).toBeLessThanOrEqual(0.3);
    expect(EASE_IN.duration).toBeLessThan(EASE_OUT.duration as number);
  });

  it('staggerContainer drives child stagger and staggerItem reuses slideUp', () => {
    const visible = staggerContainer.visible;
    expect(typeof visible === 'object' && visible?.transition).toMatchObject({
      staggerChildren: 0.04,
    });
    expect(staggerItem).toBe(slideUp);
  });
});
