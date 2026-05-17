import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreditsDropdown from './CreditsDropdown';
import { useWalletStore } from '@/store/walletStore';
import { useSessionStore } from '@/store/sessionStore';
import type { User } from '@/db';

const testUser: User = {
  id: 'u1',
  username: 'Tester',
  usernameLower: 'tester',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

beforeEach(() => {
  useSessionStore.setState({ currentUser: testUser, bootstrapping: false });
  useWalletStore.setState({ balance: 1_000, nextDailyEligibleAt: null, hydrating: false });
});

describe('CreditsDropdown', () => {
  it('renders the balance in the toggle button', () => {
    render(<CreditsDropdown />);
    // balance 1000 should be visible
    expect(screen.getByRole('button', { name: /1,000|1000/ })).toBeInTheDocument();
  });

  it('toggles open and close on button click', async () => {
    render(<CreditsDropdown />);
    const toggleBtn = screen.getByRole('button', { name: /1,000|1000/ });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('shows countdown when not yet eligible (eligibleAt in future)', async () => {
    const future = Date.now() + 3_600_000; // 1 hour from now
    useWalletStore.setState({ nextDailyEligibleAt: future });
    render(<CreditsDropdown />);
    await userEvent.click(screen.getByRole('button', { name: /1,000|1000/ }));
    // Should show a countdown (HHh MMm SSs format)
    expect(screen.getByText(/\d{2}h \d{2}m \d{2}s/)).toBeInTheDocument();
    // Should NOT show CLAIM button
    expect(screen.queryByRole('button', { name: /CLAIM/i })).not.toBeInTheDocument();
  });

  it('shows CLAIM button when eligible (no nextDailyEligibleAt)', async () => {
    useWalletStore.setState({ nextDailyEligibleAt: null });
    render(<CreditsDropdown />);
    await userEvent.click(screen.getByRole('button', { name: /1,000|1000/ }));
    expect(screen.getByRole('button', { name: /CLAIM/i })).toBeInTheDocument();
    expect(screen.queryByText(/\d{2}h \d{2}m \d{2}s/)).not.toBeInTheDocument();
  });

  it('clicking CLAIM calls walletStore.claimDaily with user id', async () => {
    const claimDaily = vi.fn(() =>
      Promise.resolve({
        ok: true,
        newBalance: 1050,
        nextEligibleAt: Date.now() + 86_400_000,
      } as const),
    );
    useWalletStore.setState({ nextDailyEligibleAt: null, claimDaily });
    render(<CreditsDropdown />);
    await userEvent.click(screen.getByRole('button', { name: /1,000|1000/ }));
    await userEvent.click(screen.getByRole('button', { name: /CLAIM/i }));
    expect(claimDaily).toHaveBeenCalledWith('u1');
  });

  it('click-outside closes the dropdown', async () => {
    render(
      <div>
        <CreditsDropdown />
        <div data-testid="outside">outside</div>
      </div>,
    );
    const toggleBtn = screen.getByRole('button', { name: /1,000|1000/ });
    await userEvent.click(toggleBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // Fire mousedown on an element outside the dropdown
    fireEvent.mouseDown(screen.getByTestId('outside'));
    // aria-expanded should immediately reflect closed state
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('formatCountdown produces HHh MMm SSs format', async () => {
    // Set eligibleAt to 3723000ms from now (1h 2m 3s)
    const future = Date.now() + 3_723_000;
    useWalletStore.setState({ nextDailyEligibleAt: future });
    render(<CreditsDropdown />);
    await userEvent.click(screen.getByRole('button', { name: /1,000|1000/ }));
    // Should display something like 01h 02m 03s (timing may vary ±1s)
    expect(screen.getByText(/\d{2}h \d{2}m \d{2}s/)).toBeInTheDocument();
  });

  it('respects reduced motion: dropdown still opens and renders correctly', async () => {
    // matchMedia is not implemented in jsdom; window.matchMedia returns undefined,
    // causing useReducedMotion() to return null (treated as false). The component
    // must not crash regardless, and the menu must still open.
    // Simulate a reduced-motion environment by overriding matchMedia.
    const original = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    render(<CreditsDropdown />);
    await userEvent.click(screen.getByRole('button', { name: /1,000|1000/ }));
    // Dropdown must open regardless of reduced motion preference
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // Restore matchMedia
    Object.defineProperty(window, 'matchMedia', { writable: true, value: original });
  });
});
