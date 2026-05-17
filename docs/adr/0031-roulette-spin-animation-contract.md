# ADR-0031: Roulette — Spin animation contract

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §8.2 is explicit: "The wheel animation is cosmetic; the
result is decided by the RNG, then the wheel animates to land on it."
We need to formalise the animation timing, direction, and
reduced-motion behavior in one place so the machine, the page, and the
Wheel component stay in sync.

## Decision

**Timing.** `ROULETTE_CONFIG.SPIN_DURATION_MS = 5000`. This is the
single source of truth for spin duration in both the machine (state
delay) and the Wheel component (Framer Motion `transition.duration`).

**Result before animation.** The machine's `setSpinResult` action
calls `logic.spin()` (which calls `rng.randomInt(0, 36)`) on entering
`spinning`. The Wheel component reads the resulting number from
context and animates to it. There is no race between visual outcome
and stored outcome — the stored outcome is set first, always.

**Directions and easing.**

- Wheel rotates **clockwise**. Total rotation = `5 × 360° + θ` where
  `θ = pocketIndexOf(winningNumber) × (360° / 37)` minus a small offset
  to make the ball appear to settle naturally.
- Ball orbits **counter-clockwise**, decelerating in opposition to the
  wheel (real roulette physics). End angle places the ball over the
  winning pocket once the wheel stops.
- Both use the same easing curve (Framer Motion `[0.16, 1, 0.3, 1]` —
  the standard easeOutExpo equivalent).

**Reduced motion.** When `useReducedMotion()` (from `framer-motion`)
returns true, two things change:

1. The RoulettePage passes `spinDurationMs: 0` to the machine via
   input. The machine settles immediately (no 5-second visual hang).
2. The Wheel component renders the final rotation directly without an
   animated transition.

The pocket-pulse on settled is also skipped under reduced motion. The
result banner appears with `opacity: 1` immediately (no slide).

**Pulse.** On entering `settled`, the winning pocket pulses for
`ROULETTE_CONFIG.RESULT_PULSE_MS` (600ms) with a color-matched halo
(red/black/green). This is purely visual and has no machine effect.

## Alternatives considered

- **Longer spin (8–10s).** Rejected: feels slow and tedious by the
  third round; 5s is the brainstorm-validated sweet spot.
- **Real physics simulation.** Rejected: produces non-deterministic
  visual landings that disagree with the RNG result; defeats the
  "result decided first" guarantee from §8.2.
- **Keep the 5s delay even under reduced motion.** Rejected: forces
  the player to stare at a static page for 5 seconds. Reduced motion
  should reduce delay, not just visual movement.
- **Different easing per element.** Rejected: synchronized easing
  keeps the ball-over-pocket landing deterministic without extra math.

## Consequences

- One config constant tunes spin duration. Changing it requires no
  code edits — only `ROULETTE_CONFIG.SPIN_DURATION_MS`.
- Tests pin the machine's `after` delay to `ROULETTE_CONFIG.SPIN_DURATION_MS`
  and the reduced-motion override path (`spinDurationMs: 0`).
- The Wheel component is "uncontrolled" — it never tells the parent
  where it is; it just reads `spinning` + `targetNumber` + `durationMs`
  props and draws.
- Future "fast spin" mode (Phase 8 polish) is one line: pass
  `spinDurationMs: 2000` from the page if the user toggles a setting.

## References

- BUILD_GUIDE §8.2
- ADR-0029 — wheel order (used for ball-landing math)
- `src/games/roulette/machine.ts` — `delays.spinDuration`
- `src/games/roulette/Wheel.tsx` — animation contract
- `src/games/roulette/config.ts` — `SPIN_DURATION_MS`, `RESULT_PULSE_MS`
- Phase 4 spec §3.2, §12.2, §16
