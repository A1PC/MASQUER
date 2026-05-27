import type { JSX } from 'react';
import { useState } from 'react';
import { CRAPS_STAKES, type StakesTier } from './stakes';

interface Props {
  balance: number | null;
  onSitDown: (config: { tier: StakesTier; buyIn: number }) => void;
}

/**
 * `SetupPanel` — the buy-in screen shown before the player sits down at the
 * craps table. Mirrors the poker SetupPanel: full-width brass-edged
 * velvet-deep panel, gold-bright title, ivory/55 labels, gold buy-in slider,
 * casino-red "insufficient balance" warning.
 */
export default function SetupPanel({ balance, onSitDown }: Props): JSX.Element {
  const [tier, setTier] = useState<StakesTier>('low');
  const cfg = CRAPS_STAKES[tier];
  const [buyIn, setBuyIn] = useState(cfg.buyInMin);

  function handleTierChange(t: StakesTier) {
    setTier(t);
    setBuyIn(CRAPS_STAKES[t].buyInMin);
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setBuyIn(Math.round(Number(e.target.value)));
  }

  const effectiveBuyIn = Math.max(cfg.buyInMin, Math.min(cfg.buyInMax, buyIn));
  const canSit = balance !== null && balance >= cfg.buyInMin;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6"
      data-setup-panel
    >
      <h2 className="text-center font-display text-lg tracking-[0.18em] text-gold-bright">CRAPS</h2>

      {/* Stakes tier */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-xs tracking-[0.18em] text-ivory/55">TABLE</label>
        <div className="flex gap-2" data-stakes-group>
          {(['low', 'mid', 'high'] as StakesTier[]).map((t) => (
            <button
              key={t}
              className={[
                'flex-1 rounded py-2 font-display text-xs tracking-[0.18em]',
                tier === t
                  ? 'bg-gold text-felt-deep'
                  : 'border border-brass/40 text-ivory/85 hover:bg-velvet',
              ].join(' ')}
              onClick={() => handleTierChange(t)}
              data-stakes-tier={t}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-center text-[11px] text-ivory/55">
          Min bet {cfg.tableMin.toLocaleString()} · Max {cfg.tableMax.toLocaleString()} ·{' '}
          {cfg.oddsMultiple}× odds
        </span>
      </div>

      {/* Buy-in slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-display text-xs tracking-[0.18em] text-ivory/55">BUY-IN</label>
          <span className="font-mono text-sm tabular-nums text-gold-bright" data-buyin-amount>
            {effectiveBuyIn.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={cfg.buyInMin}
          max={cfg.buyInMax}
          step={cfg.tableMin}
          value={effectiveBuyIn}
          onChange={handleSlider}
          className="w-full accent-brass"
          data-buyin-slider
        />
        <div className="flex justify-between text-[10px] text-ivory/55">
          <span>{cfg.buyInMin.toLocaleString()}</span>
          <span>{cfg.buyInMax.toLocaleString()}</span>
        </div>
      </div>

      {/* Balance display */}
      <div className="text-center text-[11px] text-ivory/55">
        Balance:{' '}
        <span className="font-mono tabular-nums text-gold-bright">
          {balance !== null ? balance.toLocaleString() : '—'}
        </span>
      </div>

      {/* SIT DOWN */}
      <button
        className="w-full rounded bg-gold py-3 font-display text-sm tracking-[0.18em] text-felt-deep hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canSit}
        onClick={() => onSitDown({ tier, buyIn: effectiveBuyIn })}
        data-sit-down
      >
        SIT DOWN
      </button>

      {!canSit && balance !== null && (
        <p className="text-center text-[10px] text-casino-red" data-insufficient>
          Insufficient balance. Min buy-in: {cfg.buyInMin.toLocaleString()}
        </p>
      )}
    </div>
  );
}
