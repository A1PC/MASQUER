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
    >
      {tier === 'jackpot' && !reducedMotion && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,92,242,0.18) 0%, transparent 70%)',
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
                background: 'radial-gradient(circle at 30% 30%, #ffd23f, #d4af37)',
                boxShadow: '0 0 4px rgba(212,175,55,0.8)',
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
              'radial-gradient(ellipse at center, rgba(255,224,102,0.5) 0%, transparent 70%)',
            animation: 'baccaratMediumBurst 800ms ease-out',
          }}
        />
      )}
      <div
        className="rounded-md border px-5 py-2 font-display text-sm tracking-wider"
        style={{
          borderColor: tier === 'jackpot' ? '#ff5cf2' : '#d4af37',
          background: '#06120c',
          color: tier === 'jackpot' ? '#ff5cf2' : '#ffe066',
          marginTop: -180,
        }}
      >
        {tier === 'jackpot' ? `JACKPOT — ${verdictText}` : verdictText}
      </div>
    </div>
  );
}
