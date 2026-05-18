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

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  main: 'border-gold/70 bg-gold/15',
  tie: 'border-chip-win/70 bg-chip-win/15',
  side: 'border-white/20 bg-black/30',
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
      disabled={disabled}
      onClick={onAddChip}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      className={[
        'relative flex h-full w-full flex-col items-center justify-center rounded border-2 p-2 transition',
        VARIANT_CLASSES[variant],
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-125',
      ].join(' ')}
    >
      <span className="font-display text-[11px] tracking-[0.18em] text-white">{label}</span>
      <span className="mt-0.5 text-[10px] text-white/60">{payoutText}</span>
      {amount > 0 && (
        <motion.span
          key={amount}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-2 rounded-full border border-gold/70 bg-felt-deep px-3 py-1 font-display text-sm text-gold shadow-gold-glow"
          aria-label={`Current bet: ${amount} chips`}
        >
          {amount}
        </motion.span>
      )}
    </button>
  );
}
