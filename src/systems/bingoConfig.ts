import { db, type BingoConfigRow } from '@/db';
import { DIFFICULTY, type Difficulty, type DifficultyConfig } from '@/games/bingo/logic';

export type DifficultyOverride = Partial<DifficultyConfig>;

/** Resolves the effective config for a difficulty: defaults overlaid with the override. */
export function resolveDifficulty(
  d: Difficulty,
  override: DifficultyOverride | null,
): DifficultyConfig {
  const base = DIFFICULTY[d];
  if (!override) return base;
  return {
    cpuCount: override.cpuCount ?? base.cpuCount,
    potMultiplier: override.potMultiplier ?? base.potMultiplier,
    cpuLatencyMs: override.cpuLatencyMs ?? base.cpuLatencyMs,
    forceManual: override.forceManual ?? base.forceManual,
  };
}

/** Load all rows from Dexie and return as a map keyed by difficulty. */
export async function loadAllOverrides(): Promise<Record<Difficulty, DifficultyOverride | null>> {
  const rows = await db.bingoConfig.toArray();
  const out: Record<Difficulty, DifficultyOverride | null> = {
    easy: null,
    medium: null,
    hard: null,
  };
  for (const row of rows) {
    out[row.difficulty] = rowToOverride(row);
  }
  return out;
}

export async function saveOverride(d: Difficulty, cfg: DifficultyConfig): Promise<void> {
  const row: BingoConfigRow = {
    difficulty: d,
    cpuCount: cfg.cpuCount,
    potMultiplier: cfg.potMultiplier,
    cpuLatencyMin: cfg.cpuLatencyMs[0],
    cpuLatencyMax: cfg.cpuLatencyMs[1],
    forceManual: cfg.forceManual,
  };
  await db.bingoConfig.put(row);
}

export async function deleteOverride(d: Difficulty): Promise<void> {
  await db.bingoConfig.delete(d);
}

function rowToOverride(row: BingoConfigRow): DifficultyOverride {
  return {
    cpuCount: row.cpuCount,
    potMultiplier: row.potMultiplier,
    cpuLatencyMs: [row.cpuLatencyMin, row.cpuLatencyMax],
    forceManual: row.forceManual,
  };
}
