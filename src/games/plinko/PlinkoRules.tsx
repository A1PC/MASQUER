import type { JSX } from 'react';
import { MULTIPLIER_CURVES } from './logic';

/**
 * MASQUER · Plinko rules — rendered inside the shared `RulesModal` (#230) on
 * the PlinkoPage bottom-left RULES button (Phase 15 #11 PR A, plan A.7).
 *
 * Sectioned headings mirror the per-game rules pattern: gold eyebrow, ivory
 * body, scannable so the content fits comfortably in the shared scrollable
 * modal body (60vh cap).
 */
export default function PlinkoRules(): JSX.Element {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">OBJECT</h3>
        <p className="text-ivory/85">
          Drop a ball from the top of a triangular peg pyramid (26 rows). It bounces left or right
          at every peg and lands in one of 27 buckets at the base. Your payout is{' '}
          <strong>stake &times; multiplier</strong> for the bucket the ball settles in.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">RISK LEVELS</h3>
        <p className="text-ivory/85">
          Four curves over the same board &mdash; <strong>Safe</strong>, <strong>Low</strong>,{' '}
          <strong>Medium</strong>, <strong>High</strong>. The peg walk is identical (Binomial(26,
          0.5)); only the multiplier table changes. Higher risk = bigger edge payouts <em>and</em>{' '}
          deeper losses in the centre.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">MULTIPLIERS</h3>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brass/40 text-ivory/60">
              <th className="py-1.5 pr-3 font-display tracking-[0.18em]">RISK</th>
              <th className="py-1.5 pr-3 text-right font-display tracking-[0.18em]">
                EDGE (0, 26)
              </th>
              <th className="py-1.5 pr-3 text-right font-display tracking-[0.18em]">CENTRE (13)</th>
              <th className="py-1.5 text-right font-display tracking-[0.18em]">RTP</th>
            </tr>
          </thead>
          <tbody className="text-ivory/85">
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">Safe</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.safe[0]}x</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.safe[13]}x</td>
              <td className="py-1 text-right tabular-nums">~97.8%</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">Low</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.low[0]}x</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.low[13]}x</td>
              <td className="py-1 text-right tabular-nums">~96.6%</td>
            </tr>
            <tr className="border-b border-brass/20">
              <td className="py-1 pr-3">Medium</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.medium[0]}x</td>
              <td className="py-1 pr-3 text-right tabular-nums">{MULTIPLIER_CURVES.medium[13]}x</td>
              <td className="py-1 text-right tabular-nums">~95.8%</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 font-display text-gold-bright">High</td>
              <td className="py-1 pr-3 text-right tabular-nums text-gold-bright">
                {MULTIPLIER_CURVES.high[0]}x
              </td>
              <td className="py-1 pr-3 text-right tabular-nums text-gold-bright">
                {MULTIPLIER_CURVES.high[13]}x
              </td>
              <td className="py-1 text-right tabular-nums">~95.4%</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-ivory/60">
          Centre bins pay sub-1&times; (loss territory) on every risk. Edge events are rare &mdash;
          1 in ~67 million per drop. RTP under Binomial(26, 0.5).
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">MANUAL VS AUTO</h3>
        <p className="text-ivory/85">
          <strong>Manual</strong> &mdash; click DROP to release a single ball. A 150 ms cooldown
          prevents stack-clicking. <strong>Auto</strong> &mdash; queue up to{' '}
          <strong className="text-gold-bright">1,000 balls</strong> with intervals 250 / 500 / 1000
          ms. Stop any time.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">BET LIMITS</h3>
        <p className="text-ivory/85">
          <strong>10 chips</strong> minimum per ball,{' '}
          <strong className="text-gold-bright">1,000,000 chips</strong> maximum per ball. Auto
          sessions max <strong className="text-gold-bright">1,000 balls</strong>. A single 1M-stake
          ball at High edge pays 60 billion chips &mdash; jackpot moments are scarce but real.
        </p>
      </section>

      <section>
        <h3 className="mb-1 font-display text-xs tracking-[0.18em] text-gold">REDUCED MOTION</h3>
        <p className="text-ivory/85">
          Animations collapse to instant (ball jumps to its bucket) and the peg-ping sound coalesces
          into a single per-ball tick when your OS or in-app preference asks for reduced motion. The
          game stays fully playable.
        </p>
      </section>
    </div>
  );
}
