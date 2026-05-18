import type { JSX } from 'react';

export default function SlotsRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">HOW TO PLAY</h3>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Place a bet between 5 and 1000 chips, then SPIN.</li>
          <li>
            Three reels stop one at a time. A winning combination on the single payline pays per the
            paytable below.
          </li>
          <li>Press SPIN again to play another round (your last bet stays selected).</li>
        </ol>
        <p className="mt-2 text-xs text-white/60">
          ~86% return-to-player. Five symbols with weighted reels (rarer symbols pay more).
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">PAYTABLE</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gold/30 text-xs uppercase tracking-wider text-white/55">
              <th className="py-1.5 pr-4">Combination</th>
              <th className="py-1.5 pr-4">Multiplier</th>
              <th className="py-1.5">Tier</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">7 / 7 / 7</td>
              <td className="py-1.5 pr-4">×100</td>
              <td className="py-1.5 text-neon-magenta">JACKPOT</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">BAR / BAR / BAR</td>
              <td className="py-1.5 pr-4">×20</td>
              <td className="py-1.5 text-gold-bright">Medium</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Bell / Bell / Bell</td>
              <td className="py-1.5 pr-4">×10</td>
              <td className="py-1.5 text-gold-bright">Medium</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Lemon / Lemon / Lemon</td>
              <td className="py-1.5 pr-4">×5</td>
              <td className="py-1.5 text-chip-win">Small</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Cherry / Cherry / Cherry</td>
              <td className="py-1.5 pr-4">×3</td>
              <td className="py-1.5 text-chip-win">Small</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-1.5 pr-4">Any 2 Cherries</td>
              <td className="py-1.5 pr-4">×2</td>
              <td className="py-1.5 text-chip-win">Small</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4">Single Cherry on reel 1</td>
              <td className="py-1.5 pr-4">×1</td>
              <td className="py-1.5 text-chip-win">Small</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">CELEBRATIONS</h3>
        <ul className="ml-5 list-disc space-y-1 text-white/85">
          <li>
            <strong className="text-chip-win">Small wins</strong> — a banner shows the amount.
          </li>
          <li>
            <strong className="text-gold-bright">Medium wins</strong> — golden burst overlay.
          </li>
          <li>
            <strong className="text-neon-magenta">Jackpot (777)</strong> — magenta tint and a coin
            shower.
          </li>
        </ul>
      </section>
    </div>
  );
}
