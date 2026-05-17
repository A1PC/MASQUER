import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export default function SidebarToggle(): JSX.Element {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  return (
    <button
      onClick={toggle}
      aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
      className="grid h-9 w-9 place-items-center rounded-md border border-gold/40 text-gold transition-colors hover:bg-gold/10"
    >
      <motion.span
        key={String(collapsed)}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.15 }}
        className="text-lg leading-none"
      >
        {collapsed ? '☰' : '✕'}
      </motion.span>
    </button>
  );
}
