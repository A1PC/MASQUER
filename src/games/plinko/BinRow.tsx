import type { JSX } from 'react';
import type { Risk } from './logic';
import { MULTIPLIER_CURVES } from './logic';

interface Props {
  risk: Risk;
  flashedBinIdx?: number | null;
}

/** Returns a Tailwind class string for a bin based on its multiplier value. */
function binColor(multi: number): string {
  if (multi >= 100) return 'bg-casino-red text-white border-casino-red';
  if (multi >= 5) return 'bg-gold text-felt-deep border-gold';
  if (multi >= 1) return 'bg-neon-cyan text-felt-deep border-neon-cyan';
  if (multi >= 0.5) return 'bg-white/10 text-white/70 border-white/20';
  return 'bg-casino-red-deep text-white/70 border-casino-red-deep';
}

export default function BinRow({ risk, flashedBinIdx = null }: Props): JSX.Element {
  const curve = MULTIPLIER_CURVES[risk];
  return (
    <div className="flex justify-center gap-1 mt-2" data-bin-row>
      {curve.map((multi, idx) => {
        const flash = flashedBinIdx === idx;
        return (
          <div
            key={idx}
            className={`flex-1 min-w-0 max-w-[42px] py-1 px-0.5 rounded-sm border text-[9px] tabular-nums text-center font-display ${binColor(multi)} ${flash ? 'ring-2 ring-gold animate-pulse' : ''}`}
            data-bin
            data-bin-idx={idx}
            data-flash={flash ? 'true' : 'false'}
          >
            {multi >= 1 ? `${multi}x` : `${multi}x`}
          </div>
        );
      })}
    </div>
  );
}
