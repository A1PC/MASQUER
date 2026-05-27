import type { JSX } from 'react';
import { useState } from 'react';
import LobbyButton from '@/games/_shared/LobbyButton';
import PokerVariantModal from './PokerVariantModal';

/** Hosts the PokerVariantModal when navigating directly to /play/poker. */
export default function PokerLobbyPage(): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative flex h-full flex-col bg-felt-table text-ivory">
      <div className="absolute left-4 top-4 z-20">
        <LobbyButton />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 pt-14">
        <header className="text-center">
          <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
            MASQUER &middot; Poker
          </h1>
          <p className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-ivory/55">
            Pick your variant
          </p>
        </header>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-brass/60 bg-velvet px-6 py-3 font-display text-sm tracking-[0.18em] text-ivory hover:bg-velvet-deep"
        >
          CHOOSE POKER VARIANT
        </button>
      </main>
      <PokerVariantModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
