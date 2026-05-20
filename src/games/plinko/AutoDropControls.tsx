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
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 bg-felt-deep/70 rounded-md border border-gold/20"
      data-auto-controls
    >
      <span className="text-[10px] text-white/70 font-display tabular-nums">
        Auto: {ballsSpawned} / {ballsRequested} balls
      </span>
      <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
        <div
          className="h-full bg-gold"
          style={{ width: `${ballsRequested === 0 ? 0 : (ballsSpawned / ballsRequested) * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onStop}
        className="px-3 py-1 rounded-md bg-casino-red text-white text-[11px] font-display tracking-wider border border-casino-red hover:opacity-80"
        data-auto-stop
      >
        ■ STOP AUTO
      </button>
    </div>
  );
}
