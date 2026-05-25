import type { CSSProperties, JSX } from 'react';
import { makeBet } from './bets';
import { colorOf } from './wheel';
import ChipStack from './ChipStack';
import type { BetPosition, BetPositionKey, PlacedBet } from './types';

// --- Coordinate constants (locked across PR C) ---
const CELL_W = 48;
const CELL_H = 32;
const ZERO_W = 32;
const COL_BTN_W = 48;
const GUTTER = 4;
const DOZEN_H = 28;
const EVEN_H = 28;

const FELT_W = ZERO_W + 12 * CELL_W + COL_BTN_W;
const FELT_H = 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H;

const SPLIT_THICK = 10;
const CORNER_SIZE = 14;
const STREET_THICK = 10;

function cellLeft(visualCol: number): number {
  return ZERO_W + (visualCol - 1) * CELL_W;
}
function cellTop(row: number): number {
  return (row - 1) * CELL_H;
}
function cellNumber(visualCol: number, row: number): number {
  return 3 * visualCol - (row - 1);
}

// Tokens (Phase 15 #6) — match the wheel pocket colours via tailwind theme so
// the felt and the wheel stay in lock-step. Raw hex values intentionally
// mirror the `roulette-pocket-*` keys in `tailwind.config.ts`.
const CELL_FILLS: Record<'red' | 'black' | 'green', string> = {
  red: '#a3122a', // roulette.pocket-red
  black: '#1a1a1a', // roulette.pocket
  green: '#3dd17a', // roulette.pocket-green
};

type OverlayDef =
  | {
      kind: 'split' | 'zero-split';
      key: string;
      lo: number;
      hi: number;
      style: CSSProperties;
      label: string;
    }
  | { kind: 'corner'; key: string; topLeft: number; style: CSSProperties; label: string }
  | { kind: 'street'; key: string; rowStart: number; style: CSSProperties; label: string }
  | { kind: 'six-line'; key: string; rowStart: number; style: CSSProperties; label: string };

function buildOverlays(): OverlayDef[] {
  const out: OverlayDef[] = [];

  // Vertical splits (24 total): between rows in same visual column.
  for (let c = 1; c <= 12; c++) {
    for (let r = 2; r <= 3; r++) {
      const lo = Math.min(cellNumber(c, r), cellNumber(c, r - 1));
      const hi = Math.max(cellNumber(c, r), cellNumber(c, r - 1));
      out.push({
        kind: 'split',
        key: `split:${lo}-${hi}`,
        lo,
        hi,
        style: {
          left: cellLeft(c),
          top: cellTop(r) - SPLIT_THICK / 2,
          width: CELL_W,
          height: SPLIT_THICK,
        },
        label: `Split bet on ${lo} and ${hi}`,
      });
    }
  }

  // Horizontal splits (33 total): between adjacent columns in same row.
  for (let c = 1; c <= 11; c++) {
    for (let r = 1; r <= 3; r++) {
      const lo = Math.min(cellNumber(c, r), cellNumber(c + 1, r));
      const hi = Math.max(cellNumber(c, r), cellNumber(c + 1, r));
      out.push({
        kind: 'split',
        key: `split:${lo}-${hi}`,
        lo,
        hi,
        style: {
          left: cellLeft(c + 1) - SPLIT_THICK / 2,
          top: cellTop(r),
          width: SPLIT_THICK,
          height: CELL_H,
        },
        label: `Split bet on ${lo} and ${hi}`,
      });
    }
  }

  // Zero splits (3 total): between zero cell and cells (1, r) for r=1..3.
  // Use kind='zero-split' so they don't conflate with regular split overlay counts.
  for (let r = 1; r <= 3; r++) {
    const cellN = cellNumber(1, r);
    out.push({
      kind: 'zero-split',
      key: `split:0-${cellN}`,
      lo: 0,
      hi: cellN,
      style: {
        left: ZERO_W - SPLIT_THICK / 2,
        top: cellTop(r),
        width: SPLIT_THICK,
        height: CELL_H,
      },
      label: `Split bet on 0 and ${cellN}`,
    });
  }

  // Corners (22 total).
  for (let c = 1; c <= 11; c++) {
    for (let r = 1; r <= 2; r++) {
      const topLeft = 3 * c - r;
      out.push({
        kind: 'corner',
        key: `corner:${topLeft}`,
        topLeft,
        style: {
          left: cellLeft(c + 1) - CORNER_SIZE / 2,
          top: cellTop(r + 1) - CORNER_SIZE / 2,
          width: CORNER_SIZE,
          height: CORNER_SIZE,
        },
        label: `Corner bet on ${topLeft}, ${topLeft + 1}, ${topLeft + 3}, ${topLeft + 4}`,
      });
    }
  }

  // Streets (12 total).
  for (let c = 1; c <= 12; c++) {
    const rowStart = 3 * c - 2;
    out.push({
      kind: 'street',
      key: `street:${rowStart}`,
      rowStart,
      style: {
        left: cellLeft(c),
        top: cellTop(3) + CELL_H - STREET_THICK / 2,
        width: CELL_W,
        height: STREET_THICK,
      },
      label: `Street bet on ${rowStart}, ${rowStart + 1}, ${rowStart + 2}`,
    });
  }

  // Six-lines (11 total).
  for (let c = 1; c <= 11; c++) {
    const rowStart = 3 * c - 2;
    out.push({
      kind: 'six-line',
      key: `six-line:${rowStart}`,
      rowStart,
      style: {
        left: cellLeft(c + 1) - SPLIT_THICK / 2,
        top: cellTop(3) + CELL_H - STREET_THICK / 2,
        width: SPLIT_THICK,
        height: STREET_THICK,
      },
      label: `Six-line bet on ${rowStart} through ${rowStart + 5}`,
    });
  }

  return out;
}

// Outside bets chip-stack positions
const OUTSIDE_STACK_POS: Record<string, { left: number; top: number }> = {
  'column:1': { left: cellLeft(13) + COL_BTN_W / 2 - 12, top: cellTop(3) + CELL_H / 2 - 12 },
  'column:2': { left: cellLeft(13) + COL_BTN_W / 2 - 12, top: cellTop(2) + CELL_H / 2 - 12 },
  'column:3': { left: cellLeft(13) + COL_BTN_W / 2 - 12, top: cellTop(1) + CELL_H / 2 - 12 },
  'dozen:1': {
    left: cellLeft(1) + (4 * CELL_W) / 2 - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H / 2 - 12,
  },
  'dozen:2': {
    left: cellLeft(5) + (4 * CELL_W) / 2 - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H / 2 - 12,
  },
  'dozen:3': {
    left: cellLeft(9) + (4 * CELL_W) / 2 - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H / 2 - 12,
  },
  low: {
    left: cellLeft(1) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
  even: {
    left: cellLeft(3) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
  red: {
    left: cellLeft(5) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
  black: {
    left: cellLeft(7) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
  odd: {
    left: cellLeft(9) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
  high: {
    left: cellLeft(11) + CELL_W - 12,
    top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER + EVEN_H / 2 - 12,
  },
};

export interface BettingLayoutProps {
  bets: readonly PlacedBet[];
  disabled: boolean;
  chipAmount: number;
  onPlaceBet: (bet: BetPosition & { amount: number }) => void;
  onRemoveBet: (key: BetPositionKey) => void;
  onClearAll?: () => void;
}

export default function BettingLayout({
  bets,
  disabled,
  chipAmount,
  onPlaceBet,
  onClearAll,
}: BettingLayoutProps): JSX.Element {
  const handleStraight = (n: number) => {
    if (disabled) return;
    onPlaceBet({ ...makeBet({ type: 'straight', n }), amount: chipAmount });
  };

  const overlays = buildOverlays();
  const total = bets.reduce((sum, b) => sum + b.amount, 0);
  const lastBetKey = bets.length > 0 ? bets[bets.length - 1]!.key : null;

  return (
    <div className="mx-auto max-w-[700px]">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <span className="font-display text-[11px] tracking-[0.18em] text-gold">TOTAL BET</span>
        <span className="font-mono text-sm text-gold-bright">{total}</span>
        {onClearAll && (
          <button
            type="button"
            onClick={() => {
              if (!disabled && total > 0) onClearAll();
            }}
            disabled={disabled || total === 0}
            className={[
              'rounded-md border border-brass/40 bg-transparent px-2 py-1 text-[11px] text-ivory/65',
              'hover:bg-ivory/5 disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-table-deep',
            ].join(' ')}
            aria-label="Clear all bets"
          >
            Clear all bets
          </button>
        )}
      </div>
      <div
        data-roulette-felt
        data-disabled={disabled ? 'true' : 'false'}
        className={[
          'relative mx-auto overflow-x-auto rounded-lg p-4',
          'bg-gradient-to-b from-felt-table to-felt-table-deep',
          'shadow-[inset_0_0_0_2px_theme(colors.brass),inset_0_0_0_3px_theme(colors.roulette.pocket)]',
        ].join(' ')}
        style={{ opacity: disabled ? 0.85 : 1 }}
      >
        <div className="relative" style={{ width: FELT_W, height: FELT_H }}>
          {/* Zero cell */}
          <button
            type="button"
            data-cell-number={0}
            data-color="green"
            disabled={disabled}
            onClick={() => handleStraight(0)}
            aria-label="Straight bet on 0"
            className="absolute flex items-center justify-center font-display"
            style={{
              left: 0,
              top: 0,
              width: ZERO_W,
              height: 3 * CELL_H,
              background: CELL_FILLS.green,
              color: '#06120c',
              border: '1px solid rgba(212,175,55,0.6)',
            }}
          >
            0
          </button>

          {/* Number cells 1..36 */}
          {Array.from({ length: 12 }, (_, ci) => ci + 1).flatMap((c) =>
            [1, 2, 3].map((r) => {
              const n = cellNumber(c, r);
              const color = colorOf(n);
              return (
                <button
                  key={n}
                  type="button"
                  data-cell-number={n}
                  data-color={color}
                  disabled={disabled}
                  onClick={() => handleStraight(n)}
                  aria-label={`Straight bet on ${n}`}
                  className="absolute flex items-center justify-center font-display text-white"
                  style={{
                    left: cellLeft(c),
                    top: cellTop(r),
                    width: CELL_W,
                    height: CELL_H,
                    background: CELL_FILLS[color],
                    border: '1px solid rgba(212,175,55,0.6)',
                  }}
                >
                  {n}
                </button>
              );
            }),
          )}

          {/* Column 2:1 buttons (right of the number grid) */}
          {([1, 2, 3] as const).map((rouletteCol) => {
            const row = 4 - rouletteCol; // col 1 → row 3 (bottom), col 2 → row 2, col 3 → row 1 (top)
            return (
              <button
                key={rouletteCol}
                type="button"
                data-outside-bet={`column:${rouletteCol}`}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onPlaceBet({
                    ...makeBet({ type: 'column', col: rouletteCol }),
                    amount: chipAmount,
                  });
                }}
                aria-label={`Column bet on column ${rouletteCol}`}
                className="absolute flex items-center justify-center font-display text-[10px] text-white"
                style={{
                  left: cellLeft(13),
                  top: cellTop(row),
                  width: COL_BTN_W,
                  height: CELL_H,
                  background: 'rgba(11, 31, 17, 0.7)',
                  border: '1px solid rgba(212,175,55,0.6)',
                }}
              >
                2:1
              </button>
            );
          })}

          {/* Dozen row */}
          {(
            [
              { dozen: 1, label: '1st 12' },
              { dozen: 2, label: '2nd 12' },
              { dozen: 3, label: '3rd 12' },
            ] as const
          ).map(({ dozen, label }) => (
            <button
              key={dozen}
              type="button"
              data-outside-bet={`dozen:${dozen}`}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onPlaceBet({ ...makeBet({ type: 'dozen', dozen }), amount: chipAmount });
              }}
              aria-label={`Dozen bet on ${label}`}
              className="absolute flex items-center justify-center font-display text-[11px] text-white"
              style={{
                left: cellLeft(1 + (dozen - 1) * 4),
                top: 3 * CELL_H + GUTTER,
                width: 4 * CELL_W,
                height: DOZEN_H,
                background: 'rgba(11, 31, 17, 0.6)',
                border: '1px solid rgba(212,175,55,0.6)',
              }}
            >
              {label}
            </button>
          ))}

          {/* Even-money row */}
          {(
            [
              { type: 'low', label: '1-18', bg: 'rgba(11, 31, 17, 0.6)' },
              { type: 'even', label: 'EVEN', bg: 'rgba(11, 31, 17, 0.6)' },
              { type: 'red', label: 'RED', bg: 'rgba(163, 18, 42, 0.6)' },
              { type: 'black', label: 'BLACK', bg: 'rgba(15, 15, 15, 0.7)' },
              { type: 'odd', label: 'ODD', bg: 'rgba(11, 31, 17, 0.6)' },
              { type: 'high', label: '19-36', bg: 'rgba(11, 31, 17, 0.6)' },
            ] as const
          ).map(({ type, label, bg }, i) => (
            <button
              key={type}
              type="button"
              data-outside-bet={type}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onPlaceBet({ ...makeBet({ type }), amount: chipAmount });
              }}
              aria-label={label === 'RED' ? 'Red' : label === 'BLACK' ? 'Black' : label}
              className="absolute flex items-center justify-center font-display text-[11px] text-white"
              style={{
                left: cellLeft(1 + i * 2),
                top: 3 * CELL_H + GUTTER + DOZEN_H + GUTTER,
                width: 2 * CELL_W,
                height: EVEN_H,
                background: bg,
                border: '1px solid rgba(212,175,55,0.6)',
              }}
            >
              {label}
            </button>
          ))}

          {/* Edge target overlays (splits, corners, streets, six-lines) */}
          {overlays.map((o) => (
            <button
              key={o.key}
              type="button"
              data-overlay-type={o.kind}
              data-overlay-key={o.key}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (o.kind === 'split' || o.kind === 'zero-split') {
                  onPlaceBet({
                    ...makeBet({ type: 'split', a: o.lo, b: o.hi }),
                    amount: chipAmount,
                  });
                } else if (o.kind === 'corner') {
                  onPlaceBet({
                    ...makeBet({ type: 'corner', topLeft: o.topLeft }),
                    amount: chipAmount,
                  });
                } else if (o.kind === 'street') {
                  onPlaceBet({
                    ...makeBet({ type: 'street', rowStart: o.rowStart }),
                    amount: chipAmount,
                  });
                } else if (o.kind === 'six-line') {
                  onPlaceBet({
                    ...makeBet({ type: 'six-line', rowStart: o.rowStart }),
                    amount: chipAmount,
                  });
                }
              }}
              aria-label={o.label}
              className="absolute z-20 cursor-pointer bg-transparent hover:bg-gold/60"
              style={{ ...o.style, border: 'none' }}
            />
          ))}

          {/* Unified chip-stack rendering */}
          {bets.map((b) => {
            let left: number | undefined;
            let top: number | undefined;
            if (b.type === 'straight') {
              const n = b.numbers[0]!;
              if (n === 0) {
                left = ZERO_W / 2 - 12;
                top = (3 * CELL_H) / 2 - 12;
              } else {
                const c = Math.ceil(n / 3);
                // (n - 1) % 3 → 0 for {1,4,7…} (bottom row), 1 for {2,5,8…} (middle), 2 for {3,6,9…} (top)
                const mod = (n - 1) % 3;
                const r = mod === 0 ? 3 : mod === 1 ? 2 : 1;
                left = cellLeft(c) + CELL_W / 2 - 12;
                top = cellTop(r) + CELL_H / 2 - 12;
              }
            } else if (OUTSIDE_STACK_POS[b.key]) {
              const p = OUTSIDE_STACK_POS[b.key]!;
              left = p.left;
              top = p.top;
            } else {
              // Splits/corners/streets/six-lines: look up overlay position.
              const overlay = overlays.find((o) => o.key === b.key);
              if (!overlay) return null;
              const s = overlay.style;
              left = Number(s.left) + Number(s.width) / 2 - 12;
              top = Number(s.top) + Number(s.height) / 2 - 12;
            }
            return (
              <div
                key={b.key}
                data-bet-stack={b.key}
                {...(b.key === lastBetKey ? { 'data-selected': 'true' } : {})}
                className="pointer-events-none absolute z-30"
                style={{ left, top }}
              >
                <ChipStack amount={b.amount} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
