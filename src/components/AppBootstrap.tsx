import type { JSX, ReactNode } from 'react';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';

interface Props {
  children: ReactNode;
}

export default function AppBootstrap({ children }: Props): JSX.Element {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const bootstrapping = useSessionStore((s) => s.bootstrapping);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (bootstrapping) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-display text-gold">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
