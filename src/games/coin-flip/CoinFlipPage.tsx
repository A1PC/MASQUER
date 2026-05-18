import type { JSX } from 'react';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import GameShell from '@/games/_shared/GameShell';
import BettingPanel from '@/games/_shared/BettingPanel';
import { useGameRound } from '@/games/_shared/useGameRound';
import { useRecentRounds } from '@/systems/hooks/useRecentRounds';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { COIN_FLIP_CONFIG, playRound, type CoinFlipDetails, type CoinSide } from './logic';
import type { BetHandle } from '@/systems/wallet';
import type { RecentResultItem } from '@/games/_shared/RecentResults';

export default function CoinFlipPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet, settle, resolving } = useGameRound('coin-flip');
  const rounds = useRecentRounds(user?.id, 'coin-flip', 12);
  const reduce = useReducedMotion();
  const [handle, setHandle] = useState<BetHandle | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [displayFace, setDisplayFace] = useState<CoinSide | '?'>('?');
  const [lastNet, setLastNet] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [betPanelKey, setBetPanelKey] = useState(0);

  if (!user) return null;

  const onCommit = async (amount: number) => {
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
    setHandle(result.handle);
    setLastBet(amount);
  };

  const onCall = async (call: CoinSide) => {
    if (!handle || flipping) return;
    setFlipping(true);
    setLastNet(null);
    setDisplayFace('?');
    const result = playRound({ call, betAmount: handle.amount });
    // Spin animation duration matches Framer Motion rotation below.
    await new Promise((r) => setTimeout(r, reduce ? 0 : 1_000));
    await settle(handle, result);
    const details = result.details as CoinFlipDetails;
    setDisplayFace(details.landed);
    setLastNet(result.netChange);
    setHandle(null);
    setFlipping(false);
    // Force BettingPanel remount to clear its committed state.
    setBetPanelKey((k) => k + 1);
  };

  const items: RecentResultItem[] = rounds.map((r) => {
    const d = r.details as CoinFlipDetails;
    return {
      key: r.id,
      badgeText: d.landed === 'heads' ? 'H' : 'T',
      badgeColor: d.landed === 'heads' ? 'linear-gradient(135deg,#ffe066,#d4af37)' : '#06120c',
      badgeTextColor: d.landed === 'heads' ? '#6e0a1d' : '#d4af37',
      betLabel: String(r.betAmount),
      netChips: r.netChange,
      accent: r.outcome,
    };
  });

  return (
    <GameShell
      title="🪙 COIN FLIP"
      meta="1:1 · 1–500"
      game="coin-flip"
      recentItems={items}
      bettingPanel={
        <BettingPanel
          key={betPanelKey}
          min={COIN_FLIP_CONFIG.MIN_BET}
          max={COIN_FLIP_CONFIG.MAX_BET}
          balance={balance}
          {...(lastBet !== undefined ? { lastBet } : {})}
          locked={handle !== null || flipping || resolving}
          onCommit={(amount) => void onCommit(amount)}
          callButtons={(committedAmount) => (
            <div className="flex gap-2.5">
              <button
                onClick={() => void onCall('heads')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1 rounded-md border-2 border-gold bg-casino-red py-3.5 font-display text-base tracking-wider text-white disabled:opacity-40"
              >
                HEADS
              </button>
              <button
                onClick={() => void onCall('tails')}
                disabled={committedAmount === null || flipping || resolving}
                className="flex-1 rounded-md border-2 border-gold bg-casino-red py-3.5 font-display text-base tracking-wider text-white disabled:opacity-40"
              >
                TAILS
              </button>
            </div>
          )}
        />
      }
    >
      <motion.div
        animate={flipping ? { rotateY: [0, 360, 720, 1080] } : { rotateY: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 1, ease: 'easeOut' }}
        className="grid h-[140px] w-[140px] place-items-center rounded-full font-display text-2xl tracking-wider"
        style={{
          background: 'linear-gradient(135deg,#ffe066,#d4af37 60%,#a8801e)',
          color: '#6e0a1d',
          boxShadow:
            '0 0 28px rgba(212,175,55,0.4), inset 0 4px 12px rgba(255,255,255,0.3), inset 0 -4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {flipping ? '?' : displayFace === '?' ? '?' : displayFace.toUpperCase()}
      </motion.div>
      {lastNet !== null && !flipping && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`mt-4 rounded-full border px-5 py-1.5 font-display text-xs tracking-wider ${
            lastNet > 0
              ? 'border-chip-win bg-chip-win/15 text-chip-win'
              : 'border-chip-loss bg-chip-loss/15 text-chip-loss'
          }`}
        >
          {lastNet > 0 ? `✨ +${lastNet}` : `−${Math.abs(lastNet)}`}
        </motion.div>
      )}
      {error && <p className="mt-3 text-sm text-casino-red">{error}</p>}
      {displayFace === '?' && !flipping && lastNet === null && (
        <p className="mt-4 text-sm text-white/70">Place a bet, then call heads or tails.</p>
      )}
    </GameShell>
  );
}
