import type { JSX } from 'react';
import { useStatsViewMode, useUIStore } from '@/store/uiStore';

export default function ViewModeToggle(): JSX.Element {
  const mode = useStatsViewMode();
  const setMode = useUIStore((s) => s.setStatsViewMode);
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex overflow-hidden rounded-full border border-gold/50 bg-felt-deep"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'cards'}
        onClick={() => setMode('cards')}
        className={[
          'px-3 py-1 text-[11px] uppercase tracking-wider transition',
          mode === 'cards' ? 'bg-gold text-felt-deep' : 'text-white/70 hover:text-white',
        ].join(' ')}
      >
        Cards
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'graphs'}
        onClick={() => setMode('graphs')}
        className={[
          'px-3 py-1 text-[11px] uppercase tracking-wider transition',
          mode === 'graphs' ? 'bg-gold text-felt-deep' : 'text-white/70 hover:text-white',
        ].join(' ')}
      >
        Graphs
      </button>
    </div>
  );
}
