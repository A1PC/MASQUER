import type { JSX } from 'react';
import BingoCard from './BingoCard';
import type { CpuCardState } from './machine';
import type { Variant } from './logic';

interface Props {
  cpu: CpuCardState;
  cpuIdx: number;
  variant: Variant;
  /** Highest tier this CPU has claimed in the game, or null. */
  highlightTier?: 'tier1' | 'tier2' | 'tier3' | null;
}

/** Compact CPU mini-card tier label. tier2 copy differs per variant so the
 *  American "FOUR CORNERS" reads correctly instead of the generic "BONUS"
 *  (which suits British double-line). Kept short to fit the 9px gutter. */
function tierLabelFor(tier: 'tier1' | 'tier2' | 'tier3', variant: Variant): string {
  if (tier === 'tier1') return 'LINE';
  if (tier === 'tier3') return 'WINNER';
  // tier2 — VARIANT-BRANCH (audit §2.8 cold-look)
  return variant === 'american' ? 'CORNERS' : 'BONUS';
}

/** Mini CPU card. Same daubed-cell magenta ring as the player's BingoCard
 *  (just smaller). Label tone shifts gold-bright when this CPU has hit
 *  any tier so the operator/player can read at a glance who's where. */
export default function CpuCardMini({
  cpu,
  cpuIdx,
  variant,
  highlightTier = null,
}: Props): JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-md border border-brass/40 bg-felt-table-deep p-1"
      data-cpu-card
      data-cpu-idx={cpuIdx}
    >
      <div
        className={`font-display text-[9px] tracking-[0.18em] ${
          highlightTier === 'tier3'
            ? 'text-gold-bright'
            : highlightTier
              ? 'text-gold'
              : 'text-ivory/50'
        }`}
      >
        CPU {cpuIdx + 1}
        {highlightTier && ` · ${tierLabelFor(highlightTier, variant)}`}
      </div>
      <BingoCard
        card={cpu.card}
        daubed={cpu.daubed}
        variant={variant}
        size="mini"
        highlight={highlightTier}
      />
    </div>
  );
}
