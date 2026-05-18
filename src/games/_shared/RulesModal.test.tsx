import type * as FramerMotion from 'framer-motion';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RulesModal from './RulesModal';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

describe('RulesModal', () => {
  it('does not render when open=false', () => {
    render(
      <RulesModal open={false} title="Blackjack" onClose={() => {}}>
        <p>rules body</p>
      </RulesModal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the title and children when open=true', () => {
    render(
      <RulesModal open={true} title="Blackjack" onClose={() => {}}>
        <p>rules body text</p>
      </RulesModal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Blackjack — Rules/i)).toBeInTheDocument();
    expect(screen.getByText('rules body text')).toBeInTheDocument();
  });

  it('clicking the X close button calls onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <RulesModal open={true} title="X" onClose={onClose}>
        <p>body</p>
      </RulesModal>,
    );
    await user.click(screen.getByRole('button', { name: /close rules/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('pressing Escape calls onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <RulesModal open={true} title="X" onClose={onClose}>
        <p>body</p>
      </RulesModal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <RulesModal open={true} title="X" onClose={onClose}>
        <p>body</p>
      </RulesModal>,
    );
    await user.click(container.querySelector('[data-rules-backdrop]')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking inside the dialog does NOT call onClose (event stops propagation)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <RulesModal open={true} title="X" onClose={onClose}>
        <p>body text</p>
      </RulesModal>,
    );
    await user.click(screen.getByText('body text'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
