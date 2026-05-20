/** Decision.amount (for 'raise') = chips this seat commits THIS action
 *  (the call portion + the raise increment), capped at stack (all-in). */

import type { Card } from '../types';
import { evaluateBest5 } from '../handEvaluator';
import { ARCHETYPES, type Archetype } from './archetypes';

export interface DecisionContext {
  holeCards: Card[];
  board: Card[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  potSize: number;
  toCall: number;
  minRaise: number;
  stack: number;
  position: 'early' | 'late' | 'blinds';
  numActivePlayers: number;
  archetype: Archetype;
  rng: () => number;
}

export type Decision =
  | { action: 'fold' }
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'raise'; amount: number };

/** Preflop hole-card strength, 0-1. Chen-formula-inspired.
 *  Pairs: 0.5 (22) … 1.0 (AA).
 *  Non-pairs: weighted hi+lo + suited/connectedness bonuses. */
export function preflopStrength(holeCards: Card[]): number {
  const [a, b] = [holeCards[0]!, holeCards[1]!];
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  const pair = a.rank === b.rank;
  const suited = a.suit === b.suit;
  const gap = hi - lo;
  if (pair) return 0.5 + ((hi - 2) / 12) * 0.5; // pairs: 0.5..1.0
  // non-pair: weighted sum of both card ranks + situational bonuses
  let score = ((hi - 2) / 12) * 0.45 + ((lo - 2) / 12) * 0.25;
  if (suited) score += 0.08;
  if (gap === 1) score += 0.06;
  else if (gap === 2) score += 0.03;
  return Math.max(0, Math.min(1, score));
}

/** Postflop made-hand strength 0-1 from category + a small draw bonus. */
export function postflopStrength(holeCards: Card[], board: Card[]): number {
  const hr = evaluateBest5([...holeCards, ...board]);
  // categoryValue 0..8 → 0..1, weighted so even high-card isn't 0
  return Math.min(1, 0.15 + (hr.categoryValue / 8) * 0.85);
}

export function decide(ctx: DecisionContext): Decision {
  const profile = ARCHETYPES[ctx.archetype];
  const strength =
    ctx.street === 'preflop'
      ? preflopStrength(ctx.holeCards)
      : postflopStrength(ctx.holeCards, ctx.board);

  const canCheck = ctx.toCall === 0;

  // pot odds gate when facing a bet
  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);
    const callThreshold = potOdds * (0.6 + profile.cautiousness * 0.8);
    if (strength < callThreshold) {
      // weak — usually fold, sometimes bluff-raise in good spots
      const goodSpot = ctx.position === 'late' && ctx.numActivePlayers <= 2;
      if (goodSpot && ctx.rng() < profile.bluffFactor) {
        return raiseOrAllIn(ctx, profile, strength);
      }
      return { action: 'fold' };
    }
  }

  // hand clears the threshold (or no bet to face)
  if (strength >= profile.vpipThreshold) {
    if (ctx.rng() < profile.aggression) {
      return raiseOrAllIn(ctx, profile, strength);
    }
    return canCheck ? { action: 'check' } : { action: 'call' };
  }

  // marginal: check if free, otherwise (already passed pot-odds) call, with rare bluff
  if (canCheck) {
    if (ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, profile, strength);
    return { action: 'check' };
  }
  return { action: 'call' };
}

function raiseOrAllIn(
  ctx: DecisionContext,
  _profile: { aggression: number },
  strength: number,
): Decision {
  const raiseIncrement = Math.max(ctx.minRaise, Math.round(ctx.potSize * (0.5 + strength * 0.5)));
  const total = ctx.toCall + raiseIncrement; // chips above current commit
  if (total >= ctx.stack) return { action: 'raise', amount: ctx.stack };
  return { action: 'raise', amount: total };
}
