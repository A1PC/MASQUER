import type { JSX } from 'react';
import SymbolView from './SymbolView';
import { SLOTS_PAYTABLE } from './config';
import type { Symbol as SymbolType, PayoutHit } from './types';

interface Props {
  /** When set, the matching row is highlighted. */
  winningKey?: PayoutHit['key'] | null;
}

interface Row {
  key: PayoutHit['key'];
  symbols: readonly [SymbolType, SymbolType, SymbolType | null];
}

/** Payout-descending order (locked for rendering). */
const ROWS: readonly Row[] = [
  { key: 'seven-seven-seven', symbols: ['seven', 'seven', 'seven'] },
  { key: 'bar-bar-bar', symbols: ['bar', 'bar', 'bar'] },
  { key: 'bell-bell-bell', symbols: ['bell', 'bell', 'bell'] },
  { key: 'lemon-lemon-lemon', symbols: ['lemon', 'lemon', 'lemon'] },
  { key: 'cherry-cherry-cherry', symbols: ['cherry', 'cherry', 'cherry'] },
  { key: 'two-cherry', symbols: ['cherry', 'cherry', null] }, // 3rd cell blank
];

const ICON_SIZE = 32;

export default function Paytable({ winningKey = null }: Props): JSX.Element {
  return (
    <div
      data-roulette-layer="paytable"
      className="w-[300px] rounded-md border border-brass/70 bg-felt-table-deep px-4 py-4 shadow-[inset_0_0_18px_rgba(0,0,0,0.4)]"
    >
      <div className="mb-3 text-center font-display text-[12px] uppercase tracking-[0.22em] text-gold">
        Payout Table
      </div>
      <div className="flex flex-col gap-1.5">
        {ROWS.map((row) => {
          const isWinner = winningKey === row.key;
          return (
            <div
              key={row.key}
              data-payout-key={row.key}
              {...(isWinner ? { 'data-winning': 'true' } : {})}
              className={[
                'grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-sm px-2 py-1.5',
                'transition-colors duration-200',
                isWinner ? 'bg-gold/20 ring-1 ring-gold/50' : 'bg-transparent',
              ].join(' ')}
            >
              <div className="flex gap-0.5">
                {row.symbols.map((s, i) =>
                  s ? (
                    <SymbolView key={i} symbol={s} size={ICON_SIZE} />
                  ) : (
                    <div key={i} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                  ),
                )}
              </div>
              <span className="text-right font-mono text-[11px] uppercase tracking-wider text-ivory/55">
                {ROW_LABELS[row.key]}
              </span>
              <span className="font-mono text-[15px] font-bold text-gold-bright">
                {SLOTS_PAYTABLE[row.key]}×
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact label for each paytable row — short enough to fit on the left rail. */
const ROW_LABELS: Record<PayoutHit['key'], string> = {
  'seven-seven-seven': 'Jackpot',
  'bar-bar-bar': '3× BAR',
  'bell-bell-bell': '3× Bell',
  'lemon-lemon-lemon': '3× Lemon',
  'cherry-cherry-cherry': '3× Cherry',
  'two-cherry': '2× Cherry',
};
