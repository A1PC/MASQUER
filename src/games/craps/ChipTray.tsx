import type { JSX } from 'react';

// Chip colors indexed by denomination value
const CHIP_COLORS: Record<number, { bg: string; ring: string; text: string }> = {
  10: { bg: '#e85d75', ring: '#fff', text: '#fff' },
  25: { bg: '#3dd17a', ring: '#fff', text: '#06120c' },
  50: { bg: '#1a1a1a', ring: '#d4af37', text: '#ffe066' },
  100: { bg: '#ffd23f', ring: '#1a1a1a', text: '#06120c' },
  250: { bg: '#7a3fff', ring: '#fff', text: '#fff' },
  500: { bg: '#ff7a3f', ring: '#fff', text: '#06120c' },
  2500: { bg: '#0088cc', ring: '#fff', text: '#fff' },
};

function chipLabel(denom: number): string {
  if (denom >= 1000) return `${denom / 1000}K`;
  return String(denom);
}

interface Props {
  chips: number[];
  selected: number;
  bankroll: number;
  onSelectChip: (value: number) => void;
  disabled?: boolean;
}

export default function ChipTray({
  chips,
  selected,
  bankroll,
  onSelectChip,
  disabled = false,
}: Props): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brass/60 bg-velvet-deep px-4 py-2">
      <span className="mr-1 font-display text-[11px] uppercase tracking-[0.18em] text-ivory/55">
        Chip:
      </span>
      {chips.map((denom) => {
        const palette = CHIP_COLORS[denom] ?? { bg: '#555', ring: '#fff', text: '#fff' };
        const isSelected = denom === selected;
        return (
          <button
            key={denom}
            type="button"
            data-chip={denom}
            data-selected={isSelected ? 'true' : 'false'}
            disabled={disabled}
            onClick={() => onSelectChip(denom)}
            aria-label={`Select ${chipLabel(denom)}-chip`}
            aria-pressed={isSelected}
            className={`grid h-11 w-11 place-items-center rounded-full text-[11px] font-bold transition-transform disabled:opacity-40 ${
              isSelected ? 'scale-110 ring-2 ring-gold-bright' : 'hover:scale-105'
            }`}
            style={{
              background: palette.bg,
              color: palette.text,
              border: `3px solid ${palette.ring}`,
              boxShadow: isSelected ? '0 0 12px rgba(240,198,74,0.6)' : 'none',
            }}
          >
            {chipLabel(denom)}
          </button>
        );
      })}
      <div className="ml-auto flex items-center gap-1 text-[11px] text-ivory/55">
        <span>Bankroll:</span>
        <span className="font-mono tabular-nums text-gold-bright" data-bankroll>
          {bankroll.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
