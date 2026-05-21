import type { Card } from '../types';
import { evaluateFrom } from '../handEvaluator';
import { ARCHETYPES } from './archetypes';
import type { DecisionContext, Decision } from './decide';

/** 4-card Omaha preflop strength, 0-1.
 *  Rewards high pairs, double-suited (two suits each appearing twice),
 *  connectedness (small rank gaps among the 4), and high cards. Penalises
 *  danglers (an isolated low card) and trips/quads in hand (dead cards —
 *  you can only ever use 2 hole cards). */
export function omahaPreflopStrength(holeCards: Card[]): number {
  const ranks = holeCards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = holeCards.map((c) => c.suit);

  // high-card component (0-1): average of the four ranks scaled from [2..14]
  const avgRank = ranks.reduce((s, r) => s + r, 0) / ranks.length;
  let score = (avgRank - 2) / 12 / 2; // up to 0.5 from card height

  // rank-multiplicity
  const counts = new Map<number, number>();
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
  const mult = [...counts.values()].sort((a, b) => b - a);
  const topMult = mult[0] ?? 0;
  if (topMult === 2) score += 0.12 + ((ranks.find((r) => counts.get(r) === 2)! - 2) / 12) * 0.1; // a pair (higher = better)
  if (topMult === 2 && (mult[1] ?? 0) === 2) score += 0.06; // double-paired
  if (topMult >= 3) score -= 0.18; // trips/quads in hand = dead cards

  // double-suited: two suits each appearing exactly twice
  const suitCounts = new Map<string, number>();
  suits.forEach((s) => suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1));
  const suitMult = [...suitCounts.values()].sort((a, b) => b - a);
  const topSuitMult = suitMult[0] ?? 0;
  if (topSuitMult === 2 && (suitMult[1] ?? 0) === 2)
    score += 0.12; // double-suited
  else if (topSuitMult === 2)
    score += 0.05; // single-suited
  else if (topSuitMult >= 3) score -= 0.05; // 3+ of one suit = a suit blocker

  // connectedness: reward small gaps among distinct ranks
  const distinct = [...new Set(ranks)].sort((a, b) => a - b);
  let connectBonus = 0;
  for (let i = 1; i < distinct.length; i += 1) {
    const gap = distinct[i]! - distinct[i - 1]!;
    if (gap === 1) connectBonus += 0.05;
    else if (gap === 2) connectBonus += 0.02;
  }
  score += Math.min(0.15, connectBonus);

  // dangler penalty: a lowest card far from the rest
  if (distinct.length >= 2 && distinct[1]! - distinct[0]! >= 5) score -= 0.06;

  return Math.max(0, Math.min(1, score));
}

/** Omaha postflop strength, 0-1: best legal hand under the exactly-2+3 rule. */
export function omahaPostflopStrength(holeCards: Card[], board: Card[]): number {
  const hr = evaluateFrom(holeCards, board, 'omaha');
  return Math.min(1, 0.12 + (hr.categoryValue / 8) * 0.88);
}

/** Decide an Omaha betting action. Reuses the archetype profile + pot-odds gate +
 *  raise-sizing structure from `decide`, but with Omaha strength. Never returns an
 *  illegal action. */
export function decideOmaha(ctx: DecisionContext): Decision {
  const profile = ARCHETYPES[ctx.archetype];
  const strength =
    ctx.street === 'preflop'
      ? omahaPreflopStrength(ctx.holeCards)
      : omahaPostflopStrength(ctx.holeCards, ctx.board);

  const canCheck = ctx.toCall === 0;

  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);
    const callThreshold = potOdds * (0.6 + profile.cautiousness * 0.8);
    if (strength < callThreshold) {
      const goodSpot = ctx.position === 'late' && ctx.numActivePlayers <= 2;
      if (goodSpot && ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, strength);
      return { action: 'fold' };
    }
  }

  if (strength >= profile.vpipThreshold) {
    if (ctx.rng() < profile.aggression) return raiseOrAllIn(ctx, strength);
    return canCheck ? { action: 'check' } : { action: 'call' };
  }

  if (canCheck) {
    if (ctx.rng() < profile.bluffFactor) return raiseOrAllIn(ctx, strength);
    return { action: 'check' };
  }
  return { action: 'call' };
}

function raiseOrAllIn(ctx: DecisionContext, strength: number): Decision {
  const raiseIncrement = Math.max(ctx.minRaise, Math.round(ctx.potSize * (0.5 + strength * 0.5)));
  const total = ctx.toCall + raiseIncrement;
  if (total >= ctx.stack) return { action: 'raise', amount: ctx.stack };
  return { action: 'raise', amount: total };
}
