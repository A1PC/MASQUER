# ADR-0002: Package manager (pnpm) and Node version (20 LTS)

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

A large-scale TypeScript project needs a deterministic, fast, well-supported
package manager and a stable Node runtime. The choice affects the lockfile
format, CI cache strategy, contributor onboarding, and how strictly
transitive dependencies are isolated.

## Decision

Use **pnpm 9** as the package manager and **Node 20 LTS** as the runtime.
Pin both: `packageManager: "pnpm@9.12.0"` in `package.json`; `20` in
`.nvmrc`. CI installs with `pnpm install --frozen-lockfile`.

## Alternatives considered

- **npm + Node 20 LTS** — simplest, ships with Node, no learning curve.
  Trade-off: slower installs, looser dependency hoisting that can hide bugs.
- **Bun** — fastest installs, all-in-one. Trade-off: ecosystem still
  maturing, occasional Vite/Vitest plugin friction.
- **Yarn 4 (Berry)** — Plug'n'Play, workspace support. Trade-off: adds
  configuration complexity that this single-package repo doesn't need.

## Consequences

- Faster, smaller `node_modules` (pnpm content-addressable store).
- Stricter dependency boundaries — accidentally importing a transitive dep
  fails immediately rather than working by coincidence.
- Slight onboarding step (`corepack enable`).
- LTS support for Node 20 runs through April 2026, giving roughly a year of
  cushion before a planned upgrade.

## References

- BUILD_GUIDE.md §2 (Tech Stack)
- ADR-0001 (broader stack)
