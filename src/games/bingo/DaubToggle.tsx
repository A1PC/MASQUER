import type { JSX } from 'react';

interface Props {
  mode: 'auto' | 'manual';
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

/** Auto / Manual daub pill. Disabled-state (Hard difficulty) renders as a
 *  static badge with a brass hairline + ivory hint instead of a button. */
export default function DaubToggle({
  mode,
  onToggle,
  disabled = false,
  disabledReason,
}: Props): JSX.Element {
  if (disabled) {
    return (
      <span
        className="inline-flex min-h-[28px] items-center rounded-full border border-brass/40 bg-felt-table-deep px-3 py-1 font-display text-[10px] tracking-[0.18em] text-ivory/40"
        {...(disabledReason ? { title: disabledReason } : {})}
        data-daub-toggle
        data-disabled="true"
      >
        MANUAL (locked)
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={mode === 'manual'}
      className="inline-flex min-h-[28px] items-center rounded-full border border-brass/60 bg-felt-table-deep px-3 py-1 font-display text-[10px] tracking-[0.18em] text-gold-bright hover:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      data-daub-toggle
    >
      {mode === 'auto' ? 'AUTO' : 'MANUAL'}
    </button>
  );
}
