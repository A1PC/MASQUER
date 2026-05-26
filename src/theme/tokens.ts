/** MASQUER — Velvet Deco design tokens (source of truth; tailwind.config imports these). */

export const colors = {
  'bg-base': '#07100b',
  'bg-surface': '#0c1711',
  'felt-table': '#123a2a',
  'felt-table-deep': '#0e2e21',
  velvet: '#5a1320',
  'velvet-deep': '#3d0d16',
  brass: '#c79a4b',
  gold: '#e6c068',
  'gold-deep': '#b8893a',
  ivory: '#f2e7cc',
  porcelain: '#ffffff',
  'jewel-ruby': '#7a1422',
  'jewel-emerald': '#1f6b4a',
  'jewel-sapphire': '#1e3a8a',
  /**
   * Magenta neon for the Slots jackpot signature (3× Seven). ADR-0033 locks
   * this as the per-tier visual cue. Phase 15 #7 promotes the existing
   * `#ff5cf2` from inline hex to a brand token so Slots' celebration overlay
   * + the Seven SVG tube can reference it via class / CSS var.
   */
  'jewel-magenta': '#ff5cf2',
  /**
   * Scoreboard semantic colours (baccarat bead-plate / big-road / recent
   * results badges). Banker traditionally red, Player traditionally blue,
   * Tie green. Phase 15 #8 promotes these from raw hex (`#a3122a`,
   * `#5b6ed1`, `#3dd17a`) to brand tokens so the brand can swap them
   * later without touching components. Banker reuses the velvet family
   * (deep oxblood); Player aligns with `jewel-sapphire`; Tie aligns with
   * `jewel-emerald` lifted slightly for ivory-on-felt contrast.
   */
  'scoreboard-banker': '#a3122a',
  'scoreboard-player': '#1e3a8a',
  'scoreboard-tie': '#3dd17a',
  win: '#e6c068',
  loss: '#7a1f2b',
  push: '#8a7a55',
} as const;

export const fonts = {
  display: ['"Cinzel Decorative"', '"Cinzel"', 'serif'],
  heading: ['"Cinzel"', 'serif'],
  body: ['"Montserrat"', 'system-ui', 'sans-serif'],
  numeral: ['"Poiret One"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
} as const;

export const radius = { sm: '8px', md: '12px', lg: '16px' } as const;

export const shadow = {
  'gold-glow': '0 0 18px rgba(230,192,104,0.45)',
  'velvet-panel': 'inset 0 0 24px rgba(0,0,0,0.4)',
  'deco-frame': '0 0 0 1px rgba(199,154,75,0.4), inset 0 0 0 4px rgba(7,16,11,0.6)',
} as const;

export type BrandColors = typeof colors;
