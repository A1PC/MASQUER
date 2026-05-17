// eslint-disable-next-line react-refresh/only-export-components
export { breakdown } from './chipBreakdown';
import type { JSX } from 'react';
import type { ChipDenomination } from './config';
import { breakdown } from './chipBreakdown';

const CHIP_COLORS: Record<ChipDenomination, { bg: string; ring: string; text: string }> = {
  5: { bg: '#e85d75', ring: '#fff', text: '#fff' },
  25: { bg: '#3dd17a', ring: '#fff', text: '#06120c' },
  100: { bg: '#1a1a1a', ring: '#d4af37', text: '#ffe066' },
  250: { bg: '#ffd23f', ring: '#1a1a1a', text: '#06120c' },
  500: { bg: '#7a3fff', ring: '#fff', text: '#fff' },
  1000: { bg: '#ff7a3f', ring: '#fff', text: '#06120c' },
};

interface Props {
  amount: number;
  /** Optional fixed size for the chip. Default 24px. */
  size?: number;
}

const OVERFLOW_THRESHOLD = 6;

export default function ChipStack({ amount, size = 24 }: Props): JSX.Element | null {
  const chips = breakdown(amount);
  if (chips.length === 0) return null;

  if (chips.length <= OVERFLOW_THRESHOLD) {
    return (
      <div
        className="pointer-events-none relative"
        style={{ width: size, height: size + chips.length * 3 }}
      >
        {chips.map((d, i) => {
          const palette = CHIP_COLORS[d];
          return (
            <div
              key={`${d}-${i}`}
              data-chip-denom={d}
              className="absolute left-0 grid place-items-center rounded-full text-[9px] font-bold"
              style={{
                width: size,
                height: size,
                bottom: i * 3,
                background: palette.bg,
                color: palette.text,
                border: `2px solid ${palette.ring}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    );
  }

  // Overflow: top chip + total badge below
  const top = chips[0]!;
  const palette = CHIP_COLORS[top];
  return (
    <div
      data-chip-stack-overflow
      className="pointer-events-none relative grid place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: palette.bg,
        color: palette.text,
        border: `2px solid ${palette.ring}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        fontSize: 9,
      }}
    >
      {top}
      <span
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-felt-deep px-1 text-[9px] text-gold-bright"
        style={{ border: '1px solid #d4af37' }}
      >
        {amount}
      </span>
    </div>
  );
}
