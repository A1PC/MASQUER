import type { JSX } from 'react';
import { BIN_COUNT, binCentreX } from './geometry';
import type { Risk } from './logic';
import { MULTIPLIER_CURVES } from './logic';

interface Props {
  risk: Risk;
  flashedBinIdx?: number | null;
}

/** Short-form multiplier label so 5-digit High-risk edges (60000x) still fit
 *  inside narrow buckets on the gameplay board. */
function fmtMulti(multi: number): string {
  if (multi >= 1000) {
    const k = multi / 1000;
    const decimals = k >= 10 ? 0 : 1;
    return `${k.toFixed(decimals).replace(/\.0$/, '')}k×`;
  }
  return `${multi}×`;
}

/** Returns the bin's visual tier for styling — used to colour-grade buckets
 *  from edge (signature jewel-magenta) to centre (loss territory). */
function binTier(multi: number): 'jackpot' | 'big' | 'small' | 'push' | 'loss' {
  if (multi >= 100) return 'jackpot';
  if (multi >= 5) return 'big';
  if (multi >= 1) return 'small';
  if (multi >= 0.85) return 'push';
  return 'loss';
}

function tierClass(tier: ReturnType<typeof binTier>, isEdge: boolean): string {
  if (isEdge) {
    // Edge bins (0 + 26) get the signature jewel-magenta tier-3 chrome.
    return 'bg-jewel-magenta/40 text-ivory border-brass';
  }
  switch (tier) {
    case 'jackpot':
      return 'bg-velvet text-gold-bright border-brass';
    case 'big':
      return 'bg-velvet-deep text-gold-bright border-brass/80';
    case 'small':
      return 'bg-felt-table-deep text-gold border-brass/60';
    case 'push':
      return 'bg-felt-table-deep/80 text-ivory/80 border-brass/40';
    case 'loss':
    default:
      return 'bg-felt-table-deep/60 text-ivory/55 border-brass/30';
  }
}

/** 27 buckets aligned with the bottom peg row of the pyramid. Each bucket is
 *  absolutely positioned at `binCentreX(bin)` (% of board width), spanning
 *  100/BIN_COUNT of the width. No vertical gap between BinRow and Board's
 *  bottom peg row — they touch (visually the pyramid's base). */
export default function BinRow({ risk, flashedBinIdx = null }: Props): JSX.Element {
  const curve = MULTIPLIER_CURVES[risk];
  const widthPct = 100 / BIN_COUNT;
  return (
    <div className="relative mx-auto h-5 w-full max-w-full" data-bin-row>
      {curve.map((multi, idx) => {
        const flash = flashedBinIdx === idx;
        const isEdge = idx === 0 || idx === BIN_COUNT - 1;
        const tier = binTier(multi);
        const centre = binCentreX(idx);
        return (
          <div
            key={idx}
            className={[
              'absolute flex h-5 -translate-x-1/2 items-center justify-center overflow-hidden rounded-sm border text-center',
              'font-mono text-[7px] tabular-nums leading-none',
              tierClass(tier, isEdge),
              flash ? 'ring-2 ring-gold shadow-[0_0_8px_rgba(232,189,109,0.85)]' : '',
            ].join(' ')}
            style={{
              left: `${centre}%`,
              top: 0,
              width: `${widthPct}%`,
              transform: flash ? 'translate(-50%, 0) scale(1.08)' : undefined,
              transition: 'transform 180ms ease-out',
            }}
            data-bin
            data-bin-idx={idx}
            data-bin-tier={tier}
            data-bin-edge={isEdge ? 'true' : 'false'}
            data-flash={flash ? 'true' : 'false'}
          >
            {fmtMulti(multi)}
          </div>
        );
      })}
    </div>
  );
}
