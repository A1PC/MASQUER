import type { JSX } from 'react';
import { useState } from 'react';
import GameShell from '@/games/_shared/GameShell';
import CoinFlipRules from './rules';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useGameRound } from '@/games/_shared/useGameRound';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { useSound } from '@/systems/sound/useSound';
import { Badge, Button } from '@/components/ui';
import BrandCoin from './BrandCoin';
import { COIN_FLIP_CONFIG, playRound, type CoinFlipDetails, type CoinSide } from './logic';
import type { BetHandle } from '@/systems/wallet';
import type { RecentResultItem } from '@/games/_shared/RecentResults';

/** MASQUER Coin Flip — rebuilt on the design system (#1 primitives), motion +
 *  sound (#2), and the locked brand coin (#0). Game logic (playRound / RNG /
 *  payouts / rounds row) is untouched: the page only orchestrates the round
 *  lifecycle, the sound stingers, and the session-local win-streak indicator. */
export default function CoinFlipPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle, resolving } = useGameRound('coin-flip');
  const rounds = useRecentRounds(user?.id, 'coin-flip', 12);
  const reduce = useEffectiveReducedMotion();
  const { play } = useSound();
  const [handle, setHandle] = useState<BetHandle | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [displayFace, setDisplayFace] = useState<CoinSide>('heads');
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [betPanelKey, setBetPanelKey] = useState(0);
  const [streak, setStreak] = useState(0);

  if (!user) return null;

  const onCommit = async (amount: number): Promise<void> => {
    setError(null);
    const result = await placeBet(amount, {
      min: COIN_FLIP_CONFIG.MIN_BET,
      max: COIN_FLIP_CONFIG.MAX_BET,
    });
    if (!result.ok) {
      setError(
        result.error === 'insufficient_chips'
          ? 'Not enough chips.'
          : result.error === 'below_minimum'
            ? `Minimum bet is ${COIN_FLIP_CONFIG.MIN_BET}.`
            : result.error === 'above_maximum'
              ? `Maximum bet is ${COIN_FLIP_CONFIG.MAX_BET}.`
              : 'Something went wrong placing the bet.',
      );
      return;
    }
    play('chip.place');
    setHandle(result.handle);
    setLastBet(amount);
  };

  const onCall = async (call: CoinSide): Promise<void> => {
    if (!handle || flipping) return;
    setFlipping(true);
    setLastNet(null);
    play('coin.flip');
    const result = playRound({ call, betAmount: handle.amount });
    // Spin animation duration matches BrandCoin's transition (1.6s for drama).
    await new Promise((r) => setTimeout(r, reduce ? 0 : 1600));
    await settle(handle, result);
    const details = result.details as CoinFlipDetails;
    setDisplayFace(details.landed);
    setLastNet(result.netChange);
    setHandle(null);
    setFlipping(false);
    setBetPanelKey((k) => k + 1);
    if (result.outcome === 'win') {
      setStreak((s) => s + 1);
      // Coin-flip is flat 1:1 — always the small-win stinger, never the
      // medium/jackpot tiers (those are reserved for multi-tier wins).
      play('win.small');
    } else {
      setStreak(0);
      play('loss');
    }
  };

  const items: RecentResultItem[] = rounds.map((r) => {
    const d = r.details as CoinFlipDetails;
    return {
      key: r.id,
      badgeText: d.landed === 'heads' ? 'H' : 'T',
      badgeColor: d.landed === 'heads' ? 'linear-gradient(135deg,#fbe6a0,#d4af37)' : '#0c1711',
      badgeTextColor: d.landed === 'heads' ? '#5b4310' : '#e6c068',
      betLabel: String(r.betAmount),
      netChips: r.netChange,
      accent: r.outcome,
    };
  });

  return (
    <GameShell
      title="MASQUER · Coin Flip"
      meta="1:1 · 1–500"
      game="coin-flip"
      recentItems={items}
      rules={<CoinFlipRules />}
      bettingPanel={
        <BettingPanel
          key={betPanelKey}
          min={COIN_FLIP_CONFIG.MIN_BET}
          max={COIN_FLIP_CONFIG.MAX_BET}
          balance={balance}
          {...(lastBet !== undefined ? { lastBet } : {})}
          locked={handle !== null || flipping || resolving}
          autoCommitRepeat
          onCommit={(amount) => void onCommit(amount)}
          callButtons={(committedAmount) => (
            <div className="flex gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => void onCall('heads')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1"
              >
                Heads
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void onCall('tails')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1"
              >
                Tails
              </Button>
            </div>
          )}
        />
      }
    >
      <div className="flex flex-col items-center gap-4 py-4">
        {streak >= 2 && (
          <Badge tone="win" icon="Flame" aria-label={`${streak} win streak`}>
            {streak} win streak
          </Badge>
        )}
        <BrandCoin side={displayFace} flipping={flipping} />
        {lastNet !== null && !flipping && (
          <Badge tone={lastNet > 0 ? 'win' : 'loss'}>
            {lastNet > 0 ? `+${lastNet} chips` : `−${Math.abs(lastNet)} chips`}
          </Badge>
        )}
        {error && (
          <p className="text-sm text-state-loss" role="alert">
            {error}
          </p>
        )}
        {lastNet === null && !flipping && !error && (
          <p className="text-sm text-ivory/70">Place a bet, then call heads or tails.</p>
        )}
      </div>
    </GameShell>
  );
}
