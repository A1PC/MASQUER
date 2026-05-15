# ADR-0007: Project tracking — Milestones + Issues, no Projects board

- Status: Accepted
- Date: 2026-05-15
- Deciders: @adamzspare

## Context
BUILD_GUIDE.md has 9 phases with multiple sub-tasks each. We need
visibility into what's done, in flight, and next. Options range from
"nothing" to a full GitHub Projects board with Kanban columns.

## Decision
Use GitHub **Milestones** (one per BUILD_GUIDE phase) and **Issues** (one
per sub-task), with phase labels (`phase-0` … `phase-9`) and category
labels (`bug`, `design`, `chore`, etc.). PRs reference issues to close
them.

Do **not** set up a GitHub Projects board.

## Alternatives considered
- **GitHub Projects (v2) board + Issues** — visual Kanban, but more clicks
  per task. Worth it only if we'd actually look at the board daily.
- **Issues only, no milestones** — loses the "what's the goal of this
  unit of work?" framing.
- **Nothing — just BUILD_GUIDE.md checklist** — zero overhead but no
  per-task visibility, no link from PR → acceptance criteria.

## Consequences
- Milestones page becomes the macro view; issues page becomes the micro.
- PRs can `Closes #N` to auto-close issues.
- One-time scripted setup creates milestones/labels/issues via `gh`.
- Easy to upgrade to Projects board later if we want it.

## References
- BUILD_GUIDE.md §12 (Build Order)
- ADR-0005 (same lightweight philosophy)
