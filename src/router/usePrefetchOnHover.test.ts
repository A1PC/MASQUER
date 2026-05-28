import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  registerPrefetcher,
  usePrefetchOnHover,
  __resetPrefetchRegistryForTests,
} from './usePrefetchOnHover';

beforeEach(() => __resetPrefetchRegistryForTests());

describe('usePrefetchOnHover', () => {
  it('returns no-op handlers when no prefetcher is registered for the key', () => {
    const { result } = renderHook(() => usePrefetchOnHover('missing'));
    expect(() => result.current.onMouseEnter()).not.toThrow();
    expect(() => result.current.onFocus()).not.toThrow();
  });

  it('invokes the registered prefetcher exactly once across repeated hovers', () => {
    const fn = vi.fn(() => new Promise<unknown>(() => {})); // never resolves
    registerPrefetcher('coin-flip', fn);
    const { result } = renderHook(() => usePrefetchOnHover('coin-flip'));
    result.current.onMouseEnter();
    result.current.onMouseEnter();
    result.current.onMouseEnter();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('treats onFocus and onMouseEnter as equivalent triggers', () => {
    const fn = vi.fn(() => new Promise<unknown>(() => {}));
    registerPrefetcher('blackjack', fn);
    const { result } = renderHook(() => usePrefetchOnHover('blackjack'));
    result.current.onFocus();
    expect(fn).toHaveBeenCalledTimes(1);
    // Second trigger via mouseenter is suppressed (already in flight).
    result.current.onMouseEnter();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clears the inflight flag if the import rejects, so a retry can happen', async () => {
    let rejecter: (reason?: unknown) => void = () => {};
    const fn = vi.fn(
      () =>
        new Promise<unknown>((_, reject) => {
          rejecter = reject;
        }),
    );
    registerPrefetcher('roulette', fn);
    const { result } = renderHook(() => usePrefetchOnHover('roulette'));
    result.current.onMouseEnter();
    expect(fn).toHaveBeenCalledTimes(1);
    rejecter(new Error('chunk load failure'));
    // Drain the microtask queue so the .catch runs before we re-trigger.
    await Promise.resolve();
    result.current.onMouseEnter();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
