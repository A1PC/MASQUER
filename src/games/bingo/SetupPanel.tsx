import type { JSX } from 'react';
import {
  BUY_IN,
  DIFFICULTY,
  VARIANTS,
  potFor,
  type BingoSpeed,
  type Difficulty,
  type Variant,
} from './logic';

interface Props {
  variant: Variant;
  difficulty: Difficulty;
  speed: BingoSpeed;
  daubMode: 'auto' | 'manual';
  balance: number;
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

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, { label: string; sub: string }> = {
  easy: { label: 'EASY', sub: '2 CPUs · slow' },
  medium: { label: 'MEDIUM', sub: '5 CPUs · fast' },
  hard: { label: 'HARD', sub: '9 CPUs · instant' },
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
  onDifficultyChange,
  onSpeedChange,
  onDaubModeChange,
  onBuyAndStart,
}: Props): JSX.Element {
  const canAfford = balance >= BUY_IN;
  const cfg = DIFFICULTY[difficulty];
  const effectiveDaubMode = cfg.forceManual ? 'manual' : daubMode;

  return (
    <div
      className="flex flex-col gap-4 rounded border border-gold/30 bg-felt-deep p-6"
      data-setup-panel
    >
      <h2 className="font-display text-base tracking-wider text-gold-bright">
        {VARIANT_HEADERS[variant]}
      </h2>
      <p className="text-[10px] text-white/50">
        {VARIANTS[variant].tier1Label} → {VARIANTS[variant].tier2Label} →{' '}
        {VARIANTS[variant].tier3Label}
      </p>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">DIFFICULTY</h3>
        <div role="radiogroup" aria-label="Difficulty" className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const info = DIFFICULTY_DESCRIPTIONS[d];
            const selected = difficulty === d;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onDifficultyChange(d)}
                className={`rounded-md border p-3 text-center transition ${selected ? 'border-gold bg-gold/20' : 'border-white/20 hover:border-gold/60'}`}
              >
                <div
                  className={`font-display text-sm ${selected ? 'text-gold-bright' : 'text-white'}`}
                >
                  {info.label}
                </div>
                <div className="text-[9px] text-white/60 mt-1">{info.sub}</div>
                <div className="text-[10px] text-gold-bright tabular-nums mt-1">
                  Pot {potFor(d)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">SPEED</h3>
        <div role="radiogroup" aria-label="Call speed" className="flex gap-2">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => onSpeedChange(s)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs',
                speed === s
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">DAUB MODE</h3>
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
                {...(disabled ? { title: 'Hard difficulty requires manual daub' } : {})}
                className={[
                  'flex-1 rounded-md border px-3 py-2 text-xs',
                  disabled
                    ? 'opacity-40 cursor-not-allowed border-white/20 text-white/30'
                    : selected
                      ? 'border-gold bg-gold text-felt-deep'
                      : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
                ].join(' ')}
              >
                {m === 'auto' ? 'AUTO' : 'MANUAL'}
              </button>
            );
          })}
        </div>
        {cfg.forceManual && (
          <p className="mt-1 text-[10px] text-gold/70">Hard difficulty requires manual daub.</p>
        )}
      </section>

      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Buy-in</span>
        <span className="font-display tabular-nums text-gold-bright">{BUY_IN} chips</span>
      </section>
      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Win up to</span>
        <span className="font-display tabular-nums text-gold-bright">
          {potFor(difficulty)} chips
        </span>
      </section>
      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Balance</span>
        <span className="font-display tabular-nums text-white">
          {balance.toLocaleString()} chips
        </span>
      </section>

      <button
        type="button"
        onClick={onBuyAndStart}
        disabled={!canAfford}
        className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY &amp; PLAY ({BUY_IN})
      </button>
      {!canAfford && (
        <p className="text-center text-[10px] text-casino-red">Not enough chips (need {BUY_IN})</p>
      )}
    </div>
  );
}
