import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminSessionsPage from './AdminSessionsPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderPage(initialEntry = '/admin/sessions'): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      { path: '/admin/sessions', element: <AdminSessionsPage /> },
      { path: '/admin/users/:id', element: <div>user detail</div> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

/**
 * Seeds 30 sessions across 5 users with alternating active/closed status.
 * Newer rows get higher `loginAt` so newest-first ordering is unambiguous.
 */
async function seedSessions(): Promise<{ users: string[] }> {
  const usernames = ['alice', 'bob', 'carol', 'dave', 'eve'] as const;
  const users: string[] = [];
  for (const u of usernames) {
    const res = await register({ username: u, password: 'password123' });
    if (!res.ok) throw new Error('register failed');
    users.push(res.user.id);
  }
  const rows = Array.from({ length: 30 }, (_, i) => {
    const userId = users[i % users.length]!;
    const loginAt = 1_700_000_000_000 + i * 60_000;
    const active = i % 3 === 0; // every 3rd is active
    return {
      id: `s-${String(i).padStart(2, '0')}`,
      userId,
      loginAt,
      logoutAt: active ? null : loginAt + 4_000,
      durationMs: active ? null : 4_000,
    };
  });
  await db.sessions.bulkAdd(rows);
  return { users };
}

describe('AdminSessionsPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('masquer.session.userId');
  });

  it('renders empty-state when no sessions exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no sessions recorded/i)).toBeInTheDocument());
  });

  it('lists sessions newest-first with username + duration + status', async () => {
    const a = await register({ username: 'alice', password: 'password123' });
    if (!a.ok) throw new Error('register failed');
    await db.sessions.bulkAdd([
      { id: 's-1', userId: a.user.id, loginAt: 1000, logoutAt: 5000, durationMs: 4000 },
      { id: 's-2', userId: a.user.id, loginAt: 10_000, logoutAt: null, durationMs: null },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getAllByText('alice').length).toBeGreaterThan(0));
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText('4s')).toBeInTheDocument();
  });

  it('paginates at 25/page and clicking Next jumps to page 2', async () => {
    await seedSessions();
    renderPage();
    await waitFor(() => expect(screen.getByText(/sessions · 30/i)).toBeInTheDocument());

    const summary = document.querySelector('[data-admin-pagination-summary]') as HTMLElement;
    expect(summary.textContent).toBe('1–25 of 30');

    const next = document.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    fireEvent.click(next);

    await waitFor(() => {
      const updated = document.querySelector('[data-admin-pagination-summary]') as HTMLElement;
      expect(updated.textContent).toBe('26–30 of 30');
    });
    const tableRows = within(
      document.querySelector('[data-admin-sessions-table]') as HTMLElement,
    ).getAllByRole('row');
    // 1 header + 5 data rows on the partial last page
    expect(tableRows).toHaveLength(6);
  });

  it('narrows the result set by user filter', async () => {
    await seedSessions();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText(/sessions · 30/i)).toBeInTheDocument());

    const userInput = document.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    await user.type(userInput, 'alice');

    await waitFor(() => {
      // 30 rows / 5 users → 6 rows per user
      expect(screen.getByText(/sessions · 6/i)).toBeInTheDocument();
    });
  });

  it('does not render a type filter slot (sessions are uniform)', async () => {
    await seedSessions();
    renderPage();
    await waitFor(() => expect(screen.getByText(/sessions · 30/i)).toBeInTheDocument());
    expect(document.querySelector('[data-admin-filter-type]')).toBeNull();
  });

  it('writes filter changes to the URL query string', async () => {
    await seedSessions();
    const user = userEvent.setup();
    const router = renderPage();
    await waitFor(() => expect(screen.getByText(/sessions · 30/i)).toBeInTheDocument());

    const searchInput = document.querySelector('[data-admin-filter-search]') as HTMLInputElement;
    await user.type(searchInput, 'bob');

    await waitFor(() => {
      const sp = new URLSearchParams(router.state.location.search);
      expect(sp.get('q')).toBe('bob');
    });
  });

  it('reset button clears every active filter', async () => {
    await seedSessions();
    const user = userEvent.setup();
    const router = renderPage('/admin/sessions?user=alice&range=7d&q=al');
    await waitFor(() => expect(screen.getByText(/sessions ·/i)).toBeInTheDocument());

    const reset = document.querySelector('[data-admin-filter-reset]') as HTMLButtonElement;
    await user.click(reset);

    await waitFor(() => {
      const sp = new URLSearchParams(router.state.location.search);
      expect(sp.toString()).toBe('');
      expect(screen.getByText(/sessions · 30/i)).toBeInTheDocument();
    });
  });

  it('reads initial filter state from URL query params on mount', async () => {
    await seedSessions();
    renderPage('/admin/sessions?user=alice');
    await waitFor(() => expect(screen.getByText(/sessions · 6/i)).toBeInTheDocument());
    const userInput = document.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    expect(userInput.value).toBe('alice');
  });
});
