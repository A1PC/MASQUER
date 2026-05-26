import type { JSX } from 'react';
import type { Payouts, RoundResult } from './types';

type Tier = 'none' | 'small' | 'medium' | 'jackpot';

interface Props {
  result: RoundResult | null;
  payouts: Payouts | null;
  reducedMotion: boolean;
}

/**
 * Map a settled round + payouts to a celebration tier per spec §10.
 * Tier resolution: highest tier across all winning bets.
 */
function tierFor(result: RoundResult, payouts: Payouts): Tier {
  let highest: Tier = 'none';
  for (const [zone, change] of Object.entries(payouts) as [keyof Payouts, number][]) {
    if (change <= 0) continue;
    const t = zoneTier(zone, result);
    if (rank(t) > rank(highest)) highest = t;
  }
  return highest;
}

function zoneTier(zone: keyof Payouts, result: RoundResult): Tier {
  if (zone === 'playerDragon' || zone === 'bankerDragon') {
    // Margin-9 win pays 30:1 → jackpot. Otherwise medium.
    if (result.margin === 9 && !result.winnerNatural) return 'jackpot';
    return 'medium';
  }
  if (zone === 'tie') return 'medium';
  if (zone === 'playerPair' || zone === 'bankerPair') return 'medium';
  if (zone === 'player' || zone === 'banker') {
    // Natural-9 win bumps to medium per spec.
    if (result.winnerNatural) {
      const winnerTotal = result.winner === 'player' ? result.player.total : result.banker.total;
      if (winnerTotal === 9) return 'medium';
    }
    return 'small';
  }
  if (zone === 'big' || zone === 'small') return 'small';
  return 'none';
}

const RANK: Record<Tier, number> = { none: 0, small: 1, medium: 2, jackpot: 3 };
function rank(t: Tier): number {
  return RANK[t];
}

/**
 * Per-tier celebration overlay. The visual palette references brand
 * tokens via inline CSS variables so the gradient fills can use the
 * MASQUER colours (jewel-magenta for jackpot, gold for medium) without
 * Tailwind's `theme()` macro inside an animation keyframe rule.
 */
export default function WinCelebration({
  result,
  payouts,
  reducedMotion,
}: Props): JSX.Element | null {
  if (!result || !payouts) return null;
  const tier = tierFor(result, payouts);
  if (tier === 'none') return null;

  const verdictText =
    result.winner === 'tie' ? 'TIE' : result.winner === 'player' ? 'PLAYER WINS' : 'BANKER WINS';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      data-baccarat-celebration={tier}
      style={
        {
          // Inline CSS vars so the keyframe gradient fills can reference
          // brand tokens (token mirrors live in tokens.ts).
          '--brand-jewel-magenta': '#ff5cf2',
          '--brand-gold': '#e6c068',
          '--brand-gold-bright': '#f0c64a',
          '--brand-velvet': '#5a1320',
          '--brand-felt-table-deep': '#0e2e21',
          '--brand-ivory': '#f2e7cc',
        } as React.CSSProperties
      }
    >
      {tier === 'jackpot' && !reducedMotion && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--brand-jewel-magenta) 18%, transparent) 0%, transparent 70%)',
              animation: 'baccaratJackpot 1500ms ease-out',
            }}
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute"
              style={{
                top: 0,
                left: `${(i * 100) / 12 + ((i * 7) % 5)}%`,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 30% 30%, var(--brand-gold-bright), var(--brand-gold))',
                boxShadow: '0 0 4px color-mix(in srgb, var(--brand-gold) 80%, transparent)',
                animation: `baccaratCoinFall 1500ms ease-out ${i * 80}ms forwards`,
                opacity: 0,
              }}
            />
          ))}
        </>
      )}
      {tier === 'medium' && !reducedMotion && (
        <div
          aria-hidden
          className="absolute"
          style={{
            width: 360,
            height: 100,
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-gold-bright) 50%, transparent) 0%, transparent 70%)',
            animation: 'baccaratMediumBurst 800ms ease-out',
          }}
        />
      )}
      <div
        className={[
          'rounded-md border px-5 py-2 font-display text-sm uppercase tracking-[0.22em]',
          tier === 'jackpot' ? 'shadow-[0_0_24px_rgba(255,92,242,0.45)]' : 'shadow-gold-glow',
        ].join(' ')}
        style={{
          borderColor: tier === 'jackpot' ? 'var(--brand-jewel-magenta)' : 'var(--brand-gold)',
          background: 'var(--brand-felt-table-deep)',
          color: tier === 'jackpot' ? 'var(--brand-jewel-magenta)' : 'var(--brand-gold-bright)',
          marginTop: -180,
        }}
      >
        {tier === 'jackpot' ? `JACKPOT — ${verdictText}` : verdictText}
      </div>
    </div>
  );
}
