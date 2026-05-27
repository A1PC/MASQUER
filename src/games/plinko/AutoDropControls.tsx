import type { JSX } from 'react';

interface Props {
  ballsSpawned: number;
  ballsRequested: number;
  onStop: () => void;
}

export default function AutoDropControls({
  ballsSpawned,
  ballsRequested,
  onStop,
}: Props): JSX.Element {
  const pct = ballsRequested === 0 ? 0 : (ballsSpawned / ballsRequested) * 100;
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-brass/40 bg-velvet-deep px-3 py-2"
      data-auto-controls
    >
      <span className="font-display text-[10px] text-ivory/80 tabular-nums">
        Auto: {ballsSpawned.toLocaleString()} / {ballsRequested.toLocaleString()} balls
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-felt-table-deep">
        <div className="h-full bg-gold-bright" style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        onClick={onStop}
        className="rounded-md border border-brass bg-velvet px-3 py-1 font-display text-[11px] tracking-[0.18em] text-ivory hover:bg-velvet-deep"
        data-auto-stop
      >
        ■ STOP AUTO
      </button>
    </div>
  );
}
