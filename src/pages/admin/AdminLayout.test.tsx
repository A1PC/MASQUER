import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminLayout from './AdminLayout';
import { useSessionStore } from '@/store/sessionStore';

const ADMIN_KEY = 'localGamble.session.admin';

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
});
