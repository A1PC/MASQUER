# ADR-0001: Tech stack — TypeScript, React 18, Vite, Tailwind, Zustand, Dexie

- Status: Accepted
- Date: 2026-05-15
- Deciders: Developer

## Context

We need a stack for a single-machine, browser-based, play-money casino app
with four games. The app does almost no performance-critical computation
but needs robust client-side persistence, smooth animation, and a
component model that suits card/wheel/reel UIs.

## Decision

Adopt the stack documented in BUILD_GUIDE.md §2: TypeScript + React 18 +
Vite + Tailwind CSS + Framer Motion + Zustand + Dexie + Web Crypto API +
React Router + Vitest + ESLint + Prettier.

## Alternatives considered

- **Native (C/C++ + game framework)** — manual memory management, compile
  cycle, hand-wired graphics for no gameplay benefit.
- **Vanilla JS + plain DOM** — would slow iteration and forfeit type
  safety; React component model fits this UI well.
- **Electron desktop app first** — same web code wrapped, packaging
  overhead with no gameplay benefit during build.

## Consequences

- TypeScript strictness catches money/payout bugs at compile time.
- React + Vite gives instant hot-reload.
- IndexedDB via Dexie is durable through refreshes/crashes.
- Stack is well-documented enough that AI assistants produce reliable code.
- Locks us into the browser as the runtime — desktop wrap is deferred to
  Phase 9 if ever.

## References

- BUILD_GUIDE.md §2 (Tech Stack)

## Amendments

- **2026-05-17 (Phase 3).** XState v5 + `@xstate/react` adopted for
  per-round game logic (Blackjack first; later Roulette, Baccarat, Bingo,
  Plinko, Craps, Poker). See ADR-0026.
- **2026-05-22 (Phase 15 #1 — Design system).** Tailwind tokens extended
  with the Velvet Deco palette in `src/theme/tokens.ts`; 25 design-system
  primitives shipped. See ADR-0043.
- **2026-05-22 (Phase 15 #2 — Motion & Sound).** `useSound` /
  `useEffectiveReducedMotion` hooks added (ADR-0044 sound, motion library
  in `src/motion/`).
- **2026-05-28 (v1.0).** Recharts adopted into a shared lazy-loaded chunk
  (ADR-0039); React Router 7 data-router pattern (ADR-0014); game routes
  are lazy-loaded post-Phase-15 #15 PR C (main bundle ~222 KB gzipped).
  Core stack (TypeScript, React 18, Vite, Tailwind, Zustand, Dexie, Web
  Crypto API, Vitest, ESLint, Prettier) is unchanged from the Phase-0
  decision; XState v5, Framer Motion 12, Storybook 8 are the only major
  additions.
