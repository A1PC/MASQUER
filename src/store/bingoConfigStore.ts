import { create } from 'zustand';
import type { Difficulty, DifficultyConfig } from '@/games/bingo/logic';
import {
  type DifficultyOverride,
  loadAllOverrides,
  saveOverride,
  deleteOverride,
} from '@/systems/bingoConfig';

interface BingoConfigState {
  overrides: Record<Difficulty, DifficultyOverride | null>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  saveDifficulty: (d: Difficulty, cfg: DifficultyConfig) => Promise<void>;
  resetDifficulty: (d: Difficulty) => Promise<void>;
}

export const useBingoConfigStore = create<BingoConfigState>((set) => ({
  overrides: { easy: null, medium: null, hard: null },
  hydrated: false,

  hydrate: async () => {
    const overrides = await loadAllOverrides();
    set({ overrides, hydrated: true });
  },

  saveDifficulty: async (d, cfg) => {
    await saveOverride(d, cfg);
    set((s) => ({
      overrides: {
        ...s.overrides,
        [d]: {
          cpuCount: cfg.cpuCount,
          potMultiplier: cfg.potMultiplier,
          cpuLatencyMs: cfg.cpuLatencyMs,
          forceManual: cfg.forceManual,
        },
      },
    }));
  },

  resetDifficulty: async (d) => {
    await deleteOverride(d);
    set((s) => ({ overrides: { ...s.overrides, [d]: null } }));
  },
}));
