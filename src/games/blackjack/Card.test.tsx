import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from './Card';
import type { Card as CardType } from './types';

const card = (rank: CardType['rank'], suit: CardType['suit'] = '♠', faceUp = true): CardType => ({
  rank,
  suit,
  faceUp,
});

describe('Card', () => {
  it('renders rank in both corners for a non-court card', () => {
    render(<Card card={card('7', '♦')} />);
    const sevens = screen.getAllByText('7');
    expect(sevens).toHaveLength(2);
  });

  it('renders suit symbol multiple times for pip-card', () => {
    render(<Card card={card('7', '♦')} />);
    const diamonds = screen.getAllByText('♦');
    // 2 corners + 7 pips = 9
    expect(diamonds.length).toBeGreaterThanOrEqual(9);
  });

  it('renders Ace with single large center pip + 2 corner suits', () => {
    render(<Card card={card('A', '♠')} />);
    const spades = screen.getAllByText('♠');
    expect(spades.length).toBe(3); // 2 corners + 1 center
  });

  it('renders King with corner letters and framed center K', () => {
    render(<Card card={card('K', '♥')} />);
    const kings = screen.getAllByText('K');
    expect(kings.length).toBe(3); // 2 corners + 1 court
  });

  it('renders Queen with corner letters and framed center Q', () => {
    render(<Card card={card('Q', '♣')} />);
    const queens = screen.getAllByText('Q');
    expect(queens.length).toBe(3);
  });

  it('renders Jack with corner letters and framed center J', () => {
    render(<Card card={card('J', '♦')} />);
    const jacks = screen.getAllByText('J');
    expect(jacks.length).toBe(3);
  });

  it('red suits use casino-red text color class', () => {
    const { container } = render(<Card card={card('K', '♥')} />);
    expect(container.querySelector('.text-casino-red')).toBeTruthy();
  });

  it('black suits use felt-deep text color class', () => {
    const { container } = render(<Card card={card('K', '♠')} />);
    expect(container.querySelector('.text-felt-deep')).toBeTruthy();
  });

  it('faceDown=true renders the card back (no rank visible)', () => {
    render(<Card card={card('K', '♥')} faceDown={true} />);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('card.faceUp=false renders the card back', () => {
    render(<Card card={card('K', '♥', false)} />);
    expect(screen.queryByText('K')).toBeNull();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('null card renders the card back', () => {
    render(<Card card={null} />);
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('renders 10 with 10 pips', () => {
    render(<Card card={card('10', '♠')} />);
    const tens = screen.getAllByText('10');
    expect(tens.length).toBe(2); // 2 corners
    const pips = screen.getAllByText('♠');
    expect(pips.length).toBeGreaterThanOrEqual(12); // 2 corners + 10 pips
  });
});
