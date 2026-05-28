import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AppLayout from './AppLayout';
import { ToastProvider } from '@/components/ui';
import { useSessionStore } from '@/store/sessionStore';
import { useUIStore } from '@/store/uiStore';
import type { User } from '@/db';

const testUser: User = {
  id: 'u',
  username: 'Adam',
  usernameLower: 'adam',
  passwordHash: '',
  passwordSalt: '',
  pbkdf2Iterations: 600_000,
  avatarColor: '#a3122a',
  createdAt: Date.now(),
};

describe('AppLayout', () => {
  it('renders TopBar, Sidebar, and an Outlet for the child route', () => {
    useSessionStore.setState({
      currentUser: testUser,
      bootstrapping: false,
    });
    useUIStore.setState({ sidebarCollapsed: false });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <ToastProvider>
              <AppLayout />
            </ToastProvider>
          ),
          children: [{ path: 'lobby', element: <p>lobby content</p> }],
        },
      ],
      { initialEntries: ['/lobby'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByText('MASQUER')).toBeInTheDocument();
    expect(screen.getByText(/Coin Flip/)).toBeInTheDocument(); // sidebar item
    expect(screen.getByText('lobby content')).toBeInTheDocument(); // outlet
  });

  it('renders BannedOverlay instead of TopBar/Sidebar/Outlet when user.isBanned', () => {
    useSessionStore.setState({
      currentUser: { ...testUser, isBanned: true },
      bootstrapping: false,
    });
    useUIStore.setState({ sidebarCollapsed: false });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <ToastProvider>
              <AppLayout />
            </ToastProvider>
          ),
          children: [{ path: 'lobby', element: <p>lobby content</p> }],
        },
      ],
      { initialEntries: ['/lobby'] },
    );
    const { container } = render(<RouterProvider router={router} />);

    // Overlay present
    expect(container.querySelector('[data-banned-overlay]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'BANNED' })).toBeInTheDocument();
    // Normal layout NOT mounted (no MASQUER topbar, no sidebar items, no outlet content)
    expect(screen.queryByText('MASQUER')).toBeNull();
    expect(screen.queryByText(/Coin Flip/)).toBeNull();
    expect(screen.queryByText('lobby content')).toBeNull();
  });
});
