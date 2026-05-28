import type { Config } from 'tailwindcss';
import { colors as t, fonts, shadow } from './src/theme/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── existing keys (KEEP — used by current screens until their rebuilds) ──
        felt: { DEFAULT: '#0b1f17', deep: '#06120c' },
        casino: { red: '#a3122a', 'red-deep': '#6e0a1d' },
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
        // ── MASQUER Velvet Deco brand keys (NEW) ──
        gold: { DEFAULT: t.gold, deep: t['gold-deep'], bright: '#f0c64a' },
        base: t['bg-base'],
        surface: t['bg-surface'],
        'felt-table': t['felt-table'],
        'felt-table-deep': t['felt-table-deep'],
        velvet: { DEFAULT: t.velvet, deep: t['velvet-deep'] },
        brass: t.brass,
        ivory: t.ivory,
        porcelain: t.porcelain,
        jewel: {
          ruby: t['jewel-ruby'],
          emerald: t['jewel-emerald'],
          sapphire: t['jewel-sapphire'],
          magenta: t['jewel-magenta'],
        },
        scoreboard: {
          banker: t['scoreboard-banker'],
          player: t['scoreboard-player'],
          tie: t['scoreboard-tie'],
        },
        state: { win: t.win, loss: t.loss, push: t.push },
        'velvet-ink': t['velvet-ink'],
      },
      fontFamily: {
        display: [...fonts.display],
        heading: [...fonts.heading],
        body: [...fonts.body],
        numeral: [...fonts.numeral],
        mono: [...fonts.mono],
      },
      // ── overlay enter/exit motion (NEW — used by Modal/Drawer/Toast) ──
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeOut: { from: { opacity: '1' }, to: { opacity: '0' } },
        scaleIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateX(calc(100% + 1rem))' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        toastOut: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(calc(100% + 1rem))' },
        },
        // Slots win-celebration FX (Phase 15 #15 G4 — promoted from a
        // per-mount `<style dangerouslySetInnerHTML>` block in SlotsPage so
        // the keyframes register exactly once at build time instead of on
        // every page mount. ADR-0033 still owns the visual tier mapping.
        slotsJackpotTint: {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slotsMediumBurst: {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '40%': { opacity: '1', transform: 'scale(1.1)' },
          '100%': { opacity: '0', transform: 'scale(1.3)' },
        },
        slotsCoinFall: {
          '0%': { transform: 'translateY(-30px)', opacity: '0' },
          '20%': { opacity: '1' },
          '100%': { transform: 'translateY(320px)', opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 150ms ease-out',
        fadeOut: 'fadeOut 120ms ease-in',
        scaleIn: 'scaleIn 180ms ease-out',
        scaleOut: 'scaleOut 130ms ease-in',
        slideInRight: 'slideInRight 220ms ease-out',
        slideOutRight: 'slideOutRight 160ms ease-in',
        toastIn: 'toastIn 200ms ease-out',
        toastOut: 'toastOut 140ms ease-in',
        // Slots celebrations. `slotsCoinFall` is per-particle so the page
        // applies a per-instance delay via inline `animationDelay`; the
        // animation utility supplies the duration + easing + fill-mode.
        slotsJackpotTint: 'slotsJackpotTint 1500ms ease-out',
        slotsMediumBurst: 'slotsMediumBurst 800ms ease-out',
        slotsCoinFall: 'slotsCoinFall 1500ms ease-out forwards',
      },
      boxShadow: {
        // existing neon/gold/roulette shadows kept for current screens
        'neon-cyan': '0 0 12px rgba(61,240,255,0.6)',
        'neon-magenta': '0 0 12px rgba(255,92,242,0.6)',
        'gold-glow': shadow['gold-glow'],
        'velvet-panel': shadow['velvet-panel'],
        'deco-frame': shadow['deco-frame'],
        'brass-glow': shadow['brass-glow'],
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
