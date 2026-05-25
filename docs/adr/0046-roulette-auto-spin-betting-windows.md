# ADR-0046: Roulette — auto-spin betting windows

- Status: Accepted (amended 2026-05-25 — zero-bet spin now writes a row)
- Date: 2026-05-25
- Deciders: @adamzspare
- Supersedes: the legacy explicit `SPIN` event in the original
  Phase-4 roulette machine.
- Amends: ADR-0031 (spin animation contract — spin trigger only;
  animation contract unchanged); refines ADR-0016 (every spin is now
  a "round" for record-keeping; zero-stake spins are zero-stake rounds).

## Context

The original Phase-4 roulette machine required the player to click
SPIN explicitly to leave the `betting` state. In Phase 15 #6 the
user requested an authentic casino cadence:

> When you click on the roulette wheel option from the lobby menu,
> give the player 30s to place their bets, then the wheel auto
> spins. After the spin, the player can click a button to spin the
> wheel immediately, otherwise, give them 10s before the wheel auto
> spins with or without the bets on the board.

## Decision

Replace the three-state machine with a four-state timed cycle:

```
   placing_bets ──after 30s──┐
        │                    ▼
        │  SPIN_NOW ──►  spinning
        │                    │  after SPIN_DURATION_MS
        │                    ▼
        │                 settled
        │                    │  after RESULT_DISPLAY_MS
        │                    ▼
        └────────── between_rounds
                             │  after 10s OR SPIN_NOW
                             ▼
                       (back to spinning — same target action via
                        setSpinResult on entry)
```

**Constants (in `ROULETTE_CONFIG`):**

- `INITIAL_BET_WINDOW_MS = 30_000`
- `BETWEEN_ROUNDS_MS = 10_000`
- `RESULT_DISPLAY_MS = 1_500`
- Existing `SPIN_DURATION_MS = 5_000` unchanged.

**Events:**

- `PLACE_BET`, `REMOVE_BET`, `CLEAR_ALL` — accepted in
  `placing_bets` and `between_rounds`.
- `SPIN_NOW` — accepted in `placing_bets` and `between_rounds`;
  transitions immediately to `spinning`.
- `PAUSE_TIMER`, `RESUME_TIMER` — accepted in either timer state;
  snapshot `pausedAt` on pause, on resume extend `betWindowEndsAt`
  by `(now - pausedAt)` so the visible countdown is preserved.
- Legacy `SPIN` event is removed. Legacy `NEW_ROUND` event is removed
  (auto-driven by `RESULT_DISPLAY_MS`).

**Zero-bet path.** The auto-spin transition has **no** guard. If
the timer expires with `bets.length === 0`, the wheel spins anyway.

**Amendment (2026-05-25).** Every spin now writes exactly one
`rounds` row, INCLUDING zero-stake spins. The original rule (zero-
bet spins are "non-events" with no row) was reversed after player
feedback: when the auto-spin fires with no chips on the felt, the
wheel still produces a real visible result (a number + colour), and
that result was vanishing from the recent-results sidebar — players
felt the feed was lying about the wheel's history.

The settle bridge now branches on `bets.length`:

- **bets.length > 0** → existing path: `wallet.settleRound` writes
  one `rounds` row carrying the bet outcome (win / loss / push).
- **bets.length === 0** → new path: `wallet.recordSpinOnly` writes
  one `rounds` row with `betAmount: 0`, `payout: 0`, `netChange:
0`, `outcome: 'push'`, `details: { spin, bets: [] }`, and a
  synthesised `id` of the form `spin-only-${uuid}`. Balance is
  **not** touched.

This refines (does not contradict) ADR-0016. ADR-0016's rule was
"every completed game round writes exactly one row." Under the
amendment a zero-stake auto-spin is itself a completed game round —
just one in which no chips moved. The row's `outcome: 'push'`
correctly signals that no money moved.

The roulette stats functions (`getRouletteNumberDistribution`,
hot/cold pockets, etc.) already iterate `rounds.where('game')
.equals('roulette')` and read `details.spin.number` — they pick up
zero-stake rows automatically, so the admin pocket-distribution
chart now reflects every spin, not just the played ones.

**Pause behaviour.** The timer pauses when the player opens the
RULES modal (they're reading; the dealer waits) and resumes on
close. The timer does NOT pause when the browser tab is hidden —
browser background throttling slows the tick but does not stop it,
matching the "real casino" feel.

**Reduced motion.** Timers tick normally; the visual countdown ring
collapses to a static "Auto-spin in 12 s" text label. The spin
animation reduced-motion path (`spinDurationMs: 0` from ADR-0031)
is unchanged.

**Timer mechanism.** XState v5's `after` delays drive the auto-
transitions. The numeric countdown surfaced to the player is
computed in the page from `betWindowEndsAt: number | null` in
machine context, ticked via `setInterval(..., 100)` inside a
`useEffect`. Counter ticks are NOT events — they live in component
state only.

XState v5's `after` does not natively support pausing. The pause
implementation snapshots `pausedAt` and, on resume, increases
`betWindowEndsAt` by the paused duration so the page-level countdown
reads the right remaining time. The `after` delay itself still fires
at the originally-scheduled wallclock time — this is a known
limitation. If it proves brittle the fallback is to swap the timer
states to use an `invoke` of a `fromCallback` actor that owns the
`setTimeout` and is cancellable. The decision to take that fallback
is the implementer's; document if switched.

## Alternatives considered

- **Keep legacy `SPIN` event + add an optional auto-timer.** Rejected:
  branching event handling everywhere and a perpetually-on-or-off
  timer toggle muddied the brainstorm. Replacement is cleaner.
- **`fromCallback` actor managing `setTimeout`.** Rejected for the
  primary trigger (XState `after` is simpler) but viable for the
  pause/resume path if `after` re-keying proves brittle in tests.
  Implementer may switch if the after-extend pattern is awkward;
  document if so.
- **3-state machine where `settled` directly returns to `placing_bets`.**
  Rejected: collapsing `settled` and `between_rounds` made the result
  banner timing brittle (the banner needs ≥ 1 s to read; the 10-s
  window is for re-betting after the banner clears). Splitting them
  keeps each state's purpose obvious.

## Consequences

- The legacy "click SPIN to play" interaction is gone. Players who
  want immediate action use `SPIN NOW`.
- Visit-tracking (`useGameVisit` in `GameShell`) is unaffected — the
  page is still mounted across rounds.
- The page must mount/unmount cleanly to cancel timers on navigate-
  away. React's strict-mode double-mount in dev triggers XState's
  `after` twice — verify cleanup in dev.
- Reduced-motion users still get the same 30 s / 10 s windows. The
  spin itself remains instant for them.

## References

- Spec: `docs/superpowers/specs/2026-05-25-phase-15-6-roulette-design.md` §4.5
- ADR-0031 — animation contract (spin trigger amended here)
- ADR-0016 — one rounds row per round
- BUILD_GUIDE §8.2
- `src/games/roulette/machine.ts`
