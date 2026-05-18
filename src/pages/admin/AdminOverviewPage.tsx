import type { JSX } from 'react';

export default function AdminOverviewPage(): JSX.Element {
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-gold">OVERVIEW</h1>
      <p className="text-sm text-white/50">Site-wide stats will appear here in PR D.</p>
    </div>
  );
}
