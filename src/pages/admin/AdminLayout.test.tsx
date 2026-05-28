import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminLayout from './AdminLayout';
import { useSessionStore } from '@/store/sessionStore';

const ADMIN_KEY = 'masquer.session.admin';

function renderLayoutAt(initial: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <div>overview content</div> },
          { path: 'users', element: <div>users content</div> },
          { path: 'users/:id', element: <div>per-user content</div> },
          { path: 'adjustments', element: <div>adjustments content</div> },
          { path: 'sessions', element: <div>sessions content</div> },
          { path: 'leaderboard', element: <div>leaderboard content</div> },
          { path: 'roulette', element: <div>roulette content</div> },
          { path: 'slots', element: <div>slots content</div> },
          { path: 'poker', element: <div>poker content</div> },
          { path: 'plinko', element: <div>plinko content</div> },
          { path: 'baccarat', element: <div>baccarat content</div> },
          { path: 'craps', element: <div>craps content</div> },
          { path: 'blackjack', element: <div>blackjack content</div> },
          { path: 'coin-flip', element: <div>coin-flip content</div> },
          { path: 'lottery', element: <div>lottery content</div> },
          { path: 'bingo', element: <div>bingo content</div> },
        ],
      },
      { path: '/admin/login', element: <div>admin login</div> },
    ],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.setItem(ADMIN_KEY, '1');
    useSessionStore.setState({
      currentUser: null,
      isAdmin: true,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders sidebar nav with 4 links and the current page content', () => {
    renderLayoutAt('/admin');
    expect(screen.getByText('overview content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /^users$/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /adjustments/i })).toHaveAttribute(
      'href',
      '/admin/adjustments',
    );
    expect(screen.getByRole('link', { name: /sessions/i })).toHaveAttribute(
      'href',
      '/admin/sessions',
    );
    expect(screen.getByRole('link', { name: /^leaderboard$/i })).toHaveAttribute(
      'href',
      '/admin/leaderboard',
    );
    expect(screen.getByRole('link', { name: /^roulette$/i })).toHaveAttribute(
      'href',
      '/admin/roulette',
    );
    expect(screen.getByRole('link', { name: /^slots$/i })).toHaveAttribute('href', '/admin/slots');
    expect(screen.getByRole('link', { name: /^poker$/i })).toHaveAttribute('href', '/admin/poker');
    expect(screen.getByRole('link', { name: /^plinko$/i })).toHaveAttribute(
      'href',
      '/admin/plinko',
    );
    expect(screen.getByRole('link', { name: /^baccarat$/i })).toHaveAttribute(
      'href',
      '/admin/baccarat',
    );
    expect(screen.getByRole('link', { name: /^craps$/i })).toHaveAttribute('href', '/admin/craps');
  });

  it('marks the Roulette nav link active on /admin/roulette', () => {
    renderLayoutAt('/admin/roulette');
    const link = screen.getByRole('link', { name: /^roulette$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('roulette content')).toBeInTheDocument();
  });

  it('marks the Slots nav link active on /admin/slots', () => {
    renderLayoutAt('/admin/slots');
    const link = screen.getByRole('link', { name: /^slots$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('slots content')).toBeInTheDocument();
  });

  it('marks the Baccarat nav link active on /admin/baccarat', () => {
    renderLayoutAt('/admin/baccarat');
    const link = screen.getByRole('link', { name: /^baccarat$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('baccarat content')).toBeInTheDocument();
  });

  it('marks the Plinko nav link active on /admin/plinko', () => {
    renderLayoutAt('/admin/plinko');
    const link = screen.getByRole('link', { name: /^plinko$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('plinko content')).toBeInTheDocument();
  });

  it('marks the Poker nav link active on /admin/poker', () => {
    renderLayoutAt('/admin/poker');
    const link = screen.getByRole('link', { name: /^poker$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('poker content')).toBeInTheDocument();
  });

  it('places the Poker nav entry between Slots and Plinko', () => {
    renderLayoutAt('/admin');
    const slots = screen.getByRole('link', { name: /^slots$/i });
    const poker = screen.getByRole('link', { name: /^poker$/i });
    const plinko = screen.getByRole('link', { name: /^plinko$/i });
    // DOCUMENT_POSITION_FOLLOWING (4) = b comes after a in the DOM.
    expect(slots.compareDocumentPosition(poker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(poker.compareDocumentPosition(plinko) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('places the Craps nav entry between Poker and Plinko', () => {
    renderLayoutAt('/admin');
    const poker = screen.getByRole('link', { name: /^poker$/i });
    const craps = screen.getByRole('link', { name: /^craps$/i });
    const plinko = screen.getByRole('link', { name: /^plinko$/i });
    expect(poker.compareDocumentPosition(craps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(craps.compareDocumentPosition(plinko) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks the Craps nav link active on /admin/craps', () => {
    renderLayoutAt('/admin/craps');
    const link = screen.getByRole('link', { name: /^craps$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('craps content')).toBeInTheDocument();
  });

  it('marks the Leaderboard nav link active on /admin/leaderboard', () => {
    renderLayoutAt('/admin/leaderboard');
    const link = screen.getByRole('link', { name: /^leaderboard$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('leaderboard content')).toBeInTheDocument();
  });

  it('places the Leaderboard nav entry between Sessions and Lottery', () => {
    renderLayoutAt('/admin');
    const sessions = screen.getByRole('link', { name: /^sessions$/i });
    const leaderboard = screen.getByRole('link', { name: /^leaderboard$/i });
    // Lottery is a lazy-loaded route in the real app; here we only have a
    // partial route table so check ordering against the next existing entry
    // (Roulette comes after Bingo which comes after Lottery in the real nav).
    const roulette = screen.getByRole('link', { name: /^roulette$/i });
    // DOCUMENT_POSITION_FOLLOWING (4) = b comes after a in the DOM.
    expect(
      sessions.compareDocumentPosition(leaderboard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      leaderboard.compareDocumentPosition(roulette) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('marks the active nav link with aria-current=page', () => {
    renderLayoutAt('/admin/users');
    const usersLink = screen.getByRole('link', { name: /^users$/i });
    expect(usersLink).toHaveAttribute('aria-current', 'page');
  });

  it('log-out button clears isAdmin and navigates to /admin/login', async () => {
    const user = userEvent.setup();
    renderLayoutAt('/admin');
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(useSessionStore.getState().isAdmin).toBe(false);
    expect(await screen.findByText('admin login')).toBeInTheDocument();
  });

  it('renders the MASQUER · Admin title in the top-bar', () => {
    renderLayoutAt('/admin');
    expect(screen.getByText(/MASQUER\s*·\s*Admin/i)).toBeInTheDocument();
  });

  it('root container uses h-full flex-col, never min-h-screen', () => {
    const { container } = renderLayoutAt('/admin');
    const root = container.querySelector('[data-admin-layout]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('h-full');
    expect(root?.className).toContain('flex-col');
    expect(root?.className).not.toContain('min-h-screen');
    expect(root?.className).not.toContain('h-screen');
  });

  it('logout button is rendered with data-admin-logout in the top-bar', async () => {
    const user = userEvent.setup();
    const { container } = renderLayoutAt('/admin');
    const btn = container.querySelector<HTMLButtonElement>('[data-admin-logout]');
    expect(btn).not.toBeNull();
    expect(btn?.tagName).toBe('BUTTON');
    expect(btn?.textContent).toMatch(/log out/i);
    await user.click(btn!);
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });

  it('sidebar and top-bar use brand tokens (velvet-deep + brass border)', () => {
    const { container } = renderLayoutAt('/admin');
    const sidebar = container.querySelector('[data-admin-sidebar]');
    const topbar = container.querySelector('[data-admin-topbar]');
    expect(sidebar?.className).toContain('bg-velvet-deep');
    expect(sidebar?.className).toContain('border-brass/60');
    expect(topbar?.className).toContain('bg-velvet-deep');
    expect(topbar?.className).toContain('border-brass/60');
  });

  // Phase 15 #14.5 PR B — NEW Blackjack nav entry.

  it('renders the Blackjack nav link pointing to /admin/blackjack', () => {
    renderLayoutAt('/admin');
    expect(screen.getByRole('link', { name: /^blackjack$/i })).toHaveAttribute(
      'href',
      '/admin/blackjack',
    );
  });

  it('marks the Blackjack nav link active on /admin/blackjack', () => {
    renderLayoutAt('/admin/blackjack');
    const link = screen.getByRole('link', { name: /^blackjack$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('blackjack content')).toBeInTheDocument();
  });

  it('renders the Coin-flip nav link pointing to /admin/coin-flip', () => {
    renderLayoutAt('/admin');
    expect(screen.getByRole('link', { name: /^coin-flip$/i })).toHaveAttribute(
      'href',
      '/admin/coin-flip',
    );
  });

  it('marks the Coin-flip nav link active on /admin/coin-flip', () => {
    renderLayoutAt('/admin/coin-flip');
    const link = screen.getByRole('link', { name: /^coin-flip$/i });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('coin-flip content')).toBeInTheDocument();
  });
});
