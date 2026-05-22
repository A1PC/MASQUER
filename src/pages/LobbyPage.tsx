import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import LobbyHero from './lobby/LobbyHero';
import GameGrid from './lobby/GameGrid';
import RecentActivityStrip from './lobby/RecentActivityStrip';

/** The MASQUER floor (Option A): a marquee hero (welcome + balance + daily CTA,
 *  or the zero-balance state) over an even game-cabinet grid, then the recent
 *  activity strip. */
export default function LobbyPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-6xl px-6 py-7 sm:px-8">
      <LobbyHero username={user.username} />
      <GameGrid userId={user.id} />
      <RecentActivityStrip />
    </div>
  );
}
