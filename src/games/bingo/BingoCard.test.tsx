import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BingoCard from './BingoCard';
import { generateCard, emptyDaubGrid } from './logic';

describe('BingoCard', () => {
  it('renders 27 gridcells (3×9)', () => {
    const card = generateCard('test-1');
    render(<BingoCard card={card} daubed={emptyDaubGrid()} achievedTiers={new Set()} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(27);
  });

  it('renders filled cells with their value', () => {
    const card = generateCard('test-1');
    const filled = card.cells.flat().find((cell) => cell.value !== null)!;
    render(<BingoCard card={card} daubed={emptyDaubGrid()} achievedTiers={new Set()} />);
    expect(screen.getByText(filled.value!.toString())).toBeInTheDocument();
  });

  it('marks daubed cells with aria-pressed=true', () => {
    const card = generateCard('test-1');
    const daubed = emptyDaubGrid();
    let value = 0;
    outer: for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (card.cells[r]![c]!.value !== null) {
          daubed[r]![c] = true;
          value = card.cells[r]![c]!.value!;
          break outer;
        }
      }
    }
    render(<BingoCard card={card} daubed={daubed} achievedTiers={new Set()} />);
    expect(screen.getByLabelText(new RegExp(`${value}.*daubed`))).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows tier indicators for achieved tiers', () => {
    const card = generateCard('test-1');
    render(
      <BingoCard
        card={card}
        daubed={emptyDaubGrid()}
        achievedTiers={new Set(['1-line', '2-line'])}
      />,
    );
    expect(screen.getByText('LINE')).toBeInTheDocument();
    expect(screen.getByText('2-LINE')).toBeInTheDocument();
    expect(screen.queryByText('BINGO')).toBeNull();
  });

  it('shows the manual-mode hint when manualMode=true', () => {
    const card = generateCard('test-1');
    render(<BingoCard card={card} daubed={emptyDaubGrid()} achievedTiers={new Set()} manualMode />);
    expect(screen.getByText(/click called numbers/i)).toBeInTheDocument();
  });

  it('cells are disabled when no onCellClick provided', () => {
    const card = generateCard('test-1');
    render(<BingoCard card={card} daubed={emptyDaubGrid()} achievedTiers={new Set()} />);
    const buttons = screen.getAllByRole('gridcell').filter((el) => el.tagName === 'BUTTON');
    for (const btn of buttons) expect(btn).toBeDisabled();
  });
});
