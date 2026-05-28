# ADR-0015: RNG seeded mode via global `seed()` / `unseed()` toggle

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

BUILD_GUIDE §5 requires `systems/rng.ts` to provide a "seedable mode for tests."
Several API shapes are possible: a global toggle, a `withSeed(seed, fn)` wrapper,
two separate exports (seeded vs unseeded), or test-side mocking of `crypto.getRandomValues`.

## Decision

Adopt a global toggle: `rng.seed(value)` switches to a deterministic PRNG
(mulberry32) and `rng.unseed()` returns to `crypto.getRandomValues` with
rejection-sampling. Tests call `rng.seed(N)` in `beforeEach` (or wherever they
need determinism) and `rng.unseed()` in `afterEach`. Production code never calls
either.

## Alternatives considered

- **`withSeed(seed, fn)` wrapper** — guarantees state can't leak, but every test
  block has to wrap its body. More boilerplate.
- **Two exports (`rng` and `seededRng(seed)`)** — cleanest separation but forces
  every consumer (game logic) to take rng as a parameter — too much plumbing for
  a play-money app.
- **Mock `crypto.getRandomValues` in tests** — fragile; each test computes byte
  sequences manually.

## Consequences

- Tests are concise: `seed(42); ... ; unseed();`.
- A test that forgets `unseed()` leaks seeded state into subsequent tests in the
  same file. Mitigation: standard `afterEach(unseed)` pattern.
- mulberry32 is fast and statistically OK for game logic tests; if Phase 4+
  needs a stronger PRNG, the toggle stays — just swap the `prng()` implementation.

## References

- BUILD_GUIDE.md §5 (Randomness)
- Phase 2 spec §6.1 (rng.ts verbatim)
