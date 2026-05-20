import type { JSX } from 'react';
import { useState } from 'react';
import type { StakesTier } from './stakesConfig';
import { STAKES } from './stakesConfig';

type TableSize = 2 | 3 | 4 | 5 | 6;

interface Props {
  balance: number | null;
  onSitDown: (config: {
    tableSize: TableSize;
    stakes: { sb: number; bb: number };
    buyIn: number;
  }) => void;
}

export default function SetupPanel({ balance, onSitDown }: Props): JSX.Element {
  const [tableSize, setTableSize] = useState<TableSize>(4);
  const [tier, setTier] = useState<StakesTier>('low');
  const [buyIn, setBuyIn] = useState(STAKES.low.defaultBuyIn);

  const stakesCfg = STAKES[tier];
  const effectiveBuyIn = Math.max(stakesCfg.minBuyIn, Math.min(stakesCfg.maxBuyIn, buyIn));
  const canSit = balance !== null && balance >= stakesCfg.minBuyIn;

  function handleTierChange(t: StakesTier) {
    setTier(t);
    setBuyIn(STAKES[t].defaultBuyIn);
  }

  function handleBuyInSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setBuyIn(Math.round(Number(e.target.value)));
  }

  function handleSitDown() {
    onSitDown({
      tableSize,
      stakes: { sb: stakesCfg.sb, bb: stakesCfg.bb },
      buyIn: effectiveBuyIn,
    });
  }

  return (
    <div
      className="mx-auto flex max-w-md flex-col gap-6 rounded-lg border border-gold/30 bg-felt-deep/90 p-6"
      data-setup-panel
    >
      <h2 className="font-display text-lg tracking-widest text-gold-bright text-center">
        TEXAS HOLD&apos;EM
      </h2>

      {/* Table size */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-xs tracking-wider text-white/60">TABLE SIZE</label>
        <div className="flex gap-2" data-table-size-group>
          {([2, 3, 4, 5, 6] as TableSize[]).map((n) => (
            <button
              key={n}
              className={`flex-1 rounded py-2 font-display text-xs tracking-wider
                ${
                  tableSize === n
                    ? 'bg-gold text-felt-deep'
                    : 'border border-gold/30 text-white/70 hover:bg-gold/10'
                }`}
              onClick={() => setTableSize(n)}
              data-table-size={n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Stakes tier */}
      <div className="flex flex-col gap-2">
        <label className="font-display text-xs tracking-wider text-white/60">STAKES</label>
        <div className="flex gap-2" data-stakes-group>
          {(['low', 'mid', 'high'] as StakesTier[]).map((t) => (
            <button
              key={t}
              className={`flex-1 rounded py-2 font-display text-xs tracking-wider
                ${
                  tier === t
                    ? 'bg-gold text-felt-deep'
                    : 'border border-gold/30 text-white/70 hover:bg-gold/10'
                }`}
              onClick={() => handleTierChange(t)}
              data-stakes-tier={t}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-center text-[11px] text-white/50">{stakesCfg.label}</span>
      </div>

      {/* Buy-in slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="font-display text-xs tracking-wider text-white/60">BUY-IN</label>
          <span className="font-mono text-sm tabular-nums text-gold" data-buyin-amount>
            {effectiveBuyIn.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={stakesCfg.minBuyIn}
          max={stakesCfg.maxBuyIn}
          step={stakesCfg.bb}
          value={effectiveBuyIn}
          onChange={handleBuyInSlider}
          className="w-full accent-gold"
          data-buyin-slider
        />
        <div className="flex justify-between text-[10px] text-white/40">
          <span>{stakesCfg.minBuyIn.toLocaleString()}</span>
          <span>{stakesCfg.maxBuyIn.toLocaleString()}</span>
        </div>
      </div>

      {/* Balance display */}
      <div className="text-center text-[11px] text-white/50">
        Balance:{' '}
        <span className="font-mono tabular-nums text-gold-bright">
          {balance !== null ? balance.toLocaleString() : '—'}
        </span>
      </div>

      {/* SIT DOWN */}
      <button
        className="w-full rounded bg-gold py-3 font-display text-sm tracking-widest text-felt-deep
          hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canSit}
        onClick={handleSitDown}
        data-sit-down
      >
        SIT DOWN
      </button>

      {!canSit && balance !== null && (
        <p className="text-center text-[10px] text-casino-red" data-insufficient>
          Insufficient balance. Min buy-in: {stakesCfg.minBuyIn.toLocaleString()}
        </p>
      )}
    </div>
  );
}
