import type { JSX } from 'react';
import ChipDenominationButton from '@/games/_shared/ChipDenominationButton';
import { chipLabel } from '@/games/_shared/chipStyles';
import { ROULETTE_CONFIG, type ChipDenomination } from './config';

interface Props {
  value: ChipDenomination;
  onChange: (next: ChipDenomination) => void;
  disabled?: boolean;
}

/**
 * Roulette chip-denomination picker. Uses the shared
 * `<ChipDenominationButton />` so the visual chip palette is byte-stable
 * with every other game (blackjack, coin-flip, etc.) — see the Velvet
 * Deco chip ladder in `_shared/ChipDenominationButton.tsx`.
 *
 * This component owns the radio-group semantics + selection state. The
 * underlying button uses `aria-pressed` + `data-selected` so existing
 * roulette tests / e2e selectors keep working.
 */
export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="mr-1 text-[11px] uppercase tracking-wider text-ivory/55">Chip:</span>
      {ROULETTE_CONFIG.CHIP_DENOMINATIONS.map((d) => {
        const selected = d === value;
        return (
          <ChipDenominationButton
            key={d}
            denomination={d}
            selected={selected}
            disabled={disabled}
            onClick={() => onChange(d)}
            ariaLabel={`Select ${chipLabel(d)}-chip`}
            ariaPressed={selected}
          />
        );
      })}
    </div>
  );
}
