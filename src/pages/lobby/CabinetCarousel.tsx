import type { JSX } from 'react';
import { Link } from 'react-router';

interface Cabinet {
  to: string;
  icon: string;
  label: string;
  status: 'playable' | 'stub';
  phase?: number;
}

const CABINETS: Cabinet[] = [
  { to: '/play/coin-flip', icon: '🪙', label: 'COIN FLIP', status: 'playable' },
  { to: '/play/blackjack', icon: '🃏', label: 'BLACKJACK', status: 'playable' },
  { to: '/play/roulette', icon: '🎡', label: 'ROULETTE', status: 'playable' },
  { to: '/play/slots', icon: '🎰', label: 'SLOTS', status: 'playable' },
  { to: '/play/baccarat', icon: '🎴', label: 'BACCARAT', status: 'playable' },
];

export default function CabinetCarousel(): JSX.Element {
  return (
    <div className="flex gap-3.5 overflow-x-auto py-1 pb-3">
      {CABINETS.map((c) => (
        <Link
          key={c.to}
          to={c.to}
          className={`flex min-w-[160px] flex-shrink-0 flex-col items-center justify-center rounded-[10px] border-2 border-gold p-6 text-center ${
            c.status === 'playable'
              ? 'bg-gradient-to-br from-neon-cyan to-[#27c4d6] text-felt-deep shadow-[0_0_16px_rgba(61,240,255,0.4)]'
              : 'bg-casino-red-deep text-gold-bright opacity-65 hover:opacity-90'
          }`}
        >
          <div className="text-[34px] leading-none">{c.icon}</div>
          <div className="mt-2.5 font-display text-[15px] tracking-wider">{c.label}</div>
          <div className="mt-1.5 text-[10px]">
            {c.status === 'playable' ? '▶ PLAY NOW' : `Phase ${c.phase} — preview`}
          </div>
        </Link>
      ))}
    </div>
  );
}
