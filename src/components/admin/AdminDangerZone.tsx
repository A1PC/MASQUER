import type { JSX } from 'react';
import { useState } from 'react';
import { db } from '@/db';

/**
 * Admin DANGER ZONE — local-data wipe with a two-step CONFIRM modal.
 * Renders on the admin Users page. Drops the IndexedDB database (users,
 * balances, rounds, ...), clears browser storage, and reloads. Always-on
 * for admins; the admin route is itself gated by `RequireAdmin`.
 *
 * Used to be the dev-only `<DevWipeButton>` on Login/Register; lifted into
 * the admin suite so it's reachable in production builds while behind the
 * admin auth gate.
 */
export default function AdminDangerZone(): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const performWipe = async (): Promise<void> => {
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
    <section
      aria-label="Danger zone"
      className="mt-8 rounded-lg border-2 border-casino-red/40 bg-velvet-deep p-4"
      data-admin-danger-zone
    >
      <h2 className="mb-2 font-display text-xs tracking-[0.2em] text-casino-red">DANGER ZONE</h2>
      <p className="mb-3 text-xs text-ivory/55">
        Wipe every user, balance, round, adjustment, session, and preference from this browser. This
        action is destructive and cannot be undone. The page reloads immediately after.
      </p>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        data-admin-wipe-trigger
        className="rounded-md border-2 border-casino-red bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-casino-red hover:bg-casino-red/10 disabled:opacity-50"
      >
        {busy ? 'WIPING…' : 'WIPE ALL DATA'}
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          data-admin-wipe-modal
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-wipe-modal-heading"
        >
          <div className="max-w-md rounded-lg border-2 border-casino-red/60 bg-velvet-deep p-6 shadow-2xl">
            <h3
              id="admin-wipe-modal-heading"
              className="mb-3 font-display text-lg tracking-[0.18em] text-casino-red"
            >
              WIPE ALL DATA?
            </h3>
            <p className="mb-4 text-sm text-ivory/85">
              This permanently deletes every user, balance, round, adjustment, session, and
              preference from this browser. The page will reload immediately after.
            </p>
            <p className="mb-5 text-xs text-ivory/55">
              There is no undo. Wipe is only safe in dev / QA contexts where you intend to start
              from a clean slate.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                data-admin-wipe-cancel
                className="rounded-md border border-brass/60 px-4 py-2 font-display text-xs tracking-[0.18em] text-ivory hover:bg-velvet disabled:opacity-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => void performWipe()}
                disabled={busy}
                data-admin-wipe-confirm
                className="rounded-md border-2 border-casino-red bg-velvet px-4 py-2 font-display text-xs tracking-[0.18em] text-casino-red hover:bg-casino-red/10 disabled:opacity-50"
              >
                {busy ? 'WIPING…' : 'CONFIRM WIPE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
