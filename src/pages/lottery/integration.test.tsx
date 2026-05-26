import { describe, expect, it, beforeEach } from 'vitest';
import { buyTicket, settleMissedDraws, drawForDate } from '@/systems/lottery';
import { getUserMetrics } from '@/systems/stats';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('lottery → /stats integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('a winning lottery line writes a rounds row visible to getUserMetrics for the lottery scope', async () => {
    const r = await register({ username: 'winner', password: 'password123' });
    if (!r.ok) throw new Error();
    const date = '2026-05-19';
    const { mainNumbers, bonus } = drawForDate(date);
    // Line that matches all 6 main + bonus → guaranteed jackpot ('6' tier, 20M chips)
    // for this seeded date. Phase 15 #9 expanded Pick-5+1 → Pick-6+1.
    await buyTicket({
      userId: r.user.id,
      lines: [{ kind: 'manual', mainNumbers, bonusNumber: bonus }],
      now: new Date(2026, 4, 19, 12, 0, 0).getTime(),
    });
    await settleMissedDraws({ now: new Date(2026, 4, 19, 20, 30, 0).getTime() });
    const metrics = await getUserMetrics(r.user.id, 'lottery');
    expect(metrics.totalRounds).toBe(1);
    expect(metrics.totalWon).toBeGreaterThan(0);
    expect(metrics.netChange).toBeGreaterThan(0);
  });
});
