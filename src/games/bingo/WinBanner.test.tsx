import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinBanner from './WinBanner';

describe('WinBanner', () => {
  it('user tier1 british renders LINE!', () => {
    render(
      <WinBanner source="user" tier="tier1" variant="british" bannerKey="k1" onDismiss={vi.fn()} />,
    );
    expect(screen.getByText('LINE!')).toBeInTheDocument();
  });

  it('user tier3 american renders BLACKOUT!', () => {
    render(
      <WinBanner
        source="user"
        tier="tier3"
        variant="american"
        bannerKey="k2"
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('BLACKOUT!')).toBeInTheDocument();
  });

  it('cpu source prefixes with Computer N', () => {
    render(
      <WinBanner
        source="cpu"
        cpuIdx={4}
        tier="tier2"
        variant="british"
        bannerKey="k3"
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText('Computer 5 got DOUBLE LINE!')).toBeInTheDocument();
  });

  it('data attributes mark source + tier', () => {
    const { container } = render(
      <WinBanner
        source="cpu"
        cpuIdx={0}
        tier="tier3"
        variant="british"
        bannerKey="k4"
        onDismiss={vi.fn()}
      />,
    );
    const b = container.querySelector('[data-win-banner]') as HTMLElement;
    expect(b.getAttribute('data-source')).toBe('cpu');
    expect(b.getAttribute('data-tier')).toBe('tier3');
  });

  it('user tier-3 wears the jewel-magenta signature border', () => {
    const { container } = render(
      <WinBanner source="user" tier="tier3" variant="british" bannerKey="t3" onDismiss={vi.fn()} />,
    );
    const b = container.querySelector('[data-win-banner]') as HTMLElement;
    expect(b.className).toContain('border-jewel-magenta');
  });
});
