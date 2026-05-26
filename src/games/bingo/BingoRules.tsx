import type { JSX } from 'react';

/**
 * MASQUER · Bingo rules — covers BOTH variants (British 90-ball + American
 * 75-ball). Used inside the shared `RulesModal` from #230 on the BingoPage
 * bottom-left RULES button (Phase 15 #10.v1 — task A.1 / spec §4.6).
 *
 * Sectioned headings mirror the Lottery / Blackjack rules pattern: gold
 * eyebrow, ivory body, scannable so the content fits comfortably in the
 * shared scrollable modal body (60vh cap).
 */
export default function BingoRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-ivory/85">
          Match the called numbers on your card. Be first to claim a tier — each tier pays once per
          game, then play continues for the next. Tier-1 + tier-2 bonuses pay only when{' '}
          <strong>you</strong> win them; the tier-3 pot goes to whoever claims it first (you or a
          CPU).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">VARIANTS</h3>
        <div className="space-y-2 text-ivory/85">
          <p>
            <strong>British (90-ball)</strong> &mdash; 3&times;9 grid, 15 numbered cells per card.
            Numbers 1&ndash;90 distributed across 9 columns:{' '}
            <span className="tabular-nums text-ivory">
              1&ndash;9 &middot; 10&ndash;19 &middot; 20&ndash;29 &middot; 30&ndash;39 &middot;
              40&ndash;49 &middot; 50&ndash;59 &middot; 60&ndash;69 &middot; 70&ndash;79 &middot;
              80&ndash;90
            </span>
            . Tiers: <strong>LINE</strong> &rarr; <strong>DOUBLE LINE</strong> &rarr;{' '}
            <strong>BINGO</strong> (full house).
          </p>
          <p>
            <strong>American (75-ball)</strong> &mdash; 5&times;5 grid with a FREE centre, 24
            numbered cells per card. Numbers under{' '}
            <span className="tabular-nums text-ivory">
              B (1&ndash;15) &middot; I (16&ndash;30) &middot; N (31&ndash;45) &middot; G
              (46&ndash;60) &middot; O (61&ndash;75)
            </span>
            . Tiers: <strong>LINE</strong> &rarr; <strong>FOUR CORNERS</strong> &rarr;{' '}
            <strong>BLACKOUT</strong> (full card).
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">TIERS</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brass/40 text-ivory/60">
              <th className="py-1.5 pr-3 font-display tracking-[0.18em]">TIER</th>
              <th className="py-1.5 text-right font-display tracking-[0.18em]">PAYOUT</th>
            </tr>
          </thead>
          <tbody className="text-ivory/85">
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">LINE (any row complete)</td>
              <td className="py-1 text-right tabular-nums">25</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">DOUBLE LINE / FOUR CORNERS</td>
              <td className="py-1 text-right tabular-nums">75</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">BINGO (full card)</td>
              <td className="py-1 text-right tabular-nums">250</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 font-display text-gold-bright">FAST BINGO</td>
              <td className="py-1 text-right tabular-nums text-gold-bright">+500 bonus</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-ivory/60">
          FAST BINGO triggers when the BINGO is won within the first{' '}
          <strong className="text-ivory">40 calls</strong> &mdash; the 500-chip kicker stacks on top
          of the tier-3 pot.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">DAUB MODE</h3>
        <p className="text-ivory/85">
          <strong>AUTO</strong> &mdash; cells daub automatically when their number is called.{' '}
          <strong>MANUAL</strong> &mdash; tap each called cell yourself before it counts. Hard
          difficulty <em>forces</em> manual.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">DIFFICULTY</h3>
        <p className="text-ivory/85">
          <strong>Easy</strong> 2 CPUs &middot; pot &times;2 &middot; <strong>Medium</strong> 5 CPUs
          &middot; pot &times;4 &middot; <strong>Hard</strong> 9 CPUs &middot; pot &times;8. Higher
          difficulty raises both the prize pool and the CPU claim-race latency &mdash; Hard CPUs
          claim quickly, so you must daub manually to keep up.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">RACE TO CLAIM</h3>
        <p className="text-ivory/85">
          Each tier prize goes to whoever calls it first &mdash; you or a CPU. Tier-1 + tier-2
          bonuses pay only when <strong>you</strong> win them; tier-3 is the pot itself. All bonuses
          + the pot pay in the final round settlement, not mid-game.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">REDUCED MOTION</h3>
        <p className="text-ivory/85">
          Animations collapse to instant when your OS or in-app preference asks for reduced motion.
          The game stays fully playable.
        </p>
      </section>
    </div>
  );
}
