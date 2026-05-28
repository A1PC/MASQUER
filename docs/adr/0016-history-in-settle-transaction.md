# ADR-0016: History row written by `settleRound` (no separate history.ts)

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

BUILD_GUIDE §3 originally listed `systems/history.ts` as a separate module
for `recordRound(...)`. Factoring history out of wallet would require either
two Dexie transactions (race window between balance credit and history insert)
or a circular call (wallet → history → wallet).

## Decision

History is written inside the same `db.transaction('rw', db.balances, db.rounds, ...)`
that credits the payout in `wallet.settleRound`. The `rounds` row uses the bet
handle's `betId` as its primary key, providing free idempotency: a re-call
with the same handle returns the existing row, no double credit.

There is no `src/systems/history.ts`. BUILD_GUIDE §3 is updated to reflect
this (PR B).

## Alternatives considered

- **Separate `history.ts` with `recordRound`** — caller has to ensure
  ordering; two-transaction race window.
- **Event-bus model (wallet emits, history subscribes)** — overkill for a
  local app; adds dispatch ceremony.
- **Persist round before settling balance** — possible but loses the bet
  handle's role as the link between place and settle.

## Consequences

- Tests that interact with rounds can do so via `wallet.settleRound` + Dexie
  reads; no separate API surface.
- A future "history-only" feature (e.g. import/export) would still query
  `db.rounds` directly — no abstraction lost.
- Phase 7 stats compute from `db.rounds` + `db.balances` (unchanged).

## References

- BUILD_GUIDE.md §3 (Architecture), §6 (Data Model)
- Phase 2 spec §6.3 (wallet.ts verbatim)
