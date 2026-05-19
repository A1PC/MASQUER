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
      className="inline-flex overflow-hidden rounded-full border border-white/30 bg-felt-deep text-[10px]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'all'}
        onClick={() => onChange('all')}
        className={
          value === 'all'
            ? 'bg-gold px-2 py-0.5 text-felt-deep'
            : 'px-2 py-0.5 text-white/60 hover:text-white'
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
            ? 'bg-gold px-2 py-0.5 text-felt-deep'
            : 'px-2 py-0.5 text-white/60 hover:text-white'
        }
      >
        Me
      </button>
    </div>
  );
}
