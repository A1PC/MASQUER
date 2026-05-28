import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSessionStore } from '@/store/sessionStore';
import { resetDb } from '@/test/db-helpers';
import { renderWithRouter } from '@/test/router-helpers';
import RegisterPage from './RegisterPage';

function resetStore() {
  useSessionStore.setState({ currentUser: null, bootstrapping: false });
}

function renderRegister() {
  return renderWithRouter(
    [
      { path: '/register', element: <RegisterPage /> },
      { path: '/lobby', element: <p>lobby page</p> },
    ],
    { initialEntry: '/register' },
  );
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
    resetStore();
  });

  it('renders the form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  it('shows inline error when passwords do not match', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'adam');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
  });

  it('shows inline error when username is taken', async () => {
    await useSessionStore.getState().register({ username: 'adam', password: 'password123' });
    resetStore();
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'aDaM');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'newpassword');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpassword');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();
  });

  it('navigates to /lobby on successful registration', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/username/i), 'newuser');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/lobby page/i)).toBeInTheDocument();
  });
});
