# ADR-0033: Slots — Tiered win celebration

- Status: Accepted
- Date: 2026-05-18
- Deciders: Developer

## Context

The most common Slots payout (2× Cherry) hits roughly once every 8 spins.
The rarest (3× Seven) hits roughly once every 4913. If every win used
the same celebration animation, frequent small wins would feel like
noise and the rare jackpot would feel ordinary.

We want the visual celebration to scale with payout magnitude so that
rare wins feel singular.

## Decision

Three win tiers, mapped from `PayoutHit.multiple`:

| Tier      | Multiple range           | Triggered by                   | Visual                                                                            |
| --------- | ------------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `none`    | (no hit / multiple null) | losing spin                    | nothing                                                                           |
| `small`   | ≤ 2                      | 2× Cherry                      | payline cells pulse gold for 600ms + chip dribble + result banner                 |
| `medium`  | 3 ≤ m ≤ 20               | 3× Cherry / Lemon / Bell / Bar | golden radial burst on payline (800ms) + chip dribble + result banner             |
| `jackpot` | > 20                     | 3× Seven                       | full-screen magenta tint (200ms fade) + 12 coin-shower particles + JACKPOT banner |

The boundary is intentionally numeric (driven by
`SLOTS_CONFIG.WIN_TIER_THRESHOLDS`) rather than enumerated by combo. If
we later add a Wild or a new symbol, its payout multiple determines its
tier automatically.

The tier additionally drives:

- Recent-results sidebar badge colour (small → green, medium → gold,
  jackpot → magenta).
- Page disabled-state duration (controls don't re-enable until the
  celebration animation finishes — small=600ms, medium=800ms,
  jackpot=1500ms).

## Reduced-motion

When `useReducedMotion()` returns true, ALL tiers collapse to:

- Result banner (no slide; snaps in with opacity 1)
- Chip dribble on the balance (already reduced-motion-aware via Phase 2)
- NO payline pulses, NO bursts, NO coin particles, NO magenta tint

The numeric outcome and the wallet flow are unchanged.

## Alternatives considered

- **Single uniform celebration.** Rejected — frequent small wins become
  visual noise; the rare jackpot loses its specialness.
- **Per-combo bespoke celebrations** (different animation for each of the
  6 paytable rows). Rejected as overkill: 3 tiers covers the perceptual
  delta without 6× the animation code.
- **No celebration; just a number.** Rejected — the brief was "old-school
  Vegas content with modern web execution"; soundless Slots without
  visual feedback feels lifeless.

## Consequences

- `winTierOf(multiple)` lives in `logic.ts` and is pure. Tested in
  `logic.test.ts` with boundary cases (1 / 2 / 3 / 12 / 20 / 21 / 50).
- The celebration code is inline in `SlotsPage.tsx` (not its own file).
  It's tightly coupled to the page's settle effect and doesn't need to
  be shared. If a future game wants similar tiering, it can be promoted
  to a shared component in Phase 8 polish.
- The reduced-motion path is the same code path as Phase 4's
  `useReducedMotion` integration — single hook read at the page level,
  passed down as a boolean prop.

## References

- BUILD_GUIDE §8.3
- ADR-0031 — Roulette spin animation contract (reduced-motion precedent)
- `src/games/slots/logic.ts` — `winTierOf`
- `src/games/slots/SlotsPage.tsx` — celebration tier rendering
- Phase 5 spec §14, §15

## Amendment (2026-05-26, Phase 15 #7)

Phase 15 #7 promotes the jackpot magenta `#ff5cf2` to a brand token
(`jewel-magenta`) in `src/theme/tokens.ts` + `tailwind.config.ts`, so
both the Seven SVG tubing and the WinCelebration overlay reference it
via the design system rather than inline hex. The tier-celebration
semantics (small / medium / jackpot thresholds, durations, visual
shape) are unchanged.

Sound stingers are wired through `useSound` per the Phase 2 hook:
`win.small` (small tier), `win.medium` (medium tier), `win.jackpot`
(jackpot tier), and `loss` on a no-win settle. The samples already
exist in `src/assets/audio/` and were registered in `ids.ts` /
`engine.ts` during earlier sound passes — no new generation needed
for #7. The reel-stop punctuation also fires `reel.stop` three times
per spin at the configured `REEL_STOP_TIMES_MS` cadence.

Reduced-motion users (via `useEffectiveReducedMotion`) hear NO
stingers and see NO tier visuals — matches the existing reduced-motion
short-circuit on the visual side. The reel-stop sound is also
suppressed under reduced motion (one fewer affordance, but consistent
with the rest of the brand — reduced motion means reduced everything).
