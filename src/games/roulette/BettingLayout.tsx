import type { JSX } from 'react';
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

function cellLeft(visualCol: number): number {
  return ZERO_W + (visualCol - 1) * CELL_W;
}
function cellTop(row: number): number {
  return (row - 1) * CELL_H;
}
function cellNumber(visualCol: number, row: number): number {
  return 3 * visualCol - (row - 1);
}

const CELL_FILLS: Record<'red' | 'black' | 'green', string> = {
  red: '#a3122a',
  black: '#1a1a1a',
  green: '#3dd17a',
};

export interface BettingLayoutProps {
  bets: readonly PlacedBet[];
  disabled: boolean;
  chipAmount: number;
  onPlaceBet: (bet: BetPosition & { amount: number }) => void;
  onRemoveBet: (key: BetPositionKey) => void;
}

export default function BettingLayout({
  bets,
  disabled,
  chipAmount,
  onPlaceBet,
}: BettingLayoutProps): JSX.Element {
  const handleStraight = (n: number) => {
    if (disabled) return;
    onPlaceBet({ ...makeBet({ type: 'straight', n }), amount: chipAmount });
  };

  return (
    <div
      data-roulette-felt
      className="relative mx-auto overflow-x-auto rounded-lg p-4"
      style={{
        background: 'linear-gradient(180deg, #0a3a22 0%, #0b2a18 100%)',
        boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 3px #1a1a1a',
      }}
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

        {/* Chip stacks for straight bets */}
        {bets.map((b) => {
          if (b.type !== 'straight') return null;
          const n = b.numbers[0]!;
          let left: number;
          let top: number;
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
          return (
            <div
              key={b.key}
              data-bet-stack={b.key}
              className="pointer-events-none absolute z-10"
              style={{ left, top }}
            >
              <ChipStack amount={b.amount} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
