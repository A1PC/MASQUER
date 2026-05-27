import type { JSX } from 'react';

interface Props {
  open: boolean;
  bankroll: number;
  totalBoughtIn: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * `LeaveConfirmModal` — small modal shown when the player taps LEAVE TABLE
 * mid-session. Summarises bankroll + bought-in + net P/L so the player sees
 * what they're walking away with before the session settles.
 *
 * Brand-tokened: velvet-deep panel with a brass border, gold-bright headings,
 * ivory body. Confirm CTA carries a casino-red accent; cancel is a neutral
 * brass-edged outline.
 */
export default function LeaveConfirmModal({
  open,
  bankroll,
  totalBoughtIn,
  onCancel,
  onConfirm,
}: Props): JSX.Element | null {
  if (!open) return null;
  const net = bankroll - totalBoughtIn;
  const netClass = net >= 0 ? 'text-chip-win' : 'text-casino-red';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-leave-confirm
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-confirm-title"
    >
      <div className="rounded-lg border border-brass/60 bg-velvet-deep p-6 shadow-2xl">
        <h3
          id="leave-confirm-title"
          className="mb-3 font-display text-lg tracking-[0.18em] text-gold-bright"
        >
          LEAVE TABLE?
        </h3>
        <p className="mb-1 text-sm text-ivory/85">
          Final bankroll:{' '}
          <span className="font-mono tabular-nums text-gold-bright">
            {bankroll.toLocaleString()}
          </span>
        </p>
        <p className="mb-1 text-sm text-ivory/85">
          Bought in:{' '}
          <span className="font-mono tabular-nums text-ivory/55">
            {totalBoughtIn.toLocaleString()}
          </span>
        </p>
        <p className="mb-4 text-sm text-ivory/85">
          Net:{' '}
          <span className={`font-mono tabular-nums ${netClass}`}>
            {net >= 0 ? '+' : ''}
            {net.toLocaleString()}
          </span>
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brass/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
            data-leave-cancel
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border-2 border-casino-red bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-casino-red hover:bg-casino-red/10"
            data-leave-confirm-btn
          >
            CONFIRM LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}
