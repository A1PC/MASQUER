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
      className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-brass/60 bg-velvet-deep p-6"
      data-setup-panel
    >
      <h2 className="font-display text-base tracking-[0.18em] text-gold-bright">
        MASQUER &middot; Plinko
      </h2>

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
                'flex-1 rounded-md border px-3 py-2 font-display text-xs tracking-[0.18em]',
                risk === r
                  ? 'border-brass bg-velvet text-gold-bright'
                  : 'border-brass/40 bg-felt-table-deep text-ivory/80 hover:border-brass',
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
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
          BET PER BALL{' '}
          <span className="ml-2 text-[10px] text-ivory/55">
            ({BET_MIN.toLocaleString()}&ndash;{BET_MAX.toLocaleString()} chips)
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={BET_MIN}
            max={BET_MAX}
            value={bet}
            onChange={(e) =>
              onBetChange(clamp(parseInt(e.target.value, 10) || BET_MIN, BET_MIN, BET_MAX))
            }
            className="w-32 rounded-md border border-brass/60 bg-felt-table-deep px-2 py-1 text-sm text-ivory tabular-nums"
            data-bet-input
          />
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet + 10, BET_MIN, BET_MAX))}
            className="rounded border border-brass/40 px-2 py-1 text-[11px] text-ivory/80 hover:border-brass"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet + 100, BET_MIN, BET_MAX))}
            className="rounded border border-brass/40 px-2 py-1 text-[11px] text-ivory/80 hover:border-brass"
          >
            +100
          </button>
          <button
            type="button"
            onClick={() => onBetChange(clamp(bet * 2, BET_MIN, BET_MAX))}
            className="rounded border border-brass/40 px-2 py-1 text-[11px] text-ivory/80 hover:border-brass"
          >
            &times;2
          </button>
          <button
            type="button"
            onClick={() => onBetChange(BET_MAX)}
            className="rounded border border-brass/40 px-2 py-1 text-[11px] text-ivory/80 hover:border-brass"
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
                'flex-1 rounded-md border px-3 py-2 font-display text-xs tracking-[0.18em]',
                mode === m
                  ? 'border-brass bg-velvet text-gold-bright'
                  : 'border-brass/40 bg-felt-table-deep text-ivory/80 hover:border-brass',
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
            <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">
              BALLS{' '}
              <span className="ml-1 text-[10px] text-ivory/55">
                (max {AUTO_BALLS_MAX.toLocaleString()})
              </span>
            </h3>
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
              className="w-full rounded-md border border-brass/60 bg-felt-table-deep px-2 py-1 text-sm text-ivory tabular-nums"
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
                    'flex-1 rounded-md border px-2 py-1 font-display text-[10px]',
                    autoInterval === k
                      ? 'border-brass bg-velvet text-gold-bright'
                      : 'border-brass/40 text-ivory/80 hover:border-brass',
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
        <span className="text-ivory/55">Balance</span>
        <span className="font-display text-ivory tabular-nums">{balance.toLocaleString()}</span>
      </section>

      {mode === 'manual' ? (
        <button
          type="button"
          onClick={onDrop}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-brass bg-velvet py-3 font-display text-sm tracking-[0.18em] text-ivory disabled:cursor-not-allowed disabled:opacity-40"
          data-drop-button
        >
          DROP ({bet.toLocaleString()})
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartAuto}
          disabled={!canAffordOne}
          className="mt-2 w-full rounded-md border-2 border-brass bg-velvet py-3 font-display text-sm tracking-[0.18em] text-ivory disabled:cursor-not-allowed disabled:opacity-40"
          data-start-auto-button
        >
          START AUTO ({autoBalls.toLocaleString()} &times; {bet.toLocaleString()} ={' '}
          {autoTotal.toLocaleString()})
        </button>
      )}
      {!canAffordOne && (
        <p className="text-center text-[10px] text-casino-red">Need {bet.toLocaleString()} chips</p>
      )}
    </div>
  );
}
