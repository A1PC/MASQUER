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
      },
    },
  },
  plugins: [],
} satisfies Config;
