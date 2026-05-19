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

const TIER_LABELS = {
  tier1: 'LINE',
  tier2: 'BONUS',
  tier3: 'WINNER',
} as const;

export default function CpuCardMini({
  cpu,
  cpuIdx,
  variant,
  highlightTier = null,
}: Props): JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded border border-white/10 bg-felt-deep/50 p-1"
      data-cpu-card
      data-cpu-idx={cpuIdx}
    >
      <div
        className={`text-[9px] tracking-wider font-display ${highlightTier ? 'text-green-300' : 'text-white/50'}`}
      >
        CPU {cpuIdx + 1}
        {highlightTier && ` · ${TIER_LABELS[highlightTier]}`}
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
