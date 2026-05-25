import type { JSX } from 'react';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';

interface Props {
  value: ChipDenomination;
  onChange: (next: ChipDenomination) => void;
  disabled?: boolean;
}

/** Human-readable label used in aria-label; avoids substring collisions (e.g. "100" ⊂ "1000"). */
const CHIP_LABELS: Record<ChipDenomination, string> = {
  5: '5',
  25: '25',
  100: '100',
  250: '250',
  500: '500',
  1000: '1K',
};

/**
 * Per-denomination Tailwind class triplet — token-driven so the chip ladder
 * matches the MASQUER Velvet Deco palette from `_shared/BettingPanel.tsx` /
 * the shared `<Chip>` primitive (#230). Tokens come from `tailwind.config.ts`
 * → `src/theme/tokens.ts`. Where a brand colour does not exist as a single
 * token (the cyan `25`, the pink `5`, the green `100`), we fall back to the
 * roulette-pocket / chip tokens that already encode those hues.
 */
const CHIP_STYLE: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  // 5 — pink/red chip → roulette pocket-red token (#a3122a) on porcelain ring.
  5: { bg: 'bg-roulette-pocket-red', ring: 'border-porcelain', text: 'text-porcelain' },
  // 25 — cyan-leaning chip → jewel-emerald with porcelain text.
  25: { bg: 'bg-jewel-emerald', ring: 'border-porcelain', text: 'text-porcelain' },
  // 100 — black/gold chip → roulette-pocket on brass ring with gold text.
  100: { bg: 'bg-roulette-pocket', ring: 'border-brass', text: 'text-gold-bright' },
  // 250 — gold chip → brass on roulette-pocket ring with ink text.
  250: { bg: 'bg-brass', ring: 'border-roulette-pocket', text: 'text-base' },
  // 500 — purple/dark chip → velvet-deep on brass ring with ivory.
  500: { bg: 'bg-velvet-deep', ring: 'border-brass', text: 'text-ivory' },
  // 1000 — high-roller chip → velvet on brass ring with ivory (matches BettingPanel).
  1000: { bg: 'bg-velvet', ring: 'border-brass', text: 'text-ivory' },
};

export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="mr-1 text-[11px] uppercase tracking-wider text-ivory/55">Chip:</span>
      {ROULETTE_CONFIG.CHIP_DENOMINATIONS.map((d) => {
        const palette = CHIP_STYLE[d];
        const selected = d === value;
        return (
          <button
            key={d}
            type="button"
            data-chip={d}
            data-selected={selected ? 'true' : 'false'}
            disabled={disabled}
            onClick={() => onChange(d)}
            aria-label={`Select ${CHIP_LABELS[d]}-chip`}
            aria-pressed={selected}
            className={[
              'grid h-11 w-11 place-items-center rounded-full border-[3px] font-bold',
              'transition-transform duration-150 disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
              d >= 1000 ? 'text-[10px]' : 'text-[12px]',
              palette.bg,
              palette.ring,
              palette.text,
              selected ? 'scale-110 shadow-gold-glow ring-2 ring-gold-bright' : 'hover:scale-105',
            ].join(' ')}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
