# ADR-0022: Blackjack — Split Rules (up to 4 hands, DAS enabled, split-Ace restrictions)

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

Standard blackjack split rules vary across casinos. Key decisions needed:

- How many times can a player resplit (max hands)?
- Can a player double after splitting (DAS)?
- Are split Aces treated differently (limited to one card each)?
- Can 10-value cards of different ranks be split (e.g., J-Q)?

## Decision

Adopt the following split rules (configured in `config.ts`):

1. **Max 4 hands total** (`MAX_HANDS: 4`) — player may resplit up to 3 times.
2. **DAS enabled** (`DAS: true`) — player may double down after splitting.
3. **Split-Ace restriction** — split Aces receive exactly one card each; no
   further hits, no double, no resplit. (`fromSplitAces: true` flag).
4. **10-value rule** — any two 10-value cards can be split (10-J, J-Q, etc.)
   based on rank value equality, not exact rank match.

## Alternatives considered

- **Max 2 or 3 hands** — less complex but deviates from common Vegas strip rules.
- **No DAS** — slightly lower house edge for player; not chosen.
- **Resplit Aces allowed** — rare rule; excluded for simplicity.
- **Exact-rank split only** — J splits with J only; excluded per standard rule.

## Consequences

- `canSplit()` in `hand.ts` enforces all four constraints.
- Machine `splitActive` action marks `fromSplitAces: true` and sets
  `resolved: true` on each split-Ace hand immediately.
- Wallet receives a separate `placeBet` call for each split hand (ADR-0028).

## References

- BUILD_GUIDE.md §8.1 (after update)
- Phase 3 spec §3 decision #2
- `src/games/blackjack/hand.ts` — `canSplit`, `canDouble`
- `src/games/blackjack/config.ts` — `MAX_HANDS`, `DAS`
