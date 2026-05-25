import type { JSX } from 'react';
import { CHIP_STYLES, chipLabel } from './chipStyles';

interface Props {
  /** Chip face value in chips (integer). */
  denomination: number;
  /** When true, applies the brass selected ring + scale. */
  selected?: boolean;
  /** Disables the button (greyed-out + no click). */
  disabled?: boolean;
  /** Click handler. Receives no args — caller closes over the denomination. */
  onClick?: () => void;
  /**
   * Optional override for the aria-label. Defaults to `Chip {label}`.
   * Use the radio-group voicing form (e.g. `Select 5-chip`,
   * `Add 25 chips to bet`) when embedded in a labelled group.
   */
  ariaLabel?: string;
  /** Optional aria-pressed for toggle-style selectors (roulette). */
  ariaPressed?: boolean;
  /** Optional `data-chip` value — defaults to the denomination. */
  dataChip?: string | number;
  /** Optional `data-selected` value — auto-derived from `selected` when omitted. */
  dataSelected?: 'true' | 'false';
}

/**
 * Shared casino-chip button. Every game uses this — palette, ring colour,
 * focus state and touch target are byte-stable across BettingPanel
 * (blackjack / coin-flip) and roulette's ChipSelector.
 *
 * Visual contract:
 *   - 44 × 44 px (≥ WCAG touch-target minimum)
 *   - 3 px outer border in palette.border
 *   - inset 2 px ring in palette.inner (when defined)
 *   - selected → scale-110 + gold-bright ring + gold-glow shadow
 *   - focus-visible → 2 px gold ring with 2 px felt-deep offset
 *   - disabled → 40 % opacity, no click
 *
 * The button intentionally renders its own label (`{chipLabel(denomination)}`)
 * so callers cannot diverge on truncation rules.
 *
 * Style constants live in `./chipStyles.ts` to keep this file a
 * components-only module (react-refresh boundary).
 */
export default function ChipDenominationButton({
  denomination,
  selected = false,
  disabled = false,
  onClick,
  ariaLabel,
  ariaPressed,
  dataChip,
  dataSelected,
}: Props): JSX.Element {
  const styles = CHIP_STYLES[denomination] ?? CHIP_STYLES[100]!;
  const label = chipLabel(denomination);
  return (
    <button
      type="button"
      data-chip={dataChip ?? denomination}
      data-selected={dataSelected ?? (selected ? 'true' : 'false')}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel ?? `Chip ${label}`}
      {...(ariaPressed !== undefined ? { 'aria-pressed': ariaPressed } : {})}
      className={[
        'grid h-11 w-11 place-items-center rounded-full font-bold',
        'transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
        denomination >= 1000 ? 'text-[10px]' : 'text-[12px]',
        selected ? 'scale-110 shadow-gold-glow ring-2 ring-gold-bright' : 'hover:scale-105',
      ].join(' ')}
      style={{
        background: styles.bg,
        color: styles.text,
        border: `3px solid ${styles.border}`,
        ...(styles.inner ? { boxShadow: `inset 0 0 0 2px ${styles.inner}` } : {}),
      }}
    >
      {label}
    </button>
  );
}
