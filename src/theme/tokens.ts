export const tokens = {
  color: {
    bg: { base: '#06120c', felt: '#0b1f17' },
    primary: { red: '#a3122a', redDeep: '#6e0a1d' },
    accent: { gold: '#d4af37', goldBright: '#f0c64a' },
    highlight: { cyan: '#3df0ff', magenta: '#ff5cf2' },
    outcome: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
    roulette: {
      wood: '#6b4423',
      woodLight: '#8b5a3c',
      woodDark: '#4a2d18',
      pocket: '#1a1a1a',
      pocketRed: '#a3122a',
      pocketGreen: '#3dd17a',
      silver: '#c0c0c0',
      silverLight: '#f4f4f4',
      silverDark: '#707070',
      pearl: '#fff5e8',
      pearlCream: '#f0e0c8',
      feltTable: '#0a3a22',
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
