import type { JSX } from 'react';

interface Props {
  calledSoFar: number[];
  callCount: number;
}

export default function CallBoard({ calledSoFar, callCount }: Props): JSX.Element {
  const current = calledSoFar.length > 0 ? calledSoFar[calledSoFar.length - 1]! : null;
  const recent = calledSoFar.slice(-11, -1).reverse();
  return (
    <section
      className="flex items-center gap-4 rounded border border-gold/40 bg-felt-deep p-3"
      data-call-board
    >
      <div className="flex flex-col items-center" data-current-ball>
        <p className="text-[10px] uppercase tracking-wider text-white/40">Ball {callCount} of 90</p>
        {current === null ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 text-white/30">
            —
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold font-display text-2xl tabular-nums text-felt-deep shadow-[0_0_18px_rgba(212,175,55,0.6)]">
            {current}
          </div>
        )}
      </div>
      <div className="flex-1" data-recent-calls>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Recent</p>
        <div className="flex flex-wrap gap-1">
          {recent.length === 0 ? (
            <span className="text-xs text-white/30">No calls yet</span>
          ) : (
            recent.map((n, i) => (
              <span
                key={`${i}-${n}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-felt-deep text-xs tabular-nums text-white/70"
                data-recent-ball
              >
                {n}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
