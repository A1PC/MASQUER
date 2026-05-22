import type { JSX } from 'react';
import SidebarToggle from './SidebarToggle';
import CreditsDropdown from './CreditsDropdown';
import ProfileDropdown from './ProfileDropdown';
import Wordmark from './brand/Wordmark';

export default function TopBar(): JSX.Element {
  return (
    <header className="flex items-center justify-between border-b border-gold/30 bg-felt-deep px-5 py-3.5">
      <div className="flex items-center gap-3.5">
        <SidebarToggle />
        <Wordmark maskSize={26} />
      </div>
      <div className="flex items-center gap-3.5 text-sm">
        <CreditsDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
