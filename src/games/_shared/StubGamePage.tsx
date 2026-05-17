import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';

const GAME_META = {
  blackjack: { name: 'Blackjack', icon: '🃏', tagline: 'Beat the dealer to 21.' },
  roulette: { name: 'Roulette', icon: '🎡', tagline: 'Call the wheel.' },
  slots: { name: 'Slots', icon: '🎰', tagline: 'Spin the reels.' },
  baccarat: { name: 'Baccarat', icon: '🎴', tagline: 'Player, Banker, or Tie.' },
} as const;

interface Props {
  game: keyof typeof GAME_META;
  phase: 3 | 4 | 5 | 6;
}

export default function StubGamePage({ game, phase }: Props): JSX.Element {
  const meta = GAME_META[game];
  return (
    <main className="mx-auto grid min-h-full max-w-2xl place-items-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 text-6xl">{meta.icon}</div>
        <h1 className="mb-2 font-display text-3xl tracking-wider text-gold">
          {meta.name.toUpperCase()}
        </h1>
        <p className="mb-6 text-white/70">{meta.tagline}</p>
        <div className="mb-6 inline-block rounded-full border border-gold/40 bg-felt-deep px-5 py-2 font-mono text-sm text-gold">
          Coming in Phase {phase}
        </div>
        <div className="space-x-4">
          <Link to="/lobby" className="text-gold underline">
            Back to lobby
          </Link>
          <Link to="/play/coin-flip" className="text-neon-cyan underline">
            Try Coin Flip
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
