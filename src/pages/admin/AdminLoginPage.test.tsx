import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminLoginPage from './AdminLoginPage';
import { useSessionStore } from '@/store/sessionStore';

const ADMIN_KEY = 'masquer.session.admin';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/admin/login', element: <AdminLoginPage /> },
      { path: '/admin', element: <div>admin dashboard</div> },
    ],
    { initialEntries: ['/admin/login'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_KEY);
    useSessionStore.setState({
      currentUser: null,
      isAdmin: false,
      currentSessionId: null,
      bootstrapping: false,
    });
  });

  it('shows username + password fields and a sign-in button', () => {
    renderPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('logs in successfully with correct credentials and navigates to /admin', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'admin12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('admin dashboard')).toBeInTheDocument();
    expect(useSessionStore.getState().isAdmin).toBe(true);
  });

  it('shows an error and stays on the login page when credentials are wrong', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(useSessionStore.getState().isAdmin).toBe(false);
  });

  it('does not include any link back to the regular app (hidden route)', () => {
    renderPage();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
