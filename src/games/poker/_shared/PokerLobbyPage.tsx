import type { JSX } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import PokerVariantModal from './PokerVariantModal';

/** Hosts the PokerVariantModal when navigating directly to /play/poker. */
export default function PokerLobbyPage(): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-felt-deep text-white">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-display text-sm tracking-wider text-gold-bright hover:underline"
        >
          ♠️ Choose Poker Variant
        </button>
        <Link to="/lobby" className="text-xs text-white/40 hover:text-white/70">
          ← Back to lobby
        </Link>
      </div>
      <PokerVariantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
