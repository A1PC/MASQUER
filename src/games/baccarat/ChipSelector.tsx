import type { JSX } from 'react';
import { CHIP_DENOMINATIONS, type ChipDenomination } from './config';

interface Props {
  value: ChipDenomination;
  onChange: (next: ChipDenomination) => void;
  disabled?: boolean;
}

/** Label used in aria-label; avoids substring collisions (100 ⊂ 1000). */
const CHIP_LABELS: Record<ChipDenomination, string> = {
  5: '5',
  25: '25',
  100: '100',
  500: '500',
  1000: '1K',
};

const CHIP_COLORS: Record<ChipDenomination, { bg: string; border: string; text: string }> = {
  5: { bg: '#e85d75', border: '#fff', text: '#fff' },
  25: { bg: '#27c4d6', border: '#fff', text: '#06120c' },
  100: { bg: '#3dd17a', border: '#fff', text: '#06120c' },
  500: { bg: '#1a1a1a', border: '#d4af37', text: '#ffe066' },
  1000: { bg: '#7a3fff', border: '#fff', text: '#fff' },
};

export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Chip denomination">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-white/50">Chip:</span>
      {CHIP_DENOMINATIONS.map((d) => {
        const palette = CHIP_COLORS[d];
        const selected = d === value;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Chip ${CHIP_LABELS[d]}`}
            data-chip={d}
            disabled={disabled}
            onClick={() => onChange(d)}
            className={[
              'grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold transition',
              selected ? 'scale-110 ring-2 ring-gold-bright' : 'opacity-70 hover:opacity-100',
              disabled ? 'cursor-not-allowed opacity-40' : '',
            ].join(' ')}
            style={{
              background: palette.bg,
              color: palette.text,
              border: `2px solid ${palette.border}`,
            }}
          >
            {CHIP_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}
