import type { JSX } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui';

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
  const sliderVal = clamp(raiseAmount, effectiveMin, effectiveMax);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setRaiseAmount(clamp(Math.round(Number(e.target.value)), effectiveMin, effectiveMax));
  }

  function quickRaise(amount: number) {
    setRaiseAmount(clamp(Math.round(amount), effectiveMin, effectiveMax));
  }

  const halfPot = Math.max(effectiveMin, Math.round(pot / 2));
  const threeFourPot = Math.max(effectiveMin, Math.round((pot * 3) / 4));
  const fullPot = Math.max(effectiveMin, pot);
  const allIn = stack;

  const disabled = !isYourTurn;

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-brass/60 bg-velvet-deep p-3"
      data-betting-controls
      {...(disabled ? { 'data-disabled': '' } : {})}
    >
      {/* Primary action row */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 rounded border border-brass/40 bg-velvet font-display tracking-[0.18em] text-ivory hover:bg-velvet-deep"
          disabled={disabled}
          onClick={onFold}
          data-action="fold"
        >
          FOLD
        </Button>

        {canCheck ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 rounded border border-brass/40 bg-felt-table-deep font-display tracking-[0.18em] text-ivory hover:border-brass"
            disabled={disabled}
            onClick={onCheck}
            data-action="check"
          >
            CHECK
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 rounded border border-brass/60 bg-felt-table-deep font-display tracking-[0.18em] text-ivory hover:border-brass"
            disabled={disabled}
            onClick={onCall}
            data-action="call"
          >
            CALL {toCall.toLocaleString()}
          </Button>
        )}
      </div>

      {/* Raise row */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] tracking-[0.18em] text-ivory/55">RAISE</span>
          <span
            className="font-numeral text-[12px] tabular-nums text-gold-bright"
            data-raise-amount
          >
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
          className="w-full accent-brass disabled:cursor-not-allowed disabled:opacity-40"
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
            <Button
              key={label}
              variant="secondary"
              size="sm"
              className="flex-1 rounded border border-brass/40 px-0 py-1 font-display text-[9px] tracking-[0.18em] text-ivory/85 hover:bg-velvet"
              disabled={disabled}
              onClick={() => quickRaise(amount)}
              data-quick={label}
            >
              {label}
            </Button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          className="w-full rounded font-display tracking-[0.18em]"
          disabled={disabled}
          onClick={() => onRaise(sliderVal)}
          data-action="raise"
        >
          RAISE TO {sliderVal.toLocaleString()}
        </Button>
      </div>
    </div>
  );
}
