import { motion } from 'framer-motion';
import type { JSX } from 'react';
import { useMemo } from 'react';
import SymbolView from './SymbolView';
import { pickSymbol } from './symbols';
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

const CELL_SIZE = 96; // px — each reel cell. Bumped from 64 to make the reels feel more prominent.

/** Idle filler symbols (deterministic — purely cosmetic). */
const IDLE_FILLERS: readonly [SymbolType, SymbolType] = ['cherry', 'lemon'];

/** Number of filler symbols above the centre symbol in the strip. */
const STRIP_FILLER_COUNT = 24;

/** Build a strip of symbols: fillers at the top, then the final-three
 *  arrangement (top=cherry, centre=symbol, bottom=lemon) at the bottom.
 *  Filler symbols are RNG-picked (purely cosmetic — not recorded). */
function buildScrollStrip(finalSymbol: SymbolType): SymbolType[] {
  const fillers: SymbolType[] = Array.from({ length: STRIP_FILLER_COUNT }, () => pickSymbol());
  return [...fillers, IDLE_FILLERS[0], finalSymbol, IDLE_FILLERS[1]];
}

export default function ReelView({
  reelIndex,
  spinning,
  symbol,
  stopAtMs,
  reducedMotion = false,
  winning = false,
}: ReelProps): JSX.Element {
  const showScroll = spinning && symbol !== null;
  const strip = useMemo(() => (symbol ? buildScrollStrip(symbol) : []), [symbol]);
  const stripHeight = strip.length * CELL_SIZE;
  const finalY = -(stripHeight - 3 * CELL_SIZE);
  const effectiveDurationSec = reducedMotion || stopAtMs === 0 ? 0 : stopAtMs / 1000;

  return (
    <div
      data-reel-index={reelIndex}
      className="relative overflow-hidden rounded border border-gold/30 bg-felt-deep"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE * 3,
      }}
    >
      {showScroll ? (
        <motion.div
          data-reel-strip
          data-stop-at-ms={stopAtMs}
          data-final-symbol={symbol}
          data-transition-duration={effectiveDurationSec}
          animate={{ y: finalY }}
          initial={{ y: 0 }}
          transition={
            effectiveDurationSec === 0
              ? { duration: 0 }
              : { duration: effectiveDurationSec, ease: [0.16, 1, 0.3, 1] }
          }
          style={{ position: 'absolute', top: 0, left: 0, width: CELL_SIZE }}
        >
          {strip.map((sym, i) => (
            <div key={i} className="flex items-center justify-center" style={{ height: CELL_SIZE }}>
              <SymbolView symbol={sym} size={CELL_SIZE} />
            </div>
          ))}
        </motion.div>
      ) : (
        <>
          <div
            data-roulette-cell-position="top"
            className="flex items-center justify-center"
            style={{ height: CELL_SIZE }}
          >
            <SymbolView symbol={IDLE_FILLERS[0]} size={CELL_SIZE} />
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
            <SymbolView symbol={symbol ?? IDLE_FILLERS[0]} size={CELL_SIZE} winning={winning} />
          </div>
          <div
            data-roulette-cell-position="bottom"
            className="flex items-center justify-center"
            style={{ height: CELL_SIZE }}
          >
            <SymbolView symbol={IDLE_FILLERS[1]} size={CELL_SIZE} />
          </div>
        </>
      )}
    </div>
  );
}
