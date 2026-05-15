# ADR-0004: PR strategy for Phase 0 — three sequential PRs

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context

Phase 0 produces no user-facing features but sets up a lot of
configuration. A single mega-PR is hard to review; over-fragmenting wastes
cycles. The CI workflow itself evolves alongside the code.

## Decision

Three sequential PRs:

1. **Meta infrastructure** (this PR) — CLAUDE.md, CONTRIBUTING, templates,
   conventions, ADRs, risks, CI v1 (file-only checks), Dependabot.
2. **Vite scaffold** — package.json, Vite/TS/Router setup, folder
   skeleton, placeholder pages, CI v2 (adds install + typecheck + build).
3. **Tooling** — Tailwind, ESLint flat config, Prettier, Vitest, Husky,
   sanity test, CI v3 (adds lint + test + coverage).

After PR #3 merges, a separate `chore(release):` PR adds CHANGELOG entry
and tags `v0.1-scaffold`.

## Alternatives considered

- **Single mega-PR** — faster but harder to review and bisect.
- **Three PRs split differently (e.g., bare scaffold, tooling, polish)**
  — leaves the bare scaffold PR in a half-broken intermediate state.

## Consequences

- Each PR's CI tests against its own additions.
- Reviewer cognitive load stays low.
- Slightly more overhead (3 PR descriptions, 3 merges).
- If we discover a wrong call in PR #1 after PR #2 starts, we revert and
  redo — accepted as a low-frequency event.

## References

- BUILD_GUIDE.md §12 (Build Order — Phased Roadmap)
- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
