import type { JSX } from 'react';
import { motion } from 'framer-motion';

interface Props {
  smallAmount: number;
  bigAmount: number;
  disabled?: boolean;
  onAddSmall: () => void;
  onAddBig: () => void;
  onClearSmall: () => void;
  onClearBig: () => void;
}

export default function BigSmallZone({
  smallAmount,
  bigAmount,
  disabled = false,
  onAddSmall,
  onAddBig,
  onClearSmall,
  onClearBig,
}: Props): JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden rounded border-2 border-white/20 bg-black/30">
      <Half
        side="left"
        label="SMALL"
        payoutText="1.5 : 1"
        amount={smallAmount}
        onAdd={onAddSmall}
        onClear={onClearSmall}
        disabled={disabled}
      />
      <div className="w-px bg-white/15" />
      <Half
        side="right"
        label="BIG"
        payoutText="0.54 : 1"
        amount={bigAmount}
        onAdd={onAddBig}
        onClear={onClearBig}
        disabled={disabled}
      />
    </div>
  );
}

function Half({
  side,
  label,
  payoutText,
  amount,
  onAdd,
  onClear,
  disabled,
}: {
  side: 'left' | 'right';
  label: string;
  payoutText: string;
  amount: number;
  onAdd: () => void;
  onClear: () => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      data-bigsmall-half={side}
      data-zone-amount={amount}
      disabled={disabled}
      onClick={onAdd}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      className={[
        'relative flex flex-1 flex-col items-center justify-center p-2 transition',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/5',
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
          className="mt-2 rounded-full border border-gold/70 bg-felt-deep px-3 py-1 font-display text-sm text-gold"
        >
          {amount}
        </motion.span>
      )}
    </button>
  );
}
