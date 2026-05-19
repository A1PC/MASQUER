import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';
import CabinetCarousel from './lobby/CabinetCarousel';
import RecentActivityStrip from './lobby/RecentActivityStrip';

export default function LobbyPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="px-8 py-7">
      <h2 className="mb-1.5 font-display text-2xl tracking-wider text-gold-bright">
        PICK YOUR POISON
      </h2>
      <p className="mb-5 text-xs text-white/55">Click a cabinet to play.</p>
      <CabinetCarousel userId={user.id} />
      <RecentActivityStrip />
    </div>
  );
}
