import type { JSX } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { dateStringFor } from '@/systems/lottery';
import { NAV_ICON } from '@/components/nav/gameIcons';
import { useEffectiveReducedMotion } from '@/motion/useEffectiveReducedMotion';
import { staggerContainer, staggerItem } from '@/motion/variants';
import BingoVariantModal from '@/games/bingo/BingoVariantModal';
import PokerVariantModal from '@/games/poker/_shared/PokerVariantModal';
import GameCabinet from './GameCabinet';

type GameKey = 'coin-flip' | 'blackjack' | 'roulette' | 'slots' | 'baccarat' | 'plinko' | 'craps';

interface RouteGame {
  key: GameKey;
  to: string;
  label: string;
}

/** Games that launch straight into their table. Poker, bingo (variant modals)
 *  and lottery (live status) are rendered separately below. */
const ROUTE_GAMES: RouteGame[] = [
  { key: 'coin-flip', to: '/play/coin-flip', label: 'Coin Flip' },
  { key: 'blackjack', to: '/play/blackjack', label: 'Blackjack' },
  { key: 'roulette', to: '/play/roulette', label: 'Roulette' },
  { key: 'slots', to: '/play/slots', label: 'Slots' },
  { key: 'baccarat', to: '/play/baccarat', label: 'Baccarat' },
  { key: 'plinko', to: '/play/plinko', label: 'Plinko' },
  { key: 'craps', to: '/play/craps', label: 'Craps' },
];

interface Props {
  userId: string;
}

/** Reactive lottery status line — ticket/line counts for today, or a prompt. */
function useLotteryStatus(userId: string): string {
  // `Date.now()` is impure in render; snapshot today's draw id once on mount.
  const [today] = useState(() => dateStringFor(Date.now()));
  const tickets = useLiveQuery(
    () => db.lotteryTickets.where('[userId+drawId]').equals([userId, today]).toArray(),
    [userId, today],
    [],
  );
  const lines = useLiveQuery(
    () => db.lotteryLines.where('[userId+drawId]').equals([userId, today]).toArray(),
    [userId, today],
    [],
  );
  const n = tickets.length;
  const l = lines.length;
  if (n === 0) return 'Buy a ticket';
  return `${n} ${n === 1 ? 'ticket' : 'tickets'} · ${l} ${l === 1 ? 'line' : 'lines'}`;
}

/** Even, scannable grid of game cabinets — one tile per game, every game equal
 *  weight (Option A). Tiles reveal with a reduced-motion-aware stagger. */
export default function GameGrid({ userId }: Props): JSX.Element {
  const [bingoOpen, setBingoOpen] = useState(false);
  const [pokerOpen, setPokerOpen] = useState(false);
  const reduce = useEffectiveReducedMotion();
  const lotteryStatus = useLotteryStatus(userId);

  // Per-item motion props — omit `variants` entirely when reduced (rather than
  // passing `undefined`, which exactOptionalPropertyTypes rejects).
  const itemProps = reduce ? {} : { variants: staggerItem };

  return (
    <>
      <motion.ul
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
        variants={staggerContainer}
        initial={reduce ? false : 'hidden'}
        animate="visible"
        aria-label="Games"
      >
        {ROUTE_GAMES.map((g) => (
          <motion.li key={g.key} {...itemProps}>
            <GameCabinet to={g.to} iconName={NAV_ICON[g.key]} label={g.label} status="Play now" />
          </motion.li>
        ))}
        <motion.li {...itemProps}>
          <GameCabinet
            onClick={() => setPokerOpen(true)}
            iconName={NAV_ICON.poker}
            label="Poker"
            status="Play now"
          />
        </motion.li>
        <motion.li {...itemProps}>
          <GameCabinet
            onClick={() => setBingoOpen(true)}
            iconName={NAV_ICON.bingo}
            label="Bingo"
            status="Play now"
          />
        </motion.li>
        <motion.li {...itemProps}>
          <GameCabinet
            to="/lottery"
            iconName={NAV_ICON.lottery}
            label="Lottery"
            status={lotteryStatus}
          />
        </motion.li>
      </motion.ul>
      <BingoVariantModal open={bingoOpen} onClose={() => setBingoOpen(false)} />
      <PokerVariantModal open={pokerOpen} onClose={() => setPokerOpen(false)} />
    </>
  );
}
