import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import HistoryStrip from './HistoryStrip';
import type { HistoryEntry } from './machine';

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    ballId: overrides.ballId ?? 'b1',
    risk: 'low',
    bin: overrides.bin ?? 10,
    multiplier: overrides.multiplier ?? 0.3,
    bet: overrides.bet ?? 100,
    payout: overrides.payout ?? 30,
  };
}

describe('HistoryStrip', () => {
  it('renders the History label when empty', () => {
    const { container } = render(<HistoryStrip history={[]} />);
    expect(container.querySelector('[data-history-strip]')!.textContent).toContain('History');
    expect(container.querySelectorAll('[data-history-pill]')).toHaveLength(0);
  });

  it('renders last 5 entries (rolling, history newest-first)', () => {
    const hist = [
      entry({ ballId: 'b1', multiplier: 1.5 }),
      entry({ ballId: 'b2', multiplier: 0.3 }),
      entry({ ballId: 'b3', multiplier: 100 }),
      entry({ ballId: 'b4', multiplier: 0.5 }),
      entry({ ballId: 'b5', multiplier: 16 }),
      entry({ ballId: 'b6', multiplier: 0.3 }),
    ];
    const { container } = render(<HistoryStrip history={hist} />);
    expect(container.querySelectorAll('[data-history-pill]')).toHaveLength(5);
  });
});
