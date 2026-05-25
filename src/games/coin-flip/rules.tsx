import type { JSX } from 'react';
import { Link } from 'react-router';

/**
 * Coin Flip — concise sectioned rules for the MASQUER Velvet Deco lobby.
 * Designed to live inside the scrollable RulesModal body; sectioned with
 * display-tracked headings, no walls of prose.
 */
export default function CoinFlipRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-white/85">
          Pick the side the coin will land on — <strong>HEADS</strong> or <strong>TAILS</strong>.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PAYOUT</h3>
        <p className="text-white/85">
          Win pays <strong>1:1</strong> (your stake back, plus the same amount in winnings). A loss
          forfeits the stake. No house take.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">SEEDED RNG</h3>
        <p className="text-white/85">
          The coin is flipped by a per-session, seeded PRNG — flips are deterministic from the
          session seed, never <code>Math.random</code>.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">WIN-STREAK FLAME</h3>
        <p className="text-white/85">
          A flame badge appears once you&rsquo;ve won two flips in a row. It resets on any loss or
          when you reload the table.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">REPEAT BET</h3>
        <p className="text-white/85">
          After a settled round, the betting panel shows a <strong>&#8635; Repeat</strong> pill that
          re-stakes your last bet in one tap (auto-commits, ready to call).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">
          SOUND &amp; MOTION
        </h3>
        <p className="text-white/85">
          Stingers, the coin spin, and other motion respect the OS <em>prefers-reduced-motion</em>{' '}
          setting. Toggle them explicitly in{' '}
          <Link to="/settings" className="text-gold-bright underline hover:text-gold">
            Settings
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
