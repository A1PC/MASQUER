import type { JSX } from 'react';
import { useState } from 'react';

interface Props {
  toCall: number;
  minRaise: number;
  stack: number;
  pot: number;
  isYourTurn: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export default function BettingControls({
  toCall,
  minRaise,
  stack,
  pot,
  isYourTurn,
  onFold,
  onCheck,
  onCall,
  onRaise,
}: Props): JSX.Element {
  const canCheck = toCall === 0;
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const maxRaise = stack;
  const effectiveMin = Math.min(minRaise, maxRaise);
  const effectiveMax = maxRaise;
  // Clamp the stored value to the current valid range on each render
  const sliderVal = clamp(raiseAmount, effectiveMin, effectiveMax);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setRaiseAmount(clamp(Math.round(Number(e.target.value)), effectiveMin, effectiveMax));
  }

  function quickRaise(amount: number) {
    setRaiseAmount(clamp(Math.round(amount), effectiveMin, effectiveMax));
  }

  // Quick raise amounts
  const halfPot = Math.max(effectiveMin, Math.round(pot / 2));
  const threeFourPot = Math.max(effectiveMin, Math.round((pot * 3) / 4));
  const fullPot = Math.max(effectiveMin, pot);
  const allIn = stack;

  const disabled = !isYourTurn;

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-gold/20 bg-felt-deep/90 p-3"
      data-betting-controls
      {...(disabled ? { 'data-disabled': '' } : {})}
    >
      {/* Primary action row */}
      <div className="flex gap-2">
        <button
          className="flex-1 rounded bg-casino-red/80 py-2 font-display text-xs tracking-widest text-white
            hover:bg-casino-red disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          onClick={onFold}
          data-action="fold"
        >
          FOLD
        </button>

        {canCheck ? (
          <button
            className="flex-1 rounded bg-felt/80 py-2 font-display text-xs tracking-widest text-white
              border border-gold/30 hover:bg-felt disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={onCheck}
            data-action="check"
          >
            CHECK
          </button>
        ) : (
          <button
            className="flex-1 rounded bg-neon-cyan/20 py-2 font-display text-xs tracking-widest text-neon-cyan
              border border-neon-cyan/40 hover:bg-neon-cyan/30 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={onCall}
            data-action="call"
          >
            CALL {toCall.toLocaleString()}
          </button>
        )}
      </div>

      {/* Raise row */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] tracking-wider text-white/60">RAISE</span>
          <span className="font-mono text-[12px] tabular-nums text-gold" data-raise-amount>
            {sliderVal.toLocaleString()}
          </span>
        </div>

        <input
          type="range"
          min={effectiveMin}
          max={effectiveMax}
          step={1}
          value={sliderVal}
          onChange={handleSlider}
          disabled={disabled}
          className="w-full accent-gold disabled:cursor-not-allowed disabled:opacity-40"
          data-raise-slider
        />

        {/* Quick buttons */}
        <div className="flex gap-1">
          {[
            { label: '½', amount: halfPot },
            { label: '¾', amount: threeFourPot },
            { label: 'POT', amount: fullPot },
            { label: 'ALL-IN', amount: allIn },
          ].map(({ label, amount }) => (
            <button
              key={label}
              className="flex-1 rounded border border-gold/30 py-1 font-display text-[9px] tracking-wider
                text-white/70 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled}
              onClick={() => quickRaise(amount)}
              data-quick={label}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className="w-full rounded bg-gold/20 py-2 font-display text-xs tracking-widest text-gold
            border border-gold/40 hover:bg-gold/30 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          onClick={() => onRaise(sliderVal)}
          data-action="raise"
        >
          RAISE TO {sliderVal.toLocaleString()}
        </button>
      </div>
    </div>
  );
}
