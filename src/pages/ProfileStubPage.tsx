import type { JSX } from 'react';
import { Link } from 'react-router';

interface Props {
  feature: string;
}

export default function ProfileStubPage({ feature }: Props): JSX.Element {
  return (
    <main className="mx-auto grid min-h-full max-w-2xl place-items-center p-8 text-center">
      <div>
        <div className="mb-4 text-6xl">⚙️</div>
        <h1 className="mb-2 font-display text-3xl tracking-wider text-gold">{feature}</h1>
        <p className="mb-6 text-white/70">Coming in Phase 8 (Polish).</p>
        <Link to="/lobby" className="text-gold underline">
          Back to lobby
        </Link>
      </div>
    </main>
  );
}
