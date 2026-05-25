import type { JSX } from 'react';
import { useState } from 'react';
import ChipDenominationButton from './ChipDenominationButton';

interface Props {
  min: number;
  max: number;
  balance: number;
  denominations?: readonly number[];
  /** Optional last-bet amount for the "Repeat last" pill. */
  lastBet?: number;
  /** Called when the user wants to commit a bet of the current amount. */
  onCommit: (amount: number) => void;
  /** True when a bet is committed but the round hasn't been settled yet. */
  locked?: boolean;
  /** When true, clicking "Repeat last" also commits the bet immediately
   *  (skipping the manual Place-Bet step). Defaults to false to preserve
   *  the two-step flow other games rely on. */
  autoCommitRepeat?: boolean;
  /** Render-prop for the game-specific call buttons (HEADS/TAILS, HIT/STAND...). */
  callButtons: (committedAmount: number | null) => JSX.Element;
}

const DEFAULT_DENOMINATIONS = [1, 5, 25, 100, 500, 1000] as const;

export default function BettingPanel({
  min,
  max,
  balance,
  denominations = DEFAULT_DENOMINATIONS,
  lastBet,
  onCommit,
  locked = false,
  autoCommitRepeat = false,
  callButtons,
}: Props): JSX.Element {
  const [amount, setAmount] = useState(0);
  const [committed, setCommitted] = useState<number | null>(null);

  const canAdd = (d: number) => !locked && amount + d <= Math.min(balance, max);
  const onChipClick = (d: number) => {
    if (canAdd(d)) setAmount((a) => a + d);
  };
  const onClear = () => {
    if (!locked) setAmount(0);
  };
  const onRepeat = () => {
    if (lastBet === undefined || locked || lastBet > balance || lastBet > max) return;
    setAmount(lastBet);
    if (autoCommitRepeat && lastBet >= min) {
      onCommit(lastBet);
      setCommitted(lastBet);
    }
  };
  const onCommitClick = () => {
    if (amount < min || amount > max || amount > balance) return;
    onCommit(amount);
    setCommitted(amount);
  };
  // Allow caller to reset committed state when round settles. Exposed via key prop change in CoinFlipPage.

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-wider text-gold">YOUR BET</span>
        <span className="font-mono text-[11px] text-white/50">
          Balance: {balance.toLocaleString()}
        </span>
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-white/50">Add:</span>
        {denominations.map((d) => (
          <ChipDenominationButton
            key={d}
            denomination={d}
            disabled={!canAdd(d)}
            onClick={() => onChipClick(d)}
            ariaLabel={`Add ${d} chips to bet`}
          />
        ))}
        {lastBet !== undefined && lastBet > 0 && !locked && (
          <button
            onClick={onRepeat}
            className="ml-auto rounded-md border border-gold bg-gold/15 px-3 py-2 text-xs text-gold-bright hover:bg-gold/25"
          >
            ↻ Repeat {lastBet}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex flex-1 items-center justify-between rounded-md border border-gold/30 bg-felt px-3.5 py-2.5">
          <span className="text-[11px] text-white/60">Bet amount</span>
          <span className="font-mono text-xl font-bold text-gold-bright">{amount}</span>
        </div>
        <button
          onClick={onClear}
          disabled={amount === 0 || locked}
          className="rounded-md border border-white/20 bg-transparent px-3.5 py-2.5 text-xs text-white/60 hover:bg-white/5 disabled:opacity-40"
        >
          Clear
        </button>
        {committed === null && (
          <button
            onClick={onCommitClick}
            disabled={amount < min || amount > balance}
            className="rounded-md bg-casino-red px-4 py-2.5 font-display text-sm tracking-wider text-white shadow-gold-glow hover:bg-casino-red-deep disabled:opacity-40"
          >
            PLACE BET
          </button>
        )}
      </div>

      <div>{callButtons(committed)}</div>
    </div>
  );
}
