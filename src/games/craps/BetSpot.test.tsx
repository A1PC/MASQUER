import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetSpot from './BetSpot';

const noChips = [] as const;

describe('BetSpot', () => {
  it('renders the label and is clickable when canPlace=true', async () => {
    const onPlace = vi.fn();
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={onPlace}
      />,
    );
    const spot = container.querySelector('[data-bet-spot="pass"]')!;
    expect(spot.getAttribute('data-disabled')).toBe('false');
    expect(spot.textContent).toContain('Pass Line');
    await userEvent.click(spot);
    expect(onPlace).toHaveBeenCalledTimes(1);
  });

  it('is non-interactive when canPlace=false', async () => {
    const onPlace = vi.fn();
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={false}
        onPlace={onPlace}
      />,
    );
    const spot = container.querySelector('[data-bet-spot="pass"]')!;
    expect(spot.getAttribute('data-disabled')).toBe('true');
    await userEvent.click(spot);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('shows the chip total when chips are placed', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[{ betId: 'pass', amount: 25, betPoint: null }]}
        canPlace={true}
        onPlace={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-chip-total]')?.textContent).toBe('25');
  });

  it('flashTone=win applies the gold-bright ring class', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        flashTone="win"
      />,
    );
    const spot = container.querySelector('[data-bet-spot="pass"]')!;
    expect(spot.className).toContain('ring-gold-bright');
    expect(spot.getAttribute('data-flash-tone')).toBe('win');
  });

  it('flashTone=loss applies the casino-red ring class', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        flashTone="loss"
      />,
    );
    const spot = container.querySelector('[data-bet-spot="pass"]')!;
    expect(spot.className).toContain('ring-casino-red');
    expect(spot.getAttribute('data-flash-tone')).toBe('loss');
  });

  it('renders a payout badge when flashTone=win and payoutChips > 0', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        flashTone="win"
        payoutChips={50}
      />,
    );
    const badge = container.querySelector('[data-payout-badge]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('+50');
  });

  it('does NOT render a payout badge when flashTone is unset', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        payoutChips={50}
      />,
    );
    expect(container.querySelector('[data-payout-badge]')).toBeNull();
  });

  it('does NOT render a payout badge when flashTone=loss', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        flashTone="loss"
        payoutChips={50}
      />,
    );
    expect(container.querySelector('[data-payout-badge]')).toBeNull();
  });

  it('does NOT render a payout badge when flashTone=win and payoutChips is 0', () => {
    const { container } = render(
      <BetSpot
        betId="pass"
        label="Pass Line"
        chips={[...noChips]}
        canPlace={true}
        onPlace={vi.fn()}
        flashTone="win"
        payoutChips={0}
      />,
    );
    expect(container.querySelector('[data-payout-badge]')).toBeNull();
  });

  it('remove button fires onRemove without bubbling to onPlace', async () => {
    const onPlace = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <BetSpot
        betId="place-6"
        label="6"
        chips={[{ betId: 'place-6', amount: 10, betPoint: null }]}
        canPlace={true}
        onPlace={onPlace}
        onRemove={onRemove}
      />,
    );
    const remove = container.querySelector('[data-remove-bet="place-6"]')!;
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPlace).not.toHaveBeenCalled();
  });
});
