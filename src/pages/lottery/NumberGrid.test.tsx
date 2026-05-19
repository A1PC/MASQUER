import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberGrid from './NumberGrid';

describe('NumberGrid', () => {
  it('renders 50 main buttons + 10 bonus buttons', () => {
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getAllByRole('button', { name: /main number/i })).toHaveLength(50);
    expect(screen.getAllByRole('button', { name: /bonus number/i })).toHaveLength(10);
  });

  it('marks selected main numbers with aria-pressed=true', () => {
    render(
      <NumberGrid
        mainSelected={[3, 12, 25]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Main number 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Main number 4' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('disables unselected main buttons when 5 are already selected', () => {
    render(
      <NumberGrid
        mainSelected={[1, 2, 3, 4, 5]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Main number 6' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Main number 1' })).not.toBeDisabled();
  });

  it('fires onMainToggle with the clicked number', async () => {
    const user = userEvent.setup();
    const onMainToggle = vi.fn();
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={onMainToggle}
        onBonusSelect={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Main number 7' }));
    expect(onMainToggle).toHaveBeenCalledWith(7);
  });

  it('fires onBonusSelect with the clicked bonus number', async () => {
    const user = userEvent.setup();
    const onBonusSelect = vi.fn();
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={null}
        onMainToggle={() => {}}
        onBonusSelect={onBonusSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Bonus number 4' }));
    expect(onBonusSelect).toHaveBeenCalledWith(4);
  });

  it('marks selected bonus with aria-pressed=true', () => {
    render(
      <NumberGrid
        mainSelected={[]}
        bonusSelected={5}
        onMainToggle={() => {}}
        onBonusSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Bonus number 5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
