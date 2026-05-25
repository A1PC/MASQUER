import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AceValuePrompt from './AceValuePrompt';

describe('AceValuePrompt', () => {
  it('does not render anything when closed', () => {
    render(<AceValuePrompt open={false} allowEleven onChoose={() => {}} />);
    expect(screen.queryByText(/Count this Ace as/)).toBeNull();
  });

  it('renders both 1 and 11 buttons when allowEleven is true', () => {
    render(<AceValuePrompt open allowEleven onChoose={() => {}} />);
    expect(screen.getByText('Count this Ace as')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Count this Ace as one/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Count this Ace as eleven/i })).toBeInTheDocument();
  });

  it('renders only the 1 button + the auto-1 description when allowEleven is false', () => {
    render(<AceValuePrompt open allowEleven={false} onChoose={() => {}} />);
    expect(screen.getByRole('button', { name: /Count this Ace as one/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Count this Ace as eleven/i })).toBeNull();
    expect(screen.getByText(/11 would bust/i)).toBeInTheDocument();
  });

  it('invokes onChoose(1) when the 1 button is clicked', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<AceValuePrompt open allowEleven onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: /Count this Ace as one/i }));
    expect(onChoose).toHaveBeenCalledWith(1);
  });

  it('invokes onChoose(11) when the 11 button is clicked', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<AceValuePrompt open allowEleven onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: /Count this Ace as eleven/i }));
    expect(onChoose).toHaveBeenCalledWith(11);
  });
});
