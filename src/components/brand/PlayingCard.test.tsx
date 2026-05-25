import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PlayingCard from './PlayingCard';

describe('PlayingCard', () => {
  it('renders rank + suit corners on a face-up number card', () => {
    const { getAllByText } = render(<PlayingCard rank={7} suit="h" />);
    expect(getAllByText('7').length).toBeGreaterThan(0); // top-left + bottom-right
    expect(getAllByText('♥').length).toBeGreaterThan(0);
  });
  it('renders an Ace as "A"', () => {
    const { getAllByText } = render(<PlayingCard rank={1} suit="s" />);
    expect(getAllByText('A').length).toBeGreaterThan(0);
  });
  it.each([
    [11, 'J'],
    [12, 'Q'],
    [13, 'K'],
  ] as const)('renders royal label %s as %s', (rank, label) => {
    const { getAllByText } = render(<PlayingCard rank={rank} suit="d" />);
    expect(getAllByText(label).length).toBeGreaterThan(0);
  });
  it('renders the mask back when faceDown', () => {
    const { getByRole, queryByText } = render(<PlayingCard rank={7} suit="h" faceDown />);
    expect(getByRole('img', { name: /masquer/i })).toBeInTheDocument();
    expect(queryByText('7')).not.toBeInTheDocument();
  });
});
