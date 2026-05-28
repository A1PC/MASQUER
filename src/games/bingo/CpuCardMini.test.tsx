import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CpuCardMini from './CpuCardMini';
import { generateCard, emptyDaubGrid } from './logic';
import type { CpuCardState } from './machine';

function makeCpu(seed: string): CpuCardState {
  return {
    card: generateCard(seed, 'british'),
    daubed: emptyDaubGrid('british'),
    latencyMs: 200,
    claimedTiers: new Set(),
  };
}

describe('CpuCardMini', () => {
  it('shows CPU label with 1-indexed number', () => {
    render(<CpuCardMini cpu={makeCpu('cpu-1')} cpuIdx={0} variant="british" />);
    expect(screen.getByText(/CPU 1/)).toBeInTheDocument();
  });

  it('shows LINE label when highlightTier=tier1', () => {
    render(
      <CpuCardMini cpu={makeCpu('cpu-2')} cpuIdx={1} variant="british" highlightTier="tier1" />,
    );
    expect(screen.getByText(/CPU 2 · LINE/)).toBeInTheDocument();
  });

  it('renders mini-size bingo card', () => {
    const { container } = render(
      <CpuCardMini cpu={makeCpu('cpu-3')} cpuIdx={2} variant="british" />,
    );
    expect(container.querySelector('[data-size="mini"]')).toBeTruthy();
  });

  it('uses brand-token shell (felt-table-deep + brass)', () => {
    const { container } = render(
      <CpuCardMini cpu={makeCpu('cpu-shell')} cpuIdx={4} variant="british" />,
    );
    const wrapper = container.querySelector('[data-cpu-card]') as HTMLElement;
    expect(wrapper.className).toContain('bg-felt-table-deep');
    expect(wrapper.className).toContain('border-brass/40');
  });

  it('tier2 label reads "BONUS" for British and "CORNERS" for American', () => {
    const { rerender } = render(
      <CpuCardMini
        cpu={makeCpu('cpu-tier2-b')}
        cpuIdx={0}
        variant="british"
        highlightTier="tier2"
      />,
    );
    expect(screen.getByText(/CPU 1 · BONUS/)).toBeInTheDocument();
    rerender(
      <CpuCardMini
        cpu={makeCpu('cpu-tier2-a')}
        cpuIdx={0}
        variant="american"
        highlightTier="tier2"
      />,
    );
    expect(screen.getByText(/CPU 1 · CORNERS/)).toBeInTheDocument();
  });
});
