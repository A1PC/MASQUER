import type { JSX } from 'react';
import type { Hand } from './types';
import { canDouble, canSplit } from './hand';
import { BLACKJACK_CONFIG } from './config';

interface Props {
  hands: readonly Hand[];
  activeHandIdx: number;
  balance: number;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
}

export default function ActionPanel({
  hands,
  activeHandIdx,
  balance,
  onHit,
  onStand,
  onDouble,
  onSplit,
}: Props): JSX.Element {
  const active = hands[activeHandIdx];
  const canHit = active !== undefined && !active.resolved && !active.fromSplitAces;
  const canDoubleNow =
    active !== undefined && canDouble(active, BLACKJACK_CONFIG.DAS) && balance >= active.betAmount;
  const canSplitNow =
    active !== undefined &&
    canSplit(active, hands.length, BLACKJACK_CONFIG.MAX_HANDS) &&
    balance >= active.betAmount;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-[1.5px] text-gold">YOUR MOVE</span>
        <span className="font-mono text-[11px] text-white/50">
          Balance: {balance} · Bet: {active?.betAmount ?? 0}
        </span>
      </div>
      <div className="flex gap-2.5">
        <Btn label="HIT" onClick={onHit} enabled={canHit} primary />
        <Btn label="STAND" onClick={onStand} enabled={canHit} primary />
        <Btn label="DOUBLE" onClick={onDouble} enabled={canDoubleNow} />
        <Btn label="SPLIT" onClick={onSplit} enabled={canSplitNow} />
      </div>
      {!canSplitNow && active && active.cards.length === 2 && (
        <p className="mt-2 text-center text-[11px] text-white/40">
          Split unavailable:{' '}
          {hands.length >= BLACKJACK_CONFIG.MAX_HANDS
            ? `max ${BLACKJACK_CONFIG.MAX_HANDS} hands`
            : "cards aren't matching ranks"}
        </p>
      )}
    </div>
  );
}

function Btn({
  label,
  onClick,
  enabled,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  enabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`flex-1 rounded-lg border-2 border-gold py-3.5 font-display text-[15px] tracking-[1.5px] ${
        primary ? 'bg-casino-red text-white' : 'bg-transparent text-gold-bright'
      } disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {label}
    </button>
  );
}
