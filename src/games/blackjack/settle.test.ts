import { describe, expect, it } from 'vitest';
import { buildRoundDetails, settleInsurance, settlePlayerHand } from './settle';
import type { Card, Hand, InsuranceState, Rank, Suit } from './types';

const card = (rank: Rank, suit: Suit = '♠', faceUp = true): Card => ({ rank, suit, faceUp });

function makeHand(overrides: Partial<Hand> = {}): Hand {
  return {
    cards: [],
    fromSplit: false,
    fromSplitAces: false,
    doubled: false,
    betHandleId: 'bh-x',
    betAmount: 10,
    resolved: false,
    ...overrides,
  };
}

describe('settlePlayerHand', () => {
  it('player BJ vs dealer non-BJ → 3:2 payout', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('K')], betAmount: 10 }), [
      card('5'),
      card('K'),
    ]);
    expect(r.outcome).toBe('player-blackjack');
    expect(r.payout).toBe(25); // bet 10 + winnings 15
  });

  it('player BJ on odd bet rounds UP to nearest even (bet 5 → 9 winnings → return 14)', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('Q')], betAmount: 5 }), [
      card('K'),
      card('6'),
    ]);
    expect(r.outcome).toBe('player-blackjack');
    expect(r.payout).toBe(14); // bet 5 + winnings 9
  });

  it('player BJ vs dealer BJ → push (BJ stand-off)', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('K')], betAmount: 10 }), [
      card('A'),
      card('K'),
    ]);
    expect(r.outcome).toBe('push');
    expect(r.payout).toBe(10);
  });

  it('dealer BJ vs player non-BJ → loss', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('5')], betAmount: 10 }), [
      card('A'),
      card('K'),
    ]);
    expect(r.outcome).toBe('player-loss');
    expect(r.payout).toBe(0);
  });

  it('player 20 vs dealer 18 → 1:1 win', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('Q')], betAmount: 10 }), [
      card('K'),
      card('8'),
    ]);
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('player 18 vs dealer 20 → loss', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('8')], betAmount: 10 }), [
      card('K'),
      card('Q'),
    ]);
    expect(r.outcome).toBe('player-loss');
    expect(r.payout).toBe(0);
  });

  it('player 19 vs dealer 19 → push', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('9')], betAmount: 10 }), [
      card('K'),
      card('9'),
    ]);
    expect(r.outcome).toBe('push');
    expect(r.payout).toBe(10);
  });

  it('player bust → loss (with bust outcome tag)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('K'), card('Q'), card('5')], betAmount: 10 }),
      [card('K'), card('5')],
    );
    expect(r.outcome).toBe('player-bust');
    expect(r.payout).toBe(0);
  });

  it('dealer bust → player wins regardless of total', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('5')], betAmount: 10 }), [
      card('K'),
      card('7'),
      card('5'),
    ]);
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('player+dealer both bust → player loses (player bust prioritized)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('K'), card('Q'), card('3')], betAmount: 10 }),
      [card('K'), card('Q'), card('5')],
    );
    expect(r.outcome).toBe('player-bust');
    expect(r.payout).toBe(0);
  });

  it('split-Ace 21 vs dealer 20 → wins 1:1 (NOT 3:2; fromSplit blocks BJ classification)', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('A'), card('K')], betAmount: 10, fromSplit: true }),
      [card('K'), card('Q')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(20);
  });

  it('doubled win: bet field reflects doubled amount → 2x doubled-bet payout', () => {
    const r = settlePlayerHand(
      makeHand({ cards: [card('5'), card('6'), card('K')], betAmount: 20, doubled: true }),
      [card('K'), card('7')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.payout).toBe(40);
  });

  it('non-Charlie win has fiveCardCharlie=false', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('K'), card('Q')], betAmount: 10 }), [
      card('K'),
      card('8'),
    ]);
    expect(r.outcome).toBe('player-win');
    expect(r.fiveCardCharlie).toBe(false);
    expect(r.payout).toBe(20);
  });

  it('pays 5-Card Charlie 3:2 on a 5-card win (no natural collision)', () => {
    // Player: 5+3+2+4+6 = 20 across 5 cards; dealer: K+9 = 19. Player wins.
    const r = settlePlayerHand(
      makeHand({
        cards: [card('5', '♠'), card('3', '♥'), card('2', '♦'), card('4', '♣'), card('6', '♥')],
        betAmount: 100,
      }),
      [card('K', '♠'), card('9', '♦')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.fiveCardCharlie).toBe(true);
    expect(r.payout).toBe(250); // floor(100 * 2.5) = bet + 1.5× winnings
  });

  it('floors the 5-Card Charlie payout on an odd bet (bet 5 → floor(12.5)=12)', () => {
    const r = settlePlayerHand(
      makeHand({
        cards: [card('5', '♠'), card('3', '♥'), card('2', '♦'), card('4', '♣'), card('6', '♥')],
        betAmount: 5,
      }),
      [card('K', '♠'), card('9', '♦')],
    );
    expect(r.outcome).toBe('player-win');
    expect(r.fiveCardCharlie).toBe(true);
    expect(r.payout).toBe(12);
  });

  it('5-Card Charlie bonus also triggers when dealer busts on a 5+ card hand', () => {
    const r = settlePlayerHand(
      makeHand({
        cards: [card('2', '♠'), card('3', '♥'), card('2', '♦'), card('4', '♣'), card('6', '♥')],
        betAmount: 20,
      }), // 17 over 5 cards
      [card('K', '♠'), card('Q', '♦'), card('5', '♣')], // bust 25
    );
    expect(r.outcome).toBe('player-win');
    expect(r.fiveCardCharlie).toBe(true);
    expect(r.payout).toBe(50); // floor(20 * 2.5)
  });

  it('no Charlie bonus on loss with 5 cards', () => {
    // Player 5+3+2+4+5 = 19; dealer K+Q = 20 → loss.
    const r = settlePlayerHand(
      makeHand({
        cards: [card('5', '♠'), card('3', '♥'), card('2', '♦'), card('4', '♣'), card('5', '♥')],
        betAmount: 100,
      }),
      [card('K', '♠'), card('Q', '♦')],
    );
    expect(r.outcome).toBe('player-loss');
    expect(r.fiveCardCharlie).toBe(false);
    expect(r.payout).toBe(0);
  });

  it('no Charlie bonus on a 5-card push', () => {
    // Player 5+3+2+4+6 = 20; dealer K+Q = 20 → push.
    const r = settlePlayerHand(
      makeHand({
        cards: [card('5', '♠'), card('3', '♥'), card('2', '♦'), card('4', '♣'), card('6', '♥')],
        betAmount: 80,
      }),
      [card('K', '♠'), card('Q', '♦')],
    );
    expect(r.outcome).toBe('push');
    expect(r.fiveCardCharlie).toBe(false);
    expect(r.payout).toBe(80);
  });

  it('no Charlie bonus on a 5-card bust', () => {
    const r = settlePlayerHand(
      makeHand({
        cards: [card('5', '♠'), card('5', '♥'), card('5', '♦'), card('5', '♣'), card('5', '♥')],
        betAmount: 50,
      }), // 25 bust
      [card('K', '♠'), card('Q', '♦')],
    );
    expect(r.outcome).toBe('player-bust');
    expect(r.fiveCardCharlie).toBe(false);
    expect(r.payout).toBe(0);
  });

  it('natural blackjack is 2 cards and keeps its 3:2 — Charlie does not collide', () => {
    const r = settlePlayerHand(makeHand({ cards: [card('A'), card('K')], betAmount: 10 }), [
      card('5'),
      card('K'),
    ]);
    expect(r.outcome).toBe('player-blackjack');
    expect(r.fiveCardCharlie).toBe(false);
    expect(r.payout).toBe(25);
  });
});

describe('settleInsurance', () => {
  it('not taken → not-offered, bet 0, payout 0', () => {
    expect(settleInsurance({ taken: false, bet: 0, dealerCards: [] })).toEqual({
      status: 'not-offered',
      bet: 0,
      payout: 0,
    });
  });

  it('taken, dealer BJ → won, payout = 3x bet (2:1 + bet returned)', () => {
    expect(settleInsurance({ taken: true, bet: 25, dealerCards: [card('A'), card('K')] })).toEqual({
      status: 'won',
      bet: 25,
      payout: 75,
    });
  });

  it('taken, dealer non-BJ → lost, payout 0', () => {
    expect(settleInsurance({ taken: true, bet: 25, dealerCards: [card('A'), card('5')] })).toEqual({
      status: 'lost',
      bet: 25,
      payout: 0,
    });
  });

  it('taken, dealer 21 in 3 cards (not natural) → lost', () => {
    expect(
      settleInsurance({
        taken: true,
        bet: 25,
        dealerCards: [card('A'), card('5'), card('5')],
      }),
    ).toEqual({ status: 'lost', bet: 25, payout: 0 });
  });
});

describe('buildRoundDetails', () => {
  const config = { h17: true, maxHands: 4, das: true };
  const noInsurance: InsuranceState = { status: 'not-offered', bet: 0, payout: 0 };

  it('single hand win: totalBet=bet, totalPayout=2x, primary=win', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('8')],
      hands: [makeHand({ cards: [card('K'), card('Q')], betAmount: 10 })],
      insurance: noInsurance,
      betHandleIds: ['bh1'],
      config,
    });
    expect(result.totalBet).toBe(10);
    expect(result.totalPayout).toBe(20);
    expect(result.primaryOutcome).toBe('win');
    expect(result.details.hands).toHaveLength(1);
  });

  it('two hands: one win one loss → primary = push or loss based on net', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('8')],
      hands: [
        makeHand({ cards: [card('K'), card('Q')], betAmount: 10, fromSplit: true }), // win
        makeHand({ cards: [card('K'), card('5')], betAmount: 10, fromSplit: true }), // loss
      ],
      insurance: noInsurance,
      betHandleIds: ['bh1', 'bh2'],
      config,
    });
    expect(result.totalBet).toBe(20);
    expect(result.totalPayout).toBe(20); // 20 win + 0 loss
    expect(result.primaryOutcome).toBe('push');
  });

  it('insurance won + main loss aggregates correctly', () => {
    const result = buildRoundDetails({
      dealerCards: [card('A'), card('K')],
      hands: [makeHand({ cards: [card('K'), card('5')], betAmount: 50 })],
      insurance: { status: 'won', bet: 25, payout: 75 },
      betHandleIds: ['bh1', 'ins1'],
      config,
    });
    expect(result.totalBet).toBe(75); // 50 + 25
    expect(result.totalPayout).toBe(75); // 0 main + 75 insurance
    expect(result.primaryOutcome).toBe('push');
  });

  it('records insurance state in details', () => {
    const result = buildRoundDetails({
      dealerCards: [card('A'), card('K')],
      hands: [makeHand({ cards: [card('K'), card('5')], betAmount: 50 })],
      insurance: { status: 'won', bet: 25, payout: 75 },
      betHandleIds: ['bh1', 'ins1'],
      config,
    });
    expect(result.details.insurance.status).toBe('won');
    expect(result.details.insurance.bet).toBe(25);
  });

  it('per-hand fiveCardCharlie flag is propagated into details.hands[]', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('Q')], // dealer 20
      hands: [
        makeHand({
          cards: [card('5'), card('3'), card('2'), card('4'), card('K')],
          betAmount: 100,
        }), // 5+3+2+4+10 = bust? No: 14+10=24 → actually busts. Use 5+3+2+4+6=20 over 5 cards.
        makeHand({ cards: [card('K'), card('Q')], betAmount: 100 }), // 20 → push
      ],
      insurance: noInsurance,
      betHandleIds: ['bh1', 'bh2'],
      config,
    });
    // First hand 5+3+2+4+10 = 24 → bust → no Charlie.
    expect(result.details.hands[0]!.outcome).toBe('player-bust');
    expect(result.details.hands[0]!.fiveCardCharlie).toBe(false);
    expect(result.details.hands[1]!.outcome).toBe('push');
    expect(result.details.hands[1]!.fiveCardCharlie).toBe(false);
  });

  it('5-Card Charlie payout flows through buildRoundDetails totals', () => {
    const result = buildRoundDetails({
      dealerCards: [card('K'), card('9')], // dealer 19
      hands: [
        makeHand({
          cards: [card('5'), card('3'), card('2'), card('4'), card('6')],
          betAmount: 100,
        }), // 20 over 5 cards → Charlie win
      ],
      insurance: noInsurance,
      betHandleIds: ['bh1'],
      config,
    });
    expect(result.details.hands[0]!.fiveCardCharlie).toBe(true);
    expect(result.details.hands[0]!.outcome).toBe('player-win');
    // floor(100 * 2.5) = 250.
    expect(result.totalPayout).toBe(250);
    expect(result.totalBet).toBe(100);
    expect(result.primaryOutcome).toBe('win');
  });
});
