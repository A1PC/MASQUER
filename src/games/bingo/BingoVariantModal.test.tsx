import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BingoVariantModal from './BingoVariantModal';

describe('BingoVariantModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <BingoVariantModal open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-bingo-variant-modal]')).toBeNull();
  });

  it('renders two variant choices when open', () => {
    render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/BRITISH 90-BALL/)).toBeInTheDocument();
    expect(screen.getByText(/AMERICAN 75-BALL/)).toBeInTheDocument();
  });

  it('clicking a variant fires onClose', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByText(/BRITISH 90-BALL/));
    expect(onClose).toHaveBeenCalled();
  });

  it('backdrop click fires onClose', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    const backdrop = document.querySelector('[data-bingo-variant-modal]')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('ESC key fires onClose', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
