import type { JSX } from 'react';
import { motion } from 'framer-motion';

interface Props {
  /** Zone label, e.g. "PLAYER". */
  label: string;
  /** Payout text, e.g. "1 : 1". */
  payoutText: string;
  /** Current chip amount on this zone. */
  amount: number;
  /** Theme variant. */
  variant?: 'main' | 'tie' | 'side';
  /** Called when the player clicks the zone to add a chip. */
  onAddChip: () => void;
  /** Called when the player right-clicks (or long-presses) to clear the zone. */
  onClear: () => void;
  /** Disabled when machine is not in 'betting' state. */
  disabled?: boolean;
}

// Brand-tokenised felt zones. Main bets ride a brass-on-felt look that
// matches the SlotsPage / RoulettePage rebuilds; the TIE zone leans on
// the emerald jewel for its standout green-on-felt accent; side zones
// pull the deeper felt-table-deep so they recede beneath the main row.
const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  main: 'border-brass/70 bg-felt-table',
  tie: 'border-scoreboard-tie/70 bg-scoreboard-tie/10',
  side: 'border-brass/40 bg-felt-table-deep',
};

export default function BetZone({
  label,
  payoutText,
  amount,
  variant = 'main',
  onAddChip,
  onClear,
  disabled = false,
}: Props): JSX.Element {
  return (
    <button
      type="button"
      data-zone-label={label}
      data-zone-amount={amount}
      data-zone-variant={variant}
      disabled={disabled}
      onClick={onAddChip}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      aria-label={`Bet zone: ${label}, pays ${payoutText}, current bet ${amount} chips`}
      className={[
        'relative flex h-full w-full flex-col items-center justify-center rounded-md border-2 p-2 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
        VARIANT_CLASSES[variant],
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-125',
      ].join(' ')}
    >
      <span className="font-display text-[11px] tracking-[0.18em] text-ivory">{label}</span>
      <span className="mt-0.5 text-[10px] text-ivory/65">{payoutText}</span>
      {amount > 0 && (
        <motion.span
          key={amount}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-2 rounded-full border border-brass bg-felt-table-deep px-3 py-1 font-display text-sm text-gold shadow-gold-glow"
          aria-label={`Current bet: ${amount} chips`}
        >
          {amount}
        </motion.span>
      )}
    </button>
  );
}
