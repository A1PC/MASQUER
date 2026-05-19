import { useCallback, useMemo, useState } from 'react';
import { lineKey } from '@/systems/lottery';
import type { CartLine } from './TicketCart';

export interface UseLotteryCart {
  lines: CartLine[];
  addManual: (line: {
    mainNumbers: number[];
    bonusNumber: number;
  }) => { ok: true } | { ok: false; error: string };
  addLuckyDip: () => void;
  removeLine: (index: number) => void;
  clear: () => void;
  duplicateError: string | null;
}

export function useLotteryCart(): UseLotteryCart {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addManual = useCallback(
    (line: {
      mainNumbers: number[];
      bonusNumber: number;
    }): { ok: true } | { ok: false; error: string } => {
      const key = lineKey(line);
      const existingManualKeys = lines
        .filter((l): l is Extract<CartLine, { kind: 'manual' }> => l.kind === 'manual')
        .map(lineKey);
      if (existingManualKeys.includes(key)) {
        return { ok: false, error: 'This line is already on the ticket.' };
      }
      setLines((cur) => [...cur, { kind: 'manual', ...line }]);
      return { ok: true };
    },
    [lines],
  );

  const addLuckyDip = useCallback(() => {
    setLines((cur) => [...cur, { kind: 'lucky-dip' }]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // For the UI's BUY-disabled banner — only manual-vs-manual collisions are detectable
  // pre-purchase. Lucky-dip collisions are caught + retried at buy time.
  const duplicateError = useMemo(() => {
    const seen = new Set<string>();
    for (const line of lines) {
      if (line.kind !== 'manual') continue;
      const key = lineKey(line);
      if (seen.has(key)) return 'Two of your lines are identical — remove one.';
      seen.add(key);
    }
    return null;
  }, [lines]);

  return { lines, addManual, addLuckyDip, removeLine, clear, duplicateError };
}
