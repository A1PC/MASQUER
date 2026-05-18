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

const ICON_SIZE = 36;

export default function Paytable({ winningKey = null }: Props): JSX.Element {
  return (
    <div
      data-roulette-layer="paytable"
      className="rounded-md border border-gold/30 bg-felt-deep px-5 py-4"
      style={{ width: 280 }}
    >
      <div className="mb-3 text-center font-display text-[13px] tracking-[2.5px] text-gold">
        PAYOUT TABLE
      </div>
      <div className="flex flex-col gap-2">
        {ROWS.map((row) => {
          const isWinner = winningKey === row.key;
          return (
            <div
              key={row.key}
              data-payout-key={row.key}
              {...(isWinner ? { 'data-winning': 'true' } : {})}
              className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded px-2 py-1.5"
              style={{
                background: isWinner ? 'rgba(212,175,55,0.18)' : 'transparent',
                transition: 'background 0.2s ease-out',
              }}
            >
              <div className="flex gap-1">
                {row.symbols.map((s, i) =>
                  s ? (
                    <SymbolView key={i} symbol={s} size={ICON_SIZE} />
                  ) : (
                    <div key={i} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                  ),
                )}
              </div>
              <span className="text-[12px] text-white/40">→</span>
              <span className="text-[12px] text-white/70" />
              <span className="font-mono text-[14px] font-bold text-gold-bright">
                {SLOTS_PAYTABLE[row.key]}×
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
