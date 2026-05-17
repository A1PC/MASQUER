# Risk register

Reviewed at the start of each BUILD_GUIDE phase. Add or update entries as
new risks emerge.

| ID   | Risk                                                | Phase   | L   | I   | Mitigation                                                                                                     |
| ---- | --------------------------------------------------- | ------- | --- | --- | -------------------------------------------------------------------------------------------------------------- |
| R-01 | IndexedDB schema migration breaks existing balances | 1+      | M   | H   | Dexie `version().upgrade()` from day one; smoke test before merge                                              |
| R-02 | RNG bias in payouts                                 | 2+      | L   | H   | Centralized `systems/rng.ts` w/ rejection sampling; ESLint bans Math.random; chi-squared test added in Phase 2 |
| R-03 | Float chip math causes balance bugs                 | 2+      | M   | H   | Integer-only at boundaries; ESLint forbids `parseFloat` in wallet/logic; tests assert `Number.isInteger`       |
| R-04 | Game directly mutates balance/store                 | 3–6     | M   | H   | ESLint blocks `@/db` and `@/store` imports under `src/games/**`                                                |
| R-05 | Animation outpaces logic outcome                    | 3–6     | M   | M   | Outcome decided first; animation reads outcome (documented in `_shared/useGameRound`)                          |
| R-06 | Baccarat third-card tableau wrong                   | 6       | M   | M   | Implement verbatim from cited source; exhaustive truth-table test                                              |
| R-07 | Roulette payout off-by-one                          | 4       | M   | M   | Document "X to 1" convention in `payouts.ts`; tests assert payout AND netChange                                |
| R-08 | Slots paytable un-fun (wrong RTP)                   | 5, 8    | H   | L   | Paytable in single config; "expected RTP simulator" test (10M spins)                                           |
| R-09 | Hex literals leak into components                   | 8+      | M   | L   | ESLint rule (Phase 8) flagging hex in `*.tsx` outside `theme/`; review checklist                               |
| R-10 | Tests pass, prod build broken                       | All     | L   | M   | `pnpm build` is required CI check                                                                              |
| R-11 | Lockfile drift                                      | All     | L   | M   | `--frozen-lockfile` in CI; `packageManager` pinned                                                             |
| R-12 | Husky bypassed via `--no-verify`                    | All     | M   | L   | CI is the enforcing layer; PR template asks                                                                    |
| R-13 | Dependency vulnerabilities accumulate               | Ongoing | M   | L   | Dependabot weekly (PR #1)                                                                                      |
| R-14 | Phase creep — future-phase features in early PRs    | All     | H   | M   | CLAUDE.md rule #1; PR template phase ref; reviewer rejects                                                     |
| R-15 | Solo-dev rubber-stamps own PRs                      | All     | H   | L   | PR self-review checklist; CI must be green; squash-merge                                                       |

L = Likelihood (L/M/H), I = Impact (L/M/H).

## Phase 1 additions

| ID   | Risk                                                 | Phase     | L   | I   | Mitigation                                                                                |
| ---- | ---------------------------------------------------- | --------- | --- | --- | ----------------------------------------------------------------------------------------- |
| R-16 | PBKDF2 takes too long, login feels frozen            | 1         | M   | L   | 600k iters ≈ 300-500ms; UI shows isSubmitting spinner. Drop to 210k if users complain.    |
| R-17 | localStorage unavailable (private mode historically) | 1         | L   | M   | All localStorage access wrapped in try/catch; degrade gracefully.                         |
| R-18 | User opens app on different browser → empty          | 1         | H   | L   | Intentional; data is local per-browser. Documented in dev-setup.                          |
| R-19 | Username uniqueness race (two tabs register at once) | 1         | L   | L   | Dexie &usernameLower index throws ConstraintError; caught and reported as username_taken. |
| R-20 | Login timing oracle reveals username existence       | 1         | L   | M   | Always run KDF on login even when user not found.                                         |
| R-21 | RequireAuth flash-of-content during bootstrap        | 1         | M   | L   | App renders "Loading…" splash while bootstrapping is true.                                |
| R-22 | Test pollution between test files                    | 1         | M   | M   | resetDb() helper + beforeEach in any test that writes.                                    |
| R-23 | Dexie ConstraintError detection brittle              | 1, future | L   | M   | Centralized isUniqueIndexError helper.                                                    |

## Phase 2 additions

| ID   | Risk                                                        | Phase | L   | I   | Mitigation                                                                                                              |
| ---- | ----------------------------------------------------------- | ----- | --- | --- | ----------------------------------------------------------------------------------------------------------------------- |
| R-24 | Bet placed but settle never called (page crash mid-round)   | 2+    | M   | M   | In-memory bet handle; chips deducted on placeBet. If settle never runs, user loses the bet — acceptable for play-money. |
| R-25 | Double-settle of the same bet (re-render bug)               | 2+    | L   | M   | settleRound keys the round on handle.betId; second call returns existing row, no double credit.                         |
| R-26 | Daily-claim race when user opens two tabs                   | 2     | L   | L   | claimDaily is a Dexie transaction; second tab reads updated lastDailyClaimAt and returns not_yet_eligible.              |
| R-27 | mulberry32 PRNG bias in test seeds                          | 2     | L   | L   | mulberry32 passes BigCrush; chi-squared sanity test in rng.test.ts catches gross bias.                                  |
| R-30 | RecentResults rail re-orders mid-animation on rapid settles | 2     | M   | L   | Items keyed by round.id; Framer Motion layout handles ordering changes via FLIP.                                        |
| R-31 | Bet < min or > max accepted via console manipulation        | 2     | L   | L   | wallet.placeBet validates min/max at the system boundary, not just the UI form.                                         |

## Phase 3 additions

| ID   | Risk                                                                                             | Phase | L   | I   | Mitigation                                                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ | ----- | --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-32 | XState v5 API shift in a future minor version breaks machine.ts                                  | 3+    | L   | M   | Pin to specific minor; integration tests catch breakage; XState v5 stable as of 2025.                                                                          |
| R-33 | Soft-17 detection bug (e.g. A-3-3 misidentified as hard 17)                                      | 3     | M   | H   | Exhaustive `dealer.test.ts` + `hand.test.ts` with all multi-ace combos.                                                                                        |
| R-34 | Insurance payout miscomputed on dealer BJ (main + insurance both settle correctly)               | 3     | M   | M   | Dedicated tests in `settle.test.ts` for all insurance × main-hand outcome combos.                                                                              |
| R-35 | Reshuffle never triggers (off-by-one in needsReshuffle)                                          | 3     | L   | M   | Test asserts exact cutAt boundary triggers reshuffle.                                                                                                          |
| R-36 | Splits to 4 hands consume more shoe than expected; mid-round shoe exhaustion                     | 3     | L   | H   | drawCard throws; test that no round can plausibly exhaust a 6-deck shoe (~30 cards max per round).                                                             |
| R-37 | Multi-hand wallet pattern: a placeBet for split fails (insufficient_chips) after main bet placed | 3     | M   | M   | Wallet placeBet for split occurs at SPLIT action time; on failure, surface error and prevent the split (page-level guard checks balance before sending SPLIT). |

| R-38 | Animation glitch on hole-card flip (Framer Motion + state race) | 3 | L | L | Card component uses `rotateY` motion with explicit transition; tested visually post-merge. |
| R-39 | Multi-hand layout overflows at narrow viewport (<1024px) | 3 | M | L | CSS scrollable container at player area; documented in dev-setup. |
| R-40 | "BJ" badge in RecentResults shows for split-Ace 21 by accident | 3 | L | L | BlackjackRoundDetails.hands[i].outcome distinguishes player-blackjack from player-win 21; UI mapping checks specific outcome. |
