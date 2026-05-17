import type { JSX } from 'react';
import SidebarToggle from './SidebarToggle';
import BalanceBadge from './BalanceBadge';
import ProfileDropdown from './ProfileDropdown';

export default function TopBar(): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-gold/30 bg-felt-deep px-5 py-3.5">
      <div className="flex items-center gap-3.5">
        <SidebarToggle />
        <span className="font-display tracking-wider text-gold text-lg">LOCALGAMBLE</span>
      </div>
      <div className="flex items-center gap-3.5 text-sm">
        <BalanceBadge />
        <ProfileDropdown />
      </div>
    </header>
  );
}
