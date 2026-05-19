import type { JSX } from 'react';

interface Props {
  mode: 'auto' | 'manual';
  onToggle: () => void;
}

export default function DaubToggle({ mode, onToggle }: Props): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Daub mode"
      className="inline-flex overflow-hidden rounded-full border border-gold/50 bg-felt-deep text-[11px]"
      data-daub-toggle
    >
      {(['auto', 'manual'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => mode !== m && onToggle()}
          className={
            mode === m
              ? 'bg-gold px-3 py-1 font-display tracking-wider text-felt-deep'
              : 'px-3 py-1 text-white/60 hover:text-white'
          }
        >
          {m === 'auto' ? 'AUTO' : 'MANUAL'}
        </button>
      ))}
    </div>
  );
}
