import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DevWipeButton from './DevWipeButton';

describe('<DevWipeButton />', () => {
  it('renders the wipe button in dev mode (import.meta.env.DEV is true in vitest)', () => {
    render(<DevWipeButton />);
    expect(screen.getByRole('button', { name: /wipe all data/i })).toBeInTheDocument();
  });

  it('does nothing when the user cancels the confirm dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    render(<DevWipeButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /wipe all data/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('wipes the DB, clears storage, and reloads when the user confirms', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    });

    // Seed some localStorage that we expect to be cleared.
    localStorage.setItem('localGamble.session.userId', 'sentinel');

    render(<DevWipeButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /wipe all data/i }));

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem('localGamble.session.userId')).toBeNull();
    confirmSpy.mockRestore();
  });
});
