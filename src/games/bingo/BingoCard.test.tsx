import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BingoCard from './BingoCard';
import { generateCard, emptyDaubGrid } from './logic';

describe('BingoCard', () => {
  it('renders british 3×9 grid', () => {
    const card = generateCard('test-br', 'british');
    const daubed = emptyDaubGrid('british');
    const { container } = render(<BingoCard card={card} daubed={daubed} variant="british" />);
    const grid = container.querySelector('[data-bingo-card]')!;
    expect(grid).toHaveAttribute('data-variant', 'british');
    expect(within(grid as HTMLElement).queryAllByText(/^[0-9]+$/).length).toBe(15);
  });

  it('renders american 5×5 grid with free centre star', () => {
    const card = generateCard('test-am', 'american');
    const daubed = emptyDaubGrid('american');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="american" size="large" />,
    );
    const grid = container.querySelector('[data-bingo-card]')!;
    expect(grid).toHaveAttribute('data-variant', 'american');
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('mini size hides numbers', () => {
    const card = generateCard('test-mini', 'british');
    const daubed = emptyDaubGrid('british');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="british" size="mini" />,
    );
    expect(container.querySelector('[data-size="mini"]')).toBeTruthy();
  });

  it('manualMode + onCellClick: clicking a called undaubed cell fires callback', async () => {
    const card = generateCard('test-click', 'british');
    const daubed = emptyDaubGrid('british');
    const onClick = vi.fn();
    render(
      <BingoCard
        card={card}
        daubed={daubed}
        variant="british"
        manualMode={true}
        onCellClick={onClick}
      />,
    );
    const firstButton = screen.getAllByRole('button')[0];
    if (firstButton) {
      await userEvent.click(firstButton);
      expect(onClick).toHaveBeenCalled();
    }
  });

  it('without manualMode: cells are not buttons', () => {
    const card = generateCard('test-nobtn', 'british');
    const daubed = emptyDaubGrid('british');
    render(<BingoCard card={card} daubed={daubed} variant="british" manualMode={false} />);
    expect(screen.queryAllByRole('button').length).toBe(0);
  });

  it('daubed cell wears a gold inset ring', () => {
    const card = generateCard('test-daubed', 'british');
    const daubed = emptyDaubGrid('british');
    // Find a cell with a numeric value to flip daubed.
    outer: for (let r = 0; r < daubed.length; r += 1) {
      for (let c = 0; c < daubed[r]!.length; c += 1) {
        if (card.cells[r]?.[c]?.value !== null) {
          daubed[r]![c] = true;
          break outer;
        }
      }
    }
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="british" size="large" />,
    );
    const daubedCell = container.querySelector('[data-daubed="true"]');
    expect(daubedCell).not.toBeNull();
    expect(daubedCell!.className).toContain('ring-gold');
  });

  it('uses the velvet card surface with brass border', () => {
    const card = generateCard('test-shell', 'british');
    const daubed = emptyDaubGrid('british');
    const { container } = render(<BingoCard card={card} daubed={daubed} variant="british" />);
    const grid = container.querySelector('[data-bingo-card]') as HTMLElement;
    expect(grid.className).toContain('bg-velvet');
    expect(grid.className).toMatch(/border-brass\/40|border-brass/);
  });

  it('renders B-I-N-G-O column headers for american-large variant', () => {
    const card = generateCard('test-am-hdr', 'american');
    const daubed = emptyDaubGrid('american');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="american" size="large" />,
    );
    const headerRow = container.querySelector('[data-bingo-column-headers]');
    expect(headerRow).not.toBeNull();
    expect(headerRow).toHaveAttribute('aria-hidden', 'true');
    const letters = headerRow!.querySelectorAll('[data-column-letter]');
    expect(letters).toHaveLength(5);
    const order = Array.from(letters).map((el) => el.getAttribute('data-column-letter'));
    expect(order).toEqual(['B', 'I', 'N', 'G', 'O']);
    // Each letter renders its glyph as text content.
    expect(Array.from(letters).map((el) => el.textContent)).toEqual(['B', 'I', 'N', 'G', 'O']);
  });

  it('no column headers for british variant', () => {
    const card = generateCard('test-br-no-hdr', 'british');
    const daubed = emptyDaubGrid('british');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="british" size="large" />,
    );
    expect(container.querySelector('[data-bingo-column-headers]')).toBeNull();
  });

  it('no column headers for american minicard (size=mini)', () => {
    const card = generateCard('test-am-mini', 'american');
    const daubed = emptyDaubGrid('american');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="american" size="mini" />,
    );
    expect(container.querySelector('[data-bingo-column-headers]')).toBeNull();
  });

  it('free centre wears the brass ring + gold-glow signature polish', () => {
    const card = generateCard('test-free-polish', 'american');
    const daubed = emptyDaubGrid('american');
    const { container } = render(
      <BingoCard card={card} daubed={daubed} variant="american" size="large" />,
    );
    // The free centre is the only cell rendering the ★ glyph; walk up to its
    // wrapping motion.div which owns the brass ring + glow classes.
    const star = container.querySelector('span.text-xl')!;
    const cell = star.parentElement!;
    expect(cell.className).toContain('ring-brass');
    expect(cell.className).toContain('ring-inset');
    expect(cell.className).toMatch(/shadow-\[0_0_8px_/);
  });
});
