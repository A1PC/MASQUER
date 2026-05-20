import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionBar from './SessionBar';

describe('SessionBar', () => {
  it('renders session stats', () => {
    render(
      <SessionBar
        stack={600}
        totalBoughtIn={500}
        handsPlayed={3}
        inHand={false}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.getByText('600')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows positive net in green (chip-win)', () => {
    const { container } = render(
      <SessionBar
        stack={700}
        totalBoughtIn={500}
        handsPlayed={2}
        inHand={false}
        onLeave={vi.fn()}
      />,
    );
    const net = container.querySelector('[data-net]') as HTMLElement;
    expect(net.className).toContain('text-chip-win');
    expect(net.textContent).toBe('+200');
  });

  it('shows negative net in red (casino-red)', () => {
    const { container } = render(
      <SessionBar
        stack={300}
        totalBoughtIn={500}
        handsPlayed={2}
        inHand={false}
        onLeave={vi.fn()}
      />,
    );
    const net = container.querySelector('[data-net]') as HTMLElement;
    expect(net.className).toContain('text-casino-red');
    expect(net.textContent).toBe('-200');
  });

  it('LEAVE TABLE is disabled when inHand=true', () => {
    render(<SessionBar stack={500} totalBoughtIn={500} handsPlayed={1} inHand onLeave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /LEAVE TABLE/ })).toBeDisabled();
  });

  it('LEAVE TABLE is enabled when inHand=false', () => {
    render(
      <SessionBar
        stack={500}
        totalBoughtIn={500}
        handsPlayed={1}
        inHand={false}
        onLeave={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /LEAVE TABLE/ })).not.toBeDisabled();
  });

  it('fires onLeave when LEAVE TABLE clicked', async () => {
    const onLeave = vi.fn();
    render(
      <SessionBar
        stack={500}
        totalBoughtIn={500}
        handsPlayed={1}
        inHand={false}
        onLeave={onLeave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /LEAVE TABLE/ }));
    expect(onLeave).toHaveBeenCalledOnce();
  });
});
