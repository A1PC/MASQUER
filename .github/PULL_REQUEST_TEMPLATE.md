## Summary

<!--
1-3 bullets: what changed and why. Focus on the "why", not just the "what".
Subject line should be Conventional Commits: `<type>(<scope>): <imperative summary>`
with subject ≤ 100 chars. Use `chore(release)` for release-time bumps, not
`release(scope)`. See CONTRIBUTING.md for the allowed scope enum.
-->

## BUILD_GUIDE reference

- Phase / sub-project: <!-- e.g., Phase 15 #15 PR E -->
- Sections: <!-- e.g., §12, §10.9 -->
- Spec: <!-- link to docs/superpowers/specs/... -->
- Plan: <!-- link to docs/superpowers/plans/... -->

## How tested

<!--
- Unit / integration tests added or updated.
- Manual verification steps (browser + viewport).
- Screenshots / GIFs for UI changes — for visual bug reports, Playwright +
  dev-server screenshots first (CSS reasoning misses real bugs, per memory
  `feedback-localgamble-screenshot-before-pushing-ui`).
-->

## Screenshots / GIFs (UI changes)

<!-- Drag images here -->

## Definition of done

- [ ] `pnpm lint` passes (max warnings 0)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm exec vitest run` passes (and adds tests for new logic)
- [ ] `pnpm build` passes
- [ ] `pnpm build-storybook` passes
- [ ] `pnpm exec prettier --check .` clean
- [ ] `npx markdownlint-cli2 --config .markdownlint.json '**/*.md'` clean
- [ ] Manually verified in `pnpm dev`
- [ ] Updated `BUILD_GUIDE.md` if a rule / payout / schema changed
- [ ] Updated `CHANGELOG.md` if user-visible
- [ ] Conventional Commits subject ≤ 100 chars; scope is in the enum
- [ ] No `Math.random()`, no direct DB / store access from games
- [ ] Page roots under `AppLayout` use `h-full`, not `min-h-screen`
- [ ] Every animated surface gates on `useEffectiveReducedMotion`
- [ ] No new hard-coded hex in components (tokens only)
- [ ] CLAUDE.md untouched
