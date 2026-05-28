import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import BannedOverlay from './BannedOverlay';
import { useSessionStore } from '@/store/sessionStore';

describe('BannedOverlay', () => {
  it('renders the BANNED headline + frozen credits label + logout button', () => {
    render(
      <MemoryRouter>
        <BannedOverlay />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'BANNED' })).toBeInTheDocument();
    expect(screen.getByText(/your account has been suspended/i)).toBeInTheDocument();
    expect(screen.getByText('FROZEN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('clicking LOG OUT clears the session and navigates to /login', () => {
    const logoutSpy = vi.fn();
    useSessionStore.setState({ logout: logoutSpy } as never);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BannedOverlay />} />
          <Route path="/login" element={<div data-login-page>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(logoutSpy).toHaveBeenCalled();
    expect(document.querySelector('[data-login-page]')).toBeInTheDocument();
  });

  it('uses brand tokens — casino-red headline + velvet-deep backdrop', () => {
    const { container } = render(
      <MemoryRouter>
        <BannedOverlay />
      </MemoryRouter>,
    );
    const root = container.querySelector('[data-banned-overlay]') as HTMLElement;
    expect(root.className).toContain('bg-velvet-deep');
    const headline = screen.getByRole('heading', { name: 'BANNED' });
    expect(headline.className).toContain('text-casino-red');
  });
});
