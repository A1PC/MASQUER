import type { JSX } from 'react';
import ChipDenominationButton from '@/games/_shared/ChipDenominationButton';
import { chipLabel } from '@/games/_shared/chipStyles';
import { CHIP_DENOMINATIONS, type ChipDenomination } from './config';

interface Props {
  value: ChipDenomination;
  onChange: (next: ChipDenomination) => void;
  disabled?: boolean;
}

/**
 * Baccarat chip-denomination selector. Consumes the shared
 * `<ChipDenominationButton />` (factored at #237) so baccarat's chip
 * palette, ring colour, touch target, and focus state are byte-identical
 * to Slots / Roulette / Blackjack / Coin-flip.
 *
 * Selection semantics follow the Roulette pattern: each button carries
 * its own `aria-pressed` + `data-selected` rather than a role="radio"
 * wrapper, so the underlying button receives clicks directly (no proxy
 * span swallowing events).
 */
export default function ChipSelector({ value, onChange, disabled = false }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="mr-1 text-[11px] uppercase tracking-wider text-ivory/55">Chip:</span>
      {CHIP_DENOMINATIONS.map((d) => {
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
