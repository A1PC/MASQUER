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

const CHIP_COLORS: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  5: { bg: '#e85d75', ring: '#fff', text: '#fff' },
  25: { bg: '#3dd17a', ring: '#fff', text: '#06120c' },
  100: { bg: '#1a1a1a', ring: '#d4af37', text: '#ffe066' },
  250: { bg: '#ffd23f', ring: '#1a1a1a', text: '#06120c' },
  500: { bg: '#7a3fff', ring: '#fff', text: '#fff' },
  1000: { bg: '#ff7a3f', ring: '#fff', text: '#06120c' },
};

export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="mr-1 text-[11px] uppercase tracking-wider text-white/50">Chip:</span>
      {ROULETTE_CONFIG.CHIP_DENOMINATIONS.map((d) => {
        const palette = CHIP_COLORS[d];
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
            className={`grid h-11 w-11 place-items-center rounded-full text-[12px] font-bold transition-transform disabled:opacity-40 ${
              selected ? 'scale-110 ring-2 ring-gold-bright' : 'hover:scale-105'
            }`}
            style={{
              background: palette.bg,
              color: palette.text,
              border: `3px solid ${palette.ring}`,
              boxShadow: selected ? '0 0 12px rgba(240,198,74,0.6)' : 'none',
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
