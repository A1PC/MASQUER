import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminAuditPage from './AdminAuditPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

/**
 * Renders the page inside a memory router so `useSearchParams` resolves +
 * exposes the router so tests can read back the URL after a filter change.
 */
function renderPage(initialEntry = '/admin/adjustments'): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(
    [
      { path: '/admin/adjustments', element: <AdminAuditPage /> },
      { path: '/admin/users/:id', element: <div>user detail</div> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

/**
 * Seeds 30 adjustments across 5 users with a mix of credit-adjust / ban /
 * unban reasons spread over a wide time range. Newer rows get higher
 * `adjustedAt` so newest-first ordering is unambiguous.
 */
async function seedAdjustments(): Promise<{ users: string[] }> {
  const usernames = ['alice', 'bob', 'carol', 'dave', 'eve'] as const;
  const users: string[] = [];
  for (const u of usernames) {
    const res = await register({ username: u, password: 'password123' });
    if (!res.ok) throw new Error('register failed');
    users.push(res.user.id);
  }
  const reasons = [
    'manual top-up grant',
    'rollback after bug',
    'ban: terms violation',
    'unban: appeal upheld',
    'tournament prize',
    'welcome bonus',
  ] as const;
  const rows = Array.from({ length: 30 }, (_, i) => {
    const userId = users[i % users.length]!;
    const reason = reasons[i % reasons.length]!;
    const amount = reason.startsWith('rollback') ? -250 : 500;
    return {
      id: `adj-${String(i).padStart(2, '0')}`,
      userId,
      amount,
      reason,
      // adjustedAt monotonically increases → row 29 is newest.
      adjustedAt: 1_700_000_000_000 + i * 1000,
    };
  });
  await db.adjustments.bulkAdd(rows);
  return { users };
}

describe('AdminAuditPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders empty-state when no adjustments exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no adjustments recorded/i)).toBeInTheDocument());
  });

  it('lists adjustments newest-first with username + amount + reason', async () => {
    const a = await register({ username: 'alice', password: 'password123' });
    const b = await register({ username: 'bob', password: 'password123' });
    if (!a.ok || !b.ok) throw new Error('register failed');
    await db.adjustments.bulkAdd([
      { id: 'adj-1', userId: a.user.id, amount: 500, reason: 'grant', adjustedAt: 1000 },
      { id: 'adj-2', userId: b.user.id, amount: -200, reason: 'rollback', adjustedAt: 2000 },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/rollback/i)).toBeInTheDocument());
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(3); // header + 2 data
    const bobIdx = rows.findIndex((r) => r.textContent?.includes('bob'));
    const aliceIdx = rows.findIndex((r) => r.textContent?.includes('alice'));
    expect(bobIdx).toBeLessThan(aliceIdx);
  });

  it('paginates seeded rows at 25/page and clicking Next moves to page 2', async () => {
    await seedAdjustments();
    renderPage();
    await waitFor(() => expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument());

    const summary = document.querySelector('[data-admin-pagination-summary]') as HTMLElement;
    expect(summary.textContent).toBe('1–25 of 30');

    const dataRowsP1 = within(
      document.querySelector('[data-admin-audit-table]') as HTMLElement,
    ).getAllByRole('row');
    // 1 header + 25 data rows
    expect(dataRowsP1).toHaveLength(26);

    const next = document.querySelector('[data-admin-pagination-next]') as HTMLButtonElement;
    fireEvent.click(next);

    await waitFor(() => {
      const updated = document.querySelector('[data-admin-pagination-summary]') as HTMLElement;
      expect(updated.textContent).toBe('26–30 of 30');
    });
    const dataRowsP2 = within(
      document.querySelector('[data-admin-audit-table]') as HTMLElement,
    ).getAllByRole('row');
    // 1 header + 5 data rows on the partial last page
    expect(dataRowsP2).toHaveLength(6);
  });

  it('narrows the result set by user filter', async () => {
    await seedAdjustments();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument());

    const userInput = document.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    await user.type(userInput, 'alice');

    await waitFor(() => {
      // 30 rows / 5 users → 6 rows belong to alice.
      expect(screen.getByText(/adjustments · 6/i)).toBeInTheDocument();
    });
  });

  it('narrows the result set by type filter', async () => {
    await seedAdjustments();
    renderPage();
    await waitFor(() => expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument());

    const typeSelect = document.querySelector('[data-admin-filter-type]') as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: 'ban' } });

    await waitFor(() => {
      // 30 rows seeded, every 6th reason starts with `ban:` (indices 2, 8, ...) → 5 rows.
      expect(screen.getByText(/adjustments · 5/i)).toBeInTheDocument();
    });
  });

  it('narrows the result set by free-text search across reason + username', async () => {
    await seedAdjustments();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument());

    const searchInput = document.querySelector('[data-admin-filter-search]') as HTMLInputElement;
    await user.type(searchInput, 'rollback');

    await waitFor(() => {
      // Every 6th seed (indices 1, 7, 13, 19, 25) → 5 rollback rows.
      expect(screen.getByText(/adjustments · 5/i)).toBeInTheDocument();
    });
  });

  it('writes filter changes to the URL query string', async () => {
    await seedAdjustments();
    const user = userEvent.setup();
    const router = renderPage();
    await waitFor(() => expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument());

    const userInput = document.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    await user.type(userInput, 'bob');

    await waitFor(() => {
      const sp = new URLSearchParams(router.state.location.search);
      expect(sp.get('user')).toBe('bob');
    });
  });

  it('reset button clears every active filter + URL params', async () => {
    await seedAdjustments();
    const user = userEvent.setup();
    const router = renderPage('/admin/adjustments?user=alice&type=ban&range=7d&q=grant');
    await waitFor(() => expect(screen.getByText(/adjustments ·/i)).toBeInTheDocument());

    const reset = document.querySelector('[data-admin-filter-reset]') as HTMLButtonElement;
    await user.click(reset);

    await waitFor(() => {
      const sp = new URLSearchParams(router.state.location.search);
      expect(sp.toString()).toBe('');
      expect(screen.getByText(/adjustments · 30/i)).toBeInTheDocument();
    });
  });

  it('reads initial filter state from URL query params on mount', async () => {
    await seedAdjustments();
    renderPage('/admin/adjustments?user=alice');
    await waitFor(() => expect(screen.getByText(/adjustments · 6/i)).toBeInTheDocument());
    const userInput = document.querySelector('[data-admin-filter-user]') as HTMLInputElement;
    expect(userInput.value).toBe('alice');
  });
});
