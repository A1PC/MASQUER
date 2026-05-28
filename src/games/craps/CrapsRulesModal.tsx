import type { JSX } from 'react';
import RulesModal from '@/games/_shared/RulesModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Body(): JSX.Element {
  return (
    <div className="space-y-3 text-ivory/85" data-craps-rules-body>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">OBJECT</h3>
        <p>
          Bet on the outcome of a two-dice roll. The come-out roll establishes a point; subsequent
          rolls resolve bets until the point is made or a seven-out.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">
          PASS LINE / DON&apos;T PASS
        </h3>
        <p>
          Pass wins on come-out 7 or 11; loses on 2, 3, 12. Otherwise the rolled total becomes the
          point — Pass wins if it&apos;s made before a 7. Don&apos;t Pass mirrors with the 12 as a
          push.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">
          COME / DON&apos;T COME
        </h3>
        <p>
          Available during the point phase. Acts like a fresh Pass/Don&apos;t Pass bet — the next
          roll becomes its own travelling come-point.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">PLACE 4-10</h3>
        <p>
          Bet that a specific number (4, 5, 6, 8, 9, 10) will roll before a 7. Payouts: 9:5 on 4/10,
          7:5 on 5/9, 7:6 on 6/8. Off on come-out.
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">FIELD</h3>
        <p>One-roll bet on 2/3/4/9/10/11/12. Pays 1:1, with 2&times; on 2 and 3&times; on 12.</p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">HARDWAYS</h3>
        <p>
          Bet that 4/6/8/10 will roll as a pair before either a 7 or an easy version. Pays 7:1
          (4/10) or 9:1 (6/8).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">
          PROPOSITIONS
        </h3>
        <p>
          One-roll bets: Any 7 (4:1), Any Craps (7:1), 2 / 12 (30:1), 3 / 11 (15:1), Horn (combined
          2/3/11/12), C&amp;E (Any Craps + 11).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold-bright">TABLE</h3>
        <p>
          Cash-game table session. Buy-in at the chosen tier; rebuy on bust; LEAVE TABLE at any time
          to credit the final bankroll.
        </p>
      </section>
    </div>
  );
}

/**
 * Craps-specific `RulesModal` wrapper. Mirrors `PokerRulesModal` — a thin
 * body wrapper that opens via the standard fixed RulesButton.
 */
export default function CrapsRulesModal({ open, onClose }: Props): JSX.Element | null {
  return (
    <RulesModal open={open} title="MASQUER · Craps" onClose={onClose}>
      <Body />
    </RulesModal>
  );
}
