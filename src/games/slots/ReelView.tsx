import type { JSX } from 'react';
import SymbolView from './SymbolView';
import type { Symbol as SymbolType } from './types';

export interface ReelProps {
  /** 0 / 1 / 2 — left / centre / right reel. Used for staggered start. */
  reelIndex: 0 | 1 | 2;
  /** True during machine.spinning. Drives the scroll animation (B.3). */
  spinning: boolean;
  /** Final symbol for this reel. null = idle (no spin yet). */
  symbol: SymbolType | null;
  /** When this reel should stop (ms from spin start). Drives animation length. */
  stopAtMs: number;
  /** When true, render with reduced-motion fallback (no scroll). */
  reducedMotion?: boolean;
  /** When true, the centre cell gets data-winning="true" for highlight styling. */
  winning?: boolean;
}

const CELL_SIZE = 64; // px — SymbolView default size

/** Idle filler symbols (deterministic — purely cosmetic). */
const IDLE_FILLERS: readonly [SymbolType, SymbolType] = ['cherry', 'lemon'];

export default function ReelView({
  reelIndex,
  spinning: _spinning, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  symbol,
  stopAtMs: _stopAtMs, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  reducedMotion: _reducedMotion = false, // eslint-disable-line @typescript-eslint/no-unused-vars -- consumed in Task B.3
  winning = false,
}: ReelProps): JSX.Element {
  const centreSymbol: SymbolType = symbol ?? IDLE_FILLERS[0];
  const topSymbol = IDLE_FILLERS[0];
  const bottomSymbol = IDLE_FILLERS[1];

  return (
    <div
      data-reel-index={reelIndex}
      className="relative overflow-hidden rounded border border-gold/30 bg-felt-deep"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE * 3,
      }}
    >
      <div
        data-roulette-cell-position="top"
        className="flex items-center justify-center"
        style={{ height: CELL_SIZE }}
      >
        <SymbolView symbol={topSymbol} size={CELL_SIZE} />
      </div>
      <div
        data-roulette-cell-position="centre"
        {...(winning ? { 'data-winning': 'true' } : {})}
        className="flex items-center justify-center"
        style={{
          height: CELL_SIZE,
          boxShadow: winning
            ? 'inset 0 0 12px rgba(255,224,102,0.5), inset 0 0 24px rgba(255,224,102,0.25)'
            : undefined,
          background: winning ? 'rgba(212,175,55,0.08)' : undefined,
        }}
      >
        <SymbolView symbol={centreSymbol} size={CELL_SIZE} winning={winning} />
      </div>
      <div
        data-roulette-cell-position="bottom"
        className="flex items-center justify-center"
        style={{ height: CELL_SIZE }}
      >
        <SymbolView symbol={bottomSymbol} size={CELL_SIZE} />
      </div>
    </div>
  );
}
