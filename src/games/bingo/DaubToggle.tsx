import type { JSX } from 'react';

interface Props {
  mode: 'auto' | 'manual';
  onToggle: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export default function DaubToggle({
  mode,
  onToggle,
  disabled = false,
  disabledReason,
}: Props): JSX.Element {
  if (disabled) {
    return (
      <span
        className="rounded-full bg-felt-deep/60 px-3 py-1 text-[10px] tracking-wider font-display text-white/40 border border-white/20"
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
      className="rounded-full bg-felt-deep px-3 py-1 text-[10px] tracking-wider font-display text-gold-bright border border-gold/40 hover:border-gold"
      data-daub-toggle
    >
      {mode === 'auto' ? 'AUTO' : 'MANUAL'}
    </button>
  );
}
