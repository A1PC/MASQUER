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

  it('all three variants are clickable buttons', () => {
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /TEXAS HOLD'EM/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FIVE-CARD DRAW/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OMAHA/i })).toBeInTheDocument();
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

  it('clicking Five-Card Draw fires onClose', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /FIVE-CARD DRAW/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking Omaha fires onClose', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /OMAHA/i }));
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

  it('no COMING SOON badges remain — all three variants are active', () => {
    render(
      <MemoryRouter>
        <PokerVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('COMING SOON')).toBeNull();
  });
});
