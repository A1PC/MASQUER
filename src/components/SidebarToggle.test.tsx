import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarToggle from './SidebarToggle';
import { useUIStore } from '@/store/uiStore';

beforeEach(() => {
  useUIStore.setState({ sidebarCollapsed: false });
});

describe('SidebarToggle', () => {
  it('aria-label reflects state', () => {
    render(<SidebarToggle />);
    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    cleanup();
    useUIStore.setState({ sidebarCollapsed: true });
    render(<SidebarToggle />);
    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
  });

  it('click toggles state in uiStore', async () => {
    render(<SidebarToggle />);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    await userEvent.click(screen.getByRole('button'));
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });
});
