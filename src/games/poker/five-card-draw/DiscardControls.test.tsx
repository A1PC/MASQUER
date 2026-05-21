import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscardControls from './DiscardControls';
import type { Card } from '../_shared/types';

const hand: Card[] = [
  { rank: 14, suit: 'h' },
  { rank: 9, suit: 'd' },
  { rank: 7, suit: 'c' },
  { rank: 4, suit: 's' },
  { rank: 2, suit: 'h' },
];

describe('DiscardControls', () => {
  it('defaults to STAND PAT', () => {
    render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    expect(screen.getByRole('button', { name: /STAND PAT/ })).toBeInTheDocument();
  });

  it('renders exactly 5 card buttons', () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    expect(cardButtons).toHaveLength(5);
  });

  it('all cards start unmarked', () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const marked = container.querySelectorAll('[data-marked="true"]');
    expect(marked).toHaveLength(0);
  });

  it('tapping a card marks it and shows DRAW 1', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    await userEvent.click(cardButtons[2] as HTMLElement);
    expect(screen.getByRole('button', { name: /DRAW 1/ })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-marked="true"]')).toHaveLength(1);
  });

  it('tapping the same card again unmarks it', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    await userEvent.click(cardButtons[0] as HTMLElement);
    await userEvent.click(cardButtons[0] as HTMLElement);
    expect(screen.getByRole('button', { name: /STAND PAT/ })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-marked="true"]')).toHaveLength(0);
  });

  it('caps at 3 discards (4th tap is blocked)', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    for (let i = 0; i < 4; i += 1) {
      await userEvent.click(cardButtons[i] as HTMLElement);
    }
    expect(screen.getByRole('button', { name: /DRAW 3/ })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-marked="true"]')).toHaveLength(3);
  });

  it('DRAW fires the marked indices', async () => {
    const onDraw = vi.fn();
    const { container } = render(<DiscardControls holeCards={hand} onDraw={onDraw} />);
    await userEvent.click(container.querySelector('[data-card-index="0"]') as HTMLElement);
    await userEvent.click(container.querySelector('[data-card-index="2"]') as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: /DRAW 2/ }));
    expect(onDraw).toHaveBeenCalledWith([0, 2]);
  });

  it('STAND PAT fires empty array', async () => {
    const onDraw = vi.fn();
    render(<DiscardControls holeCards={hand} onDraw={onDraw} />);
    await userEvent.click(screen.getByRole('button', { name: /STAND PAT/ }));
    expect(onDraw).toHaveBeenCalledWith([]);
  });

  it('disabled prop disables all buttons', () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} disabled />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('card buttons have correct aria-pressed when marked/unmarked', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const btn = container.querySelector('[data-card-index="1"]') as HTMLElement;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('marking 3 cards then unmarking one allows marking a 4th', async () => {
    const { container } = render(<DiscardControls holeCards={hand} onDraw={vi.fn()} />);
    const cardButtons = container.querySelectorAll('[data-card-index]');
    await userEvent.click(cardButtons[0] as HTMLElement);
    await userEvent.click(cardButtons[1] as HTMLElement);
    await userEvent.click(cardButtons[2] as HTMLElement);
    // Now unmark card 1
    await userEvent.click(cardButtons[1] as HTMLElement);
    // Now mark card 3
    await userEvent.click(cardButtons[3] as HTMLElement);
    expect(container.querySelectorAll('[data-marked="true"]')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /DRAW 3/ })).toBeInTheDocument();
  });
});
