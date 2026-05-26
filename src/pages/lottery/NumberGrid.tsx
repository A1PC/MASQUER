import type { JSX } from 'react';
import { MAIN_PICKS } from '@/systems/lottery';

interface Props {
  /** Currently selected main numbers (any order). Length 0..MAIN_PICKS. */
  mainSelected: number[];
  /** Currently selected bonus number, or null. */
  bonusSelected: number | null;
  /** Called when a main number cell is clicked. Parent must enforce length cap of MAIN_PICKS. */
  onMainToggle: (n: number) => void;
  /** Called when a bonus cell is clicked. Parent enforces single-selection. */
  onBonusSelect: (n: number) => void;
}

const MAIN_NUMBERS = Array.from({ length: 50 }, (_, i) => i + 1);
const BONUS_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * NumberGrid — the player's lottery pick surface. Reskinned for MASQUER /
 * Velvet Deco in Phase 15 #9: brand tokens only, ≥44 px touch targets, and
 * Pick-6 (was Pick-5 in Phase 10). Bonus is single-select and treated with
 * the jewel-magenta signature pop to differentiate from the brass main pool.
 */
export default function NumberGrid({
  mainSelected,
  bonusSelected,
  onMainToggle,
  onBonusSelect,
}: Props): JSX.Element {
  const mainSet = new Set(mainSelected);
  const mainFull = mainSelected.length === MAIN_PICKS;
  return (
    <div className="flex flex-col gap-4" data-number-grid>
      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          MAIN NUMBERS — pick {MAIN_PICKS}
          <span className="ml-2 font-body tabular-nums text-ivory/60" data-main-count>
            {mainSelected.length}/{MAIN_PICKS} selected
          </span>
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
                  // ≥44 px touch target per HIG / Material; gold focus ring.
                  'inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border text-xs tabular-nums transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                  selected
                    ? 'border-brass bg-gold text-velvet-deep shadow-gold-glow'
                    : disabled
                      ? 'border-brass/20 bg-felt-table-deep/40 text-ivory/20'
                      : 'border-brass/50 bg-felt-table-deep text-ivory/80 hover:border-brass hover:bg-velvet-deep hover:text-ivory',
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
                  'inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border text-xs tabular-nums transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
                  selected
                    ? 'border-jewel-magenta bg-jewel-magenta text-ivory'
                    : 'border-brass/50 bg-felt-table-deep text-ivory/80 hover:border-jewel-magenta hover:text-ivory',
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
