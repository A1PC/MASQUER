import type { JSX } from 'react';
import { Outlet } from 'react-router';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import BannedOverlay from '@/components/BannedOverlay';
import { useUIStore } from '@/store/uiStore';
import { useCurrentUser } from '@/store/sessionStore';
import { PageTransition } from '@/motion/PageTransition';

export default function AppLayout(): JSX.Element {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const user = useCurrentUser();

  // Banned users see the BANNED overlay instead of any in-app surface.
  // RequireAuth gates this layout, so `user` is guaranteed non-null here.
  if (user?.isBanned === true) {
    return <BannedOverlay />;
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} />
        <main className="flex-1 overflow-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
