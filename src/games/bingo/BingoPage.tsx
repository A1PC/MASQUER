import type { JSX } from 'react';
import { useState } from 'react';
import { useMachine } from '@xstate/react';
import { useCurrentUser } from '@/store/sessionStore';
import { useBalance } from '@/store/walletStore';
import { useGameRound } from '@/games/_shared/useGameRound';
import { bingoMachine } from './machine';
import { BINGO_CONFIG, type BingoSpeed } from './logic';
import SetupPanel from './SetupPanel';

export default function BingoPage(): JSX.Element | null {
  const user = useCurrentUser();
  const balance = useBalance() ?? 0;
  const { placeBet } = useGameRound('bingo');
  const [snapshot, send] = useMachine(bingoMachine);
  // Local "in-flight setup" state so the user can tweak picks before committing.
  const [pendingCardCount, setPendingCardCount] = useState(1);
  const [pendingSpeed, setPendingSpeed] = useState<BingoSpeed>('normal');

  if (!user) return null;

  async function handleBuyAndStart(): Promise<void> {
    if (!user) return;
    const cost = pendingCardCount * BINGO_CONFIG.CARD_COST;
    const result = await placeBet(cost, {
      min: BINGO_CONFIG.CARD_COST,
      max: BINGO_CONFIG.CARD_COST * BINGO_CONFIG.MAX_CARDS_PER_GAME,
    });
    if (!result.ok) return;
    send({ type: 'BUY_AND_START', cardCount: pendingCardCount, speed: pendingSpeed });
    send({ type: 'BET_PLACED', betHandleId: result.handle.betId });
  }

  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">🎯 BINGO</h1>
          <span className="font-display text-xs text-white/60">
            Balance:{' '}
            <span className="text-gold-bright tabular-nums">{balance.toLocaleString()}</span>
          </span>
        </header>

        {snapshot.matches('setup') && (
          <SetupPanel
            cardCount={pendingCardCount}
            speed={pendingSpeed}
            balance={balance}
            onCardCountChange={setPendingCardCount}
            onSpeedChange={setPendingSpeed}
            onBuyAndStart={() => void handleBuyAndStart()}
          />
        )}

        {snapshot.matches('awaiting_bet_handle') && (
          <p className="text-center text-xs text-white/60">Placing bet…</p>
        )}

        {snapshot.matches('playing') && (
          <div
            className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
            data-play-placeholder
          >
            Play screen — cards + calls land in PR C.
          </div>
        )}
      </main>
    </div>
  );
}
