import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders a slider reflecting its value', () => {
    render(<Slider aria-label="Bet" min={10} max={2500} defaultValue={[500]} />);
    const el = screen.getByRole('slider');
    expect(el).toHaveAttribute('aria-valuenow', '500');
    expect(el).toHaveAttribute('aria-valuemin', '10');
    expect(el).toHaveAttribute('aria-valuemax', '2500');
  });

  it('changes the value with arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Slider
        aria-label="Bet"
        min={0}
        max={100}
        step={10}
        defaultValue={[50]}
        onValueChange={onValueChange}
      />,
    );
    const el = screen.getByRole('slider');
    el.focus();
    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenCalledWith([60]);
    expect(el).toHaveAttribute('aria-valuenow', '60');
  });

  it('renders the controlled value', () => {
    render(<Slider aria-label="Bet" min={0} max={100} value={[75]} onValueChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '75');
  });
});
