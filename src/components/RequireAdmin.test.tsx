import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import RequireAdmin from './RequireAdmin';
import { useSessionStore } from '@/store/sessionStore';

function renderAt(initial: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <div>admin dashboard</div>
          </RequireAdmin>
        ),
      },
      { path: '/admin/login', element: <div>admin login page</div> },
    ],
    { initialEntries: [initial] },
  );
  return render(<RouterProvider router={router} />);
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('renders children when isAdmin is true', () => {
    useSessionStore.setState({ isAdmin: true });
    renderAt('/admin');
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('redirects to /admin/login when isAdmin is false', () => {
    useSessionStore.setState({ isAdmin: false });
    renderAt('/admin');
    expect(screen.getByText('admin login page')).toBeInTheDocument();
  });

  it('renders nothing while bootstrapping (avoids redirect flash)', () => {
    useSessionStore.setState({ bootstrapping: true, isAdmin: false });
    renderAt('/admin');
    expect(screen.queryByText('admin dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('admin login page')).not.toBeInTheDocument();
  });
});
