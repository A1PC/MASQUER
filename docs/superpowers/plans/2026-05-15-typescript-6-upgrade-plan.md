# TypeScript 6 Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump `typescript` from `^5.6.3` to `^6.x` with zero behavior changes by removing the deprecated `baseUrl` line from `tsconfig.app.json`.

**Architecture:** Single PR `chore/typescript-6-upgrade` from `main`. Three planned commits (tsconfig prep, version bump, ADR). Optional fourth commit if TS 6 surfaces additional strictness errors. CHANGELOG `[Unreleased]` entry. No release tag — chore not feature.

**Tech Stack:** TypeScript 6.x, typescript-eslint 8.x (already supports TS 6).

**Spec:** `docs/superpowers/specs/2026-05-15-typescript-6-upgrade-design.md`

---

## File Structure

```
MASQUER/
├── tsconfig.app.json          # MODIFIED: drop "baseUrl" line
├── package.json               # MODIFIED: typescript ^5.6.3 → ^6.x
├── pnpm-lock.yaml             # AUTO-REGENERATED
├── CHANGELOG.md               # MODIFIED: add to [Unreleased]
└── docs/adr/
    └── 0013-typescript-6-upgrade.md   # NEW
```

---

## Pre-flight

- [ ] **Step 1: Verify clean main**

```bash
cd /Users/adam/localGamble
git checkout main && git pull --ff-only
git status
git log --oneline -2
```

Expected: `On branch main`, clean tree, last commit is `883acf3 docs(build-guide): add React Router 7 upgrade design spec (#55)` or newer.

- [ ] **Step 2: Verify all gates currently pass**

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Expected: all four exit 0; 59 tests pass. If anything fails on `main`, that's a regression — STOP and report BLOCKED.

---

## Task 1: Branch + drop `baseUrl` from tsconfig.app.json

**Files:**

- Modify: `tsconfig.app.json`

This step verifies that `baseUrl` is currently a no-op in our setup by removing it on TS 5 and confirming `pnpm typecheck` still passes.

- [ ] **Step 1: Branch from main**

```bash
git checkout -b chore/typescript-6-upgrade
```

- [ ] **Step 2: Edit tsconfig.app.json**

Remove the `"baseUrl": "."` line (line 22 in current state). The `compilerOptions` block, after edit, should contain `"paths": { "@/*": ["src/*"] }` directly without a preceding `baseUrl` line. All other fields unchanged.

The exact resulting file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "useDefineForClassFields": true,
    "paths": { "@/*": ["src/*"] },
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Verify typecheck still passes on TS 5.6**

```bash
pnpm typecheck
```

Expected: exits 0. If it fails, the `paths` resolution depended on `baseUrl` — STOP and report BLOCKED so the spec can be revised (e.g., add `"baseUrl": "src"` instead).

- [ ] **Step 4: Verify the full quality gate**

```bash
pnpm lint && pnpm test:run && pnpm build
```

Expected: all three exit 0.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.app.json
git commit -m "chore(repo): drop baseUrl from tsconfig.app.json (prep for TS 6)"
```

---

## Task 2: Bump TypeScript to 6.x

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto)

- [ ] **Step 1: Bump the version**

```bash
pnpm add -D typescript@^6
```

Expected: package.json shows `"typescript": "^6.x.y"`; lockfile regenerated.

- [ ] **Step 2: Verify install succeeded**

```bash
pnpm list typescript
```

Expected: shows TypeScript 6.x.

- [ ] **Step 3: Run typecheck on TS 6**

```bash
pnpm typecheck
```

**Possible outcomes:**

A. **Exits 0** — perfect. Continue.

B. **Fails on `TS5101`** — `baseUrl` was not actually removed in Task 1. Re-check `tsconfig.app.json`. Should be impossible if Task 1 succeeded.

C. **Fails on something else** (e.g., stricter narrowing, generic-inference change) — see Task 3 for the surface fix policy.

- [ ] **Step 4: If typecheck passed, run remaining gates**

```bash
pnpm lint && pnpm test:run && pnpm build
```

Expected: all three exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps-dev): bump typescript from 5.6.x to 6.x"
```

---

## Task 3 (CONDITIONAL): Fix any TS 6 breaking-change surprises

**Files:** depends on what fails

Skip this task if Task 2 Step 3 exited 0 with no errors.

- [ ] **Step 1: Read each error**

`pnpm typecheck` output lists every error with file:line. Group them by file.

- [ ] **Step 2: Fix per error**

Common TS 6 breaking changes and fixes:

| Symptom                                                          | Likely fix                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `TS2532: Object is possibly 'undefined'` on indexed access       | Add `!` non-null assertion or explicit check (already used heavily in `crypto.ts`/`avatar.ts` — should be unaffected)                  |
| `TS2322: Type 'unknown' is not assignable`                       | Tighten the type assertion or add a type guard                                                                                         |
| `TS2769: No overload matches` on Web Crypto APIs                 | The `Uint8Array<ArrayBufferLike>` issue — wrap in `new Uint8Array(bytes)` (already done in `crypto.ts` per Phase 1 PR #2 deviation #4) |
| `TS2349: This expression is not callable` on overloaded function | TS 6 narrowed the overload set; cast or use a more specific signature                                                                  |

- [ ] **Step 3: After each fix, re-run typecheck**

```bash
pnpm typecheck
```

Expected: exits 0 once all errors are fixed.

- [ ] **Step 4: Run remaining gates**

```bash
pnpm lint && pnpm test:run && pnpm build
```

Expected: all three exit 0.

- [ ] **Step 5: Commit each fix as its own commit**

For each fix, use a descriptive commit message:

```bash
git add <file>
git commit -m "fix(<scope>): <one-line description of TS 6 fix>"
```

If multiple files were touched for ONE underlying issue (e.g., a generic helper that ripples through several callers), bundle them in one commit with a body that explains the root cause.

If you can't fix something within 30 minutes of trying, STOP and report BLOCKED with the error and what you tried.

---

## Task 4: Add ADR-0013

**Files:**

- Create: `docs/adr/0013-typescript-6-upgrade.md`

- [ ] **Step 1: Create the ADR**

Verbatim content (from spec section 5.4):

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0013-typescript-6-upgrade.md
git commit -m "docs(adr): ADR-0013 TypeScript 6 upgrade"
```

---

## Task 5: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Read current CHANGELOG**

```bash
cat CHANGELOG.md
```

The `[Unreleased]` section is currently empty (last release was v0.2-data-and-auth).

- [ ] **Step 2: Add the entry**

Find the `## [Unreleased]` heading. Add a `### Changed` subsection right under it:

```markdown
## [Unreleased]

### Changed

- TypeScript bumped from 5.6 to 6.x. Dropped `baseUrl` from `tsconfig.app.json` (TS 6 raises TS5101). `paths` alias resolves the same way without it. ADR-0013.
```

(Keep all other content in the file unchanged.)

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(repo): note TypeScript 6 upgrade in CHANGELOG"
```

---

## Task 6: Final local DoD verification

**Files:** none

- [ ] **Step 1: Re-run all four quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build && pnpm format:check
```

Expected: all five exit 0. Test count: 59/59.

- [ ] **Step 2: Confirm git state**

```bash
git status
git log --oneline -10
```

Expected: clean tree; commits since `main` are (in order):

1. `chore(repo): drop baseUrl from tsconfig.app.json (prep for TS 6)`
2. `chore(deps-dev): bump typescript from 5.6.x to 6.x`
3. (any TS 6 fix commits, if Task 3 ran)
4. `docs(adr): ADR-0013 TypeScript 6 upgrade`
5. `docs(repo): note TypeScript 6 upgrade in CHANGELOG`

---

## Task 7: Push, open PR, watch CI, merge

**Files:** none

- [ ] **Step 1: Push**

```bash
git push -u origin chore/typescript-6-upgrade
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "chore(typescript): bump to TypeScript 6" \
  --body "$(cat <<'EOF'
## Summary
Mechanical TypeScript 6 upgrade. Drops the deprecated `baseUrl` line from `tsconfig.app.json` (TS 6 raises TS5101 on it), bumps `typescript` to `^6.x`. No source code changes other than what TS 6 strictness might force.

## What changed
- `tsconfig.app.json`: removed `"baseUrl": "."`. The `paths` alias (`@/* → src/*`) resolves correctly without it under `moduleResolution: bundler`.
- `package.json`: `typescript ^5.6.3` → `^6.x`.
- ADR-0013 added.
- CHANGELOG `[Unreleased]` entry added.

## How tested
- `pnpm typecheck` exits 0 on TS 6.
- `pnpm lint && pnpm test:run && pnpm build && pnpm format:check` all green.
- 59/59 tests pass.

## BUILD_GUIDE reference
- Type: chore (dependency upgrade), not a phase.
- Spec: \`docs/superpowers/specs/2026-05-15-typescript-6-upgrade-design.md\`

## Definition of done
- [ ] All 4 CI jobs green
- [ ] No source-behavior changes (unless TS 6 forced one — see commits)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the PR URL.

- [ ] **Step 3: Watch CI**

```bash
gh pr checks --watch
```

Expected: all four jobs (meta, lint, test, build) pass.

If a CI job fails on something not caught locally:

- Read the failed-job log
- Fix on the branch (don't bypass)
- Push, watch again

- [ ] **Step 4: Merge and sync**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only
git log --oneline -3
```

Expected: top commit is `chore(typescript): bump to TypeScript 6 (#NN)`.

---

## Self-Review Notes

This plan was self-reviewed for:

- **Spec coverage:** every spec section (3 decisions, 4 file changes, 1 ADR, test plan, PR plan, DoD, rollback, handoff) maps to at least one task. The conditional Task 3 covers spec section 6's "Risk surface" fix policy.
- **Placeholders:** no TBD/TODO. The conditional Task 3 has placeholder code in its symptom/fix table that's labeled as guidance, not literal patches.
- **Type / name consistency:** branch name `chore/typescript-6-upgrade`, commit message conventions follow Phase 0 ADR-0006 + commitlint enum (`chore`, `docs` types; `repo`, `deps-dev`, `adr` scopes — all in the enum).
- **Scope:** TS 6 upgrade only. No RR 7 mixing. No source refactor beyond what TS 6 forces.
