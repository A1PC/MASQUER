# ADR-0005: No GitHub branch protection — convention-based discipline

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

This is a solo project. BUILD_GUIDE.md §13 already states "never commit
directly to main." Adding GitHub branch protection would enforce that, but
also introduces friction (signing requirements, required reviewers,
required-checks plumbing) and would block emergency direct pushes.

## Decision

Do **not** enable branch protection on `main`. Rely on convention:

- CLAUDE.md hard rules forbid direct main commits.
- CONTRIBUTING.md restates the rule.
- PR template self-review keeps the gate honest.
- A slip past convention is recoverable via `git revert` (PR-based).

## Alternatives considered

- **Require PR + CI pass, allow self-merge** — better hygiene but more
  setup; revisit if collaborators join.
- **Require PR + CI + 1 review** — blocks self-merge entirely; impractical
  solo.
- **Require signed commits** — good security but adds key-management
  friction.

## Consequences

- Possible to bypass the rule under stress; mitigated by squash-merge
  history clarity and the ability to revert.
- Easier to recover if I'm ever locked out of the GitHub UI mid-incident.
- Revisit when a second contributor joins.

## References

- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
- ADR-0007 (tracking via milestones — same lightweight philosophy)
