import type { JSX } from 'react';
import { useState } from 'react';
import { db } from '@/db';

/**
 * Dev-only "wipe everything" button. Renders only when `import.meta.env.DEV`.
 * Clicking it drops the IndexedDB database (users, balances, rounds), clears
 * all browser storage, and reloads the page — so the next session starts
 * from a clean slate. Useful for register/login QA without manually clicking
 * around DevTools.
 *
 * The button never appears in production builds.
 */
export default function DevWipeButton(): JSX.Element | null {
  const [busy, setBusy] = useState(false);

  if (!import.meta.env.DEV) return null;

  const onClick = async (): Promise<void> => {
    const confirmed = window.confirm(
      'Wipe ALL users, balances, and rounds from this browser?\n\n' +
        'This is dev tooling only — it will not affect any other user. ' +
        'The page will reload immediately afterwards.',
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await db.delete();
    } catch {
      // db might already be gone — keep going.
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // storage might be unavailable — keep going.
    }
    window.location.reload();
  };

  return (
    <div className="mt-6 border-t border-white/10 pt-4 text-center">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        data-dev-wipe-button
        className="rounded border border-casino-red/40 bg-transparent px-3 py-1.5 text-xs text-casino-red hover:bg-casino-red/10 disabled:opacity-50"
      >
        {busy ? 'Wiping…' : '🧨 Wipe all data (dev only)'}
      </button>
      <p className="mt-2 text-[10px] text-white/40">
        Removes every user, balance, and round from this browser. Dev builds only.
      </p>
    </div>
  );
}
