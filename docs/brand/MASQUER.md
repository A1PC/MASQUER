# MASQUER — Brand Reference

> Living brand reference for **MASQUER**, the Velvet Deco play-money casino. Derived
> from `docs/superpowers/specs/2026-05-22-phase-15-0-brand-design-language-design.md`.
> Update this doc whenever a brand decision changes.

## Name & Tagline

- **Product name:** **MASQUER** — replaces the working title "localGamble" in all
  user-facing surfaces (the git repo and internal docs may keep `localGamble`).
- **Tagline:** _A local, offline, play-money casino._
- **Aesthetic:** **"Velvet Deco"** — old-school Vegas / Monte-Carlo content (felt,
  velvet, brass, masquerade) executed with modern web craft (art-deco geometry,
  centered scaling, smooth Framer Motion, no jank). Warm, immersive, refined. **No neon.**

## Color Palette

Dark-themed. All values are the canonical hex; components reference **semantic token
names only** (no raw hex — CLAUDE.md rule). The SVG emblem is the sole exception, being
intrinsically colour-bearing. Source of truth: `src/theme/tokens.ts`.

| Token             | Hex                     | Role                                         |
| ----------------- | ----------------------- | -------------------------------------------- |
| `bg-base`         | `#07100b`               | App background (deepest "midnight felt")     |
| `bg-surface`      | `#0c1711`               | Cards / panels base                          |
| `felt-table`      | `#123a2a`               | Game table felt                              |
| `felt-table-deep` | `#0e2e21`               | Felt shadow / inset                          |
| `velvet`          | `#5a1320`               | Oxblood velvet accent (panels, card backs)   |
| `velvet-deep`     | `#3d0d16`               | Velvet shadow                                |
| `brass`           | `#c79a4b`               | Secondary metal — hairline borders, filigree |
| `gold`            | `#e6c068`               | Primary metal — CTAs, wordmark, key strokes  |
| `gold-deep`       | `#b8893a`               | Gold gradient stop / pressed                 |
| `ivory`           | `#f2e7cc`               | Primary text on dark; card faces             |
| `porcelain`       | `#ffffff`               | Mask face, high-contrast card stock          |
| `jewel-ruby`      | `#7a1422`               | Sparing accent (mask jewel, alerts)          |
| `jewel-emerald`   | `#1f6b4a`               | Sparing accent (mask jewel)                  |
| `win`             | `#e6c068`               | Win/success (gold — winning glows gold)      |
| `loss`            | `#7a1f2b`               | Loss                                         |
| `push`            | `#8a7a55`               | Push / neutral (muted brass)                 |
| border hairline   | `rgba(230,192,104,0.4)` | Gold hairline borders                        |

**Contrast:** ivory on `bg-base` and gold on `bg-surface` both clear AA (4.5:1) for
text; verify each pairing in implementation. Functional colour (win/loss) always pairs
with an icon or label — never colour-only.

## Typography

- **Display / wordmark / hero:** `Cinzel Decorative` (700) for the logo + hero;
  `Cinzel` (600/700) for section headings.
- **Body / UI:** `Montserrat` (300/400/500/600) — geometric, art-deco-era, highly
  legible across tables, stats, and admin.
- **Hero numerals:** `Poiret One` for large display chip counts only (lobby/wallet hero).
- **Data numerals:** `Montserrat` with **tabular figures** for tables, prices, timers
  (prevents layout shift).
- **Mono (admin/code):** keep `JetBrains Mono`.
- Type scale (px): 12 · 14 · 16 · 18 · 24 · 32 · 44. Body 16px min, line-height
  1.5–1.6. `font-display: swap`; preload only the critical display + body weights.

## Spacing, Radius, Effects

- **Spacing:** 4/8 rhythm — 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** sm 8 · md 12 · lg 16 (circular for chips/coins).
- **Borders:** 1px brass/gold hairlines; signature **double-rule deco frame** (outer
  solid brass + inset thin gold) for panels/hero.
- **Effects:** faint gold **sunburst** radial behind hero elements; subtle **felt
  texture** (diagonal noise overlay) on surfaces; **velvet sheen** on accent panels;
  restrained **gold glow** (`box-shadow`) on primary CTAs and win states only.
  Elevation scale consistent across cards/sheets/modals.

## The Mask Emblem

A **Venetian Colombina half-mask** in porcelain white with gold-leaf filigree (top
crest, temple flourishes, gold eye rims/liner, nose-bridge diamond, cheek scrollwork).
It is the through-line motif of the whole product.

Ships as a reusable React SVG component `MaskMark` (`src/components/brand/MaskMark.tsx`)
with props `size` and `variant`:

- `variant="full"` — all filigree (logo, hero, large surfaces).
- `variant="simple"` — fine filigree dropped, retains silhouette + eyes + crest
  (favicon, ≤32px, chip/coin small renders).

The porcelain face uses a `#ffffff` → `#f6efde` → `#e2d4b6` gradient with
`#c79a4b` / `#e6c068` gold accents.

**Recurring usage:** app logo + wordmark lockup; coin-flip **heads** face (mask) /
**tails** face (Cinzel "M" monogram); card backs (mask on oxblood pinstripe + gold
rule); poker chips (mask centre, dashed gold edge); loaders (mask fades/tilts in,
respecting reduced-motion); empty states; favicon + PWA icons; lobby hero.

## Motion Principles

Codified in #2's shared Framer-Motion variant library; every sub-project reuses named
variants.

- Micro-interactions **150–300ms**; transitions ≤400ms. **transform/opacity only**
  (never width/height/top/left).
- **ease-out** on enter, **ease-in** on exit; exit ≈70% of enter duration. Prefer
  **spring/physics** for cards, chips, coins.
- **Staggered reveals** (30–50ms/item) for lobby tiles, stats cards, lists.
- **Directional page transitions** (forward = slide up/left; back = reverse) plus
  shared-element where natural.
- **`prefers-reduced-motion` honored everywhere** — instant or eased-down fallback,
  mandatory. Animate ≤2 key elements per view.
- Animations **interruptible**; never block input.
- **Signature moments:** card deal/flip, chip slide+stack, coin flip, the **mask
  reveal** loader, and a **tiered win celebration** (small/medium/jackpot) with a gold
  sunburst burst.

## Sound Principles

Built in #2; a single `useSound` hook is the **only** integration point (no inline
`<audio>`).

- **Taxonomy:** UI (button press, toggle), game events (deal, chip place, spin, dice
  roll, reveal, win/loss stingers tiered to the celebration), optional low **lounge
  ambience** (jazzy/vintage, toggleable).
- **Controls:** volume + mute in the **Settings page** (#2), persisted (localStorage).
  Global mute respected everywhere.
- **Policy:** never autoplay before first user interaction (browser autoplay rules);
  tasteful vintage-lounge palette, not arcade bleeps. Sound is independent of
  `prefers-reduced-motion` (separate preference).
