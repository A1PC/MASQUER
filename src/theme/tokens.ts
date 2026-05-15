export const tokens = {
  color: {
    bg: { base: '#06120c', felt: '#0b1f17' },
    primary: { red: '#a3122a', redDeep: '#6e0a1d' },
    accent: { gold: '#d4af37', goldBright: '#f0c64a' },
    highlight: { cyan: '#3df0ff', magenta: '#ff5cf2' },
    outcome: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
  },
} as const;

export type ThemeTokens = typeof tokens;
