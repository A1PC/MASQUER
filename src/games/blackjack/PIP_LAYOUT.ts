/** Pip layout as a 2D position grid for each non-court rank.
 *  Each entry is a (row, col) on a 7-row by 3-col canvas (visual grid).
 *  Court cards (J, Q, K) and Ace use a different rendering path (court frame / single big pip).
 */
import type { Rank } from './types';

export type PipPosition = { row: number; col: number };

/** 7×3 grid: rows 0-6 top-to-bottom, cols 0=left/1=center/2=right. */
export const PIP_LAYOUTS: Partial<Record<Rank, readonly PipPosition[]>> = {
  '2': [
    { row: 0, col: 1 },
    { row: 6, col: 1 },
  ],
  '3': [
    { row: 0, col: 1 },
    { row: 3, col: 1 },
    { row: 6, col: 1 },
  ],
  '4': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '5': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 3, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '6': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '7': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '8': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 3, col: 0 },
    { row: 3, col: 2 },
    { row: 5, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '9': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
    { row: 3, col: 1 },
    { row: 4, col: 0 },
    { row: 4, col: 2 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
  '10': [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
    { row: 2, col: 2 },
    { row: 4, col: 0 },
    { row: 4, col: 2 },
    { row: 5, col: 1 },
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ],
};

/** Some ranks need an inverted pip (rotated 180°) to look authentic — typically
 *  the second pip in vertical-pair positions of even ranks. For Phase 3, we keep
 *  all pips upright to simplify; Phase 8 polish can invert the bottom-half pips. */
