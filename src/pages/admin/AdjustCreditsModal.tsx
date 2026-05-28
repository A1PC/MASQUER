import type { JSX } from 'react';
import { useState } from 'react';
import { adjustBalance, type AdjustBalanceError } from '@/systems/admin';

type Props = {
  open: boolean;
  userId: string;
  username: string;
  onClose: () => void;
};

const ERROR_COPY: Record<AdjustBalanceError, string> = {
  invalid_amount: 'Amount must be a non-zero integer.',
  invalid_reason: 'Reason must be at least 3 characters.',
  no_user: 'User no longer exists.',
  would_go_negative: 'That would make the balance go negative.',
  unknown: 'Something went wrong. Try again.',
};

export default function AdjustCreditsModal({
  open,
  userId,
  username,
  onClose,
}: Props): JSX.Element | null {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed === 0) {
      setError(ERROR_COPY.invalid_amount);
      setSubmitting(false);
      return;
    }
    const r = await adjustBalance({ userId, amount: parsed, reason });
    setSubmitting(false);
    if (!r.ok) {
      setError(ERROR_COPY[r.error]);
      return;
    }
    setAmount('');
    setReason('');
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="w-full max-w-md rounded-lg border border-gold/60 bg-felt-deep p-6 shadow-gold-glow"
      >
        <h2 className="mb-1 font-display text-base tracking-wider text-gold">ADJUST CREDITS</h2>
        <p className="mb-4 text-xs text-ivory/50">User: {username}</p>

        <label
          htmlFor="adj-amount"
          className="mb-1 block text-xs uppercase tracking-wider text-ivory/70"
        >
          Amount (positive = credit, negative = debit)
        </label>
        <input
          id="adj-amount"
          type="number"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
          className="mb-4 w-full rounded-sm border border-white/20 bg-felt-deep px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
        />

        <label
          htmlFor="adj-reason"
          className="mb-1 block text-xs uppercase tracking-wider text-ivory/70"
        >
          Reason
        </label>
        <input
          id="adj-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={3}
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-felt-deep px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-casino-red">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-white/20 px-3 py-2 text-xs uppercase tracking-wider text-ivory/70 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-gold px-3 py-2 text-xs uppercase tracking-wider text-felt-deep hover:bg-gold-bright disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
