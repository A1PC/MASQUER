// STUB: EndScreen simplified for PR A (BingoTier removed).
// PR C will rewrite with Tier type from new logic.
import type { JSX } from 'react';
import { Link } from 'react-router';

interface CardState {
  card: { id: string };
  daubed: boolean[][];
  achievedTiers: ReadonlySet<string>;
}

interface Props {
  cards: ReadonlyArray<CardState>;
  wins: ReadonlyArray<{ cardId: string; tier: string; payout: number }>;
  onPlayAgain: () => void;
}

export default function EndScreen({ cards, wins, onPlayAgain }: Props): JSX.Element {
  const totalPayout = wins.reduce((s, w) => s + w.payout, 0);
  const perCard = cards.map((cardState) => {
    const cardWins = wins.filter((w) => w.cardId === cardState.card.id);
    const cardPayout = cardWins.reduce((s, w) => s + w.payout, 0);
    return { card: cardState.card, tiers: cardWins.map((w) => w.tier), payout: cardPayout };
  });

  return (
    <section className="rounded border border-gold/40 bg-felt-deep p-6" data-end-screen>
      <h2 className="mb-4 text-center font-display text-xl tracking-wider text-gold-bright">
        GAME OVER
      </h2>

      <div
        className="mb-4 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${perCard.length}, minmax(0, 1fr))` }}
      >
        {perCard.map(({ card, tiers, payout }, idx) => (
          <div
            key={card.id}
            className="rounded border border-white/15 bg-black/20 p-3 text-center"
            data-end-card
            data-card-id={card.id}
          >
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
              Card {idx + 1}
            </p>
            {tiers.length === 0 ? (
              <p className="text-xs text-white/40">No wins</p>
            ) : (
              <div className="flex flex-col gap-1">
                {tiers.map((tier) => (
                  <span
                    key={tier}
                    className="rounded bg-gold/30 px-2 py-0.5 text-[10px] text-gold-bright"
                  >
                    {tier}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 font-display text-sm tabular-nums text-gold-bright">
              +{payout.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 text-center">
        <p className="text-xs uppercase tracking-wider text-white/40">Total won</p>
        <p className="font-display text-3xl tabular-nums text-gold-bright">
          {totalPayout.toLocaleString()} chips
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 rounded-md border-2 border-gold bg-casino-red py-3 font-display text-sm tracking-wider text-white"
        >
          PLAY AGAIN
        </button>
        <Link
          to="/lobby"
          className="flex-1 rounded-md border border-white/30 bg-felt-deep py-3 text-center font-display text-sm tracking-wider text-white/80 hover:text-white"
        >
          BACK TO LOBBY
        </Link>
      </div>
    </section>
  );
}
