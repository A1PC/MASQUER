import type { JSX } from 'react';
import { Outlet } from 'react-router';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import { useUIStore } from '@/store/uiStore';
import { PageTransition } from '@/motion/PageTransition';

export default function AppLayout(): JSX.Element {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
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
