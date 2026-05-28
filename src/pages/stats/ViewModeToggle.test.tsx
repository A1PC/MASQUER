import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeToggle from './ViewModeToggle';
import { useUIStore } from '@/store/uiStore';

describe('ViewModeToggle', () => {
  beforeEach(() => {
    localStorage.removeItem('masquer.ui.statsViewMode');
    useUIStore.setState({ statsViewMode: 'cards' });
  });

  it('renders two radio buttons, Cards default checked', () => {
    render(<ViewModeToggle />);
    const cards = screen.getByRole('radio', { name: /cards/i });
    const graphs = screen.getByRole('radio', { name: /graphs/i });
    expect(cards).toHaveAttribute('aria-checked', 'true');
    expect(graphs).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking Graphs flips the preference and persists', async () => {
    const user = userEvent.setup();
    render(<ViewModeToggle />);
    await user.click(screen.getByRole('radio', { name: /graphs/i }));
    expect(useUIStore.getState().statsViewMode).toBe('graphs');
    expect(localStorage.getItem('masquer.ui.statsViewMode')).toBe('graphs');
  });

  it('clicking back to Cards restores the default', async () => {
    useUIStore.setState({ statsViewMode: 'graphs' });
    const user = userEvent.setup();
    render(<ViewModeToggle />);
    await user.click(screen.getByRole('radio', { name: /cards/i }));
    expect(useUIStore.getState().statsViewMode).toBe('cards');
  });
});
