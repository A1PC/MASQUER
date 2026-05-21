# Contributing to localGamble

## Local setup

Requirements: Node 20 LTS (see `.nvmrc`), pnpm 9+ (via Corepack).

```bash
nvm use            # picks up .nvmrc
corepack enable    # enables pnpm via Node's bundled corepack
pnpm install
pnpm dev           # http://localhost:5173
```

See [`docs/dev-setup.md`](./docs/dev-setup.md) for troubleshooting.

## Branch model

- `main` always builds and passes tests. Never commit directly.
- Feature branches:
  - `phase-N-short-name` — implements a phase from BUILD_GUIDE.md §12
  - `fix/area-short-name` — bug fix
  - `chore/short-name` — tooling, deps, docs
  - `docs/short-name` — documentation
- One PR per phase, or one PR per logical chunk within a large phase (recent phases ship as a lettered series: PR A, PR B, PR C…).
- Squash-merge into `main`. Delete the branch after merge.

## Development workflow

Each BUILD_GUIDE phase follows a deliberate pipeline (the docs live under `docs/superpowers/`):

1. **Brainstorm** the design — clarify requirements, weigh 2-3 approaches, present a design, get approval. Save the agreed design as a **spec** in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and merge it.
2. **Plan** — break the spec into bite-sized, TDD-friendly tasks with exact file paths + code in `docs/superpowers/plans/YYYY-MM-DD-<topic>-plan.md`. Merge it.
3. **Implement** — execute the plan one PR at a time. Each PR runs the full Definition of Done before it opens.
4. **Release** — after the implementation PRs merge, tag `v0.PHASE-name`, cut a GitHub Release, and add a `CHANGELOG.md` entry.

Spec-first rule: if a rule, payout, or schema must change, update `BUILD_GUIDE.md` first, commit it, then implement — code follows the spec.

## Architecture decisions

Record non-obvious architectural choices as ADRs in `docs/adr/NNNN-short-title.md` (copy `docs/adr/_template.md`). Number sequentially. Reference the ADR number in the relevant code comment, BUILD_GUIDE row, and changelog entry. There are 41 ADRs as of `v0.13a`.

## Commit message format (Conventional Commits)

`<type>(<scope>): <imperative summary>`

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `perf`, `build`, `ci`.

Scopes — the canonical list is enforced by `commitlint.config.js`. Current scopes:

`blackjack`, `roulette`, `slots`, `baccarat`, `wallet`, `auth`, `rng`,
`history`, `stats`, `leaderboard`, `lottery`, `bingo`, `plinko`, `poker`,
`theme`, `db`, `session`, `lobby`, `ci`, `build-guide`, `deps`, `deps-dev`,
`release`, `repo`, `adr`, `routing`, `ui`, `shell`, `coin-flip`, `games`,
`admin`, `tracking`.

> When you introduce a new game or area, add its scope to `commitlint.config.js`
> **in the same PR, before the first commit that uses it** — the `commit-msg`
> hook (and CI) will otherwise reject the commit. Spec/plan docs for a not-yet-
> scoped game use `docs(games)`.

Examples:

- `feat(poker): add side-pot computation`
- `fix(wallet): reject bets above balance`
- `test(roulette): cover corner bet payout`
- `chore(ci): cache pnpm store between runs`
- `docs(build-guide): clarify baccarat third-card tableau`

## Testing notes

- Game logic is the priority — pure logic modules need thorough unit tests; coverage is enforced.
- Seed all randomness (`rng.seed(...)`, `deckFromSeed`, `mulberry32`) so tests are deterministic.
- **Scope component assertions.** Never use a global `screen.getByText(/value/)` for a value that can legitimately appear in more than one component on the page — it intermittently matches multiple elements and flakes in CI. Scope to a container or a `data-*` attribute (lesson from #169).
- For XState machines, feed scripted events with fixed seeds; the machine should do no async work itself (the page resolves async + RNG and sends pre-resolved events).
- For fake-timer + XState `invoke`/`sendBack` tests, prefer `await vi.advanceTimersByTimeAsync(ms)` over the sync variant (microtask delivery; lesson from #157).

## Definition of done (before opening a PR)

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (and adds tests for new logic)
- [ ] `pnpm build` passes
- [ ] Manually verified in `pnpm dev`
- [ ] PR description filled out from the template
- [ ] Linked to a GitHub issue or BUILD_GUIDE phase

## PR review

You may self-merge once CI is green. Use the PR description checklist as a
self-review prompt before merging.
