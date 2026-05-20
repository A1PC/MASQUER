import type { JSX } from 'react';
import {
  BET_MIN,
  BET_MAX,
  AUTO_BALLS_MIN,
  AUTO_BALLS_MAX,
  type AutoIntervalKey,
  type Risk,
} from './logic';
import BinRow from './BinRow';

interface Props {
  risk: Risk;
  bet: number;
  mode: 'manual' | 'auto';
  autoBalls: number;
  autoInterval: AutoIntervalKey;
  balance: number;
  onRiskChange: (r: Risk) => void;
  onBetChange: (n: number) => void;
  onModeChange: (m: 'manual' | 'auto') => void;
  onAutoBallsChange: (n: number) => void;
  onAutoIntervalChange: (k: AutoIntervalKey) => void;
  onDrop: () => void;
  onStartAuto: () => void;
}

const RISK_LABELS: Record<Risk, string> = {
  safe: 'SAFE',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

const INTERVAL_LABELS: Record<AutoIntervalKey, string> = {
  slow: 'SLOW',
  normal: 'NORM',
  fast: 'FAST',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function SetupPanel({
  risk,
  bet,
  mode,
  autoBalls,
  autoInterval,
  balance,
  onRiskChange,
  onBetChange,
  onModeChange,
  onAutoBallsChange,
  onAutoIntervalChange,
  onDrop,
  onStartAuto,
}: Props): JSX.Element {
  const canAffordOne = balance >= bet;
  const autoTotal = bet * autoBalls;

  return (
    <div
      className="flex flex-col gap-4 rounded border border-gold/30 bg-felt-deep p-6 max-w-2xl mx-auto"
      data-setup-panel
    >
      <h2 className="font-display text-base tracking-wider text-gold-bright">🔻 PLINKO</h2>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">RISK</h3>
        <div role="radiogroup" aria-label="Risk level" className="flex gap-2">
          {(['safe', 'low', 'medium', 'high'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={risk === r}
              onClick={() => onRiskChange(r)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs font-display tracking-wider',
                risk === r
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {RISK_LABELS[r]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BIN PREVIEW</h3>
        <BinRow risk={risk} />
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BET PER BALL</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={BET_MIN}
            max={BET_MAX}
            value={bet}
            onChange={(e) =>
              onBetChange(clamp(parseInt(e.target.value, 10) || BET_MIN, BET_MIN, BET_MAX))
            }
            className="w-24 rounded-md border border-white/30 bg-felt-deep px-2 py-1 text-sm text-white tabular-nums"
            data-bet-input
          />
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet + 10, BET_MIN, BET_MAX))}
            className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet + 100, BET_MIN, BET_MAX))}
            className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold"
          >
            +100
          </button>
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet * 2, BET_MIN, BET_MAX))}
            className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold"
          >
            ×2
          </button>
          <button
            type="button"
            onClick={() => onBetChange(BET_MAX)}
            className="px-2 py-1 text-[11px] rounded border border-white/20 text-white/70 hover:border-gold"
          >
            MAX
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">MODE</h3>
        <div role="radiogroup" aria-label="Drop mode" className="flex gap-2">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onModeChange(m)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs font-display tracking-wider',
                mode === m
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {mode === 'auto' && (
        <section className="grid grid-cols-2 gap-3">
          <div>
            <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">BALLS</h3>
            <input
              type="number"
              min={AUTO_BALLS_MIN}
              max={AUTO_BALLS_MAX}
              value={autoBalls}
              onChange={(e) =>
                onAutoBallsChange(
                  clamp(
                    parseInt(e.target.value, 10) || AUTO_BALLS_MIN,
                    AUTO_BALLS_MIN,
                    AUTO_BALLS_MAX,
                  ),
                )
              }
              className="w-full rounded-md border border-white/30 bg-felt-deep px-2 py-1 text-sm text-white tabular-nums"
              data-auto-balls-input
            />
          </div>
          <div>
            <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">INTERVAL</h3>
            <div role="radiogroup" aria-label="Auto interval" className="flex gap-1">
              {(['slow', 'normal', 'fast'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={autoInterval === k}
                  onClick={() => onAutoIntervalChange(k)}
                  className={[
                    'flex-1 rounded-md border px-2 py-1 text-[10px] font-display',
                    autoInterval === k
                      ? 'border-gold bg-gold text-felt-deep'
                      : 'border-white/30 text-white/70 hover:border-gold',
                  ].join(' ')}
                >
                  {INTERVAL_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Balance</span>
        <span className="font-display tabular-nums text-white">{balance.toLocaleString()}</span>
      </section>

      {mode === 'manual' ? (
        <button
          type="button"
          onClick={onDrop}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          data-drop-button
        >
          DROP ({bet})
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartAuto}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          data-start-auto-button
        >
          START AUTO ({autoBalls} × {bet} = {autoTotal.toLocaleString()})
        </button>
      )}
      {!canAffordOne && (
        <p className="text-center text-[10px] text-casino-red">Need {bet.toLocaleString()} chips</p>
      )}
    </div>
  );
}
