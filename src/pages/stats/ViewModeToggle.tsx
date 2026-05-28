import type { JSX } from 'react';
import { useStatsViewMode, useUIStore } from '@/store/uiStore';

export default function ViewModeToggle(): JSX.Element {
  const mode = useStatsViewMode();
  const setMode = useUIStore((s) => s.setStatsViewMode);
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex overflow-hidden rounded-md border border-brass/60 bg-velvet-deep"
      data-view-mode-toggle
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'cards'}
        onClick={() => setMode('cards')}
        className={[
          'px-3 py-1 text-[11px] font-display tracking-[0.18em] uppercase transition',
          mode === 'cards'
            ? 'bg-velvet text-gold-bright'
            : 'text-ivory/55 hover:bg-velvet/50 hover:text-ivory/80',
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
          'px-3 py-1 text-[11px] font-display tracking-[0.18em] uppercase transition',
          mode === 'graphs'
            ? 'bg-velvet text-gold-bright'
            : 'text-ivory/55 hover:bg-velvet/50 hover:text-ivory/80',
        ].join(' ')}
      >
        Graphs
      </button>
    </div>
  );
}
