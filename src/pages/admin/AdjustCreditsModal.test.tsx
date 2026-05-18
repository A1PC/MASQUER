import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdjustCreditsModal from './AdjustCreditsModal';
import { register } from '@/systems/auth';
import { db } from '@/db';
import { resetDb } from '@/test/db-helpers';
import { WALLET_CONFIG } from '@/systems/wallet';

describe('AdjustCreditsModal', () => {
  beforeEach(async () => {
    await resetDb();
    localStorage.removeItem('localGamble.session.userId');
  });

  it('does not render when open is false', () => {
    render(<AdjustCreditsModal open={false} userId="u-1" username="x" onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows form fields when open', () => {
    render(<AdjustCreditsModal open={true} userId="u-1" username="alice" onClose={() => {}} />);
    expect(screen.getByText(/adjust credits/i)).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('applies a credit and closes the modal on success', async () => {
    const reg = await register({ username: 'eve', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="eve" onClose={onClose} />,
    );
    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.type(screen.getByLabelText(/reason/i), 'test grant');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    await new Promise((r) => setTimeout(r, 50));
    expect(onClose).toHaveBeenCalled();
    const bal = await db.balances.get(reg.user.id);
    expect(bal?.chips).toBe(WALLET_CONFIG.STARTING_CHIPS + 500);
  });

  it('shows an error when the adjustment would go negative', async () => {
    const reg = await register({ username: 'frank', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="frank" onClose={() => {}} />,
    );
    await user.type(screen.getByLabelText(/amount/i), String(-(WALLET_CONFIG.STARTING_CHIPS + 1)));
    await user.type(screen.getByLabelText(/reason/i), 'over-debit test');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(await screen.findByText(/go negative/i)).toBeInTheDocument();
  });

  it('shows an error for invalid reason (< 3 chars)', async () => {
    const reg = await register({ username: 'gail', password: 'password123' });
    if (!reg.ok) throw new Error('register failed');
    const user = userEvent.setup();
    render(
      <AdjustCreditsModal open={true} userId={reg.user.id} username="gail" onClose={() => {}} />,
    );
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/reason/i), 'no');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(await screen.findByText(/reason must be at least 3/i)).toBeInTheDocument();
  });

  it('cancel button calls onClose without applying', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdjustCreditsModal open={true} userId="u-1" username="x" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
