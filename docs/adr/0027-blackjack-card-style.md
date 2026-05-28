# ADR-0027: Blackjack — card visual style (formal pip + neon glow + pinstripe back)

- Status: Accepted
- Date: 2026-05-17
- Deciders: Developer

## Context

The Blackjack page introduces playing-card rendering for the first time
in the project. The cards must feel "casino" but stay in the project's
"old-school Vegas content + modern web execution" design philosophy.

## Decision

- **Face cards (non-court):** formal Times New Roman bold rank letters
  in opposite corners; classical pip arrangements via a table-driven
  `PIP_LAYOUTS` grid (per-rank positions on a 7×3 visual grid).
- **Ace:** single large centered suit pip.
- **Court cards (J/Q/K):** framed rank letter inside a gold-bordered
  inset rectangle. Proper royal art is Phase 8 polish.
- **Glow:** subtle drop-shadow on suit symbols — neon-cyan for spades/
  clubs, neon-magenta for hearts/diamonds.
- **Background:** cream-to-white gradient (top-down).
- **Border:** 1.5px gold inset ring + 1px white highlight ring.
- **Back:** pinstripe cross-hatch (4px diagonal gold lines at 90°) over
  radial casino-red gradient; gold border; inset frame with "LG" monogram
  in Bungee with gold glow.

## Alternatives considered

- Minimal flat (just centered big suit + corners) — too plain.
- Pip pattern without neon glow — too generic.
- Bold neon throughout — too aggressive; loses formal-casino-card feel.

## Consequences

- All-CSS rendering; no image assets to manage.
- Phase 8 polish can replace court-card framed letters with real royal SVGs.
- Reusable for any future card-based game (none planned but baccarat etc.).
- Pinstripe back is the project's card-back identity.

## References

- Phase 3 spec §3 decisions #11, #12, #13
- `src/games/blackjack/Card.tsx`, `src/games/blackjack/HandView.tsx`, `src/games/blackjack/PIP_LAYOUT.ts`
- Project design philosophy (memory: project-masquer-design-philosophy)

## Amendments

- **2026-05-24 (Phase 15 #5 — Blackjack upgrade).** Card visual rebuilt
  for the MASQUER · Velvet Deco brand: ivory face stock, gold-leaf
  pip + court treatment, oxblood-velvet pinstripe back with the
  Venetian mask emblem (`MaskMark`) replacing the "LG" monogram.
  Pip arrangements (the load-bearing decision in this ADR) are
  preserved. Card style is now shared across all card games — see
  `MasquerCard` in `src/components/brand/` and the per-poker-variant
  adapters (`PlayingCard` in `src/games/poker/_shared/`).
- **2026-05-28 (v1.0 launch).** Velvet Duel variant (ADR-0045) ships
  alongside the standard Blackjack; both use the same card style.
