import type { JSX } from 'react';

interface Props {
  /** Currently selected main numbers (any order). Length 0..5. */
  mainSelected: number[];
  /** Currently selected bonus number, or null. */
  bonusSelected: number | null;
  /** Called when a main number cell is clicked. Parent must enforce length cap of 5. */
  onMainToggle: (n: number) => void;
  /** Called when a bonus cell is clicked. Parent enforces single-selection. */
  onBonusSelect: (n: number) => void;
}

const MAIN_NUMBERS = Array.from({ length: 50 }, (_, i) => i + 1);
const BONUS_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function NumberGrid({
  mainSelected,
  bonusSelected,
  onMainToggle,
  onBonusSelect,
}: Props): JSX.Element {
  const mainSet = new Set(mainSelected);
  const mainFull = mainSelected.length === 5;
  return (
    <div className="flex flex-col gap-4" data-number-grid>
      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          MAIN NUMBERS — pick 5
        </h3>
        <div className="grid grid-cols-10 gap-1.5">
          {MAIN_NUMBERS.map((n) => {
            const selected = mainSet.has(n);
            const disabled = !selected && mainFull;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`Main number ${n}`}
                disabled={disabled}
                onClick={() => onMainToggle(n)}
                className={[
                  'h-9 rounded-full border text-xs tabular-nums transition',
                  selected
                    ? 'border-gold bg-gold text-felt-deep'
                    : disabled
                      ? 'border-white/10 bg-felt-deep/40 text-white/20'
                      : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold hover:text-white',
                ].join(' ')}
              >
                {n}
              </button>
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          BONUS — pick 1
        </h3>
        <div className="grid grid-cols-10 gap-1.5">
          {BONUS_NUMBERS.map((n) => {
            const selected = bonusSelected === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`Bonus number ${n}`}
                onClick={() => onBonusSelect(n)}
                className={[
                  'h-9 rounded-full border text-xs tabular-nums transition',
                  selected
                    ? 'border-neon-magenta bg-neon-magenta text-felt-deep'
                    : 'border-white/30 bg-felt-deep text-white/70 hover:border-neon-magenta hover:text-white',
                ].join(' ')}
              >
                {n}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
