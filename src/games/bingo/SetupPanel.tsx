// STUB: SetupPanel is simplified for PR A (references to BINGO_CONFIG removed).
// PR B/C will rewrite with difficulty + variant pickers.
import type { JSX } from 'react';
import { BUY_IN, type BingoSpeed } from './logic';

interface Props {
  cardCount: number;
  speed: BingoSpeed;
  balance: number;
  onCardCountChange: (n: number) => void;
  onSpeedChange: (s: BingoSpeed) => void;
  onBuyAndStart: () => void;
}

const SPEED_LABELS: Record<BingoSpeed, string> = {
  slow: 'Slow (3s)',
  normal: 'Normal (2s)',
  fast: 'Fast (1s)',
};

export default function SetupPanel({
  cardCount,
  speed,
  balance,
  onCardCountChange,
  onSpeedChange,
  onBuyAndStart,
}: Props): JSX.Element {
  const cost = cardCount * BUY_IN;
  const canAfford = balance >= cost;
  return (
    <div
      className="flex flex-col gap-4 rounded border border-gold/30 bg-felt-deep p-6"
      data-setup-panel
    >
      <h2 className="font-display text-base tracking-wider text-gold-bright">SETUP</h2>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">CARDS</h3>
        <div role="radiogroup" aria-label="Number of cards" className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={cardCount === n}
              onClick={() => onCardCountChange(n)}
              className={[
                'h-10 w-12 rounded-md border text-sm font-display tabular-nums',
                cardCount === n
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-[11px] tracking-[0.18em] text-gold">SPEED</h3>
        <div role="radiogroup" aria-label="Call speed" className="flex gap-2">
          {(['slow', 'normal', 'fast'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => onSpeedChange(s)}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-xs',
                speed === s
                  ? 'border-gold bg-gold text-felt-deep'
                  : 'border-white/30 bg-felt-deep text-white/70 hover:border-gold',
              ].join(' ')}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Cost</span>
        <span className="font-display tabular-nums text-gold-bright">
          {cost.toLocaleString()} chips
        </span>
      </section>

      <section className="flex items-center justify-between text-xs">
        <span className="text-white/60">Balance</span>
        <span className="font-display tabular-nums text-white">
          {balance.toLocaleString()} chips
        </span>
      </section>

      <button
        type="button"
        onClick={onBuyAndStart}
        disabled={!canAfford}
        className="mt-2 w-full rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        BUY &amp; START
      </button>
      {!canAfford && (
        <p className="text-center text-[10px] text-casino-red">
          Not enough chips (need {cost.toLocaleString()})
        </p>
      )}
    </div>
  );
}
