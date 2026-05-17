# ADR-0029: Roulette — European single-zero wheel order canonicalized

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

Phase 4 ships European Roulette (single zero, 37 pockets). The wheel must:

1. Render the pockets in the correct geometric order on screen.
2. Provide the spin animation a stable angular target derived from the
   winning number.
3. Optionally support neighbor-based bets in the future (voisins du zéro,
   tiers du cylindre, orphelins).

We need a single source of truth for the pocket sequence around the wheel.

## Decision

Ship `src/games/roulette/wheel.ts` exporting:

- `POCKET_ORDER: readonly number[]` — the 37 numbers in counter-clockwise
  order starting from 0, matching the **real European single-zero wheel**:
  `0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26`.
- `RED_NUMBERS: ReadonlySet<number>` — the canonical 18 reds.
- `colorOf(n)` — `'red' | 'black' | 'green'` lookup.
- `pocketIndexOf(n)` — index into `POCKET_ORDER`, used by `Wheel.tsx` for
  ball positioning.

American wheel (double zero, 38 pockets) is **out of scope** for the
foreseeable future. The constant is `as const` and consumed by
`Wheel.tsx`, `logic.ts`, and tests — there is no runtime mutation.

## Alternatives considered

- **American wheel** — Two pockets (`0` and `00`) and a different number
  sequence (and the unique 5-number "basket" bet at 6:1). Rejected: house
  edge is double the European edge for the same gameplay surface; nothing
  in the user base requires it.
- **Configurable wheel type** — Make the wheel data a config so we could
  switch. Rejected as YAGNI: zero current demand for American, and the
  betting layout (BettingLayout.tsx) would also have to fork. Easier to
  add when actually wanted.
- **Generate the order from a known shuffle** — Tempting, but the
  real-world wheel order is not a closed-form sequence; it's literally a
  37-element constant. Listing it directly is more honest.

## Consequences

- One source of truth for the pocket order. `Wheel.tsx` reads
  `POCKET_ORDER` to lay out SVG arcs; `logic.ts` uses
  `pocketIndexOf` to expose a stable index for ball animation; tests
  pin the constant byte-for-byte.
- Future neighbor bets (voisins / tiers / orphelins) become trivial
  derivations from `POCKET_ORDER`.
- If the test fails because someone reorders the array, the failure
  message points directly at this ADR.

## References

- BUILD_GUIDE §8.2 — "European wheel (single zero, 37 pockets…)"
- `src/games/roulette/wheel.ts`
- `src/games/roulette/wheel.test.ts`
- Phase 4 spec §3.1, §7
