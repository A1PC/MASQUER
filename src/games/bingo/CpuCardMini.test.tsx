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
});
