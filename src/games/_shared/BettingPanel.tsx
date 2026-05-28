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
  /**
   * When true, the panel does NOT render the intermediate PLACE BET button
   * and does NOT track an internal `committed` state. `callButtons` always
   * receives the current chip-stack amount (or `null` when 0), and the
   * caller is responsible for both placing the bet and triggering the
   * action in one event handler.
   *
   * Slots uses this so SPIN itself IS the commit (player chooses chips,
   * then taps SPIN — no intermediate "place bet" gesture). Default `false`
   * preserves the two-step flow Blackjack / Coin-flip / Roulette rely on.
   */
  singleStepCommit?: boolean;
  /**
   * When true, the chip-stack `amount` is NOT cleared after `onCommit`
   * fires. Used by Slots so the player can SPIN repeatedly with the same
   * bet without re-selecting chips between rounds. CLEAR BET still
   * resets explicitly. Default `false` (caller is expected to remount via
   * `key` if it wants the panel to clear).
   */
  persistBetAcrossCommit?: boolean;
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
  singleStepCommit = false,
  persistBetAcrossCommit = false,
  callButtons,
}: Props): JSX.Element {
  const [amount, setAmount] = useState(0);
  const [committed, setCommitted] = useState<number | null>(null);

  const canAdd = (d: number) => !locked && amount + d <= Math.min(balance, max);
  const onChipClick = (d: number) => {
    if (canAdd(d)) setAmount((a) => a + d);
  };
  const onClear = () => {
    if (locked) return;
    setAmount(0);
    if (persistBetAcrossCommit) setCommitted(null);
  };
  const onRepeat = () => {
    if (lastBet === undefined || locked || lastBet > balance || lastBet > max) return;
    setAmount(lastBet);
    if (autoCommitRepeat && lastBet >= min) {
      onCommit(lastBet);
      if (!persistBetAcrossCommit) setCommitted(lastBet);
    }
  };
  const onCommitClick = () => {
    if (amount < min || amount > max || amount > balance) return;
    onCommit(amount);
    if (!persistBetAcrossCommit) setCommitted(amount);
  };
  // Allow caller to reset committed state when round settles. Exposed via key prop change in CoinFlipPage.
  // In single-step mode the panel forwards the live chip-stack amount (or
  // `null` when zero) so the caller's button can both place the bet and run
  // the action in one click — no intermediate PLACE BET step.
  const callButtonArg: number | null = singleStepCommit ? (amount > 0 ? amount : null) : committed;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-display text-[11px] tracking-[0.18em] text-gold-bright">
          YOUR BET
        </span>
        <span className="font-mono text-[11px] text-ivory/55">
          Balance: {balance.toLocaleString()}
        </span>
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-ivory/55">Add:</span>
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
            className="ml-auto rounded-md border border-brass/60 px-3 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet"
          >
            ↻ Repeat {lastBet}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex flex-1 items-center justify-between rounded-md border border-brass/30 bg-felt-table px-3.5 py-2.5">
          <span className="text-[11px] text-ivory/60">Bet amount</span>
          <span className="font-mono text-xl font-bold text-gold-bright">{amount}</span>
        </div>
        <button
          onClick={onClear}
          disabled={amount === 0 || locked}
          className="rounded-md px-3.5 py-2.5 text-xs text-ivory hover:text-gold-bright disabled:opacity-40"
        >
          Clear
        </button>
        {!singleStepCommit && committed === null && (
          <button
            onClick={onCommitClick}
            disabled={amount < min || amount > balance}
            className="rounded-md border-2 border-brass bg-velvet px-4 py-2.5 font-display text-xs tracking-[0.18em] text-gold-bright shadow-gold-glow hover:bg-velvet-deep disabled:opacity-40"
          >
            PLACE BET
          </button>
        )}
      </div>

      <div>{callButtons(callButtonArg)}</div>
    </div>
  );
}
