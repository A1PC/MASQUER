import type { JSX } from 'react';
import { useCurrentUser } from '@/store/sessionStore';

export default function LotteryPage(): JSX.Element | null {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="flex min-h-screen bg-felt-deep text-white">
      <main className="flex-1 overflow-auto p-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-base tracking-wider text-gold-bright">DAILY LOTTERY</h1>
        </header>
        <section
          data-hero-placeholder
          className="rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          HERO countdown ↔ winning balls — ships in PR D.
        </section>
        <section
          data-buy-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          Buy a Ticket — populated in B.2–B.6.
        </section>
        <section
          data-history-placeholder
          className="mt-6 rounded border border-dashed border-gold/40 bg-felt-deep p-6 text-center text-sm text-white/50"
        >
          History slide — ships in PR E.
        </section>
      </main>
    </div>
  );
}
