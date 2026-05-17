# ADR-0017: Daily top-up: +50 chips every 24h, no zero-chip bypass

- Status: Accepted
- Date: 2026-05-17
- Deciders: @adamzspare

## Context

BUILD_GUIDE §4 originally said "If a user hits 0, offer a 'daily top-up' of
a small amount so the app is never bricked." The wording is ambiguous: is the
top-up triggered by hitting 0, or by elapsed time? Is it bypassable?

## Decision

Adopt a strict policy:

- Every user accumulates a +50 chip claim eligibility every 24h since their
  last claim (floating 24h, not midnight rollover).
- The cooldown is NOT bypassable. A user at 0 chips with 23h remaining must
  wait. The app is "always recoverable within 24h" — softer wording than
  "never bricked" but functionally equivalent.
- New users (no lastDailyClaimAt) are eligible immediately on first dropdown
  open.

BUILD_GUIDE §4 wording updated to reflect this (PR D).

## Alternatives considered

- **Bypass at 0 chips** — exploitable: user could intentionally bust to claim
  more often. Rejected.
- **Midnight rollover** — encourages "check in once a day" ritual but feels
  exploitable at the 11:59pm boundary.
- **Shorter cooldown (e.g. 12h)** — too generous; daily play money loses tension.

## Consequences

- Predictable mental model: claim resets a personal 24h timer.
- Worst-case UX: user blows 1,000 chips at 11pm, claims at 11pm next day,
  has 50 chips for 24h. Acceptable for a play-money local app.
- Implementation: `wallet.claimDaily` transaction reads `lastDailyClaimAt`,
  enforces 24h gap.
- UI: CreditsDropdown shows countdown when not eligible, CLAIM button when
  eligible.

## References

- BUILD_GUIDE.md §4 (Shared Systems — Wallet)
- Phase 2 spec §6.3 (wallet.claimDaily), §6.15 (CreditsDropdown)
