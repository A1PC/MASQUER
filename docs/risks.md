# Risk register

Reviewed at the start of each BUILD_GUIDE phase. Add or update entries as
new risks emerge.

| ID | Risk | Phase | L | I | Mitigation |
|---|---|---|---|---|---|
| R-01 | IndexedDB schema migration breaks existing balances | 1+ | M | H | Dexie `version().upgrade()` from day one; smoke test before merge |
| R-02 | RNG bias in payouts | 2+ | L | H | Centralized `systems/rng.ts` w/ rejection sampling; ESLint bans Math.random; chi-squared test added in Phase 2 |
| R-03 | Float chip math causes balance bugs | 2+ | M | H | Integer-only at boundaries; ESLint forbids `parseFloat` in wallet/logic; tests assert `Number.isInteger` |
| R-04 | Game directly mutates balance/store | 3–6 | M | H | ESLint blocks `@/db` and `@/store` imports under `src/games/**` |
| R-05 | Animation outpaces logic outcome | 3–6 | M | M | Outcome decided first; animation reads outcome (documented in `_shared/useGameRound`) |
| R-06 | Baccarat third-card tableau wrong | 6 | M | M | Implement verbatim from cited source; exhaustive truth-table test |
| R-07 | Roulette payout off-by-one | 4 | M | M | Document "X to 1" convention in `payouts.ts`; tests assert payout AND netChange |
| R-08 | Slots paytable un-fun (wrong RTP) | 5, 8 | H | L | Paytable in single config; "expected RTP simulator" test (10M spins) |
| R-09 | Hex literals leak into components | 8+ | M | L | ESLint rule (Phase 8) flagging hex in `*.tsx` outside `theme/`; review checklist |
| R-10 | Tests pass, prod build broken | All | L | M | `pnpm build` is required CI check |
| R-11 | Lockfile drift | All | L | M | `--frozen-lockfile` in CI; `packageManager` pinned |
| R-12 | Husky bypassed via `--no-verify` | All | M | L | CI is the enforcing layer; PR template asks |
| R-13 | Dependency vulnerabilities accumulate | Ongoing | M | L | Dependabot weekly (PR #1) |
| R-14 | Phase creep — future-phase features in early PRs | All | H | M | CLAUDE.md rule #1; PR template phase ref; reviewer rejects |
| R-15 | Solo-dev rubber-stamps own PRs | All | H | L | PR self-review checklist; CI must be green; squash-merge |

L = Likelihood (L/M/H), I = Impact (L/M/H).
