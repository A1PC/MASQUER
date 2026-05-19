import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavoritesDropdown from './FavoritesDropdown';
import { saveFavorite } from '@/systems/lottery';
import { register } from '@/systems/auth';
import { resetDb } from '@/test/db-helpers';

describe('FavoritesDropdown', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('disables Save when currentPick is null', () => {
    render(<FavoritesDropdown userId="u" currentPick={null} onLoad={() => {}} />);
    expect(screen.getByRole('button', { name: /save as favorite/i })).toBeDisabled();
  });

  it('shows the save prompt when Save is clicked, with a valid pick', async () => {
    const user = userEvent.setup();
    render(
      <FavoritesDropdown
        userId="u"
        currentPick={{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }}
        onLoad={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save as favorite/i }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('persists a saved favorite and lists it', async () => {
    const r = await register({ username: 'a', password: 'password123' });
    if (!r.ok) throw new Error();
    const user = userEvent.setup();
    render(
      <FavoritesDropdown
        userId={r.user.id}
        currentPick={{ mainNumbers: [1, 2, 3, 4, 5], bonusNumber: 1 }}
        onLoad={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save as favorite/i }));
    await user.type(screen.getByPlaceholderText(/my numbers/i), 'My Lucky 5');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('My Lucky 5')).toBeInTheDocument());
  });

  it('fires onLoad when a favorite is clicked', async () => {
    const r = await register({ username: 'b', password: 'password123' });
    if (!r.ok) throw new Error();
    await saveFavorite({
      userId: r.user.id,
      name: 'Picked',
      mainNumbers: [10, 20, 30, 40, 50],
      bonusNumber: 9,
    });
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(<FavoritesDropdown userId={r.user.id} currentPick={null} onLoad={onLoad} />);
    await waitFor(() => expect(screen.getByText('Picked')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /load favorite picked/i }));
    expect(onLoad).toHaveBeenCalledWith({ mainNumbers: [10, 20, 30, 40, 50], bonusNumber: 9 });
  });
});
