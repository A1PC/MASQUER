import type { JSX } from 'react';
import {
  BUY_IN,
  VARIANTS,
  type BingoSpeed,
  type Difficulty,
  type DifficultyConfig,
  type Variant,
} from './logic';

interface Props {
  variant: Variant;
  difficulty: Difficulty;
  speed: BingoSpeed;
  daubMode: 'auto' | 'manual';
  balance: number;
  /** Resolved per-difficulty configs (admin overrides merged with code defaults). */
  resolvedConfigs: Record<Difficulty, DifficultyConfig>;
  onDifficultyChange: (d: Difficulty) => void;
  onSpeedChange: (s: BingoSpeed) => void;
  onDaubModeChange: (m: 'auto' | 'manual') => void;
  onBuyAndStart: () => void;
}

const SPEED_LABELS: Record<BingoSpeed, string> = {
  slow: 'Slow (3s)',
  normal: 'Normal (2s)',
  fast: 'Fast (1s)',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

const VARIANT_HEADERS: Record<Variant, string> = {
  british: '🇬🇧 British 90-Ball',
  american: '🇺🇸 American 75-Ball',
};

export default function SetupPanel({
  variant,
  difficulty,
  speed,
  daubMode,
  balance,
  resolvedConfigs,
  onDifficultyChange,
  onSpeedChange,
  onDaubModeChange,
  onBuyAndStart,
}: Props): JSX.Element {
  const canAfford = balance >= BUY_IN;
  const cfg = resolvedConfigs[difficulty];
  const effectiveDaubMode = cfg.forceManual ? 'manual' : daubMode;

  return (
    <div
      className="flex flex-col gap-4 rounded-md border border-brass/60 bg-velvet-deep p-6 text-ivory"
      data-setup-panel
    >
      <h2 className="font-display text-base tracking-[0.18em] text-gold-bright">
        {VARIANT_HEADERS[variant]}
      </h2>
      <p className="text-[10px] text-ivory/55">
        {VARIANTS[variant].tier1Label} &rarr; {VARIANTS[variant].tier2Label} &rarr;{' '}
        {VARIANTS[variant].tier3Label}
      </p>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold-bright">
          DIFFICULTY
        </h3>
        <div role="radiogroup" aria-label="Difficulty" className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const dcfg = resolvedConfigs[d];
            const selected = difficulty === d;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onDifficultyChange(d)}
                className={`min-h-[44px] rounded-md border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
                  selected ? 'border-brass bg-gold/20' : 'border-brass/40 hover:border-brass'
                }`}
              >
                <div
                  className={`font-display text-sm ${selected ? 'text-gold-bright' : 'text-ivory'}`}
                >
                  {DIFFICULTY_LABELS[d]}
                </div>
                <div className="mt-1 text-[9px] text-ivory/60">
                  {dcfg.cpuCount} CPU{dcfg.cpuCount !== 1 ? 's' : ''}
                </div>
                <div className="mt-1 text-[10px] tabular-nums text-gold-bright">
                  Pot {BUY_IN * dcfg.potMultiplier}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold-bright">SPEED</h3>
        <div role="radiogroup" aria-label="Call speed" className="flex gap-2">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => onSpeedChange(s)}
              className={[
                'min-h-[44px] flex-1 rounded-md border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass',
                speed === s
                  ? 'border-brass bg-gold text-velvet-deep'
                  : 'border-brass/40 bg-felt-table-deep text-ivory/70 hover:border-brass',
              ].join(' ')}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold-bright">
          DAUB MODE
        </h3>
        <div role="radiogroup" aria-label="Daub mode" className="flex gap-2">
          {(['auto', 'manual'] as const).map((m) => {
            const selected = effectiveDaubMode === m;
            const disabled = cfg.forceManual && m === 'auto';
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => !disabled && onDaubModeChange(m)}
                {...(disabled ? { title: 'This difficulty requires manual daub' } : {})}
                className={[
                  'min-h-[44px] flex-1 rounded-md border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass',
                  disabled
                    ? 'cursor-not-allowed border-brass/30 text-ivory/30 opacity-40'
                    : selected
                      ? 'border-brass bg-gold text-velvet-deep'
                      : 'border-brass/40 bg-felt-table-deep text-ivory/70 hover:border-brass',
                ].join(' ')}
              >
                {m === 'auto' ? 'AUTO' : 'MANUAL'}
              </button>
            );
          })}
        </div>
        {cfg.forceManual && (
          <p className="mt-1 text-[10px] text-gold-bright/70">
            This difficulty requires manual daub.
          </p>
        )}
      </section>

      <section className="flex items-center justify-between text-xs">
        <span className="text-ivory/60">Buy-in</span>
        <span className="font-display tabular-nums text-gold-bright">{BUY_IN} chips</span>
      </section>
      <section className="flex items-center justify-between text-xs">
        <span className="text-ivory/60">Win up to</span>
        <span className="font-display tabular-nums text-gold-bright">
          {BUY_IN * cfg.potMultiplier} chips
        </span>
      </section>
      <section className="flex items-center justify-between text-xs">
        <span className="text-ivory/60">Balance</span>
        <span className="font-display tabular-nums text-ivory">
          {balance.toLocaleString()} chips
        </span>
      </section>

      <button
        type="button"
        onClick={onBuyAndStart}
        disabled={!canAfford}
        className="mt-2 min-h-[44px] w-full rounded-md border-2 border-brass bg-velvet py-3 font-display text-sm tracking-[0.18em] text-gold-bright hover:bg-velvet-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY &amp; PLAY ({BUY_IN})
      </button>
      {!canAfford && (
        <p className="text-center text-[10px] text-state-loss">Not enough chips (need {BUY_IN})</p>
      )}
    </div>
  );
}
