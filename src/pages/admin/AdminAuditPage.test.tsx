import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import AdminAuditPage from './AdminAuditPage';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/admin/adjustments', element: <AdminAuditPage /> },
      { path: '/admin/users/:id', element: <div>user detail</div> },
    ],
    { initialEntries: ['/admin/adjustments'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AdminAuditPage', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('renders empty-state when no adjustments exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no adjustments/i)).toBeInTheDocument());
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
});
