import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db';
import { DIFFICULTY } from '@/games/bingo/logic';
import { resolveDifficulty, loadAllOverrides, saveOverride, deleteOverride } from './bingoConfig';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('resolveDifficulty', () => {
  it('returns the base config when override is null', () => {
    const result = resolveDifficulty('easy', null);
    expect(result).toEqual(DIFFICULTY.easy);
  });

  it('merges a partial override over the base', () => {
    const result = resolveDifficulty('easy', { cpuCount: 10 });
    expect(result.cpuCount).toBe(10);
    expect(result.potMultiplier).toBe(DIFFICULTY.easy.potMultiplier);
    expect(result.cpuLatencyMs).toEqual(DIFFICULTY.easy.cpuLatencyMs);
    expect(result.forceManual).toBe(DIFFICULTY.easy.forceManual);
  });

  it('applies all fields from a full override', () => {
    const override = {
      cpuCount: 20,
      potMultiplier: 10,
      cpuLatencyMs: [50, 150] as const,
      forceManual: true,
    };
    const result = resolveDifficulty('medium', override);
    expect(result.cpuCount).toBe(20);
    expect(result.potMultiplier).toBe(10);
    expect(result.cpuLatencyMs).toEqual([50, 150]);
    expect(result.forceManual).toBe(true);
  });

  it('works for hard difficulty with null override', () => {
    const result = resolveDifficulty('hard', null);
    expect(result).toEqual(DIFFICULTY.hard);
  });
});

describe('saveOverride + loadAllOverrides', () => {
  it('round-trips a single difficulty', async () => {
    const cfg = {
      cpuCount: 15,
      potMultiplier: 6,
      cpuLatencyMs: [100, 300] as const,
      forceManual: false,
    };
    await saveOverride('easy', cfg);
    const overrides = await loadAllOverrides();
    expect(overrides.easy).toEqual({
      cpuCount: 15,
      potMultiplier: 6,
      cpuLatencyMs: [100, 300],
      forceManual: false,
    });
    expect(overrides.medium).toBeNull();
    expect(overrides.hard).toBeNull();
  });

  it('round-trips all three difficulties', async () => {
    await saveOverride('easy', {
      cpuCount: 1,
      potMultiplier: 1,
      cpuLatencyMs: [0, 100] as const,
      forceManual: false,
    });
    await saveOverride('medium', {
      cpuCount: 7,
      potMultiplier: 5,
      cpuLatencyMs: [50, 200] as const,
      forceManual: false,
    });
    await saveOverride('hard', {
      cpuCount: 20,
      potMultiplier: 12,
      cpuLatencyMs: [0, 0] as const,
      forceManual: true,
    });
    const overrides = await loadAllOverrides();
    expect(overrides.easy!.cpuCount).toBe(1);
    expect(overrides.medium!.cpuCount).toBe(7);
    expect(overrides.hard!.cpuCount).toBe(20);
    expect(overrides.hard!.forceManual).toBe(true);
  });

  it('returns all-null map when no overrides exist', async () => {
    const overrides = await loadAllOverrides();
    expect(overrides.easy).toBeNull();
    expect(overrides.medium).toBeNull();
    expect(overrides.hard).toBeNull();
  });

  it('overwrites an existing row with put', async () => {
    await saveOverride('easy', {
      cpuCount: 5,
      potMultiplier: 2,
      cpuLatencyMs: [0, 100] as const,
      forceManual: false,
    });
    await saveOverride('easy', {
      cpuCount: 99,
      potMultiplier: 2,
      cpuLatencyMs: [0, 100] as const,
      forceManual: false,
    });
    const overrides = await loadAllOverrides();
    expect(overrides.easy!.cpuCount).toBe(99);
  });
});

describe('deleteOverride', () => {
  it('removes the row so the difficulty returns null', async () => {
    await saveOverride('medium', {
      cpuCount: 3,
      potMultiplier: 3,
      cpuLatencyMs: [50, 100] as const,
      forceManual: false,
    });
    await deleteOverride('medium');
    const overrides = await loadAllOverrides();
    expect(overrides.medium).toBeNull();
  });

  it('is a no-op when the row does not exist', async () => {
    await expect(deleteOverride('hard')).resolves.toBeUndefined();
  });
});
