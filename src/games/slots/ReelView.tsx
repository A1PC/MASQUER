import { motion } from 'framer-motion';
import type { JSX } from 'react';
import { useMemo } from 'react';
import SymbolView from './SymbolView';
import { pickSymbol } from './symbols';
import type { Symbol as SymbolType } from './types';

/** Initial cosmetic fillers picked on mount — used only when there's no
 *  spin result yet (cabinet at first render). After the first spin lands,
 *  `stripPack` below supplies fresh random fillers per spin. Picked once
 *  per ReelView instance so the initial cabinet shows random non-pattern
 *  symbols instead of the historical "cherry / cherry / lemon" lockup. */
const INITIAL_FILLERS: { top: SymbolType; bottom: SymbolType } = {
  top: pickSymbol(),
  bottom: pickSymbol(),
};

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

/** Per-reel cell size (px). Bumped from the original 80px to 110px in
 *  Phase 15 #7 so the SVG symbol art reads at a comfortable, focal size
 *  inside the new two-column layout. The reel column stays the visual
 *  centrepiece of the page (spec §4.3.2). */
const CELL_SIZE = 110;
const SYMBOL_SCALE = 0.86; // Leaves a small brass border around each cell.
const SYMBOL_SIZE = Math.round(CELL_SIZE * SYMBOL_SCALE);

/** Number of filler symbols above the centre symbol in the strip. */
const STRIP_FILLER_COUNT = 24;

/** Build a strip of symbols + pick fresh random top/bottom fillers for the
 *  reel's resting state. The strip's terminal frame becomes the visible
 *  cabinet after the spin stops, so the same `top` / `bottom` fillers are
 *  reused in the post-spin idle render (via the `stripPack.top/bottom`
 *  return values) to avoid a one-frame jump on transition out of motion.
 *  All picks are cosmetic — production RNG uses `crypto.getRandomValues`
 *  with no shared state, so these calls don't affect the spin result
 *  computed upstream in `logic.ts`. */
function buildStripPack(finalSymbol: SymbolType): {
  top: SymbolType;
  bottom: SymbolType;
  strip: SymbolType[];
} {
  const fillers: SymbolType[] = Array.from({ length: STRIP_FILLER_COUNT }, () => pickSymbol());
  const top = pickSymbol();
  const bottom = pickSymbol();
  return { top, bottom, strip: [...fillers, top, finalSymbol, bottom] };
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
  // `stripPack` picks fresh random top + bottom fillers each time `symbol`
  // changes (i.e. each new spin result). The same top/bottom are reused in
  // the post-spin idle render below so the cabinet doesn't jump as the
  // motion ends. Before the first spin (`symbol === null`), fall back to
  // the per-instance INITIAL_FILLERS so the cabinet's first paint is also
  // randomised instead of locking to cherry / lemon.
  const stripPack = useMemo(
    () =>
      symbol
        ? buildStripPack(symbol)
        : { top: INITIAL_FILLERS.top, bottom: INITIAL_FILLERS.bottom, strip: [] },
    [symbol],
  );
  const strip = stripPack.strip;
  const stripHeight = strip.length * CELL_SIZE;
  const finalY = -(stripHeight - 3 * CELL_SIZE);
  const effectiveDurationSec = reducedMotion || stopAtMs === 0 ? 0 : stopAtMs / 1000;

  return (
    <div
      data-reel-index={reelIndex}
      className="relative overflow-hidden rounded-md border-2 border-brass bg-felt-table-deep shadow-[inset_0_0_18px_rgba(0,0,0,0.55)]"
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE * 3,
      }}
    >
      {/* Glass-plate vignette — dims the top and bottom thirds so the
          middle row (the payline) reads as the focal point. Pure
          decoration; sits on top of both the idle cells and the
          spinning strip via z-10 so the effect is consistent across
          states. Pairs with the brass payline lines at the page level. */}
      <div
        aria-hidden="true"
        data-reel-vignette
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,18,12,0.6) 0%, rgba(6,18,12,0.6) 30%, rgba(6,18,12,0) 38%, rgba(6,18,12,0) 62%, rgba(6,18,12,0.6) 70%, rgba(6,18,12,0.6) 100%)',
        }}
      />
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
              <SymbolView symbol={sym} size={SYMBOL_SIZE} />
            </div>
          ))}
        </motion.div>
      ) : (
        <>
          <div
            data-roulette-cell-position="top"
            className="flex items-center justify-center border-b border-brass/30"
            style={{ height: CELL_SIZE }}
          >
            <SymbolView symbol={stripPack.top} size={SYMBOL_SIZE} />
          </div>
          <div
            data-roulette-cell-position="centre"
            {...(winning ? { 'data-winning': 'true' } : {})}
            className="flex items-center justify-center border-b border-brass/30"
            style={{
              height: CELL_SIZE,
              boxShadow: winning
                ? 'inset 0 0 14px rgba(230,192,104,0.55), inset 0 0 28px rgba(230,192,104,0.28)'
                : undefined,
              background: winning ? 'rgba(230,192,104,0.09)' : undefined,
            }}
          >
            <SymbolView symbol={symbol ?? stripPack.top} size={SYMBOL_SIZE} winning={winning} />
          </div>
          <div
            data-roulette-cell-position="bottom"
            className="flex items-center justify-center"
            style={{ height: CELL_SIZE }}
          >
            <SymbolView symbol={stripPack.bottom} size={SYMBOL_SIZE} />
          </div>
        </>
      )}
    </div>
  );
}
