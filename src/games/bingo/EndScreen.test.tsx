import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EndScreen from './EndScreen';
import type { ClaimLogEntry } from './machine';

const baseProps = {
  variant: 'british' as const,
  pot: 100,
  bonusesEarned: 0,
  cpuTier3Winner: null as number | null,
  claimLog: [] as ClaimLogEntry[],
  onPlayAgain: vi.fn(),
  onChangeVariant: vi.fn(),
};

describe('EndScreen', () => {
  it('user win shows YOU WON THE BINGO! and positive net', () => {
    render(
      <MemoryRouter>
        <EndScreen
          {...baseProps}
          winner="user"
          bonusesEarned={20}
          claimLog={[
            { tier: 'tier3', source: 'user', chipDelta: 100 },
            { tier: 'tier1', source: 'user', chipDelta: 10 },
            { tier: 'tier2', source: 'user', chipDelta: 20 },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/YOU WON THE BINGO/)).toBeInTheDocument();
  });

  it('cpu win shows Computer N took the pot', () => {
    render(
      <MemoryRouter>
        <EndScreen
          {...baseProps}
          winner="cpu"
          cpuTier3Winner={2}
          claimLog={[{ tier: 'tier3', source: 'cpu', cpuIdx: 2, chipDelta: 0 }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Computer 3 took the pot/)).toBeInTheDocument();
  });

  it('renders all action buttons + link', () => {
    render(
      <MemoryRouter>
        <EndScreen {...baseProps} winner="cpu" cpuTier3Winner={0} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /PLAY AGAIN/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CHANGE VARIANT/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BACK TO LOBBY/ })).toBeInTheDocument();
  });
});
