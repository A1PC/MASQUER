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

  it('shows FAST BINGO badge with British copy when player wins within 40 calls', () => {
    render(
      <MemoryRouter>
        <EndScreen
          {...baseProps}
          winner="user"
          finalCallCount={32}
          claimLog={[{ tier: 'tier3', source: 'user', chipDelta: 100 }]}
        />
      </MemoryRouter>,
    );
    const badge = screen.getByText(/FAST BINGO BONUS · 32 CALLS/i);
    expect(badge).toBeInTheDocument();
  });

  it('hides FAST BINGO badge when finalCallCount > 40', () => {
    render(
      <MemoryRouter>
        <EndScreen
          {...baseProps}
          winner="user"
          finalCallCount={55}
          claimLog={[{ tier: 'tier3', source: 'user', chipDelta: 100 }]}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/FAST BINGO BONUS/i)).toBeNull();
  });

  it('scrollable body caps at 60vh for long claim logs', () => {
    const { container } = render(
      <MemoryRouter>
        <EndScreen {...baseProps} winner="cpu" cpuTier3Winner={0} />
      </MemoryRouter>,
    );
    const card = container.querySelector('[data-end-screen]') as HTMLElement;
    expect(card.className).toContain('max-h-[60vh]');
    expect(card.className).toContain('overflow-y-auto');
  });

  it('user tier-3 win wears the jewel-magenta border signature', () => {
    const { container } = render(
      <MemoryRouter>
        <EndScreen
          {...baseProps}
          winner="user"
          claimLog={[{ tier: 'tier3', source: 'user', chipDelta: 100 }]}
        />
      </MemoryRouter>,
    );
    const card = container.querySelector('[data-end-screen]') as HTMLElement;
    expect(card.className).toContain('border-jewel-magenta');
  });
});
