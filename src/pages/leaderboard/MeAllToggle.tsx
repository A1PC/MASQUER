import type { JSX } from 'react';

export type MeAllMode = 'all' | 'me';

interface Props {
  value: MeAllMode;
  onChange: (next: MeAllMode) => void;
}

export default function MeAllToggle({ value, onChange }: Props): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Filter scope"
      className="inline-flex overflow-hidden rounded-md border border-brass/60 bg-velvet-deep text-[10px]"
      data-me-all-toggle
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'all'}
        onClick={() => onChange('all')}
        className={
          value === 'all'
            ? 'bg-velvet px-2 py-0.5 font-display tracking-[0.18em] text-gold-bright'
            : 'px-2 py-0.5 text-ivory/55 hover:bg-velvet/50 hover:text-ivory/80'
        }
      >
        All
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'me'}
        onClick={() => onChange('me')}
        className={
          value === 'me'
            ? 'bg-velvet px-2 py-0.5 font-display tracking-[0.18em] text-gold-bright'
            : 'px-2 py-0.5 text-ivory/55 hover:bg-velvet/50 hover:text-ivory/80'
        }
      >
        Me
      </button>
    </div>
  );
}
