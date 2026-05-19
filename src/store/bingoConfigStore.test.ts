import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDb } from '@/test/db-helpers';
import { DIFFICULTY } from '@/games/bingo/logic';
import { useBingoConfigStore } from './bingoConfigStore';

beforeEach(async () => {
  await resetDb();
  useBingoConfigStore.setState({
    overrides: { easy: null, medium: null, hard: null },
    hydrated: false,
  });
});

afterEach(async () => {
  await resetDb();
});

describe('bingoConfigStore', () => {
  it('initial state has all overrides null and hydrated=false', () => {
    const s = useBingoConfigStore.getState();
    expect(s.overrides.easy).toBeNull();
    expect(s.overrides.medium).toBeNull();
    expect(s.overrides.hard).toBeNull();
    expect(s.hydrated).toBe(false);
  });

  it('hydrate with empty DB keeps all overrides null and sets hydrated=true', async () => {
    await useBingoConfigStore.getState().hydrate();
    const s = useBingoConfigStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.overrides.easy).toBeNull();
    expect(s.overrides.medium).toBeNull();
    expect(s.overrides.hard).toBeNull();
  });

  it('saveDifficulty persists to DB and updates store state', async () => {
    const cfg = {
      cpuCount: 12,
      potMultiplier: 5,
      cpuLatencyMs: [50, 200] as const,
      forceManual: false,
    };
    await useBingoConfigStore.getState().saveDifficulty('easy', cfg);
    const s = useBingoConfigStore.getState();
    expect(s.overrides.easy).toEqual({
      cpuCount: 12,
      potMultiplier: 5,
      cpuLatencyMs: [50, 200],
      forceManual: false,
    });
    // Verify persisted by hydrating fresh state.
    useBingoConfigStore.setState({
      overrides: { easy: null, medium: null, hard: null },
      hydrated: false,
    });
    await useBingoConfigStore.getState().hydrate();
    expect(useBingoConfigStore.getState().overrides.easy!.cpuCount).toBe(12);
  });

  it('resetDifficulty deletes from DB and sets override to null', async () => {
    await useBingoConfigStore.getState().saveDifficulty('medium', {
      cpuCount: 7,
      potMultiplier: 4,
      cpuLatencyMs: [100, 250] as const,
      forceManual: false,
    });
    expect(useBingoConfigStore.getState().overrides.medium).not.toBeNull();
    await useBingoConfigStore.getState().resetDifficulty('medium');
    expect(useBingoConfigStore.getState().overrides.medium).toBeNull();
    // Verify persisted deletion.
    useBingoConfigStore.setState({
      overrides: { easy: null, medium: null, hard: null },
      hydrated: false,
    });
    await useBingoConfigStore.getState().hydrate();
    expect(useBingoConfigStore.getState().overrides.medium).toBeNull();
  });

  it('saving one difficulty does not affect others', async () => {
    await useBingoConfigStore.getState().saveDifficulty('hard', {
      cpuCount: 20,
      potMultiplier: 10,
      cpuLatencyMs: [0, 0] as const,
      forceManual: true,
    });
    const s = useBingoConfigStore.getState();
    expect(s.overrides.easy).toBeNull();
    expect(s.overrides.medium).toBeNull();
    expect(s.overrides.hard!.cpuCount).toBe(20);
  });

  it('hydrate picks up previously saved overrides', async () => {
    // Save directly without going through store (simulates a previous session).
    const { saveOverride } = await import('@/systems/bingoConfig');
    await saveOverride('medium', {
      cpuCount: 3,
      potMultiplier: 3,
      cpuLatencyMs: [0, 50] as const,
      forceManual: false,
    });
    await useBingoConfigStore.getState().hydrate();
    expect(useBingoConfigStore.getState().overrides.medium!.cpuCount).toBe(3);
  });

  it('DIFFICULTY defaults are accessible via DIFFICULTY constant as fallback', () => {
    // Sanity check that code defaults are still available.
    expect(DIFFICULTY.easy.cpuCount).toBe(2);
    expect(DIFFICULTY.medium.cpuCount).toBe(5);
    expect(DIFFICULTY.hard.cpuCount).toBe(9);
  });
});
