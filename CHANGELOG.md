# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project versions by BUILD_GUIDE.md phase (`v0.PHASE-name`).

## [Unreleased]

## [v0.1-scaffold] — 2026-05-15

### Added

- Repo infrastructure: CLAUDE.md, CONTRIBUTING.md, conventions, ADRs (0001-0007), risks, dev-setup
- GitHub: PR + issue templates, 9 phase milestones, 18 labels, Dependabot
- CI: actionlint + markdownlint + commitlint → install + typecheck + build → lint + test + coverage
- Vite + React 18 + TypeScript scaffold with React Router (5 placeholder pages)
- Folder skeleton per BUILD_GUIDE §3 (theme, db, store, systems, components, pages, games)
- Tailwind v3 with retro Vegas color tokens
- ESLint flat config with Math.random ban and games-import sandboxing
- Prettier + EditorConfig + Husky + lint-staged
- Vitest + RTL + jsdom + coverage thresholds for game logic
- Sanity test for App routing
- Anthropic Claude Code GitHub Action active at .github/workflows/claude.yml

### Verified

- Deliberate-failure CI run for Math.random ban: <https://github.com/A1PC/localGamble/actions/runs/25914026044/job/76166109022>
