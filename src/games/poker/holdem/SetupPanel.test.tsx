import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPanel from './SetupPanel';
import { STAKES } from './stakesConfig';

describe('SetupPanel', () => {
  it('renders table size options 2-6', () => {
    render(<SetupPanel balance={1000} onSitDown={vi.fn()} />);
    for (const n of [2, 3, 4, 5, 6]) {
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument();
    }
  });

  it('SIT DOWN is disabled when balance is null', () => {
    render(<SetupPanel balance={null} onSitDown={vi.fn()} />);
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeDisabled();
  });

  it('SIT DOWN is disabled when balance < minBuyIn for selected tier', () => {
    const minBuyIn = STAKES.low.minBuyIn;
    render(<SetupPanel balance={minBuyIn - 1} onSitDown={vi.fn()} />);
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeDisabled();
  });

  it('SIT DOWN is enabled when balance >= minBuyIn', () => {
    const minBuyIn = STAKES.low.minBuyIn;
    render(<SetupPanel balance={minBuyIn} onSitDown={vi.fn()} />);
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).not.toBeDisabled();
  });

  it('switching tier changes buy-in range', () => {
    render(<SetupPanel balance={10_000} onSitDown={vi.fn()} />);
    // Start on Low
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('min')).toBe(String(STAKES.low.minBuyIn));
    expect(slider.getAttribute('max')).toBe(String(STAKES.low.maxBuyIn));

    // Switch to Mid
    fireEvent.click(screen.getByRole('button', { name: /MID/ }));
    const sliderMid = screen.getByRole('slider');
    expect(sliderMid.getAttribute('min')).toBe(String(STAKES.mid.minBuyIn));
    expect(sliderMid.getAttribute('max')).toBe(String(STAKES.mid.maxBuyIn));
  });

  it('fires onSitDown with correct config when SIT DOWN clicked', async () => {
    const onSitDown = vi.fn();
    render(<SetupPanel balance={1000} onSitDown={onSitDown} />);
    await userEvent.click(screen.getByRole('button', { name: /SIT DOWN/ }));
    expect(onSitDown).toHaveBeenCalledOnce();
    const [config] = onSitDown.mock.calls[0]!;
    expect(config).toMatchObject({
      tableSize: expect.any(Number),
      stakes: { sb: STAKES.low.sb, bb: STAKES.low.bb },
      buyIn: expect.any(Number),
    });
    expect(config.buyIn).toBeGreaterThanOrEqual(STAKES.low.minBuyIn);
    expect(config.buyIn).toBeLessThanOrEqual(STAKES.low.maxBuyIn);
  });

  it('SIT DOWN is disabled for mid tier when balance < mid minBuyIn', () => {
    render(<SetupPanel balance={200} onSitDown={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /MID/ }));
    // balance=200 < mid.minBuyIn=400
    expect(screen.getByRole('button', { name: /SIT DOWN/ })).toBeDisabled();
  });
});
