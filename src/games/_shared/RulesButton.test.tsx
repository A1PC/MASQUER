import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RulesButton from './RulesButton';

describe('RulesButton', () => {
  it('renders with "RULES" label and accessible name', () => {
    render(<RulesButton onClick={() => {}} />);
    const btn = screen.getByRole('button', { name: /show game rules/i });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toMatch(/RULES/);
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<RulesButton onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('is positioned fixed bottom-left', () => {
    render(<RulesButton onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('fixed');
    expect(btn.className).toContain('bottom-4');
    expect(btn.className).toContain('left-4');
  });
});
