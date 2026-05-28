import type { JSX } from 'react';

/**
 * MASQUER · Slots rules. Mirrors Blackjack / Coin-flip / Roulette section
 * structure (sectioned `<h3>` headings with display face, brand tokens
 * only). Content covers object, paytable, spin resolution, win tiers,
 * bet limits + sticky bet, and RTP.
 */
export default function SlotsRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Object
        </h3>
        <p className="text-sm text-ivory/85">
          Spin three reels and match symbols on the centre payline. Three of a kind pays per the
          paytable; any two Cherries also pay. The rarer the symbol, the bigger the prize.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Symbols & paytable
        </h3>
        <table className="w-full text-left text-sm text-ivory/85">
          <thead>
            <tr className="border-b border-brass/40 text-[10px] uppercase tracking-[0.18em] text-ivory/55">
              <th className="py-1.5 pr-4">Combination</th>
              <th className="py-1.5 pr-4">Multiplier</th>
              <th className="py-1.5">Tier</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">7 · 7 · 7</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×50</td>
              <td className="py-1.5 text-[var(--jewel-magenta)]">Jackpot</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">BAR · BAR · BAR</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×20</td>
              <td className="py-1.5 text-gold-bright">Medium</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Bell · Bell · Bell</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×12</td>
              <td className="py-1.5 text-gold-bright">Medium</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Lemon · Lemon · Lemon</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×8</td>
              <td className="py-1.5 text-state-win">Small</td>
            </tr>
            <tr className="border-b border-brass/15">
              <td className="py-1.5 pr-4">Cherry · Cherry · Cherry</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×5</td>
              <td className="py-1.5 text-state-win">Small</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Any two Cherries</td>
              <td className="py-1.5 pr-4 font-mono text-gold-bright">×2</td>
              <td className="py-1.5 text-state-win">Small</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          How spins resolve
        </h3>
        <p className="text-sm text-ivory/85">
          Each reel draws a weighted symbol from the system RNG the instant you tap SPIN — the
          result is decided before the reels start moving. The scrolling animation is cosmetic. The
          third reel stops a deliberate three seconds after the second; that pause is the moment of
          every spin.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Win tiers
        </h3>
        <ul className="ml-5 list-disc space-y-1 text-sm text-ivory/85">
          <li>
            <strong className="text-state-win">Small</strong> — pulse on the payline plus a chip
            dribble.
          </li>
          <li>
            <strong className="text-gold-bright">Medium</strong> — golden radial burst over the
            payline.
          </li>
          <li>
            <strong className="text-[var(--jewel-magenta)]">Jackpot</strong> — full-bay magenta tint
            and a 12-coin shower for the 7 · 7 · 7 hit.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          Bet limits & sticky bet
        </h3>
        <p className="text-sm text-ivory/85">
          5 to 1 000 chips per spin. Your chip stack stays selected after each SPIN, so you can keep
          tapping SPIN to play the same bet again. CLEAR BET zeros the stack when you want to
          change.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs uppercase tracking-[0.18em] text-gold-bright">
          RTP
        </h3>
        <p className="text-sm text-ivory/85">
          Approximately 86% return to player. Symbol weights and the paytable are locked by ADR-0032
          and ADR-0033.
        </p>
      </section>
    </div>
  );
}
