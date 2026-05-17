import { handTotal, isNaturalBlackjack } from './hand';
import type {
  BlackjackRoundDetails,
  Card,
  Hand,
  HandResult,
  InsuranceState,
  Outcome,
} from './types';

/** Compute the outcome and payout for a single player hand vs the dealer's final hand. */
export function settlePlayerHand(hand: Hand, dealerCards: readonly Card[]): HandResult {
  const playerTotal = handTotal(hand.cards).value;
  const dealerTotal = handTotal(dealerCards).value;
  const dealerBust = dealerTotal > 21;
  const playerBust = playerTotal > 21;
  const dealerHasBJ = dealerCards.length === 2 && dealerTotal === 21;
  const playerHasBJ = isNaturalBlackjack(hand);

  let outcome: Outcome;
  let payout: number;

  if (playerBust) {
    outcome = 'player-bust';
    payout = 0;
  } else if (dealerBust) {
    outcome = 'player-win';
    payout = hand.betAmount * 2;
  } else if (playerHasBJ && !dealerHasBJ) {
    outcome = 'player-blackjack';
    // 3:2 payout with bet rounded UP to nearest even (ADR-0025).
    const winnings = Math.ceil(hand.betAmount / 2) * 3;
    payout = hand.betAmount + winnings;
  } else if (dealerHasBJ && !playerHasBJ) {
    outcome = 'player-loss';
    payout = 0;
  } else if (playerTotal > dealerTotal) {
    outcome = 'player-win';
    payout = hand.betAmount * 2;
  } else if (playerTotal === dealerTotal) {
    outcome = 'push';
    payout = hand.betAmount;
  } else {
    outcome = 'player-loss';
    payout = 0;
  }

  return { handIdx: 0, outcome, playerTotal, dealerTotal, payout };
}

/** Aggregate per-hand results + insurance into the round-level summary the wallet expects. */
export function buildRoundDetails(input: {
  dealerCards: readonly Card[];
  hands: readonly Hand[];
  insurance: InsuranceState;
  betHandleIds: readonly string[];
  config: BlackjackRoundDetails['config'];
}): {
  totalBet: number;
  totalPayout: number;
  primaryOutcome: 'win' | 'loss' | 'push';
  details: BlackjackRoundDetails;
} {
  const handResults = input.hands.map((h, i) => ({
    ...settlePlayerHand(h, input.dealerCards),
    handIdx: i,
  }));

  const handsTotalBet = input.hands.reduce((acc, h) => acc + h.betAmount, 0);
  const handsTotalPayout = handResults.reduce((acc, r) => acc + r.payout, 0);
  const totalBet = handsTotalBet + input.insurance.bet;
  const totalPayout = handsTotalPayout + input.insurance.payout;

  const net = totalPayout - totalBet;
  const primaryOutcome: 'win' | 'loss' | 'push' = net > 0 ? 'win' : net < 0 ? 'loss' : 'push';

  const details: BlackjackRoundDetails = {
    dealerCards: input.dealerCards,
    hands: input.hands.map((h, i) => ({
      cards: h.cards,
      bet: h.betAmount,
      doubled: h.doubled,
      fromSplit: h.fromSplit,
      fromSplitAces: h.fromSplitAces,
      outcome: handResults[i]!.outcome,
      payout: handResults[i]!.payout,
    })),
    insurance: input.insurance,
    betHandleIds: input.betHandleIds,
    config: input.config,
  };

  return { totalBet, totalPayout, primaryOutcome, details };
}

/** Compute the insurance outcome and payout given dealer's final cards and bet amount.
 *  Insurance pays 2:1 (i.e. gross return 3x the insurance bet) if dealer has natural BJ. */
export function settleInsurance(args: {
  taken: boolean;
  bet: number;
  dealerCards: readonly Card[];
}): InsuranceState {
  if (!args.taken) return { status: 'not-offered', bet: 0, payout: 0 };
  const dealerTotal = handTotal(args.dealerCards).value;
  const dealerHasBJ = args.dealerCards.length === 2 && dealerTotal === 21;
  if (dealerHasBJ) {
    return { status: 'won', bet: args.bet, payout: args.bet * 3 };
  }
  return { status: 'lost', bet: args.bet, payout: 0 };
}
