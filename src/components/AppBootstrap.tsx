import type { ReactNode } from 'react';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useWalletStore } from '@/store/walletStore';

interface Props {
  children: ReactNode;
}

export default function AppBootstrap({ children }: Props): JSX.Element {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);
  const currentUser = useSessionStore((s) => s.currentUser);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const clearWallet = useWalletStore((s) => s.clear);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (currentUser) void hydrateWallet(currentUser.id);
    else clearWallet();
  }, [currentUser, hydrateWallet, clearWallet]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
