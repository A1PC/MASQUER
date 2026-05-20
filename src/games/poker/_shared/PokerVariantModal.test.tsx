import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import PokerVariantModal from './PokerVariantModal';

describe('PokerVariantModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <PokerVariantModal open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-poker-variant-modal]')).toBeNull();
  });

  it('renders three variant choices when open', () => {
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/TEXAS HOLD'EM/)).toBeInTheDocument();
    expect(screen.getByText(/FIVE-CARD DRAW/)).toBeInTheDocument();
    expect(screen.getByText(/OMAHA/)).toBeInTheDocument();
  });

  it("only Texas Hold'em is clickable — Five-Card Draw and Omaha are non-interactive divs", () => {
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    // Hold'em is a button
    expect(screen.getByRole('button', { name: /TEXAS HOLD'EM/i })).toBeInTheDocument();
    // The other two should NOT be buttons
    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map((b) => b.textContent ?? '');
    expect(buttonTexts.some((t) => /FIVE-CARD DRAW/i.test(t))).toBe(false);
    expect(buttonTexts.some((t) => /OMAHA/i.test(t))).toBe(false);
  });

  it("clicking Hold'em fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /TEXAS HOLD'EM/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('backdrop click fires onClose', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    const backdrop = document.querySelector('[data-poker-variant-modal]')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('ESC key fires onClose', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('COMING SOON badges appear on non-active variants', () => {
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const badges = screen.getAllByText('COMING SOON');
    expect(badges).toHaveLength(2);
  });
});
