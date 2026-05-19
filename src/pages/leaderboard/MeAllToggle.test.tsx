import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeAllToggle, { type MeAllMode } from './MeAllToggle';

describe('MeAllToggle', () => {
  it('renders two radios with the current value checked', () => {
    render(<MeAllToggle value="all" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /all/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /me/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('reflects "me" when value="me"', () => {
    render(<MeAllToggle value="me" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /me/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onChange with the new value when clicked', async () => {
    const onChange = vi.fn<(next: MeAllMode) => void>();
    const user = userEvent.setup();
    render(<MeAllToggle value="all" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /me/i }));
    expect(onChange).toHaveBeenCalledWith('me');
  });
});
