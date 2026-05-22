import type { ReactNode } from 'react';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { db } from '@/db';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';
import { usePrefsStore } from '@/store/prefsStore';
import { useBingoConfigStore } from '@/store/bingoConfigStore';

interface Props {
  children: ReactNode;
}

export default function AppBootstrap({ children }: Props): JSX.Element {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const currentUser = useSessionStore((s) => s.currentUser);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const clearWallet = useWalletStore((s) => s.clear);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  const clearPrefs = usePrefsStore((s) => s.clear);
  const hydrateBingoConfig = useBingoConfigStore((s) => s.hydrate);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (currentUser) {
      void hydrateWallet(currentUser.id);
      void hydratePrefs(currentUser.id);
    } else {
      clearWallet();
      clearPrefs();
    }
  }, [currentUser, hydrateWallet, clearWallet, hydratePrefs, clearPrefs]);

  // Bingo config is app-wide (not user-scoped) — hydrate once on mount.
  useEffect(() => {
    void hydrateBingoConfig();
  }, [hydrateBingoConfig]);

  useEffect(() => {
    const handler = () => {
      const sid = useSessionStore.getState().currentSessionId;
      if (!sid) return;
      const now = Date.now();
      // Fire-and-forget — beforeunload cannot await. The orphan-cleanup path
      // in sessionStore.login is the safety net if this write is aborted.
      void db.sessions.get(sid).then((s) => {
        if (s && s.logoutAt === null) {
          return db.sessions.update(sid, {
            logoutAt: now,
            durationMs: now - s.loginAt,
          });
        }
      });
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
