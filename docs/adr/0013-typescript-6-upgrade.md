# ADR-0013: TypeScript 6 upgrade — drop `baseUrl`

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

Dependabot opened a PR bumping TypeScript from 5.x to 6.0.3, which failed CI
because TS 6 raises `error TS5101` on `tsconfig.app.json`'s `"baseUrl": "."`
line. We previously closed that PR (#41) and noted the migration as a follow-up.

## Decision

Remove `baseUrl` from `tsconfig.app.json`. The `paths` map (`{ "@/*":
["src/*"] }`) resolves relative to the tsconfig location when `baseUrl` is
absent (TS 4.1+). With `moduleResolution: "bundler"` already in place, no
other config change is required.

Bump `typescript` to `^6.0.0`.

## Alternatives considered

- **Keep `baseUrl: "."`**: not possible — TS 6 errors out.
- **Replace `paths` with explicit per-import relative paths**: defeats the
  purpose of the alias and forces a sweep of every import.
- **Stay on TS 5**: postpones the inevitable; not bad short-term but accumulates
  drift. Dependabot will keep nagging.

## Consequences

- One-line tsconfig change.
- Existing `@/*` imports continue to resolve.
- typescript-eslint 8.x already supports TS 6 — no parser bump needed.
- If TS 6 surfaces other strictness changes (e.g. tighter narrowing in
  generics), they're addressed in the same PR.

## References

- TypeScript 5.0 release notes (`baseUrl` becomes optional with `paths`).
- TypeScript 6.0 release notes (`baseUrl` raises TS5101).
- ADR-0001 (broader stack — TS is the chosen language).
