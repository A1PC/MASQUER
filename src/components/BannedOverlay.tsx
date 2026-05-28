import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';
import { Button } from '@/components/ui';

/**
 * Full-screen overlay shown to banned users instead of any in-app route.
 * Mounted by AppLayout when `currentUser.isBanned === true`. Renders a single
 * LOGOUT action; every game / wallet / nav surface is unreachable while this
 * is on screen.
 *
 * Credits are NOT displayed here — the user's real balance is preserved in
 * the DB but locked. `wallet.placeBet` also refuses to debit while banned,
 * so even if a banned user reached a game URL directly, no chip movement
 * could occur.
 */
export default function BannedOverlay(): JSX.Element {
  const navigate = useNavigate();
  const logout = useSessionStore((s) => s.logout);

  function handleLogout(): void {
    void logout();
    void navigate('/login', { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-velvet-deep text-ivory"
      data-banned-overlay
      role="dialog"
      aria-labelledby="banned-headline"
      aria-modal="true"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {/* TODO(#15-followup): centralise the casino-red drop-shadow as a
            `shadow-casino-glow` token so this headline + the FROZEN pill below
            + the Sidebar unread-dot share one source of truth. Audit §1.4. */}
        <h1
          id="banned-headline"
          className="font-display text-6xl tracking-[0.22em] text-casino-red drop-shadow-[0_0_24px_rgba(220,38,38,0.45)]"
        >
          BANNED
        </h1>
        <p className="font-display text-xs uppercase tracking-[0.3em] text-ivory/60">
          Your account has been suspended
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 text-center text-sm text-ivory/70">
        <p>Your credits are frozen. No games can be played from this account.</p>
        <p>
          Contact an admin if you believe this is a mistake. Otherwise, log out below to return to
          the login screen.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-[10px] uppercase tracking-[0.18em] text-ivory/40">
          Credits
        </span>
        <span
          className="rounded-md border border-casino-red/60 bg-velvet px-4 py-1.5 font-display text-sm tracking-[0.18em] text-casino-red"
          data-banned-credits-frozen
        >
          FROZEN
        </span>
      </div>
      <Button
        variant="danger"
        size="lg"
        onClick={handleLogout}
        data-banned-logout
        // Match the BANNED chrome's wider spacing + velvet undertone (the
        // base danger variant has a transparent bg; this overlay reads better
        // with the felt-on-velvet pairing).
        className="bg-velvet px-8 tracking-[0.18em]"
      >
        LOG OUT
      </Button>
    </div>
  );
}
