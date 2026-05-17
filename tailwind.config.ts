import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: '#0b1f17', deep: '#06120c' },
        casino: { red: '#a3122a', 'red-deep': '#6e0a1d' },
        gold: { DEFAULT: '#d4af37', bright: '#f0c64a' },
        neon: { cyan: '#3df0ff', magenta: '#ff5cf2' },
        chip: { win: '#3dd17a', loss: '#7a1f2b', push: '#7a7a7a' },
        roulette: {
          wood: '#6b4423',
          'wood-light': '#8b5a3c',
          'wood-dark': '#4a2d18',
          pocket: '#1a1a1a',
          'pocket-red': '#a3122a',
          'pocket-green': '#3dd17a',
          silver: '#c0c0c0',
          'silver-light': '#f4f4f4',
          'silver-dark': '#707070',
          pearl: '#fff5e8',
          'pearl-cream': '#f0e0c8',
          'felt-table': '#0a3a22',
        },
      },
      fontFamily: {
        display: ['"Bungee"', '"Anton"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(61,240,255,0.6)',
        'neon-magenta': '0 0 12px rgba(255,92,242,0.6)',
        'gold-glow': '0 0 18px rgba(212,175,55,0.55)',
        'roulette-wheel':
          '0 0 24px rgba(212,175,55,0.6), 0 0 48px rgba(212,175,55,0.35), 0 0 72px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.7)',
        'roulette-pulse-red': '0 0 16px 4px rgba(163,18,42,0.85)',
        'roulette-pulse-black': '0 0 16px 4px rgba(255,255,255,0.4)',
        'roulette-pulse-green': '0 0 16px 4px rgba(61,209,122,0.85)',
      },
    },
  },
  plugins: [],
} satisfies Config;
