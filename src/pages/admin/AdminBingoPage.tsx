import type { JSX } from 'react';
import { useState } from 'react';
import { DIFFICULTY, BUY_IN, type Difficulty, type DifficultyConfig } from '@/games/bingo/logic';
import { useBingoConfigStore } from '@/store/bingoConfigStore';
import { resolveDifficulty } from '@/systems/bingoConfig';

/** Per-difficulty form state (all stored as strings so number inputs work naturally). */
interface DifficultyFormState {
  cpuCount: string;
  potMultiplier: string;
  cpuLatencyMin: string;
  cpuLatencyMax: string;
  forceManual: boolean;
  error: string | null;
  saved: boolean;
}

function configToForm(cfg: DifficultyConfig): DifficultyFormState {
  return {
    cpuCount: String(cfg.cpuCount),
    potMultiplier: String(cfg.potMultiplier),
    cpuLatencyMin: String(cfg.cpuLatencyMs[0]),
    cpuLatencyMax: String(cfg.cpuLatencyMs[1]),
    forceManual: cfg.forceManual,
    error: null,
    saved: false,
  };
}

function validateForm(
  form: DifficultyFormState,
): { ok: true; cfg: DifficultyConfig } | { ok: false; error: string } {
  const cpuCount = Number(form.cpuCount);
  const potMultiplier = Number(form.potMultiplier);
  const cpuLatencyMin = Number(form.cpuLatencyMin);
  const cpuLatencyMax = Number(form.cpuLatencyMax);

  if (!Number.isInteger(cpuCount) || cpuCount < 0)
    return { ok: false, error: 'CPU count must be a whole number ≥ 0' };
  if (!Number.isFinite(potMultiplier) || potMultiplier < 0)
    return { ok: false, error: 'Pot multiplier must be ≥ 0' };
  if (!Number.isInteger(cpuLatencyMin) || cpuLatencyMin < 0)
    return { ok: false, error: 'Min latency must be a whole number ≥ 0' };
  if (!Number.isInteger(cpuLatencyMax) || cpuLatencyMax < 0)
    return { ok: false, error: 'Max latency must be a whole number ≥ 0' };
  if (cpuLatencyMin > cpuLatencyMax)
    return { ok: false, error: 'Min latency must be ≤ Max latency' };

  return {
    ok: true,
    cfg: {
      cpuCount,
      potMultiplier,
      cpuLatencyMs: [cpuLatencyMin, cpuLatencyMax],
      forceManual: form.forceManual,
    },
  };
}

const DIFFICULTY_TITLES: Record<Difficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

interface DifficultyCardProps {
  difficulty: Difficulty;
  form: DifficultyFormState;
  onChange: (patch: Partial<DifficultyFormState>) => void;
  onSave: () => void;
  onReset: () => void;
}

function DifficultyCard({
  difficulty,
  form,
  onChange,
  onSave,
  onReset,
}: DifficultyCardProps): JSX.Element {
  const def = DIFFICULTY[difficulty];

  return (
    <div
      className="rounded border border-gold/30 bg-felt-deep p-5 flex flex-col gap-4"
      data-difficulty-card={difficulty}
    >
      <h2 className="font-display text-sm tracking-wider text-gold-bright">
        {DIFFICULTY_TITLES[difficulty]}
      </h2>

      <div className="flex flex-col gap-3">
        {/* CPU Count */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-white/60 mb-1">
            CPU Count
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.cpuCount}
            onChange={(e) => onChange({ cpuCount: e.target.value, error: null, saved: false })}
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
            aria-label={`${difficulty} CPU count`}
          />
          <p className="mt-0.5 text-[9px] text-white/30">Default: {def.cpuCount}</p>
        </div>

        {/* Pot Multiplier */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-white/60 mb-1">
            Pot Multiplier
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={form.potMultiplier}
            onChange={(e) => onChange({ potMultiplier: e.target.value, error: null, saved: false })}
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
            aria-label={`${difficulty} pot multiplier`}
          />
          <p className="mt-0.5 text-[9px] text-white/30">
            Default: {def.potMultiplier} (pot = {BUY_IN} × multiplier)
          </p>
        </div>

        {/* CPU Latency */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-white/60 mb-1">
            CPU Latency (ms)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              step={1}
              value={form.cpuLatencyMin}
              onChange={(e) =>
                onChange({ cpuLatencyMin: e.target.value, error: null, saved: false })
              }
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
              aria-label={`${difficulty} CPU latency min`}
            />
            <span className="text-white/40 text-xs shrink-0">to</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.cpuLatencyMax}
              onChange={(e) =>
                onChange({ cpuLatencyMax: e.target.value, error: null, saved: false })
              }
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-1.5 text-xs text-white focus:border-gold focus:outline-none"
              aria-label={`${difficulty} CPU latency max`}
            />
          </div>
          <p className="mt-0.5 text-[9px] text-white/30">
            Default: {def.cpuLatencyMs[0]}–{def.cpuLatencyMs[1]} ms
          </p>
        </div>

        {/* Force Manual */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.forceManual}
              onChange={(e) =>
                onChange({ forceManual: e.target.checked, error: null, saved: false })
              }
              className="rounded"
              aria-label={`${difficulty} force manual daub`}
            />
            <span className="text-xs text-white/70">Force manual daub</span>
          </label>
          <p className="mt-0.5 ml-6 text-[9px] text-white/30">
            Default: {def.forceManual ? 'yes' : 'no'}
          </p>
        </div>
      </div>

      {form.error !== null && (
        <p className="text-[10px] text-casino-red" role="alert">
          {form.error}
        </p>
      )}

      {form.saved && (
        <p className="text-[10px] text-chip-win" aria-live="polite">
          Saved — applies to the next game.
        </p>
      )}

      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded border border-gold bg-gold/20 px-3 py-2 font-display text-[11px] tracking-wider text-gold-bright hover:bg-gold/30 transition"
        >
          SAVE
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded border border-white/20 px-3 py-2 font-display text-[11px] tracking-wider text-white/60 hover:border-white/50 hover:text-white transition"
        >
          RESET TO DEFAULT
        </button>
      </div>
    </div>
  );
}

/** Inner component that owns local form state; keyed on hydration to reset when overrides load. */
function AdminBingoForm(): JSX.Element {
  const overrides = useBingoConfigStore((s) => s.overrides);
  const saveDifficulty = useBingoConfigStore((s) => s.saveDifficulty);
  const resetDifficulty = useBingoConfigStore((s) => s.resetDifficulty);

  // Initialize form from resolved configs (store already hydrated at this point
  // because AppBootstrap runs hydrateBingoConfig on mount before routing resolves).
  const [forms, setForms] = useState<Record<Difficulty, DifficultyFormState>>(() => ({
    easy: configToForm(resolveDifficulty('easy', overrides.easy)),
    medium: configToForm(resolveDifficulty('medium', overrides.medium)),
    hard: configToForm(resolveDifficulty('hard', overrides.hard)),
  }));

  function patchForm(d: Difficulty, patch: Partial<DifficultyFormState>): void {
    setForms((prev) => ({
      ...prev,
      [d]: { ...prev[d], ...patch },
    }));
  }

  async function handleSave(d: Difficulty): Promise<void> {
    const result = validateForm(forms[d]);
    if (!result.ok) {
      patchForm(d, { error: result.error, saved: false });
      return;
    }
    await saveDifficulty(d, result.cfg);
    patchForm(d, { error: null, saved: true });
  }

  async function handleReset(d: Difficulty): Promise<void> {
    await resetDifficulty(d);
    setForms((prev) => ({
      ...prev,
      [d]: configToForm(DIFFICULTY[d]),
    }));
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {DIFFICULTIES.map((d) => (
        <DifficultyCard
          key={d}
          difficulty={d}
          form={forms[d]}
          onChange={(patch) => patchForm(d, patch)}
          onSave={() => void handleSave(d)}
          onReset={() => void handleReset(d)}
        />
      ))}
    </div>
  );
}

export default function AdminBingoPage(): JSX.Element {
  const hydrated = useBingoConfigStore((s) => s.hydrated);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-base tracking-wider text-gold-bright">BINGO CONFIG</h1>
      <p className="text-[11px] text-white/50">
        Override per-difficulty parameters. Changes apply to the next game started — in-progress
        games are unaffected. Leave at defaults if unsure.
      </p>

      {/* Key on hydrated so the form remounts with correct initial values
          if the store hydrates after this page first renders. */}
      <AdminBingoForm key={hydrated ? 'hydrated' : 'pending'} />
    </div>
  );
}
