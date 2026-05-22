# Phase 15 · Sub-project #0 — Brand & Design Language (MASQUER)

**Status:** Design spec for the first Phase 15 sub-project. Part of the [Phase 15 umbrella roadmap](./2026-05-22-phase-15-umbrella-roadmap-design.md). Establishes the brand + design tokens + emblem that every later sub-project consumes.

**Date:** 2026-05-22

---

## 1. Goal

Lock the product brand and a token-level design language so the design-system library (#1) and every screen rebuild downstream are coherent from day one. This sub-project produces **decisions + the token/asset foundation** (palette, type, motion/sound principles, the mask emblem as a reusable asset, the new product name in the shell) — not the component library itself (#1) and not per-screen rebuilds (later).

## 2. Brand decisions (LOCKED via visual brainstorming)

- **Product name:** **MASQUER** (replaces the working title "localGamble" in all user-facing surfaces; the git repo + internal docs may keep `localGamble`).
- **Aesthetic:** **"Velvet Deco"** — old-school Vegas/Monte-Carlo content (felt, velvet, brass, masquerade) executed with modern web craft (art-deco geometry, centered scaling, smooth Framer Motion, no jank). Warm, immersive, refined; **no neon**.
- **Emblem:** a **Venetian Colombina half-mask** in porcelain white with gold-leaf filigree (top crest, temple flourishes, gold eye rims/liner, nose-bridge diamond, cheek scrollwork). It is the through-line motif of the whole product.

## 3. Color palette (semantic tokens)

Dark-themed. All values are the canonical hex; components reference **semantic token names only** (no raw hex — CLAUDE.md rule, enforced in the overhaul).

| Token           | Hex                     | Role                                         |
| --------------- | ----------------------- | -------------------------------------------- |
| `bg.base`       | `#07100b`               | App background (deepest "midnight felt")     |
| `bg.surface`    | `#0c1711`               | Cards / panels base                          |
| `felt`          | `#123a2a`               | Game table felt                              |
| `felt.deep`     | `#0e2e21`               | Felt shadow / inset                          |
| `velvet`        | `#5a1320`               | Oxblood velvet accent (panels, card backs)   |
| `velvet.deep`   | `#3d0d16`               | Velvet shadow                                |
| `brass`         | `#c79a4b`               | Secondary metal — hairline borders, filigree |
| `gold`          | `#e6c068`               | Primary metal — CTAs, wordmark, key strokes  |
| `gold.deep`     | `#b8893a`               | Gold gradient stop / pressed                 |
| `ivory`         | `#f2e7cc`               | Primary text on dark; card faces             |
| `porcelain`     | `#ffffff`               | Mask face, high-contrast card stock          |
| `jewel.ruby`    | `#7a1422`               | Sparing accent (mask jewel, alerts)          |
| `jewel.emerald` | `#1f6b4a`               | Sparing accent (mask jewel)                  |
| `state.win`     | `#e6c068`               | Win/success (gold — winning glows gold)      |
| `state.loss`    | `#7a1f2b`               | Loss                                         |
| `state.push`    | `#8a7a55`               | Push / neutral (muted brass)                 |
| `border.hair`   | `rgba(230,192,104,0.4)` | Gold hairline borders                        |

**Contrast:** ivory on `bg.base` and gold on `bg.surface` both clear AA (4.5:1) for text; verify each pairing in implementation. Functional colour (win/loss) always pairs with an icon or label — never colour-only.

## 4. Typography

- **Display / wordmark / hero:** `Cinzel Decorative` (700) for the logo + hero; `Cinzel` (600/700) for section headings.
- **Body / UI:** `Montserrat` (300/400/500/600) — geometric, art-deco-era, highly legible across tables, stats, and admin.
- **Hero numerals:** `Poiret One` for large display chip counts only (lobby/wallet hero).
- **Data numerals:** `Montserrat` with **tabular figures** for tables, prices, timers (prevents layout shift).
- **Mono (admin/code):** keep `JetBrains Mono`.
- Type scale (px): 12 · 14 · 16 · 18 · 24 · 32 · 44. Body 16px min, line-height 1.5–1.6. `font-display: swap`; preload only the critical display + body weights.

## 5. Spacing, radius, effects

- **Spacing:** 4/8 rhythm — 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** sm 8 · md 12 · lg 16 (circular for chips/coins).
- **Borders:** 1px brass/gold hairlines; signature **double-rule deco frame** (outer solid brass + inset thin gold) for panels/hero.
- **Effects:** faint gold **sunburst** radial behind hero elements; subtle **felt texture** (diagonal noise overlay) on surfaces; **velvet sheen** on accent panels; restrained **gold glow** (`box-shadow`) on primary CTAs and win states only. Elevation scale consistent across cards/sheets/modals.

## 6. The mask emblem — asset + usage

The Colombina mask ships as a **reusable React SVG component** `MaskMark` (e.g. `src/components/brand/MaskMark.tsx`) with props `size` and `variant`:

- `variant="full"` — all filigree (logo, hero, large surfaces).
- `variant="simple"` — fine filigree dropped, retains silhouette + eyes + crest (favicon, ≤32px, chip/coin small renders).

**Canonical SVG source** (porcelain `#fff→#f6efde→#e2d4b6` gradient face, gold `#c79a4b`/`#e6c068` accents) — preserved in the brainstorm mockups at `.superpowers/brainstorm/66693-1779470233/content/masquer-colombina.html`; lift the `<symbol id="mask">` markup verbatim as the `full` variant.

**Recurring usage:** app logo + wordmark lockup; coin-flip **heads** face (mask) / **tails** face (Cinzel "M" monogram); card backs (mask on oxblood pinstripe + gold rule); poker chips (mask centre, dashed gold edge); loaders (mask fades/tilts in, respecting reduced-motion); empty states; favicon + PWA icons; lobby hero.

## 7. Motion principles (APPROVED)

Codified in #2's shared Framer-Motion variant library; every sub-project reuses named variants.

- Micro-interactions **150–300ms**; transitions ≤400ms. **transform/opacity only** (never width/height/top/left).
- **ease-out** on enter, **ease-in** on exit; exit ≈70% of enter duration. Prefer **spring/physics** for cards, chips, coins.
- **Staggered reveals** (30–50ms/item) for lobby tiles, stats cards, lists.
- **Directional page transitions** (forward = slide up/left; back = reverse) + shared-element where natural.
- **`prefers-reduced-motion` honored everywhere** — instant or eased-down fallback, mandatory. Animate ≤2 key elements per view.
- Animations **interruptible**; never block input.
- **Signature moments:** card deal/flip, chip slide+stack, coin flip, the **mask reveal** loader, and a **tiered win celebration** (small/medium/jackpot — reuses ADR-0033) with a gold sunburst burst.

## 8. Sound principles (APPROVED)

Built in #2; a single `useSound` hook is the **only** integration point (no inline `<audio>`).

- **Taxonomy:** UI (button press, toggle), game events (deal, chip place, spin, dice roll, reveal, win/loss stingers tiered to the celebration), optional low **lounge ambience** (jazzy/vintage, toggleable).
- **Controls:** volume + mute in the **Settings page** (#2), persisted (localStorage). Global mute respected everywhere.
- **Policy:** never autoplay before first user interaction (browser autoplay rules); tasteful vintage-lounge palette, not arcade bleeps. Sound is independent of `prefers-reduced-motion` (separate preference).

## 9. Implementation scope for #0 (what the plan will build)

1. **Tokens:** rewrite `src/theme/tokens.ts` with the §3/§4/§5 semantic token set.
2. **Tailwind:** update `tailwind.config.ts` (colors, fontFamily, boxShadow, borderRadius, spacing) to mirror the tokens.
3. **Fonts:** load Cinzel, Cinzel Decorative, Montserrat, Poiret One (via `index.css` `@import` or self-hosted), `font-display: swap`, preload critical weights; keep JetBrains Mono.
4. **Emblem asset:** add `MaskMark` SVG React component (`full` + `simple` variants) + new favicon/PWA icons from the mask.
5. **Name in shell (light touch only):** product name → **MASQUER** in `index.html` `<title>`/meta, the manifest, and the primary logo/wordmark lockup component. Deep per-screen string/visual rebrand happens in the **Shell (#3)** and per-screen sub-projects, not here.
6. **Brand doc:** `docs/brand/MASQUER.md` capturing this spec's decisions (palette, type, emblem, voice) as the living brand reference.

**Out of scope for #0:** the component library (#1), any game/screen rebuild, the full "localGamble→MASQUER" string sweep, sound/motion _code_ (#2). #0 ships decisions + tokens + the emblem asset + the brand doc, and proves them on the logo lockup.

## 10. Invariants (inherited from the umbrella)

Game logic untouched; games sandbox preserved; one rounds row per game (ADR-0041 session exception); integer money; seeded RNG; all ADRs intact; tokens-only (no raw hex) in components; `prefers-reduced-motion` honored; CLAUDE.md not edited; `BUILD_GUIDE.md` updated spec-first. DoD per PR: `pnpm lint && pnpm typecheck && pnpm exec vitest run && pnpm build`.

## 11. Testing

- Token + tailwind config: a unit test asserting key semantic tokens resolve (and a guard test/lint that flags raw hex in `src/components`/`src/games` once the library lands — may defer the lint rule to #1).
- `MaskMark`: render test (both variants render an `<svg>`, `simple` omits filigree groups, respects `size`).
- Visual: manual check of the logo lockup on `bg.base` at desktop + mobile; favicon at 16/32px.

## 12. Open decisions resolved

Name (MASQUER) · palette (Velvet Deco) · type (Cinzel/Montserrat/Poiret One) · emblem (Colombina, porcelain+gold). **Resolved at review:** win-state colour = **gold `#e6c068`** (winning glows gold; loss = oxblood, push = muted brass; functional colour always paired with an icon/label); motion (§7) and sound (§8) principles **approved** as written. Nothing outstanding — ready for the implementation plan.
