import type { Bets, Card, Hand, HandTotal, Payouts, Rank, RoundResult, Winner } from './types';
import { BIG_PAYOUT_RATE, COMMISSION_RATE, DRAGON_PAYOUT, SMALL_PAYOUT_RATE } from './config';

const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 0,
  J: 0,
  Q: 0,
  K: 0,
};

/** Baccarat card value: A=1, 2-9 face, 10/J/Q/K = 0. */
export function cardValue(card: Card): number {
  return RANK_VALUE[card.rank];
}

/** Hand total = ones digit of sum of card values. Always 0-9. */
export function handTotal(cards: readonly Card[]): HandTotal {
  const sum = cards.reduce((s, c) => s + cardValue(c), 0);
  return (sum % 10) as HandTotal;
}

/** Build a Hand from cards (computes total). */
export function makeHand(cards: readonly Card[]): Hand {
  return { cards, total: handTotal(cards) };
}

/** Are the first two cards of `cards` the same RANK? (10 and J do NOT pair.) */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length >= 2 && cards[0]!.rank === cards[1]!.rank;
}

/** Spec §4.3: Player draws a third card iff two-card total is 0..5. */
export function playerDrawsThird(playerTotal: HandTotal): boolean {
  if (playerTotal === 8 || playerTotal === 9) {
    throw new Error('playerDrawsThird: natural pre-empted; caller bug');
  }
  return playerTotal <= 5;
}

/**
 * Spec §4.3: Banker draws iff their two-card total + player's third-card
 * outcome match the canonical tableau.
 *
 * `playerThirdValue` is the Baccarat value (0-9) of Player's third card, or
 * `null` if Player did not draw (stood on 6/7).
 *
 * Naturals are pre-empted upstream; this function throws if banker total is 8/9.
 */
export function bankerDrawsThird(bankerTotal: HandTotal, playerThirdValue: number | null): boolean {
  if (bankerTotal === 8 || bankerTotal === 9) {
    throw new Error('bankerDrawsThird: natural pre-empted; caller bug');
  }

  // Player stood on 6/7 → Banker uses the simpler two-card-total rule.
  if (playerThirdValue === null) {
    return bankerTotal <= 5;
  }

  // Player drew. Validate input is in 0-9.
  if (!Number.isInteger(playerThirdValue) || playerThirdValue < 0 || playerThirdValue > 9) {
    throw new Error(`bankerDrawsThird: invalid playerThirdValue ${playerThirdValue}`);
  }

  // Canonical Baccarat tableau — spec §4.3.
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdValue !== 8;
    case 4:
      return playerThirdValue >= 2 && playerThirdValue <= 7;
    case 5:
      return playerThirdValue >= 4 && playerThirdValue <= 7;
    case 6:
      return playerThirdValue === 6 || playerThirdValue === 7;
    case 7:
      return false;
    default:
      throw new Error(`bankerDrawsThird: impossible bankerTotal ${String(bankerTotal)}`);
  }
}

// ----- resolveRound + computePayouts -----

/** Compute the full RoundResult from the two completed hands. */
export function resolveRound(
  playerCards: readonly Card[],
  bankerCards: readonly Card[],
): RoundResult {
  const player = makeHand(playerCards);
  const banker = makeHand(bankerCards);
  const winner: Winner =
    player.total > banker.total ? 'player' : banker.total > player.total ? 'banker' : 'tie';
  const margin = Math.abs(player.total - banker.total);
  const playerNatural = player.cards.length === 2 && (player.total === 8 || player.total === 9);
  const bankerNatural = banker.cards.length === 2 && (banker.total === 8 || banker.total === 9);
  const winnerNatural =
    (winner === 'player' && playerNatural) || (winner === 'banker' && bankerNatural);
  const bothNatural = playerNatural && bankerNatural;
  return {
    player,
    banker,
    winner,
    margin,
    winnerNatural,
    bothNatural,
    playerPair: isPair(playerCards),
    bankerPair: isPair(bankerCards),
    totalCards: playerCards.length + bankerCards.length,
  };
}

/**
 * Per-zone chip change after the round. Positive = winnings; negative = stake
 * lost; zero = push (or no bet on that zone). Caller adds these together to
 * get the net round outcome; wallet.settleRound writes the actual rows.
 */
export function computePayouts(bets: Bets, result: RoundResult): Payouts {
  return {
    player: payPlayerBanker('player', bets.player, result),
    banker: payPlayerBanker('banker', bets.banker, result),
    tie: payTie(bets.tie, result),
    playerPair: payPair(bets.playerPair, result.playerPair),
    bankerPair: payPair(bets.bankerPair, result.bankerPair),
    big: payBig(bets.big, result),
    small: paySmall(bets.small, result),
    playerDragon: payDragon('player', bets.playerDragon, result),
    bankerDragon: payDragon('banker', bets.bankerDragon, result),
  };
}

function payPlayerBanker(side: 'player' | 'banker', bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.winner === 'tie') return 0; // push
  if (result.winner !== side) return -bet;
  // Win.
  if (side === 'banker') {
    const commission = Math.floor(bet * COMMISSION_RATE);
    return bet - commission;
  }
  return bet; // Player 1:1 winnings
}

function payTie(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.winner !== 'tie') return -bet;
  return bet * 8;
}

function payPair(bet: number, pairFired: boolean): number {
  if (bet === 0) return 0;
  return pairFired ? bet * 11 : -bet;
}

function payBig(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.totalCards === 5 || result.totalCards === 6) {
    return Math.floor(bet * BIG_PAYOUT_RATE);
  }
  return -bet;
}

function paySmall(bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.totalCards === 4) {
    return Math.floor(bet * SMALL_PAYOUT_RATE);
  }
  return -bet;
}

function payDragon(side: 'player' | 'banker', bet: number, result: RoundResult): number {
  if (bet === 0) return 0;
  if (result.bothNatural && result.winner === 'tie') return 0;
  if (result.winner === 'tie') return -bet;
  if (result.winner !== side) return -bet;
  if (result.winnerNatural) {
    return bet * DRAGON_PAYOUT.natural;
  }
  switch (result.margin) {
    case 4:
      return bet * DRAGON_PAYOUT[4];
    case 5:
      return bet * DRAGON_PAYOUT[5];
    case 6:
      return bet * DRAGON_PAYOUT[6];
    case 7:
      return bet * DRAGON_PAYOUT[7];
    case 8:
      return bet * DRAGON_PAYOUT[8];
    case 9:
      return bet * DRAGON_PAYOUT[9];
    default:
      return -bet;
  }
}
