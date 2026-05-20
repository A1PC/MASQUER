# ADR-0041: Poker buy-in/cash-out session wallet model

- Status: Accepted
- Date: 2026-05-20
- Deciders: @adamzspare

## Context

Every game so far writes exactly one `rounds` row per game via `wallet.settleRound`,
and every `wallet.placeBet` corresponds 1:1 to that settle (ADR-0016). Poker breaks
this: a player buys into a table, plays MANY hands with a persistent stack, may rebuy
(another debit) after busting, and finally cashes out their remaining stack — all as
one "session".

## Decision

A poker session is ONE `rounds` row. The wallet sees multiple debits (the initial
buy-in + each rebuy via `placeBet`) and a single credit (the final stack via
`settleRound`). Only the FIRST `placeBet` returns the session handle used for the
final `settleRound`. Rebuy amounts accumulate into a `totalBoughtIn` counter held in
machine context. The settle records `stake = totalBoughtIn`, `payout = finalStack`,
`won = finalStack > totalBoughtIn`. Net wallet effect: `-buyIn -rebuy1 ... +finalStack`,
which is exactly correct.

Per-hand chip movement happens entirely in machine context — the wallet is untouched
between SIT DOWN and LEAVE TABLE (except rebuys).

## Consequences

- Stats treat a session as one round (a +5000 winning session is one high-payout row).
  Acceptable for a session-based game; per-hand granularity is out of scope.
- Closing the tab mid-session leaves the session handle open and the in-memory stack
  lost. Mitigation: best-effort `beforeunload` settle with the current stack; otherwise
  the buy-in is forfeit. Documented limitation.
- This is the first game where wallet debits are not 1:1 with the rounds row. Future
  session-based games (multi-hand blackjack shoes, etc.) can follow this pattern.
