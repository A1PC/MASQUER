import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DaubToggle from './DaubToggle';

describe('DaubToggle', () => {
  it('renders two radios with the current mode checked', () => {
    render(<DaubToggle mode="auto" onToggle={() => {}} />);
    expect(screen.getByRole('radio', { name: /auto/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /manual/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('fires onToggle when clicking the inactive radio', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<DaubToggle mode="auto" onToggle={onToggle} />);
    await user.click(screen.getByRole('radio', { name: /manual/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('does not fire onToggle when clicking the active radio', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<DaubToggle mode="auto" onToggle={onToggle} />);
    await user.click(screen.getByRole('radio', { name: /auto/i }));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
