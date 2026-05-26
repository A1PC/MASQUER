import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketCart from './TicketCart';

describe('TicketCart', () => {
  it('shows the empty-state message when no lines', () => {
    render(<TicketCart lines={[]} lineCost={5} onRemoveLine={() => {}} onBuy={() => {}} />);
    expect(screen.getByText(/no lines yet/i)).toBeInTheDocument();
  });

  it('renders a 6-number manual line sorted with the bonus separator', () => {
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [5, 2, 4, 1, 3, 6], bonusNumber: 7 }]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    expect(screen.getByText(/1 · 2 · 3 · 4 · 5 · 6 \| 7/i)).toBeInTheDocument();
  });

  it('renders a lucky-dip placeholder', () => {
    render(
      <TicketCart
        lines={[{ kind: 'lucky-dip' }]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    expect(screen.getByText(/lucky dip/i)).toBeInTheDocument();
  });

  it('computes total cost as lineCount * lineCost', () => {
    render(
      <TicketCart
        lines={[
          { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 },
          { kind: 'lucky-dip' },
          { kind: 'lucky-dip' },
        ]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    // 3 lines × LINE_COST 5 (Phase 15 #9).
    expect(screen.getByText('15 chips')).toBeInTheDocument();
  });

  it('fires onRemoveLine with the line index when × is clicked', async () => {
    const user = userEvent.setup();
    const onRemoveLine = vi.fn();
    render(
      <TicketCart
        lines={[
          { kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 },
          { kind: 'manual', mainNumbers: [7, 8, 9, 10, 11, 12], bonusNumber: 2 },
        ]}
        lineCost={5}
        onRemoveLine={onRemoveLine}
        onBuy={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /remove line 2/i }));
    expect(onRemoveLine).toHaveBeenCalledWith(1);
  });

  it('disables BUY TICKET when lines is empty', () => {
    render(<TicketCart lines={[]} lineCost={5} onRemoveLine={() => {}} onBuy={() => {}} />);
    expect(screen.getByRole('button', { name: /buy ticket/i })).toBeDisabled();
  });

  it('fires onBuy when BUY TICKET is clicked', async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={onBuy}
      />,
    );
    await user.click(screen.getByRole('button', { name: /buy ticket/i }));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('shows buyDisabledReason text when buyDisabled', () => {
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={() => {}}
        buyDisabled
        buyDisabledReason="Not enough chips"
      />,
    );
    expect(screen.getByText('Not enough chips')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy ticket/i })).toBeDisabled();
  });

  it('uses max-h-[60vh] overflow-y-auto on the cart body so long carts scroll', () => {
    render(
      <TicketCart
        lines={[{ kind: 'manual', mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumber: 1 }]}
        lineCost={5}
        onRemoveLine={() => {}}
        onBuy={() => {}}
      />,
    );
    const body = document.querySelector('[data-ticket-cart-body]');
    expect(body).not.toBeNull();
    expect(body!.className).toMatch(/max-h-\[60vh\]/);
    expect(body!.className).toMatch(/overflow-y-auto/);
  });
});
