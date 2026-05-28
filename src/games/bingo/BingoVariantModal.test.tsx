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

  it('body is scrollable with a 60vh cap', () => {
    const { container } = render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const body = container.querySelector('[data-bingo-variant-body]') as HTMLElement;
    expect(body).not.toBeNull();
    expect(body.className).toContain('overflow-y-auto');
    expect(body.style.maxHeight).toBe('60vh');
  });

  it('renders a subtitle that differentiates British vs American before pick', () => {
    render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const subtitle = document.querySelector('[data-bingo-variant-subtitle]') as HTMLElement;
    expect(subtitle).not.toBeNull();
    // Subtitle must reference both variants by name so first-mount users get
    // the at-a-glance British-vs-American context without clicking.
    expect(subtitle.textContent).toMatch(/British/);
    expect(subtitle.textContent).toMatch(/American/);
  });

  it('uses brand-token chrome (velvet-deep + brass)', () => {
    const { container } = render(
      <MemoryRouter>
        <BingoVariantModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    const card = container.querySelector('[data-bingo-variant-modal] > div') as HTMLElement;
    expect(card.className).toContain('bg-velvet-deep');
    expect(card.className).toContain('border-brass');
  });
});
