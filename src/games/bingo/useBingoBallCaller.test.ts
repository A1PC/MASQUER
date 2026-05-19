import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBingoBallCaller } from './useBingoBallCaller';

describe('useBingoBallCaller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not call when disabled', () => {
    const onCall = vi.fn();
    renderHook(() => useBingoBallCaller({ enabled: false, speed: 'normal', onCall }));
    vi.advanceTimersByTime(5000);
    expect(onCall).not.toHaveBeenCalled();
  });

  it('calls every 2s on normal speed', () => {
    const onCall = vi.fn();
    renderHook(() => useBingoBallCaller({ enabled: true, speed: 'normal', onCall }));
    vi.advanceTimersByTime(2000);
    expect(onCall).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(onCall).toHaveBeenCalledTimes(2);
  });

  it('calls every 1s on fast speed', () => {
    const onCall = vi.fn();
    renderHook(() => useBingoBallCaller({ enabled: true, speed: 'fast', onCall }));
    vi.advanceTimersByTime(1000);
    expect(onCall).toHaveBeenCalledTimes(1);
  });

  it('calls every 3s on slow speed', () => {
    const onCall = vi.fn();
    renderHook(() => useBingoBallCaller({ enabled: true, speed: 'slow', onCall }));
    vi.advanceTimersByTime(3000);
    expect(onCall).toHaveBeenCalledTimes(1);
  });

  it('stops calling after enabled flips to false', () => {
    const onCall = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useBingoBallCaller({ enabled, speed: 'fast', onCall }),
      { initialProps: { enabled: true } },
    );
    vi.advanceTimersByTime(1000);
    expect(onCall).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    vi.advanceTimersByTime(5000);
    expect(onCall).toHaveBeenCalledTimes(1);
  });
});
