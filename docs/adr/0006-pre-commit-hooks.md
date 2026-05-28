# ADR-0006: Pre-commit hooks — Husky + lint-staged (format + lint changed only)

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

We want fast feedback on lint/format mistakes without slowing every commit.
Running tests on every commit is too slow; running nothing means CI is the
only feedback loop, and a CI failure costs minutes.

## Decision

Use Husky (Git hooks manager) + lint-staged (run linters only on staged
files). The pre-commit hook runs:

- `eslint --fix --max-warnings=0` on staged `*.{ts,tsx,js,jsx}`
- `prettier --write` on staged `*.{ts,tsx,js,jsx,json,md,css,yml,yaml}`

No tests in pre-commit. Tests run in CI.

## Alternatives considered

- **No hooks** — every formatting slip becomes a CI failure.
- **Run tests too** — slow, encourages `--no-verify` bypass habit.
- **Pre-push instead of pre-commit** — useful, but pre-commit catches it
  earlier without much added cost.

## Consequences

- ~1-2 second pre-commit overhead, mostly on first commit after touching
  many files.
- ESLint auto-fix means most violations get corrected silently.
- `--no-verify` still bypasses; CI is the actual enforcement layer.
- Husky's `prepare` script must run after `pnpm install` to install the
  hook — included in `package.json` scripts.

## References

- BUILD_GUIDE.md §13 (Git & GitHub Workflow)
- ADR-0003 (CI strictness — the actual gate)
