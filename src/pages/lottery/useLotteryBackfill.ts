import { useEffect, useState } from 'react';
import { settleMissedDraws } from '@/systems/lottery';
import type { LotteryDraw } from '@/db';

/** Drives the strict-clock backfill. Runs once on mount; idempotent. */
export function useLotteryBackfill(): { freshDraws: LotteryDraw[]; loading: boolean } {
  const [freshDraws, setFreshDraws] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await settleMissedDraws();
      if (cancelled) return;
      setFreshDraws(result.freshDraws);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { freshDraws, loading };
}
