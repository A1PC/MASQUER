import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLotteryCart } from './useLotteryCart';

describe('useLotteryCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useLotteryCart());
    expect(result.current.lines).toEqual([]);
    expect(result.current.duplicateError).toBeNull();
  });

  it('addManual appends a manual line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      const r = result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      expect(r).toEqual({ ok: true });
    });
    expect(result.current.lines).toHaveLength(1);
  });

  it('addManual rejects a duplicate of an existing manual line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
    });
    let second: ReturnType<typeof result.current.addManual>;
    act(() => {
      second = result.current.addManual({ mainNumbers: [5, 4, 3, 2, 1], bonusNumber: 1 });
    });
    expect(second!).toMatchObject({ ok: false });
    expect(result.current.lines).toHaveLength(1);
  });

  it('addLuckyDip appends a placeholder', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => result.current.addLuckyDip());
    act(() => result.current.addLuckyDip());
    expect(result.current.lines.filter((l) => l.kind === 'lucky-dip')).toHaveLength(2);
  });

  it('removeLine removes the indexed line', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      result.current.addLuckyDip();
      result.current.addManual({ mainNumbers: [6, 7, 8, 9, 10], bonusNumber: 2 });
    });
    act(() => result.current.removeLine(1));
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.lines.every((l) => l.kind === 'manual')).toBe(true);
  });

  it('clear empties the cart', () => {
    const { result } = renderHook(() => useLotteryCart());
    act(() => {
      result.current.addManual({ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 });
      result.current.addLuckyDip();
    });
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });
});
