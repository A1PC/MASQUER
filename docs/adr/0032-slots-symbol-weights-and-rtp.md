# ADR-0032: Slots — Symbol weights and RTP target

- Status: Accepted
- Date: 2026-05-18
- Deciders: @adamzspare

## Context

BUILD_GUIDE §8.3 specifies the symbol set and paytable for 3-reel slots
but leaves the per-symbol weights to be tuned: "Rarer symbols = higher
payout… tune these so the return-to-player feels fun but not infinite."

The weights are the single most impactful game-feel knob: they determine
how often the player wins, how big the wins are, and how long the player
can play before running out of chips.

## Decision

Ship `src/games/slots/config.ts` with:

```ts
export const SLOTS_WEIGHTS = {
  cherry: 4,
  lemon: 5,
  bell: 3,
  bar: 2,
  seven: 1,
};
export const SLOTS_WEIGHT_TOTAL = 15;
```

These weights yield:

| Combination       | Multiple | Probability | Contribution to RTP |
| ----------------- | -------- | ----------- | ------------------- |
| 3× Seven          | 50       | 1 / 3375    | 0.0148              |
| 3× Bar            | 20       | 8 / 3375    | 0.0474              |
| 3× Bell           | 12       | 27 / 3375   | 0.0960              |
| 3× Lemon          | 8        | 125 / 3375  | 0.2963              |
| 3× Cherry         | 5        | 64 / 3375   | 0.0948              |
| 2× Cherry (exact) | 2        | 528 / 3375  | 0.3129              |
| **Total RTP**     |          |             | **≈ 86.2%**         |
| **Any-win rate**  |          |             | **≈ 22.3%**         |

A 3× Seven jackpot hits roughly once every 4913 spins; the user is
expected to play long enough to see one over a session.

## Alternatives considered

- **Higher RTP (~93%, weights with a more common 2-cherry or doubled
  payout).** Rejected: feels too generous and removes the tension of
  losing streaks. Real Vegas slots target 88–95% — 86% sits at the
  punishing end of "realistic", which is the brief.
- **Lower RTP (~80%, weights with even rarer Cherry).** Rejected: makes
  the most common payout (2-cherry) too rare; player has long losing
  streaks with no positive feedback.
- **Per-reel weights** (different weights on different reels — common in
  commercial machines to make 3-of-kind harder). Rejected as YAGNI for
  Phase 5; can be added in Phase 8 polish if game feel demands it.

## Consequences

- The exact weights are exported as a const map; tests pin the expected
  RTP-contribution math (logic.test.ts and symbols.test.ts).
- Changing the weights requires updating both `config.ts` AND the
  frequency-assertion test in `symbols.test.ts` (the one that asserts
  observed ÷ expected ≤ 2% delta). This is intentional — silently
  changing weights would silently change RTP.
- The weights snapshot is recorded into `Round.details` on every spin
  via `buildRoundResult`, so future stats analysis can reconstruct the
  RTP for any historical period even after tuning.

## References

- BUILD_GUIDE §8.3
- `src/games/slots/config.ts`
- `src/games/slots/symbols.ts`
- `src/games/slots/symbols.test.ts` — frequency assertions
- Phase 5 spec §3.1, §3.2
